
const EXPLORE_JS_B = `
function notebookSection(id){
  if (!INCLUDE_NOTEBOOK) return '';
  const n = notebook[id] || {};
  const authorField = '<label class="check" style="margin-left:0"><span>Your name: </span><input type="text" id="authorName" value="' + esc(authorName) + '" placeholder="e.g. June Martinez" style="max-width:220px" onchange="saveAuthor(this.value)"></label>';
  return '<div class="section"><h2>Tree Refinement Mode</h2>' +
    '<div class="tiny" id="autosaveState">Autosaves quietly as you type. Notes live in this browser on this device — export backups to share or move them.</div>' + authorField +
    '<div class="toolbar">' +
    '<label class="check"><input id="flagCorrection" type="checkbox" ' + (n.flags && n.flags.correction ? 'checked' : '') + '> Correction needed</label>' +
    '<label class="check"><input id="flagDuplicate" type="checkbox" ' + (n.flags && n.flags.duplicate ? 'checked' : '') + '> Possible duplicate</label>' +
    '<label class="check"><input id="flagSource" type="checkbox" ' + (n.flags && n.flags.source ? 'checked' : '') + '> Needs source/proof</label>' +
    '<label class="check"><input id="flagPhoto" type="checkbox" ' + (n.flags && n.flags.photo ? 'checked' : '') + '> Photo/document to find</label>' +
    '</div>' +
    '<h3 style="margin:10px 0 6px;font-size:15px">Memory or family story</h3><textarea id="memoryNote" placeholder="Family memory, story, or detail for this person...">' + esc(n.memory || '') + '</textarea>' +
    '<h3 style="margin:10px 0 6px;font-size:15px">Corrections, questions, and research notes</h3><textarea id="researchNote" placeholder="Wrong date? Missing spouse? Relationship question? Source to verify?">' + esc(n.research || '') + '</textarea>' +
    (n.author ? '<div class="tiny">Last saved by ' + esc(n.author) + (n.updated ? ' on ' + esc(String(n.updated).slice(0,10)) : '') + '</div>' : '') +
    '<div class="toolbar"><button class="primary" onclick="saveCurrentNotebook(false)">Save note</button>' +
    '<button onclick="exportNotebookJson()">Export JSON backup</button>' +
    '<button onclick="importNotebookPrompt()">Import backup…</button>' +
    '<button onclick="exportNotebookMarkdown()">Export corrections report</button>' +
    '<button onclick="runDupCheck()">Check duplicate suggestions</button></div>' +
    '<div id="dupPanel"></div>' +
    '<input type="file" id="notebookImportInput" accept=".json,application/json" multiple style="display:none">' +
    '</div>';
}
function saveAuthor(v){ authorName = v.trim(); localStorage.setItem('kayockAuthor', authorName); }
function saveCurrentNotebook(silent){
  if (!currentId) return;
  const prev = notebook[currentId] || { created:new Date().toISOString() };
  notebook[currentId] = {
    name: personName(currentId),
    memory: $('memoryNote') ? $('memoryNote').value : '',
    research: $('researchNote') ? $('researchNote').value : '',
    flags: { correction: $('flagCorrection') ? $('flagCorrection').checked : false, duplicate: $('flagDuplicate') ? $('flagDuplicate').checked : false, source: $('flagSource') ? $('flagSource').checked : false, photo: $('flagPhoto') ? $('flagPhoto').checked : false },
    author: authorName || '(unnamed family member)',
    created: prev.created || new Date().toISOString(),
    updated: new Date().toISOString(),
    history: (prev.history || []).slice(-15).concat([{ ts:new Date().toISOString(), author: authorName || '(unnamed family member)', action:'edited in explorer' }])
  };
  saveNotebook(silent === true);
}
function autoWireNotebook(){
  const nbImport2 = $('notebookImportInput');
  if (nbImport2 && !nbImport2.dataset.wired){ nbImport2.dataset.wired = '1'; nbImport2.addEventListener('change', handleNotebookImport); }
  for (const id of ['memoryNote','researchNote','flagCorrection','flagDuplicate','flagSource','flagPhoto']){
    const el = $(id); if (!el) continue;
    el.addEventListener('change', () => saveCurrentNotebook(true));
    if (el.tagName === 'TEXTAREA') el.addEventListener('input', () => { saveCurrentNotebook(true); });
  }
}
function treeMetaJson(){
  return { treeId: meta.treeId, title: meta.title, fileName: meta.fileName, gedHash: meta.gedHash, peopleCount: meta.peopleCount, familyCount: meta.familyCount, spec: meta.spec, vers: meta.vers, appVersion: meta.version };
}
function exportNotebookJson(){
  const out = JSON.stringify({ version:2, exported:new Date().toISOString(), author: authorName || '(unnamed family member)', tree:treeMetaJson(), privacyMode: meta.privacyMode || 'full', notes:notebook }, null, 2);
  dl((meta.title || 'family_tree').replace(/[^a-z0-9]+/gi,'_') + '_refinement_backup.json', out, 'application/json;charset=utf-8');
}
function importNotebookPrompt(){ $('notebookImportInput').click(); }
function handleNotebookImport(ev){
  const files = [...ev.target.files]; if (!files.length) return;
  const pending = [];
  let done = 0;
  for (const f of files){
    const reader = new FileReader();
    reader.onload = () => {
      const res = normalizeRefineBackup(String(reader.result || ''));
      done++;
      if (!res.ok){ toast('Backup ' + f.name + ' could not be read: ' + res.error); return; }
      res.backup.sourceFile = f.name;
      pending.push(res.backup);
      if (done === files.length) reviewImport(pending);
    };
    reader.onerror = () => { done++; toast('Could not read ' + f.name); };
    reader.readAsText(f);
  }
  ev.target.value = '';
}
function reviewImport(backups){
  const me = treeMetaJson();
  const foreign = backups.filter(b => b.tree && b.tree.treeId && b.tree.treeId !== me.treeId);
  const same = backups.filter(b => !b.tree || !b.tree.treeId || b.tree.treeId === me.treeId);
  const conflicts = [];
  const all = { ...notebook };
  const preMerged = {};
  for (const [id, n] of Object.entries(all)) preMerged[id] = { ...n, flags:{ ...n.flags }, history:[...(n.history||[])] };
  const preview = mergeRefineBackups(preMerged, same);
  const body = $('modalBody'); const modal = $('notebookModal');
  $('modalTitle').textContent = 'Review import (' + backups.length + ' backup' + (backups.length === 1 ? '' : 's') + ')';
  let html = '';
  if (same.length) html += '<p>From matching trees: ' + same.length + ' backup(s) — ' + preview.added.length + ' new note(s), ' + preview.identical.length + ' identical, <b>' + preview.conflicts.length + ' conflict(s)</b> to review.</p>';
  for (const c of preview.conflicts){
    html += '<div class="conflictCard"><b>' + esc(c.name || c.id) + '</b> <span class="tiny">(GED ' + esc(c.id) + ', from ' + esc(c.source) + ')</span>' +
      '<div class="twoCol" style="margin-top:8px"><div><div class="tiny">Current note' + (c.local.author ? ' by ' + esc(c.local.author) : '') + '</div><div class="noteBox">' + esc((c.local.memory || '(no memory)') + '\\n---\\n' + (c.local.research || '(no research)')) + '</div></div>' +
      '<div><div class="tiny">Imported note' + (c.remote.author ? ' by ' + esc(c.remote.author) : '') + '</div><div class="noteBox">' + esc((c.remote.memory || '(no memory)') + '\\n---\\n' + (c.remote.research || '(no research)')) + '</div></div></div>' +
      '<label class="check"><input type="radio" name="cf_' + esc(c.id) + '" value="local" checked> Keep current</label>' +
      '<label class="check"><input type="radio" name="cf_' + esc(c.id) + '" value="remote"> Use imported</label>' +
      '<label class="check"><input type="radio" name="cf_' + esc(c.id) + '" value="both"> Keep both (with attribution)</label>' +
      '</div>';
    conflicts.push(c);
  }
  if (foreign.length){
    html += '<div class="privNote warn"><b>Tree identity mismatch.</b> ' + foreign.length + ' backup(s) were exported from a different GED file:<br>' +
      foreign.map(b => '• ' + esc(b.sourceFile || '') + ' — tree ' + esc(b.tree && b.tree.treeId) + ' (' + esc(b.tree && b.tree.title) + '), vs this tree ' + esc(me.treeId)).join('<br>') +
      '<br>Importing anyway may attach notes to unrelated people. <label class="check"><input type="checkbox" id="forceForeign"> Import these anyway (I checked the identities)</label></div>';
    for (const b of foreign){ preview.added.push({ id:'(foreign)', name:b.sourceFile, source:'different tree' }); }
  }
  html += '<div class="toolbar"><button class="primary" id="applyImportBtn">Apply import</button><button id="cancelImportBtn">Cancel</button></div>';
  body.innerHTML = html;
  modal.classList.add('show');
  $('applyImportBtn').onclick = () => {
    const choices = {};
    for (const c of conflicts){
      const sel = document.querySelector('input[name="cf_' + c.id + '"]:checked');
      choices[c.id] = sel ? sel.value : 'local';
    }
    const result = mergeRefineBackups(preMerged, same);
    const finalNotes = result.merged; // includes newly added notes
    for (const c of result.conflicts){ finalNotes[c.id] = resolveConflict(choices[c.id] || 'local', c.local, c.remote); }
    const forceForeign = $('forceForeign') && $('forceForeign').checked;
    let foreignAdded = 0, foreignSkipped = 0;
    if (forceForeign){
      for (const b of foreign){
        for (const [id, n] of Object.entries(b.notes)){
          if (!preMerged[id]){ preMerged[id] = { ...n, flags:{ ...n.flags }, history:[...(n.history||[]), { ts:new Date().toISOString(), author:'import', action:'imported from different tree ' + (b.tree && b.tree.treeId) }] }; foreignAdded++; }
          else foreignSkipped++;
        }
      }
    } else { foreignSkipped = foreign.reduce((a,b) => a + Object.keys(b.notes).length, 0); }
    notebook = finalNotes;
    saveNotebook(true);
    modal.classList.remove('show');
    toast('Import applied: ' + result.added.length + ' added, ' + foreignAdded + ' added from foreign trees, ' + result.conflicts.length + ' conflicts resolved, ' + foreignSkipped + ' skipped.');
    renderAll();
  };
  $('cancelImportBtn').onclick = () => modal.classList.remove('show');
}
function exportNotebookMarkdown(){
  let md = '# ' + meta.title + ' - Tree Corrections Report\\n\\nExported: ' + new Date().toLocaleString() + '\\nTree identity: ' + meta.treeId + '\\n\\n';
  let count = 0;
  for (const [id, n] of Object.entries(notebook)){
    if (!n) continue;
    const has = (n.memory || n.research || (n.flags && (n.flags.correction || n.flags.duplicate || n.flags.source || n.flags.photo)));
    if (!has) continue;
    count++;
    md += '## ' + (n.name || personName(id)) + ' (' + id + ')\\n\\n';
    if (n.author) md += 'Noted by: ' + n.author + (n.updated ? ' — updated ' + String(n.updated).slice(0,10) : '') + '\\n\\n';
    const flags = [];
    if (n.flags) { if (n.flags.correction) flags.push('Correction needed'); if (n.flags.duplicate) flags.push('Possible duplicate'); if (n.flags.source) flags.push('Needs source/proof'); if (n.flags.photo) flags.push('Photo/document to find'); }
    if (flags.length) md += 'Flags: ' + flags.join(', ') + '\\n\\n';
    if (n.memory) md += '### Memory / family story\\n' + n.memory + '\\n\\n';
    if (n.research) md += '### Corrections / research notes\\n' + n.research + '\\n\\n';
    md += '---\\n\\n';
  }
  if (!count) md += 'No correction notes have been entered yet.\\n';
  dl((meta.title || 'family_tree').replace(/[^a-z0-9]+/gi,'_') + '_corrections_report.md', md, 'text/markdown;charset=utf-8');
}
function runDupCheck(){
  const panel = $('dupPanel');
  if (!panel) return;
  const list = findDuplicateSuggestions({ people, families }).filter(d => d.ids.includes(currentId));
  if (!list.length){ panel.innerHTML = '<div class="tiny">No duplicate suggestions found for ' + esc(personName(currentId)) + '.</div>'; return; }
  panel.innerHTML = '<h3 style="margin:12px 0 6px;font-size:15px">Possible duplicates involving this person</h3>' + list.map(d =>
    '<div class="conflictCard"><b>' + esc(d.nameA) + '</b> (' + esc(d.idA) + ') ↔ <b>' + esc(d.nameB) + '</b> (' + esc(d.idB) + ') — score ' + d.score + ' <span class="badge ' + (d.confidence === 'high' ? 'err' : d.confidence === 'medium' ? 'warn' : 'info') + '">' + d.confidence + ' confidence</span>' +
    '<div class="tiny" style="margin-top:4px">' + d.evidence.map(e => '• ' + esc(e.k + ': ' + e.detail)).join('<br>') + '</div>' +
    '<div class="toolbar"><button onclick="flagDupPair(' + jsArg(d.idA) + ',' + jsArg(d.idB) + ')">Flag both as “possible duplicate”</button><button onclick="go(' + jsArg(d.idB) + ')">Open other person</button></div></div>'
  ).join('');
}
function flagDupPair(a, b){
  for (const id of [a, b]){
    const prev = notebook[id] || { name:personName(id), created:new Date().toISOString() };
    notebook[id] = { ...prev, name:personName(id), flags:{ correction:false, duplicate:true, source:false, photo:false, ...(prev.flags || {}) }, author: authorName || '(unnamed family member)', updated:new Date().toISOString(), history:(prev.history || []).concat([{ ts:new Date().toISOString(), author:authorName || 'dup check', action:'flagged possible duplicate with ' + (id === a ? b : a) }]) };
  }
  saveNotebook(false);
  renderAll();
}
function dl(name, text, mime){ const blob = new Blob([text], { type:mime }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000); }

// ------------------------------------------------------------- search
let searchResults = [], searchHl = -1;
function doSearch(){
  const q = normalize($('search').value);
  const list = Object.values(people);
  let matches;
  if (q) matches = list.filter(p => normalize(p.name).includes(q) || normalize(p.id).includes(q) || normalize(p.surname).includes(q));
  else matches = list;
  searchResults = matches.slice(0, 400);
  const total = matches.length;
  let html = searchResults.slice(0, 80).map(p => resultHtml(p)).join('');
  if (total > 80) html += '<div class="tiny" style="padding:8px">Showing 80 of ' + fmt(total) + ' — keep typing to narrow.</div>';
  if (!total) html = '<div class="empty" style="padding:10px">No matches</div>';
  $('results').innerHTML = html;
  searchHl = -1;
}
function resultHtml(p){
  const bits = [];
  if (p.birthDate) bits.push('b. ' + p.birthDate);
  if (p.deathDate) bits.push('d. ' + p.deathDate);
  if (p.privacy) bits.push('private');
  return '<div class="result" role="option" tabindex="-1" data-id="' + esc(p.id) + '" onclick="go(' + jsArg(p.id) + ')"><b>' + esc(p.name) + '</b><div class="muted tiny">' + esc(bits.join(' · ') || p.id) + '</div></div>';
}
function searchKey(e){
  const res = [...document.querySelectorAll('#results .result')];
  if (!res.length) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp'){
    e.preventDefault();
    searchHl = e.key === 'ArrowDown' ? Math.min(searchHl + 1, res.length - 1) : Math.max(searchHl - 1, 0);
    res.forEach((el, i) => el.classList.toggle('hl', i === searchHl));
    if (res[searchHl]) res[searchHl].scrollIntoView({ block:'nearest' });
  } else if (e.key === 'Enter' && searchHl >= 0 && res[searchHl]){
    go(res[searchHl].getAttribute('data-id'));
  }
}
`;
