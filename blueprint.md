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

## Pathfinding & Graph Construction

*   **Accuracy:** The pathfinding system uses Dijkstra's algorithm on a topological graph of Japan's railroad network.
*   **Inter-station Transfers:** Stations with the same name are logically connected (transfers) to allow routing between different lines.
*   **Geometry Reconstruction:** Paths found in the graph are reconstructed into full geographic polylines for display on the map.

## Current Plan: Pathfinding Accuracy Refinement

1.  **Restrict Transfer Edges:**
    *   Update `graphUtils.ts` to enforce a 1.0km maximum distance for transfer edges between same-name stations. This prevents "teleportation" between distant stations that happen to share a name (e.g., "Aisai" stations in different regions).
2.  **Disambiguate UI Interactions:**
    *   Modify `Stations.tsx` to pass the specific coordinate of the clicked marker to `MapPane.tsx`.
    *   Update `MapPane.tsx` to use this coordinate to find the exact nearest station node (ID) as the start of the pathfinding, rather than just using the station name.
3.  **Refine Search Result Selection:**
    *   Ensure that when multiple stations with the same name exist, the pathfinding accurately selects the one the user actually interacted with.
