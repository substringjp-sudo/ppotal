import React from 'react';
import { Language } from '../lib/translations';

interface HowToModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentLanguage?: Language;
}

const UI_TEXT = {
    title: 'How to Use',
    startBtn: 'Get Started',
    desktop: 'Desktop',
    mobile: 'Mobile'
};

const GUIDES = {
    desktop: [
        { title: 'Explore Lines & Stations', desc: 'Click on lines or dots (stations) on the map to see detailed information.' },
        { title: 'Record Your Trip', desc: 'Select stations in the line detail window to record your route and calculate total distance.' },
        { title: 'Use Sidebar', desc: "Enable or disable an entire company's lines from the left sidebar." },
        { title: 'Find Routes', desc: 'Search for the shortest path by selecting start and end stations in the Route tab.' },
        { title: 'Map Control', desc: 'Use mouse wheel to zoom in/out and drag to move the map.' }
    ],
    mobile: [
        { title: 'Touch Lines & Stations', desc: 'Lightly touch lines or stations on the map to see detailed information.' },
        { title: 'Use Edit Mode', desc: "Tap the 'Edit' button at the top to enter route recording mode." },
        { title: 'Drag to Record', desc: 'In Edit Mode, click a starting station once, then drag your finger to the next station to draw the path.' },
        { title: 'Save Progress', desc: "Tap 'Add' in the bottom panel to save your trip and update your stats." },
        { title: 'Map Control', desc: 'Pinch with two fingers to zoom and move with one finger.' }
    ]
};

const HowToModal: React.FC<HowToModalProps> = ({ isOpen, onClose, currentLanguage = 'en' }) => {
    const [activeTab, setActiveTab] = React.useState<'desktop' | 'mobile'>('desktop');

    // Sync active tab and detect device
    React.useEffect(() => {
        if (isOpen) {
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            setActiveTab(isMobileDevice ? 'mobile' : 'desktop');

            const handleEscape = (e: KeyboardEvent) => {
                if (e.key === 'Escape') onClose();
            };
            window.addEventListener('keydown', handleEscape);
            return () => window.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const lang = currentLanguage;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="howto-modal-title"
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(4px)'
            }}
            onClick={onClose}
        >
            <div style={{
                backgroundColor: '#fff', width: '90%', maxWidth: '500px',
                borderRadius: '24px', padding: '30px', position: 'relative',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)', animation: 'modalSlideUp 0.3s ease-out'
            }} onClick={e => e.stopPropagation()}>

                <h2 id="howto-modal-title" style={{ fontSize: '24px', fontWeight: '900', marginBottom: '20px', color: '#2c3e50', textAlign: 'center' }}>
                    {UI_TEXT.title}
                </h2>

                <div style={{ display: 'flex', backgroundColor: '#f5f5f5', borderRadius: '12px', padding: '4px', marginBottom: '20px' }}>
                    <button
                        onClick={() => setActiveTab('desktop')}
                        style={{
                            flex: 1, padding: '10px', border: 'none', borderRadius: '9px', cursor: 'pointer',
                            backgroundColor: activeTab === 'desktop' ? '#fff' : 'transparent',
                            color: activeTab === 'desktop' ? '#3498db' : '#666',
                            fontWeight: 'bold', boxShadow: activeTab === 'desktop' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                        }}
                    >
                        {UI_TEXT.desktop}
                    </button>
                    <button
                        onClick={() => setActiveTab('mobile')}
                        style={{
                            flex: 1, padding: '10px', border: 'none', borderRadius: '9px', cursor: 'pointer',
                            backgroundColor: activeTab === 'mobile' ? '#fff' : 'transparent',
                            color: activeTab === 'mobile' ? '#3498db' : '#666',
                            fontWeight: 'bold', boxShadow: activeTab === 'mobile' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                        }}
                    >
                        {UI_TEXT.mobile}
                    </button>
                </div>

                <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '10px' }}>
                    {GUIDES[activeTab].map((item, idx) => (
                        <div key={idx} style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #f0f0f0' }}>
                            <h4 style={{ margin: '0 0 6px 0', color: '#2c3e50', fontSize: '15px', fontWeight: '800' }}>
                                {idx + 1}. {item.title}
                            </h4>
                            <p style={{ margin: 0, color: '#555', fontSize: '14px', lineHeight: '1.6' }}>
                                {item.desc}
                            </p>
                        </div>
                    ))}
                </div>

                <button
                    autoFocus
                    onClick={onClose}
                    style={{
                        width: '100%', padding: '14px', backgroundColor: '#3498db', color: '#fff',
                        border: 'none', borderRadius: '14px', fontWeight: 'bold', fontSize: '16px',
                        marginTop: '20px', cursor: 'pointer', transition: 'transform 0.1s'
                    }}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    {UI_TEXT.startBtn}
                </button>
            </div>

            <style jsx>{`
                @keyframes modalSlideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default HowToModal;
