'use client';

import React, { useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Printer, GripVertical, Check, Palette, LayoutTemplate, Settings2, FileText, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import { useTripStore, cn } from '@pplaner/shared';
import PrintTemplate, { PrintTheme, PRINT_THEMES, PrintSectionId } from './PrintTemplate';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ExportPreviewModalProps {
  onClose: () => void;
}

const SECTION_LABELS: Record<PrintSectionId, string> = {
  cover: '제목 및 요약',
  schedule: '전체 일정표',
  budget: '예산 및 지출 내역',
  prep: '준비 사항',
  packing: '짐 챙기기 (체크리스트)',
};

function SortableItem({ id, isActive, onToggle }: { id: PrintSectionId; isActive: boolean; onToggle: (id: PrintSectionId) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 0,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(
        "flex items-center gap-3 p-3 rounded-2xl border transition-all duration-200",
        isDragging ? "bg-white dark:bg-slate-800 border-primary shadow-2xl scale-[1.05]" : "bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
    )}>
      <button {...attributes} {...listeners} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1 flex items-center gap-3">
         <button 
           onClick={() => onToggle(id)}
           className={cn(
               "w-5 h-5 rounded-lg flex items-center justify-center border-2 transition-all",
               isActive ? "bg-primary border-primary text-white" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
           )}
         >
           {isActive && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
         </button>
         <span className={cn(
             "text-xs font-black uppercase tracking-tight",
             isActive ? "text-slate-900 dark:text-white" : "text-slate-400 line-through opacity-50"
         )}>
           {SECTION_LABELS[id]}
         </span>
      </div>
    </div>
  );
}

type TabId = 'templates' | 'style' | 'content';

export function ExportPreviewModal({ onClose }: ExportPreviewModalProps) {
  const currentTrip = useTripStore((state) => state.currentTrip);
  
  const [activeTab, setActiveTab] = useState<TabId>('templates');
  const [sections, setSections] = useState<PrintSectionId[]>(['cover', 'schedule', 'budget', 'prep', 'packing']);
  const [activeSections, setActiveSections] = useState<Record<PrintSectionId, boolean>>({
    cover: true, schedule: true, budget: true, prep: true, packing: true,
  });
  
  const [themeId, setThemeId] = useState<string>('modern');
  const [layout, setLayout] = useState<'compact' | 'detailed'>('detailed');
  const [pattern, setPattern] = useState<'dots' | 'grid' | 'noise' | 'none'>('none');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  
  const previewRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.indexOf(active.id as PrintSectionId);
        const newIndex = items.indexOf(over.id as PrintSectionId);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const toggleSection = (id: PrintSectionId) => {
    setActiveSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExportPNG = async () => {
    if (!previewRef.current || isExporting) return;
    setIsExporting(true);
    const tid = toast.loading('이미지로 변환 중입니다...');
    
    try {
      await new Promise(r => setTimeout(r, 200)); // 렌더링 안정화 대기
      const dataUrl = await toPng(previewRef.current, {
        quality: 1,
        pixelRatio: 3, // 고해상도 지원
        backgroundColor: '#ffffff',
        filter: (node) => !(node instanceof HTMLElement && node.classList.contains('dnd-kit-drag-overlay')),
      });
      
      const link = document.createElement('a');
      link.download = `PPLANER_${currentTrip?.title || 'Trip'}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('이미지 저장이 완료되었습니다.', { id: tid });
    } catch (err) {
      console.error(err);
      toast.error('이미지 변환 중 오류가 발생했습니다.', { id: tid });
    } finally {
      setIsExporting(false);
    }
  };

  const displayedSections = useMemo(() => sections.filter(s => activeSections[s]), [sections, activeSections]);

  if (!currentTrip) return null;

  const tabs: { id: TabId; label: string; icon: any }[] = [
      { id: 'templates', label: 'PRESETS', icon: Sparkles },
      { id: 'style', label: 'DESIGN', icon: Palette },
      { id: 'content', label: 'LAYOUT', icon: Settings2 },
  ];

  const patterns: { id: 'dots' | 'grid' | 'noise' | 'none'; label: string; icon: string }[] = [
      { id: 'none', label: '없음', icon: 'block' },
      { id: 'dots', label: '도트', icon: 'drag_indicator' },
      { id: 'grid', label: '그리드', icon: 'grid_4x4' },
      { id: 'noise', label: '노이즈', icon: 'texture' },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex bg-[#F8F9FA] dark:bg-slate-950"
      >
        {/* Sidebar Navigation */}
        <nav className="w-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center py-8 gap-8 shrink-0">
            <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/20 mb-4">
                <span className="material-symbols-rounded text-2xl">auto_awesome</span>
            </div>
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                        "w-12 h-12 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all group",
                        activeTab === tab.id ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                >
                    <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? "text-white" : "group-hover:text-slate-600")} />
                    <span className="text-[7px] font-black tracking-widest">{tab.label}</span>
                </button>
            ))}
            <div className="mt-auto">
                <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center">
                    <X className="w-5 h-5" />
                </button>
            </div>
        </nav>

        {/* Sidebar Config Panel */}
        <div className="w-[340px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full shrink-0">
          <div className="p-6 border-b border-slate-200/60 dark:border-slate-800">
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight italic">EXPORT STUDIO</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Customize your travel guide</p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 custom-scrollbar">
            {activeTab === 'templates' && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Select Preset</h3>
                    <div className="grid grid-cols-1 gap-3">
                        {Object.entries(PRINT_THEMES).map(([id, t]) => (
                            <button
                                key={id}
                                onClick={() => setThemeId(id)}
                                className={cn(
                                    "p-4 rounded-[2rem] border-2 text-left transition-all relative overflow-hidden group",
                                    themeId === id ? "border-primary bg-primary/5 ring-4 ring-primary/5" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200"
                                )}
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <span className={cn("text-sm font-black italic", themeId === id ? "text-primary" : "text-slate-900 dark:text-white")}>{t.name}</span>
                                    {themeId === id && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                                </div>
                                <div className="flex gap-1.5 h-4">
                                    <div className={cn("w-6 h-full rounded-full border border-slate-200/50", t.bg)} />
                                    <div className={cn("w-6 h-full rounded-full", t.primary.replace('text-', 'bg-'))} />
                                    <div className={cn("w-6 h-full rounded-full", t.accent.replace('text-', 'bg-'))} />
                                </div>
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}

            {activeTab === 'style' && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                    <section>
                       <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Background Pattern</h3>
                       <div className="grid grid-cols-2 gap-2">
                         {patterns.map(p => (
                             <button
                                key={p.id}
                                onClick={() => setPattern(p.id)}
                                className={cn(
                                    "p-3 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
                                    pattern === p.id ? "border-primary bg-primary/5 text-primary" : "border-slate-200 dark:border-slate-800 text-slate-400"
                                )}
                             >
                                <span className="material-symbols-rounded text-xl">{p.icon}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest">{p.label}</span>
                             </button>
                         ))}
                       </div>
                    </section>
                    
                    <section>
                       <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">View Format</h3>
                       <div className="flex bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-1.5 border border-slate-200 dark:border-slate-800">
                         {(['compact', 'detailed'] as const).map(l => (
                             <button 
                                key={l}
                                onClick={() => setLayout(l)}
                                className={cn(
                                    "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                                    layout === l ? "bg-white dark:bg-slate-700 shadow-xl text-primary" : "text-slate-400"
                                )}
                             >
                                {l === 'compact' ? 'Tables' : 'Timeline'}
                             </button>
                         ))}
                       </div>
                    </section>
                </motion.div>
            )}

            {activeTab === 'content' && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Content Order</h3>
                   <p className="text-[10px] text-slate-400 font-bold mb-4 italic truncate">Drag to reorder, toggle to hide</p>
                   
                   <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                     <SortableContext items={sections} strategy={verticalListSortingStrategy}>
                       <div className="flex flex-col gap-3">
                         {sections.map(id => (
                           <SortableItem key={id} id={id} isActive={activeSections[id]} onToggle={toggleSection} />
                         ))}
                       </div>
                     </SortableContext>
                   </DndContext>
                </motion.div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="p-6 border-t border-slate-200/60 dark:border-slate-800 flex flex-col gap-3">
             <button
               onClick={handleExportPNG}
               disabled={isExporting}
               className="w-full flex items-center justify-center gap-3 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl transition-all disabled:opacity-50 group hover:scale-[1.02] active:scale-[0.98]"
             >
                <ImageIcon className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                SAVING TO GALLERY
             </button>
             <button
               onClick={() => window.print()}
               className="w-full flex items-center justify-center gap-3 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all hover:bg-slate-50 dark:hover:bg-slate-700"
             >
                <Printer className="w-4 h-4" />
                HARD COPY / PDF
             </button>
          </div>
        </div>

        {/* Main Preview Area */}
        <div className="flex-1 overflow-x-hidden p-8 sm:p-20 flex flex-col items-center custom-scrollbar overflow-y-auto">
          <div className="w-full max-w-[1200px] mb-8 flex items-center justify-between px-4">
              <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Live Studio Preview</span>
              </div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">300 DPI / Retina Ready</div>
          </div>
          
          <div 
             className="w-full max-w-4xl shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] rounded-sm transform origin-top mb-20 bg-white ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden" 
             style={{ zoom: 0.85 }}
          >
             <div ref={previewRef}>
                <PrintTemplate 
                  trip={currentTrip} 
                  sections={displayedSections} 
                  themeId={themeId} 
                  layout={layout}
                  options={{ pattern }}
                />
             </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
