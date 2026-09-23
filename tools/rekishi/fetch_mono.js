/* 歴史の「もの・たてもの」と 足りない 人物の 写真を あつめる */
const { execFileSync } = require('child_process');
const fs = require('fs');
const OUT = 'C:/Users/win11/AppData/Local/Temp/claude/c--Users-win11-OneDrive-----------------/452111fa-cd32-4fab-8390-61c2dbd86309/scratchpad/jin/';
fs.mkdirSync(OUT, { recursive: true });
const UA = 'manabi-monster/1.0 (childrens learning app; kota19830730@gmail.com)';
const enc = encodeURIComponent;

/* [id, 画面に 出す 名前, さがす Wikipedia の 記事] */
const LIST = [
  /* 足りなかった 人物 */
  ['takauji', '足利尊氏', '足利尊氏'],
  ['kiyomori', '平清盛', '平清盛'],
  ['kanmu', '桓武天皇', '桓武天皇'],
  /* もの・たてもの */
  ['tateana', 'たて穴住居', '竪穴建物'],
  ['takayuka', '高床倉庫', '高床倉庫'],
  ['kofun', '古ふん', '大仙陵古墳'],
  ['jomondoki', '縄文土器', '縄文土器'],
  ['dotaku', '青銅器（銅たく）', '銅鐸'],
  ['kango', 'ほりや さく', '吉野ヶ里遺跡'],
  ['horyuji', '法隆寺', '法隆寺'],
  ['heijo', '平城京', '平城宮'],
  ['shosoin', '正倉院', '正倉院'],
  ['todaiji', '東大寺の 大仏', '東大寺盧舎那仏像'],
  ['manyoshu', '万葉集', '万葉集'],
  ['kana', 'かな文字', '源氏物語絵巻'],
  ['heian', '平安京', '平安京'],
  ['shinden', 'しんでん造', '寝殿造'],
  ['noh', '能', '能'],
  ['kinkaku', '金閣', '鹿苑寺'],
  ['ginkaku', '銀閣', '慈照寺'],
  ['terakoya', '寺子屋', '寺子屋'],
  ['tokaido', '東海道', '東海道五十三次_(浮世絵)'],
  ['shoin', 'たたみと しょうじ', '書院造'],
  ['buke', '武家諸法度', '武家諸法度'],
  ['kaitai', '解体新書', '解体新書'],
  ['inozu', '伊能図', '大日本沿海輿地全図'],
  ['tomioka', '富岡製糸場', '富岡製糸場'],
  ['tetsudo', '鉄道（明治）', '日本の鉄道開業'],
  ['kenpo', '大日本帝国憲法', '大日本帝国憲法'],
  ['genbaku', '原爆ドーム', '原爆ドーム']
];

function get(url) {
  return execFileSync('curl', ['-s', '--max-time', '30', '-A', UA, url], { maxBuffer: 1 << 26 }).toString();
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
  if (!file) { console.log('NG ' + label + ' … 代表画像なし（' + art + '）'); rows.push({ id: id, label: label, err: 1 }); return; }

  let info = null;
  try {
    const j2 = JSON.parse(get('https://commons.wikimedia.org/w/api.php?action=query&titles=' +
      enc('File:' + file) + '&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=360&format=json'));
    const pages = (j2.query && j2.query.pages) || {};
    Object.keys(pages).forEach(function (k) { info = (pages[k].imageinfo || [])[0]; });
  } catch (e) { }
  if (!info) { console.log('NG ' + label + ' … Commons に ない'); rows.push({ id: id, label: label, err: 1 }); return; }

  const m = info.extmetadata || {};
  const lic = ((m.LicenseShortName || {}).value || '?');
  const ok = /public domain|pd-|cc0/i.test(lic);
  const dest = OUT + id + '.jpg';
  if (ok && info.thumburl) {
    try { execFileSync('curl', ['-s', '--max-time', '60', '-A', UA, '-o', dest, info.thumburl], { maxBuffer: 1 << 26 }); } catch (e) { }
  }
  const size = fs.existsSync(dest) ? Math.round(fs.statSync(dest).size / 1024) : 0;
  rows.push({ id: id, label: label, file: file, lic: lic, ok: ok, size: size });
  console.log((ok ? 'OK ' : '×  ') + label + ' / ' + lic + ' / ' + size + 'KB / ' + file);
});
fs.writeFileSync(OUT + 'mono.json', JSON.stringify(rows, null, 1));
console.log('--- とれた: ' + rows.filter(function (r) { return r.ok && r.size; }).length + ' / ' + LIST.length);
