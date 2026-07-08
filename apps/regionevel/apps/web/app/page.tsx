import Link from "next/link";
import { Introduction } from "@/components/landing/Introduction";

export default function Home() {
  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-slate-50">

      {/* Onboarding / Introduction Section */}
      <div id="how-it-works" className="w-full bg-white">
        <Introduction />
      </div>

      {/* Footer-like Call to Action */}
      <section className="py-20 px-4 text-center bg-slate-50 w-full border-t border-gray-100">
        <h2 className="text-3xl font-bold mb-8 text-gray-800">Ready to record your journey?</h2>
        <Link
          href="/map"
          className="px-10 py-4 bg-slate-900 text-white font-black text-xl hover:bg-slate-800 transition-all inline-block shadow-lg"
        >
          Open World Map
        </Link>
      </section>

      {/* SEO Content for search engines & browsers without JavaScript */}
      <noscript>
        <div style={{ padding: '40px', backgroundColor: '#f8fafc', color: '#334155', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto', lineHeight: '1.8' }}>
          <h1 style={{ color: '#0f172a', fontSize: '26px', borderBottom: '2px solid #64748b', paddingBottom: '10px', marginBottom: '20px' }}>
            Regionevel — 나의 국내 및 해외 여행 경현치 지도 만들기
          </h1>
          
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ color: '#1e293b', fontSize: '18px', marginBottom: '10px' }}>🇰🇷 대한민국 시군구 및 글로벌 여행 지도를 한눈에 기록하세요</h2>
            <p>
              Regionevel은 단순한 국가 마킹을 넘어 각 나라의 도도부현, 주(State), 시군구 단위까지 나의 발자취를 세밀하게 관리할 수 있는 글로벌 여행 트래커입니다. 일본의 経県値(경현치) 시스템을 기반으로 한 등급 시스템을 통해 나의 여행 수준을 점수로 환산해 보세요!
            </p>
            <h3 style={{ color: '#334155', fontSize: '15px', marginTop: '15px', marginBottom: '5px' }}>📍 여행 경현치 레벨 기준:</h3>
            <ul style={{ fontSize: '14px', paddingLeft: '20px' }}>
              <li><strong>통과 (Pass - 1점):</strong> 기차, 자동차, 비행기 등으로 멈추지 않고 단순히 해당 지역을 통과함.</li>
              <li><strong>휴게 (Transit - 2점):</strong> 역, 공항, 고속도로 휴게소 등에서 짧게 정차하거나 환승함.</li>
              <li><strong>방문 (Visit - 5점):</strong> 해당 지역에서 식사, 관광, 탐방 등 발을 내딛고 활동함.</li>
              <li><strong>숙박 (Stay - 10점):</strong> 해당 지역에서 최소 1박 이상 머무름.</li>
              <li><strong>거주 (Residence - 40점):</strong> 해당 지역에 거주하거나 오랜 기간 생활 기반을 둠.</li>
            </ul>
            <p style={{ fontSize: '14px', marginTop: '10px' }}>
              한국 경현치 테스트, 일본 경현치 지도, 전국 지자체 방문 지도 색칠 기능을 활용해 나만의 디지털 스크래치 지도를 완성하고 기록을 저장해 보세요.
            </p>
          </div>

          <div style={{ marginBottom: '30px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
            <h2 style={{ color: '#1e293b', fontSize: '18px', marginBottom: '10px' }}>🇯🇵 経県値(けいけんち)日本地図・市区町村塗りつぶし作成ツール</h2>
            <p>
              日本全国の都道府県（経県値）および市区町村レベルで、自分の訪問実績を「居住」「宿泊」「訪問」「接地」「通過」の5つのレベルで入力し、自分だけの旅行地図を作成・塗りつぶし・共有できる無料ウェブサービスです。
            </p>
          </div>

          <div style={{ marginBottom: '30px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
            <h2 style={{ color: '#1e293b', fontSize: '18px', marginBottom: '10px' }}>🌐 Global Travel Level Tracker & Interactive Scratch Map</h2>
            <p>
              Track your exploration footprint at country, state, prefecture, and municipality levels. Calculate your overall travel level score based on the Keikenchi rating system and export your colored map to share.
            </p>
          </div>
        </div>
      </noscript>
    </div>
  );
}
