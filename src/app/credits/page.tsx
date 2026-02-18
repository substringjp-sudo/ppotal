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

                <section style={{ marginBottom: '50px' }}>
                    <p style={{ lineHeight: '1.8', fontSize: '16px', color: '#444', marginBottom: '30px' }}>
                        JapanRailNote is an interactive map service that allows you to understand Japan's complex railway network at a glance and systematically record your rail travels. It is designed for JR Pass travelers, railway enthusiasts, and anyone planning a trip to Japan.
                    </p>

                    <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '20px', color: '#2c3e50' }}>Key Features</h2>
                    <ul style={{ paddingLeft: '20px', lineHeight: '1.8', color: '#555', marginBottom: '30px' }}>
                        <li><strong>Railway Network Visualization:</strong> Provides an integrated map covering JR companies, city subways, various private railways, and Light Rail Transit (LRT).</li>
                        <li><strong>Smart Travelog:</strong> Record the stations and lines you've actually traveled on with a single click, and update your personal Japan railway completion map in real-time.</li>
                        <li><strong>Accurate Statistics:</strong> Automatically calculate cumulative travel distance (km) and the number of visited stations to help rail enthusiasts achieve their goals.</li>
                        <li><strong>Route Discovery:</strong> Explore the shortest paths for key sections and provide basic information for travel planning.</li>
                    </ul>

                    <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '20px', color: '#2c3e50' }}>Recommended For</h2>
                    <ul style={{ paddingLeft: '20px', lineHeight: '1.8', color: '#555', marginBottom: '30px' }}>
                        <li><strong>JR Pass Users:</strong> Those who want to check valid pass sections and plan efficient travel itineraries.</li>
                        <li><strong>Railway Enthusiasts:</strong> For "Noritetsu" (railway riders) who want to visualize their completion records for all lines.</li>
                        <li><strong>Independent Travelers:</strong> Those who want to easily understand complex urban railway networks in Tokyo, Osaka, Fukuoka, etc.</li>
                    </ul>
                </section>

                <h2 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '25px', color: '#2c3e50', borderTop: '2px solid #f0f0f0', paddingTop: '40px' }}>
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

                <p style={{ fontSize: '14px', color: '#777', lineHeight: '1.6', fontStyle: 'italic' }}>
                    JapanRailNote is continuously updated based on reliable data from the Ministry of Land, Infrastructure, Transport and Tourism of Japan. We strive to provide more convenient and intuitive railway information services.
                </p>

                <footer style={{ marginTop: '60px', paddingTop: '20px', borderTop: '1px solid #eee', textAlign: 'center', fontSize: '12px', color: '#999' }}>
                    &copy; 2026 JapanRailNote. All rights reserved.
                </footer>
            </div>
        </main>
    );
};

export default CreditsPage;
