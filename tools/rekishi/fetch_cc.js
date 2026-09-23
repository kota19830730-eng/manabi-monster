/* CC BY / CC BY-SA の 写真も 取る（作者名と ライセンスを かならず ひかえる＝出典ページに 出す） */
const { execFileSync } = require('child_process');
const fs = require('fs');
const OUT = 'C:/Users/win11/AppData/Local/Temp/claude/c--Users-win11-OneDrive-----------------/452111fa-cd32-4fab-8390-61c2dbd86309/scratchpad/jin/';
const UA = 'manabi-monster/1.0 (childrens learning app; kota19830730@gmail.com)';
const enc = encodeURIComponent;

const LIST = [
  ['kofun', '古ふん', '大仙陵古墳'],
  ['dotaku', '青銅器（銅たく）', '銅鐸'],
  ['horyuji', '法隆寺', '法隆寺'],
  ['heijo', '平城京', '平城宮'],
  ['shosoin', '正倉院', '正倉院'],
  ['todaiji', '東大寺の 大仏', '東大寺盧舎那仏像'],
  ['manyoshu', '万葉集', '万葉集'],
  ['heian', '平安京', '平安京'],
  ['shinden', 'しんでん造', '寝殿造'],
  ['kinkaku', '金閣', '鹿苑寺'],
  ['ginkaku', '銀閣', '慈照寺'],
  ['tokaido', '東海道', '東海道五十三次_(浮世絵)'],
  ['shoin', 'たたみと しょうじ', '書院造'],
  ['kenpo', '大日本帝国憲法', '大日本帝国憲法'],
  ['genbaku', '原爆ドーム', '原爆ドーム']
];

function get(url) {
  return execFileSync('curl', ['-s', '--max-time', '30', '-A', UA, url], { maxBuffer: 1 << 26 }).toString();
}
function strip(v) {
  return String(v || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

const rows = [];
LIST.forEach(function (p) {
  const id = p[0], label = p[1], art = p[2];
  let file = null;
  try {
    const j = JSON.parse(get('https://ja.wikipedia.org/w/api.php?action=query&titles=' + enc(art) +
      '&prop=pageimages&piprop=name&format=json&redirects=1'));
    const pages = (j.query && j.query.pages) || {};
    Object.keys(pages).forEach(function (k) { if (pages[k].pageimage) file = pages[k].pageimage; });
  } catch (e) { }
  if (!file) { console.log('NG ' + label); return; }

  let info = null;
  try {
    const j2 = JSON.parse(get('https://commons.wikimedia.org/w/api.php?action=query&titles=' +
      enc('File:' + file) + '&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=360&format=json'));
    const pages = (j2.query && j2.query.pages) || {};
    Object.keys(pages).forEach(function (k) { info = (pages[k].imageinfo || [])[0]; });
  } catch (e) { }
  if (!info) { console.log('NG ' + label + ' … Commons に ない'); return; }

  const m = info.extmetadata || {};
  const lic = strip((m.LicenseShortName || {}).value);
  const artist = strip((m.Artist || {}).value).slice(0, 70);
  /* つかって よい ライセンス（出典を 書く のが 条件の ものを ふくむ） */
  const ok = /public domain|^pd|cc0|cc by/i.test(lic) && !/nc|nd/i.test(lic);
  const dest = OUT + id + '.jpg';
  if (ok && info.thumburl) {
    try { execFileSync('curl', ['-s', '--max-time', '60', '-A', UA, '-o', dest, info.thumburl], { maxBuffer: 1 << 26 }); } catch (e) { }
  }
  const size = fs.existsSync(dest) ? Math.round(fs.statSync(dest).size / 1024) : 0;
  rows.push({ id: id, label: label, file: file, lic: lic, artist: artist, ok: ok, size: size,
    page: 'https://commons.wikimedia.org/wiki/File:' + file.replace(/ /g, '_') });
  console.log((ok ? 'OK ' : '×  ') + label + ' / ' + lic + ' / ' + size + 'KB / さくしゃ: ' + (artist || '—'));
});
fs.writeFileSync(OUT + 'cc.json', JSON.stringify(rows, null, 1));
console.log('--- とれた: ' + rows.filter(function (r) { return r.ok && r.size; }).length + ' / ' + LIST.length);
