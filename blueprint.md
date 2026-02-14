# JapanRailNote

## Overview

This application displays an interactive map of Japan, focusing on its administrative boundaries and transportation infrastructure. The map initially shows the entire country with prefectural boundaries. As the user zooms in, the map dynamically shows municipal boundaries while retaining a clear, bold outline of the prefectural boundaries. Railroads and stations are also displayed with dynamic styling based on the map's zoom level.

## Features

*   **Interactive Map:** Users can pan and zoom the map.
*   **Dynamic Boundary Display:** Automatically shows municipal boundaries when zoomed in, with prefectural boundaries remaining visible as a thicker outline for context.
*   **Hierarchical Layering:** All layers are organized using z-index to ensure logical visibility (stations > railroads > administrative boundaries).
*   **Consistent Line Weight:** All line weights are defined in screen pixels, ensuring they do not scale disproportionately when zooming.
*   **Optimized Performance:** Data is loaded progressively. Station data, being the most numerous, is only fetched at high zoom levels.
*   **Interactive Railroads**: Hovering highlights lines and shows tooltips. Clicking a line opens a detailed bottom view showing the sequence of stations.
*   **Station Progress Visualization**: The bottom view highlights segments between stations that the user has already visited.
*   **Systematic Railroad Network:** Uses a processed topological network for accurate mapping and pathfinding.
*   **Drag-and-Drop Pathfinding:** Users can drag from one station to another to find the shortest railroad path between them.
*   **Trip Persistence**: User progress (recorded trips) is saved to `localStorage` and automatically restored upon return.
*   **Progress Tracking**: Calculates total and visited distances at both the line level and company level.
*   **Company-level Statistics**: Summarizes completion progress for various railroad companies (JR, Private, etc.) in a structured accordion interface.
*   **Refined Sidebar UI**: Features a structured, aligned layout with text truncation for long names and animated progress bars for visual completion tracking.
*   **Dynamic Progress Visualization**: Sidebar chips use adaptive colors (gray -> light green -> deep green) to visually communicate completion percentage at a glance.
*   **Line Detail Mini-map**: Provides an integrated overview of even complex branched routes with one-click navigation to any station.
*   **Detail Pane Drag-to-Record**: Enables direct trip recording from the station detail view via intuitive drag-and-drop interactions.
*   **Visited Station Highlighting**: Visually distinct markers (green with glow) for stations that have been visited, improving orientation within the line view.
*   **Sidebar Statistics Tracking**: Displays visited line counts versus total line counts (e.g., 2/45) for both railroad companies and major categories within the sidebar.
*   **Focused Map Interactions**: Map interactions are specifically optimized for railroad and station data, with administrative boundary zoom-on-click functionality disabled.
*   **Intelligent Trip Management**: Features a "Toggle" logic where recording the same trip twice (even in reverse) removes it from the record.
*   **Trip Reset**: Provides a dedicated button in the header (top right) to clear all travel history with confirmation.
*   **User Statistics Dashboard**: A real-time header display showing total distance (km), lines completed, stations visited, and railroad companies used.
*   **Firebase Hosting Deployment**: Successfully deployed to Firebase Hosting using optimized Next.js build and experiments for web framework support.
*   **Firebase Configuration**: Integrated Firebase SDK for future expandability (Auth, Realtime database, etc.).

## Technical Details

### Pathfinding & Graph Construction
- **Accuracy:** The pathfinding system uses Dijkstra's algorithm on a topological graph of Japan's railroad network.
- **Inter-station Transfers:** Stations with the same name are logically connected (transfers) within 1.0km to allow routing between different lines.
- **Geometry Reconstruction:** Paths found in the graph are reconstructed into full geographic polylines for display on the map.

### Data Management
- **Persistence:** Uses `localStorage` to store an array of user trip objects (`id`, `path`, `geometries`, `distance`, etc.).
- **Statistics Calculation:** Dynamically aggregates visited distance by matching topological edges between recorded trips and the systematic railroad network.

# 새 목표
- 지도를 이미지 형태로 출력
- 노선목록에서 체크 말고 그냥 클릭하면 해당 노선 줌인
- 점크기 좀 더 크게
- 지도 오른쪽 패널에 내가 이용한 노선만 정리해서 표시
- 노선 클릭하면 생기는 사각형 지우기
- 신칸센, JR 등 대분류 전체 체크하기 기능
- 하단노선도의 네비게이터를 가리지 않게 하단뷰 위로 올리기 
- 노선목록 정렬 옵션(일본어순서, 알파벳순서, 가나다순서, 이용률순서)
- 노선목록 모두닫기, 모두열기 기능 추가
- 노선목록 전체선택/전체해제 적용 확인 표시
- 최대줌/최소줌 제한
- 줌슬라이더, 줌리셋 기능
- 하단노선도에서 역을 클릭하면 해당 역 위치로 줌 이동

# 미래목표
- 안쓰는 파일 정리
- https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-v3_1.html 사용규칙 적용하기
- https://www.geoboundaries.org/ 사용규칙 적용하기 
- 번역
- 노선데이터 좀 더 보강하기
- 여러 형태의 시각적 표시방식 설정
- 용량 압축, 최적화