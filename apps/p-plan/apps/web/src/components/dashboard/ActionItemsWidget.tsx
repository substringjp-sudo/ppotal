'use client';
import { useTripStore } from '@pplaner/shared';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { TripState } from '@pplaner/shared';

interface ActionItem {
    id: string;
    label: string;
    priority: 'critical' | 'high' | 'medium';
    icon: string;
}

export default function ActionItemsWidget() {
    const currentTrip = useTripStore((state: TripState) => state.currentTrip);
    const router = useRouter();
    
    const actions = useMemo<ActionItem[]>(() => {
        if (!currentTrip) return [];
        
        const warnings = currentTrip.warnings || [];
        const items: ActionItem[] = [];
        
        // 데이터 누락 체크
        if (!currentTrip.locations?.regions?.length) {
            items.push({ id: 'region', label: '여행 지역 설정 필요', priority: 'high', icon: 'map' });
        }
        
        const allTransports = [...(currentTrip.flights || []), ...(currentTrip.driving || []), ...(currentTrip.publicTransport || [])];
        const transportMissing = allTransports.some(t => {
            const departure = (t as any).departureLocation;
            const arrival = (t as any).arrivalLocation;
            return !departure || !arrival;
        });
        if (transportMissing) {
            items.push({ id: 'transport', label: '교통수단 장소 누락', priority: 'high', icon: 'route' });
        }
        
        if (!currentTrip.budget?.expenses?.length) {
            items.push({ id: 'budget', label: '예산 항목 등록 필요', priority: 'medium', icon: 'payments' });
        }

        // 경고 정보 가져오기
        const criticalWarnings = warnings.filter(w => w.severity === 'critical');
        if (criticalWarnings.length > 0) {
            items.push({ 
                id: 'warnings', 
                label: `${criticalWarnings.length}개의 심각한 충돌 발생`, 
                priority: 'critical', 
                icon: 'error_outline' 
            });
        }
        
        return items;
    }, [currentTrip]);

    const handleActionClick = (id: string) => {
        if (!currentTrip) return;
        switch(id) {
            case 'region':
                router.push(`/edit-trip/${currentTrip.id}?tab=basic`);
                break;
            case 'transport':
                router.push(`/edit-trip/${currentTrip.id}?tab=schedule`);
                break;
            case 'budget':
                router.push(`/edit-trip/${currentTrip.id}?tab=budget`);
                break;
            case 'warnings':
                router.push(`/edit-trip/${currentTrip.id}?tab=schedule`);
                break;
            default:
                router.push(`/edit-trip/${currentTrip.id}`);
        }
    };

    if (!currentTrip) return null;

    return (
        <div className="h-full flex flex-col">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="material-symbols-rounded text-sm">priority_high</span>
                조치가 필요한 항목
            </h3>
            
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {actions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 opacity-50 py-8">
                        <span className="material-symbols-rounded text-3xl">task_alt</span>
                        <p className="text-sm font-bold">완료된 항목 없음</p>
                    </div>
                ) : (
                    actions.map((action: ActionItem, idx: number) => (
                        <motion.div 
                            key={action.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            onClick={() => handleActionClick(action.id)}
                            className={`p-3 rounded-xl border flex items-center gap-3 group cursor-pointer transition-all hover:shadow-md ${
                                action.priority === 'critical' ? 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-900/20 shadow-red-500/5' :
                                action.priority === 'high' ? 'bg-orange-50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-900/20 shadow-orange-500/5' :
                                'bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-800'
                            }`}
                        >
                            <span className={`material-symbols-rounded text-xl ${
                                action.priority === 'critical' ? 'text-red-500' :
                                action.priority === 'high' ? 'text-orange-500' :
                                'text-slate-400'
                            }`}>
                                {action.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-bold truncate ${
                                    action.priority === 'critical' ? 'text-red-900 dark:text-red-200' :
                                    action.priority === 'high' ? 'text-orange-900 dark:text-orange-200' :
                                    'text-slate-700 dark:text-slate-300'
                                }`}>
                                    {action.label}
                                </p>
                            </div>
                            <span className="material-symbols-rounded text-slate-300 group-hover:text-primary transition-colors text-lg opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-transform">
                                arrow_forward
                            </span>
                        </motion.div>
                    ))
                )}
            </div>
            
            <button 
                onClick={() => router.push(`/edit-trip/${currentTrip.id}?tab=prep`)}
                className="mt-4 w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
            >
                <span className="material-symbols-rounded text-sm">checklist</span>
                전체 체크리스트 보기
            </button>
        </div>
    );
}
