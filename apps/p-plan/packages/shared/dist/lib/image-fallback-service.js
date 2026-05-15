"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOOD_IMAGES = void 0;
exports.getTripTheme = getTripTheme;
const design_tokens_1 = require("./design-tokens");
/**
 * 전역 테마용 무드 이미지 URL 저장소 (Unsplash)
 */
exports.MOOD_IMAGES = {
    SEOUL: 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?q=80&w=1200&auto=format&fit=crop', // Gyeongbokgung
    KYOTO: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1200&auto=format&fit=crop',
    NYC: 'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?q=80&w=1200&auto=format&fit=crop',
    LONDON: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1200&auto=format&fit=crop',
    PARIS: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1200&auto=format&fit=crop',
    ROME: 'https://images.unsplash.com/photo-1529260839312-4fb76d49ca02?q=80&w=1200&auto=format&fit=crop',
    HALONG_BAY: 'https://images.unsplash.com/photo-1528127269322-539801943592?q=80&w=1200&auto=format&fit=crop',
    BANGKOK: 'https://images.unsplash.com/photo-1528181304800-2f1908ca5952?q=80&w=1200&auto=format&fit=crop',
    TAIPEI: 'https://images.unsplash.com/photo-1552250575-e508473b090f?q=80&w=1200&auto=format&fit=crop',
    ISLAND: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop',
    CITY: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=1200&auto=format&fit=crop',
    NATURE: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1200&auto=format&fit=crop',
};
const REGION_THEMES = {
    // Countries
    'korea south': {
        background: '#3B82F6', // Blue
        gradient: 'from-blue-600 via-indigo-600 to-slate-900',
        silhouetteColor: '#FFFFFF',
        moodImageUrl: exports.MOOD_IMAGES.SEOUL
    },
    'japan': {
        background: '#EF4444', // Red
        gradient: 'from-rose-600 via-red-600 to-slate-900',
        silhouetteColor: '#FFFFFF',
        moodImageUrl: exports.MOOD_IMAGES.KYOTO
    },
    'united states of america': {
        background: '#1D4ED8',
        gradient: 'from-blue-800 via-indigo-900 to-slate-900',
        silhouetteColor: '#FFFFFF',
        moodImageUrl: exports.MOOD_IMAGES.NYC
    },
    'united kingdom': {
        background: '#1E3A8A',
        gradient: 'from-blue-900 via-slate-800 to-slate-900',
        silhouetteColor: '#FFFFFF',
        moodImageUrl: exports.MOOD_IMAGES.LONDON
    },
    'france': {
        background: '#2563EB',
        gradient: 'from-blue-700 via-slate-100 to-red-600',
        silhouetteColor: '#00267F',
        moodImageUrl: exports.MOOD_IMAGES.PARIS
    },
    'italy': {
        background: '#16A34A',
        gradient: 'from-emerald-600 via-white to-rose-600',
        silhouetteColor: '#008C45',
        moodImageUrl: exports.MOOD_IMAGES.ROME
    },
    'vietnam': {
        background: '#F59E0B',
        gradient: 'from-yellow-400 via-orange-500 to-emerald-800',
        silhouetteColor: '#FFFFFF',
        moodImageUrl: exports.MOOD_IMAGES.HALONG_BAY
    },
    'thailand': {
        background: '#8B5CF6',
        gradient: 'from-purple-500 via-pink-500 to-orange-400',
        silhouetteColor: '#FFFFFF',
        moodImageUrl: exports.MOOD_IMAGES.BANGKOK
    },
    'taiwan': {
        background: '#10B981',
        gradient: 'from-emerald-500 via-teal-600 to-slate-900',
        silhouetteColor: '#FFFFFF',
        moodImageUrl: exports.MOOD_IMAGES.TAIPEI
    },
    // Default themes by keyword
    'island': {
        background: '#06B6D4',
        gradient: 'from-cyan-400 via-blue-500 to-indigo-700',
        silhouetteColor: '#FFFFFF',
        moodImageUrl: exports.MOOD_IMAGES.ISLAND
    },
    'city': {
        background: '#475569',
        gradient: 'from-slate-700 via-slate-800 to-slate-950',
        silhouetteColor: '#60A5FA',
        moodImageUrl: exports.MOOD_IMAGES.CITY
    },
    'nature': {
        background: '#15803D',
        gradient: 'from-green-600 via-emerald-700 to-slate-900',
        silhouetteColor: '#FFFFFF',
        moodImageUrl: exports.MOOD_IMAGES.NATURE
    }
};
const DEFAULT_THEME = {
    background: design_tokens_1.DESIGN_TOKENS.colors.primary.DEFAULT,
    gradient: 'from-primary/80 via-indigo-600 to-purple-700',
    silhouetteColor: '#FFFFFF'
};
function getTripTheme(regions) {
    if (!regions || regions.length === 0)
        return DEFAULT_THEME;
    const normalize = (s) => s.toLowerCase().trim();
    // 1. Try to match by country name
    for (const region of regions) {
        const name = normalize(region.name);
        if (REGION_THEMES[name])
            return REGION_THEMES[name];
        // Check aliases
        if (name === 'south korea' || name === 'korea')
            return REGION_THEMES['korea south'];
        if (name === 'usa' || name === 'united states')
            return REGION_THEMES['united states of america'];
        if (name === 'uk')
            return REGION_THEMES['united kingdom'];
    }
    // 2. Try to match by keywords
    for (const region of regions) {
        const name = normalize(region.name);
        if (name.includes('island') || name.includes('bali') || name.includes('hawaii') || name.includes('okinawa'))
            return REGION_THEMES['island'];
        if (name.includes('mountain') || name.includes('park') || name.includes('nature'))
            return REGION_THEMES['nature'];
        if (name.includes('new york') || name.includes('tokyo') || name.includes('seoul') || name.includes('beach')) {
            if (name.includes('beach'))
                return REGION_THEMES['island'];
            return REGION_THEMES['city'];
        }
    }
    return DEFAULT_THEME;
}
