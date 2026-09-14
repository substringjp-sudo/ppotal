"use client";

import React from 'react';
import type { AnimationFrame, TripAnimation } from '../lib/tripAnimation';
import {
    MAINLAND_BOUNDS,
    OKINAWA_BOUNDS,
    Projector,
    REPLAY_THEMES,
    type InsetRect,
    type ReplayTheme,
    buildLandPath,
    buildRailPath,
    buildStrokePath,
    computeOkinawaInsetRect,
    drawReplayBase,
    drawReplayOverlay,
    drawReplayStroke,
    drawReplayTip,
    filterMainlandLines,
    filterMainlandRings,
    filterOkinawaLines,
    filterOkinawaRings,
    padBounds,
    paintWidthFor,
    tipOf
} from '../lib/replayRenderer';

interface OkinawaScene {
    rect: InsetRect;
    view: Projector;
    land: Path2D;
    rail: Path2D;
    paintWidth: number;
}

interface Scene {
    view: Projector;
    land: Path2D;
    rail: Path2D;
    accum: HTMLCanvasElement;
    accumCtx: CanvasRenderingContext2D;
    paintWidth: number;
    okinawa?: OkinawaScene | null;
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
    /** 배경색 및 테마 설정 */
    theme?: ReplayTheme;
    className?: string;
    /** 녹화하려면 이 캔버스를 잡아야 한다. */
    canvasRef?: React.RefObject<HTMLCanvasElement | null>;
    /** 값이 바뀌면 처음으로 되감는다. */
    restartKey?: number;
    onFrame?: (frame: AnimationFrame) => void;
    onFinished?: () => void;
}

function pathRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

/**
 * 되짚기 애니메이션을 그리는 캔버스.
 *
 * 바탕(바다·땅·아직 안 간 철도망)과 **이미 칠해진 획**은 숨은 캔버스 한 장에 쌓아 둔다.
 * 오키나와는 전국 모드 시 우측 하단 인셋 윈도우에 분리 렌더링되며,
 * 오키나와 구간 주행 시 인셋 내부에서도 애니메이션이 동기화되어 그려진다.
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
    theme = REPLAY_THEMES.dark,
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
            drawReplayBase(
                scene.accumCtx,
                scene.land,
                scene.rail,
                width,
                height,
                theme,
                scene.okinawa ? { rect: scene.okinawa.rect, land: scene.okinawa.land, rail: scene.okinawa.rail } : null
            );
            paintedRef.current = 0;
        }

        while (paintedRef.current < frame.completedCount) {
            const stroke = animation.strokes[paintedRef.current];

            // 1. 메인 본토 캔버스에 획 누적
            drawReplayStroke(
                scene.accumCtx,
                buildStrokePath(stroke.geometries, scene.view),
                stroke.color,
                scene.paintWidth
            );

            // 2. 오키나와 인셋에도 획 누적 (인셋 클립 적용)
            if (scene.okinawa) {
                scene.accumCtx.save();
                pathRoundRect(
                    scene.accumCtx,
                    scene.okinawa.rect.x,
                    scene.okinawa.rect.y,
                    scene.okinawa.rect.w,
                    scene.okinawa.rect.h,
                    scene.okinawa.rect.radius
                );
                scene.accumCtx.clip();
                drawReplayStroke(
                    scene.accumCtx,
                    buildStrokePath(stroke.geometries, scene.okinawa.view),
                    stroke.color,
                    scene.okinawa.paintWidth
                );
                scene.accumCtx.restore();
            }

            paintedRef.current += 1;
        }

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(scene.accum, 0, 0);

        // 현재 실시간으로 자라나고 있는 획
        const drawing = frame.drawingIndex >= 0 ? animation.strokes[frame.drawingIndex] : null;
        if (drawing) {
            const segments = drawing.partial(frame.progress);
            if (segments.length > 0) {
                // 메인 뷰
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

                // 오키나와 인셋 뷰
                if (scene.okinawa) {
                    ctx.save();
                    pathRoundRect(
                        ctx,
                        scene.okinawa.rect.x,
                        scene.okinawa.rect.y,
                        scene.okinawa.rect.w,
                        scene.okinawa.rect.h,
                        scene.okinawa.rect.radius
                    );
                    ctx.clip();
                    drawReplayStroke(
                        ctx,
                        buildStrokePath(segments, scene.okinawa.view),
                        drawing.color,
                        scene.okinawa.paintWidth,
                        0.3,
                        1.9
                    );
                    const okiTip = tipOf(segments, scene.okinawa.view);
                    if (okiTip) drawReplayTip(ctx, okiTip, drawing.color, scene.okinawa.paintWidth);
                    ctx.restore();
                }
            }
        }

        drawReplayOverlay(ctx, frame.date, animation.paintedLengthKm(frame), width, height, theme);
        onFrameRef.current?.(frame);
    }, [animation, width, height, theme]);

    // 속도를 바꿔도 보고 있던 자리를 유지
    const durationRef = React.useRef(animation.strokeDurationMs);
    React.useEffect(() => {
        const previous = durationRef.current;
        const next = animation.strokeDurationMs;
        if (previous > 0 && previous !== next) {
            elapsedRef.current = (elapsedRef.current / previous) * next;
        }
        durationRef.current = next;
    }, [animation]);

    // 바탕 만들기 (해상도, 테마, 범위 변경 시 재구성)
    React.useEffect(() => {
        const canvas = innerRef.current;
        if (!canvas || width <= 0 || height <= 0) return;
        canvas.width = width;
        canvas.height = height;

        const recorded = animation.bounds();
        const hasOkinawaTrips = recorded && recorded.minLat < 28.0;

        let bounds = MAINLAND_BOUNDS;
        let useOkinawaInset = wholeJapan;

        if (!wholeJapan && recorded) {
            // 기록 범위 모드
            if (recorded.minLat < 28.0 && recorded.maxLat > 31.0) {
                // 오키나와와 본토 모두에 걸쳐 있는 기록이면 인셋 활성화
                bounds = padBounds(
                    {
                        minLat: Math.max(30.8, recorded.minLat),
                        minLon: Math.max(129.2, recorded.minLon),
                        maxLat: Math.min(45.6, recorded.maxLat),
                        maxLon: Math.min(145.8, recorded.maxLon)
                    },
                    0.5,
                    0.15
                );
                useOkinawaInset = true;
            } else if (recorded.maxLat < 28.0) {
                // 오키나와 단독 기록
                bounds = padBounds(OKINAWA_BOUNDS, 0.3, 0.1);
                useOkinawaInset = false;
            } else {
                // 본토 단독 기록
                bounds = padBounds(recorded, 0.5, 0.15);
                useOkinawaInset = false;
            }
        }

        // 1. 본토 필터링된 육지 및 선로
        const mainlandRings = useOkinawaInset ? filterMainlandRings(landRings) : landRings;
        const mainlandLines = useOkinawaInset ? filterMainlandLines(railLines) : railLines;

        const view = new Projector(bounds, width, height, 24);
        const land = buildLandPath(mainlandRings, view);
        const rail = buildRailPath(mainlandLines, view);

        // 2. 오키나와 인셋 구성 (전국 모드 또는 인셋 모드)
        let okinawaScene: OkinawaScene | null = null;
        if (useOkinawaInset) {
            const okiRect = computeOkinawaInsetRect(width, height);
            const okiView = new Projector(OKINAWA_BOUNDS, okiRect.w, okiRect.h, 10, okiRect);
            const okiRings = filterOkinawaRings(landRings);
            const okiLines = filterOkinawaLines(railLines);
            const okiLand = buildLandPath(okiRings, okiView);
            const okiRail = buildRailPath(okiLines, okiView);

            okinawaScene = {
                rect: okiRect,
                view: okiView,
                land: okiLand,
                rail: okiRail,
                paintWidth: paintWidthFor(okiView, okiRect.w),
            };
        }

        const accum = document.createElement('canvas');
        accum.width = width;
        accum.height = height;
        const accumCtx = accum.getContext('2d');
        if (!accumCtx) return;

        drawReplayBase(
            accumCtx,
            land,
            rail,
            width,
            height,
            theme,
            okinawaScene ? { rect: okinawaScene.rect, land: okinawaScene.land, rail: okinawaScene.rail } : null
        );

        sceneRef.current = {
            view,
            land,
            rail,
            accum,
            accumCtx,
            paintWidth: paintWidthFor(view, width),
            okinawa: okinawaScene,
        };
        paintedRef.current = 0;
        renderAt(elapsedRef.current);
    }, [animation, landRings, railLines, wholeJapan, width, height, theme, renderAt]);

    // 되감기
    const renderRef = React.useRef(renderAt);
    React.useEffect(() => { renderRef.current = renderAt; }, [renderAt]);
    React.useEffect(() => {
        elapsedRef.current = 0;
        renderRef.current(0);
    }, [restartKey]);

    // 재생 루프
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
