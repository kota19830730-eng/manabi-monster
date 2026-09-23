/* 歴史の 人物の 肖像を Wikimedia から あつめる（ライセンスを かならず 見る） */
const { execFileSync } = require('child_process');
const fs = require('fs');
const OUT = 'C:/Users/win11/AppData/Local/Temp/claude/c--Users-win11-OneDrive-----------------/452111fa-cd32-4fab-8390-61c2dbd86309/scratchpad/jin/';
fs.mkdirSync(OUT, { recursive: true });

const UA = 'manabi-monster/1.0 (childrens learning app; kota19830730@gmail.com)';

const PEOPLE = [
  ['shotoku', '聖徳太子'], ['tenji', '中大兄皇子'], ['shomu', '聖武天皇'],
  ['michinaga', '藤原道長'], ['murasaki', '紫式部'], ['sei', '清少納言'],
  ['yoritomo', '源頼朝'], ['yoshimitsu', '足利義満'], ['yoshimasa', '足利義政'],
  ['nobunaga', '織田信長'], ['hideyoshi', '豊臣秀吉'], ['ieyasu', '徳川家康'],
  ['genpaku', '杉田玄白'], ['norinaga', '本居宣長'], ['tadataka', '伊能忠敬'],
  ['hiroshige', '歌川広重'], ['itagaki', '板垣退助'], ['hirobumi', '伊藤博文']
];

function get(url) {
  return execFileSync('curl', ['-s', '--max-time', '30', '-A', UA, url], { maxBuffer: 1 << 26 }).toString();
}
function getBin(url, dest) {
  execFileSync('curl', ['-s', '--max-time', '60', '-A', UA, '-o', dest, url], { maxBuffer: 1 << 26 });
}
const enc = encodeURIComponent;

const rows = [];
PEOPLE.forEach(function (p) {
  const id = p[0], name = p[1];
  let file = null;
  try {
    const j = JSON.parse(get('https://ja.wikipedia.org/w/api.php?action=query&titles=' + enc(name) +
      '&prop=pageimages&piprop=name&format=json&redirects=1'));
    const pages = (j.query && j.query.pages) || {};
    Object.keys(pages).forEach(function (k) { if (pages[k].pageimage) file = pages[k].pageimage; });
  } catch (e) { }
  if (!file) { rows.push({ id: id, name: name, err: '画像が 見つからない' }); return; }

  let info = null;
  try {
    const j2 = JSON.parse(get('https://commons.wikimedia.org/w/api.php?action=query&titles=' +
      enc('File:' + file) + '&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=360&format=json'));
    const pages = (j2.query && j2.query.pages) || {};
    Object.keys(pages).forEach(function (k) { info = (pages[k].imageinfo || [])[0]; });
  } catch (e) { }
  if (!info) { rows.push({ id: id, name: name, file: file, err: 'Commons に ない' }); return; }

  const m = info.extmetadata || {};
  const lic = ((m.LicenseShortName || {}).value || '?');
  const artist = ((m.Artist || {}).value || '').replace(/<[^>]*>/g, '').trim().slice(0, 60);
  const ok = /public domain|pd-|cc0/i.test(lic);
  const ext = (file.match(/\.(jpe?g|png)$/i) || [, 'jpg'])[1].toLowerCase();
  const dest = OUT + id + '.' + (ext === 'jpeg' ? 'jpg' : ext);
  if (ok && info.thumburl) {
    try { getBin(info.thumburl, dest); } catch (e) { }
  }
  const size = fs.existsSync(dest) ? fs.statSync(dest).size : 0;
  rows.push({ id: id, name: name, file: file, lic: lic, artist: artist, ok: ok, dest: dest, size: size,
    w: info.width, h: info.height });
});

fs.writeFileSync(OUT + 'list.json', JSON.stringify(rows, null, 1));
rows.forEach(function (r) {
  if (r.err) { console.log('NG ' + r.name + ' … ' + r.err); return; }
  console.log((r.ok ? 'OK ' : '×  ') + r.name.padEnd(6, '　') + ' ' + r.lic +
    ' / ' + Math.round(r.size / 1024) + 'KB / ' + r.w + 'x' + r.h + ' / ' + r.file);
});
