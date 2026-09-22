#!/usr/bin/env bash
# Package the extension into a distributable ZIP.
# Usage: ./scripts/build.sh [version]
# If no version is given, the version from manifest.json is used.

set -euo pipefail

cd "$(dirname "$0")/.."

VERSION="${1:-$(grep -oE '"version"[[:space:]]*:[[:space:]]*"[^"]+"' manifest.json | head -1 | sed -E 's/.*"([^"]+)"$/\1/')}"

if [[ -z "$VERSION" ]]; then
  echo "Could not determine version" >&2
  exit 1
fi

OUT_DIR="dist"
OUT_FILE="$OUT_DIR/toll-v${VERSION}.zip"

mkdir -p "$OUT_DIR"
rm -f "$OUT_FILE"

# Files that ship in the extension. Everything else stays out.
zip -r "$OUT_FILE" \
  manifest.json \
  src \
  LICENSE \
  -x "*.DS_Store" "*/.*" >/dev/null

echo "Built $OUT_FILE"
unzip -l "$OUT_FILE" | tail -n +2
