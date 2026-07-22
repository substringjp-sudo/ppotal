'use client';

/**
 * 여행 기간 특화 날짜 선택기.
 *
 * 일반 달력 컴포넌트는 예약/일정마다 연·월을 오가며 날짜를 찾아야 하지만,
 * 여행은 시작~종료일이 이미 정해져 있으므로 그 범위의 "며칠차" 칩만 고르면 된다.
 * 순수 클라이언트 계산이라 서버/구글 비용이 전혀 발생하지 않는다.
 */

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

interface TripDayPickerProps {
    startDate: string; // "YYYY-MM-DD"
    endDate: string;   // "YYYY-MM-DD"
    value?: string;    // 선택된 날짜 "YYYY-MM-DD"
    onChange: (date: string) => void;
    className?: string;
}

function buildDays(startDate: string, endDate: string): string[] {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate || startDate}T00:00:00`);
    if (isNaN(start.getTime())) return [];
    const last = isNaN(end.getTime()) || end < start ? start : end;
    const out: string[] = [];
    const cur = new Date(start);
    let guard = 0;
    while (cur <= last && guard < 366) {
        out.push(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
        guard++;
    }
    return out;
}

export default function TripDayPicker({
    startDate,
    endDate,
    value,
    onChange,
    className = '',
}: TripDayPickerProps) {
    const days = buildDays(startDate, endDate);

    if (days.length === 0) {
        return (
            <p className={`text-xs text-slate-400 ${className}`}>먼저 여행 기간을 정해주세요.</p>
        );
    }

    return (
        <div
            role="radiogroup"
            aria-label="여행 날짜 선택"
            className={`flex gap-1.5 overflow-x-auto pb-1 ${className}`}
        >
            {days.map((date, i) => {
                const d = new Date(`${date}T00:00:00`);
                const selected = value === date;
                const [, mm, dd] = date.split('-');
                return (
                    <button
                        key={date}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onChange(date)}
                        className={`flex shrink-0 flex-col items-center rounded-lg border px-2.5 py-1.5 text-center transition ${
                            selected
                                ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                        }`}
                    >
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                            {i + 1}일차
                        </span>
                        <span className="text-xs font-black leading-tight">
                            {Number(mm)}/{Number(dd)}
                        </span>
                        <span className="text-[9px] opacity-60">{WEEKDAYS[d.getDay()]}</span>
                    </button>
                );
            })}
        </div>
    );
}
