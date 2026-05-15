'use client';
import { useTripStore } from '@pplaner/shared';

export default function ChecklistWidget() {
    const trip = useTripStore((state) => state.currentTrip);
    const updateItem = useTripStore((state) => state.updateChecklistItem);

    if (!trip) return (
        <div className="flex flex-col gap-3 p-4 animate-pulse">
            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-lg w-1/3" />
            {[1,2,3,4].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl" />)}
        </div>
    );

    const checklist = trip.checklist || [];
    const doneCount = checklist.filter(item => item.isDone).length;

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/20">
                <h3 className="font-bold flex items-center gap-2 text-sm leading-none">
                    <span className="material-symbols-rounded text-primary text-xl" aria-hidden="true">fact_check</span>
                    체크리스트
                </h3>
                <span 
                    className="text-[10px] font-bold text-slate-500 uppercase leading-none"
                    aria-label={`총 ${checklist.length}개 중 ${doneCount}개 완료`}
                >
                    {doneCount} / {checklist.length} 완료
                </span>
            </div>
            <div className="p-4 space-y-3" role="list">
                {checklist.length === 0 ? (
                    <div className="text-center py-8 text-slate-400" role="status">
                        <p className="text-xs uppercase font-bold tracking-widest">항목이 없습니다</p>
                    </div>
                ) : (
                    checklist.map(item => (
                        <label 
                            key={item.id} 
                            className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors group"
                            role="listitem"
                        >
                            <input
                                checked={item.isDone}
                                onChange={(e) => updateItem(item.id, { isDone: e.target.checked })}
                                className="rounded border-slate-300 text-primary focus:ring-primary w-5 h-5 cursor-pointer accent-primary"
                                type="checkbox"
                                aria-label={item.title}
                            />
                            <span className={`text-sm font-medium ${item.isDone ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                {item.title}
                            </span>
                            {item.tags && item.tags.length > 0 && (
                                <div className="ml-auto flex flex-wrap gap-1 justify-end" aria-label="태그">
                                    {item.tags.map((t, i) => (
                                        <span key={i} className="text-[8px] font-bold text-blue-500 uppercase px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/40 rounded leading-none shrink-0">
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </label>
                    ))
                )}
            </div>
        </div>
    );
}
