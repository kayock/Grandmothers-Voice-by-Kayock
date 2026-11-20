# Build system (for contributors)

The shipped application is assembled from the part files in this folder:

```
./build_app.sh
```

concatenates the part files in this folder into `../Grandmothers_Voice_by_Kayock.html` and runs a syntax
check on the extracted script. `make_guide_html.py` regenerates the HTML
user guide from the Markdown guide, and `make_samples.js` re-extracts the
synthetic sample family and sample media from the app source (so the
samples always match the app).

Part layout:

| File | Contents |
| --- | --- |
| `part1_head.html` | `<head>` + both themes' CSS |
| `part2_body.html` | builder page markup |
| `part3_core.js` | encoding detection, tokenizer, GEDCOM parser, dates (DOM-free core) |
| `part4_analysis.js` | tree identity, privacy, duplicates, refinement merge, reports, ZIP writer |
| `part5_exports.js` | media planning, vault builders, booklet generator |
| `part6_explorer_css.js` | explorer stylesheet |
| `part6_explorer_a–d.js` | explorer template + runtime |
| `part7a–d_*.js` | builder UI wiring, media session, exports, refine tab, booklet tab, sample family, tour |

Everything between the `CORE-BEGIN` / `EXPORTS-END` markers must stay
DOM-free — the test harness (`tests/run_tests.mjs`) loads those functions
verbatim from the shipped HTML.
