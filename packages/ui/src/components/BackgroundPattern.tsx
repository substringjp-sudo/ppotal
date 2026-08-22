"use client";

import React from 'react';

export interface BackgroundPatternProps {
  pattern?: 'dots' | 'grid' | 'none';
  blurOverlay?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const BackgroundPattern: React.FC<BackgroundPatternProps> = ({
  pattern = 'dots',
  blurOverlay = false,
  className = '',
  children,
}) => {
  const patternClass = pattern === 'dots' 
    ? 'bg-pattern-dots' 
    : pattern === 'grid' 
    ? 'bg-pattern-grid' 
    : '';

  return (
    <div className={`relative w-full h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 ${patternClass} ${className}`}>
      {blurOverlay && (
        <div className="absolute inset-0 bg-white/40 dark:bg-slate-950/40 backdrop-blur-[2px] pointer-events-none" />
      )}
      {children}
    </div>
  );
};
