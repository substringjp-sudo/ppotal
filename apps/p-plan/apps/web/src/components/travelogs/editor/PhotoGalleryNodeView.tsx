'use client';

import React from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { BlockWrapper } from './BlockWrapper';
import { cn } from '@pplaner/shared';

export const PhotoGalleryNodeView = (props: NodeViewProps) => {
  const { node, updateAttributes, selected, editor, getPos, deleteNode } = props;
  const { images, layout, columns } = node.attrs;

  const handleAddImage = () => {
    // In a real app, this would open a file picker or gallery
    const url = prompt('이미지 URL을 입력하세요:');
    if (url) {
      updateAttributes({ 
        images: [...images, { url, caption: '' }] 
      });
    }
  };

  return (
    <NodeViewWrapper className="photo-gallery-node">
      <BlockWrapper attributes={node.attrs} isFocused={props.selected}>
        <div className="flex items-center justify-between mb-4 border-b border-slate-200/60 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-rounded text-primary">photo_library</span>
            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Memory Gallery</h4>
          </div>
          <button 
            onClick={handleAddImage}
            className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-primary transition-all"
          >
            <span className="material-symbols-rounded">add</span>
          </button>
        </div>

        {images.length > 0 ? (
          <div 
            className={cn(
              "grid gap-4",
              layout === 'grid' && `grid-cols-${columns}`,
              layout === 'masonry' && "columns-2 md:columns-3"
            )}
          >
            {images.map((img: any, idx: number) => (
              <div key={idx} className="group/img relative aspect-[4/3] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
                <img src={img.url} className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110" alt={img.caption} />
                <button 
                  onClick={() => {
                    const next = [...images];
                    next.splice(idx, 1);
                    updateAttributes({ images: next });
                  }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                >
                  <span className="material-symbols-rounded text-sm">close</span>
                </button>
                <button 
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('pplaner:set-cover-image', { 
                      detail: { url: img.url } 
                    }));
                  }}
                  className="absolute bottom-2 left-2 px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-[10px] font-black text-slate-900 dark:text-white flex items-center gap-1.5 opacity-0 group-hover/img:opacity-100 transition-all hover:scale-105 active:scale-95 shadow-lg border border-white/20"
                >
                  <span className="material-symbols-rounded text-sm text-amber-400">stars</span>
                  SET AS COVER
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div 
            onClick={handleAddImage}
            className="aspect-[16/6] rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
          >
            <span className="material-symbols-rounded text-3xl text-slate-200">add_a_photo</span>
            <p className="text-[10px] font-black text-slate-300 uppercase italic">Click to add photos to gallery</p>
          </div>
        )}
      </BlockWrapper>
    </NodeViewWrapper>
  );
};
