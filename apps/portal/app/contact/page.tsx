import React from 'react';
import { constructMetadata } from '@ppotal/ui';
import { Mail, HelpCircle, Send, MessageSquare, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';

export const metadata = constructMetadata({
  title: '고객 문의 & 지원 센터 - PPLANER Contact',
  description: 'PPLANER 서비스 관련 제휴 문의, 오류 제보, 계정 관련 질문을 남겨주시면 빠르게 답변해 드립니다.',
  url: 'https://www.pplaner.com/contact',
});

const faqs = [
  {
    q: 'PPLANER의 서브 서비스(JapanRailNote, Regionevel)는 별도 회원가입이 필요한가요?',
    a: '아니요. PPLANER의 통합 구글/이메일 계정 1개로 모든 서브도메인 서비스(jprail, rgnevel, bglow)에 동일하게 로그인하여 데이터를 동기화할 수 있습니다.',
  },
  {
    q: '철도 노선 완승률이나 행정구역 데이터 오류는 어디로 신고하나요?',
    a: '운영 이메일(contact@pplaner.com)로 노선명, 역명 또는 지자체 명칭과 함께 화면 스크린샷을 보내주시면 개발팀에서 24시간 이내에 검토 후 데이터베이스를 업데이트합니다.',
  },
  {
    q: '기업/광고 제휴 문의는 어떻게 진행되나요?',
    a: '이메일 제목에 [제휴문의] 말머리를 포함하여 성함, 소속, 제휴 내용안을 전송해주시면 담당자 검토 후 회신해 드립니다.',
  },
];

export default function ContactPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-[32px] p-8 sm:p-14 border border-white/10 bg-slate-900/60 backdrop-blur-2xl shadow-2xl text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sky-400 text-xs font-bold tracking-wider uppercase backdrop-blur-md">
          <Mail size={14} /> CONTACT & SUPPORT
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-heading text-white max-w-3xl mx-auto leading-tight">
          PPLANER 고객 지원 센터
        </h1>

        <p className="text-slate-300 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
          서비스 이용 중 궁금하신 점이나 오류 제보, 광고 제휴 제안을 보내주세요.
        </p>
      </div>

      {/* Main Email Card */}
      <div className="rounded-[32px] p-8 sm:p-12 border border-sky-500/30 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-blue-950/80 backdrop-blur-xl shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center mx-auto shadow-xl shadow-sky-500/20">
          <Send size={28} />
        </div>

        <div>
          <span className="text-xs text-sky-400 font-bold uppercase tracking-wider">공식 서비스 문의 이메일</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-heading mt-1">
            contact@pplaner.com
          </h2>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
          평일 영업일 기준 24시간 이내에 담당자가 메시지를 직접 확인하고 회신해 드립니다.
        </p>

        <div className="pt-2">
          <a
            href="mailto:contact@pplaner.com"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-sm transition-all shadow-xl shadow-sky-500/25 transform hover:scale-105"
          >
            이메일 작성하기 <Send size={16} />
          </a>
        </div>
      </div>

      {/* FAQs Section */}
      <div className="rounded-[32px] p-8 sm:p-12 border border-white/10 bg-slate-900/40 backdrop-blur-xl space-y-6 text-slate-200">
        <h2 className="text-2xl font-extrabold text-white font-heading flex items-center gap-3 border-b border-white/10 pb-4">
          <HelpCircle className="text-sky-400" size={24} /> 자주 묻는 질문 (FAQ)
        </h2>

        <div className="space-y-4 pt-2">
          {faqs.map((item, idx) => (
            <div key={idx} className="bg-slate-950/60 p-6 rounded-2xl border border-white/10 space-y-2">
              <h3 className="font-extrabold text-white text-base flex items-start gap-2">
                <span className="text-sky-400 font-black">Q.</span> {item.q}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pl-6">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </div>

    </main>
  );
}
