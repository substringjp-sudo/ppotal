/**
 * Decodes a Google Polyline string into an array of [lng, lat] points.
 * @param str The encoded polyline string
 * @param precision Precision multiplier used during encoding (default 1e5)
 */
export function decodePolyline(str: string, precision: number = 1e5): [number, number][] {
    let index = 0;
    let lat = 0;
    let lng = 0;
    const coordinates: [number, number][] = [];
    const multiplier = precision;

    while (index < str.length) {
        let byte;
        let res = 0;
        let shiftCount = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            res |= (byte & 0x1f) << shiftCount;
            shiftCount += 5;
        } while (byte >= 0x20);

        const deltaLat = (res & 1) ? ~(res >> 1) : (res >> 1);
        lat += deltaLat;

        res = 0;
        shiftCount = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            res |= (byte & 0x1f) << shiftCount;
            shiftCount += 5;
        } while (byte >= 0x20);

        const deltaLng = (res & 1) ? ~(res >> 1) : (res >> 1);
        lng += deltaLng;

        // Our data format is [lng, lat] to match GeoJSON
        coordinates.push([lng / multiplier, lat / multiplier]);
    }

    return coordinates;
}
