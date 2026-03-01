import React from 'react';
import { useI18n } from '../lib/i18n-context';

interface HowToModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TRANSLATIONS = {
    ko: {
        title: '사용 방법',
        startBtn: '시작하기',
        desktop: '데스크톱',
        mobile: '모바일',
        guides: {
            desktop: [
                { title: '노선 및 역 탐색', desc: '지도상의 노선이나 점(역)을 클릭하여 상세 정보를 확인하세요.' },
                { title: '여정 기록', desc: '노선 상세 창에서 역을 선택하여 이동 경로를 기록하고 총 거리를 계산하세요.' },
                { title: '사이드바 활용', desc: '왼쪽 사이드바에서 철도 회사별로 노선을 한꺼번에 켜거나 끌 수 있습니다.' },
                { title: '경로 찾기', desc: '경로 탭에서 출발역과 도착역을 선택하여 최단 경로를 검색하세요.' },
                { title: '지도 제어', desc: '마우스 휠로 확대/축소하고, 드래그하여 지도를 이동하세요.' }
            ],
            mobile: [
                { title: '노선 및 역 터치', desc: '지도상의 노선이나 역을 가볍게 터치하여 정보를 확인하세요.' },
                { title: '편집 모드 사용', desc: "상단의 'Edit' 버튼을 눌러 경로 기록 모드로 진입하세요." },
                { title: '드래그로 기록', desc: '편집 모드에서 시작역을 한 번 터치한 후, 다음 역까지 손가락을 드래그하여 경로를 그립니다.' },
                { title: '진행 상황 저장', desc: "하단 패널의 'Add'를 눌러 탑승 기록을 저장하고 통계를 업데이트하세요." },
                { title: '지도 제어', desc: '두 손가락으로 핀치하여 확대/축소하고, 한 손가락으로 이동하세요.' }
            ]
        }
    },
    en: {
        title: 'How to Use',
        startBtn: 'Get Started',
        desktop: 'Desktop',
        mobile: 'Mobile',
        guides: {
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
        }
    },
    ja: {
        title: '使い方',
        startBtn: 'はじめる',
        desktop: 'デスクトップ',
        mobile: 'モバイル',
        guides: {
            desktop: [
                { title: '路線と駅を探索', desc: '地図上の路線や点（駅）をクリックして詳細情報を確認します。' },
                { title: '乗車記録', desc: '路線詳細ウィンドウで駅を選択してルートを記録し、合計距離を計算します。' },
                { title: 'サイドバーの活用', desc: '左側のサイドバーから鉄道会社ごとに路線を一括で表示・非表示にできます。' },
                { title: 'ルート検索', desc: 'ルートタブで出発駅と到着駅を選択して最短経路を検索します。' },
                { title: '地図の操作', desc: 'マウスホイールでズームイン/アウト、ドラッグで地図を移動します。' }
            ],
            mobile: [
                { title: '路線と駅をタッチ', desc: '地図上の路線や駅を軽くタッチして情報を確認します。' },
                { title: '編集モードの使用', desc: '上部の「Edit」ボタンをタップしてルート記録モードに入ります。' },
                { title: 'ドラッグで記録', desc: '編集モードで開始駅を一度タップし、次の駅まで指をドラッグして経路を描きます。' },
                { title: '進捗を保存', desc: '下部パネルの「Add」をタップして乗車記録を保存し、統計を更新します。' },
                { title: '地図の操作', desc: '2本の指でピンチしてズーム、1本の指で移動します。' }
            ]
        }
    }
};

const HowToModal: React.FC<HowToModalProps> = ({ isOpen, onClose }) => {
    const { language } = useI18n();
    const t = TRANSLATIONS[language as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;
    const [activeTab, setActiveTab] = React.useState<'desktop' | 'mobile'>('desktop');

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
                    {t.title}
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
                        {t.desktop}
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
                        {t.mobile}
                    </button>
                </div>

                <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '10px' }}>
                    {t.guides[activeTab].map((item: any, idx: number) => (
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
                    {t.startBtn}
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
