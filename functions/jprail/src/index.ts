import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { RoutingGraph } from "./lib/RoutingGraph";

initializeApp();

const db = getFirestore();

// 그래프 싱글톤 인스턴스 (캐싱용)
let cachedGraph: RoutingGraph | null = null;

/**
 * Firestore에서 그래프 데이터를 로드하여 RoutingGraph 인스턴스를 구축합니다.
 */
// 최단 경로 탐색 API (메모리를 2GiB로 증설하여 OOM 방지 및 초기 로드 안정성 확보)
export const findPath = onCall({ 
  region: "asia-northeast3", 
  memory: "2GiB",
  timeoutSeconds: 300 // 초기 그래프 빌드 시간을 위해 넉넉하게 설정
}, async (request) => {
  const { startId, endId, allowedLines } = request.data;
  
  if (!startId || !endId) {
    throw new HttpsError("invalid-argument", "startId and endId are required.");
  }

  console.log(`🔍 Path search requested: ${startId} -> ${endId}`);

  const graph = await getOrBuildGraph();
  
  if (!graph.nodes.has(startId)) {
    console.warn(`❌ Start node ${startId} not found in graph!`);
  }
  if (!graph.nodes.has(endId)) {
    console.warn(`❌ End node ${endId} not found in graph!`);
  }

  const result = graph.getShortestPath(startId, endId, allowedLines);

  if (!result || !result.path || result.path.length <= 1) {
    console.log(`⚠️ No path found between ${startId} and ${endId}`);
    return { 
      path: [], 
      distance: 0, 
      geometries: [], 
      sectionIds: [],
      error: "No path found" 
    };
  }

  console.log(`✅ Path found: ${result.path.length} nodes, ${result.distance.toFixed(2)} km`);

  // 지오메트리 정보 보강 (sections 컬렉션 조회)
  // sectionIds가 문자열일 수도 있고 숫자일 수도 있으므로 둘 다 대응
  const uniqueSectionIds = Array.from(new Set(result.sectionIds.map(id => String(id))));
  const geometriesMap: Record<string, string> = {};
  
  if (uniqueSectionIds.length > 0) {
    console.log(`📡 Fetching geometries for ${uniqueSectionIds.length} sections...`);
    // Firestore 쿼리 (in 연산자는 최대 30개씩 가능)
    for (let i = 0; i < uniqueSectionIds.length; i += 30) {
      const chunk = uniqueSectionIds.slice(i, i + 30);
      try {
        // 1. 문서 ID로 직접 조회 (가장 빠름)
        const refs = chunk.map(id => db.collection("jprail_sections").doc(id));
        const docs = await db.getAll(...refs);
        docs.forEach(doc => {
          if (doc.exists) {
            const d = doc.data();
            if (d && d.geom) geometriesMap[String(d.id)] = d.geom;
          }
        });

        // 2. 누락된 게 있다면 'id' 필드로 검색 (혹시 모를 대비)
        const remaining = chunk.filter(id => !geometriesMap[id]);
        if (remaining.length > 0) {
          const snap = await db.collection("jprail_sections").where("id", "in", remaining).get();
          snap.docs.forEach(doc => { 
            const d = doc.data();
            geometriesMap[String(d.id)] = d.geom; 
          });

          // 3. 숫자 타입으로도 검색 (데이터 타입 불일치 대비)
          const numericRemaining = remaining.map(id => Number(id)).filter(n => !isNaN(n));
          if (numericRemaining.length > 0) {
             const snapNumeric = await db.collection("jprail_sections").where("id", "in", numericRemaining).get();
             snapNumeric.docs.forEach(doc => {
               const d = doc.data();
               geometriesMap[String(d.id)] = d.geom;
             });
          }
        }
      } catch (err) {
        console.error("Geometry fetch error:", err);
      }
    }
  }

  const geometries = result.sectionIds.map(id => geometriesMap[String(id)]).filter(Boolean);
  console.log(`🎨 Returned ${geometries.length} geometries`);

  return {
    path: result.path,
    distance: result.distance,
    sectionIds: result.sectionIds,
    geometries: geometries
  };
});

// ... 생략 ...

async function getOrBuildGraph(): Promise<RoutingGraph> {
  if (cachedGraph && cachedGraph.nodes.size > 0) {
    return cachedGraph;
  }

  console.log("🏗️ Building graph from Firestore (Optimized)...");
  const graph = new RoutingGraph();
  
  graph.nodes.clear();
  graph.adj.clear();
  graph.stationToNodes.clear();

  // 1. 역 데이터 직접 주입 (메모리 절약을 위해 중간 객체 생성 안 함)
  const stationsSnap = await db.collection("jprail_stations").get();
  const graphSnap = await db.collection("jprail_station_graph").get();
  console.log(`🏗️ Building graph: ${stationsSnap.size} stations, ${graphSnap.size} graph entries`);

  stationsSnap.docs.forEach(doc => {
    const d = doc.data();
    const id = String(doc.id);
    const name = d.n || d.name || "Unknown";
    
    graph.nodes.set(id, {
      id,
      name: name,
      name_en: d.en || d.name_en || "",
      coords: [d.lon || d.lo || 0, d.lat || d.la || 0],
      company: "", line: "", companyId: 0, lineId: 0, fullLineId: "" 
    });

    if (!graph.stationToNodes.has(name)) {
      graph.stationToNodes.set(name, []);
    }
    graph.stationToNodes.get(name)!.push(id);
  });

  // 2. 그래프 데이터 직접 주입
  graphSnap.docs.forEach(doc => {
    const sourceId = doc.id;
    const neighbors = doc.data().neighbors;
    if (!neighbors) return;

    // 만약 역 데이터에는 없지만 그래프에는 있는 노드(예: Joint)라면 더미 노드로 추가
    if (!graph.nodes.has(sourceId)) {
      graph.nodes.set(sourceId, {
        id: sourceId,
        name: sourceId.startsWith("J_") ? "Joint" : sourceId,
        coords: [0, 0],
        company: "", line: "", companyId: 0, lineId: 0, fullLineId: ""
      });
    }

    if (!graph.adj.has(sourceId)) graph.adj.set(sourceId, []);
    
    for (const targetId in neighbors) {
      // 타겟 노드도 노드 목록에 보장
      if (!graph.nodes.has(targetId)) {
        graph.nodes.set(targetId, {
          id: targetId,
          name: targetId.startsWith("J_") ? "Joint" : targetId,
          coords: [0, 0],
          company: "", line: "", companyId: 0, lineId: 0, fullLineId: ""
        });
      }

      const info = neighbors[targetId];
      if (!info.connections) continue;

      info.connections.forEach((conn: any) => {
        graph.adj.get(sourceId)?.push({
          from: sourceId,
          to: targetId,
          distance: conn.distance / 1000,
          lineId: conn.type === "TRANSFER" ? "TRANSFER" : `${conn.company_id}::${conn.line_id}`,
          type: (conn.type as any) || "RAIL",
          sectionIds: conn.section_ids ? conn.section_ids.map(Number) : []
        });
      });
    }
  });

  // 3. 동적 환승 생성
  for (const ids of (graph as any).stationToNodes.values()) {
    if (ids.length < 2) continue;
    for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
            const u = graph.nodes.get(ids[i])!;
            const v = graph.nodes.get(ids[j])!;
            const dist = 0.001; 
            
            const edge: any = { from: u.id, to: v.id, distance: dist, lineId: 'TRANSFER', type: 'TRANSFER' };
            if (!graph.adj.has(u.id)) graph.adj.set(u.id, []);
            graph.adj.get(u.id)?.push(edge);
            
            const revEdge = { ...edge, from: v.id, to: u.id };
            if (!graph.adj.has(v.id)) graph.adj.set(v.id, []);
            graph.adj.get(v.id)?.push(revEdge);
        }
    }
  }

  cachedGraph = graph;
  console.log(`✅ Graph built with ${graph.nodes.size} nodes.`);
  return graph;
}

/**
 * 역 상세 정보 API
 */
export const getStationInfo = onCall({ region: "asia-northeast3" }, async (request) => {
  const { stationId } = request.data;
  if (!stationId) throw new HttpsError("invalid-argument", "stationId is required.");

  const doc = await db.collection("jprail_stations").doc(stationId).get();
  if (!doc.exists) throw new HttpsError("not-found", "Station not found.");

  const platformsSnap = await db.collection("jprail_platforms").where("station_id", "==", stationId).get();
  const platforms = platformsSnap.docs.map(d => d.data());

  // Fetch station graph data for directional neighbors
  const graphDoc = await db.collection("jprail_station_graph").doc(stationId).get();
  const neighbors = graphDoc.exists ? graphDoc.data()?.neighbors : null;

  return {
    ...doc.data(),
    platforms,
    neighbors
  };
});

/**
 * 노선 상세 정보 API
 */
export const getLineInfo = onCall({ region: "asia-northeast3" }, async (request) => {
  const { lineId } = request.data;
  if (!lineId) throw new HttpsError("invalid-argument", "lineId is required.");

  const doc = await db.collection("jprail_lines").doc(lineId).get();
  if (!doc.exists) throw new HttpsError("not-found", "Line not found.");

  // 해당 노선에 속한 모든 섹션(역 간 연결) 조회
  // 실제 서비스 로직에 따라 노선에 속한 역 리스트를 반환하거나 섹션들을 반환
  const sectionsSnap = await db.collection("jprail_sections").where("line_id", "==", Number(lineId.split("::")[1])).get();
  const sections = sectionsSnap.docs.map(d => d.data());

  return {
    ...doc.data(),
    sections
  };
});
