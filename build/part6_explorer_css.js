const EXPLORER_CSS = `
:root{--bg:#0e0a1a;--panel:#181127;--panel2:#221735;--ink:#f6f0ff;--muted:#cabde1;--line:#3a2a56;--purple:#9d6cff;--magenta:#e879f9;--cyan:#55d6ff;--good:#7df2a6;--warn:#ffd36e;--bad:#ff7d9c;--input:#0d0918}
/* Light — Southwest Heritage (see builder palette notes) */
html[data-theme="light"]{--bg:#F6EBD8;--panel:#FFF9EF;--panel2:#F7ECD5;--ink:#49382D;--muted:#6E5D4B;--line:#E0CFA8;--purple:#287F83;--magenta:#B85C42;--cyan:#1E6E72;--good:#4E6B55;--warn:#7A5D14;--bad:#A6402E;--input:#FFFDF6;--ochre:#C39743;--terra:#C47757;--sage:#718878;--midnight:#20565B}
*{box-sizing:border-box}
html{scrollbar-color:var(--line) transparent}
body{margin:0;font-family:"Segoe UI",Roboto,Arial,sans-serif;background:var(--bg);color:var(--ink);font-size:15px;line-height:1.5}
body::before{content:"";position:fixed;inset:0;z-index:-1;background:radial-gradient(circle at top left,rgba(157,108,255,.16) 0,transparent 44%),radial-gradient(circle at 85% 8%,rgba(232,121,249,.07) 0,transparent 36%)}
html[data-theme="light"] body::before{background:radial-gradient(circle at top left,rgba(195,151,67,.16) 0,transparent 42%),radial-gradient(circle at 85% 6%,rgba(40,127,131,.10) 0,transparent 38%),radial-gradient(circle at 50% 115%,rgba(196,119,87,.12) 0,transparent 42%)}
a{color:var(--purple)}
h1,h2,h3{color:var(--ink)}
header{position:sticky;top:0;z-index:20;padding:12px 16px;border-bottom:1px solid var(--line);background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(10px)}
.hRow{display:flex;align-items:center;gap:12px;flex-wrap:wrap;max-width:1400px;margin:0 auto}
.hTitle{font-size:20px;font-weight:800;margin:0}
.hMeta{color:var(--muted);font-size:12.5px;flex:1;min-width:160px}
.skipLink{position:absolute;left:-999px;top:0;background:var(--purple);color:#fff;padding:8px 14px;border-radius:0 0 10px 0;z-index:99}
.skipLink:focus{left:0}
.tabs{display:flex;gap:5px;flex-wrap:wrap}
.tabs button{border:1px solid var(--line);background:var(--panel);color:var(--muted);border-radius:10px;padding:7px 12px;font-weight:600;cursor:pointer;font-size:13.5px}
.tabs button[aria-selected="true"]{background:linear-gradient(135deg,var(--purple),var(--magenta));color:#12081f;border-color:transparent}
.layout{display:grid;grid-template-columns:330px minmax(0,1fr);gap:14px;max-width:1400px;margin:14px auto;padding:0 14px}
.side,.main{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:14px}
.side{position:sticky;top:112px;height:calc(100vh - 130px);overflow:auto}
.main{min-height:70vh}
@media(max-width:880px){.layout{grid-template-columns:1fr}.side{position:relative;top:0;height:auto;max-height:46vh}}
.search{width:100%;padding:11px;border-radius:11px;background:var(--input);color:var(--ink);border:1px solid var(--line);font:inherit}
button,.btn{display:inline-block;border:1px solid var(--line);border-radius:10px;padding:8px 12px;background:var(--panel2);color:var(--ink);cursor:pointer;text-decoration:none;margin:2px;font-size:13.5px;font-weight:600}
button.primary,.btn.primary{background:linear-gradient(135deg,var(--purple),var(--magenta));color:#12081f;font-weight:800;border:0}
button:focus-visible,.btn:focus-visible,.result:focus-visible,[tabindex]:focus-visible{outline:2px solid var(--cyan);outline-offset:2px}
.result{padding:8px 9px;border-bottom:1px solid var(--line);cursor:pointer;border-radius:8px}
.result:hover,.result.hl{background:var(--panel2)}
.result b{font-size:14px}
.muted{color:var(--muted)}
.tiny{font-size:12px;color:var(--muted)}
.personTitle{font-size:clamp(26px,4.6vw,46px);margin:0 0 6px;line-height:1.1}
.facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:13px 0}
@media(max-width:640px){.facts{grid-template-columns:1fr}}
.fact{background:var(--input);border:1px solid var(--line);border-radius:12px;padding:11px}
.fact b{display:block;color:var(--ink);margin-bottom:3px;font-size:12px;text-transform:uppercase;letter-spacing:.06em}
.section{margin-top:16px;padding-top:12px;border-top:1px solid var(--line)}
.section h2{font-size:19px;margin:0 0 10px}
.relGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:9px}
.relBox{background:var(--input);border:1px solid var(--line);border-radius:12px;padding:11px}
.relBox h3{margin:0 0 8px;color:var(--ink);font-size:15px}
.noteBox{white-space:pre-wrap;background:var(--input);border:1px solid var(--line);border-radius:12px;padding:11px;margin:8px 0;line-height:1.5;max-height:340px;overflow:auto}
.event{background:var(--input);border-left:4px solid var(--cyan);border-radius:10px;padding:10px 12px;margin:8px 0}
.event b{color:var(--ink)}
.event .evDate{font-family:Consolas,Menlo,monospace;font-size:12.5px;color:var(--muted)}
.uncertain{display:inline-block;font-size:10.5px;border:1px solid var(--warn);color:var(--warn);border-radius:6px;padding:0 5px;margin-left:6px}
.event.srcB{border-left-color:var(--warn)}
.event.mediaB{border-left-color:var(--magenta)}
.galleryGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}
.galleryGrid figure{margin:0;background:var(--input);border:1px solid var(--line);border-radius:12px;overflow:hidden}
.galleryGrid img,.galleryGrid video{width:100%;height:118px;object-fit:cover;display:block;background:var(--panel2)}
.galleryGrid figcaption{font-size:11.5px;color:var(--muted);padding:6px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mediaPlaceholder{height:118px;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:26px;background:var(--panel2)}
textarea,input[type=text],input[type=search],select{width:100%;background:var(--input);border:1px solid var(--line);color:var(--ink);border-radius:11px;padding:10px;font:inherit}
textarea{min-height:84px;resize:vertical}
.check{display:inline-flex;gap:6px;align-items:center;margin:6px 12px 6px 0;color:var(--muted)}
.check input{accent-color:var(--purple)}
.toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0}
.kbd{font-family:Consolas,Menlo,monospace;background:var(--input);border:1px solid var(--line);padding:1px 6px;border-radius:6px;font-size:12px}
.path{font-size:13px;color:var(--muted);margin:6px 0}
.empty{color:var(--muted);font-style:italic}
.badge{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:2px 9px;font-size:11.5px;margin-right:4px}
.badge.err{border-color:var(--bad);color:var(--bad)}
.badge.warn{border-color:var(--warn);color:var(--warn)}
.badge.info{border-color:var(--cyan);color:var(--cyan)}
.badge.good{border-color:var(--good);color:var(--good)}
.treeWrap{border:1px solid var(--line);border-radius:12px;background:var(--input);overflow:hidden;position:relative}
.treeWrap svg{display:block;cursor:grab;touch-action:none}
.treeWrap svg.panning{cursor:grabbing}
.treeNode rect{fill:var(--panel2);stroke:var(--line)}
.treeNode.selected rect{stroke:var(--magenta);stroke-width:2.5;fill:rgba(157,108,255,.20)}
.treeNode.living rect{stroke-dasharray:4 3}
.treeNode text{fill:var(--ink);font-size:11px;pointer-events:none}
.treeNode .years{fill:var(--muted);font-size:10px}
.treeNode{cursor:pointer}
.treeNode:focus{outline:none}
.treeNode:focus rect{stroke:var(--cyan)}
.linkLine{stroke:var(--purple);fill:none;stroke-width:1.4;opacity:.6}
.spouseLine{stroke:var(--magenta);stroke-dasharray:3 3;fill:none;stroke-width:1.3;opacity:.7}
.tlGroup{margin:10px 0}
.tlDecade{font-size:13px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;margin-top:14px}
.tlYear{font-size:16px;color:var(--purple);font-weight:800;border-bottom:1px solid var(--line);padding:5px 2px;margin-top:8px}
.tlItem{display:grid;grid-template-columns:auto 1fr;gap:10px;padding:7px 2px;border-bottom:1px dashed var(--line);cursor:pointer;align-items:baseline}
.tlItem:hover{background:var(--panel2)}
.tlDate{font-family:Consolas,Menlo,monospace;font-size:12px;color:var(--muted);white-space:nowrap}
.placeRow{display:flex;gap:10px;align-items:baseline;padding:8px 2px;border-bottom:1px dashed var(--line);cursor:pointer;flex-wrap:wrap}
.placeRow:hover{background:var(--panel2)}
.placeName{font-weight:700;min-width:200px}
.migStep{display:grid;grid-template-columns:auto 1fr;gap:12px;padding:6px 0;position:relative}
.migStep::before{content:"";position:absolute;left:11px;top:26px;bottom:-6px;width:2px;background:var(--purple);opacity:.5}
.migStep:last-child::before{display:none}
.migDot{width:22px;height:22px;border-radius:50%;border:2px solid var(--purple);display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--purple);flex:none;background:var(--panel2)}
.modal{position:fixed;inset:0;background:rgba(5,2,12,.66);display:none;align-items:center;justify-content:center;z-index:60;padding:16px}
.modal.show{display:flex}
.modalBox{background:var(--panel);border:1px solid var(--line);border-radius:16px;max-width:880px;width:100%;max-height:88vh;display:flex;flex-direction:column}
.modalHead{display:flex;align-items:center;gap:10px;padding:13px 15px;border-bottom:1px solid var(--line)}
.modalHead h2{margin:0;font-size:17px;flex:1}
.modalBody{padding:15px;overflow:auto}
.toast{position:fixed;bottom:14px;left:50%;transform:translateX(-50%);background:var(--panel2);border:1px solid var(--line);color:var(--ink);border-radius:11px;padding:9px 15px;font-size:13px;opacity:0;pointer-events:none;transition:opacity .25s;z-index:70;max-width:88vw}
.toast.show{opacity:1}
.pill{display:inline-block;border:1px solid var(--line);background:var(--panel2);color:var(--muted);border-radius:999px;padding:4px 10px;font-size:11.5px;margin:2px}
.privNote{border-left:4px solid var(--cyan);padding:9px 12px;background:rgba(85,214,255,.08);border-radius:10px;color:var(--muted);font-size:13px;margin:10px 0}
.conflictCard{border:1px solid var(--line);border-radius:12px;padding:11px;margin:10px 0;background:var(--input)}
table.data{width:100%;border-collapse:collapse;font-size:12.5px;margin:8px 0}
table.data th,table.data td{border:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top;word-break:break-word}
table.data th{background:var(--panel2)}
/* ---------- Southwest Heritage light-theme component styling ---------- */
html[data-theme="light"] header{background:color-mix(in srgb,var(--bg) 88%,transparent);border-bottom:2px solid var(--ochre)}
html[data-theme="light"] .tabs button[aria-selected="true"]{color:#fff}
html[data-theme="light"] button.primary,.btn.primary{color:#fff}
html[data-theme="light"] .treeNode.selected rect{fill:rgba(40,127,131,.22);stroke:#1F6E72}
html[data-theme="light"] .treeNode rect{fill:var(--panel2);stroke:#D8C397}
html[data-theme="light"] .treeWrap{border-color:#E4D2AC}
html[data-theme="light"] .relBox,html[data-theme="light"] .fact,html[data-theme="light"] .noteBox,html[data-theme="light"] .event{background:var(--input);border-color:#E4D2AC}
html[data-theme="light"] .event.srcB{border-left-color:var(--ochre)}
html[data-theme="light"] .event.mediaB{border-left-color:var(--magenta)}
html[data-theme="light"] .privNote{background:rgba(40,127,131,.09)}
html[data-theme="light"] .mediaPlaceholder,html[data-theme="light"] .galleryGrid img,html[data-theme="light"] .galleryGrid video{background:var(--panel2)}
html[data-theme="light"] .result:hover,html[data-theme="light"] .result.hl,html[data-theme="light"] .tlItem:hover,html[data-theme="light"] .placeRow:hover{background:#F3E3BC}
html[data-theme="light"] .tlYear{color:#1F6E72}
html[data-theme="light"] .uncertain{border-color:#7A5D14;color:#7A5D14}
html[data-theme="light"] ::selection{background:rgba(195,151,67,.45)}
/* reduced motion: honour user preference in both themes */
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}
}
`;
