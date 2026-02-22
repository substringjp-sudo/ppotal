import React, { useState, useRef } from 'react';

export interface MobileSheetTab {
    id: string;
    label: string;
    content: React.ReactNode;
    summary: React.ReactNode;
}

interface MobileBottomSheetProps {
    tabs?: MobileSheetTab[];

    // Legacy support (optional)
    children?: React.ReactNode;
    summaryContent?: React.ReactNode;

    defaultExpanded?: boolean;
    onExpand?: () => void;
    isOpen?: boolean;
    onToggle?: (isOpen: boolean) => void;
}

const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
    tabs,
    children,
    summaryContent,
    defaultExpanded = false,
    onExpand,
    isOpen,
    onToggle
}) => {
    const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
    const isExpanded = isOpen !== undefined ? isOpen : internalExpanded;
    const sheetRef = useRef<HTMLDivElement>(null);
    const [activeTabIdx, setActiveTabIdx] = useState(0);

    const toggleExpand = () => {
        const nextState = !isExpanded;
        if (onToggle) {
            onToggle(nextState);
        } else {
            setInternalExpanded(nextState);
        }

        if (nextState && onExpand) {
            onExpand();
        }
    };

    const touchStart = useRef<{ x: number, y: number } | null>(null);

    const onTouchStart = (e: React.TouchEvent) => {
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const onTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart.current || !tabs || tabs.length <= 1) return;

        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const dx = endX - touchStart.current.x;
        const dy = endY - touchStart.current.y;

        // Threshold for swipe
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) {
                // Swipe Right (Go to previous tab)
                if (activeTabIdx > 0) {
                    setActiveTabIdx(activeTabIdx - 1);
                }
            } else {
                // Swipe Left (Go to next tab)
                if (activeTabIdx < tabs.length - 1) {
                    setActiveTabIdx(activeTabIdx + 1);
                }
            }
        }
        touchStart.current = null;
    };

    const activeTab = tabs ? tabs[activeTabIdx] : null;

    return (
        <div
            ref={sheetRef}
            // Bind touch listeners to the whole container so we catch swipes in header too
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: '#fff',
                boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
                zIndex: 1050,
                transition: 'height 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
                height: isExpanded ? '80vh' : '90px', // Slightly taller for dots
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}
        >
            {/* Handle / Header Area */}
            <div
                onClick={toggleExpand}
                style={{
                    padding: '8px 0',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    background: '#fff',
                    flexShrink: 0,
                    borderBottom: isExpanded && tabs ? '1px solid #eee' : 'none'
                }}
            >
                {/* Visual Indicators (Swipe Dots) */}
                {tabs && tabs.length > 1 && (
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                        {tabs.map((tab, idx) => (
                            <div
                                key={tab.id}
                                style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    backgroundColor: idx === activeTabIdx ? '#3498db' : '#ddd',
                                    transition: 'background-color 0.3s'
                                }}
                            />
                        ))}
                    </div>
                )}
                {!tabs && (
                    <div style={{
                        width: '40px',
                        height: '5px',
                        backgroundColor: '#ddd',
                        borderRadius: '3px',
                        marginBottom: '8px'
                    }} />
                )}

                {/* Summary Info */}
                <div style={{ width: '100%', padding: '0 20px', transition: 'all 0.3s ease' }}>
                    {activeTab ? activeTab.summary : summaryContent}
                </div>
            </div>

            {/* Content Area */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                paddingTop: '0',
                opacity: isExpanded ? 1 : 0,
                transition: 'opacity 0.3s',
                pointerEvents: isExpanded ? 'auto' : 'none',
                // Keep the content mounted but hidden if needed, or just switch content
                // Switching content is fine
            }}>
                {activeTab ? (
                    <div key={activeTab.id} className="animate-fade-in">
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#2c3e50', flex: 1 }}>
                                {activeTab.label}
                            </h3>
                            {/* Hint for Swipe */}
                            <span style={{ fontSize: '10px', color: '#999' }}>
                                Swipe ↔
                            </span>
                        </div>
                        {activeTab.content}
                    </div>
                ) : children}
            </div>
        </div>
    );
};

export default MobileBottomSheet;
