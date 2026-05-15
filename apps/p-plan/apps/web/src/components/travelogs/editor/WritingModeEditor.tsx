'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Gapcursor from '@tiptap/extension-gapcursor';
import { StrictDocument, ObjectWorkflow } from './ObjectOrientedStrictness';
import { 
    Callout, PremiumDivider, ScheduleItem, TimeMarker, DaySeparator,
    BlockBody, BlockTitle, EmotionDiagram, PhotoGallery, WeatherObject
} from './CustomExtensions';
import { Travelog, TravelogSection, cn, TravelogDailyPlan, TravelogEvent } from '@pplaner/shared';
import { useEffect, useState, useImperativeHandle, forwardRef, ForwardRefRenderFunction, useCallback, createContext } from 'react';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ObjectLibrary } from './ObjectLibrary';

// 에디터 내 노드들이 트래블로그 데이터를 공유하기 위한 컨텍스트
export const EditorDataContext = createContext<{ travelog: Travelog } | null>(null);

export interface WritingModeEditorProps {
    travelog: Travelog;
    onUpdateSections: (sections: TravelogSection[]) => void;
    onUpdateTimeline?: (timeline: TravelogDailyPlan[]) => void;
    onUpdateUsedIds?: (ids: string[]) => void;
    onAddDay: () => void;
}

export interface WritingModeEditorRef {
    insertPhoto: (url: string) => void;
    insertPreset: (type: string) => void;
    insertTimestamp: () => void;
    insertDaySeparator: (day: number, date: string) => void;
    insertHeading: () => void;
    insertCallout: () => void;
    updateNodeAttributes: (pos: number, attrs: any) => void;
    updateNodeById: (id: string, attrs: any) => void;
    scrollToDay: (day: number) => void;
    getInsertionStatus: () => { canAdd: boolean; dayToInsert: number | null; allDays: number[] };
}

const WritingModeEditorRender: ForwardRefRenderFunction<WritingModeEditorRef, WritingModeEditorProps> = (props, ref) => {
    const { travelog, onUpdateSections, onUpdateTimeline, onAddDay } = props;
    const [isTopLibraryOpen, setIsTopLibraryOpen] = useState(false);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StrictDocument,
            StarterKit.configure({
                document: false,
                paragraph: false,
                bulletList: false,
                orderedList: false,
                listItem: false,
            }),
            Gapcursor,
            ObjectWorkflow,
            BlockBody,
            BlockTitle,
            EmotionDiagram,
            PhotoGallery,
            WeatherObject,
            Callout,
            PremiumDivider,
            ScheduleItem,
            TimeMarker,
            DaySeparator,
            Placeholder.configure({
                placeholder: '여행의 기억을 디자인 객체로 구성해보세요. "/"를 입력하거나 [+] 버튼으로 요소를 추가할 수 있습니다.',
            }),
        ],
        content: travelog.sections.find(s => s.type === 'text')?.contentJson || {
            type: 'doc',
            content: [] 
        },
        editorProps: {
            attributes: {
                class: 'prose prose-slate dark:prose-invert max-w-none focus:outline-none min-h-[600px] text-xl leading-relaxed py-20 pb-[300px] writing-mode-active',
            },
        },
        onUpdate: ({ editor }) => {
            const json = editor.getJSON();
            
            // 텍스트 섹션 업데이트
            onUpdateSections([
                {
                    id: travelog.sections[0]?.id || 'main-text',
                    type: 'text',
                    content: editor.getText(),
                    contentJson: json,
                }
            ]);

            // 타임라인 동기화 엔진: 문서 전체를 순회하며 날짜 단위로 이벤트 수집
            if (onUpdateTimeline) {
                const dayNodes: TravelogDailyPlan[] = [];
                let currentDayPlan: TravelogDailyPlan | null = null;

                editor.state.doc.descendants((node) => {
                    // 1. 날짜 구분선 발견 시 새로운 일차 시작
                    if (node.type.name === 'daySeparator') {
                        let { day, date } = node.attrs;
                        
                        // 날짜 자동 계산
                        if ((!date || date === '') && travelog.startDate) {
                            try {
                                const start = parseISO(travelog.startDate);
                                date = format(addDays(start, day - 1), 'yyyy-MM-dd');
                            } catch (e) {
                                console.error("Sync error: Date calculation failed", e);
                            }
                        }

                        currentDayPlan = {
                            day,
                            date: date || '',
                            events: []
                        };
                        dayNodes.push(currentDayPlan);
                    } 
                    
                    // 2. 일정/활동 객체 발견 시 현재 활성화된 일차에 추가
                    else if (node.type.name === 'scheduleItem' && currentDayPlan) {
                        const attrs = node.attrs;
                        const event: TravelogEvent = {
                            id: attrs.id || `editor-${Math.random().toString(36).substr(2, 9)}`,
                            title: attrs.title || '',
                            type: attrs.type || 'event',
                            location: attrs.location || '',
                            mainCategory: attrs.mainCategory || '기타',
                            subCategory: attrs.subCategory || '',
                            time: attrs.time || '12:00',
                            startTime: attrs.startTime || '12:00',
                            endTime: attrs.endTime || '13:00',
                            emotion: attrs.emotion || { joy: 0.33, sadness: 0.33, anger: 0.33 },
                            memo: attrs.memo || '',
                            details: attrs.details || {}
                        };
                        currentDayPlan.events.push(event);
                    }
                });

                // 비파괴적 병합 동기화 로직 (Non-destructive Merge)
                const mergeTimeline = (currentTimeline: TravelogDailyPlan[], editorDays: TravelogDailyPlan[]): TravelogDailyPlan[] => {
                    const nextTimeline = JSON.parse(JSON.stringify(currentTimeline));

                    editorDays.forEach(editorDay => {
                        editorDay.events.forEach(editorEvent => {
                            let sourceDayIdx = -1;
                            let sourceEventIdx = -1;
                            
                            nextTimeline.forEach((day: TravelogDailyPlan, dIdx: number) => {
                                const eIdx = day.events.findIndex((e: TravelogEvent) => e.id === editorEvent.id);
                                if (eIdx !== -1) {
                                    sourceDayIdx = dIdx;
                                    sourceEventIdx = eIdx;
                                }
                            });

                            const targetDayIdx = nextTimeline.findIndex((d: TravelogDailyPlan) => d.day === editorDay.day);

                            if (sourceDayIdx !== -1) {
                                const existingEvent = nextTimeline[sourceDayIdx].events[sourceEventIdx];
                                nextTimeline[sourceDayIdx].events[sourceEventIdx] = { ...existingEvent, ...editorEvent };
                                
                                if (targetDayIdx !== -1 && targetDayIdx !== sourceDayIdx) {
                                    const eventToMove = nextTimeline[sourceDayIdx].events.splice(sourceEventIdx, 1)[0];
                                    nextTimeline[targetDayIdx].events.push(eventToMove);
                                }
                            } else {
                                if (targetDayIdx !== -1) {
                                    nextTimeline[targetDayIdx].events.push(editorEvent);
                                }
                            }
                        });
                    });

                    nextTimeline.forEach((day: TravelogDailyPlan) => {
                        day.events.sort((a, b) => {
                            const timeA = (a.type === 'activity' ? a.startTime : a.time) || '12:00';
                            const timeB = (b.type === 'activity' ? b.startTime : b.time) || '12:00';
                            return timeA.localeCompare(timeB);
                        });
                    });

                    return nextTimeline;
                };

                const mergedTimeline = mergeTimeline(travelog.timeline, dayNodes);
                const currentTimelineStr = JSON.stringify(travelog.timeline);
                const mergedTimelineStr = JSON.stringify(mergedTimeline);

                if (currentTimelineStr !== mergedTimelineStr) {
                    onUpdateTimeline(mergedTimeline);
                }

                // 사용 중인 ID 목록 추출 및 전달
                if (props.onUpdateUsedIds) {
                    const usedIds: string[] = [];
                    editor.state.doc.descendants((node) => {
                        if (node.type.name === 'scheduleItem' && node.attrs.id) {
                            usedIds.push(node.attrs.id);
                        }
                    });
                    props.onUpdateUsedIds(usedIds);
                }
            }
        },
    });

    useEffect(() => {
        if (editor && travelog.sections.length > 0 && !editor.isFocused && editor.isEmpty) {
            const mainTextSection = travelog.sections.find(s => s.type === 'text');
            if (mainTextSection?.contentJson) {
                editor.commands.setContent(mainTextSection.contentJson);
            }
        }
    }, [editor, travelog.sections]);

    const handleTopInsert = (type: string) => {
        if (!editor) return;
        
        let content: any;
        if (type === 'scheduleItem') {
            const attrs = { isSetup: true, type: 'event' }; // Default to event, wizard will allow change
            content = { type, attrs, content: [{ type: 'blockBody' }] };
        } else if (type === 'callout') {
            content = { type, content: [{ type: 'blockBody' }] };
        } else if (type === 'daySeparator') {
            // 문서 내 최대 일차를 찾아 다음 일차 할당
            let maxDay = 0;
            editor.state.doc.descendants((node) => {
                if (node.type.name === 'daySeparator') maxDay = Math.max(maxDay, node.attrs.day);
            });
            content = { type, attrs: { day: maxDay + 1 } };
        } else if (type === 'timeMarker') {
            content = { type, attrs: { time: format(new Date(), 'HH:mm') } };
        } else {
            content = { type };
        }
            
        if (editor.isEmpty) {
            editor.commands.setContent({
                type: 'doc',
                content: [content]
            });
        } else {
            editor.chain()
                .insertContentAt(0, content)
                .focus(1)
                .run();
        }
        setIsTopLibraryOpen(false);
    };

    const getInsertionStatus = useCallback(() => {
        if (!editor) return { canAdd: false, dayToInsert: null, allDays: [] };
        const { selection, doc } = editor.state;
        const cursorPos = selection.$from.pos;
        let days: { day: number; pos: number }[] = [];
        doc.descendants((node, pos) => {
            if (node.type.name === 'daySeparator') {
                days.push({ day: node.attrs.day, pos });
            }
        });
        days.sort((a, b) => a.pos - b.pos);
        const allDays = days.map(d => d.day);
        
        // Find immediate neighbors in document order
        let prevDayNode = null;
        let nextDayNode = null;
        for (const d of days) {
            if (d.pos < cursorPos) prevDayNode = d;
            else if (d.pos >= cursorPos && !nextDayNode) nextDayNode = d;
        }

        // Case 1: Empty document
        if (days.length === 0) return { canAdd: true, dayToInsert: 1, allDays };
        
        // Case 2: At the very top
        if (!prevDayNode) {
            if (allDays.includes(1)) return { canAdd: false, dayToInsert: null, allDays };
            return { canAdd: true, dayToInsert: 1, allDays };
        }

        // Case 3: Between two days
        if (nextDayNode) {
            // If they are consecutive (e.g., 1 and 2), no day can be inserted
            if (nextDayNode.day === prevDayNode.day + 1) return { canAdd: false, dayToInsert: null, allDays };
            // If there's a gap (e.g., 1 and 3), allow inserting the middle day
            if (nextDayNode.day > prevDayNode.day + 1) return { canAdd: true, dayToInsert: prevDayNode.day + 1, allDays };
            return { canAdd: false, dayToInsert: null, allDays };
        } 
        
        // Case 4: After the last day
        return { canAdd: true, dayToInsert: prevDayNode.day + 1, allDays };
    }, [editor]);

    useImperativeHandle(ref, () => ({
        insertPhoto: (url: string) => {
            editor?.chain().focus().insertContent({ type: 'image', attrs: { src: url } }).run();
        },
        insertPreset: (type: string) => {
            if (!editor) return;
            if (type === 'Divider') editor.chain().focus().insertContent({ type: 'premiumDivider' }).run();
            else if (type === 'Bubble') editor.chain().focus().insertContent({ type: 'callout', attrs: { type: 'tip', emoji: '💬' }, content: [{ type: 'blockBody' }] }).run();
        },
        insertTimestamp: () => {
            const now = new Date();
            editor?.chain().focus().insertContent({ type: 'timeMarker', attrs: { time: format(now, 'HH:mm') } }).run();
        },
        insertDaySeparator: (day: number, date: string) => {
            editor?.chain().focus().insertContent({ type: 'daySeparator', attrs: { day, date } }).run();
        },
        insertHeading: () => editor?.chain().focus().insertContent({ type: 'blockTitle' }).run(),
        insertCallout: () => editor?.chain().focus().insertContent({ type: 'callout', attrs: { type: 'tip', emoji: '🪄' }, content: [{ type: 'blockBody' }] }).run(),
        insertSpacer: () => editor?.chain().focus().insertContent({ type: 'blockBody' }).run(),
        insertActivity: (data?: TravelogEvent) => {
            const attrs = data ? { ...data, isSetup: false } : { type: 'activity', isSetup: true };
            editor?.chain().focus().insertContent({ type: 'scheduleItem', attrs, content: [{ type: 'blockBody' }] }).run();
        },
        insertEvent: (data?: TravelogEvent) => {
            const attrs = data ? { ...data, isSetup: false } : { type: 'event', isSetup: true };
            editor?.chain().focus().insertContent({ type: 'scheduleItem', attrs, content: [{ type: 'blockBody' }] }).run();
        },
        updateNodeAttributes: (pos: number, attrs: any) => {
            editor?.chain().focus().setNodeSelection(pos).updateAttributes('scheduleItem', attrs).run();
        },
        updateNodeById: (id: string, attrs: any) => {
            if (!editor) return;
            let foundPos = -1;
            editor.state.doc.descendants((node, pos) => {
                if (node.type.name === 'scheduleItem' && node.attrs.id === id) {
                    foundPos = pos;
                    return false;
                }
            });
            if (foundPos !== -1) {
                editor.chain().focus().setNodeSelection(foundPos).updateAttributes('scheduleItem', attrs).run();
            }
        },
        scrollToDay: (day: number) => {
            if (!editor) return;
            let foundPos = -1;
            editor.state.doc.descendants((node, pos) => {
                if (node.type.name === 'daySeparator' && node.attrs.day === day) {
                    foundPos = pos;
                    return false;
                }
            });
            if (foundPos !== -1) {
                editor.commands.focus(foundPos);
                // 뷰에서 DOM 요소를 찾아 스크롤
                const dom = editor.view.nodeDOM(foundPos) as HTMLElement;
                if (dom) {
                    dom.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        },
        getInsertionStatus,
    }));

    if (!editor) return null;

    const isEmpty = editor.isEmpty;

    return (
        <EditorDataContext.Provider value={{ travelog }}>
            <div className="relative w-full max-w-4xl mx-auto travelog-editor-container min-h-[700px]">
                {/* GapCursor Design Enhancement */}
                <style dangerouslySetInnerHTML={{ __html: `
                    .ProseMirror-gapcursor { position: relative; pointer-events: none; }
                    .ProseMirror-gapcursor:after {
                        content: ""; display: block; position: absolute; top: -1px; width: 100%;
                        border-top: 3px dashed var(--primary); opacity: 0.6; animation: gap-pulse 2s infinite;
                    }
                    @keyframes gap-pulse { 0% { opacity: 0.3; } 50% { opacity: 0.8; } 100% { opacity: 0.3; } }
                    .ProseMirror-selectednode { outline: none !important; }

                    /* 편집 모드 전용 노드 점선 테두리 및 입력 프레임 */
                    .writing-mode-active .schedule-item-node,
                    .writing-mode-active .callout-node,
                    .writing-mode-active .photo-gallery-node,
                    .writing-mode-active .weather-object-node,
                    .writing-mode-active .emotion-diagram-node {
                        border: 2px dashed rgba(var(--primary-rgb), 0.1);
                        transition: all 0.3s ease;
                        position: relative;
                        border-radius: 24px;
                    }

                    /* 모든 입력 필드에 회색 점선 프레임 적용 */
                    .writing-mode-active .block-title-node [data-node-view-content],
                    .writing-mode-active .block-body-node [data-node-view-content],
                    .writing-mode-active .schedule-item-node [data-node-view-content] {
                        border: 2px dashed #e2e8f0; /* slate-200 */
                        border-radius: 16px;
                        padding: 12px 16px;
                        margin: 8px 0;
                        transition: all 0.2s ease;
                        background: rgba(248, 250, 252, 0.5); /* slate-50/50 */
                    }
                    .dark .writing-mode-active .block-title-node [data-node-view-content],
                    .dark .writing-mode-active .block-body-node [data-node-view-content],
                    .dark .writing-mode-active .schedule-item-node [data-node-view-content] {
                        border-color: #334155; /* slate-700 */
                        background: rgba(30, 41, 59, 0.3); /* slate-800/30 */
                    }

                    .writing-mode-active .block-title-node [data-node-view-content]:focus,
                    .writing-mode-active .block-body-node [data-node-view-content]:focus,
                    .writing-mode-active .schedule-item-node [data-node-view-content]:focus {
                        border-color: var(--primary);
                        border-style: solid;
                        background: white;
                        box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.1);
                    }
                    .dark .writing-mode-active .block-title-node [data-node-view-content]:focus,
                    .dark .writing-mode-active .block-body-node [data-node-view-content]:focus,
                    .dark .writing-mode-active .schedule-item-node [data-node-view-content]:focus {
                        background: #0f172a;
                    }

                    /* 시간 마커 프레임 강화 */
                    .writing-mode-active .inline-block.align-middle .block-object-wrapper {
                        border: 2px dashed #cbd5e1 !important; /* slate-300 */
                        border-radius: 9999px !important;
                    }

                    .writing-mode-active .schedule-item-node:hover,
                    .writing-mode-active .callout-node:hover,
                    .writing-mode-active .photo-gallery-node:hover {
                        border-color: rgba(var(--primary-rgb), 0.4);
                    }
                `}} />

                {/* Header Information 제거됨 (TravelogEditorClient에서 통합 관리) */}


                {/* Empty State UI */}
                {isEmpty ? (
                    <div className="absolute top-[25%] left-0 right-0 flex flex-col items-center justify-center p-10 animate-in fade-in zoom-in-95 duration-700">
                        <div className="w-16 h-16 rounded-[28px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center mb-6 shadow-inner">
                            <span className="material-symbols-rounded text-3xl text-slate-300">auto_awesome_motion</span>
                        </div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight mb-2">여행기의 첫 조각을 맞춰볼까요?</h2>
                        <p className="text-slate-400 font-bold text-sm mb-8 text-center max-w-sm">디자인된 객체(Block)를 하나씩 조립하여 정교한 여행 기록을 완성하세요.</p>
                        
                        <div className="relative group/top">
                            <button 
                                onClick={() => setIsTopLibraryOpen(!isTopLibraryOpen)}
                                className={cn(
                                    "flex items-center gap-3 px-6 py-3.5 rounded-full bg-primary text-white shadow-[0_15px_30px_-5px_rgba(var(--primary-rgb),0.4)] hover:scale-105 active:scale-95 transition-all outline-none",
                                    isTopLibraryOpen && "scale-105"
                                )}
                            >
                                <span className="material-symbols-rounded font-black text-lg">{isTopLibraryOpen ? 'close' : 'add'}</span>
                                <span className="font-black tracking-tight text-base">첫 객체 추가하기</span>
                            </button>
                            
                            {isTopLibraryOpen && (
                                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[110] origin-top">
                                    <ObjectLibrary onSelect={handleTopInsert} />
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* 1. Top Insertion Gap (Visible on Hover) */}
                        <div className="relative h-2 flex items-center justify-center -mt-1 group/top z-50">
                            <div className="absolute w-[200px] h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover/top:opacity-100 transition-opacity" />
                            <button 
                                onClick={() => setIsTopLibraryOpen(!isTopLibraryOpen)}
                                className={cn(
                                    "absolute w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-950 shadow-xl border border-primary/20 text-primary transition-all scale-50 opacity-0 group-hover/top:scale-100 group-hover/top:opacity-100 hover:scale-110",
                                    isTopLibraryOpen && "scale-100 opacity-100 rotate-45"
                                )}
                            >
                                <span className="material-symbols-rounded">add</span>
                            </button>
                            
                            {isTopLibraryOpen && (
                                <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[110] origin-top">
                                    <ObjectLibrary 
                                        onSelect={handleTopInsert} 
                                        excludedTypes={(() => {
                                            const days: number[] = [];
                                            editor.state.doc.descendants((node) => {
                                                if (node.type.name === 'daySeparator') days.push(node.attrs.day);
                                            });
                                            return days.includes(1) ? ['daySeparator'] : [];
                                        })()}
                                    />
                                </div>
                            )}
                        </div>

                        <EditorContent editor={editor} className="writing-mode-editor" />
                    </>
                )}
            </div>
        </EditorDataContext.Provider>
    );
};

const WritingModeEditor = forwardRef(WritingModeEditorRender);
WritingModeEditor.displayName = 'WritingModeEditor';

export default WritingModeEditor;
