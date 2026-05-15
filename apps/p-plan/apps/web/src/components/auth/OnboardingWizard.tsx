import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile, TravelStyle } from '@pplaner/shared';
import { updateUserProfile } from '@pplaner/shared';
import { ChevronDown, ChevronUp, Zap, Sparkles, BrainCircuit } from 'lucide-react';

interface OnboardingWizardProps {
    user: { uid: string; displayName: string | null; email: string | null; photoURL: string | null };
    onComplete: () => void;
}

const BASIC_QUESTIONS = [
    {
        id: 'q1',
        category: 'planning',
        question: "여행지에 도착한 첫날, 가장 먼저 하는 것은?",
        options: [
            { label: '미리 예약해둔 식당이나 명소로 이동한다', value: 'planned', weight: 100 },
            { label: '구글맵을 켜고 근처 맛있어 보이는 곳으로 들어간다', value: 'flexible', weight: 0 }
        ]
    },
    {
        id: 'q2',
        category: 'budgetStrategy',
        question: "오랜만에 떠난 여행, 일정의 밀도는?",
        options: [
            { label: '한 곳에서 오래 머물며 현지의 공기를 즐긴다', value: 'value', weight: 0 },
            { label: '최대한 많은 곳을 보고 경험하는 것이 남는 것이다', value: 'luxury', weight: 100 }
        ]
    },
    {
        id: 'q3',
        category: 'crowdPreference',
        question: "맛집을 고를 때 당신의 기준은?",
        options: [
            { label: 'SNS에서 가장 핫하고 세련된 요즘 맛집', value: 'popular', weight: 100 },
            { label: '허름해도 현지인들만 아는 숨겨진 노포', value: 'quiet', weight: 0 }
        ]
    },
    {
        id: 'q4',
        category: 'active',
        question: "활동적인 일정이 끝난 후 저녁 시간은?",
        options: [
            { label: '숙소에서 편안하게 쉬며 에너지를 충전한다', value: 'relaxed', weight: 0 },
            { label: '현지 밤거리나 야경을 보러 다시 밖으로 나간다', value: 'energetic', weight: 100 }
        ]
    }
];

const DETAILED_QUESTIONS = [
    // Planning (4 more)
    { id: 'p1', category: 'planning', question: "이동 수단(기차/버스 등) 예매는?", options: [{ label: '무조건 미리 예매', weight: 100 }, { label: '현장 상황 봐서 발권', weight: 0 }] },
    { id: 'p2', category: 'planning', question: "일정이 예상치 못하게 틀어지면?", options: [{ label: '당황하며 플랜B 가동', weight: 100 }, { label: '오히려 좋아, 이게 여행이지', weight: 0 }] },
    { id: 'p3', category: 'planning', question: "짐 싸기는 언제 시작하시나요?", options: [{ label: '일주일 전 리스트 작성', weight: 100 }, { label: '전날 밤 손에 잡히는 대로', weight: 0 }] },
    { id: 'p4', category: 'planning', question: "지도 앱 저장 핀 개수는?", options: [{ label: '빼곡한 핀으로 가득함', weight: 100 }, { label: '거의 없음', weight: 0 }] },
    
    // Active (4 more)
    { id: 'a1', category: 'active', question: "하루 보행 목표 정하시나요?", options: [{ label: '2만 보 이상 체력 방전까지', weight: 100 }, { label: '발길 닿는 데까지만', weight: 0 }] },
    { id: 'a2', category: 'active', question: "여행 중 아침 기상 시간은?", options: [{ label: '조식 필수, 일찍 시작', weight: 100 }, { label: '늦잠 자고 천천히', weight: 0 }] },
    { id: 'a3', category: 'active', question: "숙소의 중요도는?", options: [{ label: '잠만 자는 공간', weight: 100 }, { label: '숙소에서의 힐링이 중요', weight: 0 }] },
    { id: 'a4', category: 'active', question: "유명한 전망대가 있다면?", options: [{ label: '무조건 끝까지 올라감', weight: 100 }, { label: '아래에서 봐도 충분함', weight: 0 }] },

    // Budget (4 more)
    { id: 'b1', category: 'budgetStrategy', question: "예산 초과 메뉴가 먹고 싶을 때?", options: [{ label: '이번 아니면 언제 먹어? 결제', weight: 100 }, { label: '다른 가성비 맛집을 찾는다', weight: 0 }] },
    { id: 'b2', category: 'budgetStrategy', question: "비행기/기차 좌석 선택 시?", options: [{ label: '추가 비용 내고 편한 좌석', weight: 100 }, { label: '가장 저렴한 좌석', weight: 0 }] },
    { id: 'b3', category: 'budgetStrategy', question: "쇼핑에 대한 태도는?", options: [{ label: '마음에 들면 일단 사고 본다', weight: 100 }, { label: '기념품 한두 개면 충분', weight: 0 }] },
    { id: 'b4', category: 'budgetStrategy', question: "저녁 술자리 선택은?", options: [{ label: '분위기 좋은 루프탑 바', weight: 100 }, { label: '편의점 맥주로 충분', weight: 0 }] },

    // Preference (4 more)
    { id: 'c1', category: 'crowdPreference', question: "인증샷에 대한 진심도는?", options: [{ label: '인생샷 나올 때까지 촬영', weight: 100 }, { label: '사진보다는 눈으로 담기', weight: 0 }] },
    { id: 'c2', category: 'crowdPreference', question: "줄이 긴 유명 핫플을 발견했다면?", options: [{ label: '1시간이라도 기다린다', weight: 100 }, { label: '옆집도 맛있어 보임, 이동', weight: 0 }] },
    { id: 'c3', category: 'crowdPreference', question: "여행지 선호 스타일은?", options: [{ label: '영어가 통하는 현대적 쇼핑몰', weight: 100 }, { label: '말 안 통하는 현지 시장', weight: 0 }] },
    { id: 'c4', category: 'crowdPreference', question: "옷차림 준비 스타일은?", options: [{ label: '핫플용 드레스코드 준비', weight: 100 }, { label: '가장 편한 옷', weight: 0 }] },
];

export default function OnboardingWizard({ user, onComplete }: OnboardingWizardProps) {
    const [step, setStep] = useState(1);
    const [isDetailed, setIsDetailed] = useState(false);
    const [formData, setFormData] = useState<Partial<UserProfile>>({
        displayName: user.displayName || '',
        residence: { country: '', region: '' },
        preferences: { language: 'ko', currency: 'KRW' }
    });

    const [answers, setAnswers] = useState<Record<string, number>>({});

    const handleSaveInfo = async () => {
        setStep(2);
    };

    const calculateResult = () => {
        const categories = ['planning', 'active', 'budgetStrategy', 'crowdPreference'];
        const result: any = {};

        categories.forEach(cat => {
            const catQuestions = [...BASIC_QUESTIONS, ...DETAILED_QUESTIONS].filter(q => q.category === cat);
            const answered = catQuestions.filter(q => answers[q.id] !== undefined);
            if (answered.length === 0) {
                result[cat] = cat === 'planning' ? 'flexible' : (cat === 'active' ? 'relaxed' : (cat === 'budgetStrategy' ? 'value' : 'popular'));
                return;
            }

            const avg = answered.reduce((acc, q) => acc + answers[q.id], 0) / answered.length;
            
            // Map to string literals for shared TravelStyle interface
            if (cat === 'planning') result[cat] = avg > 50 ? 'planned' : 'flexible';
            else if (cat === 'active') result[cat] = avg > 50 ? 'energetic' : 'relaxed';
            else if (cat === 'budgetStrategy') result[cat] = avg > 50 ? 'luxury' : 'value';
            else if (cat === 'crowdPreference') result[cat] = avg > 50 ? 'trendy' : 'local';
            
            // Story metadata to travelStats for finer visualization
            result[`${cat}Score`] = avg;
        });

        return result;
    };

    const handleComplete = async (skipped = false) => {
        try {
            const travelStatsResult = calculateResult();
            const finalData: Partial<UserProfile> = {
                ...formData,
                onboardingCompleted: true,
                travelStyle: travelStatsResult as any, // Simplified for now
                metadata: {
                    travelStats: {
                        ...travelStatsResult,
                        analysisDate: new Date().toISOString(),
                        precision: isDetailed ? 'detailed' : 'basic'
                    }
                },
                updatedAt: new Date().toISOString()
            };

            await updateUserProfile(user.uid, finalData);
            onComplete();
        } catch (error) {
            console.error("Onboarding failed", error);
        }
    };

    const steps = [
        { id: 1, title: '기본 정보 설정', desc: '더 나은 추천을 위해 정보를 입력해주세요.' },
        { id: 2, title: '여행 DNA 분석', desc: '당신은 어떤 스타일의 여행자일까요?' },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl overflow-hidden relative"
            >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100 dark:bg-slate-800">
                    <motion.div 
                        className="h-full bg-primary"
                        animate={{ width: `${(step / steps.length) * 100}%` }}
                    />
                </div>

                <div className="p-8 md:p-12 overflow-y-auto max-h-[90vh] custom-scrollbar">
                    <AnimatePresence mode="wait">
                        {step === 1 ? (
                            <motion.div 
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="text-center">
                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{steps[0].title}</h2>
                                    <p className="text-slate-500 font-medium">{steps[0].desc}</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Name, Country, Language, Currency Inputs (Same as before) */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">이름</label>
                                        <input 
                                            value={formData.displayName}
                                            onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
                                            placeholder="이름을 입력하세요"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">국가</label>
                                        <input 
                                            value={formData.residence?.country}
                                            onChange={(e) => setFormData({...formData, residence: { ...formData.residence!, country: e.target.value }})}
                                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
                                            placeholder="대한민국"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">사용 언어</label>
                                        <select 
                                            value={formData.preferences?.language}
                                            onChange={(e) => setFormData({...formData, preferences: { ...formData.preferences!, language: e.target.value }})}
                                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm appearance-none"
                                        >
                                            <option value="ko">한국어 (Korean)</option>
                                            <option value="en">English</option>
                                            <option value="jp">日本語 (Japanese)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">기본 통화</label>
                                        <select 
                                            value={formData.preferences?.currency}
                                            onChange={(e) => setFormData({...formData, preferences: { ...formData.preferences!, currency: e.target.value }})}
                                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm appearance-none"
                                        >
                                            <option value="KRW">KRW (₩)</option>
                                            <option value="USD">USD ($)</option>
                                            <option value="JPY">JPY (¥)</option>
                                        </select>
                                    </div>
                                </div>

                                <button onClick={handleSaveInfo} className="w-full py-5 bg-primary text-white font-black rounded-3xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mt-8">
                                    다음 단계로
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="text-center">
                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{steps[1].title}</h2>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/5 rounded-full mb-4">
                                        <BrainCircuit className="w-3 h-3 text-primary" />
                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">Precision AI DNA Analysis</p>
                                    </div>
                                    <p className="text-slate-500 font-medium text-xs leading-relaxed max-w-sm mx-auto">
                                        기본 질문으로도 충분하지만, 더 자세한 분석을 통해<br/>완벽하게 일치하는 여행 정보를 추천해 드릴게요.
                                    </p>
                                </div>

                                <div className="space-y-10">
                                    {/* Basic Questions */}
                                    <div className="space-y-6">
                                        {BASIC_QUESTIONS.map((q) => (
                                            <TravelStyleQuestion 
                                                key={q.id}
                                                question={q.question}
                                                options={q.options}
                                                selected={answers[q.id]}
                                                onSelect={(val) => setAnswers(prev => ({ ...prev, [q.id]: val }))}
                                            />
                                        ))}
                                    </div>

                                    {/* Detailed Expandable Section */}
                                    <div className="pt-4">
                                        <button 
                                            onClick={() => setIsDetailed(!isDetailed)}
                                            className={`w-full p-6 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all group ${
                                                isDetailed 
                                                ? 'border-primary bg-primary/5' 
                                                : 'border-slate-200 dark:border-slate-800 hover:border-primary/30 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-xl transition-colors ${isDetailed ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary'}`}>
                                                    <Zap className="w-4 h-4" />
                                                </div>
                                                <div className="text-left">
                                                    <h4 className={`text-sm font-black transition-colors ${isDetailed ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>
                                                        {isDetailed ? '정밀 분석 모드 활성화' : '더 자세하게 확인하기'}
                                                    </h4>
                                                    <p className="text-[10px] font-bold text-slate-400">16개의 추가 질문으로 더욱 정확한 여행 DNA를 분석합니다.</p>
                                                </div>
                                                {isDetailed ? <ChevronUp className="w-5 h-5 text-primary ml-auto" /> : <ChevronDown className="w-5 h-5 text-slate-300 ml-auto" />}
                                            </div>
                                        </button>

                                        <AnimatePresence>
                                            {isDetailed && (
                                                <motion.div 
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pt-8 space-y-10 border-l-2 border-primary/10 ml-6 pl-10 mt-2">
                                                        {DETAILED_QUESTIONS.map((q) => (
                                                            <TravelStyleQuestion 
                                                                key={q.id}
                                                                question={q.question}
                                                                options={q.options}
                                                                selected={answers[q.id]}
                                                                isMinimal
                                                                onSelect={(val) => setAnswers(prev => ({ ...prev, [q.id]: val }))}
                                                            />
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 sticky bottom-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
                                    <button onClick={() => onComplete()} className="flex-1 py-4 text-slate-400 font-black rounded-2xl hover:text-slate-600 dark:hover:text-slate-300 transition-all text-sm">
                                        나중에 하기
                                    </button>
                                    <button 
                                        onClick={() => handleComplete()} 
                                        className="flex-[2] py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        분석 완료
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}

function TravelStyleQuestion({ 
    question, 
    options, 
    selected, 
    onSelect,
    isMinimal = false
}: { 
    question: string; 
    options: any[]; 
    selected?: number; 
    onSelect: (weight: number) => void;
    isMinimal?: boolean;
}) {
    return (
        <div className="space-y-4">
            <h4 className={`${isMinimal ? 'text-xs' : 'text-sm'} font-black text-slate-900 dark:text-white ml-1 flex items-center gap-2`}>
                {isMinimal && <div className="w-1.5 h-1.5 rounded-full bg-primary/30" />}
                {question}
            </h4>
            <div className={`grid ${isMinimal ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                {options.map((opt) => (
                    <button 
                        key={opt.label}
                        onClick={() => onSelect(opt.weight)}
                        className={`p-4 rounded-2xl border-2 text-left transition-all ${
                            selected === opt.weight 
                            ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                            : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-200 dark:hover:border-slate-700'
                        }`}
                    >
                        <p className={`${isMinimal ? 'text-[10px]' : 'text-xs'} font-bold`}>{opt.label}</p>
                    </button>
                ))}
            </div>
        </div>
    );
}
