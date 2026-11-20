#!/bin/sh
# Grandmothers voice by Kayock launcher (Linux / macOS) — fully offline.
DIR="$(cd "$(dirname "$0")" && pwd)"
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$DIR/Grandmothers_Voice_by_Kayock.html"
elif command -v open >/dev/null 2>&1; then
  open "$DIR/Grandmothers_Voice_by_Kayock.html"
else
  echo "Please open Grandmothers_Voice_by_Kayock.html in your browser."
fi
