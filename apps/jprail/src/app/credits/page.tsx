import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'About JapanRailNote — Credits & Project Information | 프로젝트 소개 | プロジェクトについて',
    description: 'JapanRailNote is an interactive Japan railway map service. Learn about data sources, attribution, and the project.',
    robots: {
        index: true,
        follow: true,
    },
    other: {
        'google': 'nositelinkssearchbox',
    },
};

const CreditsPage = () => {
    return (
        <main className="min-h-screen py-10 px-4 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-colors">
            <div className="max-w-3xl mx-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl p-8 sm:p-12 rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-800">
                <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 mb-8 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold text-sm transition-colors"
                >
                    <span>←</span> 지도로 돌아가기 (Back to Map)
                </Link>

                <h1 className="text-3xl sm:text-4xl font-black mb-2 tracking-tight text-slate-900 dark:text-white">
                    JapanRailNote
                </h1>
                <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 mb-10">
                    Japan Railway Network Visualization & Travel Log Service
                </p>

                <div className="grid gap-8">
                    {/* Korean Section */}
                    <section className="bg-slate-50/50 dark:bg-slate-800/40 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                        <h2 className="text-lg font-black mb-3 text-slate-900 dark:text-white flex items-center gap-2">
                            <span>🇰🇷</span> 프로젝트 소개 (Korean)
                        </h2>
                        <p className="leading-relaxed text-sm sm:text-base text-slate-600 dark:text-slate-300">
                            JapanRailNote는 일본의 복잡한 철도망을 한눈에 파악하고, 자신의 탑승 기록을 체계적으로 관리할 수 있는 서비스입니다.
                            JR 동일본, JR 서일본 등 6개 JR 그룹사와 도쿄/오사카 지하철, 주요 사철 노선도를 제공하며,
                            거리 자동 계산 기능을 통해 나만의 철도 완주 지도를 만들 수 있습니다.
                        </p>
                    </section>

                    {/* Japanese Section */}
                    <section className="bg-slate-50/50 dark:bg-slate-800/40 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                        <h2 className="text-lg font-black mb-3 text-slate-900 dark:text-white flex items-center gap-2">
                            <span>🇯🇵</span> プロジェクトについて (Japanese)
                        </h2>
                        <p className="leading-relaxed text-sm sm:text-base text-slate-600 dark:text-slate-300">
                            JapanRailNoteは、日本の複雑な鉄道網を可視化し、自身の乗車記録（乗りつぶし）を管理できるインタラクティブ地図サービスです。
                            JR各社、地下鉄、私鉄、LRTなどの路線網を網羅し、移動距離の自動計算や路線の完乗記録をサポートします。
                            鉄道ファンやJRパス利用者に最適なツールを目指しています。
                        </p>
                    </section>

                    {/* English Section */}
                    <section className="bg-slate-50/50 dark:bg-slate-800/40 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                        <h2 className="text-lg font-black mb-3 text-slate-900 dark:text-white flex items-center gap-2">
                            <span>🌐</span> About Project (English)
                        </h2>
                        <p className="leading-relaxed text-sm sm:text-base text-slate-600 dark:text-slate-300">
                            JapanRailNote is an interactive map service designed for JR Pass travelers and railway enthusiasts.
                            It provides a comprehensive visualization of Japan&apos;s complex railway network and allows users to systematically record their journeys.
                        </p>
                    </section>
                </div>

                <h2 className="text-2xl font-black mt-12 mb-6 text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800 pt-8">
                    Data Sources & Attribution
                </h2>

                <section className="mb-8">
                    <h3 className="text-base font-bold mb-2 text-slate-800 dark:text-slate-200">
                        Japan Railway Data
                    </h3>
                    <p className="leading-relaxed text-sm text-slate-600 dark:text-slate-400 mb-3">
                        The railway network, station, and topology data used in this application is based on the National Land Numerical Information provided by the Ministry of Land, Infrastructure, Transport and Tourism of Japan.
                    </p>
                    <div className="bg-slate-100 dark:bg-slate-800/60 p-4 rounded-xl text-xs leading-relaxed text-slate-600 dark:text-slate-300 border-l-4 border-blue-500">
                        <strong className="text-slate-800 dark:text-slate-200">Required Attribution:</strong><br />
                        「国土数値情報（鉄道データ）」（国土交通省）（<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-v3_1.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-v3_1.html</a>）を加工して作成
                    </div>
                </section>

                <section className="mb-8">
                    <h3 className="text-base font-bold mb-2 text-slate-800 dark:text-slate-200">
                        Administrative Boundaries
                    </h3>
                    <p className="leading-relaxed text-sm text-slate-600 dark:text-slate-400 mb-3">
                        The boundary data (ADM0, ADM1, ADM2) used for the background map is provided by geoBoundaries.
                    </p>
                    <div className="bg-slate-100 dark:bg-slate-800/60 p-4 rounded-xl text-xs leading-relaxed text-slate-600 dark:text-slate-300 border-l-4 border-blue-500">
                        <strong className="text-slate-800 dark:text-slate-200">Required Attribution:</strong><br />
                        Boundary data from <a href="https://www.geoboundaries.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">geoBoundaries</a>, licensed under CC BY 4.0.<br />
                        Runfola, D. et al. (2020) geoBoundaries: A global database of political administrative boundaries. PLoS ONE 15(4): e0231866.
                    </div>
                </section>

                <footer className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 dark:text-slate-500">
                    <div className="mb-2">
                        <Link href="/privacy" className="hover:underline mr-4 text-slate-500 dark:text-slate-400">Privacy Policy</Link>
                    </div>
                    &copy; 2026 JapanRailNote. All rights reserved.
                </footer>
            </div>
        </main>
    );
};

export default CreditsPage;
