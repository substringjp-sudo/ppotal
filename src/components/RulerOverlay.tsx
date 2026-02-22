import React, { useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';

/**
 * Draws ruler ticks along the edges of the map.
 * Syncs ticks with map position (lat/lng) to create a 'locked to coordinates' effect.
 */
interface RulerOverlayProps {
    topOffset?: number;
}

const RulerOverlay: React.FC<RulerOverlayProps> = ({ topOffset = 0 }) => {
    const map = useMap();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Coordinate conversion helper
    const getMapPixelOrigin = useCallback(() => {
        const center = map.getCenter();
        const zoom = map.getZoom();
        const centerPoint = map.project(center, zoom);
        const size = map.getSize();
        return centerPoint.subtract(size.divideBy(2));
    }, [map]);

    const drawRulers = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        const rulerSize = 24;

        ctx.fillRect(0, topOffset * dpr, width * dpr, rulerSize * dpr);
        ctx.fillRect(0, canvas.height - (rulerSize * dpr), width * dpr, 1000 * dpr);
        ctx.fillRect(0, topOffset * dpr, rulerSize * dpr, canvas.height);
        ctx.fillRect(canvas.width - (rulerSize * dpr), topOffset * dpr, 1000 * dpr, canvas.height);

        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1 * dpr;

        const origin = getMapPixelOrigin();

        const majorTickInterval = 100;
        const minorTickInterval = 10;

        const offsetX = -(origin.x % majorTickInterval);
        const offsetY = -(origin.y % majorTickInterval);

        const drawTickLine = (
            x1: number, y1: number,
            x2: number, y2: number,
            isMajor: boolean
        ) => {
            ctx.beginPath();
            ctx.moveTo(x1 * dpr, y1 * dpr);
            ctx.lineTo(x2 * dpr, y2 * dpr);
            ctx.lineWidth = (isMajor ? 1.5 : 1) * dpr;
            ctx.stroke();
        };

        for (let x = offsetX; x < width; x += minorTickInterval) {
            const globalX = origin.x + x;
            const isMajor = Math.abs(globalX % majorTickInterval) < minorTickInterval / 2;
            const h = isMajor ? 10 : 5;
            drawTickLine(x, topOffset, x, topOffset + h, isMajor);
            drawTickLine(x, height - h, x, height, isMajor);
        }

        for (let y = offsetY; y < height; y += minorTickInterval) {
            if (y < topOffset) continue;
            const globalY = origin.y + y;
            const isMajor = Math.abs(globalY % majorTickInterval) < minorTickInterval / 2;
            const w = isMajor ? 10 : 5;
            drawTickLine(0, y, w, y, isMajor);
            drawTickLine(width - w, y, width, y, isMajor);
        }
    }, [getMapPixelOrigin, topOffset]);

    // Resize & Move Handlers
    useEffect(() => {
        const canvas = canvasRef.current;

        const update = () => {
            if (canvas) {
                const dpr = window.devicePixelRatio || 1;
                const { x, y } = map.getSize();
                canvas.width = x * dpr;
                canvas.height = y * dpr;
                canvas.style.width = `${x}px`;
                canvas.style.height = `${y}px`;
                drawRulers();
            }
        };

        // Hook into Leaflet events
        map.on('move', drawRulers);
        map.on('zoom', drawRulers);
        map.on('resize', update);
        map.on('viewreset', update);

        // Initial Draw
        update();

        return () => {
            map.off('move', drawRulers);
            map.off('zoom', drawRulers);
            map.off('resize', update);
            map.off('viewreset', update);
        };
    }, [map, drawRulers]);

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 3000 // Moving ABOVE RouteCreationPanel (2000) so it's visible ON TOP of everything
        }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
};

export default RulerOverlay;
