import React from 'react';
import Script from 'next/script';
import MainPageClient from '../components/MainPageClient';
import SEOContent from '../components/SEOContent';
import { getSEOData } from '../lib/server-rail-data';

export default function Page() {
    const seoData = getSEOData();

    return (
        <>
            {/* AdSense Auto Ads — Only on the content-rich main page */}
            <Script
                async
                src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2007288082586284"
                strategy="lazyOnload"
                crossOrigin="anonymous"
            />

            {/* The interactive client-side application */}
            <MainPageClient />

            {/* Static content for SEO and AdSense Bots (Server Component) */}
            <SEOContent data={seoData} />
        </>
    );
}
