"use client";

import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { DESIGN_TOKENS } from '../styles/tokens';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';
  className?: string;
  closeOnBackdrop?: boolean;
}

const MAX_WIDTH_MAP: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  full: 'max-w-full m-4',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  maxWidth = 'md',
  className = '',
  closeOnBackdrop = true,
}) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const maxWidthClass = MAX_WIDTH_MAP[maxWidth] || MAX_WIDTH_MAP.md;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: DESIGN_TOKENS.zIndex.modal }}
    >
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 ${DESIGN_TOKENS.modal.backdrop} transition-opacity`}
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      {/* Modal Dialog */}
      <div 
        className={`relative w-full ${maxWidthClass} ${DESIGN_TOKENS.modal.radius} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 ${DESIGN_TOKENS.modal.shadow} overflow-hidden flex flex-col max-h-[90dvh] z-10 animate-in fade-in zoom-in-95 duration-150 ${className}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        {(title || icon) && (
          <header className={`h-14 px-5 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between shrink-0`}>
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              {icon && <div className="text-primary shrink-0 flex items-center">{icon}</div>}
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">
                  {title}
                </h3>
                {description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {description}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </header>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 text-slate-700 dark:text-slate-300">
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <footer className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end gap-2 shrink-0">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
};
