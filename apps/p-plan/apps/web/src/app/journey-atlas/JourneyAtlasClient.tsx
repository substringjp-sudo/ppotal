'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import {
  subscribeToUserTrips,
  useTripStore,
  useTravelogStore,
  subscribeToUserTravelogs,
  buildJourneyAtlas,
  buildJourneyAtlasFromTravelogs,
  JourneyAtlasData,
  TripMeta,
  Trip,
  TripDocument,
} from '@pplaner/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Pause, Eye, EyeOff, MapPin, Plane, Layers } from 'lucide-react';
import dynamic from 'next/dynamic';

const AtlasMapView = dynamic(() => import('@/components/journey-atlas/AtlasMapView'), { ssr: false });
import TripFilterPanel from '@/components/journey-atlas/TripFilterPanel';
import TimelineSlider from '@/components/journey-atlas/TimelineSlider';

export default function JourneyAtlasClient() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const trips = useTripStore(state => state.trips);
  const travelogs = useTravelogStore(state => state.travelogs);
  const setTravelogs = useTravelogStore(state => state.setTravelogs);
  const [mounted, setMounted] = useState(false);

  // 여행 필터 상태
  const [visibleTripIds, setVisibleTripIds] = useState<Set<string>>(new Set());
  const [hoveredTripId, setHoveredTripId] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(true);

  // 타임라인 슬라이더 상태
  const [timelineValue, setTimelineValue] = useState(1); // 0~1, 1 = 전체 표시
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [user, loading, router]);

  // 트래블로그 구독
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToUserTravelogs(user.uid, (logs) => {
      setTravelogs(logs);
    });
    return () => unsub();
  }, [user, setTravelogs]);

  // Atlas 데이터 생성
  const atlasData = useMemo<JourneyAtlasData | null>(() => {
    if (!travelogs || travelogs.length === 0) return null;
    return buildJourneyAtlasFromTravelogs(travelogs);
  }, [travelogs]);

  // 초기화: 모든 여행을 visible로 설정
  useEffect(() => {
    if (atlasData) {
      setVisibleTripIds(new Set(atlasData.tripMeta.map(m => m.id)));
    }
  }, [atlasData]);

  // 타임라인 자동 재생
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setTimelineValue(prev => {
        if (prev >= 1) {
          setIsPlaying(false);
          return 1;
        }
        return Math.min(prev + 0.005, 1);
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // 필터링된 데이터
  const filteredData = useMemo(() => {
    if (!atlasData) return null;
    
    const filteredNodes = atlasData.nodes.filter(n => visibleTripIds.has(n.tripId));
    const filteredEdges = atlasData.edges.filter(e => visibleTripIds.has(e.tripId));

    // 타임라인 필터 적용
    if (timelineValue < 1 && atlasData.tripMeta.length > 0) {
      const allDates = filteredNodes
        .map(n => n.timestamp)
        .filter(Boolean)
        .sort();
      
      if (allDates.length > 0) {
        const earliest = new Date(allDates[0]).getTime();
        const latest = new Date(allDates[allDates.length - 1]).getTime();
        const cutoff = earliest + (latest - earliest) * timelineValue;
        const cutoffDate = new Date(cutoff).toISOString().split('T')[0];

        return {
          nodes: filteredNodes.filter(n => !n.timestamp || n.timestamp <= cutoffDate),
          edges: filteredEdges.filter(e => !e.timestamp || e.timestamp <= cutoffDate),
          tripMeta: atlasData.tripMeta,
        };
      }
    }

    return { nodes: filteredNodes, edges: filteredEdges, tripMeta: atlasData.tripMeta };
  }, [atlasData, visibleTripIds, timelineValue]);

  // 여행 토글
  const toggleTrip = useCallback((tripId: string) => {
    setVisibleTripIds(prev => {
      const next = new Set(prev);
      if (next.has(tripId)) next.delete(tripId);
      else next.add(tripId);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (!atlasData) return;
    setVisibleTripIds(prev => {
      if (prev.size === atlasData.tripMeta.length) return new Set();
      return new Set(atlasData.tripMeta.map(m => m.id));
    });
  }, [atlasData]);

  // 통계 요약
  const summary = useMemo(() => {
    if (!filteredData) return { nodes: 0, edges: 0, countries: 0, totalKm: 0 };
    const totalKm = filteredData.edges.reduce((sum, e) => sum + e.distanceKm, 0);
    return {
      nodes: filteredData.nodes.length,
      edges: filteredData.edges.length,
      countries: new Set(filteredData.nodes.map(n => n.tripId)).size,
      totalKm,
    };
  }, [filteredData]);

  if (loading || !user) {
    return (
      <div className="fixed inset-0 bg-[#020617] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 bg-background-light dark:bg-background-dark overflow-hidden">
      {/* 상단 헤더 */}
      <header className="absolute top-0 left-0 right-0 z-20 px-6 py-4 flex items-center justify-between pointer-events-none">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4 pointer-events-auto"
        >
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Journey Atlas</h1>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">나의 여행 결산 지도</p>
          </div>
        </motion.div>

        {/* 요약 배지 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-3 pointer-events-auto"
        >
          {[
            { icon: MapPin, label: '장소', value: summary.nodes, color: 'text-cyan-500' },
            { icon: Plane, label: '경로', value: summary.edges, color: 'text-purple-500' },
            { icon: Layers, label: '총 거리', value: `${Math.round(summary.totalKm).toLocaleString()}km`, color: 'text-pink-500' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div
              key={label}
              className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 flex items-center gap-2"
            >
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <span className="text-xs font-black text-slate-700 dark:text-slate-200">{value}</span>
            </div>
          ))}
        </motion.div>
      </header>

      {/* 지도 */}
      <AtlasMapView
        data={filteredData}
        hoveredTripId={hoveredTripId}
      />

      {/* 여행 필터 패널 */}
      <AnimatePresence>
        {showPanel && atlasData && (
          <TripFilterPanel
            tripMeta={atlasData.tripMeta}
            visibleTripIds={visibleTripIds}
            hoveredTripId={hoveredTripId}
            onToggleTrip={toggleTrip}
            onToggleAll={toggleAll}
            onHoverTrip={setHoveredTripId}
            onClose={() => setShowPanel(false)}
          />
        )}
      </AnimatePresence>

      {/* 패널 토글 버튼 */}
      {!showPanel && (
        <button
          onClick={() => setShowPanel(true)}
          className="absolute top-20 left-4 z-20 w-10 h-10 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all"
        >
          <Eye className="w-4 h-4" />
        </button>
      )}

      {/* 하단 타임라인 슬라이더 */}
      {atlasData && (
        <TimelineSlider
          value={timelineValue}
          onChange={setTimelineValue}
          isPlaying={isPlaying}
          onTogglePlay={() => {
            if (timelineValue >= 1) setTimelineValue(0);
            setIsPlaying(p => !p);
          }}
          tripMeta={atlasData.tripMeta}
        />
      )}

      {/* 데이터 없음 */}
      {!atlasData && !loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center px-10 py-16 rounded-[40px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl border border-slate-200 dark:border-slate-800 max-w-md shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] dark:shadow-none"
          >
            <div className="w-20 h-20 rounded-[28px] bg-primary/10 flex items-center justify-center mx-auto mb-8">
              <MapPin className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
              아직 지도에 표시할<br />여행 기록이 없습니다
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mb-10 leading-relaxed">
              여행을 마친 후 기록(Travelog)을 작성하면<br />
              이곳에서 당신만의 여행 지도를 볼 수 있어요.
            </p>
            <button
              onClick={() => router.push('/trips')}
              className="w-full px-8 py-4 bg-primary text-white rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
            >
              여행 기록하러 가기
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
