'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import EventEditorModal from '@/components/edit-trip/EventEditorModal';
import WishlistTimelineDrawer from '@/components/edit-trip/WishlistTimelineDrawer';
import CommentOverlay from '@/components/edit-trip/CommentOverlay';
import { useUIStore } from '@pplaner/shared';
import { TripEvent } from '@pplaner/shared';
import { SOURCE_TO_SECTION_MAP, SectionId } from '@pplaner/shared';
import { WishlistItem } from '@pplaner/shared';

interface EditFloatingActionsProps {
  activeSection: SectionId;
  setActiveSection: (id: SectionId) => void;
  addingCommentToEvent: string | null;
  setAddingCommentToEvent: (id: string | null) => void;
  handleSaveEvent: (eventData: Partial<TripEvent> | Partial<TripEvent>[]) => void;
  handleAddFromWishlist: (item: WishlistItem) => void;
}

export default function EditFloatingActions({
  activeSection,
  setActiveSection,
  addingCommentToEvent,
  setAddingCommentToEvent,
  handleSaveEvent,
  handleAddFromWishlist
}: EditFloatingActionsProps) {
  const { editingEvent, setEditingEvent, isWishlistOpen, setIsWishlistOpen } = useUIStore();

  return (
    <>
      {/* Global Event Editor Modal */}
      <AnimatePresence>
        {editingEvent && (
          <EventEditorModal
            isOpen={!!editingEvent}
            event={editingEvent.event}
            dayIdx={editingEvent.dayIdx}
            onClose={() => setEditingEvent(null)}
            onSave={handleSaveEvent}
            onNavigateToSection={(section) => {
              const sectionId = (SOURCE_TO_SECTION_MAP[section] || 'timeline') as SectionId;
              setActiveSection(sectionId);
              setEditingEvent(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Global Wishlist Floating Button */}
      <div
        className={`fixed bottom-[calc(env(safe-area-inset-bottom,0px)+var(--mobile-section-tab-bar-height,5rem))] sm:bottom-10 right-6 sm:right-10 z-[600] transition-all duration-700 ease-out transform ${
          activeSection === 'timeline' && !isWishlistOpen ? 'translate-y-0 opacity-100 scale-100 rotate-0' : 'translate-y-24 opacity-0 scale-50 rotate-12 pointer-events-none'
        }`}
      >
        <motion.button
          whileHover={{ scale: 1.05, y: -8 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsWishlistOpen(true)}
          className="relative w-16 h-16 flex items-center justify-center text-white group"
        >
          {/* Main Button Body - Glassmorphism + Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-primary to-rose-600 rounded-2xl shadow-[0_20px_50px_rgba(236,91,19,0.3)] group-hover:shadow-[0_25px_60px_rgba(236,91,19,0.4)] transition-all duration-500" />
          <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] rounded-2xl border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* Animated Glow Effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-orange-400 to-rose-400 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
          
          <motion.div
            animate={{ 
              rotate: [0, 5, -5, 0],
              scale: [1, 1.1, 0.9, 1]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity,
              ease: "easeInOut" 
            }}
            className="relative z-10"
          >
            <Sparkles className="w-8 h-8 drop-shadow-[0_2px_8px_rgba(0,0,0,0.2)]" />
          </motion.div>
          
          {/* Tooltip - Premium Style */}
          <div className="absolute bottom-full right-0 mb-6 px-4 py-2 bg-slate-900/90 backdrop-blur-md text-white text-[11px] font-bold rounded-2xl whitespace-nowrap opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 pointer-events-none shadow-2xl border border-white/10 ring-1 ring-black/5">
            <span className="bg-gradient-to-r from-orange-200 to-rose-200 bg-clip-text text-transparent">가고 싶은 곳 확인하기</span>
            {/* Tooltip Arrow */}
            <div className="absolute top-full right-6 w-3 h-3 bg-slate-900/90 rotate-45 -translate-y-1.5 border-r border-b border-white/10" />
          </div>
        </motion.button>
      </div>


      <AnimatePresence>
        {isWishlistOpen && (
          <WishlistTimelineDrawer 
            onClose={() => setIsWishlistOpen(false)}
            onSelectItem={handleAddFromWishlist}
          />
        )}
      </AnimatePresence>

      {/* Comment Overlay */}
      <AnimatePresence>
        {addingCommentToEvent && (
          <CommentOverlay
            targetId={addingCommentToEvent}
            onClose={() => setAddingCommentToEvent(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
