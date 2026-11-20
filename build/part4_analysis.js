
// -------------------------------------------------- stable tree identity
function computeTreeIdentity(data, fileName, gedText){
  const normalized = String(gedText || '').replace(/\r\n?/g,'\n').replace(/\s+$/,'');
  const hash = fnv1a(normalized.length + ':' + normalized);
  data.meta.gedHash = hash;
  data.meta.fileName = fileName || data.meta.fileName || '';
  data.meta.treeId = 'KB' + fnv1a((fileName||'').toLowerCase()) + '-' + hash + '-' + data.meta.peopleCount + 'p' + data.meta.familyCount + 'f';
  return data.meta.treeId;
}

// ------------------------------------------------------- privacy pipeline
const CURRENT_YEAR = new Date().getFullYear();
function classifyLiving(p, opts){
  opts = opts || {};
  const threshold = opts.threshold || 100;
  const strictNoDates = !!opts.strictNoDates;
  if (opts.forcedLiving) return { living:true, reason:'marked living by privacy setting' };
  if (opts.forcedDeceased) return { living:false, reason:'marked deceased by privacy setting' };
  if (p.hasDeathEvent || p.deathDate || p.deathPlace) return { living:false, reason:'death recorded' };
  const by = p.birthDateParsed ? (p.birthDateParsed.startYear || p.birthDateParsed.year) : yearFromDate(p.birthDate);
  if (by) return { living:(CURRENT_YEAR - by) < threshold, reason:(CURRENT_YEAR - by) < threshold ? 'born ' + by + ', within ' + threshold + ' years, no death recorded' : 'born ' + by + ', no death recorded' };
  const anyYear = (p.events||[]).map(e => e.dateParsed ? (e.dateParsed.startYear || e.dateParsed.year) : yearFromDate(e.date)).filter(Boolean);
  if (anyYear.length) { const earliest = Math.min(...anyYear); return { living:(CURRENT_YEAR - earliest) < threshold, reason:'earliest event ' + earliest + ', no death recorded' }; }
  return { living:!!strictNoDates, reason:strictNoDates ? 'no dates recorded (strict mode)' : 'no dates recorded; treated as historical' };
}
function initialsFor(name){
  return String(name||'').split(/\s+/).filter(Boolean).map(w => w[0].toUpperCase()).slice(0,2).join('') + '.';
}
/* ------------------------------------------------------------------
   Export data pipeline (v2.1.0 privacy repairs 1-3).

   buildExportData() produces a COMPLETELY INDEPENDENT copy of the
   parsed tree for export, so:
   - export choices never mutate the master parsed data (repair 3);
   - a privacy-filtered export cannot affect later unrestricted exports;
   - auxiliary data (diagnostics, source/note/media/repo records, the
     source-quality report) is filtered to permitted records only, so
     private information cannot leak through reports (repair 1) and
     media belonging solely to private people is never selected
     (repair 2).

   Deep copies are made structurally (no JSON cloning), preserving all
   data types, undefined fields, and object identities where they
   matter (Map/Set-free plain data only). */
const FAMILY_PRIVACY_EVENT_TYPES = ['Marriage','Divorce','LDS sealing spouse','Engagement','Marriage bann','Marriage license','Marriage settlement','Marriage contract','Marriage filed','Annulment'];
function copyMediaRef(m){
  if (!m) return m;
  return { ...m, files:(m.files || []).map(f => ({ ...f })) };
}
function copyEvent(ev){
  return { ...ev,
    notes:[...(ev.notes || [])],
    sources:(ev.sources || []).map(s => ({ ...s, note:s.note })),
    media:(ev.media || []).map(copyMediaRef),
    dateParsed: ev.dateParsed ? { ...ev.dateParsed } : null };
}
function copyPerson(p){
  return { ...p,
    fams:[...(p.fams || [])], famc:[...(p.famc || [])],
    notes:[...(p.notes || [])],
    sources:(p.sources || []).map(s => ({ ...s, note:s.note })),
    media:(p.media || []).map(copyMediaRef),
    events:(p.events || []).map(copyEvent),
    associations:(p.associations || []).map(a => ({ ...a })) };
}
function copyFamily(f){
  return { ...f,
    children:[...(f.children || [])],
    notes:[...(f.notes || [])],
    sources:(f.sources || []).map(s => ({ ...s, note:s.note })),
    media:(f.media || []).map(copyMediaRef),
    events:(f.events || []).map(copyEvent) };
}
function buildExportData(data, opts){
  opts = opts || {};
  const mode = opts.privacyMode || 'full';
  const threshold = opts.threshold || safeInt(opts.thresholdInput, 100);
  const strictNoDates = !!opts.strictNoDates;
  const includePersonNotes = opts.includePersonNotes !== false;
  const includeFamilyNotes = opts.includeFamilyNotes !== false;
  const includeSourceNotes = opts.includeSourceNotes !== false;
  const includeMedia = opts.includeMedia !== false;

  // ---- classify living people (master data is only ever READ here) ----
  const livingCache = {};
  for (const [id, p] of Object.entries(data.people)){
    livingCache[id] = classifyLiving(p, { threshold, strictNoDates, forcedLiving:opts.forcedLiving && opts.forcedLiving[id], forcedDeceased:opts.forcedDeceased && opts.forcedDeceased[id] });
  }
  const hiddenIds = new Set();
  if (mode === 'exclude'){
    for (const [id, p] of Object.entries(data.people)) if (livingCache[id].living) hiddenIds.add(id);
  }
  // ---- independent copies with privacy transform applied ----
  const people = {}, families = {};
  let redacted = 0, excluded = 0;
  const privateIds = new Set();
  for (const [id, p] of Object.entries(data.people)){
    if (hiddenIds.has(id)){
      excluded++;
      privateIds.add(id);
      people[id] = { id, name:'Private (living person)', surname:'', sex:'', fams:[...p.fams], famc:[...p.famc], notes:[], sources:[], media:[], events:[], associations:[], birthDate:'', birthPlace:'', deathDate:'', deathPlace:'', birthDateParsed:null, deathDateParsed:null, hasDeathEvent:false, living:true, privacy:'excluded' };
      continue;
    }
    const q = copyPerson(p); // always an independent copy (repair 3)
    if (mode !== 'full' && livingCache[id].living){
      redacted++;
      privateIds.add(id);
      q.living = true;
      q.privacy = 'redacted';
      if (mode === 'redact-names'){ q.name = initialsFor(p.name); q.surname = ''; q.rawName = ''; q.given = ''; }
      q.birthDate = ''; q.birthPlace = ''; q.deathDate = ''; q.deathPlace = '';
      q.birthDateParsed = null; q.deathDateParsed = null;
      q.events = []; q.notes = []; q.sources = []; q.media = [];
    }
    people[id] = q;
  }
  for (const [fid, f] of Object.entries(data.families)){
    const fam = copyFamily(f);
    if (mode !== 'full'){
      // v2.1.1 privacy hardening: excluded members ARE living people — a family
      // whose members were all excluded must filter its privacy-type events,
      // notes, sources and media exactly like a redacted family, so private
      // details cannot leak through shared family events.
      const husbLiving = fam.husband && livingCache[fam.husband] && livingCache[fam.husband].living;
      const wifeLiving = fam.wife && livingCache[fam.wife] && livingCache[fam.wife].living;
      const anyLiving = husbLiving || wifeLiving || (fam.children || []).some(c => livingCache[c] && livingCache[c].living);
      if (anyLiving){
        fam.events = fam.events.filter(e => !FAMILY_PRIVACY_EVENT_TYPES.includes(e.type));
        fam.notes = []; fam.sources = []; fam.media = [];
        fam.marriageDate = ''; fam.marriagePlace = '';
        fam.livingInvolved = true;
      }
    }
    families[fid] = fam;
  }
  // ---- privacy-filtered auxiliary collections (repairs 1 + 2) ----
  // a) diagnostics: drop findings about private people, and any message
  //    that names a private person (belt and braces: some messages embed
  //    names of the people involved).
  const privateNames = [...privateIds].map(id => {
    const orig = data.people[id];
    return orig ? String(orig.name || '').toLowerCase() : '';
  }).filter(Boolean);
  const diagnostics = (data.diagnostics || []).filter(d => {
    if (d.xref && privateIds.has(d.xref)) return false;
    const msg = String(d.message || '').toLowerCase();
    for (const nm of privateNames){ if (nm && msg.includes(nm)) return false; }
    return true;
  });
  const omittedDiagnostics = (data.diagnostics || []).length - diagnostics.length;
  // b) source records: keep only sources still cited by permitted records
  const citedSources = new Set();
  const usedMediaIds = new Set();
  const usedNoteOwners = new Set();
  const collectFrom = (p, tag) => {
    for (const s of (p.sources || [])) if (s.ref) citedSources.add(s.ref);
    for (const ev of (p.events || [])){
      for (const s of (ev.sources || [])) if (s.ref) citedSources.add(s.ref);
      for (const m of (ev.media || [])) if (m.ref) usedMediaIds.add(m.ref);
    }
    for (const m of (p.media || [])) if (m.ref) usedMediaIds.add(m.ref);
    usedNoteOwners.add(tag);
  };
  for (const [id, p] of Object.entries(people)) collectFrom(p, 'P:' + id);
  for (const [id, f] of Object.entries(families)){ collectFrom(f, 'F:' + id); }
  const sourceRecords = {}, repoRecords = {}, mediaRecords = {}, noteRecords = {};
  for (const [id, rec] of Object.entries(data.sourceRecords || {})){
    if (!citedSources.has(id)) continue;
    sourceRecords[id] = { ...rec, note:rec.note };
    if (rec.repo) repoRecords[rec.repo] = (data.repoRecords || {})[rec.repo] || { id:rec.repo, name:'', note:'' };
  }
  // c) media records: keep only records referenced by permitted records
  //    (repair 2). Orphan media records — not linked to any permitted
  //    person/family/event — are excluded from exports entirely; the
  //    builder's Media Library still lists them as "unlinked".
  for (const [id, rec] of Object.entries(data.mediaRecords || {})){
    if (!usedMediaIds.has(id)) continue;
    mediaRecords[id] = { ...rec, files:(rec.files || []).map(fl => ({ ...fl })) };
  }
  // d) shared note records: keep only notes whose referencing owners are
  //    all permitted (owner tags: P:<id>, F:<id>, S:<id>, M:<id>, _global).
  const noteOwners = data.noteOwners || {};
  const permittedOwnerTag = (tag) => {
    if (!tag || tag === '_global') return mode === 'full';
    if (tag.startsWith('P:')) return !privateIds.has(tag.slice(2));
    if (tag.startsWith('F:')) return true; // family records always remain
    if (tag.startsWith('S:')) return citedSources.has(tag.slice(2));
    if (tag.startsWith('M:')) return usedMediaIds.has(tag.slice(2));
    return mode === 'full';
  };
  for (const [id, text] of Object.entries(data.noteRecords || {})){
    const owners = noteOwners[id];
    if (!owners || owners.length === 0){ if (mode === 'full') noteRecords[id] = text; continue; }
    if (owners.every(permittedOwnerTag)) noteRecords[id] = text;
  }
  // e) inclusion toggles — applied to the independent copies only
  if (!includePersonNotes){
    for (const p of Object.values(people)) p.notes = [];
    for (const [id, text] of Object.entries(noteRecords)){
      const owners = noteOwners[id] || [];
      if (owners.length && owners.every(t => t.startsWith('P:'))) delete noteRecords[id];
    }
  }
  if (!includeFamilyNotes){
    for (const f of Object.values(families)) f.notes = [];
    for (const [id, text] of Object.entries(noteRecords)){
      const owners = noteOwners[id] || [];
      if (owners.length && owners.every(t => t.startsWith('F:'))) delete noteRecords[id];
    }
  }
  if (!includeSourceNotes){
    for (const p of Object.values(people)){ p.sources = []; for (const ev of p.events) ev.sources = []; }
    for (const f of Object.values(families)){ f.sources = []; for (const ev of f.events) ev.sources = []; }
    for (const id of Object.keys(sourceRecords)) delete sourceRecords[id];
    for (const id of Object.keys(repoRecords)) delete repoRecords[id];
    for (const [id, owners0] of Object.entries(noteOwners)){
      if (owners0.every(t => t === '_global' || t.startsWith('S:'))) delete noteRecords[id];
    }
  }
  if (!includeMedia){
    for (const p of Object.values(people)){ p.media = []; for (const ev of p.events) ev.media = []; }
    for (const f of Object.values(families)){ f.media = []; for (const ev of f.events) ev.media = []; }
    for (const id of Object.keys(mediaRecords)) delete mediaRecords[id];
  }
  // ---- stats recomputed from the filtered view (aggregate counts only) ----
  const stats = { peopleTotal:Object.keys(people).length, peopleWithSources:Object.values(people).filter(p => p.sources.length).length, eventsTotal:0, eventsWithSources:0, quay:{0:0,1:0,2:0,3:0,none:0} };
  for (const p of Object.values(people)){
    for (const ev of p.events){
      if (ev.tag === 'CHANGE') continue;
      stats.eventsTotal++;
      if (ev.sources.length){ stats.eventsWithSources++; for (const c of ev.sources) stats.quay[c.quay === null || c.quay === undefined ? 'none' : c.quay] = (stats.quay[c.quay === null || c.quay === undefined ? 'none' : c.quay] || 0) + 1; }
    }
  }
  for (const f of Object.values(families)){
    for (const ev of f.events){
      if (ev.tag === 'CHANGE') continue;
      stats.eventsTotal++;
      if (ev.sources.length) stats.eventsWithSources++;
    }
  }
  const result = {
    people, families, noteRecords, sourceRecords, repoRecords, mediaRecords,
    diagnostics, omittedDiagnostics, stats,
    redacted, excluded, placeholders:excluded, privateIds,
    quality:null // filled below (source quality of the FILTERED view only)
  };
  result.quality = buildSourceQuality({ people:result.people, stats });
  return result;
}
function applyPrivacy(data, mode, opts){
  // Backward-compatible wrapper: returns the privacy view (deep-copied,
  // never mutating the input) for callers that only need people/families.
  const r = buildExportData(data, { privacyMode:mode, threshold:opts && opts.threshold, thresholdInput:opts && opts.thresholdInput, strictNoDates:opts && opts.strictNoDates, forcedLiving:opts && opts.forcedLiving, forcedDeceased:opts && opts.forcedDeceased });
  return { people:r.people, families:r.families, redacted:r.redacted, excluded:r.excluded, placeholders:r.placeholders, privateIds:r.privateIds };
}


// --------------------------------------------------- duplicate detection
function findDuplicateSuggestions(data, opts){
  opts = opts || {};
  const people = Object.values(data.people);
  const related = new Set(); // pairs we must NOT flag: direct parent-child or spouses
  const addPair = (a,b) => { if (a && b && a !== b){ related.add(a < b ? a+'\u0000'+b : b+'\u0000'+a); } };
  for (const f of Object.values(data.families)){
    for (const c of f.children || []){ addPair(c, f.husband); addPair(c, f.wife); }
    addPair(f.husband, f.wife);
  }
  // pre-computed keys so candidate generation and scoring do no per-pair regex work
  const normPlain = s => normalize(String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,''));
  const info = new Map();
  for (const p of people){
    info.set(p.id, {
      p,
      nameN: normalize(p.name),
      nameP: normPlain(p.name),
      givenN: normalize(p.given || (p.name || '').split(' ')[0] || ''),
      surnameN: normPlain(p.surname || ''),
      birthY: p.birthDateParsed ? (p.birthDateParsed.startYear || p.birthDateParsed.year) : 0,
      deathY: p.deathDateParsed ? (p.deathDateParsed.startYear || p.deathDateParsed.year) : 0,
      birthPlaceN: normalize(p.birthPlace),
      famc: p.famc || [], fams: p.fams || []
    });
  }
  const byNorm = {}, byPlain = {}, bySurname = {};
  for (const m of info.values()){
    if (m.nameN) (byNorm[m.nameN] ||= []).push(m);
    if (m.nameP) (byPlain[m.nameP] ||= []).push(m);
    if (m.surnameN) (bySurname[m.surnameN] ||= []).push(m);
  }
  const candidates = [];
  const seen = new Set();
  const pushPair = (ma, mb) => {
    const a = ma.p, b = mb.p;
    const key = a.id < b.id ? a.id+'\u0000'+b.id : b.id+'\u0000'+a.id;
    if (seen.has(key) || related.has(key)) return;
    seen.add(key);
    candidates.push([ma, mb]);
  };
  for (const bucket of Object.values(byNorm)){
    for (let i=0;i<bucket.length;i++) for (let j=i+1;j<bucket.length;j++) pushPair(bucket[i], bucket[j]);
  }
  // accent-insensitive equal names
  for (const bucket of Object.values(byPlain)){
    if (bucket.length < 2) continue;
    for (let i=0;i<bucket.length;i++) for (let j=i+1;j<bucket.length;j++) pushPair(bucket[i], bucket[j]);
  }
  // same surname with prefix-related given names (John / Johnny); skip pathological buckets
  for (const bucket of Object.values(bySurname)){
    if (bucket.length < 2 || bucket.length > 800) continue;
    for (let i=0;i<bucket.length;i++){
      const ma = bucket[i];
      if (!ma.givenN) continue;
      for (let j=i+1;j<bucket.length;j++){
        const mb = bucket[j];
        if (mb.givenN && (ma.givenN.startsWith(mb.givenN) || mb.givenN.startsWith(ma.givenN))) pushPair(ma, mb);
      }
    }
  }
  const out = [];
  for (const [ma, mb] of candidates){
    if (out.length >= 250) break;
    const a = ma.p, b = mb.p;
    let score = 0;
    const evidence = [];
    if (ma.nameN === mb.nameN){ score += 0.40; evidence.push({ k:'Same full name', detail:a.name + ' / ' + b.name }); }
    else if (ma.surnameN && ma.surnameN === mb.surnameN && ma.givenN && ma.givenN === mb.givenN){ score += 0.30; evidence.push({ k:'Same given and surname', detail:a.name + ' / ' + b.name }); }
    else if (ma.nameN.includes(mb.nameN) || mb.nameN.includes(ma.nameN)){ score += 0.18; evidence.push({ k:'Name contained in the other', detail:a.name + ' / ' + b.name }); }
    if ((a.sex||'') && (b.sex||'') && a.sex !== b.sex){ score -= 0.35; evidence.push({ k:'Different recorded sex', detail:a.sex + ' vs ' + b.sex }); }
    if (ma.birthY && mb.birthY && ma.birthY === mb.birthY){ score += 0.25; evidence.push({ k:'Same birth year', detail:String(ma.birthY) }); }
    else if (ma.birthY && mb.birthY && Math.abs(ma.birthY - mb.birthY) <= 2){ score += 0.10; evidence.push({ k:'Birth years within 2', detail:ma.birthY + ' vs ' + mb.birthY }); }
    if (ma.birthPlaceN && ma.birthPlaceN === mb.birthPlaceN){ score += 0.15; evidence.push({ k:'Same birth place', detail:a.birthPlace }); }
    if (ma.deathY && mb.deathY && ma.deathY === mb.deathY){ score += 0.15; evidence.push({ k:'Same death year', detail:String(ma.deathY) }); }
    const sharedParents = ma.famc.filter(x => mb.famc.includes(x));
    if (sharedParents.length){ score += 0.30; evidence.push({ k:'Same parent family', detail:sharedParents.map(x=>'@'+x+'@').join(', ') }); }
    const sharedSpouse = ma.fams.filter(x => mb.fams.includes(x));
    if (sharedSpouse.length){ score += 0.25; evidence.push({ k:'Same spouse family', detail:sharedSpouse.map(x=>'@'+x+'@').join(', ') }); }
    if (score <= 0) continue;
    score = Math.round(score * 100) / 100;
    const confidence = score >= 0.75 ? 'high' : score >= 0.5 ? 'medium' : 'low';
    out.push({ ids:[a.id, b.id], nameA:a.name, nameB:b.name, idA:a.id, idB:b.id, score, confidence, evidence, birthA:a.birthDate, birthB:b.birthDate, related:false });
  }
  out.sort((x, y) => y.score - x.score);
  return out;
}


// ------------------------------------------------ refinement backup merge
const NOTE_FLAGS = ['correction','duplicate','source','photo'];
function normalizeRefineBackup(raw){
  let parsed = raw;
  if (typeof raw === 'string'){
    try { parsed = JSON.parse(raw); }
    catch(e){ return { ok:false, error:'not valid JSON (' + String(e.message || e).slice(0, 80) + ')' }; }
  }
  if (!parsed || typeof parsed !== 'object') return { ok:false, error:'Not a JSON object.' };
  if (!parsed.notes || typeof parsed.notes !== 'object') return { ok:false, error:'Missing "notes" section.' };
  const backup = { notes:{}, tree:parsed.tree || null, exported:parsed.exported || parsed.exportedAt || null, author:parsed.author || null, version:parsed.version || 1 };
  for (const [id, n] of Object.entries(parsed.notes)){
    if (!n || typeof n !== 'object') continue;
    const v2 = {
      name: n.name || '',
      memory: n.memory || '',
      research: n.research || '',
      flags: NOTE_FLAGS.reduce((acc, f) => { acc[f] = !!(n.flags ? n.flags[f] : n[f]); return acc; }, {}),
      author: n.author || backup.author || '(unknown)',
      created: n.created || n.updated || backup.exported || null,
      updated: n.updated || n.created || backup.exported || null,
      history: Array.isArray(n.history) ? n.history.slice(0, 20) : []
    };
    if (v2.memory || v2.research || NOTE_FLAGS.some(f => v2.flags[f])) backup.notes[id] = v2;
  }
  return { ok:true, backup };
}
function noteFingerprint(n){
  // content-only fingerprint: two family members recording the same memory are
  // treated as identical regardless of author metadata, so no conflict is raised
  return JSON.stringify([String(n.memory||'').trim(), String(n.research||'').trim(), NOTE_FLAGS.map(f => !!n.flags[f])]);
}
function mergeRefineBackups(localNotes, backups){
  // localNotes: {id: note} current store. backups: array of normalized backups, in import order.
  const merged = {};
  for (const [id, n] of Object.entries(localNotes || {})) merged[id] = { ...n, flags:{ ...n.flags }, history:[...(n.history||[])] };
  const conflicts = [];
  const added = [], identical = [];
  for (const bk of backups){
    const src = bk.tree && bk.tree.treeId ? bk.tree.treeId : (bk.exported ? 'backup ' + bk.exported.slice(0,10) : 'backup');
    for (const [id, remote] of Object.entries(bk.notes)){
      const local = merged[id];
      if (!local){
        merged[id] = { ...remote, flags:{ ...remote.flags }, history:[...(remote.history||[]), { ts:new Date().toISOString(), author:'import', action:'imported from ' + src }] };
        added.push({ id, name:remote.name, source:src });
      } else if (noteFingerprint(local) === noteFingerprint(remote)){
        identical.push({ id, name:remote.name, source:src });
      } else {
        conflicts.push({ id, local, remote, source:src, name:local.name || remote.name, choice:null });
      }
    }
  }
  return { merged, conflicts, added, identical };
}
function resolveConflict(choice, local, remote){
  // choice: 'local' | 'remote' | 'both'
  if (choice === 'local') return { ...local, updated:new Date().toISOString() };
  if (choice === 'remote') return { ...remote, updated:new Date().toISOString() };
  const combined = {
    name: local.name || remote.name,
    memory: [local.memory, remote.memory].filter(Boolean).map(s => '[' + (s === local.memory ? (local.author||'earlier note') : (remote.author||'imported note')) + ']\n' + s).join('\n\n— — —\n\n'),
    research: [local.research, remote.research].filter(Boolean).map(s => '[' + (s === local.research ? (local.author||'earlier note') : (remote.author||'imported note')) + ']\n' + s).join('\n\n— — —\n\n'),
    flags: NOTE_FLAGS.reduce((acc,f) => { acc[f] = !!(local.flags[f] || remote.flags[f]); return acc; }, {}),
    author: [local.author, remote.author].filter(Boolean).filter((v,i,a) => a.indexOf(v) === i).join(' + '),
    created: local.created || remote.created,
    updated: new Date().toISOString(),
    history: [...(local.history||[]), ...(remote.history||[]), { ts:new Date().toISOString(), author:'merge', action:'merged conflicting notes' }]
  };
  return combined;
}

// ------------------------------------------- source quality / missing evidence
function buildSourceQuality(data){
  const rows = [];
  for (const p of Object.values(data.people)){
    const events = p.events.filter(e => e.tag !== 'CHANGE');
    if (!events.length) continue;
    const cited = events.filter(e => e.sources.length).length;
    const ownCited = p.sources.length > 0;
    if (cited === 0 && !ownCited){
      rows.push({ id:p.id, name:p.name, events:events.length, cited:0, birth:p.birthDate, birthParsed:p.birthDateParsed, suggestion:events.length >= 2 ? 'Find sources for ' + events.length + ' events' : 'Find a source for the ' + events[0].type.toLowerCase() + ' record' });
    }
  }
  rows.sort((a,b) => b.events - a.events);
  const s = data.stats;
  const pct = (a,b) => b ? Math.round(a/b*100) : 0;
  return { stats:s, coverage:{ people:pct(s.peopleWithSources, s.peopleTotal), events:pct(s.eventsWithSources, s.eventsTotal) }, rows:rows.slice(0, 150), rowsTotal:rows.length };
}

function buildDiagnosticsReportMd(data){
  const d = data.diagnostics || [];
  const counts = { error:0, warning:0, info:0 };
  for (const x of d) counts[x.severity]++;
  let md = '# GEDCOM diagnostics report\n\n';
  md += '- File: ' + (data.meta.fileName || '(unnamed)') + '\n';
  md += '- Generated: ' + new Date().toLocaleString() + ' by Grandmothers voice by Kayock ' + APP_VERSION + '\n';
  md += '- GEDCOM version: ' + (data.meta.vers || 'unspecified') + ' (treated as ' + data.meta.spec + ')\n';
  md += '- Character encoding: ' + (data.meta.charset || 'unknown') + (data.meta.encodingNote ? ' — ' + data.meta.encodingNote : '') + '\n';
  md += '- Tree identity: ' + data.meta.treeId + ' (content hash ' + data.meta.gedHash + ')\n';
  md += '- People: ' + fmt(data.meta.peopleCount) + ' · Families: ' + fmt(data.meta.familyCount) + ' · Events: ' + fmt(data.meta.eventCount) + ' · Notes: ' + fmt(data.meta.noteCount) + ' · Sources: ' + fmt(data.meta.sourceCount) + ' · Media refs: ' + fmt(data.meta.mediaCount) + '\n';
  md += '- Issues: ' + counts.error + ' errors, ' + counts.warning + ' warnings, ' + counts.info + ' info\n\n';
  if (!d.length){ md += 'No issues found.\n'; return md; }
  for (const sev of ['error','warning','info']){
    const rows = d.filter(x => x.severity === sev);
    if (!rows.length) continue;
    md += '## ' + sev.toUpperCase() + ' (' + rows.length + ')\n\n';
    for (const x of rows) md += '- [' + x.code + ']' + (x.xref ? ' @' + x.xref + '@' : '') + ' ' + x.message + '\n';
    md += '\n';
  }
  md += '## How to use this report\n\nIssues are hints for your genealogy software, not automatic changes. Grandmothers voice by Kayock never edits your GED file. Fix problems in your genealogy program and re-export for a clean report.\n';
  return md;
}
function buildDiagnosticsReportJson(data){
  return JSON.stringify({ meta:data.meta, stats:data.stats, diagnostics:data.diagnostics, generated:new Date().toISOString(), generator:APP_NAME + ' ' + APP_VERSION }, null, 2);
}

// ------------------------------------------- suggested GEDCOM changes report
function buildChangesReport(data, notes, dupSuggestions){
  const changes = [];
  const dups = dupSuggestions || findDuplicateSuggestions(data);
  for (const d of dups){
    changes.push({ type:'possible-duplicate', severity:d.confidence, people:[d.idA, d.idB], names:[d.nameA, d.nameB], score:d.score, evidence:d.evidence.map(e => e.k + ': ' + e.detail), status:'review required — not merged automatically' });
  }
  for (const [id, n] of Object.entries(notes || {})){
    if (n.flags && n.flags.correction) changes.push({ type:'correction-needed', person:id, name:n.name, author:n.author, updated:n.updated, detail:n.research || n.memory || '(see note)' });
    if (n.flags && n.flags.source) changes.push({ type:'missing-source', person:id, name:n.name, author:n.author, updated:n.updated, detail:n.research || '(no detail given)' });
    if (n.flags && n.flags.duplicate) changes.push({ type:'flagged-duplicate', person:id, name:n.name, author:n.author, updated:n.updated, detail:n.research || 'flagged in Tree Refinement Mode' });
    if (n.research && !n.flags.correction && !n.flags.source && !n.flags.duplicate) changes.push({ type:'research-note', person:id, name:n.name, author:n.author, updated:n.updated, detail:n.research });
  }
  for (const d of (data.diagnostics||[]).filter(x => ['BIRTH_AFTER_DEATH','PARENT_TOO_YOUNG','CHILD_IS_SPOUSE','SAME_SPOUSE_BOTH','DUPLICATE_XREF'].includes(x.code))){
    changes.push({ type:'data-conflict', severity:'warning', code:d.code, xref:d.xref, detail:d.message });
  }
  const now = new Date();
  const md = ['# Suggested GEDCOM changes — for human review','',
    'Generated: ' + now.toLocaleString() + ' · Grandmothers voice by Kayock ' + APP_VERSION,
    'Tree: ' + (data.meta.fileName || '') + ' · identity ' + (data.meta.treeId || '(not computed)'),
    '',
    'This file lists suggestions gathered from diagnostics and family refinement notes.',
    '**Nothing here has been applied to your GED file.** Review each item in your genealogy software.',
    ''].join('\n');
  const byType = {};
  for (const c of changes) (byType[c.type] ||= []).push(c);
  let mdBody = '';
  for (const [type, list] of Object.entries(byType)){
    mdBody += '## ' + type.replace(/-/g,' ') + ' (' + list.length + ')\n\n';
    for (const c of list.slice(0, 300)){
      mdBody += '- ' + (c.names ? c.names.join(' ↔ ') : (c.name ? c.name + ' (' + c.person + ')' : (c.xref ? '@' + c.xref + '@' : '')));
      if (c.score !== undefined) mdBody += ' — score ' + c.score + ' (' + c.severity + ' confidence)';
      if (c.detail) mdBody += ' — ' + String(c.detail).replace(/\n/g, ' / ').slice(0, 300);
      if (c.author) mdBody += ' — noted by ' + c.author + (c.updated ? ' (' + String(c.updated).slice(0,10) + ')' : '');
      mdBody += '\n';
    }
    mdBody += '\n';
  }
  const json = JSON.stringify({ generated:now.toISOString(), generator:APP_NAME + ' ' + APP_VERSION, tree:{ id:data.meta.treeId, file:data.meta.fileName, hash:data.meta.gedHash }, changeCount:changes.length, changes }, null, 2);
  return { md: md + (mdBody || 'No suggestions recorded yet.\n'), json, changes };
}

// ------------------------------------------------------------- ZIP writer
/* Binary-safe ZIP writer. Files: {name, data:string|Uint8Array, store?}
   Uses DEFLATE (CompressionStream 'deflate-raw') when available, else STORE.
   onProgress(done, total) is awaited between entries so the UI can update;
   throw in checkCancel() to abort. */
function crc32(bytes){ let c = 0xffffffff; for (let i=0;i<bytes.length;i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n=0;n<256;n++){ let c=n; for (let k=0;k<8;k++) c = (c&1) ? (0xedb88320 ^ (c>>>1)) : (c>>>1); t[n]=c>>>0; } return t; })();
function dosDateTime(date){ const dt = date || new Date(); return { time:((dt.getHours()&31)<<11)|((dt.getMinutes()&63)<<5)|((Math.floor(dt.getSeconds()/2))&31), date:(((dt.getFullYear()-1980)&127)<<9)|(((dt.getMonth()+1)&15)<<5)|(dt.getDate()&31) }; }
function u16(n){ return [n & 255, (n>>>8)&255]; }
function u32(n){ return [n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]; }
function concatUint8(chunks){ const total = chunks.reduce((a,c) => a+c.length,0); const out = new Uint8Array(total); let off=0; for (const c of chunks){ out.set(c,off); off+=c.length; } return out; }
function zipSanitizeName(name, used){
  let n = String(name || 'file').replace(/\\/g,'/').replace(/^\/+/,'').replace(/[:*?"<>|]/g,'_').replace(/\/\.\.(?=\/)/g,'_').replace(/\/\.(?=\/)/g,'/').replace(/\/{2,}/g,'/');
  const parts = n.split('/').map(seg => seg.replace(/^[. ]+/,'').replace(/[. ]+$/,'') || '_');
  n = parts.join('/').slice(0, 180) || 'file';
  const CON = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
  const base = parts[parts.length-1];
  if (CON.test(base)) parts[parts.length-1] = '_' + base;
  n = parts.join('/');
  let candidate = n, i = 1;
  while (used.has(candidate.toLowerCase())){
    const dot = n.lastIndexOf('.');
    candidate = dot > 0 ? n.slice(0,dot) + '-' + i + n.slice(dot) : n + '-' + i;
    i++;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}
async function deflateRaw(bytes){
  if (typeof CompressionStream === 'undefined') return null;
  try {
    const cs = new CompressionStream('deflate-raw');
    const stream = new Blob([bytes]).stream().pipeThrough(cs);
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  } catch(e) { return null; }
}
async function createZip(files, opts){
  opts = opts || {};
  const enc = new TextEncoder();
  const now = dosDateTime(new Date());
  const used = new Set();
  const locals = [], centrals = [];
  let offset = 0, done = 0;
  for (const f of files){
    if (opts.checkCancel) opts.checkCancel();
    const name = zipSanitizeName(f.name, used);
    const nameBytes = enc.encode(name);
    let dataBytes = (f.data instanceof Uint8Array) ? f.data : enc.encode(String(f.data ?? ''));
    let crc = crc32(dataBytes);
    let method = 0, compSize = dataBytes.length;
    if (!f.store && dataBytes.length > 512){
      const deflated = await deflateRaw(dataBytes);
      if (deflated && deflated.length < dataBytes.length){ method = 8; compSize = deflated.length; dataBytes = deflated; }
    }
    const origSize = (f.data instanceof Uint8Array) ? f.data.length : enc.encode(String(f.data ?? '')).length;
    if (method !== 8) { dataBytes = (f.data instanceof Uint8Array) ? f.data : enc.encode(String(f.data ?? '')); compSize = dataBytes.length; }
    const local = new Uint8Array([ ...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(method), ...u16(now.time), ...u16(now.date), ...u32(crc), ...u32(compSize), ...u32(origSize), ...u16(nameBytes.length), ...u16(0) ]);
    locals.push(local, nameBytes, dataBytes);
    const central = new Uint8Array([ ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(method), ...u16(now.time), ...u16(now.date), ...u32(crc), ...u32(method===8?compSize:origSize), ...u32(origSize), ...u16(nameBytes.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset) ]);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + dataBytes.length;
    done++;
    if (opts.onProgress){ opts.onProgress(done, files.length); if (opts.yieldMs) await new Promise(r => setTimeout(r, 0)); }
  }
  const centralBytes = concatUint8(centrals);
  const centralStart = offset;
  const end = new Uint8Array([ ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(centralBytes.length), ...u32(centralStart), ...u16(0) ]);
  return concatUint8([...locals, centralBytes, end]);
}
/* ==== CORE-B-END ==== */
