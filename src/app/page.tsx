import React from 'react';
import MainPageClient from '../components/MainPageClient';
import SEOContent from '../components/SEOContent';
import { getSEOData } from '../lib/server-rail-data';

export default function Page() {
    const seoData = getSEOData();

    return (
        <>
            {/* The interactive client-side application */}
            <MainPageClient />

            {/* Static content for SEO and AdSense Bots */}
            <SEOContent data={seoData} />
        </>
    );
}
