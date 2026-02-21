import React from 'react';

const SEOContent = () => {
    return (
        <section style={{
            padding: '80px 20px',
            backgroundColor: '#1a1c1e', // Sleek dark Navy/Black
            color: '#a0a0a0',
            lineHeight: '1.8',
            borderTop: '1px solid #333'
        }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                {/* Brand & Introduction */}
                <div style={{ marginBottom: '60px', textAlign: 'center' }}>
                    <h2 style={{
                        fontSize: '32px',
                        color: '#fff',
                        fontWeight: '800',
                        marginBottom: '20px',
                        letterSpacing: '-0.5px'
                    }}>
                        Explore Japan by Rail
                    </h2>
                    <p style={{ fontSize: '16px', maxWidth: '700px', margin: '0 auto', color: '#888' }}>
                        JapanRailNote is a comprehensive digital companion for travelers navigating Japan's vast railway system.
                        From the lightning-fast Shinkansen to charming local lines, we visualize the network to help you track your journey.
                    </p>
                </div>

                {/* Directory Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '40px',
                    fontSize: '14px'
                }}>
                    {/* Column 1: Network */}
                    <div>
                        <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                            Railway Network
                        </h3>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            <li style={{ marginBottom: '8px' }}>• JR Group (East, West, Central)</li>
                            <li style={{ marginBottom: '8px' }}>• Shinkansen Network (High-Speed)</li>
                            <li style={{ marginBottom: '8px' }}>• Private Railways & Subways</li>
                            <li style={{ marginBottom: '8px' }}>• Local Rail & Tramways</li>
                        </ul>
                    </div>

                    {/* Column 2: Major Hubs */}
                    <div>
                        <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                            Major Transport Hubs
                        </h3>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            <li style={{ marginBottom: '8px' }}>Tokyo Station (東京駅)</li>
                            <li style={{ marginBottom: '8px' }}>Shinjuku Station (新宿駅)</li>
                            <li style={{ marginBottom: '8px' }}>Osaka / Umeda Hub (大阪・梅田)</li>
                            <li style={{ marginBottom: '8px' }}>Kyoto Hub (京都駅)</li>
                        </ul>
                    </div>

                    {/* Column 3: Regional Guides */}
                    <div>
                        <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                            Regional Rail Guides
                        </h3>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            <li style={{ marginBottom: '8px' }}>Kanto & Tokyo Area</li>
                            <li style={{ marginBottom: '8px' }}>Kansai & Osaka/Kyoto Area</li>
                            <li style={{ marginBottom: '8px' }}>Hokkaido & Kyushu Rails</li>
                            <li style={{ marginBottom: '8px' }}>Shikoku & Chugoku Lines</li>
                        </ul>
                    </div>

                    {/* Column 4: Traveler Tools */}
                    <div>
                        <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                            Traveler Resources
                        </h3>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            <li style={{ marginBottom: '8px' }}>JR Pass Calculator & Tracker</li>
                            <li style={{ marginBottom: '8px' }}>Personal Journey Logging</li>
                            <li style={{ marginBottom: '8px' }}>Distance Stats & Analytics</li>
                            <li style={{ marginBottom: '8px' }}>Multi-language Station Search</li>
                        </ul>
                    </div>
                </div>

                {/* Localized Footer Narrative - Professional Bottom Bar */}
                <div style={{
                    marginTop: '80px',
                    paddingTop: '40px',
                    borderTop: '1px solid #333',
                    fontSize: '13px',
                    color: '#666',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ maxWidth: '600px', marginBottom: '20px' }}>
                        <p style={{ marginBottom: '10px' }}>
                            <strong>JapanRailNote (일본 철도 노트)</strong>는 일본 전역의 신칸센, JR, 사철 데이터를 시각화하는 전문 플랫폼입니다.
                            야마노테선, 도카이도 신칸센 등 주요 노선 정보와 개인별 여행 기록 서비스를 제공합니다.
                        </p>
                        <p>
                            本サービスは、日本の全鉄道網（新幹線、JR、私鉄、地下鉄）を網羅したインタラクティブな地図と乗りつぶし記録ツールを提供しています。
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '20px' }}>
                        <a href="/privacy" style={{ color: '#888', textDecoration: 'none' }}>Privacy Policy</a>
                        <a href="/credits" style={{ color: '#888', textDecoration: 'none' }}>Credits</a>
                        <span>&copy; 2026 JapanRailNote</span>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default SEOContent;
