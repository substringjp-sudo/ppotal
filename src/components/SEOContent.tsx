import React from 'react';
import fs from 'fs';
import path from 'path';
import { Company, Line, Station } from '../types/railData';
import Link from 'next/link';

interface HierarchyCompany {
    id: number;
    lines: Record<string, HierarchyLine>;
}

interface HierarchyLine {
    id: number;
    corp_id: number;
    platforms: {
        platform_id: string;
        station_id: string;
    }[];
}

const RailwayDirectory = () => {
    let data = null;
    try {
        const hierarchyPath = path.join(process.cwd(), 'public/rail/railroad_hierarchy.json');
        const companiesPath = path.join(process.cwd(), 'public/rail/companies.json');
        const linesPath = path.join(process.cwd(), 'public/rail/lines.json');
        const stationsPath = path.join(process.cwd(), 'public/rail/stations.json');

        if (fs.existsSync(hierarchyPath)) {
            const hierarchy = JSON.parse(fs.readFileSync(hierarchyPath, 'utf-8'));
            const companies = JSON.parse(fs.readFileSync(companiesPath, 'utf-8'));
            const lines = JSON.parse(fs.readFileSync(linesPath, 'utf-8'));
            const stations = JSON.parse(fs.readFileSync(stationsPath, 'utf-8'));

            data = {
                hierarchy: hierarchy as { companies: Record<string, HierarchyCompany> },
                companies: companies as Record<string, Company>,
                lines: lines as Record<string, Line>,
                stations: stations as Record<string, Station>,
                companyCount: Object.keys(hierarchy.companies).length,
                lineCount: Object.keys(lines).length,
                stationCount: Object.keys(stations).length
            };
        }
    } catch (e) {
        console.error("Failed to load SEO directory data", e);
    }

    if (!data) return null;

    const { hierarchy, companies, lines, stations, companyCount, lineCount, stationCount } = data;

    return (
        <div style={{ marginTop: '60px', color: '#b0b0b0' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h3 style={{ color: '#fff', fontSize: '24px', marginBottom: '15px' }}>
                    Japan Railway Network Directory
                </h3>
                <p style={{ fontSize: '14px', maxWidth: '800px', margin: '0 auto' }}>
                    현재 JapanRailNote에서는 일본 전역의 <strong>{companyCount}개 철도 회사</strong>,
                    <strong>{lineCount}개 노선</strong>, 그리고 <strong>{stationCount}개 이상의 역</strong> 정보를 제공하고 있습니다.
                    각 회사를 선택하여 상세 노선과 정차역 정보를 확인해보세요.
                    (Full database of {stationCount} stations across {lineCount} lines in Japan.)
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
                                {companyData.name} ({companyData.name_en})
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
                                                {lineData.name} ({lineData.name_en})
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
                                                            {stationData.name}
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

const SEOContent = () => {
    return (
        <section style={{
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
                        Ultimate Interactive Japan Railway Map & Journey Tracker
                    </h2>
                    <p style={{ fontSize: '18px', maxWidth: '850px', margin: '0 auto', color: '#dcdcdc', marginBottom: '20px' }}>
                        JapanRailNote is the premier digital companion for both daily commuters and international travelers navigating the world&apos;s most complex railway network.
                        We provide a high-fidelity, interactive visualization of every JR line, private railroad, subway system, and tramway across all 47 prefectures of Japan.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '14px' }}>
                        <Link href="/credits" style={{ color: '#3498db', textDecoration: 'underline' }}>About the Project</Link>
                        <Link href="/privacy" style={{ color: '#3498db', textDecoration: 'underline' }}>Privacy & Cookies</Link>
                    </div>
                </div>

                {/* Rich Informational Sections (High Value Content for AdSense) */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '40px',
                    marginBottom: '80px'
                }}>
                    <article>
                        <h3 style={{ color: '#fff', fontSize: '20px', marginBottom: '15px', borderLeft: '4px solid #3498db', paddingLeft: '12px' }}>
                            Comprehensive JR & Private Rail Data
                        </h3>
                        <p style={{ fontSize: '15px' }}>
                            Japan&apos;s rail network is divided between the <strong>JR Group</strong> (Hokkaido, East, Central, West, Shikoku, and Kyushu) and hundreds of <strong>private railway companies</strong> like Odakyu, Keio, and Tokyu.
                            Our map integrates data from the Ministry of Land, Infrastructure, Transport and Tourism (MLIT) to ensure every station, from the bustling platforms of Shinjuku to remote stops in Hokkaido, is accurately represented.
                        </p>
                    </article>

                    <article>
                        <h3 style={{ color: '#fff', fontSize: '20px', marginBottom: '15px', borderLeft: '4px solid #3498db', paddingLeft: '12px' }}>
                            The Shinkansen (Bullet Train) Network
                        </h3>
                        <p style={{ fontSize: '15px' }}>
                            Visualize the backbone of Japanese travel: the Shinkansen. From the legendary <strong>Tokaido Shinkansen</strong> connecting Tokyo and Osaka to the <strong>Hokkaido Shinkansen</strong> and <strong>Kyushu Shinkansen</strong>,
                            easily track the high-speed corridors that define modern Japanese inter-city transport.
                        </p>
                    </article>

                    <article>
                        <h3 style={{ color: '#fff', fontSize: '20px', marginBottom: '15px', borderLeft: '4px solid #3498db', paddingLeft: '12px' }}>
                            Digital Journey Tracking (Noritsubushi)
                        </h3>
                        <p style={{ fontSize: '15px' }}>
                            For rail enthusiasts (<em>Densha-Otaku</em>), tracking the miles is a passion. JapanRailNote allows you to record your trips digitally.
                            Select your departure and arrival stations, visualize your path on our high-performance canvas map, and keep a permanent record of your railroad completion status.
                        </p>
                    </article>
                </div>

                {/* FAQ / User Guide (Reduces "Low Value Content" flag) */}
                <div style={{ backgroundColor: '#25282c', padding: '40px', borderRadius: '12px', marginBottom: '80px', border: '1px solid #333' }}>
                    <h3 style={{ color: '#fff', marginBottom: '25px', textAlign: 'center' }}>Frequently Asked Questions</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                        <div>
                            <h4 style={{ color: '#eee', marginBottom: '10px' }}>Is the JR Pass covered?</h4>
                            <p style={{ fontSize: '14px' }}>Yes, all JR lines included in the Japan Rail Pass are mapped. You can filter for JR lines specifically in our sidebar to plan your pass usage effectively.</p>
                        </div>
                        <div>
                            <h4 style={{ color: '#eee', marginBottom: '10px' }}>How accurate is the map data?</h4>
                            <p style={{ fontSize: '14px' }}>We use the latest high-fidelity geographic data (KSJ) provided by the Japanese government, ensuring curve accuracy and station co-location are precise.</p>
                        </div>
                        <div>
                            <h4 style={{ color: '#eee', marginBottom: '10px' }}>Can I use this on mobile?</h4>
                            <p style={{ fontSize: '14px' }}>The site is fully responsive. Use the mobile-optimized interface to record trips while you are actually on the train.</p>
                        </div>
                        <div>
                            <h4 style={{ color: '#eee', marginBottom: '10px' }}>What languages are supported?</h4>
                            <p style={{ fontSize: '14px' }}>We support Japanese, Korean, and English. Station names and line information are displayed in bilingual formats for ease of use by tourists.</p>
                        </div>
                    </div>
                </div>

                {/* Dynamic Directory (Existing high-value data) */}
                <RailwayDirectory />

                {/* Navigation Footer (Solves "Site Navigation" issues) */}
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
                    <Link href="/" style={{ color: '#3498db', textDecoration: 'none' }}>Home (Map)</Link>
                    <Link href="/credits" style={{ color: '#3498db', textDecoration: 'none' }}>Data Sources & Credits</Link>
                    <Link href="/privacy" style={{ color: '#3498db', textDecoration: 'none' }}>Privacy Policy</Link>
                    <span style={{ color: '#555' }}>|</span>
                    <span style={{ color: '#888' }}>Major Regions:</span>
                    <span style={{ color: '#ccc' }}>Hokkaido, Tohoku, Kanto, Chubu, Kansai, Chugoku, Shikoku, Kyushu</span>
                </nav>

                <div style={{ marginTop: '40px', textAlign: 'center', fontSize: '12px', color: '#999' }}>
                    <p>&copy; {new Date().getFullYear()} JapanRailNote (일본 철도 노트). Designed for precision travel and railroad history tracking.</p>
                </div>
            </div>
        </section>
    );
};

export default SEOContent;
