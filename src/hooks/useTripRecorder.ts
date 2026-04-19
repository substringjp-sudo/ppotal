import { useState, useRef, useEffect, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { ProcessedStation } from '../types/mapTypes';
import { Trip } from '../types/trip';
import { findRouteRemote } from '../lib/rail-api';

interface UseTripRecorderProps {
    graph?: any; // 레거시 호환용 (사용 안함)
    visibleStations: Record<string, ProcessedStation> | null;
    onRecordTrip?: (trip: Trip) => void;
    onDragUpdate?: (waypoints: string[]) => void;
    onDraftComplete?: (trip: Trip) => void;
    selectedLines?: string[];
    activeLine?: string | null;
}

export const useTripRecorder = ({
    visibleStations,
    onRecordTrip,
    onDragUpdate,
    onDraftComplete,
    selectedLines = [],
    activeLine = null
}: UseTripRecorderProps) => {
    const map = useMap();
    const [dragStartStation, setDragStartStation] = useState<string | null>(null);
    const [dragStartCoords, setDragStartCoords] = useState<[number, number] | null>(null);
    const [dragPath, setDragPath] = useState<[number, number][][]>([]);
    
    // 비동기 상태 관리
    const [isCalculating, setIsCalculating] = useState(false);
    const lastRequestRef = useRef<number>(0);

    const dragStartStationRef = useRef(dragStartStation);
    const visibleStationsRef = useRef(visibleStations);

    const scrollVelocityRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
    const lastContainerPointRef = useRef<L.Point | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const lastLayerPointRef = useRef<L.Point | null>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);

    const dragState = useRef<{
        waypoints: string[];
        segments: { path: string[], geometries: [number, number][][], distance: number, sectionIds: number[] }[];
    }>({ waypoints: [], segments: [] });

    useEffect(() => { dragStartStationRef.current = dragStartStation; }, [dragStartStation]);
    useEffect(() => { visibleStationsRef.current = visibleStations; }, [visibleStations]);
    useEffect(() => { if (map) mapInstanceRef.current = map; }, [map]);

    useEffect(() => {
        if (!map || !map.dragging) return;
        if (dragStartStation) map.dragging.disable();
        else map.dragging.enable();
    }, [map, dragStartStation]);

    const handleStationMouseDown = useCallback((id: string, coords: [number, number]) => {
        const stations = visibleStationsRef.current;
        if (stations && stations[id]) {
            const data = stations[id];
            const selectionSet = new Set(selectedLines);
            const isFilterActive = selectionSet.has("__NONE__") || selectionSet.size > 0;
            const isStationVisible = data.lines?.some((l: string) =>
                selectionSet.has(l) || activeLine === l || !isFilterActive
            );
            if (!isStationVisible && !data.isJoint) return;
        }

        // 즉시 동기적으로 Ref 업데이트
        dragStartStationRef.current = id;
        
        setDragStartStation(id);
        setDragStartCoords(coords);
        setDragPath([]);
        dragState.current = { waypoints: [id], segments: [] };

        if (onDragUpdate) onDragUpdate([id]);
        if (map) {
            map.dragging.disable();
            lastLayerPointRef.current = map.latLngToLayerPoint(L.latLng(coords[0], coords[1]));
        }
    }, [map, onDragUpdate, selectedLines, activeLine]);

    const updateDragPath = useCallback(async (mapInstance: L.Map, currentLayerPoint: L.Point, currentLatLng: L.LatLng) => {
        const currentDragStation = dragStartStationRef.current;
        const prevLayerPoint = lastLayerPointRef.current;
        const stations = visibleStationsRef.current;

        if (currentDragStation && prevLayerPoint && stations) {
            // 항상 지시선(Stretchy line) 업데이트를 위해 마지막 지점 저장
            let allGeoms = dragState.current.segments.flatMap((s: any) => s.geometries);
            const waypoints = dragState.current.waypoints;
            const lastWaypoint = waypoints[waypoints.length - 1];
            
            if (stations[lastWaypoint]) {
                const startCoords = stations[lastWaypoint].centroid;
                // 현재 마우스 위치까지 잇는 실시간 지시선 추가
                allGeoms = [...allGeoms, [[startCoords[1], startCoords[0]], [currentLatLng.lng, currentLatLng.lat]]];
            }

            // 레이스가 발생했는지 마지막으로 한 번 더 체크
            if (dragStartStationRef.current) {
                setDragPath(allGeoms);
            }

            // 이미 계산 중이면 역 인식 로직은 건너뜀 (성능 및 안정성)
            if (isCalculating) return;

            const candidates: { id: string, dist: number, projDist: number }[] = [];
            const padding = 30;
            const minX = Math.min(prevLayerPoint.x, currentLayerPoint.x) - padding;
            const maxX = Math.max(prevLayerPoint.x, currentLayerPoint.x) + padding;
            const minY = Math.min(prevLayerPoint.y, currentLayerPoint.y) - padding;
            const maxY = Math.max(prevLayerPoint.y, currentLayerPoint.y) + padding;

            Object.entries(stations).forEach(([id, data]) => {
                const stPoint = mapInstance.latLngToLayerPoint(L.latLng(data.centroid[0], data.centroid[1]));
                if (stPoint.x >= minX && stPoint.x <= maxX && stPoint.y >= minY && stPoint.y <= maxY) {
                    const selectionSet = new Set(selectedLines);
                    const isFilterActive = selectionSet.has("__NONE__") || selectionSet.size > 0;
                    const isStationVisible = data.lines?.some((l: string) =>
                        selectionSet.has(l) || activeLine === l || !isFilterActive
                    );
                    if (isStationVisible || data.isJoint) {
                        const d = L.LineUtil.pointToSegmentDistance(stPoint, prevLayerPoint, currentLayerPoint);
                        if (d < 20) candidates.push({ id, dist: d, projDist: prevLayerPoint.distanceTo(stPoint) });
                    }
                }
            });

            candidates.sort((a, b) => a.projDist - b.projDist);
            const ds = dragState.current;
            let changed = false;

            for (const c of candidates) {
                const lastWP = ds.waypoints[ds.waypoints.length - 1];
                if (c.id === lastWP) continue;

                const existingIndex = ds.waypoints.indexOf(c.id);
                if (existingIndex !== -1 && existingIndex < ds.waypoints.length - 1) {
                    const popCount = ds.waypoints.length - 1 - existingIndex;
                    for (let k = 0; k < popCount; k++) {
                        ds.waypoints.pop();
                        ds.segments.pop();
                    }
                    changed = true;
                } else {
                    const requestId = ++lastRequestRef.current;
                    setIsCalculating(true);
                    try {
                        const pathData = await findRouteRemote(lastWP, c.id, selectedLines);
                        if (requestId !== lastRequestRef.current || !dragStartStationRef.current) {
                            setIsCalculating(false);
                            return;
                        }

                        if (pathData && pathData.path && pathData.path.length > 0) {
                            ds.waypoints.push(c.id);
                            ds.segments.push({
                                path: pathData.path,
                                geometries: pathData.decodedGeometries || [],
                                distance: pathData.distance,
                                sectionIds: pathData.sectionIds
                            });
                            changed = true;
                        }
                    } catch (err) {
                        console.error("Remote pathfinding failed:", err);
                    } finally {
                        setIsCalculating(false);
                    }
                }
                
                // 역이 하나라도 추가/삭제되면 루프 중단하고 다음 프레임에서 처리하도록 함 (안정성)
                if (changed) break;
            }

            if (changed && onDragUpdate) onDragUpdate([...ds.waypoints]);
            
            lastLayerPointRef.current = currentLayerPoint;
        }
    }, [selectedLines, activeLine, onDragUpdate, isCalculating]);

    useEffect(() => {
        if (!dragStartStation) return;
        const loop = () => {
            const velocity = scrollVelocityRef.current;
            if ((velocity.x !== 0 || velocity.y !== 0) && map && lastContainerPointRef.current) {
                map.panBy([velocity.x, velocity.y], { animate: false });
                const latlng = map.containerPointToLatLng(lastContainerPointRef.current);
                updateDragPath(map, map.latLngToLayerPoint(latlng), latlng);
            }
            animationFrameRef.current = requestAnimationFrame(loop);
        };
        animationFrameRef.current = requestAnimationFrame(loop);
        return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
    }, [map, dragStartStation, updateDragPath]);

    const handleEnd = useCallback(() => {
        // 즉시 모든 진행 중인 비동기 요청 무효화
        lastRequestRef.current += 1;
        dragStartStationRef.current = null;
        
        // 계산 중일 때 갑자기 끝나는 경우를 대비해 락 체크
        if (isCalculating) {
            setIsCalculating(false);
        }

        const { waypoints, segments } = dragState.current;
        
        // 실제 저장되는 구간 수와 경유지 수가 일치하는지 확인 (검증 로직)
        if (segments.length > 0 && segments.length === waypoints.length - 1) {
            const fullPath: string[] = [];
            const fullGeoms: [number, number][][] = [];
            const fullSectionIds: number[] = [];
            let totalDist = 0;

            segments.forEach((seg, idx) => {
                if (idx === 0) fullPath.push(...seg.path);
                else fullPath.push(...seg.path.slice(1));
                
                // 지오메트리가 비어있는 경우에 대한 방어 로직 (최소한의 직선이라도 보장)
                if (seg.geometries.length === 0 && seg.path.length >= 2) {
                    const s1 = visibleStationsRef.current?.[seg.path[0]];
                    const s2 = visibleStationsRef.current?.[seg.path[seg.path.length-1]];
                    if (s1 && s2) {
                        fullGeoms.push([[s1.centroid[1], s1.centroid[0]], [s2.centroid[1], s2.centroid[0]]]);
                    }
                } else {
                    fullGeoms.push(...seg.geometries);
                }

                fullSectionIds.push(...(seg.sectionIds || []));
                totalDist += seg.distance;
            });

            const trip: Trip = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                start: waypoints[0],
                end: waypoints[waypoints.length - 1],
                startId: waypoints[0],
                endId: waypoints[waypoints.length - 1],
                path: fullPath,
                distance: totalDist,
                geometries: fullGeoms,
                waypoints: [...waypoints],
                sectionIds: Array.from(new Set(fullSectionIds))
            };
            
            onRecordTrip?.(trip);
            // 성공적으로 기록되었으므로, 파란색 지시선(draft)은 비워줍니다.
            onDraftComplete?.(null as any); 
        }

        // 모든 상태를 완벽하게 클리어
        setDragStartStation(null);
        setDragStartCoords(null);
        setDragPath([]);
        dragState.current = { waypoints: [], segments: [] };
        lastLayerPointRef.current = null;
        if (mapInstanceRef.current) mapInstanceRef.current.dragging.enable();
    }, [onRecordTrip, onDraftComplete, isCalculating, visibleStations]);

    const updateDragPathRef = useRef(updateDragPath);
    const handleEndRef = useRef(handleEnd);
    useEffect(() => { updateDragPathRef.current = updateDragPath; }, [updateDragPath]);
    useEffect(() => { handleEndRef.current = handleEnd; }, [handleEnd]);

    useEffect(() => {
        if (!map) return;
        const handleMove = (containerPoint: L.Point, layerPoint: L.Point, latlng: L.LatLng) => {
            lastContainerPointRef.current = containerPoint;
            if (dragStartStationRef.current) {
                const { x, y } = containerPoint;
                const { x: w, y: h } = map.getSize();
                let vx = 0, vy = 0;
                if (x < 70) vx = -10; else if (x > w - 70) vx = 10;
                if (y < 70) vy = -10; else if (y > h - 70) vy = 10;
                scrollVelocityRef.current = { x: vx, y: vy };
                updateDragPathRef.current(map, layerPoint, latlng);
            } else {
                scrollVelocityRef.current = { x: 0, y: 0 };
                lastLayerPointRef.current = layerPoint;
            }
        };

        const onMouseMove = (e: L.LeafletMouseEvent) => handleMove(e.containerPoint, e.layerPoint, e.latlng);
        const onMouseUp = () => handleEndRef.current();
        const onTouchMove = (e: TouchEvent) => {
            if (dragStartStationRef.current) {
                e.preventDefault();
                const touch = e.touches[0];
                const rect = map.getContainer().getBoundingClientRect();
                const cp = L.point(touch.clientX - rect.left, touch.clientY - rect.top);
                const ll = map.containerPointToLatLng(cp);
                handleMove(cp, map.latLngToLayerPoint(ll), ll);
            }
        };

        map.on('mousemove', onMouseMove);
        map.on('mouseup', onMouseUp);
        const container = map.getContainer();
        container.addEventListener('touchmove', onTouchMove, { passive: false });
        container.addEventListener('touchend', onMouseUp);

        return () => {
            map.off('mousemove', onMouseMove);
            map.off('mouseup', onMouseUp);
            container.removeEventListener('touchmove', onTouchMove);
            container.removeEventListener('touchend', onMouseUp);
        };
    }, [map]);

    return {
        dragStartStation,
        dragStartCoords,
        dragPath,
        handleStationMouseDown,
        handleStationMouseUp: handleEnd,
        isCalculating
    };
};
