"use client";

import React, { memo } from 'react';
import { MapWorkspaceShell } from './MapWorkspaceShell';

export interface MapAppLayoutProps {
  /** Top Global AppHeader */
  appHeader?: React.ReactNode;
  /** Fullscreen background map component */
  map: React.ReactNode;
  /** 2-Tier map subheader component */
  subHeader?: React.ReactNode;
  /** Left sidebar content */
  leftSidebar?: React.ReactNode;
  /** Right visits / drawer content */
  rightPanel?: React.ReactNode;
  /** Overlays inside center action area */
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

export const MapAppLayout: React.FC<MapAppLayoutProps> = memo(({
  appHeader,
  map,
  subHeader,
  leftSidebar,
  rightPanel,
  centerOverlays,
  isLeftOpen,
  isRightOpen,
  leftWidth = 350,
  rightWidth = 350,
  isMobile = false,
  mobileBottomContent,
  className = '',
}) => {
  return (
    <div className={`flex flex-col w-full h-full min-h-0 overflow-hidden bg-slate-50 dark:bg-slate-950 select-none ${className}`}>
      {/* 1. Global App Header (Fixed 56px) */}
      {appHeader}

      {/* 2. Map Workspace with Smooth Transition Slots */}
      <main className="flex-1 min-h-0 w-full h-full relative overflow-hidden focus:outline-none" tabIndex={-1}>
        <MapWorkspaceShell
          map={map}
          subHeader={subHeader}
          leftSidebar={leftSidebar}
          rightPanel={rightPanel}
          centerOverlays={centerOverlays}
          isLeftOpen={isLeftOpen}
          isRightOpen={isRightOpen}
          leftWidth={leftWidth}
          rightWidth={rightWidth}
          isMobile={isMobile}
          mobileBottomContent={mobileBottomContent}
        />
      </main>
    </div>
  );
});

MapAppLayout.displayName = 'MapAppLayout';
