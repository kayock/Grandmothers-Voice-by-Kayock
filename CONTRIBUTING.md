# Contributing to Grandmothers voice by Kayock

Thank you for wanting to improve this little offline studio! It is a fully
free, MIT-licensed project: no paid tiers, no accounts, no telemetry, no ads —
and contributions must keep it that way.

## The ground rules

1. **Keep it offline.** The application must never contact the network. No
   CDNs, no web fonts, no analytics, no auto-updaters. New dependencies that
   require a build step or a package manager are almost certainly out of
   scope — the app is one self-contained HTML file on purpose.
2. **Never modify the imported GED file.** The read-only import contract is
   the heart of the tool. Corrections, memories and merge suggestions are
   exported as reports for human review.
3. **Never invent genealogical data.** Reports may point out what is missing;
   they must never fabricate dates, relationships, places or sources.
4. **Keep the purple/dark visual identity**, and keep every UI addition usable
   with a keyboard and readable in both the dark and light themes.
5. **Respect privacy defaults.** Features that share data must honour the
   living-person privacy options before anything leaves the device.

## Project layout

```
Grandmothers_Voice_by_Kayock.html      the entire application (builder + explorer template)
RUN_GED_LEGACY_BUILDER.bat   Windows launcher
RUN_GED_LEGACY_BUILDER.sh    Linux / macOS launcher
RUN_GED_LEGACY_BUILDER.command  macOS double-click launcher
tests/
  run_tests.mjs              automated test suite (Node 18+, no deps)
  fixtures/make_fixtures.js  synthetic GEDCOM fixture generator
  fixtures/*.ged             generated fixtures
samples/                     synthetic sample family + sample media
```

## Building

The app is developed as small part files and concatenated:

```
scripts/build_app.sh         (in the development workspace; concatenates the
                              parts and runs a syntax check)
```

If you are editing the shipped `Grandmothers_Voice_by_Kayock.html` directly, that is
fine too — just run the test suite afterwards.

## Running the tests

```
node tests/run_tests.mjs            full suite (should print ALL TESTS PASSED)
node tests/run_tests.mjs --perf     adds the large-tree performance benchmark
node tests/fixtures/make_fixtures.js  regenerates the synthetic fixtures
```

The suite extracts the DOM-free core functions from the shipped HTML and runs
them verbatim, so it always tests the real code. When you add a feature that
has testable logic (parsing, privacy, matching, merging, ZIP, reports…),
please add tests next to it.

New GEDCOM edge cases are especially welcome: export a *synthetic* snippet
that exercises the bug (never a real family's data) and add it to
`tests/fixtures/make_fixtures.js`.

## Manual testing checklist for UI changes

- Open `Grandmothers_Voice_by_Kayock.html` by double-click (no server) in Chrome,
  Firefox and Safari if available.
- Load the **Sample Family**, parse, and walk through every tab.
- Generate the explorer and check: person page, Family Tree, Timeline,
  Places, Gallery, About, Tree Refinement Mode, backup import with a
  conflicting note, first-run tour, light theme, keyboard navigation
  (`/`, `1`–`6`, `Esc`).
- Test at a phone-width viewport (~375px) — layouts must not overflow.
- Verify the original `.ged` file's hash before and after a full session.

## Reporting issues

Please include: your browser and OS, whether you opened the file by
double-click or a server, the diagnostic report (`Download Diagnostics
Report`) produced from a *synthetic* GED that reproduces the problem, and
what you expected to happen. Do not attach real family files to public
issues — sanitise them first.

## Code style

Plain ES2019+ JavaScript, no build step, no frameworks. Keep functions
between the `CORE-BEGIN` / `EXPORTS-END` markers DOM-free so the test
harness can load them. Match the existing comment style and keep the file
readable for non-specialist contributors — this project is maintained by and
for families.
