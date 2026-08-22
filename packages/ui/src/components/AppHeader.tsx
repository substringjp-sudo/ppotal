"use client";

import React from 'react';
import { DESIGN_TOKENS } from '../styles/tokens';

export interface AppHeaderProps {
  logo?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  mobileActions?: React.ReactNode;
  isMobile?: boolean;
  className?: string;
  style?: React.CSSProperties;
  sticky?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  logo,
  center,
  right,
  mobileActions,
  isMobile = false,
  className = '',
  style,
  sticky = true,
}) => {
  const stickyClass = sticky ? 'sticky top-0' : 'relative';
  
  if (isMobile) {
    return (
      <header
        className={`flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-2 shrink-0 shadow-sm ${stickyClass} ${className}`}
        style={{
          zIndex: DESIGN_TOKENS.zIndex.header,
          height: DESIGN_TOKENS.header.height,
          paddingTop: 'var(--safe-top, 0px)',
          paddingLeft: 'calc(0.5rem + var(--safe-left, 0px))',
          paddingRight: 'calc(0.5rem + var(--safe-right, 0px))',
          boxSizing: 'content-box',
          ...style,
        }}
      >
        {logo && <div className="flex items-center gap-2 min-w-0 mr-auto pl-1 min-h-[44px]">{logo}</div>}
        {mobileActions && <div className="flex items-center gap-1 shrink-0 ml-auto">{mobileActions}</div>}
      </header>
    );
  }

  return (
    <header
      className={`flex h-14 items-center border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 md:px-6 shrink-0 shadow-sm ${stickyClass} ${className}`}
      style={{
        zIndex: DESIGN_TOKENS.zIndex.header,
        ...style,
      }}
    >
      {/* Left Slot: Logo & Brand */}
      {logo && (
        <div className="flex items-center gap-3 shrink-0 mr-4">
          {logo}
        </div>
      )}

      {/* Center Slot: Search or Main Controls */}
      {center && (
        <div className="flex-1 flex justify-center px-4 min-w-0">
          {center}
        </div>
      )}

      {/* Right Slot: Nav Links, Actions, Auth */}
      {right && (
        <div className="flex items-center gap-3 md:gap-4 shrink-0 ml-auto">
          {right}
        </div>
      )}
    </header>
  );
};
