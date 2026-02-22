import React from 'react';
import Link from 'next/link';

const CreditsPage = () => {
    return (
        <main style={{
            minHeight: '100vh',
            padding: '40px 20px',
            backgroundColor: '#f8f9fa',
            color: '#2c3e50',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
        }}>
            <div style={{
                maxWidth: '800px',
                margin: '0 auto',
                backgroundColor: '#fff',
                padding: '40px',
                borderRadius: '24px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
            }}>
                <Link href="/" style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    marginBottom: '30px',
                    color: '#3498db',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    gap: '5px'
                }}>
                    <span>←</span> Back to Map
                </Link>

                <h1 style={{ fontSize: '32px', fontWeight: '900', marginBottom: '10px', letterSpacing: '-1px' }}>
                    JapanRailNote
                </h1>
                <p style={{ fontSize: '18px', color: '#666', marginBottom: '40px' }}>
                    Japan Railway Network Visualization & Travel Log Service
                </p>

                <div style={{ display: 'grid', gap: '40px' }}>
                    {/* English Section */}
                    <section>
                        <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '15px', color: '#2c3e50' }}>About Project (English)</h2>
                        <p style={{ lineHeight: '1.8', fontSize: '15px', color: '#444' }}>
                            JapanRailNote is an interactive map service designed for JR Pass travelers and railway enthusiasts.
                            It provides a comprehensive visualization of Japan&apos;s complex railway network and allows users to systematically record their journeys.
                        </p>
                    </section>

                    {/* Korean Section */}
                    <section>
                        <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '15px', color: '#2c3e50' }}>프로젝트 소개 (Korean)</h2>
                        <p style={{ lineHeight: '1.8', fontSize: '15px', color: '#444' }}>
                            JapanRailNote는 일본의 복잡한 철도망을 한눈에 파악하고, 자신의 탑승 기록을 체계적으로 관리할 수 있는 서비스입니다.
                            JR 동일본, JR 서일본 등 6개 JR 그룹사와 도쿄/오사카 지하철, 주요 사철 노선도를 제공하며,
                            거리 자동 계산 기능을 통해 나만의 철도 완주 지도를 만들 수 있습니다.
                        </p>
                    </section>

                    {/* Japanese Section */}
                    <section>
                        <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '15px', color: '#2c3e50' }}>プロジェクトについて (Japanese)</h2>
                        <p style={{ lineHeight: '1.8', fontSize: '15px', color: '#444' }}>
                            JapanRailNoteは、日本の複雑な鉄道網を可視化し、自身の乗차記録（乗りつぶし）を管理できるインタラクティブ地図サービスです。
                            JR各社、地下鉄、私鉄、LRTなどの路線網を網羅し、移動距離の自動計算や路線の完乗記録をサポートします。
                            鉄道ファンやJRパス利用者に最適なツールを目指しています。
                        </p>
                    </section>
                </div>

                <h2 style={{ fontSize: '24px', fontWeight: '900', marginTop: '40px', marginBottom: '25px', color: '#2c3e50', borderTop: '2px solid #f0f0f0', paddingTop: '40px' }}>
                    Data Sources & Attribution
                </h2>

                <section style={{ marginBottom: '40px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '15px' }}>
                        Japan Railway Data
                    </h3>
                    <p style={{ lineHeight: '1.6', color: '#555' }}>
                        The railway network, station, and topology data used in this application is based on the National Land Numerical Information provided by the Ministry of Land, Infrastructure, Transport and Tourism of Japan.
                    </p>
                    <div style={{
                        backgroundColor: '#f1f3f5',
                        padding: '15px',
                        borderRadius: '12px',
                        fontSize: '14px',
                        marginTop: '15px',
                        borderLeft: '4px solid #3498db'
                    }}>
                        <strong>Required Attribution:</strong><br />
                        「国土数値情報（鉄道データ）」（国土交通省）（<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-v3_1.html" target="_blank" rel="noopener noreferrer" style={{ color: '#3498db' }}>https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-v3_1.html</a>）を加工して作成
                    </div>
                </section>

                <section style={{ marginBottom: '40px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '15px' }}>
                        Administrative Boundaries
                    </h3>
                    <p style={{ lineHeight: '1.6', color: '#555' }}>
                        The boundary data (ADM0, ADM1, ADM2) used for the background map is provided by geoBoundaries.
                    </p>
                    <div style={{
                        backgroundColor: '#f1f3f5',
                        padding: '15px',
                        borderRadius: '12px',
                        fontSize: '14px',
                        marginTop: '15px',
                        borderLeft: '4px solid #3498db'
                    }}>
                        <strong>Required Attribution:</strong><br />
                        Boundary data from <a href="https://www.geoboundaries.org" target="_blank" rel="noopener noreferrer" style={{ color: '#3498db' }}>geoBoundaries</a>, licensed under CC BY 4.0.<br />
                        Runfola, D. et al. (2020) geoBoundaries: A global database of political administrative boundaries. PLoS ONE 15(4): e0231866.
                    </div>
                </section>

                <footer style={{ marginTop: '60px', paddingTop: '20px', borderTop: '1px solid #eee', textAlign: 'center', fontSize: '12px', color: '#999' }}>
                    <div style={{ marginBottom: '10px' }}>
                        <Link href="/privacy" style={{ color: '#999', textDecoration: 'underline', marginRight: '15px' }}>Privacy Policy</Link>
                    </div>
                    &copy; 2026 JapanRailNote. All rights reserved.
                </footer>
            </div>
        </main>
    );
};

export default CreditsPage;
