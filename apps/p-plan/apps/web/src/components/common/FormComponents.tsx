'use client';

import React from 'react';
import { cn } from '@pplaner/shared';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTripStore } from '@pplaner/shared';
import { useMemo, useState, useRef, useEffect } from 'react';
import { TimeSliderPicker } from './TimeSliderPicker';
import { TimeRangeSliderPicker } from './TimeRangeSliderPicker';
import { timeToMinutes, minutesToTime } from '@pplaner/shared';

/**
 * Custom Checkbox Component
 */
interface CustomCheckboxProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    className?: string;
    description?: string;
    size?: 'sm' | 'md';
}

export function CustomCheckbox({ checked, onChange, label, className, description, size = 'md' }: CustomCheckboxProps) {
    const isSmall = size === 'sm';
    return (
        <label className={cn("flex items-start gap-3 cursor-pointer group select-none", className)}>
            <div className={cn("relative flex items-center", isSmall ? "mt-0" : "mt-0.5")}>
                <div
                    onClick={(e) => {
                        e.preventDefault();
                        onChange(!checked);
                    }}
                    className={cn(
                        "rounded-md border-2 transition-all duration-200 flex items-center justify-center",
                        isSmall ? "w-4 h-4" : "w-5 h-5",
                        checked 
                            ? "bg-primary border-primary shadow-sm shadow-primary/20" 
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 group-hover:border-primary/50"
                    )}
                >
                    <AnimatePresence>
                        {checked && (
                            <motion.span
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.5, opacity: 0 }}
                                className={cn("material-symbols-rounded text-white font-black", isSmall ? "text-[12px]" : "text-[14px]")}
                            >
                                check
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>
            </div>
            {(label || description) && (
                <div className="flex flex-col">
                    {label && <span className={cn("text-xs font-bold transition-colors", checked ? "text-slate-900 dark:text-white" : "text-slate-500")}>{label}</span>}
                    {description && <span className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">{description}</span>}
                </div>
            )}
        </label>
    );
}

/**
 * Icon Dropdown Component
 */
interface DropdownOption {
    value: string;
    label: string;
    icon?: string;
    tag?: string;
    tagColor?: string;
}

interface IconDropdownProps {
    value: string;
    onChange: (value: string) => void;
    options: DropdownOption[];
    placeholder?: string;
    label?: string;
    icon?: string;
    className?: string;
    disabled?: boolean;
    size?: 'sm' | 'md';
}

export function IconDropdown({ value, onChange, options, placeholder = '선택하세요', label, icon, className, disabled, size = 'md' }: IconDropdownProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const isSmall = size === 'sm';
    const selectedOption = options.find(opt => opt.value === value);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={cn("space-y-1 relative", className)} ref={containerRef}>
            {label && <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{label}</label>}
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl border border-transparent transition-all",
                    isSmall ? "px-2.5 py-1.5 rounded-lg" : "px-4 py-2.5 rounded-2xl",
                    isOpen ? "ring-2 ring-primary/20 bg-white dark:bg-slate-900 border-primary/20 shadow-lg shadow-primary/5" : "hover:bg-slate-100 dark:hover:bg-slate-700/50",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
            >
                <div className="flex items-center gap-1.5 overflow-hidden">
                    {(selectedOption?.icon || icon) && (
                        <span className={cn(
                            "material-symbols-rounded text-primary/60 shrink-0",
                            isSmall ? "text-[16px]" : "text-[18px]"
                        )}>
                            {selectedOption ? (selectedOption.icon || icon) : icon}
                        </span>
                    )}
                    <span className={cn(
                        "font-bold truncate",
                        isSmall ? "text-[11px]" : "text-sm",
                        selectedOption ? "text-slate-900 dark:text-white" : "text-slate-400"
                    )}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </div>
                <ChevronDown className={cn("text-slate-400 transition-transform duration-200 shrink-0", isSmall ? "w-3.5 h-3.5" : "w-4 h-4", isOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className={cn(
                            "absolute z-[150] top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden py-2",
                            isSmall ? "p-1.5 rounded-xl min-w-[120px]" : "p-2 rounded-2xl"
                        )}
                    >
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            {options.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left",
                                        value === option.value 
                                            ? "bg-primary text-white shadow-lg shadow-primary/20" 
                                            : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                    )}
                                >
                                    {option.icon && (
                                        <span className={cn(
                                            "material-symbols-rounded text-[18px]",
                                            value === option.value ? "text-white" : "text-slate-400"
                                        )}>
                                            {option.icon}
                                        </span>
                                    )}
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <span className="text-sm font-bold truncate">{option.label}</span>
                                        {option.tag && (
                                            <span className={cn(
                                                "text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter shrink-0",
                                                value === option.value 
                                                    ? "bg-white/20 text-white" 
                                                    : option.tagColor || "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                            )}>
                                                {option.tag}
                                            </span>
                                        )}
                                    </div>
                                    {value === option.value && (
                                        <span className="material-symbols-rounded text-[16px] ml-2 font-black shrink-0">check</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/**
 * Common TBD (Undecided) Layout Component
 */
interface UndecidedFieldProps {
    label?: string;
    message?: string;
    icon?: string;
    onAction?: () => void;
    actionLabel?: string;
    className?: string;
}

export function UndecidedField({ label, message = '정보가 아직 입력되지 않았습니다.', icon = 'help_outline', onAction, actionLabel = '정보 입력하기', className }: UndecidedFieldProps) {
    return (
        <div className={cn("space-y-1.5", className)}>
            {label && <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{label}</label>}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700 rounded-3xl text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-sm">
                    <span className="material-symbols-rounded text-2xl text-slate-300">{icon}</span>
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{message}</p>
                    {onAction && (
                        <button
                            onClick={onAction}
                            className="text-[10px] font-black text-primary hover:underline uppercase"
                        >
                            {actionLabel}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Restricted Date Picker
 */
interface RestrictedDatePickerProps {
    value?: string;
    onChange: (v: string) => void;
    label?: string;
    className?: string;
    disabled?: boolean;
    minDate?: string;
    maxDate?: string;
}

export function RestrictedDatePicker({ value, onChange, label, className, disabled, minDate, maxDate }: RestrictedDatePickerProps) {
    const trip = useTripStore((state) => state.currentTrip);

    const allowedDates = useMemo(() => {
        if (!trip || trip.dates.isUndecided || !trip.dates.startDate || !trip.dates.endDate) return [];

        const dates = [];
        const start = new Date(trip.dates.startDate);
        const end = new Date(trip.dates.endDate);
        const buffer = trip.dates.flexibilityDays || 0;

        const current = new Date(start);
        current.setDate(current.getDate() - buffer);

        const max = new Date(end);
        max.setDate(max.getDate() + buffer);

        while (current <= max) {
            dates.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        return dates;
    }, [trip]);

    const formatDate = (date: Date) => {
        return date.toISOString().split('T')[0];
    };

    const getDisplayLabel = (date: Date) => {
        const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
        return `${date.getMonth() + 1}/${date.getDate()} (${weekdays[date.getDay()]})`;
    };

    const dropdownOptions = useMemo(() => {
        if (!trip || !trip.dates.startDate || !trip.dates.endDate) return [];
        
        const start = new Date(trip.dates.startDate);
        start.setHours(0, 0, 0, 0);

        return allowedDates.map(date => {
            const dateStr = formatDate(date);
            const isBefore = trip.dates.startDate && dateStr < trip.dates.startDate;
            const isAfter = trip.dates.endDate && dateStr > trip.dates.endDate;
            const isBuffer = isBefore || isAfter;
            
            let tag = '';
            let tagColor = '';
            
            if (isBuffer) {
                tag = '예비';
                tagColor = 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400';
            } else {
                const current = new Date(date);
                current.setHours(0, 0, 0, 0);
                const diffTime = current.getTime() - start.getTime();
                const dayNum = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
                tag = `${dayNum}일차`;
                tagColor = 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400';
            }

            return {
                value: dateStr,
                label: getDisplayLabel(date),
                icon: isBuffer ? 'history_toggle_off' : 'calendar_today',
                tag,
                tagColor
            };
        }).filter(opt => {
            if (minDate && opt.value < minDate) return false;
            if (maxDate && opt.value > maxDate) return false;
            return true;
        });
    }, [allowedDates, trip, minDate, maxDate]);

    if (allowedDates.length === 0) {
        return (
            <div className={cn("space-y-1.5", className)}>
                {label && <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{label}</label>}
                <div className="relative">
                    <input
                        type="date"
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold text-sm disabled:opacity-50 appearance-none pr-10"
                    />
                    <span className="material-symbols-rounded absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">calendar_month</span>
                </div>
            </div>
        );
    }

    return (
        <IconDropdown
            label={label}
            value={value || ''}
            onChange={onChange}
            options={dropdownOptions}
            placeholder="날짜 선택"
            disabled={disabled}
            className={className}
            icon="calendar_month"
        />
    );
}

/**
 * Time Input with Slider Picker
 */
import { createPortal } from 'react-dom';

interface TimeInputProps {
    value?: string;
    onChange: (v: string) => void;
    label?: string;
    className?: string;
    disabled?: boolean;
    lat?: number;
    lng?: number;
    date?: string | Date;
    rangeStart?: string;
    rangeEnd?: string;
}

export function TimeInput({ value, onChange, label, className, disabled, lat, lng, date, rangeStart, rangeEnd }: TimeInputProps) {
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [pickerPos, setPickerPos] = useState({ top: 0, left: 0, width: 0 });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                const picker = document.getElementById('time-picker-portal');
                if (picker && picker.contains(event.target as Node)) return;
                setIsPickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const togglePicker = () => {
        if (!isPickerOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setPickerPos({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
        setIsPickerOpen(!isPickerOpen);
    };

    return (
        <div className={cn("space-y-1.5 relative", className)} ref={containerRef}>
            {label && <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{label}</label>}
            <div className="relative group/time">
                <input
                    type="time"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-2xl outline-none font-bold text-sm h-[48px] border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/20 shadow-inner group-hover/time:bg-white dark:group-hover/time:bg-slate-800 transition-colors disabled:opacity-50"
                />
                <button 
                    type="button"
                    disabled={disabled}
                    onClick={togglePicker}
                    className={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-primary hover:border-primary/30 transition-all z-10 disabled:opacity-50",
                        isPickerOpen && "text-primary border-primary/30 ring-2 ring-primary/10"
                    )}
                >
                    <span className="material-symbols-rounded text-lg">schedule</span>
                </button>
            </div>

            {isPickerOpen && typeof document !== 'undefined' && createPortal(
                <div 
                    id="time-picker-portal"
                    className="fixed z-[9999]"
                    style={{ 
                        top: pickerPos.top, 
                        left: pickerPos.left, 
                        width: pickerPos.width,
                        minWidth: '280px'
                    }}
                >
                    <motion.div 
                        key="time-picker"
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    >
                        <TimeSliderPicker 
                            value={value || '09:00'}
                            onChange={onChange}
                            onClose={() => setIsPickerOpen(false)}
                            lat={lat}
                            lng={lng}
                            date={date}
                            rangeStart={rangeStart}
                            rangeEnd={rangeEnd}
                        />
                    </motion.div>
                </div>,
                document.body
            )}
        </div>
    );
}

/**
 * Time Range Input Component
 * Handles start and end time together with a range slider
 */
interface TimeRangeInputProps {
    startTime: string;
    endTime?: string;
    onStartChange: (v: string) => void;
    onEndChange: (v: string | undefined) => void;
    label?: string;
    className?: string;
    disabled?: boolean;
    lat?: number;
    lng?: number;
    date?: string | Date;
}

export function TimeRangeInput({ 
    startTime, 
    endTime, 
    onStartChange, 
    onEndChange, 
    label, 
    className, 
    disabled, 
    lat, 
    lng, 
    date 
}: TimeRangeInputProps) {
    const [pickerType, setPickerType] = useState<'none' | 'start' | 'range'>('none');
    const containerRef = useRef<HTMLDivElement>(null);
    const [pickerPos, setPickerPos] = useState({ top: 0, left: 0, width: 0 });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                const startPicker = document.getElementById('time-picker-portal');
                const rangePicker = document.getElementById('time-range-picker-portal');
                if ((startPicker && startPicker.contains(event.target as Node)) || 
                    (rangePicker && rangePicker.contains(event.target as Node))) return;
                setPickerType('none');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const openPicker = (type: 'start' | 'range' | 'none') => {
        if (type !== 'none' && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setPickerPos({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
        setPickerType(type);
    };

    // Default end time is start + 1h if not set
    const effectiveEndTime = useMemo(() => {
        if (endTime) return endTime;
        const startMins = timeToMinutes(startTime);
        return minutesToTime((startMins + 60) % 1440);
    }, [startTime, endTime]);

    const handleRangeChange = (start: string, end: string) => {
        onStartChange(start);
        if (start === end) {
            onEndChange(undefined);
            setPickerType('none');
        } else {
            onEndChange(end);
        }
    };

    return (
        <div className={cn("space-y-4", className)} ref={containerRef}>
            {label && <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">{label}</label>}
            <div className="grid grid-cols-2 gap-4">
                {/* Start Time Field */}
                <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">시작</label>
                    <div className="relative group/time">
                        <input
                            type="time"
                            value={startTime}
                            onChange={(e) => onStartChange(e.target.value)}
                            disabled={disabled}
                            className={cn(
                                "w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-2xl outline-none font-bold text-sm h-[48px] border transition-all disabled:opacity-50",
                                pickerType === 'start' ? "ring-2 ring-primary/20 border-primary/30 bg-white dark:bg-slate-800" : "border-slate-200 dark:border-slate-800"
                            )}
                        />
                        <button 
                            type="button"
                            onClick={() => openPicker(pickerType === 'start' ? 'none' : 'start')}
                            className={cn(
                                "absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-xl transition-all shadow-sm border",
                                pickerType === 'start' 
                                    ? "bg-primary text-white border-primary shadow-primary/20" 
                                    : "bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:text-primary"
                            )}
                        >
                            <span className="material-symbols-rounded text-lg">schedule</span>
                        </button>
                    </div>
                </div>

                {/* End Time Field */}
                <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">종료</label>
                    <div className="relative group/time">
                        <input
                            type="time"
                            value={endTime || ''}
                            onChange={(e) => onEndChange(e.target.value || undefined)}
                            disabled={disabled}
                            placeholder="미정"
                            className={cn(
                                "w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-2xl outline-none font-bold text-sm h-[48px] border transition-all disabled:opacity-50",
                                pickerType === 'range' ? "ring-2 ring-primary/20 border-primary/30 bg-white dark:bg-slate-800" : "border-slate-200 dark:border-slate-800"
                            )}
                        />
                        <button 
                            type="button"
                            onClick={() => openPicker(pickerType === 'range' ? 'none' : 'range')}
                            className={cn(
                                "absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-xl transition-all shadow-sm border",
                                pickerType === 'range' 
                                    ? "bg-primary text-white border-primary shadow-primary/20" 
                                    : "bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:text-primary"
                            )}
                        >
                            <span className="material-symbols-rounded text-lg">
                                {endTime ? 'schedule' : 'more_time'}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {pickerType === 'start' && typeof document !== 'undefined' && createPortal(
                    <div 
                        id="time-picker-portal"
                        className="fixed z-[9999]"
                        style={{ 
                            top: pickerPos.top, 
                            left: pickerPos.left, 
                            width: pickerPos.width,
                            minWidth: '280px'
                        }}
                    >
                        <motion.div 
                            key="start-picker"
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        >
                            <TimeSliderPicker 
                                value={startTime || '09:00'}
                                onChange={onStartChange}
                                onClose={() => setPickerType('none')}
                                lat={lat}
                                lng={lng}
                                date={date}
                            />
                        </motion.div>
                    </div>,
                    document.body
                )}

                {pickerType === 'range' && typeof document !== 'undefined' && createPortal(
                    <div 
                        id="time-range-picker-portal"
                        className="fixed z-[9999]"
                        style={{ 
                            top: pickerPos.top, 
                            left: pickerPos.left, 
                            width: pickerPos.width,
                            minWidth: '320px'
                        }}
                    >
                        <motion.div 
                            key="range-picker"
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        >
                            <TimeRangeSliderPicker 
                                startValue={startTime}
                                endValue={effectiveEndTime}
                                onChange={handleRangeChange}
                                onClose={() => setPickerType('none')}
                                lat={lat}
                                lng={lng}
                                date={date}
                            />
                        </motion.div>
                    </div>,
                    document.body
                )}
            </AnimatePresence>
        </div>
    );
}

