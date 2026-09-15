"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, X, ArrowLeftRight, Minus, Plus, Trash2, RotateCcw, Check } from 'lucide-react';

import { RailData, Station } from '../types/railData';
import { Trip } from '../types/trip';
import { useI18n } from '../lib/i18n-context';
import { MY_LINES_TRANSLATIONS, getTranslations } from '../lib/translations';
import { getLocalizedName, RegionNames } from '../lib/i18n-utils';
import {
    buildRouteGraph,
    findCandidateRoutes,
    CandidateRoute
} from '../lib/routeSearch';
import {
    startIdOf,
    endIdOf,
    reverseTrip,
    applyRoute,
    retractTrip,
    neighboursToExtend,
    needsResearch
} from '../lib/tripEditing';
import { StationPickerRow } from './RouteGeneratorModal';
import { Z } from '../lib/layers';

/**
 * 기록해 둔 여정 하나를 고치는 창.
 *
 * 여정은 **끝점 두 개와 그 사이에 고른 경로**로 정해진다. 그래서 이 창이 하는 일도
 * 둘뿐이다 — 끝점을 옮기거나(줄이기·늘리기·다른 역으로·맞바꾸기), 같은 끝점 사이의
 * 다른 경로를 고르거나.
 *
 * 고친 것은 **저장을 누를 때까지 원본에 닿지 않는다.** 여정 기록은 사용자가 몇 년에
 * 걸쳐 쌓은 것이라, 잘못 누른 단추 하나로 조용히 덮어써서는 안 된다. 창 안에서만
 * 굴리다가 저장에서 한 번에 넘긴다.
 *
 * 편집 연산 자체는 화면 없이 시험할 수 있도록 `lib/tripEditing` 에 순수 함수로 두고,
 * 여기서는 그것을 부르고 결과를 보여 주기만 한다.
 */

export interface TripDetailModalProps {
    isOpen: boolean;
    trip: Trip | null;
    railData: RailData | null;
    regionNames: RegionNames | null;
    onSave: (trip: Trip) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
    /** 고치는 동안 지도가 따라 움직이도록 넘긴다. 저장 전이라도 눈으로 봐야 한다. */
    onPreview?: (trip: Trip | null) => void;
}

/** 여정이 있을 때만 붙는 알맹이. 바깥이 `key` 로 다시 매달아 편집 상태를 씻는다. */
const TripDetailEditor: React.FC<Omit<TripDetailModalProps, 'isOpen' | 'trip'> & { trip: Trip }> = ({
    trip,
    railData,
    regionNames,
    onSave,
    onDelete,
    onClose,
    onPreview
}) => {
    const { language } = useI18n();
    const t = getTranslations(MY_LINES_TRANSLATIONS, language);

    /**
     * 창은 열릴 때마다 새로 붙는다(부모가 `key` 로 다시 매단다). 그래서 편집 상태를
     * 효과로 되돌릴 필요가 없다 — 처음 값이 곧 원본이다.
     */
    const [draft, setDraft] = useState<Trip>(trip);
    const [candidates, setCandidates] = useState<CandidateRoute[] | null>(null);
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    const stations = useMemo(
        () => (railData?.stations || {}) as Record<string, Station>,
        [railData]
    );

    /**
     * 아직 못 찾은 끝점 짝.
     *
     * 끝점을 옮기는 조작이 이걸 세우면, 아래 효과가 받아서 길을 찾는다. 찾는 일은
     * 전국 그래프를 훑는 무거운 일이라 한 틱 미뤄야 "찾는 중"이 실제로 그려진다.
     * `apply` 는 찾은 첫 길을 바로 얹을지다 — 끝점이 바뀌었으면 얹어야 하고(옛 길은
     * 이제 그 두 역을 잇지 않는다), 그냥 후보만 보려는 것이면 얹지 않는다.
     */
    const [pending, setPending] = useState<{ from: string; to: string; apply: boolean } | null>(
        () => {
            const from = startIdOf(trip);
            const to = endIdOf(trip);
            return from && to ? { from, to, apply: false } : null;
        }
    );

    // 찾는 중인지는 따로 들고 있을 것이 없다 — 찾을 것이 남아 있으면 찾는 중이다.
    const isSearching = pending !== null;
    // 빈 목록은 "찾아봤지만 없다"는 뜻이다. null 은 아직 안 찾아봤다는 뜻.
    const searchFailed = candidates !== null && candidates.length === 0;

    useEffect(() => {
        if (!pending || !railData) return;
        let cancelled = false;
        const timer = setTimeout(() => {
            if (cancelled) return;
            const a = stations[pending.from];
            const b = stations[pending.to];
            const leg = a && b ? findCandidateRoutes([a, b], railData, {}).legs[0] : undefined;
            const found = leg ? leg.candidates : [];
            setCandidates(found);
            if (pending.apply && found.length > 0) {
                setDraft(current => applyRoute(current, found[0]));
            }
            setPending(null);
        }, 0);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [pending, railData, stations]);

    useEffect(() => {
        onPreview?.(draft);
    }, [draft, onPreview]);

    const graph = useMemo(() => (railData ? buildRouteGraph(railData) : null), [railData]);

    const nameOf = useCallback(
        (id: string | undefined) => {
            if (!id) return '';
            const st = stations[id];
            return st ? getLocalizedName(st, language) || st.name : id;
        },
        [stations, language]
    );

    const startId = startIdOf(draft);
    const endId = endIdOf(draft);

    /**
     * 끝점을 옮기고, 필요하면 그 사이 길을 다시 찾도록 걸어 둔다.
     *
     * 끝점이 그대로일 때는 찾지 않는다 — 사용자가 골라 둔 경로가 조용히 다른 것으로
     * 바뀌어 버리기 때문이다. 그래서 `needsResearch` 로 가른다.
     */
    const moveEnd = useCallback((next: Trip) => {
        setDraft(next);
        if (!needsResearch(draft, next)) return;
        const from = startIdOf(next);
        const to = endIdOf(next);
        setCandidates(null);
        setPending(from && to ? { from, to, apply: true } : null);
    }, [draft]);

    const growOptions = useMemo(() => {
        if (!graph) return { start: [] as string[], end: [] as string[] };
        return {
            start: neighboursToExtend(graph, draft, 'start'),
            end: neighboursToExtend(graph, draft, 'end')
        };
    }, [graph, draft]);

    const isDirty = useMemo(() => JSON.stringify(trip) !== JSON.stringify(draft), [trip, draft]);

    const shrink = (which: 'start' | 'end') => {
        const next = retractTrip(draft, which);
        if (next) moveEnd(next);
    };

    const grow = (which: 'start' | 'end', stationId: string) => {
        // 늘리기는 끝점만 옮기고 길은 다시 찾는다. 이웃한 역이라도 그 사이에 선로가
        // 한 가닥뿐이라는 보장이 없다.
        moveEnd(
            which === 'start'
                ? { ...draft, startId: stationId, start: nameOf(stationId) }
                : { ...draft, endId: stationId, end: nameOf(stationId) }
        );
    };

    const replaceEnd = (which: 'start' | 'end', station: Station | null) => {
        if (!station) return;
        const label = getLocalizedName(station, language) || station.name;
        moveEnd(
            which === 'start'
                ? { ...draft, startId: station.id, start: label }
                : { ...draft, endId: station.id, end: label }
        );
    };

    const flip = () => {
        // 뒤집기는 탄 선로가 그대로라 길을 다시 찾을 것이 없다. 다만 후보 목록은
        // 방향이 반대라 폴리라인이 거꾸로다 — 목록만 다시 받고, 여정에는 얹지 않는다.
        const next = reverseTrip(draft);
        setDraft(next);
        setCandidates(null);
        const from = startIdOf(next);
        const to = endIdOf(next);
        setPending(from && to ? { from, to, apply: false } : null);
    };

    const revert = () => {
        setDraft(trip);
        setCandidates(null);
        const from = startIdOf(trip);
        const to = endIdOf(trip);
        setPending(from && to ? { from, to, apply: false } : null);
    };

    const sectionLabel = `${(draft.distance ?? 0).toFixed(1)} km · ${draft.sectionIds?.length || 0}${
        language === 'en' ? ' segments' : t.legLabel
    }`;

    const endRow = (which: 'start' | 'end') => {
        const id = which === 'start' ? startId : endId;
        const options = which === 'start' ? growOptions.start : growOptions.end;
        const canShrink = (draft.path?.length || 0) > 2;
        return (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3 space-y-2">
                <div className="flex items-center gap-2">
                    <span
                        className={`size-2 rounded-full shrink-0 ${
                            which === 'start' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                    />
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">
                        {nameOf(id) || '—'}
                    </span>
                </div>

                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => shrink(which)}
                        disabled={!canShrink || isSearching}
                        title={canShrink ? t.shrink : t.cannotShrink}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 enabled:hover:border-primary enabled:hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                        <Minus className="w-3 h-3" />
                        {t.shrink}
                    </button>

                    <div className="relative flex-1 min-w-0">
                        <select
                            value=""
                            disabled={options.length === 0 || isSearching}
                            onChange={e => {
                                if (e.target.value) grow(which, e.target.value);
                            }}
                            aria-label={t.grow}
                            className="w-full appearance-none pl-6 pr-2 py-1.5 rounded-lg text-[11px] font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 enabled:hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                            <option value="">{options.length === 0 ? t.noNeighbour : t.grow}</option>
                            {options.map(nid => (
                                <option key={nid} value={nid}>
                                    {nameOf(nid)}
                                </option>
                            ))}
                        </select>
                        <Plus className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                <StationPickerRow
                    role={which}
                    placeholder={t.changeStation}
                    selectedStation={null}
                    onSelectStation={st => replaceEnd(which, st)}
                    railData={railData}
                    regionNames={regionNames}
                />
            </div>
        );
    };

    return (
        <div style={{ zIndex: Z.modal }} className="fixed inset-0 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            <div
                data-testid="trip-detail"
                className="relative w-full max-w-[560px] max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-6 duration-400 flex flex-col border border-slate-200/80 dark:border-slate-800"
            >
                <div className="px-5 py-4 flex items-start justify-between border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="min-w-0">
                        <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                            <Pencil className="w-4 h-4 text-primary shrink-0" />
                            <span className="truncate">{t.editTrip}</span>
                        </h2>
                        <p className="text-[11px] text-slate-400 mt-0.5">{t.editTripSubtitle}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer text-slate-400 shrink-0"
                        aria-label={t.cancelEdit}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-5">
                    {/* 지금 모습 */}
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 px-3.5 py-3">
                        <div className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">
                            {nameOf(startId)} → {nameOf(endId)}
                        </div>
                        <div className="text-[11px] text-slate-400 font-semibold mt-0.5">{sectionLabel}</div>
                    </div>

                    {/* 이름과 날짜 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                {t.tripName}
                            </span>
                            <input
                                type="text"
                                value={draft.name || ''}
                                placeholder={t.tripNamePlaceholder}
                                onChange={e => setDraft({ ...draft, name: e.target.value })}
                                className="mt-1 w-full h-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />
                        </label>

                        <label className="block">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                {t.rideDate}
                            </span>
                            <div className="mt-1 flex items-center gap-1.5">
                                <input
                                    type="date"
                                    value={draft.date || ''}
                                    onChange={e => setDraft({ ...draft, date: e.target.value || undefined })}
                                    className="flex-1 min-w-0 h-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                />
                                {draft.date && (
                                    <button
                                        type="button"
                                        onClick={() => setDraft({ ...draft, date: undefined })}
                                        title={t.clearDate}
                                        className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                            {/* 모르는 날을 오늘로 채우면 되짚기가 틀린 해에 그 여정을 세운다. */}
                            {!draft.date && (
                                <span className="text-[10px] text-slate-400 mt-1 block">{t.rideDateUnknown}</span>
                            )}
                        </label>
                    </div>

                    {/* 방향 */}
                    <div>
                        <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2">
                            {t.direction}
                        </h3>
                        <button
                            type="button"
                            onClick={flip}
                            disabled={isSearching}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 enabled:hover:border-primary enabled:hover:text-primary disabled:opacity-40 transition-colors cursor-pointer"
                        >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                            {t.swapEnds}
                        </button>
                    </div>

                    {/* 끝점 */}
                    <div>
                        <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2">
                            {t.endpoints}
                        </h3>
                        <div className="space-y-2.5">
                            {endRow('start')}
                            {endRow('end')}
                        </div>
                    </div>

                    {/* 중간 경로 */}
                    <div>
                        <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                            {t.middleRoutes}
                        </h3>

                        {isSearching ? (
                            <p className="text-[11px] text-slate-400 py-3">{t.searchingRoutes}</p>
                        ) : searchFailed ? (
                            <p className="text-[11px] text-rose-500 py-3">{t.routeNotFound}</p>
                        ) : candidates && candidates.length > 1 ? (
                            <>
                                <p className="text-[10px] text-slate-400 mb-2">{t.middleRoutesHint}</p>
                                <div className="space-y-1.5" data-testid="route-options">
                                    {candidates.map(candidate => {
                                        const isPicked =
                                            JSON.stringify(candidate.sectionIds) ===
                                            JSON.stringify(draft.sectionIds);
                                        return (
                                            <button
                                                key={candidate.id}
                                                type="button"
                                                data-route-id={candidate.id}
                                                onClick={() => setDraft(applyRoute(draft, candidate))}
                                                className={`w-full text-left px-3 py-2 rounded-xl border transition-colors cursor-pointer ${
                                                    isPicked
                                                        ? 'border-primary ring-1 ring-primary/30 bg-primary/5'
                                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                                        {candidate.distance.toFixed(1)} km
                                                    </span>
                                                    {isPicked && (
                                                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                                    {t.transferCount(candidate.transferCount)}
                                                    {candidate.walkCount > 0 &&
                                                        ` · ${t.walkCountLabel(candidate.walkCount)}`}
                                                </div>
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                    {candidate.lines.slice(0, 6).map((line, i) => (
                                                        <span
                                                            key={`${line.id}-${i}`}
                                                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-md text-white"
                                                            style={{ backgroundColor: line.color || '#94A3B8' }}
                                                        >
                                                            {getLocalizedName(line, language) || line.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <p className="text-[11px] text-slate-400 py-3">{t.onlyOneRoute}</p>
                        )}
                    </div>
                </div>

                <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 shrink-0 flex items-center gap-2">
                    {confirmingDelete ? (
                        <button
                            type="button"
                            onClick={() => onDelete(trip.id)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-500 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            {t.yesDelete}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setConfirmingDelete(true)}
                            title={t.deleteTrip}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}

                    {isDirty && (
                        <button
                            type="button"
                            onClick={revert}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            {t.revertEdit}
                        </button>
                    )}

                    <div className="flex-1" />

                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    >
                        {t.cancelEdit}
                    </button>
                    <button
                        type="button"
                        data-testid="trip-save"
                        onClick={() => onSave(draft)}
                        disabled={!isDirty || isSearching || searchFailed}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-white enabled:hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                        {t.saveTrip}
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * 여정 편집 창.
 *
 * 다른 여정으로 옮겨 가면 `key` 로 알맹이를 통째로 다시 매단다. 효과로 상태를
 * 되돌리는 것보다 확실하다 — 되돌릴 것을 하나 빠뜨리면 사용자는 앞 여정에서 고치던
 * 내용을 이 여정에 저장하게 된다.
 */
const TripDetailModal: React.FC<TripDetailModalProps> = ({ isOpen, trip, ...rest }) => {
    if (!isOpen || !trip) return null;
    return <TripDetailEditor key={trip.id} trip={trip} {...rest} />;
};

export default TripDetailModal;
