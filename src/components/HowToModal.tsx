"use client";

import React from 'react';

interface HowToModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const HowToModal: React.FC<HowToModalProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = React.useState<'desktop' | 'mobile'>('desktop');

    // Detect initial device type
    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            setActiveTab(isMobile ? 'mobile' : 'desktop');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const desktopGuide = [
        { title: '노선 및 역 탐색', desc: '지도의 선(노선)이나 점(역)을 클릭하면 상세 정보를 확인할 수 있습니다.' },
        { title: '여행 기록하기', desc: '노선 상세 창에서 역을 선택하여 이동 경로를 기록하고 총 거리를 계산하세요.' },
        { title: '사이드바 활용', desc: '왼쪽 사이드바에서 특정 회사의 노선 전체를 켜거나 끌 수 있습니다.' },
        { title: '경로 탐색', desc: 'Route 탭에서 출발역과 도착역을 선택하여 최단 경로를 검색해 보세요.' },
        { title: '지도 조작', desc: '마우스 휠로 확대/축소하고, 드래그로 지도를 이동합니다.' }
    ];

    const mobileGuide = [
        { title: '노선 및 역 터치', desc: '지도의 노선이나 역을 가볍게 터치하여 상세 정보를 확인하세요.' },
        { title: '이동 기록', desc: '상세 패널의 버튼을 이용해 간편하게 나만의 여행을 기록할 수 있습니다.' },
        { title: '확대 및 이동', desc: '두 손가락으로 핀치하여 확대/축소하고, 한 손가락으로 지도를 이동합니다.' },
        { title: '사이드바 토글', desc: '상단 메뉴나 버튼을 통해 사이드바를 열어 노선을 관리하세요.' },
        { title: '다국어 지원', desc: '헤더의 언어 버튼으로 한국어, 일본어, 영어를 즉시 전환할 수 있습니다.' }
    ];

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(4px)'
        }} onClick={onClose}>
            <div style={{
                backgroundColor: '#fff',
                width: '90%',
                maxWidth: '500px',
                borderRadius: '20px',
                padding: '30px',
                position: 'relative',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                animation: 'modalSlideUp 0.3s ease-out'
            }} onClick={e => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        border: 'none',
                        background: 'none',
                        fontSize: '24px',
                        cursor: 'pointer',
                        color: '#999'
                    }}
                >
                    &times;
                </button>

                <h2 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '20px', color: '#2c3e50', textAlign: 'center' }}>
                    How to use
                </h2>

                <div style={{
                    display: 'flex',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '10px',
                    padding: '4px',
                    marginBottom: '20px'
                }}>
                    <button
                        onClick={() => setActiveTab('desktop')}
                        style={{
                            flex: 1,
                            padding: '8px',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            backgroundColor: activeTab === 'desktop' ? '#fff' : 'transparent',
                            color: activeTab === 'desktop' ? '#3498db' : '#666',
                            fontWeight: 'bold',
                            boxShadow: activeTab === 'desktop' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        Desktop
                    </button>
                    <button
                        onClick={() => setActiveTab('mobile')}
                        style={{
                            flex: 1,
                            padding: '8px',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            backgroundColor: activeTab === 'mobile' ? '#fff' : 'transparent',
                            color: activeTab === 'mobile' ? '#3498db' : '#666',
                            fontWeight: 'bold',
                            boxShadow: activeTab === 'mobile' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        Mobile
                    </button>
                </div>

                <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
                    {(activeTab === 'desktop' ? desktopGuide : mobileGuide).map((item, idx) => (
                        <div key={idx} style={{ marginBottom: '15px' }}>
                            <h4 style={{ margin: '0 0 5px 0', color: '#2c3e50', fontSize: '16px', fontWeight: 'bold' }}>
                                {idx + 1}. {item.title}
                            </h4>
                            <p style={{ margin: 0, color: '#666', fontSize: '14px', lineHeight: '1.5' }}>
                                {item.desc}
                            </p>
                        </div>
                    ))}
                </div>

                <button
                    onClick={onClose}
                    style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: '#3498db',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        marginTop: '25px',
                        cursor: 'pointer',
                        transition: 'backgroundColor 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = '#2980b9'}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = '#3498db'}
                >
                    시작하기
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
