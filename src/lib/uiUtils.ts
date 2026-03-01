export const getProgressColor = (percent: number) => {
    if (percent >= 99.9) return { bg: '#27ae60', text: '#fff' };
    if (percent <= 0) return { bg: '#f5f5f5', text: '#666' };

    // Mix between light gray and theme green
    const saturation = 30 + (percent * 0.4); // 30% -> 70%
    const lightness = 96 - (percent * 0.4); // 96% -> 56%
    return {
        bg: `hsl(145, ${saturation}%, ${lightness}%)`,
        text: percent > 50 ? '#fff' : '#186A3B'
    };
};

export const getSmartTooltipOptions = (
    x: number,
    y: number,
    mapWidth: number,
    mapHeight: number
) => {
    // 8-direction logic based on position relative to map container
    const margin = 120; // Margin from edges where we start flipping/shifting

    const nearTop = y < margin;
    const nearBottom = y > mapHeight - margin;
    const nearLeft = x < margin;
    const nearRight = x > mapWidth - margin;

    let direction: 'top' | 'bottom' | 'left' | 'right' | 'center' = 'top';
    let offset: [number, number] = [0, -10];

    if (nearTop) {
        if (nearLeft) {
            direction = 'bottom';
            offset = [15, 15]; // Bottom-Right shift
        } else if (nearRight) {
            direction = 'bottom';
            offset = [-15, 15]; // Bottom-Left shift
        } else {
            direction = 'bottom';
            offset = [0, 15];
        }
    } else if (nearBottom) {
        if (nearLeft) {
            direction = 'top';
            offset = [15, -15]; // Top-Right shift
        } else if (nearRight) {
            direction = 'top';
            offset = [-15, -15]; // Top-Left shift
        } else {
            direction = 'top';
            offset = [0, -15];
        }
    } else {
        if (nearLeft) {
            direction = 'right';
            offset = [15, 0];
        } else if (nearRight) {
            direction = 'left';
            offset = [-15, 0];
        } else {
            // Default center-ish? No, default to right or left with logic
            direction = x < mapWidth / 2 ? 'right' : 'left';
            offset = direction === 'right' ? [15, 0] : [-15, 0];
        }
    }

    return { direction, offset };
};
