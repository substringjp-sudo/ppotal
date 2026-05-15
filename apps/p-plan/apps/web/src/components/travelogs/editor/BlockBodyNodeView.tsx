'use client';

import React from 'react';
import { NodeViewWrapper, NodeViewContent, NodeViewProps } from '@tiptap/react';
import { BlockWrapper } from './BlockWrapper';
import { cn } from '@pplaner/shared';

export const BlockBodyNodeView = (props: NodeViewProps) => {
  const { node, getPos, editor, updateAttributes, deleteNode, selected } = props;
  const { placeholder } = node.attrs;

  return (
    <NodeViewWrapper className="block-body-node">
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
            "outline-none min-h-[1em]",
            node.content.size === 0 && "before:content-[attr(data-placeholder)] before:text-slate-300 before:pointer-events-none before:absolute"
          )}
          data-placeholder={placeholder}
        />
      </BlockWrapper>
    </NodeViewWrapper>
  );
};
