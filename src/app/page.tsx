import React from 'react';
import MainPageClient from '../components/MainPageClient';
import SEOContent from '../components/SEOContent';

export default function Page() {
    return (
        <>
            {/* The interactive client-side application */}
            <MainPageClient />

            {/* Static content for SEO and AdSense Bots */}
            {/* This is rendered on the server, ensuring bots see content even if JS isn't fully executed or data isn't fetched. */}
            <SEOContent />
        </>
    );
}
