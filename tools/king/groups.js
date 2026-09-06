/* 系統に する 組（形が 同じ もの）を すべて 書き出す */
const fs = require('fs');
const path = require('path');
const root = require('path').join(__dirname, '..', '..');
global.window = global;
global.MQ = {};
['js/core/util.js', 'js/core/blocks.js', 'js/core/pixel.js', 'js/content/monsterart.js', 'js/content/enemies.js']
  .forEach(function (f) { eval(fs.readFileSync(path.join(root, f), 'utf8')); });

const all = MQ.enemies.list || [];
/* 系統に する 88体：中ボス・レア・ボス・王さま（3段階め）は のぞく。
   v8.2 を 入れた あとは line が ついて いるので、line が 形の 名前の ものも 数える */
const zako = all.filter(function (e) {
  if (e.id === 'chest' || e.rare || e.last || e.mid || String(e.id).indexOf('boss-') === 0) return false;
  if (e.stage === 3) return false;
  return !e.line || e.line === String(e.shape).replace(/King$/, '');
});

const byShape = {};
zako.forEach(function (e) { (byShape[e.shape] = byShape[e.shape] || []).push(e); });

const AREA_ORDER = { sansu: 0, kokugo: 1, rikashakai: 2, eigo: 3 };
const out = Object.keys(byShape).map(function (shape) {
  const g = byShape[shape].slice().sort(function (a, b) {
    return (a.rank - b.rank) || (AREA_ORDER[a.area] - AREA_ORDER[b.area]);
  });
  return {
    shape: shape,
    members: g.map(function (e) {
      return { id: e.id, name: e.name, area: e.area, rank: e.rank, colors: e.colors };
    })
  };
});
out.sort(function (a, b) { return a.members[0].area.localeCompare(b.members[0].area) || a.shape.localeCompare(b.shape); });
fs.writeFileSync(path.join(__dirname, 'groups.json'), JSON.stringify(out, null, 1));
console.log('形の 組:', out.length, '／ 体:', zako.length);
out.forEach(function (g) {
  console.log(g.shape.padEnd(12) + ' ' + g.members.map(function (m) { return m.name + '[' + m.area + ' r' + m.rank + ' ' + m.colors.A + ']'; }).join(' → '));
});
