/* 作業ツリーに 別の セッションの 作りかけが 混ざって いる ときに、
   **自分の hunk だけ**を stage する 道具（v9.4 で 作った）。

   使い方:
     node tools/mine2.js         … 分けられるか 見るだけ
     node tools/mine2.js apply   … git apply --cached で stage する

   MINE / THEIRS の 印は **その ときの 作業に 合わせて 書きかえる**。
   混ざった hunk が 1つでも あれば 止まる（手で 分ける こと）。
*/
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO = 'c:/Users/win11/OneDrive/デスクトップ/こどもアプリ作業場/manabi-quest';
const OUT = __dirname;

// v9.4（私）の 印 と v9.0 カプセル（相手）の 印
const MINE = [
  'HD（v9.4）', 'renderHD', 'MAT_ID', 'function grain', "MATS = [",
  'const MAT = {', 'function gearMat', 'mat: MAT.', 'mat: gearMat', "mat: 'metal'", "mat: 'white'",
  'hd: 2', 'hdCrop', ':hd2', 'gear:hd2:', 'face:hd2:', 'bodyc:hd2:',
  '.hero__img { width: 84px', 'shadow--hero', 'max-width: 184px', '.cutin__hero { width: 92px',
  '主人公は 76 → 88px', 'left: 14px; bottom: 62px'
];
const THEIRS = [
  'オーロラ', 'カプセル', 'aurora', 'Aurora', 'capsule', 'Capsule', 'gearAura', 'is-gearaura',
  'AURORA_POWER', 'hasAuroraSet', 'capsuleParts', 'cap:'
];

const FILES = ['js/core/pixel.js', 'js/content/hero.js', 'css/style.css'];

let bad = 0;
const patches = [];
FILES.forEach(function (f) {
  const diff = execSync('git diff -U3 -- ' + f, { cwd: REPO, maxBuffer: 1 << 26 }).toString();
  if (!diff.trim()) { console.log('（差分なし）' + f); return; }
  const lines = diff.split('\n');
  const head = [];
  const hunks = [];
  let cur = null;
  lines.forEach(function (l) {
    if (l.indexOf('@@') === 0) { cur = [l]; hunks.push(cur); return; }
    if (cur) cur.push(l); else head.push(l);
  });
  let mine = 0, theirs = 0;
  const keep = hunks.filter(function (h) {
    const add = h.filter(function (l) { return l[0] === '+' || l[0] === '-'; }).join('\n');
    const isMine = MINE.some(function (k) { return add.indexOf(k) >= 0; });
    const isTheirs = THEIRS.some(function (k) { return add.indexOf(k) >= 0; });
    if (isMine && isTheirs) { console.log('!! 混ざり ' + f + ' ' + h[0]); bad++; return false; }
    if (isMine) { mine++; return true; }
    if (isTheirs) { theirs++; return false; }
    console.log('?? どちらとも つかない ' + f + ' ' + h[0]);
    bad++;
    return false;
  });
  console.log(f + ' … 自分 ' + mine + ' / 相手 ' + theirs + ' / ぜんぶ ' + hunks.length);
  if (keep.length) patches.push(head.concat(keep.map(function (h) { return h.join('\n'); })).join('\n'));
});

if (bad) { console.log('分けられない hunk が ' + bad + ' こ ある。手で 見る こと'); process.exit(1); }

const file = path.join(OUT, 'mine.patch');
fs.writeFileSync(file, patches.join('\n').replace(/\n+$/, '') + '\n');
console.log('→ ' + file);

if (process.argv[2] === 'apply') {
  execSync('git apply --cached "' + file + '"', { cwd: REPO });
  console.log('stage しました');
}
