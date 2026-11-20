
// ------------------------------------------------------- privacy pipeline
function getPrivacyOpts(){
  return { mode:$('privacyMode').value, threshold:safeInt($('privacyLivingAge').value, 100), strictNoDates:$('privacyStrictNoDates').checked };
}
function getExportData(){
  if (!parsedData) return null;
  const p = getPrivacyOpts();
  const key = JSON.stringify([p.mode, p.threshold, p.strictNoDates, parsedData.meta.treeId, $('profileFamily').checked, $('includePersonNotes').checked, $('includeFamilyNotes').checked, $('includeSourceNotes').checked, $('includeMedia').checked]);
  if (privacyData && privacyKey === key) return privacyData;
  // v2.1.0: the entire transformation now happens in the pure core
  // buildExportData() — independent copies, no mutation of parsedData,
  // auxiliary collections filtered to permitted records (repairs 1-3).
  const out = buildExportData(parsedData, {
    privacyMode:p.mode,
    threshold:p.threshold,
    strictNoDates:p.strictNoDates,
    includePersonNotes:$('includePersonNotes').checked,
    includeFamilyNotes:$('includeFamilyNotes').checked,
    includeSourceNotes:$('includeSourceNotes').checked,
    includeMedia:$('includeMedia').checked
  });
  const data = { ...parsedData,
    people:out.people,
    families:out.families,
    noteRecords:out.noteRecords,
    sourceRecords:out.sourceRecords,
    repoRecords:out.repoRecords,
    mediaRecords:out.mediaRecords,
    diagnostics:out.diagnostics,
    stats:out.stats,
    quality:out.quality };
  data.meta = { ...parsedData.meta, privacyMode:p.mode, privacyRedacted:out.redacted, privacyExcluded:out.excluded, privacyOmittedDiagnostics:out.omittedDiagnostics };
  privacyData = data; privacyKey = key;
  return data;
}
function profileIsFamily(){ return $('profileFamily').checked; }

// ----------------------------------------------------------- media session
$('mediaFolderBtn').addEventListener('click', () => $('mediaFolderInput').click());
$('mediaFilesBtn').addEventListener('click', () => $('mediaFilesInput').click());
$('mediaFolderInput').addEventListener('change', e => { addMediaFiles([...e.target.files], true); e.target.value = ''; });
$('mediaFilesInput').addEventListener('change', e => { addMediaFiles([...e.target.files], false); e.target.value = ''; });
$('mediaClearBtn').addEventListener('click', () => { mediaSession.files = []; mediaPlan = { dests:[], byRef:new Map(), unmatched:[], urlRefs:[], embedded:false }; renderMediaTable(); log('Imported media cleared.'); });
$('mediaLinkBtn').addEventListener('click', () => {
  const unmatched = currentUnmatchedRefs();
  if (!unmatched.length){ toast('No unmatched media references — everything is matched already.'); return; }
  pickTargetRef = unmatched[0];
  $('mediaFilesInput').multiple = false;
  $('mediaFilesInput').click();
  setTimeout(() => { $('mediaFilesInput').multiple = true; }, 500);
});
let pickTargetRef = null;
function addMediaFiles(files, asFolder){
  let added = 0;
  for (const f of files){
    const rel = f.webkitRelativePath || f.name;
    if (pickTargetRef){ // manual link mode: single file for a chosen ref
      mediaSession.files.push({ key:'mf' + mediaSession.files.length, name:f.name, relPath:rel, size:f.size, type:f.type, file:f });
      added++;
      pickTargetRef = null;
      continue;
    }
    if (!isProbablyMedia(f.name)){ continue; }
    mediaSession.files.push({ key:'mf' + mediaSession.files.length, name:f.name, relPath:rel, size:f.size, type:f.type, file:f });
    added++;
  }
  if (added) { log('Imported ' + added + ' media file(s)' + (asFolder ? ' from folder' : '') + '. Total in library: ' + mediaSession.files.length + '.'); renderMediaTable(); }
  else toast('No media files found in that selection.');
}
function isProbablyMedia(name){
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg|avif|heic|tif|tiff|pdf|mp3|wav|ogg|m4a|oga|opus|flac|aac|mp4|webm|mov|m4v|ogv|avi|mkv|txt|md|csv|htm|html)$/i.test(name || '');
}
function currentUnmatchedRefs(){
  const data = getExportData();
  if (!data) return [];
  const match = matchMediaFiles(data, mediaSession.files);
  return match.unmatched;
}
function buildMediaPlanData(data, needUris, needBytes, onProgress){
  // returns plan with dests[], byRef Map(fileStr -> {assetKey, dest, dataUri?})
  const match = matchMediaFiles(data, mediaSession.files);
  const dests = [];
  const byRef = new Map();
  const usedNames = new Set();
  let i = 0;
  const matchedEntries = [...match.byRef.entries()];
  const dedupeAsset = new Map(); // assetKey -> dest entry (a file matched by multiple refs shares one copy)
  for (const [fileStr, hit] of matchedEntries){
    const imp = hit.asset;
    if (!dedupeAsset.has(imp.key)){
      const kind = mediaKind(imp.form || imp.name || fileStr);
      const ext = (imp.name.split('.').pop() || '').toLowerCase();
      const safeBase = (baseNameOf(imp.name).replace(/\.[^.]+$/,'').replace(/[^a-z0-9_ -]+/gi,'').trim().replace(/\s+/g,'_') || 'media').slice(0, 60);
      let dest = safeBase + (ext ? '.' + ext : '');
      dest = zipSanitizeName('media/' + dest, usedNames).replace(/^media\//,'');
      dedupeAsset.set(imp.key, { key:imp.key, name:imp.name, dest, kind, mime:mimeFor(imp.name, imp.form), size:imp.size, file:imp.file, bytes:imp.bytes || null, refs:[] });
    }
    const entry = dedupeAsset.get(imp.key);
    entry.refs.push(fileStr);
    byRef.set(fileStr, { assetKey:entry.key, dest:entry.dest, tier:hit.tier, asset:entry });
  }
  dests.push(...dedupeAsset.values());
  return { dests, byRef, unmatched:match.unmatched, urlRefs:match.urlRefs, matchedCount:match.matched, embedded:needUris };
}
async function prepareMediaUris(data, downscale){
  // lazily read bytes and build data URIs (chunked, with progress)
  const plan = buildMediaPlanData(data, true, false);
  const total = plan.dests.length;
  let done = 0;
  for (const d of plan.dests){
    let bytes = d.bytes;
    if (!bytes && d.file) bytes = new Uint8Array(await d.file.arrayBuffer());
    if (!bytes){ done++; continue; }
    d.bytes = bytes;
    let finalBytes = bytes;
    let mime = d.mime;
    if (downscale && d.kind === 'image' && !/svg/i.test(d.name) && bytes.length > 250000){
      try {
        const smaller = await downscaleImage(bytes, mime, 1400, 0.82);
        if (smaller && smaller.bytes.length < bytes.length){ finalBytes = smaller.bytes; mime = smaller.mime; d.downscaled = true; }
      } catch(e) { /* keep original */ }
    }
    d.dataUri = 'data:' + mime + ';base64,' + bytesToBase64(finalBytes);
    d.size = finalBytes.length;
    done++;
    setProgress('export', 'Preparing media ' + done + '/' + total + ' — ' + d.name, done / Math.max(1, total));
    await nextTick();
  }
  plan.embedded = true;
  return plan;
}
function bytesToBase64(bytes){
  let binary = '';
  const CH = 32768;
  for (let i = 0; i < bytes.length; i += CH){
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  }
  return btoa(binary);
}
function downscaleImage(bytes, mime, maxDim, quality){
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([bytes], { type:mime }));
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
        if (scale >= 1 && bytes.length < 400000){ URL.revokeObjectURL(url); resolve(null); return; }
        const w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        c.toBlob(b => {
          URL.revokeObjectURL(url);
          if (b) b.arrayBuffer().then(ab => resolve({ bytes:new Uint8Array(ab), mime:'image/jpeg' })).catch(reject);
          else resolve(null);
        }, 'image/jpeg', quality);
      } catch(err){ URL.revokeObjectURL(url); reject(err); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image decode failed')); };
    img.src = url;
  });
}
function renderMediaTable(){
  const body = $('mediaTableBody');
  const statsEl = $('mediaStats');
  if (!parsedData){
    body.innerHTML = '<tr><td colspan="6">Parse a GED file first.</td></tr>';
    statsEl.textContent = 'No media imported yet.';
    $('galleryPreview').innerHTML = '';
    return;
  }
  const data = getExportData();
  const match = matchMediaFiles(data, mediaSession.files);
  const totalBytes = mediaSession.files.reduce((a, f) => a + (f.size || 0), 0);
  statsEl.innerHTML = 'Library: <b>' + fmt(mediaSession.files.length) + '</b> file(s), ' + fmt(Math.round(totalBytes / 1024)) + ' KB · matched references: <b>' + fmt(match.matched) + '</b> · unmatched GED references: <b>' + fmt(match.unmatched.length) + '</b> · external URL references kept as links: ' + fmt(match.urlRefs.length);
  const rows = [];
  const usedBy = {}; // fileStr -> [owners]
  const noteOwners = (ownerId, refs) => { for (const m of (refs||[])) for (const f of (m.files||[])) (usedBy[f.file] ||= []).push(ownerId); };
  for (const p of Object.values(data.people)){ noteOwners(p.id, p.media); for (const e of p.events) noteOwners(p.id, e.media); }
  for (const f of Object.values(data.families)){ noteOwners(f.id, f.media); for (const e of f.events) noteOwners(f.id, e.media); }
  const refRows = new Map();
  for (const [fileStr, hit] of match.byRef) refRows.set(fileStr, { status:'match' + hit.tier, file:fileStr, hit });
  for (const u of match.unmatched) refRows.set(u.file, { status:'none', file:u.file });
  for (const u of match.urlRefs) refRows.set(u.file, { status:'url', file:u.file });
  for (const [fileStr, row] of refRows){
    const owners = (usedBy[fileStr] || []).slice(0, 3);
    rows.push('<tr><td class="' + (row.status === 'url' ? 'matchNone' : row.status === 'none' ? 'matchNo' : 'matchYes') + '">' + (row.status === 'url' ? 'external URL' : row.status === 'none' ? 'unmatched' : 'matched') + '</td><td>' + htmlEscape(row.hit ? row.hit.asset.key : '') + '</td><td>' + htmlEscape(fileStr) + '</td><td>' + htmlEscape((row.hit && row.hit.asset.name) || '') + '</td><td>' + (row.status === 'none' ? '<button class="ghost" onclick="linkOne(\'' + htmlEscape(fileStr).replace(/'/g, '') + '\')">Link file…</button>' : htmlEscape(row.hit ? row.hit.asset.relPath || row.hit.asset.name : '')) + '</td><td class="tiny">' + htmlEscape(owners.join(', ')) + '</td></tr>');
  }
  // v2.1.0 (repair 2): media records that are no longer reachable from any
  // permitted record (private/excluded owners, or never linked) are shown
  // for transparency but are NEVER selected for export.
  const unlinkedInfo = collectUnlinkedMediaRecords(parsedData);
  const privacyActive = getPrivacyOpts().mode !== 'full';
  for (const rec of unlinkedInfo.unlinked){
    const fileLabel = (rec.files && rec.files[0] && rec.files[0].file) || rec.file || '(no file)';
    rows.push('<tr><td class="matchNone">unlinked</td><td>' + htmlEscape(rec.ref || '') + '</td><td>' + htmlEscape(fileLabel) + '</td><td>' + htmlEscape(rec.title || '') + '</td><td class="tiny">Not linked to any permitted record — excluded from exports' + (privacyActive ? ' (privacy mode active)' : '') + '</td><td class="tiny"></td></tr>');
  }
  body.innerHTML = rows.length ? rows.join('') : '<tr><td colspan="6">This GED has no media references (OBJE). Import photos anyway — they can be attached in a future release via refinement notes.</td></tr>';
  $('mediaMissing').style.display = match.unmatched.length ? 'block' : 'none';
  if (match.unmatched.length) $('mediaMissing').innerHTML = fmt(match.unmatched.length) + ' referenced file(s) were not found in the imported folders. They stay listed as references (title + original path) everywhere — nothing is dropped. Use “Link file to a media reference…” above, or copy the files into an imported folder with matching names and re-parse.';
  renderGalleryPreview();
}
function linkOne(fileStr){
  pickTargetRef = fileStr;
  $('mediaFilesInput').multiple = false;
  $('mediaFilesInput').click();
  setTimeout(() => { $('mediaFilesInput').multiple = true; }, 500);
  toast('Choose the file for: ' + fileStr.slice(0, 60));
}
function renderGalleryPreview(){
  const host = $('galleryPreview');
  const data = getExportData();
  if (!data){ host.innerHTML = ''; return; }
  const match = matchMediaFiles(data, mediaSession.files);
  const items = [];
  for (const [fileStr, hit] of match.byRef){
    const imp = hit.asset;
    const kind = mediaKind(imp.name || fileStr);
    const url = URL.createObjectURL(imp.file ? imp.file : new Blob([imp.bytes || new Uint8Array()], { type:mimeFor(imp.name) }));
    items.push({ imp, kind, url, fileStr });
  }
  host.innerHTML = items.length
    ? items.map(it => '<div class="mediaCard"><div class="mediaThumb">' + (it.kind === 'image' ? '<img src="' + it.url + '" alt="" loading="lazy">' : ({ pdf:'📕', audio:'🎵', video:'🎬', text:'📄' }[it.kind] || '📦')) + '</div><div class="mediaMeta"><b title="' + htmlEscape(it.fileStr) + '">' + htmlEscape(baseNameOf(it.fileStr)) + '</b><span>' + htmlEscape(it.imp.relPath || it.imp.name) + ' · ' + fmt(Math.round((it.imp.size || 0) / 1024)) + ' KB</span></div></div>').join('')
    : '<div class="empty">No matched media yet. Import a folder in this tab.</div>';
}
