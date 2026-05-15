'use client';
import { useTripStore, useExchangeRateStore } from '@pplaner/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { BudgetExpense, cn } from '@pplaner/shared';
import { useSearchParams } from 'next/navigation';

// Modular components and hooks
import { useBudgetCalculations } from './budget/useBudgetCalculations';
import { BudgetHeader } from './budget/BudgetHeader';
import { BudgetOverviewTab } from './budget/BudgetOverviewTab';
import { ExpenseListTab } from './budget/ExpenseListTab';
import { ParticipantBudgetTab } from './budget/ParticipantBudgetTab';
import { SettlementView } from './SettlementView';
import { CurrencyTab } from './budget/CurrencyTab';
import { BudgetExpenseModal } from './budget/BudgetExpenseModal';

export default function BudgetEditor() {
    const trip = useTripStore((state) => state.currentTrip);
    const searchParams = useSearchParams();
    const { 
        updateBudget, 
        addExpense, 
        removeExpense, 
        updateExpense, 
        addActiveCurrency,
        removeActiveCurrency,
        updateActiveCurrency,
        toggleExpenseStatus 
    } = useTripStore();

    const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'participants' | 'settlement' | 'currency'>('overview');
    const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<BudgetExpense | null>(null);
    
    // Filtering states for ExpenseListTab
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterSource, setFilterSource] = useState('all');

    // Exchange rates store
    const getRate = useExchangeRateStore(state => state.getRate);

    useEffect(() => {
        const subtab = searchParams.get('subtab');
        if (subtab && ['overview', 'expenses', 'participants', 'settlement', 'currency'].includes(subtab)) {
            setActiveTab(subtab as any);
        }
    }, [searchParams]);

    const isSoloTrip = trip?.participants?.length === 1;

    // Use modular calculation hook
    const {
        availableCurrencyOptions,
        aggregatedExpenses,
        commonExpenses,
        individualExpensesGrouped,
        totalCommonSpent,
        totalConfirmed,
        totalPlanned,
        categoryTotals,
        totalConfirmedInBase,
        currencySymbol
    } = useBudgetCalculations(trip, getRate);

    if (!trip) return null;

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('ko-KR').format(amount);
    };

    const handleSaveExpense = async (data: any) => {
        if (editingExpense) {
            await updateExpense(editingExpense.id, data);
        } else {
            await addExpense(data);
        }
        setIsAddExpenseOpen(false);
        setEditingExpense(null);
    };

    return (
        <div className="space-y-8 pb-32">
            {/* 1. Header Summary Card */}
            <BudgetHeader 
                trip={trip}
                currencySymbol={currencySymbol}
                totalConfirmed={totalConfirmed}
                totalPlanned={totalPlanned}
                totalCommonSpent={totalCommonSpent}
                isSoloTrip={isSoloTrip}
                aggregatedExpenses={aggregatedExpenses}
                formatAmount={formatAmount}
            />

            {/* 2. Main Navigation & Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl md:min-w-[500px]">
                    {(['overview', 'expenses', 'participants', 'settlement', 'currency'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                activeTab === tab 
                                    ? "bg-white dark:bg-slate-900 text-primary shadow-lg scale-[1.02]" 
                                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            )}
                        >
                            {tab === 'overview' ? '요약' : 
                             tab === 'expenses' ? '지출 내역' : 
                             tab === 'participants' ? '공동 예산' : 
                             tab === 'settlement' ? '정산하기' : '환율 설정'}
                        </button>
                    ))}
                </div>

                <button 
                    onClick={() => {
                        setEditingExpense(null);
                        setIsAddExpenseOpen(true);
                    }}
                    className="h-14 px-8 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                    <span className="material-symbols-rounded">add_circle</span>
                    새로운 지출 추가
                </button>
            </div>

            {/* 3. Tab Content */}
            <div className="min-h-[400px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'overview' && (
                            <BudgetOverviewTab 
                                categoryTotals={categoryTotals}
                                totalConfirmedInBase={totalConfirmedInBase}
                                currencySymbol={currencySymbol}
                                formatAmount={formatAmount}
                            />
                        )}

                        {activeTab === 'expenses' && (
                            <ExpenseListTab 
                                trip={trip}
                                aggregatedExpenses={aggregatedExpenses}
                                formatAmount={formatAmount}
                                currencySymbol={currencySymbol}
                                onEdit={(expense) => {
                                    setEditingExpense(expense);
                                    setIsAddExpenseOpen(true);
                                }}
                                onDelete={removeExpense}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                filterCategory={filterCategory}
                                setFilterCategory={setFilterCategory}
                                filterSource={filterSource}
                                setFilterSource={setFilterSource}
                            />
                        )}

                        {activeTab === 'participants' && (
                            <ParticipantBudgetTab 
                                trip={trip}
                                isSoloTrip={isSoloTrip}
                                individualExpensesGrouped={individualExpensesGrouped}
                                formatAmount={formatAmount}
                                currencySymbol={currencySymbol}
                                updateBudget={updateBudget}
                            />
                        )}

                        {activeTab === 'settlement' && (
                            <SettlementView 
                                trip={trip} 
                                getRate={getRate}
                                formatAmount={formatAmount}
                                currencySymbol={currencySymbol}
                            />
                        )}

                        {activeTab === 'currency' && (
                            <CurrencyTab 
                                trip={trip}
                                availableCurrencyOptions={availableCurrencyOptions}
                                addActiveCurrency={addActiveCurrency}
                                removeActiveCurrency={removeActiveCurrency}
                                updateActiveCurrency={updateActiveCurrency}
                                updateBudget={updateBudget}
                                formatAmount={formatAmount}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* 4. Modals */}
            <BudgetExpenseModal 
                isOpen={isAddExpenseOpen}
                onClose={() => {
                    setIsAddExpenseOpen(false);
                    setEditingExpense(null);
                }}
                onSave={handleSaveExpense}
                initialData={editingExpense}
                tripParticipants={trip.participants || []}
                isSoloTrip={isSoloTrip}
                baseCurrency={trip.budget?.baseCurrency || 'KRW'}
                activeCurrencies={trip.budget?.activeCurrencies || []}
                getRate={getRate}
            />
        </div>
    );
}
