/**
 * Official colors for Japanese Railroad lines.
 * Sources: Wikipedia, JR official sites, and common railroad maps.
 */

export const COMPANY_COLORS: Record<string, string> = {
    "JR北海道": "#0098D8", // Light Blue/Greenish
    "JR東日本": "#22ac38", // Green
    "JR東海": "#f68b1e", // Orange
    "JR西日本": "#0072bc", // Blue
    "JR四국": "#00a0dc", // Light Blue
    "JR九州": "#e60012", // Red
    "JR貨物": "#5f7f9f", // Sunset Blue
};

export const OFFICIAL_LINE_COLORS: Record<string, string> = {
    // JR East
    "山手線": "#9acd32",
    "中央線": "#f15a22",
    "中央・総武線": "#ffd400",
    "京浜東北線": "#00b2e5",
    "埼京線": "#00ac9a",
    "京葉線": "#c9242f",
    "武蔵野線": "#f15a22",
    "常磐線": "#007b43",
    "湘南新宿ライン": "#e60012",
    "東海道線": "#f68b1e",
    "横須賀・総武快速線": "#007bc3",
    "横浜線": "#9acd32",
    "南武線": "#ffd400",
    "鶴見線": "#ffd400",
    "根岸線": "#00b2e5",
    "青梅線": "#f15a22",
    "五日市線": "#f15a22",

    // JR West (Osaka)
    "大阪環状線": "#f15a22",
    "大和路線": "#80c241",
    "阪和線": "#00b2e5",
    "学研都市線": "#f39700",
    "JR京都線": "#0072bc",
    "JR神戸線": "#0072bc",
    "JR宝塚線": "#ffc20e",

    // Private Railways
    "京王線": "#dd0077",
    "小田急小田原線": "#008cc3",
    "東急東横線": "#da003d",
    "東急田園都市線": "#00a650",
    "京急本線": "#007ec5",
    "都営新宿線": "#a7ba48",
    "都営三田線": "#0079c2",
    "都営浅草線": "#e85298",
    "都営大江戸線": "#b60081",
    "東京メトロ銀座線": "#ff9500",
    "東京メトロ丸ノ内線": "#f62e36",
    "東京메트로日比谷線": "#b5b5ac",
    "東京메트로東西線": "#009bda",
    "東京메트로千代田線": "#00bb85",
    "東京메트로有楽町線": "#c1a470",
    "東京메트로半蔵門線": "#937cb9",
    "東京메트로南北線": "#00ac9b",
    "東京메트로副都心線": "#9c5e31",
};

export const getOfficialColor = (lineKey: string): string | null => {
    // lineKey is usually "Company::LineName"
    const parts = lineKey.split('::');
    if (parts.length < 2) return null;

    const company = parts[0];
    const lineName = parts[1];

    // Check specific line first
    if (OFFICIAL_LINE_COLORS[lineName]) return OFFICIAL_LINE_COLORS[lineName];

    // Try partial match for lineName
    for (const [key, color] of Object.entries(OFFICIAL_LINE_COLORS)) {
        if (lineName.includes(key)) return color;
    }

    // Fallback to company color
    if (COMPANY_COLORS[company]) return COMPANY_COLORS[company];

    return null;
};

export const lightenColor = (hex: string, percent: number): string => {
    // Remove the hash
    hex = hex.replace(/^#/, '');

    // Parse R, G, B
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    // Lighten each channel
    r = Math.floor(r + (255 - r) * (percent / 100));
    g = Math.floor(g + (255 - g) * (percent / 100));
    b = Math.floor(b + (255 - b) * (percent / 100));

    // Convert back to hex and pad with zeros
    const rHex = r.toString(16).padStart(2, '0');
    const gHex = g.toString(16).padStart(2, '0');
    const bHex = b.toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
};
