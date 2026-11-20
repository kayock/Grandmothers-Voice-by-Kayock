#!/usr/bin/env bash
# build_app.sh — concatenates the app parts into the final standalone HTML
# and runs a syntax check on the extracted main script.
set -euo pipefail
PARTS="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/Grandmothers_Voice_by_Kayock.html"
LEGACY="$ROOT/GED_Legacy_Builder.html"

cat "$PARTS/part1_head.html" \
    "$PARTS/part2_body.html" \
    "$PARTS/part3_core.js" \
    "$PARTS/part4_analysis.js" \
    "$PARTS/part5_exports.js" \
    "$PARTS/part6_explorer_css.js" \
    "$PARTS/part6_explorer_a.js" \
    "$PARTS/part6_explorer_b.js" \
    "$PARTS/part6_explorer_c.js" \
    "$PARTS/part6_explorer_d.js" \
    "$PARTS/part7a_builder.js" \
    "$PARTS/part7b_media.js" \
    "$PARTS/part7c_exports.js" \
    "$PARTS/part7d_init.js" > "$OUT"

echo "built $OUT ($(wc -c < "$OUT") bytes)"

# legacy entry point: tiny offline redirect so old bookmarks and launchers keep working
cat > "$LEGACY" <<'STUB'
<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="0; url=Grandmothers_Voice_by_Kayock.html">
<title>Grandmothers voice by Kayock</title></head>
<body style="font-family:Segoe UI,Arial,sans-serif;background:#F6EBD8;color:#49382D;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh">
<p>This application is now named <strong>Grandmothers voice by Kayock</strong>.
<a href="Grandmothers_Voice_by_Kayock.html">Open the app</a> (this page redirects automatically).</p>
</body></html>
STUB
echo "built legacy redirect $LEGACY"

# extract the main builder script (between the first <script> and last </script>)
node -e '
const fs = require("fs");
const html = fs.readFileSync(process.argv[1], "utf8");
const start = html.indexOf("<script>");
const lastEnd = html.lastIndexOf("</script>");
if (start < 0 || lastEnd <= start) { console.error("script block not found"); process.exit(1); }
const js = html.slice(start + 8, lastEnd);
fs.writeFileSync(require("os").tmpdir() + "/gvk_builder_main.js", js);
console.log("extracted builder script:", js.length, "chars");
' "$OUT"

node --check "$(node -e "console.log(require('os').tmpdir())")/gvk_builder_main.js" && echo "SYNTAX OK (builder script)"
