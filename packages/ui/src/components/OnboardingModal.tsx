'use client';

import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, Zap, Map as MapIcon, ShieldCheck } from 'lucide-react';

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  appName: string;
  steps: OnboardingStep[];
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ 
  isOpen, 
  onClose, 
  appName, 
  steps,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  return (
    <div className="fixed inset-0 z-[10003] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" 
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[32px] bg-white dark:bg-slate-900 shadow-2xl animate-in fade-in zoom-in duration-500">
        
        {/* Decorative Background */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10" />
        
        <div className="relative p-10 pt-16">
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-8">
            {steps.map((_, idx) => (
              <div 
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStep ? 'w-8 bg-indigo-600' : 'w-1.5 bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-8">
            <div className={`flex size-24 items-center justify-center rounded-[24px] shadow-xl animate-bounce-subtle`}
                 style={{ backgroundColor: `${steps[currentStep].color}15`, color: steps[currentStep].color }}>
              {React.cloneElement(steps[currentStep].icon as React.ReactElement, { size: 48 })}
            </div>
          </div>

          {/* Text Content */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black tracking-tight text-slate-800 dark:text-white mb-4 transition-all duration-300">
              {steps[currentStep].title}
            </h2>
            <p className="text-xl text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg mx-auto">
              {steps[currentStep].description}
            </p>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 font-bold transition-all ${
                currentStep === 0 ? 'opacity-0 pointer-events-none' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <ChevronLeft size={20} />
              Back
            </button>

            <button
              onClick={handleNext}
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-xl hover:scale-105 active:scale-95 transition-all"
            >
              {isLastStep ? 'Get Started' : 'Next Step'}
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Skip button */}
        <button 
          onClick={onComplete}
          className="absolute top-6 right-8 text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          Skip Intro
        </button>
      </div>

      <style jsx global>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
