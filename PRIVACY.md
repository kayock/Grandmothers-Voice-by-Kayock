# Privacy statement

**Grandmothers voice by Kayock 2.1** is designed so that your family's data stays
yours. This statement explains exactly what the software does with data.
It is deliberately short because the answer to almost every question is
"nothing leaves your computer".

## What the application collects

**Nothing.** There is no telemetry, no analytics, no crash reporting, no
update check, and no account. The application contains no network code at
all: once you have the files, it cannot contact the internet even if one is
available.

## Where your data goes

- **Your GEDCOM file** is opened read-only. It is never modified,
  overwritten, renamed, or moved. (Verification: the automated test suite
  and manual hash checks confirm the file is byte-for-byte unchanged after
  a full working session.)
- **Imported photos and documents** stay in the folders you chose. They are
  read to embed or copy them into the exports you personally generate.
- **Refinement notes** (memories, corrections, duplicate flags) are stored
  in your browser's *local storage* on that device, keyed to the specific
  GED file by its content hash. They are not synced anywhere. Clearing
  browser data removes them — export JSON backups to keep them safe.
- **Exports** (explorer HTML, ZIP vaults, booklets, reports) are written by
  your browser's download system, exactly like any file you save yourself.

## Sharing safely

When you share an exported file with relatives, remember:

1. The **privacy options** (redact / exclude living people) are applied when
   the file is generated. People are classified as "possibly living" when no
   death is recorded and their birth or earliest event falls within the
   configured threshold (default 100 years). This is an estimate — always
   review a sharing export before sending it.
2. The **Family sharing edition** profile trims source transcripts and
   downscales photographs, but it is not a privacy feature by itself —
   combine it with a privacy mode.
3. Exported reports (diagnostics, source quality, suggested changes) contain
   your tree's data plus the author attribution and timestamps your family
   members typed into their refinement notes.

## Children's data and sensitive data

The software cannot detect who is living beyond the date heuristics above,
and cannot detect sensitive facts. If your tree contains sensitive
information about living people, use the redact or exclude modes — or share
nothing — unless you are certain every recipient should see it.

## Third parties

None. The application has no runtime dependencies, no web fonts, no CDN
assets, and no embedded third-party services. See THIRD_PARTY_NOTICES.md
for the (very short) list of technology it is built on.

## Contact

This is an open-source project; see CONTRIBUTING.md for how to raise
privacy-related issues publicly without attaching real family data.
