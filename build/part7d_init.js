
// ------------------------------------------------------- synthetic sample
const SAMPLE_MEDIA = [
  { name:'Photos/grandpa_williams_portrait.svg', title:'Portrait of Henry Williams (synthetic sample art)',
    svg:'<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b2364"/><stop offset="1" stop-color="#181127"/></linearGradient></defs><rect width="480" height="360" fill="url(#g)"/><circle cx="240" cy="150" r="62" fill="#c9a86c"/><rect x="150" y="225" width="180" height="105" rx="26" fill="#5b3aa8"/><circle cx="240" cy="128" r="58" fill="#d9b87c"/><path d="M195 105 q45 -42 90 0 q-8 -34 -45 -34 q-37 0 -45 34" fill="#3b2f22"/><rect x="196" y="132" width="88" height="9" rx="4" fill="#2b2340" opacity=".8"/><text x="240" y="342" text-anchor="middle" font-family="Georgia,serif" font-size="22" fill="#e8ddfb">Henry Williams · sample portrait</text></svg>' },
  { name:'Photos/family_farm_1948.svg', title:'The family farm, 1948 (synthetic sample art)',
    svg:'<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360"><rect width="480" height="360" fill="#1d2b4f"/><rect y="250" width="480" height="110" fill="#274067"/><rect x="150" y="170" width="180" height="90" fill="#7a5a3a"/><path d="M135 175 L240 95 L345 175 Z" fill="#a8432f"/><rect x="205" y="205" width="34" height="55" fill="#3b2a1c"/><rect x="262" y="205" width="40" height="30" fill="#d9d3c2"/><circle cx="392" cy="60" r="26" fill="#f2d06b"/><path d="M20 260 q60 -18 120 0" stroke="#274067" stroke-width="8" fill="none"/><text x="240" y="340" text-anchor="middle" font-family="Georgia,serif" font-size="20" fill="#e8ddfb">The farm at Willow Creek · sample art</text></svg>' },
  { name:'Documents/marriage_register.svg', title:'Marriage register entry (synthetic sample art)',
    svg:'<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360"><rect width="480" height="360" fill="#2a2136"/><rect x="60" y="30" width="360" height="300" rx="8" fill="#efe6cf"/><rect x="60" y="30" width="360" height="300" rx="8" fill="none" stroke="#8a7448" stroke-width="4"/><text x="240" y="80" text-anchor="middle" font-family="Georgia,serif" font-size="24" fill="#3b2a1c">Marriage Register — 1918</text><line x1="90" y1="100" x2="390" y2="100" stroke="#8a7448" stroke-width="2"/><text x="90" y="140" font-family="Georgia,serif" font-size="16" fill="#3b2a1c">Henry Williams  ·  Edith Marsh</text><text x="90" y="170" font-family="Georgia,serif" font-size="14" fill="#5d4a2e">Married 8 Sep 1918 at Willow Creek</text><text x="90" y="200" font-family="Georgia,serif" font-size="14" fill="#5d4a2e">Witnesses: R. Marsh, L. Whitlock</text><path d="M90 300 q40 -30 80 0 q40 30 80 0 q40 -30 80 0 q30 22 60 4" stroke="#4a5aa8" stroke-width="3" fill="none"/><text x="240" y="345" text-anchor="middle" font-family="Georgia,serif" font-size="16" fill="#e8ddfb">Synthetic sample document</text></svg>' },
  { name:'Photos/church_baptism.svg', title:'Riverside chapel (synthetic sample art)',
    svg:'<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360"><rect width="480" height="360" fill="#23305a"/><rect x="200" y="120" width="80" height="130" fill="#5b4a72"/><path d="M185 125 L240 60 L295 125 Z" fill="#6c5a86"/><rect x="232" y="200" width="16" height="50" fill="#2a2136"/><circle cx="240" cy="100" r="7" fill="#f2d06b"/><rect y="270" width="480" height="90" fill="#1d2b4f"/><path d="M0 285 q120 -12 240 0 q120 12 240 0" stroke="#55d6ff" stroke-width="4" fill="none" opacity=".5"/><text x="240" y="340" text-anchor="middle" font-family="Georgia,serif" font-size="20" fill="#e8ddfb">Riverside chapel · sample art</text></svg>' }
];
const SAMPLE_GED = `0 HEAD
1 SOUR KAYOCK-SAMPLE
2 NAME Grandmothers voice by Kayock synthetic sample family
2 VERS 1.0
1 GEDC
2 VERS 5.5.1
2 FORM LINEAGE-LINKED
1 CHAR UTF-8
1 NOTE This is a fully synthetic sample family invented for demonstrating
2 CONT the application. Every person, place and date is fictional.
0 @I1@ INDI
1 NAME Henry/Williams/
2 GIVN Henry
2 SURN Williams
1 SEX M
1 BIRT
2 DATE 12 JUN 1893
2 PLAC Willow Creek, Marlow County, England
2 NOTE Born at the farm cottage; the midwife was recorded as Mrs. Hale.
1 DEAT
2 DATE 4 FEB 1971
2 PLAC Riverton
1 OCCU farm hand, later station master
1 RESI
2 DATE 1948
2 PLAC The farm at Willow Creek
2 SOUR @S3@
1 FAMS @F1@
1 FAMC @F3@
1 NOTE @N1@
1 NOTE Grandpa Henry always said the chapel bell rang the day he was born.
1 OBJE @M1@
1 OBJE @M3@
1 OBJE @M2@
0 @I2@ INDI
1 NAME Edith/Marsh/
1 SEX F
1 BIRT
2 DATE ABT 1896
2 PLAC Marlow, England
1 DEAT
2 DATE 30 DEC 1980
1 FAMS @F1@
1 FAMC @F4@
0 @I3@ INDI
1 NAME Thomas/Williams/
1 SEX M
1 BIRT
2 DATE BET 1919 AND 1920
2 PLAC Willow Creek, England
1 OCCU railway clerk
1 FAMS @F2@
1 FAMC @F1@
0 @I4@ INDI
1 NAME Margaret/Williams/
1 SEX F
1 BIRT
2 DATE 22 SEP 1921
2 PLAC Willow Creek, England
1 FAMS @F5@
1 FAMC @F1@
0 @I5@ INDI
1 NAME Susan/Williams/
1 SEX F
1 BIRT
2 DATE JUL 1948
2 PLAC Riverton
1 FAMS @F6@
1 FAMC @F2@
0 @I6@ INDI
1 NAME David/Kay/
1 SEX M
1 BIRT
2 DATE 1946
2 PLAC Riverton
1 FAMS @F6@
0 @I7@ INDI
1 NAME Living/Kay/
1 SEX F
1 BIRT
2 DATE 1972
2 PLAC Riverton
1 FAMC @F6@
0 @I8@ INDI
1 NAME Living/Kay/
1 SEX M
1 BIRT
2 DATE 1974
2 PLAC Eastlake
1 FAMC @F6@
0 @I9@ INDI
1 NAME Abraham/Williams/
1 SEX M
1 BIRT
2 DATE 1868
2 PLAC Marlow County, England
1 DEAT
2 DATE 1934
1 FAMS @F3@
0 @I10@ INDI
1 NAME Constance/Hale/
1 SEX F
1 BIRT
2 DATE 1870
2 PLAC Marlow County, England
1 FAMS @F3@
0 @I11@ INDI
1 NAME Elias/Marsh/
1 SEX M
1 BIRT
2 DATE 1872
1 DEAT
2 DATE 1942
1 FAMS @F4@
0 @I12@ INDI
1 NAME Ruth/Vance/
1 SEX F
1 BIRT
2 DATE 1875
1 FAMS @F4@
0 @I13@ INDI
1 NAME Frank/Osei/
1 SEX M
1 BIRT
2 DATE 1944
2 PLAC Eastlake
1 FAMS @F5@
0 @I14@ INDI
1 NAME Peter/Williams/
1 SEX M
1 BIRT
2 DATE 1950
2 PLAC Riverton
1 FAMC @F2@
0 @I15@ INDI
1 NAME Ada/Williams/
1 SEX F
1 BIRT
2 DATE 1953
2 PLAC Riverton
1 FAMC @F2@
0 @I16@ INDI
1 NAME June/Kay/
1 SEX F
1 BIRT
2 DATE 1998
2 PLAC Eastlake
1 FAMC @F7@
0 @I17@ INDI
1 NAME Sam/Osei/
1 SEX M
1 BIRT
2 DATE 1970
2 PLAC Eastlake
1 FAMS @F7@
0 @I18@ INDI
1 NAME Peter/Williams/
1 BIRT
2 DATE 1950
2 PLAC Riverton
1 FAMC @F2@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
1 CHIL @I4@
1 MARR
2 DATE 8 SEP 1918
2 PLAC Willow Creek parish church
2 SOUR @S1@
3 PAGE register 1918, entry 44
3 QUAY 3
1 NOTE Married at the parish church; the whole village came to the reception at the farm.
1 OBJE @M4@
0 @F2@ FAM
1 HUSB @I3@
1 CHIL @I5@
1 CHIL @I14@
1 CHIL @I15@
1 CHIL @I18@
1 MARR
2 DATE 1947
1 DIV
2 DATE 1956
0 @F3@ FAM
1 HUSB @I9@
1 WIFE @I10@
1 CHIL @I1@
0 @F4@ FAM
1 HUSB @I11@
1 WIFE @I12@
1 CHIL @I2@
0 @F5@ FAM
1 HUSB @I13@
1 WIFE @I4@
1 MARR
2 DATE 1942
0 @F6@ FAM
1 HUSB @I6@
1 WIFE @I5@
1 CHIL @I7@
1 CHIL @I8@
1 MARR
2 DATE 1969
2 PLAC Riverton
0 @F7@ FAM
1 HUSB @I17@
1 CHIL @I16@
1 MARR
2 DATE 1996
0 @N1@ NOTE
1 CONT Henry Williams served at the Willow Creek station for 31 years.
1 CONT He kept a small notebook of every train that ran late — it survives in the family.
0 @S1@ SOUR
1 TITL Willow Creek parish marriage register
1 ABBR WC Marriages
1 AUTH Parish clerk
1 PUBL County records office
1 TEXT Register volume 9. The 1918 marriages were entered by curate T. Bellamy.
1 NOTE Register preserved on microfilm.
0 @S2@ SOUR
1 TITL Riverton railway employment ledger
1 ABBBR missing on purpose for the sample diagnostics
0 @S3@ SOUR
1 TITL Farm auction notice 1948
1 AUTH Marlow County Gazette
1 NOTE Newspaper clipping kept in the family bible.
0 @M1@ OBJE
1 FILE Photos/grandpa_williams_portrait.svg
2 FORM svg
3 TITL Henry Williams portrait
1 TITL Henry Williams portrait (synthetic sample)
0 @M2@ OBJE
1 FILE Photos/family_farm_1948.svg
2 FORM svg
1 TITL The family farm, 1948 (synthetic sample)
0 @M3@ OBJE
1 FILE Documents/marriage_register.svg
2 FORM svg
1 TITL Marriage register entry (synthetic sample)
0 @M4@ OBJE
1 FILE Photos/church_baptism.svg
2 FORM svg
1 TITL Riverside chapel (synthetic sample)
0 TRLR
`;
$('sampleBtn').addEventListener('click', () => {
  fileName = 'Kayock_Sample_Family.ged';
  const enc = new TextEncoder();
  gedBytes = enc.encode(SAMPLE_GED);
  gedText = SAMPLE_GED;
  mediaSession.files = SAMPLE_MEDIA.map((m, i) => {
    const bytes = enc.encode(m.svg);
    return { key:'sample' + i, name:m.name.split('/').pop(), relPath:m.name, size:bytes.length, type:'image/svg+xml', bytes, file:null, title:m.title };
  });
  $('treeTitle').value = 'Williams Family Sample';
  $('spotlightName').value = 'Henry Williams';
  afterFileLoaded(decodeGedBytes(gedBytes));
  log('Sample family loaded (fully synthetic — ' + SAMPLE_MEDIA.length + ' sample images included). Click Parse GED.');
  switchTab('build');
});

// ------------------------------------------------------------- tour/help
const BUILDER_TOUR = [
  ['Welcome to Grandmothers voice by Kayock 2.1.1', 'This offline studio turns a GEDCOM export into explorers your family can actually walk through. Nothing here needs an internet connection, and your original GED file is never modified.'],
  ['Step 1 — Build', 'Drop in a .ged file (or click Load Sample Family), pick a privacy mode, then Parse GED. The generated Family Story Explorer is a single HTML file you can share.'],
  ['Step 2 — Diagnostics', 'After parsing, check this tab: missing references, date conflicts, encoding notes, and a source-quality report showing where evidence is missing. Reports export as Markdown.'],
  ['Step 3 — Media Library', 'Import the photo and document folders that belong to your tree. Files are matched to the media references in the GED by filename; anything unmatched stays a clearly-labelled reference.'],
  ['Step 4 — Refine & Booklet', 'Collect Tree Refinement backups from relatives, merge them with conflict review, generate duplicate suggestions, then print a Family Story Booklet keepsake.'],
  ['You are ready', 'Click Load Sample Family to try everything in one click, or Help anytime. Keyboard: Alt+1…6 for tabs, Alt+P to parse, Alt+T for theme.']
];
let bTourStep = 0;
function showBuilderTour(){ bTourStep = 0; renderBuilderTourStep(); $('tourOverlay').classList.add('show'); }
function renderBuilderTourStep(){
  const [title, text] = BUILDER_TOUR[bTourStep];
  $('tourTitle').textContent = title;
  $('tourText').textContent = text;
  $('tourNextBtn').textContent = bTourStep >= BUILDER_TOUR.length - 1 ? 'Start' : 'Next';
}
function builderTourNext(){ if (bTourStep >= BUILDER_TOUR.length - 1){ $('tourOverlay').classList.remove('show'); try { localStorage.setItem('kayockBuilderTourSeen', '1'); } catch(e){} } else { bTourStep++; renderBuilderTourStep(); } }
$('tourNextBtn').addEventListener('click', builderTourNext);
$('tourSkipBtn').addEventListener('click', () => { $('tourOverlay').classList.remove('show'); try { localStorage.setItem('kayockBuilderTourSeen', '1'); } catch(e){} });
$('helpBtn').addEventListener('click', () => {
  $('helpModalBody').innerHTML = '<h3>Quick guide</h3><ol style="line-height:1.8;color:var(--muted)">' +
    '<li><b>Build</b> — choose a .ged (or Load Sample Family), set privacy + profile, Parse GED, then generate the explorer or vaults.</li>' +
    '<li><b>Diagnostics</b> — review data issues and source coverage; export reports.</li>' +
    '<li><b>Media</b> — import photo/document folders; they attach to GED media references by filename.</li>' +
    '<li><b>Refine</b> — import relatives\u2019 refinement backups, review conflicts, flag duplicates, build the photo checklist and suggested-changes report.</li>' +
    '<li><b>Booklet</b> — generate a printable keepsake for one person, a branch, or a surname.</li></ol>' +
    '<h3>Offline & privacy</h3><p class="footer">This application never contacts the internet. Your GED is opened read-only. Notes are stored only in this browser — export JSON backups to move them. See PRIVACY.md in the project folder.</p>' +
    '<h3>Files it can produce</h3><p class="footer">Interactive HTML explorer (self-contained or with media ZIP) · Obsidian vault ZIP · Logseq vault ZIP · one-file Markdown · parsed JSON · diagnostics & source-quality reports · refinement backups · suggested-changes report · photo checklist · Family Story Booklet HTML.</p>' +
    '<div class="row"><button id="replayTourBtn">Replay the guided introduction</button></div>';
  $('helpModal').classList.add('show');
  $('replayTourBtn').addEventListener('click', () => { $('helpModal').classList.remove('show'); showBuilderTour(); });
});
$('helpCloseBtn').addEventListener('click', () => $('helpModal').classList.remove('show'));
$('helpModal').addEventListener('click', e => { if (e.target === $('helpModal')) $('helpModal').classList.remove('show'); });
$('bookletModal').addEventListener('click', e => { if (e.target === $('bookletModal')) { $('bookletModal').classList.remove('show'); $('bookletFrame').srcdoc = ''; } });
$('lightbox') && 0;
document.addEventListener('keydown', e => {
  if (e.key === 'Escape'){ document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show')); $('tourOverlay').classList.remove('show'); return; }
  if (!e.altKey) return;
  const i = ['1','2','3','4','5','6'].indexOf(e.key);
  if (i >= 0){ e.preventDefault(); switchTab(TABS[i]); }
  else if (e.key === 'p' || e.key === 'P'){ e.preventDefault(); if (!$('parseBtn').disabled) $('parseBtn').click(); }
  else if (e.key === 't' || e.key === 'T'){ e.preventDefault(); themeToggle(); }
});
['privacyMode','privacyLivingAge','privacyStrictNoDates','profileFull','profileFamily'].forEach(id => {
  const el = $(id);
  el.addEventListener('change', () => {
    const p = getPrivacyOpts();
    const noteEl = $('privacyNote');
    if (p.mode === 'full'){ noteEl.style.display = 'none'; }
    else {
      noteEl.style.display = 'block';
      noteEl.className = 'note warn';
      noteEl.textContent = 'Privacy: people are classified as “possibly living” when no death is recorded and their birth (or earliest event) is within ' + p.threshold + ' years' + (p.strictNoDates ? ', or they have no dates at all (strict)' : '') + '. ' + (p.mode === 'exclude' ? 'They are removed from outputs and shown as placeholders so family structure stays readable.' : 'Their dates, places, notes, sources and media are replaced/hidden' + (p.mode === 'redact-names' ? ', and names become initials' : '') + '. Always verify before sharing.');
    }
    updateBookletOptions();
    privacyData = null; // force re-apply
    // v2.1.1: privacy changes must refresh the media library immediately —
    // its rows are privacy-aware (private/unlinked attachments are labelled
    // and excluded from exports). Other tabs render on their own buttons.
    if (parsedData && typeof renderMediaTable === 'function') renderMediaTable();
  });
});
$('embedMedia').addEventListener('change', () => { $('mediaSizeNote').style.display = 'none'; });
$('authorName').value = localStorage.getItem('kayockAuthor') || '';
$('authorName').addEventListener('change', () => localStorage.setItem('kayockAuthor', $('authorName').value.trim()));
$('treeTitle').addEventListener('change', () => { privacyData = null; });
$('spotlightName').addEventListener('change', () => { privacyData = null; });
for (const id of ['includePersonNotes','includeFamilyNotes','includeSourceNotes','includeMedia']) $(id).addEventListener('change', () => { privacyData = null; });
$('versionPill').textContent = 'v' + APP_VERSION + ' · MIT';
themeInit();
setLog('Grandmothers voice by Kayock ' + APP_VERSION + ' ready. Choose a GED file, or click Load Sample Family for a guided try-out.');
if (!localStorage.getItem('kayockBuilderTourSeen')) showBuilderTour();
</script>
</body>
</html>
