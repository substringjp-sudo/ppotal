import React from 'react';
import Script from 'next/script';
import Link from 'next/link';
import SEOContent from '../../components/SEOContent';
import { getSEOData } from '../../lib/server-rail-data';

export const metadata = {
    title: "Japan Railway Route Directory | 日本鉄道路線一覧 | 일본 철도 노선 디렉토리",
    description: "Browse the complete directory of Japan's railway network, including all JR lines, private railways, and subways. / 日本全国の鉄道路線と駅の一覧ディレクトリです。 / 일본 전역의 철도 노선과 역 정보 디렉토리입니다.",
};

export default function DirectoryPage() {
    const seoData = getSEOData();

    return (
        <main style={{ minHeight: '100vh', backgroundColor: '#1e2124', paddingBottom: '40px' }}>
            <div style={{
                position: 'sticky', top: 0, zIndex: 100,
                backgroundColor: 'rgba(30, 33, 36, 0.9)', backdropFilter: 'blur(8px)',
                padding: '16px 24px', borderBottom: '1px solid #333',
                display: 'flex', alignItems: 'center', gap: '16px'
            }}>
                <Link href="/" style={{
                    color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px',
                    fontWeight: 'bold', fontSize: '14px', backgroundColor: '#3b82f6', padding: '6px 12px', borderRadius: '4px'
                }}>
                    ← Back to Map
                </Link>
                <h1 style={{ color: '#fff', fontSize: '18px', margin: 0, fontWeight: 'bold' }}>
                    JapanRailNote Directory
                </h1>
            </div>

            <div style={{ padding: '0 24px' }}>
                <Script
                    async
                    src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2007288082586284"
                    strategy="lazyOnload"
                    crossOrigin="anonymous"
                />

                <SEOContent data={seoData} />
            </div>
        </main>
    );
}
