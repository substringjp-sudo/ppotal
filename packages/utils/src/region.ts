import { Region } from "@regionevel/types";

/**
 * Gets the localized name of a region based on the requested locale.
 * Priority: 
 * 1. Requested locale (e.g. nameKo if locale is 'ko')
 * 2. Korean name (nameKo)
 * 3. English name (nameEn)
 * 4. Default name (name)
 */
export const getLocalizedName = (region: Region, locale: string = 'ko'): string => {
  if (locale === 'ko' && region.nameKo) return region.nameKo;
  if (locale === 'en' && region.nameEn) return region.nameEn;
  
  return region.nameKo || region.nameEn || region.name;
};

/**
 * Translates region types to Korean.
 */
export const getLocalizedType = (type: string | undefined): string => {
  if (!type) return '';
  
  const typeMap: Record<string, string> = {
    'Country': '국가',
    'Province': '도/광역시',
    'City': '시/군/구',
    'District': '구',
    'Special City': '특별시',
    'Metropolitan City': '광역시',
    'Self-Governing City': '특별자치시',
    'Self-Governing Province': '특별자치도',
  };
  
  return typeMap[type] || type;
};
