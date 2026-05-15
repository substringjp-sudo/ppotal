'use client';

import { TripMeta } from '@pplaner/shared';
import { motion } from 'framer-motion';
import { Check, X, Eye, EyeOff, Calendar, MapPin, Search } from 'lucide-react';
import { useState, useMemo } from 'react';

interface TripFilterPanelProps {
  tripMeta: TripMeta[];
  visibleTripIds: Set<string>;
  hoveredTripId: string | null;
  onToggleTrip: (id: string) => void;
  onToggleAll: () => void;
  onHoverTrip: (id: string | null) => void;
  onClose: () => void;
}

export default function TripFilterPanel({
  tripMeta,
  visibleTripIds,
  hoveredTripId,
  onToggleTrip,
  onToggleAll,
  onHoverTrip,
  onClose,
}: TripFilterPanelProps) {
  const [search, setSearch] = useState('');

  const filteredTrips = useMemo(() => {
    return tripMeta
      .filter(trip => trip.title.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.startDate.localeCompare(a.startDate)); // 최신순
  }, [tripMeta, search]);

  const allVisible = visibleTripIds.size === tripMeta.length;

  return (
    <motion.aside
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      className="absolute top-20 left-4 bottom-24 w-80 z-20 flex flex-col pointer-events-auto"
    >
      <div className="flex-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col overflow-hidden shadow-2xl">
        {/* 헤더 */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-900 dark:text-white font-black text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              나의 여행 목록
            </h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="여행 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-primary/50 transition-all"
            />
          </div>

          <button
            onClick={onToggleAll}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-[11px] font-black text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-all"
          >
            {allVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {allVisible ? '모두 숨기기' : '모두 보이기'}
          </button>
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto px-2 py-3 custom-scrollbar">
          <div className="space-y-1">
            {filteredTrips.map((trip) => {
              const isVisible = visibleTripIds.has(trip.id);
              const isHovered = hoveredTripId === trip.id;

              return (
                <div
                  key={trip.id}
                  onMouseEnter={() => onHoverTrip(trip.id)}
                  onMouseLeave={() => onHoverTrip(null)}
                  className={`relative group p-3 rounded-2xl transition-all cursor-pointer ${
                    isHovered ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                  onClick={() => onToggleTrip(trip.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                          isVisible
                            ? 'bg-current border-transparent'
                            : 'bg-transparent border-slate-200 dark:border-slate-700'
                        }`}
                        style={{ color: isVisible ? trip.color : 'inherit' }}
                      >
                        {isVisible && <Check className="w-3 h-3 text-white dark:text-slate-900" strokeWidth={4} />}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className={`text-xs font-black truncate transition-colors ${
                        isVisible ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-600'
                      }`}>
                        {trip.title}
                      </h4>
                      <p className={`text-[10px] font-bold transition-colors ${
                        isVisible ? 'text-slate-500 dark:text-slate-400' : 'text-slate-300 dark:text-slate-700'
                      }`}>
                        {trip.startDate} ~ {trip.endDate}
                      </p>
                      
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                          isVisible ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-300 dark:text-slate-700'
                        }`}>
                          {trip.nodeCount} Spots
                        </span>
                        {trip.isOverseas && (
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400`}>
                            Overseas
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* 사이드 인디케이터 (활성 시) */}
                  {isHovered && (
                    <motion.div
                      layoutId="active-indicator"
                      className="absolute left-0 top-2 bottom-2 w-1 rounded-full"
                      style={{ backgroundColor: trip.color }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* 하단 정보 */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold text-center">
            총 {tripMeta.length}개의 여행 중 {visibleTripIds.size}개 표시 중
          </p>
        </div>
      </div>
    </motion.aside>
  );
}
