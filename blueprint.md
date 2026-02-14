# Japan Map Application

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

## Technical Details

### Pathfinding & Graph Construction
- **Accuracy:** The pathfinding system uses Dijkstra's algorithm on a topological graph of Japan's railroad network.
- **Inter-station Transfers:** Stations with the same name are logically connected (transfers) within 1.0km to allow routing between different lines.
- **Geometry Reconstruction:** Paths found in the graph are reconstructed into full geographic polylines for display on the map.

### Data Management
- **Persistence:** Uses `localStorage` to store an array of user trip objects (`id`, `path`, `geometries`, `distance`, etc.).
- **Statistics Calculation:** Dynamically aggregates visited distance by matching topological edges between recorded trips and the systematic railroad network.
