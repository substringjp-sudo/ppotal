import React from 'react';
import type { Metadata } from 'next';
import AppPrivacyContent from './AppPrivacyContent';

export const metadata: Metadata = {
    title: 'JapanRailNote App Privacy Policy | 모바일 앱 개인정보처리방침',
    description: 'Privacy Policy for the JapanRailNote Android Mobile Application. Details on Google Auth, Cloud Sync, and Local Timeline Processing.',
    robots: {
        index: true,
        follow: true,
    },
};

export default function AppPrivacyPage() {
    return <AppPrivacyContent />;
}
