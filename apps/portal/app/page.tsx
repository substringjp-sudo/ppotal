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
  const [currentSlide, setCurrentSlide] = useState(0);

  const showcaseSlides = [
    {
      category: "JapanRailNote",
      title: "일본 철도망 초정밀 벡터 시각화",
      description: "일본 전역의 신칸센과 JR, 사철, 지하철 노선망을 정밀한 인터랙티브 벡터 지도로 탐색하고 나의 탑승 완료 노선을 채색하여 시각화합니다.",
      bullets: [
        "초정밀 노선 데이터 시각화",
        "탑승률 및 진행률 통계 실시간 추적",
        "디바이스 최적화 줌/이동 벡터 맵"
      ],
      image: "/screenshots/jrn-main.png",
      color: "#1c74e9"
    },
    {
      category: "JapanRailNote",
      title: "상세 노선 및 역 다이어그램",
      description: "선택한 노선의 모든 정차역과 주행 거리를 직관적인 선형 다이어그램으로 시각화하여 복잡한 철도 정보를 명확하게 파악할 수 있습니다.",
      bullets: [
        "역 간 거리 및 전체 주행 연장 표시",
        "직관적인 노선 스키마 그래픽",
        "완료도(%) 진행 바 피드백"
      ],
      image: "/screenshots/jrn-line-diagram.png",
      color: "#1c74e9"
    },
    {
      category: "JapanRailNote",
      title: "초정밀 역 네트워크 및 환승 정보",
      description: "신주쿠나 도쿄역 같이 여러 노선이 교차하는 복잡한 허브역에 대한 환승 노선 관계망을 제공하여 정밀한 여행 설계를 돕습니다.",
      bullets: [
        "환승 노선별 연결 역망 입체 도식화",
        "허브역 기준 상세 네트워크 맵",
        "노선 클릭 시 해당 에디터 연동"
      ],
      image: "/screenshots/jrn-station-map.png",
      color: "#1c74e9"
    },
    {
      category: "Regionevel",
      title: "글로벌 여행 흔적 대시보드",
      description: "전 세계 다녀온 국가들을 한눈에 마킹하고, 국가별 경험 수치(EXP)와 방문율(RATE)을 히트맵 형태로 시각화하여 나만의 세계 지도를 완성합니다.",
      bullets: [
        "전 세계 방문 국가 채색 히트맵",
        "RATE(방문율) 및 EXP(경험치) 등급 범례",
        "다국어 지원 및 깔끔한 대시보드"
      ],
      image: "/screenshots/rgn-world.png",
      color: "#2ecc71"
    },
    {
      category: "Regionevel",
      title: "현 단위 방문율 및 상세 도시 탐색",
      description: "일본 도도부현 등 특정 국가의 행정구역 레벨에서 상세 도시(시정촌)들의 방문율과 점수를 오카야마 현 등 오버레이 카드를 통해 면밀하게 분석합니다.",
      bullets: [
        "도도부현/주(State) 단위 방문율 분석",
        "내부 시정촌(City) 리스트 스크롤 제공",
        "원클릭 맵 이동 및 탐색 연동"
      ],
      image: "/screenshots/rgn-prefecture.png",
      color: "#2ecc71"
    },
    {
      category: "Regionevel",
      title: "도시 상세 방문 유형 기록",
      description: "특정 도시에 머문 형태(Pass, Transit, Visit, Stay, Residence)에 따라 가중치를 다르게 반영하여 나의 여행 깊이를 과학적으로 기록합니다.",
      bullets: [
        "5가지 세밀한 방문 유형 점수 배점",
        "체크온 방식의 직관적인 게이지 컨트롤",
        "실시간 파이어베이스 영구 동기화"
      ],
      image: "/screenshots/rgn-city-history.png",
      color: "#2ecc71"
    },
    {
      category: "Regionevel",
      title: "시정촌 단위 정밀 경험 수치 지도",
      description: "홋카이도 등 지자체 내부의 아주 미세한 행정구역(시정촌) 경계선까지 나의 경험치 등급에 맞춰 색칠하여 고해상도 흔적을 만들어냅니다.",
      bullets: [
        "마이크로 행정구역 경계선 완전 렌더링",
        "EXP 등급별 블루/오렌지 투톤 채색",
        "정교하고 촘촘한 방문 아카이브 시각화"
      ],
      image: "/screenshots/rgn-hokkaido-detail.png",
      color: "#2ecc71"
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % showcaseSlides.length);
  };
  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + showcaseSlides.length) % showcaseSlides.length);
  };

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
          <h2>Feature Showcase</h2>
          <p>스크린샷으로 확인하는 PPLANER의 강력한 기능과 정밀한 에디터 화면입니다.</p>
        </section>

        <div className="showcase-carousel-section reveal">
          <div className="carousel-container">
            {/* Prev Button */}
            <button className="carousel-nav-btn prev" onClick={prevSlide} aria-label="이전 슬라이드">
              <span>←</span>
            </button>

            {/* Content Area */}
            <div className="carousel-content animate-slide-fade" key={`content-${currentSlide}`}>
              <span className="carousel-badge" style={{ color: showcaseSlides[currentSlide].color }}>
                {showcaseSlides[currentSlide].category}
              </span>
              <h3 className="carousel-title">
                {showcaseSlides[currentSlide].title}
              </h3>
              <p className="carousel-desc">
                {showcaseSlides[currentSlide].description}
              </p>
              <div className="carousel-bullets">
                {showcaseSlides[currentSlide].bullets.map((bullet, index) => (
                  <div key={index} className="carousel-bullet-item">
                    <span className="carousel-bullet-dot" style={{ backgroundColor: showcaseSlides[currentSlide].color }}></span>
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Area */}
            <div className="carousel-visual-wrapper animate-slide-fade" key={`visual-${currentSlide}`}>
              <div className="carousel-image-frame" style={{ boxShadow: `0 30px 60px -15px rgba(0, 0, 0, 0.6), 0 0 40px ${showcaseSlides[currentSlide].color}22` }}>
                <img 
                  src={showcaseSlides[currentSlide].image} 
                  alt={showcaseSlides[currentSlide].title} 
                  className="carousel-image" 
                />
              </div>
            </div>

            {/* Next Button */}
            <button className="carousel-nav-btn next" onClick={nextSlide} aria-label="다음 슬라이드">
              <span>→</span>
            </button>
          </div>

          {/* Indicators */}
          <div className="carousel-indicators">
            {showcaseSlides.map((_, index) => (
              <span
                key={index}
                className={`carousel-dot ${index === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(index)}
                role="button"
                aria-label={`${index + 1}번 슬라이드로 이동`}
              ></span>
            ))}
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

function HeroAbstractAnimation() {
  return (
    <div className="hero-animation-container">
      <div className="abstract-shape shape-1"></div>
      <div className="abstract-shape shape-2"></div>
      <div className="abstract-shape shape-3"></div>
      <svg width="400" height="400" viewBox="0 0 400 400" className="hero-svg" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="portal-hub-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1c74e9" />
            <stop offset="100%" stopColor="#2ecc71" />
          </linearGradient>
          <radialGradient id="glow-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1c74e9" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#111821" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outer glowing background */}
        <circle cx="200" cy="200" r="160" fill="url(#glow-grad)" />

        {/* Global coordinate latitude and longitude grid rings */}
        <circle cx="200" cy="200" r="140" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" fill="none" />
        <circle cx="200" cy="200" r="100" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" fill="none" opacity="0.6" />
        <circle cx="200" cy="200" r="60" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" fill="none" opacity="0.4" />
        
        {/* Curved connection lines representing travel routes */}
        <path d="M70,120 Q200,60 330,120" stroke="rgba(28, 116, 233, 0.2)" strokeWidth="1.5" fill="none" strokeDasharray="6 6" />
        <path d="M70,280 Q200,340 330,280" stroke="rgba(46, 204, 113, 0.2)" strokeWidth="1.5" fill="none" strokeDasharray="6 6" />
        <path d="M120,70 Q200,200 280,330" stroke="rgba(56, 189, 248, 0.2)" strokeWidth="1.5" fill="none" strokeDasharray="6 6" />
        <path d="M280,70 Q200,200 120,330" stroke="rgba(168, 85, 247, 0.2)" strokeWidth="1.5" fill="none" strokeDasharray="6 6" />

        {/* Main interactive portal lines drawing in */}
        <path d="M70,120 Q200,200 330,280" stroke="url(#portal-hub-grad)" strokeWidth="2" fill="none"
              strokeDasharray="400" strokeDashoffset="400" style={{ animation: 'drawRailLine 10s ease-in-out infinite' }} />
        <path d="M70,280 Q200,200 330,120" stroke="url(#portal-hub-grad)" strokeWidth="2" fill="none"
              strokeDasharray="400" strokeDashoffset="400" style={{ animation: 'drawRailLine 10s ease-in-out infinite 2s' }} />

        {/* Moving traveler footprints (Train / Flight routes) */}
        <circle r="4" fill="#ffffff" style={{
          offsetPath: "path('M70,120 Q200,200 330,280')",
          animation: 'moveTrain 6s infinite linear',
          filter: 'drop-shadow(0 0 4px #ffffff)'
        }} />
        <circle r="4" fill="#ffffff" style={{
          offsetPath: "path('M70,280 Q200,200 330,120')",
          animation: 'moveTrain 8s infinite linear 3s',
          filter: 'drop-shadow(0 0 4px #ffffff)'
        }} />

        {/* Connection nodes (Key destinations) */}
        <circle cx="70" cy="120" r="5" fill="#38bdf8" style={{ transformOrigin: '70px 120px', animation: 'stationPulse 2.5s infinite 0.3s' }} />
        <circle cx="330" cy="120" r="5" fill="#a855f7" style={{ transformOrigin: '330px 120px', animation: 'stationPulse 2.5s infinite 0.7s' }} />
        <circle cx="70" cy="280" r="5" fill="#2ecc71" style={{ transformOrigin: '70px 280px', animation: 'stationPulse 2.5s infinite 1.1s' }} />
        <circle cx="330" cy="280" r="5" fill="#1c74e9" style={{ transformOrigin: '330px 280px', animation: 'stationPulse 2.5s infinite 1.5s' }} />
        
        {/* Core Unified Portal Hub at the center */}
        <circle cx="200" cy="200" r="12" fill="url(#portal-hub-grad)" style={{ filter: 'drop-shadow(0 0 10px #1c74e9)' }} />
        <circle cx="200" cy="200" r="22" stroke="var(--accent-secondary)" strokeWidth="1" strokeDasharray="4 4" fill="none" style={{ transformOrigin: '200px 200px', animation: 'rotate 15s linear infinite' }} />
        <circle cx="200" cy="200" r="32" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" fill="none" />
      </svg>
    </div>
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

      {/* Grid Lines in background for high-tech aesthetic */}
      <line x1="0" y1="45" x2="280" y2="45" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />
      <line x1="0" y1="90" x2="280" y2="90" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />
      <line x1="0" y1="135" x2="280" y2="135" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />
      <line x1="70" y1="0" x2="70" y2="180" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />
      <line x1="140" y1="0" x2="140" y2="180" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />
      <line x1="210" y1="0" x2="210" y2="180" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />

      {/* Japan Outline (Futuristic, high-tech map aesthetic) */}
      {/* Hokkaido */}
      <path d="M210,15 L245,10 L260,25 L252,42 L235,42 L225,52 L212,46 L210,30 Z" fill="rgba(28, 116, 233, 0.03)" stroke="rgba(28, 116, 233, 0.2)" strokeWidth="1.5" />
      {/* Honshu */}
      <path d="M214,48 L224,62 L216,78 L198,96 L168,114 L138,128 L106,136 L86,134 L88,126 L108,122 L132,112 L162,96 L188,74 L202,54 Z" fill="rgba(28, 116, 233, 0.03)" stroke="rgba(28, 116, 233, 0.2)" strokeWidth="1.5" />
      {/* Shikoku */}
      <path d="M98,138 L116,133 L122,138 L104,144 Z" fill="rgba(28, 116, 233, 0.03)" stroke="rgba(28, 116, 233, 0.2)" strokeWidth="1.5" />
      {/* Kyushu */}
      <path d="M66,140 L78,138 L74,158 L58,162 L54,146 Z" fill="rgba(28, 116, 233, 0.03)" stroke="rgba(28, 116, 233, 0.2)" strokeWidth="1.5" />

      {/* Track Base Lines (Gray Tracks) */}
      <path d="M62,148 L76,142 L100,134 L120,122 L150,104 L176,86 L198,72 L206,58 L228,28" 
            stroke="rgba(255,255,255,0.06)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M120,122 L132,104 L158,90 L184,84 L198,86" 
            stroke="rgba(255,255,255,0.06)" strokeWidth="2" strokeLinecap="round" />

      {/* Main Rail Line (Pulsing / Drawing) */}
      <path d="M62,148 L76,142 L100,134 L120,122 L150,104 L176,86 L198,72 L206,58 L228,28" 
            stroke="url(#rail-grad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="400" strokeDashoffset="400"
            style={{ animation: 'drawRailLine 8s cubic-bezier(0.4, 0, 0.2, 1) infinite' }} />

      {/* Secondary Hokuriku Line */}
      <path d="M120,122 L132,104 L158,90 L184,84 L198,86" 
            stroke="url(#rail-grad-2)" strokeWidth="1.8" strokeLinecap="round"
            strokeDasharray="200" strokeDashoffset="200"
            style={{ animation: 'drawRailLine2 8s cubic-bezier(0.4, 0, 0.2, 1) infinite' }} />

      {/* Glowing Station Nodes */}
      {/* Fukuoka */}
      <circle cx="62" cy="148" r="3.5" fill="#1c74e9" style={{ transformOrigin: '62px 148px', animation: 'stationPulse 3s infinite 0.5s' }} />
      {/* Osaka */}
      <circle cx="120" cy="122" r="3.5" fill="#2ecc71" style={{ transformOrigin: '120px 122px', animation: 'stationPulse 3s infinite 2s' }} />
      {/* Nagoya */}
      <circle cx="150" cy="104" r="3" fill="#38bdf8" style={{ transformOrigin: '150px 104px', animation: 'stationPulse 3s infinite 2.5s' }} />
      {/* Tokyo */}
      <circle cx="198" cy="72" r="4.5" fill="#a855f7" style={{ transformOrigin: '198px 72px', animation: 'stationPulse 3s infinite 3.5s' }} />
      {/* Sapporo */}
      <circle cx="228" cy="28" r="3.5" fill="#38bdf8" style={{ transformOrigin: '228px 28px', animation: 'stationPulse 3s infinite 5s' }} />

      {/* Moving Train */}
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
      {/* Grid Lines in background for high-tech aesthetic */}
      <line x1="0" y1="45" x2="280" y2="45" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />
      <line x1="0" y1="90" x2="280" y2="90" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />
      <line x1="0" y1="135" x2="280" y2="135" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />
      <line x1="70" y1="0" x2="70" y2="180" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />
      <line x1="140" y1="0" x2="140" y2="180" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />
      <line x1="210" y1="0" x2="210" y2="180" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 8" />

      {/* World Map Polygons coloring in one-by-one */}
      {/* North America */}
      <path d="M25,25 L85,20 L95,45 L78,65 L55,75 L45,55 L28,45 Z" 
            style={{ animation: 'fillNorthAmerica 12s infinite ease-in-out' }} />
      
      {/* Greenland */}
      <path d="M102,12 L125,14 L118,28 L104,24 Z" 
            fill="rgba(255, 255, 255, 0.02)" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1" />

      {/* South America */}
      <path d="M65,85 L85,85 L78,125 L65,145 L58,110 Z" 
            style={{ animation: 'fillSouthAmerica 12s infinite ease-in-out' }} />

      {/* Eurasia */}
      <path d="M110,32 L225,25 L245,65 L215,80 L185,82 L170,68 L150,68 L138,50 Z" 
            style={{ animation: 'fillEurasia 12s infinite ease-in-out' }} />

      {/* Africa */}
      <path d="M125,72 L160,72 L168,95 L150,135 L135,130 L122,98 Z" 
            style={{ animation: 'fillAfrica 12s infinite ease-in-out' }} />

      {/* Australia */}
      <path d="M205,115 L235,110 L230,135 L210,130 Z" 
            style={{ animation: 'fillAustralia 12s infinite ease-in-out' }} />

      {/* Pulsing City/Region Pins (Traveler footprints) */}
      {/* New York */}
      <circle cx="58" cy="48" r="2.5" fill="#1c74e9" />
      <circle cx="58" cy="48" r="6" stroke="#1c74e9" strokeWidth="0.8" fill="none" style={{ transformOrigin: '58px 48px', animation: 'pulseMarker 2s infinite' }} />

      {/* London */}
      <circle cx="130" cy="42" r="2.5" fill="#38bdf8" />
      <circle cx="130" cy="42" r="6" stroke="#38bdf8" strokeWidth="0.8" fill="none" style={{ transformOrigin: '130px 42px', animation: 'pulseMarker 2s infinite 0.5s' }} />

      {/* Tokyo */}
      <circle cx="218" cy="62" r="2.5" fill="#2ecc71" />
      <circle cx="218" cy="62" r="6" stroke="#2ecc71" strokeWidth="0.8" fill="none" style={{ transformOrigin: '218px 62px', animation: 'pulseMarker 2s infinite 1s' }} />

      {/* Sydney */}
      <circle cx="218" cy="122" r="2.5" fill="#a855f7" />
      <circle cx="218" cy="122" r="6" stroke="#a855f7" strokeWidth="0.8" fill="none" style={{ transformOrigin: '218px 122px', animation: 'pulseMarker 2s infinite 1.5s' }} />
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
