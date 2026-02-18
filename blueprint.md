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

- **SEO Optimization**: Implemented Server-Side Rendering (SSR) for core content and enhanced metadata for better AdSense and search engine discoverability.
- **How-To Guide**: A responsive modal guide for desktop and mobile users to ease onboarding.
- **Static Content Injection**: Added descriptive hidden content for bots to ensure AdSense compliance.

## Current Status
- **AdSense Policy Violation Resolved**: Refactored to SSR and added indexable content to address "no content" issues.
- **Improved Discoverability**: Expanded keywords and metadata.
- **User Onboarding**: Integrated 'HOW TO' functionality in the header.
- **Build & Deployment Stability**: Fixed TypeScript dependency issues in build scripts.

#메모
우리에겐 좀 복잡하지만 여러 노선의 상태가 존재해.
1. 체크된 노선
2. 체크안된 노선
3. 이용경로인 노선
4. 마우스로 지도 위에서 클릭해서 현재 하단에 노선도가 보이고 노선이 굵게 표시되는 노선

- [x] 왼쪽 노선목록에서 노선을 클릭하면 하단에 노선도가 보이고 지도에서도 강조 표시되도록 개선.
- [x] 클릭한 노선의 강조색 테두리(glow) 최적화.
- [x] 지도 빈 공간 클릭 시 선택 상태 해제 로직 확인.
- [x] AdSense "콘텐츠 없음" 문제 해결을 위한 SSR 전환 및 SEO 강화.
- [x] 사용자 가이드(How-To) 모달 추가.


