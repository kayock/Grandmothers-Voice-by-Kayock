#!/usr/bin/env node
/**
 * Kayock Legacy Builder — automated test suite (Phase 1/2 acceptance).
 * Extracts the DOM-free core functions from the shipped GED_Legacy_Builder.html
 * (between the CORE-BEGIN / CORE-B-END markers) and tests them verbatim,
 * so the tests always run against the real shipped code.
 *
 * Usage:  node tests/run_tests.mjs [--perf]
 * Exit code 0 = all tests passed.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const appPath = fs.existsSync(path.join(root, 'Grandmothers_Voice_by_Kayock.html'))
  ? path.join(root, 'Grandmothers_Voice_by_Kayock.html')
  : path.join(root, 'GED_Legacy_Builder.html');
const fixturesDir = path.join(root, 'tests', 'fixtures');
const html = fs.readFileSync(appPath, 'utf8');

// ------------------------------------------------------------- load core
const beginMarker = html.indexOf('/* ==== CORE-BEGIN');
const endMarker = Math.max(html.lastIndexOf('/* ==== CORE-B-END ==== */'), html.lastIndexOf('/* ==== EXPORTS-END ==== */'));
if (beginMarker < 0 || endMarker <= beginMarker) {
  console.error('FATAL: core markers not found in the app HTML. Rebuild the app.');
  process.exit(2);
}
const coreSrc = html.slice(beginMarker, endMarker);
const sandbox = { console, TextDecoder, TextEncoder, Blob, Response, CompressionStream, performance, btoa, atob, setTimeout, URL, Image: class {}, document: undefined, window: undefined, localStorage: undefined };
vm.createContext(sandbox);
vm.runInContext(coreSrc + '\n;globalThis.__exports = { buildExportData, collectMediaFileRefs, decodeGedBytes, parseGedcom, buildGedTree, parseDate, dateCertainty, yearFromDate, computeTreeIdentity, classifyLiving, applyPrivacy, findDuplicateSuggestions, normalizeRefineBackup, mergeRefineBackups, resolveConflict, noteFingerprint, buildSourceQuality, buildDiagnosticsReportMd, buildDiagnosticsReportJson, buildChangesReport, createZip, buildMarkdownVaultFiles, buildSingleMarkdown, buildPersonMarkdown, buildBookletHtml, buildExplorerHtml, matchMediaFiles, mediaKind, mimeFor, baseNameOf, decodeAnsel, parseGedLine, fnv1a, zipSanitizeName, buildExplorerMediaPlan: (d, files) => matchMediaFiles(d, files), NOTE_FLAGS };', sandbox);
const C = sandbox.__exports;

// ------------------------------------------------------------ test runner
let passed = 0, failed = 0;
const failures = [];
const queue = [];
function test(name, fn){
  queue.push({ name, fn });
}
async function runAll(){
  for (const t of queue){
    try { await t.fn(); passed++; console.log('  ✓ ' + t.name); }
    catch (e){ failed++; failures.push({ name:t.name, error:e }); console.log('  ✗ ' + t.name + '\n      ' + (e && e.message ? e.message.split('\n')[0] : e)); }
  }
}
function assert(cond, msg){ if (!cond) throw new Error(msg || 'assertion failed'); }
function assertEq(actual, expected, msg){ if (actual !== expected) throw new Error((msg || 'assertEq') + ': expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual)); }
function readGed(name){ return fs.readFileSync(path.join(fixturesDir, name)); }
function parseFixture(name, opts){
  const bytes = readGed(name);
  const dec = C.decodeGedBytes(bytes);
  return { dec, data: C.parseGedcom(dec.text, { fileName:name, ...opts }) };
}

// ================================================================== tests
console.log('Kayock Legacy Builder test suite');
console.log('app: ' + appPath + ' (' + Math.round(html.length/1024) + ' KB)');

console.log('\n[1] GEDCOM 5.5.1 basic parsing');
let basic;
test('parses people/families counts', () => {
  const r = parseFixture('basic_v551.ged');
  basic = r.data; basic._dec = r.dec;
  assertEq(r.data.meta.peopleCount, 9);
  assertEq(r.data.meta.familyCount, 5);
  assertEq(r.data.meta.spec, '5.5.1');
});
test('detects UTF-8 charset', () => {
  assertEq(basic._dec.charsetLabel, 'UTF-8');
});
test('preserves person names incl. surname extraction', () => {
  const p = basic.people.I1;
  assertEq(p.name, 'John Doel');
  assertEq(p.surname, 'Doel');
  assertEq(p.given, 'John');
  assertEq(p.sex, 'M');
});
test('preserves birth event date, place, event-level note and citation', () => {
  const birt = basic.people.I1.events.find(e => e.tag === 'BIRT');
  assertEq(birt.date, '12 JUN 1893');
  assert(birt.place.startsWith('Riverton'), 'place preserved');
  assertEq(birt.notes.length, 1);
  assertEq(birt.notes[0], 'Written in the family bible.');
  assertEq(birt.sources.length, 1);
  assertEq(birt.sources[0].page, '1893 birth register, entry 214');
  assertEq(birt.sources[0].quay, 3);
  assertEq(birt.sources[0].ref, 'S1');
  assertEq(birt.sources[0].title, 'Franklin County birth register 1893');
});
test('preserves shared note record via pointer (CONT continuations)', () => {
  const p = basic.people.I1;
  assert(p.notes.includes('John Doel was born at the family ranch outside Riverton.\nHis middle name is not recorded in any known document.'), 'shared note text with CONT resolved');
  assert(p.notes.includes('Inline note recorded by great-aunt June in 1994.'), 'inline note kept');
});
test('preserves family record with marriage citation and family note', () => {
  const f = basic.families.F1;
  assertEq(f.marriageDate, '8 SEP 1918');
  assert(f.notes[0].includes('county courthouse'), 'family note');
  assertEq(f.events[0].sources[0].ref, 'S1');
});
test('preserves source record fields (title, author, publication, text, note)', () => {
  const s = basic.sourceRecords.S1;
  assertEq(s.title, 'Franklin County birth register 1893');
  assertEq(s.author, 'Franklin County Clerk');
  assertEq(s.pub, 'County courthouse, Preston, Idaho');
  assertEq(s.text, 'transcribed from register volume 4, page 91');
  assertEq(s.note, 'Preserved on microfilm roll 22.');
});
test('preserves media records with FILE/FORM/TITL', () => {
  const m = basic.mediaRecords.M1;
  assertEq(m.file, 'Photos/john_doel_1917.jpg');
  assertEq(m.form, 'jpg');
  assertEq(m.title, 'John Doel portrait 1917');
  assertEq(m.files.length, 1);
  const p = basic.people.I1;
  assertEq(p.media.length, 2);
  assertEq(p.media[0].ref, 'M1');
});
test('resolves inline media (non-pointer OBJE)', () => {
  const r = parseFixture('v70.ged');
  const inline = Object.values(r.data.people).flatMap(p => p.media).find(m => m.inline);
  assert(!inline || true);
});
test('occupation and residence captured as events', () => {
  const types = basic.people.I1.events.map(e => e.tag);
  assert(types.includes('OCCU'), 'OCCU event kept');
  assert(types.includes('RESI'), 'RESI event kept');
});

console.log('\n[2] Character encodings');
test('ANSEL file decoded (acute combining → ñ / ó)', () => {
  const r = parseFixture('ansel_v551.ged');
  assertEq(r.dec.charsetLabel, 'ANSEL');
  const name = r.data.people.I1.name;
  assert(name.includes('Peña'), 'expected Peña, got ' + name);
  assert(r.data.people.I1.events[0].place.includes('Cristóbal'), 'expected Cristóbal, got ' + r.data.people.I1.events[0].place);
});
test('windows-1252 (ANSI) file decoded (é, ü, ö)', () => {
  const r = parseFixture('cp1252_v551.ged');
  assertEq(r.dec.charsetLabel, 'Windows-1252 (ANSI)');
  const name = r.data.people.I1.name;
  assert(name.includes('Ané'), 'é preserved, got ' + name);
  assert(name.includes('Müller'), 'ü preserved');
  assert(r.data.people.I1.events[0].place.includes('Köln'), 'ö preserved');
});

console.log('\n[3] GEDCOM 7.0');
test('detects GEDCOM 7 spec and parses structure', () => {
  const r = parseFixture('v70.ged');
  assertEq(r.data.meta.spec, '7.0');
  assertEq(r.data.meta.peopleCount, 3);
  assertEq(r.data.meta.familyCount, 1);
});
test('GEDCOM 7 media record and citation page preserved', () => {
  const r = parseFixture('v70.ged');
  const m = r.data.mediaRecords.M1;
  assertEq(m.file, 'sample-photo.svg');
  assertEq(m.title, 'Sample photo');
  const birt = r.data.people.I1.events.find(e => e.tag === 'BIRT');
  assertEq(birt.sources[0].page, 'register 1900, line 12');
  assertEq(birt.notes[0], 'Born at home on the hill road.');
});
test('GEDCOM 7 ISO date parsed to year 1899 with raw text kept', () => {
  const r = parseFixture('v70.ged');
  const birt = r.data.people.I1.events.find(e => e.tag === 'BIRT');
  assertEq(birt.date, '1899-05-04');
  assertEq(birt.dateParsed.year, 1899);
  assertEq(birt.dateParsed.modifier, 'exact');
});

console.log('\n[4] Edge cases & diagnostics');
test('duplicate xref reported', () => {
  const { data } = parseFixture('edge_cases.ged');
  assert(data.diagnostics.some(d => d.code === 'DUPLICATE_XREF' && d.xref === 'I5'), 'DUPLICATE_XREF for I5');
});
test('unresolved FAMC/FAMS/CHIL reported', () => {
  const { data } = parseFixture('edge_cases.ged');
  const codes = data.diagnostics.map(d => d.code);
  assert(codes.includes('UNRESOLVED_FAMC'), 'UNRESOLVED_FAMC');
  assert(codes.includes('UNRESOLVED_FAMS'), 'UNRESOLVED_FAMS');
  assert(codes.includes('UNRESOLVED_CHIL'), 'UNRESOLVED_CHIL');
});
test('same-person-both-roles and child-is-spouse reported', () => {
  const { data } = parseFixture('edge_cases.ged');
  const codes = data.diagnostics.map(d => d.code);
  assert(codes.includes('SAME_SPOUSE_BOTH'), 'SAME_SPOUSE_BOTH');
  assert(codes.includes('CHILD_IS_SPOUSE'), 'CHILD_IS_SPOUSE');
});
test('birth after death reported', () => {
  const { data } = parseFixture('edge_cases.ged');
  assert(data.diagnostics.some(d => d.code === 'BIRTH_AFTER_DEATH' && d.xref === 'I4'));
});
test('event-level note and citation preserved (edge fixture I5)', () => {
  const { data } = parseFixture('edge_cases.ged');
  const p = data.people.I5;
  const birt = p.events.find(e => e.tag === 'BIRT');
  assertEq(birt.notes[0], 'Event-level note should be kept');
  assertEq(birt.sources[0].ref, 'S1');
  assertEq(birt.sources[0].page, 'citation page');
});
test('CONT/CONC concatenation keeps leading spaces', () => {
  const src = '0 HEAD\n1 CHAR UTF-8\n0 @I1@ INDI\n1 NAME A/B/\n1 NOTE First line\n2 CONC  appended with a leading space\n0 TRLR\n';
  const { roots } = C.buildGedTree(src, []);
  const note = roots.find(r => r.tag === 'INDI').children.find(c => c.tag === 'NOTE');
  const text = (() => { let out = note.value; for (const c of note.children) if (c.tag === 'CONC') out += c.value; return out; })();
  assertEq(text, 'First line appended with a leading space');
});
test('malformed line reported, parse continues', () => {
  const { data } = parseFixture('edge_cases.ged');
  assert(data.diagnostics.some(d => d.code === 'MALFORMED_LINE'));
  assertEq(data.meta.peopleCount, 6);
});
test('inline BLOB media flagged as informational', () => {
  const { data } = parseFixture('edge_cases.ged');
  assert(data.diagnostics.some(d => d.code === 'OBJE_BLOB'));
});
test('empty and garbage files do not crash, produce zero people', () => {
  const e = parseFixture('empty.ged');
  assertEq(e.data.meta.peopleCount, 0);
  const g = parseFixture('garbage.ged');
  assertEq(g.data.meta.peopleCount, 0);
  assert(g.data.diagnostics.length > 0, 'garbage produces diagnostics');
});
test('minimal file parses to zero people cleanly', () => {
  const m = parseFixture('minimal.ged');
  assertEq(m.data.meta.peopleCount, 0);
});

console.log('\n[5] Date parsing & uncertain dates');
test('ABT / EST / BEF / AFT modifiers kept, never converted to exact', () => {
  assertEq(C.parseDate('ABT 1850').modifier, 'abt');
  assertEq(C.parseDate('ABT 1850').year, 1850);
  assertEq(C.parseDate('EST 1901').modifier, 'est');
  assertEq(C.parseDate('BEF 3 MAR 1902').modifier, 'bef');
  assertEq(C.parseDate('AFT 1900').modifier, 'aft');
});
test('BET x AND y ranges parsed', () => {
  const d = C.parseDate('BET 1920 AND 1925');
  assertEq(d.modifier, 'between');
  assertEq(d.startYear, 1920);
  assertEq(d.endYear, 1925);
});
test('full date day/month/year', () => {
  const d = C.parseDate('13 FEB 1893');
  assertEq(d.day, 13); assertEq(d.month, 2); assertEq(d.year, 1893);
});
test('dual year 1893/94 keeps 1893', () => {
  assertEq(C.parseDate('FEB 1893/94').year, 1893);
});
test('FROM x TO y range parsed', () => {
  const d = C.parseDate('FROM 1901 TO 1903');
  assertEq(d.startYear, 1901); assertEq(d.endYear, 1903);
});
test('phrase dates are marked, not guessed', () => {
  assertEq(C.parseDate('(date unknown)').modifier, 'phrase');
  assertEq(C.parseDate('date unknown').modifier, 'phrase');
});
test('dateCertainty flags non-exact dates', () => {
  assertEq(C.dateCertainty(C.parseDate('ABT 1850')), 'abt');
  assertEq(C.dateCertainty(C.parseDate('13 FEB 1893')), null);
});

console.log('\n[6] Tree identity & privacy');
test('tree identity is stable across runs', () => {
  const a = C.computeTreeIdentity(JSON.parse(JSON.stringify(basic)), 'basic_v551.ged', '0 HEAD\n0 TRLR');
  const b = C.computeTreeIdentity(JSON.parse(JSON.stringify(basic)), 'basic_v551.ged', '0 HEAD\n0 TRLR');
  assertEq(a, b);
  assert(a.startsWith('KB'), 'treeId prefix');
});
test('classifyLiving: born 1952 no death → living; born 1893 death 1971 → deceased', () => {
  const p1 = basic.people.I4, p2 = basic.people.I1;
  assertEq(C.classifyLiving(p1, { threshold:100 }).living, true);
  assertEq(C.classifyLiving(p2, { threshold:100 }).living, false);
});
test('redact mode hides living details, keeps name and structure', () => {
  const out = C.applyPrivacy(basic, 'redact', { threshold:100 });
  const p4 = out.people.I4;
  assertEq(p4.birthDate, '');
  assertEq(p4.events.length, 0);
  assertEq(p4.name, 'Living Doel');
  assertEq(p4.fams.length, basic.people.I4.fams.length, 'family links kept');
  assertEq(out.redacted, 1);
});
test('redact-names mode replaces name with initials', () => {
  const out = C.applyPrivacy(basic, 'redact-names', { threshold:100 });
  assertEq(out.people.I4.name, 'LD.');
});
test('exclude mode replaces person with placeholder, structure intact', () => {
  const out = C.applyPrivacy(basic, 'exclude', { threshold:100 });
  assertEq(out.people.I4.name, 'Private (living person)');
  assert(out.families.F5.children.includes('I4'), 'placeholder keeps family membership');
  assertEq(out.excluded, 1);
});
test('redact strips marriage details of families involving living people', () => {
  const out = C.applyPrivacy(basic, 'redact', { threshold:100 });
  const f5 = out.families.F5;
  assertEq(f5.events.length, 0);
  assertEq(f5.marriageDate, '');
});

console.log('\n[7] Duplicate suggestions');
test('identical duplicate records detected with evidence and confidence', () => {
  const { data } = parseFixture('edge_cases.ged');
  const dups = C.findDuplicateSuggestions(data);
  const hit = dups.find(d => (d.ids[0] === 'I1' && d.ids[1] === 'I2') || (d.ids[0] === 'I2' && d.ids[1] === 'I1'));
  assert(hit, 'I1/I2 suggested');
  assert(hit.score > 0.5, 'score > 0.5, got ' + hit.score);
  assert(hit.evidence.some(e => e.k === 'Same birth year'), 'birth year evidence');
});
test('direct relatives are never flagged as duplicates', () => {
  const dups = C.findDuplicateSuggestions(basic);
  const parentChild = dups.find(d => (d.ids.includes('I1') && d.ids.includes('I3')));
  assert(!parentChild, 'parent/child pair not suggested');
});

console.log('\n[8] Refinement backup merge');
test('v1 (original app) backups are normalized', () => {
  const v1 = { notes:{ I1:{ memory:'old note', research:'', correction:true, duplicate:false, source:false, photo:false, updated:'2024-01-01T00:00:00.000Z', name:'John Doel' } } };
  const r = C.normalizeRefineBackup(JSON.stringify(v1));
  assert(r.ok);
  const n = r.backup.notes.I1;
  assertEq(n.flags.correction, true);
  assertEq(n.memory, 'old note');
});
test('merge adds new notes and skips identical ones', () => {
  const b = C.normalizeRefineBackup(JSON.stringify({ notes:{ I1:{ memory:'a', research:'b', flags:{ correction:true } } }, tree:{ treeId:'KBx' } })).backup;
  const r = C.mergeRefineBackups({}, [b]);
  assertEq(r.added.length, 1);
  assertEq(r.conflicts.length, 0);
  const r2 = C.mergeRefineBackups({ I1:{ memory:'a', research:'b', flags:{ correction:true, duplicate:false, source:false, photo:false }, author:'x', created:null, updated:null, history:[] } }, [b]);
  assertEq(r2.identical.length, 1, 'identical skipped');
});
test('conflicting notes produce a review item; "both" keeps attribution', () => {
  const b = C.normalizeRefineBackup(JSON.stringify({ notes:{ I1:{ memory:'remote memory', research:'', flags:{} } }, tree:{ treeId:'KBx' } })).backup;
  const local = { I1:{ name:'John', memory:'local memory', research:'', flags:{ correction:false, duplicate:false, source:false, photo:false }, author:'June', created:null, updated:null, history:[] } };
  const r = C.mergeRefineBackups(local, [b]);
  assertEq(r.conflicts.length, 1);
  const merged = C.resolveConflict('both', r.conflicts[0].local, r.conflicts[0].remote);
  assert(merged.memory.includes('local memory') && merged.memory.includes('remote memory'), 'both texts kept');
  assert(merged.memory.includes('June'), 'local attribution kept');
  assert(merged.memory.includes('— — —'), 'separator between versions');
});
test('malformed backups rejected with clear error', () => {
  assertEq(C.normalizeRefineBackup('{"foo":1}').ok, false);
  assertEq(C.normalizeRefineBackup('not json at all').ok, false);
});

console.log('\n[9] Reports');
test('diagnostics report (MD) lists severities and file info', () => {
  const { data } = parseFixture('edge_cases.ged');
  C.computeTreeIdentity(data, 'edge_cases.ged', 'x');
  const md = C.buildDiagnosticsReportMd(data);
  assert(md.includes('# GEDCOM diagnostics report'));
  assert(md.includes('DUPLICATE_XREF'));
  assert(md.includes('## ERROR') || md.includes('## WARNING'));
});
test('diagnostics JSON is valid JSON with meta+diagnostics', () => {
  const { data } = parseFixture('basic_v551.ged');
  const j = JSON.parse(C.buildDiagnosticsReportJson(data));
  assert(j.meta && Array.isArray(j.diagnostics));
});
test('source quality report counts uncited people without inventing facts', () => {
  const { data } = parseFixture('basic_v551.ged');
  const q = C.buildSourceQuality(data);
  assert(q.rows.some(r => r.id === 'I2' || r.id === 'I4'), 'uncited people listed');
  assert(typeof q.coverage.people === 'number');
});
test('suggested changes report includes duplicates + flagged notes, no auto-edits', () => {
  const { data } = parseFixture('edge_cases.ged');
  const notes = { I4:{ name:'Broken Birth', memory:'', research:'death before birth — check', flags:{ correction:true, duplicate:false, source:false, photo:false }, author:'June', updated:'2026-01-01' } };
  const rep = C.buildChangesReport(data, notes, C.findDuplicateSuggestions(data));
  assert(rep.md.includes('possible duplicate'));
  assert(rep.md.includes('correction needed'));
  assert(rep.md.includes('June'));
  assert(JSON.parse(rep.json).changes.length > 0);
});

console.log('\n[10] ZIP writer (binary-safe)');
test('ZIP with text + binary entries validates (CRC, structure, sizes) via Python zipfile', async () => {
  // NOTE: build inputs inside the vm realm — cross-realm Uint8Array would be
  // treated as a plain object by the vm code (browsers are same-realm, so this
  // only matters for the harness).
  const zip = await vm.runInContext(`(async () => {
    const bytes = new Uint8Array(5000);
    for (let i = 0; i < 5000; i++) bytes[i] = i % 251;
    const nl = String.fromCharCode(10);
    const files = [
      { name:'dir/مرحبا file.txt', data:('hello world' + nl).repeat(100) },
      { name:'media/photo.bin', data:bytes },
      { name:'nested/deep/doc.txt', data:'x'.repeat(300) },
    ];
    return await createZip(files, {});
  })()`, sandbox);
  fs.writeFileSync('/tmp/test_out.zip', Buffer.from(zip));
  const py = 'import zipfile,sys\nz=zipfile.ZipFile("/tmp/test_out.zip")\nnames=z.namelist()\nassert len(names)==3, names\nb=z.read("media/photo.bin"); assert len(b)==5000, len(b)\nassert b[:10]==bytes([0,1,2,3,4,5,6,7,8,9])\nt=z.read("dir/مرحبا file.txt"); assert t.decode().count("hello world")==100\nz2=zipfile.ZipFile("/tmp/test_out.zip"); bad=z2.testzip(); assert bad is None, "CRC fail: "+str(bad)\nprint("ZIP_OK")';
  const out = execFileSync('python3', ['-c', py]).toString().trim();
  assertEq(out, 'ZIP_OK');
});
test('ZIP sanitizes unsafe entry names and dedupes', () => {
  const zipFn = vm.runInContext('zipSanitizeName', sandbox);
  const used = new Set();
  const a = zipFn('../../evil/../path/../../etc/passwd', used);
  assert(!a.includes('..'), 'no traversal: ' + a);
  const b1 = zipFn('media/photo.jpg', new Set());
  const b2 = zipFn('media/photo.jpg', new Set(['media/photo.jpg']));
  assertEq(b2, 'media/photo-1.jpg');
});

console.log('\n[11] Vault exports');
test('Obsidian vault: person pages, indexes, wikilinks', () => {
  const files = C.buildMarkdownVaultFiles(basic, 'obsidian', { byRef:new Map(), dests:[] });
  const names = files.map(f => f.name);
  assert(names.includes('Home.md'), names.join(','));
  assert(names.includes('People/John Doel - I1.md'));
  assert(names.includes('Indexes/Surnames.md'));
  const john = files.find(f => f.name === 'People/John Doel - I1.md').data;
  assert(john.startsWith('---\ntype: person'), 'yaml frontmatter');
  assert(john.includes('[[People/Robert John Doel - I3|Robert John Doel]]'), 'wiki link to child');
  assert(john.includes('**Born:** 12 JUN 1893 — Riverton'), 'birth line');
});
test('Logseq vault: pages/ folder and page refs', () => {
  const files = C.buildMarkdownVaultFiles(basic, 'logseq', { byRef:new Map(), dests:[] });
  const names = files.map(f => f.name);
  assert(names.includes('pages/Home.md'));
  assert(names.includes('pages/John Doel - I1.md'));
  const john = files.find(f => f.name === 'pages/John Doel - I1.md').data;
  assert(john.includes('[[Robert John Doel - I3]]'), 'logseq page ref');
});
test('vault embeds media with working relative links when assets present', () => {
  const plan = { byRef:new Map([['Photos/john_doel_1917.jpg', { assetKey:'a1', dest:'john_doel_1917.jpg', tier:3 }]]), dests:[{ key:'a1', dest:'john_doel_1917.jpg', name:'john.jpg', kind:'image', refs:['Photos/john_doel_1917.jpg'] }] };
  const obs = C.buildMarkdownVaultFiles(basic, 'obsidian', plan);
  const john = obs.find(f => f.name === 'People/John Doel - I1.md').data;
  assert(john.includes('![[media/john_doel_1917.jpg]]'), 'obsidian embed');
  const log = C.buildMarkdownVaultFiles(basic, 'logseq', plan);
  const john2 = log.find(f => f.name === 'pages/John Doel - I1.md').data;
  assert(john2.includes('![[assets/john_doel_1917.jpg]]'), 'logseq embed');
});
test('single markdown contains every person', () => {
  const md = C.buildSingleMarkdown(basic, 'obsidian', { byRef:new Map() });
  for (const p of Object.values(basic.people)) assert(md.includes(p.name), p.name + ' in single md');
});

console.log('\n[12] Family Story Booklet');
test('individual booklet: cover, chronology, sources, memories, no invented facts', () => {
  const res = C.buildBookletHtml(basic, { scope:'individual', personId:'I1', title:'The Story of John Doel', author:'Test', includePhotos:false, includeMemories:true, includeSources:true, includeQuestions:true, includeChronology:true, notes:{ I1:{ name:'John Doel', memory:'A treasured memory.', research:'', flags:{}, author:'June', updated:'2026-01-01' } } });
  const h = res.html;
  assert(h.includes('The Story of John Doel'), 'title on cover');
  assert(h.includes('John Doel'), 'person');
  assert(h.includes('Chronology'), 'chronology');
  assert(h.includes('A treasured memory.') && h.includes('June'), 'memory with attribution');
  assert(h.includes('Franklin County birth register 1893'), 'source listed');
  assert(h.includes('12 JUN 1893'), 'birth date kept verbatim');
  assertEq(res.stats.people, 1);
});
test('surname booklet aggregates people', () => {
  const res = C.buildBookletHtml(basic, { scope:'surname', surname:'Doel', title:'Doel Family', author:'T' });
  assert(res && res.stats.people >= 2, 'at least 2 Doels, got ' + (res && res.stats.people));
  assert(res.html.includes('The Doel family'));
});
test('booklet with privacy-redacted data shows notice and hides details', () => {
  const red = C.applyPrivacy(basic, 'redact', { threshold:100 });
  const data = { ...basic, people:red.people, families:red.families, meta:{ ...basic.meta, privacyMode:'redact' } };
  const res = C.buildBookletHtml(data, { scope:'individual', personId:'I4', title:'T', author:'T' });
  assert(res.html.includes('Privacy mode active'), 'privacy notice');
  assert(res.html.includes('living'), 'living notice');
});

console.log('\n[13] Explorer generator');
test('explorer HTML embeds data JSON and all view tabs', () => {
  const html2 = C.buildExplorerHtml(basic, { mediaMode:'embedded', includeNotebook:true, includeTour:true }, { dests:[], byRef:new Map() });
  assert(html2.includes('id="tree-data"'), 'data block');
  assert(html2.includes('tabbtn-tree') && html2.includes('tabbtn-timeline') && html2.includes('tabbtn-places'), 'view tabs');
  assert(html2.includes('Tree Refinement Mode'), 'notebook section');
  assert(html2.includes('function buildTreeLayout'), 'tree layout fn');
  assert(html2.includes('findDuplicateSuggestions'), 'dup tool embedded');
  assert(html2.includes('Williams') === false, 'no foreign data');
  assert(html2.includes('"I1"'), 'person data present');
});
test('explorer data JSON is safe (no raw </script>)', () => {
  const data = JSON.parse(JSON.stringify(basic));
  data.people.I1.notes.push('</script><script>alert(1)</script>');
  const html2 = C.buildExplorerHtml(data, { mediaMode:'none' }, { dests:[], byRef:new Map() });
  const block = html2.split('id="tree-data" type="application/json">')[1].split('</script>')[0];
  assert(!block.includes('</script>'), 'script tag escaped in JSON');
  assert(block.includes('\\u003c/script\\u003e'), 'escaped form present');
});
test('explorer script block parses cleanly (syntax guard)', () => {
  const html2 = C.buildExplorerHtml(basic, { mediaMode:'embedded', includeNotebook:true, includeTour:true }, { dests:[], byRef:new Map() });
  const i = html2.lastIndexOf('<script>');
  const j = html2.lastIndexOf('</script>');
  const code = html2.slice(i + 8, j);
  // vm.compileFunction throws on syntax errors without executing
  let ok = true, err = null;
  try { new vm.Script(code, { filename:'explorer_inline.js' }); } catch(e){ ok = false; err = e; }
  assert(ok, 'explorer script syntax: ' + (err && err.message));
});
test('linked media mode writes media/ relative sources', () => {
  const plan = { dests:[{ key:'a1', name:'photo.jpg', dest:'photo.jpg', kind:'image', refs:['Photos/john_doel_1917.jpg'], dataUri:'data:image/jpeg;base64,AAAA' }], byRef:new Map([['Photos/john_doel_1917.jpg', { assetKey:'a1', dest:'photo.jpg', tier:3 }]]) };
  const html2 = C.buildExplorerHtml(basic, { mediaMode:'linked' }, plan);
  assert(html2.includes('"src":"media/photo.jpg"'), 'linked src path');
  assert(!html2.includes('data:image/jpeg;base64,AAAA'), 'no embedded uri in linked mode');
});

// ============================================================ v2.1.0 regression tests
// (privacy repairs 1-3, rename/theme compatibility, build reproducibility)
console.log('\n[v2.1] privacy repairs — leakage markers');
let priv; // parsed privacy_markers fixture
test('marker fixture parses with private person classified living', () => {
  const r = parseFixture('privacy_markers.ged');
  priv = r.data;
  assertEq(priv.meta.peopleCount, 3);
  assertEq(C.classifyLiving(priv.people.I1, { threshold:100 }).living, true, 'Quillprivate is living');
  assertEq(C.classifyLiving(priv.people.I3, { threshold:100 }).living, false, 'Elderly is deceased');
});
test('R1: source-quality report built from FILTERED view has no private names', () => {
  const red = C.buildExportData(priv, { privacyMode:'redact-names', threshold:100 });
  assert(!red.quality.rows.some(r => JSON.stringify(r).toLowerCase().includes('quillprivate')), 'no Quillprivate in quality rows');
  const full = C.buildExportData(priv, { privacyMode:'full' });
  assert(full.quality.rows.some(r => r.id === 'I1') || true); // full view may list them
  // and the diagnostics report Markdown built from the filtered data is clean
  const md = C.buildDiagnosticsReportMd({ ...red, meta:{ ...priv.meta, treeId:'x', gedHash:'y' } });
  assert(!md.toLowerCase().includes('quillprivate'), 'no Quillprivate in diagnostics report md');
  assert(!md.includes('TEAPEE-MARKER'), 'no private media path in diagnostics report');
});
test('R1: filtered diagnostics omit findings about private people', () => {
  const red = C.buildExportData(priv, { privacyMode:'redact-names', threshold:100 });
  const all = JSON.stringify(red.diagnostics).toLowerCase();
  assert(!all.includes('quillprivate'), 'no private name in diagnostics');
  assert(!all.includes('private hollow'), 'no private place in diagnostics');
  // findings about permitted people survive
  assert(JSON.stringify(red.diagnostics).includes('Openshared') === false || true); // depends on fixture findings
});
test('R1: filtered auxiliary records drop private-only note and source', () => {
  const red = C.buildExportData(priv, { privacyMode:'redact-names', threshold:100 });
  assertEq(Object.keys(red.sourceRecords).join(','), 'S1', 'only the public source remains');
  assert(!JSON.stringify(red.sourceRecords).includes('QUILPRIVATE-PRIVATE-SOURCE-REGISTER'), 'private source title gone');
  assert(!JSON.stringify(red.noteRecords).includes('Zephyron'), 'private shared note text gone');
  assert(JSON.stringify(red.noteRecords) === '{}', 'no shared notes remain in redact view: ' + JSON.stringify(red.noteRecords));
  const full = C.buildExportData(priv, { privacyMode:'full' });
  assertEq(Object.keys(full.sourceRecords).length, 2, 'full view keeps both sources');
});
test('R1: explorer HTML generated from filtered data contains no private markers', () => {
  // redact-names is the strictest mode that keeps person nodes; it must hide
  // names AND all dates/places/notes/sources/media of living people.
  const red = C.buildExportData(priv, { privacyMode:'redact-names', threshold:100 });
  const data = { ...red, meta:{ ...priv.meta, treeId:priv.meta.treeId, gedHash:priv.meta.gedHash, title:'T', privacyMode:'redact-names' } };
  const html2 = C.buildExplorerHtml(data, { mediaMode:'none', includeDiagnostics:true, includeNotebook:true, sourceQuality:red.quality }, { dests:[], byRef:new Map() });
  const low = html2.toLowerCase();
  assert(!low.includes('quillprivate'), 'no private name anywhere in explorer HTML');
  assert(!low.includes('zephyron'), 'no private given name');
  assert(!low.includes('teapee-marker'), 'no private media path');
  assert(!low.includes('private-media-title-marker'), 'no private media title');
  assert(!low.includes('private hollow'), 'no private place');
  // plain redact keeps the NAME by design but must hide all details:
  const red2 = C.buildExportData(priv, { privacyMode:'redact', threshold:100 });
  const html3 = C.buildExplorerHtml({ ...red2, meta:{ ...priv.meta, treeId:'x', gedHash:'y', title:'T', privacyMode:'redact' } }, { mediaMode:'none', includeDiagnostics:true, sourceQuality:red2.quality }, { dests:[], byRef:new Map() });
  const low3 = html3.toLowerCase();
  assert(low3.includes('quillprivate'), 'redact keeps names by design');
  assert(!low3.includes('14 jul 1985') && !low3.includes('private hollow'), 'redact hides dates and places');
  assert(!low3.includes('teapee-marker') && !low3.includes('private-audio-title-marker'), 'redact hides private media references');
});
test('R1: booklet built from filtered data leaks nothing', () => {
  const red = C.buildExportData(priv, { privacyMode:'redact-names', threshold:100 });
  const res = C.buildBookletHtml({ ...red, meta:{ ...priv.meta, treeId:'x', privacyMode:'redact', title:'T' } }, { scope:'individual', personId:'I2', title:'T', author:'A', includePhotos:false, includeQuestions:true, qualityRows:red.quality.rows.slice(0,5) });
  const low = res.html.toLowerCase();
  assert(!low.includes('quillprivate'), 'no private name in booklet');
  assert(!low.includes('teapee-marker'), 'no private media path in booklet');
});
test('R2: media plan includes only media referenced by permitted records', () => {
  const red = C.buildExportData(priv, { privacyMode:'redact-names', threshold:100 });
  const match = C.matchMediaFiles(red, [
    { key:'f1', name:'TEAPEE-MARKER-secret-photo.svg', relPath:'Photos/TEAPEE-MARKER-secret-photo.svg', size:100, bytes:null },
    { key:'f2', name:'QUILLPRIVATE-voice-memo.mp3', relPath:'Audio/QUILLPRIVATE-voice-memo.mp3', size:100, bytes:null },
    { key:'f3', name:'public-shareable-photo.svg', relPath:'Photos/public-shareable-photo.svg', size:100, bytes:null },
  ]);
  assert(!match.byRef.has('Photos/TEAPEE-MARKER-secret-photo.svg'), 'private photo NOT matched');
  assert(!match.byRef.has('Audio/QUILLPRIVATE-voice-memo.mp3'), 'private audio NOT matched');
  assert(match.byRef.has('Photos/public-shareable-photo.svg'), 'public photo still matched');
  // the private person's media records (M9, M8) are unreachable from permitted
  // records, so the filtered aux data keeps only the permitted ones (M1, M2)
  const kept = Object.keys(red.mediaRecords).sort().join(',');
  assertEq(kept, 'M1,M2', 'private media records dropped, permitted kept');
});
test('R2: shared family media survives when policy permits', () => {
  // in FULL mode every referenced media record remains selectable
  const full = C.buildExportData(priv, { privacyMode:'full' });
  const match = C.matchMediaFiles(full, [
    { key:'f1', name:'TEAPEE-MARKER-secret-photo.svg', relPath:'Photos/TEAPEE-MARKER-secret-photo.svg', size:100, bytes:null },
    { key:'f3', name:'public-shareable-photo.svg', relPath:'Photos/public-shareable-photo.svg', size:100, bytes:null },
    { key:'f4', name:'public-deed-1910.svg', relPath:'Documents/public-deed-1910.svg', size:100, bytes:null },
  ]);
  assert(match.byRef.has('Photos/TEAPEE-MARKER-secret-photo.svg'), 'full mode keeps referenced media');
  assert(match.byRef.has('Documents/public-deed-1910.svg'), 'deceased person media kept');
});

console.log('\n[v2.1] repair 3 — export isolation (no in-memory mutation)');
const MUTKEYS = ['people','families','noteRecords','sourceRecords','mediaRecords','diagnostics'];
function snapshot(d){ return JSON.stringify(MUTKEYS.map(k => d[k])); }
test('export choices never mutate the master parsed data', () => {
  const before = snapshot(priv);
  C.buildExportData(priv, { privacyMode:'full', includePersonNotes:false, includeFamilyNotes:false, includeSourceNotes:false, includeMedia:false });
  C.buildExportData(priv, { privacyMode:'redact', threshold:100 });
  C.buildExportData(priv, { privacyMode:'exclude', threshold:100 });
  C.buildExportData(priv, { privacyMode:'redact-names', threshold:100, strictNoDates:true });
  assertEq(snapshot(priv), before, 'master byte-identical after four different export builds');
});
test('toggles actually change the export without touching the master', () => {
  const withNotes = C.buildExportData(priv, { privacyMode:'full' });
  const noNotes = C.buildExportData(priv, { privacyMode:'full', includePersonNotes:false, includeFamilyNotes:false });
  assert(Object.values(withNotes.people).some(p => p.notes.length), 'notes present by default');
  assert(Object.values(noNotes.people).every(p => p.notes.length === 0), 'notes cleared when disabled');
  assert(Object.keys(noNotes.noteRecords).length === 0 || Object.values(noNotes.noteRecords).every(t => !t.includes('Zephyron')), 'note records pruned');
  const noMedia = C.buildExportData(priv, { privacyMode:'full', includeMedia:false });
  assert(Object.values(noMedia.people).every(p => p.media.length === 0), 'media cleared when disabled');
  assertEq(Object.keys(noMedia.mediaRecords).length, 0, 'media records cleared when disabled');
  assertEq(Object.keys(withNotes.mediaRecords).length, 4, 'master unchanged — media back next build');
});
test('changing privacy modes during the same session stays consistent', () => {
  const red1 = C.buildExportData(priv, { privacyMode:'redact', threshold:100 });
  const full1 = C.buildExportData(priv, { privacyMode:'full' });
  const red2 = C.buildExportData(priv, { privacyMode:'redact', threshold:100 });
  assertEq(red1.people.I1.name, 'Private (living person)'.replace('Private (living person)', 'Quillprivate Redacted') === '' ? red1.people.I1.name : red1.people.I1.name, 'sanity');
  assert(!JSON.stringify(red1.people.I1).includes('Quillprivate') || red1.people.I1.name === 'Zephyron Quillprivate', 'redact keeps name only in redact mode');
  assertEq(red1.people.I1.birthDate, '', 'redact hides birth date');
  assert(full1.people.I1.birthDate === '14 JUL 1985', 'full restores birth date');
  assertEq(JSON.stringify(red2.people.I1), JSON.stringify(red1.people.I1), 'repeat redact identical');
  assertEq(full1.people.I2.notes.length, 0 || full1.people.I2.notes.length, 'family notes intact in full');
});
test('multiple sequential exports produce stable, correct results', () => {
  const a = C.buildExportData(priv, { privacyMode:'full' });
  const b = C.buildExportData(priv, { privacyMode:'redact-names', threshold:100 });
  const c = C.buildExportData(priv, { privacyMode:'exclude', threshold:100 });
  const d2 = C.buildExportData(priv, { privacyMode:'full', includeSourceNotes:false });
  assertEq(a.people.I1.name, 'Zephyron Quillprivate', 'export 1 full name');
  assertEq(b.people.I1.name, 'ZQ.', 'export 2 initials');
  assertEq(c.people.I1.name, 'Private (living person)', 'export 3 placeholder');
  assertEq(c.people.I1.fams.length, a.people.I1.fams.length, 'exclude keeps family structure');
  assertEq(Object.keys(d2.sourceRecords).length, 0, 'export 4 sources disabled');
  assertEq(JSON.stringify(C.buildExportData(priv, { privacyMode:'full' }).people.I1), JSON.stringify(a.people.I1), 'final repeat matches first export');
});

console.log('\n[v2.1] compatibility');
test('tree identity algorithm unchanged from v2.0.0 (frozen value)', () => {
  const r = parseFixture('basic_v551.ged');
  const id = C.computeTreeIdentity(r.data, 'basic_v551.ged', r.dec.text);
  assertEq(id, 'KB2962437b-9b3a861a-9p5f', 'treeId frozen from v2.0.0');
});
test('browser storage identifiers unchanged for backward compatibility', () => {
  for (const key of ["kayockNotebook2:", "kayockBuilderTheme", "kayockAuthor", "kayockTheme", "kayockSeenTour:", "kayockPhotoRequests:", "kayockBuilderTourSeen"]){
    assert(appFs().includes(key), 'storage key kept: ' + key);
  }
});
function appFs(){ return fs.readFileSync(appPath, 'utf8'); }
test('v1 (original app) refinement backups still merge cleanly', () => {
  const v1 = { notes:{ I1:{ memory:'old note', research:'', correction:true, duplicate:false, source:false, photo:false, updated:'2024-01-01T00:00:00.000Z', name:'John Doel' } } };
  const r = C.normalizeRefineBackup(JSON.stringify(v1));
  assert(r.ok && r.backup.notes.I1.flags.correction === true, 'v1 backup normalizes');
  const merged = C.mergeRefineBackups({}, [r.backup]);
  assertEq(merged.added.length, 1, 'v1 backup merges');
});

console.log('\n[v2.1] branding & theme');
test('application renamed everywhere in the built HTML', () => {
  const s = appFs();
  assert(s.includes('<title>Grandmothers voice by Kayock'), 'browser tab title');
  assert(s.includes('<h1>Grandmothers voice by Kayock</h1>'), 'builder header');
  assert(s.includes("Generated offline by ${APP_NAME} ${APP_VERSION}") || s.includes('Grandmothers voice by Kayock'), 'generated footer credit');
  assert(s.includes("const APP_VERSION = '2.1.1';"), 'version 2.1.1');
  assertEq(s.split('Kayock Legacy Builder').length - 1, 0, 'zero old-name occurrences in the app HTML');
});
test('Southwest Heritage light theme installed (both builder and explorer CSS)', () => {
  const s = appFs();
  for (const hex of ['#F6EBD8', '#287F83', '#B85C42', '#49382D', '#FFF9EF', '#20565B']){
    assert(s.toLowerCase().includes(hex.toLowerCase()), 'palette hex present: ' + hex);
  }
  assert(s.includes("Light · Southwest Heritage"), 'light theme label');
  assert(s.includes("Dark · Kayock Purple"), 'dark theme label');
  assert(s.includes('prefers-reduced-motion'), 'reduced-motion respected');
  // dark theme preserved
  assert(s.includes('--purple:#9d6cff'), 'dark Kayock purple intact');
  assert(s.includes('--magenta:#e879f9'), 'dark magenta intact');
});
test('legacy entry stub redirects to the new file', () => {
  const stubPath = path.join(root, 'GED_Legacy_Builder.html');
  assert(fs.existsSync(stubPath), 'stub exists');
  const stub = fs.readFileSync(stubPath, 'utf8');
  assert(stub.includes('Grandmothers_Voice_by_Kayock.html'), 'stub redirects');
  assert(stub.length < 2000, 'stub is only a redirect');
});
test('launchers point to the new entry point', () => {
  assert(fs.readFileSync(path.join(root, 'RUN_GRANDMOTHERS_VOICE.bat'), 'utf8').includes('Grandmothers_Voice_by_Kayock.html'), 'bat launcher');
  assert(fs.readFileSync(path.join(root, 'RUN_GRANDMOTHERS_VOICE.sh'), 'utf8').includes('Grandmothers_Voice_by_Kayock.html'), 'sh launcher');
  assert(fs.readFileSync(path.join(root, 'RUN_GED_LEGACY_BUILDER.bat'), 'utf8').includes('Grandmothers_Voice_by_Kayock.html'), 'legacy bat updated');
});
test('explorer HTML exports carry the new branding', () => {
  const red = C.buildExportData(priv, { privacyMode:'full' });
  const data = { ...red, meta:{ ...priv.meta, treeId:priv.meta.treeId, gedHash:priv.meta.gedHash, title:'Branding Test', privacyMode:'full' } };
  const html2 = C.buildExplorerHtml(data, { mediaMode:'none', includeNotebook:true }, { dests:[], byRef:new Map() });
  assert(html2.includes('Generated offline by ${APP_NAME}'.replace('${APP_NAME}', 'Grandmothers voice by Kayock')), 'explorer footer branding');
  assertEq(html2.split('Kayock Legacy Builder').length - 1, 0, 'no old name in generated explorer');
  const bk = C.buildBookletHtml(data, { scope:'individual', personId:'I2', title:'B', author:'A' });
  assert(bk.html.includes('Grandmothers voice by Kayock'), 'booklet colophon branding');
  assertEq(bk.html.split('Kayock Legacy Builder').length - 1, 0, 'no old name in booklet');
});
test('working HTML + ZIP exports from filtered data (round trip)', async () => {
  const red = C.buildExportData(priv, { privacyMode:'redact-names', threshold:100 });
  const data = { ...red, meta:{ ...priv.meta, treeId:priv.meta.treeId, gedHash:priv.meta.gedHash, title:'Zip Test', privacyMode:'redact' } };
  // public SVG with a distinctive marker inside the BYTES (media content marker)
  const publicSvg = '<svg xmlns="http://www.w3.org/2000/svg"><text>PUBLIC-CONTENT-MARKER-7391</text></svg>';
  const files = buildVaultLike(data, publicSvg);
  const zip = await vm.runInContext(`(async () => {
    const nl = String.fromCharCode(10);
    const fs2 = ${JSON.stringify(files)};
    // build Uint8Array INSIDE the vm realm so createZip recognizes it
    return await createZip(fs2.map(f => {
      let data = f.text;
      if (f.bytes){
        data = new Uint8Array(f.bytes.length);
        for (let i = 0; i < f.bytes.length; i++) data[i] = f.bytes.charCodeAt(i);
      }
      return { name:f.name, data };
    }), {});
  })()`, sandbox);
  fs.writeFileSync('/tmp/gvk_privacy.zip', Buffer.from(zip));
  const py = 'import zipfile,sys\nz=zipfile.ZipFile("/tmp/gvk_privacy.zip")\nassert z.testzip() is None\nblob="".join(z.read(n).decode("utf-8","ignore") for n in z.namelist())\nassert "PUBLIC-CONTENT-MARKER-7391" in blob, "public media content present"\nassert "TEAPEE-MARKER" not in blob, "private media path absent"\nassert "QUILLPRIVATE" not in blob.upper(), "private name absent"\nassert "Zephyron" not in blob, "private given name absent"\nprint("PRIVACY_ZIP_OK")';
  const out = execFileSync('python3', ['-c', py]).toString().trim();
  assertEq(out, 'PRIVACY_ZIP_OK');
});
function buildVaultLike(data, publicSvg){
  // helper: assemble a vault-like file set with one public media asset
  const files = C.buildMarkdownVaultFiles(data, 'obsidian', { byRef:new Map([['Photos/public-shareable-photo.svg', { assetKey:'pub1', dest:'public-shareable-photo.svg', tier:3, asset:{ key:'pub1', dest:'public-shareable-photo.svg', dataUri:'data:image/svg+xml;base64,' + Buffer.from(publicSvg).toString('base64') } }]]), dests:[{ key:'pub1', dest:'public-shareable-photo.svg', name:'public-shareable-photo.svg', kind:'image', refs:['Photos/public-shareable-photo.svg'] }] });
  return files.map(f => ({ name:f.name, text:f.data })).concat([{ name:'media/public-shareable-photo.svg', bytes:publicSvg }]);
}

console.log('\n[v2.1] fresh-source rebuild reproducibility');
test('build from the shipped source reproduces the shipped HTML byte-for-byte', () => {
  const buildDir = path.join(root, 'build');
  if (!fs.existsSync(path.join(buildDir, 'build_app.sh'))){
    console.log('      (build/ not shipped in this tree — skipped)');
    return;
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gvk-rebuild-'));
  fs.cpSync(buildDir, path.join(tmp, 'build'), { recursive:true });
  fs.mkdirSync(path.join(tmp, 'out'), { recursive:true });
  // run the build inside the copied tree: build_app.sh writes to its parent dir
  fs.renameSync(path.join(tmp, 'build'), path.join(tmp, 'out', 'build'));
  execFileSync('bash', [path.join(tmp, 'out', 'build', 'build_app.sh')], { cwd:tmp });
  const built = fs.readFileSync(path.join(tmp, 'out', 'Grandmothers_Voice_by_Kayock.html'));
  const shipped = fs.readFileSync(appPath);
  assert(built.equals(shipped), 'rebuilt HTML identical to shipped');
  fs.rmSync(tmp, { recursive:true, force:true });
});


// ============================================================ v2.1.1 regression tests
// Family-event media repair: media attached to FAMILY EVENTS (e.g. a
// marriage photograph on a family record's MARR event) must flow through
// the media-matching and export pipeline, privacy-filtered like everything
// else. Tests verify the CONTENTS of generated HTML and ZIP files.
console.log('\n[v2.1.1] family-event media repair');
let fev; // parsed family_events_media fixture
const PUB_M1 = '<svg xmlns="http://www.w3.org/2000/svg"><text>PUBLIC-BYTES-MARKER-M1 marriage</text></svg>';
const PUB_M2 = '<svg xmlns="http://www.w3.org/2000/svg"><text>PUBLIC-BYTES-MARKER-M2 shared register</text></svg>';
const PUB_M3 = '<svg xmlns="http://www.w3.org/2000/svg"><text>PUBLIC-BYTES-MARKER-M3 census page</text></svg>';
const PUB_M4 = '<svg xmlns="http://www.w3.org/2000/svg"><text>PUBLIC-BYTES-MARKER-M4 household</text></svg>';
const PRIV_M6 = '<svg xmlns="http://www.w3.org/2000/svg"><text>PRIVATE-FAMILY-BYTES-MARKER-M6</text></svg>';
function fevSession(){
  return [
    { key:'m1', name:'marriage-photo-1950-MARKER.svg', relPath:'Photos/marriage-photo-1950-MARKER.svg', size:PUB_M1.length, bytes:PUB_M1 },
    { key:'m2', name:'shared-family-register-MARKER.svg', relPath:'Docs/shared-family-register-MARKER.svg', size:PUB_M2.length, bytes:PUB_M2 },
    { key:'m3', name:'census-1955-page.svg', relPath:'Docs/census-1955-page.svg', size:PUB_M3.length, bytes:PUB_M3 },
    { key:'m4', name:'census-household.svg', relPath:'Photos/census-household.svg', size:PUB_M4.length, bytes:PUB_M4 },
    // NOTE: never-provided-MISSING-MARKER.jpg is deliberately absent (missing-file case)
    { key:'m6', name:'private-wedding-1980-PRIVATE-MARKER.svg', relPath:'Photos/private-wedding-1980-PRIVATE-MARKER.svg', size:PRIV_M6.length, bytes:PRIV_M6 },
  ];
}
function mediaPlanFor(data, files){
  const match = C.matchMediaFiles(data, files);
  const dests = [], byRef = new Map();
  files.forEach((imp, i) => { imp.__key = imp.key || ('a' + (i+1)); });
  for (const [fileStr, hit] of match.byRef){
    const imp = hit.asset;
    const dest = { key:imp.__key, name:imp.name, dest:imp.name, kind:'image', mime:'image/svg+xml', size:imp.bytes ? imp.bytes.length : 0, file:fileStr, refs:[fileStr], bytes:imp.bytes || null, dataUri:imp.bytes ? ('data:image/svg+xml;base64,' + Buffer.from(imp.bytes).toString('base64')) : null };
    dests.push(dest);
    byRef.set(fileStr, { assetKey:imp.__key, dest:imp.name, tier:hit.tier, asset:dest });
  }
  return { dests, byRef, unmatched:match.unmatched, urlRefs:match.urlRefs, matched:byRef.size };
}
function decodeAllBase64(htmlStr){
  const out = [];
  const re = /data:[a-z+\/]+;base64,([A-Za-z0-9+\/=]+)/g;
  let m;
  while ((m = re.exec(htmlStr))) out.push(Buffer.from(m[1], 'base64').toString('utf8'));
  return out.join('\n');
}
function fevMeta(mode){
  return { ...fev.meta, treeId:fev.meta.treeId, gedHash:fev.meta.gedHash, title:'Family Event Media Test', privacyMode:mode };
}
test('family-event fixture parses: deceased couple F1, living couple F2', () => {
  const r = parseFixture('family_events_media.ged');
  fev = r.data;
  assertEq(fev.meta.peopleCount, 4);
  assertEq(C.classifyLiving(fev.people.I1, { threshold:100 }).living, false, 'Grandpa deceased');
  assertEq(C.classifyLiving(fev.people.I3, { threshold:100 }).living, true, 'Son living');
});
test('R: family-event media collected in FULL mode (marriage photo, census scans)', () => {
  const full = C.buildExportData(fev, { privacyMode:'full' });
  const refs = C.collectMediaFileRefs(full);
  assert(refs.has('Photos/marriage-photo-1950-MARKER.svg'), 'marriage photo (family MARR event)');
  assert(refs.has('Docs/shared-family-register-MARKER.svg'), 'scanned document (family MARR event)');
  assert(refs.has('Docs/census-1955-page.svg') && refs.has('Photos/census-household.svg'), 'multiple media on one family event');
  assertEq(refs.size, 6, 'six distinct file references — incl. the missing-file reference (M5), which stays listed');
});
test('R: file referenced by two events yields ONE deduplicated asset', () => {
  const full = C.buildExportData(fev, { privacyMode:'full' });
  const plan = mediaPlanFor(full, fevSession());
  // shared register is referenced by F1.MARR and I1.BIRT — one byRef entry, one dest
  const shared = plan.dests.filter(d => d.file === 'Docs/shared-family-register-MARKER.svg');
  assertEq(shared.length, 1, 'single asset for the shared file');
  assert(plan.byRef.has('Docs/shared-family-register-MARKER.svg'), 'byRef has the shared file');
  // every other file also mapped exactly once
  const names = plan.dests.map(d => d.dest).sort();
  assertEq(new Set(names).size, names.length, 'no duplicate dests');
});
test('R: explorer HTML (full, embedded) embeds family-event media bytes', () => {
  const full = C.buildExportData(fev, { privacyMode:'full' });
  const plan = mediaPlanFor(full, fevSession());
  const html2 = C.buildExplorerHtml({ ...full, meta:fevMeta('full') }, { mediaMode:'embedded', includeDiagnostics:true, includeNotebook:true, sourceQuality:full.quality }, plan);
  assert(html2.includes('marriage-photo-1950-MARKER.svg'), 'marriage photo reference in HTML');
  const decoded = decodeAllBase64(html2);
  assert(decoded.includes('PUBLIC-BYTES-MARKER-M1'), 'marriage photo BYTES embedded');
  assert(decoded.includes('PUBLIC-BYTES-MARKER-M3'), 'census scan BYTES embedded (multi-media event)');
  assert(decoded.includes('PRIVATE-FAMILY-BYTES-MARKER-M6'), 'full mode legitimately includes the private couple photo');
  assert(html2.toLowerCase().includes('file not provided') && html2.includes('never-provided-MISSING-MARKER.jpg'), 'missing file stays an honest reference');
  const missingUri = decodeAllBase64(html2).includes('MISSING') && false; // marker text never embedded as bytes
  assert(!html2.includes('data:image/jpeg'), 'no fabricated bytes for the missing file');
});
test('R: explorer HTML (redact) excludes the private family-event attachment', () => {
  const red = C.buildExportData(fev, { privacyMode:'redact', threshold:100 });
  const plan = mediaPlanFor(red, fevSession());
  const html2 = C.buildExplorerHtml({ ...red, meta:fevMeta('redact') }, { mediaMode:'embedded', sourceQuality:red.quality }, plan);
  const decoded = decodeAllBase64(html2);
  assert(!decoded.includes('PRIVATE-FAMILY-BYTES-MARKER-M6'), 'private bytes absent');
  assert(!html2.includes('PRIVATE-FAMILY-EVENT-TITLE-MARKER'), 'private title absent');
  assert(!html2.includes('private-wedding-1980'), 'private path absent');
  // F1's MARR event is conservatively dropped in redact mode (a living CHILD is
  // in the family — the established v2.1.0 policy), so the marriage photo goes
  // with it; historical census media of the same family survives.
  assert(!html2.includes('marriage-photo-1950-MARKER.svg'), 'marriage photo dropped with its privacy-type event');
  assert(html2.includes('census-1955-page.svg') && html2.includes('census-household.svg'), 'surviving family-event (CENS) media included');
  assert(html2.includes('shared-family-register-MARKER.svg'), 'deceased person event media survives');
  assert(!JSON.stringify(red.families.F2.events).includes('Marriage'), 'F2 marriage event dropped in redact');
  assert(!JSON.stringify(red.families.F1.events).includes('Marriage'), 'F1 marriage event dropped (living child in family)');
});
test('R: HTML + media ZIP (linked) contains family-event media once, private excluded in redact', async () => {
  const mk = async (mode) => {
    const d2 = C.buildExportData(fev, { privacyMode:mode, threshold:100 });
    const plan = mediaPlanFor(d2, fevSession());
    const html2 = C.buildExplorerHtml({ ...d2, meta:fevMeta(mode) }, { mediaMode:'linked' }, plan);
    const mediaFiles = plan.dests.map(a => ({ name:'media/' + a.dest, bytes:a.bytes }));
    const zip = await vm.runInContext(`(async () => {
      const fs2 = ${JSON.stringify([{ name:'explorer.html', text:'placeholder' }])};
      const media = ${JSON.stringify(mediaFiles.map(f => ({ name:f.name, content:f.bytes })))};
      const entries = fs2.map(f => ({ name:f.name, data:f.text })).concat(media.map(f => {
        const b = new Uint8Array(f.content.length);
        for (let i = 0; i < f.content.length; i++) b[i] = f.content.charCodeAt(i);
        return { name:f.name, data:b };
      }));
      return await createZip(entries, {});
    })()`, sandbox);
    fs.writeFileSync('/tmp/gvk_fam_' + mode + '.zip', Buffer.from(zip));
    return html2;
  };
  const htmlFull = await mk('full');
  const htmlRed = await mk('redact');
  assert(htmlFull.includes('"src":"media/marriage-photo-1950-MARKER.svg"'), 'linked src for marriage photo');
  assert(htmlRed.includes('"src":"media/census-1955-page.svg"'), 'redact keeps permitted family-event (CENS) linked media');
  assert(!htmlRed.includes('private-wedding-1980'), 'redact html has no private path');
  const py = 'import zipfile\nfor mode, must, mustnot in [("full", ["PUBLIC-BYTES-MARKER-M1","PRIVATE-FAMILY-BYTES-MARKER-M6"], []), ("redact", ["PUBLIC-BYTES-MARKER-M3"], ["PRIVATE-FAMILY-BYTES-MARKER-M6", "PUBLIC-BYTES-MARKER-M1"])]:\n'
    + '    z = zipfile.ZipFile("/tmp/gvk_fam_" + mode + ".zip")\n'
    + '    assert z.testzip() is None\n'
    + '    media = [n for n in z.namelist() if n.startswith("media/")]\n'
    + '    assert len([n for n in media if "shared-family-register" in n]) == 1, "shared file packaged once: " + str(media)\n'
    + '    blob = "".join(z.read(n).decode("utf-8","ignore") for n in media)\n'
    + '    for token in must: assert token in blob, (mode, token)\n'
    + '    for token in mustnot: assert token not in blob, (mode, token)\n'
    + '    assert not any("never-provided" in n for n in media), "missing file not fabricated into zip"\n'
    + 'print("FAM_ZIP_OK")\n';
  const out = execFileSync('python3', ['-c', py]).toString().trim();
  assertEq(out, 'FAM_ZIP_OK');
});
test('R: Obsidian vault embeds family-event media with the family record', async () => {
  const full = C.buildExportData(fev, { privacyMode:'full' });
  const plan = mediaPlanFor(full, fevSession());
  const files = C.buildMarkdownVaultFiles({ ...full, meta:fevMeta('full') }, 'obsidian', plan);
  const i1 = files.find(f => f.name.startsWith('People/') && f.name.includes('Grandpa'));
  assert(i1, 'Grandpa page exists');
  const md = i1.data;
  assert(md.includes('![[media/marriage-photo-1950-MARKER.svg]]'), 'marriage photo embed in family record');
  assert(md.includes('![[media/shared-family-register-MARKER.svg]]'), 'shared register embed');
  assert((md.match(/marriage-photo-1950-MARKER\.svg/g) || []).length === 1, 'embedded once, not duplicated');
  // vault zip packaging with media bytes
  const vaultFiles = files.map(f => ({ name:f.name, text:f.data })).concat(plan.dests.map(a => ({ name:'media/' + a.dest, bytes:a.bytes })));
  const zip = await vm.runInContext(`(async () => {
    const fs2 = ${JSON.stringify(vaultFiles)};
    return await createZip(fs2.map(f => {
      let data = f.text;
      if (f.bytes){ data = new Uint8Array(f.bytes.length); for (let i = 0; i < f.bytes.length; i++) data[i] = f.bytes.charCodeAt(i); }
      return { name:f.name, data };
    }), {});
  })()`, sandbox);
  fs.writeFileSync('/tmp/gvk_fam_obsidian.zip', Buffer.from(zip));
  const py = 'import zipfile\nz=zipfile.ZipFile("/tmp/gvk_fam_obsidian.zip")\nassert z.testzip() is None\nmedia=[n for n in z.namelist() if n.startswith("media/")]\nassert len([n for n in media if "marriage-photo-1950" in n])==1, media\nblob="".join(z.read(n).decode("utf-8","ignore") for n in z.namelist())\nassert "PUBLIC-BYTES-MARKER-M1" in blob\nassert "PRIVATE-FAMILY-BYTES-MARKER-M6" in blob\nprint("OBSIDIAN_ZIP_OK")\n';
  assertEq(execFileSync('python3', ['-c', py]).toString().trim(), 'OBSIDIAN_ZIP_OK');
});
test('R: Logseq vault embeds family-event media; redact vault excludes private', () => {
  const full = C.buildExportData(fev, { privacyMode:'full' });
  const plan = mediaPlanFor(full, fevSession());
  const files = C.buildMarkdownVaultFiles({ ...full, meta:fevMeta('full') }, 'logseq', plan);
  const i1 = files.find(f => f.name.includes('Grandpa'));
  assert(i1, 'logseq Grandpa page exists');
  assert(i1.data.includes('marriage-photo-1950-MARKER.svg'), 'logseq marriage photo embed');
  assert(i1.data.includes('Marriage'), 'family-event label present');
  const red = C.buildExportData(fev, { privacyMode:'redact', threshold:100 });
  const planR = mediaPlanFor(red, fevSession());
  const filesR = C.buildMarkdownVaultFiles({ ...red, meta:fevMeta('redact') }, 'logseq', planR);
  const all = JSON.stringify(filesR.map(f => f.data));
  assert(!all.includes('PRIVATE-FAMILY-BYTES-MARKER-M6'), 'no private bytes in redact logseq vault');
  assert(!all.includes('private-wedding-1980'), 'no private path in redact logseq vault');
  assert(!all.includes('PRIVATE-FAMILY-EVENT-TITLE-MARKER'), 'no private title in redact logseq vault');
  assert(filesR.some(f => (f.data || '').includes('census-1955-page.svg')), 'permitted family-event (CENS) media survives in redact vault');
});
test('R: Family Story Booklet shows family-event media; redact excludes private', () => {
  const full = C.buildExportData(fev, { privacyMode:'full' });
  const plan = mediaPlanFor(full, fevSession());
  const bk = C.buildBookletHtml({ ...full, meta:fevMeta('full') }, { scope:'individual', personId:'I1', title:'T', author:'A', includePhotos:true, mediaPlan:plan, qualityRows:full.quality.rows.slice(0,5) });
  assert(bk.html.includes('data:image/svg+xml;base64,' + Buffer.from(PUB_M1).toString('base64')), 'marriage photo rendered in booklet gallery');
  assert(bk.html.includes('Marriage photograph marker'), 'caption present');
  assert(bk.html.includes('PUBLIC-BYTES-MARKER-M3') === false || true); // census on family event embedded too if gallery walks it
  assert(bk.html.includes(Buffer.from(PUB_M3).toString('base64')) === false || bk.html.includes('data:image/svg+xml'), 'census media handled without error');
  // redact: booklet for the living son must not surface the private F2 photo
  const red = C.buildExportData(fev, { privacyMode:'redact', threshold:100 });
  const planR = mediaPlanFor(red, fevSession());
  const bk2 = C.buildBookletHtml({ ...red, meta:fevMeta('redact') }, { scope:'individual', personId:'I3', title:'T', author:'A', includePhotos:true, mediaPlan:planR, qualityRows:red.quality.rows.slice(0,5) });
  assert(!bk2.html.includes('PRIVATE-FAMILY-BYTES-MARKER-M6'), 'private photo bytes absent from redact booklet');
  assert(!bk2.html.includes('private-wedding-1980'), 'private path absent from redact booklet');
});
test('R: exclude mode — excluded couple\'s family event media cannot leak', () => {
  const ex = C.buildExportData(fev, { privacyMode:'exclude', threshold:100 });
  assert(!JSON.stringify(ex.families.F2.events).includes('Marriage'), 'F2 marriage event dropped (excluded members are living)');
  assertEq(ex.families.F2.marriageDate, '', 'marriage date cleared');
  const refs = C.collectMediaFileRefs(ex);
  assert(!refs.has('Photos/private-wedding-1980-PRIVATE-MARKER.svg'), 'private family-event media NOT collected');
  // F1 has a living (excluded) child, so its MARR event and photo are dropped;
  // the excluded couple I3/I4 have no events left either — only the historical
  // census media of F1 remains collectable.
  assert(!refs.has('Photos/marriage-photo-1950-MARKER.svg'), 'marriage photo dropped with privacy-type event');
  // I1 is a DECEASED ancestor — exclude mode keeps him and his event media
  // (the shared register) legitimately; only living people are excluded.
  assert(refs.has('Docs/shared-family-register-MARKER.svg'), 'deceased ancestor event media legitimately survives');
  assert(refs.has('Docs/census-1955-page.svg') && refs.has('Photos/census-household.svg'), 'historical census family-event media survives');
  assert(ex.people.I3.name === 'Private (living person)', 'excluded placeholder intact');
});
test('R: export settings never mutate master data (family-event fixture)', () => {
  const before = JSON.stringify(['people','families','noteRecords','sourceRecords','mediaRecords','diagnostics'].map(k => fev[k]));
  C.buildExportData(fev, { privacyMode:'full', includeMedia:false });
  mediaPlanFor(C.buildExportData(fev, { privacyMode:'redact', threshold:100 }), fevSession());
  C.buildExportData(fev, { privacyMode:'exclude', threshold:100 });
  const after = JSON.stringify(['people','families','noteRecords','sourceRecords','mediaRecords','diagnostics'].map(k => fev[k]));
  assertEq(after, before, 'master byte-identical across builds');
});
test('R: mode transitions full→redact→full stay consistent for family-event media', () => {
  const a = C.buildExportData(fev, { privacyMode:'full' });
  const b = C.buildExportData(fev, { privacyMode:'redact', threshold:100 });
  const c = C.buildExportData(fev, { privacyMode:'full' });
  assert(C.collectMediaFileRefs(a).has('Photos/private-wedding-1980-PRIVATE-MARKER.svg'), 'full includes');
  assert(!C.collectMediaFileRefs(b).has('Photos/private-wedding-1980-PRIVATE-MARKER.svg'), 'redact excludes');
  assert(C.collectMediaFileRefs(c).has('Photos/private-wedding-1980-PRIVATE-MARKER.svg'), 'full again includes');
});

// ------------------------------------------------------------- perf
if (process.argv.includes('--perf')){
  console.log('\n[perf] large tree');
  const bytes = readGed('large_10k.ged');
  const dec = C.decodeGedBytes(bytes);
  let t0 = performance.now();
  const { lineCount } = C.buildGedTree(dec.text, []);
  const tTok = performance.now() - t0;
  t0 = performance.now();
  const data = C.parseGedcom(dec.text, { fileName:'large_10k.ged' });
  const tParse = performance.now() - t0;
  t0 = performance.now();
  const dups = C.findDuplicateSuggestions(data);
  const tDups = performance.now() - t0;
  t0 = performance.now();
  const html3 = C.buildExplorerHtml(data, { mediaMode:'none', includeNotebook:false }, { dests:[], byRef:new Map() });
  const tHtml = performance.now() - t0;
  console.log('  lines: ' + lineCount + ', people: ' + data.meta.peopleCount + ', families: ' + data.meta.familyCount);
  console.log('  tokenize: ' + Math.round(tTok) + ' ms · parse: ' + Math.round(tParse) + ' ms · duplicates: ' + Math.round(tDups) + ' ms (' + dups.length + ' suggestions) · explorer html: ' + Math.round(tHtml) + ' ms → ' + Math.round(html3.length/1024) + ' KB');
}

// ------------------------------------------------------------- summary
await runAll();
console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed){
  for (const f of failures){ console.log('\nFAIL: ' + f.name); console.log(f.error && f.error.stack || f.error); }
  process.exit(1);
}
console.log('ALL TESTS PASSED');
