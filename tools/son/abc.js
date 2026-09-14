/* ABC3きょうだいを 1体に する（v13.21）

   むかし：べつべつの 3体（abc-a エー／abc-b ビー／abc-c シー）が 英語の空に
           3体同時で 出る（トリプルKO）＋ 進化形 6体（エーナイト…シーロード）
   いま  ：赤い A・緑の B・黄色い C が くっついた **1体**（abc）＋ 進化形 2体
           （abc-2 ABCナイツ／abc-3 ABCロード）。息子さんの 絵の とおり。

   ここで やる こと
     ① monsterart.js … letterA/B/C と letterA2〜C3 を abc／abc2／abc3 に おきかえる
     ② enemies.js    … 9体の データを 3体に おきかえる（trio は つけない）
   古い セーブの 相棒・図かんは js/core/save.js の mergeAbc が 引きつぐ。

   手順（絵を 直した とき）
     node tools/son/build.js   … 進化形を 組み立てる（arts.json）
     node tools/son/abc.js     … ゲームに 入れる（何回 流しても 同じ）                */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
const defs = require('./defs.js');
const arts = require('./arts.json');
const base = require('./abc-base.js');

const g = defs.filter(function (d) { return d.line === 'abc'; })[0];
if (!g) throw new Error('defs.js に abc の 系統が ない');
g.steps.forEach(function (d) { if (!arts[d.id]) throw new Error('arts.json に ' + d.id + ' が ない → さきに node tools/son/build.js'); });

function rects(art) {
  const lines = [];
  for (let i = 0; i < art.length; i += 4) {
    lines.push('      ' + art.slice(i, i + 4).map(function (r) {
      return '[' + r[0] + ', ' + r[1] + ', ' + r[2] + ', ' + r[3] + ", '" + r[4] + "'" + (r[5] ? ", '" + r[5] + "'" : '') + ']';
    }).join(', '));
  }
  return lines.join(',\n');
}
function colorsOf(c) { return '{ ' + Object.keys(c).map(function (k) { return k + ": '" + c[k] + "'"; }).join(', ') + ' }'; }

/* しるしの あいだを 書きかえる。しるしが まだ ない ときは start〜end を おきかえて しるしを つける */
function swap(s, name, firstStart, firstEnd, body) {
  const A = '    /* <' + name + '> */\n', Z = '    /* </' + name + '> */\n';
  const a = s.indexOf(A);
  if (a >= 0) {
    const z = s.indexOf(Z, a);
    if (z < 0) throw new Error('しるしの おわりが ない: ' + name);
    return s.slice(0, a) + A + body + Z + s.slice(z + Z.length);
  }
  const i = s.indexOf(firstStart);
  const j = s.indexOf(firstEnd, i + 1);
  if (i < 0 || j < 0 || s.indexOf(firstStart, i + 1) >= 0) throw new Error('はじめの 場所が 見つからない: ' + name);
  return s.slice(0, i) + A + body + Z + s.slice(j);
}

/* ---------- ① monsterart.js ---------- */
(function () {
  const f = path.join(root, 'js/content/monsterart.js');
  let s = fs.readFileSync(f, 'utf8');
  s = swap(s, 'abc', '    // ABC 3きょうだい\n', '    /* ---------- v8.6 息子さんの モンスターの 進化形', [
    '    // ABC3きょうだい（v13.21 で 1体）：赤い A・緑の B・黄色い C が くっついた 1体。',
    '    // 目 たくさん・A の よこぼうは ギザギザの 歯。もとは tools/son/abc-base.js（手で ここを 直さない）',
    '    abc: [',
    rects(base),
    '    ],',
    ''].join('\n'));
  s = swap(s, 'abc-evo', '    // エーナイト（2段階め）\n', '    /* ---------- v4.2 あたらしい 51体（17系統 × 3段階） ---------- */',
    g.steps.map(function (d, i) {
      return ['    // ' + d.name + '（' + (i + 2) + '段階め）', '    abc' + (i + 2) + ': [', rects(arts[d.id]), '    ],'].join('\n');
    }).join('\n') + '\n\n');
  fs.writeFileSync(f, s);
  console.log('monsterart.js：abc／abc2／abc3');
})();

/* ---------- ② enemies.js ---------- */
(function () {
  const f = path.join(root, 'js/content/enemies.js');
  let s = fs.readFileSync(f, 'utf8');
  const c1 = g.fromDef.colors;
  s = swap(s, 'abc', '    /* ABC3きょうだい … 英語の空に 3体まとめて 出てくる */\n', '    /* ---- 息子さんの モンスターの 進化形（v8.6', [
    '    /* ABC3きょうだい … 赤い A・緑の B・黄色い C が くっついた 1体（v13.21）。',
    '       むかしは べつべつの 3体（abc-a／abc-b／abc-c）で 3体同時に 出た。古い セーブは save.js の mergeAbc が 引きつぐ */',
    "    { id: 'abc', name: '" + g.fromDef.name + "', shape: 'abc', area: 'eigo', rare: true, by: 'son', line: 'abc', stage: 1, evo: '" + g.steps[0].id + "',",
    '      colors: ' + colorsOf(c1) + ' },',
    '',
    ''].join('\n'));
  s = swap(s, 'abc-evo', "    { id: 'abc-a-2',", '    /* ---------- v4.2 あたらしい 51体（17系統 × 3段階・相棒に できる） ----------',
    g.steps.map(function (d, i) {
      return "    { id: '" + d.id + "', name: '" + d.name + "', shape: 'abc" + (i + 2) + "', area: 'eigo', rare: true, by: 'son', rank: " + d.rank + ',\n' +
             "      line: 'abc', stage: " + (i + 2) + (g.steps[i + 1] ? ", evo: '" + g.steps[i + 1].id + "'" : '') + ', evoOnly: true,\n' +
             '      colors: ' + colorsOf(d.colors) + ' },';
    }).join('\n') + '\n');
  fs.writeFileSync(f, s);
  console.log('enemies.js：abc／abc-2／abc-3');
})();
