
import { Language } from './translations';

/**
 * Normalizes a line or company key by removing suffixes and trimming whitespace.
 * This helps in creating consistent keys for lookups.
 * @param name The string to normalize.
 * @returns The normalized string.
 */
export const normalizeKey = (name: string): string => {
    // Handles cases like "東海道線" -> "東海道", "Tokaido Line" -> "Tokaido"
    return name.replace(/(線| Line| 선)$/, "").trim();
};

/**
 * A simple utility to translate a name if the language is English.
 * This is a placeholder and should be replaced with a more robust i18n solution.
 * @param name The Japanese name.
 * @param lang The target language.
 * @param enName The English name from data source.
 * @returns The translated or original name.
 */
export const translateName = (name: string, lang: Language, enName?: string): string => {
    if (lang === 'en' && enName) {
        return enName;
    }
    if (lang === 'ko') {
        // Basic KO name conversion can be added here if needed
        return name;
    }
    return name;
};
