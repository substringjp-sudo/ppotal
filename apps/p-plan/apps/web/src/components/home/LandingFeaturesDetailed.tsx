'use client';

import { motion } from 'framer-motion';
import { 
    ShieldCheck, Zap, Globe, Coins, 
    Smartphone, Search, Layers, BarChart3,
    Heart, ClipboardCheck, Clock, MapPinned,
    Plane, Bed, CalendarRange
} from 'lucide-react';

const DETAILED_FEATURES = [
    {
        icon: <Plane className="w-6 h-6" />,
        title: '이동수단 예약하기',
        desc: '비행기, 기차, 버스 등 모든 이동수단의 예약 정보를 한곳에 모으세요. 편명, 좌석 번호, 바우처까지 디지털 티켓처럼 관리하고 타임라인에 자동으로 배치합니다.',
        color: 'text-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-950/30'
    },
    {
        icon: <Bed className="w-6 h-6" />,
        title: '숙소 시간표',
        desc: '체크인부터 체크아웃까지, 숙박 기간 전체를 시각화합니다. 단순히 잠자는 곳이 아닌, 여행의 베이스캠프로서 이동 동선과의 정합성을 실시간으로 체크합니다.',
        color: 'text-indigo-500',
        bg: 'bg-indigo-50 dark:bg-indigo-950/30'
    },
    {
        icon: <CalendarRange className="w-6 h-6" />,
        title: '타임라인',
        desc: '시간의 흐름을 간트 차트 형태로 직관적으로 확인하세요. 드래그 앤 드롭으로 일정을 조절하고, 이동 시간과 여유 시간을 한눈에 파악하여 무리 없는 여행을 설계합니다.',
        color: 'text-purple-500',
        bg: 'bg-purple-50 dark:bg-purple-950/30'
    },
    {
        icon: <Globe className="w-6 h-6" />,
        title: '마스터리 글로브',
        desc: '나의 여행 발자취를 3D 지구본 위에 기록합니다. 방문한 국가와 도시의 통계를 확인하고, 나만의 여행 마스터리를 완성해가는 즐거움을 느껴보세요.',
        color: 'text-emerald-500',
        bg: 'bg-emerald-50 dark:bg-emerald-950/30'
    },
    {
        icon: <Heart className="w-6 h-6" />,
        title: '위시리스트',
        desc: '지도 위에서 가고 싶은 곳을 자유롭게 수집하세요. 지역별 필터링을 통해 가고 싶은 장소를 효율적으로 관리하고 실제 여행 계획으로 이어지는 최상의 경험을 제공합니다.',
        color: 'text-rose-500',
        bg: 'bg-rose-50 dark:bg-rose-950/30'
    }
];

export default function LandingFeaturesDetailed() {
    return (
        <section className="py-24 bg-slate-50 dark:bg-slate-900/50">
            <div className="max-w-7xl mx-auto px-4 lg:px-20">
                <div className="text-center max-w-3xl mx-auto mb-20">
                    <motion.span 
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-4 inline-block"
                    >
                        Core Modules
                    </motion.span>
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white leading-tight mb-8"
                    >
                        기록을 넘어,<br />완벽한 설계를 위한 도구
                    </motion.h2>
                    <p className="text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                        PPLANER는 당신의 가장 스마트한 여행 파트너입니다. 단순한 메모장 그 이상의 기능을 통해<br className="hidden md:block" />
                        더욱 꼼꼼하고 편안한 여행을 만들어 드립니다.
                    </p>
                </div>

                <div className="flex flex-wrap justify-center gap-8">
                    {DETAILED_FEATURES.map((feature, idx) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className="group p-10 bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all w-full md:w-[calc(50%-1rem)] lg:w-[calc(33.33%-1.5rem)]"
                        >
                            <div className={`w-14 h-14 ${feature.bg} ${feature.color} rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-4">{feature.title}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                                {feature.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* Extra USP Mini Grid */}
                <div className="mt-20 flex flex-wrap justify-center gap-12">
                    <USPItem icon={<Zap className="w-4 h-4" />} label="직관적인 로케이션 선택" />
                    <USPItem icon={<ShieldCheck className="w-4 h-4" />} label="18종 이상의 스마트 검증" />
                    <USPItem icon={<Smartphone className="w-4 h-4" />} label="완전한 모바일 동기화" />
                    <USPItem icon={<Clock className="w-4 h-4" />} label="5초 만에 완료되는 구글 로그인" />
                </div>
            </div>
        </section>
    );
}

function USPItem({ icon, label }: { icon: any, label: string }) {
    return (
        <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="flex items-center gap-2 text-[11px] font-black text-slate-400 hover:text-primary transition-colors cursor-default"
        >
            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                {icon}
            </div>
            {label}
        </motion.div>
    );
}
