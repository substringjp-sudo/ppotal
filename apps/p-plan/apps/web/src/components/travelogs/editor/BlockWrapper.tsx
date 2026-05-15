'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@pplaner/shared';
import { ObjectLibrary } from './ObjectLibrary';
import { format } from 'date-fns';

interface BlockWrapperProps {
  attributes: any;
  children: React.ReactNode;
  className?: string;
  isFocused?: boolean;
  isReadOnly?: boolean;
  editor?: any;
  getPos?: () => number | any;
  node?: any;
  updateAttributes?: (attrs: any) => void;
  deleteNode?: () => void;
  onSettingsClick?: () => void;
}

export function BlockWrapper({ 
  attributes, 
  children, 
  className, 
  isFocused, 
  isReadOnly = false,
  editor,
  getPos,
  node,
  updateAttributes,
  deleteNode,
  onSettingsClick
}: BlockWrapperProps) {
  const [activePopover, setActivePopover] = useState<'none' | 'settings' | 'library'>('none');
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    borderStyle,
    borderWidth,
    borderColor,
    bgFill,
    bgOpacity,
    borderRadius,
    shadowType,
    padding,
    textAlign,
    fontFamily,
    fontSize,
    fontWeight,
    title,
  } = attributes;

  // 내용 비어있음 판단 로직
  const hasText = node.textContent.trim().length > 0;
  const hasTitle = typeof title === 'string' && title.trim().length > 0;
  const isEmpty = !hasText && !hasTitle;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActivePopover('none');
      }
    };
    
    // Shift+Enter 등 키보드 신호로 인한 라이브러리 열기 이벤트 수신
    const handleOpenLibrary = (event: any) => {
      const { pos } = event.detail;
      if (getPos && pos === getPos() + node.nodeSize) {
        setActivePopover('library');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('pplaner:open-library' as any, handleOpenLibrary);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('pplaner:open-library' as any, handleOpenLibrary);
    };
  }, [getPos, node]);

  const style: React.CSSProperties = {
    borderStyle: borderStyle || 'none',
    borderWidth: borderStyle !== 'none' ? `${borderWidth}px` : 0,
    borderColor: borderColor ? `var(--${borderColor}, ${borderColor})` : 'transparent',
    backgroundColor: bgFill === 'transparent' ? 'transparent' : `rgba(var(--${bgFill}-rgb, 255, 255, 255), ${bgOpacity / 100})`,
    borderRadius: `${borderRadius}px`,
    padding: `${padding}px`,
    textAlign: textAlign as any,
    fontFamily: fontFamily,
    fontSize: `px`, // fontSize 제거 (본문 내 폰트 상속)
    fontWeight: fontWeight,
    transition: 'all 0.2s ease-in-out',
  };

  const shadowClasses = {
    none: '',
    soft: 'shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)]',
    sharp: 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]',
    glow: 'shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]',
  }[shadowType as string] || '';

  const isGlass = bgFill === 'glass';

  const handleAddBelow = (type: string) => {
    if (editor && getPos && node) {
      const pos = getPos();
      let attrs: any = {};
      
      if (type === 'daySeparator') {
        let prevDay = 0;
        editor.state.doc.descendants((n: any, p: number) => {
          if (n.type.name === 'daySeparator' && p < pos) {
            prevDay = Math.max(prevDay, n.attrs.day);
          }
        });
        attrs = { day: prevDay + 1 };
      } else if (type === 'timeMarker') {
        attrs = { time: format(new Date(), 'HH:mm') };
      }

      const content = (type === 'scheduleItem' || type === 'callout') 
        ? { type, attrs: { ...attrs, isSetup: type === 'scheduleItem' }, content: [{ type: 'blockBody' }] }
        : { type, attrs };
        
      editor.chain()
        .insertContentAt(getPos() + node.nodeSize, content)
        .focus(getPos() + node.nodeSize + 1)
        .run();
      setActivePopover('none');
    }
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "block-object-wrapper relative group/obj mb-1",
        className
      )}
    >
      <div 
        style={style}
        className={cn(
          "relative overflow-hidden transition-all duration-300",
          shadowClasses,
          isGlass && "backdrop-blur-xl bg-white/30 dark:bg-slate-900/30 border-white/20 dark:border-slate-800/20",
          !isReadOnly && borderStyle === 'none' && "border border-transparent group-hover/obj:border-slate-200 dark:group-hover/obj:border-slate-800 group-hover/obj:shadow-sm",
          isFocused && "ring-2 ring-primary/5 border-primary/20 shadow-md"
        )}
      >
        {children}
      </div>

      {/* 2. Top-Right Secondary Toolbar (Settings & Delete only) */}
      {!isReadOnly && (
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/obj:opacity-100 transition-opacity z-40">
          <button 
            onClick={() => {
              if (onSettingsClick) {
                onSettingsClick();
              } else {
                setActivePopover(activePopover === 'settings' ? 'none' : 'settings');
              }
            }}
            className={cn("w-6 h-6 rounded-lg flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur shadow-sm border border-slate-200 dark:border-slate-800 hover:text-primary transition-all", activePopover === 'settings' && "text-primary ring-2 ring-primary/20")}
          >
            <span className="material-symbols-rounded text-[14px]">settings</span>
          </button>
          <button 
            onClick={() => deleteNode?.()}
            className="w-6 h-6 rounded-lg flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur shadow-sm border border-slate-200 dark:border-slate-800 hover:text-rose-500 transition-all font-bold"
          >
            <span className="material-symbols-rounded text-[14px]">close</span>
          </button>
        </div>
      )}

      {/* 1. Bottom-Centered Gap Hub (+) - 내용이 있을 때만 표시 */}
      {!isReadOnly && !isEmpty && (
        <div className="relative h-6 flex items-center justify-center -mb-3 z-30">
          <div className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover/obj:opacity-100 transition-opacity" />
          <button 
            onClick={() => setActivePopover(activePopover === 'library' ? 'none' : 'library')}
            className={cn(
              "absolute w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-slate-950 shadow-xl border border-primary/30 text-primary transition-all scale-50 opacity-0 group-hover/obj:scale-100 group-hover/obj:opacity-100 hover:scale-110",
              activePopover === 'library' && "scale-100 opacity-100 rotate-45"
            )}
          >
            <span className="material-symbols-rounded">add</span>
          </button>
        </div>
      )}

      {/* Popovers */}
      {!isReadOnly && activePopover === 'library' && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[100] origin-top">
          <ObjectLibrary 
            onSelect={handleAddBelow} 
            excludedTypes={(() => {
              if (!editor || !getPos || !node) return [];
              const pos = getPos() + node.nodeSize;
              let days: { day: number; pos: number }[] = [];
              editor.state.doc.descendants((n: any, p: number) => {
                if (n.type.name === 'daySeparator') days.push({ day: n.attrs.day, pos: p });
              });
              days.sort((a, b) => a.pos - b.pos);
              
              let prevDayNode = null;
              let nextDayNode = null;
              for (const d of days) {
                if (d.pos < pos) prevDayNode = d;
                else if (d.pos >= pos && !nextDayNode) nextDayNode = d;
              }
              
              let canAdd = false;
              if (days.length === 0) canAdd = true;
              else if (!prevDayNode) canAdd = !days.some(d => d.day === 1);
              else if (nextDayNode) canAdd = nextDayNode.day > prevDayNode.day + 1;
              else canAdd = true;
              
              return canAdd ? [] : ['daySeparator'];
            })()}
          />
        </div>
      )}

      {!isReadOnly && activePopover === 'settings' && updateAttributes && (
        <div className="absolute top-8 right-2 z-[100] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl w-[260px] animate-in fade-in zoom-in-95 duration-200">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Object Design</h4>
          <div className="space-y-4">
             {/* Border */}
             <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Border</span>
              <div className="flex bg-slate-50 dark:bg-slate-900 rounded-lg p-0.5">
                {['none', 'solid', 'dashed'].map(t => (
                  <button key={t} onClick={() => updateAttributes({ borderStyle: t })} className={cn("px-2 py-1 text-[8px] font-black uppercase rounded-md", borderStyle === t ? "bg-white dark:bg-slate-700 shadow-sm text-primary" : "text-slate-400")}>{t}</button>
                ))}
              </div>
            </div>
            {/* Fill */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Fill</span>
              <div className="flex gap-1">
                {['transparent', 'white', 'slate-100', 'primary', 'glass'].map(c => (
                  <button key={c} onClick={() => updateAttributes({ bgFill: c })} className={cn("w-4 h-4 rounded-full border border-slate-200", bgFill === c && "ring-2 ring-primary ring-offset-1")} style={{ backgroundColor: c === 'transparent' ? 'transparent' : c === 'white' ? '#fff' : c === 'glass' ? 'rgba(255,255,255,0.3)' : `var(--${c})` }} />
                ))}
              </div>
            </div>
            {/* Align */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Align</span>
              <div className="flex gap-1">
                {['left', 'center', 'right'].map(a => (
                  <button key={a} onClick={() => updateAttributes({ textAlign: a })} className={cn("p-1.5 rounded-lg", textAlign === a ? "bg-primary text-white" : "bg-slate-50 dark:bg-slate-900 text-slate-400")}><span className="material-symbols-rounded text-xs">{`format_align_${a}`}</span></button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
