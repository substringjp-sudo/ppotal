"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBudgetSlice = void 0;
const common_1 = require("../../types/common");
const utils_1 = require("../utils");
const createDefaultBudget = () => ({
    commonAllocated: 0,
    individualAllocated: 0,
    baseCurrency: 'KRW',
    currency: 'KRW',
    activeCurrencies: [],
    exchanges: [],
    expenses: [],
    participantBudgets: []
});
const createBudgetSlice = (set, get) => ({
    updateBudget: (updates) => (0, utils_1.updateTripState)(set, get, (trip) => {
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
    addExpense: (expense) => (0, utils_1.updateTripState)(set, get, (trip) => {
        if (!trip.budget)
            trip.budget = createDefaultBudget();
        if (!trip.budget.expenses)
            trip.budget.expenses = [];
        trip.budget.expenses.push({ id: (0, common_1.generateId)(), ...expense });
    }),
    updateExpense: (id, updates) => (0, utils_1.updateTripState)(set, get, (trip) => {
        if (!trip.budget || !trip.budget.expenses)
            return;
        const expense = trip.budget.expenses.find(e => e.id === id);
        if (expense) {
            Object.assign(expense, updates);
        }
    }),
    removeExpense: (id) => (0, utils_1.updateTripState)(set, get, (trip) => {
        if (!trip.budget || !trip.budget.expenses)
            return;
        trip.budget.expenses = trip.budget.expenses.filter(e => e.id !== id);
    }),
    addPersonalExpense: (participantId, expense) => (0, utils_1.updateTripState)(set, get, (trip) => {
        if (!trip.budget)
            trip.budget = createDefaultBudget();
        if (!trip.budget.participantBudgets)
            trip.budget.participantBudgets = [];
        const pb = trip.budget.participantBudgets.find(b => b.participantId === participantId);
        if (pb) {
            if (!pb.personalExpenses)
                pb.personalExpenses = [];
            pb.personalExpenses.push({ id: (0, common_1.generateId)(), ...expense, participantId });
        }
    }),
    removePersonalExpense: (participantId, expenseId) => (0, utils_1.updateTripState)(set, get, (trip) => {
        if (!trip.budget || !trip.budget.participantBudgets)
            return;
        const pb = trip.budget.participantBudgets.find(b => b.participantId === participantId);
        if (pb && pb.personalExpenses) {
            pb.personalExpenses = pb.personalExpenses.filter(e => e.id !== expenseId);
        }
    }),
    updateParticipantBudget: (participantId, updates) => (0, utils_1.updateTripState)(set, get, (trip) => {
        if (!trip.budget || !trip.budget.participantBudgets)
            return;
        const pb = trip.budget.participantBudgets.find(b => b.participantId === participantId);
        if (pb) {
            Object.assign(pb, updates);
        }
    }),
    toggleExpenseStatus: (id, participantId) => (0, utils_1.updateTripState)(set, get, (trip) => {
        if (!trip.budget)
            return;
        if (participantId) {
            if (!trip.budget.participantBudgets)
                return;
            const pb = trip.budget.participantBudgets.find(b => b.participantId === participantId);
            const expense = pb?.personalExpenses?.find(e => e.id === id);
            if (expense) {
                expense.status = expense.status === 'confirmed' ? 'planned' : 'confirmed';
            }
        }
        else {
            if (!trip.budget.expenses)
                return;
            const expense = trip.budget.expenses.find(e => e.id === id);
            if (expense) {
                expense.status = expense.status === 'confirmed' ? 'planned' : 'confirmed';
            }
        }
    }),
    addActiveCurrency: (currency) => (0, utils_1.updateTripState)(set, get, (trip) => {
        if (!trip.budget)
            trip.budget = createDefaultBudget();
        if (!trip.budget.activeCurrencies)
            trip.budget.activeCurrencies = [];
        if (!trip.budget.activeCurrencies.find(c => c.code === currency.code)) {
            trip.budget.activeCurrencies.push(currency);
        }
    }),
    removeActiveCurrency: (code) => (0, utils_1.updateTripState)(set, get, (trip) => {
        if (!trip.budget || !trip.budget.activeCurrencies)
            return;
        trip.budget.activeCurrencies = trip.budget.activeCurrencies.filter(c => c.code !== code);
    }),
    updateActiveCurrency: (code, updates) => (0, utils_1.updateTripState)(set, get, (trip) => {
        if (!trip.budget || !trip.budget.activeCurrencies)
            return;
        const cur = trip.budget.activeCurrencies.find(c => c.code === code);
        if (cur) {
            Object.assign(cur, updates);
        }
    })
});
exports.createBudgetSlice = createBudgetSlice;
