// extracts the sample GED + sample media from the app source (single source of truth)
const fs = require('fs');
const path = require('path');
// Project root derived from this script's location (build/ folder's parent).
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'Grandmothers_Voice_by_Kayock.html'), 'utf8');
// sample GED lives between the markers below
const gedStart = html.indexOf("const SAMPLE_GED = `") + "const SAMPLE_GED = `".length;
const gedEnd = html.indexOf("`;", gedStart);
const ged = html.slice(gedStart, gedEnd);
fs.writeFileSync(path.join(ROOT, 'samples', 'Kayock_Sample_Family.ged'), ged);
console.log('sample ged:', ged.length, 'chars');
// sample media: parse the SAMPLE_MEDIA array by locating each svg literal
const mediaStart = html.indexOf('const SAMPLE_MEDIA = [');
const mediaEnd = html.indexOf('];', mediaStart);
const mediaSrc = html.slice(mediaStart, mediaEnd);
const re = /name:'([^']+)', title:'([^']*)',\s*\n\s*svg:'((?:[^'\\]|\\.)*)'/g;
let m, n = 0;
while ((m = re.exec(mediaSrc)) !== null){
  const svg = m[3].replace(/\\'/g, "'");
  fs.writeFileSync(path.join(ROOT, 'samples', 'media', m[1].split('/').pop()), svg);
  console.log('sample media:', m[1].split('/').pop(), svg.length, 'chars');
  n++;
}
console.log('media count:', n);
