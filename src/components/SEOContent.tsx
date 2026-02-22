import React from 'react';
import fs from 'fs';
import path from 'path';
import { Company, Line, Station } from '../types/railData';

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
        <div style={{ marginTop: '60px', color: '#888' }}>
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
                                                color: '#999',
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                                                gap: '4px',
                                                borderLeft: '1px solid #444',
                                                marginTop: '4px'
                                            }}>
                                                {line.platforms.map((p, idx: number) => {
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
                        JapanRailNote is a comprehensive digital companion for travelers navigating Japan&apos;s vast railway system.
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
                    <div>
                        <h4 style={{ color: '#fff', marginBottom: '15px' }}>Smart Route Planning</h4>
                        <p>Our interactive map uses real-world geographic data (KSJ) to provide accurate pathfinding across all islands of Japan.</p>
                    </div>
                    <div>
                        <h4 style={{ color: '#fff', marginBottom: '15px' }}>Historical Tracking</h4>
                        <p>Keep a detailed record of every line you have traveled. Perfect for rail enthusiasts (Densha-Otaku) and casual travelers alike.</p>
                    </div>
                    <div>
                        <h4 style={{ color: '#fff', marginBottom: '15px' }}>High Fidelity Data</h4>
                        <p>We process millions of geographic points to render the most accurate representation of Japan&apos;s complex rail infrastructure.</p>
                    </div>
                </div>

                <RailwayDirectory />

                <div style={{ marginTop: '80px', textAlign: 'center', opacity: '0.6', fontSize: '12px' }}>
                    <p>&copy; {new Date().getFullYear()} JapanRailNote. All railroad data source: MLIT National Land Numerical Information.</p>
                </div>
            </div>
        </section>
    );
};

export default SEOContent;
