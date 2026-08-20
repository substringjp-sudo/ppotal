import { describe, expect, it } from "vitest";
import { isStandardBoundaryFeature, normalizeFeatures } from "../regions";

describe("isStandardBoundaryFeature", () => {
  it("allows standard geoBoundaries features", () => {
    const geoBoundaryFeature = {
      type: "Feature",
      properties: {
        id: "1499101",
        shapeID: "1499101",
        name: "Oita",
        shapeName: "Oita",
        iso3: "JPN",
      },
      geometry: { type: "Polygon", coordinates: [] },
    };
    expect(isStandardBoundaryFeature(geoBoundaryFeature)).toBe(true);
  });

  it("filters out features with osm_ id prefix", () => {
    const osmFeature = {
      type: "Feature",
      properties: {
        id: "osm_4004870",
        shapeID: "osm_4004870",
        name: "津久見市",
        shapeName: "Tsukumi",
        source: "osm",
        osmRelationId: 4004870,
      },
      geometry: { type: "Polygon", coordinates: [] },
    };
    expect(isStandardBoundaryFeature(osmFeature)).toBe(false);
  });

  it("filters out features with source: 'osm' or osmRelationId", () => {
    const osmSourceFeature = {
      type: "Feature",
      properties: {
        id: "custom_id",
        source: "osm",
      },
      geometry: { type: "Polygon", coordinates: [] },
    };
    expect(isStandardBoundaryFeature(osmSourceFeature)).toBe(false);

    const osmRelFeature = {
      type: "Feature",
      properties: {
        id: "custom_id_2",
        osmRelationId: 12345,
      },
      geometry: { type: "Polygon", coordinates: [] },
    };
    expect(isStandardBoundaryFeature(osmRelFeature)).toBe(false);
  });
});

describe("normalizeFeatures", () => {
  it("filters out OSM territorial water features and normalizes properties & geometry", () => {
    const rawFeatures = [
      {
        type: "Feature",
        properties: { id: "14901", shapeName: "Hokkaido" },
        geometry: '{"type":"Polygon","coordinates":[[[0,0],[0,1],[1,1],[1,0],[0,0]]]}',
      },
      {
        type: "Feature",
        properties: { id: "osm_4004870", name: "津久見市", source: "osm" },
        geometry: { type: "Polygon", coordinates: [] },
      },
    ];

    const result = normalizeFeatures(rawFeatures);
    expect(result).toHaveLength(1);
    expect(result[0].properties.id).toBe("14901");
    expect(result[0].geometry).toEqual({
      type: "Polygon",
      coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]],
    });
  });
});
