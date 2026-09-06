/* 44体の 王さま形を 作って、一覧の ページ（sheet.html）を 書き出す。
   まだ ゲームには 入れない。目で 見て なおす ための 道具。 */
const fs = require('fs');
const path = require('path');
const root = require('path').join(__dirname, '..', '..');
const kit = require('./kit.js');
const defs = require('./defs.js');
const groups = require('./groups.json');

global.window = global;
global.MQ = {};
['js/core/util.js', 'js/core/blocks.js', 'js/core/pixel.js', 'js/content/monsterart.js', 'js/content/enemies.js']
  .forEach(function (f) { eval(fs.readFileSync(path.join(root, f), 'utf8')); });

const byShape = {};
groups.forEach(function (g) { byShape[g.shape] = g; });

const arts = {};
const rows = [];
let over = 0;

defs.forEach(function (d) {
  const g = byShape[d.shape];
  if (!g) throw new Error('形が ない: ' + d.shape);
  const base = MQ.monsterArt.mons[d.shape];
  if (!base) throw new Error('絵が ない: ' + d.shape);
  const art = kit.makeKing(base, d.king.spec);
  arts[d.king.id] = art;

  // はみ出しの 検査
  art.forEach(function (r) {
    if (r[0] < 0 || r[1] < 0 || r[0] + r[2] > 48 || r[1] + r[3] > 48) over++;
  });

  const top = g.members.filter(function (m) { return m.id === d.top; })[0];
  const others = g.members.filter(function (m) { return m.id !== d.top; });
  rows.push({ shape: d.shape, king: d.king, top: top, others: others, art: art });
});

console.log('王さま形:', defs.length, '／ はみ出し:', over);

/* 名前が かぶって いないか */
const names = {};
MQ.enemies.list.concat(MQ.enemies.bosses).forEach(function (e) { names[e.name] = e.id; });
defs.forEach(function (d) {
  if (names[d.king.name]) console.log('  名前が かぶり:', d.king.name, '←', names[d.king.name]);
  names[d.king.name] = d.king.id;
});
const ids = {};
MQ.enemies.list.concat(MQ.enemies.bosses).forEach(function (e) { ids[e.id] = 1; });
defs.forEach(function (d) { if (ids[d.king.id]) console.log('  id が かぶり:', d.king.id); ids[d.king.id] = 1; });

/* 一覧の ページ */
const html = [];
html.push('<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>王さま形 44体</title>');
html.push('<link rel="stylesheet" href="file:///' + root + '/css/style.css">');
html.push('<style>body{margin:0;background:#101a33;color:#e8ecf7;font-family:"Zen Maru Gothic",sans-serif;padding:14px}');
html.push('h1{font-size:17px;color:#ffd447;margin:0 0 10px}');
html.push('.g{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}');
html.push('.c{background:#16224a;border-radius:10px;padding:8px 6px;text-align:center}');
html.push('.l{display:flex;align-items:flex-end;justify-content:center;gap:2px;height:82px}');
html.push('.n{font-size:12px;color:#fff;margin-top:4px;line-height:1.3}');
html.push('.s{font-size:10px;color:#9fb2dd}</style></head><body>');
html.push('<h1>王さま形 44体（左＝1段階 → 2段階 → 王さま）</h1><div class="g" id="g"></div>');
html.push('<script src="file:///' + root + '/js/core/util.js"></script>');
html.push('<script src="file:///' + root + '/js/core/blocks.js"></script>');
html.push('<script src="file:///' + root + '/js/core/pixel.js"></script>');
html.push('<script src="file:///' + root + '/js/content/monsterart.js"></script>');
html.push('<script src="file:///' + root + '/js/content/enemies.js"></script>');
html.push('<script>const ROWS = ' + JSON.stringify(rows.map(function (r) {
  return {
    name: r.king.name, sub: r.others.map(function (m) { return m.name; }).join('・') + ' → ' + r.top.name,
    art: r.art, colors: r.king.colors,
    base: { shape: r.shape, a: r.others[0] ? r.others[0].colors : r.top.colors, b: r.top.colors }
  };
})) + ';</script>');
html.push('<script>');
html.push('const h = MQ.util.h, g = document.getElementById("g");');
html.push('const common = { k: "#141018", w: "#FFFFFF", r: "#FF4D4D", y: "#FFD447", e: "#4FD3FF" };');
html.push('ROWS.forEach(function (r) {');
html.push('  const line = h("div", { class: "l" }, [');
html.push('    MQ.blocks.box(MQ.monsterArt.mons[r.base.shape], MQ.blocks.fill(Object.assign({}, common, r.base.a)), { size: 40, raw: true }),');
html.push('    MQ.blocks.box(MQ.monsterArt.mons[r.base.shape], MQ.blocks.fill(Object.assign({}, common, r.base.b)), { size: 52, raw: true }),');
html.push('    MQ.blocks.box(r.art, MQ.blocks.fill(Object.assign({}, common, r.colors)), { size: 76, raw: true })');
html.push('  ]);');
html.push('  g.appendChild(h("div", { class: "c" }, [line, h("div", { class: "n", text: r.name }), h("div", { class: "s", text: r.sub })]));');
html.push('});');
html.push('</script></body></html>');
fs.writeFileSync(path.join(__dirname, 'sheet.html'), html.join('\n'));
fs.writeFileSync(path.join(__dirname, 'arts.json'), JSON.stringify(arts));
console.log('sheet.html を 書いた');
