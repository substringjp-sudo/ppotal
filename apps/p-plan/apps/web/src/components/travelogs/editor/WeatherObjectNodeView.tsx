'use client';

import React, { useEffect } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { BlockWrapper } from './BlockWrapper';
import { cn } from '@pplaner/shared';

export const WeatherObjectNodeView = (props: NodeViewProps) => {
  const { node, updateAttributes, selected, editor, getPos, deleteNode } = props;
  const { date, location, weather, temp, isAuto } = node.attrs;

  // 날씨 상태별 설정
  const config: Record<string, { icon: string, label: string, color: string }> = {
    sunny: { icon: 'sunny', label: '맑음', color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30' },
    rainy: { icon: 'rainy', label: '비', color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30' },
    cloudy: { icon: 'cloud', label: '흐림', color: 'text-slate-500 bg-slate-50 dark:bg-slate-800' },
    snowy: { icon: 'ac_unit', label: '눈', color: 'text-blue-300 bg-blue-50 dark:bg-blue-950/30' },
  };

  const current = config[weather] || config.sunny;

  return (
    <NodeViewWrapper className="weather-object-node">
      <BlockWrapper 
        attributes={node.attrs} 
        isFocused={selected} 
        editor={editor}
        getPos={getPos}
        node={node}
        updateAttributes={updateAttributes}
        deleteNode={deleteNode}
        className="max-w-xs mx-auto"
      >
        <div className="flex flex-col items-center gap-4 text-center">
            <div className={cn("w-16 h-16 rounded-[24px] flex items-center justify-center transition-all", current.color)}>
                <span className="material-symbols-rounded text-4xl">{current.icon}</span>
            </div>
            
            <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Weather Record</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{temp}°C</h3>
                <p className="text-sm font-bold text-slate-500">{current.label}</p>
            </div>

            <div className="w-full h-[1px] bg-slate-50 dark:bg-slate-800 my-2" />

            <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5">
                    <span className="material-symbols-rounded text-xs text-primary">location_on</span>
                    <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">{location || '장소 정보 없음'}</span>
                </div>
                <p className="text-[10px] font-bold text-slate-400">{date || '날짜 정보 없음'}</p>
            </div>

            {isAuto && (
                <div className="mt-4 px-3 py-1 bg-primary/5 rounded-full">
                    <p className="text-[8px] font-black text-primary uppercase tracking-tighter">Connected with context</p>
                </div>
            )}
        </div>
      </BlockWrapper>
    </NodeViewWrapper>
  );
};
