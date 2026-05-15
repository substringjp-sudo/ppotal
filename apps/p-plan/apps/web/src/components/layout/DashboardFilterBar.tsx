import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '@pplaner/shared';
import { Home } from 'lucide-react';

export interface TabItem {
  id: string;
  label: string;
  icon?: string; // Material Symbols name
  count?: number;
}

interface DashboardFilterBarProps {
  title?: ReactNode;
  breadcrumb?: string; // e.g. "Home / Trips"
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  searchPlaceholder?: string;
  tabs?: TabItem[];
  activeTab?: string;
  setActiveTab?: (id: any) => void;
  leftContent?: ReactNode; // Typically View Mode switchers
  extraActions?: ReactNode; // Typically Filter/Select buttons
  actionButton?: ReactNode; // Typically "New Trip" or "Add Spot" buttons
  children?: ReactNode; // For expandable filters
  isExpanded?: boolean;
}

export default function DashboardFilterBar({
  title,
  breadcrumb,
  tabs,
  activeTab,
  setActiveTab,
  searchQuery = '',
  setSearchQuery = () => {},
  searchPlaceholder = "당신의 기록을 검색하세요...",
  leftContent,
  extraActions,
  actionButton,
  isExpanded,
  children
}: DashboardFilterBarProps) {
  return (
    <div className="sticky top-[80px] z-30 mb-8 rounded-[32px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200 dark:border-slate-800 p-2 shadow-sm">
      {/* Row 1: Search & View Mode (Primary Interaction) */}
      <div className="flex items-center gap-3 h-10 mb-1">
        {/* Central Search Bar - Now More Prominent */}
        <div className="flex-1 relative min-w-0 flex items-center">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <span className="material-symbols-rounded text-sm font-black opacity-50">search</span>
          </div>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-8 pl-9 pr-4 bg-slate-100/30 dark:bg-slate-800/30 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 border border-slate-200/30 dark:border-slate-700/30 rounded-full text-[10px] font-black transition-all outline-none focus:ring-4 focus:ring-primary/5 placeholder:opacity-30 tracking-tight"
          />
        </div>

        {/* View Switchers - Moved to top row right side */}
        {leftContent && (
          <div className="flex-shrink-0 flex items-center h-full">
            {leftContent}
          </div>
        )}
      </div>

      {/* Row 2: Tabs & Actions (Secondary Navigation) */}
      <div className="flex items-center justify-between gap-4 h-11 px-1">
        {/* Tabs Section */}
        <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar scroll-smooth">
          <div className="flex items-center gap-1 p-0.5 bg-slate-200/30 dark:bg-slate-800/20 rounded-[12px] w-fit">
            {tabs?.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab && setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] transition-all whitespace-nowrap group",
                  activeTab === tab.id 
                    ? "bg-white dark:bg-slate-700 text-primary shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-600/50" 
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                )}
              >
                {tab.icon && (
                  <span className={cn(
                    "material-symbols-rounded text-xs",
                    activeTab === tab.id ? "font-black" : "font-medium opacity-60"
                  )}>
                    {tab.icon}
                  </span>
                )}
                <span className={cn(
                  "text-[9px] uppercase tracking-[0.1em]",
                  activeTab === tab.id ? "font-black" : "font-bold"
                )}>
                  {tab.label}
                </span>
                {tab.count !== undefined && (
                  <span className={cn(
                    "text-[8px] font-black px-1.5 py-0.5 rounded-full min-w-[16px] text-center",
                    activeTab === tab.id 
                      ? "bg-primary text-white" 
                      : "bg-slate-200 dark:bg-slate-800 text-slate-400 group-hover:text-slate-600"
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Action Area (Combined primary and extra actions) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {extraActions && (
            <div className="flex items-center gap-1.5">
              {extraActions}
            </div>
          )}
          {actionButton && (
            <div className="pl-2 border-l border-slate-200 dark:border-slate-800 ml-1">
              {actionButton}
            </div>
          )}
        </div>
      </div>

      {/* Expandable Content (Filters, etc) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="py-3 border-t border-slate-200/50 dark:border-slate-800 mt-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
