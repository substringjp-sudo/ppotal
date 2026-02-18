import React from 'react';

const BotContent = () => {
    return (
        <section style={{
            padding: '40px 20px',
            backgroundColor: '#fff',
            color: '#333',
            maxWidth: '1200px',
            margin: '0 auto',
            lineHeight: '1.8'
        }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
                JapanRailNote: 일본 철도 네트워크 시각화 및 여행 기록 서비스
            </h2>
            <p>
                JapanRailNote는 일본 전역의 복잡한 철도 네트워크를 한눈에 파악하고, 자신의 철도 여행을 체계적으로 기록할 수 있는 인터랙티브 지도 서비스입니다.
                JR Pass 여행자, 철도 마니아(도리테츠, 노리테츠), 그리고 일본 여행을 계획하는 모든 분들을 위해 설계되었습니다.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginTop: '30px' }}>
                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>핵심 기능 및 특징</h3>
                    <ul style={{ paddingLeft: '20px' }}>
                        <li><strong>전국 철도 노선도 시각화:</strong> JR 6사(동일본, 서일본, 도카이, 큐슈, 홋카이도, 시코쿠)는 물론, 대도시 지하철, 다양한 사설 철도(Private Railway)와 노면전차(LRT)까지 포함하는 통합 맵을 제공합니다.</li>
                        <li><strong>스마트 여행 기록 (Travelog):</strong> 실제 탑승한 역과 노선을 클릭 한 번으로 기록하고, 나만의 일본 철도 정복 지도(완승 지도)를 실시간으로 업데이트할 수 있습니다.</li>
                        <li><strong>정확한 통계 및 계산:</strong> 누적 여행 거리(km)와 방문한 역의 개수를 자동으로 산출하여 철도 마니아들의 목표 달성을 돕습니다.</li>
                        <li><strong>경로 및 요금 탐색:</strong> 주요 구간의 최단 경로를 탐색하고 여행 계획 수립에 필요한 기초 정보를 제공합니다.</li>
                    </ul>
                </div>
                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>이런 분들께 추천합니다</h3>
                    <ul style={{ paddingLeft: '20px' }}>
                        <li><strong>JR 패스(JR Pass) 사용자:</strong> 패스 유효 구간을 확인하고 효율적인 이동 동선을 짜고 싶은 분</li>
                        <li><strong>철도 마니아:</strong> 노리테츠(탑승형 철덕)로서 자신의 전노선 완승 기록을 시각화하고 싶은 분</li>
                        <li><strong>일본 자유 여행객:</strong> 도쿄, 오사카, 후쿠오카 등 복잡한 도심 철도망을 쉽게 이해하고 싶은 분</li>
                    </ul>
                </div>
            </div>

            <div style={{ marginTop: '40px', padding: '20px', borderTop: '1px solid #eee' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', color: '#555' }}>연관 키워드</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '12px', color: '#888' }}>
                    <span>#일본철도지도</span> <span>#JR노선도</span> <span>#신칸센노선도</span> <span>#도쿄지하철</span> <span>#오사카철도</span>
                    <span>#철도여행기록</span> <span>#JR패스플래너</span> <span>#일본기차여행</span> <span>#노리테츠</span> <span>#도리테츠</span>
                    <span>#JapanRailwayMap</span> <span>#JRPassMap</span> <span>#TransitVisualization</span> <span>#RailwayExplorer</span>
                </div>
                <p style={{ fontSize: '14px', color: '#666', marginTop: '20px' }}>
                    JapanRailNote는 일본 국토교통성의 신뢰할 수 있는 데이터를 기반으로 지속적으로 업데이트됩니다.
                    더욱 편리하고 직관적인 철도 정보 서비스를 제공하기 위해 노력하겠습니다.
                </p>
            </div>
        </section>
    );
};

export default BotContent;
