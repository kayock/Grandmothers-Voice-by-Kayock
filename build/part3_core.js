<script>
'use strict';
/* ======================================================================
   Grandmothers voice by Kayock v2.1.0 — offline Family Legacy Studio
   MIT License. Runs fully offline; no network calls anywhere.
   ====================================================================== */
/* ==== CORE-BEGIN ====  (pure functions below are DOM-free so the
   automated test harness in tests/run_tests.mjs can load them verbatim) */
const APP_VERSION = '2.1.1';
const APP_NAME = 'Grandmothers voice by Kayock';
const APP_LICENSE = 'MIT';

// ---------------------------------------------------------- tiny utilities
function htmlEscape(s){ return String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function escapeJsonForScript(obj){ return JSON.stringify(obj).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029'); }
function fmt(n){ return Number(n||0).toLocaleString(); }
function normalize(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); }
function cleanFileBase(name){ return (name || 'Family_Tree').replace(/\.[^.]+$/,'').replace(/[^a-z0-9_ -]+/gi,'').trim().replace(/\s+/g,'_') || 'Family_Tree'; }
function stripAt(s){ return (s || '').replace(/^@+|@+$/g,''); }
function isPointer(s){ return /^@[^@]+@$/.test((s||'').trim()); }
function cleanName(name){ return String(name||'').replace(/\s*\/\s*/g,' ').replace(/\s+/g,' ').trim() || 'Unnamed person'; }
function debounce(fn,ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; }
function fnv1a(str){ let h = 0x811c9dc5; const s = String(str); for (let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); }
function unique(arr){ return [...new Set((arr||[]).filter(x => x !== undefined && x !== null && x !== ''))]; }
function safeInt(n, dflt){ const v = parseInt(n, 10); return Number.isFinite(v) ? v : dflt; }

// ------------------------------------------------------ encoding detection
// ANSEL (MARC-8 extended Latin) — confident subset of the published mapping.
// Combining marks (0xE0-0xFE) precede the base character in ANSEL.
const ANSEL_COMBINING = { 0xE1:'\u0300', 0xE2:'\u0301', 0xE3:'\u0302', 0xE4:'\u0303', 0xE5:'\u0304', 0xE6:'\u0306', 0xE7:'\u0307', 0xE8:'\u0308', 0xE9:'\u030A', 0xEB:'\u0361', 0xEC:'\u035C', 0xEE:'\u030B', 0xEF:'\u030C', 0xF0:'\u0327', 0xF1:'\u0328' };
const ANSEL_DIRECT = { 0xA1:'\u0141', 0xA2:'\u00D8', 0xA3:'\u0110', 0xA4:'\u00DE', 0xA5:'\u00C6', 0xA6:'\u0152', 0xA8:'\u00B7', 0xAA:'\u00AE', 0xAB:'\u00B0', 0xBA:'\u00DF', 0xBC:'\u0153', 0xBD:'\u02CA', 0xBE:'\u00C5', 0xBF:'\u00C3' };
function decodeAnsel(bytes){
  let out = '', pending = [], unknown = 0;
  for (let i=0;i<bytes.length;i++){
    const b = bytes[i];
    if (b < 0x80) { out += applyPending(String.fromCharCode(b), pending); continue; }
    if (ANSEL_COMBINING[b] !== undefined) { pending.push(ANSEL_COMBINING[b]); continue; }
    if (ANSEL_DIRECT[b] !== undefined) { out += applyPending(ANSEL_DIRECT[b], pending); continue; }
    if (b >= 0xE0 && b <= 0xFE) { pending.push('\uFFFD'); unknown++; continue; } // unrecognised combining mark
    out += applyPending(String.fromCharCode(b), pending); // keep Latin-1 fallback for other high bytes
    if (b >= 0x80) unknown++;
  }
  out += pending.join('');
  return { text: out.normalize('NFC'), unknown };
}
function applyPending(ch, pending){ if (!pending.length) return ch; const marks = pending.join(''); pending.length = 0; return ch + marks; }

const CHAR_VALUE_MAP = { 'ANSEL':'x-ansel', 'UTF-8':'utf-8', 'UNICODE':'utf-16', 'UTF-16':'utf-16', 'ANSI':'windows-1252', 'IBM WINDOWS':'windows-1252', 'WINDOWS-1252':'windows-1252', 'IBMPC':'ibm850', 'MSDOS':'ibm850', 'ASCII':'us-ascii', 'ISO-8859-1':'iso-8859-1' };
function detectEncoding(bytes){
  const result = { charset:'utf-8', declared:null, declaredLabel:null, bom:null, warnings:[], bytesScanned:Math.min(bytes.length, 8192) };
  if (!bytes.length) return result;
  // BOM
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) { result.bom = 'utf-8'; result.charset = 'utf-8'; }
  else if (bytes[0] === 0xFF && bytes[1] === 0xFE) { result.bom = 'utf-16le'; result.charset = 'utf-16le'; }
  else if (bytes[0] === 0xFE && bytes[1] === 0xFF) { result.bom = 'utf-16be'; result.charset = 'utf-16be'; }
  // find "1 CHAR " in the first bytes (works for ASCII-ish headers; ANSEL/1252 headers are ASCII too)
  const probe = new TextDecoder('latin1').decode(bytes.subarray(0, 4096));
  const m = probe.match(/^[0-9]{1,2}\s+CHAR\s+([^\r\n]+)/mi);
  if (m) {
    const declared = m[1].trim().toUpperCase().replace(/\s*\(.*\)$/, '');
    result.declared = declared; result.declaredLabel = m[1].trim();
    if (CHAR_VALUE_MAP[declared]) {
      let cs = CHAR_VALUE_MAP[declared];
      if (cs === 'utf-16' && !result.bom) cs = guessUtf16Endianess(bytes);
      if (cs === 'utf-16' && result.bom) cs = result.bom === 'utf-16be' ? 'utf-16be' : 'utf-16le';
      result.charset = cs;
    } else {
      result.warnings.push('Unrecognised 1 CHAR value "' + m[1].trim() + '"; falling back to UTF-8/Latin-1 heuristic.');
    }
  }
  // Heuristic validation when no BOM: try UTF-8 strict; if it fails, prefer windows-1252 unless ANSEL declared
  if (!result.bom) {
    if (result.charset === 'x-ansel') { /* keep */ }
    else if (result.charset === 'ibm850') { /* keep */ }
    else {
      try { new TextDecoder('utf-8', { fatal:true }).decode(bytes.subarray(0, 8192)); }
      catch(e) {
        if (result.charset === 'utf-8') { result.charset = 'windows-1252'; result.warnings.push('File is not valid UTF-8; decoded as Windows-1252 (typical for older programs).'); }
      }
    }
  } else if (result.bom === 'utf-8' && result.charset !== 'utf-8') {
    result.warnings.push('UTF-8 BOM present but 1 CHAR says ' + result.declaredLabel + '; using UTF-8.');
    result.charset = 'utf-8';
  }
  return result;
}
function guessUtf16Endianess(bytes){
  // count zero bytes at odd vs even offsets in the first 1KB
  let even = 0, odd = 0;
  for (let i=0;i<Math.min(bytes.length,1024);i++){ if (bytes[i]===0) (i%2===0 ? even++ : odd++); }
  return odd > even ? 'utf-16le' : 'utf-16be';
}
function decodeGedBytes(bytes){
  const det = detectEncoding(bytes);
  let text = '', decodeNote = '', unknownAnsel = 0;
  try {
    if (det.charset === 'x-ansel') { const r = decodeAnsel(bytes); text = r.text; unknownAnsel = r.unknown; if (unknownAnsel) det.warnings.push(unknownAnsel + ' extended ANSEL characters had no exact mapping and were kept as close Latin equivalents.'); }
    else if (det.charset === 'ibm850') { text = new TextDecoder('windows-1252').decode(bytes); decodeNote = 'IBM PC code page decoded with the closest available table (Windows-1252).'; }
    else if (det.charset === 'us-ascii' || det.charset === 'iso-8859-1') text = new TextDecoder('windows-1252').decode(bytes);
    else text = new TextDecoder(det.charset).decode(bytes);
  } catch(e) { text = new TextDecoder('windows-1252').decode(bytes); det.warnings.push('Decoder fallback: ' + e.message); }
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const label = { 'utf-8':'UTF-8', 'utf-16le':'UTF-16 LE', 'utf-16be':'UTF-16 BE', 'windows-1252':'Windows-1252 (ANSI)', 'x-ansel':'ANSEL', 'ibm850':'IBM PC 850', 'us-ascii':'ASCII', 'iso-8859-1':'ISO-8859-1' }[det.charset] || det.charset;
  return { text, det, charsetLabel:label, decodeNote, unknownAnsel };
}

// --------------------------------------------------------------- tokenizer
// GEDCOM grammar: exactly ONE space between fields; extra spaces belong to
// the value (critical for CONC/CONT leading spaces).
const GED_LINE_RE = /^(\d{1,3}) (?:(@[^@\s]+@) )?([A-Za-z0-9_]+)(?: (.*))?$/;
function parseGedLine(raw, lineNo){
  const line = raw.replace(/[\r\u0000]+$/,'');
  const m = line.match(GED_LINE_RE);
  if (!m) return { ok:false, line, lineNo, level:-1, xref:'', tag:'', value:'' };
  return { ok:true, line, lineNo, level:+m[1], xref:m[2]||'', tag:m[3]||'', value:m[4]!==undefined ? m[4] : '', children:[] };
}
function buildGedTree(text, diag){
  const roots = [], stack = [];
  const lines = text.split('\n');
  let lineCount = 0, malformed = 0;
  for (const raw of lines){
    if (!raw.trim()) continue;
    lineCount++;
    const node = parseGedLine(raw, lineCount);
    if (!node.ok){
      malformed++;
      if (diag && malformed <= 25) diag.push({ severity:'error', code:'MALFORMED_LINE', message:'Line ' + lineCount + ' could not be parsed as a GEDCOM structure line: "' + raw.trim().slice(0,80) + '"', xref:'' });
      continue;
    }
    if (node.level > 0){
      let parent = stack[node.level-1];
      while (!parent && node.level > 0){ node.level--; parent = stack[node.level-1]; } // recover from level gaps
      if (!parent){ roots.push(node); continue; }
      parent.children.push(node);
    } else {
      roots.push(node);
    }
    stack[node.level] = node;
    stack.length = node.level + 1;
  }
  return { roots, lineCount, malformed };
}
function firstChild(node, tag){ const c = node.children; for (let i=0;i<c.length;i++) if (c[i].tag === tag) return c[i]; return null; }
function allChildren(node, tag){ return (node.children||[]).filter(c => c.tag === tag); }
function textWithContinuations(node){
  let out = node.value || '';
  for (const c of node.children || []){
    if (c.tag === 'CONC') out += (c.value || '');
    else if (c.tag === 'CONT') out += (out ? '\n' : '') + (c.value || '');
  }
  return out.replace(/\n+$/,'');
}
function simpleValue(node, tag){ const c = firstChild(node, tag); return c ? textWithContinuations(c) : ''; }

// ----------------------------------------------------------- date parsing
const MONTHS = { JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,SEPT:9,OCT:10,NOV:11,DEC:12 };
function parseDate(raw){
  const res = { text:String(raw||''), year:0, month:0, day:0, modifier:'unknown', calendar:null, startYear:0, endYear:0 };
  if (!raw || !String(raw).trim()) return res;
  let s = String(raw).trim();
  const cal = s.match(/^@#D(GREGORIAN|JULIAN|HEBREW|FRENCH R|FRENCH|ROMAN|UNKNOWN)@\s*/i);
  if (cal){ res.calendar = cal[1].toUpperCase(); s = s.slice(cal[0].length).trim(); }
  const dateRe = s.match(/^((ABT|EST|CAL|AFT|BEF|FROM|TO)\s+)?(.+?)(\s+AND\s+(.+?))?(\s+TO\s+(.+))?$/i);
  let body = s;
  const up = s.toUpperCase();
  if (/^BET\s/i.test(up)) { res.modifier = 'between'; const mm = s.match(/^BET\s+(.+?)\s+AND\s+(.+)$/i); if (mm){ const a = parseDateSimple(mm[1]); const b = parseDateSimple(mm[2]); res.startYear=a.year; res.endYear=b.year; res.year=a.year||b.year; res.month=a.month||b.month; res.day=a.day; return res; } }
  const modMatch = up.match(/^(ABT|EST|CAL|AFT|BEF)\s+(.*)$/);
  if (modMatch){ res.modifier = modMatch[1].toLowerCase(); body = s.slice(modMatch[1].length).trim(); }
  else if (/^FROM\s/i.test(up)) { res.modifier = 'from'; const mm = s.match(/^FROM\s+(.+?)(\s+TO\s+(.+))?$/i); if (mm){ const a = parseDateSimple(mm[1]); res.startYear=a.year; res.year=a.year; res.month=a.month; res.day=a.day; if (mm[3]){ const b = parseDateSimple(mm[3]); res.endYear=b.year; } return res; } }
  else if (/^TO\s/i.test(up)) { res.modifier = 'to'; body = s.slice(2).trim(); }
  else if (/^\(.*\)$/.test(s)) { res.modifier = 'phrase'; return res; }
  else if (!/\d/.test(s)) { res.modifier = 'phrase'; return res; }
  else res.modifier = 'exact';
  const p = parseDateSimple(body);
  res.year=p.year; res.month=p.month; res.day=p.day; res.startYear=p.year; res.endYear=p.year;
  if (!p.year) res.modifier = res.modifier === 'exact' ? 'unknown' : res.modifier;
  return res;
}
function parseDateSimple(body){
  let s = body.trim();
  const dual = s.match(/(\d{3,4})\s*\/\s*(\d{2,4})/);
  if (dual) s = s.slice(0, dual.index) + dual[1] + s.slice(dual.index + dual[0].length);
  const m = s.match(/^(?:(\d{1,2})\s+)?([A-Za-z]{3,9})?\s*(\d{3,4})?$/);
  let year=0, month=0, day=0;
  if (m){
    if (m[1]) day = safeInt(m[1],0);
    if (m[2]){ const mo = MONTHS[m[2].toUpperCase().slice(0,9)]; if (mo) month = mo; else { const y = s.match(/(\d{3,4})/); return { year: y ? safeInt(y[1],0) : 0, month:0, day:0 }; } }
    if (m[3]) year = safeInt(m[3],0);
    if (!year){ const y = s.match(/(\d{3,4})/); if (y) year = safeInt(y[1],0); }
  } else {
    const y = s.match(/(\d{3,4})/); if (y) year = safeInt(y[1],0);
  }
  return { year, month, day };
}
function yearFromDate(s){ const p = parseDate(s); return p.startYear || p.year || 0; }
function dateCertainty(d){ return d && d.modifier !== 'exact' ? d.modifier : null; }

// -------------------------------------------------------------- GED parser
const EVENT_TAGS = new Set(['BIRT','CHR','BAPM','BARM','BASM','BLES','CHRA','CONF','DEAT','BURI','CREM','ADOP','EMIG','IMMI','NATU','ORDI','GRAD','RETI','WILL','PROB','EVEN','RESI','CENS','OCCU','EDUC','RELI','MILI','MILIT','CONF', 'BAPL','ENDL','SLGC','SLGS','CHANGE']);
const FAMILY_EVENT_TAGS = new Set(['MARR','DIV','ANUL','DIVF','ENGA','MARB','MARC','MARL','MARS','EVEN','CENS','RESI','SLGS']);
const ALL_INTEREST_TAGS = new Set([...EVENT_TAGS, ...FAMILY_EVENT_TAGS, 'NAME','SEX','NOTE','SOUR','OBJE','FAMS','FAMC','HUSB','WIFE','CHIL','CHAN','ASSO','ASSOCIATION','CONT','CONC','FILE','FORM','TITL','BLOB','QUAY','PAGE','DATA','TEXT','PUBL','AUTH','ABBR','REPO','CALN','MEDI','ADDR','ADR1','ADR2','ADR3','CITY','STAE','CTRY','POST','PHON','EMAIL','FAX','WWW','TYPE','DATE','PLAC','ROLE','RELA','CAUS','AGE','AGNC','STAT','TEMP','SLGP','SLGD','NPFX','GIVN','NICK','SPFX','SURN','NSFX','SSN','IDNO','DSCR','COLO','HAIR','EVENN','FAX','ADOP','LEGA','CAST','AUTH','DESC','_UID','RIN','AFN','RFN','REFN','_FSFTID','_AKA','_MEND','_CONF','_PRIM','_SIZE','_SCHEMA','SCHMA','PHON','UID','CREAT','LAST','TOP','COPY','HEAD','TRLR','SUBM','SUBN']);
const TAG_LABELS = { BIRT:'Birth', CHR:'Christening', BAPM:'Baptism', BARM:'Bar mitzvah', BASM:'Bas mitzvah', BLES:'Blessing', CHRA:'Adult christening', CONF:'Confirmation', DEAT:'Death', BURI:'Burial', CREM:'Cremation', ADOP:'Adoption', EMIG:'Emigration', IMMI:'Immigration', NATU:'Naturalization', ORDI:'Ordination', GRAD:'Graduation', RETI:'Retirement', WILL:'Will', PROB:'Probate', EVEN:'Event', RESI:'Residence', CENS:'Census', OCCU:'Occupation', EDUC:'Education', RELI:'Religion', MILI:'Military', MILIT:'Military', BAPL:'LDS baptism', ENDL:'LDS endowment', SLGC:'LDS sealing child', SLGS:'LDS sealing spouse', MARR:'Marriage', DIV:'Divorce', ANUL:'Annulment', DIVF:'Divorce filed', ENGA:'Engagement', MARB:'Marriage bann', MARC:'Marriage contract', MARL:'Marriage license', MARS:'Marriage settlement', CHANGE:'Last changed' };
function eventLabel(tag){ return TAG_LABELS[tag] || tag.charAt(0) + tag.slice(1).toLowerCase(); }

function parseCitationNode(sNode, ctx, isFamily){
  const val = textWithContinuations(sNode);
  const c = { ref:'', title:'', page:'', quay:null, text:'', note:[], dataEven:'' };
  if (isPointer(val) && ctx.sourceRecords[stripAt(val)]){
    c.ref = stripAt(val);
    const rec = ctx.sourceRecords[c.ref];
    c.title = rec.title || rec.abbr || c.ref;
    c.text = rec.text || ''; c.note = rec.note ? [rec.note] : [];
  } else if (val) { c.title = val; }
  const pageNode = firstChild(sNode,'PAGE'); if (pageNode) c.page = textWithContinuations(pageNode);
  const quayNode = firstChild(sNode,'QUAY'); if (quayNode){ const q = safeInt(textWithContinuations(quayNode), -1); if (q >= 0 && q <= 3) c.quay = q; }
  const dataNode = firstChild(sNode,'DATA');
  if (dataNode){
    const even = firstChild(dataNode,'EVEN'); if (even) c.dataEven = textWithContinuations(even);
    const t = firstChild(dataNode,'TEXT'); if (t) c.text = [c.text, textWithContinuations(t)].filter(Boolean).join('\n');
  }
  const tNode = firstChild(sNode,'TEXT'); if (tNode) c.text = [c.text, textWithContinuations(tNode)].filter(Boolean).join('\n');
  for (const nNode of allChildren(sNode,'NOTE')){
    const t = ctx.resolveNote(nNode);
    if (t) c.note.push(t);
  }
  c.note = c.note.join('\n\n');
  return c;
}
function parseMediaRefNode(oNode, ctx){
  const val = textWithContinuations(oNode);
  const m = { ref:'', file:'', form:'', title:'', note:'', files:[] };
  if (isPointer(val) && ctx.mediaRecords[stripAt(val)]){
    const rec = ctx.mediaRecords[stripAt(val)];
    return { ...rec, fromPointer:true };
  }
  m.inline = true;
  collectMediaFiles(oNode, m, ctx);
  if (!m.files.length && val) m.title = val;
  return m;
}
function collectMediaFiles(oNode, target, ctx){
  const fileNodes = allChildren(oNode,'FILE');
  for (const fNode of fileNodes){
    const entry = { file: textWithContinuations(fNode), form: simpleValue(fNode,'FORM'), title: simpleValue(fNode,'TITL') || simpleValue(oNode,'TITL'), blob:'' };
    target.files.push(entry);
    if (!target.file) target.file = entry.file;
    if (!target.form) target.form = entry.form;
    if (!target.title) target.title = entry.title;
  }
  const blob = firstChild(oNode,'BLOB');
  if (blob && !fileNodes.length){
    target.files.push({ file:'', form:'', title: simpleValue(oNode,'TITL') || '', blob:'[inline binary data not exportable]' });
    if (!target.title) target.title = '';
  } else if (blob){
    if (target.files.length) target.files[0].blob = '[inline binary data not exportable]';
  }
  for (const nNode of allChildren(oNode,'NOTE')){ const t = ctx.resolveNote(nNode); if (t) target.note += (target.note ? '\n\n' : '') + t; }
}
function eventFromNode(node, tag, ctx){
  const ev = { tag, type:eventLabel(tag), date:'', dateParsed:null, place:'', address:'', value:textWithContinuations(node), notes:[], sources:[], media:[] };
  const dNode = firstChild(node,'DATE'); if (dNode){ ev.date = textWithContinuations(dNode); ev.dateParsed = parseDate(ev.date); }
  const pNode = firstChild(node,'PLAC');
  if (pNode){ ev.place = textWithContinuations(pNode); const a = firstChild(pNode,'ADDR') || firstChild(node,'ADDR'); if (a) ev.address = textWithContinuations(a); }
  const aNode = firstChild(node,'ADDR'); if (aNode && !ev.address) ev.address = textWithContinuations(aNode);
  if (ev.value === 'Y' && (tag === 'DEAT' || tag === 'MARR' || tag === 'DIV')) ev.value = 'Yes';
  for (const n of allChildren(node,'NOTE')){ const t = ctx.resolveNote(n); if (t) ev.notes.push(t); }
  for (const s of allChildren(node,'SOUR')) ev.sources.push(parseCitationNode(s, ctx, false));
  for (const o of allChildren(node,'OBJE')) ev.media.push(parseMediaRefNode(o, ctx));
  if (tag === 'RESI' && ev.value && !ev.place && ev.value) { /* RESI with street value: keep in value */ }
  return ev;
}

function parseGedcom(text, opts){
  opts = opts || {};
  const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  const diag = opts.diag || [];
  const { roots, lineCount, malformed } = buildGedTree(text, diag);
  if (malformed > 25) diag.push({ severity:'error', code:'MALFORMED_LINE', message:'… ' + (malformed - 25) + ' additional malformed lines suppressed.', xref:'' });
  const ctx = { sourceRecords:{}, mediaRecords:{}, noteRecords:{}, repoRecords:{}, resolveNote:null,
    // ownership tracking: which records reference each shared note / source /
    // media record, so exports can privacy-filter auxiliary data precisely.
    noteOwners:{}, mediaOwners:{}, sourceOwners:{}, currentOwner:'_global' };
  const personNodes = [], familyNodes = [], headNode = [];
  const seenXrefs = {};
  // pass 1: structural checks, head, and shared NOTE records
  for (const r of roots){
    if (!r.xref && ['INDI','FAM','SOUR','OBJE','NOTE','REPO','SUBM'].includes(r.tag)){
      diag.push({ severity:'error', code:'MISSING_XREF', message:'A ' + r.tag + ' record has no @xref@ id; its data cannot be linked from other records.', xref:'' });
    }
    if (r.xref){
      if (seenXrefs[r.xref]){
        diag.push({ severity:'error', code:'DUPLICATE_XREF', message:'Duplicate @' + stripAt(r.xref) + '@ id used for two ' + r.tag + ' records (earlier: ' + seenXrefs[r.xref] + '). Records after the first are still parsed but links resolve to the first.', xref:stripAt(r.xref) });
      } else seenXrefs[r.xref] = r.tag;
    }
    if (r.tag === 'HEAD') headNode.push(r);
    else if (r.tag === 'NOTE' && r.xref) ctx.noteRecords[stripAt(r.xref)] = { id:stripAt(r.xref), text:textWithContinuations(r), extraNotes:allChildren(r,'NOTE').length };
  }
  ctx.resolveNote = function(nNode){
    const base = textWithContinuations(nNode);
    if (isPointer(base)){
      const rec = ctx.noteRecords[stripAt(base)];
      if (rec){
        (ctx.noteOwners[rec.id] ||= new Set()).add(ctx.currentOwner);
        if (rec.extraNotes) diag.push({ severity:'info', code:'NOTE_SUBSTRUCTURE', message:'Shared note @' + rec.id + '@ has subordinate structures (e.g. nested notes); the main text was preserved.', xref:rec.id });
        return rec.text;
      }
      diag.push({ severity:'warning', code:'UNRESOLVED_NOTE', message:'Note reference @' + stripAt(base) + '@ points to a record that does not exist.', xref:stripAt(base) });
      return base;
    }
    return base;
  };
  // pass 2: SOUR / OBJE / REPO records (may reference NOTE records from pass 1)
  for (const r of roots){
    if (r.tag === 'SOUR' && r.xref){ ctx.currentOwner = 'S:' + stripAt(r.xref); (ctx.sourceOwners['S:' + stripAt(r.xref)] ||= new Set()).add('S:' + stripAt(r.xref)); ctx.sourceRecords[stripAt(r.xref)] = parseSourceRecord(r, ctx); }
    else if (r.tag === 'OBJE' && r.xref){ ctx.currentOwner = 'M:' + stripAt(r.xref); (ctx.mediaOwners['M:' + stripAt(r.xref)] ||= new Set()).add('M:' + stripAt(r.xref)); ctx.mediaRecords[stripAt(r.xref)] = parseMediaRecord(r, ctx); }
    else if (r.tag === 'REPO' && r.xref) ctx.repoRecords[stripAt(r.xref)] = { id:stripAt(r.xref), name:simpleValue(r,'NAME'), note:[] };
  }
  ctx.currentOwner = '_global';
  function parseSourceRecord(r){
    const rec = { id:stripAt(r.xref), title:simpleValue(r,'TITL'), abbr:simpleValue(r,'ABBR'), author:simpleValue(r,'AUTH'), pub:simpleValue(r,'PUBL'), text:'', note:[], repo:'' };
    const t = firstChild(r,'TEXT'); if (t) rec.text = textWithContinuations(t);
    for (const n of allChildren(r,'NOTE')){ const x = ctx.resolveNote(n); if (x) rec.note.push(x); }
    const repo = firstChild(r,'REPO'); if (repo && isPointer(textWithContinuations(repo))) rec.repo = stripAt(textWithContinuations(repo));
    rec.note = rec.note.join('\n\n');
    return rec;
  }
  // pass 3: individuals and families (after all shared records are known)
  for (const r of roots){
    if (r.tag === 'INDI' && r.xref) personNodes.push(r);
    else if (r.tag === 'FAM' && r.xref) familyNodes.push(r);
  }
  function parseMediaRecord(r){
    const rec = { ref:stripAt(r.xref), file:'', form:'', title:simpleValue(r,'TITL'), note:'', files:[] };
    collectMediaFiles(r, rec, ctx);
    if (rec.file && /^https?:\/\//i.test(rec.file)) diag.push({ severity:'info', code:'EXTERNAL_URL_MEDIA', message:'Media @' + rec.ref + '@ references a web URL (' + rec.file.slice(0,60) + '); it is kept as a reference and never fetched.', xref:rec.ref });
    return rec;
  }

  const people = {}, families = {};
  for (const r of personNodes){
    const id = stripAt(r.xref);
    ctx.currentOwner = 'P:' + id;
    const p = { id, name:cleanName(simpleValue(r,'NAME')), rawName:simpleValue(r,'NAME'), surname:'', given:'', sex:'', fams:[], famc:[], notes:[], sources:[], media:[], events:[], associations:[], birthDate:'', birthPlace:'', deathDate:'', deathPlace:'', birthDateParsed:null, deathDateParsed:null, hasDeathEvent:false };
    const nameNode = firstChild(r,'NAME');
    if (nameNode){
      p.rawName = textWithContinuations(nameNode);
      p.name = cleanName(p.rawName);
      const surnameM = p.rawName.match(/\/([^/]*)\/?/);
      p.surname = surnameM ? surnameM[1].trim() : (simpleValue(nameNode,'SURN') || '');
      p.given = simpleValue(nameNode,'GIVN') || (surnameM ? p.rawName.slice(0, surnameM.index).trim() : p.rawName) || '';
    }
    p.sex = simpleValue(r,'SEX').toUpperCase();
    p.fams = allChildren(r,'FAMS').map(n => stripAt(textWithContinuations(n))).filter(Boolean);
    p.famc = allChildren(r,'FAMC').map(n => stripAt(textWithContinuations(n))).filter(Boolean);
    for (const a of allChildren(r,'ASSO')){
      const who = textWithContinuations(a);
      if (isPointer(who)) p.associations.push({ person:stripAt(who), role:simpleValue(a,'TYPE') || simpleValue(a,'RELA') || 'associated' });
    }
    for (const n of r.children || []){
      if (EVENT_TAGS.has(n.tag)){
        const ev = eventFromNode(n, n.tag, ctx);
        if (n.tag === 'BIRT'){ p.birthDate = ev.date; p.birthPlace = ev.place; p.birthDateParsed = ev.dateParsed; }
        if (n.tag === 'DEAT'){ p.deathDate = ev.date; p.deathPlace = ev.place; p.deathDateParsed = ev.dateParsed; p.hasDeathEvent = true; }
        if (!/^(CHANGE)$/.test(n.tag)) p.events.push(ev);
      } else if (n.tag === 'NOTE'){ const t = ctx.resolveNote(n); if (t) p.notes.push(t); }
      else if (n.tag === 'SOUR'){ p.sources.push(parseCitationNode(n, ctx, false)); }
      else if (n.tag === 'OBJE'){ p.media.push(parseMediaRefNode(n, ctx)); }
    }
    if (p.famc.length > 2) diag.push({ severity:'warning', code:'MULTIPLE_PARENT_FAMILIES', message:cleanName(p.name) + ' (' + id + ') is listed as a child in ' + p.famc.length + ' families (adoption or data error?).', xref:id });
    if (p.famc.length === 0 && p.fams.length === 0) diag.push({ severity:'info', code:'ISOLATED_PERSON', message:cleanName(p.name) + ' (' + id + ') has no family links; shown as a standalone record.', xref:id });
    people[id] = p;
  }
  for (const r of familyNodes){
    const id = stripAt(r.xref);
    ctx.currentOwner = 'F:' + id;
    const fam = { id, husband:'', wife:'', children:[], marriageDate:'', marriagePlace:'', divorceDate:'', notes:[], sources:[], media:[], events:[] };
    for (const n of r.children || []){
      if (FAMILY_EVENT_TAGS.has(n.tag)){
        const ev = eventFromNode(n, n.tag, ctx);
        if (n.tag === 'MARR'){ fam.marriageDate = ev.date; fam.marriagePlace = ev.place; }
        if (n.tag === 'DIV') fam.divorceDate = ev.date;
        if (n.tag !== 'CHANGE') fam.events.push(ev);
      } else if (n.tag === 'HUSB') fam.husband = stripAt(textWithContinuations(n));
      else if (n.tag === 'WIFE') fam.wife = stripAt(textWithContinuations(n));
      else if (n.tag === 'CHIL') fam.children.push(stripAt(textWithContinuations(n)));
      else if (n.tag === 'NOTE'){ const t = ctx.resolveNote(n); if (t) fam.notes.push(t); }
      else if (n.tag === 'SOUR'){ fam.sources.push(parseCitationNode(n, ctx, true)); }
      else if (n.tag === 'OBJE'){ fam.media.push(parseMediaRefNode(n, ctx)); }
    }
    fam.children = [...new Set(fam.children)];
    families[id] = fam;
  }
  // relationship diagnostics
  const AGE_MIN_PARENT = 13;
  for (const [fid, fam] of Object.entries(families)){
    if (fam.husband && !people[fam.husband]) diag.push({ severity:'warning', code:'UNRESOLVED_HUSB', message:'Family @' + fid + '@ lists husband @' + fam.husband + '@ but no such person record exists.', xref:fid });
    if (fam.wife && !people[fam.wife]) diag.push({ severity:'warning', code:'UNRESOLVED_WIFE', message:'Family @' + fid + '@ lists wife @' + fam.wife + '@ but no such person record exists.', xref:fid });
    if (fam.husband && fam.wife && fam.husband === fam.wife) diag.push({ severity:'warning', code:'SAME_SPOUSE_BOTH', message:'Family @' + fid + '@ lists the same person as both husband and wife (@' + fam.husband + '@).', xref:fid });
    for (const cid of fam.children){
      if (!people[cid]){ diag.push({ severity:'warning', code:'UNRESOLVED_CHIL', message:'Family @' + fid + '@ lists child @' + cid + '@ but no such person record exists.', xref:fid }); continue; }
      if (cid === fam.husband || cid === fam.wife) diag.push({ severity:'warning', code:'CHILD_IS_SPOUSE', message:'Person @' + cid + '@ appears as a child AND a spouse in family @' + fid + '@.', xref:fid });
      const child = people[cid];
      const childYear = child.birthDateParsed ? (child.birthDateParsed.startYear || child.birthDateParsed.year) : 0;
      for (const pid of [fam.husband, fam.wife].filter(Boolean)){
        const parent = people[pid]; if (!parent) continue;
        const pYear = parent.birthDateParsed ? (parent.birthDateParsed.startYear || parent.birthDateParsed.year) : 0;
        if (childYear && pYear && childYear - pYear < AGE_MIN_PARENT) diag.push({ severity:'warning', code:'PARENT_TOO_YOUNG', message:cleanName(parent.name) + ' (' + pid + ') would be only ' + (childYear - pYear) + ' years older than child ' + cleanName(child.name) + ' (' + cid + ') in family @' + fid + '@ — check the birth dates.', xref:fid });
        const pd = parent.deathDateParsed; const pdYear = pd ? (pd.startYear || pd.year) : 0;
        if (pdYear && childYear && childYear > pdYear) diag.push({ severity:'info', code:'CHILD_AFTER_PARENT_DEATH', message:cleanName(child.name) + ' (' + cid + ') born ' + childYear + ', after parent ' + cleanName(parent.name) + ' died ' + pdYear + ' (family @' + fid + '@).', xref:fid });
      }
    }
    if (fam.husband && people[fam.husband] && people[fam.husband].sex === 'F') diag.push({ severity:'info', code:'SEX_ROLE_MISMATCH', message:'Person @' + fam.husband + '@ is listed as husband of family @' + fid + '@ but their SEX is F.', xref:fid });
    if (fam.wife && people[fam.wife] && people[fam.wife].sex === 'M') diag.push({ severity:'info', code:'SEX_ROLE_MISMATCH', message:'Person @' + fam.wife + '@ is listed as wife of family @' + fid + '@ but their SEX is M.', xref:fid });
  }
  for (const p of Object.values(people)){
    for (const fid of p.famc) if (!families[fid]) diag.push({ severity:'warning', code:'UNRESOLVED_FAMC', message:cleanName(p.name) + ' (' + p.id + ') references child-family @' + fid + '@ which does not exist.', xref:p.id });
    for (const fid of p.fams) if (!families[fid]) diag.push({ severity:'warning', code:'UNRESOLVED_FAMS', message:cleanName(p.name) + ' (' + p.id + ') references spouse-family @' + fid + '@ which does not exist.', xref:p.id });
    for (const a of p.associations) if (!people[a.person]) diag.push({ severity:'warning', code:'UNRESOLVED_ASSO', message:cleanName(p.name) + ' (' + p.id + ') references associated person @' + a.person + '@ which does not exist.', xref:p.id });
    if (p.birthDateParsed && p.deathDateParsed){
      const b = p.birthDateParsed.startYear || p.birthDateParsed.year;
      const d = p.deathDateParsed.startYear || p.deathDateParsed.year;
      if (b && d && d < b) diag.push({ severity:'warning', code:'BIRTH_AFTER_DEATH', message:cleanName(p.name) + ' (' + p.id + ') has birth ' + p.birthDate + ' after death ' + p.deathDate + '.', xref:p.id });
    }
    for (const ev of p.events){
      if (ev.date && ev.dateParsed && ev.dateParsed.year === 0 && ev.dateParsed.modifier === 'unknown') diag.push({ severity:'warning', code:'DATE_UNPARSEABLE', message:cleanName(p.name) + ' (' + p.id + ') event "' + ev.type + '" has date "' + ev.date + '" which could not be read as a GEDCOM date (kept as text).', xref:p.id });
    }
  }
  // unsupported / unknown tags survey
  const unknownTags = {};
  for (const root of roots){
    const walk = (n) => {
      if (!ALL_INTEREST_TAGS.has(n.tag) && !/^[A-Z][A-Z0-9_]*$/.test(n.tag) === false && !ALL_INTEREST_TAGS.has(n.tag)) { /* no-op */ }
      if (!ALL_INTEREST_TAGS.has(n.tag)) unknownTags[n.tag] = (unknownTags[n.tag]||0)+1;
      for (const c of n.children) walk(c);
    };
    walk(root);
  }
  for (const [tag, count] of Object.entries(unknownTags).filter(([,c]) => c > 0).slice(0, 40)){
    diag.push({ severity:'info', code:'UNSUPPORTED_TAG', message:'Tag "' + tag + '" appears ' + count + ' time(s); it is preserved in the parsed JSON but not specially interpreted.', xref:'' });
  }
  if (Object.values(ctx.mediaRecords).concat(Object.values(people).flatMap(p=>p.media)).some(m => m.files && m.files.some(f => f.blob))) {
    diag.push({ severity:'info', code:'OBJE_BLOB', message:'One or more media records use the legacy 5.5.1 BLOB inline-binary form; the reference is kept but binary data cannot be embedded.', xref:'' });
  }

  // head / version
  const head = headNode[0];
  const gedc = head ? firstChild(head,'GEDC') : null;
  const vers = gedc ? simpleValue(gedc,'VERS') : '';
  const headSour = head ? simpleValue(head,'SOUR') : '';
  const headChar = head ? simpleValue(head,'CHAR') : '';
  const spec = /^7/.test(vers) ? '7.0' : /^5\.5\.1/.test(vers) ? '5.5.1' : vers ? 'other' : 'unknown';
  if (spec === 'other') diag.push({ severity:'info', code:'GEDCOM_VERS_OTHER', message:'GEDCOM version "' + vers + '" is neither 5.5.1 nor 7.x; parsed with the 5.5.1 rules.', xref:'' });
  if (spec === 'unknown') diag.push({ severity:'info', code:'GEDCOM_VERS_UNKNOWN', message:'No GEDC.VERS found in the header; parsed with the 5.5.1 rules.', xref:'' });
  if (spec === '7.0' && headChar && headChar.toUpperCase() !== 'UTF-8') diag.push({ severity:'warning', code:'V7_NOT_UTF8', message:'GEDCOM 7 requires UTF-8 but the header declares CHAR ' + headChar + '.', xref:'' });
  const headTitle = head ? simpleValue(head,'SOUR').toUpperCase() : '';
  const nowIso = new Date().toISOString();

  const eventCount = Object.values(people).reduce((a,p) => a + p.events.length, 0) + Object.values(families).reduce((a,f) => a + f.events.length, 0);
  const mediaCount = Object.keys(ctx.mediaRecords).length + Object.values(people).reduce((a,p) => a + p.media.filter(m => m.inline).length, 0);
  const noteCount = Object.values(people).reduce((a,p) => a + p.notes.length, 0) + Object.values(families).reduce((a,f) => a + f.notes.length, 0) + Object.values(ctx.sourceRecords).filter(s => s.note).length;
  const parseMs = Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - t0);
  const stats = { peopleTotal:Object.keys(people).length, peopleWithSources:Object.values(people).filter(p => p.sources.length).length, eventsTotal:eventCount, eventsWithSources:0, quay:{0:0,1:0,2:0,3:0,none:0} };
  for (const p of Object.values(people)){ for (const ev of p.events){ if (ev.sources.length) stats.eventsWithSources++; for (const c of ev.sources){ stats.quay[c.quay === null ? 'none' : c.quay] = (stats.quay[c.quay === null ? 'none' : c.quay]||0)+1; } } }
  for (const f of Object.values(families)){ for (const ev of f.events){ if (ev.sources.length) stats.eventsWithSources++; } }

  return {
    meta:{ fileName:opts.fileName || '', created:nowIso, version:APP_VERSION, spec, vers, headSour, charset:opts.charsetLabel || '', encodingNote:(opts.encodingNote || '') + (opts.decodeNote ? ' ' + opts.decodeNote : ''), lineCount, malformed,
      peopleCount:Object.keys(people).length, familyCount:Object.keys(families).length, noteCount, sourceCount:Object.keys(ctx.sourceRecords).length, mediaCount, eventCount, parseMs,
      gedHash:'', treeId:'', spotlightName:'', spotlightId:'', submitter:'' },
    people, families,
    noteRecords:Object.fromEntries(Object.entries(ctx.noteRecords).map(([k,v]) => [k, v.text])),
    noteOwners:Object.fromEntries(Object.entries(ctx.noteOwners).map(([k,v]) => [k, [...v]])),
    sourceRecords:ctx.sourceRecords,
    repoRecords:ctx.repoRecords,
    mediaRecords:ctx.mediaRecords,
    diagnostics:diag,
    stats
  };
}
/* ==== CORE-END ==== */
