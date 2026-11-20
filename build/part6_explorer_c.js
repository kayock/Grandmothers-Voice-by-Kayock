
const EXPLORE_JS_C = `
// ------------------------------------------------------------- person
function renderPerson(){
  const p = people[currentId];
  const main = $('personHost');
  if (!main) return;
  if (!p){ main.innerHTML = '<p>No person selected.</p>'; return; }
  const rels = relations(currentId);
  const facts = '<div class="facts">' +
    '<div class="fact"><b>Birth</b>' + esc([p.birthDate, p.birthPlace].filter(Boolean).join(' — ') || 'Unknown') + '</div>' +
    '<div class="fact"><b>Death</b>' + esc([p.deathDate, p.deathPlace].filter(Boolean).join(' — ') || (p.hasDeathEvent ? 'Recorded (no date)' : 'No death recorded')) + '</div>' +
    '<div class="fact"><b>Sex</b>' + esc(p.sex || 'Unknown') + '</div>' +
    '<div class="fact"><b>GED ID</b>' + esc(p.id) + (p.living ? ' <span class="badge warn">living</span>' : '') + (p.privacy ? ' <span class="badge info">privacy redacted</span>' : '') + '</div></div>';
  const assoc = (p.associations && p.associations.length) ? '<div class="section"><h2>Associated people</h2><div class="relBox">' + p.associations.map(a => personButton(a.person) + (a.role ? ' <span class="tiny">' + esc(a.role) + '</span>' : '')).join(' ') + '</div></div>' : '';
  main.innerHTML = '<div class="path">GED record <span class="kbd">' + esc(p.id) + '</span></div>' +
    '<h1 class="personTitle">' + esc(p.name) + '</h1>' +
    '<div class="muted">' + esc(vital(p) || 'No vital dates listed') + '</div>' +
    (p.privacy ? '<div class="privNote">This person is estimated to be living. Details are hidden by the privacy settings chosen when this file was generated.</div>' : '') +
    facts +
    '<div class="section"><h2>Branch from here</h2><div class="relGrid">' + relBox('Parents', rels.parents) + relBox('Spouse / partner', rels.spouses) + relBox('Children', rels.children) + relBox('Siblings', rels.siblings) + '</div></div>' +
    eventsHtml(p) +
    notesHtml('GED / Ancestry person notes', p.notes) +
    sourcesHtml(p.sources) +
    mediaSection('Photos & documents', p.media) +
    assoc +
    familyRecordsHtml(rels) +
    notebookSection(currentId);
  autoWireNotebook();
}
// ------------------------------------------------------------- tree view
const treeState = { up:4, down:3, cache:null, cacheKey:'' };
function treeNodeAt(x, y, id, label, years, selected, living){
  const w = 116, h = 44;
  return '<g class="treeNode' + (selected ? ' selected' : '') + (living ? ' living' : '') + '" tabindex="0" role="button" data-id="' + esc(id) + '" transform="translate(' + (x - w/2) + ',' + (y - h/2) + ')" onclick="go(' + jsArg(id) + ')">' +
    '<rect width="' + w + '" height="' + h + '" rx="9" />' +
    '<text x="' + (w/2) + '" y="18" text-anchor="middle">' + esc(label.slice(0, 17)) + '</text>' +
    '<text class="years" x="' + (w/2) + '" y="34" text-anchor="middle">' + esc(years || '') + '</text></g>';
}
function buildTreeLayout(rootId, up, down){
  const rows = {}; // rowIndex -> [{id, spouseId, x}]
  const nodes = new Map();
  let count = 0; const CAP = 400;
  // descendants (tidy, recursive)
  function descTree(id, depth){
    if (depth > down || count > CAP || !people[id]) return null;
    const p = people[id];
    const node = { id, depth, children:[] };
    count++; nodes.set(id, node);
    for (const fid of (p.fams || [])){
      const fam = families[fid]; if (!fam) continue;
      const spouse = fam.husband === id ? fam.wife : (fam.wife === id ? fam.husband : '');
      for (const cid of (fam.children || [])){
        if (count > CAP) break;
        const c = descTree(cid, depth + 1);
        if (c){ c.parentFam = fid; c.spouseId = spouse; node.children.push(c); }
      }
      if (spouse && people[spouse]) node.spouseId = spouse;
    }
    return node;
  }
  const rootDesc = descTree(rootId, 0);
  // width computation
  function widthOf(node){
    node.w = 130 + (node.spouseId ? 130 : 0);
    if (!node.children.length){ node.subW = node.w; return node.subW; }
    let s = 0;
    for (const c of node.children) s += widthOf(c) + 16;
    node.subW = Math.max(node.w, s - 16);
    return node.subW;
  }
  widthOf(rootDesc);
  function placeDesc(node, left, depth){
    const cx = left + node.subW / 2;
    node.x = cx;
    let row = rows[depth] || (rows[depth] = []);
    row.push({ id:node.id, x:cx });
    if (node.spouseId) row.push({ id:node.spouseId, x:cx + 130 });
    let cl = left;
    for (const c of node.children){ placeDesc(c, cl, depth + 1); cl += c.subW + 16; }
  }
  placeDesc(rootDesc, 0, 0);
  // ancestors (simple two-parent chains, capped)
  function ancestors(id, depth){
    if (depth > up || count > CAP || !people[id]) return;
    const p = people[id];
    const fam = p.famc && p.famc.length ? families[p.famc[0]] : null;
    if (!fam) return;
    const row = rows[-depth] || (rows[-depth] = []);
    const parents = [fam.husband, fam.wife].filter(x => x && people[x]);
    const rowSoFar = row.length;
    parents.forEach((pid, i) => {
      count++;
      row.push({ id:pid, x:0 });
    });
    for (const pid of parents) ancestors(pid, depth + 1);
  }
  ancestors(rootId, 1);
  // assign ancestor x positions: spread around root x
  const rootX = rootDesc.x;
  for (const [depth, row] of Object.entries(rows)){
    if (+depth >= 0) continue;
    const n = row.length;
    const spacing = 146;
    row.forEach((entry, i) => { entry.x = rootX + (i - (n - 1) / 2) * spacing; });
  }
  const edges = [];
  for (const node of nodes.values()){
    for (const c of node.children){ edges.push({ from:node.id, to:c.id, spouse:c.parentFam ? true : false }); }
  }
  for (const p of Object.values(people)){
    if (nodes.has(p.id)){
      for (const fid of (p.famc || [])){
        const fam = families[fid];
        if (!fam) continue;
        for (const pid of [fam.husband, fam.wife]){
          if (nodes.has(pid) && pid !== p.id){
            const inRows = Object.values(rows).some(r => r.some(e => e.id === p.id));
            edges.push({ from:pid, to:p.id });
          }
        }
      }
    }
  }
  return { rows, nodes, edges, count };
}
function renderTree(){
  const host = $('treeHost');
  const key = currentId + '|' + treeState.up + '|' + treeState.down;
  let L;
  if (treeState.cacheKey === key){ L = treeState.cache; }
  else { L = buildTreeLayout(currentId, treeState.up, treeState.down); treeState.cache = L; treeState.cacheKey = key; }
  const NODE_W = 116, NODE_H = 44, VSPACE = 96;
  const rowIndices = Object.keys(L.rows).map(Number).sort((a,b) => a - b);
  const rowIndexMap = {};
  rowIndices.forEach((r, i) => { rowIndexMap[r] = i; });
  const yOf = r => rowIndexMap[r] * VSPACE;
  const maxW = Math.max(400, ...rowIndices.map(r => Math.max(0, ...L.rows[r].map(e => e.x)) + NODE_W));
  const maxH = (rowIndices.length - 1) * VSPACE + NODE_H;
  const minX = Math.min(0, ...rowIndices.flatMap(r => L.rows[r].map(e => e.x - NODE_W)));
  let svg = '<svg id="treeSvg" width="100%" height="' + Math.max(320, Math.min(maxH, 620)) + '" viewBox="' + (minX - 20) + ' -20 ' + (maxW - minX + 40) + ' ' + (Math.max(320, Math.min(maxH, 620))) + '" preserveAspectRatio="xMidYMin meet" role="group" aria-label="Family tree diagram">';
  const pos = {};
  for (const r of rowIndices) for (const e of L.rows[r]) pos[e.id] = { x:e.x, y:yOf(r) };
  const drawn = new Set();
  for (const e of L.edges){
    const a = pos[e.from], b = pos[e.to];
    if (!a || !b) continue;
    const key = e.from + '>' + e.to;
    if (drawn.has(key)) continue; drawn.add(key);
    const midY = (a.y + b.y) / 2;
    svg += '<path class="linkLine" d="M ' + a.x + ' ' + (a.y + NODE_H/2) + ' C ' + a.x + ' ' + midY + ', ' + b.x + ' ' + midY + ', ' + b.x + ' ' + (b.y - NODE_H/2) + '" />';
  }
  for (const r of rowIndices){
    for (let i = 0; i < L.rows[r].length; i++){
      const entry = L.rows[r][i];
      const p = people[entry.id]; if (!p) continue;
      const next = L.rows[r][i+1];
      if (next){
        const pA = people[entry.id], pB = people[next.id];
        const areSpouses = (pA.fams || []).some(fid => { const f = families[fid]; return f && ((f.husband === entry.id && f.wife === next.id) || (f.wife === entry.id && f.husband === next.id)); });
        if (areSpouses){ svg += '<line class="spouseLine" x1="' + (entry.x + NODE_W/2) + '" y1="' + yOf(r) + '" x2="' + (next.x - NODE_W/2) + '" y2="' + yOf(r) + '" />'; }
      }
      if (pos[entry.id]) svg += treeNodeAt(entry.x, yOf(r), entry.id, p.privacy ? 'Private (living)' : p.name, [p.birthDateParsed && (p.birthDateParsed.startYear || p.birthDateParsed.year) ? 'b. ' + (p.birthDateParsed.startYear || p.birthDateParsed.year) : '', p.deathDateParsed && (p.deathDateParsed.startYear || p.deathDateParsed.year) ? 'd. ' + (p.deathDateParsed.startYear || p.deathDateParsed.year) : ''].filter(Boolean).join(' '), entry.id === currentId, !!p.living);
    }
  }
  svg += '</svg>';
  const capped = L.count >= 400;
  host.innerHTML = '<div class="toolbar"><button onclick="treeZoom(-1)">Zoom out</button><button onclick="treeZoom(1)">Zoom in</button><button onclick="treeReset()">Reset view</button>' +
    '<button onclick="treeMore(-1)">More ancestors (' + treeState.up + ' gens)</button><button onclick="treeMore(1)">More descendants (' + treeState.down + ' gens)</button>' +
    '<span class="tiny">' + fmt(L.count) + ' people shown' + (capped ? ' — display cap reached; use More buttons after raising the cap gradually' : '') + '</span></div>' +
    '<div class="tiny" style="margin-bottom:6px">Drag to pan · scroll to zoom · click a person to open their page · dashed outline = living</div>' +
    '<div class="treeWrap">' + svg + '</div>';
  wireTreePan();
  treeState.zoom = treeState.zoom || 1;
  applyTreeZoom();
}
let treeZoomLevel = 1;
function applyTreeZoom(){ const svg = $('treeSvg'); if (svg) svg.style.transform = 'scale(' + treeZoomLevel + ')'; svg.style.transformOrigin = 'top left'; }
function treeZoom(dir){ treeZoomLevel = Math.max(0.4, Math.min(2.5, treeZoomLevel + dir * 0.15)); applyTreeZoom(); }
function treeReset(){ treeZoomLevel = 1; applyTreeZoom(); }
function treeMore(dir){
  if (dir < 0) treeState.up = Math.min(12, treeState.up + 1); else treeState.down = Math.min(10, treeState.down + 1);
  treeState.cacheKey = '';
  renderTree();
}
function wireTreePan(){
  const svg = $('treeSvg'); if (!svg) return;
  let startX = 0, startY = 0, ox = 0, oy = 0, panning = false;
  let vb = svg.getAttribute('viewBox').split(/\\s+/).map(Number);
  svg.addEventListener('pointerdown', e => { panning = true; svg.classList.add('panning'); startX = e.clientX; startY = e.clientY; });
  window.addEventListener('pointermove', e => {
    if (!panning) return;
    const rect = svg.getBoundingClientRect();
    const kx = vb[2] / rect.width, ky = vb[3] / Math.max(1, rect.height);
    const dx = (e.clientX - startX) * kx, dy = (e.clientY - startY) * ky;
    svg.setAttribute('viewBox', (vb[0] - dx) + ' ' + (vb[1] - dy) + ' ' + vb[2] + ' ' + vb[3]);
  });
  window.addEventListener('pointerup', () => { panning = false; if (svg) svg.classList.remove('panning'); vb = svg.getAttribute('viewBox').split(/\\s+/).map(Number); });
  svg.addEventListener('wheel', e => {
    e.preventDefault();
    treeZoom(e.deltaY < 0 ? 1 : -1);
  }, { passive:false });
}
// ------------------------------------------------------------- timeline
const tlState = { filter:'all', query:'', rendered:0, rows:null };
function buildTimelineRows(){
  const rows = [];
  for (const p of Object.values(people)){
    for (const e of (p.events || [])){
      if (e.tag === 'CHANGE') continue;
      const dp = e.dateParsed;
      const y = dp ? (dp.startYear || dp.year) : 0;
      rows.push({ y: y || 9999, dateText: e.date || '(date not recorded)', uncertain: dateCertainty(dp), type: e.type || 'Event', place: e.place || '', value: e.value && !['Y','Yes'].includes(e.value) ? e.value : '', id: p.id, name: p.name, privacy: !!p.privacy });
    }
    for (const fid of (p.fams || [])){
      const f = families[fid]; if (!f) continue;
      for (const e of (f.events || [])){
        if (e.tag === 'CHANGE') continue;
        const dp = e.dateParsed;
        const y = dp ? (dp.startYear || dp.year) : 0;
        rows.push({ y: y || 9999, dateText: e.date || '(date not recorded)', uncertain: dateCertainty(dp), type: e.type || 'Event', place: e.place || '', value: e.value && !['Y','Yes'].includes(e.value) ? e.value : '', id: p.id, name: p.name, privacy: !!p.privacy, fam: fid });
      }
    }
  }
  rows.sort((a,b) => a.y - b.y || String(a.dateText).localeCompare(String(b.dateText)));
  return rows;
}
function renderTimeline(reset){
  if (!tlState.rows) tlState.rows = buildTimelineRows();
  if (reset){ tlState.rendered = 0; }
  const host = $('timelineHost');
  const q = normalize(tlState.query);
  let rows = tlState.rows;
  if (tlState.filter === 'person') rows = rows.filter(r => r.id === currentId);
  if (q) rows = rows.filter(r => normalize(r.name).includes(q) || normalize(r.type).includes(q) || normalize(r.place).includes(q) || normalize(r.dateText).includes(q));
  const PAGE = 250;
  const slice = rows.slice(0, Math.max(tlState.rendered, Math.min(PAGE, rows.length)));
  tlState.rendered = slice.length;
  let html = '';
  let lastDecade = null, lastYear = null;
  for (const r of slice){
    if (r.y === 9999){ if (lastYear !== 'unknown'){ html += '<div class="tlYear">Date not recorded or unreadable</div>'; lastYear = 'unknown'; } }
    else {
      const decade = Math.floor(r.y / 10) * 10 + 's';
      if (decade !== lastDecade){ html += '<div class="tlDecade">' + decade + '</div>'; lastDecade = decade; lastYear = null; }
      const year = Math.floor(r.y);
      if (year !== lastYear){ html += '<div class="tlYear">' + year + '</div>'; lastYear = year; }
    }
    html += '<div class="tlItem" tabindex="0" role="button" onclick="go(' + jsArg(r.id) + ')"><span class="tlDate">' + esc(r.dateText) + (r.uncertain ? ' <span class="uncertain">' + esc(r.uncertain) + '</span>' : '') + '</span><span><b>' + esc(r.type) + '</b>' + (r.privacy ? ' — private (living)' : ' — ' + esc(r.name)) + (r.place ? ' — ' + esc(r.place) : '') + (r.value ? ' — ' + esc(r.value) : '') + (r.fam ? ' <span class="tiny">(family ' + esc(r.fam) + ')</span>' : '') + '</span></div>';
  }
  if (!slice.length) html = '<div class="empty">No events match.</div>';
  if (rows.length > slice.length) html += '<div class="toolbar"><button onclick="tlState.rendered += 250; renderTimeline(false)">Show 250 more (' + fmt(rows.length - slice.length) + ' remaining)</button></div>';
  host.innerHTML = '<div class="toolbar"><label class="check"><input type="radio" name="tlFilter" ' + (tlState.filter === 'all' ? 'checked' : '') + ' onchange="tlState.filter=\\'all\\'; tlState.rendered=0; renderTimeline(true)"> Everyone</label>' +
    '<label class="check"><input type="radio" name="tlFilter" ' + (tlState.filter === 'person' ? 'checked' : '') + ' onchange="tlState.filter=\\'person\\'; tlState.rendered=0; renderTimeline(true)"> Only ' + esc(personName(currentId)) + '</label>' +
    '<input type="search" id="tlQuery" placeholder="Filter by name, event, place, date…" value="' + esc(tlState.query) + '" style="max-width:280px"></div>' +
    '<div class="tiny" style="margin-bottom:6px">Dates are shown exactly as recorded — uncertain qualifiers (ABT, BEF, BET … AND …) are preserved, never turned into exact dates.</div>' + html;
  const tlq = $('tlQuery');
  if (tlq){ tlq.addEventListener('input', debounce(() => { tlState.query = tlq.value; tlState.rendered = 0; renderTimeline(true); const el2 = $('tlQuery'); if (el2){ el2.focus(); } }, 250)); }
}
// ------------------------------------------------------------- places
const placesState = { query:'', open:null, rendered:50, built:false, list:null, mig:false };
function buildPlaces(){
  const map = new Map();
  const add = (placeRaw, ev) => {
    const place = String(placeRaw || '').trim();
    if (!place) return;
    const key = normalize(place);
    if (!key) return;
    let entry = map.get(key);
    if (!entry){ entry = { display:place, count:0, events:[], people:new Set() }; map.set(key, entry); }
    entry.count++;
    entry.events.push(ev);
    entry.people.add(ev.id);
    if (entry.display.length > place.length ? false : false) entry.display = place;
  };
  for (const p of Object.values(people)){
    if (p.birthPlace) add(p.birthPlace, { id:p.id, name:p.name, type:'Birth', date:p.birthDate, y:p.birthDateParsed ? (p.birthDateParsed.startYear || p.birthDateParsed.year) : 0, privacy:!!p.privacy });
    if (p.deathPlace) add(p.deathPlace, { id:p.id, name:p.name, type:'Death', date:p.deathDate, y:p.deathDateParsed ? (p.deathDateParsed.startYear || p.deathDateParsed.year) : 0, privacy:!!p.privacy });
    for (const e of (p.events || [])) if (e.place) add(e.place, { id:p.id, name:p.name, type:e.type, date:e.date, y:e.dateParsed ? (e.dateParsed.startYear || e.dateParsed.year) : 0, privacy:!!p.privacy });
    for (const fid of (p.fams || [])){
      const f = families[fid]; if (!f) continue;
      for (const e of (f.events || [])) if (e.place) add(e.place, { id:p.id, name:p.name, type:e.type, date:e.date, y:e.dateParsed ? (e.dateParsed.startYear || e.dateParsed.year) : 0, privacy:!!p.privacy });
    }
  }
  const list = [...map.values()].sort((a,b) => b.count - a.count || a.display.localeCompare(b.display));
  return list;
}
function renderPlaces(reset){
  if (!placesState.list) placesState.list = buildPlaces();
  if (reset) placesState.rendered = 50;
  const host = $('placesHost');
  const q = normalize(placesState.query);
  let rows = placesState.list;
  if (q) rows = rows.filter(r => normalize(r.display).includes(q));
  const slice = rows.slice(0, placesState.rendered);
  let html = '<div class="toolbar"><input type="search" id="plQuery" placeholder="Filter places…" value="' + esc(placesState.query) + '" style="max-width:300px">' +
    '<label class="check"><input type="checkbox" ' + (placesState.mig ? 'checked' : '') + ' onchange="placesState.mig=this.checked; renderPlaces(false)"> Migration view for ' + esc(personName(currentId)) + '</label></div>';
  if (placesState.mig){ html += migrationHtml(); }
  else {
    html += '<div class="tiny" style="margin-bottom:6px">Counts include every recorded event at each place. This view never invents map coordinates — the GED stores place names only.</div>';
    html += slice.map(r => '<div class="placeRow" tabindex="0" role="button" onclick="placesState.open=' + jsArg(normalize(r.display)) + '; renderPlaces(false)">' +
      '<span class="placeName">' + esc(r.display) + '</span><span class="badge info">' + fmt(r.count) + ' events</span><span class="badge">' + fmt(r.people.size) + ' people</span></div>').join('');
    if (placesState.open){
      const entry = placesState.list.find(r => normalize(r.display) === placesState.open);
      if (entry){
        const evs = entry.events.slice(0, 60);
        html += '<div class="section"><h2>' + esc(entry.display) + '</h2>' + evs.map(ev => '<div class="tlItem" tabindex="0" role="button" onclick="go(' + jsArg(ev.id) + ')"><span class="tlDate">' + esc(ev.date || '—') + '</span><span><b>' + esc(ev.type) + '</b> — ' + esc(ev.privacy ? 'private (living)' : ev.name) + '</span></div>').join('') + (entry.events.length > 60 ? '<div class="tiny">…and ' + fmt(entry.events.length - 60) + ' more events here</div>' : '') + '</div>';
      }
    }
    if (rows.length > slice.length) html += '<div class="toolbar"><button onclick="placesState.rendered += 100; renderPlaces(false)">Show 100 more places</button></div>';
  }
  host.innerHTML = html;
  const plq = $('plQuery');
  if (plq) plq.addEventListener('input', debounce(() => { placesState.query = plq.value; renderPlaces(true); const el = $('plQuery'); if (el) el.focus(); }, 250));
}
function migrationHtml(){
  const p = people[currentId];
  if (!p) return '<div class="empty">Select a person first.</div>';
  const steps = [];
  const pushStep = (place, date, dp, type, label) => {
    if (!place) return;
    const last = steps[steps.length - 1];
    if (last && normalize(last.place) === normalize(place) && !date) return;
    steps.push({ place, date, y: dp ? (dp.startYear || dp.year) : 0, uncertain: dateCertainty(dp), type, label });
  };
  pushStep(p.birthPlace, p.birthDate, p.birthDateParsed, 'Born', 'Birth');
  const dated = [];
  for (const e of (p.events || [])) if (e.place && e.tag !== 'CHANGE') dated.push(e);
  for (const fid of (p.fams || [])){ const f = families[fid]; if (f) for (const e of (f.events || [])) if (e.place) dated.push({ ...e, type:'Marriage (family ' + fid + ')' }); }
  dated.sort((a,b) => ((a.dateParsed ? (a.dateParsed.startYear || a.dateParsed.year) : 9999) - (b.dateParsed ? (b.dateParsed.startYear || b.dateParsed.year) : 9999)) || String(a.date).localeCompare(String(b.date)));
  for (const e of dated) pushStep(e.place, e.date, e.dateParsed, e.type, null);
  pushStep(p.deathPlace, p.deathDate, p.deathDateParsed, 'Died', 'Death');
  const uniqueSteps = [];
  const seen = new Set();
  for (const s of steps){ const k = normalize(s.place) + '|' + s.y; if (!seen.has(k) || s.type === 'Born' || s.type === 'Died'){ seen.add(k); uniqueSteps.push(s); } }
  let html = '<div class="section"><h2>Places in the life of ' + esc(p.name) + '</h2>';
  html += '<div class="tiny" style="margin-bottom:8px">Ordered by recorded dates. A migration map with real coordinates is not possible offline and without verified geography — this route keeps only what the GED actually says.</div>';
  if (!uniqueSteps.length) html += '<div class="empty">No recorded places for this person.</div>';
  else html += uniqueSteps.map((s, i) => '<div class="migStep"><div class="migDot">' + (i + 1) + '</div><div class="migDetail"><b>' + esc(s.type) + '</b>' + (s.date ? ' — ' + esc(s.date) : '') + (s.uncertain ? ' <span class="uncertain">' + esc(s.uncertain) + '</span>' : '') + '<br>' + esc(s.place) + '</div></div>').join('');
  return html + '</div>';
}
// ------------------------------------------------------------- gallery
let galleryList = null;
function buildGallery(){
  if (galleryList) return galleryList;
  galleryList = [];
  const pushFrom = (mediaRefs, owner) => {
    for (const m of (mediaRefs || [])) for (const f of (m.files || [])) if (f.key && MEDIA[f.key]) galleryList.push({ key:f.key, title:f.title || m.title || MEDIA[f.key].title, owner });
  };
  for (const p of Object.values(people)){
    pushFrom(p.media, p);
    for (const e of (p.events || [])) pushFrom(e.media, p);
    for (const fid of (p.fams || [])){ const f = families[fid]; if (f) pushFrom(f.media, p); }
  }
  for (const f of Object.values(families)) pushFrom(f.media, null);
  return galleryList;
}
function renderGallery(){
  const host = $('galleryHost');
  const list = buildGallery();
  if (!list.length){ host.innerHTML = '<div class="empty">No media is embedded in this file. Import photos and documents in Grandmothers voice by Kayock and regenerate the explorer.</div>'; return; }
  const byOwner = {};
  for (const g of list){ (byOwner[g.owner ? g.owner.id : ''] ||= []).push(g); }
  const order = [...new Set(list.map(g => g.owner))];
  host.innerHTML = order.map(owner => {
    const items = byOwner[owner ? owner.id : ''];
    if (!items || !items.length) return '';
    return '<div class="section"><h2>' + (owner ? esc(owner.privacy ? 'Private (living)' : owner.name) : 'Family media') + '</h2><div class="galleryGrid">' + items.map(g => mediaFigureHtml({ title:g.title }, { key:g.key, title:g.title, file:'' })).join('') + '</div></div>';
  }).join('');
}
function openLightbox(key){
  const a = MEDIA[key]; if (!a) return;
  $('lightboxTitle').textContent = a.title || a.name || 'Media';
  let inner = '';
  if (a.kind === 'image') inner = '<img src="' + esc(a.dataUri || a.src || '') + '" alt="' + esc(a.title || '') + '" style="max-width:100%;max-height:62vh">';
  else if (a.kind === 'video') inner = '<video controls style="max-width:100%;max-height:62vh" src="' + esc(a.dataUri || a.src || '') + '"></video>';
  else if (a.kind === 'audio') inner = '<audio controls src="' + esc(a.dataUri || a.src || '') + '"></audio>';
  else if (a.kind === 'pdf') inner = '<iframe src="' + esc(a.dataUri || a.src || '') + '" style="width:100%;height:62vh;border:0;background:#fff"></iframe>';
  else inner = '<div class="noteBox">Preview not supported for this type (' + esc(a.kind) + '). Use the download button.</div>';
  const src = a.dataUri || a.src || '';
  inner += '<div class="toolbar" style="justify-content:center"><a class="btn" download="' + esc(a.name || 'media') + '" href="' + esc(src) + '">Download original</a></div>';
  $('lightboxBody').innerHTML = inner;
  $('lightbox').classList.add('show');
}
`;
