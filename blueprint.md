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

### Key Features
- **Interactive Map**: Built with React-Leaflet, showing railroad networks and stations.
- **Systematic Network Data**: Loads data from `systematic_railroad_network.json` for accurate routing and rendering.
- **Station Hierarchy**: Hierarchical navigation for companies, lines, and stations.
- **Trip Recording**: Users can record trips between stations, calculating distances and marking segments as visited.
- **Progress Tracking**: Visualizes visited line segments with distinct colors and glows.
- **TubeMap Visualization (Restored)**: Simplified, interactive topology maps for line details, optimized for path creation and node selection.
- **Detail Panes**: Dedicated views for line-specific details, including segments and pathfinding.

## Implementation History & Current State
### Recent Major Changes
1.  **Topology Visualization Restoration**: Reverted to `TubeMap.tsx` from `vis-network` to prioritize drag-and-drop interactivity and easier path creation for users. ✅
2.  **Hover Interaction Delay**: Implemented a global 1-second dwell delay for mouse hover events across the map (railroads, stations) and sidebar items. This prevents accidental tooltips and flickering during rapid mouse movement. ✅
3.  **Data Synchronization**: Fully synchronized the hierarchy with the raw section data, ensuring all segments and joint connections are represented. ✅
4.  **Premium UI Polish**: Maintained high-fidelity styles with consistent spacing and glassmorphism in detail panes. ✅

# 메모
- **데이버 호버 지연 (1s Delay)**: 마우스가 특정 요소(철도 노선, 역, 사이드바 아이템) 위에 1초간 머물 때만 호버 효과(툴팁, 하이라이트)가 트리거되도록 수정하여 시각적 피로도를 낮추고 의도된 인터랙션만 발생하도록 개선했습니다.
- **노선도 시각화 (TubeMap 복원)**: 사용자의 경로 생성 편의성을 위해 드래그 및 노드 선택이 용이한 기존의 `TubeMap` 엔진으로 복원했습니다.
- **데이터 정제 완료**: `sections.json` 데이터를 기반으로 모든 노선 계층 구조를 동기화하여 연결 누락 없는 완전한 그래프를 구현했습니다.
- **프리미엄 UI/UX**: 글래스모피즘과 세련된 타이포그래피를 유지하며, 모바일과 웹 모두에서 최적화된 경험을 제공합니다.
