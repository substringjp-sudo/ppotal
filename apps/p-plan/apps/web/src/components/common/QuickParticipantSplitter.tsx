'use client';

import React, { useMemo } from 'react';
import { CURRENCY_SYMBOLS } from '@pplaner/shared';

export interface ParticipantItem {
    id: string;
    name: string;
    avatarUrl?: string;
}

export interface QuickParticipantSplitterProps {
    totalAmount: number;
    currency?: string;
    participants: ParticipantItem[];
    selectedParticipantIds: string[];
    onChange: (selectedIds: string[], perPersonAmount: number) => void;
    label?: string;
    className?: string;
}

export function QuickParticipantSplitter({
    totalAmount,
    currency = 'KRW',
    participants,
    selectedParticipantIds,
    onChange,
    label = '1/N 정산 참여 멤버',
    className = ''
}: QuickParticipantSplitterProps) {
    // 최소 1명 이상이어야 분할 가능
    const effectiveParticipants = useMemo(() => {
        if (!participants || participants.length === 0) {
            return [{ id: 'me', name: '나' }];
        }
        return participants;
    }, [participants]);

    const activeCount = selectedParticipantIds.length;
    const perPersonAmount = useMemo(() => {
        if (activeCount === 0 || totalAmount <= 0) return 0;
        return Math.ceil(totalAmount / activeCount);
    }, [totalAmount, activeCount]);

    const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;

    // 단일 멤버 On/Off 토글
    const handleToggleMember = (memberId: string) => {
        let newSelected: string[];
        if (selectedParticipantIds.includes(memberId)) {
            // 최소 1명은 유지
            if (selectedParticipantIds.length === 1) return;
            newSelected = selectedParticipantIds.filter(id => id !== memberId);
        } else {
            newSelected = [...selectedParticipantIds, memberId];
        }
        const newPerPerson = Math.ceil(totalAmount / (newSelected.length || 1));
        onChange(newSelected, newPerPerson);
    };

    // '전원 참여' 클릭
    const handleSelectAll = () => {
        const allIds = effectiveParticipants.map(p => p.id);
        onChange(allIds, Math.ceil(totalAmount / allIds.length));
    };

    // '나만 결제 (1인 단독)' 클릭
    const handleSelectMeOnly = () => {
        const firstId = effectiveParticipants[0]?.id || 'me';
        onChange([firstId], totalAmount);
    };

    return (
        <div className={`flex flex-col gap-2.5 ${className}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <span className="material-symbols-rounded text-sm text-cyan-400">group</span>
                    <label className="text-xs font-semibold text-neutral-300">{label}</label>
                    <span className="text-[11px] font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-1.5 py-0.2 rounded-full">
                        {activeCount}명 참여 중
                    </span>
                </div>

                {/* 퀵 프리셋 버튼 */}
                {effectiveParticipants.length > 1 && (
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={handleSelectAll}
                            className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
                                activeCount === effectiveParticipants.length
                                    ? 'bg-neutral-800 text-cyan-300 font-bold border border-cyan-800/50'
                                    : 'text-neutral-400 hover:text-neutral-200'
                            }`}
                        >
                            전원 분할
                        </button>
                        <span className="text-neutral-700 text-[10px]">|</span>
                        <button
                            type="button"
                            onClick={handleSelectMeOnly}
                            className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
                                activeCount === 1 && selectedParticipantIds.includes(effectiveParticipants[0].id)
                                    ? 'bg-neutral-800 text-cyan-300 font-bold border border-cyan-800/50'
                                    : 'text-neutral-400 hover:text-neutral-200'
                            }`}
                        >
                            1인 단독
                        </button>
                    </div>
                )}
            </div>

            {/* 참여자 버블 가로 목록 */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {effectiveParticipants.map((member, idx) => {
                    const isSelected = selectedParticipantIds.includes(member.id);
                    return (
                        <button
                            key={member.id}
                            type="button"
                            onClick={() => handleToggleMember(member.id)}
                            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-150 cursor-pointer min-w-[72px] ${
                                isSelected
                                    ? 'bg-gradient-to-b from-cyan-950/40 to-neutral-900 border border-cyan-500/40 shadow-sm shadow-cyan-950/30'
                                    : 'bg-neutral-900/40 border border-neutral-800/60 opacity-40 hover:opacity-75'
                            }`}
                        >
                            {/* 아바타 / 이니셜 */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                isSelected
                                    ? 'bg-gradient-to-tr from-cyan-600 to-teal-400 text-neutral-950 shadow-sm'
                                    : 'bg-neutral-800 text-neutral-400'
                            }`}>
                                {member.name.charAt(0)}
                            </div>

                            {/* 이름 */}
                            <span className={`text-[11px] font-medium truncate max-w-[64px] ${
                                isSelected ? 'text-neutral-200' : 'text-neutral-500'
                            }`}>
                                {member.name}
                            </span>

                            {/* 1인당 분담액 뱃지 */}
                            {isSelected ? (
                                <span className="text-[10px] font-bold text-cyan-300 font-mono">
                                    {totalAmount > 0 ? `${perPersonAmount.toLocaleString()}${currencySymbol}` : '0원'}
                                </span>
                            ) : (
                                <span className="text-[9px] text-neutral-500 font-medium">
                                    제외됨
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* 하단 총 분담 요약 브리핑 */}
            {totalAmount > 0 && activeCount > 0 && (
                <div className="flex items-center justify-between px-3 py-2 bg-neutral-900/70 border border-neutral-800/80 rounded-xl">
                    <span className="text-xs text-neutral-400">1인당 예상 분담액</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-cyan-300 font-mono">
                            {perPersonAmount.toLocaleString()}
                        </span>
                        <span className="text-xs font-semibold text-neutral-400">{currencySymbol}</span>
                        <span className="text-[10px] text-neutral-500 font-medium">
                            ({activeCount}명 균등 분할)
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
