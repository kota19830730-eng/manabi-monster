/* ファイル名を さして 320px の thumb を 取る（ライセンスも 出す） */
const { execFileSync } = require('child_process');
const fs = require('fs');
const UA = 'manabi-monster/1.0 (childrens learning app; kota19830730@gmail.com)';
const enc = encodeURIComponent;
const OUT = process.cwd().replace(/\\/g, '/') + '/cand/';   /* 呼んだ ところの cand/ に 落とす */
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);
function get(url) {
  return execFileSync('curl', ['-s', '--max-time', '40', '-A', UA, url], { maxBuffer: 1 << 26 }).toString();
}
function strip(v) { return String(v || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }

const args = process.argv.slice(2); /* name=File.jpg の ならび */
args.forEach(function (a) {
  const i = a.indexOf('=');
  const name = a.slice(0, i), file = a.slice(i + 1);
  const j = JSON.parse(get('https://commons.wikimedia.org/w/api.php?action=query&titles=' +
    enc('File:' + file) + '&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=400&format=json'));
  const pages = (j.query && j.query.pages) || {};
  let info = null;
  Object.keys(pages).forEach(function (k) { info = (pages[k].imageinfo || [])[0]; });
  if (!info) { console.log('NG ' + name); return; }
  const m = info.extmetadata || {};
  const lic = strip((m.LicenseShortName || {}).value);
  const by = strip((m.Artist || {}).value).slice(0, 70);
  const dest = OUT + name + '.jpg';
  execFileSync('curl', ['-s', '--max-time', '60', '-A', UA, '-o', dest, info.thumburl], { maxBuffer: 1 << 26 });
  console.log(name + ' | ' + lic + ' | ' + by + ' | ' + Math.round(fs.statSync(dest).size / 1024) + 'KB');
});
