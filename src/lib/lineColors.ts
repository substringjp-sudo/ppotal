import { RailData } from "../types/railData";

/**
 * Data-driven color lookup for Japanese Railroad lines.
 * Prioritizes colors defined in companies.json and lines.json.
 */

/**
 * Gets the color for a line based on provided railData.
 * @param lineKey Full key format "companyId::lineId" or just "lineId"
 * @param railData The loaded rail data containing color definitions
 * @returns HEX color string or null
 */
export const getLineColor = (lineKey: string, railData: RailData | null): string | null => {
    if (!lineKey || !railData) return null;

    const parts = lineKey.split('::');
    const lineId = parts.length >= 2 ? parts[1] : parts[0];
    const companyId = parts.length >= 2 ? parts[0] : null;

    // 1. Try Line specific color from lines.json
    const line = railData.lines[lineId];
    if (line?.color) return line.color;

    // 2. Try Company base color from companies.json
    if (companyId) {
        const company = railData.companies[companyId];
        if (company?.color) return company.color;
    }

    // 3. Fallback for sub-lines or matched company if ID wasn't explicit
    // (This is mostly for legacy or edge cases where IDs might not be perfect yet)
    if (!companyId) {
        // Search if any company matches this name/id if it was passed as name
        for (const company of Object.values(railData.companies)) {
            if (company.name === parts[0] && company.color) return company.color;
        }
    }

    return null;
};

/**
 * Compatibility wrapper for existing code using getOfficialColor
 * Note: This will eventually be removed once all components pass railData.
 */
export const getOfficialColor = (lineKey: string): string | null => {
    // This is hard to maintain without railData. 
    // We'll keep the most common hardcoded fallbacks here FOR NOW to prevent breakage
    // until all components are updated.

    // For now, returning null to force components to use getLineColor or handle fallback
    return null;
};

export const lightenColor = (hex: string, percent: number): string => {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
        hex = '#888888';
    }
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
        hex = hex.split('').map(x => x + x).join('');
    }

    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    r = Math.floor(r + (255 - r) * (percent / 100));
    g = Math.floor(g + (255 - g) * (percent / 100));
    b = Math.floor(b + (255 - b) * (percent / 100));

    const rHex = Math.min(255, r).toString(16).padStart(2, '0');
    const gHex = Math.min(255, g).toString(16).padStart(2, '0');
    const bHex = Math.min(255, b).toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
};
