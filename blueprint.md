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
*   **Advanced Sidebar Sorting**: Supports Japanese (JP), Alphabetical (EN), Korean (KO), and Usage % sorting for the railroad line list.
*   **Bulk Selection Controls**: Category-level checkboxes allow for quick bulk selection/deselection of all lines within a major group (Shinkansen, JR, etc.), featuring indeterminate states.
*   **Company Accordion Management**: Includes "Expand All" and "Collapse All" buttons for managing multiple railroad company accordions simultaneously.
*   **Intuitive Click-to-Zoom**:
    *   **Sidebar**: Clicking a line name automatically fits the map view to that line's geometry.
    *   **Detail Pane**: Clicking a station name or dot in the bottom navigator zooms the map to that specific station (Zoom Level 15).
*   **Custom Map Interface**: Features a bespoke, premium zoom slider and reset view button in the top-left corner, replacing default browser controls.
*   **"My Routes" Summary Panel**: A dedicated, togglable right-side panel provides a clear list of all recorded trips with distance information and delete functionality.
*   **Visual Polish & Animations**: Enhanced with smooth "fly-to" map transitions, glassmorphic UI elements, and refined typography (Inter) for a premium feel.
*   **Firebase Hosting Deployment**: Successfully deployed to Firebase Hosting using optimized Next.js build.

## Technical Details

### Pathfinding & Graph Construction
- **Accuracy:** The pathfinding system uses Dijkstra's algorithm on a topological graph of Japan's railroad network.
- **Inter-station Transfers:** Stations with the same name are logically connected (transfers) within 1.0km to allow routing between different lines.
- **Geometry Reconstruction:** Paths found in the graph are reconstructed into full geographic polylines for display on the map.

### Data Management
- **Persistence:** Uses `localStorage` to store an array of user trip objects (`id`, `path`, `geometries`, `distance`, etc.).
- **Statistics Calculation:** Dynamically aggregates visited distance by matching topological edges between recorded trips and the systematic railroad network.

