# Project Blueprint - JapanRailNote

## Overview
JapanRailNote is a web application for recording and visualizing Japanese railroad travel. It features an interactive map, station details, and line information.

## Current Project State (Design & Features)
- **Interactive Map**: Displays Japanese railroad networks with dynamic styling.
- **Station Detail Pane**: Shows detailed information about a station, including connecting lines and neighbor stations. Recently enhanced with more prominent station names and regional info.
- **Trip Recording**: Real-time travel path recording with "Start Trip" and "End Trip" functionality. Features visual path preview (Blue path) on hover and click, starting point highlights.
- **My Lines Pane**: Lists recorded trips and travel statistics.
- **Responsive Design**: Support for both desktop and mobile views.
- **Firebase Integration**: Authenticated users can sync their trip data to the cloud.

## Recent Changes & Bug Fixes
- **Trip Recording Implementation & Fixes**:
    - **Pathfinding Logic Revamp**: Modified `RoutingGraph.ts` to correctly handle path calculations when all lines are allowed. Improved ID normalization.
    - **Hover Preview Reactivity**: Updated `Stations.tsx` and `RailroadLayer.tsx` to use more reactive keys (`bakedKey`, `layerKey`) that include draft path state, forcing immediate map updates during hover.
    - **Trip History Data Integrity**: Added `startId` and `endId` to `Trip` objects to ensure line and company information is correctly retrieved in `MyLinesPane`, fixing the "Unknown" display issue.
- **Station Detail UI Refinement**: 
    - **Header Layout**: Reorganized station names and region information. Japanese names are now stacked with English names, and region names appear adjacent with improved visibility (blacker Kanji).
    - **Spacing Adjustments**: Increased horizontal space between central and neighbor stations (480px width) and removed vertical gaps between line rows for a denser, clearer layout.
    - **Japanese Localization Prioritization**:
    - **My History (Right Pane)**: Reorganized trip entries to show Japanese station/line/company names as primary and English names as secondary text.
    - **Line List (Left Sidebar)**: Swapped display order for rail lines and companies; Japanese names are now the main titles, with English names as subtext.
- **Mobile UI Refinement (Line Preview)**:
    - **Header Layout**: Restructured the header to show Japanese names as primary (larger font) and English names as secondary next to them. Company info is moved below the line info with similar Japanese/English prominence.
    - **TubeMap Layout**: Increased margins for the schematic line map (TubeMap) to 20px (top) and 30px (bottom) for a more breathing layout. 
    - **Mini-map Repositioning**: Moved the internal mini-map from an absolute position (overlaying the schematic) to a dedicated portal target below the schematic, preventing visual obstruction.
    - **Button Removal**: Removed the redundant "Hide from Map" button as map interaction already dismisses the panel.

- **Trip Recording Fixes & Localization**:
    - **Button Labels**: Changed all trip recording related buttons ("여행 시작", "여행 종료", "취소") to English ("Start Trip", "End Trip", "Cancel") for both mobile and desktop.
    - **Cancel Functionality**: Fixed a bug where the 'Cancel' button would mistakenly start a new trip instead of resetting the current one. Added a dedicated `onCancel` handler.
    - **History & Sidebar Density**: Refined the visual hierarchy in the history and sidebar panes to ensure Japanese names are primary and English names are secondary, with improved spacing.

## Plan for Current Task
1. [DONE] Implement Trip Recording UI and Logic (Fixed preview and pathfinding bugs, localized buttons).
2. [DONE] Enhance Station Detail Pane header and line spacing.
3. [DONE] Visual feedback for trip progress on the map (Hover Preview).
4. [DONE] Prioritize Japanese names in History and Sidebar UI.
5. [DONE] Refactor Mobile Layout (Header, Info Modal, Edit Mode Removal).
6. [DONE] Refine Mobile Line Preview UI (Text hierarchy, Spacing, Mini-map repositioning).
7. [PENDING] Perform final testing of the end-to-end trip recording flow and authentication.

