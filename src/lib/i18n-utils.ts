export type Language = 'ko' | 'en' | 'ja';

export interface LocalizedObject {
    name: string;
    name_en?: string;
    name_kr?: string;
}

export interface RegionNames {
    adm1: Record<string, { name: string; name_en?: string; name_kr?: string }>;
    adm2: Record<string, { name: string; name_en?: string; name_kr?: string }>;
}

export const getLocalizedName = (obj: LocalizedObject | undefined | null, language: Language) => {
    if (!obj) return '';
    if (language === 'ko') return obj.name_kr || obj.name_en || obj.name;
    if (language === 'en') return obj.name_en || obj.name;
    return obj.name; // default to Japanese
};

export const getLocalizedAddress = (
    prefectureId: string | number | undefined | null,
    cityId: string | number | undefined | null,
    regionNames: RegionNames | null,
    language: Language
) => {
    if (!regionNames) return '';
    const pref = prefectureId ? regionNames.adm1[prefectureId.toString()] : null;
    const city = cityId ? regionNames.adm2[cityId.toString()] : null;

    if (language === 'ko') {
        const pName = pref?.name_kr || pref?.name_en || pref?.name || '';
        const cName = city?.name_kr || city?.name_en || city?.name || '';
        return `${pName}${pName && cName ? ' ' : ''}${cName}`;
    } else if (language === 'en') {
        const pName = pref?.name_en || pref?.name || '';
        const cName = city?.name_en || city?.name || '';
        return `${cName}${cName && pName ? ', ' : ''}${pName}`;
    } else {
        // Japanese: Prefecture + City
        return `${pref?.name || ''}${city?.name || ''}`;
    }
};
export const getLocalizedRegion = (
    regionId: string | number | undefined | null,
    type: 'adm1' | 'adm2',
    regionNames: RegionNames | null,
    language: Language
) => {
    if (!regionNames || !regionId) return { primary: '', sub: '' };
    const region = regionNames[type][regionId.toString()];
    if (!region) return { primary: '', sub: '' };

    return {
        primary: getLocalizedName(region, language),
        sub: language !== 'ja' ? region.name : ''
    };
};
