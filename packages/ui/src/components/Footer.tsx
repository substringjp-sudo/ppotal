import React from 'react';
import { Plane, Train, Map, Sun, ShieldCheck, Mail, ChevronRight } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="w-full border-t border-white/10 bg-slate-950/80 backdrop-blur-xl text-slate-300 text-sm py-16 px-6 relative z-10">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
        
        {/* Col 1: Brand & Description */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-emerald-400 rounded-lg flex items-center justify-center shadow-lg shadow-sky-500/20 transform -rotate-6">
              <Plane className="text-white w-4 h-4 transform -rotate-45" />
            </div>
            <span className="font-heading text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              PPLANER
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            차세대 통합 여행 포털 PPLANER. 일본 철도망 고정밀 시각화, 세계 행정구역 방문 등급 시스템, 대기 산란 노을 예보 및 스마트 AI 일정 플래닝을 통합 제공합니다.
          </p>
          <div className="pt-2 text-xs text-slate-400 flex items-center gap-2">
            <Mail size={14} className="text-sky-400" />
            <span>운영 이메일:</span>
            <a href="mailto:contact@pplaner.com" className="text-sky-400 font-semibold hover:underline">contact@pplaner.com</a>
          </div>
        </div>

        {/* Col 2: Services */}
        <div className="space-y-4">
          <h4 className="text-white font-bold text-sm tracking-wide font-heading border-b border-white/10 pb-2">
            통합 서비스 (Services)
          </h4>
          <ul className="space-y-3 text-xs">
            <li>
              <a href="https://jprail.pplaner.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-400 hover:text-sky-400 transition-colors group">
                <Train size={14} className="text-sky-500 group-hover:scale-110 transition-transform" />
                <span>JapanRailNote (일본 철도)</span>
              </a>
            </li>
            <li>
              <a href="https://rgnevel.pplaner.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors group">
                <Map size={14} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                <span>Regionevel (세계 여행 등급)</span>
              </a>
            </li>
            <li>
              <a href="https://bglow.pplaner.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-400 hover:text-orange-400 transition-colors group">
                <Sun size={14} className="text-orange-500 group-hover:scale-110 transition-transform" />
                <span>BeforeGlow (노을 예측)</span>
              </a>
            </li>
            <li>
              <a href="https://app.pplaner.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-400 hover:text-purple-400 transition-colors group">
                <Plane size={14} className="text-purple-500 group-hover:scale-110 transition-transform" />
                <span>PPLANER AI 일정 플래너</span>
              </a>
            </li>
          </ul>
        </div>

        {/* Col 3: Guides */}
        <div className="space-y-4">
          <h4 className="text-white font-bold text-sm tracking-wide font-heading border-b border-white/10 pb-2">
            여행 가이드 (Knowledge Hub)
          </h4>
          <ul className="space-y-2.5 text-xs">
            <li>
              <a href="/guides" className="text-slate-400 hover:text-sky-400 transition-colors flex items-center gap-1">
                <ChevronRight size={12} className="text-sky-400" /> 가이드 센터 메인
              </a>
            </li>
            <li>
              <a href="/guides/japan-rail" className="text-slate-400 hover:text-sky-400 transition-colors flex items-center gap-1">
                <ChevronRight size={12} className="text-sky-400" /> 일본 철도망 완전 가이드
              </a>
            </li>
            <li>
              <a href="/guides/world-travel-log" className="text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1">
                <ChevronRight size={12} className="text-emerald-400" /> 세계 여행 기록·RATE·EXP 등급
              </a>
            </li>
            <li>
              <a href="/guides/regionevel" className="text-slate-400 hover:text-teal-400 transition-colors flex items-center gap-1">
                <ChevronRight size={12} className="text-teal-400" /> Regionevel 행정구역 탐험 가이드
              </a>
            </li>
            <li>
              <a href="/guides/beforeglow" className="text-slate-400 hover:text-orange-400 transition-colors flex items-center gap-1">
                <ChevronRight size={12} className="text-orange-400" /> BeforeGlow 노을 예측 및 촬영 가이드
              </a>
            </li>
            <li>
              <a href="/guides/trip-planning" className="text-slate-400 hover:text-purple-400 transition-colors flex items-center gap-1">
                <ChevronRight size={12} className="text-purple-400" /> 스마트 여행 계획 및 동행 수칙
              </a>
            </li>
            <li>
              <a href="/guides/jr-pass" className="text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1">
                <ChevronRight size={12} className="text-amber-400" /> JR 패스 전국권 vs 지역 패스
              </a>
            </li>
            <li>
              <a href="/guides/shinkansen" className="text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1">
                <ChevronRight size={12} className="text-rose-400" /> 일본 신칸센 노선 및 예약 팁
              </a>
            </li>
          </ul>
        </div>

        {/* Col 4: Legal & Info */}
        <div className="space-y-4">
          <h4 className="text-white font-bold text-sm tracking-wide font-heading border-b border-white/10 pb-2">
            정보 및 약관 (Legal Info)
          </h4>
          <ul className="space-y-2.5 text-xs">
            <li>
              <a href="/about" className="text-slate-400 hover:text-sky-400 transition-colors">서비스 소개 (About Us)</a>
            </li>
            <li>
              <a href="/contact" className="text-slate-400 hover:text-sky-400 transition-colors">고객 문의 & FAQ (Contact)</a>
            </li>
            <li>
              <a href="/privacy" className="text-sky-400 font-semibold hover:underline flex items-center gap-1">
                <ShieldCheck size={14} /> 개인정보처리방침 (Privacy Policy)
              </a>
            </li>
            <li>
              <a href="/terms" className="text-slate-400 hover:text-sky-400 transition-colors">이용약관 (Terms of Service)</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-6xl mx-auto border-t border-white/10 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <p>© 2026 PPLANER. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <a href="/privacy" className="hover:text-slate-300 transition-colors">개인정보처리방침</a>
          <span>·</span>
          <a href="/terms" className="hover:text-slate-300 transition-colors">이용약관</a>
          <span>·</span>
          <a href="/contact" className="hover:text-slate-300 transition-colors">문의처</a>
        </div>
      </div>
    </footer>
  );
};
