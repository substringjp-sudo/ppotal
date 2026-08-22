"use client";

import React from 'react';

export interface AppShellProps {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  main: React.ReactNode;
  bottom?: React.ReactNode;
  background?: React.ReactNode;
  className?: string;
}

export const AppShell: React.FC<AppShellProps> = ({
  header,
  sidebar,
  main,
  bottom,
  background,
  className = '',
}) => {
  return (
    <div className={`relative flex flex-col w-full h-[100dvh] overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 ${className}`}>
      {background && <div className="absolute inset-0 pointer-events-none">{background}</div>}
      
      {/* Header */}
      {header}

      {/* Main Area (with optional sidebar/panes) */}
      <div className="relative flex-1 flex min-h-0 w-full overflow-hidden">
        {sidebar}
        <main className="relative flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
          {main}
        </main>
      </div>

      {/* Bottom Area (Sheets, Drawers, Footers) */}
      {bottom}
    </div>
  );
};
