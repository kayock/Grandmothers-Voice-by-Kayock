
const EXPLORE_JS_D = `
// ------------------------------------------------------------- tabs / init
let activeTab = 'person';
function switchTab(name){
  activeTab = name;
  for (const t of ['person','tree','timeline','places','gallery','about']){
    const btn = $('tabbtn-' + t), pane = $('pane-' + t);
    if (!btn || !pane) continue;
    const sel = t === name;
    btn.setAttribute('aria-selected', sel ? 'true' : 'false');
    pane.style.display = sel ? 'block' : 'none';
  }
  if (name === 'tree') renderTree();
  if (name === 'timeline') renderTimeline(true);
  if (name === 'places') renderPlaces(true);
  if (name === 'gallery') renderGallery();
  if (name === 'about') renderAbout();
}
function renderAll(){
  renderPerson();
  if (activeTab === 'tree'){ treeState.cacheKey = ''; renderTree(); }
  if (activeTab === 'timeline'){ tlState.rows = null; renderTimeline(true); }
  if (activeTab === 'places'){ placesState.list = null; renderPlaces(true); }
  if (activeTab === 'gallery') renderGallery();
  const pathEl = $('whoNow'); if (pathEl) pathEl.textContent = personName(currentId);
}
function renderAbout(){
  const host = $('aboutHost');
  const d = DATA.diagnostics || [];
  const counts = { error:0, warning:0, info:0 };
  for (const x of d) counts[x.severity]++;
  let html = '<h2>About this file</h2>' +
    '<p class="tiny">Generated ' + esc(String(meta.created).slice(0,10)) + ' by Grandmothers voice by Kayock ' + esc(meta.version || '2.1.1') + ' (MIT). Works fully offline.</p>' +
    '<p><b>Tree:</b> ' + esc(meta.title) + '<br><b>Source GED file:</b> ' + esc(meta.fileName || '(not recorded)') + '<br><b>GEDCOM version:</b> ' + esc(meta.vers || 'unspecified') + ' (parsed as ' + esc(meta.spec) + ')<br><b>Character encoding:</b> ' + esc(meta.charset || 'unknown') + '<br><b>Tree identity:</b> ' + esc(meta.treeId) + ' <span class="tiny">(refinement backups are matched against this id so notes never attach to the wrong family)</span></p>' +
    '<p><b>Contents:</b> ' + fmt(meta.peopleCount) + ' people · ' + fmt(meta.familyCount) + ' families · ' + fmt(meta.eventCount) + ' events · ' + fmt(meta.noteCount) + ' notes · ' + fmt(meta.sourceCount) + ' sources · ' + fmt(meta.mediaCount) + ' media references</p>' +
    (meta.privacyMode && meta.privacyMode !== 'full' ? '<div class="privNote"><b>Privacy mode active:</b> ' + esc(meta.privacyMode) + '. People estimated to be living were ' + (meta.privacyMode === 'exclude' ? 'excluded (shown as “Private (living person)” placeholders)' : 'redacted (dates, places, notes, sources and media hidden') + '). Verify before sharing.</div>' : '') +
    (meta.mediaMode === 'embedded' ? '<p class="tiny">All photos and documents are embedded inside this single HTML file.</p>' : (meta.mediaMode === 'linked' ? '<p class="tiny">Media is loaded from the media/ folder next to this file — keep the folder and file together.</p>' : '')) +
    '<h3>Data diagnostics</h3>';
  if (d.length){
    html += '<p class="tiny">' + counts.error + ' error(s), ' + counts.warning + ' warning(s), ' + counts.info + ' info — the full report is in the builder app.</p>';
    html += d.slice(0, 60).map(x => '<div class="issueRow"><span class="badge ' + (x.severity === 'error' ? 'err' : x.severity === 'warning' ? 'warn' : 'info') + '">' + esc(x.code) + '</span><span class="issueMsg">' + esc(x.message) + '</span><span class="tiny">' + esc(x.xref || '') + '</span></div>').join('');
    if (d.length > 60) html += '<div class="tiny">… ' + fmt(d.length - 60) + ' more</div>';
  } else {
    html += '<p class="tiny">No diagnostics were included in this export (disabled or the tree is very large).</p>';
  }
  if (DATA.quality){
    const q = DATA.quality;
    html += '<h3>Source coverage</h3><p class="tiny">People with at least one citation: ' + q.coverage.people + '% · Events with citations: ' + q.coverage.events + '%. The builder app can export a full missing-evidence report.</p>';
  }
  html += '<h3>Privacy</h3><p class="tiny">This file contains no trackers, no network calls, and no analytics. Refinement notes are stored only in this browser on this device. The original GEDCOM file was opened read-only and never modified.</p>';
  host.innerHTML = html;
}
function themeLabel(theme){ return theme === 'dark' ? 'Dark · Kayock Purple' : 'Light · Southwest Heritage'; }
function themeInit(){
  const saved = localStorage.getItem('kayockTheme');
  const theme = saved || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  const btn = $('themeBtn');
  if (btn) btn.textContent = 'Theme: ' + themeLabel(theme);
}
function themeToggle(){
  const cur = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('kayockTheme', next);
  $('themeBtn').textContent = 'Theme: ' + themeLabel(next);
}
const TOUR_STEPS = [
  ['Welcome to your Family Story Explorer', 'This file was created offline from your GEDCOM. Start on the Person tab: search anyone on the left, then branch through parents, spouses, children and siblings.'],
  ['Family Tree, Timeline & Places', 'The Tree tab draws ancestors and descendants around the selected person. Timeline lists every recorded event chronologically — uncertain dates (ABT, BEF…) are kept as recorded. Places shows where the family lived and a simple life-route for the selected person. All three follow the person you open.'],
  ['Photos & documents', 'If the builder embedded media, the Gallery tab and each person page show them. Click any item to view or download the original file.'],
  ['Add family memories (Tree Refinement Mode)', 'On each person page you can record memories and corrections with your name. Notes autosave in this browser. Export a JSON backup and send it back to whoever built the file — they can merge every relative\\'s notes safely.'],
  ['Privacy & safety', 'No internet, no accounts, no tracking. If the file was generated with privacy redaction, living people\\'s details are hidden. The original GED file is never modified.']
];
let tourStep = 0;
function showTour(){
  tourStep = 0;
  renderTourStep();
  $('tourOverlay').classList.add('show');
}
function renderTourStep(){
  const [title, text] = TOUR_STEPS[tourStep];
  $('tourTitle').textContent = title;
  $('tourText').textContent = text;
  $('tourNextBtn').textContent = tourStep >= TOUR_STEPS.length - 1 ? 'Start exploring' : 'Next';
}
function tourNext(){
  if (tourStep >= TOUR_STEPS.length - 1){ closeTour(); return; }
  tourStep++; renderTourStep();
}
function closeTour(){
  $('tourOverlay').classList.remove('show');
  try { localStorage.setItem('kayockSeenTour:' + meta.treeId, '1'); } catch(e) {}
}
function keyboardNav(e){
  const tag = (e.target.tagName || '').toLowerCase();
  const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
  if (e.key === 'Escape'){ document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show')); return; }
  if (typing) return;
  if (e.key === '/'){ e.preventDefault(); $('search').focus(); return; }
  if (e.key === 't' && !e.ctrlKey && !e.metaKey){ themeToggle(); return; }
  if (e.key >= '1' && e.key <= '6'){ const tabs = ['person','tree','timeline','places','gallery','about']; const t = tabs[+e.key - 1]; if (t) switchTab(t); }
}
function init(){
  themeInit();
  $('themeBtn').addEventListener('click', themeToggle);
  $('search').addEventListener('input', debounce(doSearch, 160));
  $('search').addEventListener('keydown', searchKey);
  $('spotlightBtn').addEventListener('click', () => go(meta.spotlightId || currentId));
  $('homeBtn').addEventListener('click', () => { currentId = meta.spotlightId || Object.keys(people)[0] || ''; historyStack.length = 0; renderAll(); });
  $('backBtn').addEventListener('click', () => { const prev = historyStack.pop(); if (prev) go(prev, false); });
  for (const t of ['person','tree','timeline','places','gallery','about']){ const b = $('tabbtn-' + t); if (b) b.addEventListener('click', () => switchTab(t)); }
  document.addEventListener('keydown', keyboardNav);
  // keyboard activation for generated role=button elements (delegation — no inline handlers)
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const t = e.target;
    if (!t || !t.getAttribute || t.getAttribute('role') !== 'button') return;
    if (t.tagName === 'BUTTON' || t.tagName === 'A' || t.tagName === 'INPUT') return;
    e.preventDefault();
    t.click();
  });
  $('lightboxClose').addEventListener('click', () => $('lightbox').classList.remove('show'));
  $('lightbox').addEventListener('click', e => { if (e.target === $('lightbox')) $('lightbox').classList.remove('show'); });
  $('tourSkipBtn').addEventListener('click', closeTour);
  $('tourNextBtn').addEventListener('click', tourNext);
  const nbImport = $('notebookImportInput'); if (nbImport) nbImport.addEventListener('change', handleNotebookImport);
  doSearch();
  renderAll();
  switchTab('person');
  if (meta.includeTour && !localStorage.getItem('kayockSeenTour:' + meta.treeId)) showTour();
}
document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
`;

function buildExplorerHtml(data, opts, mediaPlan){
  opts = opts || {};
  const mediaMode = opts.mediaMode || 'embedded';
  const keyByFile = new Map();
  if (mediaPlan && mediaPlan.dests) for (const a of mediaPlan.dests) for (const f of (a.refs||[])) keyByFile.set(f, a.key);
  function rewriteMediaList(list){
    if (!list || !list.length) return list;
    return list.map(m => {
      if (!m.files || !m.files.length) return m;
      const files = m.files.map(f => ({ ...f, key: keyByFile.get(f.file) || null }));
      return { ...m, files };
    });
  }
  const peopleOut = {}, familiesOut = {};
  for (const [id, p] of Object.entries(data.people)) peopleOut[id] = { ...p, media:rewriteMediaList(p.media), events:(p.events||[]).map(ev => ({ ...ev, media:rewriteMediaList(ev.media) })) };
  for (const [id, f] of Object.entries(data.families)) familiesOut[id] = { ...f, media:rewriteMediaList(f.media), events:(f.events||[]).map(ev => ({ ...ev, media:rewriteMediaList(ev.media) })) };
  const mediaPayload = {};
  if (mediaPlan && mediaPlan.dests){
    for (const a of mediaPlan.dests){
      mediaPayload[a.key] = { title:a.title || a.name, name:a.name, kind:a.kind, mime:a.mime || '', dataUri:(mediaMode === 'embedded' && a.dataUri) ? a.dataUri : undefined, src:(mediaMode === 'linked' && a.dest) ? ('media/' + a.dest) : undefined, size:a.size || 0 };
    }
  }
  const payload = { meta:{ ...data.meta, mediaMode, includeTour:!!opts.includeTour, includeNotebook:!!opts.includeNotebook }, people:peopleOut, families:familiesOut, media:mediaPayload };
  if (opts.includeDiagnostics && data.diagnostics && data.meta.peopleCount <= 2000) payload.diagnostics = data.diagnostics;
  if (opts.sourceQuality && data.meta.peopleCount <= 2000) payload.quality = opts.sourceQuality;
  const dataJson = escapeJsonForScript(payload);
  const explorerTitle = htmlEscape(data.meta.title || 'Family Story Explorer');
  const mediaNote = mediaMode === 'linked'
    ? '<div class="sub">Media files load from the <code>media/</code> folder next to this file — keep them together.</div>'
    : (mediaMode === 'embedded' ? '<div class="sub">All media is embedded in this single file — share just this one file.</div>' : '');
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${explorerTitle}</title>
<style>${EXPLORER_CSS}</style>
</head>
<body>
<a class="skipLink" href="#main">Skip to main content</a>
<header>
  <div class="hRow">
    <h1 class="hTitle">${explorerTitle}</h1>
    <div class="hMeta">${fmt(data.meta.peopleCount)} people · ${fmt(data.meta.familyCount)} families · selected: <span id="whoNow">—</span> ${mediaNote}</div>
    <button id="themeBtn" aria-label="Switch color theme">Theme: Dark · Kayock Purple</button>
  </div>
  <div class="hRow" role="tablist" aria-label="Sections" style="margin-top:8px">
    <button id="tabbtn-person" role="tab" aria-selected="true">Person</button>
    <button id="tabbtn-tree" role="tab" aria-selected="false">Family Tree</button>
    <button id="tabbtn-timeline" role="tab" aria-selected="false">Timeline</button>
    <button id="tabbtn-places" role="tab" aria-selected="false">Places</button>
    <button id="tabbtn-gallery" role="tab" aria-selected="false">Gallery</button>
    <button id="tabbtn-about" role="tab" aria-selected="false">About</button>
  </div>
</header>
<div class="layout">
  <aside class="side">
    <label class="tiny" for="search" style="display:block;margin-bottom:6px">Search a person</label>
    <input id="search" class="search" type="search" placeholder="Search a name…  (press / to focus)" autocomplete="off" aria-label="Search people">
    <div class="toolbar">
      <button class="primary" id="spotlightBtn">Start Here</button>
      <button id="backBtn">Back</button>
      <button id="homeBtn">Home</button>
    </div>
    <div class="tiny" style="margin-bottom:6px">Tip: press <span class="kbd">/</span> to search, <span class="kbd">1</span>–<span class="kbd">6</span> to switch tabs.</div>
    <div id="results" role="listbox" aria-label="Search results"></div>
  </aside>
  <main class="main" id="main">
    <div id="pane-person"><div id="personHost"></div></div>
    <div id="pane-tree" style="display:none"><div id="treeHost"></div></div>
    <div id="pane-timeline" style="display:none"><div id="timelineHost"></div></div>
    <div id="pane-places" style="display:none"><div id="placesHost"></div></div>
    <div id="pane-gallery" style="display:none"><div id="galleryHost"></div></div>
    <div id="pane-about" style="display:none"><div id="aboutHost"></div></div>
  </main>
</div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<div class="modal" id="lightbox" role="dialog" aria-modal="true" aria-label="Media viewer">
  <div class="modalBox" style="max-width:1000px;align-items:center">
    <div class="modalHead"><h2 id="lightboxTitle" style="font-size:15px">Media</h2><button id="lightboxClose">Close</button></div>
    <div class="modalBody" id="lightboxBody" style="text-align:center"></div>
  </div>
</div>
<div class="modal" id="notebookModal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
  <div class="modalBox" style="max-width:920px">
    <div class="modalHead"><h2 id="modalTitle">Review import</h2><button id="modalCloseBtn" onclick="document.getElementById('notebookModal').classList.remove('show')">Close</button></div>
    <div class="modalBody" id="modalBody"></div>
  </div>
</div>
<div class="tourOverlay" id="tourOverlay" role="dialog" aria-modal="true" aria-labelledby="tourTitle">
  <div class="modalBox" style="max-width:560px;padding:0">
    <div class="modalHead"><h2 id="tourTitle" style="font-size:17px">Welcome</h2></div>
    <div style="padding:16px">
      <p id="tourText" style="color:var(--muted);line-height:1.6;margin:0 0 14px;font-size:14px"></p>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button id="tourSkipBtn">Skip tour</button>
        <button class="primary" id="tourNextBtn">Next</button>
      </div>
    </div>
  </div>
</div>
<footer style="max-width:1400px;margin:6px auto 20px;padding:0 14px;color:var(--muted);font-size:12px">
  Generated offline by ${APP_NAME} ${APP_VERSION} · MIT license · your GED file is never modified · refinement notes stay in this browser until you export them
</footer>
<script id="tree-data" type="application/json">${dataJson}</scr` + `ipt>
<script>
${EXPLORE_JS_A}
${EXPLORE_JS_B}
${EXPLORE_JS_C}
${EXPLORE_JS_D}
</scr` + `ipt>
</body>
</html>`;
}

/* ==== EXPORTS-END ==== */
