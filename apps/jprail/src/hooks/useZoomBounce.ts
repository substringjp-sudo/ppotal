import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';

export interface UseZoomBounceOptions {
    minZoom?: number;
    maxZoom?: number;
}

export function useZoomBounce(
    map: L.Map | null,
    options: UseZoomBounceOptions = {}
) {
    const { minZoom = 4, maxZoom = 18 } = options;
    const isBouncingRef = useRef(false);

    const triggerBounce = useCallback((direction: 'in' | 'out') => {
        if (!map || isBouncingRef.current) return;
        isBouncingRef.current = true;

        const container = map.getContainer();
        const scaleTarget = direction === 'in' ? 1.04 : 0.96;

        // Step 1: Overshoot scale
        container.style.transition = 'transform 0.12s cubic-bezier(0.25, 1, 0.5, 1)';
        container.style.transform = `scale(${scaleTarget})`;

        // Step 2: Elastic bounce back
        setTimeout(() => {
            container.style.transition = 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            container.style.transform = 'scale(1)';

            setTimeout(() => {
                container.style.transition = '';
                container.style.transform = '';
                isBouncingRef.current = false;
            }, 260);
        }, 120);
    }, [map]);

    useEffect(() => {
        if (!map) return;
        const container = map.getContainer();

        let lastWheelTime = 0;

        const handleWheel = (e: WheelEvent) => {
            const now = Date.now();
            if (now - lastWheelTime < 250) return;

            const currentZoom = map.getZoom();

            // Zooming IN past maxZoom
            if (e.deltaY < 0 && currentZoom >= maxZoom - 0.2) {
                lastWheelTime = now;
                triggerBounce('in');
            }
            // Zooming OUT past minZoom
            else if (e.deltaY > 0 && currentZoom <= minZoom + 0.2) {
                lastWheelTime = now;
                triggerBounce('out');
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: true });

        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, [map, minZoom, maxZoom, triggerBounce]);

    return { triggerBounce };
}
