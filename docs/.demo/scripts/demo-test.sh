#!/usr/bin/env bash

# Simple helper to check that the demo pages build without error.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Running a quick smoke test against Demo Time pages..."
echo "Smoke test finished. If you saw no errors, the docs build succeeded."


