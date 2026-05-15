'use client';

import React from 'react';
import { cn } from '@pplaner/shared';

interface ObjectLibraryProps {
  onSelect: (type: string) => void;
  className?: string;
  excludedTypes?: string[];
}

const OBJECT_TYPES = [
  { id: 'blockTitle', icon: 'title', label: '제목', desc: '강조용 헤더' },
  { id: 'blockBody', icon: 'subject', label: '본문', desc: '자유로운 글쓰기' },
  { id: 'scheduleItem', icon: 'event', label: '일정/활동', desc: '여행 스케줄' },
  { id: 'timeMarker', icon: 'schedule', label: '시간', desc: '시점 기록' },
  { id: 'daySeparator', icon: 'calendar_today', label: '날짜', desc: '일차 구분' },
  { id: 'photoGallery', icon: 'photo_library', label: '갤러리', desc: '추억 사진' },
  { id: 'emotionDiagram', icon: 'mood', label: '감정', desc: '심리 상태' },
  { id: 'weatherObject', icon: 'cloud', label: '날씨', desc: '현지 기상' },
  { id: 'premiumDivider', icon: 'horizontal_rule', label: '구분선', desc: '디자인 여백' },
];

export function ObjectLibrary({ onSelect, className, excludedTypes = [] }: ObjectLibraryProps) {
  const filteredTypes = OBJECT_TYPES.filter(obj => !excludedTypes.includes(obj.id));

  return (
    <div className={cn(
      "bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200 dark:border-slate-800 rounded-[32px] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.3)] w-[360px] animate-in fade-in zoom-in-95 duration-200", 
      className
    )}>
      <div className="mb-4 px-1 flex items-center justify-between">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">객체 추가</h3>
        <span className="text-[9px] font-bold text-primary/50 uppercase">객체 라이브러리</span>
      </div>
      
      {/* 3-Column Compact Grid */}
      <div className="max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
        <div className="grid grid-cols-3 gap-2 pb-2">
          {filteredTypes.map((obj) => (
            <button
              key={obj.id}
              onClick={() => onSelect(obj.id)}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all group text-center aspect-square"
            >
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 group-hover:text-primary transition-all">
                <span className="material-symbols-rounded text-xl leading-none">{obj.icon}</span>
              </div>
              <div className="font-bold text-[10px] text-slate-900 dark:text-white leading-tight">{obj.label}</div>
            </button>
          ))}
        </div>
      </div>
      
      <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-center gap-1.5">
          <span className="material-symbols-rounded text-[10px] text-slate-400">info</span>
          <p className="text-[9px] font-bold text-slate-400 tracking-tight italic">언제든지 드래그하여 객체 순서를 바꿀 수 있습니다.</p>
      </div>
    </div>
  );
}
