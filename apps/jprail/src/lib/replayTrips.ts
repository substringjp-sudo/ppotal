/**
 * 기록해 둔 여정을 되짚기 애니메이션이 쓰는 모양으로 옮긴다.
 *
 * 계산(`tripAnimation`)과 그리기(`replayRenderer`)는 앱 자료형을 모른다. 그
 * 사이를 메우는 자리가 여기다 — 색을 어디서 가져올지, 탄 날을 무엇으로 볼지처럼
 * **이 앱에서만 답할 수 있는 것**만 여기에 둔다.
 */

import type { RailData, Section } from '../types/railData';
import type { Trip } from '../types/trip';
import type { ReplayTrip } from './tripAnimation';
import { getLineColor } from './lineColors';

/** 노선 색을 못 찾았을 때 쓸 색. */
const FALLBACK_COLOR = '#2563EB';

const lowDetailSections = (railData: RailData | null): Section[] =>
    railData?.sections?.lod?.low ?? railData?.sections?.sections ?? [];

/**
 * 애니메이션 바탕에 깔 철도망.
 *
 * 전국이 한 화면에 들어가므로 가장 성긴 것으로 충분하다. 높은 것을 쓰면 선이
 * 뭉개지기만 하고 그리는 시간만 는다.
 */
export function buildReplayRailLines(railData: RailData | null): [number, number][][] {
    return lowDetailSections(railData)
        .map(section => section.geometry)
        .filter(geometry => geometry && geometry.length >= 2);
}

/**
 * 여정을 획으로 옮긴다.
 *
 * 색은 그 여정이 처음 밟는 구간의 노선 색을 따른다. 지도에서 보던 색이 그대로
 * 나와야 "내 기록"으로 읽힌다.
 */
export function buildReplayTrips(trips: Trip[], railData: RailData | null): ReplayTrip[] {
    const lineKeyBySection = new Map<number, string>();
    for (const section of lowDetailSections(railData)) {
        lineKeyBySection.set(section.id, `${section.company_id}::${section.line_id}`);
    }

    return trips.map(trip => {
        const firstSection = trip.sectionIds?.find(id => lineKeyBySection.has(id));
        const lineKey = firstSection === undefined ? null : lineKeyBySection.get(firstSection)!;
        return {
            id: trip.id,
            name: trip.name || `${trip.start} → ${trip.end}`,
            // 기록한 날(createdAt)을 탄 날로 쓰지 않는다. 타임라인에서 온 여정만
            // 진짜 탄 날을 안다. 손으로 그린 경로는 비워 두고, 되짚기가 맨 뒤에
            // 섞어서 붙인다 — 앱(jpApp)과 같은 규칙이다.
            date: trip.date ?? '',
            color: (lineKey ? getLineColor(lineKey, railData) : null) ?? FALLBACK_COLOR,
            order: Date.parse(trip.createdAt ?? '') || 0,
            geometries: trip.geometries ?? []
        };
    });
}
