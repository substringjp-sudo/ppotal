'use client';

import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, Zap, Map as MapIcon, ShieldCheck } from 'lucide-react';

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ElementType;
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

  // CRITICAL FIX: Ensure the modal actually exits the DOM when closed
  if (!isOpen) return null;

  const step = steps[currentStep] || steps[0];
  if (!step) return null;

  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
      setCurrentStep(0); // Reset for next time
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const handleSkip = () => {
    onComplete();
    setCurrentStep(0); // Reset for next time
  };

  return (
    <div className="onboarding-modal-overlay">
      {/* Backdrop */}
      <div className="onboarding-modal-backdrop" onClick={handleSkip} />

      {/* Modal Container */}
      <div className="onboarding-modal-container">
        {/* Decorative Light Glows */}
        <div className="onboarding-modal-glow" style={{ background: `radial-gradient(circle, ${step.color}25 0%, transparent 70%)` }} />

        {/* Skip button (top right, beautifully placed) */}
        <button className="onboarding-modal-skip-btn" onClick={handleSkip}>
          Skip Intro
        </button>

        <div className="onboarding-modal-content">
          {/* Progress dots */}
          <div className="onboarding-modal-progress">
            {steps.map((_, idx) => (
              <div 
                key={idx}
                className={`onboarding-modal-dot ${idx === currentStep ? 'active' : ''}`}
                style={{ backgroundColor: idx === currentStep ? step.color : undefined }}
              />
            ))}
          </div>

          {/* Animated Icon Wrapper */}
          <div className="onboarding-modal-icon-wrapper">
            <div 
              className="onboarding-modal-icon"
              style={{ 
                backgroundColor: `${step.color}15`, 
                color: step.color,
                boxShadow: `0 8px 32px -4px ${step.color}30`,
                borderColor: `${step.color}30`
              }}
            >
              {React.createElement(step.icon, { size: 44 })}
            </div>
          </div>

          {/* Text Content */}
          <div className="onboarding-modal-text">
            <h2>{step.title}</h2>
            <p>{step.description}</p>
          </div>

          {/* Footer Controls */}
          <div className="onboarding-modal-footer">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className={`onboarding-modal-back-btn ${currentStep === 0 ? 'disabled' : ''}`}
            >
              <ChevronLeft size={18} />
              Back
            </button>

            <button
              onClick={handleNext}
              className="onboarding-modal-next-btn"
              style={{
                background: `linear-gradient(135deg, ${step.color}dd 0%, ${step.color} 100%)`,
                boxShadow: `0 8px 24px -4px ${step.color}50`
              }}
            >
              {isLastStep ? 'Get Started' : 'Next Step'}
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .onboarding-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        .onboarding-modal-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(8, 8, 11, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          animation: onboardingFadeIn 0.3s ease forwards;
        }

        .onboarding-modal-container {
          position: relative;
          width: 100%;
          max-width: 540px;
          background: rgba(20, 20, 25, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 28px;
          box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.8), 
                      inset 0 1px 0 rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          overflow: hidden;
          padding: 2.5rem;
          box-sizing: border-box;
          color: #ffffff;
          animation: onboardingScaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .onboarding-modal-glow {
          position: absolute;
          top: -10%;
          left: 20%;
          width: 60%;
          height: 40%;
          filter: blur(50px);
          pointer-events: none;
          z-index: 0;
          opacity: 0.8;
          transition: all 0.5s ease;
        }

        .onboarding-modal-skip-btn {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.6);
          padding: 0.5rem 1rem;
          border-radius: 100px;
          font-size: 0.825rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          z-index: 10;
        }

        .onboarding-modal-skip-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
          transform: translateY(-1px);
        }

        .onboarding-modal-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .onboarding-modal-progress {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          margin-top: 1rem;
        }

        .onboarding-modal-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .onboarding-modal-dot.active {
          width: 24px;
          border-radius: 100px;
        }

        .onboarding-modal-icon-wrapper {
          margin-bottom: 1.75rem;
        }

        .onboarding-modal-icon {
          width: 80px;
          height: 80px;
          border-radius: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid transparent;
          animation: onboardingBounce 3s ease-in-out infinite;
          transition: all 0.5s ease;
        }

        .onboarding-modal-text h2 {
          font-size: 1.85rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin: 0 0 0.75rem 0;
          background: linear-gradient(to bottom, #ffffff 60%, rgba(255, 255, 255, 0.7));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .onboarding-modal-text p {
          font-size: 1.05rem;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.65);
          margin: 0;
          max-width: 420px;
          min-height: 80px;
        }

        .onboarding-modal-footer {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 1.5rem;
        }

        .onboarding-modal-back-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 0.5rem 1rem 0.5rem 0.5rem;
          border-radius: 12px;
        }

        .onboarding-modal-back-btn:hover:not(.disabled) {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.05);
        }

        .onboarding-modal-back-btn.disabled {
          opacity: 0;
          pointer-events: none;
        }

        .onboarding-modal-next-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border: none;
          color: #ffffff;
          padding: 0.85rem 1.75rem;
          border-radius: 16px;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .onboarding-modal-next-btn:hover {
          transform: translateY(-2px) scale(1.02);
          filter: brightness(1.15);
        }

        .onboarding-modal-next-btn:active {
          transform: translateY(0) scale(0.98);
        }

        @keyframes onboardingFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes onboardingScaleIn {
          from { opacity: 0; transform: scale(0.94) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        @keyframes onboardingBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
};
