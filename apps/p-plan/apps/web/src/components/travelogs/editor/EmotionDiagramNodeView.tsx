'use client';

import React from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { BlockWrapper } from './BlockWrapper';
import { EmotionTriangle } from './EmotionTriangle';

export const EmotionDiagramNodeView = (props: NodeViewProps) => {
  const { node, getPos, editor, updateAttributes, deleteNode, selected } = props;
  const { emotion, size } = node.attrs;

  return (
    <NodeViewWrapper className="emotion-diagram-node">
      <BlockWrapper 
        attributes={node.attrs} 
        isFocused={selected}
        editor={editor}
        getPos={getPos}
        node={node}
        updateAttributes={updateAttributes}
        deleteNode={deleteNode}
        className="flex justify-center"
      >
        <div className="flex flex-col items-center gap-4">
          <EmotionTriangle 
            value={emotion}
            onChange={(val) => updateAttributes({ emotion: val })}
            size={size}
          />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Interactive Emotion Object</p>
        </div>
      </BlockWrapper>
    </NodeViewWrapper>
  );
};
