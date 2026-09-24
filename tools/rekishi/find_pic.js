/* Commons で ファイルを さがす（ライセンスつき） */
const { execFileSync } = require('child_process');
const UA = 'manabi-monster/1.0 (childrens learning app; kota19830730@gmail.com)';
const enc = encodeURIComponent;
function get(url) {
  return execFileSync('curl', ['-s', '--max-time', '40', '-A', UA, url], { maxBuffer: 1 << 26 }).toString();
}
function strip(v) { return String(v || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }

const q = process.argv.slice(2).join(' ');
const j = JSON.parse(get('https://commons.wikimedia.org/w/api.php?action=query&generator=search' +
  '&gsrsearch=' + enc(q) + '&gsrnamespace=6&gsrlimit=14' +
  '&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=320&format=json'));
const pages = (j.query && j.query.pages) || {};
Object.keys(pages).forEach(function (k) {
  const p = pages[k], info = (p.imageinfo || [])[0];
  if (!info) return;
  const m = info.extmetadata || {};
  const lic = strip((m.LicenseShortName || {}).value);
  const by = strip((m.Artist || {}).value).slice(0, 60);
  const ok = /public domain|^pd|cc0|cc by/i.test(lic) && !/nc|nd/i.test(lic);
  console.log((ok ? 'OK ' : '×  ') + p.title.replace(/^File:/, '') + ' | ' + lic + ' | ' + by +
    ' | ' + info.width + 'x' + info.height);
  console.log('    ' + info.thumburl);
});
