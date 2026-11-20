
// ============================================================ builder UI
const $ = id => document.getElementById(id);
let gedBytes = null, gedText = '', fileName = '', parsedData = null, parsedStats = null;
let privacyData = null, privacyKey = '';
let mediaSession = { files: [] };
let mediaPlan = { dests:[], byRef:new Map(), unmatched:[], urlRefs:[], embedded:false };
let dupSuggestions = [];
let parseCancelled = false, exportCancelled = false;

function log(msg){ $('log').textContent += '\n' + msg; $('log').scrollTop = $('log').scrollHeight; }
function setLog(msg){ $('log').textContent = msg; }
function toast(msg){ const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2400); }
function setBtns(enabled){
  for (const id of ['generateBtn','generateZipBtn','downloadJsonBtn','exportObsidianBtn','exportLogseqBtn','exportMarkdownSingleBtn','diagReportBtn','qualityReportBtn','refineExportBtn','bookletPreviewBtn','bookletDownloadBtn','dupFlagAllBtn','changesReportBtn','changesReportJsonBtn','photoRequestExport']) $(id).disabled = !enabled;
}
function downloadText(filename, text, mime='text/plain;charset=utf-8'){ downloadBlob(filename, new Blob([text], { type:mime })); }
function downloadBlob(filename, blob){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1200);
}
function setProgress(which, label, frac){
  const wrap = $(which + 'Progress'), bar = $(which + 'ProgressBar'), lab = $(which + 'ProgressLabel'), pct = $(which + 'ProgressPct');
  wrap.classList.add('show');
  if (label !== null) lab.textContent = label;
  const f = Math.max(0, Math.min(1, frac));
  bar.style.width = (f * 100).toFixed(1) + '%';
  pct.textContent = Math.round(f * 100) + '%';
}
function hideProgress(which){ $(which + 'Progress').classList.remove('show'); }
const nextTick = () => new Promise(r => setTimeout(r, 0));

// ------------------------------------------------------------- tabs/theme
const TABS = ['build','diagnostics','media','refine','booklet','about'];
function switchTab(name){
  for (const t of TABS){
    $('tab-' + t).setAttribute('aria-selected', t === name ? 'true' : 'false');
    $('panel-' + t).classList.toggle('active', t === name);
  }
}
for (const t of TABS) $('tab-' + t).addEventListener('click', () => switchTab(t));
function themeLabel(theme){ return theme === 'dark' ? 'Dark · Kayock Purple' : 'Light · Southwest Heritage'; }
function themeInit(){
  const theme = localStorage.getItem('kayockBuilderTheme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  $('themeBtn').textContent = 'Theme: ' + themeLabel(theme);
}
function themeToggle(){
  const cur = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('kayockBuilderTheme', next);
  $('themeBtn').textContent = 'Theme: ' + themeLabel(next);
}
$('themeBtn').addEventListener('click', themeToggle);

// ------------------------------------------------------------- file load
window.__loadGedString = (name, text) => { // used by the automated browser tests
  fileName = name;
  gedText = text; gedBytes = new TextEncoder().encode(text);
  afterFileLoaded();
};
const drop = $('drop');
drop.addEventListener('click', () => $('file').click());
drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('file').click(); } });
drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag'); });
drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('drag'); if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]); });
$('file').addEventListener('change', e => { if (e.target.files[0]) loadFile(e.target.files[0]); });
function loadFile(file){
  fileName = file.name;
  parsedData = null; privacyData = null; dupSuggestions = [];
  if (/\.zip$/i.test(file.name)){
    $('fileInfo').textContent = file.name + ' • ' + fmt(file.size) + ' bytes';
    setLog('ZIP files are not parsed directly. Unzip the archive and choose the .ged file inside (the original app behavior — kept for safety and clarity).');
    $('readyNote').className = 'note warn';
    $('readyNote').innerHTML = 'This is a <code>.zip</code>. Unzip it first, then select the <code>.ged</code> inside.';
    setBtns(false);
    $('parseBtn').disabled = true;
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    gedBytes = new Uint8Array(reader.result);
    const dec = decodeGedBytes(gedBytes);
    gedText = dec.text;
    afterFileLoaded(dec);
  };
  reader.onerror = () => setLog('Could not read file.');
  reader.readAsArrayBuffer(file);
}
function afterFileLoaded(dec){
  parsedData = null; privacyData = null; dupSuggestions = [];
  $('fileInfo').textContent = fileName + ' • ' + fmt(gedBytes ? gedBytes.length : gedText.length) + ' bytes';
  const noteEl = $('encodingNote');
  if (dec){
    noteEl.style.display = 'block';
    noteEl.className = 'note';
    noteEl.innerHTML = 'Detected encoding: <b>' + htmlEscape(dec.charsetLabel) + '</b>' + (dec.det.bom ? ' (BOM)' : '') + (dec.det.declared ? ' · GED header declares: ' + htmlEscape(dec.det.declaredLabel) : ' · no 1 CHAR declaration found') + (dec.decodeNote ? '<br>' + htmlEscape(dec.decodeNote) : '') + (dec.det.warnings.length ? '<br>' + dec.det.warnings.map(htmlEscape).join('<br>') : '');
  } else noteEl.style.display = 'none';
  $('parseBtn').disabled = false;
  setBtns(false);
  setLog('Loaded ' + fileName + '. Click Parse GED.');
  $('readyNote').className = 'note warn';
  $('readyNote').innerHTML = 'Ready. Click <b>Parse GED</b>.';
}

// ------------------------------------------------------------- parse flow
$('cancelParseBtn').addEventListener('click', () => { parseCancelled = true; });
$('parseBtn').addEventListener('click', async () => {
  if (!gedText) return;
  parseCancelled = false;
  $('parseBtn').disabled = true;
  $('cancelParseBtn').disabled = false;
  $('readyNote').className = 'note';
  $('readyNote').textContent = 'Parsing…';
  setProgress('parse', 'Decoding text…', 0.05);
  await nextTick();
  try {
    const t0 = performance.now();
    const dec = decodeGedBytes(gedBytes);
    if (parseCancelled) throw { cancelled:true };
    setProgress('parse', 'Tokenizing GED lines…', 0.2);
    await nextTick();
    const diag = [];
    const tree = buildGedTree(gedText, diag);
    setProgress('parse', 'Interpreting records…', 0.6);
    await nextTick();
    const data = parseGedcom(gedText, { diag, fileName, charsetLabel:dec.charsetLabel, encodingNote:(dec.det.warnings || []).join(' '), decodeNote:dec.decodeNote });
    setProgress('parse', 'Computing identity & diagnostics…', 0.9);
    await nextTick();
    computeTreeIdentity(data, fileName, gedText);
    parsedData = data;
    applyTitleAndSpotlight(data);
    renderParseResults(data, performance.now() - t0);
    setProgress('parse', 'Done', 1);
    await nextTick();
    hideProgress('parse');
  } catch(err){
    hideProgress('parse');
    if (err && err.cancelled){ setLog('Parse cancelled.'); $('readyNote').textContent = 'Parse cancelled.'; $('readyNote').className = 'note warn'; }
    else { console.error(err); setLog('ERROR: ' + (err.message || err)); $('readyNote').className = 'note bad'; $('readyNote').textContent = 'Parse failed: ' + (err.message || err); }
  }
  $('parseBtn').disabled = false;
  $('cancelParseBtn').disabled = true;
});
function applyTitleAndSpotlight(data){
  data.meta.title = $('treeTitle').value.trim() || 'Family Story Explorer';
  const spotlightName = $('spotlightName').value.trim();
  data.meta.spotlightName = spotlightName;
  data.meta.spotlightId = '';
  if (spotlightName){
    const n = normalize(spotlightName);
    const list = Object.values(data.people);
    const exact = list.find(p => normalize(p.name) === n);
    const partial = list.find(p => normalize(p.name).includes(n));
    data.meta.spotlightId = (exact || partial || {}).id || '';
    if (!data.meta.spotlightId) log('Spotlight name was not found; explorer will start with the first person in the GED.');
  }
  if (!data.meta.spotlightId){
    const first = Object.values(data.people).sort((a,b) => String(a.name).localeCompare(String(b.name)))[0];
    data.meta.spotlightId = first ? first.id : '';
  }
}
function renderParseResults(data, elapsedMs){
  const m = data.meta;
  $('peopleCount').textContent = fmt(m.peopleCount);
  $('familyCount').textContent = fmt(m.familyCount);
  $('noteCount').textContent = fmt(m.noteCount);
  $('sourceCount').textContent = fmt(m.sourceCount);
  $('mediaCount').textContent = fmt(m.mediaCount);
  $('eventCount').textContent = fmt(m.eventCount);
  $('parseMeta').style.display = 'block';
  $('parseMeta').innerHTML = 'GEDCOM version: <b>' + htmlEscape(m.vers || 'unspecified') + '</b> (parsed as ' + htmlEscape(m.spec) + ') · encoding: <b>' + htmlEscape(m.charset || '?') + '</b> · ' + fmt(m.lineCount) + ' lines · parse ' + fmt(elapsedMs) + ' ms<br>Tree identity: <span class="kbd">' + htmlEscape(m.treeId) + '</span> <span class="tiny">(stable across exports; refinement backups are matched to it)</span>';
  const errs = data.diagnostics.filter(d => d.severity === 'error').length;
  const warns = data.diagnostics.filter(d => d.severity === 'warning').length;
  $('readyNote').className = 'note ' + (errs ? 'bad' : warns ? 'warn' : 'good');
  $('readyNote').innerHTML = 'Parsed successfully. ' + (errs ? fmt(errs) + ' error(s), ' : '') + (warns ? fmt(warns) + ' warning(s) — ' : '') + 'see the Diagnostics tab, then generate your outputs.';
  log('Done. People: ' + fmt(m.peopleCount) + ', Families: ' + fmt(m.familyCount) + ', Events: ' + fmt(m.eventCount) + ', Notes: ' + fmt(m.noteCount) + ', Sources: ' + fmt(m.sourceCount) + ', Media refs: ' + fmt(m.mediaCount) + '. Diagnostics: ' + fmt(errs) + ' errors / ' + fmt(warns) + ' warnings / ' + fmt(data.diagnostics.filter(d => d.severity === 'info').length) + ' info.');
  setBtns(true);
  renderDiagnostics(data);
  renderQuality(data);
  renderMediaTable();
  renderTreeIdentity();
  renderDupSuggestions();
  renderPhotoChecklist();
  renderNoteStore();
  refreshDatalists();
  loadNoteStoreForTree();
  updateBookletOptions();

}
function refreshDatalists(){
  const pl = $('personList'), sl = $('surnameList');
  const peopleList = Object.values(parsedData.people).slice(0, 4000);
  pl.innerHTML = peopleList.map(p => '<option value="' + htmlEscape(p.name) + '">').join('');
  const surnames = [...new Set(peopleList.map(p => p.surname).filter(Boolean))].sort();
  sl.innerHTML = surnames.map(s => '<option value="' + htmlEscape(s) + '">').join('');
}

// ------------------------------------------------------- diagnostics tab
let diagFilter = 'all';
document.querySelectorAll('#diagFilters button').forEach(b => b.addEventListener('click', () => { diagFilter = b.getAttribute('data-sev'); renderDiagnostics(parsedData); }));
function renderDiagnostics(data){
  if (!data) return;
  const counts = { error:0, warning:0, info:0 };
  for (const d of data.diagnostics) counts[d.severity]++;
  const total = data.diagnostics.length;
  $('diagSummary').className = 'note ' + (counts.error ? 'bad' : counts.warning ? 'warn' : 'good');
  $('diagSummary').innerHTML = total
    ? '<b>' + fmt(total) + ' findings</b> — ' + fmt(counts.error) + ' errors, ' + fmt(counts.warning) + ' warnings, ' + fmt(counts.info) + ' info. The GED data itself is untouched; these are hints for your genealogy software.'
    : 'No issues found — clean parse. Every reference resolved, dates consistent, structure valid.';
  const rows = data.diagnostics.filter(d => diagFilter === 'all' || d.severity === diagFilter);
  $('diagTableBody').innerHTML = rows.length
    ? rows.map(d => '<tr><td><span class="badge ' + (d.severity === 'error' ? 'err' : d.severity === 'warning' ? 'warn' : 'info') + '">' + d.severity + '</span></td><td>' + htmlEscape(d.code) + '</td><td>' + htmlEscape(d.message) + '</td><td>' + htmlEscape(d.xref || '') + '</td></tr>').join('')
    : '<tr><td colspan="4">No findings for this filter.</td></tr>';
}
function renderQuality(data){
  if (!data) return;
  const q = buildSourceQuality(data);
  $('qualitySummary').className = 'note ' + (q.coverage.people >= 60 ? 'good' : q.coverage.people >= 25 ? 'warn' : 'bad');
  $('qualitySummary').innerHTML = 'People with at least one citation: <b>' + q.coverage.people + '%</b> · events with citations: <b>' + q.coverage.events + '%</b> · evidence quality mix: ' + ['none', 'weak', 'circumstantial', 'secondary', 'direct'].map((l, i) => l + ' ' + (data.stats.quay[i] || 0)).join(' · ') + ' · uncited ' + (data.stats.quay.none || 0);
  const pctP = q.coverage.people, pctE = q.coverage.events;
  $('qualityBars').innerHTML =
    '<div class="row" style="margin:6px 0"><span style="width:170px" class="tiny">People cited</span><div class="bar" style="flex:1"><i class="' + (pctP >= 60 ? '' : pctP >= 25 ? 'warn' : 'bad') + '" style="width:' + pctP + '%"></i></div><span class="tiny">' + pctP + '%</span></div>' +
    '<div class="row" style="margin:6px 0"><span style="width:170px" class="tiny">Events cited</span><div class="bar" style="flex:1"><i class="' + (pctE >= 60 ? '' : pctE >= 25 ? 'warn' : 'bad') + '" style="width:' + pctE + '%"></i></div><span class="tiny">' + pctE + '%</span></div>';
  $('qualityTableBody').innerHTML = q.rows.length
    ? q.rows.map(r => '<tr><td>' + htmlEscape(r.name) + '</td><td>' + htmlEscape(r.id) + '</td><td>' + r.events + '</td><td>' + r.cited + '</td><td>' + htmlEscape(r.suggestion) + '</td></tr>').join('') + (q.rowsTotal > q.rows.length ? '<tr><td colspan="5">… and ' + fmt(q.rowsTotal - q.rows.length) + ' more (download the full report)</td></tr>' : '')
    : '<tr><td colspan="5">Every person with events has at least one citation. Impressive archive!</td></tr>';
}
$('diagReportBtn').addEventListener('click', () => {
  if (!parsedData) return;
  downloadText(cleanFileBase(fileName || parsedData.meta.title) + '_diagnostics_report.md', buildDiagnosticsReportMd(parsedData), 'text/markdown;charset=utf-8');
  log('Diagnostics report downloaded.');
});
$('qualityReportBtn').addEventListener('click', () => {
  if (!parsedData) return;
  const q = buildSourceQuality(parsedData);
  let md = '# Source quality & missing evidence report\n\n';
  md += '- File: ' + (parsedData.meta.fileName || '(unnamed)') + '\n- Generated: ' + new Date().toLocaleString() + ' by Grandmothers voice by Kayock ' + APP_VERSION + '\n- People with citations: ' + q.coverage.people + '%\n- Events with citations: ' + q.coverage.events + '%\n- Evidence quality: ' + ['none','weak','circumstantial','secondary','direct'].map((l,i) => l + ' ' + (parsedData.stats.quay[i] || 0)).join(', ') + '\n\n';
  md += '## People whose events have no citations (' + q.rowsTotal + ')\n\n';
  md += q.rows.length ? q.rows.map(r => '- ' + r.name + ' (' + r.id + ') — ' + r.events + ' event(s), 0 cited — ' + r.suggestion).join('\n') + '\n' : 'None.\n';
  md += '\nThis report only lists what is missing from the GED. It never invents facts or sources.\n';
  downloadText(cleanFileBase(fileName || parsedData.meta.title) + '_source_quality_report.md', md, 'text/markdown;charset=utf-8');
  log('Source quality report downloaded.');
});
