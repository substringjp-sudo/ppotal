/**
 * Official colors for Japanese Railroad lines.
 * Sources: Wikipedia, JR official sites, and common railroad maps.
 */

export const COMPANY_COLORS: Record<string, string> = {
    "JR北海道": "#0098D8",
    "JR东日本": "#22ac38",
    "JR東日本": "#22ac38",
    "JR東海": "#f68b1e",
    "JR西日本": "#0072bc",
    "JR四国": "#00a0dc",
    "JR九州": "#e60012",
    "JR貨物": "#5f7f9f",
    "東京メトロ": "#005691",
    "東京都交通局": "#008a4c",
    "京王電鉄": "#dd0077",
    "小田急電鉄": "#008cc3",
    "東急電鉄": "#da003d",
    "西武鉄道": "#00a6bf",
    "東武鉄道": "#005aaa",
    "京成電鉄": "#004892",
    "京急電鉄": "#ed1c24",
    "相模鉄道": "#003265",
    "名古屋鉄道": "#cc0022",
    "近畿日本鉄道": "#cc0022",
    "南海電気鉄道": "#004e98",
    "阪急電鉄": "#880022",
    "阪神電気鉄道": "#003b83",
    "京阪電気鉄道": "#00542a",
    "西日本鉄道": "#f39800",
};

export const OFFICIAL_LINE_COLORS: Record<string, string> = {
    // --- JR East (Kanto & Tohoku) ---
    "山手線": "#9acd32",
    "中央線": "#f15a22",
    "中央本線": "#f15a22",
    "中央・総武線": "#ffd400",
    "京浜東北線": "#00b2e5",
    "埼京線": "#00ac9a",
    "京葉線": "#c9242f",
    "武蔵野線": "#f15a22",
    "常磐線": "#007b43",
    "湘南新宿ライン": "#e60012",
    "東海道線": "#f68b1e",
    "東海道本線": "#f68b1e",
    "横須賀・総武快速線": "#007bc3",
    "横須賀線": "#007bc3",
    "横浜線": "#9acd32",
    "南武線": "#ffd400",
    "鶴見線": "#ffd400",
    "根岸線": "#00b2e5",
    "青梅線": "#f15a22",
    "五日市線": "#f15a22",
    "宇都宮線": "#f68b1e",
    "高崎線": "#f68b1e",
    "相模線": "#00a896",
    "川越線": "#00ac9a",
    "八高線": "#808080",
    "仙石線": "#00b2e5",
    "奥羽本線": "#ffa500",

    // --- JR Central ---
    "御殿場線": "#477543",
    "身延線": "#773C97",
    "飯田線": "#6FA3D7",
    "関西本線": "#16B68F",
    "紀勢本線": "#f68b1e",

    // --- JR West (Kansai & Chugoku) ---
    "大阪環状線": "#f15a22",
    "大和路線": "#80c241",
    "阪和線": "#00b2e5",
    "学研都市線": "#f39700",
    "片町線": "#f39700",
    "JR京都線": "#0072bc",
    "JR神戸線": "#0072bc",
    "JR宝塚線": "#ffc20e",
    "福知山線": "#ffc20e",
    "奈良線": "#80c241",
    "嵯峨野線": "#80c241",
    "山陰本線": "#80c241",
    "琵琶湖線": "#0072bc",
    "湖西線": "#0072bc",
    "山陽本線": "#0072bc",

    // --- Tokyo Metro ---
    "銀座線": "#ff9500",
    "丸ノ内線": "#f62e36",
    "日比谷線": "#b5b5ac",
    "東西線": "#009bda",
    "千代田線": "#00bb85",
    "有楽町線": "#c1a470",
    "半蔵門線": "#8f76d6",
    "南北線": "#00ac9b",
    "副都心線": "#9c5e31",

    // --- Toei Subway ---
    "浅草線": "#e85298",
    "三田線": "#0079c2",
    "新宿線": "#a7ba48",
    "大江戸선": "#b60081",

    // --- Osaka Metro ---
    "御堂筋線": "#e5171f",
    "谷町線": "#9b509e",
    "四つ橋線": "#0078ba",
    "大阪メトロ中央線": "#019a66",
    "千日前線": "#e44d93",
    "堺筋線": "#814721",
    "長堀鶴見緑地線": "#a9cc51",
    "今里筋線": "#ee7b1a",

    // --- Nagoya Subway ---
    "東山線": "#ffdb00",
    "名城線": "#9b26b6",
    "名港線": "#b065b0",
    "鶴舞線": "#00a0de",
    "桜通線": "#e5171f",
    "上飯田線": "#f397c1",

    // --- Yokohama Subway ---
    "ブルーライン": "#0079c2",
    "グリーン라인": "#008a3e",

    // --- Shinkansen ---
    "東海道新幹線": "#000080",
    "山陽新幹線": "#000080",
    "東北新幹線": "#008000",
    "上越新幹線": "#ff4500",
    "北陸新幹線": "#800080",
    "九州新幹線": "#e60012",
    "西九州新幹線": "#e60012",
    "山形新幹線": "#ffa500",
    "秋田新幹線": "#e2041b",
    "北海道新幹線": "#0098d8",

    // --- Private Rails ---
    "京王線": "#e3379f",
    "井の頭線": "#1a407b",
    "小田急小田原線": "#2683ce",
    "小田急多摩線": "#2683ce",
    "小田急江ノ島線": "#2683ce",
    "東急東横線": "#da003d",
    "東急田園都市線": "#20a288",
    "東急目黒線": "#009cd2",
    "東急大井町線": "#f18c43",
    "西武池袋線": "#ed772d",
    "西武新宿線": "#00a6bf",
    "東武スカイツリーライン": "#005aaa",
    "東武東上線": "#004098",
    "京成線": "#004892",
    "京急線": "#ed1c24",
    "相鉄線": "#003265",
    "名鉄": "#cc0022",
    "近鉄": "#cc0022",
    "南海": "#004e98",
    "阪急": "#451c1d",
    "阪神": "#003b83",
    "京阪": "#00542a",
    "西鉄": "#f39800",
    "みなとみらい線": "#e5171f",
};

export const getOfficialColor = (lineKey: string): string | null => {
    const parts = lineKey.split('::');
    const lineName = parts.length >= 2 ? parts[1] : parts[0];
    const company = parts.length >= 2 ? parts[0] : null;

    // 1. 정확한 노선명 매칭
    if (OFFICIAL_LINE_COLORS[lineName]) return OFFICIAL_LINE_COLORS[lineName];

    // 2. 회사명 포함 키로 매칭 (예: 大阪メトロ中央線)
    if (company) {
        for (const [key, color] of Object.entries(OFFICIAL_LINE_COLORS)) {
            if (key.includes(company) && key.includes(lineName)) return color;
        }
    }

    // 3. 부분 매칭
    for (const [key, color] of Object.entries(OFFICIAL_LINE_COLORS)) {
        if (lineName.includes(key) || key.includes(lineName)) return color;
    }

    if (company && COMPANY_COLORS[company]) return COMPANY_COLORS[company];
    if (lineName.includes("新幹線")) return "#000080";

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
