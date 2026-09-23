/* 弱かった 写真を 差しかえる。候補を いくつか 取って 見くらべる */
const { execFileSync } = require('child_process');
const fs = require('fs');
const OUT = 'C:/Users/win11/AppData/Local/Temp/claude/c--Users-win11-OneDrive-----------------/452111fa-cd32-4fab-8390-61c2dbd86309/scratchpad/cand/';
fs.mkdirSync(OUT, { recursive: true });
const UA = 'manabi-monster/1.0 (childrens learning app; kota19830730@gmail.com)';

const CAND = [
  ['nobunaga_a', 'Odanobunaga.jpg'],
  ['nobunaga_b', 'Oda Nobunaga by Kano Eitoku (Daitokuji).jpg'],
  ['nobunaga_c', 'Oda Nobunaga Portrait Sanpoji Yamagata.png'],
  ['daibutsu_a', 'Todaiji Daibutsu.jpg'],
  ['daibutsu_b', 'Nara Todaiji Daibutsu.jpg'],
  ['daibutsu_c', 'Buddha of Todaiji.jpg'],
  ['daibutsu_d', 'Daibutsu Todai-ji.JPG'],
  ['heian_a', 'Heiankyo model.jpg'],
  ['heian_b', 'Suzakumon Heijokyo.jpg'],
  ['heian_c', 'Kyoto Imperial Palace Shishinden.jpg'],
  ['kofun_a', 'Daisenryo Kofun.jpg'],
  ['kofun_b', 'Nintoku-tenno-ryo Kofun.jpg'],
  ['kofun_c', 'Gosashi Kofun.jpg'],
  ['kango_a', 'Yoshinogari site.jpg'],
  ['kango_b', 'Yoshinogari-iseki kangou.JPG']
];

CAND.forEach(function (c) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&titles=' +
    encodeURIComponent('File:' + c[1]) + '&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=320&format=json';
  let info = null;
  try {
    const j = JSON.parse(execFileSync('curl', ['-s', '--max-time', '25', '-A', UA, url], { maxBuffer: 1 << 26 }).toString());
    const p = (j.query && j.query.pages) || {};
    Object.keys(p).forEach(function (k) { info = (p[k].imageinfo || [])[0]; });
  } catch (e) { }
  if (!info) { console.log('なし  ' + c[0] + '  ' + c[1]); return; }
  const m = info.extmetadata || {};
  const lic = String((m.LicenseShortName || {}).value || '').replace(/<[^>]*>/g, '');
  const art = String((m.Artist || {}).value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 45);
  const ok = /public domain|^pd|cc0|cc by/i.test(lic) && !/nc|nd/i.test(lic);
  if (ok && info.thumburl) {
    try { execFileSync('curl', ['-s', '--max-time', '60', '-A', UA, '-o', OUT + c[0] + '.jpg', info.thumburl], { maxBuffer: 1 << 26 }); } catch (e) { }
  }
  console.log((ok ? 'OK  ' : '×   ') + c[0] + '  ' + lic + '  ' + art);
});
