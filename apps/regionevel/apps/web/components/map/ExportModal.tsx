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
  const [xNotice, setXNotice] = useState(false);
  const [postingToX, setPostingToX] = useState(false);
  const [xPostResult, setXPostResult] = useState<{ success: boolean; link?: string; message?: string } | null>(null);

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

  const handleXShare = async () => {
    // 1. Copy image blob to clipboard if supported
    if (imageData) {
      try {
        const response = await fetch(imageData);
        const blob = await response.blob();
        if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([
            new ClipboardItem({ [blob.type || "image/png"]: blob }),
          ]);
        }
      } catch (e) {
        console.warn("Failed to copy image blob to clipboard:", e);
      }
    }

    setXNotice(true);
    setTimeout(() => setXNotice(false), 4500);

    // 2. Open X/Twitter intent composer with text pre-filled
    const intentUrl = `https://x.com/intent/post?text=${encodeURIComponent(summaryText)}`;
    window.open(intentUrl, "_blank", "noopener,noreferrer");
  };

  const handleDirectXPost = async () => {
    setPostingToX(true);
    setXPostResult(null);

    try {
      const { auth } = await import("@ppotal/firebase");
      const { TwitterAuthProvider, signInWithPopup, linkWithPopup } = await import("firebase/auth");

      let accessToken = "";
      let accessSecret = "";

      try {
        const provider = new TwitterAuthProvider();
        let result: any = null;
        if (auth.currentUser) {
          result = await linkWithPopup(auth.currentUser, provider).catch(() => signInWithPopup(auth, provider));
        } else {
          result = await signInWithPopup(auth, provider);
        }
        const credential = TwitterAuthProvider.credentialFromResult(result);
        if (credential) {
          accessToken = (credential as any).accessToken || "";
          accessSecret = (credential as any).secret || "";
        }
      } catch (authErr: any) {
        console.warn("X OAuth Login cancelled or failed:", authErr);
      }

      const res = await fetch("/api/twitter/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: summaryText,
          imageData,
          accessToken,
          accessSecret,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setXPostResult({
          success: true,
          link: data.tweetLink,
          message: "✨ X에 이미지와 글이 자동으로 게시되었습니다!",
        });
      } else {
        if (data.error === "TWITTER_APP_NOT_CONFIGURED" || data.error === "UNAUTHORIZED") {
          setXPostResult({
            success: false,
            message: "💡 X API 키 설정 미완료로 포스팅 창으로 이동합니다! (지도가 클립보드에 복사됨)",
          });
          setTimeout(() => {
            handleXShare();
          }, 1500);
        } else {
          setXPostResult({
            success: false,
            message: `❌ 게시 실패: ${data.message || data.details || "알 수 없는 오류"}`,
          });
        }
      }
    } catch (err: any) {
      console.error("Direct X Post Error:", err);
      setXPostResult({
        success: false,
        message: "❌ X 게시 처리 중 오류가 발생했습니다. 웹 작성 창으로 이동합니다.",
      });
      setTimeout(() => {
        handleXShare();
      }, 1500);
    } finally {
      setPostingToX(false);
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
          {/* Direct X Post Result Notice */}
          {xPostResult && (
            <div className={`text-xs px-4 py-3 rounded-2xl flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2 ${xPostResult.success ? "bg-emerald-600 text-white" : "bg-slate-900 text-amber-200"
              }`}>
              <span className="font-medium">{xPostResult.message}</span>
              {xPostResult.link ? (
                <a
                  href={xPostResult.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-3 px-3 py-1 bg-white text-emerald-800 rounded-xl font-extrabold text-[11px] hover:bg-emerald-50 shrink-0"
                >
                  게시글 보기
                </a>
              ) : (
                <button onClick={() => setXPostResult(null)} className="text-slate-400 hover:text-white ml-2">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* X Share Tip Notice */}
          {xNotice && (
            <div className="bg-slate-900 text-white text-xs px-4 py-2.5 rounded-2xl flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2">
              <span className="font-medium">
                💡 텍스트가 자동 입력되었습니다! 지도를 첨부하려면 X 작성 창에서 <strong>Ctrl+V (붙여넣기)</strong>를 누르세요.
              </span>
              <button onClick={() => setXNotice(false)} className="text-slate-400 hover:text-white ml-2">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

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
        <div className="p-4 sm:p-6 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            닫기
          </button>
          <button
            onClick={handleDirectXPost}
            disabled={postingToX || !imageData}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer"
            title="X(트위터) API를 통해 서버에서 이미지와 글을 직접 게시"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>{postingToX ? "게시 중..." : "X에 직접 게시 (API)"}</span>
          </button>
          <button
            onClick={handleXShare}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer"
            title="X(트위터) 작성 창 열기 (요약 텍스트 자동 입력 & 지도 이미지 복사)"
          >
            <span>X(웹) 작성</span>
          </button>
          <button
            onClick={handleDownload}
            disabled={!imageData}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>이미지 다운로드</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
