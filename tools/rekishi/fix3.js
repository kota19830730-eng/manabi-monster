/* Commons を さがして 使える 写真を 取る（PDF などは のぞく） */
const { execFileSync } = require('child_process');
const fs = require('fs');
const OUT = 'C:/Users/win11/AppData/Local/Temp/claude/c--Users-win11-OneDrive-----------------/452111fa-cd32-4fab-8390-61c2dbd86309/scratchpad/cand/';
fs.mkdirSync(OUT, { recursive: true });
const UA = 'manabi-monster/1.0 (childrens learning app; kota19830730@gmail.com)';

const JOBS = [
  ['kofun', 'Daisen Kofun aerial'],
  ['heian', 'Heian Kyoto Sujakumon reconstruction'],
  ['kango', 'Yoshinogari moat palisade'],
  ['buke', 'Buke shohatto document']
];

function get(url) {
  return execFileSync('curl', ['-s', '--max-time', '30', '-A', UA, url], { maxBuffer: 1 << 26 }).toString();
}

JOBS.forEach(function (job) {
  const id = job[0], q = job[1];
  let j = null;
  try {
    j = JSON.parse(get('https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=' +
      encodeURIComponent(q) + '&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=320&format=json'));
  } catch (e) { }
  const pages = (j && j.query && j.query.pages) || {};
  let n = 0;
  console.log('=== ' + id + ' （' + q + '） ===');
  Object.keys(pages).forEach(function (k) {
    const pg = pages[k], ii = (pg.imageinfo || [])[0];
    if (!ii) return;
    if (!/\.(jpg|jpeg|png)$/i.test(pg.title)) return;
    const m = ii.extmetadata || {};
    const lic = String((m.LicenseShortName || {}).value || '').replace(/<[^>]*>/g, '');
    const art = String((m.Artist || {}).value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
    const ok = /public domain|^pd|cc0|cc by/i.test(lic) && !/nc|nd/i.test(lic);
    if (!ok || n >= 3) { console.log('   skip ' + lic + ' ' + pg.title.slice(0, 55)); return; }
    n++;
    const dest = OUT + id + '_' + n + '.jpg';
    try { execFileSync('curl', ['-s', '--max-time', '60', '-A', UA, '-o', dest, ii.thumburl], { maxBuffer: 1 << 26 }); } catch (e) { }
    console.log('   OK' + n + ' ' + lic + ' / ' + art + ' / ' + pg.title.slice(0, 55));
  });
});
