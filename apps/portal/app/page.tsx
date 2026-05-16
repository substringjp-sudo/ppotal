'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth, AuthModal, OnboardingModal } from '@ppotal/ui';
import { updateOnboardingStatus } from '@ppotal/firebase';
import { Sparkles, Zap, Map as MapIcon, ShieldCheck } from 'lucide-react';
import './globals.css';

export default function Home() {
  const { user, profile, loading, logout, refreshProfile } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  useEffect(() => {
    // Show portal onboarding if logged in and not completed
    if (!loading && user && profile && !profile.onboarding.portal) {
      setIsOnboardingOpen(true);
    }
  }, [loading, user, profile]);

  const handleOnboardingComplete = async () => {
    if (user) {
      await updateOnboardingStatus(user.uid, 'portal', true);
      await refreshProfile();
    }
    setIsOnboardingOpen(false);
  };

  const portalOnboardingSteps = [
    {
      title: "One Account, All Access",
      description: "Use your PPLANER account across all our services. Your data stays unified and accessible.",
      icon: <ShieldCheck />,
      color: "#6366f1"
    },
    {
      title: "Premium Experience",
      description: "Enjoy state-of-the-art animations and a sleek interface designed for modern explorers.",
      icon: <Sparkles />,
      color: "#a855f7"
    },
    {
      title: "Interactive Features",
      description: "From railway tracking to regional experience scores, explore tools that bring your travels to life.",
      icon: <Zap />,
      color: "#ec4899"
    }
  ];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <main>
      <div className="bg-canvas">
        <div className="bg-light light-1"></div>
        <div className="bg-light light-2"></div>
        <div className="bg-light light-3"></div>
      </div>

      <div className="container">
        <header>
          <div className="logo">
            <div className="logo-icon"></div>
            <div className="logo-text">PPLANER</div>
          </div>
          <div className="header-actions">
            {loading ? (
              <div className="loading-spinner"></div>
            ) : user ? (
              <div className="user-profile">
                <div className="user-info">
                  <span className="user-name">{profile?.displayName || user.email?.split('@')[0]}</span>
                </div>
                <button onClick={() => logout()} className="auth-btn logout">Logout</button>
              </div>
            ) : (
              <button onClick={() => setIsAuthModalOpen(true)} className="auth-btn login">Sign In</button>
            )}
          </div>
        </header>

        <section className="hero">
          <div className="hero-content">
            <div className="reveal">
              <span className="hero-badge">
                <Sparkles size={14} style={{ marginRight: '6px' }} />
                Next Generation Travel Records
              </span>
            </div>
            <h1 className="reveal">
              Craft Your Journey,<br />
              <span className="text-gradient">Beyond Consumption</span>
            </h1>
            <p className="reveal">
              Pplaner transforms travel from simple consumption into a profound narrative.
              Document every moment, emotion, and step with precision and beauty.
            </p>
            <div className="reveal hero-btns">
              <a href="#services" className="feature-btn primary">
                Explore Services
                <Zap size={18} />
              </a>
              <button onClick={() => setIsAuthModalOpen(true)} className="feature-btn secondary">
                Get Started
                <span>→</span>
              </button>
            </div>
          </div>
          <div className="hero-visual reveal">
            <HeroAbstractAnimation />
          </div>
        </section>

        <section id="services" className="section-title reveal">
          <h2>Core Experience</h2>
          <p>Advanced tools designed for the modern explorer.</p>
        </section>

        <div className="features-grid">
          {/* jpRail Card */}
          <div className="feature-card reveal" onMouseMove={handleMouseMove}>
            <div className="feature-visual">
              <JpRailAnimation />
            </div>
            <h3>jpRail</h3>
            <p>
              The ultimate railway documentation engine. Meticulously track Japanese rail networks, 
              schedules, and your unique journey through the tracks.
            </p>
            <a href="https://jprail.pplaner.com" className="feature-btn">
              Launch jpRail
              <span>→</span>
            </a>
          </div>

          {/* Regionevel Card */}
          <div className="feature-card reveal" onMouseMove={handleMouseMove}>
            <div className="feature-visual">
              <RegionevelAnimation />
            </div>
            <h3>Regionevel</h3>
            <p>
              Capture the essence of local atmosphere. Transform your footsteps into 
              a vibrant collection of regional memories and hidden charms.
            </p>
            <a href="https://rgnevel.pplaner.com" className="feature-btn">
              Launch Regionevel
              <span>→</span>
            </a>
          </div>
        </div>

        <section className="section-title reveal">
          <h2>Future Roadmap</h2>
          <p>We are constantly evolving to provide a better travel experience.</p>
        </section>

        <div className="future-grid">
          <div className="future-card reveal">
            <div className="coming-soon-badge">Soon</div>
            <SocialIcon className="future-icon" />
            <h4>Social Travel</h4>
            <p>Connect with fellow travelers and share your unique itineraries in real-time.</p>
          </div>
          <div className="future-card reveal">
            <div className="coming-soon-badge">Beta</div>
            <AiIcon className="future-icon" />
            <h4>Smart Itinerary</h4>
            <p>AI-driven path optimization based on your personal travel style and preferences.</p>
          </div>
          <div className="future-card reveal">
            <div className="coming-soon-badge">Planned</div>
            <WorldIcon className="future-icon" />
            <h4>Global Reach</h4>
            <p>Expanding our specialized network documentation beyond Japan to the entire world.</p>
          </div>
        </div>

        <footer style={{ paddingBottom: '4rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem' }}>
          <p>© 2026 PPLANER. All rights reserved.</p>
        </footer>

        <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => setIsAuthModalOpen(false)} 
        />

        <OnboardingModal
          isOpen={isOnboardingOpen}
          onClose={() => setIsOnboardingOpen(false)}
          appName="Portal"
          steps={portalOnboardingSteps}
          onComplete={handleOnboardingComplete}
        />
      </div>

      <style jsx>{`
        @keyframes drawLine {
          from { stroke-dashoffset: 1000; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes moveTrain {
          0% { offset-distance: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { offset-distance: 100%; opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes float-alt {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
      `}</style>
    </main>
  );
}

function HeroAbstractAnimation() {
  return (
    <div className="hero-animation-container">
      <div className="abstract-shape shape-1"></div>
      <div className="abstract-shape shape-2"></div>
      <div className="abstract-shape shape-3"></div>
      <svg width="400" height="400" viewBox="0 0 400 400" className="hero-svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--accent-secondary)" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <circle cx="200" cy="200" r="150" stroke="url(#grad1)" strokeWidth="1" fill="none" />
        <circle cx="200" cy="200" r="120" stroke="url(#grad1)" strokeWidth="1" fill="none" opacity="0.5" />
        {[...Array(12)].map((_, i) => (
          <line
            key={i}
            x1="200"
            y1="50"
            x2="200"
            y2="30"
            stroke="var(--accent-tertiary)"
            strokeWidth="2"
            transform={`rotate(${i * 30} 200 200)`}
            opacity="0.3"
          />
        ))}
        <path
          d="M100 200 Q 200 100 300 200 T 500 200"
          stroke="var(--accent-primary)"
          strokeWidth="2"
          fill="none"
          opacity="0.2"
          style={{ animation: 'drawLine 10s linear infinite' }}
        />
      </svg>
    </div>
  );
}


function JpRailAnimation() {
  return (
    <svg width="280" height="180" viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Track Line 1 */}
      <path d="M20 140C20 140 100 140 140 100C180 60 260 60 260 60" 
            stroke="var(--accent-primary)" strokeWidth="2" strokeDasharray="1000" 
            style={{ animation: 'drawLine 3s ease-out forwards' }} />
      {/* Track Line 2 */}
      <path d="M20 120C20 120 80 120 120 80C160 40 260 40 260 40" 
            stroke="var(--accent-tertiary)" strokeWidth="1" strokeDasharray="1000" 
            style={{ animation: 'drawLine 4s ease-out forwards', opacity: 0.4 }} />
      
      {/* Moving Train Shape */}
      <rect width="20" height="6" rx="3" fill="#fff" style={{
        offsetPath: "path('M20 140C20 140 100 140 140 100C180 60 260 60 260 60')",
        animation: 'moveTrain 5s linear infinite',
        boxShadow: '0 0 15px var(--accent-primary)'
      }} />

      {/* Station Dots */}
      <circle cx="20" cy="140" r="4" fill="var(--accent-primary)" />
      <circle cx="140" cy="100" r="4" fill="#fff" />
      <circle cx="260" cy="60" r="4" fill="var(--accent-primary)" />
    </svg>
  );
}

function RegionevelAnimation() {
  return (
    <div style={{ position: 'relative', width: '200px', height: '200px' }}>
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: `${40 + i * 25}px`,
          height: `${40 + i * 25}px`,
          border: '1px solid var(--accent-secondary)',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.1,
          animation: `pulse 4s infinite ${i * 0.5}s ease-in-out`
        }} />
      ))}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '12px',
        height: '12px',
        background: 'var(--accent-secondary)',
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)',
        boxShadow: '0 0 20px var(--accent-secondary)'
      }} />
    </div>
  );
}

function SocialIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  );
}

function AiIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
    </svg>
  );
}

function WorldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="2" y1="12" x2="22" y2="12"></line>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
    </svg>
  );
}
