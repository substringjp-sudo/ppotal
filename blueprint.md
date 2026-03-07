# Project Blueprint - JapanRailNote

## Overview
JapanRailNote is a web application for recording and visualizing Japanese railroad travel. It features an interactive map, station details, and line information.

## Current Project State (Design & Features)
- **Interactive Map**: Displays Japanese railroad networks with dynamic styling.
- **Tube Map Scale Optimization**: The scale of all elements (stations, lines, text) has been reduced by 50% for a cleaner, more efficient layout.
- **Station Detail Pane**: Shows detailed information about a station. Recently redesigned for a premium, compact look. Features a sophisticated SVG connection diagram that scales gracefully with many connections, smaller elegant typography, and refined spacing.
- **Trip Recording**: Real-time travel path recording. Features visual path preview (Blue path) on hover and click, with path guidelines now following curved track geometry (arcs).
- **Density-Filtered Visited Stations**: Visited stations are now subject to passenger-grid-based filtering, preventing clutter while maintaining context.
- **My Lines Pane**: Lists recorded trips and travel statistics.
- **Responsive Design**: Support for both desktop and mobile views.
- **Integrated Map Layers**: High-resolution geographical boundaries for prefectures and municipalities.
- **Airport Data Integration**: Renders Japanese airport polygons using GeoJSON data. Includes multi-language terminal labels and visibility toggles.
- **Tube Map Scale Optimization**: The scale of all elements (stations, lines, text) has been reduced by 50% for a cleaner, more efficient layout.
- **Intelligent Path Recording**: Added "Snake Update" logic for smoother station snapping and a multi-segment pathfinding algorithm to accurately record express routes and complex connections.
- **Firebase Integration**: Authenticated users can sync their trip data to the cloud.
- **Hydration & Reliability**: Resolved server/client mismatch issues in the i18n system. Enhanced type safety across core components and fixed various runtime TypeErrors in map interactions.
- **Enhanced Tooltips**: All map tooltips (Airports, Lines, Stations) now feature distinct icon identifiers and boundary-aware positioning that intelligently adjusts to sidebar visibility.

- **Tooltip & Icon Enhancements (v1.4.0)**:
    - Adjusted padding and layout for all map tooltips for a cleaner, more spacious look.
    - Added distinct Material Symbols icons to tooltips: `local_airport` (Airports), `directions_railway` (Lines), and `subway` (Stations).
    - Implemented smart positioning for `FloatingTooltip` to prevent clipping by sidebars and screen edges.
    - Refined station tooltip to show localized addresses and a refined line list layout.
- **Trip Recorder Logic Fix**:
    - Fixed the `onDraftComplete` callback in `useTripRecorder.ts` to correctly finalize trip drafts.

## History
- **v1.4.0 (2026-03-08)**: Tooltip boundary awareness and Icon integration.
- **v1.3.0 (2025-03-05)**: Airport Data Integration & Map Style Enhancements.
- **v1.2.0 (2024-03-04)**: Tube Map Scale & Path Logic refinement.
- **v1.1.0 (2024-03-04)**: Twitter Sharing & 2024 N02-24 Data update.
- **v1.0.0 (2024-02-28)**: Schematic Engine & Responsive UI overhaul.

## Plan for Current Task
1. [DONE] Fetch and load airport GeoJSON data.
2. [DONE] Create `AirportLayer` component.
3. [DONE] Add `showAirports` setting to `MapStyleSettings` and `MapStylePanel`.
4. [DONE] Integrate `AirportLayer` into `MapPane`.
5. [DONE] Fix lint errors and resolve type safety issues.
6. [DONE] Build and verify in browser.
7. [TODO] Git commit and deploy.
