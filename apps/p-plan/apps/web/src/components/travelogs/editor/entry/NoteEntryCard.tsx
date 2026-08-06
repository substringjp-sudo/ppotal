'use client';

import { cn, type TravelogNote } from '@pplaner/shared';
import { useCardStreamField } from './useCardStream';

/**
 * 글 카드 — 장소에 매이지 않는 문단(도입부·맺음말·장소 사이를 잇는 글).
 * 사진은 언제나 장소에 속하므로 여기엔 없다. 딱 글 한 덩어리.
 */
export default function NoteEntryCard({
    note, dragHandleProps, isDragging, onUpdate, onRemove,
}: {
    note: TravelogNote;
    dragHandleProps?: Record<string, any>;
    isDragging?: boolean;
    onUpdate: (patch: Partial<TravelogNote>) => void;
    onRemove: () => void;
}) {
    const field = useCardStreamField(note.id);

    return (
        <article
            className={cn(
                'group rounded-2xl border bg-white dark:bg-slate-900 shadow-sm transition-all',
                field.isActive
                    ? 'border-primary/40 ring-2 ring-primary/10 shadow-md'
                    : 'border-slate-200 dark:border-slate-800',
                isDragging && 'opacity-40',
            )}
        >
            <div className="p-3 sm:p-4 flex items-start gap-2.5">
                <button
                    {...dragHandleProps}
                    className="mt-1 w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 grid place-items-center shrink-0 cursor-grab active:cursor-grabbing touch-none"
                    aria-label="순서 바꾸기"
                    title="끌어서 순서 바꾸기"
                >
                    <span className="material-symbols-rounded text-base">notes</span>
                </button>
                <textarea
                    ref={field.ref}
                    onKeyDown={field.onKeyDown}
                    onFocus={field.onFocus}
                    onBlur={field.onBlur}
                    value={note.text}
                    onChange={(e) => onUpdate({ text: e.target.value })}
                    placeholder="여기에 글을 이어 쓰세요"
                    rows={field.isActive ? 5 : 3}
                    className="flex-1 min-w-0 rounded-xl border border-transparent bg-transparent px-2 py-1.5 text-base leading-[1.75] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:bg-slate-50 dark:focus:bg-slate-950 focus:border-slate-200 dark:focus:border-slate-800 outline-none resize-none transition-all"
                />
                <button
                    onClick={onRemove}
                    className="mt-1 w-7 h-7 rounded-lg grid place-items-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    aria-label="글 카드 삭제"
                >
                    <span className="material-symbols-rounded text-base">close</span>
                </button>
            </div>
        </article>
    );
}
