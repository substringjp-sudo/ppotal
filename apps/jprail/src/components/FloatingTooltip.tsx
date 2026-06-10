"use client";

import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';

interface FloatingTooltipProps {
    content: string | null;
    visible: boolean;
    x: number;
    y: number;
    leftBound?: number;
    rightBound?: number;
}

const FloatingTooltip: React.FC<FloatingTooltipProps> = ({ content, visible, x, y, leftBound = 0, rightBound }) => {
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [style, setStyle] = useState<React.CSSProperties>({
        position: 'fixed',
        left: 0,
        top: 0,
        pointerEvents: 'none',
        zIndex: 99999,
        opacity: 0,
        transition: 'opacity 0.1s ease-out',
    });

    // Content가 바뀔 때만 크기를 1회 측정하여 강제 리플로우 횟수 극적 감소
    useLayoutEffect(() => {
        if (!visible || !content || !tooltipRef.current) return;
        
        const width = tooltipRef.current.offsetWidth;
        const height = tooltipRef.current.offsetHeight;
        setDimensions({ width, height });
    }, [content, visible]);

    useEffect(() => {
        if (!visible || !content) {
            setStyle(prev => ({ ...prev, opacity: 0 }));
            return;
        }

        const tooltipWidth = dimensions.width || 180;
        const tooltipHeight = dimensions.height || 50;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const effectiveRightBound = rightBound ?? windowWidth;

        let finalX = x + 20;
        let finalY = y + 20;

        // Boundary checks - Horizontal
        if (finalX + tooltipWidth > effectiveRightBound - 20) {
            finalX = x - tooltipWidth - 20;
            if (finalX < leftBound + 10) {
                finalX = leftBound + 10;
            }
        }

        // Boundary checks - Vertical
        if (finalY + tooltipHeight > windowHeight - 20) {
            finalY = y - tooltipHeight - 20;
        }

        // requestAnimationFrame으로 프레임 단위 동기화하여 Snappy UX 보장
        const animId = requestAnimationFrame(() => {
            setStyle({
                position: 'fixed',
                left: `${finalX}px`,
                top: `${finalY}px`,
                pointerEvents: 'none',
                zIndex: 99999,
                opacity: 1,
                transform: 'translate3d(0, 0, 0)',
                transition: 'opacity 0.1s ease-out',
            });
        });

        return () => cancelAnimationFrame(animId);
    }, [visible, content, x, y, leftBound, rightBound, dimensions]);

    if (!content) return null;

    return (
        <div
            ref={tooltipRef}
            style={style}
            className="bg-[#ffffffF2] dark:bg-[#0f172aF2] backdrop-blur-md rounded-xl shadow-2xl border border-[#e2e8f080] dark:border-[#1e293b80] overflow-hidden"
            dangerouslySetInnerHTML={{ __html: content }}
        />
    );
};

export default FloatingTooltip;
