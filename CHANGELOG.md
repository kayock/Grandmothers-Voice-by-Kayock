# Changelog

All notable changes to **Grandmothers voice by Kayock** (formerly
**Kayock Legacy Builder** — the previous name is kept here for release
history) are documented here. The project follows
[Keep a Changelog](https://keepachangelog.com/) conventions and uses
semantic versioning.

## [2.1.1] — 2026-11-20

### Fixed — family-event media export
- `collectMediaFileRefs()` in the export pipeline did not traverse media
  attached to **family events** (`families[*].events[*].media`), so a
  marriage photograph attached to a family record's MARR event never
  reached the media-matching stage and was silently missing from the
  self-contained explorer, the HTML + media ZIP, the Obsidian and Logseq
  vaults, and the Family Story Booklet. Family-event media is now
  collected exactly like person-event media; `addRef()` dedupes by file
  string, so a file shared by several people/events still produces a
  single asset. Matching rules, filenames, media types, binary packaging
  and missing-file handling are unchanged.
- The booklet gallery and the Obsidian/Logseq family-record sections now
  also render family-event media (with the event label), matching where
  the event itself is displayed.
- **Privacy hardening found during the repair:** in Exclude mode, a family
  whose members were ALL excluded no longer skipped its privacy filtering
  (previously the marriage event/date/place of an excluded couple could
  survive in the exported family record). Excluded members now count as
  living-involved, so privacy-type family events and their media are
  filtered consistently in Redact/Exclude modes. Global media-record
  scanning remains absent; export builds remain non-mutating (regression
  tested).
- The builder's Media Library now refreshes immediately when the privacy
  mode changes (previously it kept showing the previous mode's rows until
  the next parse), so users always see which attachments are excluded.

### Added
- 12 automated regression tests (`family_events_media.ged` fixture):
  marriage photograph on a family event, scanned document on a family
  event, one event with multiple media, a file shared by two events
  (single asset), a missing media file (stays an honest reference), and a
  private family-event attachment (excluded in restricted modes) — all
  verified against the CONTENTS of the generated explorer HTML, media
  ZIP, Obsidian vault, Logseq vault and booklet, including base64-decoded
  media bytes. Test suite is now 95 tests.

## [2.1.0] — 2026-11-20

### Renamed
- The application is now **Grandmothers voice by Kayock** (exact public
  spelling), version 2.1.0. Entry point is `Grandmothers_Voice_by_Kayock.html`;
  the old `GED_Legacy_Builder.html` is kept as a tiny offline redirect stub,
  and all launchers (new `RUN_GRANDMOTHERS_VOICE.*` plus the legacy
  `RUN_GED_LEGACY_BUILDER.*`) open the new file. Browser storage keys
  (`kayockNotebook2:`, `kayockBuilderTheme`, `kayockTheme`, `kayockAuthor`,
  …) and the stable tree-identity algorithm are unchanged, so existing
  refinement backups, saved notes and theme preferences keep working.

### Fixed — privacy leaks (independent review findings)
1. **Privacy information leaking into generated HTML** — the explorer's
   source-quality report was built from the *unfiltered* parsed data, so
   living people appeared in embedded quality rows. The whole export
   pipeline (quality report, diagnostics, source/note/media/repository
   records, booklet research rows, JSON payloads) is now derived from the
   privacy-filtered export view only. Diagnostics that name a private
   person are omitted (with a count), and the generated HTML contains no
   private names in visible text, embedded JSON, or metadata.
2. **Photographs bypassing privacy restrictions** — media matching used to
   scan the global `mediaRecords` collection, so photos/scans/audio/video
   belonging solely to private or excluded individuals could still be
   exported. Media selection now collects only references reachable from
   permitted people, families and events; private-only media records are
   never selected. Unlinked records are still listed transparently in the
   builder's Media Library as "unlinked — excluded from exports". Media
   titles, filenames and paths are filtered with the same rules.
3. **Export settings modifying working data** — disabling notes, sources or
   media (and privacy filtering) shared nested objects with the master
   parsed data and could erase information in memory. All exports now go
   through a pure, non-mutating transformation (`buildExportData()` in the
   core): structural deep copies (no JSON cloning), toggles applied to the
   copies only, privacy-filtered and unrestricted exports cannot affect
   each other, and repeated exports in different modes are consistent.
   Regression tests snapshot the master data byte-for-byte across mode
   transitions and toggle changes.

### Added — Southwest Heritage light theme
- Complete redesign of the light theme: Desert Sand background, Warm Ivory
  cards, Deep Mesa Brown text, Southwestern Turquoise primary actions,
  Adobe Clay/Terracotta accents, Sunlit Ochre selected details and Sage
  Green supporting tones — an intentional heritage look with restrained
  desert-horizon gradients (no sacred or tribal imagery).
- The theme is applied consistently across the builder, explorer, family
  tree (turquoise connection lines, adobe spouse links), timeline, places
  and migration views, gallery and lightbox, Tree Refinement Mode,
  diagnostics, reports, modal dialogs and the Family Story Booklet.
- Booklet print design rewritten: warm ivory screen presentation with an
  adobe double-rule cover frame and an original mesa-horizon ornament;
  print output stays light to save printer ink.
- WCAG AA contrast verified programmatically for every text/background
  pair (all pass; shades darkened only where required). Reduced-motion
  preference respected; statuses never rely on color alone (badges carry
  text labels).
- Theme switcher labels: **Dark · Kayock Purple** and **Light · Southwest
  Heritage**. Preference persists per app (builder and explorer
  separately); the dark theme is unchanged.

### Fixed
- Booklet photos did not embed when generated through the Booklet tab UI
  (the prepared media plan was never attached) — photos now embed again.
- In the light theme, secondary/ghost buttons and unselected tabs kept
  readable dark text while primary gradient buttons use white.

## [2.0.0] — 2026-11-20
The first public open-source release (MIT). Upgrades the original
GED-to-explorer tool into an offline Family Legacy Studio while preserving
its single-file architecture, read-only import contract, and all original
exports.

### Added — GEDCOM reliability (Phase 1)
- GEDCOM 5.5.1 and 7.0 detection with version reporting in the log, status
  panel, diagnostics reports and the explorer About tab.
- Character-encoding detection: BOM sniffing, `1 CHAR` handling (ANSEL,
  UTF-8/16, ANSI/Windows-1252, IBM PC), strict UTF-8 validation with
  fallback decoding, and an ANSEL decoder for common diacritics (mapped with
  Unicode NFC composition). Encoding notes are surfaced, never hidden.
- GEDCOM tokenizer fixed to the one-space field rule: `CONC`/`CONT` values
  with leading spaces are now preserved exactly (the old parser silently
  stripped them).
- Event-level notes, sources (with `PAGE`, `QUAY` evidence quality and
  `DATA.TEXT`), and media references are preserved for every event type;
  person, family, and shared (`@N..@`) note records all resolve.
- Multi-file `OBJE` records (GEDCOM 7) preserved as file lists; inline
  (non-pointer) `OBJE` media kept; legacy 5.5.1 `BLOB` form flagged
  informationally instead of dropped.
- Associations (`ASSO`), occupations, residences, LDS ordinances and other
  life events captured as typed events with labels.
- Diagnostics report: unresolved references, duplicate xrefs, missing
  record ids, malformed lines, level-gap recovery, same-person-both-roles,
  child-is-spouse, parent-age sanity checks, birth-after-death,
  unparseable dates, unsupported tags — exportable as Markdown and JSON.
- Source quality / missing-evidence report: citation coverage percentages,
  QUAY evidence mix, and a prioritised list of people whose events have no
  citations. No facts are ever invented to fill gaps.
- Automated regression suite (`tests/run_tests.mjs`, 61 tests) running the
  real shipped code against synthetic GEDCOM fixtures covering 5.5.1, ANSEL,
  Windows-1252, GEDCOM 7, malformed files, and a 10,000-person tree.

### Added — Media & document library (Phase 2)
- Import media folders (`webkitdirectory`) or individual files; GED `OBJE`
  references are matched by exact path, filename, or filename-without-
  extension, with a manual "link file…" fallback.
- Gallery previews inside the builder; individual galleries on every person
  and family page in the explorer; a whole-file Gallery tab with lightbox
  and original-file download.
- Photographs, PDFs, audio, video, and text are supported wherever the
  browser supports them; unsupported formats keep a labelled reference.
- Missing files, duplicate names, unusual paths and unsupported formats are
  handled gracefully: references are always preserved and clearly marked.
- Self-contained single-file HTML export (media embedded as data URIs, with
  size guardrails) and a packaged HTML + `media/` ZIP export for larger
  collections.
- Obsidian and Logseq vault exports now include the actual media files
  (`media/` or `assets/` folders) with working relative embed links.
- ZIP writer upgraded: binary-safe entries, optional DEFLATE via
  `CompressionStream('deflate-raw')` with STORE fallback, UTF-8 names,
  filename sanitising (traversal, reserved device names, duplicate dedupe)
  and CRC32 verified by an external ZIP reader in the test suite.
- Filenames and displayed content are sanitised; media is never fetched
  from the network (external URL references are kept as inert links).

### Added — Interactive family exploration (Phase 3)
- Family Tree view: interactive person-centred ancestor/descendant diagram
  with pan, zoom, generation controls, progressive "more ancestors /
  descendants" loading, living-person dashed outlines, and a display cap
  with honest counters.
- Timeline view: searchable chronological event list grouped by decade and
  year, with uncertain dates (ABT, EST, BEF, AFT, BET…AND, FROM…TO, dual
  years) preserved exactly as recorded — never converted to precise dates.
- Places view: place index with event/people counts, per-place event lists,
  and a migration view ordering the selected person's recorded places
  chronologically. No map coordinates are invented.
- All three views synchronise with the selected person; large datasets are
  rendered in bounded pages (250 timeline rows, 50 place rows, 400 tree
  nodes) with "show more" controls.

### Added — Collaborative Tree Refinement (Phase 4)
- Refinement notes now carry author attribution, created/updated
  timestamps, and a short history.
- Versioned JSON backups (v2 schema) record the stable tree identity —
  a content hash + counts — so notes can never be silently attached to an
  unrelated GED; mismatched backups require explicit confirmation.
- Backup import with conflict review: per-note "keep current / use
  imported / keep both (with attribution)" choices; identical notes are
  auto-skipped; nothing is merged without review.
- Duplicate-person suggestion tool with evidence lists and high / medium /
  low confidence scores (same name, birth year/place, shared parents or
  spouse; sex mismatch penalises). Suggestions are never auto-merged.
- Photo/document request checklist generated from refinement flags plus
  custom requests; exportable as Markdown.
- Structured suggested-GEDCOM-changes report (Markdown + JSON) combining
  duplicate suggestions, flagged notes with attribution, and data
  conflicts.
- Quiet autosave in the explorer (debounced, no popup alerts — only a
  subtle toast and a "Saved HH:MM:SS" status line).

### Added — Family Story Booklet (Phase 5)
- New printable keepsake generator: choose an individual, a branch (with
  generation depth), or a whole surname.
- Booklet includes biography from the GED, family relationships,
  chronological tables, photographs and documents, family memories with
  attribution, source references with evidence quality, and research
  questions / missing-evidence items.
- Carefully designed A4 print stylesheet (cover page, page-break control,
  orphan protection) — print or Save as PDF from the browser preview.
- Every fact comes from the imported GED or the family's own notes;
  uncertain dates are marked as uncertain.

### Added — Performance & experience (Phase 6)
- Baseline measured: 10,000 people / 3,340 families parse in ~0.4 s;
  duplicate scan optimised from ~5.6 s to ~0.66 s (precomputed keys);
  explorer HTML generation ~0.07 s.
- Search results, timeline and places render in bounded slices; heavy
  exports stream media preparation with a progress bar and a working
  cancel button for parse and ZIP stages.
- Optional light theme with one-click toggle; dark theme remains default.
- Keyboard accessibility: skip link, focus-visible outlines, `/` search
  focus, arrow-key result navigation, `1`–`6` tab switching, Enter
  activation for generated controls, Escape closing dialogs; ARIA roles
  and labels throughout; responsive layouts down to phone widths.
- Synthetic sample family (18 people, 7 families, notes, sources, media,
  a duplicate person and uncertain dates) with 4 sample images and a
  guided first-run introduction in both the builder and the explorer.
- Export profiles: **Full archive** and **Family sharing edition**
  (transcripts trimmed, photos downscaled offline via canvas, audio/video
  not embedded).
- Privacy options applied to every generated file: keep everyone /
  redact living people / redact names to initials / exclude living people,
  with a configurable "possibly living" year threshold and a strict
  no-dates mode. Placeholder people keep family structure readable.

### Added — Open-source release (Phase 7)
- MIT LICENSE, updated README and user guide, INSTALL.md, CONTRIBUTING.md,
  CHANGELOG.md (this file), PRIVACY.md, THIRD_PARTY_NOTICES.md.
- Sample synthetic GEDCOM and four synthetic sample images in `samples/`.
- Linux/macOS launchers (`RUN_GED_LEGACY_BUILDER.sh`, `.command`).
- Application version 2.0.0 visible in the builder header, the explorer
  footer, and every generated report.

### Fixed (inherited from 0.x)
- `cleanName` now renders `John/Doel/` as **John Doel** (the old parser
  produced `JohnDoel`).
- `CONT` on an empty-valued note no longer produces a leading newline.
- Duplicate `@xref@` records no longer overwrite earlier data silently —
  a DUPLICATE_XREF diagnostic is raised.
- Notes pointing at missing shared-note records are reported
  (UNRESOLVED_NOTE) instead of disappearing.

## [0.2.0] — original release
- Initial single-file tool: GED parse (basic), interactive HTML explorer
  with search and Tree Refinement Mode, Obsidian/Logseq markdown vault
  ZIPs, one-file Markdown export, parsed JSON export, custom STORE-only
  ZIP writer.
