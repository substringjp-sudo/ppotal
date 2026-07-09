'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth, AuthModal, OnboardingModal } from '@ppotal/ui';
import { updateOnboardingStatus } from '@ppotal/firebase';
import { Sparkles, Zap, Map as MapIcon, ShieldCheck } from 'lucide-react';
import './globals.css';

interface FeatureSlide {
  title: string;
  description: string;
  bullets: string[];
  image: string;
  color: string;
}

interface FeatureSectionProps {
  title: string;
  description: string;
  href: string;
  buttonText: string;
  animation: React.ReactNode;
  slides: FeatureSlide[];
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
}

function FeatureSection({
  title,
  description,
  href,
  buttonText,
  animation,
  slides,
  onMouseMove
}: FeatureSectionProps) {
  const [current, setCurrent] = useState(0);

  const next = () => setCurrent((prev) => (prev + 1) % slides.length);
  const prev = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length);

  const slide = slides[current];

  return (
    <section className="feature-section-container reveal">
      <div className="feature-section-header" onMouseMove={onMouseMove}>
        <div className="feature-info-pane">
          <h3>{title}</h3>
          <p>{description}</p>
          <a href={href} className="feature-btn">
            {buttonText}
            <span>→</span>
          </a>
        </div>
        <div className="feature-visual-pane">
          {animation}
        </div>
      </div>

      <div className="feature-showcase-pane">
        <h4 className="showcase-section-subtitle">Key Features Showcase</h4>
        <div className="showcase-carousel-section">
          <div className="carousel-container">
            <button className="carousel-nav-btn prev" onClick={prev} aria-label="Previous slide">
              <span>←</span>
            </button>

            <div className="carousel-content animate-slide-fade" key={`content-${current}`}>
              <h5 className="carousel-title">{slide.title}</h5>
              <p className="carousel-desc">{slide.description}</p>
              <div className="carousel-bullets">
                {slide.bullets.map((bullet, index) => (
                  <div key={index} className="carousel-bullet-item">
                    <span className="carousel-bullet-dot" style={{ backgroundColor: slide.color }}></span>
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="carousel-visual-wrapper animate-slide-fade" key={`visual-${current}`}>
              <div className="carousel-image-frame" style={{ boxShadow: `0 20px 40px -10px rgba(0, 0, 0, 0.5), 0 0 30px ${slide.color}15` }}>
                <img 
                  src={slide.image} 
                  alt={slide.title} 
                  className="carousel-image" 
                />
              </div>
            </div>

            <button className="carousel-nav-btn next" onClick={next} aria-label="Next slide">
              <span>→</span>
            </button>
          </div>

          <div className="carousel-indicators">
            {slides.map((_, index) => (
              <span
                key={index}
                className={`carousel-dot ${index === current ? 'active' : ''}`}
                onClick={() => setCurrent(index)}
                role="button"
                aria-label={`Go to slide ${index + 1}`}
              ></span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { user, profile, loading, logout, refreshProfile } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  const jrnSlides: FeatureSlide[] = [
    {
      title: "High-Precision Vector Visualization of Japan's Railway Network",
      description: "Explore Japan's Shinkansen, JR, private railways, and subways on a high-precision interactive vector map, and track your completed routes.",
      bullets: [
        "High-precision route data visualization",
        "Real-time boarding rates and progress statistics",
        "Device-optimized zoom & pan vector map"
      ],
      image: "/screenshots/jrn-main.png",
      color: "#1c74e9"
    },
    {
      title: "Detailed Route & Station Diagrams",
      description: "Visualize all stations and distances of your selected line on an intuitive linear diagram to clearly grasp complex rail info.",
      bullets: [
        "Show inter-station distances and total track length",
        "Intuitive route schema graphics",
        "Completion rate (%) progress bar feedback"
      ],
      image: "/screenshots/jrn-line-diagram.png",
      color: "#1c74e9"
    },
    {
      title: "High-Precision Station Network & Transfer Info",
      description: "View transfer networks for complex hubs like Shinjuku or Tokyo Station to design your routes with precision.",
      bullets: [
        "Interactive transfer diagrams for hub stations",
        "Detailed network map from hub stations",
        "Click routes to edit directly"
      ],
      image: "/screenshots/jrn-station-map.png",
      color: "#1c74e9"
    }
  ];

  const rgnSlides: FeatureSlide[] = [
    {
      title: "Global Travel Archive Dashboard",
      description: "Mark your visited countries and visualize experience points (EXP) and visit rates (RATE) as a heatmap to complete your world map.",
      bullets: [
        "Global heatmap for visited countries",
        "RATE and EXP level legends",
        "Multilingual support and clean dashboard"
      ],
      image: "/screenshots/rgn-world.png",
      color: "#2ecc71"
    },
    {
      title: "Prefecture-Level Visit Rates & City Exploration",
      description: "Analyze the visit rates and scores of sub-regions like Japanese municipalities within prefectures (e.g. Okayama) via overlay cards.",
      bullets: [
        "Prefecture/State-level visit rate analysis",
        "Scrollable list of cities/municipalities",
        "One-click map navigation and exploration"
      ],
      image: "/screenshots/rgn-prefecture.png",
      color: "#2ecc71"
    },
    {
      title: "Detailed Visit Type Logging for Cities",
      description: "Log the depth of your travels by weight (Pass, Transit, Visit, Stay, Residence) for individual cities.",
      bullets: [
        "5 detailed visit type scoring options",
        "Intuitive check-on gauge control",
        "Real-time Firebase sync"
      ],
      image: "/screenshots/rgn-city-history.png",
      color: "#2ecc71"
    },
    {
      title: "Municipality-Level Experience Map",
      description: "Color in fine boundaries of municipalities (e.g. Hokkaido) based on your experience levels to create a high-res archive.",
      bullets: [
        "Full rendering of micro administrative boundaries",
        "Blue/Orange two-tone coloring based on EXP levels",
        "Sophisticated, dense visit archive visualization"
      ],
      image: "/screenshots/rgn-hokkaido-detail.png",
      color: "#2ecc71"
    }
  ];

  const bgSlides: FeatureSlide[] = [
    {
      title: "Real-time Sunset & Sunrise Forecast Score",
      description: "Calculate the probability of a beautiful sunset using atmospheric scattering formulas and real-time weather forecasting.",
      bullets: [
        "Sunset scoring based on light scattering formulas",
        "Track humidity, cloud cover, and visibility in real-time",
        "Elevation analysis combining terrain data"
      ],
      image: "/screenshots/beforeglow-forecast.png",
      color: "#f97316"
    },
    {
      title: "AR Golden Hour Sun Path Tracker",
      description: "Track the sun's trajectory in augmented reality (AR) through your mobile camera to see exactly when and where it will set.",
      bullets: [
        "Real-time AR path viewfinder",
        "Sunset/sunrise angles considering terrain obstacles",
        "Real-time countdown for golden and blue hours"
      ],
      image: "/screenshots/beforeglow-camera.png",
      color: "#f97316"
    },
    {
      title: "Global Golden Hour Spot Guide",
      description: "Explore the most beautiful sunset spots and check real-time photo feeds from other travelers.",
      bullets: [
        "Precision sunset score ranking by region",
        "Real-time local photo gallery feed",
        "Visitor ratings and crowding levels"
      ],
      image: "/screenshots/beforeglow-gallery.png",
      color: "#f97316"
    }
  ];

  useEffect(() => {
    // Show portal onboarding if logged in and not completed
    if (!loading && user && profile && !profile.onboarding.portal) {
      setIsOnboardingOpen(true);
    }
  }, [loading, user, profile]);

  useEffect(() => {
    const reveals = document.querySelectorAll('.reveal');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, {
      threshold: 0.05,
      rootMargin: '0px 0px -50px 0px'
    });

    reveals.forEach(el => observer.observe(el));

    // Fallback/Immediate Activation for top elements
    const handleInitialReveal = () => {
      reveals.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight) {
          el.classList.add('active');
        }
      });
    };

    handleInitialReveal();
    const timer = setTimeout(handleInitialReveal, 200);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

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
      icon: ShieldCheck,
      color: "#6366f1"
    },
    {
      title: "Premium Experience",
      description: "Enjoy state-of-the-art animations and a sleek interface designed for modern explorers.",
      icon: Sparkles,
      color: "#a855f7"
    },
    {
      title: "Interactive Features",
      description: "From railway tracking to regional experience scores, explore tools that bring your travels to life.",
      icon: Zap,
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

        <section id="services" className="section-title reveal" style={{ marginTop: '3rem' }}>
          <h2>Core Experience</h2>
          <p>Advanced tools designed for the modern explorer.</p>
        </section>

        <div className="features-list">
          {/* jpRail Section */}
          <FeatureSection
            title="jpRail"
            description="The ultimate railway documentation engine. Meticulously track Japanese rail networks, schedules, and your unique journey through the tracks."
            href="https://jprail.pplaner.com"
            buttonText="Launch jpRail"
            animation={<JpRailAnimation />}
            slides={jrnSlides}
            onMouseMove={handleMouseMove}
          />

          {/* Regionevel Section */}
          <FeatureSection
            title="Regionevel"
            description="Capture the essence of local atmosphere. Transform your footsteps into a vibrant collection of regional memories and hidden charms."
            href="https://rgnevel.pplaner.com"
            buttonText="Launch Regionevel"
            animation={<RegionevelAnimation />}
            slides={rgnSlides}
            onMouseMove={handleMouseMove}
          />

          {/* BeforeGlow Section */}
          <FeatureSection
            title="BeforeGlow"
            description="Smart sunset & sunrise tracker. Calculate optimal golden hour windows and sunset scores using real-time atmospheric scattering simulation."
            href="https://bglow.pplaner.com"
            buttonText="Launch BeforeGlow"
            animation={<BeforeGlowAnimation />}
            slides={bgSlides}
            onMouseMove={handleMouseMove}
          />
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

        <noscript>
          <div style={{ padding: '40px', backgroundColor: '#0f172a', color: '#94a3b8', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto', lineHeight: '1.8', borderRadius: '12px', marginTop: '40px' }}>
            <h1 style={{ color: '#fff', fontSize: '28px', borderBottom: '2px solid #6366f1', paddingBottom: '10px', marginBottom: '20px' }}>
              PPLANER — Next Generation Travel Records & Unified Portal
            </h1>
            
            <div style={{ marginBottom: '30px' }}>
              <h2 style={{ color: '#e2e8f0', fontSize: '20px', marginBottom: '10px' }}>🌐 Interactive Travel Itinerary Planner & Real-Time Companions</h2>
              <p style={{ fontSize: '15px' }}>
                PPLANER is a comprehensive travel management ecosystem. Build detailed custom itineraries, connect with travel companions in real-time, and archive your personal travel memories digitally. Seamlessly integrate your accounts with our sub-services like JapanRailNote and Regionevel.
              </p>
            </div>
          </div>
        </noscript>
      </div>

      <style jsx>{`
        @keyframes slideFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-fade {
          animation: slideFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes drawLine {
          from { stroke-dashoffset: 1000; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes moveTrain {
          0% { offset-distance: 0%; opacity: 0; }
          6% { opacity: 1; }
          94% { opacity: 1; }
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
        @keyframes drawRailLine {
          0% { stroke-dashoffset: 400; }
          45% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes drawRailLine2 {
          0%, 15% { stroke-dashoffset: 200; }
          55% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes stationPulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.4); opacity: 1; }
        }
        @keyframes fillNorthAmerica {
          0%, 100% { fill: rgba(28, 116, 233, 0.02); stroke: rgba(255, 255, 255, 0.12); }
          8%, 28% { fill: rgba(28, 116, 233, 0.35); stroke: #1c74e9; filter: drop-shadow(0 0 6px rgba(28, 116, 233, 0.5)); }
        }
        @keyframes fillSouthAmerica {
          0%, 100% { fill: rgba(46, 204, 113, 0.02); stroke: rgba(255, 255, 255, 0.12); }
          23%, 43% { fill: rgba(46, 204, 113, 0.35); stroke: #2ecc71; filter: drop-shadow(0 0 6px rgba(46, 204, 113, 0.5)); }
        }
        @keyframes fillEurasia {
          0%, 100% { fill: rgba(56, 189, 248, 0.02); stroke: rgba(255, 255, 255, 0.12); }
          38%, 58% { fill: rgba(56, 189, 248, 0.35); stroke: #38bdf8; filter: drop-shadow(0 0 6px rgba(56, 189, 248, 0.5)); }
        }
        @keyframes fillAfrica {
          0%, 100% { fill: rgba(168, 85, 247, 0.02); stroke: rgba(255, 255, 255, 0.12); }
          53%, 73% { fill: rgba(168, 85, 247, 0.35); stroke: #a855f7; filter: drop-shadow(0 0 6px rgba(168, 85, 247, 0.5)); }
        }
        @keyframes fillAustralia {
          0%, 100% { fill: rgba(99, 102, 241, 0.02); stroke: rgba(255, 255, 255, 0.12); }
          68%, 88% { fill: rgba(99, 102, 241, 0.35); stroke: #6366f1; filter: drop-shadow(0 0 6px rgba(99, 102, 241, 0.5)); }
        }
        @keyframes pulseMarker {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.8); opacity: 1; }
        }
      `}</style>
    </main>
  );
}

function JpRailAnimation() {
  return (
    <svg width="280" height="180" viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="rail-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1c74e9" />
          <stop offset="50%" stopColor="#2ecc71" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
        <linearGradient id="rail-grad-2" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1c74e9" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>

      <line x1="0" y1="45" x2="280" y2="45" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />
      <line x1="0" y1="90" x2="280" y2="90" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />
      <line x1="0" y1="135" x2="280" y2="135" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />
      <line x1="70" y1="0" x2="70" y2="180" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />
      <line x1="140" y1="0" x2="140" y2="180" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />
      <line x1="210" y1="0" x2="210" y2="180" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />

      <path d="M210,15 L245,10 L260,25 L252,42 L235,42 L225,52 L212,46 L210,30 Z" fill="rgba(28, 116, 233, 0.03)" stroke="rgba(28, 116, 233, 0.2)" strokeWidth="1.5" />
      <path d="M214,48 L224,62 L216,78 L198,96 L168,114 L138,128 L106,136 L86,134 L88,126 L108,122 L132,112 L162,96 L188,74 L202,54 Z" fill="rgba(28, 116, 233, 0.03)" stroke="rgba(28, 116, 233, 0.2)" strokeWidth="1.5" />
      <path d="M98,138 L116,133 L122,138 L104,144 Z" fill="rgba(28, 116, 233, 0.03)" stroke="rgba(28, 116, 233, 0.2)" strokeWidth="1.5" />
      <path d="M66,140 L78,138 L74,158 L58,162 L54,146 Z" fill="rgba(28, 116, 233, 0.03)" stroke="rgba(28, 116, 233, 0.2)" strokeWidth="1.5" />

      <path d="M62,148 L76,142 L100,134 L120,122 L150,104 L176,86 L198,72 L206,58 L228,28" 
            stroke="rgba(255,255,255,0.06)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M120,122 L132,104 L158,90 L184,84 L198,86" 
            stroke="rgba(255,255,255,0.06)" strokeWidth="2" strokeLinecap="round" />

      <path d="M62,148 L76,142 L100,134 L120,122 L150,104 L176,86 L198,72 L206,58 L228,28" 
            stroke="url(#rail-grad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="400" strokeDashoffset="400"
            style={{ animation: 'drawRailLine 8s cubic-bezier(0.4, 0, 0.2, 1) infinite' }} />

      <path d="M120,122 L132,104 L158,90 L184,84 L198,86" 
            stroke="url(#rail-grad-2)" strokeWidth="1.8" strokeLinecap="round"
            strokeDasharray="200" strokeDashoffset="200"
            style={{ animation: 'drawRailLine2 8s cubic-bezier(0.4, 0, 0.2, 1) infinite' }} />

      <circle cx="62" cy="148" r="3.5" fill="#1c74e9" style={{ transformOrigin: '62px 148px', animation: 'stationPulse 3s infinite 0.5s' }} />
      <circle cx="120" cy="122" r="3.5" fill="#2ecc71" style={{ transformOrigin: '120px 122px', animation: 'stationPulse 3s infinite 2s' }} />
      <circle cx="150" cy="104" r="3" fill="#38bdf8" style={{ transformOrigin: '150px 104px', animation: 'stationPulse 3s infinite 2.5s' }} />
      <circle cx="198" cy="72" r="4.5" fill="#a855f7" style={{ transformOrigin: '198px 72px', animation: 'stationPulse 3s infinite 3.5s' }} />
      <circle cx="228" cy="28" r="3.5" fill="#38bdf8" style={{ transformOrigin: '228px 28px', animation: 'stationPulse 3s infinite 5s' }} />

      <circle r="4.5" fill="#ffffff" style={{
        offsetPath: "path('M62,148 L76,142 L100,134 L120,122 L150,104 L176,86 L198,72 L206,58 L228,28')",
        animation: 'moveTrain 8s infinite linear',
        filter: 'drop-shadow(0 0 5px #ffffff)'
      }} />
    </svg>
  );
}

function RegionevelAnimation() {
  return (
    <svg width="280" height="180" viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
      <line x1="0" y1="45" x2="280" y2="45" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />
      <line x1="0" y1="90" x2="280" y2="90" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />
      <line x1="0" y1="135" x2="280" y2="135" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />
      <line x1="70" y1="0" x2="70" y2="180" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />
      <line x1="140" y1="0" x2="140" y2="180" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />
      <line x1="210" y1="0" x2="210" y2="180" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />

      <path d="M25,25 L85,20 L95,45 L78,65 L55,75 L45,55 L28,45 Z" 
            style={{ animation: 'fillNorthAmerica 12s infinite ease-in-out' }} />
      <path d="M102,12 L125,14 L118,28 L104,24 Z" 
            fill="rgba(255, 255, 255, 0.02)" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1" />
      <path d="M65,85 L85,85 L78,125 L65,145 L58,110 Z" 
            style={{ animation: 'fillSouthAmerica 12s infinite ease-in-out' }} />
      <path d="M110,32 L225,25 L245,65 L215,80 L185,82 L170,68 L150,68 L138,50 Z" 
            style={{ animation: 'fillEurasia 12s infinite ease-in-out' }} />
      <path d="M125,72 L160,72 L168,95 L150,135 L135,130 L122,98 Z" 
            style={{ animation: 'fillAfrica 12s infinite ease-in-out' }} />
      <path d="M205,115 L235,110 L230,135 L210,130 Z" 
            style={{ animation: 'fillAustralia 12s infinite ease-in-out' }} />

      <circle cx="58" cy="48" r="2.5" fill="#1c74e9" />
      <circle cx="58" cy="48" r="6" stroke="#1c74e9" strokeWidth="0.8" fill="none" style={{ transformOrigin: '58px 48px', animation: 'pulseMarker 2s infinite' }} />
      <circle cx="130" cy="42" r="2.5" fill="#38bdf8" />
      <circle cx="130" cy="42" r="6" stroke="#38bdf8" strokeWidth="0.8" fill="none" style={{ transformOrigin: '130px 42px', animation: 'pulseMarker 2s infinite 0.5s' }} />
      <circle cx="218" cy="62" r="2.5" fill="#2ecc71" />
      <circle cx="218" cy="62" r="6" stroke="#2ecc71" strokeWidth="0.8" fill="none" style={{ transformOrigin: '218px 62px', animation: 'pulseMarker 2s infinite 1s' }} />
      <circle cx="218" cy="122" r="2.5" fill="#a855f7" />
      <circle cx="218" cy="122" r="6" stroke="#a855f7" strokeWidth="0.8" fill="none" style={{ transformOrigin: '218px 122px', animation: 'pulseMarker 2s infinite 1.5s' }} />
    </svg>
  );
}

function BeforeGlowAnimation() {
  return (
    <svg width="280" height="180" viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="sky-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0b132b" />
          <stop offset="40%" stopColor="#1c2541" />
          <stop offset="70%" stopColor="#5bc0be" />
          <stop offset="90%" stopColor="#f3c68f" />
          <stop offset="100%" stopColor="#ee6c4d" />
        </linearGradient>
        <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffb703" stopOpacity="1" />
          <stop offset="40%" stopColor="#fb8500" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#d9480f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mountain-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1c2541" />
          <stop offset="100%" stopColor="#0b132b" />
        </linearGradient>
        <linearGradient id="mountain-grad-2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3a506b" />
          <stop offset="100%" stopColor="#1c2541" />
        </linearGradient>
      </defs>

      <line x1="0" y1="45" x2="280" y2="45" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />
      <line x1="0" y1="90" x2="280" y2="90" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />
      <line x1="0" y1="135" x2="280" y2="135" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />
      <line x1="70" y1="0" x2="70" y2="180" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />
      <line x1="140" y1="0" x2="140" y2="180" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />
      <line x1="210" y1="0" x2="210" y2="180" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />

      <rect x="10" y="10" width="260" height="160" rx="16" fill="url(#sky-grad)" opacity="0.3" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

      <path d="M30,140 Q140,20 250,140" stroke="rgba(251, 133, 0, 0.3)" strokeWidth="1.5" strokeDasharray="5 5" fill="none" />

      <circle r="18" fill="url(#sun-glow)" style={{
        offsetPath: "path('M30,140 Q140,20 250,140')",
        animation: 'moveTrain 12s infinite linear',
        filter: 'drop-shadow(0 0 8px #fb8500)'
      }} />

      <path d="M10,170 L40,110 L90,145 L150,95 L220,150 L270,110 L270,170 Z" fill="url(#mountain-grad)" opacity="0.8" />
      <path d="M10,170 L60,130 L110,150 L180,115 L240,160 L270,140 L270,170 Z" fill="url(#mountain-grad-2)" opacity="0.9" />

      <line x1="140" y1="80" x2="110" y2="140" stroke="rgba(251, 133, 0, 0.15)" strokeWidth="1.5" strokeDasharray="2 4" />
      <line x1="140" y1="80" x2="140" y2="150" stroke="rgba(251, 133, 0, 0.15)" strokeWidth="1.5" strokeDasharray="2 4" />
      <line x1="140" y1="80" x2="170" y2="140" stroke="rgba(251, 133, 0, 0.15)" strokeWidth="1.5" strokeDasharray="2 4" />

      <ellipse cx="140" cy="160" rx="90" ry="8" fill="url(#sun-glow)" opacity="0.4" style={{ animation: 'pulse 4s infinite ease-in-out' }} />

      <circle cx="140" cy="80" r="30" stroke="rgba(251, 133, 0, 0.2)" strokeWidth="1" strokeDasharray="2 2" />
      <circle cx="140" cy="80" r="2" fill="#ffb703" />
      <line x1="140" y1="45" x2="140" y2="70" stroke="rgba(251, 133, 0, 0.3)" strokeWidth="1" />
      <line x1="140" y1="90" x2="140" y2="115" stroke="rgba(251, 133, 0, 0.3)" strokeWidth="1" />
      <line x1="105" y1="80" x2="130" y2="80" stroke="rgba(251, 133, 0, 0.3)" strokeWidth="1" />
      <line x1="150" y1="80" x2="175" y2="80" stroke="rgba(251, 133, 0, 0.3)" strokeWidth="1" />
    </svg>
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
