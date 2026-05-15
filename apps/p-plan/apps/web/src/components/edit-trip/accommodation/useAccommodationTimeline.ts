import { useState, useMemo, useCallback } from 'react';
import { 
    format, addDays, eachDayOfInterval, parseISO, isSameDay
} from 'date-fns';
import { Trip, AccommodationSegment, generateId } from '@pplaner/shared';

export const useAccommodationTimeline = (
    trip: Trip | null,
    addAccommodation: (acc: AccommodationSegment) => Promise<void>
) => {
    const [selectionStart, setSelectionStart] = useState<Date | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<Date | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [hoverDate, setHoverDate] = useState<Date | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const timelineDates = useMemo(() => {
        if (!trip?.dates.startDate || !trip?.dates.endDate) return [];
        try {
            const start = parseISO(trip.dates.startDate);
            const end = parseISO(trip.dates.endDate);
            // Add 3 days of buffer before and after
            return eachDayOfInterval({
                start: addDays(start, -3),
                end: addDays(end, 3)
            });
        } catch (e) {
            return [];
        }
    }, [trip?.dates.startDate, trip?.dates.endDate]);

    const isTripDay = useCallback((date: Date) => {
        if (!trip?.dates.startDate || !trip?.dates.endDate) return false;
        const dStr = format(date, 'yyyy-MM-dd');
        return dStr >= trip.dates.startDate && dStr <= trip.dates.endDate;
    }, [trip?.dates.startDate, trip?.dates.endDate]);

    const packedAccommodations = useMemo(() => {
        if (!trip?.accommodation) return [];

        const sorted = [...(trip.accommodation || [])].sort((a, b) =>
            parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime()
        );

        const rows: { lastEndDate: Date }[] = [];
        const result = sorted.map(acc => {
            const startDate = parseISO(acc.startDate);
            const endDate = parseISO(acc.endDate);

            let rowIndex = rows.findIndex(row => isSameDay(startDate, row.lastEndDate) || startDate > row.lastEndDate);

            if (rowIndex === -1) {
                rows.push({ lastEndDate: endDate });
                rowIndex = rows.length - 1;
            } else {
                rows[rowIndex].lastEndDate = endDate;
            }

            return { ...acc, rowIndex };
        });

        return result;
    }, [trip?.accommodation]);

    const maxRows = useMemo(() => {
        return Math.max(...packedAccommodations.map(a => a.rowIndex), -1) + 1;
    }, [packedAccommodations]);

    const handleMouseDown = useCallback((date: Date) => {
        setSelectionStart(date);
        setSelectionEnd(date);
        setIsDragging(true);
        setIsCreating(true);
    }, []);

    const handleMouseEnter = useCallback((date: Date) => {
        setHoverDate(date);
        if (isDragging) {
            setSelectionEnd(date);
        }
    }, [isDragging]);

    const handleMouseUp = useCallback(async () => {
        if (isDragging && selectionStart && selectionEnd) {
            setIsDragging(false);
            const s = selectionStart.getTime() < selectionEnd.getTime() ? selectionStart : selectionEnd;
            const e = selectionStart.getTime() < selectionEnd.getTime() ? selectionEnd : selectionStart;

            if (isSameDay(s, e)) {
                setSelectionStart(null);
                setSelectionEnd(null);
                setIsDragging(false);
                setIsCreating(false);
                return;
            }

            const newId = generateId();
            await addAccommodation({
                id: newId,
                startDate: format(s, 'yyyy-MM-dd'),
                endDate: format(e, 'yyyy-MM-dd'),
                name: '',
                location: '',
                status: 'tentative',
                type: 'hotel',
                color: 'primary',
                checkInStartTime: '15:00',
                checkInEndTime: '23:59',
                checkOutStartTime: '00:00',
                checkOutEndTime: '10:00',
                isPriceUndecided: true
            });
            
            setSelectionStart(null);
            setSelectionEnd(null);
            setIsCreating(false);
            return newId; // Return ID to allow main component to setEditingId
        }
        setIsDragging(false);
        return null;
    }, [isDragging, selectionStart, selectionEnd, addAccommodation]);

    return {
        timelineDates,
        isTripDay,
        packedAccommodations,
        maxRows,
        selectionStart,
        selectionEnd,
        isDragging,
        hoverDate,
        isCreating,
        handleMouseDown,
        handleMouseEnter,
        handleMouseUp
    };
};
