export const getProgressColor = (percent: number) => {
    if (percent >= 99.9) return { bg: '#27ae60', text: '#fff' };
    if (percent <= 0) return { bg: '#f5f5f5', text: '#666' };

    // Mix between light gray and theme green
    // Start with light green bg
    const saturation = 30 + (percent * 0.4); // 30% -> 70%
    const lightness = 96 - (percent * 0.4); // 96% -> 56%
    return {
        bg: `hsl(145, ${saturation}%, ${lightness}%)`,
        text: percent > 50 ? '#fff' : '#186A3B'
    };
};
