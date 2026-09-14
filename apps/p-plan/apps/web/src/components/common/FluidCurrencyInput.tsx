'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    resolveSuggestedCurrencies, 
    parseCurrencyExpression,
    CurrencyQuickChip,
    CURRENCY_SYMBOLS
} from '@pplaner/shared';

export interface FluidCurrencyInputProps {
    value: number;
    currency: string;
    onChange: (amount: number, currency: string, convertedKRW: number) => void;
    destinationCountryOrCity?: string;
    homeCurrency?: string;
    label?: string;
    placeholder?: string;
    autoFocus?: boolean;
    className?: string;
}

export function FluidCurrencyInput({
    value,
    currency,
    onChange,
    destinationCountryOrCity,
    homeCurrency = 'KRW',
    label,
    placeholder = '금액 입력 (예: 1500, 25e, 50$)',
    autoFocus = false,
    className = ''
}: FluidCurrencyInputProps) {
    const [inputValue, setInputValue] = useState<string>(value > 0 ? value.toString() : '');
    const [activeCurrency, setActiveCurrency] = useState<string>(currency || 'KRW');
    const inputRef = useRef<HTMLInputElement>(null);

    // 목적지 기반 스마트 통화 칩 리스트 생성
    const { primaryLocalCode, chips } = useMemo(() => {
        return resolveSuggestedCurrencies(destinationCountryOrCity, homeCurrency);
    }, [destinationCountryOrCity, homeCurrency]);

    // 초기 마운트 시 통화가 미지정이면 현지 최적 통화로 자동 세팅
    useEffect(() => {
        if (!currency && primaryLocalCode) {
            setActiveCurrency(primaryLocalCode);
        } else if (currency) {
            setActiveCurrency(currency);
        }
    }, [currency, primaryLocalCode]);

    // value prop이 외부에서 변경되었을 때 동기화
    useEffect(() => {
        if (value > 0 && parseFloat(inputValue.replace(/,/g, '')) !== value) {
            setInputValue(value.toString());
        }
    }, [value]);

    // 실시간 파싱 및 고스트 프리뷰 계산
    const parsedState = useMemo(() => {
        return parseCurrencyExpression(inputValue, activeCurrency);
    }, [inputValue, activeCurrency]);

    // 입력 처리 핸들러 (자연어 감지)
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawText = e.target.value;
        setInputValue(rawText);

        const parsed = parseCurrencyExpression(rawText, activeCurrency);

        // 만약 사용자가 '1500j' 처럼 통화 접미사를 쳤다면 activeCurrency도 자동 전환
        let finalCur = activeCurrency;
        if (parsed.hasExplicitCurrency && parsed.currencyCode) {
            finalCur = parsed.currencyCode;
            setActiveCurrency(finalCur);
        }

        const finalKRW = parsed.convertedAmountKRW ?? (finalCur === 'KRW' ? parsed.amount : Math.round(parsed.amount * 1));
        onChange(parsed.amount, finalCur, finalKRW);
    };

    // 원터치 칩 클릭 핸들러
    const handleChipClick = (chipCode: string) => {
        setActiveCurrency(chipCode);
        const parsed = parseCurrencyExpression(inputValue, chipCode);
        const finalKRW = parsed.convertedAmountKRW ?? (chipCode === 'KRW' ? parsed.amount : Math.round(parsed.amount * 1));
        onChange(parsed.amount, chipCode, finalKRW);
        inputRef.current?.focus();
    };

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            {label && (
                <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                        <span className="material-symbols-rounded text-sm text-cyan-400">payments</span>
                        {label}
                    </label>
                    <span className="text-[11px] text-neutral-400">
                        자연어 단축어 지원 (<span className="text-cyan-300 font-mono">1500j</span>, <span className="text-cyan-300 font-mono">25e</span>, <span className="text-cyan-300 font-mono">50$</span>)
                    </span>
                </div>
            )}

            {/* 원터치 통화 스위처 칩 바 */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <span className="text-[11px] font-medium text-neutral-400 whitespace-nowrap mr-1">통화:</span>
                {chips.map((chip) => {
                    const isSelected = activeCurrency === chip.code;
                    return (
                        <button
                            key={chip.code}
                            type="button"
                            onClick={() => handleChipClick(chip.code)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150 whitespace-nowrap cursor-pointer ${
                                isSelected
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-sm shadow-cyan-500/10 scale-[1.02]'
                                    : 'bg-neutral-800/80 hover:bg-neutral-700/80 text-neutral-400 hover:text-neutral-200 border border-neutral-700/50'
                            }`}
                        >
                            <span className="font-bold">{chip.code}</span>
                            <span className="text-[11px] opacity-75">{chip.symbol}</span>
                            {chip.isLocal && (
                                <span className="text-[9px] px-1 py-0.2 bg-cyan-400/20 text-cyan-200 rounded font-semibold">
                                    현지
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* 메인 인풋 필드 + 실시간 실루엣 환율 배지 */}
            <div className="relative flex flex-col gap-1.5">
                <div className="relative flex items-center">
                    <span className="absolute left-3 text-sm font-bold text-neutral-400 pointer-events-none select-none">
                        {CURRENCY_SYMBOLS[activeCurrency] || activeCurrency}
                    </span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        placeholder={placeholder}
                        autoFocus={autoFocus}
                        className="w-full bg-neutral-900/90 border border-neutral-700/80 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 rounded-xl pl-9 pr-20 py-2.5 text-sm font-medium text-neutral-100 placeholder:text-neutral-500 transition-all outline-none"
                    />
                    <div className="absolute right-3 flex items-center gap-1 pointer-events-none select-none">
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300">
                            {activeCurrency}
                        </span>
                    </div>
                </div>

                {/* 실시간 고스트 환율 미리보기 (원화가 아닐 때만 렌더링) */}
                {parsedState.formattedGhostEstimate && parsedState.amount > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900/60 border border-neutral-800/80 rounded-lg text-xs text-neutral-300">
                        <span className="material-symbols-rounded text-sm text-cyan-400">sync_alt</span>
                        <span className="font-semibold text-cyan-300">
                            {parsedState.formattedGhostEstimate}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
