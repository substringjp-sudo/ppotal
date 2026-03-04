# Project Blueprint - JapanRailNote

## Overview
JapanRailNote is a web application for recording and visualizing Japanese railroad travel. It features an interactive map, station details, and line information.

## Current Project State (Design & Features)
- **Interactive Map**: Displays Japanese railroad networks with dynamic styling.
- **Tube Map Scale Optimization**: The scale of all elements (stations, lines, text) has been reduced by 50% for a cleaner, more efficient layout.
- **Intelligent Path Recording**: Added "Snake Update" logic for smoother station snapping and a multi-segment pathfinding algorithm to accurately record express routes and complex connections.
- **Station Detail Pane**: Shows detailed information about a station. Recently redesigned for a premium, compact look. Features a sophisticated SVG connection diagram that scales gracefully with many connections, smaller elegant typography, and refined spacing.
- **Trip Recording**: Real-time travel path recording. Features visual path preview (Blue path) on hover and click, with path guidelines now following curved track geometry (arcs).
- **Density-Filtered Visited Stations**: Visited stations are now subject to passenger-grid-based filtering, preventing clutter while maintaining context.
- **My Lines Pane**: Lists recorded trips and travel statistics.
- **Responsive Design**: Support for both desktop and mobile views.
- **Firebase Integration**: Authenticated users can sync their trip data to the cloud.
- **Hydration & Reliability**: Resolved server/client mismatch issues in the i18n system. Enhanced type safety across core components and fixed various runtime TypeErrors in map interactions.

## Recent Changes & Bug Fixes (v1.2.0)
- **Map Scale Reduction (50%)**: Halved `OCCUPATION_BUFFER`, `spacingY`, `baseY`, and other layout constants for a more efficient view.
- **Path Drawing Guidelines**: 
    - Fixed resetting issues; guidelines now correctly anchor to the last recorded station.
    - Guidelines follow curved track geometry (arcs) for matched visual feedback.
    - Added snapping line to cursor and dashed preview connections.
- **Intelligent Route Recording**:
    - Implemented logic in `LineDetailPane.tsx` to combine multi-segment shortest paths, ensuring express routes and skipped stations are recorded correctly.
- **Station Visibility Refinement**:
    - Visited stations now undergo passenger density filtering to avoid clutter at lower zoom levels.
- **Tooltip & Localization Fixes**:
    - Increased tooltip padding and fixed the localized/Japanese address display overlap bug.
- **Station Detail UI Renewal**:
    - Completely overhauled for a professional and compact aesthetic.
    - Reduced font sizes for a more premium "Apple-like" feel.
    - Redesigned the connection diagram using smaller, cleaner SVG elements that handle multiple adjacent stations without excessive clutter.

## History
- **v1.1.0 (2024-03-04)**: Twitter Sharing & 2024 N02-24 Data update.
- **v1.0.0 (2024-02-28)**: Schematic Engine & Responsive UI overhaul.

## Plan for Current Task
1. [DONE] Implement Trip Recording UI and Logic.
2. [DONE] Tube Map Scaling (50% reduction).
3. [DONE] Path Drawing Guideline Refinement (Anchor fix, Arc following).
4. [DONE] Visited Station Density Filtering.
5. [DONE] Tooltip UX and Localization (JA address) fixes.
6. [DONE] Multi-segment route recording logic.
7. [DONE] Update Changelog and Update Notice Modal (KR/EN/JA).
8. [DONE] Build and Lint verification.
9. [IN PROGRESS] Production deployment and Git commit.
