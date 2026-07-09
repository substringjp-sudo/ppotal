// Server Component - No 'use client' directive
// Renders static multilingual content for SEO crawlers and AdSense bots

import React from 'react';
import Link from 'next/link';
import { HierarchyCompany, HierarchyLine, SEOData } from '../lib/server-rail-data';

const RailwayDirectory = ({ data }: { data: SEOData | null }) => {
    if (!data) return null;

    const { hierarchy, companies, lines, stations, companyCount, lineCount, stationCount } = data;

    return (
        <div style={{ marginTop: '60px', color: '#b0b0b0' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h3 style={{ color: '#fff', fontSize: '24px', marginBottom: '15px' }}>
                    Japan Railway Directory / 日本鉄道路線一覧 / 일본 철도 노선 디렉토리
                </h3>
                <p style={{ fontSize: '14px', maxWidth: '800px', margin: '0 auto' }}>
                    JapanRailNote provides information on&nbsp;
                    <strong>{companyCount} companies</strong>,&nbsp;
                    <strong>{lineCount} lines</strong>, and&nbsp;
                    <strong>over {stationCount} stations</strong>.
                    <br />
                    <span style={{ opacity: 0.7, fontSize: '12px' }}>
                        日本全国の鉄道事業者・路線・駅を網羅。完乗・乗車記録と経路検索に対応。
                        &nbsp;/&nbsp;
                        일본 전국 {lineCount}개 노선, {stationCount}개 이상의 역 정보를 제공하며, 탑승 기록과 경로 검색을 지원합니다.
                    </span>
                </p>
            </div>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '20px'
            }}>
                {Object.values(hierarchy.companies).map((comp: HierarchyCompany) => {
                    const companyData = companies[comp.id];
                    if (!companyData) return null;

                    return (
                        <div key={comp.id} style={{
                            backgroundColor: '#25282c',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '1px solid #333'
                        }}>
                            <div style={{
                                padding: '12px 16px',
                                fontWeight: 'bold',
                                color: '#eee',
                                backgroundColor: '#2d3136',
                                userSelect: 'none'
                            }}>
                                {companyData.name} ({companyData.name_en})
                            </div>
                            <div style={{ padding: '10px 16px' }}>
                                {Object.values(comp.lines).map((line: HierarchyLine) => {
                                    const lineData = lines[line.id];
                                    if (!lineData) return null;

                                    return (
                                        <div key={line.id} style={{ marginBottom: '16px', marginLeft: '10px' }}>
                                            <div style={{
                                                padding: '6px 0',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                color: '#e0e0e0',
                                            }}>
                                                {lineData.name} ({lineData.name_en})
                                            </div>
                                            <div style={{
                                                padding: '8px 10px',
                                                fontSize: '12px',
                                                color: '#b0b0b0',
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                                                gap: '4px',
                                                borderLeft: '1px solid #444',
                                                marginTop: '4px'
                                            }}>
                                                {line.platforms.map((p: { platform_id: string; station_id: string }, idx: number) => {
                                                    const stationData = stations[p.station_id];
                                                    if (!stationData) return null;
                                                    return (
                                                        <span key={`${line.id}-${p.station_id}-${idx}`} title={stationData.name_en}>
                                                            {stationData.name} {stationData.name_en !== stationData.name ? `(${stationData.name_en})` : ''}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const SEOContent = ({ data }: { data: SEOData | null }) => {
    return (
        <section className="seo-content-root" style={{
            padding: '80px 20px',
            backgroundColor: '#1a1c1e',
            color: '#b0b0b0',
            lineHeight: '1.8',
            borderTop: '1px solid #333'
        }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                {/* Brand & Introduction - Static multilingual */}
                <div style={{ marginBottom: '60px', textAlign: 'center' }}>
                    <h2 style={{
                        fontSize: '32px',
                        color: '#fff',
                        fontWeight: '800',
                        marginBottom: '20px',
                        letterSpacing: '-0.5px'
                    }}>
                        JapanRailNote — Interactive Japan Railway Map & Travel Tracker
                    </h2>
                    <p style={{ fontSize: '16px', maxWidth: '850px', margin: '0 auto', color: '#dcdcdc', marginBottom: '10px' }}>
                        Explore and record your Japan railway journeys across JR, private railways, and subway networks.
                    </p>
                    <p style={{ fontSize: '15px', maxWidth: '850px', margin: '0 auto', color: '#c0c0c0', marginBottom: '10px' }}>
                        日本全国の鉄道路線（JR・私鉄・地下鉄）を網羅したインタラクティブ地図で、乗りつぶし記録と経路検索を楽しめます。
                    </p>
                    <p style={{ fontSize: '15px', maxWidth: '850px', margin: '0 auto', color: '#c0c0c0', marginBottom: '20px' }}>
                        JR, 사철, 지하철 등 일본 전역의 철도 노선을 한눈에 보고, 나만의 여행 기록을 체계적으로 관리하세요.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '14px' }}>
                        <Link href="/credits" style={{ color: '#3498db', textDecoration: 'underline' }}>About Project / プロジェクトについて / 프로젝트 소개</Link>
                        <Link href="/privacy" style={{ color: '#3498db', textDecoration: 'underline' }}>Privacy Policy / プライバシーポリシー / 개인정보처리방침</Link>
                    </div>
                </div>

                {/* Rich Informational Sections - trilingual */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '40px',
                    marginBottom: '80px'
                }}>
                    <article style={{ backgroundColor: '#202225', padding: '24px', borderRadius: '8px', border: '1px solid #333' }}>
                        <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '15px', borderLeft: '4px solid #3b82f6', paddingLeft: '12px', fontWeight: 'bold' }}>
                            일본 철도 완승 기록 & 노선도 시각화
                        </h3>
                        <p style={{ fontSize: '14px', color: '#a0a0a0', lineHeight: '1.7' }}>
                            내가 탑승한 철도 노선과 구간을 마우스 클릭이나 모바일 터치로 간편하게 칠하고, 노선별·회사별 완주율 및 총 승차 거리를 자동으로 계산하는 온라인 철도 완승 기록 사이트입니다. 일철덕(일본 철도 덕후)을 위한 전 노선 완승 기록, 패스 효율 극대화 및 패스 뽕 루트 확인, 역 스탬프(에키스탬프) 수집 및 비경역 답사 등 감성적인 철도 여행의 모든 발자취를 지도에 시각화해 보세요.
                        </p>
                    </article>

                    <article style={{ backgroundColor: '#202225', padding: '24px', borderRadius: '8px', border: '1px solid #333' }}>
                        <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '15px', borderLeft: '4px solid #3b82f6', paddingLeft: '12px', fontWeight: 'bold' }}>
                            전국 JR 패스 노선 지도 & 청춘 18 티켓 플래너
                        </h3>
                        <p style={{ fontSize: '14px', color: '#a0a0a0', lineHeight: '1.7' }}>
                            전국 JR 패스, JR 서일본 패스 등 다양한 할인이 지원되는 JR 패스 노선도 범위 및 커버리지를 인터랙티브 맵 상에서 확인할 수 있습니다. 청춘 18 티켓을 이용한 소도시 로컬 철도 종단 여행 경로 설계와 신칸센 노선도 최적 연결 경로 탐색에 최적화되어 있습니다.
                        </p>
                    </article>

                    <article style={{ backgroundColor: '#202225', padding: '24px', borderRadius: '8px', border: '1px solid #333' }}>
                        <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '15px', borderLeft: '4px solid #2ecc71', paddingLeft: '12px', fontWeight: 'bold' }}>
                            鉄道完乗記録マップ・乗車記録ツール
                        </h3>
                        <p style={{ fontSize: '14px', color: '#a0a0a0', lineHeight: '1.7' }}>
                            JR全線、大手私鉄、地下鉄、全国のローカル線を白地図上で記録し、完乗率や乗車走行距離を自動集計・ビジュアル化するデジタルツールです。乗り鉄や完乗派の盲腸線乗りつぶし記録、大回り乗車ルートの管理、駅スタンプや鉄印帳の収集記録、都道府県別の乗車率チェックに最適で、完成した地図は画像としてSNSにエクスポート可能です。
                        </p>
                    </article>

                    <article style={{ backgroundColor: '#202225', padding: '24px', borderRadius: '8px', border: '1px solid #333' }}>
                        <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '15px', borderLeft: '4px solid #e74c3c', paddingLeft: '12px', fontWeight: 'bold' }}>
                            Japan Rail Pass Calculator & Itinerary Planner
                        </h3>
                        <p style={{ fontSize: '14px', color: '#a0a0a0', lineHeight: '1.7' }}>
                            Designed for international backpackers, railfans, and trainspotters. Use our interactive Shinkansen network and private railway map to check JR Pass coverage, track mileage for railway bashing (shinkansen bashing), calculate point-to-point distances, and keep a permanent completion log of your Japanese rail travels.
                        </p>
                    </article>
                </div>

                {/* FAQ - multilingual */}
                <div style={{ backgroundColor: '#25282c', padding: '40px', borderRadius: '12px', marginBottom: '80px', border: '1px solid #333' }}>
                    <h3 style={{ color: '#fff', marginBottom: '25px', textAlign: 'center' }}>
                        FAQ — Frequently Asked Questions
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px' }}>
                        <div>
                            <h4 style={{ color: '#eee', marginBottom: '10px' }}>Is JapanRailNote free to use?</h4>
                            <p style={{ fontSize: '14px' }}>Yes, JapanRailNote is completely free. Your travel records are saved locally on your device. Cloud sync is available as an optional feature.</p>
                        </div>
                        <div>
                            <h4 style={{ color: '#eee', marginBottom: '10px' }}>無料で使えますか？</h4>
                            <p style={{ fontSize: '14px' }}>はい、JapanRailNoteは完全に無料でご利用いただけます。乗車記録はブラウザに保存され、オプションでクラウド同期も可能です。</p>
                        </div>
                        <div>
                            <h4 style={{ color: '#eee', marginBottom: '10px' }}>무료인가요?</h4>
                            <p style={{ fontSize: '14px' }}>네, JapanRailNote는 완전 무료입니다. 이동 경로는 기기에 로컬로 저장되며, 클라우드 동기화 기능도 선택적으로 제공됩니다.</p>
                        </div>
                        <div>
                            <h4 style={{ color: '#eee', marginBottom: '10px' }}>Which railway lines are covered?</h4>
                            <p style={{ fontSize: '14px' }}>Over {data?.lineCount ?? 3000} lines including all JR group lines, Tokyo Metro, Toei Subway, Osaka Metro, and hundreds of private railways across Japan.</p>
                        </div>
                    </div>
                </div>

                {/* Dynamic Directory */}
                <RailwayDirectory data={data} />

                {/* Navigation Footer */}
                <nav style={{
                    marginTop: '80px',
                    paddingTop: '40px',
                    borderTop: '1px solid #333',
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '20px',
                    flexWrap: 'wrap',
                    fontSize: '14px'
                }}>
                    <Link href="/" style={{ color: '#3498db', textDecoration: 'none' }}>Home / ホーム / 홈</Link>
                    <Link href="/credits" style={{ color: '#3498db', textDecoration: 'none' }}>Credits / クレジット / 크레딧</Link>
                    <Link href="/privacy" style={{ color: '#3498db', textDecoration: 'none' }}>Privacy Policy / プライバシー / 개인정보처리방침</Link>
                    <span style={{ color: '#555' }}>|</span>
                    <span style={{ color: '#888' }}>Regions: </span>
                    <span style={{ color: '#ccc' }}>Hokkaido, Tohoku, Kanto, Chubu, Kinki, Chugoku, Shikoku, Kyushu, Okinawa</span>
                </nav>

                <div style={{ marginTop: '40px', textAlign: 'center', fontSize: '12px', color: '#999' }}>
                    <p>&copy; {new Date().getFullYear()} JapanRailNote. All rights reserved. Data source: Ministry of Land, Infrastructure, Transport and Tourism (国土交通省).</p>
                </div>
            </div>
        </section>
    );
};

export default SEOContent;
