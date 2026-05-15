'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWizardStore, WizardStep } from '@pplaner/shared';
import { useTripStore } from '@pplaner/shared';
import { useTravelogStore } from '@pplaner/shared';
import { useUserStore } from '@pplaner/shared';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import DatesStep from './steps/DatesStep';
import LocationStep from './steps/LocationStep';
import PreferencesStep from './steps/PreferencesStep';
import ReviewStep from './steps/ReviewStep';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export default function WizardModal() {
    const wizardState = useWizardStore();
    const { isOpen, close, currentStep, steps, next, prev, mode } = wizardState;
    const { createTrip } = useTripStore();
    const { createTravelog } = useTravelogStore();
    const { profile } = useUserStore();
    const { user } = useAuth();
    const router = useRouter();
    const [isCreating, setIsCreating] = useState(false);
    const [direction, setDirection] = useState(0); // 1 for next, -1 for prev
    const titleRef = useRef<HTMLHeadingElement>(null);

    // ESC 키로 닫기
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) close();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, close]);

    // 모달 열릴 때 제목으로 포커스 이동 (스크린 리더 지원)
    useEffect(() => {
        if (isOpen && titleRef.current) {
            titleRef.current.focus();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const currentIndex = steps.indexOf(currentStep);
    const progress = ((currentIndex + 1) / steps.length) * 100;

    const renderStep = () => {
        switch (currentStep) {
            case 'DATES': return <DatesStep />;
            case 'LOCATION': return <LocationStep />;
            case 'PREFERENCES': return <PreferencesStep />;
            case 'REVIEW': return <ReviewStep />;
            default: return null;
        }
    };

    const getStepTitle = (step: WizardStep) => {
        switch (step) {
            case 'DATES': return '날짜 정하기';
            case 'LOCATION': return '지역 고르기';
            case 'PREFERENCES': return '여행의 취향';
            case 'REVIEW': return '최종 정리';
        }
    };

    const getLoadingTitle = () => {
        return mode === 'PLAN' 
            ? '새 여행 계획을 세우는 중이에요' 
            : '새 여행 노트를 펼치는 중이에요';
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={close}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="relative w-full sm:max-w-4xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]"
                role="dialog"
                aria-modal="true"
                aria-labelledby="wizard-title"
            >
                {/* Header */}
                <div className="px-4 pt-5 pb-3 sm:px-8 sm:pt-8 sm:pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-primary text-xs font-black uppercase tracking-widest mb-1">
                                {currentIndex + 1}단계 / {steps.length}
                            </p>
                            <h3 
                                id="wizard-title"
                                ref={titleRef}
                                tabIndex={-1}
                                className="text-2xl font-black text-slate-900 dark:text-white outline-none"
                            >
                                {getStepTitle(currentStep)}
                            </h3>
                        </div>
                        <button 
                            onClick={close} 
                            aria-label="위저드 닫기"
                            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <span className="material-symbols-rounded">close</span>
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div 
                        className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"
                        role="progressbar"
                        aria-valuenow={Math.round(progress)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`진행 상황: ${currentIndex + 1}단계 중 ${steps.length}단계`}
                    >
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-primary"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 relative">
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={currentStep}
                            custom={direction}
                            variants={{
                                enter: (direction: number) => ({
                                    x: direction > 0 ? 50 : -50,
                                    opacity: 0,
                                    scale: 0.98
                                }),
                                center: {
                                    zIndex: 1,
                                    x: 0,
                                    opacity: 1,
                                    scale: 1
                                },
                                exit: (direction: number) => ({
                                    zIndex: 0,
                                    x: direction < 0 ? 50 : -50,
                                    opacity: 0,
                                    scale: 0.98
                                })
                            }}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{
                                x: { type: "spring", stiffness: 300, damping: 30 },
                                opacity: { duration: 0.2 },
                                scale: { duration: 0.2 }
                            }}
                        >
                            {renderStep()}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="px-4 py-4 sm:px-8 sm:py-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                    <motion.button
                        whileHover={{ x: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                            setDirection(-1);
                            prev();
                        }}
                        disabled={currentIndex === 0 || isCreating}
                        aria-label="이전 단계로 이동"
                        className={cn(
                            "px-6 py-3 rounded-xl text-sm font-bold transition-all",
                            (currentIndex === 0 || isCreating)
                                ? "text-slate-300 dark:text-slate-600 cursor-not-allowed"
                                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                        )}
                    >
                        이전으로
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={async () => {
                            if (currentIndex === steps.length - 1) {
                                // 마지막 단계: 여행 생성 및 모달 닫기
                                setIsCreating(true);
                                try {
                                    // 애니메이션을 위해 최소 2초 대기 (데이터 처리 느낌)
                                    const [targetId] = await Promise.all([
                                        mode === 'PLAN' 
                                            ? createTrip(wizardState, user?.uid, profile)
                                            : createTravelog(wizardState, user?.uid, profile),
                                        new Promise(resolve => setTimeout(resolve, 3500))
                                    ]);

                                    if (targetId) {
                                        // 애니메이션 종료 후 전환
                                        const path = mode === 'PLAN' 
                                            ? `/dashboard/${targetId}`
                                            : `/travelogs/${targetId}`;
                                        
                                        router.push(path);
                                        // 페이지 전환 후 약간의 딜레이를 두고 닫아서 부드럽게 (혹은 즉시 닫기)
                                        setTimeout(() => {
                                            close();
                                            setIsCreating(false);
                                        }, 500);
                                    } else {
                                        console.error(`Failed to get ID from ${mode === 'PLAN' ? 'createTrip' : 'createTravelog'}`);
                                        setIsCreating(false);
                                    }
                                } catch (error) {
                                    console.error("Failed to create trip:", error);
                                    setIsCreating(false);
                                }
                            } else {
                                setDirection(1);
                                next();
                            }
                        }}
                        disabled={isCreating}
                        className={cn(
                            "px-10 py-3 bg-primary text-white text-sm font-black rounded-xl transition-all shadow-lg overflow-hidden relative group",
                            "hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0",
                            isCreating && "opacity-100 cursor-wait pointer-events-none bg-stone-800"
                        )}
                    >
                        <AnimatePresence mode="wait">
                            {isCreating ? (
                                <motion.div
                                    key="creating"
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="flex items-center gap-2"
                                >
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>준비 중...</span>
                                </motion.div>
                            ) : (
                                <motion.span
                                    key="normal"
                                    initial={{ y: -20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                >
                                    {currentIndex === steps.length - 1 ? '노트 시작하기' : '다음 단계'}
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </motion.button>
                </div>
            </motion.div>

            {/* Full-screen Loading Animation Overlay */}
            <AnimatePresence>
                {isCreating && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] bg-stone-900 flex flex-col items-center justify-center p-8 overflow-hidden"
                    >
                        {/* 따뜻한 배경 그라디언트 */}
                        <div className="absolute inset-0 opacity-30 pointer-events-none">
                            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
                            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-amber-700/10 rounded-full blur-3xl" />
                        </div>

                        {/* 노트북 아이콘 애니메이션 */}
                        <motion.div
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            className="relative mb-10"
                        >
                            <div className="w-28 h-28 bg-stone-800 border border-stone-700 rounded-3xl flex items-center justify-center shadow-2xl">
                                <span className="material-symbols-rounded text-6xl text-primary/80">book_2</span>
                            </div>
                            {/* 반짝이는 점 */}
                            <motion.div
                                animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8] }}
                                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full"
                            />
                        </motion.div>

                        {/* 메시지 */}
                        <div className="text-center relative z-10 max-w-xs">
                            <h2 className="text-xl font-black text-white mb-3 tracking-tight">
                                {getLoadingTitle()}
                            </h2>
                            <LoadingMessage messages={[
                                "새 노트를 꺼내는 중...",
                                "첫 페이지를 펼쳤어요",
                                "표지를 만들고 있어요...",
                                "이제 하나씩 채워나갈 차례예요 ✓",
                            ]} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function LoadingMessage({ messages }: { messages: string[] }) {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % messages.length);
        }, 800);
        return () => clearInterval(interval);
    }, [messages.length]);

    return (
        <AnimatePresence mode="wait">
            <motion.p
                key={index}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-primary font-bold text-sm h-5"
            >
                {messages[index]}
            </motion.p>
        </AnimatePresence>
    );
}
