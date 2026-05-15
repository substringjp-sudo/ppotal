'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@pplaner/shared';

interface EmotionTriangleProps {
    value?: { joy: number, sadness: number, anger: number };
    onChange: (value: { joy: number, sadness: number, anger: number }) => void;
    size?: number;
    className?: string;
}

export function EmotionTriangle({ value, onChange, size = 200, className }: EmotionTriangleProps) {
    const containerRef = useRef<SVGSVGElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // 정삼각형 기하학 설정
    const padding = 20;
    const R = (size - padding * 2) / 1.5; // 반지름
    const cx = size / 2;
    const cy = size / 2 + 10;

    // 꼭짓점 좌표 (V1: 즐거움, V2: 슬픔, V3: 화남)
    const v1 = { x: cx, y: cy - R }; // Top
    const v2 = { x: cx - R * Math.cos(Math.PI / 6), y: cy + R * Math.sin(Math.PI / 6) }; // Bottom Left
    const v3 = { x: cx + R * Math.cos(Math.PI / 6), y: cy + R * Math.sin(Math.PI / 6) }; // Bottom Right

    // 가중치(Weights)를 화면 좌표(X, Y)로 변환
    const getPointFromWeights = (w: { joy: number, sadness: number, anger: number }) => {
        return {
            x: w.joy * v1.x + w.sadness * v2.x + w.anger * v3.x,
            y: w.joy * v1.y + w.sadness * v2.y + w.anger * v3.y
        };
    };

    // 화면 좌표(X, Y)를 가중치(Weights)로 변환 (Barycentric)
    const getWeightsFromPoint = (px: number, py: number) => {
        const det = (v2.y - v3.y) * (v1.x - v3.x) + (v3.x - v2.x) * (v1.y - v3.y);
        const w1 = ((v2.y - v3.y) * (px - v3.x) + (v3.x - v2.x) * (py - v3.y)) / det;
        const w2 = ((v3.y - v1.y) * (px - v3.x) + (v1.x - v3.x) * (py - v3.y)) / det;
        const w3 = 1 - w1 - w2;

        // 클램핑 (삼각형 내부로 제한)
        const c1 = Math.max(0, Math.min(1, w1));
        const c2 = Math.max(0, Math.min(1 - c1, w2));
        const c3 = 1 - c1 - c2;

        return { joy: c1, sadness: c2, anger: c3 };
    };

    const currentWeights = value || { joy: 0.33, sadness: 0.33, anger: 0.33 };
    const currentPoint = getPointFromWeights(currentWeights);

    const handleInteraction = (clientX: number, clientY: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const weights = getWeightsFromPoint(x, y);
        onChange(weights);
    };

    const onMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        handleInteraction(e.clientX, e.clientY);
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        handleInteraction(e.clientX, e.clientY);
    };

    useEffect(() => {
        const up = () => setIsDragging(false);
        window.addEventListener('mouseup', up);
        return () => window.removeEventListener('mouseup', up);
    }, []);

    // 감정 레이블 판정 로직
    const getEmotionLabel = () => {
        const { joy, sadness, anger } = currentWeights;
        
        // 1. 강한 원초적 감정
        if (joy > 0.7) return "날아갈듯 즐거움";
        if (sadness > 0.7) return "깊은 슬픔";
        if (anger > 0.7) return "폭발할듯 화남";

        // 2. 평범함 (중앙부)
        if (joy > 0.25 && sadness > 0.25 && anger > 0.25) return "평범한 기분";

        // 3. 복합 감정 (사용자 지침 반영)
        // 즐거움 + 슬픔 = 벅차오름
        if (joy > 0.4 && sadness > 0.4) return "벅차오름";
        // 슬픔 + 화남 = 절망스러움
        if (sadness > 0.4 && anger > 0.4) return "절망스러움";
        // 즐거움 + 화남 = 짜증남
        if (joy > 0.4 && anger > 0.4) return "짜증남";

        return "묘한 기분";
    };

    return (
        <div className={cn("flex flex-col items-center gap-4 p-4 bg-white dark:bg-slate-900/50 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm", className)}>
            <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Emotion State</p>
                <div className="px-3 py-1 bg-primary/5 rounded-full">
                    <span className="text-sm font-black text-primary">{getEmotionLabel()}</span>
                </div>
            </div>

            <svg
                ref={containerRef}
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="cursor-crosshair overflow-visible"
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
            >
                <defs>
                    <radialGradient id="emotionGradient" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="white" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </radialGradient>

                    <linearGradient id="joyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#FBBF24" />
                        <stop offset="100%" stopColor="#F59E0B" />
                    </linearGradient>
                </defs>

                {/* Triangle Background */}
                <path
                    d={`M ${v1.x} ${v1.y} L ${v2.x} ${v2.y} L ${v3.x} ${v3.y} Z`}
                    fill="url(#emotionGradient)"
                    className="fill-slate-50 dark:fill-slate-800/50 stroke-slate-200 dark:stroke-slate-700"
                    strokeWidth="2"
                    strokeLinejoin="round"
                />

                {/* Vertex Markers & Labels */}
                <g className="select-none pointer-events-none">
                    {/* Joy (Top) */}
                    <circle cx={v1.x} cy={v1.y} r="6" className="fill-amber-400 shadow-xl" />
                    <text x={v1.x} y={v1.y - 12} textAnchor="middle" className="text-[10px] font-black fill-amber-600 dark:fill-amber-400">즐거움</text>

                    {/* Sadness (Left) */}
                    <circle cx={v2.x} cy={v2.y} r="6" className="fill-blue-500" />
                    <text x={v2.x - 4} y={v2.y + 18} textAnchor="end" className="text-[10px] font-black fill-blue-600 dark:fill-blue-400">슬픔</text>

                    {/* Anger (Right) */}
                    <circle cx={v3.x} cy={v3.y} r="6" className="fill-rose-500" />
                    <text x={v3.x + 4} y={v3.y + 18} textAnchor="start" className="text-[10px] font-black fill-rose-600 dark:fill-rose-400">화남</text>

                    {/* Center Point - "Ordinary" */}
                    <circle cx={cx} cy={cy} r="3" className="fill-slate-300 dark:fill-slate-600" opacity="0.5" />
                    <text x={cx} y={cy + 15} textAnchor="middle" className="text-[8px] font-bold fill-slate-300 dark:fill-slate-600">평범함</text>
                </g>

                {/* Secondary Emotions (Edge Midpoints) */}
                <g className="text-[8px] font-bold fill-slate-400/50 select-none">
                    <text x={(v1.x + v2.x)/2 - 15} y={(v1.y + v2.y)/2} textAnchor="end">벅차오름</text>
                    <text x={(v1.x + v3.x)/2 + 15} y={(v1.y + v3.y)/2} textAnchor="start">짜증남</text> 
                    <text x={(v2.x + v3.x)/2} y={v2.y + 35} textAnchor="middle">절망스러움</text>
                </g>

                {/* Selected Point Handle */}
                <motion.circle
                    layoutId="emotionHandle"
                    cx={currentPoint.x}
                    cy={currentPoint.y}
                    r="8"
                    className="fill-primary stroke-white dark:stroke-slate-900 shadow-2xl"
                    strokeWidth="3"
                    animate={{
                        scale: isDragging ? 1.2 : 1,
                    }}
                />
                <motion.circle
                    cx={currentPoint.x}
                    cy={currentPoint.y}
                    r="12"
                    className="stroke-primary/20 fill-none"
                    strokeWidth="1"
                />
            </svg>
        </div>
    );
}
