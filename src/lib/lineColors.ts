/**
 * Official colors for Japanese Railroad lines.
 * Sources: Wikipedia, JR official sites, and common railroad maps.
 */

export const COMPANY_COLORS: Record<string, string> = {
    // JR Group
    "JR北海道": "#0098D8",
    "北海道旅客鉄道": "#0098D8",
    "JR东日本": "#22ac38",
    "JR東日本": "#22ac38",
    "東日本旅客鉄道": "#22ac38",
    "JR東海": "#f68b1e",
    "東海旅客鉄道": "#f68b1e",
    "JR西日本": "#0072bc",
    "西日本旅客鉄道": "#0072bc",
    "JR四国": "#00a0dc",
    "四国旅客鉄道": "#00a0dc",
    "JR九州": "#e60012",
    "九州旅客鉄道": "#e60012",
    "JR貨物": "#5f7f9f",

    // Major Private (Kanto)
    "東京メトロ": "#005691",
    "東京地下鉄": "#005691",
    "東京都交通局": "#008a4c",
    "東京都": "#008a4c",
    "京王電鉄": "#dd0077",
    "小田急電鉄": "#008cc3",
    "東急電鉄": "#da003d",
    "西武鉄道": "#00a6bf",
    "東武鉄道": "#005aaa",
    "京成電鉄": "#004892",
    "京急電鉄": "#ed1c24",
    "相模鉄道": "#003265",
    "首都圏新都市鉄道": "#ec1c24", // Tsukuba Express

    // Major Private (Kansai)
    "名古屋鉄道": "#cc0022",
    "近畿日本鉄道": "#cc0022",
    "南海電気鉄道": "#004e98",
    "阪急電鉄": "#880022",
    "阪神電気鉄道": "#003b83",
    "京阪電気鉄道": "#00542a",
    "西日本鉄道": "#f39800",

    // Subway Systems
    "大阪市高速電気軌道": "#005691",
    "名古屋市": "#555555",
    "札幌市": "#555555",
    "京都市": "#555555",
    "神戸市": "#555555",
    "福岡市": "#555555",
    "仙台市": "#555555",
    "ヨコハマ": "#00529b",
    "横浜市": "#00529b",

    // Regional
    "伊予鉄道": "#f39700",
    "広島電鉄": "#008000",
    "長崎電気軌道": "#008000",
    "熊本市": "#008000",
    "鹿児島市": "#008000",
    "富山地方鉄道": "#0033ff",
    "あいの風とやま鉄道": "#00a0e9",
    "IRいしかわ鉄道": "#00529a",
    "ハピラインふくい": "#ff007f",
    "えちごトキめき鉄道": "#3782bd",
    "しなの鉄道": "#e60012",
    "青い森鉄道": "#00a0e9",
    "いわて銀河鉄道": "#00529a",
    "アイジーアールいわて銀河鉄道": "#00529a",
};

export const OFFICIAL_LINE_COLORS: Record<string, string> = {
    // --- JR East (Kanto) ---
    "山手線": "#9acd32",
    "中央線": "#f15a22",
    "中央本線": "#f15a22",
    "中央・総武線": "#ffd400",
    "中央・総武線各駅停車": "#ffd400",
    "総武線": "#ffd400",
    "総武本線": "#007bc3",
    "京浜東北線": "#00b2e5",
    "埼京線": "#00ac9a",
    "京葉線": "#c9242f",
    "武蔵野線": "#f15a22",
    "常磐線": "#007b43",
    "常磐快速線": "#007b43",
    "常磐線各駅停車": "#00b2e5",
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
    "東金線": "#f15a22",
    "内房線": "#00b2e5",
    "外房線": "#f15a22",
    "久留里線": "#00ac9a",
    "成田線": "#007b43",
    "鹿島線": "#773c97",
    "日光線": "#800000",
    "烏山線": "#008000",
    "吾妻線": "#00a896",
    "両毛線": "#ffd400",
    "水戸線": "#00b2e5",
    "水郡線": "#f68b1e",

    // --- JR East (Tohoku/Shinetsu) ---
    "仙石線": "#00b2e5",
    "仙山線": "#80c241",
    "奥羽本線": "#ffa500",
    "羽越本線": "#00a0dc",
    "磐越西線": "#f15a22",
    "磐越東線": "#6fa3d7",
    "石巻線": "#f15a22",
    "津軽線": "#00b2e5",
    "大湊線": "#ffd400",
    "五能線": "#00ac9a",
    "男鹿線": "#008000",
    "田沢湖線": "#8f76d6",
    "山田線": "#ffa500",
    "釜石線": "#00b2e5",
    "大船渡線": "#f39700",
    "北上線": "#773c97",
    "八戸線": "#e60012",
    "大糸線": "#9370db",
    "小海線": "#008000",
    "飯山線": "#ffd400",
    "越後線": "#00ac9a",
    "弥彦線": "#808080",
    "白新線": "#f15a22",
    "信越本線": "#ff4500",

    // --- JR Central ---
    "御殿場線": "#477543",
    "身延線": "#773C97",
    "飯田線": "#6FA3D7",
    "関西本線": "#16B68F",
    "紀勢本線": "#f68b1e",
    "中央本線(東海)": "#f68b1e",
    "太多線": "#f39700",
    "高山本線": "#cca300",
    "名松線": "#008000",
    "参宮線": "#e60012",
    "武豊線": "#800080",

    // --- JR West (Kansai) ---
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
    "草津線": "#00b2e5",
    "和歌山線": "#f39700",
    "桜井線": "#e60012",
    "万葉まほろば線": "#e60012",
    "関西空港線": "#00b2e5",
    "おおさか東線": "#00b2e5",
    "JR東西線": "#ffc20e",
    "桜島線": "#00b2e5",
    "ゆめ咲線": "#00b2e5",

    // --- JR West (Chugoku/Hokuriku) ---
    "山陽本線": "#0072bc",
    "呉線": "#ffd400",
    "可部線": "#00ac9a",
    "芸備線": "#8f76d6",
    "福塩線": "#f39700",
    "伯備線": "#00b2e5",
    "吉備線": "#f15a22",
    "桃太郎線": "#f15a22",
    "津山線": "#f39700",
    "因美線": "#008000",
    "境線": "#00ac9a",
    "木次線": "#ffa500",
    "宇部線": "#8f76d6",
    "小野田線": "#ffd400",
    "美祢線": "#f15a22",
    "岩徳線": "#00b2e5",
    "山口線": "#f39700",
    "北陸本線": "#0072bc",
    "七尾線": "#00b2e5",
    "氷見線": "#80c241",
    "城端線": "#ffa500",
    "小浜線": "#00ac9a",
    "越美北線": "#f15a22",
    "九頭竜線": "#f15a22",

    // --- JR Shikoku ---
    "予讃線": "#00a0dc",
    "土讃線": "#f39700",
    "高徳線": "#00b2e5",
    "徳島線": "#008000",
    "牟岐線": "#f15a22",
    "予土線": "#00ac9a",
    "鳴門線": "#ffa500",
    "内子線": "#00a0dc",

    // --- JR Kyushu ---
    "鹿児島本線": "#e60012",
    "日豊本線": "#0072bc",
    "長崎本線": "#ffd400",
    "佐世保線": "#00ac9a",
    "久大本線": "#80c241",
    "ゆふ高原線": "#80c241",
    "豊肥本線": "#f15a22",
    "阿蘇高原線": "#f15a22",
    "筑豊本線": "#ffd400",
    "篠栗線": "#f15a22",
    "福北ゆたか線": "#f15a22",
    "香椎線": "#00b2e5",
    "海の中道線": "#00b2e5",
    "筑肥線": "#f39700",
    "唐津線": "#00ac9a",
    "後藤寺線": "#f15a22",
    "日田彦山線": "#ffd400",
    "指宿枕崎線": "#ffa500",
    "日南線": "#00b261",
    "吉都線": "#f15a22",
    "肥薩線": "#773c97",
    "三角線": "#00b2e5",

    // --- JR Hokkaido ---
    "函館本線": "#0098d8",
    "室蘭本線": "#ffd400",
    "根室本線": "#f15a22",
    "石勝線": "#00ac9a",
    "千歳線": "#0072bc",
    "札沼線": "#ffd400",
    "学園都市線": "#ffd400",
    "宗谷本線": "#ff4500",
    "石北本線": "#f15a22",
    "釧網本線": "#f39700",
    "富良野線": "#8f76d6",
    "留萌本線": "#808080",
    "日高本線": "#00ac9a",

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
    "大江戸線": "#b60081",

    // --- Osaka Metro ---
    "御堂筋線": "#e5171f",
    "谷町線": "#9b509e",
    "四つ橋線": "#0078ba",
    "大阪メトロ中央線": "#019a66",
    "千日前線": "#e44d93",
    "堺筋線": "#814721",
    "長堀鶴見緑地線": "#a9cc51",
    "今里筋線": "#ee7b1a",
    "南港ポートタウン線": "#00a0e9",
    "ニュートラム": "#00a0e9",

    // --- Nagoya Subway ---
    "東山線": "#ffdb00",
    "名城線": "#9b26b6",
    "名港線": "#b065b0",
    "鶴舞線": "#00a0de",
    "桜通線": "#e5171f",
    "上飯田線": "#f397c1",

    // --- Private Rails (Kanto) ---
    "京王線": "#e3379f",
    "井の頭線": "#1a407b",
    "小田急小田原線": "#2683ce",
    "小田急多摩線": "#2683ce",
    "小田急江ノ島線": "#2683ce",
    "東急東横線": "#da003d",
    "東急田園都市線": "#20a288",
    "東急目黒線": "#009cd2",
    "東急大井町線": "#f18c43",
    "東急池上線": "#f397c1",
    "東急多摩川線": "#c1a470",
    "世田谷線": "#ffd400",
    "西武池袋線": "#ed772d",
    "西武新宿線": "#00a6bf",
    "西武国分寺線": "#00a0e9",
    "西武多摩川線": "#ffd400",
    "東武スカイツリーライン": "#005aaa",
    "東武東上線": "#004098",
    "東武野田線": "#00a0dc",
    "東武アーバンパークライン": "#00a0dc",
    "京成線": "#004892",
    "京成本線": "#004892",
    "京成成田空港線": "#f39700",
    "スカイライナー": "#f39700",
    "京急線": "#ed1c24",
    "京急本선": "#ed1c24",
    "相鉄線": "#003265",
    "相鉄本線": "#003265",
    "みなとみらい線": "#e5171f",
    "つくばエクスプレス": "#ec1c24",
    "ゆりかもめ": "#004098",
    "モノレール浜松町": "#00a0dc",
    "東京モノレール": "#00a0dc",
    "江ノ島電鉄": "#005d42",
    "箱根登山鉄道": "#e60012",

    // --- Private Rails (Kansai) ---
    "名鉄名古屋本線": "#cc0022",
    "近鉄大阪線": "#cc0022",
    "近鉄奈良線": "#cc0022",
    "南海本線": "#004e98",
    "南海高野線": "#f39700",
    "阪急神戸線": "#451c1d",
    "阪急宝塚線": "#451c1d",
    "阪急京都線": "#451c1d",
    "阪神本線": "#003b83",
    "京阪本線": "#00542a",
    "西鉄天神大牟田線": "#f39800",

    // --- Regional / 3rd Sector ---
    "青い森鉄道線": "#00a0e9",
    "いわて銀河鉄道線": "#00529a",
    "三陸鉄道リアス線": "#d4002a",
    "あいの風とやま鉄道線": "#00a0e9",
    "IRいしかわ鉄道線": "#00529a",
    "しなの鉄道線": "#e60012",
    "北しなの線": "#999966",
    "えちごトキめき鉄道日本海ひすいライン": "#3782bd",
    "えちごトキめき鉄道妙高はねうまライン": "#35c98e",
    "富士急行線": "#0000ff",
    "伊豆急行線": "#00bfff",
    "銚子電気鉄道線": "#ffd400",
    "小湊鉄道線": "#f15a22",
    "いすみ線": "#ffd400",
    "真岡線": "#008000",
    "わたらせ渓谷線": "#800000",
    "北総鉄道": "#00a0df",
    "新京成線": "#e51171",
    "流山線": "#ffa500",
    "芝山鉄道": "#00529a",
    "埼玉高速鉄道": "#00ac9a",
    "東葉高速鉄道": "#009bbf",
    "多摩モノレール": "#f15a22",
    "湘南モノレール": "#e61010",
    "千葉モノレール": "#00a0e9",

    // --- Regional Specifics ---
    "富山地方鉄道本線": "#0033ff",
    "立山線": "#009933",
    "不二越線": "#f77321",
    "上滝線": "#f77321",
    "伊野線": "#ff0000",
    "後免線": "#ff0000",
    "桟橋線": "#0000ff",
    "駅前線": "#0000ff",
};

export const getOfficialColor = (lineKey: string): string | null => {
    if (!lineKey) return null;

    const parts = lineKey.split('::');
    const lineName = parts.length >= 2 ? parts[parts.length - 1] : parts[0];
    const company = parts.length >= 2 ? parts[0] : null;

    // 1. Exact match for full key (Company::Line)
    // No dedicated map for this yet but could add

    // 2. Exact match for line name
    if (OFFICIAL_LINE_COLORS[lineName]) return OFFICIAL_LINE_COLORS[lineName];

    // 3. Fallback for sub-lines or aliases
    if (lineName.includes("総武線")) return OFFICIAL_LINE_COLORS["総武線"];
    if (lineName.includes("常磐線")) return OFFICIAL_LINE_COLORS["常磐線"];
    if (lineName.includes("中央線")) return OFFICIAL_LINE_COLORS["中央線"];
    if (lineName.includes("東海道線")) return OFFICIAL_LINE_COLORS["東海道線"];
    if (lineName.includes("新幹線")) return OFFICIAL_LINE_COLORS[lineName] || "#000080";

    // 4. Partial matching with company logic
    if (company) {
        // Handle JR specific generic logic
        if (company.includes("東日本旅客鉄道") || company === "JR東日本") {
            if (lineName.includes("本線")) return "#22ac38";
        }
        if (company.includes("西日本旅客鉄道") || company === "JR西日本") {
            if (lineName.includes("本線")) return "#0072bc";
        }

        // Match specific company-prefixed lines
        for (const [key, color] of Object.entries(OFFICIAL_LINE_COLORS)) {
            if (lineName.includes(key)) return color;
        }

        // Return company base color
        if (COMPANY_COLORS[company]) return COMPANY_COLORS[company];

        // Search company name in COMPANY_COLORS keys
        for (const [compKey, color] of Object.entries(COMPANY_COLORS)) {
            if (company.includes(compKey) || compKey.includes(company)) return color;
        }
    }

    // 5. Broad substring match as last resort
    for (const [key, color] of Object.entries(OFFICIAL_LINE_COLORS)) {
        if (lineName.includes(key)) return color;
    }

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
