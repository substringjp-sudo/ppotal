import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@pplaner/shared';
import { 
    CATEGORY_OPTIONS, 
    PAYMENT_METHOD_OPTIONS, 
    PAYMENT_STATUS_OPTIONS, 
    CURRENCY_OPTIONS 
} from './BudgetConstants';
import { IconDropdown } from '@/components/common/FormComponents';

interface BudgetExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    initialData?: any;
    tripParticipants: any[];
    isSoloTrip: boolean;
    baseCurrency: string;
    activeCurrencies: any[];
    getRate: (code: string) => number;
}

export const BudgetExpenseModal: React.FC<BudgetExpenseModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData,
    tripParticipants,
    isSoloTrip,
    baseCurrency,
    activeCurrencies,
    getRate
}) => {
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('KRW');
    const [category, setCategory] = useState('food');
    const [participantId, setParticipantId] = useState('');
    const [payerId, setPayerId] = useState('');
    const [splitWithIds, setSplitWithIds] = useState<string[]>([]);
    const [status, setStatus] = useState<'confirmed' | 'planned'>('confirmed');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [paymentStatus, setPaymentStatus] = useState('paid');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (initialData) {
            setTitle(initialData.title || '');
            setAmount(String(initialData.amount || ''));
            setCurrency(initialData.currency || 'KRW');
            setCategory(initialData.category || 'food');
            setParticipantId(initialData.participantId || '');
            setPayerId(initialData.payerId || '');
            setSplitWithIds(initialData.splitWithIds || []);
            setStatus(initialData.status || 'confirmed');
            setPaymentMethod(initialData.paymentMethod || 'cash');
            setPaymentStatus(initialData.paymentStatus || 'paid');
            setPaymentDate(initialData.paymentDate || new Date().toISOString().split('T')[0]);
        } else {
            setTitle('');
            setAmount('');
            setCurrency(baseCurrency || 'KRW');
            setCategory('food');
            setParticipantId('');
            setPayerId('');
            setSplitWithIds(tripParticipants.map(p => p.id));
            setStatus('confirmed');
            setPaymentMethod('cash');
            setPaymentStatus('paid');
            setPaymentDate(new Date().toISOString().split('T')[0]);
        }
    }, [initialData, baseCurrency, tripParticipants]);

    const availableCurrencies = useMemo(() => {
        const recommended = (activeCurrencies || []).map(c => ({
            code: c.code,
            symbol: c.symbol,
            name: CURRENCY_OPTIONS.find(o => o.value === c.code)?.label.split(' (')[0] || c.code
        }));
        
        if (!recommended.find(c => c.code === 'KRW')) {
            recommended.unshift({ code: 'KRW', symbol: '₩', name: '대한민국 원' });
        }

        const others = CURRENCY_OPTIONS.filter(o => !recommended.find(r => r.code === o.value)).map(o => ({
            code: o.value,
            symbol: o.label.split(') ')[1] || '',
            name: o.label.split(' (')[0]
        }));

        return { recommended, others };
    }, [activeCurrencies]);

    const formatAmount = (num: number) => new Intl.NumberFormat('ko-KR').format(num);
    const currencySymbol = useMemo(() => {
        if (baseCurrency === 'KRW') return '₩';
        return activeCurrencies.find(c => c.code === baseCurrency)?.symbol || '$';
    }, [baseCurrency, activeCurrencies]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
                <div className="p-8 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            {initialData ? '지출 내역 수정' : '새로운 지출 기록'}
                        </h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            {initialData?.isAuto ? '자동 수집된 정보입니다' : '상세 정보를 입력하세요'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all text-slate-400">
                        <span className="material-symbols-rounded text-2xl">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">지출 항목 명칭</label>
                        <input 
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="식비, 기념품, 택시비 등"
                            readOnly={initialData?.isAuto}
                            className={cn(
                                "w-full px-4 py-3 rounded-xl font-bold border-none focus:ring-2 focus:ring-primary/20 outline-none",
                                initialData?.isAuto ? "bg-slate-100 dark:bg-slate-900 text-slate-400 cursor-not-allowed" : "bg-slate-50 dark:bg-slate-800"
                            )}
                        />
                        {initialData?.isAuto && (
                            <span className="text-[9px] font-bold text-slate-400 ml-1">※ 자동 수집된 항목의 명칭은 출처에서 수정할 수 있습니다.</span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">금액 및 통화</label>
                            <div className="flex gap-2">
                                <select 
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                    className="w-24 min-w-[96px] bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-3 text-xs font-black outline-none border-none cursor-pointer"
                                >
                                    <optgroup label="추천 통화">
                                        {availableCurrencies.recommended.map(c => (
                                            <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="전체 통화">
                                        {availableCurrencies.others.map(c => (
                                            <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                                        ))}
                                    </optgroup>
                                </select>
                                <input 
                                    type="number"
                                    value={amount}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val.length > 1 && val.startsWith('0') && val[1] !== '.') {
                                            setAmount(val.substring(1));
                                        } else {
                                            setAmount(val);
                                        }
                                    }}
                                    placeholder="0"
                                    className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border-none focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                            </div>
                            {currency !== (baseCurrency || 'KRW') && (
                                <div className="mt-2 p-3 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/20">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-primary/60 uppercase">실시간 환산 미리보기</span>
                                        <span className="text-[10px] font-bold text-slate-400">1 {currency} = {getRate(currency)} {baseCurrency}</span>
                                    </div>
                                    <div className="flex items-end gap-1 mt-1">
                                        <span className="text-lg font-black text-primary">{baseCurrency === 'KRW' ? '₩' : currencySymbol} {formatAmount(Math.round(Number(amount) * getRate(currency)))}</span>
                                        <span className="text-[10px] font-bold text-primary/40 mb-1">상당</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">카테고리</label>
                            <IconDropdown
                                value={category}
                                onChange={(val) => setCategory(val as any)}
                                options={CATEGORY_OPTIONS}
                                className="w-full"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">결제 수단</label>
                            <IconDropdown
                                value={paymentMethod}
                                onChange={(val) => setPaymentMethod(val as any)}
                                options={PAYMENT_METHOD_OPTIONS}
                                className="w-full"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">결제 상태</label>
                            <IconDropdown
                                value={paymentStatus}
                                onChange={(val) => setPaymentStatus(val as any)}
                                options={PAYMENT_STATUS_OPTIONS}
                                className="w-full"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">결제일 (선택)</label>
                        <input 
                            type="date"
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold border-none focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                        />
                    </div>

                    {!isSoloTrip && (
                        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">실제 결제자</label>
                                <div className="grid grid-cols-4 gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => setPayerId('')}
                                        className={cn(
                                            "px-3 py-2.5 rounded-xl text-[9px] font-black transition-all",
                                            payerId === '' ? "bg-indigo-500 text-white" : "bg-slate-50 dark:bg-slate-800 text-slate-400"
                                        )}
                                    >
                                        공금
                                    </button>
                                    {tripParticipants.map(p => (
                                        <button 
                                            key={p.id}
                                            type="button"
                                            onClick={() => setPayerId(p.id)}
                                            className={cn(
                                                "px-3 py-2.5 rounded-xl text-[9px] font-black transition-all",
                                                payerId === p.id ? "bg-indigo-500 text-white" : "bg-slate-50 dark:bg-slate-800 text-slate-400"
                                            )}
                                        >
                                            {p.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase">분담 멤버</label>
                                    <button 
                                        type="button"
                                        onClick={() => setSplitWithIds(splitWithIds.length === tripParticipants.length ? [] : tripParticipants.map(p => p.id))}
                                        className="text-[9px] font-black text-primary underline"
                                    >
                                        {splitWithIds.length === tripParticipants.length ? '전체 해제' : '전체 선택'}
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {tripParticipants.map(p => (
                                        <button 
                                            key={p.id}
                                            type="button"
                                            onClick={() => {
                                                if (splitWithIds.includes(p.id)) {
                                                    setSplitWithIds(splitWithIds.filter(id => id !== p.id));
                                                } else {
                                                    setSplitWithIds([...splitWithIds, p.id]);
                                                }
                                            }}
                                            className={cn(
                                                "px-4 py-2 rounded-full text-[9px] font-black transition-all flex items-center gap-1.5",
                                                splitWithIds.includes(p.id) 
                                                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" 
                                                    : "bg-slate-50 dark:bg-slate-800 text-slate-400 border border-transparent"
                                            )}
                                        >
                                            <span className="material-symbols-rounded text-[10px]">
                                                {splitWithIds.includes(p.id) ? 'check_circle' : 'add_circle'}
                                            </span>
                                            {p.name}
                                        </button>
                                    ))}
                                </div>
                                {splitWithIds.length === 0 && (
                                    <p className="text-[9px] text-rose-500 font-bold mt-1">* 최소 한 명 이상의 분담자를 선택해야 합니다.</p>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">지출 상태</label>
                        <div className="flex gap-2">
                            {(['confirmed', 'planned'] as const).map(s => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setStatus(s)}
                                    className={cn(
                                        "flex-1 py-3 rounded-xl text-[10px] font-black transition-all border",
                                        status === s 
                                            ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent" 
                                            : "bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-800"
                                    )}
                                >
                                    {s === 'confirmed' ? '지출 완료' : '지출 예정'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button 
                        disabled={!title || !amount}
                        onClick={() => onSave({
                            title,
                            amount: Number(amount),
                            currency,
                            category,
                            participantId: participantId || undefined,
                            payerId: payerId || undefined,
                            splitWithIds: splitWithIds.length > 0 ? splitWithIds : undefined,
                            sourceType: initialData?.sourceType || 'manual',
                            status,
                            paymentMethod,
                            paymentStatus,
                            paymentDate,
                            exchangeRate: currency === 'KRW' ? 1 : (activeCurrencies || []).find(c => c.code === currency)?.rate
                        })}
                        className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
                    >
                        {initialData ? '지출 내역 수정 저장' : '지출 기록 저장'}
                    </button>
                </div>
            </div>
        </div>
    );
};
