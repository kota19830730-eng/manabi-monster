/* 息子さんの モンスターの 進化形 12体を ゲームに 入れる（v8.6）
     ① monsterart.js に 絵を 12こ 足す
     ② enemies.js の 6体に line/stage/evo を つけ、進化形 12体を 足す
   もう 入って いたら 何も しない（2回 流しても こわれない）
     node tools/son/build.js  →  node tools/son/apply.js                        */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
const defs = require('./defs.js');
const arts = require('./arts.json');

/* 段階の 番号（2 か 3）から 絵の キーを 作る： skullhorse → skullhorse2 */
function shapeKey(g, i) { return g.base + (i + 2); }

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
  if (s.indexOf(shapeKey(defs[0], 0) + ':') >= 0) { console.log('絵は もう 入って いる'); return; }

  const anchor = '    /* ---------- v4.2 あたらしい 51体（17系統 × 3段階） ---------- */';
  if (s.split(anchor).length !== 2) throw new Error('monsterart.js の アンカーが 見つからない');

  const block = [];
  block.push('    /* ---------- v8.6 息子さんの モンスターの 進化形 12体 ----------');
  block.push('       もとの 絵は そのままで、炎・つの・かんむり・マント・ぶきを 足した もの。');
  block.push('       作り方は tools/son/defs.js（組み合わせ）＋ tools/king/kit.js（部品）。');
  block.push('       手で 座標を 打たない（node tools/son/build.js → apply.js）。 */');
  defs.forEach(function (g) {
    g.steps.forEach(function (d, i) {
      block.push('    // ' + d.name + '（' + (i + 2) + '段階め）');
      block.push('    ' + shapeKey(g, i) + ': [');
      block.push(rects(arts[d.id]));
      block.push('    ],');
    });
  });
  block.push('');
  s = s.replace(anchor, block.join('\n') + anchor);
  fs.writeFileSync(f, s);
  console.log('monsterart.js に 12体の 絵を 足した');
})();

/* ---------- ② enemies.js ---------- */
(function () {
  const f = path.join(root, 'js/content/enemies.js');
  let s = fs.readFileSync(f, 'utf8');
  if (s.indexOf("id: '" + defs[0].steps[0].id + "'") >= 0) { console.log('進化形は もう 入って いる'); return; }

  // (a) もとの 6体に line / stage / evo を つける
  defs.forEach(function (g) {
    const old = "by: 'son',";
    const re = new RegExp("(\\{ id: '" + g.from + "',[^\\n]*?)" + old);
    const before = s;
    s = s.replace(re, "$1by: 'son', line: '" + g.line + "', stage: 1, evo: '" + g.steps[0].id + "',");
    if (s === before) throw new Error('この 行が 見つからない: ' + g.from);
  });

  // (b) 進化形 12体を ABC3きょうだいの あとに 足す
  const anchor = '    /* ---------- v4.2 あたらしい 51体（17系統 × 3段階・相棒に できる） ----------';
  if (s.split(anchor).length !== 2) throw new Error('enemies.js の アンカーが 見つからない');

  const block = [];
  block.push('    /* ---- 息子さんの モンスターの 進化形（v8.6・相棒に すると 育つ） ----');
  block.push('       Lv10 で 2段階め、Lv20 で 3段階め。もとの 絵は そのままで かざりが ふえる。');
  block.push('       evoOnly＝ふつうの たたかいには 出ない（出会うのは 1段階めだけ）。');
  block.push('       絵は monsterart.js の <もとの 形><段階>。 */');
  defs.forEach(function (g) {
    g.steps.forEach(function (d, i) {
      const cs = Object.keys(d.colors).map(function (k) { return k + ": '" + d.colors[k] + "'"; }).join(', ');
      block.push("    { id: '" + d.id + "', name: '" + d.name + "', shape: '" + shapeKey(g, i) +
                 "', area: '" + g.area + "', rare: true, by: 'son', rank: " + d.rank +
                 ",\n      line: '" + g.line + "', stage: " + (i + 2) +
                 (g.steps[i + 1] ? ", evo: '" + g.steps[i + 1].id + "'" : '') + ', evoOnly: true,' +
                 '\n      colors: { ' + cs + ' } },');
    });
  });
  block.push('');
  s = s.replace(anchor, block.join('\n') + anchor);
  fs.writeFileSync(f, s);
  console.log('enemies.js：6体に 系統を つけ、12体の 進化形を 足した');
})();
