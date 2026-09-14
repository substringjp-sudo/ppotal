"use client";

import React from 'react';
import type { AnimationFrame, TripAnimation } from '../lib/tripAnimation';
import {
    JAPAN_BOUNDS,
    Projector,
    buildLandPath,
    buildRailPath,
    buildStrokePath,
    drawReplayBase,
    drawReplayOverlay,
    drawReplayStroke,
    drawReplayTip,
    padBounds,
    paintWidthFor,
    tipOf
} from '../lib/replayRenderer';

interface Scene {
    view: Projector;
    land: Path2D;
    rail: Path2D;
    accum: HTMLCanvasElement;
    accumCtx: CanvasRenderingContext2D;
    paintWidth: number;
}

export interface TripReplayCanvasProps {
    animation: TripAnimation;
    landRings: [number, number][][];
    railLines: [number, number][][];
    /** 전국을 담을지, 내 기록 범위로 당길지. */
    wholeJapan: boolean;
    playing: boolean;
    loop: boolean;
    /** 캔버스 실제 픽셀 크기 = 내보낼 영상 크기. 화면에는 CSS 로 줄여 보여 준다. */
    width: number;
    height: number;
    className?: string;
    /** 녹화하려면 이 캔버스를 잡아야 한다. */
    canvasRef?: React.RefObject<HTMLCanvasElement | null>;
    /** 값이 바뀌면 처음으로 되감는다. */
    restartKey?: number;
    onFrame?: (frame: AnimationFrame) => void;
    onFinished?: () => void;
}

/**
 * 되짚기 애니메이션을 그리는 캔버스.
 *
 * 바탕(바다·땅·아직 안 간 철도망)과 **이미 칠해진 획**은 숨은 캔버스 한 장에 쌓아
 * 둔다. 한 프레임은 그 캔버스를 통째로 복사한 뒤 지금 자라는 획 하나만 얹어
 * 만든다 — 프레임당 비용이 여정 수와 무관해진다.
 *
 * 날짜와 누적 거리도 캔버스에 직접 그린다. DOM 으로 겹치면 화면에는 보여도 녹화된
 * 영상에는 들어가지 않는다.
 */
const TripReplayCanvas: React.FC<TripReplayCanvasProps> = ({
    animation,
    landRings,
    railLines,
    wholeJapan,
    playing,
    loop,
    width,
    height,
    className,
    canvasRef,
    restartKey = 0,
    onFrame,
    onFinished
}) => {
    const innerRef = React.useRef<HTMLCanvasElement | null>(null);
    const sceneRef = React.useRef<Scene | null>(null);
    const elapsedRef = React.useRef(0);
    const paintedRef = React.useRef(0);

    // 콜백은 ref 로 잡아 둔다. 부모가 다시 그려질 때마다 재생 루프가 끊기면
    // 프레임이 한 박자씩 튄다.
    const onFrameRef = React.useRef(onFrame);
    const onFinishedRef = React.useRef(onFinished);
    React.useEffect(() => { onFrameRef.current = onFrame; }, [onFrame]);
    React.useEffect(() => { onFinishedRef.current = onFinished; }, [onFinished]);

    const attach = React.useCallback((node: HTMLCanvasElement | null) => {
        innerRef.current = node;
        if (canvasRef) canvasRef.current = node;
    }, [canvasRef]);

    const renderAt = React.useCallback((elapsedMs: number) => {
        const scene = sceneRef.current;
        const canvas = innerRef.current;
        if (!scene || !canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const frame = animation.frameAt(elapsedMs);

        // 되감았으면 쌓아 둔 그림을 바탕부터 다시 만든다.
        if (frame.completedCount < paintedRef.current) {
            drawReplayBase(scene.accumCtx, scene.land, scene.rail, width, height);
            paintedRef.current = 0;
        }
        while (paintedRef.current < frame.completedCount) {
            const stroke = animation.strokes[paintedRef.current];
            drawReplayStroke(
                scene.accumCtx,
                buildStrokePath(stroke.geometries, scene.view),
                stroke.color,
                scene.paintWidth
            );
            paintedRef.current += 1;
        }

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(scene.accum, 0, 0);

        const drawing = frame.drawingIndex >= 0 ? animation.strokes[frame.drawingIndex] : null;
        if (drawing) {
            const segments = drawing.partial(frame.progress);
            if (segments.length > 0) {
                drawReplayStroke(
                    ctx,
                    buildStrokePath(segments, scene.view),
                    drawing.color,
                    scene.paintWidth,
                    0.3,
                    1.9
                );
                const tip = tipOf(segments, scene.view);
                if (tip) drawReplayTip(ctx, tip, drawing.color, scene.paintWidth);
            }
        }

        drawReplayOverlay(ctx, frame.date, animation.paintedLengthKm(frame), width, height);
        onFrameRef.current?.(frame);
    }, [animation, width, height]);

    // 속도를 바꿔도 **보고 있던 자리를 유지한다.** 시간을 그대로 두면 한 획 시간이
    // 바뀌는 순간 다른 획으로 건너뛰고, 되감으면 슬라이더를 만질 때마다 처음으로 간다.
    const durationRef = React.useRef(animation.strokeDurationMs);
    React.useEffect(() => {
        const previous = durationRef.current;
        const next = animation.strokeDurationMs;
        if (previous > 0 && previous !== next) {
            elapsedRef.current = (elapsedRef.current / previous) * next;
        }
        durationRef.current = next;
    }, [animation]);

    // 바탕 만들기. 카메라가 그대로인 한 다시 만들 필요가 없다.
    React.useEffect(() => {
        const canvas = innerRef.current;
        if (!canvas || width <= 0 || height <= 0) return;
        canvas.width = width;
        canvas.height = height;

        const recorded = animation.bounds();
        const bounds = wholeJapan || !recorded ? JAPAN_BOUNDS : padBounds(recorded, 0.5, 0.15);
        const view = new Projector(bounds, width, height, 24);

        const accum = document.createElement('canvas');
        accum.width = width;
        accum.height = height;
        const accumCtx = accum.getContext('2d');
        if (!accumCtx) return;

        const land = buildLandPath(landRings, view);
        const rail = buildRailPath(railLines, view);
        drawReplayBase(accumCtx, land, rail, width, height);

        sceneRef.current = { view, land, rail, accum, accumCtx, paintWidth: paintWidthFor(view, width) };
        paintedRef.current = 0;
        renderAt(elapsedRef.current);
    }, [animation, landRings, railLines, wholeJapan, width, height, renderAt]);

    // 되감기는 restartKey 가 바뀔 때만. renderAt 을 의존성에 두면 속도를 바꿀
    // 때마다(animation 이 새로 생기며) 같이 되감긴다.
    const renderRef = React.useRef(renderAt);
    React.useEffect(() => { renderRef.current = renderAt; }, [renderAt]);
    React.useEffect(() => {
        elapsedRef.current = 0;
        renderRef.current(0);
    }, [restartKey]);

    React.useEffect(() => {
        if (!playing) return;
        const total = animation.totalDurationMs;
        if (total <= 0) return;

        let raf = 0;
        let previous = 0;
        const tick = (now: number) => {
            if (previous !== 0) elapsedRef.current += now - previous;
            previous = now;

            if (elapsedRef.current >= total) {
                if (loop) {
                    elapsedRef.current = 0;
                } else {
                    elapsedRef.current = total;
                    renderAt(total);
                    onFinishedRef.current?.();
                    return;
                }
            }
            renderAt(elapsedRef.current);
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [playing, loop, animation, renderAt]);

    return (
        <canvas
            ref={attach}
            className={className}
            style={{ width: '100%', height: '100%', display: 'block' }}
        />
    );
};

export default TripReplayCanvas;
