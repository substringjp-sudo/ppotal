# Japan Map Application

## Overview

This application displays an interactive map of Japan, focusing on its administrative boundaries and transportation infrastructure. The map initially shows the entire country with prefectural boundaries. As the user zooms in, the map dynamically shows municipal boundaries while retaining a clear, bold outline of the prefectural boundaries. Railroads and stations are also displayed with dynamic styling based on the map's zoom level.

## Features

*   **Interactive Map:** Users can pan and zoom the map.
*   **Dynamic Boundary Display:** Automatically shows municipal boundaries when zoomed in, with prefectural boundaries remaining visible as a thicker outline for context.
*   **Hierarchical Layering:** All layers are organized using z-index to ensure logical visibility (stations > railroads > administrative boundaries).
*   **Consistent Line Weight:** All line weights are defined in screen pixels, ensuring they do not scale disproportionately when zooming.
*   **Optimized Performance:** Data is loaded progressively. Station data, being the most numerous, is only fetched at high zoom levels.
*   **Interactivity:** Clicking a prefecture zooms the map to its bounds. Clicking a railroad line highlights it.
*   **Systematic Railroad Network:** Uses a processed topological network for accurate mapping and pathfinding.
*   **Drag-and-Drop Pathfinding:** Users can drag from one station to another to find the shortest railroad path between them.
*   **Trip Persistence**: User progress (recorded trips) is saved to `localStorage` and automatically restored upon return.
*   **Progress Tracking**: Calculates total and visited distances at both the line level and company level.
*   **Company-level Statistics**: Summarizes completion progress for various railroad companies (JR, Private, etc.) in a structured accordion interface.
*   **Refined Sidebar UI**: Features a structured, aligned layout with text truncation for long names and animated progress bars for visual completion tracking.

## Technical Details

### Pathfinding & Graph Construction
- **Accuracy:** The pathfinding system uses Dijkstra's algorithm on a topological graph of Japan's railroad network.
- **Inter-station Transfers:** Stations with the same name are logically connected (transfers) within 1.0km to allow routing between different lines.
- **Geometry Reconstruction:** Paths found in the graph are reconstructed into full geographic polylines for display on the map.

### Data Management
- **Persistence:** Uses `localStorage` to store an array of user trip objects (`id`, `path`, `geometries`, `distance`, etc.).
- **Statistics Calculation:** Dynamically aggregates visited distance by matching topological edges between recorded trips and the systematic railroad network.
