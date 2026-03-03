"use client";

import React, { useEffect, useRef, useState } from 'react';

interface FloatingTooltipProps {
    content: string | null;
    visible: boolean;
    x: number;
    y: number;
}

const FloatingTooltip: React.FC<FloatingTooltipProps> = ({ content, visible, x, y }) => {
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({
        position: 'fixed',
        left: 0,
        top: 0,
        pointerEvents: 'none',
        zIndex: 99999,
        opacity: 0,
        transition: 'opacity 0.1s ease-out, transform 0.05s linear',
    });

    useEffect(() => {
        if (!visible || !content || !tooltipRef.current) {
            setStyle(prev => ({ ...prev, opacity: 0 }));
            return;
        }

        const tooltipWidth = tooltipRef.current.offsetWidth;
        const tooltipHeight = tooltipRef.current.offsetHeight;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        let finalX = x + 20;
        let finalY = y + 20;

        // Boundary checks
        if (finalX + tooltipWidth > windowWidth - 20) {
            finalX = x - tooltipWidth - 20;
        }
        if (finalY + tooltipHeight > windowHeight - 20) {
            finalY = y - tooltipHeight - 20;
        }

        setStyle({
            position: 'fixed',
            left: `${finalX}px`,
            top: `${finalY}px`,
            pointerEvents: 'none',
            zIndex: 99999,
            opacity: 1,
            transform: 'translate3d(0, 0, 0)', // Optimize for performance
        });
    }, [visible, content, x, y]);

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
