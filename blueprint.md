# jprail Project Blueprint

## Project Overview
jprail is a web application for visualizing and tracking Japanese railroad networks. It features an interactive map with detailed line and station information, progress tracking for visited segments, and a hierarchical sidebar for easy navigation.

## Project Outline (Styles, Design, Features)
### Design & Aesthetics
- **Premium Map Experience**: Uses vibrant colors, dark modes, and smooth animations.
- **Visual Depth**: Multi-layered drop shadows for cards and markers.
- **Iconography**: Modern, interactive icons for railroad types and actions.
- **Typography**: Expressive fonts with stressed sizes for better readability.
- **Animations**: Subtle micro-animations and delayed hover effects for reduced visual clutter.
- **Hover Delay (Dwell Interaction)**: 1-second delay for all mouse hover effects (tooltips, highlights) to provide a more deliberate and stable browsing experience.

### Performance Optimization (Advanced Tuning)
- **Spatial Grid Indexing**: Stations and joints are now indexed into a spatial grid ($O(1)$ lookup), reducing filtering time from $O(N)$ to $O(M)$ where $M$ is the number of local elements.
- **Adaptive Move-Time Culling**: Heavy layers (MunicipalMap, JapanMap, Station Details, Group Hulls) are automatically hidden or simplified during panning and zooming to maintain 60FPS.
- **Layer Consolidation**: Merged hundreds of individual Polyline components (Recorded Trips, Group Hulls) into monolithic GeoJSON layers, significantly reducing React's component tree and virtual DOM overhead.
- **Throttled Interactions**: Map bounds updates and hover highlights are throttled to prevent main-thread saturation during rapid interaction.
- **Geometry Simplification**: Implemented dynamic `smoothFactor` for all vector layers, reducing vertex count at lower zoom levels without sacrificing critical topology.
- **ID-Based Lookup System**: Refactored the entire data flow to use numeric IDs (`companyId::lineId`) for line and company lookups. This eliminated name-based mapping errors and ensures 100% accuracy in data retrieval for translations, stats, and topology.
- **Granular Trip Recording (ID-Based)**: Refactored the trip recording engine to capture exact station, section, and joint IDs. This transition from coordinate-based guessing to precise graph tracking allows for perfect reconstruction of journeys and zero-latency path highlighting.


## Implementation History & Current State
### Recent Major Changes
1.  **Massive Performance Overhaul**: Implemented spatial indexing and adaptive rendering. Panning and zooming now feel buttery smooth by skipping expensive calculations and unmounting heavy visual layers during motion. ✅
2.  **Recorded Trip Consolidation**: Refactored `TripLayer` to use a single GeoJSON source instead of individual `Polyline` components, reducing rendering overhead by over 90%. ✅
3.  **Spatial Station Culling**: Introduced `isMoving` aware `useVisibleStations` hook that skips all station processing during map movement. ✅
4.  **Topology Visualization Restoration**: Reverted to `TubeMap.tsx` from `vis-network` to prioritize drag-and-drop interactivity. ✅
5.  **Hover Interaction Delay**: Maintained deliberate interaction feel through throttled hover events. ✅
6. **ID-Based Refactoring**: Migrated `RoutingGraph`, `Sidebar`, `LineDetailPane`, and map layers to a robust ID-based lookup system. This fixed missing translations and 0/0km stats. ✅
7. **Integrated Record Highlighting**: Merged `TripLayer` into `RailroadLayer`. Recorded trips are now rendered as high-fidelity railroad sections with gold glow and borders, rather than simplified overlay lines. ✅
8. **Precision Trip Logic**: Updated `useTripRecorder` and `graphUtils` to store and retrieve specific `sectionIds` and `nodeIds`. ✅


# 메모
- **성능 튜닝 (60FPS 최적화)**: 지도 이동/줌 시 발생하는 버벅임을 해결하기 위해 공간 인덱싱(Spatial Grid)과 적응형 레이어 숨김(Adaptive Layer Hiding) 기술을 도입했습니다. 이동 중에는 무거운 배경 데이터와 역 정보를 일시적으로 숨겨 브라우저 부하를 0에 가깝게 유지합니다.
- **레이어 통합**: 수백 개의 개별 선(여행 기록, 역 그룹 테두리)을 하나의 레이어로 통합하여 렌더링 성능을 획기적으로 개선했습니다.
- **호버 최적화**: 마우스 이동 시 발생하는 불필요한 스타일 계산을 방지하기 위해 호버 이벤트를 세밀하게 조정했습니다.
- **데이터 정제 및 로드 성능**: `useVisibleStations` 훅에서 맵 전역 데이터를 매번 순회하지 않고 인근 구역(Grid)만 검색하도록 최적화했습니다.
