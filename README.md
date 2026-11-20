# Grandmothers voice by Kayock

**A free, open-source, privacy-first family history studio.**  
*Turn a family tree into something people can actually walk through.*

Grandmothers voice by Kayock transforms GEDCOM family history files into self-contained, interactive HTML family explorers, printable family story booklets, and Obsidian/Logseq research vaults. It runs **fully offline** in a browser, without accounts, subscriptions, advertisements, telemetry, or a development server. Your original GEDCOM file is never modified.

## Features

- **GEDCOM importer:** Detects GEDCOM 5.5.1/7.0 and common encodings, with diagnostic and source-quality reports.
- **Interactive family explorer:** Navigate ancestors, descendants, relationships, family events, timelines and recorded places.
- **Photos and documents:** Link local media files to GEDCOM records, including media attached to family events, and create offline family galleries.
- **Family Story Booklets:** Printable narratives with life events, family connections, photographs, research and sources.
- **Tree Refinement Mode:** Collect memories, corrections, research requests and possible duplicate suggestions without editing the imported GEDCOM.
- **Collaborative refinement:** Export or import refinement backups and review conflicts.
- **Research vaults:** Export family history as linked Markdown for Obsidian and Logseq.
- **Privacy before sharing:** Apply living-person redaction, abbreviation or exclusion across generated content; review exports carefully before sending.
- **Two themes:** Dark · Kayock Purple and Light · Southwest Heritage.

## Screenshots

The full downloadable project includes three screenshots in the `screenshots/` directory:

- Southwest Heritage light theme
- Southwest Heritage export and privacy settings
- Kayock Purple dark theme

## Quick start

1. Download and extract the release ZIP.
2. Double-click `Grandmothers_Voice_by_Kayock.html` or use the included Windows, Linux or macOS launcher.
3. Click **Load Sample Family** to explore the program, or select your own `.ged` file.
4. Add photos and documents, then generate your interactive explorer, Markdown vault or story booklet.

**No installation required.** Node.js is needed only to run tests or rebuild the source.

## Development

The application ships as a self-contained HTML file, with modular source in `build/` and automated tests in `tests/`.

```bash
node tests/run_tests.mjs
bash build/build_app.sh
```

The v2.1.1 release includes a 95-test automated suite. The tests use synthetic genealogy fixtures; users should still verify exports from their own genealogy software.

## Privacy

All processing is local. The original GEDCOM is read-only. Media files are included in exports only when you choose to package them. Living-person identification uses heuristics, so **always inspect exports before sharing**, especially when they contain living relatives or children.

Read `PRIVACY.md` in the distribution for details.

## Limitations

- Very large embedded-media explorers may become large HTML files; use the HTML + media ZIP export instead.
- Uncommon ANSEL characters and legacy inline GEDCOM BLOB media are not fully supported.
- The migration view lists historical place names but does not invent map coordinates.
- Browser folder selection, printing and layout may vary across systems.

## Contributing and license

Contributions and reproducible bug reports are welcome. Please use synthetic or anonymized GEDCOM fixtures—never post real private family records or photos in public issues.

This project is released under the **MIT License**; see [LICENSE](LICENSE).

**Preserve their stories. Explore your roots. Share what matters.**
