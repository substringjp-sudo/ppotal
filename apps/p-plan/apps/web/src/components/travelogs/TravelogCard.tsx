'use client';
import { Travelog } from '@pplaner/shared';
import { motion, Variants } from 'framer-motion';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@pplaner/shared';

interface TravelogCardProps {
    travelog: Travelog;
    /** 카드 클릭 시 실행될 콜백 */
    onClick?: (id: string) => void;
    /** 삭제 버튼 클릭 시 실행될 콜백 */
    onDelete?: (id: string, e: React.MouseEvent) => void;
    /** 디스플레이 모드 */
    viewMode?: 'grid' | 'list';
}

/**
 * TravelogCard - 여행 기록을 보여주는 감성적이고 몰입감 있는 카드 컴포넌트
 * TripCard의 고밀도 디자인 언어를 계승하면서도 기록물만의 감성을 담았습니다.
 */
export default function TravelogCard({ travelog, onClick, onDelete, viewMode = 'grid' }: TravelogCardProps) {
    const cardVariants: Variants = {
        hidden: { opacity: 0, scale: 0.98, y: 10 },
        visible: { 
            opacity: 1, 
            scale: 1,
            y: 0,
            transition: { duration: 0.4, ease: 'easeOut' }
        },
        hover: { 
            y: viewMode === 'grid' ? -6 : 0,
            x: viewMode === 'list' ? 4 : 0,
            transition: { duration: 0.2, ease: 'easeOut' }
        }
    };

    // 안전한 날짜 파싱 및 포맷팅
    const safeFormatDate = (dateStr?: string) => {
        if (!dateStr) return 'No Date';
        try {
            const date = parseISO(dateStr);
            if (!isValid(date)) return 'Invalid Date';
            return format(date, 'yyyy.MM.dd');
        } catch (e) {
            return 'Date Error';
        }
    };

    const hasTimeline = travelog.timeline && travelog.timeline.length > 0;
    const formattedDate = hasTimeline ? (
        `${safeFormatDate(travelog.timeline[0].date)} - ${safeFormatDate(travelog.timeline[travelog.timeline.length - 1].date).split('.').slice(1).join('.')}`
    ) : (
        safeFormatDate(travelog.createdAt)
    );

    const totalMembers = (travelog.memberCounts?.me || 0) + 
                         (travelog.memberCounts?.partner || 0) + 
                         (travelog.memberCounts?.family || 0) + 
                         (travelog.memberCounts?.friends || 0);

    // 안전한 클릭 핸들러
    const handleCardClick = () => {
        if (typeof onClick === 'function') {
            onClick(travelog.id);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (typeof onDelete === 'function') {
            onDelete(travelog.id, e);
        }
    };

    if (viewMode === 'list') {
        return (
            <motion.div
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                whileHover="hover"
                onClick={handleCardClick}
                className="group relative flex items-center gap-4 p-3 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 hover:border-primary/30 shadow-sm hover:shadow-lg transition-all cursor-pointer"
            >
                {/* Thumbnail */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[20px] overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-800 relative">
                    {travelog.coverImageUrl ? (
                        <img 
                            src={travelog.coverImageUrl} 
                            alt={travelog.title} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
                            <span className="material-symbols-rounded text-slate-400 text-xl">image</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/5" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[8px] font-black rounded uppercase tracking-wider">
                            {travelog.theme}
                        </span>
                        {travelog.status === 'published' && (
                            <span className="text-primary text-[8px] font-black uppercase flex items-center gap-1">
                                <span className="material-symbols-rounded text-[10px]">public</span>
                                Shared
                            </span>
                        )}
                        {travelog.status === 'draft' && (
                            <span className="text-slate-400 text-[8px] font-black uppercase flex items-center gap-1">
                                <span className="material-symbols-rounded text-[10px]">draft</span>
                                Draft
                            </span>
                        )}
                        <span className={cn(
                            "text-[8px] font-black uppercase flex items-center gap-1 ml-auto px-1.5 py-0.5 rounded-full",
                            travelog.recordingMode === 'simple' 
                                ? "bg-amber-50 text-amber-600 border border-amber-100" 
                                : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                        )}>
                            <span className="material-symbols-rounded text-[10px]">
                                {travelog.recordingMode === 'simple' ? 'timeline' : 'edit_note'}
                            </span>
                            {travelog.recordingMode === 'simple' ? 'Simple' : 'Full'}
                        </span>
                    </div>
                    
                    <h3 className="text-sm font-black text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">
                        {travelog.title || 'Untitled Story'}
                    </h3>
                    
                    <p className="text-[11px] text-slate-400 line-clamp-1 font-medium mb-1.5">
                        {travelog.summary || 'A beautiful journey waiting to be told...'}
                    </p>

                    <div className="flex items-center gap-3 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                        <div className="flex items-center gap-1">
                            <span className="material-symbols-rounded text-[12px]">calendar_month</span>
                            {formattedDate}
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="material-symbols-rounded text-[12px]">group</span>
                            {totalMembers} 명
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 pr-1">
                    <button 
                        onClick={handleDeleteClick}
                        className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                    >
                        <span className="material-symbols-rounded text-base">delete</span>
                    </button>
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:translate-x-1 transition-transform">
                        <span className="material-symbols-rounded text-base">east</span>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            onClick={handleCardClick}
            className="group relative cursor-pointer aspect-[4/5] rounded-[32px] overflow-hidden bg-slate-100 dark:bg-slate-900 shadow-sm hover:shadow-xl transition-all border border-transparent hover:border-white/20"
        >
            {/* Background Image with Overlay */}
            <div className="absolute inset-0">
                {travelog.coverImageUrl ? (
                    <img 
                        src={travelog.coverImageUrl} 
                        alt={travelog.title} 
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent transition-opacity group-hover:opacity-90" />
            </div>

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 bg-white/10 backdrop-blur-md border border-white/20 text-white text-[9px] font-black rounded-full uppercase tracking-wider">
                    {travelog.theme}
                </span>
                {travelog.status === 'published' && (
                    <span className="px-2 py-0.5 bg-primary text-white text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-rounded text-[11px]">public</span>
                        Shared
                    </span>
                )}
                <span className={cn(
                    "px-2 py-0.5 backdrop-blur-md border text-[9px] font-black rounded-full uppercase tracking-wider flex items-center gap-1",
                    travelog.recordingMode === 'simple' 
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/30" 
                        : "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                )}>
                    <span className="material-symbols-rounded text-[11px]">
                        {travelog.recordingMode === 'simple' ? 'timeline' : 'edit_note'}
                    </span>
                    {travelog.recordingMode === 'simple' ? 'Simple' : 'Full'}
                </span>
            </div>

            {/* Quick Delete Action */}
            <div className="absolute top-4 right-4 z-20">
                <button 
                    onClick={handleDeleteClick}
                    className="w-7 h-7 rounded-full bg-black/20 hover:bg-rose-500 backdrop-blur-md border border-white/10 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-90"
                    title="기록 삭제"
                >
                    <span className="material-symbols-rounded text-sm">delete</span>
                </button>
            </div>

            {/* Content Container */}
            <div className="absolute inset-x-0 bottom-0 p-5 flex flex-col gap-2">
                {/* Meta Info */}
                <div className="flex items-center gap-2 text-white/60 text-[9px] font-black uppercase tracking-tighter">
                    <span className="material-symbols-rounded text-[11px]">calendar_month</span>
                    {formattedDate}
                    <span className="mx-0.5 opacity-30">•</span>
                    <span className="material-symbols-rounded text-[11px]">group</span>
                    {totalMembers}명
                </div>

                <h2 className="text-lg font-black text-white leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                    {travelog.title || 'Untitled Story'}
                </h2>

                <p className="text-[11px] text-white/50 line-clamp-2 font-medium">
                    {travelog.summary || 'A beautiful journey waiting to be told...'}
                </p>

                {/* Footer Interaction */}
                <div className="mt-2 pt-3 border-t border-white/10 flex items-center justify-between">
                    <div className="flex -space-x-1.5">
                        <div className="w-5 h-5 rounded-full bg-primary/20 backdrop-blur-md border border-white/20 flex items-center justify-center">
                            <span className="material-symbols-rounded text-white text-[9px]">person</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 text-white font-black text-[10px] uppercase group-hover:translate-x-1 transition-transform tracking-tight">
                        Explore
                        <span className="material-symbols-rounded text-xs">east</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
