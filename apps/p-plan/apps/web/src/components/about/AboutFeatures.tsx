'use client';

import { motion } from 'framer-motion';
import {
    ShieldAlert, Bed, ClipboardCheck, Globe, Coins,
    CalendarRange, CloudSun, Fingerprint,
} from 'lucide-react';

const DETAILED_FEATURES = [
    {
        icon: <ShieldAlert className="w-6 h-6" />,
        title: '일정 충돌·중복 검증',
        desc: '시간이 겹치는 일정, 무리한 동선, 다른 날 같은 장소를 또 방문하는 중복까지 입력하는 즉시 확인합니다. 여행 타입에 따라 경고 강도가 달라집니다.',
        color: 'text-red-500',
        bg: 'bg-red-50 dark:bg-red-950/30',
    },
    {
        icon: <Bed className="w-6 h-6" />,
        title: '숙소·항공 정합성',
        desc: '숙소가 비는 날, 항공편 도착 시각과 체크인의 충돌, 별도 발권 연결편에서 공항이 바뀌는 셀프환승 위험까지 짚어냅니다.',
        color: 'text-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
        icon: <ClipboardCheck className="w-6 h-6" />,
        title: '예약 완전성',
        desc: '확정 예약에 바우처 정보가 빠졌는지, 예약이 필요한 항목을 놓쳤는지, 예약 시간이 다른 일정과 겹치는지 확인합니다.',
        color: 'text-amber-500',
        bg: 'bg-amber-50 dark:bg-amber-950/30',
    },
    {
        icon: <Fingerprint className="w-6 h-6" />,
        title: '국적 기준 비자·입국 요건',
        desc: '출발국과 도착국을 함께 고려해 무비자·전자여행허가(ETA)·비자 필요 여부를 확인합니다. 불확실한 항목은 보수적으로 안내하고 공식 확인을 권장해요.',
        color: 'text-emerald-500',
        bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
        icon: <Globe className="w-6 h-6" />,
        title: '국가별 준비물 체크리스트',
        desc: '여권 유효기간, 전원 어댑터·전압, 국제운전면허, 여행자보험처럼 목적지마다 달라지는 실무 준비물을 자동으로 계산합니다.',
        color: 'text-teal-500',
        bg: 'bg-teal-50 dark:bg-teal-950/30',
    },
    {
        icon: <CalendarRange className="w-6 h-6" />,
        title: '현지 연휴·혼잡 안내',
        desc: '여행 기간이 현지 공휴일과 겹치면 혼잡 가능성을 안내하고, 숙소가 미확정이면 조기 마감·가격 급등 위험을 강하게 경고합니다.',
        color: 'text-purple-500',
        bg: 'bg-purple-50 dark:bg-purple-950/30',
    },
    {
        icon: <Coins className="w-6 h-6" />,
        title: '예산 이상치·정산',
        desc: '비용 카테고리 공백, 이상치성 지출, 참가자 간 정산 편중처럼 계획 단계에서 놓치기 쉬운 예산 문제를 확인합니다.',
        color: 'text-orange-500',
        bg: 'bg-orange-50 dark:bg-orange-950/30',
    },
    {
        icon: <CloudSun className="w-6 h-6" />,
        title: '무료 실시간 정보',
        desc: '여행지 날씨, 실시간 환율까지 별도 비용이나 로그인 없이 확인할 수 있습니다.',
        color: 'text-sky-500',
        bg: 'bg-sky-50 dark:bg-sky-950/30',
    },
];

export default function AboutFeatures() {
    return (
        <section className="py-24 bg-white dark:bg-slate-950">
            <div className="max-w-7xl mx-auto px-4 lg:px-20">
                <div className="text-center max-w-3xl mx-auto mb-20">
                    <motion.span
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-4 inline-block"
                    >
                        점검 항목 전체 보기
                    </motion.span>
                    <h2 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white leading-tight">
                        여행 준비, 이렇게까지 확인합니다
                    </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {DETAILED_FEATURES.map((f, i) => (
                        <motion.div
                            key={f.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: (i % 4) * 0.08 }}
                            className="p-6 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                        >
                            <div className={`w-12 h-12 rounded-2xl ${f.bg} ${f.color} flex items-center justify-center mb-5`}>
                                {f.icon}
                            </div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white mb-2">{f.title}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
