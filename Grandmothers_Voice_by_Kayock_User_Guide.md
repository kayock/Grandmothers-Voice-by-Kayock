# Grandmothers voice by Kayock — User Guide (v2.0)

*Turn a family tree into something people can actually walk through.*

Grandmothers voice by Kayock is an offline Family Legacy Studio. It reads a GEDCOM
`.ged` file exported from Ancestry or another genealogy program and creates
things your whole family can use — an interactive explorer, photo galleries,
printable keepsakes and research vaults — without ever modifying your
original file, without an internet connection, and without accounts,
subscriptions or ads.

---

## Contents

1. [Getting started](#1-getting-started)
2. [Choosing and parsing a GED file](#2-choosing-and-parsing-a-ged-file)
3. [Diagnostics: checking your data](#3-diagnostics-checking-your-data)
4. [The Media Library](#4-the-media-library)
5. [Privacy and export profiles](#5-privacy-and-export-profiles)
6. [Generating the Family Story Explorer](#6-generating-the-family-story-explorer)
7. [Using the Family Story Explorer](#7-using-the-family-story-explorer)
8. [Tree Refinement Mode: collecting family memories](#8-tree-refinement-mode-collecting-family-memories)
9. [Merging everyone's notes (Refine tab)](#9-merging-everyones-notes-refine-tab)
10. [Duplicate person suggestions](#10-duplicate-person-suggestions)
11. [The Family Story Booklet](#11-the-family-story-booklet)
12. [Obsidian and Logseq vaults](#12-obsidian-and-logseq-vaults)
13. [Troubleshooting](#13-troubleshooting)
14. [Frequently asked questions](#14-frequently-asked-questions)

---

## 1. Getting started

**The fastest way to learn** is to click **Load Sample Family** in the
header. It loads a completely synthetic family (the Williams family of
Willow Creek — every person, date and photo is invented for the demo, four
sample images included) so you can try every feature safely.

Launching the app:

| Platform | How |
| --- | --- |
| Windows | Double-click `RUN_GED_LEGACY_BUILDER.bat` (or the HTML file itself) |
| macOS | Double-click `RUN_GED_LEGACY_BUILDER.command` (or the HTML file) |
| Linux | Run `RUN_GED_LEGACY_BUILDER.sh`, or open `Grandmothers_Voice_by_Kayock.html` in your browser |

No installation, no server, no internet. If you extracted the ZIP, keep the
files together in one folder.

The first time the app opens, a short **guided introduction** appears — five
screens explaining each tab. You can replay it any time from **Help**.
Keyboard users: `Alt+1`–`6` switches tabs, `Alt+P` parses, `Alt+T` toggles
the theme.

### Choosing your theme

Click **Theme** in the header to switch between:

- **Dark · Kayock Purple** — the original deep-purple night look.
- **Light · Southwest Heritage** — a warm heritage palette inspired by the
  American Southwest: Desert Sand and Warm Ivory surfaces, Deep Mesa Brown
  text, Southwestern Turquoise buttons and links, Adobe Clay and Terracotta
  accents, and Sunlit Ochre highlights. Each app (builder and explorer)
  remembers your choice separately, and the printed booklet uses a
  light, ink-friendly design drawn from the same palette.

## 2. Choosing and parsing a GED file

1. Drag a `.ged` file onto the drop zone (or click it and choose the file).
2. The app reports the detected **character encoding** (UTF-8, ANSEL,
   Windows-1252…) — GEDCOM files from different programs use different
   encodings, and the detection is shown so you know nothing was guessed
   silently.
3. Click **Parse GED**. A progress bar shows large files advancing, and a
   cancel button appears while parsing.
4. The status panel shows people, families, notes, sources, media
   references, life events, the parse time, and a **tree identity** — a
   short fingerprint of your exact file used to keep family notes attached
   to the right tree.

If Ancestry gave you a `.zip`, unzip it first and choose the `.ged` inside.

**Set the explorer title** (e.g. "The Williams Family") and an optional
**start person** — the person the explorer opens first. **Your name** is
saved with any notes you coordinate, only inside your own exports.

## 3. Diagnostics: checking your data

The **Diagnostics tab** is your data health check. It never changes your
file — it reports what a careful genealogist would want to double-check:

- **Errors**: malformed lines, duplicate `@xref@` ids, records missing ids.
- **Warnings**: references to people/families/notes that don't exist,
  someone listed as both child and spouse in the same family, the same
  person as both husband and wife, a parent born less than 13 years before
  a child, birth recorded after death, unreadable dates.
- **Info**: unsupported tags that are preserved but not specially
  interpreted, people with no family links, legacy `BLOB` media, and more.

Use the filter buttons to focus on one severity, and **Download Diagnostics
Report** to save the full list as Markdown or JSON for your genealogy
program's review.

The **Source quality** section shows what percentage of people and events
carry citations, the mix of evidence quality recorded in the file (direct,
secondary, circumstantial, weak), and a table of people whose events have
no citations — with a suggestion for what to look for. It never invents
facts; it only points at missing evidence.

## 4. The Media Library

GEDCOM files usually contain *references* to photos and documents, not the
files themselves. The Media Library reconnects them:

1. Click **Import media folder…** and choose the folder (or folders) where
   your photos and scans live — the app reads names only, and everything
   stays on your computer.
2. References are matched by exact path first, then by filename, then by
   filename without extension. Matched items appear in the gallery preview.
3. Anything unmatched stays listed as **unmatched** with its original GED
   path — nothing is dropped. Use **Link file to a media reference…** to
   connect a file manually.
4. Web URL references are kept as inert links; the app never fetches
   anything from the network.

Photos, PDFs, audio and video are supported wherever your browser supports
them. Duplicate filenames, deep paths, and unusual formats are handled
gracefully — the library reports what matched, what didn't, and what is an
external link.

## 5. Privacy and export profiles

Everything is generated on your computer, but exports can travel — so the
**Build tab** has privacy options applied to *every* generated file:

- **Keep everyone** — private local use.
- **Redact living people** — names stay, but dates, places, notes, sources
  and media of anyone estimated to be living are hidden.
- **Redact names too** — living people become initials ("J.D.").
- **Exclude living people** — replaced with "Private (living person)"
  placeholders so the family structure stays readable.

"Possibly living" means: no death recorded **and** birth (or earliest
event) within the threshold years of today (default 100). It is an
estimate — always review before sharing. A strict option treats people with
no dates at all as living.

**Export profiles**:

- **Full archive** — everything, largest files.
- **Family sharing edition** — smaller files: source transcripts trimmed,
  photographs downscaled (done locally, offline), audio and video not
  embedded in the single-file explorer (use the HTML + media ZIP for those).

## 6. Generating the Family Story Explorer

Click **Generate Interactive HTML** to download a single self-contained
file. Every person page includes their events (with dates, places,
addresses, notes and citations), shared family records, photo galleries
embedded, and Tree Refinement Mode.

For larger media collections, **HTML + Media ZIP** packages the explorer
with a `media/` folder instead of embedding — extract the ZIP and open the
HTML inside.

Also available: **Download Parsed JSON** (for tools), **Export Obsidian
Vault ZIP**, **Export Logseq Vault ZIP**, **Download One Markdown File**,
and report downloads (diagnostics, source quality).

## 7. Using the Family Story Explorer

Open the generated HTML file in any browser (double-click works). The
purple interface matches the builder, with a **light theme** toggle in the
header.

- **Person tab** — the heart: biography facts, parents, spouse/partner,
  children and siblings as clickable branches, the full life-event list
  with notes, citations and media, and Tree Refinement Mode (below).
- **Family Tree tab** — an interactive diagram centred on the selected
  person: ancestors above, descendants below. Drag to pan, scroll or the
  buttons to zoom, click anyone to make them the centre, and use *More
  ancestors/descendants* to grow the view generation by generation. Living
  people have dashed outlines.
- **Timeline tab** — every recorded event in order, grouped by decade and
  year. Uncertain dates (ABT, BEF, "between 1920 and 1925") keep their
  qualifiers — the app never pretends a vague date is precise. Filter to
  the selected person or search by name, event, place or date.
- **Places tab** — every recorded place with event and people counts.
  Toggle **Migration view** to see the selected person's places in
  chronological order — a life route built only from what the GED says
  (the app does not invent map coordinates).
- **Gallery tab** — all photos and documents grouped by person. Click any
  item for a closer look and a **Download original** button.
- **About tab** — which GED, which version, the tree identity, the privacy
  mode that was applied, diagnostics summary, and privacy notes.

Keyboard: `/` focuses search · `1`–`6` switch tabs · arrow keys move
through results · `Enter` opens · `Esc` closes dialogs · `T` toggles theme.

## 8. Tree Refinement Mode: collecting family memories

On every person page (when included at generation time) family members can
add:

- Flags: **Correction needed**, **Possible duplicate**, **Needs
  source/proof**, **Photo/document to find**.
- A **memory or family story** — the irreplaceable stuff.
- **Corrections, questions and research notes**.

Notes **autosave quietly** in that browser on that device (a small status
line shows the last save time — there are no popups). Notes carry the
contributor's name, timestamps, and history.

Family members click **Export JSON backup** and send the file back to the
person coordinating the project. They can also export a readable
**corrections report** (Markdown) and run **duplicate suggestions** for the
person they're viewing.

**Importing a backup** in the explorer shows a review screen: identical
notes are skipped, conflicting notes are shown side by side (keep current /
use imported / keep both with attribution), and backups from a *different*
tree carry a loud mismatch warning that must be confirmed before anything
is attached — so notes never land on an unrelated family.

## 9. Merging everyone's notes (Refine tab)

The coordinator collects backups from relatives and opens the **Refine**
tab in the builder:

1. **Import refinement backup(s)…** — choose any number of JSON files.
2. The merge review shows what's new, what's identical, and every conflict
   side by side with attribution. Choose per note; then **Apply reviewed
   merges**.
3. Backups exported from a *different* GED are held back behind an explicit
   "I verified it belongs to this family" confirmation.
4. **Export merged refinement backup** produces one combined JSON to load
   into any explorer copy — so a single shared explorer can contain the
   whole family's contributions.
5. The **Notes on this device** table shows everything stored locally,
   with delete buttons.

## 10. Duplicate person suggestions

The Refine tab scans the parsed tree for records that may describe the same
person: same name plus shared parents, spouse, birth year or birth place
(and penalises mismatched sex). Each suggestion lists its **evidence** and a
**confidence** level (high / medium / low).

Nothing is ever merged automatically. **Flag pair in notes** records the
suggestion into both people's refinement notes, and the **suggested GEDCOM
changes** report (Markdown + JSON) collects duplicates, flagged notes with
attribution, and data conflicts — a ready-made review list for your
genealogy software.

The **photo/document request checklist** gathers everyone flagged
"Photo/document to find" plus custom requests you add, ready to download
and hand out at a family gathering.

## 11. The Family Story Booklet

The **Booklet tab** creates a printable keepsake:

- **Scope**: one individual, a family branch (a couple plus a chosen number
  of descendant generations), or a whole surname.
- **Includes**: photographs & documents, family memories (with the
  contributor's name), source references with evidence quality, chronology
  tables, and research questions / missing-evidence items.
- **Preview** opens in a print-ready window; **Print / Save as PDF** uses
  your browser's print dialog (choose *Save as PDF* as the printer), or
  **Download booklet HTML** to keep the keepsake file itself.

Everything in the booklet comes from the GED and the family's own notes —
uncertain dates are marked uncertain, missing items are marked missing, and
nothing is invented. If a privacy mode is active the booklet applies it and
says so on the page.

## 12. Obsidian and Logseq vaults

The vault exports give long-term researchers a Markdown home for the tree:

- **Obsidian**: `People/` pages with YAML frontmatter, `[[wiki links]]` to
  relatives, `Indexes/` (People A–Z, Surnames, Places, Timeline, Sources,
  Research Questions), and a `media/` folder — photos embed with
  `![[media/photo.jpg]]`.
- **Logseq**: outliner-friendly pages in `pages/`, `[[page references]]`,
  and media in `assets/` with the same style of embeds.

Unzip the vault into your vault folder and open it in the app. The included
README.md inside the vault explains the layout.

## 13. Troubleshooting

**The tool doesn't see my file** — make sure it ends in `.ged`. Unzip
Ancestry's ZIP first.

**Names look wrong for accented characters** — check the encoding note
under the drop zone. ANSEL and Windows-1252 are detected automatically;
very old IBM-PC files are decoded with the closest available table.

**Parse is slow** — very large trees take a moment; the progress bar shows
progress and Cancel works. 10,000 people parse in under a second on a
typical computer.

**Some photos show "file not provided"** — the GED references a file that
wasn't in your imported folders. Import the right folder, or link the file
manually in the Media Library.

**The explorer file is huge** — it embeds media. Use the HTML + Media ZIP
export for large collections.

**My notes disappeared** — notes live in the browser that made them, on
that device. Export JSON backups regularly; merge them in the Refine tab.

**The original GED was never touched** — truly. The app only reads it; the
automated tests verify byte-for-byte unchanged files.

## 14. Frequently asked questions

**Is my data uploaded anywhere?** No. The application contains no network
code at all. See PRIVACY.md.

**Does it edit my Ancestry tree?** No. It exports *suggestions* for humans
to review.

**Can two people work together?** Yes — that's the refinement backup flow
(explorer → JSON backups → Refine tab merge → merged backup).

**What GEDCOM versions work?** 5.5.1 and 7.0 are detected and handled;
other versions are parsed with 5.5.1 rules and reported.

**Is it really free?** MIT-licensed, forever. No paid tiers, no ads, no
accounts, no feature restrictions.
