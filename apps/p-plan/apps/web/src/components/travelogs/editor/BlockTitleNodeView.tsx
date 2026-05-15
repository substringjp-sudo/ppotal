'use client';

import React from 'react';
import { NodeViewWrapper, NodeViewContent, NodeViewProps } from '@tiptap/react';
import { BlockWrapper } from './BlockWrapper';
import { cn } from '@pplaner/shared';

export const BlockTitleNodeView = (props: NodeViewProps) => {
  const { node, getPos, editor, updateAttributes, deleteNode, selected } = props;
  const { placeholder } = node.attrs;

  return (
    <NodeViewWrapper className="block-title-node">
      <BlockWrapper 
        attributes={node.attrs} 
        isFocused={selected}
        editor={editor}
        getPos={getPos}
        node={node}
        updateAttributes={updateAttributes}
        deleteNode={deleteNode}
      >
        <NodeViewContent 
          className={cn(
            "outline-none min-h-[1.2em] font-black text-2xl tracking-tighter",
            node.content.size === 0 && "before:content-[attr(data-placeholder)] before:text-slate-300 before:pointer-events-none before:absolute"
          )}
          data-placeholder={placeholder}
        />
      </BlockWrapper>
    </NodeViewWrapper>
  );
};
