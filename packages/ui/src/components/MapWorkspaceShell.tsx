"use client";

import React, { memo } from 'react';

export interface MapWorkspaceShellProps {
  /** Fullscreen background map component */
  map: React.ReactNode;
  /** Left sidebar drawer component */
  leftSidebar?: React.ReactNode;
  /** Right visits / drawer component */
  rightPanel?: React.ReactNode;
  /** 2-Tier map subheader component */
  subHeader?: React.ReactNode;
  /** Overlays inside center action area (e.g. style panel, detail panes, loader) */
  centerOverlays?: React.ReactNode;
  /** Left sidebar open state */
  isLeftOpen: boolean;
  /** Right panel open state */
  isRightOpen: boolean;
  /** Left sidebar width (default: 350) */
  leftWidth?: number;
  /** Right panel width (default: 350) */
  rightWidth?: number;
  /** Mobile layout flag */
  isMobile?: boolean;
  /** Mobile bottom sheet or drawer content */
  mobileBottomContent?: React.ReactNode;
  /** Container custom classes */
  className?: string;
}

export const MapWorkspaceShell: React.FC<MapWorkspaceShellProps> = memo(({
  map,
  leftSidebar,
  rightPanel,
  subHeader,
  centerOverlays,
  isLeftOpen,
  isRightOpen,
  leftWidth = 350,
  rightWidth = 350,
  isMobile = false,
  mobileBottomContent,
  className = '',
}) => {
  const currentLeftOffset = isLeftOpen ? `${leftWidth}px` : '0px';
  const currentRightOffset = isRightOpen ? `${rightWidth}px` : '0px';

  return (
    <div className={`relative w-full h-full min-h-0 overflow-hidden bg-slate-50 dark:bg-slate-950 select-none ${className}`}>
      {/* 1. Background Fullscreen Map (Strictly Isolated Stacking Context) */}
      <div
        style={{ zIndex: 0, isolation: 'isolate' }}
        className="absolute inset-0 z-0 overflow-hidden isolate pointer-events-auto"
      >
        {map}
      </div>

      {/* 2. Desktop Foreground Overlay Workspace (Above Map z-0~600, Below Modals z-10000) */}
      {!isMobile && (
        <div
          style={{ zIndex: 1000, isolation: 'isolate' }}
          className="absolute inset-0 pointer-events-none h-full overflow-hidden z-[1000] isolate"
        >
          {/* 2-Tier SubHeader (Between Left & Right Sidebars with Smooth Transition) */}
          {subHeader && (
            <div
              style={{
                left: currentLeftOffset,
                right: currentRightOffset,
                zIndex: 1010,
              }}
              className="absolute top-0 pointer-events-auto z-[1010] transition-all duration-300 ease-in-out"
            >
              {subHeader}
            </div>
          )}

          {/* Left Sidebar (Full Height, Smooth Slide Transition) */}
          {leftSidebar && (
            <aside
              style={{
                width: `${leftWidth}px`,
                transform: isLeftOpen ? 'translateX(0)' : 'translateX(-100%)',
                zIndex: 1020,
              }}
              className={`absolute top-0 bottom-0 left-0 h-full border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-[1020] flex flex-col shadow-2xl shadow-slate-200/50 dark:shadow-black/20 pointer-events-auto transition-transform duration-300 ease-in-out overflow-hidden ${
                isLeftOpen ? '' : 'pointer-events-none'
              }`}
            >
              {leftSidebar}
            </aside>
          )}

          {/* Center Action & Details Overlays (Smooth Width Transition) */}
          <div
            style={{
              left: currentLeftOffset,
              right: currentRightOffset,
              zIndex: 1005,
            }}
            className={`absolute ${subHeader ? 'top-16' : 'top-0'} bottom-0 flex flex-col min-w-0 pointer-events-none transition-all duration-300 ease-in-out z-[1005]`}
          >
            {centerOverlays}
          </div>

          {/* Right Panel (Full Height, Smooth Slide Transition) */}
          {rightPanel && (
            <aside
              style={{
                width: `${rightWidth}px`,
                transform: isRightOpen ? 'translateX(0)' : 'translateX(100%)',
                zIndex: 1020,
              }}
              className={`absolute top-0 bottom-0 right-0 h-full border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-[1020] shadow-2xl shadow-slate-200/50 dark:shadow-black/20 flex flex-col pointer-events-auto transition-transform duration-300 ease-in-out overflow-hidden ${
                isRightOpen ? '' : 'pointer-events-none'
              }`}
            >
              {rightPanel}
            </aside>
          )}
        </div>
      )}

      {/* 3. Mobile Overlays */}
      {isMobile && mobileBottomContent}
    </div>
  );
});

MapWorkspaceShell.displayName = 'MapWorkspaceShell';
