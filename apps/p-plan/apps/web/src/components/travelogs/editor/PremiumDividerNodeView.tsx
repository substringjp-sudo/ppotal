'use client';

import React from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { BlockWrapper } from './BlockWrapper';

export const PremiumDividerNodeView = (props: NodeViewProps) => {
    const { node, selected, editor, getPos, deleteNode, updateAttributes } = props;

    return (
        <NodeViewWrapper className="premium-divider-node">
            <BlockWrapper 
                attributes={node.attrs} 
                isFocused={selected}
                editor={editor}
                getPos={getPos}
                node={node}
                updateAttributes={updateAttributes}
                deleteNode={deleteNode}
                className="py-4"
            >
                <hr className={`premium-divider ${node.attrs.style}`} data-premium="true" />
            </BlockWrapper>
        </NodeViewWrapper>
    );
};
