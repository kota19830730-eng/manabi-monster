/* 44の 王さま形を ゲームに 入れる（v8.2）
   ① monsterart.js に 絵を 44こ 足す
   ② enemies.js の 88体に line/stage/evo を つけ、王さま 44体を 足す
   もう 入って いたら 何も しない（2回 流しても こわれない）  */
const fs = require('fs');
const path = require('path');
const root = require('path').join(__dirname, '..', '..');
const defs = require('./defs.js');
const groups = require('./groups.json');
const arts = require('./arts.json');

const byShape = {};
groups.forEach(function (g) { byShape[g.shape] = g; });

function shapeKey(shape) { return shape + 'King'; }
function rects(art) {
  const lines = [];
  for (let i = 0; i < art.length; i += 4) {
    lines.push('      ' + art.slice(i, i + 4).map(function (r) {
      return '[' + r[0] + ', ' + r[1] + ', ' + r[2] + ', ' + r[3] + ", '" + r[4] + "'" + (r[5] ? ", '" + r[5] + "'" : '') + ']';
    }).join(', '));
  }
  return lines.join(',\n');
}

/* ---------- ① monsterart.js ---------- */
(function () {
  const f = path.join(root, 'js/content/monsterart.js');
  let s = fs.readFileSync(f, 'utf8');
  if (s.indexOf(shapeKey(defs[0].shape) + ':') >= 0) { console.log('絵は もう 入って いる'); return; }

  const anchor = '    // たからばこ（バトルの とちゅうで 出る）\n    chest: [';
  if (s.split(anchor).length !== 2) throw new Error('monsterart.js の アンカーが 見つからない');

  const block = [];
  block.push('    /* ---------- v8.2 王さま形 44体（3段階めの すがた） ----------');
  block.push('       色ちがいの 88体を 44の 系統に して、その さいごの すがたを 新しく 作った。');
  block.push('       もとの 形に かんむり・マント・しゃく などを 足して ある（1体ずつ ちがう 組み合わせ）。');
  block.push('       作り方は scratchpad/king/kit.js（部品）＋ defs.js（組み合わせ）。手で 座標を 打たない。 */');
  defs.forEach(function (d) {
    block.push('    // ' + d.king.name + '（' + byShape[d.shape].members.filter(function (m) { return m.id === d.top; })[0].name + 'の さいご）');
    block.push('    ' + shapeKey(d.shape) + ': [');
    block.push(rects(arts[d.king.id]));
    block.push('    ],');
  });
  block.push('');
  s = s.replace(anchor, block.join('\n') + anchor);
  fs.writeFileSync(f, s);
  console.log('monsterart.js に 44体の 絵を 足した');
})();

/* ---------- ② enemies.js ---------- */
(function () {
  const f = path.join(root, 'js/content/enemies.js');
  let s = fs.readFileSync(f, 'utf8');
  if (s.indexOf("id: '" + defs[0].king.id + "'") >= 0) { console.log('王さまは もう 入って いる'); return; }

  // (a) いまの 88体に line / stage / evo を つける
  let touched = 0;
  defs.forEach(function (d) {
    const g = byShape[d.shape];
    const single = g.members.length === 1;
    g.members.forEach(function (m) {
      const isTop = m.id === d.top;
      // 1体だけの 系統は その子が 1段階め（Lv10 で 王さまに なる）
      const stage = single ? 1 : (isTop ? 2 : 1);
      const evo = single ? d.king.id : (isTop ? d.king.id : d.top);
      const add = "line: '" + d.shape + "', stage: " + stage + ", evo: '" + evo + "', ";
      const re = new RegExp("(\\{ id: '" + m.id + "',[^\\n]*?)colors:");
      const before = s;
      s = s.replace(re, '$1' + add + 'colors:');
      if (s === before) throw new Error('この 行が 見つからない: ' + m.id);
      touched++;
    });
  });

  // (b) 王さま 44体を たからばこの 前に 足す
  const anchor = '    /* たからばこ（敵あつかい だが 図鑑には のせない） */';
  if (s.split(anchor).length !== 2) throw new Error('enemies.js の アンカーが 見つからない');

  const block = [];
  block.push('    /* ---------- v8.2 王さま形 44体（系統の 3段階め） ----------');
  block.push('       色ちがいだった 88体を 44の 系統に して、その さいごの すがた。');
  block.push('       相棒が Lv20 に なると この すがたに なる（1体だけの 系統は Lv10）。');
  block.push('       ふつうの たたかいにも rank3 として 出る。絵は monsterart.js の <形>King。 */');
  defs.forEach(function (d) {
    const c = d.king.colors;
    const cs = Object.keys(c).map(function (k) { return k + ": '" + c[k] + "'"; }).join(', ');
    block.push("    { id: '" + d.king.id + "', name: '" + d.king.name + "', shape: '" + shapeKey(d.shape) +
               "', area: '" + d.king.area + "', rank: 3, line: '" + d.shape + "', stage: 3, colors: { " + cs + ' } },');
  });
  block.push('');
  s = s.replace(anchor, block.join('\n') + anchor);
  fs.writeFileSync(f, s);
  console.log('enemies.js：' + touched + '体に 系統を つけ、44体の 王さまを 足した');
})();
