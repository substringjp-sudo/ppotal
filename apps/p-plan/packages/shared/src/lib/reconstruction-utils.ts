import { DESIGN_TOKENS } from './design-tokens';

export interface RawDataPoint {
  id: string;
  lat: number;
  lng: number;
  timestamp: number;
  type: 'footprint' | 'photo';
  memo?: string;
}

export interface TimelinePoint extends RawDataPoint {
  speed: number; // km/h
  color: string;
  clusterId?: string;
}

export interface Cluster {
  id: string;
  centerLat: number;
  centerLng: number;
  startTime: number;
  endTime: number;
  points: TimelinePoint[];
  suggestedTitle: string;
  type: 'stay' | 'move';
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // 지구 반경 (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function processTimelineData(points: RawDataPoint[]): { points: TimelinePoint[], clusters: Cluster[] } {
  if (points.length === 0) return { points: [], clusters: [] };

  const sorted = [...points].sort((a, b) => a.timestamp - b.timestamp);
  const timeline: TimelinePoint[] = [];
  
  // 1. Calculate speeds and colors
  for (let i = 0; i < sorted.length; i++) {
    const curr = sorted[i];
    const prev = i > 0 ? sorted[i - 1] : null;
    
    let speed = 0;
    if (prev) {
      const dist = calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng);
      const timeHours = (curr.timestamp - prev.timestamp) / (1000 * 60 * 60);
      speed = timeHours > 0 ? dist / timeHours : 0;
    }

    let color = DESIGN_TOKENS.colors.slate[400]; // Default staying (Grey)
    if (speed > 30) {
      color = '#EF4444'; // Fast move (Red)
    } else if (speed > 6) {
      color = '#F97316'; // Slow move/Transition (Orange)
    } else if (speed > 1) {
      color = '#3B82F6'; // Walking/Active move (Blue)
    }

    timeline.push({ ...curr, speed, color });
  }

  // 2. Clustering
  const clusters: Cluster[] = [];
  let currentGroup: TimelinePoint[] = [timeline[0]];
  
  for (let i = 1; i < timeline.length; i++) {
    const curr = timeline[i];
    const prev = timeline[i - 1];
    
    // Clustering logic: If speed < 6 km/h and distance is small, keep in same cluster
    const dist = calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng);
    const timeGap = curr.timestamp - prev.timestamp;
    
    // If staying or moving slowly within same vicinity
    if (curr.speed < 6 && dist < 0.2) { // 200m
      currentGroup.push(curr);
    } else {
      clusters.push(finalizeCluster(currentGroup));
      currentGroup = [curr];
    }
  }
  clusters.push(finalizeCluster(currentGroup));

  // Filter out tiny clusters that are just "moving through"
  const refinedClusters = clusters.filter(c => {
    const duration = (c.endTime - c.startTime) / (1000 * 60);
    return duration > 2 || c.points.some(p => p.type === 'photo');
  });

  return { points: timeline, clusters: refinedClusters };
}

function finalizeCluster(points: TimelinePoint[]): Cluster {
  const avgLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  const avgLng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;
  const isStay = points.every(p => p.speed < 6);

  return {
    id: `cluster-${points[0].timestamp}`,
    centerLat: avgLat,
    centerLng: avgLng,
    startTime: points[0].timestamp,
    endTime: points[points.length - 1].timestamp,
    points,
    suggestedTitle: isStay ? '머무른 장소' : '이동 구간',
    type: isStay ? 'stay' : 'move'
  };
}
