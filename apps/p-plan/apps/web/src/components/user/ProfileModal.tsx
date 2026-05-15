'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore, updateUserProfile } from '@pplaner/shared';
import { RegionSearchInput } from '@/components/common/RegionSearchInput';
import { SearchResult } from '@pplaner/shared';
import { X, Info, Globe, Coins, Plane, Calendar, Shield, ClipboardCheck, Users, Wallet, Ghost, BarChart3, MapPin, Bed, Utensils, ShoppingBag, Landmark, BrainCircuit, Sparkles } from 'lucide-react';
import { AIRPORTS } from '@pplaner/shared';
import { TravelStyle } from '@pplaner/shared';
import { aggregateUserStats, UserStats } from '@pplaner/shared';
import { useAuth } from '@/hooks/useAuth';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
    const { user } = useAuth();
    const { profile: userProfile, updateProfile } = useUserStore();
    const [activeTab, setActiveTab] = useState<'settings' | 'stats'>('settings');
    const [stats, setStats] = useState<UserStats | null>(null);
    const [isStatsLoading, setIsStatsLoading] = useState(false);
    
    // Local state for form
    const [profile, setProfile] = useState({
        displayName: userProfile?.displayName || '',
        residenceCountry: userProfile?.residence?.country || '',
        residenceCountryId: userProfile?.residence?.countryId,
        residenceCity: userProfile?.residence?.region || '',
        residenceCityId: userProfile?.residence?.regionId,
        preferredCurrency: userProfile?.preferences?.currency || 'KRW',
        preferredLanguage: userProfile?.preferences?.language || 'ko',
        favoriteAirports: userProfile?.preferences?.favoriteAirports || [],
        travelStyle: userProfile?.travelStyle || {
            planning: 'flexible',
            active: 'relaxed',
            budgetStrategy: 'value',
            crowdPreference: 'local'
        } as TravelStyle,
        metadata: userProfile?.metadata
    });

    const [isLoading, setIsLoading] = useState(false);
    
    // Store the full region data for the selected residence country
    const [residenceCountryRegionData, setResidenceCountryRegionData] = useState<SearchResult['region'] | null>(null);

    // Available currencies for the dropdown
    const [availableCurrencies, setAvailableCurrencies] = useState<string[]>(['KRW', 'USD', 'JPY', 'EUR', 'CNY', 'GBP', 'VND', 'THB', 'TWD', 'HKD', 'SGD', 'AUD', 'CAD', 'CHF']);

    // Update available currencies when residence country data changes
    useEffect(() => {
        const baseCurrencies = ['KRW', 'USD', 'JPY', 'EUR', 'CNY', 'GBP', 'VND', 'THB', 'TWD', 'HKD', 'SGD', 'AUD', 'CAD', 'CHF'];
        if (residenceCountryRegionData?.currencies && residenceCountryRegionData.currencies.length > 0) {
            setAvailableCurrencies(Array.from(new Set([...residenceCountryRegionData.currencies, ...baseCurrencies])));
        } else {
            setAvailableCurrencies(baseCurrencies);
        }
    }, [residenceCountryRegionData]);

    useEffect(() => {
        if (isOpen) {
            // Reset state to profile when opening
            setProfile({
                displayName: userProfile?.displayName || '',
                residenceCountry: userProfile?.residence?.country || '',
                residenceCountryId: userProfile?.residence?.countryId,
                residenceCity: userProfile?.residence?.region || '',
                residenceCityId: userProfile?.residence?.regionId,
                preferredCurrency: userProfile?.preferences?.currency || 'KRW',
                preferredLanguage: userProfile?.preferences?.language || 'ko',
                favoriteAirports: userProfile?.preferences?.favoriteAirports || [],
                travelStyle: userProfile?.travelStyle || {
                    planning: 'flexible',
                    active: 'relaxed',
                    budgetStrategy: 'value',
                    crowdPreference: 'local'
                } as TravelStyle,
                metadata: userProfile?.metadata
            });
            // Reset country region data when opening
            setResidenceCountryRegionData(null);
            
            // Fetch stats if on stats tab or just to pre-cache
            if (user?.uid) {
                fetchStats();
            }
        }
    }, [isOpen, userProfile]);

    const fetchStats = async () => {
        if (!user?.uid) return;
        setIsStatsLoading(true);
        try {
            const data = await aggregateUserStats(user.uid);
            setStats(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsStatsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user?.uid) return;
        setIsLoading(true);
        
        try {
            const updates = {
                displayName: profile.displayName,
                residence: {
                    country: profile.residenceCountry,
                    countryId: profile.residenceCountryId,
                    region: profile.residenceCity,
                    regionId: profile.residenceCityId,
                },
                preferences: {
                    ...userProfile?.preferences,
                    currency: profile.preferredCurrency,
                    language: userProfile?.preferences?.language || 'ko',
                    favoriteAirports: profile.favoriteAirports
                },
                travelStyle: profile.travelStyle,
                updatedAt: new Date().toISOString(),
            };

            // Zustand 스토어 업데이트 (UI 즉시 반영)
            updateProfile(updates);

            // Firestore 업데이트 (영구 저장)
            await updateUserProfile(user.uid, updates);
            
            onClose();
        } catch (error) {
            console.error('Failed to save profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    <div className="p-8 pb-0 shrink-0 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <Globe className="w-6 h-6 text-primary" />
                                    프로필 및 인사이트
                                </h2>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-4 mb-4">
                            <button 
                                onClick={() => setActiveTab('settings')}
                                className={`flex items-center gap-2 pb-3 px-1 text-sm font-black transition-all relative ${
                                    activeTab === 'settings' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                <Globe className="w-4 h-4" />
                                설정
                                {activeTab === 'settings' && (
                                    <motion.div layoutId="profile-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                                )}
                            </button>
                            <button 
                                onClick={() => setActiveTab('stats')}
                                className={`flex items-center gap-2 pb-3 px-1 text-sm font-black transition-all relative ${
                                    activeTab === 'stats' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                <BarChart3 className="w-4 h-4" />
                                내 여행 통계
                                {activeTab === 'stats' && (
                                    <motion.div layoutId="profile-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="p-8 pt-6 overflow-y-auto custom-scrollbar flex-1">
                        {activeTab === 'settings' ? (
                            <div className="space-y-6">
                            {/* 이름 */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">사용자 이름</label>
                                <input
                                    type="text"
                                    value={profile.displayName}
                                    onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                                    placeholder="이름을 입력하세요"
                                    className="w-full px-4 py-3 text-sm font-bold bg-slate-100 dark:bg-slate-800 rounded-2xl border border-transparent focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                />
                            </div>

                            {/* 거주 국가 */}
                            <RegionSearchInput
                                label="거주 국가"
                                value={profile.residenceCountry}
                                typeFilter="country"
                                placeholder="국가명을 검색하세요"
                                onChange={(name, result) => {
                                    const nextProfile = {
                                        ...profile,
                                        residenceCountry: name,
                                        residenceCountryId: result?.ids.countryId
                                    };
                                    
                                    // Update residence country region data for currency and info
                                    setResidenceCountryRegionData(result?.region || null);
                                    
                                    // Auto-select currency if country has currencies
                                    if (result?.region?.currencies && result.region.currencies.length > 0) {
                                        nextProfile.preferredCurrency = result.region.currencies[0];
                                    }
                                    
                                    setProfile(nextProfile);
                                }}
                            />

                            {/* 거주 지역 (도시) */}
                            <RegionSearchInput
                                label="거주 도시"
                                value={profile.residenceCity}
                                typeFilter="region"
                                placeholder="도시나 지역을 검색하세요"
                                onChange={(name, result) => {
                                    setProfile({
                                        ...profile,
                                        residenceCity: name,
                                        residenceCityId: result?.id
                                    });
                                }}
                            />
                            {/* 선호 통화 */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1">
                                    <Coins className="w-3 h-3" />
                                    선호 통화
                                </label>
                                <div className="relative">
                                    <select
                                        value={profile.preferredCurrency}
                                        onChange={(e) => setProfile({ ...profile, preferredCurrency: e.target.value })}
                                        className="w-full px-4 py-3 text-sm font-bold bg-slate-100 dark:bg-slate-800 rounded-2xl border border-transparent focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary/20 transition-all outline-none appearance-none cursor-pointer"
                                    >
                                        {availableCurrencies.map(currency => (
                                            <option key={currency} value={currency}>{currency}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <Info className="w-4 h-4" />
                                    </div>
                                </div>
                                {residenceCountryRegionData?.currencies && residenceCountryRegionData.currencies.length > 0 && (
                                    <p className="text-[10px] font-bold text-primary/70 ml-1">
                                        💡 {profile.residenceCountry}의 기본 통화는 {residenceCountryRegionData.currencies.join(', ')}입니다.
                                    </p>
                                )}
                            </div>
                            
                            {/* 여행 스타일 섹션 */}
                            <div className="space-y-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                                <div className="space-y-1">
                                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
                                        <Ghost className="w-3.5 h-3.5 text-primary" />
                                        여행 스타일 설정
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400">스타일에 맞춰 시스템이 일정을 검토하고 경고를 조절합니다.</p>
                                </div>

                                {/* 여행 DNA 분석 (Balanced Bar UI) */}
                                <div className="space-y-6 pt-2 pb-4">
                                    <div className="flex items-center justify-between mb-6 px-1">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-primary to-orange-500 text-white shadow-lg shadow-primary/20">
                                                <BrainCircuit className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                                    여행 DNA 분석
                                                    <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                                                </h4>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Precision AI Analysis</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-[9px] font-black border border-primary/20">
                                                AI 정밀 분석됨
                                            </span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                                                Last Check: {new Date((profile.metadata?.travelStats?.analysisDate || Date.now()) as any).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    {[
                                        { 
                                            id: 'planning', 
                                            icon: <Calendar className="w-3 h-3" />, 
                                            title: '계획성 (Planning)', 
                                            left: '즉흥적인 매력', 
                                            right: '철저한 계획',
                                            scoreKey: 'planningScore',
                                            leftVal: 'flexible',
                                            rightVal: 'planned'
                                        },
                                        { 
                                            id: 'active', 
                                            icon: <Plane className="w-3 h-3" />, 
                                            title: '활동성 (Activity)', 
                                            left: '여유로운 휴식', 
                                            right: '에너제틱 활동',
                                            scoreKey: 'activeScore',
                                            leftVal: 'relaxed',
                                            rightVal: 'energetic'
                                        },
                                        { 
                                            id: 'budgetStrategy', 
                                            icon: <Wallet className="w-3 h-3" />, 
                                            title: '여행의 밀도 (Pace)', 
                                            left: '최대한 여유있게', 
                                            right: '알차게 꽉 채워',
                                            scoreKey: 'budgetStrategyScore',
                                            leftVal: 'value',
                                            rightVal: 'luxury'
                                        },
                                        { 
                                            id: 'crowdPreference', 
                                            icon: <Users className="w-3 h-3" />, 
                                            title: '선호 성향 (Preference)', 
                                            left: '현지인 감성', 
                                            right: '트렌디한 핫플',
                                            scoreKey: 'crowdPreferenceScore',
                                            leftVal: 'local',
                                            rightVal: 'trendy'
                                        }
                                    ].map((dim) => {
                                        const score = (profile.metadata?.travelStats as any)?.[dim.scoreKey] as number ?? 
                                                     (profile.travelStyle?.[dim.id as keyof TravelStyle] === dim.rightVal ? 100 : 50);
                                        
                                        const leftPercent = 100 - score;
                                        const rightPercent = score;

                                        return (
                                            <div key={dim.id} className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 ml-1">
                                                        <span className="text-slate-400">{dim.icon}</span>
                                                        <span className="text-[10px] font-black text-slate-500">{dim.title}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${leftPercent > 50 ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}>
                                                            {leftPercent}
                                                        </span>
                                                        <span className="text-[8px] font-bold text-slate-300">:</span>
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${rightPercent >= 50 ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}>
                                                            {rightPercent}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                <div className="group relative">
                                                    <div className="flex items-center justify-between mb-2 px-1">
                                                        <span className={`text-[10px] font-black transition-all duration-500 ${leftPercent > 50 ? 'text-primary scale-110' : 'text-slate-400'}`}>{dim.left}</span>
                                                        <span className={`text-[10px] font-black transition-all duration-500 ${rightPercent >= 50 ? 'text-primary scale-110' : 'text-slate-400'}`}>{dim.right}</span>
                                                    </div>
                                                    
                                                    <div 
                                                        className="relative h-3 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center cursor-pointer overflow-hidden border border-slate-200/50 dark:border-white/5"
                                                        onClick={(e) => {
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            const x = e.clientX - rect.left;
                                                            const newScore = Math.round((x / rect.width) * 100);
                                                            
                                                            const updatedStats = { ...(profile.metadata?.travelStats || {}), [dim.scoreKey]: newScore };
                                                            const updatedStyle = { 
                                                                ...profile.travelStyle, 
                                                                [dim.id]: newScore > 50 ? dim.rightVal : dim.leftVal 
                                                            };
                                                            
                                                            setProfile({
                                                                ...profile,
                                                                travelStyle: updatedStyle as any,
                                                                metadata: { ...(profile.metadata || {}), travelStats: updatedStats } as any
                                                            });
                                                        }}
                                                    >
                                                        {/* Center Divider Shadow */}
                                                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/50 dark:bg-black/20 z-10" />
                                                        
                                                        {/* Left Side Fill (Dynamic width from left 50%) */}
                                                        <motion.div 
                                                            initial={false}
                                                            animate={{ 
                                                                width: `${leftPercent}%`,
                                                                left: 0
                                                            }}
                                                            className="absolute top-0 bottom-0 bg-gradient-to-r from-slate-200/50 to-primary/20 dark:from-slate-700/50 dark:to-primary/20"
                                                        />
                                                        
                                                        {/* Right Side Fill (Dynamic width from right 50%) */}
                                                        <motion.div 
                                                            initial={false}
                                                            animate={{ 
                                                                width: `${rightPercent}%`,
                                                                right: 0
                                                            }}
                                                            className="absolute top-0 bottom-0 bg-gradient-to-l from-primary to-primary/40"
                                                        />

                                                        {/* The "Balance Point" Handle */}
                                                        <motion.div 
                                                            initial={false}
                                                            animate={{ left: `${rightPercent}%` }}
                                                            className="absolute top-0 bottom-0 w-1 bg-white dark:bg-slate-900 border-x border-primary/30 z-20 shadow-[0_0_10px_rgba(244,63,94,0.3)]"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 즐겨찾기 공항 */}
                            <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1">
                                    <Plane className="w-3 h-3" />
                                    즐겨찾는 공항 (최대 3개)
                                </label>
                                
                                <div className="flex flex-wrap gap-2">
                                    {profile.favoriteAirports.map(code => {
                                        const airport = AIRPORTS.find(a => a.code === code);
                                        return (
                                            <div 
                                                key={code}
                                                className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-transparent hover:border-primary/20 transition-all group"
                                            >
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-black text-slate-900 dark:text-white leading-tight">
                                                        {code}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-slate-400 truncate max-w-[80px]">
                                                        {airport?.nameKo || '알 수 없음'}
                                                    </span>
                                                </div>
                                                <button 
                                                    onClick={() => setProfile({
                                                        ...profile,
                                                        favoriteAirports: profile.favoriteAirports.filter(c => c !== code)
                                                    })}
                                                    className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-red-500 transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                    {profile.favoriteAirports.length === 0 && (
                                        <p className="text-[11px] font-bold text-slate-400 italic px-1 py-1">
                                            공항 검색에서 별 아이콘을 눌러 추가하세요.
                                        </p>
                                    )}
                                </div>
                            </div>
                            </div>
                        ) : (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {isStatsLoading ? (
                                    <div className="space-y-6 flex flex-col items-center justify-center py-12">
                                        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                        <p className="text-sm font-black text-slate-400">여행 데이터를 분석하는 중...</p>
                                    </div>
                                ) : stats ? (
                                    <>
                                        {/* 기본 요약 카드 */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-primary/5 dark:bg-primary/10 rounded-3xl border border-primary/10">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Plane className="w-4 h-4 text-primary" />
                                                    <span className="text-[10px] font-black text-primary uppercase">총 여행</span>
                                                </div>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalTrips}</span>
                                                    <span className="text-[10px] font-bold text-slate-400">회</span>
                                                </div>
                                            </div>
                                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <MapPin className="w-4 h-4 text-slate-400" />
                                                    <span className="text-[10px] font-black text-slate-400 uppercase">방문 지역</span>
                                                </div>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.visitedRegions.length}</span>
                                                    <span className="text-[10px] font-bold text-slate-400">곳</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 상세 카테고리 통계 */}
                                        <section className="space-y-4">
                                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase flex items-center gap-2 ml-1">
                                                <ClipboardCheck className="w-4 h-4 text-primary" />
                                                여행 카테고리 분석
                                            </h3>
                                            <div className="space-y-3">
                                                <StatBar 
                                                    icon={<Utensils className="w-3.5 h-3.5" />} 
                                                    label="식사 및 맛집 탐방" 
                                                    value={stats.categoryStats.dining} 
                                                    color="bg-orange-500"
                                                    total={stats.categoryStats.dining + stats.categoryStats.shopping + stats.categoryStats.sights + stats.categoryStats.transport + stats.categoryStats.others}
                                                />
                                                <StatBar 
                                                    icon={<ShoppingBag className="w-3.5 h-3.5" />} 
                                                    label="쇼핑 및 마켓" 
                                                    value={stats.categoryStats.shopping} 
                                                    color="bg-primary"
                                                    total={stats.categoryStats.dining + stats.categoryStats.shopping + stats.categoryStats.sights + stats.categoryStats.transport + stats.categoryStats.others}
                                                />
                                                <StatBar 
                                                    icon={<Landmark className="w-3.5 h-3.5" />} 
                                                    label="관광지 및 문화 시설" 
                                                    value={stats.categoryStats.sights} 
                                                    color="bg-emerald-500"
                                                    total={stats.categoryStats.dining + stats.categoryStats.shopping + stats.categoryStats.sights + stats.categoryStats.transport + stats.categoryStats.others}
                                                />
                                                <StatBar 
                                                    icon={<Plane className="w-3.5 h-3.5" />} 
                                                    label="교통 및 이동수단" 
                                                    value={stats.categoryStats.transport} 
                                                    color="bg-blue-500"
                                                    total={stats.categoryStats.dining + stats.categoryStats.shopping + stats.categoryStats.sights + stats.categoryStats.transport + stats.categoryStats.others}
                                                />
                                            </div>
                                        </section>

                                        {/* 숙박 관련 */}
                                        <section className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Bed className="w-5 h-5 text-primary" />
                                                <h3 className="text-sm font-black text-slate-900 dark:text-white">숙박 패턴</h3>
                                            </div>
                                            <div className="flex justify-around items-center">
                                                <div className="text-center">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">총 숙소 수</p>
                                                    <p className="text-xl font-black text-slate-900 dark:text-white">{stats.stayStats.accommodationCount}</p>
                                                </div>
                                                <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
                                                <div className="text-center">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">선호 유형</p>
                                                    <p className="text-sm font-black text-slate-900 dark:text-white truncate max-w-[100px]">
                                                        {Object.entries(stats.stayStats.types).sort((a,b) => b[1]-a[1])[0]?.[0] || '정보 없음'}
                                                    </p>
                                                </div>
                                            </div>
                                        </section>

                                        {/* 방문 국가 Top 3 */}
                                        <section className="space-y-4">
                                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase flex items-center gap-2 ml-1">
                                                <Globe className="w-4 h-4 text-primary" />
                                                자주 찾는 국가
                                            </h3>
                                            <div className="flex flex-wrap gap-2">
                                                {stats.topCountries.slice(0, 5).map((country, idx) => (
                                                    <div key={idx} className="px-4 py-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 shadow-sm">
                                                        <span className="text-[10px] font-black text-primary">{idx + 1}</span>
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{country.name}</span>
                                                        <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-lg text-slate-400">{country.count}회</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    </>
                                ) : (
                                    <div className="py-20 text-center flex flex-col items-center gap-4">
                                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center">
                                            <BarChart3 className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-black text-slate-600 dark:text-slate-300">표시할 데이터가 없습니다.</p>
                                            <p className="text-xs font-bold text-slate-400">첫 번째 여행을 계획해 보세요!</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {activeTab === 'settings' && (
                        <div className="p-8 pt-0 shrink-0">
                            <button 
                                onClick={handleSave}
                                disabled={isLoading || !profile.residenceCountry || !profile.displayName}
                                className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/30 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100"
                            >
                                {isLoading ? '저장 중...' : '설정 저장하기'}
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

// 헬퍼 컴포넌트: 통계 바
function StatBar({ icon, label, value, color, total }: { icon: React.ReactNode, label: string, value: number, color: string, total: number }) {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-bold">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    {icon}
                    {label}
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-slate-900 dark:text-white font-black">{value}</span>
                    <span className="text-slate-400">건</span>
                </div>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full ${color} rounded-full`}
                />
            </div>
        </div>
    );
}

