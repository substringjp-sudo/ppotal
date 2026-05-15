import { useMemo } from 'react';
import { Trip, BudgetExpense, getCurrencySymbol, inferCurrencyFromRegions } from '@pplaner/shared';
import { CURRENCY_OPTIONS, CATEGORY_OPTIONS } from './BudgetConstants';

export const useBudgetCalculations = (trip: Trip | null, getRate: (code: string) => number) => {
    // 1. Available currency options for adding
    const availableCurrencyOptions = useMemo(() => {
        if (!trip) return [];
        const inferred = inferCurrencyFromRegions(trip.locations?.regions || []);
        const activeCodes = (trip.budget?.activeCurrencies || []).map(c => c.code);
        
        return CURRENCY_OPTIONS
            .filter(opt => opt.value !== 'KRW' && !activeCodes.includes(opt.value))
            .map(opt => ({
                ...opt,
                tag: opt.value === inferred ? '추천' : undefined,
                tagColor: opt.value === inferred ? 'bg-emerald-500 text-white' : undefined
            }))
            .sort((a, b) => (a.value === inferred ? -1 : b.value === inferred ? 1 : 0));
    }, [trip?.locations?.regions, trip?.budget?.activeCurrencies]);

    // 2. Aggregated expenses from all sources
    const aggregatedExpenses = useMemo(() => {
        if (!trip) return [];
        const items: (Partial<BudgetExpense> & { isAuto?: boolean })[] = [];

        // Flights
        (trip.flights || []).forEach(f => {
            if (f.cost) {
                items.push({
                    id: `flight-${f.id}`,
                    title: `항공: ${f.airline || '항공편'} (${f.departureLocation} ↔ ${f.arrivalLocation})`,
                    amount: f.cost,
                    category: 'transport',
                    sourceType: 'flight',
                    sourceId: f.id,
                    isAuto: true,
                    status: 'confirmed',
                    isExcluded: trip.budget?.excludeFlights,
                    currency: f.currency,
                    paymentMethod: f.paymentMethod,
                    paymentDate: f.paymentDate,
                    paymentStatus: f.paymentStatus,
                    exchangeRate: f.currency === 'KRW' ? 1 : getRate(f.currency || '')
                });
            }
        });

        // Accommodations
        (trip.accommodation || []).forEach(a => {
            if (a.price) {
                items.push({
                    id: `acc-${a.id}`,
                    title: `숙소: ${a.name}`,
                    amount: a.price,
                    category: 'accommodation',
                    sourceType: 'accommodation',
                    sourceId: a.id,
                    isAuto: true,
                    status: 'confirmed',
                    isExcluded: trip.budget?.excludeAccommodations,
                    currency: a.currency,
                    paymentMethod: a.paymentMethod,
                    paymentDate: a.paymentDate,
                    paymentStatus: a.paymentStatus,
                    exchangeRate: a.currency === 'KRW' ? 1 : getRate(a.currency || '')
                });
            }
        });

        // Public Transport
        (trip.publicTransport || []).forEach(p => {
            if (p.cost) {
                items.push({
                    id: `pt-${p.id}`,
                    title: `교통: ${p.name || '대중교통'}`,
                    amount: p.cost,
                    category: 'transport',
                    sourceType: 'manual', 
                    sourceId: p.id,
                    isAuto: true,
                    status: 'confirmed',
                    isExcluded: trip.budget?.excludePublicTransport,
                    currency: p.currency,
                    paymentMethod: p.paymentMethod,
                    paymentDate: p.paymentDate,
                    paymentStatus: p.paymentStatus,
                    exchangeRate: p.currency === 'KRW' ? 1 : getRate(p.currency || '')
                });
            }
        });

        // Timeline Events
        trip.dailyTimeline?.forEach((day, dayIndex) => {
            (day.events || []).forEach(event => {
                if (event.cost) {
                    items.push({
                        id: `event-${event.id}`,
                        title: `일정: ${event.title}`,
                        amount: event.cost,
                        category: (event.mainCategory as any) || 'activity',
                        sourceType: 'event',
                        sourceId: `${dayIndex}:${event.id}`,
                        isAuto: true,
                        status: 'confirmed',
                        currency: event.currency,
                        paymentMethod: event.paymentMethod,
                        paymentDate: event.paymentDate,
                        paymentStatus: event.paymentStatus,
                        exchangeRate: event.currency === 'KRW' ? 1 : getRate(event.currency || '')
                    });
                }
            });
        });

        // Prep Tasks (준비 작업)
        (trip.prepTimeline || []).forEach((task) => {
            if (task.cost) {
                items.push({
                    id: `prep-${task.id}`,
                    title: `준비: ${task.title}`,
                    amount: task.cost,
                    category: 'other',
                    sourceType: 'manual',
                    sourceId: task.id,
                    isAuto: true,
                    status: 'confirmed',
                    isExcluded: task.isExcluded || trip.budget?.excludePrepCosts,
                    currency: task.currency,
                    paymentMethod: task.paymentMethod,
                    paymentDate: task.paymentDate,
                    paymentStatus: task.paymentStatus,
                    exchangeRate: task.currency === 'KRW' ? 1 : getRate(task.currency || '')
                });
            }
        });

        // Reservations
        (trip.reservations || []).forEach(res => {
            if (res.cost) {
                items.push({
                    id: `res-${res.id}`,
                    title: `예약: ${res.title}`,
                    amount: res.cost,
                    category: 'activity',
                    sourceType: 'manual',
                    sourceId: res.id,
                    isAuto: true,
                    status: 'confirmed',
                    currency: res.currency,
                    paymentMethod: res.paymentMethod,
                    paymentDate: res.paymentDate,
                    paymentStatus: res.paymentStatus,
                    exchangeRate: res.currency === 'KRW' ? 1 : getRate(res.currency || '')
                });
            }
        });

        // Manual Expenses
        (trip.budget?.expenses || []).forEach(e => {
            items.push({ ...e, isAuto: false });
        });

        return items;
    }, [trip, getRate]);

    const commonExpenses = aggregatedExpenses.filter(e => !e.participantId);
    
    const individualExpensesGrouped = useMemo(() => {
        const groups: Record<string, typeof aggregatedExpenses> = {};
        aggregatedExpenses.forEach(e => {
            if (e.participantId) {
                if (!groups[e.participantId]) groups[e.participantId] = [];
                groups[e.participantId].push(e);
            }
        });
        return groups;
    }, [aggregatedExpenses]);

    const totalCommonSpent = commonExpenses.filter(e => e.status === 'confirmed').reduce((sum, e) => sum + (e.amount || 0), 0);
    
    // Status based totals
    const totalConfirmed = aggregatedExpenses.filter(e => e.status === 'confirmed' && !e.isExcluded).reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalPlanned = aggregatedExpenses.filter(e => e.status === 'planned' && !e.isExcluded).reduce((sum, e) => sum + (e.amount || 0), 0);
    
    // Aggregated costs for travel components
    const flightTotal = (trip?.flights || []).reduce((sum, f) => sum + (f.cost || 0), 0);
    const accommodationTotal = (trip?.accommodation || []).reduce((sum, a) => sum + (a.price || 0), 0);
    const ptTotal = (trip?.publicTransport || []).reduce((sum, p) => sum + (p.cost || 0), 0);
    const prepTotal = (trip?.prepTimeline || []).reduce((sum: number, t) => sum + (t.cost || 0), 0);
    
    const grandTotalProjected = totalConfirmed + totalPlanned;

    // 3. Category Breakdown Calculation
    const categoryTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        CATEGORY_OPTIONS.forEach(opt => totals[opt.value] = 0);
        
        aggregatedExpenses.forEach(e => {
            if (!e.isExcluded && e.status === 'confirmed') {
                const category = e.category || 'other';
                const rate = e.currency === trip?.budget?.baseCurrency ? 1 : (e.exchangeRate || getRate(e.currency || ''));
                const amountInBase = (e.amount || 0) * rate;
                totals[category] = (totals[category] || 0) + amountInBase;
            }
        });
        
        return totals;
    }, [aggregatedExpenses, trip?.budget?.baseCurrency, getRate]);

    const totalConfirmedInBase = useMemo(() => {
        return Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
    }, [categoryTotals]);

    const currencySymbol = getCurrencySymbol(trip?.budget?.baseCurrency || 'KRW');

    return {
        availableCurrencyOptions,
        aggregatedExpenses,
        commonExpenses,
        individualExpensesGrouped,
        totalCommonSpent,
        totalConfirmed,
        totalPlanned,
        flightTotal,
        accommodationTotal,
        ptTotal,
        prepTotal,
        grandTotalProjected,
        categoryTotals,
        totalConfirmedInBase,
        currencySymbol
    };
};
