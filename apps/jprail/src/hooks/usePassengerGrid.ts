/**
 * usePassengerGrid
 *
 * passenger_grid.json을 로드하여 줌 레벨별 격자 데이터를 제공합니다.
 * 각 격자 셀에서 가장 이용객이 많은 역 ID를 빠르게 조회할 수 있습니다.
 */

import { useState, useEffect } from 'react';

interface PassengerGridData {
    passengers: Record<string, number>;        // stationId -> 일평균 이용객 수
    grids: Record<string, Record<string, string>>; // zoom_N -> gridKey -> stationId
}

let cachedData: PassengerGridData | null = null;
let fetchPromise: Promise<PassengerGridData> | null = null;

async function fetchPassengerGrid(): Promise<PassengerGridData> {
    if (cachedData) return cachedData;
    if (fetchPromise) return fetchPromise;

    fetchPromise = fetch('/data/passenger_grid.json')
        .then(res => {
            if (!res.ok) throw new Error(`Failed to load passenger_grid.json: ${res.status}`);
            return res.json() as Promise<PassengerGridData>;
        })
        .then(data => {
            cachedData = data;
            return data;
        });

    return fetchPromise;
}

export function usePassengerGrid() {
    const [data, setData] = useState<PassengerGridData | null>(cachedData);

    useEffect(() => {
        if (!cachedData) {
            fetchPassengerGrid()
                .then(setData)
                .catch(err => console.warn('[usePassengerGrid] load failed:', err));
        }
    }, []);

    return data;
}

// 줌 레벨에서 격자 크기(도 단위) 계산 - 스크립트와 동일한 로직
const SCREEN_WIDTH_PX = 1400;
const SCREEN_HEIGHT_PX = 800;
const GRID_DIVISIONS = 20;

function getCellSize(zoom: number): { cellLat: number; cellLon: number } {
    const pxPerDegLon = 256 * Math.pow(2, zoom) / 360;
    const screenDegLon = SCREEN_WIDTH_PX / pxPerDegLon;
    const screenDegLat = screenDegLon * (SCREEN_HEIGHT_PX / SCREEN_WIDTH_PX);
    return {
        cellLat: screenDegLat / GRID_DIVISIONS,
        cellLon: screenDegLon / GRID_DIVISIONS,
    };
}

function toGridKey(lat: number, lon: number, cellLat: number, cellLon: number): string {
    const row = Math.floor(lat / cellLat);
    const col = Math.floor(lon / cellLon);
    return `${row}_${col}`;
}

/**
 * 주어진 줌 레벨에서 격자 기준 대표 역 ID 집합을 반환합니다.
 *
 * @param zoom 현재 지도 줌 레벨
 * @param data passenger_grid 데이터
 * @returns Set<string> - 대표 역 ID 집합
 */
export function getGridRepresentativeStations(
    zoom: number,
    data: PassengerGridData | null
): Set<string> | null {
    if (!data) return null;

    const clampedZoom = Math.max(5, Math.min(14, Math.round(zoom)));
    const gridKey = `zoom_${clampedZoom}`;
    const grid = data.grids[gridKey];
    if (!grid) return null;

    return new Set(Object.values(grid));
}

/**
 * 역 ID가 현재 줌 레벨의 격자에서 대표 역인지 확인합니다.
 */
export function isRepresentativeStation(
    stationId: string,
    zoom: number,
    data: PassengerGridData | null
): boolean {
    const reps = getGridRepresentativeStations(zoom, data);
    if (!reps) return true; // 데이터 없으면 모두 표시
    return reps.has(stationId);
}

export { getCellSize, toGridKey };
export type { PassengerGridData };
