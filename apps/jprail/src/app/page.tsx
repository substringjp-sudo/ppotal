import React from 'react';
import MainPageClient from '../components/MainPageClient';

export default function Page() {
    return (
        <>
            {/* The interactive client-side application */}
            <MainPageClient />

            {/* SEO Content for search engines & browsers without JavaScript */}
            <noscript>
                <div style={{ padding: '40px', backgroundColor: '#1a1c1e', color: '#b0b0b0', textAlign: 'left', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto', lineHeight: '1.8' }}>
                    <h1 style={{ color: '#fff', fontSize: '28px', borderBottom: '2px solid #3498db', paddingBottom: '10px', marginBottom: '20px' }}>JapanRailNote — 일본 철도 지도, 노선도 및 완주 기록 시각화 플래너</h1>
                    
                    <div style={{ marginBottom: '30px' }}>
                        <h2 style={{ color: '#eee', fontSize: '20px', marginBottom: '10px' }}>🇰🇷 일본 기차 여행을 준비하거나 기록하고 싶으신가요?</h2>
                        <p style={{ fontSize: '15px' }}>
                            JapanRailNote는 일본 전역의 신칸센, JR 그룹 노선(동일본, 서일본 등), 주요 사철 및 도시 지하철 노선을 한눈에 보며 나만의 기차 여행 경로를 시각적으로 그리고 기록할 수 있는 웹 기반 지도 편집 서비스입니다.
                        </p>
                        <ul style={{ fontSize: '14px', paddingLeft: '20px' }}>
                            <li><strong>일본 철도 완주 기록 (노리츠부시):</strong> 내가 탑승한 철도 노선과 구간을 마우스 클릭으로 간편하게 칠하고, 노선별·회사별 완주율 및 총 승차 거리 계산을 지원합니다.</li>
                            <li><strong>전국 JR 패스 노선 지도 & 플래너:</strong> 전국 JR 패스, 지역 패스(JR 서일본 패스 등)나 청춘 18 티켓을 이용한 일본 소도시 기차 여행 경로 최적화 및 철도 연결 노선 검색에 용이합니다.</li>
                            <li><strong>통합 지하철 노선 및 정차역 정보:</strong> 도쿄 지하철 노선도와 오사카 지하철 노선도 등 복잡한 대도시 대중교통망을 통합하여 직관적으로 확인하세요.</li>
                        </ul>
                    </div>

                    <div style={{ marginBottom: '30px', borderTop: '1px solid #333', paddingTop: '20px' }}>
                        <h2 style={{ color: '#eee', fontSize: '20px', marginBottom: '10px' }}>🇯🇵 乗りつぶしマップと鉄道完乗記録ツール (乗り鉄・降り鉄向け)</h2>
                        <p style={{ fontSize: '15px' }}>
                            JR全線、大手私鉄、地下鉄、ローカル線を含む日本全国の鉄道路線を白地図上で塗りつぶし、完乗率（乗りつぶし達成率）や走行距離を自動集計・ビジュアル化するデジタルツールです。
                        </p>
                        <ul style={{ fontSize: '14px', paddingLeft: '20px' }}>
                            <li><strong>乗りつぶし記録:</strong> 直感的な操作で乗車区間を選択。JR、私鉄、地下鉄ごとの完乗路線割合を一目でチェック。</li>
                            <li><strong>駅スタンプラリー＆鉄印帳ログ:</strong> 都道府県別・会社別の鉄道乗차율을 계산하여 나만의 지역 방문 기록을 연동.</li>
                            <li><strong>マップエクスポート:</strong> 塗りつぶした日本鉄道地図を画像(PNG)として保存し, SNSやブログに進捗を共有。</li>
                        </ul>
                    </div>

                    <div style={{ marginBottom: '30px', borderTop: '1px solid #333', paddingTop: '20px' }}>
                        <h2 style={{ color: '#eee', fontSize: '20px', marginBottom: '10px' }}>🌐 Interactive Japan Railway Map & Travel Itinerary Tracker</h2>
                        <p style={{ fontSize: '15px' }}>
                            A high-resolution, vector-based interactive transit network diagram for planning Japan rail holidays. Designed for solo backpackers, geography fans, and transit network enthusiasts.
                        </p>
                        <ul style={{ fontSize: '14px', paddingLeft: '20px' }}>
                            <li><strong>JR Pass Calculator & Interactive Route Planner:</strong> Visualize JR Pass coverage, compare private lines vs. JR lines, and calculate point-to-point rail distances for maximum budget efficiency.</li>
                            <li><strong>Track & Log Journeys:</strong> Build a custom map of your railway travels across Japan's extensive network (JR East, JR West, JR Central, Shinkansen, Subways).</li>
                        </ul>
                    </div>

                    <div style={{ marginTop: '30px', textAlign: 'center', borderTop: '1px solid #333', paddingTop: '20px' }}>
                        <a href="/directory/" style={{ color: '#3498db', textDecoration: 'underline', fontSize: '16px', fontWeight: 'bold' }}>
                            👉 일본 철도 노선 디렉토리 바로가기 / 日本鉄道路線一覧 / Japan Railway Route Directory
                        </a>
                    </div>
                </div>
            </noscript>
        </>
    );
}
