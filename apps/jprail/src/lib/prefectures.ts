/**
 * Prefecture identity.
 *
 * The ids in this dataset look like `p10` and are an internal numbering, not
 * JIS codes: `p10` is Tokyo, not Gunma, and Hokkaido is `p46` rather than
 * `p1`. Anything that wants to talk about a specific prefecture has to go
 * through here, because guessing the number is how the region achievements
 * came to be checking Fukuoka and Wakayama for a Kanto award.
 *
 * The table mirrors `public/data/region_names.json` (adm1), which is the file
 * the rest of the app reads names from. A test asserts the two agree, so a
 * regenerated dataset fails loudly instead of silently scoring nothing.
 */

export type PrefectureId = string;

export const PREFECTURE_NAMES: Record<PrefectureId, string> = {
    p1: '大阪府',
    p2: '大分県',
    p3: '兵庫県',
    p4: '福井県',
    p5: '滋賀県',
    p6: '奈良県',
    p7: '岐阜県',
    p8: '三重県',
    p9: '和歌山県',
    p10: '東京都',
    p11: '福岡県',
    p12: '埼玉県',
    p13: '福島県',
    p14: '栃木県',
    p15: '青森県',
    p16: '佐賀県',
    p17: '長崎県',
    p18: '宮崎県',
    p19: '熊本県',
    p20: '鹿児島県',
    p21: '群馬県',
    p22: '京都府',
    p23: '千葉県',
    p24: '茨城県',
    p25: '神奈川県',
    p26: '広島県',
    p27: '鳥取県',
    p28: '島根県',
    p29: '新潟県',
    p30: '長野県',
    p31: '愛知県',
    p32: '山梨県',
    p33: '宮城県',
    p34: '山形県',
    p35: '秋田県',
    p36: '岩手県',
    p37: '富山県',
    p38: '静岡県',
    p39: '石川県',
    p40: '岡山県',
    p41: '徳島県',
    p42: '高知県',
    p43: '愛媛県',
    p44: '香川県',
    p45: '沖縄県',
    p46: '北海道',
    p47: '山口県',
};

const idsByName = new Map<string, PrefectureId>(
    Object.entries(PREFECTURE_NAMES).map(([id, name]) => [name, id])
);

/** Internal id for a Japanese prefecture name, or undefined if unknown. */
export const prefectureIdOf = (name: string): PrefectureId | undefined => idsByName.get(name);

/** Internal ids for a list of names, dropping any that do not resolve. */
export const prefectureIds = (names: readonly string[]): PrefectureId[] =>
    names.map(prefectureIdOf).filter((id): id is PrefectureId => !!id);

export const REGIONS = {
    kanto: ['東京都', '神奈川県', '埼玉県', '千葉県', '茨城県', '栃木県', '群馬県'],
    kansai: ['大阪府', '京都府', '兵庫県', '奈良県', '滋賀県', '和歌山県'],
    hokkaido: ['北海道'],
    kyushu: ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県']
} as const;

/**
 * English names as they appear in the boundary file, which writes some
 * prefectures as "Osaka Prefecture" and others as plain "Oita". Normalising
 * that suffix away matches all 47 against the names the app already ships.
 */
const normalise = (name: string) => name.trim().toLowerCase().replace(/\s+prefectures?$/, '');

/**
 * Boundary features identify themselves by ISO code (`JP-13`, a JIS number),
 * which is *not* the internal id (`p10`). Resolve one to the other through the
 * English names both files carry, so the coverage map colours the right shape.
 */
export function buildIsoToInternal(
    regionNames: Record<string, { name_en?: string }> | null | undefined,
    features: { properties?: { shapeName?: string; shapeISO?: string } | null }[]
): Map<string, PrefectureId> {
    const result = new Map<string, PrefectureId>();
    if (!regionNames) return result;

    const byEnglish = new Map<string, PrefectureId>();
    for (const [id, entry] of Object.entries(regionNames)) {
        if (entry?.name_en) byEnglish.set(normalise(entry.name_en), id);
    }
    for (const feature of features) {
        const iso = feature.properties?.shapeISO;
        const name = feature.properties?.shapeName;
        if (!iso || !name) continue;
        const id = byEnglish.get(normalise(name));
        if (id) result.set(iso, id);
    }
    return result;
}
