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

## Dynamic Styling

*   **Color Scheme:** A deterministic color hashing function assigns a unique and consistent color to each prefecture and railroad line based on its name.
*   **Railroad Lines:** Each railroad line is rendered in its unique color. Clicking a line highlights it in a bright yellow.
*   **Stations:** Station markers change their appearance based on the zoom level:
    *   **Zoom <= 10:** Stations are displayed as small, solid dots (`radius: 2`), using the color of their corresponding railroad line to provide a subtle overview of station density.
    *   **Zoom > 10:** Stations are rendered as larger, more prominent circles (`radius: 5`) with a white border, making them easily identifiable and clickable.

## Current Plan: Advanced Styling Implementation

1.  **Update `MapPane.tsx`:**
    *   Pass the `getColor` utility function down to the `Railroads` and `Stations` components.

2.  **Update `Railroads.tsx`:**
    *   Receive the `getColor` function as a prop.
    *   In the styling callback, use `getColor(feature.properties.N02_003)` to set a unique color for each railroad line based on its name.

3.  **Update `Stations.tsx`:**
    *   Receive the `getColor` function as a prop.
    *   Modify the component to render `CircleMarker`s instead of simple `Marker`s.
    *   Implement a dynamic styling function for the `CircleMarker`s that checks the `zoom` prop:
        *   If `zoom <= 10`, apply styles for a small, solid dot.
        *   If `zoom > 10`, apply styles for a larger circle with a border.
    *   Use `getColor` with the station's line name (`station.lines[0]`) to determine the fill color of the circle, ensuring it matches the railroad line.
