import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

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
    const getMapPixelOrigin = () => {
        const center = map.getCenter();
        const zoom = map.getZoom();
        // Project center to pixel coords at current zoom
        // We want the global pixel coordinate of the top-left of the viewport
        const centerPoint = map.project(center, zoom);
        const size = map.getSize();
        // Top Left Global Pixel
        return centerPoint.subtract(size.divideBy(2));
    };

    const drawRulers = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // --- Backgrounds ---
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        const rulerSize = 24; // Visual height/width of ruler bar

        // Top Bar Background: Draw from topOffset UP to 0 and DOWN to rulerSize
        // Actually just fill from 0 to topOffset + rulerSize? 
        // User wants top ruler relative to topOffset.
        // Let's simple Draw:

        // 1. Top Strip (covers topOffset to topOffset + 24)
        ctx.fillRect(0, topOffset * dpr, width * dpr, rulerSize * dpr);

        // 2. Bottom Strip (covers bottom - 24 to bottom + extra)
        // Start at height - rulerSize. Draw downwards infinitely (well, +1000).
        ctx.fillRect(0, canvas.height - (rulerSize * dpr), width * dpr, 1000 * dpr);

        // 3. Left Strip (covers 0 to 24 wide, from topOffset to bottom)
        ctx.fillRect(0, topOffset * dpr, rulerSize * dpr, canvas.height);

        // 4. Right Strip (covers width - 24 to width + extra, from topOffset to bottom)
        ctx.fillRect(canvas.width - (rulerSize * dpr), topOffset * dpr, 1000 * dpr, canvas.height);


        // --- Ticks Style ---
        ctx.strokeStyle = '#333'; // Dark grey ticks
        ctx.lineWidth = 1 * dpr;
        // ctx.fillStyle = '#333'; // Removed as per new code, assuming no text labels yet
        // ctx.font = `${10 * dpr}px sans-serif`; // Removed as per new code, assuming no text labels yet

        // Get viewport origin in global pixels
        const origin = getMapPixelOrigin();

        // Tick Settings
        const majorTickInterval = 100; // Screen pixels between major ticks (approx)
        const minorTickInterval = 10;

        // Calculate offset: how far into the current '100px block' is the origin?
        // If origin.x is 1050, we are at offset 50.
        // We want ticks at 1100, 1200... relative to global 0,0.
        // So first tick on screen is at (100 - (1050 % 100)) = 50px from left.

        const offsetX = -(origin.x % majorTickInterval);
        const offsetY = -(origin.y % majorTickInterval);

        // Drawing Helper
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

        // --- TOP (X-Axis) ---
        // Iterate horizontally
        // Start from offset, go until width
        // Drawn at y = topOffset
        for (let x = offsetX; x < width; x += minorTickInterval) {
            // Check if major (floating point safe)
            // Global X: origin.x + x. If (origin.x + x) % 100 approx 0
            const globalX = origin.x + x;
            const isMajor = Math.abs(globalX % majorTickInterval) < minorTickInterval / 2;

            // Top Edge
            const h = isMajor ? 10 : 5;
            // Draw relative to topOffset
            drawTickLine(x, topOffset, x, topOffset + h, isMajor);

            // Bottom Edge (Anchor to bottom)
            // height is logical height. canvas.height is physical.
            // drawTickLine coords are logical (multiplied by dpr internally).
            // Let's use `height` variable which is `canvas.height / dpr`.
            // But if `height` is float, `height * dpr` vs `canvas.height` might differ by small pixel.
            // Safer: Just draw at `height`.
            drawTickLine(x, height - h, x, height, isMajor);

            // Draw Labels for Major Ticks? (Lat/Lng) - Optional, maybe too cluttered.
        }

        // --- LEFT / RIGHT (Y-Axis) ---
        // Start drawing from topOffset
        // We need to sync Y ticks correctly. 
        // origin.y corresponds to y=0 on screen.
        // We need ticks starting at y=topOffset.
        // Screen Y position is `y`.
        for (let y = offsetY; y < height; y += minorTickInterval) {
            // Check bounds: only draw if y >= topOffset and y <= height - rulerSize
            if (y < topOffset) continue;
            // if (y > height - rulerSize) continue; // Optional: stop before bottom corner?
            // Let's just draw all.

            const globalY = origin.y + y;
            const isMajor = Math.abs(globalY % majorTickInterval) < minorTickInterval / 2;
            const w = isMajor ? 10 : 5;

            // Left Edge
            drawTickLine(0, y, w, y, isMajor);

            // Right Edge
            drawTickLine(width - w, y, width, y, isMajor);
        }
    };

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
    }, [map, topOffset]); // Re-draw if topOffset changes

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
