'use client';

import React from 'react';
import { HierarchyCompany, HierarchyLine, SEOData } from '../lib/server-rail-data';
import Link from 'next/link';
import { useI18n } from '../lib/i18n-context';

import { MAIN_PAGE_TRANSLATIONS, getTranslations } from '../lib/translations';


const RailwayDirectory = ({ data }: { data: SEOData | null }) => {
    const { language } = useI18n();
    const t = getTranslations(MAIN_PAGE_TRANSLATIONS, language);

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
    const t = getTranslations(MAIN_PAGE_TRANSLATIONS, language);

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
