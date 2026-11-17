#!/usr/bin/env bash
# Renders social/<post>/index.html to social/<post>/image.png (2400×1260, a 1200×630 card at 2×)
# with headless Chrome. A page can ask for another size with <meta name="size" content="1280x640">
# (GitHub's social preview). Usage: social/render.sh code-blocks [more posts…]
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
chrome="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"

if [ ! -x "$chrome" ]; then
  echo "Chrome not found at $chrome; set CHROME to its binary." >&2
  exit 1
fi
if [ $# -eq 0 ]; then
  echo "Usage: social/render.sh <post> [more posts…]" >&2
  exit 1
fi

for post in "$@"; do
  dir="$here/${post%/}"
  if [ ! -f "$dir/index.html" ]; then
    echo "No index.html in $dir" >&2
    exit 1
  fi
  size="$(sed -n 's/.*<meta name="size" content="\([0-9]*\)x\([0-9]*\)".*/\1,\2/p' "$dir/index.html" | head -1)"
  "$chrome" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files \
    --force-device-scale-factor=2 --virtual-time-budget=5000 --window-size="${size:-1200,630}" \
    --screenshot="$dir/image.png" "file://$dir/index.html" 2>/dev/null
  echo "$dir/image.png"
done
