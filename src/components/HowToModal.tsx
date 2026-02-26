import React from 'react';
import { Language } from '../lib/translations';

interface HowToModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentLanguage?: Language;
}

const UI_TEXT = {
    title: { ko: '사용 방법', en: 'How to Use', ja: '使い方' },
    startBtn: { ko: '시작하기', en: 'Get Started', ja: '使ってみる' },
    desktop: { ko: '데스크탑', en: 'Desktop', ja: 'デスクトップ' },
    mobile: { ko: '모바일', en: 'Mobile', ja: 'モバイル' }
};

const GUIDES = {
    desktop: {
        ko: [
            { title: '노선 및 역 탐색', desc: '지도의 선(노선)이나 점(역)을 클릭하면 상세 정보를 확인할 수 있습니다.' },
            { title: '여행 기록하기', desc: '노선 상세 창에서 역을 선택하여 이동 경로를 기록하고 총 거리를 계산하세요.' },
            { title: '사이드바 활용', desc: '왼쪽 사이드바에서 특정 회사의 노선 전체를 켜거나 끌 수 있습니다.' },
            { title: '경로 탐색', desc: 'Route 탭에서 출발역과 도착역을 선택하여 최단 경로를 검색해 보세요.' },
            { title: '지도 조작', desc: '마우스 휠로 확대/축소하고, 드래그로 지도를 이동합니다.' }
        ],
        en: [
            { title: 'Explore Lines & Stations', desc: 'Click on lines or dots (stations) on the map to see detailed information.' },
            { title: 'Record Your Trip', desc: 'Select stations in the line detail window to record your route and calculate total distance.' },
            { title: 'Use Sidebar', desc: "Enable or disable an entire company's lines from the left sidebar." },
            { title: 'Find Routes', desc: 'Search for the shortest path by selecting start and end stations in the Route tab.' },
            { title: 'Map Control', desc: 'Use mouse wheel to zoom in/out and drag to move the map.' }
        ],
        ja: [
            { title: '路線と駅の探索', desc: '地図上の線（路線）や点（駅）をクリックすると、詳細情報を確認できます。' },
            { title: '旅行を記録する', desc: '路線詳細ウィンドウで駅を選択して移動経路を記録し、合計距離を計算します。' },
            { title: 'サイドバーの活用', desc: '左側のサイドバーで特定の会社の路線全体をオン/オフにできます。' },
            { title: 'ルート探索', desc: 'Routeタブで出発駅と到着駅を選択して最短ルートを検索してみてください。' },
            { title: '地図の操作', desc: 'マウスホイールで拡大/縮小し、ドラッグで地図を移動します。' }
        ]
    },
    mobile: {
        ko: [
            { title: '노선 및 역 터치', desc: '지도의 노선나 역을 가볍게 터치하여 상세 정보를 확인하세요.' },
            { title: '편집 모드 활용', desc: "상단의 'Edit' 버튼을 눌러 편집 모드로 전환합니다." },
            { title: '드래그로 경로 기록', desc: '편집 모드에서 시작 역을 한 번 클릭한 뒤, 손가락을 떼지 않고 다음 역까지 드래그하여 경로를 그립니다.' },
            { title: '기록 저장', desc: "하단 패널의 'Add' 버튼을 눌러 여정을 저장하고 통계를 업데이트하세요." },
            { title: '지도 조작', desc: '두 손가락으로 핀치하여 확대/축소하고, 한 손가락으로 지도를 이동합니다.' }
        ],
        en: [
            { title: 'Touch Lines & Stations', desc: 'Lightly touch lines or stations on the map to see detailed information.' },
            { title: 'Use Edit Mode', desc: "Tap the 'Edit' button at the top to enter route recording mode." },
            { title: 'Drag to Record', desc: 'In Edit Mode, click a starting station once, then drag your finger to the next station to draw the path.' },
            { title: 'Save Progress', desc: "Tap 'Add' in the bottom panel to save your trip and update your stats." },
            { title: 'Map Control', desc: 'Pinch with two fingers to zoom and move with one finger.' }
        ],
        ja: [
            { title: '路線と駅のタッチ', desc: '地図上の路線や駅を軽くタッチして詳細情報を確認してください。' },
            { title: '編集モードの活用', desc: "上部の 'Edit' ボタンを押して編集モードに切り替えます。" },
            { title: 'ドラッグで記録', desc: '編集モードで開始駅を一度クリックした後、指を離さずに次の駅までドラッグして経路を描きます。' },
            { title: '記録の保存', desc: "下部パネル의 'Add' ボタンを押して旅行を保存し、統計を更新します。" },
            { title: '地図の操作', desc: '二本の指でピン치して拡大/縮小し、一本の指で地図を移動します。' }
        ]
    }
};

const HowToModal: React.FC<HowToModalProps> = ({ isOpen, onClose, currentLanguage = 'ko' }) => {
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
                    {UI_TEXT.title[lang]}
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
                        {UI_TEXT.desktop[lang]}
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
                        {UI_TEXT.mobile[lang]}
                    </button>
                </div>

                <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '10px' }}>
                    {GUIDES[activeTab][lang]?.map((item, idx) => (
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
                    {UI_TEXT.startBtn[lang]}
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
