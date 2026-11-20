
// ------------------------------------------------------------- exports
$('cancelExportBtn') && $('cancelExportBtn').addEventListener('click', () => { exportCancelled = true; });
function exportOptsFor(mediaMode){
  return {
    mediaMode,
    includeTour:$('includeSampleTour').checked,
    includeNotebook:$('includeNotebook').checked,
    includeDiagnostics:$('includeDiagnostics').checked,
    sourceQuality:getExportData().quality // repair 1: quality of the privacy-filtered view only
  };
}
$('generateBtn').addEventListener('click', async () => {
  if (!parsedData) return;
  exportCancelled = false;
  try {
    const data = getExportData();
    setProgress('export', 'Preparing…', 0.05);
    await nextTick();
    const wantEmbed = $('embedMedia').checked && $('includeMedia').checked && mediaSession.files.length;
    let plan = { dests:[], byRef:new Map(), unmatched:[], urlRefs:[], embedded:false };
    if (wantEmbed){
      plan = await prepareMediaUris(data, profileIsFamily());
      const embedKB = Math.round(plan.dests.reduce((a,d) => a + (d.dataUri ? d.size * 1.33 : 0), 0) / 1024);
      if (embedKB > 81920){ toast('Media is ' + fmt(embedKB / 1024) + ' MB — too large to embed reliably. Use “HTML + Media ZIP” instead.'); log('Embedding skipped: media too large (' + embedKB + ' KB). Use the HTML + Media ZIP export.'); plan = { dests:[], byRef:new Map(), unmatched:plan.unmatched, urlRefs:plan.urlRefs, embedded:false }; }
      else {
        const noteEl = $('mediaSizeNote');
        noteEl.style.display = 'block';
        noteEl.className = 'note' + (embedKB > 15360 ? ' warn' : '');
        noteEl.textContent = 'Embedding ' + fmt(plan.dests.length) + ' media item(s), about ' + fmt(embedKB) + ' KB base64 in the HTML file.' + (embedKB > 15360 ? ' Consider the HTML + Media ZIP export instead for easier sharing.' : '');
      }
    }
    setProgress('export', 'Building explorer HTML…', 0.7);
    await nextTick();
    const html = buildExplorerHtml(data, exportOptsFor(plan.dests.length ? 'embedded' : 'none'), plan);
    const fname = cleanFileBase(fileName || data.meta.title) + '_Family_Story_Explorer.html';
    downloadText(fname, html, 'text/html;charset=utf-8');
    setProgress('export', 'Done', 1);
    await nextTick();
    hideProgress('export');
    log('Generated download: ' + fname + ' (' + fmt(Math.round(html.length / 1024)) + ' KB).');
  } catch(err){
    hideProgress('export');
    console.error(err);
    toast('Export failed: ' + (err.message || err));
    log('ERROR during explorer export: ' + (err.message || err));
  }
});
$('generateZipBtn').addEventListener('click', async () => {
  if (!parsedData) return;
  exportCancelled = false;
  try {
    const data = getExportData();
    setProgress('export', 'Preparing media…', 0.05);
    await nextTick();
    let plan = { dests:[], byRef:new Map(), unmatched:[], urlRefs:[], embedded:false };
    if ($('includeMedia').checked && mediaSession.files.length){
      plan = buildMediaPlanData(data, false, true);
      let i = 0;
      for (const d of plan.dests){
        if (!d.bytes && d.file) d.bytes = new Uint8Array(await d.file.arrayBuffer());
        i++;
        setProgress('export', 'Reading media ' + i + '/' + plan.dests.length, 0.05 + 0.45 * (i / Math.max(1, plan.dests.length)));
        await nextTick();
      }
    }
    setProgress('export', 'Building explorer HTML…', 0.55);
    await nextTick();
    const html = buildExplorerHtml(data, exportOptsFor(plan.dests.length ? 'linked' : 'none'), plan);
    const base = cleanFileBase(fileName || data.meta.title);
    const files = [ { name: base + '_Family_Story_Explorer.html', data: html }, { name:'README.txt', data:'Extract this whole folder and open the explorer HTML file. Media lives next to it in media/.\nGenerated offline by Grandmothers voice by Kayock ' + APP_VERSION + ' (MIT).\n' } ];
    for (const d of plan.dests) if (d.bytes) files.push({ name:'media/' + d.dest, data:d.bytes });
    setProgress('export', 'Compressing ZIP…', 0.7);
    await nextTick();
    const zipBytes = await createZip(files, { onProgress:(done, total) => setProgress('export', 'Compressing ZIP ' + done + '/' + total, 0.7 + 0.3 * done / Math.max(1, total)), checkCancel:() => { if (exportCancelled) throw { cancelled:true }; } });
    downloadBlob(base + '_Explorer_With_Media.zip', new Blob([zipBytes], { type:'application/zip' }));
    setProgress('export', 'Done', 1);
    await nextTick();
    hideProgress('export');
    log('Generated explorer ZIP with ' + fmt(plan.dests.length) + ' media file(s): ' + base + '_Explorer_With_Media.zip');
  } catch(err){
    hideProgress('export');
    if (err && err.cancelled){ log('Export cancelled.'); toast('Export cancelled.'); }
    else { console.error(err); toast('ZIP export failed: ' + (err.message || err)); log('ERROR during ZIP export: ' + (err.message || err)); }
  }
});
$('downloadJsonBtn').addEventListener('click', () => {
  if (!parsedData) return;
  const data = getExportData();
  const out = { ...data, mediaRecords:data.mediaRecords, diagnostics:data.diagnostics };
  downloadText(cleanFileBase(fileName || data.meta.title) + '_parsed_family_tree.json', JSON.stringify(out, null, 2), 'application/json;charset=utf-8');
  log('Parsed JSON downloaded (no media bytes included).');
});
async function exportVault(mode){
  if (!parsedData) return;
  exportCancelled = false;
  try {
    const data = getExportData();
    setProgress('export', 'Preparing…', 0.1);
    await nextTick();
    let plan = { dests:[], byRef:new Map(), unmatched:[], urlRefs:[], embedded:false };
    if ($('includeMedia').checked && mediaSession.files.length){
      plan = buildMediaPlanData(data, false, true);
      let i = 0;
      for (const d of plan.dests){
        if (!d.bytes && d.file) d.bytes = new Uint8Array(await d.file.arrayBuffer());
        i++;
        setProgress('export', 'Reading media ' + i + '/' + plan.dests.length, 0.1 + 0.4 * (i / Math.max(1, plan.dests.length)));
        await nextTick();
      }
    }
    const vaultFiles = buildMarkdownVaultFiles(data, mode, plan);
    const files = vaultFiles.map(f => ({ name:f.name, data:f.data }));
    const folder = mode === 'obsidian' ? 'media' : 'assets';
    for (const d of plan.dests) if (d.bytes) files.push({ name:folder + '/' + d.dest, data:d.bytes });
    setProgress('export', 'Compressing ZIP…', 0.6);
    await nextTick();
    const zipBytes = await createZip(files, { onProgress:(done, total) => setProgress('export', 'Compressing ' + done + '/' + total, 0.6 + 0.4 * done / Math.max(1, total)), checkCancel:() => { if (exportCancelled) throw { cancelled:true }; } });
    const label = mode === 'obsidian' ? 'Obsidian' : 'Logseq';
    const fname = cleanFileBase(fileName || data.meta.title) + '_' + label + '_Markdown_Vault.zip';
    downloadBlob(fname, new Blob([zipBytes], { type:'application/zip' }));
    setProgress('export', 'Done', 1);
    await nextTick();
    hideProgress('export');
    log('Generated ' + label + ' vault ZIP: ' + fname + ' (' + fmt(files.length) + ' files' + (plan.dests.length ? ', ' + fmt(plan.dests.length) + ' media assets in ' + folder + '/' : '') + ').');
  } catch(err){
    hideProgress('export');
    if (err && err.cancelled){ log('Export cancelled.'); toast('Export cancelled.'); }
    else { console.error(err); toast('Vault export failed: ' + (err.message || err)); log('ERROR during vault export: ' + (err.message || err)); }
  }
}
$('exportObsidianBtn').addEventListener('click', () => exportVault('obsidian'));
$('exportLogseqBtn').addEventListener('click', () => exportVault('logseq'));
$('exportMarkdownSingleBtn').addEventListener('click', () => {
  if (!parsedData) return;
  const data = getExportData();
  const md = buildSingleMarkdown(data, 'obsidian', { byRef:new Map() });
  const fname = cleanFileBase(fileName || data.meta.title) + '_Family_Tree_One_File.md';
  downloadText(fname, md, 'text/markdown;charset=utf-8');
  log('Generated Markdown file: ' + fname + ' (media kept as references in single-file mode).');
});

// ------------------------------------------------------------- refine tab
const noteStoreKey = () => 'kayockNotebook2:' + (parsedData ? parsedData.meta.treeId : 'none');
function loadNoteStoreForTree(){
  try { noteStore = JSON.parse(localStorage.getItem(noteStoreKey()) || '{}') || {}; } catch(e){ noteStore = {}; }
  renderNoteStore();
}
let noteStore = {};
function persistNoteStore(){ try { localStorage.setItem(noteStoreKey(), JSON.stringify(noteStore)); } catch(e){ toast('Could not save notes locally (storage full?).'); } }
function renderTreeIdentity(){
  const el = $('treeIdentity');
  if (!parsedData){ el.className = 'note warn'; el.textContent = 'Parse a GED file to compute its stable identity.'; return; }
  const m = parsedData.meta;
  el.className = 'note good';
  el.innerHTML = 'This tree is identified as <b class="kbd">' + htmlEscape(m.treeId) + '</b> (content hash ' + htmlEscape(m.gedHash) + ', ' + fmt(m.peopleCount) + ' people · ' + fmt(m.familyCount) + ' families · ' + htmlEscape(m.charset || '') + ').<br><span class="tiny">Refinement backups record this id. Importing a backup from another tree shows a mismatch warning — notes are never silently attached to an unrelated GED.</span>';
}
function renderNoteStore(){
  const host = $('noteStoreTable');
  const entries = Object.entries(noteStore);
  if (!entries.length){ host.innerHTML = '<div class="note">No notes stored on this device for the current tree yet. Import backups from family members below, or add notes inside the explorer and export a backup.</div>'; return; }
  host.innerHTML = '<table class="data wrapTable"><thead><tr><th>Person</th><th>GED ID</th><th>Memory</th><th>Research</th><th>Flags</th><th>Author</th><th>Updated</th><th></th></tr></thead><tbody>' +
    entries.map(([id, n]) => '<tr><td>' + htmlEscape(n.name || id) + '</td><td>' + htmlEscape(id) + '</td><td class="tiny">' + htmlEscape((n.memory || '').slice(0, 120)) + '</td><td class="tiny">' + htmlEscape((n.research || '').slice(0, 120)) + '</td><td class="tiny">' + (n.flags ? NOTE_FLAGS.filter(f => n.flags[f]).join(', ') : '') + '</td><td class="tiny">' + htmlEscape(n.author || '') + '</td><td class="tiny">' + htmlEscape(String(n.updated || '').slice(0, 10)) + '</td><td><button class="ghost" data-del="' + htmlEscape(id) + '">Delete</button></td></tr>').join('') +
    '</tbody></table>';
  host.querySelectorAll('button[data-del]').forEach(b => b.addEventListener('click', () => { delete noteStore[b.getAttribute('data-del')]; persistNoteStore(); renderNoteStore(); toast('Note deleted.'); }));
}
$('refineImportBtn').addEventListener('click', () => $('refineImportInput').click());
$('refineImportInput').addEventListener('change', async e => {
  const files = [...e.target.files];
  e.target.value = '';
  if (!files.length) return;
  const backups = [];
  for (const f of files){
    const text = await f.text();
    const res = normalizeRefineBackup(text);
    if (!res.ok){ toast(f.name + ' is not a valid refinement backup: ' + res.error); continue; }
    res.backup.sourceFile = f.name;
    backups.push(res.backup);
  }
  if (!backups.length){ toast('No valid backups found.'); return; }
  if (!parsedData){ toast('Parse the GED first so notes can be matched to people.'); return; }
  refineImportReview(backups);
});
function refineImportReview(backups){
  const me = parsedData.meta.treeId;
  const same = backups.filter(b => !b.tree || !b.tree.treeId || b.tree.treeId === me);
  const foreign = backups.filter(b => b.tree && b.tree.treeId && b.tree.treeId !== me);
  const base = {};
  for (const [id, n] of Object.entries(noteStore)) base[id] = { ...n, flags:{ ...n.flags }, history:[...(n.history||[])] };
  const preview = mergeRefineBackups(base, same);
  const card = $('mergeReviewCard'); card.style.display = 'block';
  const host = $('mergeReview');
  let html = '';
  html += '<p>' + fmt(same.length) + ' backup(s) from this tree: <b>' + fmt(preview.added.length) + '</b> new note(s), ' + fmt(preview.identical.length) + ' identical, <b>' + fmt(preview.conflicts.length) + '</b> conflict(s) to review below.' + (foreign.length ? ' <b>' + fmt(foreign.length) + ' backup(s) are from a DIFFERENT tree</b> — see the warning.' : '') + '</p>';
  for (const b of foreign){
    html += '<div class="note warn"><b>Tree identity mismatch:</b> “' + htmlEscape(b.sourceFile || '') + '” was exported from tree ' + htmlEscape((b.tree && b.tree.treeId) || '?') + ' (' + htmlEscape((b.tree && b.tree.title) || '?') + '), not this tree (' + htmlEscape(me) + '). ' + fmt(Object.keys(b.notes).length) + ' note(s) inside.<br><label class="check"><input type="checkbox" class="forceForeign" data-file="' + htmlEscape(b.sourceFile || '') + '"> Import this backup anyway (I verified it belongs to this family)</label></div>';
  }
  for (const c of preview.conflicts){
    html += '<div class="conflictCard"><b>' + htmlEscape(c.name || c.id) + '</b> <span class="tiny">(GED ' + htmlEscape(c.id) + ' · imported from ' + htmlEscape(c.source) + ')</span>' +
      '<div class="twoCol" style="margin-top:8px"><div><div class="tiny">On this device' + (c.local.author ? ' — by ' + htmlEscape(c.local.author) : '') + '</div><div class="noteBox">' + htmlEscape((c.local.memory || '(no memory)') + '\n— — —\n' + (c.local.research || '(no research)')) + '</div></div>' +
      '<div><div class="tiny">Imported' + (c.remote.author ? ' — by ' + htmlEscape(c.remote.author) : '') + '</div><div class="noteBox">' + htmlEscape((c.remote.memory || '(no memory)') + '\n— — —\n' + (c.remote.research || '(no research)')) + '</div></div></div>' +
      '<label class="check"><input type="radio" name="mcf_' + htmlEscape(c.id) + '" value="local" checked> Keep current</label>' +
      '<label class="check"><input type="radio" name="mcf_' + htmlEscape(c.id) + '" value="remote"> Use imported</label>' +
      '<label class="check"><input type="radio" name="mcf_' + htmlEscape(c.id) + '" value="both"> Keep both, with attribution</label></div>';
  }
  html += '<div class="row" style="margin-top:10px"><button id="mergeApplyNow" class="primary">Apply reviewed merges</button></div>';
  host.innerHTML = html;
  $('mergeApplyBtn').disabled = false;
  $('mergeApplyNow').addEventListener('click', () => {
    const result = mergeRefineBackups(base, same);
    for (const c of result.conflicts){
      const sel = host.querySelector('input[name="mcf_' + c.id + '"]:checked');
      base[c.id] = resolveConflict(sel ? sel.value : 'local', c.local, c.remote);
    }
    let foreignAdded = 0, foreignSkipped = 0;
    document.querySelectorAll('#mergeReview .forceForeign').forEach(cb => {
      if (!cb.checked) return;
      const b = foreign.find(x => x.sourceFile === cb.getAttribute('data-file'));
      if (!b) return;
      for (const [id, n] of Object.entries(b.notes)){
        if (!base[id]){ base[id] = { ...n, flags:{ ...n.flags }, history:[...(n.history||[]), { ts:new Date().toISOString(), author:'import', action:'imported from different tree (user-verified)' }] }; foreignAdded++; }
        else foreignSkipped++;
      }
    });
    noteStore = base;
    persistNoteStore();
    renderNoteStore();
    renderPhotoChecklist();
    toast('Merged: ' + fmt(result.added.length) + ' added, ' + fmt(result.conflicts.length) + ' conflicts resolved, ' + fmt(foreignAdded) + ' added from verified foreign backups, ' + fmt(foreignSkipped) + ' skipped.');
    log('Refinement merge applied.');
    host.innerHTML = '<div class="note good">Merge applied. ' + fmt(Object.keys(noteStore).length) + ' notes now stored on this device. Export the merged backup and load it into any explorer copy.</div>';
  });
}
$('refineExportBtn').addEventListener('click', () => {
  if (!parsedData) return;
  const out = { version:2, exported:new Date().toISOString(), author:$('authorName').value.trim() || '(unnamed coordinator)', tree:{ treeId:parsedData.meta.treeId, title:parsedData.meta.title, fileName:parsedData.meta.fileName, gedHash:parsedData.meta.gedHash, peopleCount:parsedData.meta.peopleCount, familyCount:parsedData.meta.familyCount, spec:parsedData.meta.spec, vers:parsedData.meta.vers, appVersion:APP_VERSION }, privacyMode:getPrivacyOpts().mode, notes:noteStore };
  downloadText(cleanFileBase(fileName || parsedData.meta.title) + '_merged_refinement_backup.json', JSON.stringify(out, null, 2), 'application/json;charset=utf-8');
  log('Merged refinement backup exported (' + fmt(Object.keys(noteStore).length) + ' notes).');
});
$('refineClearBtn').addEventListener('click', () => {
  if (!Object.keys(noteStore).length){ toast('No notes stored for this tree.'); return; }
  noteStore = {}; persistNoteStore(); renderNoteStore(); renderPhotoChecklist(); toast('Local notes for this tree cleared (backups are unaffected).');
});
function renderDupSuggestions(){
  const host = $('dupList');
  if (!parsedData){ host.innerHTML = ''; return; }
  dupSuggestions = findDuplicateSuggestions(getExportData());
  $('dupFlagAllBtn').disabled = !dupSuggestions.length;
  const badge = c => '<span class="badge ' + (c === 'high' ? 'err' : c === 'medium' ? 'warn' : 'info') + '">' + c + ' confidence</span>';
  host.innerHTML = dupSuggestions.length
    ? '<table class="data wrapTable"><thead><tr><th style="width:24%">Person A</th><th style="width:24%">Person B</th><th style="width:90px">Score</th><th>Evidence</th><th style="width:150px">Action</th></tr></thead><tbody>' +
      dupSuggestions.map((d, i) => '<tr><td>' + htmlEscape(d.nameA) + '<br><span class="tiny">' + htmlEscape(d.idA) + (d.birthA ? ' · b. ' + htmlEscape(d.birthA) : '') + '</span></td><td>' + htmlEscape(d.nameB) + '<br><span class="tiny">' + htmlEscape(d.idB) + (d.birthB ? ' · b. ' + htmlEscape(d.birthB) : '') + '</span></td><td>' + d.score + ' ' + badge(d.confidence) + '</td><td class="tiny">' + d.evidence.map(e => '• ' + htmlEscape(e.k + ': ' + e.detail)).join('<br>') + '</td><td><button class="ghost" data-flag="' + i + '">Flag pair in notes</button></td></tr>').join('') +
      '</tbody></table>'
    : '<div class="note good">No duplicate candidates found. (Suggestions require matching names plus supporting evidence; direct relatives are never flagged.)</div>';
  host.querySelectorAll('button[data-flag]').forEach(b => b.addEventListener('click', () => {
    const d = dupSuggestions[+b.getAttribute('data-flag')];
    for (const id of d.ids){
      const prev = noteStore[id] || { name:personNameIn(parsedData, id), created:new Date().toISOString() };
      noteStore[id] = { ...prev, name:personNameIn(parsedData, id), flags:{ correction:false, duplicate:true, source:false, photo:false, ...(prev.flags || {}) }, author:$('authorName').value.trim() || '(unnamed)', updated:new Date().toISOString() };
    }
    persistNoteStore(); renderNoteStore(); renderPhotoChecklist();
    toast('Flagged ' + d.nameA + ' ↔ ' + d.nameB + ' as possible duplicates (review in notes below).');
  }));
}
function personNameIn(data, id){ return data.people[id] ? data.people[id].name : id; }
$('dupFlagAllBtn').addEventListener('click', () => {
  let n = 0;
  for (const d of dupSuggestions){
    for (const id of d.ids){
      const prev = noteStore[id] || { name:personNameIn(parsedData, id), created:new Date().toISOString() };
      noteStore[id] = { ...prev, name:personNameIn(parsedData, id), flags:{ ...(prev.flags || { correction:false, source:false, photo:false }), duplicate:true }, author:$('authorName').value.trim() || '(unnamed)', updated:new Date().toISOString() };
      n++;
    }
  }
  persistNoteStore(); renderNoteStore(); renderPhotoChecklist();
  toast('Flagged ' + fmt(n) + ' person records from ' + fmt(dupSuggestions.length) + ' suggestion pairs.');
});
let photoRequests = [];
function loadPhotoRequests(){ try { photoRequests = JSON.parse(localStorage.getItem('kayockPhotoRequests:' + (parsedData ? parsedData.meta.treeId : 'none')) || '[]') || []; } catch(e){ photoRequests = []; } }
function savePhotoRequests(){ try { localStorage.setItem('kayockPhotoRequests:' + (parsedData ? parsedData.meta.treeId : 'none'), JSON.stringify(photoRequests)); } catch(e){} }
function renderPhotoChecklist(){
  const host = $('photoChecklistBody');
  if (!parsedData){ host.innerHTML = ''; return; }
  const items = [];
  for (const [id, n] of Object.entries(noteStore)){
    if (n.flags && n.flags.photo) items.push({ id, name:n.name || personNameIn(parsedData, id), why:'flagged “photo/document to find” by ' + (n.author || 'family'), detail:n.research || n.memory || '' });
  }
  for (const r of photoRequests) items.push({ id:'', name:r.text, why:'custom request' + (r.author ? ' by ' + r.author : ''), detail:r.added ? String(r.added).slice(0,10) : '' });
  $('photoRequestExport').disabled = !items.length;
  host.innerHTML = items.length
    ? '<table class="data wrapTable"><thead><tr><th>What to find</th><th style="width:26%">Why</th><th style="width:110px">GED ID</th></tr></thead><tbody>' +
      items.map(it => '<tr><td>' + htmlEscape(it.name) + (it.detail ? '<br><span class="tiny">' + htmlEscape(it.detail.slice(0, 160)) + '</span>' : '') + '</td><td class="tiny">' + htmlEscape(it.why) + '</td><td class="tiny">' + htmlEscape(it.id || '—') + '</td></tr>').join('') + '</tbody></table>'
    : '<div class="note">No photo/document requests yet. Flag people with “Photo/document to find” in the explorer (or use duplicate tooling here) and they appear automatically.</div>';
}
$('photoRequestAdd').addEventListener('click', () => {
  const t = $('photoRequestText').value.trim();
  if (!t) return;
  photoRequests.push({ text:t, author:$('authorName').value.trim() || '', added:new Date().toISOString() });
  $('photoRequestText').value = '';
  savePhotoRequests();
  renderPhotoChecklist();
  toast('Request added to the checklist.');
});
$('photoRequestExport').addEventListener('click', () => {
  if (!parsedData) return;
  const items = [];
  for (const [id, n] of Object.entries(noteStore)) if (n.flags && n.flags.photo) items.push({ id, name:n.name || personNameIn(parsedData, id), why:'flagged by ' + (n.author || 'family'), detail:n.research || '' });
  for (const r of photoRequests) items.push({ id:'', name:r.text, why:'custom request' + (r.author ? ' by ' + r.author : ''), detail:'' });
  let md = '# Photo & document request checklist\n\nGenerated: ' + new Date().toLocaleString() + ' · tree ' + parsedData.meta.treeId + '\n\n';
  md += items.length ? items.map((it, i) => (i + 1) + '. **' + it.name + '**' + (it.id ? ' (' + it.id + ')' : '') + ' — ' + it.why + (it.detail ? '\n   - detail: ' + it.detail.replace(/\n/g, ' ') : '')).join('\n') + '\n' : 'No requests yet.\n';
  downloadText(cleanFileBase(fileName || parsedData.meta.title) + '_photo_document_checklist.md', md, 'text/markdown;charset=utf-8');
});
$('changesReportBtn').addEventListener('click', () => {
  if (!parsedData) return;
  const rep = buildChangesReport(getExportData(), noteStore, dupSuggestions);
  downloadText(cleanFileBase(fileName || parsedData.meta.title) + '_suggested_gedcom_changes.md', rep.md, 'text/markdown;charset=utf-8');
  log('Suggested GEDCOM changes report downloaded (' + fmt(rep.changes.length) + ' suggestions).');
});
$('changesReportJsonBtn').addEventListener('click', () => {
  if (!parsedData) return;
  const rep = buildChangesReport(getExportData(), noteStore, dupSuggestions);
  downloadText(cleanFileBase(fileName || parsedData.meta.title) + '_suggested_gedcom_changes.json', rep.json, 'application/json;charset=utf-8');
});

// ------------------------------------------------------------- booklet tab
function updateBookletOptions(){
  const noteEl = $('bookletPrivacyNote');
  if (!parsedData){ noteEl.textContent = ''; noteEl.className = 'note'; return; }
  const p = getPrivacyOpts();
  if (p.mode !== 'full') noteEl.innerHTML = 'Privacy mode <b>' + htmlEscape(p.mode) + '</b> will be applied to the booklet: living people\'s details are ' + (p.mode === 'exclude' ? 'excluded' : 'redacted') + '. Double-check the preview before sharing or printing.';
  else noteEl.textContent = '';
}
function bookletScopeData(){
  const scope = $('bookletScope').value;
  const opts = {
    scope,
    gens:safeInt($('bookletGens').value, 4),
    title:$('bookletTitle').value.trim() || '',
    author:$('bookletAuthor').value.trim() || $('authorName').value.trim() || '',
    includePhotos:$('bkPhotos').checked,
    includeMemories:$('bkMemories').checked,
    includeSources:$('bkSources').checked,
    includeQuestions:$('bkQuestions').checked,
    includeChronology:$('bkChronology').checked,
    notes:noteStore
  };
  const personQ = $('bookletPerson').value.trim();
  if (personQ){
    const n = normalize(personQ);
    const exact = Object.values(parsedData.people).find(p => normalize(p.name) === n);
    const partial = Object.values(parsedData.people).find(p => normalize(p.name).includes(n));
    opts.personId = (exact || partial || {}).id || '';
  }
  opts.surname = $('bookletSurname').value.trim() || '';
  if (scope === 'individual' && opts.personId && !$('bookletTitle').value.trim()) opts.title = 'The Story of ' + parsedData.people[opts.personId].name;
  if (scope === 'branch' && opts.personId && !$('bookletTitle').value.trim()) opts.title = 'The ' + parsedData.people[opts.personId].name + ' Branch';
  if (scope === 'surname' && opts.surname && !$('bookletTitle').value.trim()) opts.title = 'The ' + opts.surname + ' Family';
  return opts;
}
async function buildBooklet(){
  const data = getExportData();
  if (!data) return null;
  const opts = bookletScopeData();
  if ((opts.scope === 'individual' || opts.scope === 'branch') && !opts.personId){ toast('Choose a person for this scope.'); return null; }
  if (opts.scope === 'surname' && !opts.surname){ toast('Enter a surname for surname scope.'); return null; }
  let plan = { dests:[], byRef:new Map(), unmatched:[], urlRefs:[], embedded:false };
  if (opts.includePhotos && $('includeMedia').checked && mediaSession.files.length){
    plan = await prepareMediaUris(data, profileIsFamily());
  }
  const q = getExportData().quality; // repair 1: booklet research rows from the filtered view
  opts.qualityRows = q.rows.slice(0, 15);
  opts.mediaPlan = plan; // v2.1.0 fix: attach the prepared media plan so photos actually embed
  const res = buildBookletHtml(data, opts);
  return res;
}
$('bookletPreviewBtn').addEventListener('click', async () => {
  const res = await buildBooklet();
  if (!res) return;
  $('bookletFrame').srcdoc = res.html;
  $('bookletModal').classList.add('show');
  $('bookletStats').textContent = 'Booklet built: ' + fmt(res.stats.people) + ' people, ' + fmt(res.stats.photos) + ' images. Use Print / Save as PDF from the preview toolbar (or inside the downloaded file).';
  log('Booklet preview generated.');
});
$('bookletDownloadBtn').addEventListener('click', async () => {
  const res = await buildBooklet();
  if (!res) return;
  const base = cleanFileBase(fileName || parsedData.meta.title);
  downloadText(base + '_Family_Story_Booklet.html', res.html, 'text/html;charset=utf-8');
  $('bookletStats').textContent = 'Booklet downloaded (' + fmt(Math.round(res.html.length / 1024)) + ' KB, ' + fmt(res.stats.people) + ' people, ' + fmt(res.stats.photos) + ' images). Open it in any browser and print or Save as PDF.';
  log('Family Story Booklet downloaded.');
});
$('bookletPrintBtn').addEventListener('click', () => { try { $('bookletFrame').contentWindow.print(); } catch(e) { toast('Use the downloaded booklet file to print.'); } });
$('bookletCloseBtn').addEventListener('click', () => { $('bookletModal').classList.remove('show'); $('bookletFrame').srcdoc = ''; });
