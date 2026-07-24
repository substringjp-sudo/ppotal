'use client';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    useTripStore,
    useExchangeRateStore,
    calculateTripSettlement,
    getCurrencySymbol,
    generateId,
    cn,
    type Participant,
} from '@pplaner/shared';

/**
 * Layer 3 — 정산 (opt-in).
 *
 * 여행 단위 정산 모드를 켜면: 멤버를 관리하고, 모든 비용(항공·숙소·예약·교통·지출)의
 * 결제자·분담을 지정한 뒤, 최소 송금 경로("누가 누구에게")를 계산해 보여준다.
 * 솔로·커플에겐 꺼진 채 짧은 안내만 노출된다.
 */

type RowKind = 'expense' | 'flight' | 'accommodation' | 'reservation' | 'driving' | 'publicTransport';
const FIELD: Record<Exclude<RowKind, 'expense'>, 'flights' | 'accommodation' | 'reservations' | 'driving' | 'publicTransport'> = {
    flight: 'flights', accommodation: 'accommodation', reservation: 'reservations', driving: 'driving', publicTransport: 'publicTransport',
};

interface Row {
    kind: RowKind;
    id: string;
    label: string;
    amount: number;
    currency: string;
    payerId?: string;
    splitWithIds?: string[];
    splitExact?: Record<string, number>;
}

function formatKRWMan(amount: number): string {
    if (amount >= 10000) return `${(amount / 10000).toFixed(amount % 10000 === 0 ? 0 : 1)}만`;
    return `${Math.round(amount).toLocaleString()}원`;
}

export default function SettlementCard() {
    const trip = useTripStore((s) => s.currentTrip);
    const updateTrip = useTripStore((s) => s.updateTrip);
    const updateExpense = useTripStore((s) => s.updateExpense);
    const rates = useExchangeRateStore((s) => s.rates);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const enabled = !!trip?.settlement?.enabled;
    const mode = trip?.settlement?.mode || 'even';
    const participants = trip?.participants || [];

    const getRate = useMemo(() => {
        const base = trip?.budget?.baseCurrency || 'KRW';
        const map: Record<string, number> = {};
        (trip?.budget?.activeCurrencies || []).forEach((c) => { if (c.code) map[c.code] = c.rate; });
        return (code: string) => (!code || code === base ? 1 : map[code] || rates[code] || 1);
    }, [trip?.budget, rates]);

    const rows = useMemo<Row[]>(() => {
        if (!trip) return [];
        const out: Row[] = [];
        (trip.budget?.expenses || []).forEach((e) => {
            if (e.isExcluded || e.status !== 'confirmed') return;
            out.push({ kind: 'expense', id: e.id, label: e.title || '지출', amount: e.amount, currency: e.currency || 'KRW', payerId: e.payerId, splitWithIds: e.splitWithIds, splitExact: e.splitExact });
        });
        (trip.flights || []).forEach((f) => { if (f.cost) out.push({ kind: 'flight', id: f.id, label: `항공 ${f.flightNumber || ''}`.trim(), amount: f.cost, currency: f.currency || 'KRW', payerId: f.payerId, splitWithIds: f.splitWithIds, splitExact: f.splitExact }); });
        (trip.accommodation || []).forEach((a) => { if (a.price) out.push({ kind: 'accommodation', id: a.id, label: a.name || '숙소', amount: a.price, currency: a.currency || 'KRW', payerId: a.payerId, splitWithIds: a.splitWithIds, splitExact: a.splitExact }); });
        (trip.reservations || []).forEach((r) => { if (r.cost) out.push({ kind: 'reservation', id: r.id, label: r.title || '예약', amount: r.cost, currency: r.currency || 'KRW', payerId: r.payerId, splitWithIds: r.splitWithIds, splitExact: r.splitExact }); });
        (trip.driving || []).forEach((d) => { if (d.cost) out.push({ kind: 'driving', id: d.id, label: d.isRental ? '렌터카' : '차량', amount: d.cost, currency: d.currency || 'KRW', payerId: d.payerId, splitWithIds: d.splitWithIds, splitExact: d.splitExact }); });
        (trip.publicTransport || []).forEach((p) => { if (p.cost) out.push({ kind: 'publicTransport', id: p.id, label: p.name || '대중교통', amount: p.cost, currency: p.currency || 'KRW', payerId: p.payerId, splitWithIds: p.splitWithIds, splitExact: p.splitExact }); });
        return out;
    }, [trip]);

    const settlement = useMemo(() => (trip && enabled ? calculateTripSettlement(trip, getRate) : null), [trip, enabled, getRate]);

    if (!trip) return null;

    const name = (id?: string) => participants.find((p) => p.id === id)?.name || '?';

    // ── 설정/멤버 액션 ──
    const setSettlement = (patch: Partial<NonNullable<typeof trip.settlement>>) =>
        updateTrip({ settlement: { enabled, mode, defaultPayerId: trip.settlement?.defaultPayerId, ...patch } });

    const enable = () => {
        let ps = participants;
        if (ps.length === 0) {
            ps = [{ id: generateId(), name: '나', role: 'me', status: 'accepted' } as Participant];
            updateTrip({ participants: ps });
        }
        updateTrip({ settlement: { enabled: true, mode: 'even', defaultPayerId: ps.find((p) => p.role === 'me')?.id || ps[0].id } });
    };

    const addMember = () => updateTrip({ participants: [...participants, { id: generateId(), name: `멤버 ${participants.length + 1}`, role: 'group member', status: 'accepted' } as Participant] });
    const renameMember = (id: string, n: string) => updateTrip({ participants: participants.map((p) => (p.id === id ? { ...p, name: n } : p)) });
    const removeMember = (id: string) => updateTrip({ participants: participants.filter((p) => p.id !== id) });

    // ── 항목 결제자/분담 수정 ──
    const patchRow = (row: Row, patch: Partial<Row>) => {
        const clean: any = {};
        if ('payerId' in patch) clean.payerId = patch.payerId;
        if ('splitWithIds' in patch) clean.splitWithIds = patch.splitWithIds;
        if ('splitExact' in patch) clean.splitExact = patch.splitExact;
        if (row.kind === 'expense') { updateExpense(row.id, clean); return; }
        const field = FIELD[row.kind];
        updateTrip({ [field]: ((trip as any)[field] || []).map((x: any) => (x.id === row.id ? { ...x, ...clean } : x)) } as any);
    };

    const toggleSplitMember = (row: Row, pid: string) => {
        const cur = row.splitWithIds || participants.map((p) => p.id);
        const next = cur.includes(pid) ? cur.filter((x) => x !== pid) : [...cur, pid];
        patchRow(row, { splitWithIds: next.length ? next : undefined, splitExact: undefined });
    };
    const setExact = (row: Row, pid: string, val: string) => {
        const next = { ...(row.splitExact || {}) };
        const n = parseFloat(val);
        if (!n || n <= 0) delete next[pid]; else next[pid] = n;
        patchRow(row, { splitExact: Object.keys(next).length ? next : undefined });
    };

    // ── 꺼진 상태 ──
    if (!enabled) {
        return (
            <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/20 p-6 text-center">
                <span className="material-symbols-rounded text-3xl text-slate-300">group</span>
                <p className="mt-1 text-sm font-black text-slate-700 dark:text-slate-200">여럿이 함께 가나요?</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">정산 모드를 켜면 항공·숙소·지출을 누가 얼마씩 냈는지 정리하고 최종 송금을 계산해 드려요.</p>
                <button onClick={enable} className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-xs font-black text-white shadow-sm hover:bg-primary/90 transition">
                    정산 모드 켜기
                </button>
            </div>
        );
    }

    return (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="p-5 sm:p-6 flex flex-col gap-5">
                {/* 헤더 + 끄기 */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-rounded text-primary">receipt_long</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white">정산</span>
                    </div>
                    <button onClick={() => setSettlement({ enabled: false })} className="text-[11px] font-bold text-slate-400 hover:text-rose-500 transition">정산 모드 끄기</button>
                </div>

                {/* 기본 분할 모드 */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {([['even', '1/N', '전원 균등'], ['individual', '각자', '기본 미분담']] as const).map(([id, label, sub]) => {
                        const on = mode === id;
                        return (
                            <button key={id} onClick={() => setSettlement({ mode: id })} aria-pressed={on}
                                className={cn('flex-1 rounded-lg py-1.5 text-center transition-all', on ? 'bg-white dark:bg-slate-900 shadow-sm' : 'text-slate-400')}>
                                <span className={cn('text-xs font-black', on ? 'text-slate-900 dark:text-white' : '')}>{label}</span>
                                <span className={cn('ml-1 text-[10px] font-bold', on ? 'text-primary' : 'text-slate-400')}>{sub}</span>
                            </button>
                        );
                    })}
                </div>

                {/* 멤버 */}
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">멤버 {participants.length}명</p>
                    <div className="flex flex-col gap-1.5">
                        {participants.map((p) => (
                            <div key={p.id} className="flex items-center gap-2">
                                <input
                                    value={p.name}
                                    onChange={(e) => renameMember(p.id, e.target.value)}
                                    className="flex-1 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-primary"
                                />
                                <button
                                    onClick={() => setSettlement({ defaultPayerId: p.id })}
                                    title="기본 결제자로 지정"
                                    className={cn('px-2 h-9 rounded-lg text-[10px] font-black border transition', trip.settlement?.defaultPayerId === p.id ? 'bg-primary/10 border-primary/30 text-primary' : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-primary')}
                                >
                                    기본결제
                                </button>
                                {participants.length > 1 && (
                                    <button onClick={() => removeMember(p.id)} aria-label="멤버 삭제" className="text-slate-300 hover:text-rose-500 transition">
                                        <span className="material-symbols-rounded text-[18px]">close</span>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    <button onClick={addMember} className="mt-2 inline-flex items-center gap-1 text-[11px] font-black text-primary hover:opacity-80">
                        <span className="material-symbols-rounded text-[15px]">add</span> 멤버 추가
                    </button>
                </div>

                {/* 항목별 결제자·분담 */}
                {rows.length > 0 && (
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">비용 항목 {rows.length}개</p>
                        <div className="flex flex-col gap-1.5">
                            {rows.map((row) => {
                                const sym = getCurrencySymbol(row.currency);
                                const open = expandedId === `${row.kind}-${row.id}`;
                                const isExact = !!row.splitExact && Object.keys(row.splitExact).length > 0;
                                const splitCount = isExact ? Object.keys(row.splitExact!).length : (row.splitWithIds?.length ?? participants.length);
                                return (
                                    <div key={`${row.kind}-${row.id}`} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 overflow-hidden">
                                        <div className="flex items-center gap-2 px-3 py-2.5">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{row.label}</p>
                                                <p className="text-[10px] text-slate-400 tabular-nums">{sym}{row.amount.toLocaleString()}</p>
                                            </div>
                                            <select
                                                value={row.payerId || ''}
                                                onChange={(e) => patchRow(row, { payerId: e.target.value || undefined })}
                                                className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-primary max-w-[96px]"
                                            >
                                                <option value="">결제자</option>
                                                {participants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                            <button
                                                onClick={() => setExpandedId(open ? null : `${row.kind}-${row.id}`)}
                                                className={cn('h-8 px-2.5 rounded-lg text-[10px] font-black border transition inline-flex items-center gap-1', open ? 'bg-primary/10 border-primary/30 text-primary' : 'border-slate-200 dark:border-slate-700 text-slate-500')}
                                            >
                                                {isExact ? '커스텀' : `${splitCount}명`}
                                                <span className="material-symbols-rounded text-[14px]">{open ? 'expand_less' : 'group'}</span>
                                            </button>
                                        </div>
                                        <AnimatePresence initial={false}>
                                            {open && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                    <div className="px-3 pb-3 pt-1 flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase">누가 나눠 내나</span>
                                                            <button
                                                                onClick={() => patchRow(row, isExact ? { splitExact: undefined } : { splitExact: Object.fromEntries((row.splitWithIds || participants.map((p) => p.id)).map((id) => [id, Math.round(row.amount / (row.splitWithIds?.length || participants.length))])) })}
                                                                className="text-[10px] font-black text-primary"
                                                            >
                                                                {isExact ? '균등으로' : '정확 금액'}
                                                            </button>
                                                        </div>
                                                        {participants.map((p) => {
                                                            const checked = isExact ? row.splitExact![p.id] != null : (row.splitWithIds || participants.map((x) => x.id)).includes(p.id);
                                                            return (
                                                                <div key={p.id} className="flex items-center gap-2">
                                                                    {!isExact && (
                                                                        <button onClick={() => toggleSplitMember(row, p.id)} className="inline-flex items-center gap-1.5 flex-1 text-left">
                                                                            <span className={cn('material-symbols-rounded text-[18px]', checked ? 'text-primary' : 'text-slate-300')}>{checked ? 'check_circle' : 'radio_button_unchecked'}</span>
                                                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{p.name}</span>
                                                                        </button>
                                                                    )}
                                                                    {isExact && (
                                                                        <>
                                                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex-1">{p.name}</span>
                                                                            <div className="relative w-28">
                                                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-black text-slate-400">{sym}</span>
                                                                                <input
                                                                                    type="number" inputMode="decimal"
                                                                                    value={row.splitExact![p.id] ?? ''}
                                                                                    onChange={(e) => setExact(row, p.id, e.target.value)}
                                                                                    placeholder="0"
                                                                                    className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-6 pr-2 text-[11px] font-bold text-slate-800 dark:text-white outline-none focus:border-primary tabular-nums"
                                                                                />
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 결과 */}
                {settlement && (
                    <div className="rounded-2xl bg-slate-900 dark:bg-slate-950 text-white p-5">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">정산 결과</span>
                            <span className="text-[11px] font-bold text-slate-400 tabular-nums">공동지출 {formatKRWMan(settlement.totalShared)}</span>
                        </div>
                        {settlement.transfers.length > 0 ? (
                            <div className="flex flex-col gap-2">
                                {settlement.transfers.map((t, i) => (
                                    <div key={i} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                                        <span className="text-sm font-black flex items-center gap-2">
                                            {name(t.from)} <span className="material-symbols-rounded text-emerald-400 text-lg">arrow_forward</span> {name(t.to)}
                                        </span>
                                        <span className="text-sm font-black text-emerald-400 tabular-nums">{t.amount.toLocaleString()}원</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm font-bold text-slate-400 py-2 text-center">정산할 내역이 없어요 (결제자·분담을 지정해 보세요).</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
