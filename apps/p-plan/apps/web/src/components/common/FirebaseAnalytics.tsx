'use client';

import { useEffect } from 'react';
import { initAnalytics } from '@pplaner/shared';

export default function FirebaseAnalytics() {
    useEffect(() => {
        // Only run on client
        initAnalytics();
    }, []);

    return null;
}
