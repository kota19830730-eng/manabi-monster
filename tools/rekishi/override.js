const { execFileSync } = require('child_process');
const fs = require('fs');
const OUT = 'C:/Users/win11/AppData/Local/Temp/claude/c--Users-win11-OneDrive-----------------/452111fa-cd32-4fab-8390-61c2dbd86309/scratchpad/jin/';
const UA = 'manabi-monster/1.0 (childrens learning app; kota19830730@gmail.com)';

const FIX = [
  ['nobunaga', '織田信長', 'Oda-Nobunaga.jpg'],
  ['hideyoshi', '豊臣秀吉', 'Toyotomi Hideyoshi.jpg'],
  ['ieyasu', '徳川家康', 'Shogun-Tokugawa-Ieyasu.png'],
  ['ieyasu_b', '徳川家康（候補2）', 'Tokugawa Ieyasu2.JPG']
];

FIX.forEach(function (f) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&titles=' +
    encodeURIComponent('File:' + f[2]) +
    '&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=360&format=json';
  let info = null;
  try {
    const j = JSON.parse(execFileSync('curl', ['-s', '--max-time', '30', '-A', UA, url], { maxBuffer: 1 << 26 }).toString());
    const p = (j.query && j.query.pages) || {};
    Object.keys(p).forEach(function (k) { info = (p[k].imageinfo || [])[0]; });
  } catch (e) { }
  if (!info) { console.log('NG ' + f[1] + ' … 見つからない'); return; }
  const lic = ((info.extmetadata || {}).LicenseShortName || {}).value || '?';
  const ok = /public domain|pd-|cc0/i.test(lic);
  const dest = OUT + f[0] + '.jpg';
  if (ok && info.thumburl) {
    execFileSync('curl', ['-s', '--max-time', '60', '-A', UA, '-o', dest, info.thumburl], { maxBuffer: 1 << 26 });
  }
  const size = fs.existsSync(dest) ? Math.round(fs.statSync(dest).size / 1024) : 0;
  console.log((ok ? 'OK ' : '×  ') + f[1] + ' / ' + lic + ' / ' + size + 'KB / ' + f[2]);
});
