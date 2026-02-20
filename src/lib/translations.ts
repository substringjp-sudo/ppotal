export type Language = 'ja' | 'en' | 'ko';

export const JR_GROUP_PREFIX_MAP: Record<string, string> = {
    北海道: "Hokkaido",
    東日本: "East",
    東海: "Central",
    西日本: "West",
    四国: "Shikoku",
    九州: "Kyushu",
    貨物: "Freight",
};

export const UI_TRANSLATIONS = {
    about_credits: {
        en: 'About / Credits',
        ko: '정보 / 크레딧',
        ja: '情報 / クレジット',
    },
};
