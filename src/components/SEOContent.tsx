'use client';

import React from 'react';
import { HierarchyCompany, HierarchyLine, SEOData } from '../lib/server-rail-data';
import Link from 'next/link';
import { useI18n } from '../lib/i18n-context';

const TRANSLATIONS = {
    ko: {
        directoryTitle: "일본 철도 노선 디렉토리",
        directorySummary1: "현재 JapanRailNote에서는 일본 전역의 ",
        directorySummary2: "개 철도 회사",
        directorySummary3: "개 노선",
        directorySummary4: "개 이상의 역",
        directorySummary5: " 정보를 제공하고 있습니다. 각 회사를 선택하여 상세 노선과 정차역 정보를 확인해보세요.",
        databaseDesc: "(일본 전역 {lineCount}개 노선, {stationCount}개 역의 전체 데이터베이스)",
        heroTitle: "최고의 인터랙티브 일본 철도 지도 & 여행 트래커",
        heroDesc: "JapanRailNote는 세계에서 가장 복잡한 철도 네트워크를 이용하는 통근자와 여행자 모두를 위한 최고의 디지털 동반자입니다. 일본 47개 도도부현의 모든 JR 노선, 사철, 지하철, 노면전차를 고해상도 인터랙티브 지도로 제공합니다.",
        aboutProject: "프로젝트 소개",
        privacyCookies: "개인정보 처리방침 & 쿠키",
        section1Title: "광범위한 JR 및 사철 데이터",
        section1Desc: "일본의 철도망은 JR 그룹(홋카이도, 동일본, 도카이, 서일본, 시코쿠, 규슈)과 오다큐, 게이오, 도큐와 같은 수백 개의 사철 회사로 나뉘어 있습니다. 저희 지도는 일본 국토교통성(MLIT)의 데이터를 통합하여 신주쿠의 복잡한 승강장부터 홋카이도의 외딴 간이역까지 모든 역을 정확하게 표시합니다.",
        section2Title: "신칸센(고속열차) 네트워크",
        section2Desc: "일본 여행의 중추인 신칸센을 시각화해보세요. 도쿄와 오사카를 잇는 전설적인 도카이도 신칸센부터 홋카이도 신칸센, 규슈 신칸센까지, 현대 일본의 도시 간 이동을 정의하는 고속 회랑을 쉽게 추적할 수 있습니다.",
        section3Title: "디지털 여행 기록 (노리츠부시)",
        section3Desc: "철도 매니아(덴샤 오타쿠)들에게 주행 거리를 기록하는 것은 열정입니다. JapanRailNote를 통해 당신의 여행을 디지털로 기록해보세요. 출발역과 도착역을 선택하고, 고성능 캔버스 지도에서 경로를 시각화하며, 평생 남을 철도 완승 기록을 관리하세요.",
        faqTitle: "자주 묻는 질문 (FAQ)",
        faq1Q: "JR 패스가 지원되나요?",
        faq1A: "네, 재팬 레일 패스에 포함된 모든 JR 노선이 지도에 표시됩니다. 사이드바에서 JR 노선만 필터링하여 패스 사용 계획을 효율적으로 세울 수 있습니다.",
        faq2Q: "지도 데이터는 얼마나 정확한가요?",
        faq2A: "일본 정부에서 제공하는 최신 고정밀 지리 데이터(KSJ)를 사용하여 곡선부의 정확도와 역 위치 정보가 매우 정밀합니다.",
        faq3Q: "모바일에서도 사용할 수 있나요?",
        faq3A: "본 사이트는 반응형으로 제작되었습니다. 열차 안에서 여행을 기록할 때 모바일에 최적화된 인터페이스를 사용해보세요.",
        faq4Q: "어떤 언어가 지원되나요?",
        faq4A: "한국어, 영어, 일본어를 지원합니다. 관광객들이 쉽게 이용할 수 있도록 역 이름과 노선 정보는 다국어로 표시됩니다.",
        footerHome: "홈 (지도)",
        footerCredits: "데이터 출처 및 크레딧",
        footerPrivacy: "개인정보 처리방침",
        footerRegionsLabel: "주요 지역:",
        footerRegions: "홋카이도, 도호쿠, 간토, 주부, 간사이, 주고쿠, 시코쿠, 규슈",
        copyrightDesc: "정밀한 여행과 철도 역사 기록을 위해 디자인되었습니다."
    },
    en: {
        directoryTitle: "Japan Railway Network Directory",
        directorySummary1: "JapanRailNote currently provides information on ",
        directorySummary2: " railway companies",
        directorySummary3: " lines",
        directorySummary4: " over {stationCount} stations",
        directorySummary5: " across Japan. Select each company to see details for lines and stations.",
        databaseDesc: "(Full database of {stationCount} stations across {lineCount} lines in Japan.)",
        heroTitle: "Ultimate Interactive Japan Railway Map & Journey Tracker",
        heroDesc: "JapanRailNote is the premier digital companion for both daily commuters and international travelers navigating the world's most complex railway network. We provide a high-fidelity, interactive visualization of every JR line, private railroad, subway system, and tramway across all 47 prefectures of Japan.",
        aboutProject: "About the Project",
        privacyCookies: "Privacy & Cookies",
        section1Title: "Comprehensive JR & Private Rail Data",
        section1Desc: "Japan's rail network is divided between the JR Group (Hokkaido, East, Central, West, Shikoku, and Kyushu) and hundreds of private railway companies like Odakyu, Keio, and Tokyu. Our map integrates data from the Ministry of Land, Infrastructure, Transport and Tourism (MLIT) to ensure every station, from the bustling platforms of Shinjuku to remote stops in Hokkaido, is accurately represented.",
        section2Title: "The Shinkansen (Bullet Train) Network",
        section2Desc: "Visualize the backbone of Japanese travel: the Shinkansen. From the legendary Tokaido Shinkansen connecting Tokyo and Osaka to the Hokkaido Shinkansen and Kyushu Shinkansen, easily track the high-speed corridors that define modern Japanese inter-city transport.",
        section3Title: "Digital Journey Tracking (Noritsubushi)",
        section3Desc: "For rail enthusiasts (Densha-Otaku), tracking the miles is a passion. JapanRailNote allows you to record your trips digitally. Select your departure and arrival stations, visualize your path on our high-performance canvas map, and keep a permanent record of your railroad completion status.",
        faqTitle: "Frequently Asked Questions",
        faq1Q: "Is the JR Pass covered?",
        faq1A: "Yes, all JR lines included in the Japan Rail Pass are mapped. You can filter for JR lines specifically in our sidebar to plan your pass usage effectively.",
        faq2Q: "How accurate is the map data?",
        faq2A: "We use the latest high-fidelity geographic data (KSJ) provided by the Japanese government, ensuring curve accuracy and station co-location are precise.",
        faq3Q: "Can I use this on mobile?",
        faq3A: "The site is fully responsive. Use the mobile-optimized interface to record trips while you are actually on the train.",
        faq4Q: "What languages are supported?",
        faq4A: "We support Japanese, Korean, and English. Station names and line information are displayed in bilingual formats for ease of use by tourists.",
        footerHome: "Home (Map)",
        footerCredits: "Data Sources & Credits",
        footerPrivacy: "Privacy Policy",
        footerRegionsLabel: "Major Regions:",
        footerRegions: "Hokkaido, Tohoku, Kanto, Chubu, Kansai, Chugoku, Shikoku, Kyushu",
        copyrightDesc: "Designed for precision travel and railroad history tracking."
    },
    ja: {
        directoryTitle: "日本鉄道ネットワーク・ディレクトリ",
        directorySummary1: "JapanRailNoteでは現在、日本全国の",
        directorySummary2: "の鉄道会社",
        directorySummary3: "の路線",
        directorySummary4: "そして{stationCount}以上の駅",
        directorySummary5: "の情報を提供しています。各会社を選択して、詳細な路線や停車駅情報を確認してください。",
        databaseDesc: "(日本全国{lineCount}路線、{stationCount}駅のフルデータベース)",
        heroTitle: "究極のインタラクティブ日本鉄道マップ＆ジャーニートラッカー",
        heroDesc: "JapanRailNoteは、世界で最も複雑な鉄道網を利用する通勤客と旅行者のための究極のデジタルコンパニオンです。日本47都道府県のすべてのJR線、私鉄、地下鉄、路面電車を高精度なインタラクティブマップで提供します。",
        aboutProject: "プロジェクトについて",
        privacyCookies: "プライバシーポリシー＆クッキー",
        section1Title: "広範なJRおよび私鉄データ",
        section1Desc: "日本の鉄道網は、JRグループ（北海道、東日本、東海、西日本、四国、九州）と、小田急、京王、東急などの数百の私鉄会社に分かれています。当マップは国土交通省（MLIT）のデータを統合し、新宿の賑やかなホームから北海道の辺境の駅まで、あらゆる駅を正確に再現しています。",
        section2Title: "新幹線（弾丸列車）ネットワーク",
        section2Desc: "日本旅行の背骨である新幹線を可視化しましょう。東京と大阪を結ぶ伝説の東海道新幹線から、北海道新幹線、九州新幹線まで、現代日本の都市間輸送を定義する高速回廊を簡単に追跡できます。",
        section3Title: "デジタル乗車記録（乗りつぶし）",
        section3Desc: "鉄道ファン（鉄道オタク）にとって、乗車距離を記録することは情熱です JapanRailNoteでは、あなたの旅をデジタルで記録できます。出発駅と到着駅を選択し、高性能なキャンバスマップでルートを可視化して、一生残る乗りつぶし記録を管理しましょう。",
        faqTitle: "よくある質問 (FAQ)",
        faq1Q: "JRパスは対象ですか？",
        faq1A: "はい、ジャパン・レール・パスに含まれるすべてのJR線がマッピングされています。サイドバーでJR線をフィルタリングして、パスの利用計画を効率的に立てることができます。",
        faq2Q: "マップデータの正確性は？",
        faq2A: "日本政府が提供する最新の高精度地理データ（KSJ）を使用しており、曲線の正確さや駅の位置情報が非常に精密です。",
        faq3Q: "モバイルで利用できますか？",
        faq3A: "サイトは完全にレスポンシブ対応です。列車内での記録には、モバイルに最適化されたインターフェースをご利用ください。",
        faq4Q: "対応言語は？",
        faq4A: "日本語、韓国語、英語をサポートしています。観光客の方でも使いやすいよう、駅名や路線情報は多言語で表示されます。",
        footerHome: "ホーム (マップ)",
        footerCredits: "データ出典＆クレジット",
        footerPrivacy: "プライバシーポリシー",
        footerRegionsLabel: "主な地域:",
        footerRegions: "北海道, 東北, 関東, 中部, 近畿, 中国, 四国, 九州",
        copyrightDesc: "精密な旅行と鉄道史の記録のために設計されました。"
    }
};

const RailwayDirectory = ({ data }: { data: SEOData | null }) => {
    const { language } = useI18n();
    const t = TRANSLATIONS[language as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;

    if (!data) return null;

    const { hierarchy, companies, lines, stations, companyCount, lineCount, stationCount } = data;

    return (
        <div style={{ marginTop: '60px', color: '#b0b0b0' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h3 style={{ color: '#fff', fontSize: '24px', marginBottom: '15px' }}>
                    {t.directoryTitle}
                </h3>
                <p style={{ fontSize: '14px', maxWidth: '800px', margin: '0 auto' }}>
                    {t.directorySummary1} <strong>{companyCount}{t.directorySummary2}</strong>,
                    <strong>{lineCount}{t.directorySummary3}</strong>, {t.directorySummary1 === "JapanRailNote currently provides information on " ? "" : language === 'ko' ? "" : ""}
                    {language === 'en' ? (
                        <span> and <strong>over {stationCount} stations</strong></span>
                    ) : (
                        <span> {t.directorySummary1 === "JapanRailNote currently provides information on " ? "and over " : ""}<strong>{stationCount}{t.directorySummary4}</strong></span>
                    )}
                    {t.directorySummary5}
                    <br />
                    <span style={{ opacity: 0.7, fontSize: '12px' }}>
                        {t.databaseDesc.replace('{lineCount}', String(lineCount)).replace('{stationCount}', String(stationCount))}
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
                        <details key={comp.id} style={{
                            backgroundColor: '#25282c',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '1px solid #333'
                        }}>
                            <summary style={{
                                padding: '12px 16px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                color: '#eee',
                                backgroundColor: '#2d3136',
                                userSelect: 'none',
                                outline: 'none'
                            }}>
                                {language === 'en' ? companyData.name_en : companyData.name} {language !== 'en' && `(${companyData.name_en})`}
                            </summary>
                            <div style={{ padding: '10px 16px' }}>
                                {Object.values(comp.lines).map((line: HierarchyLine) => {
                                    const lineData = lines[line.id];
                                    if (!lineData) return null;

                                    return (
                                        <details key={line.id} style={{ marginBottom: '8px', marginLeft: '10px' }}>
                                            <summary style={{
                                                padding: '6px 0',
                                                cursor: 'pointer',
                                                fontSize: '13px',
                                                color: '#ccc',
                                                outline: 'none'
                                            }}>
                                                {language === 'en' ? lineData.name_en : lineData.name} {language !== 'en' && `(${lineData.name_en})`}
                                            </summary>
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
                                                            {language === 'en' ? stationData.name_en : stationData.name}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </details>
                                    );
                                })}
                            </div>
                        </details>
                    );
                })}
            </div>
        </div>
    );
};

const SEOContent = ({ data }: { data: SEOData | null }) => {
    const { language } = useI18n();
    const t = TRANSLATIONS[language as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;

    return (
        <section className="seo-content-root" style={{
            padding: '80px 20px',
            backgroundColor: '#1a1c1e',
            color: '#b0b0b0',
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
                        {t.heroTitle}
                    </h2>
                    <p style={{ fontSize: '18px', maxWidth: '850px', margin: '0 auto', color: '#dcdcdc', marginBottom: '20px' }}>
                        {t.heroDesc}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '14px' }}>
                        <Link href="/credits" style={{ color: '#3498db', textDecoration: 'underline' }}>{t.aboutProject}</Link>
                        <Link href="/privacy" style={{ color: '#3498db', textDecoration: 'underline' }}>{t.privacyCookies}</Link>
                    </div>
                </div>

                {/* Rich Informational Sections */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '40px',
                    marginBottom: '80px'
                }}>
                    <article>
                        <h3 style={{ color: '#fff', fontSize: '20px', marginBottom: '15px', borderLeft: '4px solid #3498db', paddingLeft: '12px' }}>
                            {t.section1Title}
                        </h3>
                        <p style={{ fontSize: '15px' }}>
                            {t.section1Desc}
                        </p>
                    </article>

                    <article>
                        <h3 style={{ color: '#fff', fontSize: '20px', marginBottom: '15px', borderLeft: '4px solid #3498db', paddingLeft: '12px' }}>
                            {t.section2Title}
                        </h3>
                        <p style={{ fontSize: '15px' }}>
                            {t.section2Desc}
                        </p>
                    </article>

                    <article>
                        <h3 style={{ color: '#fff', fontSize: '20px', marginBottom: '15px', borderLeft: '4px solid #3498db', paddingLeft: '12px' }}>
                            {t.section3Title}
                        </h3>
                        <p style={{ fontSize: '15px' }}>
                            {t.section3Desc}
                        </p>
                    </article>
                </div>

                {/* FAQ */}
                <div style={{ backgroundColor: '#25282c', padding: '40px', borderRadius: '12px', marginBottom: '80px', border: '1px solid #333' }}>
                    <h3 style={{ color: '#fff', marginBottom: '25px', textAlign: 'center' }}>{t.faqTitle}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                        <div>
                            <h4 style={{ color: '#eee', marginBottom: '10px' }}>{t.faq1Q}</h4>
                            <p style={{ fontSize: '14px' }}>{t.faq1A}</p>
                        </div>
                        <div>
                            <h4 style={{ color: '#eee', marginBottom: '10px' }}>{t.faq2Q}</h4>
                            <p style={{ fontSize: '14px' }}>{t.faq2A}</p>
                        </div>
                        <div>
                            <h4 style={{ color: '#eee', marginBottom: '10px' }}>{t.faq3Q}</h4>
                            <p style={{ fontSize: '14px' }}>{t.faq3A}</p>
                        </div>
                        <div>
                            <h4 style={{ color: '#eee', marginBottom: '10px' }}>{t.faq4Q}</h4>
                            <p style={{ fontSize: '14px' }}>{t.faq4A}</p>
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
                    <Link href="/" style={{ color: '#3498db', textDecoration: 'none' }}>{t.footerHome}</Link>
                    <Link href="/credits" style={{ color: '#3498db', textDecoration: 'none' }}>{t.footerCredits}</Link>
                    <Link href="/privacy" style={{ color: '#3498db', textDecoration: 'none' }}>{t.footerPrivacy}</Link>
                    <span style={{ color: '#555' }}>|</span>
                    <span style={{ color: '#888' }}>{t.footerRegionsLabel}</span>
                    <span style={{ color: '#ccc' }}>{t.footerRegions}</span>
                </nav>

                <div style={{ marginTop: '40px', textAlign: 'center', fontSize: '12px', color: '#999' }}>
                    <p>&copy; {new Date().getFullYear()} JapanRailNote. {t.copyrightDesc}</p>
                </div>
            </div>
        </section>
    );
};

export default SEOContent;
