# jprail Project Blueprint

## Project Overview
jprail is a web application for visualizing and tracking Japanese railroad networks. It features an interactive map with detailed line and station information, progress tracking for visited segments, and a hierarchical sidebar for easy navigation.

## Project Outline (Styles, Design, Features)
### Design & Aesthetics
- **Premium Map Experience**: Uses vibrant colors, dark modes, and smooth animations.
- **Visual Depth**: Multi-layered drop shadows for cards and markers.
- **Iconography**: Modern, interactive icons for railroad types and actions.
- **Typography**: Expressive fonts with stressed sizes for better readability.
- **Animations**: Subtle micro-animations for hover effects and transitions.

### Key Features
- **Interactive Map**: Built with React-Leaflet, showing railroad networks and stations.
- **Systematic Network Data**: Loads data from `systematic_railroad_network.json` for accurate routing and rendering.
- **Station Hierarchy**: Hierarchical navigation for companies, lines, and stations.
- **Trip Recording**: Users can record trips between stations, calculating distances and marking segments as visited.
- **Progress Tracking**: Visualizes visited line segments with distinct colors and glows.
- **Detail Panes**: Dedicated views for line-specific details, including segments and pathfinding.
- **Customizable Styles**: User-controlled styling settings for visited and unvisited elements.

## Current Planned Changes (Refining Sections Data)
### Goal
Refine `sections.json` to reduce file size and optimize for the application.

### Proposed Steps
1. **Filter Redundant Sections**: Remove entries where `start_station` and `end_station` are identical (representing purely internal platform connections).
2. **Convert Length Units**: Convert `length` from kilometers to meters (integer) to simplify calculations and reduce decimal precision overhead.
3. **Shorten Keys**: Rename `start_station` and `end_station` to `start` and `end` respectively for more compact JSON representation.
4. **Update File**: Save the refined data back to `sections.json`.

#메모
... (생략)
우리에겐 좀 복잡하지만 여러 노선의 상태가 존재해.
1. 체크된 노선
2. 체크안된 노선
3. 이용경로인 노선
3. 마우스로 지도 위에서 클릭해서 현재 하단에 노선도가 보이고 노선이 굵게 표시되는 노선

~~여기서 왼쪽 노선목록에서 노선을 클릭하면 하단에 노선도가 보이기는 하는데 지도에서 해당 노선이 굵게 표시는 안돼. 지도 위에도 굵게 표시되게 해줘.~~ ✅ 완료
~~그리고 선 자체를 굵게 표시하는게 아니라 클릭한 노선의 강조색으로 감싸는 테두리를 좀더 굵게 해줘.~~ ✅ 완료 (반투명 glow outline 방식)
~~그리고 지도의 노선이나 역이 없는 빈공간을 클릭하면 클릭 및 하단 노선도 보여주는 상태를 해제시켜줘.~~ ✅ 이미 구현됨


