import { StateCreator } from 'zustand';
import { TripState } from '../types';
export interface BudgetSlice {
    updateBudget: (updates: Partial<import('../../types/trip').Trip['budget']>) => void;
    addExpense: (expense: Omit<import('../../types/trip').BudgetExpense, 'id'>) => void;
    updateExpense: (id: string, updates: Partial<import('../../types/trip').BudgetExpense>) => void;
    removeExpense: (id: string) => void;
    addPersonalExpense: (participantId: string, expense: Omit<import('../../types/trip').BudgetExpense, 'id'>) => void;
    removePersonalExpense: (participantId: string, expenseId: string) => void;
    updateParticipantBudget: (participantId: string, updates: Partial<import('../../types/trip').ParticipantBudget>) => void;
    toggleExpenseStatus: (id: string, participantId?: string) => void;
    addActiveCurrency: (currency: {
        code: string;
        symbol: string;
        rate: number;
    }) => void;
    removeActiveCurrency: (code: string) => void;
    updateActiveCurrency: (code: string, updates: Partial<{
        symbol: string;
        rate: number;
    }>) => void;
}
export declare const createBudgetSlice: StateCreator<TripState, [], [], BudgetSlice>;
