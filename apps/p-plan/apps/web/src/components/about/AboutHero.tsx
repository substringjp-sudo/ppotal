'use client';

import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { ChevronRight, Sparkles, ShieldAlert, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import AboutShowcase from './AboutShowcase';
import AboutFeatures from './AboutFeatures';

export default function AboutHero() {
  const { loginWithGoogle } = useAuth();

  return (
    <div className="bg-white dark:bg-slate-950">
      <main>
        {/* --- Hero Section --- */}
        <section className="relative min-h-[85vh] flex items-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div className="absolute top-20 left-10 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] animate-pulse delay-1000" />
          </div>

          <div className="max-w-7xl mx-auto px-4 lg:px-20 relative z-10 py-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-xs font-black uppercase tracking-[0.2em] mb-10 shadow-xl"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  로그인 없는 여행 계획 점검
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-6xl lg:text-[84px] font-black text-slate-900 dark:text-white leading-[0.98] tracking-tighter mb-10"
                >
                  여행 계획,<br />
                  <span className="text-primary italic">먼저 확인</span>하고<br />
                  <span className="relative">
                    나중에 저장하세요.
                    <svg className="absolute -bottom-2 left-0 w-full h-4 text-primary/20" viewBox="0 0 100 10" preserveAspectRatio="none">
                      <path d="M0,5 Q25,0 50,5 T100,5" stroke="currentColor" strokeWidth="8" fill="none" />
                    </svg>
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 0.8, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-xl text-slate-500 font-bold mb-10 max-w-lg leading-relaxed"
                >
                  일정 겹침·무리한 동선·놓친 준비물을 앱이 자동으로 찾아드려요.<br />
                  로그인 없이 지금 바로 만들고, 마음에 들면 계정에 저장하세요.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-wrap gap-4"
                >
                  <Link
                    href="/"
                    className="group relative px-8 py-5 bg-primary text-white text-lg font-black rounded-[2rem] shadow-[0_20px_50px_-15px_rgba(79,70,229,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 border-2 border-transparent"
                  >
                    <span className="material-symbols-rounded font-black bg-white/20 text-white p-2 rounded-xl">edit_note</span>
                    로그인 없이 바로 시작하기
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <button
                    onClick={loginWithGoogle}
                    className="px-8 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-lg font-black rounded-[2rem] shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 border-2 border-transparent hover:border-primary"
                  >
                    <span className="material-symbols-rounded font-black bg-primary text-white p-2 rounded-xl">bolt</span>
                    Google로 5초 만에 시작
                  </button>
                </motion.div>
                <p className="mt-6 text-sm text-slate-400 font-bold">
                  저장 없이도 전체 기능을 체험할 수 있어요 · 로그인하면 자동으로 클라우드에 보관돼요
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: 'circOut' }}
                className="relative"
              >
                <div className="relative aspect-[4/5] rounded-[64px] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] ring-1 ring-slate-200 dark:ring-white/10 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-10">
                  <div className="w-full space-y-5">
                    <div className="rounded-3xl bg-white dark:bg-slate-900 p-5 shadow-lg border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Day 1 · 08:00-13:00</p>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 mb-2 relative overflow-hidden">
                        <div className="absolute inset-y-0 left-[20%] w-[35%] bg-primary/70 rounded-full" />
                        <div className="absolute inset-y-0 left-[45%] w-[30%] bg-red-400 rounded-full" />
                      </div>
                      <p className="text-xs text-slate-400 font-semibold">센소지 10:00–11:30 · 스카이트리 11:00–12:30</p>
                    </div>

                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="p-5 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-red-100 dark:border-red-900/30 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white shrink-0">
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">겹치는 일정 발견</p>
                        <p className="text-sm font-black dark:text-white">두 일정이 30분 겹쳐요</p>
                      </div>
                    </motion.div>

                    <motion.div
                      animate={{ y: [0, 8, 0] }}
                      transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                      className="p-5 bg-primary text-white rounded-3xl shadow-2xl flex items-center gap-3"
                    >
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">국가별 입국 요건</p>
                        <p className="text-sm font-black">비자 필요 여부 확인 완료</p>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* --- Interactive Showcase --- */}
        <AboutShowcase />

        {/* --- Detailed Features Grid --- */}
        <AboutFeatures />

        {/* --- CTA Section --- */}
        <section className="py-32 bg-white dark:bg-slate-950 relative overflow-hidden">
          <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-4xl lg:text-6xl font-black text-slate-900 dark:text-white mb-8 leading-none">
                지금 확인해보세요.
              </h2>
              <p className="text-xl text-slate-500 font-bold mb-14 max-w-xl mx-auto">
                로그인 없이 계획을 만들고, 문제가 있는지 바로 확인하세요.<br />
                마음에 들면 그때 로그인해서 이어서 관리하면 됩니다.
              </p>
              <div className="flex flex-wrap justify-center gap-5">
                <Link
                  href="/"
                  className="px-10 py-5 bg-primary text-white text-lg font-black rounded-[2rem] shadow-[0_25px_60px_-15px_rgba(79,70,229,0.5)] hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-3"
                >
                  <span className="material-symbols-rounded font-black text-xl">edit_note</span>
                  로그인 없이 바로 시작하기
                </Link>
                <button
                  onClick={loginWithGoogle}
                  className="px-10 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-lg font-black rounded-[2rem] shadow-xl hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-3"
                >
                  <span className="material-symbols-rounded font-black text-xl">bolt</span>
                  Google로 5초 만에 시작
                </button>
              </div>
            </motion.div>
          </div>
          <div className="absolute top-0 right-0 w-1/3 h-full bg-slate-50 dark:bg-slate-900/40 -z-0 skew-x-12 translate-x-1/2" />
        </section>
      </main>
    </div>
  );
}
