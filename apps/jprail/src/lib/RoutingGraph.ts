import { StationNode, haversineDistance, LineSegment } from './graphUtils';
import { RailData, Section, Station, Joint } from '../types/railData';

export interface RouteEdge {
    from: string;
    to: string;
    distance: number;
    lineId: string;
    type: 'RAIL' | 'TRANSFER';
    geometry?: [number, number][];
    sectionIds?: number[];
    parallelSectionIds?: number[];
}

export class RoutingGraph {
    nodes: Map<string, StationNode> = new Map();
    adj: Map<string, RouteEdge[]> = new Map();
    stationToNodes: Map<string, string[]> = new Map();
    lineIdMap: Map<string, string> = new Map();
    lineLengths: Record<string, number> = {};
    network?: RailData['railroadNetwork'];

    // Name to ID mappings for granular data
    companyNameToId: Map<string, string> = new Map();
    lineNameToId: Map<string, string> = new Map();
    sectionsMap: Map<number, Section> = new Map();

    constructor(data?: RailData) {
        if (data) {
            this.loadGranularData(data);
        }
    }

    private loadGranularData(data: RailData) {
        this.nodes.clear();
        this.adj.clear();
        this.stationToNodes.clear();
        this.lineLengths = {};
        this.lineIdMap.clear();
        this.companyNameToId.clear();
        this.lineNameToId.clear();
        this.sectionsMap.clear();
        this.network = data.railroadNetwork;

        if (!data.stations || !data.lines || !data.companies || !data.sections) return;

        const companyInfoMap = new Map<number, { name: string, name_en: string, name_kr?: string }>();
        Object.values(data.companies).forEach(c => {
            companyInfoMap.set(c.id, { name: c.name, name_en: c.name_en, name_kr: c.name_kr });
            this.companyNameToId.set(c.name, String(c.id));
        });

        const lineInfoMap = new Map<number, { name: string, name_en: string, name_kr?: string, companyId: number }>();
        Object.values(data.lines).forEach(l => {
            lineInfoMap.set(l.id, { name: l.name, name_en: l.name_en, name_kr: l.name_kr, companyId: l.corp_id });
            this.lineNameToId.set(l.name, String(l.id));
        });

        // 1. Process Stations
        Object.values(data.stations).forEach((station: Station) => {
            let companyName = "Unknown";
            let companyNameEn = "Unknown";
            let companyNameKr = undefined;
            let lineName = "Unknown";
            let lineNameEn = "Unknown";
            let lineNameKr = undefined;
            let fullLineName = "Unknown::Unknown";

            let pid = "";
            if (station.platform_ids && station.platform_ids.length > 0) {
                pid = station.platform_ids[0];
                const platform = data.platforms[pid];
                if (platform) {
                    const lInfo = lineInfoMap.get(platform.line);
                    const cInfo = companyInfoMap.get(platform.company);
                    companyName = cInfo?.name || "Unknown";
                    companyNameEn = cInfo?.name_en || "Unknown";
                    companyNameKr = cInfo?.name_kr;
                    lineName = lInfo ? lInfo.name : "Unknown";
                    lineNameEn = lInfo ? lInfo.name_en : "Unknown";
                    lineNameKr = lInfo?.name_kr;
                    fullLineName = `${platform.company}::${platform.line}`;
                }
            }

            const node: StationNode = {
                id: station.id,
                name: station.name,
                name_en: station.name_en,
                name_kr: station.name_kr,
                company: companyName,
                company_en: companyNameEn,
                company_kr: companyNameKr,
                line: lineName,
                line_en: lineNameEn,
                line_kr: lineNameKr,
                companyId: pid ? (data.platforms[pid]?.company || 0) : 0,
                lineId: pid ? (data.platforms[pid]?.line || 0) : 0,
                fullLineId: fullLineName,
                coords: [station.lon, station.lat]
            };

            this.nodes.set(station.id, node);
            this.adj.set(station.id, []);

            if (!this.stationToNodes.has(station.name)) {
                this.stationToNodes.set(station.name, []);
            }
            this.stationToNodes.get(station.name)!.push(station.id);

            // Map platform IDs to the same node
            if (station.platform_ids) {
                station.platform_ids.forEach((pid: string) => {
                    if (pid !== station.id) {
                        this.nodes.set(pid, node);
                    }
                });
            }
        });

        // 1.1 Load Joints if available
        if (data.joints && Array.isArray(data.joints.joints)) {
            data.joints.joints.forEach((joint: Joint) => {
                const node: StationNode = {
                    id: joint.id,
                    name: "Joint",
                    name_en: "Joint",
                    company: "Network",
                    line: "Multiple",
                    companyId: 0,
                    lineId: 0,
                    fullLineId: "0::0",
                    coords: joint.coordinates
                };
                this.nodes.set(joint.id, node);
            });
        }

        // 2. Load Sections into sectionsMap only (skip adj building)
        data.sections.sections.forEach((s: Section) => this.sectionsMap.set(s.id, s));

        // 2.1 Calculate line lengths (still needed for UI stats)
        const linePhysicalConnections = new Map<string, Set<string>>();
        data.sections.sections.forEach(section => {
            const lineId = `${section.company_id}::${section.line_id}`;
            const dist = section.length / 1000;
            const pairKey = [section.start, section.end].sort().join('<->');
            if (!this.lineLengths[lineId]) this.lineLengths[lineId] = 0;
            if (!linePhysicalConnections.get(lineId)) linePhysicalConnections.set(lineId, new Set());
            if (!linePhysicalConnections.get(lineId)!.has(pairKey)) {
                this.lineLengths[lineId] += dist;
                linePhysicalConnections.get(lineId)!.add(pairKey);
            }
        });

        // Skip 2.2 Pre-computed station_graph (Server handles this now)
        // Skip 3. Transfers (Server handles this now)
    }

    getNode = (id: string): StationNode | undefined => this.nodes.get(id);
    getNodes = (): Map<string, StationNode> => this.nodes;
    
    // getEdge는 이제 로컬 adj가 없으므로 더 높은 수준의 조회가 필요하거나 제한됨
    getEdge = (fromId: string, toId: string): RouteEdge | undefined => {
        // 간이 구현: sectionsMap에서 직접 검색 (드묾)
        const section = Array.from(this.sectionsMap.values()).find(s => 
            (s.start === fromId && s.end === toId) || (s.start === toId && s.end === fromId)
        );
        if (section) {
            return {
                from: fromId, to: toId, distance: section.length / 1000,
                lineId: `${section.company_id}::${section.line_id}`,
                type: 'RAIL', geometry: section.geometry, sectionIds: [section.id]
            };
        }
        return undefined;
    };

    getLineIdMap = (): Map<string, string> => this.lineIdMap;
    getLineLengths = (): Record<string, number> => this.lineLengths;

    getLineSegments = (lineId: string, hierarchy: RailData['hierarchy']): LineSegment[] => {
        const segments: LineSegment[] = [];
        if (!this.nodes.size) return [];
        const [companyId, lineNumericId] = lineId.split('::');

        // 1. line_data를 통한 고속 렌더링 (대부분의 노선)
        if (this.network?.line_data?.[lineNumericId]) {
            const ld = this.network.line_data[lineNumericId];
            ld.sections.forEach((secIdStr: string) => {
                const secId = parseInt(secIdStr);
                const section = this.sectionsMap.get(secId);
                if (section) {
                    segments.push({
                        stations: [section.start, section.end],
                        edges: [{ from: section.start, to: section.end, distance: section.length / 1000, sectionId: secIdStr }],
                        geometry: section.geometry
                    });
                }
            });
            if (segments.length > 0) return segments;
        }
        return []; // 복잡한 폴백은 이제 서버 사이드에서 처리 권장
    }

    /**
     * 이제 서버 사이드에서 경로를 탐색합니다. (비동기)
     */
    getShortestPath = async (startId: string, endId: string, allowedLines?: string[]) => {
        const { findRouteRemote } = await import('./rail-api');
        const result = await findRouteRemote(startId, endId, allowedLines);
        if (!result || !result.path) return null;

        return {
            path: result.path,
            sectionIds: result.sectionIds,
            distance: result.distance,
            geometries: result.decodedGeometries || []
        };
    }
}
