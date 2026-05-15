import { ReactNode } from 'react';

interface DashboardPageLayoutProps {
  children: ReactNode;
  maxWidth?: string;
}

export default function DashboardPageLayout({ 
  children, 
  maxWidth = "max-w-[2200px]" 
}: DashboardPageLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 pb-32 overflow-x-hidden">
      <main className={`${maxWidth} mx-auto px-4 lg:px-8 pt-10`}>
        <div className="main-content-frame min-h-[70vh]">
          {children}
        </div>
      </main>
    </div>
  );
}
