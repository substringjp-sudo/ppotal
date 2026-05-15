/**
 * Journey Atlas Engine
 * 
 * Trip 데이터를 세계지도 위 시각화용 GeoJSON 데이터로 변환합니다.
 * - AtlasNode: 체류/방문 지점 (점)
 * - AtlasEdge: 이동 경로 (선/Arc)
 */

import { Trip, TripDocument, TripSummary, FlightSegment, AccommodationSegment, DailyPlan, TripEvent } from '../types/trip';
import { Travelog, TravelogEvent, TravelogDailyPlan } from '../types/record';

// ─── 타입 정의 ──────────────────────────────────────────────────

export interface AtlasNode {
  id: string;
  tripId: string;
  tripTitle: string;
  tripColor: string;
  lat: number;
  lng: number;
  timestamp: string;       // ISO date (YYYY-MM-DD)
  type: 'flight-departure' | 'flight-arrival' | 'accommodation' | 'event' | 'transport-departure' | 'transport-arrival';
  label: string;
  dayIndex: number;
  durationMinutes?: number;
  category?: string;
  subCategory?: string;
  memo?: string;
}

export interface AtlasEdge {
  id: string;
  tripId: string;
  tripColor: string;
  from: { lat: number; lng: number; label?: string };
  to: { lat: number; lng: number; label?: string };
  type: 'flight' | 'drive' | 'transit' | 'walk' | 'intra-city' | 'simple-route';
  distanceKm: number;
  durationMinutes?: number;
  timestamp?: string;
}

export interface TripMeta {
  id: string;
  title: string;
  color: string;
  startDate: string;
  endDate: string;
  nodeCount: number;
  edgeCount: number;
  isOverseas: boolean;
}

export interface JourneyAtlasData {
  nodes: AtlasNode[];
  edges: AtlasEdge[];
  tripMeta: TripMeta[];
}

// ─── Neon 색상 팔레트 (HSL 기반 균등 분배) ─────────────────────

const NEON_PALETTE = [
  'hsl(180, 90%, 60%)',   // Cyan
  'hsl(260, 85%, 65%)',   // Purple
  'hsl(330, 90%, 60%)',   // Pink
  'hsl(45, 95%, 55%)',    // Gold
  'hsl(140, 80%, 55%)',   // Green
  'hsl(200, 90%, 60%)',   // Sky Blue
  'hsl(300, 80%, 60%)',   // Magenta
  'hsl(20, 90%, 60%)',    // Orange
  'hsl(100, 75%, 55%)',   // Lime
  'hsl(220, 85%, 65%)',   // Royal Blue
];

/**
 * 여행 인덱스에 따라 고유 Neon 색상을 할당합니다.
 */
function getTripColor(index: number): string {
  return NEON_PALETTE[index % NEON_PALETTE.length];
}

// ─── 거리 계산 유틸 ──────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── 좌표 유효성 검사 ───────────────────────────────────────────

function isValidCoord(lat?: number, lng?: number): boolean {
  return typeof lat === 'number' && typeof lng === 'number' &&
    !isNaN(lat) && !isNaN(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

// ─── 메인 변환 함수 ─────────────────────────────────────────────

/**
 * Trip 배열을 JourneyAtlasData로 변환합니다.
 * TripSummary는 좌표 데이터가 부족하므로 TripDocument/Trip을 권장합니다.
 */
export function buildJourneyAtlas(
  trips: (Trip | TripDocument)[],
): JourneyAtlasData {
  return buildFromTrips(trips);
}

/**
 * Travelog 배열을 JourneyAtlasData로 변환합니다.
 */
export function buildJourneyAtlasFromTravelogs(
  travelogs: Travelog[],
): JourneyAtlasData {
  const nodes: AtlasNode[] = [];
  const edges: AtlasEdge[] = [];
  const tripMeta: TripMeta[] = [];

  // 시간순 정렬
  const sorted = [...travelogs].sort((a, b) => {
    const da = a.startDate || '';
    const db = b.startDate || '';
    return da.localeCompare(db);
  });

  sorted.forEach((log, logIndex) => {
    const color = getTripColor(logIndex);
    const tripId = log.id;
    const tripTitle = log.title || `기록 ${logIndex + 1}`;
    let nodeCount = 0;
    let edgeCount = 0;

    const allEvents: { node: AtlasNode, date: string }[] = [];

    // Travelog는 timeline 위주로 구성됨
    log.timeline.forEach((day, dayIdx) => {
      day.events?.forEach((event) => {
        const loc = event.location;
        if (!loc || !isValidCoord(loc.lat, loc.lng)) return;

        const type = mapTravelogEventType(event);
        const node: AtlasNode = {
          id: `${tripId}-ev-${event.id}`,
          tripId, tripTitle, tripColor: color,
          lat: loc.lat!, lng: loc.lng!,
          timestamp: day.date || log.startDate || '',
          type,
          label: event.title || loc.name || '장소',
          dayIndex: dayIdx,
          category: event.mainCategory,
          subCategory: event.subCategory,
          memo: event.memo,
        };
        nodes.push(node);
        nodeCount++;
        allEvents.push({ node, date: day.date });
      });
    });

    // 엣지 생성 (동선 연결)
    // 시간 순서대로 정렬된 모든 이벤트를 순회하며 임계값(300km) 이내인 경우만 연결
    const DISTANCE_THRESHOLD_KM = 500;

    for (let i = 1; i < allEvents.length; i++) {
      const prev = allEvents[i - 1].node;
      const curr = allEvents[i].node;
      const dist = haversineKm(prev.lat, prev.lng, curr.lat, curr.lng);
      
      // 인접한 두 지점 사이의 거리가 임계값 이내일 때만 연결
      if (dist < DISTANCE_THRESHOLD_KM) {
        edges.push({
          id: `${tripId}-route-${prev.id}-${curr.id}`,
          tripId, tripColor: color,
          from: { lat: prev.lat, lng: prev.lng, label: prev.label },
          to: { lat: curr.lat, lng: curr.lng, label: curr.label },
          type: dist < 50 ? 'intra-city' : 'simple-route',
          distanceKm: Math.round(dist * 10) / 10,
          timestamp: allEvents[i].date,
        });
        edgeCount++;
      }
    }

    tripMeta.push({
      id: tripId,
      title: tripTitle,
      color,
      startDate: log.startDate || '',
      endDate: log.endDate || '',
      nodeCount,
      edgeCount,
      isOverseas: false, // Travelog 정보에서 판단 로직 필요할 수 있음
    });
  });

  return { nodes, edges, tripMeta };
}

/**
 * TravelogEvent 타입을 AtlasNode 타입으로 매핑
 */
function mapTravelogEventType(event: TravelogEvent): AtlasNode['type'] {
  if (event.mainCategory === '숙박') return 'accommodation';
  if (event.mainCategory === '이동') {
    if (event.subCategory === '비행기') return 'flight-arrival'; // 단순화
    return 'transport-arrival';
  }
  return 'event';
}

/**
 * 기존 Trip 기반 변환 로직 (내부용)
 */
function buildFromTrips(trips: (Trip | TripDocument)[]): JourneyAtlasData {
  const nodes: AtlasNode[] = [];
  const edges: AtlasEdge[] = [];
  const tripMeta: TripMeta[] = [];

  // 시간순 정렬 (오래된 여행 → 최신 여행)
  const sorted = [...trips].sort((a, b) => {
    const da = a.dates?.startDate || '';
    const db = b.dates?.startDate || '';
    return da.localeCompare(db);
  });

  sorted.forEach((trip, tripIndex) => {
    const color = getTripColor(tripIndex);
    const tripId = trip.id;
    const tripTitle = trip.title || `여행 ${tripIndex + 1}`;
    let nodeCount = 0;
    let edgeCount = 0;

    // ── 항공편 노드 & 엣지 ──
    if (trip.flights) {
      trip.flights.forEach((f) => {
        const depValid = isValidCoord(f.departureLat, f.departureLng);
        const arrValid = isValidCoord(f.arrivalLat, f.arrivalLng);

        if (depValid) {
          nodes.push({
            id: `${tripId}-fl-dep-${f.id}`,
            tripId, tripTitle, tripColor: color,
            lat: f.departureLat!, lng: f.departureLng!,
            timestamp: f.date || trip.dates?.startDate || '',
            type: 'flight-departure',
            label: f.departureLocation || '출발지',
            dayIndex: 0,
            category: 'flight',
          });
          nodeCount++;
        }

        if (arrValid) {
          nodes.push({
            id: `${tripId}-fl-arr-${f.id}`,
            tripId, tripTitle, tripColor: color,
            lat: f.arrivalLat!, lng: f.arrivalLng!,
            timestamp: f.date || trip.dates?.startDate || '',
            type: 'flight-arrival',
            label: f.arrivalLocation || '도착지',
            dayIndex: 0,
            category: 'flight',
          });
          nodeCount++;
        }

        if (depValid && arrValid) {
          const dist = haversineKm(f.departureLat!, f.departureLng!, f.arrivalLat!, f.arrivalLng!);
          edges.push({
            id: `${tripId}-fl-edge-${f.id}`,
            tripId, tripColor: color,
            from: { lat: f.departureLat!, lng: f.departureLng!, label: f.departureLocation },
            to: { lat: f.arrivalLat!, lng: f.arrivalLng!, label: f.arrivalLocation },
            type: 'flight',
            distanceKm: Math.round(dist),
            durationMinutes: f.flightDurationMinutes,
            timestamp: f.date || trip.dates?.startDate,
          });
          edgeCount++;
        }
      });
    }

    // ── 숙소 노드 ──
    if (trip.accommodation) {
      trip.accommodation.forEach((acc) => {
        if (!isValidCoord(acc.lat, acc.lng)) return;
        nodes.push({
          id: `${tripId}-acc-${acc.id}`,
          tripId, tripTitle, tripColor: color,
          lat: acc.lat!, lng: acc.lng!,
          timestamp: acc.startDate || trip.dates?.startDate || '',
          type: 'accommodation',
          label: acc.name || '숙소',
          dayIndex: 0,
          category: 'accommodation',
          subCategory: acc.type,
        });
        nodeCount++;
      });
    }

    // ── 일정 이벤트 노드 ──
    if (trip.dailyTimeline) {
      const allEvents: { node: AtlasNode, date: string }[] = [];

      trip.dailyTimeline.forEach((day, dayIdx) => {
        day.events?.forEach((event) => {
          const loc = event.location;
          if (!loc || !isValidCoord(loc.lat, loc.lng)) return;

          const node: AtlasNode = {
            id: `${tripId}-ev-${event.id}`,
            tripId, tripTitle, tripColor: color,
            lat: loc.lat!, lng: loc.lng!,
            timestamp: day.date || trip.dates?.startDate || '',
            type: 'event',
            label: event.title || loc.name || '장소',
            dayIndex: dayIdx,
            durationMinutes: event.durationMinutes,
            category: event.mainCategory,
            subCategory: event.subCategory,
            memo: event.memo,
          };
          nodes.push(node);
          nodeCount++;
          allEvents.push({ node, date: day.date });
        });
      });

      // 엣지 생성 (동선 연결)
      // 시간 순서대로 정렬된 모든 이벤트를 순회하며 임계값(300km) 이내인 경우만 연결
      const DISTANCE_THRESHOLD_KM = 300;

      for (let i = 1; i < allEvents.length; i++) {
        const prev = allEvents[i - 1].node;
        const curr = allEvents[i].node;
        const dist = haversineKm(prev.lat, prev.lng, curr.lat, curr.lng);
        
        // 인접한 두 지점 사이의 거리가 임계값 이내일 때만 연결
        if (dist < DISTANCE_THRESHOLD_KM) {
          edges.push({
            id: `${tripId}-route-${prev.id}-${curr.id}`,
            tripId, tripColor: color,
            from: { lat: prev.lat, lng: prev.lng, label: prev.label },
            to: { lat: curr.lat, lng: curr.lng, label: curr.label },
            type: dist < 50 ? 'intra-city' : 'simple-route',
            distanceKm: Math.round(dist * 10) / 10,
            timestamp: allEvents[i].date,
          });
          edgeCount++;
        }
      }
    }

    // ── 대중교통 엣지 ──
    if (trip.publicTransport) {
      trip.publicTransport.forEach((pt) => {
        const depValid = isValidCoord(pt.departureLat, pt.departureLng);
        const arrValid = isValidCoord(pt.arrivalLat, pt.arrivalLng);

        if (depValid) {
          nodes.push({
            id: `${tripId}-pt-dep-${pt.id}`,
            tripId, tripTitle, tripColor: color,
            lat: pt.departureLat!, lng: pt.departureLng!,
            timestamp: pt.date || trip.dates?.startDate || '',
            type: 'transport-departure',
            label: pt.departureLocation || pt.name || '출발',
            dayIndex: 0, category: 'transport',
          });
          nodeCount++;
        }

        if (arrValid) {
          nodes.push({
            id: `${tripId}-pt-arr-${pt.id}`,
            tripId, tripTitle, tripColor: color,
            lat: pt.arrivalLat!, lng: pt.arrivalLng!,
            timestamp: pt.date || trip.dates?.startDate || '',
            type: 'transport-arrival',
            label: pt.arrivalLocation || pt.name || '도착',
            dayIndex: 0, category: 'transport',
          });
          nodeCount++;
        }

        if (depValid && arrValid) {
          const dist = haversineKm(pt.departureLat!, pt.departureLng!, pt.arrivalLat!, pt.arrivalLng!);
          edges.push({
            id: `${tripId}-pt-edge-${pt.id}`,
            tripId, tripColor: color,
            from: { lat: pt.departureLat!, lng: pt.departureLng!, label: pt.departureLocation },
            to: { lat: pt.arrivalLat!, lng: pt.arrivalLng!, label: pt.arrivalLocation },
            type: 'transit',
            distanceKm: Math.round(dist),
            durationMinutes: pt.duration,
            timestamp: pt.date,
          });
          edgeCount++;
        }
      });
    }

    // ── 운전 엣지 ──
    if (trip.driving) {
      trip.driving.forEach((d) => {
        const pickValid = isValidCoord(d.pickupLat, d.pickupLng);
        const retValid = isValidCoord(d.returnLat, d.returnLng);

        if (pickValid && retValid) {
          const dist = haversineKm(d.pickupLat!, d.pickupLng!, d.returnLat!, d.returnLng!);
          edges.push({
            id: `${tripId}-dr-edge-${d.id}`,
            tripId, tripColor: color,
            from: { lat: d.pickupLat!, lng: d.pickupLng!, label: d.pickupLocation },
            to: { lat: d.returnLat!, lng: d.returnLng!, label: d.returnLocation },
            type: 'drive',
            distanceKm: Math.round(dist),
            timestamp: d.date,
          });
          edgeCount++;
        }
      });
    }

    tripMeta.push({
      id: tripId,
      title: tripTitle,
      color,
      startDate: trip.dates?.startDate || '',
      endDate: trip.dates?.endDate || '',
      nodeCount,
      edgeCount,
      isOverseas: trip.isOverseas ?? false,
    });
  });

  return { nodes, edges, tripMeta };
}

/**
 * AtlasNode 배열을 GeoJSON FeatureCollection으로 변환합니다.
 * MapLibre의 Source로 직접 사용 가능합니다.
 */
export function nodesToGeoJSON(nodes: AtlasNode[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: nodes.map(node => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [node.lng, node.lat],
      },
      properties: {
        id: node.id,
        tripId: node.tripId,
        tripTitle: node.tripTitle,
        tripColor: node.tripColor,
        type: node.type,
        label: node.label,
        timestamp: node.timestamp,
        dayIndex: node.dayIndex,
        category: node.category || '',
        subCategory: node.subCategory || '',
      },
    })),
  };
}

/**
 * AtlasEdge 배열을 GeoJSON FeatureCollection으로 변환합니다.
 * flight 타입은 Great Circle Arc로 변환됩니다.
 */
export function edgesToGeoJSON(edges: AtlasEdge[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: edges.map(edge => {
      // 항공편은 곡선(Arc)으로 표현 — 중간 제어점을 추가하여 베지어 근사
      let coordinates: [number, number][];

      if (edge.type === 'flight') {
        coordinates = generateGreatCircleArc(
          [edge.from.lng, edge.from.lat],
          [edge.to.lng, edge.to.lat],
          50 // 50개의 중간점으로 부드러운 곡선 생성
        );
      } else {
        coordinates = [
          [edge.from.lng, edge.from.lat],
          [edge.to.lng, edge.to.lat],
        ];
      }

      return {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates,
        },
        properties: {
          id: edge.id,
          tripId: edge.tripId,
          tripColor: edge.tripColor,
          type: edge.type,
          distanceKm: edge.distanceKm,
          durationMinutes: edge.durationMinutes || 0,
          fromLabel: edge.from.label || '',
          toLabel: edge.to.label || '',
          timestamp: edge.timestamp || '',
        },
      };
    }),
  };
}

/**
 * 두 점 사이의 Great Circle Arc를 생성합니다 (항공 경로 시각화용).
 * 직접 구현하여 @turf/turf 의존성을 최소화합니다.
 */
function generateGreatCircleArc(
  from: [number, number],
  to: [number, number],
  numPoints: number = 50
): [number, number][] {
  const toRad = (d: number) => d * Math.PI / 180;
  const toDeg = (r: number) => r * 180 / Math.PI;

  const lat1 = toRad(from[1]);
  const lng1 = toRad(from[0]);
  const lat2 = toRad(to[1]);
  const lng2 = toRad(to[0]);

  const d = 2 * Math.asin(
    Math.sqrt(
      Math.sin((lat2 - lat1) / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2
    )
  );

  if (d === 0) return [from, to];

  const points: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);

    const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
    const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);

    const lat = toDeg(Math.atan2(z, Math.sqrt(x ** 2 + y ** 2)));
    const lng = toDeg(Math.atan2(y, x));
    points.push([lng, lat]);
  }

  return points;
}
