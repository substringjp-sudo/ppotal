/**
 * The palette the base map is painted with.
 *
 * Only the ground is themed — sea, land, borders and the ink used for station
 * markers. Line colours belong to the operators and stay as published in every
 * theme, so a line is always recognisably itself.
 */

export type MapThemeId = 'day' | 'night' | 'paper' | 'neon';

export interface MapTheme {
    id: MapThemeId;
    /** Shown in the style panel. */
    label: { ko: string; en: string; ja: string };
    sea: string;
    land: string;
    landEdge: string;
    /** Municipal boundaries, drawn much fainter than prefecture ones. */
    municipalEdge: string;
    /** Fill of a station marker, and the halo behind station labels. */
    stationFill: string;
    /** Outline of a station marker when it is not highlighted. */
    stationInk: string;
    /** Station name text. */
    labelInk: string;
    /**
     * Colour of a lattice tile. The land colour is chosen to sit quietly under
     * the lines; a tile has to be a mark you can actually see against the sea,
     * so it gets its own value rather than reusing the fill.
     */
    tileInk: string;
    /** True when the map is dark enough that UI over it should invert. */
    dark: boolean;
}

export const MAP_THEMES: Record<MapThemeId, MapTheme> = {
    day: {
        id: 'day',
        label: { ko: '주간', en: 'Day', ja: '昼' },
        sea: '#e0f2fe',
        land: '#ffffff',
        landEdge: '#eeeeee',
        municipalEdge: '#e8eaed',
        stationFill: '#ffffff',
        stationInk: '#000000',
        labelInk: '#0f172a',
        tileInk: '#ffffff',
        dark: false
    },
    night: {
        id: 'night',
        label: { ko: '야간', en: 'Night', ja: '夜' },
        // Deep and slightly blue, so the operator colours read as lit signage.
        sea: '#04070f',
        land: '#1e2c48',
        landEdge: '#3b4f78',
        municipalEdge: '#2a3a5c',
        stationFill: '#0b1220',
        stationInk: '#93a4c4',
        labelInk: '#e8eefc',
        tileInk: '#43598c',
        dark: true
    },
    paper: {
        id: 'paper',
        label: { ko: '종이', en: 'Paper', ja: '紙' },
        sea: '#d9c9a8',
        land: '#fbf7ee',
        landEdge: '#c9b489',
        municipalEdge: '#e6dcc7',
        stationFill: '#fffdf7',
        stationInk: '#4b4132',
        labelInk: '#3a3227',
        tileInk: '#fbf7ee',
        dark: false
    },
    neon: {
        id: 'neon',
        label: { ko: '네온', en: 'Neon', ja: 'ネオン' },
        // Almost black, so the lines and the flow pulse are the only light.
        sea: '#02030a',
        land: '#141f43',
        landEdge: '#2f4a8f',
        municipalEdge: '#1b2a55',
        stationFill: '#05070f',
        stationInk: '#5b7bc4',
        labelInk: '#cfe3ff',
        tileInk: '#2c4488',
        dark: true
    }
};

export const MAP_THEME_IDS: MapThemeId[] = ['day', 'night', 'paper', 'neon'];

export const themeOf = (id: MapThemeId | undefined): MapTheme => MAP_THEMES[id ?? 'day'] ?? MAP_THEMES.day;

/**
 * How the land itself is drawn.
 *
 * `outline` follows whatever shape the lines are using, so switching the
 * network to a diagram takes the coastline with it. The lattice forms replace
 * the landmass with a field of tiles instead — the country as pixels.
 */
export type LandForm = 'outline' | 'dots' | 'squares' | 'hexes';

export const LAND_FORMS: LandForm[] = ['outline', 'dots', 'squares', 'hexes'];

export const isLattice = (form: LandForm | undefined): boolean =>
    form === 'dots' || form === 'squares' || form === 'hexes';
