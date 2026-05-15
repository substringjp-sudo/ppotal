import { generateId } from '../../types/common';
import { StateCreator } from 'zustand';
import { TripState } from '../types';
import { updateTripState } from '../utils';
import { Budget } from '../../types/trip';

const createDefaultBudget = (): Budget => ({
    commonAllocated: 0,
    individualAllocated: 0,
    baseCurrency: 'KRW',
    currency: 'KRW',
    activeCurrencies: [],
    exchanges: [],
    expenses: [],
    participantBudgets: []
});

export interface BudgetSlice {
    updateBudget: (updates: Partial<import('../../types/trip').Trip['budget']>) => void;
    addExpense: (expense: Omit<import('../../types/trip').BudgetExpense, 'id'>) => void;
    updateExpense: (id: string, updates: Partial<import('../../types/trip').BudgetExpense>) => void;
    removeExpense: (id: string) => void;
    addPersonalExpense: (participantId: string, expense: Omit<import('../../types/trip').BudgetExpense, 'id'>) => void;
    removePersonalExpense: (participantId: string, expenseId: string) => void;
    updateParticipantBudget: (participantId: string, updates: Partial<import('../../types/trip').ParticipantBudget>) => void;
    toggleExpenseStatus: (id: string, participantId?: string) => void;
    addActiveCurrency: (currency: { code: string; symbol: string; rate: number }) => void;
    removeActiveCurrency: (code: string) => void;
    updateActiveCurrency: (code: string, updates: Partial<{ symbol: string; rate: number }>) => void;
}

export const createBudgetSlice: StateCreator<TripState, [], [], BudgetSlice> = (set, get) => ({
    updateBudget: (updates) => updateTripState(set, get, (trip) => {
        if (!trip.budget) {
            trip.budget = {
                commonAllocated: 0,
                baseCurrency: 'KRW',
                currency: 'KRW',
                activeCurrencies: [],
                exchanges: [],
                expenses: [],
                participantBudgets: []
            };
        }
        Object.assign(trip.budget, updates);
    }),

    addExpense: (expense) => updateTripState(set, get, (trip) => {
        if (!trip.budget) trip.budget = createDefaultBudget();
        if (!trip.budget.expenses) trip.budget.expenses = [];
        trip.budget.expenses.push({ id: generateId(), ...expense } as import('../../types/trip').BudgetExpense);
    }),
    
    updateExpense: (id, updates) => updateTripState(set, get, (trip) => {
        if (!trip.budget || !trip.budget.expenses) return;
        const expense = trip.budget.expenses.find(e => e.id === id);
        if (expense) {
            Object.assign(expense, updates);
        }
    }),

    removeExpense: (id) => updateTripState(set, get, (trip) => {
        if (!trip.budget || !trip.budget.expenses) return;
        trip.budget.expenses = trip.budget.expenses.filter(e => e.id !== id);
    }),

    addPersonalExpense: (participantId, expense) => updateTripState(set, get, (trip) => {
        if (!trip.budget) trip.budget = createDefaultBudget();
        if (!trip.budget.participantBudgets) trip.budget.participantBudgets = [];
        const pb = trip.budget.participantBudgets.find(b => b.participantId === participantId);
        if (pb) {
            if (!pb.personalExpenses) pb.personalExpenses = [];
            pb.personalExpenses.push({ id: generateId(), ...expense, participantId } as import('../../types/trip').BudgetExpense);
        }
    }),

    removePersonalExpense: (participantId, expenseId) => updateTripState(set, get, (trip) => {
        if (!trip.budget || !trip.budget.participantBudgets) return;
        const pb = trip.budget.participantBudgets.find(b => b.participantId === participantId);
        if (pb && pb.personalExpenses) {
            pb.personalExpenses = pb.personalExpenses.filter(e => e.id !== expenseId);
        }
    }),

    updateParticipantBudget: (participantId, updates) => updateTripState(set, get, (trip) => {
        if (!trip.budget || !trip.budget.participantBudgets) return;
        const pb = trip.budget.participantBudgets.find(b => b.participantId === participantId);
        if (pb) {
            Object.assign(pb, updates);
        }
    }),

    toggleExpenseStatus: (id, participantId) => updateTripState(set, get, (trip) => {
        if (!trip.budget) return;
        if (participantId) {
            if (!trip.budget.participantBudgets) return;
            const pb = trip.budget.participantBudgets.find(b => b.participantId === participantId);
            const expense = pb?.personalExpenses?.find(e => e.id === id);
            if (expense) {
                expense.status = expense.status === 'confirmed' ? 'planned' : 'confirmed';
            }
        } else {
            if (!trip.budget.expenses) return;
            const expense = trip.budget.expenses.find(e => e.id === id);
            if (expense) {
                expense.status = expense.status === 'confirmed' ? 'planned' : 'confirmed';
            }
        }
    }),

    addActiveCurrency: (currency) => updateTripState(set, get, (trip) => {
        if (!trip.budget) trip.budget = createDefaultBudget();
        if (!trip.budget.activeCurrencies) trip.budget.activeCurrencies = [];
        if (!trip.budget.activeCurrencies.find(c => c.code === currency.code)) {
            trip.budget.activeCurrencies.push(currency);
        }
    }),

    removeActiveCurrency: (code) => updateTripState(set, get, (trip) => {
        if (!trip.budget || !trip.budget.activeCurrencies) return;
        trip.budget.activeCurrencies = trip.budget.activeCurrencies.filter(c => c.code !== code);
    }),

    updateActiveCurrency: (code, updates) => updateTripState(set, get, (trip) => {
        if (!trip.budget || !trip.budget.activeCurrencies) return;
        const cur = trip.budget.activeCurrencies.find(c => c.code === code);
        if (cur) {
            Object.assign(cur, updates);
        }
    })
});
