const EXPLORE_JS_A = `
'use strict';
const DATA = JSON.parse(document.getElementById('tree-data').textContent);
const people = DATA.people, families = DATA.families, MEDIA = DATA.media || {}, meta = DATA.meta;
const INCLUDE_NOTEBOOK = !!meta.includeNotebook;
const NOTE_FLAGS = ${JSON.stringify(NOTE_FLAGS)};
const notebookKey = 'kayockNotebook2:' + meta.treeId;
const historyStack = [];
let currentId = meta.spotlightId || Object.keys(people)[0] || '';
let notebook = loadNotebook();
let authorName = localStorage.getItem('kayockAuthor') || '';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const jsArg = s => JSON.stringify(String(s)).replace(/"/g,'&quot;');
${normalize}
${safeInt}
${unique}
${debounce}
${noteFingerprint}
${normalizeRefineBackup}
${mergeRefineBackups}
${resolveConflict}
${findDuplicateSuggestions}
function fmt(n){ return Number(n||0).toLocaleString(); }
function personName(id){ const p = people[id]; return p ? p.name : (id || 'Unknown'); }
function vital(p){ const bits = []; if (p.birthDate || p.birthPlace) bits.push('Born ' + [p.birthDate, p.birthPlace].filter(Boolean).join(' — ')); if (p.deathDate || p.deathPlace) bits.push('Died ' + [p.deathDate, p.deathPlace].filter(Boolean).join(' — ')); return bits.join(' • '); }
function dateCertainty(d){ return d && d.modifier !== 'exact' && d.modifier !== 'unknown' ? d.modifier : null; }
function uncertaintyBadge(e){ const c = dateCertainty(e.dateParsed); return c ? '<span class="uncertain">' + esc(c) + '</span>' : ''; }
function toast(msg){ const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2200); }
function loadNotebook(){ try { return JSON.parse(localStorage.getItem(notebookKey) || '{}') || {}; } catch(e) { return {}; } }
function saveNotebook(silent){ try { localStorage.setItem(notebookKey, JSON.stringify(notebook)); if (!silent) toast('Saved'); const el = $('autosaveState'); if (el) el.textContent = 'Saved ' + new Date().toLocaleTimeString(); } catch(e) { toast('Could not save: storage full or blocked'); } }
const autoSave = debounce(() => saveNotebook(true), 900);
function go(id, push){ if (!people[id]) return; if (push !== false && currentId && currentId !== id) historyStack.push(currentId); currentId = id; renderAll(); window.scrollTo({ top:0, behavior:'smooth' }); }
function relations(id){
  const p = people[id]; if (!p) return { parents:[], siblings:[], spouses:[], children:[], famc:[], fams:[] };
  const famc = (p.famc||[]).map(fid => families[fid]).filter(Boolean);
  const fams = (p.fams||[]).map(fid => families[fid]).filter(Boolean);
  return {
    parents: unique(famc.flatMap(f => [f.husband, f.wife]).filter(x => x && x !== id)),
    siblings: unique(famc.flatMap(f => f.children || []).filter(x => x && x !== id)),
    spouses: unique(fams.flatMap(f => [f.husband, f.wife]).filter(x => x && x !== id)),
    children: unique(fams.flatMap(f => f.children || [])),
    famc, fams
  };
}
function personButton(id){ return people[id] ? '<button onclick="go(' + jsArg(id) + ')">' + esc(personName(id)) + '</button>' : ''; }
function relBox(title, ids){ return '<div class="relBox"><h3>' + esc(title) + '</h3>' + (ids.length ? ids.map(personButton).join(' ') : '<div class="empty">None listed</div>') + '</div>'; }
function notesHtml(title, notes){ if (!notes || !notes.length) return ''; return '<div class="section"><h2>' + esc(title) + '</h2>' + notes.map(n => '<div class="noteBox">' + esc(n) + '</div>').join('') + '</div>'; }
function sourcesHtml(sources){ if (!sources || !sources.length) return ''; return '<div class="section"><h2>Sources and citations</h2>' + sources.map(s => '<div class="event srcB"><b>' + esc(s.title || s.ref || 'Source') + '</b>' + (s.page ? '<div>Page: ' + esc(s.page) + '</div>' : '') + (s.quay !== null && s.quay !== undefined ? '<div>Evidence quality: ' + ['','weak','circumstantial','secondary','direct'][s.quay] + '</div>' : '') + (s.text ? '<div class="noteBox">' + esc(s.text) + '</div>' : '') + (s.note ? '<div class="noteBox">' + esc(s.note) + '</div>' : '') + '</div>').join('') + '</div>'; }
function mediaFigureHtml(m, f){
  const title = esc(f.title || m.title || (f.file ? f.file.split('/').pop() : 'Media'));
  if (!f.key || !MEDIA[f.key]){
    return '<figure class="galItem"><div class="mediaPlaceholder">📄</div><figcaption>' + title + (f.file ? '<div class="tiny">file not provided: ' + esc(f.file) + '</div>' : '') + '</figcaption></figure>';
  }
  const a = MEDIA[f.key];
  const badge = a.kind === 'image' ? '' : '<span class="badge info">' + esc(a.kind) + '</span> ';
  return '<figure class="galItem" tabindex="0" role="button" aria-label="Open ' + title + '" onclick="openLightbox(' + jsArg(f.key) + ')" data-open="1">' +
    (a.kind === 'image' ? '<img src="' + esc(a.dataUri || a.src || '') + '" alt="' + title + '" loading="lazy">' : '<div class="mediaPlaceholder">' + ({ pdf:'📕', audio:'🎵', video:'🎬', text:'📄' }[a.kind] || '📦') + '</div>') +
    '<figcaption>' + badge + title + '</figcaption></figure>';
}
function mediaHtmlForRefs(mediaRefs){
  if (!mediaRefs || !mediaRefs.length) return '';
  const items = [];
  for (const m of mediaRefs){
    for (const f of (m.files || [])) items.push(mediaFigureHtml(m, f));
    if ((!m.files || !m.files.length) && (m.title || m.ref)) items.push('<figure class="galItem"><div class="mediaPlaceholder">📄</div><figcaption>' + esc(m.title || m.ref) + (m.note ? '<div class="tiny">' + esc(m.note) + '</div>' : '') + '</figcaption></figure>');
  }
  if (!items.length) return '';
  return '<div class="galleryGrid">' + items.join('') + '</div>';
}
function mediaSection(title, mediaRefs){
  const g = mediaHtmlForRefs(mediaRefs);
  if (!g) return '';
  return '<div class="section"><h2>' + esc(title) + '</h2>' + g + '</div>';
}
function eventsHtml(p){
  const events = (p.events || []).filter(e => e.tag !== 'CHANGE' && (e.type || e.date || e.place || e.value));
  if (!events.length) return '';
  const rows = events.map(e => '<div class="event"><b>' + esc(e.type || 'Event') + '</b>' + uncertaintyBadge(e) +
    (e.date ? '<div class="evDate">' + esc(e.date) + '</div>' : '') +
    (e.place ? '<div>Place: ' + esc(e.place) + '</div>' : '') +
    (e.address ? '<div>Address: ' + esc(e.address) + '</div>' : '') +
    (e.value && !['Y','Yes'].includes(e.value) ? '<div>' + esc(e.value) + '</div>' : '') +
    (e.notes && e.notes.length ? e.notes.map(n => '<div class="noteBox">' + esc(n) + '</div>').join('') : '') +
    ((e.sources && e.sources.length) ? '<div class="tiny" style="margin-top:5px">' + e.sources.map(s => '⭐ ' + esc([s.title || s.ref, s.page].filter(Boolean).join(' — ')) + (s.quay !== null && s.quay !== undefined ? ' (evidence: ' + ['','weak','circumstantial','secondary','direct'][s.quay] + ')' : '')).join('<br>') + '</div>' : '') +
    ((e.notes && e.notes.length) || (e.sources && e.sources.length) ? '' : '') +
    mediaHtmlForRefs(e.media) +
    '</div>').join('');
  return '<div class="section"><h2>Life events</h2>' + rows + '</div>';
}
function familyRecordsHtml(rels){
  let out = '';
  for (const f of [...rels.famc, ...rels.fams]){
    if (!f) continue;
    const hasContent = (f.notes && f.notes.length) || (f.sources && f.sources.length) || (f.media && f.media.length) || f.marriageDate || f.marriagePlace;
    if (!hasContent) continue;
    const label = 'Family ' + f.id + (f.marriageDate || f.marriagePlace ? ' • Married ' + [f.marriageDate, f.marriagePlace].filter(Boolean).join(' — ') : '');
    out += '<div class="section"><h3 style="margin:0 0 8px">' + esc(label) + '</h3>';
    if (f.notes) out += f.notes.map(n => '<div class="noteBox">' + esc(n) + '</div>').join('');
    if (f.sources) out += '<div class="tiny">' + f.sources.map(s => '⭐ ' + esc([s.title || s.ref, s.page].filter(Boolean).join(' — '))).join('<br>') + '</div>';
    out += mediaHtmlForRefs(f.media);
    out += '</div>';
  }
  return out ? '<div class="section"><h2>Family records</h2>' + out + '</div>' : '';
}
`;
