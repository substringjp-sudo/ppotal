'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LocationStats,
    LocationCountryNode,
    LocationPrefNode,
    LocationCityNode,
} from '@pplaner/shared';
import { TripDocument, TripSummary } from '@pplaner/shared';
import { CATEGORY_MAP, MainCategory, WishlistItem } from '@pplaner/shared';

type FilterTab = 'all' | 'visited' | 'wishlist';

interface Props {
    locationStats: LocationStats;
}

// ── 공통 UI 컴포넌트 ────────────────────────────────────────────────────────

function SummaryCard({
    icon,
    label,
    value,
    color,
}: {
    icon: string;
    label: string;
    value: number;
    color: string;
}) {
    return (
        <div
            className="flex flex-col items-center justify-center gap-0.5 p-3 md:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] md:rounded-[24px]"
        >
            <span
                className="material-symbols-rounded text-xl md:text-2xl"
                style={{ color }}
            >
                {icon}
            </span>
            <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-none">
                {value}
            </span>
            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-400">
                {label}
            </span>
        </div>
    );
}

function StatusBadge({ tripCount, plannedCount, wishlistCount, isMastered, isPlanned }: { tripCount: number; plannedCount: number; wishlistCount: number; isMastered?: boolean; isPlanned?: boolean }) {
    if (isMastered) {
        return (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-white shadow-sm shadow-emerald-200 dark:shadow-none animate-pulse">
                Mastered
            </span>
        );
    }
    if (tripCount > 0) {
        return (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-orange-100 text-primary dark:bg-orange-900/40 dark:text-orange-400">
                Visited
            </span>
        );
    }
    if (plannedCount > 0 || isPlanned) {
        return (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                Planned
            </span>
        );
    }
    if (wishlistCount > 0) {
        return (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                Wishlist
            </span>
        );
    }
    return null;
}

// ── 상세 페이지/위젯: LocationDetailView ───────────────────────────────────────

function LocationDetailView({ 
    node, 
    onClose 
}: { 
    node: LocationCountryNode | LocationPrefNode | LocationCityNode; 
    onClose: () => void;
}) {
    const isCountry = 'prefectures' in node;
    const isPref = 'cities' in node;

    // TripSummary는 TripDocument가 아닐 수 있으므로 안전하게 처리
    const trips = node.trips || [];
    const wishes = node.wishlistItems || [];

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden"
        >
            {/* 헤더 */}
            <div className="p-6 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-primary">
                        <span className="material-symbols-rounded text-xl">
                            {isCountry ? 'public' : isPref ? 'map' : 'location_city'}
                        </span>
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">{node.name}</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            {isCountry ? '국가' : isPref ? '지역' : '도시'} 숙련도
                        </p>
                    </div>
                </div>
                <button 
                    onClick={onClose}
                    className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center text-slate-400"
                >
                    <span className="material-symbols-rounded text-sm">close</span>
                </button>
            </div>

            {/* 컨텐츠 스크롤 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {/* XP & Mastery 섹션 */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">숙련도 상태</span>
                        <div className="flex items-center gap-2">
                             <StatusBadge 
                                tripCount={node.tripCount} 
                                plannedCount={node.plannedCount}
                                wishlistCount={node.wishlistCount} 
                                isMastered={node.isMastered}
                                isPlanned={node.isPlanned}
                            />
                            <span className="text-[10px] font-black text-slate-900 dark:text-white">{Math.round((node.xp / node.maxXp) * 100)}%</span>
                        </div>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(node.xp / node.maxXp) * 100}%` }}
                            className={`h-full ${node.isMastered ? 'bg-emerald-500' : 'bg-primary'}`}
                        />
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 italic">
                        이 지역에서 {node.xp} / {node.maxXp} XP를 획득했습니다.
                    </p>
                </section>

                {/* 방문 기록 섹션 */}
                <section className="space-y-4">
                    <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">
                        <span className="material-symbols-rounded text-sm">history</span>
                        여행 기록 ({trips.length})
                    </h4>
                    {trips.length > 0 ? (
                        <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                            {trips.map((trip: TripDocument | TripSummary, idx: number) => (
                                <a 
                                    key={trip.id + idx}
                                    href={`/dashboard/${trip.id}`}
                                    className="block p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all rounded-2xl border border-slate-200 dark:border-slate-800 group"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors line-clamp-1">
                                                {trip.title}
                                            </p>
                                            <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                                                {trip.dates?.startDate && new Date(trip.dates.startDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <span className="material-symbols-rounded text-xs text-slate-300 group-hover:translate-x-1 transition-transform">east</span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                             <p className="text-[10px] font-bold text-slate-400 italic">아직 여행 기록이 없습니다.</p>
                        </div>
                    )}
                </section>

                {/* 위시리스트 섹션 */}
                <section className="space-y-4">
                    <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">
                        <span className="material-symbols-rounded text-sm">bookmark_heart</span>
                        위시리스트 ({wishes.length})
                    </h4>
                    {wishes.length > 0 ? (
                        <div className="space-y-1.5 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                            {wishes.map((item: WishlistItem) => (
                                <div 
                                    key={item.id}
                                    className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 group transition-all hover:border-primary/30"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center flex-shrink-0 shadow-sm">
                                        <span className="material-symbols-rounded text-base" style={{ color: CATEGORY_MAP[(item.mainCategory as MainCategory) ?? 'other']?.color || '#ccc' }}>
                                            {CATEGORY_MAP[(item.mainCategory as MainCategory) ?? 'other']?.icon || 'help'}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black text-slate-800 dark:text-slate-200 truncate group-hover:text-primary transition-colors">
                                            {item.title}
                                        </p>
                                    </div>
                                    <span className="material-symbols-rounded text-[10px] text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
                                        arrow_outward
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                             <p className="text-[10px] font-bold text-slate-400 italic">이 지역에 등록된 위시리스트가 없습니다.</p>
                        </div>
                    )}
                </section>
            </div>
            
            {/* 하단 CTA */}
            <div className="p-6 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-200/60 dark:border-slate-800">
                 <button 
                    onClick={() => window.location.href = `/wishlist?location=${node.id || node.name}`}
                    className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2"
                 >
                    <span className="material-symbols-rounded text-sm">add_circle</span>
                    새 위시 추가하기
                 </button>
            </div>
        </motion.div>
    );
}

// ── 트리 노드 컴포넌트 ──────────────────────────────────────────────────────────

function TreeNode({ 
    node, 
    depth = 0, 
    onSelect, 
    isSelected,
    forceExpanded = false
}: { 
    node: LocationCountryNode | LocationPrefNode | LocationCityNode; 
    depth?: number; 
    onSelect: (node: LocationCountryNode | LocationPrefNode | LocationCityNode) => void;
    isSelected: boolean;
    forceExpanded?: boolean;
}) {
    const [expanded, setExpanded] = useState(forceExpanded);
    const hasChildren = 'prefectures' in node || 'cities' in node;
    const children = 'prefectures' in node 
        ? Object.values(node.prefectures) 
        : 'cities' in node 
        ? Object.values(node.cities) 
        : [];

    const isCountry = 'prefectures' in node;
    const isPref = 'cities' in node;

    const icon = isCountry ? 'public' : isPref ? 'map' : 'location_city';
    const xpPct = Math.round((node.xp / node.maxXp) * 100);

    return (
        <div className="space-y-1">
            <div 
                className={`flex items-center gap-2 p-3 rounded-2xl cursor-pointer transition-all border ${
                    isSelected 
                        ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/10' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-transparent'
                }`}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(node);
                    if (hasChildren) setExpanded(!expanded);
                }}
            >
                {/* 인덴트 보조선 */}
                {depth > 0 && Array.from({ length: depth }).map((_, i) => (
                    <div key={i} className="w-3 h-full border-l border-slate-200 dark:border-slate-800 ml-1" />
                ))}

                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                    isSelected ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600'
                }`}>
                    <span className="material-symbols-rounded text-base">{icon}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <span className={`text-[11px] font-black truncate ${isSelected ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>
                            {node.key === 'str:_unknown' ? 'Others' : node.name}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                              {node.isMastered ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                             ) : node.plannedCount > 0 || node.isPlanned ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                             ) : null}
                             <span className="text-[9px] font-bold text-slate-300 dark:text-slate-600">{xpPct}%</span>
                        </div>
                    </div>
                </div>

                {hasChildren && (
                    <span className={`material-symbols-rounded text-sm transition-transform text-slate-300 ${expanded ? 'rotate-180' : ''}`}>
                        expand_more
                    </span>
                )}
            </div>

            <AnimatePresence>
                {expanded && hasChildren && children.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden ml-2"
                    >
                        {children.map(child => (
                            <TreeNode 
                                key={child.key} 
                                node={child} 
                                depth={depth + 1} 
                                onSelect={onSelect}
                                isSelected={isSelected}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── 메인 컴포넌트: LocationHierarchySection ─────────────────────────────────────

export default function LocationHierarchySection({ locationStats }: Props) {
    const [activeTab, setActiveTab] = useState<FilterTab>('all');
    const [selectedNode, setSelectedNode] = useState<LocationCountryNode | LocationPrefNode | LocationCityNode | null>(null);
    const { summary, countries } = locationStats;

    const filteredCountries = useMemo(() => {
        return Object.values(countries).filter(c => {
            if (activeTab === 'visited') return c.tripCount > 0;
            if (activeTab === 'wishlist') return c.wishlistCount > 0;
            return true;
        });
    }, [countries, activeTab]);

    const tabs: { key: FilterTab; label: string; icon: string }[] = [
        { key: 'all', label: '전체', icon: 'public' },
        { key: 'visited', label: '방문한 곳', icon: 'travel_explore' },
        { key: 'wishlist', label: '가고 싶은 곳', icon: 'bookmark' },
    ];

    const isEmpty = Object.keys(countries).length === 0;

    return (
        <section className="space-y-8">
            {/* 타이틀 */}
            <div className="flex items-center gap-4">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase">
                    내가 만들어가는 세계
                </h2>
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
            </div>

            {/* 요약 카드 8개: 모바일에서 밀집도를 높임 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 md:gap-3">
                <SummaryCard icon="travel_explore" label="방문 국가" value={summary.visited.countries} color="#ec5b13" />
                <SummaryCard icon="location_city" label="방문 도시" value={summary.visited.cities} color="#ec5b13" />
                <SummaryCard icon="calendar_today" label="계획 국가" value={summary.planned.countries} color="#f59e0b" />
                <SummaryCard icon="calendar_month" label="계획 도시" value={summary.planned.cities} color="#f59e0b" />
                <SummaryCard icon="bookmark" label="위시 국가" value={summary.wishlist.countries} color="#3b82f6" />
                <SummaryCard icon="add_location" label="위시 도시" value={summary.wishlist.cities} color="#3b82f6" />
                <SummaryCard icon="verified" label="마스터 국가" value={Object.values(countries).filter(c => c.isMastered).length} color="#10b981" />
                <SummaryCard icon="task_alt" label="마스터 도시" value={Object.values(countries).reduce((acc, c) => acc + Object.values(c.prefectures).reduce((acc2, p) => acc2 + Object.values(p.cities).filter(city => city.isMastered).length, 0), 0)} color="#10b981" />
            </div>

            {/* 메인 탐색기 패널 (일체형) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] md:rounded-[40px] shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden h-auto xl:h-[700px] flex flex-col xl:flex-row">
                
                {/* 1. 사이드바: 트리 내비게이션 (좌측) */}
                <div className="w-full xl:w-[320px] 2xl:w-[380px] bg-slate-50/50 dark:bg-slate-800/20 border-b xl:border-b-0 xl:border-r border-slate-200 dark:border-slate-800 flex flex-col h-[400px] xl:h-full">
                    {/* 사이드바 헤더: 필터 */}
                    <div className="p-6 space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">탐색</p>
                        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
                            {tabs.map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                        activeTab === tab.key
                                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500'
                                    }`}
                                >
                                    <span className="material-symbols-rounded text-xs">{tab.icon}</span>
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 트리 리스트 */}
                    <div className="flex-1 overflow-y-auto px-4 pb-6 custom-scrollbar space-y-1">
                        {isEmpty ? (
                            <div className="py-20 text-center opacity-50">
                                <p className="text-[10px] font-bold italic">No locations discovered yet.</p>
                            </div>
                        ) : filteredCountries.length === 0 ? (
                            <div className="py-20 text-center opacity-50">
                                <p className="text-[10px] font-bold italic">No matching locations.</p>
                            </div>
                        ) : (
                            filteredCountries.map(country => (
                                <TreeNode 
                                    key={country.key} 
                                    node={country} 
                                    onSelect={setSelectedNode}
                                    isSelected={selectedNode?.key === country.key}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* 2. 메인 컨텐츠: 상세 정보 영역 (우측) */}
                <div className="flex-1 overflow-hidden relative bg-white dark:bg-slate-900 min-h-[400px] xl:h-full">
                    <AnimatePresence mode="wait">
                        {selectedNode ? (
                            <div className="h-full">
                                <LocationDetailView 
                                    key={selectedNode.key}
                                    node={selectedNode} 
                                    onClose={() => setSelectedNode(null)} 
                                />
                            </div>
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-full flex flex-col items-center justify-center p-12 text-center"
                            >
                                <div className="w-20 h-20 rounded-3xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-6">
                                    <span className="material-symbols-rounded text-4xl text-slate-200 animate-bounce">near_me</span>
                                </div>
                                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">장소를 선택해주세요</h4>
                                <p className="text-[10px] font-bold text-slate-300 mt-2 max-w-[240px] leading-relaxed">
                                    탐색기에서 국가, 지역 또는 도시를 클릭하여 상세 여행 기록과 위시리스트를 확인하세요.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
}
