'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Map, { Source, Layer, MapRef, NavigationControl, FullscreenControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { JourneyAtlasData, nodesToGeoJSON, edgesToGeoJSON } from '@pplaner/shared';
import { motion, AnimatePresence } from 'framer-motion';

interface AtlasMapViewProps {
  data: JourneyAtlasData | null;
  hoveredTripId: string | null;
}

const MAP_STYLE_DARK = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const MAP_STYLE_LIGHT = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

export default function AtlasMapView({ data, hoveredTripId }: AtlasMapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 테마 감지
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') || 
                     window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(isDark);
    };

    checkTheme();
    
    // 클래스 변경 감지 (MutationObserver)
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  const mapStyle = isDarkMode ? MAP_STYLE_DARK : MAP_STYLE_LIGHT;

  // GeoJSON 데이터 변환
  const nodeSource = useMemo(() => {
    if (!data) return nodesToGeoJSON([]);
    return nodesToGeoJSON(data.nodes);
  }, [data]);

  const edgeSource = useMemo(() => {
    if (!data) return edgesToGeoJSON([]);
    return edgesToGeoJSON(data.edges);
  }, [data]);

  // 첫 데이터 로드 시 중심점 맞추기
  useEffect(() => {
    if (isLoaded && mapRef.current && data && data.nodes.length > 0) {
      const coords = data.nodes.map(n => [n.lng, n.lat]);
      const bounds = coords.reduce(
        (acc, curr) => [
          [Math.min(acc[0][0], curr[0]), Math.min(acc[0][1], curr[1])],
          [Math.max(acc[1][0], curr[0]), Math.max(acc[1][1], curr[1])],
        ],
        [[coords[0][0], coords[0][1]], [coords[0][0], coords[0][1]]]
      );

      mapRef.current.fitBounds(
        [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]],
        { padding: 100, duration: 2000 }
      );
    }
  }, [isLoaded, data]);

  // 스타일 도우미: 호버 상태에 따라 동적 스타일 생성
  const getLineOpacity = (defaultOpacity: number, activeOpacity: number, inactiveOpacity: number) => {
    if (!hoveredTripId) return defaultOpacity;
    return [
      'case',
      ['==', ['get', 'tripId'], hoveredTripId], activeOpacity,
      inactiveOpacity
    ] as any;
  };

  const getLineWidth = (defaultWidth: number, activeWidth: number) => {
    if (!hoveredTripId) return defaultWidth;
    return [
      'case',
      ['==', ['get', 'tripId'], hoveredTripId], activeWidth,
      defaultWidth
    ] as any;
  };

  const getCircleRadius = (defaultRadius: number, activeRadius: number) => {
    if (!hoveredTripId) return defaultRadius;
    return [
      'case',
      ['==', ['get', 'tripId'], hoveredTripId], activeRadius,
      defaultRadius
    ] as any;
  };

  const getCircleOpacity = (defaultOpacity: number, activeOpacity: number, inactiveOpacity: number) => {
    if (!hoveredTripId) return defaultOpacity;
    return [
      'case',
      ['==', ['get', 'tripId'], hoveredTripId], activeOpacity,
      inactiveOpacity
    ] as any;
  };

  return (
    <div className="w-full h-full relative">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 127.0276,
          latitude: 37.4979,
          zoom: 2,
        }}
        mapStyle={mapStyle}
        onLoad={() => setIsLoaded(true)}
        attributionControl={false}
      >
        <NavigationControl position="bottom-right" />
        <FullscreenControl position="bottom-right" />

        {/* 1. 경로(Edge) 레이어 */}
        <Source id="edges-source" type="geojson" data={edgeSource}>
          {/* 기본 경로 선 */}
          <Layer
            id="edges-layer"
            type="line"
            paint={{
              'line-color': ['get', 'tripColor'],
              'line-width': getLineWidth(2, 3),
              'line-opacity': getLineOpacity(0.6, 1.0, 0.1),
            }}
            layout={{
              'line-cap': 'round',
              'line-join': 'round',
            }}
          />
          {/* 항공편 글로우 효과 (두꺼운 반투명 선) */}
          <Layer
            id="edges-glow"
            type="line"
            filter={['==', ['get', 'type'], 'flight']}
            paint={{
              'line-color': ['get', 'tripColor'],
              'line-width': 8,
              'line-blur': 4,
              'line-opacity': getLineOpacity(0.2, 0.4, 0.05),
            }}
          />
          {/* 단순기록 경로 (Simple Route) - 점선 스타일 */}
          <Layer
            id="edges-simple-route"
            type="line"
            filter={['==', ['get', 'type'], 'simple-route']}
            paint={{
              'line-color': ['get', 'tripColor'],
              'line-width': getLineWidth(2.5, 4),
              'line-dasharray': [2, 1],
              'line-opacity': getLineOpacity(0.8, 1.0, 0.2),
            }}
            layout={{
              'line-cap': 'round',
              'line-join': 'round',
            }}
          />
        </Source>

        {/* 2. 지점(Node) 레이어 */}
        <Source 
          id="nodes-source" 
          type="geojson" 
          data={nodeSource}
          cluster={true}
          clusterMaxZoom={14}
          clusterRadius={50}
        >
          {/* 클러스터 버블 */}
          <Layer
            id="clusters"
            type="circle"
            filter={['has', 'point_count']}
            paint={{
              'circle-color': '#22d3ee', // cyan-400
              'circle-opacity': 0.2,
              'circle-radius': [
                'step',
                ['get', 'point_count'],
                20, 10, 30, 30, 40
              ],
              'circle-stroke-width': 1,
              'circle-stroke-color': '#22d3ee',
              'circle-stroke-opacity': 0.5,
            }}
          />

          {/* 클러스터 카운트 텍스트 */}
          <Layer
            id="cluster-count"
            type="symbol"
            filter={['has', 'point_count']}
            layout={{
              'text-field': '{point_count}',
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
              'text-size': 12,
            }}
            paint={{
              'text-color': '#ffffff'
            }}
          />

          {/* 개별 지점 글로우 */}
          <Layer
            id="unclustered-point-glow"
            type="circle"
            filter={['!', ['has', 'point_count']]}
            paint={{
              'circle-color': ['get', 'tripColor'],
              'circle-radius': getCircleRadius(8, 12),
              'circle-blur': 0.8,
              'circle-opacity': getCircleOpacity(0.4, 0.6, 0.1),
            }}
          />

          {/* 개별 지점 코어 */}
          <Layer
            id="unclustered-point"
            type="circle"
            filter={['!', ['has', 'point_count']]}
            paint={{
              'circle-color': ['get', 'tripColor'],
              'circle-radius': getCircleRadius(4, 5),
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
              'circle-stroke-opacity': getCircleOpacity(0.8, 1.0, 0.2),
              'circle-opacity': getCircleOpacity(0.9, 1.0, 0.2),
            }}
          />
        </Source>
      </Map>

      {/* 오버레이 효과 */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />
    </div>
  );
}
