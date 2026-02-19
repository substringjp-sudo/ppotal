import { translate, Language } from './translations';

export const normalizeLineName = (name: string): string => {
    if (!name) return "";
    // Strip common suffixes: Japanese "線", English " Line", Korean " 선"
    return name.replace(/(線| Line| 선)$/, "").trim();
};

export const getNormalizedLineKey = (company: string, line: string): string => {
    return `${company}::${normalizeLineName(line)}`;
};

export const normalizeCompanyName = (name: string): string => {
    if (!name) return "";
    let n = name.trim();
    // Normalize JR names
    if (n.includes("東日本旅客鉄道") || n === "JR東日本") return "JR東日本";
    if (n.includes("西日本旅客鉄道") || n === "JR西日本") return "JR西日本";
    if (n.includes("東海旅客鉄道") || n === "JR東海") return "JR東海";
    if (n.includes("九州旅客鉄道") || n === "JR九州") return "JR九州";
    if (n.includes("四国旅客鉄道") || n === "JR四国") return "JR四国";
    if (n.includes("北海道旅客鉄道") || n === "JR北海道") return "JR北海道";
    return n;
};

export const normalizeKey = (key: string): string => {
    if (!key) return "";
    const parts = key.split("::");
    if (parts.length >= 2) {
        return `${normalizeCompanyName(parts[0])}::${normalizeLineName(parts[1])}`;
    }
    return key;
};

export const translateName = (name: string, lang: Language, type: 'company' | 'line' | 'station' = 'station'): string => {
    return translate(name, lang, type);
};
