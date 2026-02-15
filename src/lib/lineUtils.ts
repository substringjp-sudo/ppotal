import { translate, Language } from './translations';

export const normalizeLineName = (name: string): string => {
    if (!name) return "";
    // Strip common suffixes: Japanese "線", English " Line", Korean " 선"
    return name.replace(/(線| Line| 선)$/, "").trim();
};

export const getNormalizedLineKey = (company: string, line: string): string => {
    return `${company}::${normalizeLineName(line)}`;
};

export const normalizeKey = (key: string): string => {
    if (!key) return "";
    const parts = key.split("::");
    if (parts.length >= 2) {
        return `${parts[0]}::${normalizeLineName(parts[1])}`;
    }
    return key;
};

export const translateName = (name: string, lang: Language, type: 'company' | 'line' | 'station' = 'station'): string => {
    return translate(name, lang, type);
};
