"use client";

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
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
            }}>
                <Link href="/" style={{
                    display: 'inline-block',
                    marginBottom: '20px',
                    color: '#3498db',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    fontSize: '14px'
                }}>
                    ← Back to Map
                </Link>

                <h1 style={{ fontSize: '32px', fontWeight: '900', marginBottom: '30px', letterSpacing: '-1px' }}>
                    Data Sources & Attribution
                </h1>

                <section style={{ marginBottom: '40px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
                        Japan Railway Data
                    </h2>
                    <p style={{ lineHeight: '1.6', color: '#555' }}>
                        The railway network, station, and topology data used in this application is based on the National Land Numerical Information provided by the Ministry of Land, Infrastructure, Transport and Tourism of Japan.
                    </p>
                    <div style={{
                        backgroundColor: '#f1f3f5',
                        padding: '15px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        marginTop: '15px',
                        borderLeft: '4px solid #3498db'
                    }}>
                        <strong>Required Attribution:</strong><br />
                        「国土数値情報（鉄道データ）」（国土交通省）（<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-v3_1.html" target="_blank" rel="noopener noreferrer" style={{ color: '#3498db' }}>https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-v3_1.html</a>）を加工して作成
                    </div>
                </section>

                <section style={{ marginBottom: '40px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
                        Administrative Boundaries
                    </h2>
                    <p style={{ lineHeight: '1.6', color: '#555' }}>
                        The boundary data (ADM0, ADM1, ADM2) used for the background map is provided by geoBoundaries.
                    </p>
                    <div style={{
                        backgroundColor: '#f1f3f5',
                        padding: '15px',
                        borderRadius: '8px',
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
                    &copy; 2026 JapanRailNote. All rights reserved.
                </footer>
            </div>
        </main>
    );
};

export default CreditsPage;
