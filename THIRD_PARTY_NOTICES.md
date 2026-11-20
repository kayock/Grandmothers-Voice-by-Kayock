# Third-party notices

Grandmothers voice by Kayock 2.1 is a **single self-contained HTML file** written in
plain JavaScript with no runtime dependencies, no frameworks, and no bundled
third-party code.

## Technologies used (not distributed with this project)

| Technology | Use | License |
| --- | --- | --- |
| Your web browser (Chromium, Firefox, Safari, Edge) | Runs the application; provides the DOM, FileReader, Canvas, TextDecoder, CompressionStream, Blob and download APIs | Per vendor |
| Node.js ≥ 18 | Only needed to run the automated test suite (`tests/run_tests.mjs`) | MIT-style (Node license) |
| Python 3 | Only used by the test suite to independently verify generated ZIP files | PSF |

## Standards implemented

- GEDCOM 5.5.1 and GEDCOM 7.0 (FamilySearch specifications) — implemented
  from the published specifications; no code taken from other GEDCOM
  libraries.
- ZIP file format (PKWARE APPNOTE) — the ZIP writer is original code.
- ANSEL / MARC-8 extended Latin mapping — original implementation of the
  published character table.

## Sample media

The images in `samples/media/` and embedded in the synthetic sample family
are original synthetic artwork created for this project and are distributed
under the same MIT license as the rest of the project. No photographs of
real people are included anywhere in this repository.
