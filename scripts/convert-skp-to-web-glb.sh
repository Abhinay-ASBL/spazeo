#!/usr/bin/env bash
# Legacy Towers SKP → web GLB pipeline (same as Aug 2026 claude-mem workflow)
#
# Step 1 — SKP → raw GLB (SimLab / FabConvert / SketchUp export)
#   Produces a large SimLab-style GLB (~300–800 MB). gltf-transform cannot read .skp.
#
# Step 2 — raw GLB → web GLB (this script)
#   Uses glTF-Transform v4.4.2 with meshopt + webp, same flags that produced ALL-TOWERS-web-105mb.glb
#
# Usage:
#   ./scripts/convert-skp-to-web-glb.sh /path/to/raw-export.glb [output.glb]
#
set -euo pipefail

SRC="${1:?Usage: $0 <raw-export.glb> [output.glb]}"
OUT="${2:-$(dirname "$SRC")/$(basename "$SRC" .glb)-web.glb}"
LOG="${OUT%.glb}-optimize.log"

echo "Input : $SRC ($(ls -lh "$SRC" | awk '{print $5}'))"
echo "Output: $OUT"
echo "Log   : $LOG"

export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=12288}"

npx --yes @gltf-transform/cli@4.4.2 optimize "$SRC" "$OUT" \
  --compress meshopt \
  --texture-compress webp \
  --simplify \
  --simplify-ratio 0.25 \
  --join \
  --flatten \
  2>&1 | tee "$LOG"

echo ""
echo "Done: $OUT ($(ls -lh "$OUT" | awk '{print $5}'))"
npx --yes @gltf-transform/cli@4.4.2 inspect "$OUT" 2>&1 | head -40
