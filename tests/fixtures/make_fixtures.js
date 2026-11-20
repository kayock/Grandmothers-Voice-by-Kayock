#!/usr/bin/env node
/**
 * Generates synthetic GEDCOM fixtures used by the automated test suite.
 * Run: node tests/fixtures/make_fixtures.js
 * All fixtures are fully synthetic; no real-person data.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const out = p => path.join(dir, p);

function write(name, content, encoding = 'utf8') {
  fs.writeFileSync(out(name), content, encoding);
  console.log('wrote', name, Buffer.byteLength(content, encoding), 'bytes');
}

// ---------------------------------------------------------------- UTF-8 5.5.1
const v551 = `0 HEAD
1 SOUR KAYOCK-TEST
2 NAME Kayock Synthetic Fixture
2 VERS 1.0
1 GEDC
2 VERS 5.5.1
2 FORM LINEAGE-LINKED
1 CHAR UTF-8
1 SUBM @SUB1@
0 @SUB1@ SUBM
1 NAME Kayock Test Submitter
0 @I1@ INDI
1 NAME John/Doel/
2 GIVN John
2 SURN Doel
1 SEX M
1 BIRT
2 DATE 12 JUN 1893
2 PLAC Riverton, Franklin County, Idaho, United States
2 SOUR @S1@
3 PAGE 1893 birth register, entry 214
3 QUAY 3
2 NOTE Written in the family bible.
1 DEAT
2 DATE ABT 1971
2 PLAC Pocatello, Bannock County, Idaho, United States
1 CHR
2 DATE JUL 1893
2 PLAC Riverton ward chapel
1 OCCU railroad brakeman
1 RESI
2 DATE 1920
2 PLAC 41 Elm Street, Riverton, Idaho
2 SOUR @S2@
1 FAMS @F1@
1 FAMS @F2@
1 FAMC @F3@
1 NOTE @N1@
1 NOTE Inline note recorded by great-aunt June in 1994.
1 OBJE @M1@
1 OBJE @M2@
0 @I2@ INDI
1 NAME Mary Agnes/Whitlock/
1 SEX F
1 BIRT
2 DATE 3 MAR 1896
2 PLAC Logan, Cache County, Utah, United States
1 DEAT
2 DATE 14 NOV 1981
1 FAMS @F1@
1 FAMS @F2@
1 FAMC @F4@
0 @I3@ INDI
1 NAME Robert John/Doel/
1 SEX M
1 BIRT
2 DATE BET 1919 AND 1920
2 PLAC Riverton, Idaho, United States
2 SOUR @S2@
3 PAGE 1920 census household 44
1 FAMS @F5@
1 FAMC @F1@
0 @I4@ INDI
1 NAME Living/Doel/
1 SEX F
1 BIRT
2 DATE 4 JUL 1952
1 FAMC @F5@
0 @I5@ INDI
1 NAME Elsie/May/Whitlock
1 SEX F
1 BIRT
2 DATE 1896
2 PLAC Logan, Utah
1 FAMC @F4@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
1 MARR
2 DATE 8 SEP 1918
2 PLAC Riverton, Idaho, United States
2 SOUR @S1@
1 NOTE Married at the county courthouse; witnesses were the Whitlock cousins.
0 @F2@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 DIV Y
1 DIV
2 DATE 1931
0 @F3@ FAM
1 HUSB @I6@
1 WIFE @I7@
1 CHIL @I1@
0 @F4@ FAM
1 HUSB @I8@
1 WIFE @I9@
1 CHIL @I2@
1 CHIL @I5@
0 @F5@ FAM
1 HUSB @I3@
1 CHIL @I4@
1 MARR
2 DATE 1950
0 @I6@ INDI
1 NAME Abraham/Doel/
1 SEX M
0 @I7@ INDI
1 NAME Constance/Hale/
1 SEX F
0 @I8@ INDI
1 NAME Elias/Whitlock/
1 SEX M
0 @I9@ INDI
1 NAME Ruth/Vance/
1 SEX F
0 @N1@ NOTE
1 CONT John Doel was born at the family ranch outside Riverton.
1 CONT His middle name is not recorded in any known document.
0 @S1@ SOUR
1 TITL Franklin County birth register 1893
1 ABBR FC Births 1893
1 AUTH Franklin County Clerk
1 PUBL County courthouse, Preston, Idaho
1 TEXT transcribed from register volume 4, page 91
1 NOTE Preserved on microfilm roll 22.
0 @S2@ SOUR
1 TITL United States census 1920
1 ABBR 1920 US Census
0 @M1@ OBJE
1 FILE Photos/john_doel_1917.jpg
2 FORM jpg
3 TITL John Doel in his railroad uniform, 1917
1 TITL John Doel portrait 1917
0 @M2@ OBJE
1 FILE Documents/whitlock_dairy_ledger.pdf
2 FORM pdf
1 TITL Whitlock dairy ledger, 1902
0 TRLR
`;
write('basic_v551.ged', v551);

// ------------------------------------------------------------ ANSEL 5.5.1
const anselText = `0 HEAD
1 SOUR TEST
1 GEDC
2 VERS 5.5.1
1 CHAR ANSEL
0 @I1@ INDI
1 NAME Jose/Pe\\xF1a/
2 SURN Pe\\xF1a
1 BIRT
2 DATE 1901
2 PLAC San Crist\\xF3bal, Chile
0 TRLR
`;
// Build ANSEL bytes: mostly ASCII; use ANSEL combining acute (0xE2) before base char style is wrong -
// ANSEL uses precombined letters from the extended set: 0xF1 = "ñ" is NOT correct in ANSEL.
// In ANSEL, ñ = 0xE2 (acute) followed by 'n'. Keep it simple and correct:
const ansel = anselText.replace(/\\x([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/Pe\u00F1a/g, 'Pe\u00E4na')   // acute + n
  .replace(/Crist\u00F3bal/g, 'Crist\u00E2obal'); // acute + o
fs.writeFileSync(out('ansel_v551.ged'), Buffer.from(ansel, 'latin1'));
console.log('wrote ansel_v551.ged', fs.statSync(out('ansel_v551.ged')).size, 'bytes');

// -------------------------------------------------------- windows-1252 "ANSI"
const cp = `0 HEAD
1 SOUR TEST
1 GEDC
2 VERS 5.5.1
1 CHAR ANSI
0 @I1@ INDI
1 NAME Ané/Müller/
1 BIRT
2 DATE 1888
2 PLAC Köln, Deutschland
0 TRLR
`;
fs.writeFileSync(out('cp1252_v551.ged'), Buffer.from(cp, 'latin1'));
console.log('wrote cp1252_v551.ged', fs.statSync(out('cp1252_v551.ged')).size, 'bytes');

// ------------------------------------------------------------------- GEDCOM 7
const v70 = `0 HEAD
1 SOUR TEST
2 VERS 7.0.9
1 GEDC
2 VERS 7.0.9
1 CHAR UTF-8
1 NOTE Synthetic GEDCOM 7 fixture for parser tests.
0 @I1@ INDI
1 NAME Johann /Winkler/
2 GIVN Johann
2 SURN Winkler
1 SEX M
1 BIRT
2 DATE 1899-05-04
2 PLAC Graz, Steiermark, Österreich
2 NOTE Born at home on the hill road.
2 SOUR @S1@
3 PAGE register 1900, line 12
1 OCCU watchmaker
1 FAMS @F1@
0 @I2@ INDI
1 NAME Clara /Bauer/
1 SEX F
1 BIRT
2 DATE 1903-11-27
1 FAMS @F1@
0 @F1@ FAM
1 MARR
2 DATE 1924-06-15
2 PLAC Graz
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
0 @I3@ INDI
1 NAME Anna /Winkler/
1 SEX F
1 BIRT
2 DATE 1926-02-02
1 FAMC @F1@
0 @S1@ SOUR
1 TITL Graz parish register
1 CREAT
2 DATE 2024-01-01
0 @M1@ OBJE
1 FILE sample-photo.svg
2 TRAN text/plain A digitised caption
1 TITL Sample photo
0 TRLR
`;
write('v70.ged', v70);

// ----------------------------------------------------------------- edge cases
const edge = `0 HEAD
1 SOUR TEST
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Dup/Person/
1 BIRT
2 DATE 1 JAN 1900
1 FAMC @F999@
1 FAMS @F1@
0 @I2@ INDI
1 NAME Dup/Person/
1 BIRT
2 DATE 1 JAN 1900
2 PLAC Same Town, Somewhere
1 FAMC @F1@
0 @I5@ INDI
1 NAME Duplicate Xref/Record/
0 @I3@ INDI
1 NAME Orphan/Spouse/
1 FAMS @F888@
1 FAMC @F1@
0 @I4@ INDI
1 NAME Broken/Birth/
1 BIRT
2 DATE 5 FEB 2001
1 DEAT
2 DATE 3 FEB 1999
1 FAMC @F999@
1 NOTE @N7@
0 @I5@ INDI
1 NAME Cont conc/Tester/
1 NOTE First line of the note
2 CONT second line after CONT
2 CONC appended without newline
1 BIRT
2 DATE 10 OCT 1935
2 NOTE Event-level note should be kept
2 SOUR @S1@
3 PAGE citation page
0 @F1@ FAM
1 HUSB @I2@
1 WIFE @I2@
1 CHIL @I2@
1 CHIL @I3@
1 CHIL @I999@
1 NOTE Family note text
0 @S1@ SOUR
1 TITL Test source with page citations
0 @I6@ INDI
1 NAME Weird Level/Jump/
1 BIRT
2 DATE 1900
3   UNEXPECTED DEEP LINE
0 @M1@ OBJE
1 BLOB
2 CONT fake-blob-content-not-a-real-file
0 TRLR
`;
write('edge_cases.ged', edge);

// ------------------------------------------------------------- minimal / odd
write('minimal.ged', '0 HEAD\n1 CHAR UTF-8\n0 TRLR\n');
write('empty.ged', '');
write('garbage.ged', 'this is not a gedcom file at all\njust some random text\nwith no gedcom structure\n');

// ------------------------------------------------- large synthetic generator
function makeLarge(nIndi = 10000) {
  const L = [];
  L.push('0 HEAD', '1 SOUR KAYOCK-TEST', '1 GEDC', '2 VERS 5.5.1', '1 CHAR UTF-8');
  const rnd = (n) => (Math.abs(Math.sin(n * 12.9898) * 43758.5453) % 1);
  const surnames = ['Ashdown','Brightwater','Calloway','Drayford','Eastlake','Fairbourne','Glenmoor','Hartwell','Ironwood','Kingsley'];
  const towns = ['Riverton','Fairhaven','Glenmoor','Kingsport','Eastlake','Ashford','Brightwater','Calloway'];
  let famSeq = 0; const fams = [];
  for (let i = 1; i <= nIndi; i++) {
    const gen = Math.floor(rnd(i) * 6);
    const y = 1900 + gen * 12 + Math.floor(rnd(i + 0.3) * 11);
    const sn = surnames[i % surnames.length];
    L.push(`0 @I${i}@ INDI`, `1 NAME ${['A','B','C','D','E','F','G'][i % 7]} /${sn}/`, `1 SEX ${i % 2 ? 'M' : 'F'}`,
      `1 BIRT`, `2 DATE ${Math.floor(rnd(i + .7) * 28) + 1} ${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][i % 12]} ${y}`,
      `2 PLAC ${towns[i % towns.length]}, Testland`);
    if (y < 2020) L.push(`1 DEAT`, `2 DATE ${y + 70 + Math.floor(rnd(i + 1.1) * 20)}`, `2 PLAC ${towns[(i + 3) % towns.length]}, Testland`);
    if (i > 40 && i % 3 === 0) L.push(`1 SOUR @S${i}@`, `1 NOTE Note text for person ${i} with some family recollection.`);
    fams.push(`0 @F${i}@ FAM` /* placeholder replaced below */);
  }
  // build families: couple every (i, i+1) odd pairs for first half, children from second half
  const famLines = [];
  const childMap = new Map();
  for (let i = 41; i <= nIndi; i += 3) {
    const famId = 100000 + i;
    const h = 1 + (i % 40), w = 1 + ((i + 1) % 40);
    famLines.push(`0 @F${famId}@ FAM`, `1 HUSB @I${h}@`, `1 WIFE @I${w}@`, `1 CHIL @I${i}@`,
      `1 MARR`, `2 DATE 1922-${String((i % 12) + 1).padStart(2, '0')}-04`, `2 PLAC ${towns[i % towns.length]}, Testland`);
    childMap.set(i, famId);
  }
  for (let i = 41; i <= nIndi; i += 3) L.push(`1 FAMC @F${childMap.get(i)}@`);
  for (let i = 1; i <= 40; i += 2) famLines.push(`0 @F${500000 + i}@ FAM`, `1 HUSB @I${i}@`, `1 WIFE @I${i + 1}@`);
  for (let i = 1; i <= 40; i += 2) { L.push(`1 FAMS @F${500000 + i}@`); }
  L.push('0 TRLR');
  return L.join('\n') + '\n' + famLines.join('\n') + '\n';
}
fs.writeFileSync(out('large_10k.ged'), makeLarge(10000));
console.log('wrote large_10k.ged', fs.statSync(out('large_10k.ged')).size, 'bytes');

// ------------------------------------------------- privacy marker fixture
// Synthetic leakage-marker fixture for the v2.1.0 privacy regression tests.
// Every private name/file here is an invented distinctive marker string, so
// any leak into exports is detectable by a simple text scan.
const privacy = `0 HEAD
1 SOUR TEST
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Zephyron/Quillprivate/
1 SEX M
1 BIRT
2 DATE 14 JUL 1985
2 PLAC Private Hollow, Secret County
2 SOUR @S9@
3 PAGE private register, entry 1
1 FAMS @F1@
1 NOTE @N9@
1 OBJE @M9@
1 OBJE @M8@
0 @I2@ INDI
1 NAME Publica/Openshared/
1 SEX F
1 BIRT
2 DATE 2 FEB 1902
2 PLAC Publictown, Open County
2 SOUR @S1@
1 FAMS @F1@
1 OBJE @M1@
0 @I3@ INDI
1 NAME Elderly/Publicperson/
1 SEX M
1 BIRT
2 DATE 3 MAR 1899
2 PLAC Publictown
1 DEAT
2 DATE 4 APR 1979
1 OBJE @M2@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 MARR
2 DATE 2010
2 PLAC Secret Chapel, Private Hollow
1 NOTE Marriage note mentioning Zephyron Quillprivate privately.
0 @N9@ NOTE
1 CONT A very private shared note about Zephyron Quillprivate only.
0 @S9@ SOUR
1 TITL QUILPRIVATE-PRIVATE-SOURCE-REGISTER
1 TEXT Private transcript mentioning Zephyron Quillprivate.
0 @S1@ SOUR
1 TITL Public family bible of the Openshared family
0 @M9@ OBJE
1 FILE Photos/TEAPEE-MARKER-secret-photo.svg
2 FORM svg
1 TITL PRIVATE-MEDIA-TITLE-MARKER
0 @M8@ OBJE
1 FILE Audio/QUILLPRIVATE-voice-memo.mp3
2 FORM mp3
1 TITL PRIVATE-AUDIO-TITLE-MARKER
0 @M1@ OBJE
1 FILE Photos/public-shareable-photo.svg
2 FORM svg
1 TITL Public photo marker
0 @M2@ OBJE
1 FILE Documents/public-deed-1910.svg
2 FORM svg
1 TITL Public deed marker
0 TRLR
`;
write('privacy_markers.ged', privacy);

// ------------------------------------------- family-event media fixture (v2.1.1)
// Synthetic cases for the family-event media repair:
//  - F1 MARR has a marriage photograph (@M1@) and a scanned document (@M2@)
//  - @M2@ is ALSO referenced by I1's birth event (file shared by two events)
//  - F1 CENS carries multiple media references (@M3@ + @M4@)
//  - @M5@ references a file that is never provided (missing-file handling)
//  - F2 (a living couple) has a marriage event with @M6@, a PRIVATE
//    family-event attachment that must be excluded in restricted modes
const famEvents = `0 HEAD
1 SOUR TEST
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Grandpa/Eventide/
1 SEX M
1 BIRT
2 DATE 12 JUN 1920
2 PLAC Riverside
2 OBJE @M2@
1 DEAT
2 DATE 3 MAR 2001
2 OBJE @M5@
1 FAMS @F1@
0 @I2@ INDI
1 NAME Grandma/Eventide/
1 SEX F
1 BIRT
2 DATE 2 FEB 1923
1 DEAT
2 DATE 2005
1 FAMS @F1@
0 @I3@ INDI
1 NAME Son/Eventide/
1 SEX M
1 BIRT
2 DATE 1950
1 FAMS @F2@
0 @I4@ INDI
1 NAME Daughter-in-law/Everliving/
1 SEX F
1 BIRT
2 DATE 1955
1 FAMS @F2@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
1 MARR
2 DATE 1950
2 PLAC Riverside Chapel
2 OBJE @M1@
2 OBJE @M2@
1 CENS
2 DATE 1955
2 OBJE @M3@
2 OBJE @M4@
0 @F2@ FAM
1 HUSB @I3@
1 WIFE @I4@
1 MARR
2 DATE 1980
2 PLAC Private Garden
2 OBJE @M6@
0 @M1@ OBJE
1 FILE Photos/marriage-photo-1950-MARKER.svg
2 FORM svg
1 TITL Marriage photograph marker
0 @M2@ OBJE
1 FILE Docs/shared-family-register-MARKER.svg
2 FORM svg
1 TITL Shared family register marker
0 @M3@ OBJE
1 FILE Docs/census-1955-page.svg
2 FORM svg
1 TITL Census page 1955
0 @M4@ OBJE
1 FILE Photos/census-household.svg
2 FORM svg
1 TITL Census household photo
0 @M5@ OBJE
1 FILE Photos/never-provided-MISSING-MARKER.jpg
2 FORM jpg
1 TITL Missing file marker
0 @M6@ OBJE
1 FILE Photos/private-wedding-1980-PRIVATE-MARKER.svg
2 FORM svg
1 TITL PRIVATE-FAMILY-EVENT-TITLE-MARKER
0 TRLR
`;
write('family_events_media.ged', famEvents);
console.log('done');
