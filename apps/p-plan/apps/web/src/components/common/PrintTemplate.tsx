import React, { forwardRef } from 'react';
import { Trip, FlightSegment, AccommodationSegment, DailyPlan, TripEvent, BudgetExpense, PrepTask, ChecklistItem, cn } from '@pplaner/shared';

export type PrintSectionId = 'cover' | 'schedule' | 'budget' | 'prep' | 'packing';

export interface PrintTheme {
  id: string;
  name: string;
  bg: string;
  text: string;
  primary: string;
  secondary: string;
  accent: string;
  surface: string;
  border: string;
  font: 'font-sans' | 'font-serif' | 'font-mono' | 'font-handwriting'; // font-handwriting은 가상의 클래스로 설정 후 CSS 주입 고려
  pattern?: 'dots' | 'grid' | 'noise' | 'none';
  headerStyle?: 'default' | 'magazine' | 'minimal' | 'diary';
}

export const PRINT_THEMES: Record<string, PrintTheme> = {
  modern: {
    id: 'modern',
    name: '모던 스탠다드',
    bg: 'bg-white',
    text: 'text-slate-800',
    primary: 'text-slate-900',
    secondary: 'text-slate-500',
    accent: 'text-indigo-600',
    surface: 'bg-slate-50',
    border: 'border-slate-200',
    font: 'font-sans',
    headerStyle: 'default'
  },
  magazine: {
    id: 'magazine',
    name: '매거진 시티',
    bg: 'bg-white',
    text: 'text-slate-900',
    primary: 'text-black',
    secondary: 'text-slate-400',
    accent: 'text-rose-600',
    surface: 'bg-slate-50/50',
    border: 'border-black',
    font: 'font-sans',
    headerStyle: 'magazine'
  },
  diary: {
    id: 'diary',
    name: '아날로그 트래블러',
    bg: 'bg-stone-50',
    text: 'text-stone-800',
    primary: 'text-stone-900',
    secondary: 'text-stone-500',
    accent: 'text-amber-700',
    surface: 'bg-stone-100/40',
    border: 'border-stone-200',
    font: 'font-serif',
    headerStyle: 'diary',
    pattern: 'grid'
  },
  minimal: {
    id: 'minimal',
    name: '미니멀리스트',
    bg: 'bg-white',
    text: 'text-slate-600',
    primary: 'text-slate-800',
    secondary: 'text-slate-400',
    accent: 'text-slate-900',
    surface: 'bg-transparent',
    border: 'border-slate-200',
    font: 'font-sans',
    headerStyle: 'minimal'
  },
  dark: {
    id: 'dark',
    name: '다크 나이트',
    bg: 'bg-slate-950',
    text: 'text-slate-300',
    primary: 'text-white',
    secondary: 'text-slate-500',
    accent: 'text-sky-400',
    surface: 'bg-slate-900',
    border: 'border-slate-800',
    font: 'font-sans',
    headerStyle: 'default'
  },
};

interface PrintTemplateProps {
  trip: Trip;
  sections: PrintSectionId[];
  themeId: string;
  layout?: 'compact' | 'detailed';
  options?: {
    pattern?: 'dots' | 'grid' | 'noise' | 'none';
    showStats?: boolean;
    headerImage?: string;
  };
}

function getDayOfWeek(dateStr: string): string {
    const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
    try {
        return DAY_NAMES[new Date(dateStr).getDay()] + '요일';
    } catch {
        return '';
    }
}

const PrintTemplate = forwardRef<HTMLDivElement, PrintTemplateProps>(({ trip, sections, themeId, layout = 'detailed', options }, ref) => {
  const theme = PRINT_THEMES[themeId] || PRINT_THEMES.modern;
  const activePattern = options?.pattern || theme.pattern || 'none';

  const renderCover = () => {
    const startDate = trip.dates?.startDate?.replace(/-/g, '.') ?? '';
    const endDate = trip.dates?.endDate?.replace(/-/g, '.') ?? '';
    const participantNames = (trip.participants ?? []).map((p) => p.name ?? p.id ?? '').filter(Boolean).join(', ');
    const regionNames = trip.locations?.regions?.map(r => r.name).join(', ') || trip.locations?.regionNames?.join(', ') || '';

    if (theme.headerStyle === 'magazine') {
        return (
            <div className={cn("mb-16 pt-12 relative overflow-hidden text-left border-b-8", theme.border)}>
                <div className="absolute top-0 left-0 text-[120px] font-black opacity-[0.03] -z-10 select-none -translate-x-10 -translate-y-10 leading-none uppercase">
                    JOURNEY
                </div>
                <div className="flex flex-col gap-6 mb-12">
                    <div className="flex items-center gap-4">
                        <div className={cn("h-px flex-1", theme.bg === 'bg-white' ? 'bg-black' : 'bg-white')} />
                        <span className={cn("text-[10px] font-black uppercase tracking-[0.3em]", theme.secondary)}>제 1권 / 여행 가이드</span>
                    </div>
                    <h1 className={cn("text-7xl font-black tracking-tighter leading-none italic uppercase", theme.primary)}>
                        {trip.title}
                    </h1>
                </div>
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div className="space-y-1">
                        <span className={cn("text-[9px] font-black uppercase tracking-widest", theme.secondary)}>목적지</span>
                        <div className={cn("text-xl font-bold truncate", theme.primary)}>{regionNames || '장소 미지정'}</div>
                    </div>
                    <div className="space-y-1 text-right">
                        <span className={cn("text-[9px] font-black uppercase tracking-widest", theme.secondary)}>여행 기간</span>
                        <div className={cn("text-xl font-bold", theme.primary)}>{startDate} - {endDate}</div>
                    </div>
                </div>
            </div>
        );
    }

    if (theme.headerStyle === 'diary') {
        return (
            <div className={cn("mb-12 pb-10 pt-6 text-center border-b border-dashed", theme.border)}>
                <div className="inline-flex items-center gap-2 mb-4 px-4 py-1 rounded-full border border-stone-300 text-[10px] font-bold uppercase tracking-widest text-stone-500">
                    <span className="material-symbols-rounded text-xs">edit</span> 여행 일기
                </div>
                <h1 className={cn("text-5xl font-serif italic mb-6", theme.primary)}>{trip.title}</h1>
                <div className="flex flex-col items-center gap-3">
                    <div className={cn("flex items-center gap-4 text-sm font-medium", theme.secondary)}>
                        <span>{startDate}</span>
                        <span className="w-8 h-px bg-stone-300" />
                        <span>{endDate}</span>
                    </div>
                    <div className={cn("text-sm italic", theme.accent)}>
                         함께하는 사람들: {participantNames || '나홀로'}
                    </div>
                </div>
            </div>
        );
    }

    if (theme.headerStyle === 'minimal') {
        return (
            <div className="mb-16 pt-20 text-left">
                <span className={cn("text-xs font-bold uppercase tracking-[0.4em] mb-4 block", theme.accent)}>여행 계획</span>
                <h1 className={cn("text-5xl font-light tracking-tight mb-8", theme.primary)}>{trip.title}</h1>
                <div className={cn("h-0.5 w-12 mb-12", theme.accent.replace('text-', 'bg-'))} />
                <div className={cn("grid grid-cols-3 gap-12 text-[11px] uppercase tracking-widest font-bold", theme.secondary)}>
                    <div>
                        <div className="mb-2 opacity-50">날짜</div>
                        <div className={theme.primary}>{startDate}</div>
                    </div>
                    <div>
                        <div className="mb-2 opacity-50">장소</div>
                        <div className={theme.primary}>{regionNames}</div>
                    </div>
                    <div>
                        <div className="mb-2 opacity-50">인원</div>
                        <div className={theme.primary}>{trip.participants?.length || 1}명</div>
                    </div>
                </div>
            </div>
        );
    }

    // Default Style
    return (
      <div className={`mb-10 pb-8 border-b-2 ${theme.border} text-center pt-8`}>
        <h1 className={`text-4xl font-black mb-4 tracking-tight ${theme.primary}`}>{trip.title}</h1>
        <div className={`flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-semibold ${theme.secondary}`}>
          {startDate && <span className="flex items-center gap-1.5"><span className={theme.accent}>📅</span> {startDate} ~ {endDate}</span>}
          {regionNames && <span className="flex items-center gap-1.5"><span className={theme.accent}>📍</span> {regionNames}</span>}
          {participantNames && <span className="flex items-center gap-1.5"><span className={theme.accent}>👥</span> {participantNames}</span>}
        </div>
      </div>
    );
  };

  const renderSchedule = () => {
    const allRows: any[] = [];
    (trip.flights ?? []).forEach((f: FlightSegment) => {
      if (!f.date) return;
      allRows.push({
          date: f.date, time: f.departureTime?.match(/\d{2}:\d{2}/)?.[0] ?? '',
          type: '항공', typeIcon: '✈️',
          title: [f.departureLocation, f.arrivalLocation].filter(Boolean).join(' → '),
          location: f.departureLocation ?? '',
          status: f.isBooked ? '예약완료' : '미예약',
      });
    });

    (trip.accommodation ?? []).forEach((a: AccommodationSegment) => {
        if (!a.startDate) return;
        allRows.push({
            date: a.startDate, time: a.expectedCheckInTime ?? a.checkInStartTime ?? '',
            type: '숙소', typeIcon: '🏨',
            title: `${a.name} 체크인`,
            location: a.location,
            status: a.status === 'booked' ? '예약완료' : '미확정', memo: a.memo ?? '',
        });
    });

    const CATEGORY_LABEL: Record<string, string> = { meal: '식사', shopping: '쇼핑', sightseeing: '관광', transport: '이동', accommodation: '숙소', reservation: '예약', other: '기타' };

    (trip.dailyTimeline ?? []).forEach((day: DailyPlan) => {
        (day.events ?? []).forEach((ev: TripEvent) => {
            if (ev.isAutoGenerated) return;
            const icon = ev.type === 'meal' ? '🍽️' : ev.type === 'sightseeing' ? '📍' : ev.type === 'shopping' ? '🛍️' : ev.type === 'transport' ? '🚌' : '📌';
            allRows.push({
                date: day.date, time: ev.startTime ?? '',
                type: CATEGORY_LABEL[ev.type] ?? ev.type, typeIcon: icon,
                title: ev.title,
                location: ev.location?.name ?? '',
                memo: ev.memo ?? '',
            });
        });
    });

    allRows.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    if (allRows.length === 0) return null;

    return (
      <div className="mb-16 page-break-inside-avoid">
        <h2 className={cn("text-2xl font-black mb-8 flex items-center gap-3 italic tracking-tight uppercase", theme.primary)}>
           <span className={cn("w-2 h-8", theme.accent.replace('text-', 'bg-'))} />
           주요 일정
        </h2>
        
        {layout === 'compact' ? (
          <div className={cn("rounded-2xl border overflow-hidden shadow-sm bg-white dark:bg-transparent", theme.border)}>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className={cn("text-left uppercase text-[9px] font-black tracking-widest border-b", theme.secondary, theme.border, theme.surface)}>
                    <th className="py-3 px-4">시간</th>
                    <th className="py-3 px-4">분류</th>
                    <th className="py-3 px-4">활동</th>
                  </tr>
                </thead>
                <tbody>
                  {allRows.map((r, i) => (
                    <tr key={i} className={cn("border-b last:border-0", theme.border)}>
                      <td className="py-4 px-4">
                        <div className={cn("font-black italic", theme.primary)}>{r.date.slice(5).replace('-','.')}</div>
                        <div className={cn("text-[10px] font-bold opacity-60", theme.secondary)}>{r.time || '하루 종일'}</div>
                      </td>
                      <td className="py-4 px-4 overflow-hidden"><span className="mr-1.5">{r.typeIcon}</span><span className="font-bold text-[11px]">{r.type}</span></td>
                      <td className="py-4 px-4">
                        <div className={cn("font-bold text-sm", theme.primary)}>{r.title}</div>
                        {r.location && <div className={cn("text-[10px] mt-0.5 font-semibold opacity-60", theme.secondary)}>{r.location}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 relative">
             <div className={cn("absolute left-[40px] top-6 bottom-6 w-0.5 border-l-2 border-dashed", theme.border)} />
             {allRows.map((r, i) => (
               <div key={i} className="flex items-start gap-4 group relative z-10">
                  <div className={cn("w-20 shrink-0 text-center py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm font-black", theme.primary)}>
                      <div className="text-[10px] opacity-40 uppercase">{r.date.slice(5).replace('-','.')}</div>
                      <div className="text-sm italic">{r.time || '--:--'}</div>
                  </div>
                  <div className={cn("w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-xl bg-white border-2 shadow-sm", theme.border)}>
                     {r.typeIcon}
                  </div>
                  <div className={cn("flex-1 p-4 rounded-2xl bg-white dark:bg-slate-800/40 border shadow-sm group-hover:shadow-md transition-all", theme.border)}>
                     <h3 className={cn("text-base font-black italic", theme.primary)}>{r.title}</h3>
                     {r.location && <p className={cn("text-[11px] font-bold mt-1.5 flex items-center gap-1", theme.secondary)}><span className="material-symbols-rounded text-[14px]">location_on</span>{r.location}</p>}
                     {r.memo && <p className={cn("text-xs mt-3 opacity-80 border-l-2 pl-3 py-1 italic", theme.border, theme.text)}>{r.memo}</p>}
                  </div>
               </div>
             ))}
          </div>
        )}
      </div>
    );
  };

  const renderBudget = () => {
    const expenses = trip.budget?.expenses ?? [];
    if (expenses.length === 0) return null;
    const baseCurrency = trip.budget?.currency ?? 'KRW';
    const total = expenses.reduce((sum: number, e: BudgetExpense) => sum + (e.amount ?? 0), 0);

    return (
      <div className="mb-16 page-break-inside-avoid">
        <h2 className={cn("text-2xl font-black mb-8 flex items-center gap-3 italic tracking-tight uppercase", theme.primary)}>
           <span className={cn("w-2 h-8", theme.accent.replace('text-', 'bg-'))} />
           예산 요약
        </h2>
        <div className={cn("rounded-[2rem] border overflow-hidden shadow-sm", theme.border)}>
           <table className="w-full text-sm border-collapse">
             <thead>
               <tr className={cn("text-left text-[9px] uppercase tracking-widest font-black border-b", theme.secondary, theme.border, theme.surface)}>
                 <th className="py-4 px-6">내용</th>
                 <th className="py-4 px-6 text-right">금액</th>
               </tr>
             </thead>
             <tbody>
               {expenses.map((e: BudgetExpense, i: number) => (
                 <tr key={i} className={cn("border-b last:border-0", theme.border)}>
                   <td className="py-4 px-6">
                       <div className={cn("font-black", theme.primary)}>{e.title}</div>
                       <div className={cn("text-[10px] font-bold uppercase", theme.secondary)}>분류: {e.category}</div>
                   </td>
                   <td className={cn("py-4 px-6 text-right font-black italic", theme.primary)}>
                       {e.amount?.toLocaleString()} <span className="text-[10px] ml-1 opacity-40 uppercase">{e.currency || baseCurrency}</span>
                   </td>
                 </tr>
               ))}
               <tr className={cn("border-t-4", theme.border, theme.surface)}>
                 <td className={cn("py-6 px-6 text-right font-black uppercase tracking-widest text-xs", theme.secondary)}>총 지출액</td>
                 <td className={cn("py-6 px-6 text-right text-2xl font-black italic", theme.primary)}>
                     {total.toLocaleString()} <span className="text-xs ml-1 opacity-50 uppercase">{baseCurrency}</span>
                 </td>
               </tr>
             </tbody>
           </table>
        </div>
      </div>
    );
  };

  const renderPrep = () => {
     const prepList = trip.prepTimeline ?? [];
     if (prepList.length === 0) return null;
     
     return (
       <div className="mb-16 page-break-inside-avoid">
         <h2 className={cn("text-2xl font-black mb-8 flex items-center gap-3 italic tracking-tight uppercase", theme.primary)}>
            <span className={cn("w-2 h-8", theme.accent.replace('text-', 'bg-'))} />
            준비 사항
         </h2>
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {prepList.map((p: PrepTask, i: number) => (
               <div key={i} className={cn("flex gap-4 items-center p-4 rounded-2xl border bg-white dark:bg-slate-800/20", theme.border)}>
                  <div className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border-2",
                      p.status === 'done' ? "bg-emerald-500 border-emerald-500 text-white" : cn("border-slate-200 opacity-30", theme.border)
                  )}>
                     {p.status === 'done' && <span className="material-symbols-rounded text-sm">check</span>}
                  </div>
                  <div className="flex-1 truncate">
                     <div className={cn("text-sm font-black italic", p.status === 'done' ? "opacity-40" : theme.primary)}>{p.title}</div>
                     {p.date && <div className={cn("text-[9px] mt-1 font-bold uppercase tracking-wider", theme.secondary)}>마감일: {p.date.slice(0, 10)}</div>}
                  </div>
               </div>
            ))}
         </div>
       </div>
     );
  };

  const renderPacking = () => {
     const packing = trip.checklist ?? [];
     if (packing.length === 0) return null;

     return (
        <div className="mb-16 page-break-inside-avoid">
         <h2 className={cn("text-2xl font-black mb-8 flex items-center gap-3 italic tracking-tight uppercase", theme.primary)}>
            <span className={cn("w-2 h-8", theme.accent.replace('text-', 'bg-'))} />
            준비물 목록
         </h2>
         <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {packing.map((p: ChecklistItem, i: number) => (
                <div key={i} className={cn(
                    "flex gap-3 items-center text-xs py-2 px-3 rounded-xl border border-dashed",
                    p.isDone ? "opacity-30" : theme.border
                )}>
                    <span className={cn(
                        "w-4 h-4 shrink-0 rounded flex items-center justify-center border",
                        p.isDone ? "bg-primary border-primary text-white" : theme.border
                    )}>
                         {p.isDone && <span className="material-symbols-rounded text-[10px]">check</span>}
                    </span>
                    <span className={cn("truncate font-bold italic", theme.primary)}>{p.title || '제목 없음'}</span>
                </div>
            ))}
         </div>
       </div>
     )
  }

  return (
    <div ref={ref} className={cn("w-full max-w-4xl mx-auto p-12 sm:p-20 min-h-[A4] relative transition-all overflow-hidden", theme.bg, theme.text, theme.font)}>
        {/* Pattern Overlays */}
        {activePattern === 'dots' && (
            <div className="absolute inset-0 opacity-[0.1] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        )}
        {activePattern === 'grid' && (
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        )}
        {activePattern === 'noise' && (
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/natural-paper.png")' }} />
        )}

        <div className="relative z-10">
            {sections.map((sec: PrintSectionId) => {
                switch (sec) {
                    case 'cover': return <React.Fragment key={sec}>{renderCover()}</React.Fragment>;
                    case 'schedule': return <React.Fragment key={sec}>{renderSchedule()}</React.Fragment>;
                    case 'budget': return <React.Fragment key={sec}>{renderBudget()}</React.Fragment>;
                    case 'prep': return <React.Fragment key={sec}>{renderPrep()}</React.Fragment>;
                    case 'packing': return <React.Fragment key={sec}>{renderPacking()}</React.Fragment>;
                    default: return null;
                }
            })}
            
            <div className={cn("mt-24 pt-10 border-t-2 text-center text-[10px] font-black uppercase tracking-[0.5em] italic", theme.border, theme.secondary)}>
                PPLANER 스튜디오에서 생성됨
            </div>
        </div>
    </div>
  );
});

PrintTemplate.displayName = 'PrintTemplate';
export default PrintTemplate;
