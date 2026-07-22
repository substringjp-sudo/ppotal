"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Download, X, Copy, Check, MapPin, Sparkles } from "lucide-react";

export interface ExportModalStats {
  regionName: string;
  pass: number;
  transit: number;
  visit: number;
  stay: number;
  residence: number;
  rate: number;
  exp: number;
  visitedSubRegions: number;
  totalSubRegions: number;
}

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageData: string | null;
  stats: ExportModalStats;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  imageData,
  stats,
}) => {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  // Generate formatted summary text (under 140 characters including URL)
  const line1 = `📍 [${stats.regionName}]`;
  const line2 = `• Pass:${stats.pass} | Trans:${stats.transit} | Visit:${stats.visit} | Stay:${stats.stay} | Res:${stats.residence}`;
  const line3 = `• Rate:${stats.rate}% | EXP:${stats.exp} | 방문:${stats.visitedSubRegions}/${stats.totalSubRegions}`;
  const line4 = `https://rgnevel.pplaner.com`;
  const summaryText = `${line1}\n${line2}\n${line3}\n${line4}`;

  const handleDownload = () => {
    if (!imageData) return;
    const link = document.createElement("a");
    const safeRegionName = stats.regionName.replace(/[/\\?%*:|"<>]/g, "_") || "World";
    link.download = `Regionevel-${safeRegionName}-${new Date().toISOString().split("T")[0]}.png`;
    link.href = imageData;
    link.click();
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200/80 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              지도 이미지 내보내기
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Thumbnail Section */}
          <div className="relative rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 overflow-hidden aspect-video flex items-center justify-center shadow-inner">
            {imageData ? (
              <img
                src={imageData}
                alt={`${stats.regionName} 지도 썸네일`}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <div className="size-8 rounded-full border-2 border-slate-300 border-t-blue-600 animate-spin" />
                <span className="text-xs font-semibold">이미지 생성 중...</span>
              </div>
            )}
            <div className="absolute top-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-slate-600 dark:text-slate-300 shadow-sm border border-slate-200/50 dark:border-slate-800">
              미리보기
            </div>
          </div>

          {/* Stats Text Section (140자 이내) */}
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-blue-500" />
                <span>지역 정보 요약</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400">
                  {summaryText.length}/140자
                </span>
                <button
                  onClick={handleCopyText}
                  className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors px-2 py-0.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/50"
                  title="요약 텍스트 복사"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-500">복사됨</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>복사</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <pre className="text-xs font-mono bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/80 text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap select-all">
              {summaryText}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs md:text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            닫기
          </button>
          <button
            onClick={handleDownload}
            disabled={!imageData}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs md:text-sm font-bold transition-all shadow-md active:scale-98"
          >
            <Download className="w-4 h-4" />
            <span>이미지 다운로드</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
