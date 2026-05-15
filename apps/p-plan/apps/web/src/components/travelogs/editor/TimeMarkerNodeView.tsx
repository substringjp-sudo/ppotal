'use client';

import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React from 'react';
import { cn } from '@pplaner/shared';
import { BlockWrapper } from './BlockWrapper';

export const TimeMarkerNodeView = (props: NodeViewProps) => {
    const { node, editor, getPos, deleteNode, updateAttributes, selected } = props;
    const { time } = node.attrs;

    return (
        <NodeViewWrapper className="inline-block align-middle mx-1 my-2">
            <BlockWrapper 
                attributes={node.attrs} 
                isFocused={selected}
                editor={editor}
                getPos={getPos}
                node={node}
                updateAttributes={updateAttributes}
                deleteNode={deleteNode}
                className="inline-flex items-center gap-3 px-10 py-3 rounded-full border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-900/20 shadow-sm transition-all hover:scale-105"
            >
                <div className="flex items-center gap-3 min-w-[120px] justify-center">
                    <span className="material-symbols-rounded text-xl text-amber-500">schedule</span>
                    <input 
                        type="time" 
                        value={time}
                        onChange={(e) => updateAttributes({ time: e.target.value })}
                        className="bg-transparent border-none p-0 text-lg font-black text-amber-900 dark:text-amber-400 focus:ring-0 w-[70px] cursor-pointer text-center tracking-tight"
                    />
                </div>
                
                {/* Space for internal padding to prevent toolbar overlap if toolbar is close, 
                    but here we rely on the pill width */}
            </BlockWrapper>
        </NodeViewWrapper>
    );
};
