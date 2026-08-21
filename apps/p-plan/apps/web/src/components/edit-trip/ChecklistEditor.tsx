'use client';
import { useMemo, useState } from 'react';
import {
    useTripStore, useUserStore, useSettingsStore,
    buildPrepCards, PREP_CARD_DEFS, CUSTOM_CARD_ID,
    resolveCountryProfile, SUPPORTED_HOME_COUNTRIES, cn,
    type ActivePrepCard, type SuggestedPrepCard, type PrepItem,
} from '@pplaner/shared';
import { CustomCheckbox } from '@/components/common/FormComponents';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 여행 준비 — 주제 카드 편집기.
 *
 * 준비물을 하나의 긴 목록으로 주면 "다 해내야 하는 숙제"로 읽힌다. 여행마다 필요한
 * 준비가 다른데 목록은 그 차이를 표현하지 못한다. 그래서 여기서는 항목이 아니라
 * 카드를 다룬다 — 필요한 카드만 담고, 담은 카드 안에서 체크한다.
 *
 * 화면 순서도 그 태도를 따른다: 내가 담은 것이 먼저고, 제안은 그 아래에 있다.
 * 제안을 거절하는 버튼("필요 없어요")을 담기 버튼과 나란히 두는 것도 같은 이유다 —
 * 거절이 정상적인 선택지로 보여야 목록이 숙제로 읽히지 않는다.
 */

const PRIORITY_LABEL = { essential: '꼭 필요', recommended: '권장', optional: '선택' } as const;

export default function ChecklistEditor() {
    const trip = useTripStore((state) => state.currentTrip);
    const updateChecklistItem = useTripStore((state) => state.updateChecklistItem);
    const addChecklistItem = useTripStore((state) => state.addChecklistItem);
    const removeChecklistItem = useTripStore((state) => state.removeChecklistItem);
    const addPrepCard = useTripStore((state) => state.addPrepCard);
    const removePrepCard = useTripStore((state) => state.removePrepCard);
    const dismissPrepCard = useTripStore((state) => state.dismissPrepCard);

    const profileHomeCountry = useUserStore((state) => state.profile?.residence?.country);
    const homeCountryOverride = useSettingsStore((state) => state.homeCountryOverride);
    const updateHomeCountryOverride = useSettingsStore((state) => state.updateHomeCountryOverride);

    const [showCardPicker, setShowCardPicker] = useState(false);

    // 로그인 프로필에 거주국이 있으면 그것을 우선하고, 없으면 기기에 저장된 선택값을 쓴다.
    // 비자·어댑터·전압은 기준국이 정확해야 의미가 있다.
    const homeCountry = profileHomeCountry || homeCountryOverride;
    const homeProfile = resolveCountryProfile(homeCountry);

    const { active, suggested } = useMemo(
        () => (trip ? buildPrepCards(trip, { homeCountryName: homeCountry }) : { active: [], suggested: [] }),
        [trip, homeCountry],
    );

    if (!trip) return null;

    const activeIds = new Set(active.map((c) => c.id));
    const pickableCards = PREP_CARD_DEFS.filter((d) => !activeIds.has(d.id));

    return (
        <div className="space-y-10">
            {/* 거주국 — 로그인 프로필에 이미 있으면 숨긴다 */}
            {!profileHomeCountry && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-[20px] flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className="material-symbols-rounded text-base text-slate-400">badge</span>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">내 국적(거주국)</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {SUPPORTED_HOME_COUNTRIES.map((c) => {
                            const isActive = (homeCountryOverride || 'KR') === c.key;
                            return (
                                <button
                                    key={c.key}
                                    onClick={() => updateHomeCountryOverride(c.key === 'KR' ? undefined : c.key)}
                                    className={cn(
                                        'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                                        isActive
                                            ? 'bg-primary text-white border-primary shadow-sm'
                                            : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-primary/40',
                                    )}
                                >
                                    {c.name}
                                </button>
                            );
                        })}
                    </div>
                    <p className="w-full text-xs font-medium text-slate-400">
                        비자·어댑터·전압은 이 국적을 기준으로 계산돼요. 로그인하면 프로필 설정값이 자동으로 쓰여요.
                    </p>
                </div>
            )}

            {/* 담은 카드 */}
            <section className="space-y-4">
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">내 준비 카드</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            이번 여행에 필요한 것만 담으세요. 담지 않은 카드는 준비도에 영향을 주지 않아요.
                        </p>
                    </div>
                    {pickableCards.length > 0 && (
                        <button
                            onClick={() => setShowCardPicker((v) => !v)}
                            className="shrink-0 text-xs font-semibold text-primary px-3 py-1.5 bg-primary/5 rounded-lg border border-primary/10 hover:bg-primary/10 transition-all flex items-center gap-1"
                        >
                            <span className="material-symbols-rounded text-sm">{showCardPicker ? 'close' : 'add'}</span>
                            {showCardPicker ? '닫기' : '카드 담기'}
                        </button>
                    )}
                </div>

                <AnimatePresence>
                    {showCardPicker && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-[20px] border border-slate-200 dark:border-slate-800">
                                {pickableCards.map((def) => (
                                    <button
                                        key={def.id}
                                        onClick={() => {
                                            // 주제만 잡아 두는 빈 카드. 이 주제의 추천 항목이 있으면
                                            // 카드 안에서 "이것도 있어요"로 제안된다.
                                            addPrepCard(def.id, []);
                                            setShowCardPicker(false);
                                        }}
                                        className="flex items-center gap-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[14px] hover:border-primary/40 transition-all text-left"
                                    >
                                        <span className="material-symbols-rounded text-lg text-slate-400 shrink-0">{def.icon}</span>
                                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{def.title}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {active.length === 0 ? (
                    <div className="py-12 px-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-[20px]">
                        <span className="material-symbols-rounded text-3xl text-slate-300 dark:text-slate-700 mb-3 block">
                            playlist_add_check
                        </span>
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">아직 담은 카드가 없어요</p>
                        <p className="text-xs text-slate-400 mt-1">
                            아래 제안 중 필요한 것만 담아도 충분해요. 전부 담을 필요는 없습니다.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {active.map((card) => (
                            <ActiveCard
                                key={card.id}
                                card={card}
                                onToggle={(id, done) => updateChecklistItem(id, { isDone: done })}
                                onRemoveItem={removeChecklistItem}
                                onAddItem={(title) => addChecklistItem({ title, cardId: card.id })}
                                onAddSuggested={(p) => addPrepCard(card.id, [{ title: p.title, prepId: p.id, priority: p.priority }])}
                                onRemoveCard={() => removePrepCard(card.id)}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* 제안 */}
            {suggested.length > 0 && (
                <section className="space-y-4">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span className="material-symbols-rounded text-base text-primary">lightbulb</span>
                            이런 것도 챙기시나요?
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            여행지·시기·테마를 보고 골랐어요. 필요 없으면 접어 두면 다시 묻지 않아요.
                            {homeProfile && <> · 기준 국적 <b>{homeProfile.aliases[0]}</b></>}
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {suggested.map((card) => (
                            <SuggestedCard
                                key={card.id}
                                card={card}
                                onAccept={() =>
                                    addPrepCard(card.id, card.items.map((p) => ({ title: p.title, prepId: p.id, priority: p.priority })))
                                }
                                onDismiss={() => dismissPrepCard(card.id)}
                            />
                        ))}
                    </div>
                    <p className="text-xs text-slate-400">
                        비자·입국 요건은 참고용이에요. 출발 전 대사관·공식 사이트에서 꼭 다시 확인하세요.
                    </p>
                </section>
            )}
        </div>
    );
}

// ─── 담은 카드 ──────────────────────────────────────────────────

function ActiveCard({
    card, onToggle, onRemoveItem, onAddItem, onAddSuggested, onRemoveCard,
}: {
    card: ActivePrepCard;
    onToggle: (id: string, done: boolean) => void;
    onRemoveItem: (id: string) => void;
    onAddItem: (title: string) => void;
    onAddSuggested: (item: PrepItem) => void;
    onRemoveCard: () => void;
}) {
    const [draft, setDraft] = useState('');
    const allDone = card.items.length > 0 && card.doneCount === card.items.length;

    return (
        <div className="rounded-[20px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_1px_2px_rgba(15,23,42,.05)] overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
                <span className={cn(
                    'material-symbols-rounded text-lg shrink-0',
                    allDone ? 'text-emerald-500' : 'text-primary',
                )}>
                    {allDone ? 'task_alt' : card.icon}
                </span>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex-1 min-w-0 truncate">{card.title}</h4>
                {card.pendingEssentialCount > 0 && (
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-md px-1.5 py-0.5 shrink-0">
                        꼭 필요 {card.pendingEssentialCount}
                    </span>
                )}
                <span className="text-xs font-semibold text-slate-400 tabular-nums shrink-0">
                    {card.doneCount}/{card.items.length}
                </span>
                <button
                    onClick={onRemoveCard}
                    title="이 카드 비우기"
                    className="material-symbols-rounded text-slate-300 hover:text-red-500 transition-colors text-lg shrink-0"
                >
                    close
                </button>
            </div>

            <div className="p-2 flex-1">
                {card.items.length === 0 && card.unaddedItems.length === 0 && (
                    <p className="px-2 py-4 text-xs text-slate-400">
                        아직 비어 있어요. 아래에 직접 적어 채우면 돼요.
                    </p>
                )}
                {card.items.map((item) => (
                    <div key={item.id} className="group flex items-center gap-3 px-2 py-2 rounded-[10px] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <CustomCheckbox
                            checked={!!item.isDone}
                            onChange={(checked: boolean) => onToggle(item.id, checked)}
                            className="flex-shrink-0"
                        />
                        <span className={cn(
                            'text-sm flex-1 min-w-0',
                            item.isDone ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300',
                        )}>
                            {item.title}
                        </span>
                        {item.priority === 'essential' && !item.isDone && (
                            <span className="text-xs font-semibold text-red-500 shrink-0">필수</span>
                        )}
                        <button
                            onClick={() => onRemoveItem(item.id)}
                            className="material-symbols-rounded text-slate-300 hover:text-red-500 transition-all text-base opacity-0 group-hover:opacity-100 shrink-0"
                        >
                            delete
                        </button>
                    </div>
                ))}

                {/* 카드를 담은 뒤에 계획이 바뀌어 새로 생긴 준비물 */}
                {card.unaddedItems.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800">
                        <p className="px-2 text-xs text-slate-400 mb-1.5">이것도 있어요</p>
                        <div className="flex flex-wrap gap-1.5 px-2 pb-1">
                            {card.unaddedItems.map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => onAddSuggested(p)}
                                    title={p.reason}
                                    className="text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-2.5 py-1 hover:border-primary hover:text-primary transition-all flex items-center gap-1"
                                >
                                    <span className="material-symbols-rounded text-xs">add</span>
                                    {p.title}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    if (!draft.trim()) return;
                    onAddItem(draft.trim());
                    setDraft('');
                }}
                className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20"
            >
                <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="이 카드에 직접 추가…"
                    className="w-full bg-transparent text-xs text-slate-700 dark:text-slate-300 placeholder:text-slate-400 outline-none py-1"
                />
            </form>
        </div>
    );
}

// ─── 제안 카드 ──────────────────────────────────────────────────

function SuggestedCard({
    card, onAccept, onDismiss,
}: {
    card: SuggestedPrepCard;
    onAccept: () => void;
    onDismiss: () => void;
}) {
    const isEssential = card.priority === 'essential';

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                'rounded-[20px] border p-4 flex flex-col gap-3 transition-all',
                isEssential
                    ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/40'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-primary/30',
            )}
        >
            <div className="flex items-start gap-2.5">
                <span className={cn('material-symbols-rounded text-lg shrink-0', isEssential ? 'text-amber-600' : 'text-slate-400')}>
                    {card.icon}
                </span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{card.title}</h4>
                        {isEssential && (
                            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 shrink-0">
                                {PRIORITY_LABEL.essential}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{card.blurb}</p>
                </div>
            </div>

            {card.reason && (
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">{card.reason}</p>
            )}

            <ul className="space-y-1">
                {card.items.slice(0, 4).map((p) => (
                    <li key={p.id} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                        <span className="text-slate-300 dark:text-slate-600 shrink-0">·</span>
                        <span className="min-w-0">{p.title}</span>
                    </li>
                ))}
                {card.items.length > 4 && (
                    <li className="text-xs text-slate-400 pl-3">외 {card.items.length - 4}개</li>
                )}
            </ul>

            <div className="flex items-center gap-2 mt-auto pt-1">
                <button
                    onClick={onAccept}
                    className="flex-1 text-xs font-semibold text-white bg-primary rounded-lg py-2 hover:bg-primary/90 transition-all"
                >
                    담기
                </button>
                <button
                    onClick={onDismiss}
                    className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 px-2 py-2 transition-colors"
                >
                    필요 없어요
                </button>
            </div>
        </motion.div>
    );
}
