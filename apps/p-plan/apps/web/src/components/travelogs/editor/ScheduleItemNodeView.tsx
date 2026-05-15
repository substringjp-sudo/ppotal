import React, { useState, useEffect, useRef, useContext } from 'react';
import { NodeViewWrapper, NodeViewContent, NodeViewProps } from '@tiptap/react';
import { motion, AnimatePresence } from 'framer-motion';
import { TRAVELOG_ACTIVITY_CATEGORIES, TRAVELOG_EVENT_CATEGORIES, cn, TravelogEvent } from '@pplaner/shared';
import { EditorDataContext } from './WritingModeEditor';
import { EmotionTriangle } from './EmotionTriangle';
import { BlockWrapper } from './BlockWrapper';

export const ScheduleItemNodeView = ({ node, updateAttributes, deleteNode, editor, selected, getPos }: NodeViewProps) => {
    const { 
        type, 
        title, 
        startTime, 
        endTime, 
        time, 
        location, 
        mainCategory, 
        subCategory, 
        isSetup, 
        setupStep,
        id,
        emotion
    } = node.attrs;

    const { travelog } = useContext(EditorDataContext) || {};
    const [currentStep, setCurrentStep] = useState<number>(setupStep || 0);
    const [showPhotoPicker, setShowPhotoPicker] = useState(false);
    const [showEmotionPicker, setShowEmotionPicker] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // ... (logic remains same)
    const findEventData = (): TravelogEvent | undefined => {
        if (!travelog) return undefined;
        for (const day of travelog.timeline) {
            const found = day.events.find(e => e.id === id);
            if (found) return found;
            for (const parent of day.events) {
                const subFound = parent.subEvents?.find(se => se.id === id);
                if (subFound) return subFound;
            }
        }
        return undefined;
    };

    const eventData = findEventData();
    const availablePhotos = eventData?.imageUrls || [];

    const getEmotionLabel = (w: { joy: number, sadness: number, anger: number }) => {
        const { joy, sadness, anger } = w;
        if (joy > 0.7) return "날아갈듯 즐거움";
        if (sadness > 0.7) return "깊은 슬픔";
        if (anger > 0.7) return "폭발할듯 화남";
        if (joy > 0.25 && sadness > 0.25 && anger > 0.25) return "평범한 기분";
        if (joy > 0.4 && sadness > 0.4) return "벅차오름";
        if (sadness > 0.4 && anger > 0.4) return "절망스러움";
        if (joy > 0.4 && anger > 0.4) return "짜증남";
        return "묘한 기분";
    };

    const steps = ['type', 'name', 'time', 'category', 'location'];

    useEffect(() => {
        if (isSetup && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isSetup, currentStep]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (currentStep < steps.length - 1) {
                setCurrentStep((prev: number) => prev + 1);
            } else {
                updateAttributes({ isSetup: false });
            }
        } else if (e.key === 'Escape') {
            deleteNode();
        }
    };

    if (isSetup) {
        const step = steps[currentStep];
        return (
            <NodeViewWrapper>
                <div className="p-8 bg-slate-50 dark:bg-slate-900 rounded-[40px] border-2 border-primary/20 shadow-2xl animate-in fade-in zoom-in-95 duration-500 max-w-lg mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-black">
                                {currentStep + 1}
                            </div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Step {currentStep + 1} of {steps.length}</h4>
                        </div>
                        <div className="flex gap-1">
                            {steps.map((_, i) => (
                                <div key={i} className={cn("w-8 h-1 rounded-full transition-all", i <= currentStep ? "bg-primary" : "bg-slate-200")} />
                            ))}
                        </div>
                    </div>

                    <div className="min-h-[140px] flex flex-col justify-center">
                        <AnimatePresence mode="wait">
                            <motion.div 
                                key={step}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                {step === 'type' && (
                                    <div className="space-y-4">
                                        <p className="text-lg font-black text-slate-800 dark:text-white tracking-tight text-center">어떤 기록을 남기고 싶으신가요?</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button 
                                                onClick={() => { updateAttributes({ type: 'event' }); setCurrentStep(1); }}
                                                className={cn(
                                                    "p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 group",
                                                    type === 'event' ? "border-primary bg-primary/5 shadow-inner" : "border-slate-200 hover:border-primary/30"
                                                )}
                                            >
                                                <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                                                    <span className="material-symbols-rounded text-2xl">event</span>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm font-black text-slate-900">단기 이벤트</p>
                                                    <p className="text-[10px] font-bold text-slate-400 mt-1 whitespace-nowrap">식사, 입장 등 한 시점의 기록</p>
                                                </div>
                                            </button>
                                            <button 
                                                onClick={() => { updateAttributes({ type: 'activity' }); setCurrentStep(1); }}
                                                className={cn(
                                                    "p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 group",
                                                    type === 'activity' ? "border-primary bg-primary/5 shadow-inner" : "border-slate-200 hover:border-primary/30"
                                                )}
                                            >
                                                <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                                                    <span className="material-symbols-rounded text-2xl">history_toggle_off</span>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm font-black text-slate-900">장기 활동</p>
                                                    <p className="text-[10px] font-bold text-slate-400 mt-1 whitespace-nowrap">이동, 투어 등 지속되는 기록</p>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                )}
                                
                                {step === 'name' && (
                                    <div className="space-y-3">
                                        <p className="text-lg font-black text-slate-800 dark:text-white tracking-tight">기록의 이름을 알려주세요</p>
                                        <input 
                                            ref={inputRef}
                                            type="text"
                                            value={title}
                                            onChange={(e) => updateAttributes({ title: e.target.value })}
                                            onKeyDown={handleKeyDown}
                                            className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xl font-black focus:border-primary focus:ring-0 transition-all shadow-sm"
                                            placeholder="예: 지브리 미술관 관람"
                                        />
                                    </div>
                                )}

                                {step === 'time' && (
                                    <div className="space-y-4">
                                        <p className="text-lg font-black text-slate-800 dark:text-white tracking-tight">언제 진행된 일인가요?</p>
                                        <div className="flex gap-4 p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm items-center justify-center">
                                            {type === 'activity' ? (
                                                <>
                                                    <div className="flex flex-col gap-2 flex-1">
                                                        <span className="text-[10px] font-black uppercase text-slate-400">Start</span>
                                                        <input ref={inputRef} type="time" value={startTime} onChange={(e) => updateAttributes({ startTime: e.target.value })} onKeyDown={handleKeyDown} className="bg-slate-50 dark:bg-slate-900 border-none rounded-xl font-black text-xl" />
                                                    </div>
                                                    <span className="text-slate-200 text-2xl font-light mt-4">→</span>
                                                    <div className="flex flex-col gap-2 flex-1">
                                                        <span className="text-[10px] font-black uppercase text-slate-400">End</span>
                                                        <input type="time" value={endTime} onChange={(e) => updateAttributes({ endTime: e.target.value })} onKeyDown={handleKeyDown} className="bg-slate-50 dark:bg-slate-900 border-none rounded-xl font-black text-xl" />
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex flex-col gap-2 w-full max-w-[200px]">
                                                    <span className="text-[10px] font-black uppercase text-slate-400 text-center">Time</span>
                                                    <input ref={inputRef} type="time" value={time} onChange={(e) => updateAttributes({ time: e.target.value })} onKeyDown={handleKeyDown} className="bg-slate-50 dark:bg-slate-900 border-none rounded-xl font-black text-2xl text-center" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {step === 'category' && (
                                    <div className="space-y-4">
                                        <p className="text-lg font-black text-slate-800 dark:text-white tracking-tight">카테고리를 선택하세요</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {Object.keys(type === 'activity' ? TRAVELOG_ACTIVITY_CATEGORIES : TRAVELOG_EVENT_CATEGORIES).map(cat => (
                                                <button 
                                                    key={cat} 
                                                    onClick={() => { updateAttributes({ mainCategory: cat }); setCurrentStep((prev: number) => prev + 1); }}
                                                    className={cn(
                                                        "px-3 py-4 rounded-2xl text-[10px] font-black uppercase transition-all border-2",
                                                        mainCategory === cat ? "bg-primary text-white border-primary shadow-lg scale-105" : "bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-800 text-slate-400 hover:border-primary/20"
                                                    )}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {step === 'location' && (
                                    <div className="space-y-3">
                                        <p className="text-lg font-black text-slate-800 dark:text-white tracking-tight">어디에서 있었던 일인가요?</p>
                                        <input 
                                            ref={inputRef}
                                            type="text"
                                            value={typeof location === 'string' ? location : (location?.name || '')}
                                            onChange={(e) => updateAttributes({ location: e.target.value })}
                                            onKeyDown={handleKeyDown}
                                            className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xl font-black focus:border-primary focus:ring-0 shadow-sm"
                                            placeholder="예: 도쿄 미타카시"
                                        />
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <div className="mt-12 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-6">
                        <button onClick={() => deleteNode?.()} className="text-[10px] font-black uppercase text-slate-400 hover:text-rose-500 transition-colors">Cancel</button>
                        <div className="flex gap-2">
                            {currentStep > 0 && <button onClick={() => setCurrentStep((prev: number) => prev - 1)} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-500">Back</button>}
                            <button 
                                onClick={() => currentStep < steps.length - 1 ? setCurrentStep((prev: number) => prev + 1) : updateAttributes({ isSetup: false })}
                                className="px-6 py-2 rounded-xl text-[10px] font-black uppercase bg-primary text-white shadow-lg hover:scale-105 transition-all"
                            >
                                {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                            </button>
                        </div>
                    </div>
                </div>
            </NodeViewWrapper>
        );
    }

    return (
        <NodeViewWrapper className="schedule-item-node-wrapper group/schedule">
            {/* 일정 프레임 내부에서 중첩 삽입 및 개별 설정 방지를 위한 스타일 */}
            <style dangerouslySetInnerHTML={{ __html: `
                /* 프레임 내부의 하위 블록들(본문 등)의 삽입 허브와 툴바를 숨깁니다 */
                .schedule-item-node-wrapper .block-object-wrapper .block-object-wrapper .relative.h-6,
                .schedule-item-node-wrapper .block-object-wrapper .block-object-wrapper div[class*="absolute"][class*="top-2"][class*="right-2"] { 
                    display: none !important; 
                }
            `}} />

            <BlockWrapper 
                attributes={node.attrs} 
                isFocused={selected}
                editor={editor}
                getPos={getPos}
                node={node}
                updateAttributes={updateAttributes}
                deleteNode={deleteNode}
                onSettingsClick={() => {
                    const event = new CustomEvent('pplaner:edit-event', { detail: { attrs: node.attrs, getPos } });
                    window.dispatchEvent(event);
                }}
                className={cn(
                    "transition-all duration-300",
                    type === 'activity' ? "border-l-4 border-l-primary/40 bg-primary/[0.02]" : "border-l-4 border-l-slate-200 bg-slate-50/30"
                )}
            >
                <div className="flex flex-col gap-4">
                    {/* Header: Title & Emotion */}
                    <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 dark:border-slate-800">
                        <div className="flex items-center gap-4 flex-1">
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm",
                                type === 'activity' ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                            )}>
                                <span className="material-symbols-rounded text-2xl">
                                    {type === 'activity' ? 'history_toggle_off' : 'event'}
                                </span>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3">
                                    <h4 className="text-lg font-black text-slate-900 dark:text-white truncate tracking-tight">
                                        {title || '제목 없음'}
                                    </h4>
                                    
                                    {/* Emotion UI - Moved next to title */}
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setShowEmotionPicker(!showEmotionPicker)} 
                                            className={cn(
                                                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all hover:scale-105 active:scale-95",
                                                emotion.joy > 0.5 ? "bg-amber-100 text-amber-600 border border-amber-200" : 
                                                emotion.sadness > 0.5 ? "bg-blue-100 text-blue-600 border border-blue-200" : 
                                                emotion.anger > 0.5 ? "bg-rose-100 text-rose-600 border border-rose-200" : 
                                                "bg-slate-100 text-slate-500 border border-slate-200"
                                            )}
                                        >
                                            <span className="material-symbols-rounded text-xs">{showEmotionPicker ? 'close' : 'mood'}</span>
                                            {getEmotionLabel(emotion)}
                                        </button>
                                        
                                        {type === 'activity' && (
                                            <button 
                                                onClick={() => setShowPhotoPicker(!showPhotoPicker)}
                                                className={cn(
                                                    "w-7 h-7 rounded-full flex items-center justify-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-primary transition-all",
                                                    showPhotoPicker && "bg-primary text-white border-primary"
                                                )}
                                            >
                                                <span className="material-symbols-rounded text-sm">photo_library</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3 mt-1 text-slate-400 font-bold">
                                    <div className="flex items-center gap-1.5 text-primary text-[11px] font-black uppercase">
                                        <span className="material-symbols-rounded text-sm">schedule</span>
                                        {type === 'activity' ? `${startTime} - ${endTime}` : time}
                                    </div>
                                    <span className="w-1 h-1 rounded-full bg-slate-200" />
                                    <div className="flex items-center gap-1.5 text-[11px]">
                                        <span className="material-symbols-rounded text-sm">location_on</span>
                                        {typeof location === 'string' ? (location || '장소 정보 없음') : (location?.name || '장소 정보 없음')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Expandable Sections (Emotion/Photo) */}
                    <AnimatePresence>
                        {showEmotionPicker && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
                                <EmotionTriangle value={emotion} onChange={(val) => updateAttributes({ emotion: val })} className="mx-auto" />
                            </motion.div>
                        )}
                        {showPhotoPicker && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
                                <div className="grid grid-cols-4 gap-2">
                                    {availablePhotos.length > 0 ? (
                                        availablePhotos.map((url, i) => (
                                            <button key={i} onClick={() => { (editor.chain().focus() as any).setImage({ src: url }).run(); setShowPhotoPicker(false); }} className="aspect-square rounded-lg overflow-hidden border border-slate-200 hover:border-primary transition-all shadow-sm">
                                                <img src={url} className="w-full h-full object-cover" />
                                            </button>
                                        ))
                                    ) : (
                                        <div className="col-span-4 py-8 text-center text-[10px] font-bold text-slate-400">
                                            연결된 사진이 없습니다. 타임라인에서 먼저 사진을 추가해 주세요.
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Body Content */}
                    <div className="pt-2">
                        <NodeViewContent className="min-h-[60px] outline-none text-slate-600 dark:text-slate-300 leading-relaxed font-medium" />
                    </div>
                </div>
            </BlockWrapper>
        </NodeViewWrapper>
    );
};
