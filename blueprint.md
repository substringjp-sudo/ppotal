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

## Current Planned Changes (Investigating Missing Kyoto Data)
### Goal
Identify and fix the issue where certain JR West Tokaido Line segments and major stations (Kyoto, Yamashina) are missing from the map.

### Proposed Steps
1. **Modify Station Visibility**: Update `Stations.tsx` to ensure major stations are visible even when their specific line is not selected, especially at higher zoom levels.
2. **Improve Line Segment Rendering**: Research and implement logic to handle cross-line segments (segments labeled as one line that logically belong to another, like Kyoto-Yamashina) to ensure they render with their logical parent line.
3. **Resolve "Selection Rectangle"**: Audit CSS and component styles to remove any unintended selection indicators or focus rings.
4. **Data Verification**: Confirm station IDs and line associations in `systematic_railroad_network.json` match the expected hierarchy.
5. **Verify Fixes**: Ensure Kyoto and Yamashina stations and their connecting lines are correctly displayed and interactable.

#메모
우리에겐 좀 복잡하지만 여러 노선의 상태가 존재해.
1. 체크된 노선
2. 체크안된 노선
3. 이용경로인 노선
3. 마우스로 지도 위에서 클릭해서 현재 하단에 노선도가 보이고 노선이 굵게 표시되는 노선

여기서 왼쪽 노선목록에서 노선을 클릭하면 하단에 노선도가 보이기는 하는데 지도에서 해당 노선이 굵게 표시는 안돼. 지도 위에도 굵게 표시되게 해줘.
그리고 선 자체를 굵게 표시하는게 아니라 클릭한 노선의 강조색으로 감싸는 테두리를 좀더 굵게 해줘. 
그리고 지도의 노선이나 역이 없는 빈공간을 클릭하면 클릭 및 하단 노선도 보여주는 상태를 해제시켜줘. 

