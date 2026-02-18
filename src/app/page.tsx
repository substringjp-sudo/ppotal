import React from 'react';
import AppClient from './AppClient';
import BotContent from '../components/BotContent';

const Page = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Interactive App (Client Component) */}
            <AppClient />

            {/* Static Content for SEO & AdSense Bot (SSR) */}
            <div id="content-info" style={{
                backgroundColor: '#fff',
                borderTop: '1px solid #ddd',
                zIndex: 50 // Map has high z-index, interactive elements usually lower but header is 100
            }}>
                <BotContent />
            </div>
        </div>
    );
};

export default Page;
