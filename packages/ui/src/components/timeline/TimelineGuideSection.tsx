"use client";

import React, { useState, useEffect } from 'react';
import { ExternalLink, Smartphone, Apple, Monitor, HelpCircle, Lock, ArrowRight, Share2, FileJson, CheckCircle2 } from 'lucide-react';

export type PlatformType = 'android' | 'ios' | 'desktop';

export interface TimelineGuideSectionProps {
  language?: 'ko' | 'ja' | 'en';
  className?: string;
}

export function detectDevicePlatform(): PlatformType {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  if (/android/i.test(ua)) return 'android';
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return 'ios';
  return 'desktop';
}

const OPEN_MAPS_APP_HREF = {
  ios: 'comgooglemaps://',
  android: 'https://www.google.com/maps'
};

export const TimelineGuideSection: React.FC<TimelineGuideSectionProps> = ({
  language = 'ko',
  className = ''
}) => {
  const [platform, setPlatform] = useState<PlatformType>('android');

  // Automatically detect device platform on mount
  useEffect(() => {
    setPlatform(detectDevicePlatform());
  }, []);

  const isKo = language === 'ko';
  const isJa = language === 'ja';

  return (
    <div className={`flex flex-col gap-3.5 ${className}`}>
      {/* Platform Switcher Tabs */}
      <div className="flex p-1 gap-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
        <button
          type="button"
          onClick={() => setPlatform('android')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            platform === 'android'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>안드로이드 (Android)</span>
        </button>

        <button
          type="button"
          onClick={() => setPlatform('ios')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            platform === 'ios'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Apple className="w-3.5 h-3.5" />
          <span>아이폰 (iOS)</span>
        </button>

        <button
          type="button"
          onClick={() => setPlatform('desktop')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            platform === 'desktop'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>PC / 데스크톱</span>
        </button>
      </div>

      {/* Guide Content per Platform */}
      <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 space-y-3.5 animate-in fade-in duration-150">
        {/* 1. Android Guide */}
        {platform === 'android' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-extrabold text-[13px]">
              <span className="size-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px]">
                🤖
              </span>
              <span>안드로이드 (Android 14/15/16 및 최신 기기)</span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              Google 타임라인의 최신 온디바이스(기기 로컬) 정책에 따라 아래 두 가지 경로 중 하나로 데이터를 내보낼 수 있습니다.
            </p>

            <div className="space-y-2 bg-white dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                방법 1 · 스마트폰 기기 설정에서 내보내기 (추천)
              </span>
              <ol className="space-y-1.5 list-decimal list-inside text-slate-700 dark:text-slate-200 font-medium">
                <li>스마트폰 <strong>[설정]</strong> 앱 실행</li>
                <li><strong>[위치]</strong> 선택 ➔ <strong>[위치 서비스]</strong> 터치</li>
                <li><strong>[타임라인]</strong> 선택</li>
                <li>화면 맨 아래 <strong>[타임라인 데이터 내보내기]</strong> 터치 ➔ 파일 저장</li>
              </ol>
            </div>

            <div className="space-y-2 bg-white dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                방법 2 · Google 지도 앱에서 내보내기
              </span>
              <ol className="space-y-1.5 list-decimal list-inside text-slate-700 dark:text-slate-200 font-medium">
                <li><strong>Google 지도 앱</strong> 실행 ➔ 우측 상단 <strong>프로필 사진</strong> 터치</li>
                <li><strong>[내 타임라인]</strong> 선택</li>
                <li>우측 상단 <strong>점 3개 (더보기)</strong> ➔ <strong>[설정 및 개인정보 보호]</strong></li>
                <li><strong>[타임라인 데이터 내보내기]</strong> 터치하여 JSON 파일 저장</li>
              </ol>
            </div>

            <a
              href={OPEN_MAPS_APP_HREF.android}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>Google 지도 앱 열기</span>
            </a>
          </div>
        )}

        {/* 2. iOS Guide */}
        {platform === 'ios' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-extrabold text-[13px]">
              <span className="size-5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center text-[10px]">
                🍎
              </span>
              <span>아이폰 / 아이패드 (iOS)</span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              아이폰의 Google 지도 앱에서 타임라인 데이터를 파일 앱으로 즉시 내보낼 수 있습니다.
            </p>

            <div className="space-y-2 bg-white dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Google 지도 앱에서 파일 내보내기
              </span>
              <ol className="space-y-1.5 list-decimal list-inside text-slate-700 dark:text-slate-200 font-medium">
                <li><strong>Google 지도 앱</strong> 실행 ➔ 우측 상단 <strong>프로필 사진</strong> 터치</li>
                <li><strong>[내 타임라인]</strong> 선택</li>
                <li>우측 상단 <strong>점 3개 (…)</strong> 터치 ➔ <strong>[설정 및 개인정보 보호]</strong></li>
                <li>화면을 내려 <strong>[타임라인 데이터 내보내기]</strong> 터치</li>
                <li>공유 시트에서 <strong>[파일에 저장]</strong> 선택 (iCloud Drive 또는 나의 iPhone)</li>
              </ol>
            </div>

            <a
              href={OPEN_MAPS_APP_HREF.ios}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>Google 지도 앱 열기</span>
            </a>
          </div>
        )}

        {/* 3. Desktop / PC Guide */}
        {platform === 'desktop' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-extrabold text-[13px]">
              <span className="size-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px]">
                💻
              </span>
              <span>PC / 데스크톱 브라우저 사용자</span>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed font-medium">
              <strong>⚠️ 구글 타임라인 정책 안내:</strong><br />
              Google 타임라인 데이터는 기기 보안 정책으로 인해 <strong>모바일 기기에만 암호화되어 로컬 저장</strong>됩니다. PC 웹 브라우저에서는 직접 다운로드할 수 없습니다.
            </div>

            <div className="space-y-2.5 bg-white dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                모바일에서 파일 전송 후 업로드하는 순서
              </span>

              <div className="space-y-2 text-slate-700 dark:text-slate-200 font-medium">
                <div className="flex items-start gap-2">
                  <span className="size-4.5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>스마트폰(Android 또는 iPhone)에서 위 <strong>[안드로이드]</strong> 또는 <strong>[아이폰]</strong> 탭의 안내대로 <strong>타임라인 데이터 내보내기</strong>를 실행합니다.</span>
                </div>

                <div className="flex items-start gap-2">
                  <span className="size-4.5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>스마트폰에 저장된 <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-blue-600 dark:text-blue-400 font-bold">Timeline.json</code> 파일을 <strong>카카오톡(나와의 채팅), Google Drive, AirDrop, 이메일, USB 케이블</strong> 등을 통해 PC로 전송합니다.</span>
                </div>

                <div className="flex items-start gap-2">
                  <span className="size-4.5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>PC로 내려받은 파일을 아래 <strong>[파일 선택]</strong> 또는 <strong>드래그 앤 드롭</strong> 영역에 올려놓으시면 즉시 지도로 분석됩니다.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Note */}
        <p className="flex items-center gap-1.5 text-[10.5px] text-slate-400 dark:text-slate-500 font-medium pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span>업로드한 타임라인 데이터는 서버로 전송되지 않으며 브라우저 내에서만 안전하게 분석됩니다.</span>
        </p>
      </div>
    </div>
  );
};
