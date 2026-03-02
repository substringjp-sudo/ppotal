# Project Blueprint - JapanRailNote

## Overview
JapanRailNote is a web application for recording and visualizing Japanese railroad travel. It features an interactive map, station details, and line information.

## Current Project State (Design & Features)
- **Interactive Map**: Displays Japanese railroad networks with dynamic styling.
- **Station Detail Pane**: Shows detailed information about a station. Recently redesigned for a premium, compact look. Features a sophisticated SVG connection diagram that scales gracefully with many connections, smaller elegant typography, and refined spacing.
- **Trip Recording**: Real-time travel path recording with "Start Trip" and "End Trip" functionality. Features visual path preview (Blue path) on hover and click, starting point highlights.
- **My Lines Pane**: Lists recorded trips and travel statistics.
- **Responsive Design**: Support for both desktop and mobile views.
- **Firebase Integration**: Authenticated users can sync their trip data to the cloud.
- **Hydration & Reliability**: Resolved server/client mismatch issues in the i18n system. Enhanced type safety across core components and fixed various runtime TypeErrors in map interactions.

## Recent Changes & Bug Fixes
- **Station Detail UI Renewal**:
    - Completely overhauled for a professional and compact aesthetic.
    - Reduced font sizes for a more premium "Apple-like" feel.
    - Redesigned the connection diagram using smaller, cleaner SVG elements that handle multiple adjacent stations without excessive clutter.
- **Hydration Mismatch Fix**:
    - Modified `i18n-context.tsx` to handle language initialization correctly on the client-side, preventing inconsistencies between server and client rendering.
    - Optimized placeholder text logic to match the initial language state.
- **Code Stability**:
    - Replaced `any` types with specific interfaces in critical components (`Stations.tsx`, `useRailData.ts`).
    - Fixed React Hook violations and runtime TypeErrors related to map tooltip interactions.
- **Visual Polish**:
    - Harmonized `border-radius` values across map controls and style panels for consistent design language.
    - Added a custom OG image for better social media visibility.

## Plan for Current Task
1. [DONE] Implement Trip Recording UI and Logic.
2. [DONE] Enhance Station Detail Pane header and line spacing.
3. [DONE] Visual feedback for trip progress on the map.
4. [DONE] Prioritize Japanese names in History and Sidebar UI.
5. [DONE] Refactor Mobile Layout.
6. [DONE] Refine Mobile Line Preview UI.
7. [DONE] Refine Rail Search Experience.
8. [DONE] **Final UI/UX Polish & Bug Fixes** (Station Detail Redesign, Hydration Fix).
9. [PENDING] Production deployment (Blocked by environmental EPERM issues, but code is ready).
