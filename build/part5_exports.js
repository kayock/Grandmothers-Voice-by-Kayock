
// ======================================================== media planning
function mediaKind(formOrName){
  const s = String(formOrName||'').toLowerCase();
  const ext = (s.split('.').pop() || '').trim();
  const f = (s.includes('.') ? ext : s);
  if (/^(jpg|jpeg|png|gif|webp|bmp|svg|avif|heic|tif|tiff)$/.test(f)) return 'image';
  if (/^(pdf)$/.test(f)) return 'pdf';
  if (/^(mp3|wav|ogg|m4a|oga|opus|flac|aac)$/.test(f)) return 'audio';
  if (/^(mp4|webm|mov|avi|mkv|m4v|ogv)$/.test(f)) return 'video';
  if (/^(txt|md|csv|log)$/.test(f)) return 'text';
  if (/^(htm|html)$/.test(f)) return 'html';
  return 'other';
}
function mimeFor(name, form){
  const k = mediaKind(form || name);
  const ext = (String(name||'').split('.').pop() || '').toLowerCase();
  if (k === 'image'){ const map = { jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', gif:'image/gif', webp:'image/webp', bmp:'image/bmp', svg:'image/svg+xml', avif:'image/avif', heic:'image/heic', tif:'image/tiff', tiff:'image/tiff' }; return map[ext] || 'application/octet-stream'; }
  if (k === 'pdf') return 'application/pdf';
  if (k === 'audio'){ const map = { mp3:'audio/mpeg', wav:'audio/wav', ogg:'audio/ogg', oga:'audio/ogg', opus:'audio/opus', m4a:'audio/mp4', flac:'audio/flac', aac:'audio/aac' }; return map[ext] || 'audio/mpeg'; }
  if (k === 'video'){ const map = { mp4:'video/mp4', webm:'video/webm', mov:'video/quicktime', m4v:'video/mp4', ogv:'video/ogg' }; return map[ext] || 'video/mp4'; }
  if (k === 'text') return 'text/plain';
  if (k === 'html') return 'text/html';
  return 'application/octet-stream';
}
function baseNameOf(p){ const s = String(p||'').replace(/\\/g,'/'); const i = s.lastIndexOf('/'); return i >= 0 ? s.slice(i+1) : s; }
function normFileKey(s){ return normalize(baseNameOf(s)).replace(/\s/g,''); }
function stripExt(s){ const b = baseNameOf(s); const i = b.lastIndexOf('.'); return i > 0 ? b.slice(0,i) : b; }
function collectMediaFileRefs(data){
  // v2.1.0 (repair 2): ONLY media actually referenced by the (already
  // privacy-filtered) people, families and events is collected. The global
  // mediaRecords map is deliberately NOT scanned here — records belonging
  // solely to private or excluded individuals must never be selected for
  // export. Orphan records (linked to nothing) are listed separately in
  // the builder's Media Library as "unlinked".
  const refs = new Map(); // fileString -> {ref, firstTitle, url}
  const addRef = (fileStr, title) => {
    if (!fileStr) return;
    if (!refs.has(fileStr)) refs.set(fileStr, { file:fileStr, title:title||'', url:/^https?:\/\//i.test(fileStr) });
  };
  for (const p of Object.values(data.people || {})) for (const m of (p.media||[])) for (const f of (m.files||[])) addRef(f.file, m.title || f.title);
  for (const f of Object.values(data.families || {})) for (const m of (f.media||[])) for (const f2 of (m.files||[])) addRef(f2.file, m.title || f2.title);
  for (const p of Object.values(data.people || {})) for (const ev of (p.events||[])) for (const m of (ev.media||[])) for (const f of (m.files||[])) addRef(f.file, m.title || f.title);
  // v2.1.1 (family-event media repair): media attached to FAMILY EVENTS —
  // e.g. a marriage photograph on a family record's MARR event — is now
  // collected as well, matching the traversal collectUnlinkedMediaRecords()
  // already used. addRef() dedupes by file string, so a file referenced by
  // several people/events still yields a single asset.
  for (const f of Object.values(data.families || {})) for (const ev of (f.events||[])) for (const m of (ev.media||[])) for (const f2 of (m.files||[])) addRef(f2.file, m.title || f2.title);
  return refs;
}
function collectUnlinkedMediaRecords(data){
  // display-only helper for the builder Media Library: media records that
  // are no longer reachable from any permitted record (privacy-excluded
  // owners or records never linked to a person/family).
  const reachable = collectMediaFileRefs(data);
  const usedIds = new Set();
  const walk = (list) => { for (const m of (list||[])){ if (m.ref) usedIds.add(m.ref); } };
  for (const p of Object.values(data.people || {})){ walk(p.media); for (const ev of (p.events||[])) walk(ev.media); }
  for (const f of Object.values(data.families || {})){ walk(f.media); for (const ev of (f.events||[])) walk(ev.media); }
  const unlinked = [];
  for (const [id, rec] of Object.entries(data.mediaRecords || {})){
    if (!usedIds.has(id)) unlinked.push(rec);
  }
  return { unlinked, reachableCount:reachable.size };
}
function matchMediaFiles(data, importedFiles){
  const refs = collectMediaFileRefs(data);
  const result = { byRef:new Map(), unmatched:[], urlRefs:[], matched:0 };
  for (const imp of importedFiles){ imp._base = baseNameOf(imp.name || imp.relPath || ''); imp._baseKey = normFileKey(imp.name || imp.relPath || ''); imp._noExt = normFileKey(stripExt(imp.name || imp.relPath || '')); }
  for (const [fileStr, info] of refs){
    if (info.url){ result.urlRefs.push(info); continue; }
    const refBase = baseNameOf(fileStr);
    const refBaseKey = normFileKey(fileStr);
    const refNoExt = normFileKey(stripExt(fileStr));
    const refPathKey = normalize(fileStr).replace(/\s/g,'');
    let best = null, bestTier = 0;
    for (const imp of importedFiles){
      const pathKey = normalize(imp.relPath || imp.name || '').replace(/\s/g,'');
      if (pathKey && pathKey === refPathKey){ best = imp; bestTier = 4; break; }
      if (imp._baseKey && imp._baseKey === refBaseKey){ if (bestTier < 3){ best = imp; bestTier = 3; } }
      else if (imp._noExt && imp._noExt === refNoExt){ if (bestTier < 2){ best = imp; bestTier = 2; } }
    }
    if (best) result.byRef.set(fileStr, { asset:best, tier:bestTier });
    else result.unmatched.push(info);
  }
  result.matched = result.byRef.size;
  return result;
}

// ============================================== markdown vault / single file
function mdSafeText(s){ return String(s ?? '').replace(/\0/g,'').replace(/\r\n/g,'\n').replace(/\r/g,'\n').trim(); }
function mdEscapeInline(s){ return mdSafeText(s).replace(/([\\`*_[\]])/g,'\\$1'); }
function yamlQuote(s){ return JSON.stringify(mdSafeText(s)); }
function mdFileSafe(s){ return mdSafeText(s || 'Untitled').replace(/[\\/:*?"<>|#^[\]]+/g,' ').replace(/\s+/g,' ').trim().slice(0,140) || 'Untitled'; }
function pageTitleForPerson(p){ return mdFileSafe((p?.name || 'Unnamed person') + ' - ' + (p?.id || 'NOID')); }
function surnameOf(name){ const parts = mdSafeText(name).split(/\s+/).filter(Boolean); return parts.length ? parts[parts.length-1].replace(/[^A-Za-z0-9'’-]/g,'') || 'Unknown' : 'Unknown'; }
function personLinkMarkdown(id, data, mode){
  const p = data.people[id];
  if (!p) return mdEscapeInline(id || 'Unknown');
  const title = pageTitleForPerson(p);
  if (mode === 'obsidian') return `[[People/${title}|${mdEscapeInline(p.name)}]]`;
  return `[[${mdEscapeInline(title)}]]`;
}
function relationsForMarkdown(id, data){
  const p = data.people[id] || {};
  const famc=(p.famc||[]).map(fid=>data.families[fid]).filter(Boolean);
  const fams=(p.fams||[]).map(fid=>data.families[fid]).filter(Boolean);
  return {
    parents: unique(famc.flatMap(f=>[f.husband,f.wife]).filter(x=>x && x!==id)),
    siblings: unique(famc.flatMap(f=>f.children||[]).filter(x=>x && x!==id)),
    spouses: unique(fams.flatMap(f=>[f.husband,f.wife]).filter(x=>x && x!==id)),
    children: unique(fams.flatMap(f=>f.children||[])),
    famc, fams
  };
}
function sourceLineMarkdown(s){
  const parts=[];
  if (s.title || s.ref) parts.push(`**${mdEscapeInline(s.title || s.ref)}**`);
  if (s.page) parts.push(`Page: ${mdEscapeInline(s.page)}`);
  if (s.quay !== null && s.quay !== undefined) parts.push(`Evidence: ${['','weak','circumstantial','secondary','direct'][s.quay] || s.quay}`);
  if (s.text) parts.push(`Text: ${mdEscapeInline(s.text).slice(0,1200)}`);
  if (s.note) parts.push(`Note: ${mdEscapeInline(s.note).slice(0,1200)}`);
  return parts.join(' — ');
}
function mediaEmbedMarkdown(m, mediaPlan, mode){
  // wikilink embeds: Obsidian → media/…, Logseq → assets/…  (folders created inside the ZIP)
  const folder = mode === 'obsidian' ? 'media' : 'assets';
  const out = [];
  for (const f of (m.files||[])){
    if (!f.file) continue;
    const hit = mediaPlan && mediaPlan.byRef && mediaPlan.byRef.get(f.file);
    const asset = hit ? (hit.asset || hit) : null;
    if (asset && asset.dest){
      const kind = mediaKind(f.form || f.file);
      out.push(kind === 'image' ? `![[${folder}/${asset.dest}]]` : `[${mdEscapeInline(f.title || baseNameOf(f.file))}](${folder}/${encodeURI(asset.dest)})`);
    } else if (/^https?:\/\//i.test(f.file)){
      out.push(`[External link](${f.file})`);
    } else {
      out.push(`_${mdEscapeInline(f.title || f.file)} — file not provided_`);
    }
  }
  return out.join(' · ');
}
function buildPersonMarkdown(id, data, mode, mediaPlan){
  const p = data.people[id]; if (!p) return '';
  const rel = relationsForMarkdown(id, data);
  const linkList = ids => ids.length ? ids.map(x=>personLinkMarkdown(x,data,mode)).join(', ') : 'None listed';
  const events = (p.events||[]).filter(e=>e.type || e.date || e.place || e.value);
  const familyRecords = [...rel.famc, ...rel.fams].filter(Boolean);
  if(mode === 'logseq'){
    let md = `type:: person\ngedcom-id:: ${p.id}\nname:: ${p.name}\nbirth-date:: ${p.birthDate || ''}\nbirth-place:: ${p.birthPlace || ''}\ndeath-date:: ${p.deathDate || ''}\ndeath-place:: ${p.deathPlace || ''}\ntags:: family-tree, kayock-legacy-builder\n\n`;
    md += `- # ${mdEscapeInline(p.name)}\n`;
    md += `  - GED ID:: ${p.id}\n  - Sex:: ${p.sex || 'Unknown'}\n`;
    if(p.living) md += `  - Privacy:: living person (redacted)\n`;
    if(p.birthDate || p.birthPlace) md += `  - Born:: ${[p.birthDate,p.birthPlace].filter(Boolean).join(' — ')}\n`;
    if(p.deathDate || p.deathPlace) md += `  - Died:: ${[p.deathDate,p.deathPlace].filter(Boolean).join(' — ')}\n`;
    md += `  - Family\n    - Parents:: ${linkList(rel.parents)}\n    - Spouse/partner:: ${linkList(rel.spouses)}\n    - Children:: ${linkList(rel.children)}\n    - Siblings:: ${linkList(rel.siblings)}\n`;
    if(events.length){ md += `  - Life events\n`; for(const e of events){ md += `    - ${mdEscapeInline(e.type || 'Event')}${e.date?' — '+mdEscapeInline(e.date)+(dateCertainty(e.dateParsed)?' *(uncertain)*':''):''}${e.place?' — '+mdEscapeInline(e.place):''}${e.value && e.value !== 'Y'?' — '+mdEscapeInline(e.value):''}\n`; for (const s of e.sources||[]) md += `      - Source: ${sourceLineMarkdown(s).replace(/\n/g,'\n      ').slice(0,400)}\n`; for (const n of e.notes||[]) md += `      - Note: ${mdEscapeInline(n).replace(/\n/g,'\n      ').slice(0,400)}\n`; for (const m of e.media||[]){ const emb = mediaEmbedMarkdown(m, mediaPlan, mode); if (emb) md += `      - ${emb}\n`; } } }
    if(p.notes?.length){ md += `  - GED / Ancestry notes\n`; for(const n of p.notes) md += `    - ${mdEscapeInline(n).replace(/\n/g,'\n      ')}\n`; }
    if(p.sources?.length){ md += `  - Sources\n`; for(const s of p.sources) md += `    - ${sourceLineMarkdown(s).replace(/\n/g,'\n      ')}\n`; }
    if(p.media?.length){ md += `  - Media\n`; for(const m of p.media){ const emb = mediaEmbedMarkdown(m, mediaPlan, mode); md += `    - ${emb || mdEscapeInline([m.title,m.ref].filter(Boolean).join(' — '))}\n`; } }
    if(familyRecords.length){ md += `  - Family record notes\n`; for(const f of familyRecords){ if((f.notes&&f.notes.length)||f.marriageDate||f.marriagePlace||(f.events&&f.events.some(e=>(e.media||[]).length))){ md += `    - ${f.id}${f.marriageDate||f.marriagePlace?' — Marriage '+[f.marriageDate,f.marriagePlace].filter(Boolean).join(' — '):''}\n`; for(const n of f.notes||[]) md += `      - ${mdEscapeInline(n).replace(/\n/g,'\n        ')}\n`; for(const ev of f.events||[]) for(const m of ev.media||[]){ const emb = mediaEmbedMarkdown(m, mediaPlan, mode); if (emb) md += `      - ${emb} (${mdEscapeInline(ev.type || 'Family event')})\n`; } } } }
    md += `  - Research / correction notes\n    - Correction needed:: \n    - Family memory:: \n    - Source needed:: \n    - Questions:: \n`;
    return md;
  }
  let md = `---\ntype: person\ngedcom_id: ${yamlQuote(p.id)}\nname: ${yamlQuote(p.name)}\nsex: ${yamlQuote(p.sex || '')}\nbirth_date: ${yamlQuote(p.birthDate || '')}\nbirth_place: ${yamlQuote(p.birthPlace || '')}\ndeath_date: ${yamlQuote(p.deathDate || '')}\ndeath_place: ${yamlQuote(p.deathPlace || '')}\ntags:\n  - family-tree\n  - kayock-legacy-builder\n---\n\n`;
  md += `# ${mdEscapeInline(p.name)}\n\n`;
  md += `**GED ID:** ${p.id}\n\n`;
  if(p.living) md += `*Privacy: living person — details redacted for sharing.*\n\n`;
  if(p.birthDate || p.birthPlace) md += `**Born:** ${mdEscapeInline([p.birthDate,p.birthPlace].filter(Boolean).join(' — '))}\n\n`;
  if(p.deathDate || p.deathPlace) md += `**Died:** ${mdEscapeInline([p.deathDate,p.deathPlace].filter(Boolean).join(' — '))}\n\n`;
  md += `## Family\n\n- **Parents:** ${linkList(rel.parents)}\n- **Spouse / partner:** ${linkList(rel.spouses)}\n- **Children:** ${linkList(rel.children)}\n- **Siblings:** ${linkList(rel.siblings)}\n\n`;
  if(p.associations?.length) md += `- **Associated with:** ${p.associations.map(a=>personLinkMarkdown(a.person,data,mode)+' ('+mdEscapeInline(a.role)+')').join(', ')}\n\n`;
  if(events.length){ md += `## Life Events\n\n`; for(const e of events){ md += `- **${mdEscapeInline(e.type || 'Event')}**${e.date?' — '+mdEscapeInline(e.date)+(dateCertainty(e.dateParsed)?' *(uncertain)*':''):''}${e.place?' — '+mdEscapeInline(e.place):''}${e.value && e.value !== 'Y'?' — '+mdEscapeInline(e.value):''}\n`; for (const s of e.sources||[]) md += `  - Source: ${sourceLineMarkdown(s)}\n`; for (const n of e.notes||[]) md += `  - Note: ${mdEscapeInline(n)}\n`; for (const m of e.media||[]){ const emb = mediaEmbedMarkdown(m, mediaPlan, mode); if (emb) md += `  - ${emb}\n`; } } md+='\n'; }
  if(p.notes?.length){ md += `## GED / Ancestry Notes\n\n`; for(const n of p.notes) md += `${n.split('\n').map(line=>'> '+mdEscapeInline(line)).join('\n')}\n\n`; }
  if(p.sources?.length){ md += `## Sources\n\n`; for(const s of p.sources) md += `- ${sourceLineMarkdown(s)}\n`; md+='\n'; }
  if(p.media?.length){ md += `## Media\n\n`; for(const m of p.media){ const emb = mediaEmbedMarkdown(m, mediaPlan, mode); md += `- ${emb || mdEscapeInline([m.title,m.ref].filter(Boolean).join(' — '))}\n`; } md+='\n'; }
  if(familyRecords.length){
    let block='';
    for(const f of familyRecords){
      if((f.notes&&f.notes.length)||(f.sources&&f.sources.length)||(f.media&&f.media.length)||f.marriageDate||f.marriagePlace){
        block += `### Family Record ${f.id}\n\n`;
        if(f.marriageDate || f.marriagePlace) block += `- **Marriage:** ${mdEscapeInline([f.marriageDate,f.marriagePlace].filter(Boolean).join(' — '))}\n`;
        for(const n of f.notes||[]) block += `\n${n.split('\n').map(line=>'> '+mdEscapeInline(line)).join('\n')}\n`;
        for(const s of f.sources||[]) block += `- ${sourceLineMarkdown(s)}\n`;
        for(const m of f.media||[]){ const emb = mediaEmbedMarkdown(m, mediaPlan, mode); if (emb) block += `- ${emb}\n`; }
        // v2.1.1: family-event media (e.g. marriage photo) embeds with the family record
        for(const ev of f.events||[]){ for(const m of ev.media||[]){ const emb = mediaEmbedMarkdown(m, mediaPlan, mode); if (emb) block += `- ${emb} (${mdEscapeInline(ev.type || 'Family event')})\n`; } }
        block += '\n';
      }
    }
    if(block) md += `## Family Record Notes\n\n${block}`;
  }
  md += `## Research / Correction Notes\n\n- Correction needed:\n- Possible duplicate:\n- Needs source / proof:\n- Photo or document to find:\n- Family memory:\n- Questions:\n\n`;
  return md;
}
function buildMarkdownVaultFiles(data, mode, mediaPlan){
  const files=[];
  const people = Object.values(data.people).sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  const rootPrefix = mode === 'logseq' ? 'pages/' : '';
  const indexPrefix = mode === 'logseq' ? 'pages/' : 'Indexes/';
  const peoplePrefix = mode === 'logseq' ? 'pages/' : 'People/';
  const personPath = p => peoplePrefix + pageTitleForPerson(p) + '.md';
  const personLink = id => personLinkMarkdown(id,data,mode);
  for(const p of people) files.push({name:personPath(p), data:buildPersonMarkdown(p.id,data,mode,mediaPlan)});
  let home = `# ${mdEscapeInline(data.meta.title)}\n\nGenerated by ${APP_NAME} ${APP_VERSION} on ${new Date().toLocaleString()}.\n\n`;
  home += `- People: ${data.meta.peopleCount}\n- Families: ${data.meta.familyCount}\n- Note entries: ${data.meta.noteCount}\n- Sources: ${data.meta.sourceCount}\n- Media references: ${data.meta.mediaCount}\n`;
  if (data.meta.treeId) home += `- Tree identity: ${data.meta.treeId}\n`;
  home += '\n';
  if(data.meta.spotlightId) home += `## Start Here\n\n${personLink(data.meta.spotlightId)}\n\n`;
  const idxLinks = mode === 'obsidian'
    ? ['- [[Indexes/People A-Z]]','- [[Indexes/Surnames]]','- [[Indexes/Places]]','- [[Indexes/Timeline]]','- [[Indexes/Sources]]','- [[Indexes/Research Questions]]']
    : ['- [[People A-Z]]','- [[Surnames]]','- [[Places]]','- [[Timeline]]','- [[Sources]]','- [[Research Questions]]'];
  home += `## Indexes\n\n${idxLinks.join('\n')}\n\n`;
  files.push({name:rootPrefix+'Home.md', data:home});
  files.push({name:indexPrefix+'People A-Z.md', data:'# People A-Z\n\n'+people.map(p=>`- ${personLink(p.id)}${p.birthDate?' — b. '+mdEscapeInline(p.birthDate):''}${p.living?' — *private*':''}`).join('\n')+'\n'});
  const bySurname={}; for(const p of people){ const s=surnameOf(p.name)||'Unknown'; (bySurname[s] ||= []).push(p); }
  let surnames='# Surnames\n\n'; for(const s of Object.keys(bySurname).sort()) surnames += `## ${mdEscapeInline(s)}\n\n` + bySurname[s].map(p=>`- ${personLink(p.id)}`).join('\n') + '\n\n';
  files.push({name:indexPrefix+'Surnames.md', data:surnames});
  const places={};
  function addPlace(place,id,label){ place=mdSafeText(place); if(!place) return; (places[place] ||= []).push({id,label}); }
  for(const p of people){ addPlace(p.birthPlace,p.id,'Birth'); addPlace(p.deathPlace,p.id,'Death'); for(const e of p.events||[]) addPlace(e.place,p.id,e.type||'Event'); }
  let placesMd='# Places\n\n'; for(const place of Object.keys(places).sort()) placesMd += `## ${mdEscapeInline(place)}\n\n` + places[place].slice(0,300).map(x=>`- ${mdEscapeInline(x.label)}: ${personLink(x.id)}`).join('\n') + (places[place].length>300?`\n- ...and ${places[place].length-300} more`:'') + '\n\n';
  files.push({name:indexPrefix+'Places.md', data:placesMd});
  const timeline=[];
  for(const p of people){ for(const e of p.events||[]){ const y=yearFromDate(e.date); timeline.push({y:y||9999,date:e.date,type:e.type,place:e.place,id:p.id}); } }
  timeline.sort((a,b)=>a.y-b.y || String(a.date).localeCompare(String(b.date)));
  files.push({name:indexPrefix+'Timeline.md', data:'# Timeline\n\nDates shown exactly as recorded; uncertain dates keep their qualifiers (ABT, BEF, …).\n\n'+timeline.map(e=>`- **${mdEscapeInline(e.date||'date not recorded')}** — ${mdEscapeInline(e.type||'Event')}: ${personLink(e.id,data,mode)}${e.place?' — '+mdEscapeInline(e.place):''}`).join('\n')+'\n'});
  const sourceMap={};
  function addSources(srcs,id){ for(const s of srcs||[]){ const key=mdSafeText(s.title||s.ref||s.page||'Untitled source'); (sourceMap[key] ||= new Set()).add(id); } }
  for(const p of people){ addSources(p.sources,p.id); const r=relationsForMarkdown(p.id,data); for(const f of [...r.famc,...r.fams]) addSources(f.sources,p.id); }
  let sourcesMd='# Sources\n\n'; for(const key of Object.keys(sourceMap).sort()) sourcesMd += `## ${mdEscapeInline(key)}\n\n` + [...sourceMap[key]].slice(0,200).map(id=>`- ${personLink(id)}`).join('\n') + '\n\n';
  files.push({name:indexPrefix+'Sources.md', data:sourcesMd});
  files.push({name:indexPrefix+'Research Questions.md', data:'# Research Questions\n\nUse this page to track questions while refining the tree.\n\n- [ ] Person:\n  - Question:\n  - Evidence needed:\n  - Answer / decision:\n\n'});
  files.push({name:'README.md', data:`# ${data.meta.title} Markdown Export\n\nThis vault was generated by ${APP_NAME} ${APP_VERSION}.\n\nFormat: ${mode}\nPeople: ${data.meta.peopleCount}\nFamilies: ${data.meta.familyCount}\n${mediaPlan && mediaPlan.dests && mediaPlan.dests.length ? 'Media files included: ' + mediaPlan.dests.length + ' (relative links use ' + (mode==='obsidian'?'media/':'assets/') + ')\n' : ''}Privacy mode: ${data.meta.privacyMode || 'full'}\n\nOpen the folder in ${mode === 'obsidian' ? 'Obsidian' : 'Logseq'} after unzipping. The original GEDCOM file was only read, never modified.\n`});
  return files;
}
function buildSingleMarkdown(data, mode, mediaPlan){
  const people=Object.values(data.people).sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  let md = `# ${mdEscapeInline(data.meta.title)}\n\nGenerated by ${APP_NAME} ${APP_VERSION} on ${new Date().toLocaleString()}.\n\nPeople: ${data.meta.peopleCount}\nFamilies: ${data.meta.familyCount}\nNote entries: ${data.meta.noteCount}\nMedia references: ${data.meta.mediaCount}\nPrivacy mode: ${data.meta.privacyMode || 'full'}\n`;
  if (data.meta.treeId) md += `Tree identity: ${data.meta.treeId}\n`;
  md += '\n';
  for(const p of people){ md += '\n---\n\n' + buildPersonMarkdown(p.id,data,mode,mediaPlan).replace(/^---[\s\S]*?---\n\n/,''); }
  return md;
}

// ==================================================== Family Story Booklet
function evDateText(e){ return e.date || (e.dateParsed && e.dateParsed.text) || ''; }
function buildBookletHtml(data, opts){
  opts = opts || {};
  const esc = htmlEscape;
  const title = opts.title || 'Family Story Booklet';
  const author = opts.author || APP_NAME;
  const notes = opts.notes || {};
  const mediaPlan = opts.mediaPlan || { byRef:new Map() };
  const photos = opts.includePhotos !== false;
  const withMem = opts.includeMemories !== false;
  const withSrc = opts.includeSources !== false;
  const withQ = opts.includeQuestions !== false;
  const withChron = opts.includeChronology !== false;
  const people = data.people, families = data.families;
  const dateNow = new Date().toLocaleDateString(undefined, { year:'numeric', month:'long', day:'numeric' });
  const sections = [];
  const photoCount = { n:0 };
  function mediaHtmlFor(m){
    if (!m || !m.files) return '';
    const bits = [];
    for (const f of (m.files||[])){
      const hit = mediaPlan.byRef ? mediaPlan.byRef.get(f.file) : null;
      const asset = hit ? (hit.asset || hit) : null;
      if (asset && asset.dataUri){
        const kind = mediaKind(f.form || f.file);
        if (kind === 'image'){ photoCount.n++; bits.push(`<figure><img src="${asset.dataUri}" alt="${esc(f.title || '')}" loading="lazy"><figcaption>${esc(f.title || baseNameOf(f.file))}</figcaption></figure>`); }
        else if (kind === 'pdf'){ bits.push(`<figure class="docRef"><a href="${asset.dataUri}" download="${esc(baseNameOf(f.file))}">Document: ${esc(f.title || baseNameOf(f.file))}</a></figure>`); }
        else if (kind === 'audio'){ bits.push(`<figure class="docRef"><audio controls src="${asset.dataUri}"></audio><figcaption>${esc(f.title || baseNameOf(f.file))}</figcaption></figure>`); }
        else { bits.push(`<figure class="docRef"><a href="${asset.dataUri}" download="${esc(baseNameOf(f.file))}">Media: ${esc(f.title || baseNameOf(f.file))}</a></figure>`); }
      } else if (/^https?:\/\//i.test(f.file||'')){ bits.push(`<figure class="docRef"><em>External media kept as a link (offline builds do not fetch it): ${esc(f.file)}</em></figure>`); }
      else { bits.push(`<figure class="docRef"><em>File not provided: ${esc(f.title || f.file)}</em></figure>`); }
    }
    return bits.join('');
  }
  function personMediaGallery(p){
    const chunks = [];
    for (const m of (p.media||[])) chunks.push(mediaHtmlFor(m));
    for (const ev of (p.events||[])) for (const m of (ev.media||[])) chunks.push(mediaHtmlFor(m));
    for (const fid of (p.fams||[])){
      const f = families[fid];
      if (!f) continue;
      for (const m of (f.media||[])) chunks.push(mediaHtmlFor(m));
      // v2.1.1: family-EVENT media (e.g. the marriage photograph) shows with the family context
      for (const ev of (f.events||[])) for (const m of (ev.media||[])) chunks.push(mediaHtmlFor(m));
    }
    return chunks.join('');
  }
  function chronologyTable(p){
    const rows = (p.events||[]).filter(e => e.tag !== 'CHANGE').map(e => {
      const unc = dateCertainty(e.dateParsed) ? ' <span class="unc">uncertain</span>' : '';
      const src = (e.sources && e.sources.length && withSrc) ? '<span class="srcRef">' + esc(e.sources.map(s => s.title || s.ref).filter(Boolean).join('; ')) + '</span>' : '';
      return `<tr><td class="d">${esc(evDateText(e) || '—')}${unc}</td><td><b>${esc(e.type)}</b>${e.place ? ' — ' + esc(e.place) : ''}${e.value && !['Yes','Y'].includes(e.value) ? '<br>' + esc(e.value) : ''}${src}</td></tr>`;
    });
    if (!rows.length) return '';
    return `<h3>Chronology</h3><table class="chron"><tbody>${rows.join('')}</tbody></table>`;
  }
  function sourcesSection(items){
    if (!withSrc || !items.length) return '';
    const seen = new Set(); const lines = [];
    for (const s of items){
      const key = (s.title || s.ref || '') + '|' + (s.page || '');
      if (!s.title && !s.ref) continue;
      if (seen.has(key)) continue; seen.add(key);
      lines.push(`<li><b>${esc(s.title || s.ref)}</b>${s.page ? ' — ' + esc(s.page) : ''}${s.quay !== null && s.quay !== undefined ? ' <span class="quay">evidence: ' + ['','weak','circumstantial','secondary','direct'][s.quay] + '</span>' : ''}${s.text ? '<blockquote>' + esc(s.text.slice(0,600)) + '</blockquote>' : ''}${s.note ? '<blockquote class="sn">' + esc(String(s.note).slice(0,400)) + '</blockquote>' : ''}</li>`);
    }
    return lines.length ? `<h2 class="sect">Sources</h2><ul class="srcs">${lines.join('')}</ul>` : '';
  }
  function memoriesSection(id){
    if (!withMem) return '';
    const n = notes[id];
    if (!n || (!n.memory && !n.research)) return '';
    let html = '<h2 class="sect">Family memories &amp; research notes</h2>';
    if (n.memory) html += `<blockquote class="mem"><p>${esc(n.memory).replace(/\n/g,'<br>')}</p><cite>— ${esc(n.author || 'family contributor')}${n.updated ? ', ' + esc(String(n.updated).slice(0,10)) : ''}</cite></blockquote>`;
    if (n.research) html += `<blockquote class="mem research"><p>${esc(n.research).replace(/\n/g,'<br>')}</p><cite>— ${esc(n.author || 'family contributor')}</cite></blockquote>`;
    return html;
  }
  function personBio(p, headingLevel){
    const rel = relationsOf(p.id);
    const bits = [];
    const name = p.privacy ? 'Private (living person)' : p.name;
    let sub = [];
    if (p.birthDate || p.birthPlace) sub.push('Born ' + [p.birthDate, p.birthPlace].filter(Boolean).join(', '));
    if (p.deathDate || p.deathPlace) sub.push('Died ' + [p.deathDate, p.deathPlace].filter(Boolean).join(', '));
    bits.push(`<h${headingLevel} class="personName">${esc(name)}</h${headingLevel}>`);
    if (sub.length) bits.push(`<p class="vitals">${esc(sub.join(' · '))}</p>`);
    if (p.privacy) bits.push('<p class="vitals"><em>This person is living; details are withheld by your privacy settings.</em></p>');
    const famLines = [];
    if (rel.parents.length) famLines.push('<b>Parents:</b> ' + rel.parents.map(pid => `<a href="#p-${esc(pid)}">${esc(people[pid] ? (people[pid].privacy ? 'Private (living)' : people[pid].name) : pid)}</a>`).join(', '));
    if (rel.spouses.length) famLines.push('<b>Spouse/partner:</b> ' + rel.spouses.map(pid => `<a href="#p-${esc(pid)}">${esc(people[pid] ? (people[pid].privacy ? 'Private (living)' : people[pid].name) : pid)}</a>`).join(', '));
    if (rel.children.length) famLines.push('<b>Children:</b> ' + rel.children.map(pid => `<a href="#p-${esc(pid)}">${esc(people[pid] ? (people[pid].privacy ? 'Private (living)' : people[pid].name) : pid)}</a>`).join(', '));
    if (rel.siblings.length) famLines.push('<b>Siblings:</b> ' + rel.siblings.map(pid => `<a href="#p-${esc(pid)}">${esc(people[pid] ? (people[pid].privacy ? 'Private (living)' : people[pid].name) : pid)}</a>`).join(', '));
    if (famLines.length) bits.push('<p class="famLines">' + famLines.join('<br>') + '</p>');
    if (withChron) bits.push(chronologyTable(p));
    const gal = photos ? personMediaGallery(p) : '';
    if (gal) bits.push(`<div class="gal">${gal}</div>`);
    const notesHtml = memoriesSection(p.id);
    if (notesHtml) bits.push(notesHtml);
    if (withSrc){
      const allSrc = [...(p.sources||[])]; for (const ev of (p.events||[])) allSrc.push(...(ev.sources||[]));
      const srcHtml = sourcesSection(allSrc);
      if (srcHtml) bits.push(srcHtml);
    }
    return bits.join('');
  }
  function relationsOf(id){
    const p = people[id] || {};
    const famc=(p.famc||[]).map(fid=>families[fid]).filter(Boolean);
    const fams=(p.fams||[]).map(fid=>families[fid]).filter(Boolean);
    return {
      parents: unique(famc.flatMap(f=>[f.husband,f.wife]).filter(x=>x && x!==id)),
      siblings: unique(famc.flatMap(f=>f.children||[]).filter(x=>x && x!==id)),
      spouses: unique(fams.flatMap(f=>[f.husband,f.wife]).filter(x=>x && x!==id)),
      children: unique(fams.flatMap(f=>f.children||[]))
    };
  }
  let stats = { people:0, photos:0 };
  let body = '';
  if (opts.scope === 'individual'){
    const p = people[opts.personId];
    if (!p) return null;
    stats.people = 1;
    body = `<section class="chapter" id="p-${esc(p.id)}">${personBio(p, 2)}</section>`;
  } else if (opts.scope === 'branch'){
    const root = people[opts.personId];
    if (!root) return null;
    const gens = Math.max(1, Math.min(10, safeInt(opts.gens, 4)));
    const seen = new Set([root.id]);
    let level = [{ p:root, gen:0 }];
    const chunks = [`<section class="chapter" id="p-${esc(root.id)}"><h2 class="genHead">Root — ${esc(root.name)}</h2>${personBio(root, 3)}</section>`];
    while (level.length){
      const cur = level.shift();
      const ent = cur.p;
      if (cur.gen >= gens) continue;
      const kids = unique((ent.fams||[]).flatMap(fid => (families[fid] ? families[fid].children : [])));
      for (const kid of kids){
        if (!people[kid] || seen.has(kid)) continue;
        seen.add(kid);
        stats.people++;
        chunks.push(`<section class="chapter" id="p-${esc(kid)}"><h3 class="genHead">Generation ${cur.gen+1} — ${esc(people[kid].privacy ? 'Private (living)' : people[kid].name)}</h3>${personBio(people[kid], 4)}</section>`);
        level.push({ p:people[kid], gen:cur.gen+1 });
      }
    }
    body = chunks.join('');
  } else {
    const surname = opts.surname || '';
    const list = Object.values(people).filter(p => (p.privacy ? false : surnameOf(p.name).toLowerCase() === surname.toLowerCase()));
    if (!list.length) return null;
    stats.people = list.length;
    list.sort((a,b) => (a.birthDateParsed && b.birthDateParsed) ? ((a.birthDateParsed.startYear||0) - (b.birthDateParsed.startYear||0)) : 0);
    const chunks = [];
    const birthYears = list.map(p => p.birthDateParsed ? (p.birthDateParsed.startYear || p.birthDateParsed.year) : 0).filter(Boolean);
    chunks.push(`<section class="chapter"><h2 class="genHead">The ${esc(surname)} family — ${list.length} people</h2>`);
    if (birthYears.length) chunks.push(`<p>Earliest recorded birth in this group: ${Math.min(...birthYears)}. Latest: ${Math.max(...birthYears)}.</p>`);
    const places = {};
    for (const p of list) for (const ev of (p.events||[])) if (ev.place) (places[ev.place] ||= 0), places[ev.place]++;
    const topPlaces = Object.entries(places).sort((a,b) => b[1]-a[1]).slice(0, 8);
    if (topPlaces.length) chunks.push('<p><b>Places appearing most often:</b> ' + topPlaces.map(([pl,n]) => esc(pl) + ' (' + n + ')').join(' · ') + '</p>');
    chunks.push('</section>');
    for (const p of list) chunks.push(`<section class="chapter" id="p-${esc(p.id)}">${personBio(p, 3)}</section>`);
    body = chunks.join('');
  }
  const globalQs = [];
  if (withQ){
    for (const [id, n] of Object.entries(notes)){
      if (n.research && (people[id])) globalQs.push({ id, name:n.name || (people[id] ? people[id].name : id), text:n.research, author:n.author });
    }
    if (opts.qualityRows) for (const r of opts.qualityRows.slice(0, 20)) globalQs.push({ name:r.name, text:'Missing evidence: ' + r.suggestion.toLowerCase() + '.', author:'source quality report' });
  }
  const qHtml = (withQ && globalQs.length) ? `<section class="chapter"><h2 class="genHead">Research questions &amp; open items</h2><ul class="qs">${globalQs.slice(0,60).map(q => `<li><b>${esc(q.name)}</b> — ${esc(q.text)}${q.author ? ' <span class="qby">(' + esc(q.author) + ')</span>' : ''}</li>`).join('')}</ul></section>` : '';
  stats.photos = photoCount.n;
  const privacyNotice = data.meta.privacyMode && data.meta.privacyMode !== 'full' ? `<p class="privNotice">Privacy mode active (${esc(data.meta.privacyMode)}): details of people estimated to be living are hidden or removed. Verify before sharing.</p>` : '';
  return { html:`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><style>${BOOKLET_CSS}</style></head><body>
<div class="cover"><div class="coverInner"><div class="frameOrn"><svg class="mesaArt" viewBox="0 0 320 30" role="img" aria-label="Desert mesa horizon ornament"><path d="M2 24 H86 L98 11 L110 24 H146 L155 5 L166 24 H206 L216 14 L228 24 H318" fill="none" stroke="#B85C42" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 28 H318" stroke="#287F83" stroke-width="1.4" opacity=".6"/></svg></div><h1>${esc(title)}</h1><p class="sub">${esc(opts.subtitle || 'A family keepsake')}</p><p class="prep">Prepared by ${esc(author)} · ${esc(dateNow)}</p><p class="treeName">From the family tree “${esc(data.meta.title || data.meta.fileName || '')}” · ${fmt(stats.people)} ${stats.people === 1 ? 'person' : 'people'} in this edition${stats.photos ? ' · ' + stats.photos + (stats.photos === 1 ? ' image' : ' images') : ''}</p><p class="motto">Turn a family tree into something people can actually walk through.</p></div></div>
${privacyNotice}
<main>${body}${qHtml}</main>
<footer class="colophon">Generated offline by ${APP_NAME} ${APP_VERSION} (MIT). Every fact, date, place, quote and image in this booklet comes from the imported GEDCOM file and your family’s own notes — nothing was invented. Uncertain dates (ABT, BEF, “about”) are kept exactly as recorded.</footer>
</body></html>`, stats };
}
const BOOKLET_CSS = `
/* Southwest Heritage keepsake design: warm sandstone screen, ink-light print. */
@page{size:A4;margin:22mm 19mm}
*{box-sizing:border-box}
body{font-family:Georgia,'Times New Roman',serif;color:#49382D;margin:0;background:#F6EBD8;line-height:1.62;font-size:12.2pt}
.cover{min-height:92vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 0%,rgba(195,151,67,.14) 0,transparent 46%),radial-gradient(circle at 85% 90%,rgba(40,127,131,.10) 0,transparent 40%),#F6EBD8;color:#49382D;text-align:center;padding:40px 20px}
.coverInner{max-width:560px;background:#FFF9EF;border:3px double #B85C42;border-radius:14pt;padding:34pt 26pt;box-shadow:0 14pt 34pt rgba(73,56,45,.14)}
.mesaArt{width:min(320px,70%);height:auto;display:block;margin:0 auto 10pt}
.cover h1{font-size:clamp(28pt,6vw,42pt);margin:6pt 0 6pt;line-height:1.12;color:#49382D}
.cover .sub{font-size:14pt;color:#1F6E72;margin:0 0 20pt}
.cover .prep{font-size:11pt;color:#6E5D4B;margin:0}
.cover .treeName{font-size:10.5pt;color:#6E5D4B;margin:18pt 0 0}
.cover .motto{font-size:10pt;font-style:italic;color:#8A6742;margin-top:22pt}
main{max-width:720px;margin:0 auto;padding:28px 22px 10px;background:#FFF9EF;border-left:1px solid #E0CFA8;border-right:1px solid #E0CFA8}
h2.genHead{font-size:19pt;color:#49382D;border-bottom:2px solid #C39743;padding-bottom:6pt;margin:26pt 0 12pt}
h3.genHead{font-size:15pt;color:#49382D;margin:22pt 0 8pt}
.personName{color:#49382D;margin:18pt 0 2pt;font-size:13.5pt}
h2.personName{font-size:20pt}h3.personName{font-size:16pt}h4.personName{font-size:13.5pt}
.vitals{color:#6E5D4B;font-size:11pt;margin:0 0 8pt}
.famLines{font-size:11pt;background:#F7ECD5;border-left:3px solid #287F83;padding:8pt 12pt;border-radius:6pt}
.famLines a{color:#1F6E72;text-decoration:none}
h3{color:#49382D;font-size:12.5pt;margin:16pt 0 6pt}
table.chron{width:100%;border-collapse:collapse;font-size:10.8pt}
table.chron td{border-bottom:1px solid #E7D8B4;padding:5pt 6pt;vertical-align:top}
table.chron td.d{white-space:nowrap;width:120pt;color:#8A6742;font-family:Georgia,serif}
.unc{display:inline-block;font-size:8.5pt;border:1px solid #B08A2E;color:#7A5D14;border-radius:4pt;padding:0 4pt;margin-left:4pt}
.srcRef{color:#6E5D4B;font-size:9pt;display:block;margin-top:2pt}
.gal{display:flex;flex-wrap:wrap;gap:10pt;margin:12pt 0}
.gal figure{margin:0;max-width:240pt}
.gal img{max-width:100%;max-height:230pt;border-radius:6pt;border:1px solid #E0CFA8;box-shadow:0 2pt 8pt rgba(73,56,45,.14)}
.gal figcaption{font-size:9.5pt;color:#6E5D4B;padding-top:3pt}
.docRef{font-size:10.5pt}
blockquote.mem{border-left:3px solid #287F83;margin:10pt 0;padding:6pt 12pt;background:#F4FAF9;font-size:11pt}
blockquote.mem.research{border-left-color:#C39743;background:#FBF3DC}
blockquote.mem p{margin:0 0 4pt}
blockquote.mem cite{color:#8A6742;font-size:9.5pt;font-style:normal}
.srcs{font-size:10.5pt;padding-left:16pt}
.srcs li{margin-bottom:6pt}
.srcs blockquote{margin:4pt 0 0;padding:4pt 10pt;border-left:2px solid #E0CFA8;color:#6E5D4B;font-size:9.8pt}
.quay{color:#8A6742;font-size:9pt}
.qs{font-size:10.8pt;padding-left:16pt}
.qby{color:#8A6742;font-size:9.5pt}
.privNotice{background:#FBF3DC;border:1px solid #C39743;border-radius:6pt;color:#6B5310;font-size:10.5pt;max-width:720px;margin:14px auto;padding:9pt 14pt}
.colophon{max-width:720px;margin:0 auto;padding:14px 22px 40px;color:#8A6742;font-size:9.5pt;text-align:center}
.sect{border-top:2px solid #C39743;margin-top:22pt;padding-top:10pt}
@media print{
  body{background:#fff}
  .cover{min-height:88vh;page-break-after:always;background:#fff}
  .coverInner{box-shadow:none}
  main{max-width:none;padding:0;background:#fff;border:0}
  section.chapter{page-break-inside:auto}
  h2.genHead,h3.genHead{page-break-after:avoid}
  .gal figure,table.chron,blockquote.mem{page-break-inside:avoid}
  .gal img{box-shadow:none}
  .privNotice{background:#fffbe6}
  a{color:inherit}
}
@media(max-width:640px){ .gal{display:block} .gal figure{max-width:100%} }
`;
/* ==== CORE-B-END ==== */
