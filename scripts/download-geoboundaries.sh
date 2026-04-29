#!/usr/bin/env bash
# Download Korean ADM1/ADM2 GeoJSON from geoBoundaries
# Run this script once to populate data/source/

set -euo pipefail

OUTDIR="$(dirname "$0")/../data/source"
mkdir -p "$OUTDIR"

echo "Fetching geoBoundaries KOR ADM1..."
curl -fsSL "https://www.geoboundaries.org/api/current/gbOpen/KOR/ADM1/" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['gjDownloadURL'])" \
  | xargs curl -fsSL -o "$OUTDIR/KOR_ADM1.geojson"

echo "Fetching geoBoundaries KOR ADM2..."
curl -fsSL "https://www.geoboundaries.org/api/current/gbOpen/KOR/ADM2/" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['gjDownloadURL'])" \
  | xargs curl -fsSL -o "$OUTDIR/KOR_ADM2.geojson"

echo "Done. Files saved to $OUTDIR"
