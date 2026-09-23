const { execFileSync } = require('child_process');
const fs = require('fs');
const SP = 'C:/Users/win11/AppData/Local/Temp/claude/c--Users-win11-OneDrive-----------------/452111fa-cd32-4fab-8390-61c2dbd86309/scratchpad/';
const UA = 'manabi-monster/1.0 (childrens learning app; kota19830730@gmail.com)';

const CAND = [
  'Tokaido1 Nihonbashi.jpg',
  'Hiroshige, Nihonbashi - Morning View.jpg',
  'Hiroshige Nihonbashi.jpg',
  'Tokaido05 Totsuka.jpg',
  'Hiroshige - Kanbara.jpg'
];

CAND.forEach(function (f, i) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&titles=' +
    encodeURIComponent('File:' + f) + '&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=320&format=json';
  let info = null;
  try {
    const j = JSON.parse(execFileSync('curl', ['-s', '--max-time', '25', '-A', UA, url], { maxBuffer: 1 << 26 }).toString());
    const p = (j.query && j.query.pages) || {};
    Object.keys(p).forEach(function (k) { info = (p[k].imageinfo || [])[0]; });
  } catch (e) { }
  if (!info) { console.log('なし  ' + f); return; }
  const m = info.extmetadata || {};
  const lic = String((m.LicenseShortName || {}).value || '').replace(/<[^>]*>/g, '');
  const ok = /public domain|^pd|cc0|cc by/i.test(lic) && !/nc|nd/i.test(lic);
  if (ok) {
    execFileSync('curl', ['-s', '--max-time', '60', '-A', UA, '-o', SP + 'cand/tokaido_' + i + '.jpg', info.thumburl], { maxBuffer: 1 << 26 });
  }
  console.log((ok ? 'OK  ' : '×   ') + lic + '  ' + f);
});
