'use client';

import { useAuth } from '@/hooks/useAuth';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import LandingShowcase from './LandingShowcase';
import LandingFeaturesDetailed from './LandingFeaturesDetailed';
import { ChevronRight, Play, Sparkles, Globe2, ShieldCheck, Smartphone } from 'lucide-react';

export default function LandingHero() {
  const { loginWithGoogle } = useAuth();
  const targetRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <div className="bg-white dark:bg-slate-950">
      <main>
        {/* --- Hero Section --- */}
        <section ref={targetRef} className="relative min-h-[90vh] flex items-center overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-20 left-10 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] animate-pulse delay-1000" />
            </div>

            <div className="max-w-7xl mx-auto px-4 lg:px-20 relative z-10 py-20">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                    <motion.div style={{ opacity }}>
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-xs font-black uppercase tracking-[0.2em] mb-10 shadow-xl"
                        >
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            Next-Gen Smart Planner
                        </motion.div>
                        
                        <motion.h1 
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-7xl lg:text-[100px] font-black text-slate-900 dark:text-white leading-[0.95] tracking-tighter mb-10"
                        >
                            꿈꾸던 여행,<br />
                            <span className="text-primary italic">PPLANER</span>로<br />
                            <span className="relative">
                                현실이 됩니다.
                                <svg className="absolute -bottom-2 left-0 w-full h-4 text-primary/20" viewBox="0 0 100 10" preserveAspectRatio="none">
                                    <path d="M0,5 Q25,0 50,5 T100,5" stroke="currentColor" strokeWidth="8" fill="none" />
                                </svg>
                            </span>
                        </motion.h1>

                        <motion.p 
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 0.8, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-xl text-slate-500 font-bold mb-14 max-w-lg leading-relaxed"
                        >
                            단순한 기록을 넘어, 스마트 검증 시스템이 찾아내는<br />
                            완벽한 일정과 안정적인 예산 관리를 경험해보세요.
                        </motion.p>
                        
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex flex-wrap gap-5"
                        >
                            <button
                                onClick={loginWithGoogle}
                                className="group relative px-10 py-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-lg font-black rounded-[2rem] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4 border-2 border-transparent hover:border-primary"
                            >
                                <span className="material-symbols-rounded font-black bg-primary text-white p-2 rounded-xl">bolt</span>
                                Google로 5초 만에 시작
                                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button
                                onClick={() => document.getElementById('showcase')?.scrollIntoView({ behavior: 'smooth' })}
                                className="px-10 py-6 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-lg font-black rounded-[2rem] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-3"
                            >
                                <Play className="w-5 h-5 fill-current" />
                                실제 사용 화면 보기
                            </button>
                        </motion.div>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, ease: "circOut" }}
                        style={{ y }}
                        className="relative"
                    >
                        {/* Featured Image with Premium Glassmorphism UI overlap */}
                        <div className="relative aspect-[4/5] rounded-[80px] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] ring-1 ring-white/20">
                            <img 
                                src="https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=1200" 
                                alt="Paris Travel" 
                                className="w-full h-full object-cover scale-110 hover:scale-100 transition-transform duration-[3s]" 
                            />
                            
                            {/* Floating UI Mockups */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            
                            <motion.div 
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 4, repeat: Infinity }}
                                className="absolute top-20 -left-10 p-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                                        <ShieldCheck className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400">LOGISTICS CHECK</p>
                                        <p className="text-sm font-black dark:text-white">모든 일정이 완벽합니다</p>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div 
                                animate={{ y: [0, 10, 0] }}
                                transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                                className="absolute bottom-20 -right-8 p-6 bg-primary text-white rounded-[2.5rem] shadow-2xl"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Total Budget</p>
                                        <p className="text-xl font-black">€1,450.00</p>
                                    </div>
                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                        <Globe2 className="w-6 h-6" />
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>

        {/* --- UX Showcase Section --- */}
        <div id="showcase">
            <LandingShowcase />
        </div>

        {/* --- Multi-Platform Content --- */}
        <section className="py-24 bg-primary text-white overflow-hidden relative">
            <div className="max-w-7xl mx-auto px-4 lg:px-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div className="order-2 lg:order-1">
                    <motion.div 
                        initial={{ rotate: -5, y: 100 }}
                        whileInView={{ rotate: 0, y: 0 }}
                        viewport={{ once: true }}
                        className="relative w-full max-w-[400px] mx-auto"
                    >
                        {/* Simulation of mobile device */}
                        <div className="aspect-[9/19] bg-slate-900 rounded-[3rem] border-8 border-slate-800 shadow-2xl overflow-hidden relative">
                            <div className="absolute top-0 inset-x-0 h-8 bg-slate-800 flex justify-center pt-2">
                                <div className="w-20 h-4 bg-slate-900 rounded-full" />
                            </div>
                            <div className="p-4 pt-12 space-y-4">
                                <div className="w-full h-32 bg-slate-800 rounded-2xl" />
                                <div className="space-y-2">
                                    <div className="w-full h-4 bg-slate-800 rounded" />
                                    <div className="w-3/4 h-4 bg-slate-800 rounded" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="h-20 bg-slate-800 rounded-xl" />
                                    <div className="h-20 bg-slate-800 rounded-xl" />
                                </div>
                            </div>
                            <div className="absolute inset-x-0 bottom-0 h-16 bg-slate-800 flex justify-around items-center px-4">
                                <div className="w-6 h-6 bg-slate-700 rounded-full" />
                                <div className="w-10 h-10 bg-primary/30 rounded-full border-2 border-primary" />
                                <div className="w-6 h-6 bg-slate-700 rounded-full" />
                            </div>
                        </div>
                        {/* Decorative background for mobile */}
                        <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-white/10 rounded-full blur-[100px]" />
                    </motion.div>
                </div>
                <div className="order-1 lg:order-2 space-y-10">
                    <div>
                        <span className="px-4 py-2 bg-white/20 rounded-full text-xs font-black uppercase tracking-widest mb-6 inline-block">Mobile Experience</span>
                        <h2 className="text-4xl lg:text-6xl font-black leading-tight mb-8">
                            주머니 속의<br />전문 가이드
                        </h2>
                        <p className="text-xl font-bold opacity-80 leading-relaxed">
                            데스크톱의 강력함과 모바일 브라우저의 기동성을 동시에.<br />
                            이동 중에도, 장소에 구애받지 않고 당신의 일정은<br />
                            지갑보다 더 가까운 곳에 있습니다.
                        </p>
                    </div>
                    <div className="flex gap-10">
                        <div className="space-y-2">
                            <p className="text-4xl font-black">100%</p>
                            <p className="text-xs font-bold uppercase tracking-widest opacity-60">실시간 동기화</p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-4xl font-black">Zero</p>
                            <p className="text-xs font-bold uppercase tracking-widest opacity-60">데이터 분실</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* --- Detailed Features Grid --- */}
        <LandingFeaturesDetailed />

        {/* --- CTA Section --- */}
        <section className="py-40 bg-white dark:bg-slate-950 relative overflow-hidden">
            <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-5xl lg:text-7xl font-black text-slate-900 dark:text-white mb-10 leading-none">
                        이제 당신의 차례입니다.
                    </h2>
                    <p className="text-2xl text-slate-500 font-bold mb-16 max-w-2xl mx-auto">
                        더 스마트한 여행을 위한 첫걸음,<br />
                        PPLANER와 함께 지금 시작하세요.
                    </p>
                    <button
                        onClick={loginWithGoogle}
                        className="px-16 py-8 bg-primary text-white text-2xl font-black rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(79,70,229,0.5)] hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-4"
                    >
                        <span className="material-symbols-rounded font-black text-3xl">edit_note</span>
                        지금 바로 무료로 시작하기
                    </button>
                    <p className="mt-8 text-slate-400 font-bold text-sm">카드 등록 불필요 • 5초 소요</p>
                </motion.div>
            </div>
            
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-1/3 h-full bg-slate-50 dark:bg-slate-900/40 -z-0 skew-x-12 translate-x-1/2" />
        </section>
      </main>
    </div>
  );
}

