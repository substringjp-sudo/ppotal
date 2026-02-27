# Project Blueprint - JapanRailNote

## Overview
JapanRailNote is a web application for recording and visualizing Japanese railroad travel. It features an interactive map, station details, and line information.

## Current Project State (Design & Features)
- **Interactive Map**: Displays Japanese railroad networks with dynamic styling.
- **Station Detail Pane**: Shows detailed information about a station, including connecting lines and neighbor stations.
- **Line Detail Pane**: Shows segments and stations for a specific railroad line.
- **My Lines Pane**: Lists recorded trips and travel statistics.
- **Responsive Design**: Support for both desktop and mobile views.
- **Firebase Integration**: Authenticated users can sync their trip data to the cloud.

## Recent Changes & Bug Fixes
- **StationDetailPane Export**: Fixed a TypeScript error in `MainPageClient.tsx` by exporting `StationDetailPaneProps` from `StationDetailPane.tsx`.
- **Linting Fixes**: 
    - Resolved `react-hooks/rules-of-hooks` in `StationDetailPane.tsx` by moving `useMemo` before the conditional return.
    - Replaced `any` types with the appropriate `Section` type in `StationDetailPane.tsx`.
    - Removed unused `Company` and `Line` imports in `StationDetailPane.tsx`.
- **Graph Type Fixes**: Resolved `sectionIds.forEach` error by updating `RoutingGraph.ts` and `railData.ts` to handle the new `stationGraph`/`platformGraph` structure. Updated `rebuild_graph_v2.js` to output this dual structure.
- **Station Detail UI Refinement**: 
    - Updated station name styling to improve visibility (Ekimeihyo look).
    - Refactored neighbor placement logic to be based on platform connection points.
    - Added dynamic height for neighbor rows to prevent overlapping.
    - Improved contrast for line names.
    - Added visualization for skipped stations (Express/Rapid services) using dashed lines and "+N" indicators.
- **Graph Logic Enhancements**: Updated `rebuild_graph_v2.js` to support "Express" connections by bypassing non-stopping stations and tracking them.

## Plan for Current Task
1. Finalize UI refinements for Station Detail Pane.
2. Verify visual consistency across different line configurations.
3. (Optional) Add more detailed service information if available.
