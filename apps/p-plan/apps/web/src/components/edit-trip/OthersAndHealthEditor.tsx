'use client';
import { useTripStore } from '@pplaner/shared';
import { REGION_DATA, HEALTH_KIT_ITEMS, type RegionSafetyHealthInfo, type RiskCategory } from '@/data/safetyHealthData';
import { type Trip, type TripRegion, type ChecklistItem, type FlightSegment } from '@pplaner/shared';
import { useState, useMemo } from 'react';
import { cn } from '@pplaner/shared';
import { motion, AnimatePresence } from 'framer-motion';

export default function OthersAndHealthEditor() {
    const trip = useTripStore((state) => state.currentTrip);
    if (!trip) return null;
    return <OthersAndHealthEditorContent trip={trip} />;
}

function OthersAndHealthEditorContent({ trip }: { trip: Trip }) {
    const updateTrip = useTripStore((state) => state.updateTrip);

    // Local state for inputs
    const [allergies, setAllergies] = useState(trip?.healthInfo?.allergies?.join(', ') || '');
    const [medications, setMedications] = useState(trip?.healthInfo?.medications?.join(', ') || '');
    const [memo, setMemo] = useState(trip?.memo || '');

    // State for Collapsibles
    const [expandedSections, setExpandedSections] = useState<string[]>([]);
    const toggleSection = (id: string) => {
        setExpandedSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    };

    // Improved Region Matching using structured IDs
    const allRegionsInfo = useMemo(() => {
        const regions = trip.locations.regions || [];
        const normalize = (str: string) => str.replace(/\s+/g, '').toLowerCase();

        const results: { name: string, info: RegionSafetyHealthInfo | undefined }[] = [];
        const seenIds = new Set<string>();

        // Process structured regions first
        regions.forEach((reg: TripRegion) => {
            const regId = String(reg.countryId || reg.id);
            let info = Object.values(REGION_DATA).find(d => String(d.id) === regId);
            
            if (!info) {
                const nName = normalize(reg.name);
                info = Object.values(REGION_DATA).find(
                    d => normalize(d.name) === nName || d.keywords.some(k => normalize(k) === nName)
                );
            }
            
            if (info) {
                if (!seenIds.has(info.id)) {
                    results.push({ name: reg.name, info });
                    seenIds.add(info.id);
                }
            } else {
                results.push({ name: reg.name, info: undefined });
            }
        });

        return results;
    }, [trip.locations.regions]);

    // Automated Jet Lag calculation from Flight Data
    const jetLagAdvice = useMemo(() => {
        const flights = trip.flights || [];
        if (flights.length === 0) return null;

        const mainFlight = flights.find((f: FlightSegment) => f.isInternational) || flights[0];
        if (!mainFlight.departureTime || !mainFlight.arrivalTime) return null;

        const depDate = new Date(mainFlight.departureTime);
        const arrDate = new Date(mainFlight.arrivalTime);
        
        const durationHours = (arrDate.getTime() - depDate.getTime()) / (1000 * 60 * 60);
        
        let destination = allRegionsInfo.find(r => r.info)?.info;
        
        if (!destination && mainFlight.arrivalLocation) {
            const destName = mainFlight.arrivalLocation;
            const normalize = (str: string) => str.replace(/\s+/g, '').toLowerCase();
            destination = Object.values(REGION_DATA).find(
                d => d.keywords.some(k => normalize(k) === normalize(destName)) ||
                     normalize(d.name) === normalize(destName)
            );
        }

        const homeOffset = 9; // Korea (KST)
        const destOffset = destination?.timezone ?? homeOffset;
        let diff = destOffset - homeOffset;
        if (diff > 12) diff -= 24;
        if (diff < -12) diff += 24;

        const arrivalHour = (arrDate.getUTCHours() + destOffset + 24) % 24;

        interface JetLagStep {
            time: string;
            task: string;
            sub: string;
        }

        let schedule: JetLagStep[] = [];
        let summary = "";
        let advice = "";
        
        if (diff > 0) { // Eastbound
            summary = "수면 시간 앞당기기 (Phase Advance)";
            if (arrivalHour >= 6 && arrivalHour < 14) {
                schedule = [
                    { time: "비행 전반부", task: "최대한 깨어 있기", sub: "밝은 빛 노출" },
                    { time: "비행 후반부", task: "심층 수면", sub: "안대/귀마개 사용" },
                    { time: "도착 직후", task: "강한 햇빛 노출", sub: "카페인 섭취 추천" }
                ];
                advice = "목적지가 아침입니다. 비행 후반부에 자두어야 도착 후 하루를 보낼 수 있습니다.";
            } else {
                schedule = [
                    { time: "비행 전반부", task: "짧은 낮잠 (45분)", sub: "깊은 잠 금지" },
                    { time: "비행 후반부", task: "가벼운 휴식", sub: "도착 후 바로 취침 준비" },
                    { time: "도착 직후", task: "멜라토닌/취침", sub: "현지 시간에 맞춰 취침" }
                ];
                advice = "목적지가 저녁입니다. 기내에서 너무 많이 자면 도착 후 잠들기 어렵습니다.";
            }
        } else if (diff < 0) { // Westbound
            summary = "수면 시간 늦추기 (Phase Delay)";
            if (arrivalHour >= 12 && arrivalHour < 20) {
                schedule = [
                    { time: "비행 전반부", task: "최대한 깨어 있기", sub: "영화 시청, 독서" },
                    { time: "비행 후반부", task: "가벼운 졸음 유지", sub: "카페인 조절" },
                    { time: "도착 직후", task: "야외 활동", sub: "저녁까지 버티기" }
                ];
                advice = "목적지가 오후입니다. 낮잠을 피하고 저녁까지 깨어 있어야 시차 적응이 빠릅니다.";
            } else {
                schedule = [
                    { time: "비행 시작 시", task: "바로 취침", sub: "최대한 길게 수면" },
                    { time: "비행 후반부", task: "기상 및 식사", sub: "단백질 위주 식사" },
                    { time: "도착 직후", task: "모닝 커피", sub: "활동적인 일정 시작" }
                ];
                advice = "목적지가 새벽/아침입니다. 비행기에서 밤잠을 잔다고 생각하고 푹 자두세요.";
            }
        }

        return {
            duration: durationHours.toFixed(1),
            diff,
            summary,
            schedule,
            advice,
            arrivalHour,
            departure: mainFlight.departureLocation,
            arrival: mainFlight.arrivalLocation
        };
    }, [trip.flights, allRegionsInfo]);

    // --- First Aid Kit Management ---
    const checklistItems = trip.checklist || [];
    const addChecklistItem = useTripStore(state => state.addChecklistItem);
    const updateChecklistItem = useTripStore(state => state.updateChecklistItem);
    const removeChecklistItem = useTripStore(state => state.removeChecklistItem);

    const firstAidKitStatus = useMemo(() => {
        return HEALTH_KIT_ITEMS.map(preset => {
            const existing = checklistItems.find((item: ChecklistItem) => 
                item.title === preset.name || item.tags?.includes(`kit:${preset.id}`)
            );
            return {
                ...preset,
                item: existing
            };
        });
    }, [checklistItems]);

    const toggleKitItem = (id: string, name: string) => {
        const existing = checklistItems.find((item: ChecklistItem) => 
            item.title === name || item.tags?.includes(`kit:${id}`)
        );

        if (existing) {
            updateChecklistItem(existing.id, { isDone: !existing.isDone });
        } else {
            addChecklistItem({
                title: name,
                tags: ['의약품', '구급함', `kit:${id}`]
            });
        }
    };

    const addAllToKit = () => {
        HEALTH_KIT_ITEMS.forEach(item => {
            const existing = checklistItems.find((i: ChecklistItem) => 
                i.title === item.name || i.tags?.includes(`kit:${item.id}`)
            );
            if (!existing) {
                addChecklistItem({
                    title: item.name,
                    tags: ['의약품', '구급함', `kit:${item.id}`]
                });
            }
        });
    };

    // Health Translation Cards & Food Warnings
    const healthValueAdds = useMemo(() => {
        const destination = allRegionsInfo.find(r => r.info)?.info;
        if (!destination) return null;

        const results: { type: string, local: string, desc: string, icon: string }[] = [];
        
        if (allergies) {
            const allergyList = allergies.split(',').map(s => s.trim().toLowerCase());
            allergyList.forEach(a => {
                let localMsg = "";
                if (destination.foodCautions) {
                     const key = Object.keys(destination.foodCautions).find(k => a.includes(k));
                     if (key) localMsg = destination.foodCautions[key];
                }
                
                if (localMsg) {
                    results.push({
                        type: 'Allergy Card',
                        local: localMsg,
                        desc: `${a} 알레르기 안내`,
                        icon: 'warning'
                    });
                }
            });
        }

        if (medications && destination.primaryLanguage !== 'English') {
             results.push({
                type: 'Medication Info',
                local: `이것은 상시 복용하는 의약품입니다. (${medications})`,
                desc: '입국 심사 및 약국 제시용',
                icon: 'pill'
            });
        }

        destination.tips.slice(0, 2).forEach(tip => {
            results.push({
                type: 'Local Safety Tip',
                local: tip,
                desc: '현지 안전 수칙',
                icon: 'gpp_good'
            });
        });

        return results;
    }, [allergies, medications, allRegionsInfo]);

    const handleHealthUpdate = () => {
        updateTrip({
            healthInfo: {
                allergies: allergies.split(',').map(s => s.trim()).filter(Boolean),
                medications: medications.split(',').map(s => s.trim()).filter(Boolean)
            }
        });
    };

    const handleMemoUpdate = () => {
        updateTrip({ memo });
    };

    const getRiskLevelColor = (level: RiskCategory['level']) => {
        switch (level) {
            case 'low': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            case 'moderate': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
            case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
            case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
            default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
        }
    };

    const copyToClipboard = (text: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
    };

    const getMofaStatus = (level: number) => {
        switch (level) {
            case 0: return { label: '안전/안정', color: 'bg-emerald-500', text: '일반적인 주의 외 특별한 위험 사항 없음' };
            case 1: return { label: '여행유의 (1단계)', color: 'bg-blue-500', text: '신변안전 유의' };
            case 2: return { label: '여행자제 (2단계)', color: 'bg-amber-400', text: '신변안전 특별유의 / 불필요한 여행 자제' };
            case 3: return { label: '출국권고 (3단계)', color: 'bg-orange-500', text: '체류자 신변안전 유의 및 철수 검토' };
            case 4: return { label: '여행금지 (4단계)', color: 'bg-red-600', text: '즉시 대피 및 철수' };
            default: return { label: '정보 확인 필요', color: 'bg-slate-400', text: '외교부 최신 소식 필요' };
        }
    };

    const overallStats = useMemo(() => {
        const doneKit = firstAidKitStatus.filter(k => k.item?.isDone).length;
        const totalKit = firstAidKitStatus.length;
        const regionsCount = allRegionsInfo.filter(r => r.info).length;
        const hasWarning = allRegionsInfo.some(r => (r.info?.mofaLevel ?? 0) > 0);

        return { doneKit, totalKit, regionsCount, hasWarning, kitProgress: Math.round((doneKit / (totalKit || 1)) * 100) };
    }, [firstAidKitStatus, allRegionsInfo]);

    return (
        <div className="space-y-12 max-w-5xl">
            {/* Improved Header with Stats Summary */}
            <div className="p-8 bg-slate-900 rounded-[2.5rem] border border-slate-800 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-1/4 h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 text-left">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Health & Safety Dashboard</span>
                        </div>
                        <h2 className="text-3xl font-black text-white leading-tight">
                            안전하고 쾌적한 여행을 위한 <span className="text-primary tracking-tighter">스마트 가이드</span>
                        </h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="px-5 py-3 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center min-w-[100px]">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Medical Kit</span>
                            <span className="text-xl font-black text-white">{overallStats.doneKit}/{overallStats.totalKit}</span>
                        </div>
                        <div className="px-5 py-3 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center min-w-[100px]">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Safety Info</span>
                            <span className="text-xl font-black text-white">{overallStats.regionsCount}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Jet Lag Advice Section (Conditional) */}
            {jetLagAdvice && (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm p-8 space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4 text-left">
                            <div className="w-12 h-12 rounded-[1.25rem] bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                                <span className="material-symbols-rounded">schedule</span>
                            </div>
                            <div className="text-left">
                                <h3 className="text-xl font-black text-slate-800 dark:text-white">시차 적응 가이드</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{jetLagAdvice.departure} → {jetLagAdvice.arrival} ({jetLagAdvice.diff > 0 ? `+${jetLagAdvice.diff}` : jetLagAdvice.diff}시간)</p>
                            </div>
                        </div>
                        <div className="px-4 py-2 bg-slate-900 text-white rounded-2xl border border-white/10 flex flex-col items-end">
                            <span className="text-[9px] font-black uppercase text-slate-500">Flight Duration</span>
                            <span className="text-lg font-black">{jetLagAdvice.duration}h</span>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700 text-left">
                        <h4 className="text-base font-black text-slate-800 dark:text-white mb-2">{jetLagAdvice.summary}</h4>
                        <p className="text-sm font-bold text-slate-500 leading-relaxed italic">"{jetLagAdvice.advice}"</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {jetLagAdvice.schedule.map((step, idx) => (
                            <div key={idx} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-left">
                                <span className="text-[10px] font-black text-primary uppercase mb-1 block">{step.time}</span>
                                <h5 className="text-sm font-black text-slate-800 dark:text-white mb-1">{step.task}</h5>
                                <p className="text-[10px] text-slate-500 font-medium">{step.sub}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Content Grid: Collapsible Sections */}
            <div className="grid grid-cols-1 gap-6">
                {/* 1. Health & Medical Section */}
                <section className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <button 
                        onClick={() => toggleSection('health')}
                        className="w-full px-8 py-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                <span className="material-symbols-rounded">medical_information</span>
                            </div>
                            <div className="text-left">
                                <h3 className="text-base font-black text-slate-800 dark:text-white">나의 건강 정보 & 안내 카드</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Input allergies, medications and get translation cards</p>
                            </div>
                        </div>
                        <span className="material-symbols-rounded text-slate-300 transition-transform" style={{ transform: expandedSections.includes('health') ? 'rotate(180deg)' : 'none' }}>expand_more</span>
                    </button>

                    <AnimatePresence>
                        {expandedSections.includes('health') && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden border-t border-slate-200/60 dark:border-slate-800"
                            >
                                <div className="p-8 space-y-8">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
                                        <div className="space-y-2.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Allergies (알레르기)</label>
                                            <div className="relative">
                                                <input 
                                                    value={allergies}
                                                    onChange={(e) => setAllergies(e.target.value)}
                                                    placeholder="Nuts, Seafood, Eggs..."
                                                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:border-primary/50 transition-all font-bold text-sm"
                                                />
                                                <button onClick={handleHealthUpdate} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:text-primary transition-colors">
                                                    <span className="material-symbols-rounded text-base">done</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-2.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Medications (복용 중인 약)</label>
                                            <div className="relative">
                                                <input 
                                                    value={medications}
                                                    onChange={(e) => setMedications(e.target.value)}
                                                    placeholder="Aspirin, Insulin..."
                                                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:border-primary/50 transition-all font-bold text-sm"
                                                />
                                                <button onClick={handleHealthUpdate} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:text-primary transition-colors">
                                                    <span className="material-symbols-rounded text-base">done</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Translation Cards */}
                                    {healthValueAdds && healthValueAdds.length > 0 && (
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Emergency Info Cards</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {healthValueAdds.map((card, idx) => (
                                                    <div key={idx} className="p-6 bg-slate-900 text-white rounded-[2rem] border border-white/5 relative overflow-hidden group">
                                                        <div className="relative z-10">
                                                            <div className="flex items-center gap-2 mb-4">
                                                                <span className="material-symbols-rounded text-primary text-base">{card.icon}</span>
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{card.type}</span>
                                                            </div>
                                                            <h5 className="text-lg font-black mb-1 truncate">{card.local}</h5>
                                                            <p className="text-[10px] font-bold text-slate-400">{card.desc}</p>
                                                            <button 
                                                                onClick={() => copyToClipboard(card.local)}
                                                                className="mt-6 w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase transition-all"
                                                            >
                                                                Copy Translation
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>

                {/* 2. First Aid Kit Section */}
                <section className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <button 
                        onClick={() => toggleSection('kit')}
                        className="w-full px-8 py-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                <span className="material-symbols-rounded">medical_services</span>
                            </div>
                            <div className="text-left">
                                <h3 className="text-base font-black text-slate-800 dark:text-white">비상 구급함 확인</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Check mandatory medications & supplies</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="hidden md:flex flex-col items-end">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-black text-emerald-600">{overallStats.kitProgress}%</span>
                                    <div className="w-24 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500" style={{ width: `${overallStats.kitProgress}%` }} />
                                    </div>
                                </div>
                            </div>
                            <span className="material-symbols-rounded text-slate-300 transition-transform" style={{ transform: expandedSections.includes('kit') ? 'rotate(180deg)' : 'none' }}>expand_more</span>
                        </div>
                    </button>

                    <AnimatePresence>
                        {expandedSections.includes('kit') && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden border-t border-slate-200/60 dark:border-slate-800"
                            >
                                <div className="p-8 space-y-8">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Recommended Kit Items</h4>
                                        <button onClick={addAllToKit} className="text-[10px] font-black text-primary px-3 py-1 bg-primary/5 rounded-full border border-primary/10 hover:bg-primary/10">전체 추가</button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {firstAidKitStatus.map((item) => (
                                            <div 
                                                key={item.id}
                                                onClick={() => toggleKitItem(item.id, item.name)}
                                                className={cn(
                                                    "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group text-left",
                                                    item.item?.isDone 
                                                        ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/50" 
                                                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary/30"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-7 h-7 rounded-full flex items-center justify-center transition-colors shadow-sm",
                                                        item.item?.isDone ? "bg-emerald-500 text-white" : "bg-white dark:bg-slate-700 text-slate-400"
                                                    )}>
                                                        <span className="material-symbols-rounded text-base">{item.item?.isDone ? 'check' : item.icon}</span>
                                                    </div>
                                                    <div>
                                                        <p className={cn("text-xs font-black", item.item?.isDone ? "text-emerald-700 dark:text-emerald-400 line-through opacity-70" : "text-slate-800 dark:text-slate-100")}>
                                                            {item.name}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>

                {/* 3. Safe Travel & Regional Info Section (Dynamic Loop) */}
                <section className="space-y-4">
                    {allRegionsInfo.length > 0 ? (
                        allRegionsInfo.map((region, idx) => (
                            <motion.div
                                key={`${region.name}-${idx}`}
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
                            >
                                <button 
                                    onClick={() => toggleSection(`region-${idx}`)}
                                    className="w-full px-8 py-5 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="text-left">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">REGION SAFETY INFO</span>
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white">{region.name}</h3>
                                        </div>
                                        {region.info && (
                                            <div className={cn("px-3 py-1 rounded-xl flex items-center gap-2 border text-[10px] font-black uppercase", getMofaStatus(region.info.mofaLevel).color.replace('bg-', 'text-').concat(' border-current border-opacity-10 bg-current bg-opacity-5'))}>
                                                <div className={cn("w-2 h-2 rounded-full", getMofaStatus(region.info.mofaLevel).color)} />
                                                {getMofaStatus(region.info.mofaLevel).label}
                                            </div>
                                        )}
                                    </div>
                                    <span className="material-symbols-rounded text-slate-300 transition-transform" style={{ transform: expandedSections.includes(`region-${idx}`) ? 'rotate(180deg)' : 'none' }}>expand_more</span>
                                </button>

                                <AnimatePresence>
                                    {expandedSections.includes(`region-${idx}`) && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden border-t border-slate-200/60 dark:border-slate-800"
                                        >
                                            {region.info ? (
                                                <div className="p-8 space-y-8 text-left">
                                                    <p className="text-sm font-bold text-slate-500 leading-relaxed italic">{getMofaStatus(region.info.mofaLevel).text}</p>
                                                    
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                        {/* Local Vaccinations */}
                                                        <div className="space-y-4">
                                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                                                <span className="material-symbols-rounded text-sm">vaccines</span> 권장 예방접종
                                                            </h4>
                                                            <div className="space-y-2">
                                                                {region.info.vaccinations.map((vac, vIdx) => (
                                                                    <div key={vIdx} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                                                                        <div className="flex items-center gap-3">
                                                                            <span className="material-symbols-rounded text-slate-400 text-lg">{vac.icon}</span>
                                                                            <span className="text-[11px] font-black text-slate-800 dark:text-slate-100">{vac.disease}</span>
                                                                        </div>
                                                                        <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-500 rounded-md border border-slate-200 dark:border-slate-700">{vac.requirement}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Emergency Contacts */}
                                                        <div className="space-y-4">
                                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                                                <span className="material-symbols-rounded text-sm">contact_emergency</span> 긴급 연락처
                                                            </h4>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                {region.info.emergencyContacts.map((contact, cIdx) => (
                                                                    <button key={cIdx} className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between group hover:bg-primary transition-all">
                                                                        <div className="flex flex-col text-left">
                                                                            <span className="text-[8px] font-bold text-slate-500 uppercase mb-0.5">{contact.label}</span>
                                                                            <span className="text-sm font-black tracking-tight">{contact.number}</span>
                                                                        </div>
                                                                        <span className="material-symbols-rounded text-base">call</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800 text-center">
                                                        <p className="text-[10px] font-bold text-slate-400 max-w-lg mx-auto leading-relaxed opacity-70">
                                                            최신 안정 정보가 집계되었습니다.
                                                            <br /><span className="text-primary/70">이는 시스템상의 데이터 연동 단계이며, 지역의 실제 안전 여부와는 무관합니다.</span>
                                                            <br />현재는 주요 관광 국가를 중심으로 우선 제공 중입니다.
                                                        </p>
                                                        <div className="mt-6 flex justify-center">
                                                            <a 
                                                                href="https://www.0404.go.kr/dev/main.mofa" 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-2 px-8 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-black/10"
                                                            >
                                                                외교부 최신 안전정보 확인
                                                                <span className="material-symbols-rounded text-sm">open_in_new</span>
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-12 text-center">
                                                    <p className="text-sm font-black text-slate-400 uppercase tracking-tight">상세 분석 데이터 준비 중</p>
                                                    <p className="text-[10px] font-bold text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">준비된 주요 관광지 이외의 지역은 현재 분석 중입니다. <br/>최신 안전 정보는 외교부 영사콜센터를 확인해 주세요.</p>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))
                    ) : (
                        <div className="p-24 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] bg-slate-50/50 dark:bg-slate-800/10">
                            <span className="material-symbols-rounded text-5xl mb-4 text-slate-300 font-bold">location_off</span>
                            <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">기본 정보에서 목적지를 먼저 설정해 주세요</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}