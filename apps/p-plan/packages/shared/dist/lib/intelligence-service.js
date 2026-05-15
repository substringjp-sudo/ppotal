"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTimelineFromPhotos = generateTimelineFromPhotos;
exports.solveRegionIdsFromPlace = solveRegionIdsFromPlace;
exports.searchRegions = searchRegions;
async function generateTimelineFromPhotos(photos) {
    if (typeof window !== 'undefined' && window._generateTimelineFromPhotos) {
        return await window._generateTimelineFromPhotos(photos);
    }
    throw new Error('Intelligence service and Firebase must be initialized in browser');
}
async function solveRegionIdsFromPlace(place) {
    if (typeof window !== 'undefined' && window._solveRegionIdsFromPlace) {
        return await window._solveRegionIdsFromPlace(place);
    }
    // Fallback if not initialized (this can happen during early mount)
    return null;
}
async function searchRegions(query) {
    if (typeof window !== 'undefined' && window._searchRegions) {
        return await window._searchRegions(query);
    }
    return [];
}
