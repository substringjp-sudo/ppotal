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
  region: "asia-northeast1", 
  memory: "2GiB",
  timeoutSeconds: 300 // 초기 그래프 빌드 시간을 위해 넉넉하게 설정
}, async (request) => {
  const { startId, endId, allowedLines } = request.data;
  
  if (!startId || !endId) {
    throw new HttpsError("invalid-argument", "startId and endId are required.");
  }

  const graph = await getOrBuildGraph();
  const result = graph.getShortestPath(startId, endId, allowedLines);

  console.log(`Path search result: ${result ? 'Found' : 'Not found'}, nodes: ${result?.path.length || 0}`);

  if (!result || !result.path || result.path.length === 0) {
    return { path: [], distance: 0, geometries: [], sectionIds: [] };
  }

  // 지오메트리 정보 보강 (sections 컬렉션 조회)
  const uniqueSectionIds = Array.from(new Set(result.sectionIds.map(id => String(id))));
  const geometriesMap: Record<string, string> = {};
  
  if (uniqueSectionIds.length > 0) {
    // Firestore 쿼리 (in 연산자는 최대 30개씩 가능)
    for (let i = 0; i < uniqueSectionIds.length; i += 30) {
      const chunk = uniqueSectionIds.slice(i, i + 30);
      try {
        const numericChunk = chunk.map(id => Number(id)).filter(n => !isNaN(n));
        
        // 문자열 ID 쿼리
        const snap1 = await db.collection("sections").where("id", "in", chunk).get();
        snap1.docs.forEach(doc => { 
          const d = doc.data();
          geometriesMap[String(d.id)] = d.geom; 
        });
        
        // 숫자 ID 쿼리
        if (numericChunk.length > 0) {
          const snap2 = await db.collection("sections").where("id", "in", numericChunk).get();
          snap2.docs.forEach(doc => { 
            const d = doc.data();
            geometriesMap[String(d.id)] = d.geom; 
          });
        }
      } catch (err) {
        console.error("Geometry fetch error:", err);
      }
    }
  }

  const geometries = result.sectionIds.map(id => geometriesMap[String(id)]).filter(Boolean);

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
  const stationsSnap = await db.collection("stations").get();
  stationsSnap.docs.forEach(doc => {
    const d = doc.data();
    const id = doc.id;
    const name = d.n || d.name || "Unknown";
    
    graph.nodes.set(id, {
      id,
      name: name,
      name_en: d.en || d.name_en || "",
      coords: [d.lo || 0, d.la || 0],
      company: "", line: "", companyId: 0, lineId: 0, fullLineId: "" 
    });

    if (!graph.stationToNodes.has(name)) {
      graph.stationToNodes.set(name, []);
    }
    graph.stationToNodes.get(name)!.push(id);
  });

  // 2. 그래프 데이터 직접 주입
  const graphSnap = await db.collection("station_graph").get();
  graphSnap.docs.forEach(doc => {
    const sourceId = doc.id;
    const neighbors = doc.data().neighbors;
    if (!neighbors) return;

    if (!graph.adj.has(sourceId)) graph.adj.set(sourceId, []);
    
    for (const targetId in neighbors) {
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
export const getStationInfo = onCall({ region: "asia-northeast1" }, async (request) => {
  const { stationId } = request.data;
  if (!stationId) throw new HttpsError("invalid-argument", "stationId is required.");

  const doc = await db.collection("stations").doc(stationId).get();
  if (!doc.exists) throw new HttpsError("not-found", "Station not found.");

  const platformsSnap = await db.collection("platforms").where("station_id", "==", stationId).get();
  const platforms = platformsSnap.docs.map(d => d.data());

  return {
    ...doc.data(),
    platforms
  };
});

/**
 * 노선 상세 정보 API
 */
export const getLineInfo = onCall({ region: "asia-northeast1" }, async (request) => {
  const { lineId } = request.data;
  if (!lineId) throw new HttpsError("invalid-argument", "lineId is required.");

  const doc = await db.collection("lines").doc(lineId).get();
  if (!doc.exists) throw new HttpsError("not-found", "Line not found.");

  // 해당 노선에 속한 모든 섹션(역 간 연결) 조회
  // 실제 서비스 로직에 따라 노선에 속한 역 리스트를 반환하거나 섹션들을 반환
  const sectionsSnap = await db.collection("sections").where("line_id", "==", Number(lineId.split("::")[1])).get();
  const sections = sectionsSnap.docs.map(d => d.data());

  return {
    ...doc.data(),
    sections
  };
});
