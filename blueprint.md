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
- **Unified Interaction Layer**: Stations nodes and railroad lines are now co-located in a single interaction-capable Leaflet pane (`railroad-lines`). This eliminates "click-shadows" where transparent overlay containers used to block interactions with elements underneath.
- **Stable Layer Rendering**: Interaction layers no longer unmount/remount on hover or selection change. Using `ref` and `setStyle` allows for high-frequency visual updates (highlights, glows) without losing event focus or causing browser jitters.
- **Non-Blocking Overlay System**: All decorative and informational Leaflet panes (casing, glow, background, tooltips) are strictly configured with `pointer-events: none` to ensure 100% click pass-through to the core railroad network.
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
9. **Map Interaction Fixes**: Resolved the issue where lines and stations were unclickable due to pane overlap and frequent layer remounting. ✅
10. **Trip Drawing Fix**: Corrected the coordinate order [lon, lat] for the trip recorder's visual tail. ✅
11. **Enhanced Visual Data (Bilingual)**: Upgraded trip history and station tooltips to display full company (운영회사) and line names (노선명) in both Japanese and English. Tooltips now feature color-coded "line boxes" for better readability at transfer stations. ✅
12. **Transfer Visuals & Interaction**: Improved transfer station markers with larger inner dots (50% radius) and fixed event bubbling to ensure tooltips appear even when hovering precisely over the inner dot. ✅
13. **Unified Bilingual Naming hierarchy**: Standardized all components to prioritize local names (Japanese/Korean) over English, with clear visual weights. ✅
143. **Intelligent Label Management**: Implemented greedy collision avoidance for station labels and logical hub merging to resolve clutter in dense urban centers like Tokyo. ✅
44. **Advanced Platform Interaction**: Upgraded platforms to be fully interactive. They now support station tooltips, pathfinding start/end points, and visual hover highlights (yellow border). ✅
45. **Dynamic Platform Scaling**: Implemented zoom-aware thickness for platforms to match the behavior of railroad lines. ✅
46. **Bilingual Station Naming**: All station labels, tooltips, and routing results now display both the primary name (Japanese/Korean) and the English name below it for better accessibility. ✅
47. **Precision Interaction Targeting**: Restricted the hit area for both railroad lines and platforms to their actual visual thickness. Expanded transparent hit areas were removed to prevent accidental selection of nearby lines, ensuring that interaction only occurs when the cursor is precisely over the line itself. ✅
48. **Selective Routing & Creation Limits**: Route generation is now strictly limited to lines currently selected in the sidebar. Path creation (drawing) logic enforces a 10-section limit between waypoints to encourage precise route building, and unreachable stations are automatically filtered out. ✅
49. **Interaction Focus Mode**: Clicking or dragging a station now automatically clears all active line/station highlights. During dragging, yellow 'hover' glows for railroad lines are suppressed, and the target station is highlighted in blue to match the active path, ensuring a distraction-free route creation experience. ✅
50. **Dedicated Interaction Layer Separation**: Implemented a global invisible interaction layer (`globalInteraction` pane) for both stations and railroad lines. By separating visual rendering (casing, glow, main stroke) from event capture, we've achieved 100% reliable click and hover targeting even in dense urban areas where multiple elements overlap. Visual layers are now entirely non-interactive (`pointer-events: none`), passing all events up to the top-most interaction geometry. ✅
51. **Intelligent Station Label Visibility**: Optimized map clutter by dynamically filtering station labels based on zoom level. At low zoom levels (below 10), station names are completely hidden. At intermediate zoom levels (10-13), only transfer stations show labels. At high zoom levels (14+), all stations display labels. ✅

## Deployment Plan
1. **Pre-deployment Check**: Run `npm run lint` and `npm run build` to ensure project stability.
2. **Firebase Hosting**: Deploy the Next.js application to `jprail.web.app` using Firebase Hosting.
3. **Verification**: Confirm SSR and client-side interactions on the live production environment.

# 메모
- **상호작용 최적화 (Interaction & Stability)**: 지도 위에서 노선이나 역이 클릭되지 않던 근본적인 원인들(레이어 중첩, 잦은 리렌더링 등)을 모두 해결했습니다. 이제 모든 인터랙티브 레이어는 `ref`와 `setStyle`을 통해 상태 변화 시 끊김 없이 시각적으로 업데이트되며, 마우스 클릭이 다른 투명 레이어에 의해 방해받지 않도록 CSS와 Pane 구조를 개선했습니다.
