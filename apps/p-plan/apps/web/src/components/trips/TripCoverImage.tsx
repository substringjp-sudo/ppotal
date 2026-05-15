'use client';

import { useMemo } from 'react';
import { Trip, TripSummary } from '@pplaner/shared';
import { getTripTheme } from '@pplaner/shared';
import { cn, formatTripDuration } from '@pplaner/shared';
import { format, parseISO } from 'date-fns';

interface TripCoverImageProps {
  trip: Trip | TripSummary;
  className?: string;
  showTitle?: boolean;
}

export default function TripCoverImage({ trip, className = '', showTitle = true }: TripCoverImageProps) {
  const theme = useMemo(() => getTripTheme(trip.locations?.regions || []), [trip.locations?.regions]);

  // 썸네일 이미지 결정: 직접 설정된 이미지 > 테마 기반 기본 이미지
  const effectiveThumbnailUrl = trip.locations?.thumbnailUrl || theme.moodImageUrl;
  const hasImage = !!effectiveThumbnailUrl;

  const displayDate = useMemo(() => {
    if (!trip.dates?.startDate) {
      return formatTripDuration(undefined, undefined, trip.dates?.durationDays);
    }
    
    try {
      const start = parseISO(trip.dates.startDate);
      const end = trip.dates.endDate ? parseISO(trip.dates.endDate) : null;
      
      if (end && trip.dates.startDate !== trip.dates.endDate) {
        // 연도가 같으면 종료일의 연도는 생략
        const isSameYear = format(start, 'yyyy') === format(end, 'yyyy');
        if (isSameYear) {
          return `${format(start, 'yy.MM.dd')} ~ ${format(end, 'MM.dd')}`;
        }
        return `${format(start, 'yy.MM.dd')} ~ ${format(end, 'yy.MM.dd')}`;
      }
      return format(start, 'yy.MM.dd');
    } catch (e) {
      return trip.dates.startDate;
    }
  }, [trip.dates]);

  return (
    <div className={cn("relative overflow-hidden group", className)}>
      {/* Background Layer */}
      <div 
        className={cn(
          "absolute inset-0 bg-cover bg-center transition-all duration-700 ease-out group-hover:scale-110",
          !hasImage && `bg-gradient-to-br ${theme.gradient}`
        )}
        style={{ 
          backgroundImage: hasImage ? `url(${effectiveThumbnailUrl})` : undefined,
          backgroundColor: !hasImage ? theme.background : 'transparent'
        }}
      />
      
      {/* Texture Overlay for non-image backgrounds */}
      {!hasImage && (
        <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
      )}

      {/* Main Content Layer */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        {/* Fallback Icon if no thumbnail */}
        {!hasImage && (
           <div className="flex flex-col items-center opacity-30">
             <span className="material-symbols-rounded text-5xl text-white">explore</span>
           </div>
        )}
      </div>

      {/* Title & Dates Overlay - Premium Glassmorphism */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
      
      {showTitle && (
        <div className="absolute bottom-0 left-0 right-0 z-10 p-5 pt-8 bg-gradient-to-t from-black/60 to-transparent backdrop-blur-[2px]">
          <h3 className="text-xl font-black text-white truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] mb-1">{trip.title}</h3>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] text-white font-black drop-shadow-sm flex items-center gap-1.5 bg-black/40 w-fit px-2.5 py-1.5 rounded-xl backdrop-blur-md border border-white/5 whitespace-nowrap overflow-hidden shadow-lg">
              <span className="material-symbols-rounded text-[11px] text-primary">calendar_month</span>
              {displayDate}
            </p>
            {trip.locations?.regions?.[0] && (
              <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">{trip.locations.regions[0].name}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
