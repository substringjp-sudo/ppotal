'use client';

import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useContext } from 'react';
import { cn } from '@pplaner/shared';
import { format, parseISO, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { BlockWrapper } from './BlockWrapper';
import { EditorDataContext } from './WritingModeEditor';

export const DaySeparatorNodeView = (props: NodeViewProps) => {
    const { node, editor, getPos, deleteNode, updateAttributes, selected } = props;
    const { day } = node.attrs;
    const context = useContext(EditorDataContext);

    let dateDisplay = '';
    let dayOfWeek = '';

    try {
        // 컨텍스트에서 시작일을 가져와 현재 일차(day)에 맞는 날짜 계산
        const startDateStr = context?.travelog?.startDate;
        
        if (startDateStr) {
            const start = parseISO(startDateStr);
            const currentDayDate = addDays(start, day - 1);
            dateDisplay = format(currentDayDate, 'yyyy년 MM월 dd일');
            dayOfWeek = format(currentDayDate, 'EEEE', { locale: ko });
        } else {
            dateDisplay = `Day ${day} 시작`;
        }
    } catch (e) {
        console.error("DaySeparator: Date calculation error", e);
        dateDisplay = `Day ${day}`;
    }

    return (
        <NodeViewWrapper className="my-12">
            <BlockWrapper 
                attributes={node.attrs} 
                isFocused={selected}
                editor={editor}
                getPos={getPos}
                node={node}
                updateAttributes={updateAttributes}
                deleteNode={deleteNode}
            >
                <div className="relative flex flex-col items-center group">
                    {/* Background Line */}
                    <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent shadow-sm" />
                    
                    {/* Content Badge */}
                    <div className="relative flex flex-col items-center gap-2 group-hover:scale-110 transition-transform duration-500">
                        <div className="px-6 py-2 bg-slate-950 dark:bg-white rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.2)] dark:shadow-[0_10px_30px_rgba(255,255,255,0.1)]">
                            <span className="text-[12px] font-black text-white dark:text-slate-900 uppercase tracking-[0.4em] ml-[0.4em]">DAY {day}</span>
                        </div>
                    </div>

                    {/* Subtext (Date & Day of Week) */}
                    <div className="mt-6 flex items-center gap-3">
                        <span className="w-8 h-[1px] bg-slate-100 dark:bg-slate-800" />
                        <span className="text-[14px] font-black text-slate-800 dark:text-slate-200 tracking-tight">{dateDisplay}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/20" />
                        <span className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">{dayOfWeek}</span>
                        <span className="w-8 h-[1px] bg-slate-100 dark:bg-slate-800" />
                    </div>
                </div>
            </BlockWrapper>
        </NodeViewWrapper>
    );
};
