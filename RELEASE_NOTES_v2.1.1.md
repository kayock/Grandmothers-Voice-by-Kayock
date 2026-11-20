# Grandmothers voice by Kayock v2.1.1

Free, MIT-licensed, standalone offline genealogy and family-history studio.

## Fixes since v2.1.0

- Include media attached to GEDCOM family events such as marriages in eligible explorer, booklet, and Markdown-vault exports.
- Prevent privacy-filtered family-event metadata or media from leaking when all members of a family are excluded.
- Refresh the Media Library immediately when export privacy settings change.
- Preserve the read-only GEDCOM import, two themes, and backwards-compatible refinement backups.

## Run

Double-click `Grandmothers_Voice_by_Kayock.html` from an extracted folder, with no internet connection or installation.

## Tests

`node tests/run_tests.mjs`

The source release was reported with 95 passing automated tests, including 12 new tests introduced for the family-event media and privacy fixes.

## Screenshots

See `screenshots/` and the project README.

## Caveats

Living-person detection is heuristic: review family information before sharing. Some uncommon GEDCOM media/encodings are reported but not embedded. Safari, Firefox, native print dialogs, and commercial vendor GEDCOMs were not covered by Z.AI's hosted-browser verification.
