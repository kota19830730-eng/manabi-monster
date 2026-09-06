/* 息子さんの モンスターの 進化形（12体）を 組み立てて 一覧の ページに する（v8.3）
   まだ ゲームには 入れない。目で 見て なおす ための 道具。
     node tools/son/build.js        → tools/son/sheet.html と arts.json           */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
const kit = require('../king/kit.js');
const defs = require('./defs.js');

global.window = global;
global.MQ = {};
['js/core/util.js', 'js/core/blocks.js', 'js/core/pixel.js', 'js/content/monsterart.js', 'js/content/enemies.js']
  .forEach(function (f) { eval(fs.readFileSync(path.join(root, f), 'utf8')); });

/* 絵を 少し 小さく して 上に すきまを 作る（下は そのまま・まん中を そろえる） */
function fitTop(art, top) {
  const bb = kit.bbox(art);
  if (bb.y0 >= top) return art;
  const k = (bb.y1 - top) / (bb.y1 - bb.y0);
  return art.map(function (r) {
    return [
      Math.round(bb.cx + (r[0] - bb.cx) * k),
      Math.round(bb.y1 - (bb.y1 - r[1]) * k),
      Math.max(1, Math.round(r[2] * k)),
      Math.max(1, Math.round(r[3] * k)),
      r[4], r[5]
    ];
  });
}

/* 上の ほうで いちばん 広い ブロック＝頭（kit と 同じ 考えかた） */
function headCtx(art) {
  const bb = kit.bbox(art);
  const band = bb.y0 + Math.max(6, Math.round(bb.h * 0.34));
  let best = null;
  art.forEach(function (r) { if (r[1] <= band && (!best || r[2] > best[2])) best = r; });
  best = best || art[0];
  return { hcx: Math.round(best[0] + best[2] / 2), top: best[1], hw: best[2] };
}

/* 1体ぶんを 組み立てる。うしろ → もとの 絵 → 前 → おまけ → かんむり → 手に もつ もの */
function compose(base, d) {
  let src = base.map(function (r) { return r.slice(); });
  if (d.fitTop) src = fitTop(src, d.fitTop);
  const bb = kit.bbox(src);
  const spec = d.spec || {};

  let back = (d.back || []).slice();
  if (spec.back) back = back.concat(kit.BACKS[spec.back](bb));

  let after = (d.front || []).slice();
  (spec.extras || []).forEach(function (k) { after = after.concat(kit.EXTRAS[k](bb)); });

  const crownKind = d.crown || spec.crown;
  if (crownKind) after = after.concat(kit.CROWNS[crownKind](d.crownBox || headCtx(src)));
  if (spec.hand) after = after.concat(kit.HANDS[spec.hand](bb));

  const art = back.concat(src, after)
    .filter(function (r) { return r[2] > 0 && r[3] > 0; })
    .map(function (r) {
      const x = Math.max(0, Math.min(47, r[0])), y = Math.max(0, Math.min(47, r[1]));
      return [x, y, Math.min(48 - x, r[2]), Math.min(48 - y, r[3]), r[4], r[5]];
    });
  return { art: art, backCount: back.length };
}

/* 足した 部品が どれだけ かくれるか（うしろに 置いた ものは 本体に かくれる）。
   ほとんど 見えない かざりは 足しても むだ なので ここで 数えて 出す。 */
function hiddenReport(all, backCount, label) {
  const N = 48;
  const paint = new Uint8Array(N * N);          // あとから 描く ものの 面
  const out = [];
  for (let i = 0; i < all.length; i++) {
    const r = all[i];
    if (i < backCount) {
      let total = 0, hid = 0;
      for (let y = r[1]; y < r[1] + r[3]; y++) for (let x = r[0]; x < r[0] + r[2]; x++) {
        total++;
        // うしろの ものは これより あとの すべてに かくれる
      }
      // あとの ものを ぬって みる
      const later = new Uint8Array(N * N);
      for (let j = i + 1; j < all.length; j++) {
        const q = all[j];
        for (let y = q[1]; y < q[1] + q[3]; y++) for (let x = q[0]; x < q[0] + q[2]; x++) later[y * N + x] = 1;
      }
      for (let y = r[1]; y < r[1] + r[3]; y++) for (let x = r[0]; x < r[0] + r[2]; x++) if (later[y * N + x]) hid++;
      if (total && hid / total > 0.7) out.push('  ' + label + ' うしろの かざりが ' + Math.round(hid / total * 100) + '% かくれる: ' + JSON.stringify(r));
    }
  }
  void paint;
  return out;
}

/* ---------------- 組み立て ---------------- */
const arts = {};
const rows = [];
let over = 0, bad = 0;

defs.forEach(function (g) {
  const base = MQ.monsterArt.mons[g.base];
  if (!base) throw new Error('もとの 絵が ない: ' + g.base);
  const from = MQ.enemies.get(g.from);
  if (!from) throw new Error('もとの モンスターが いない: ' + g.from);
  const row = { line: g.line, from: from, steps: [] };
  g.steps.forEach(function (d) {
    const made = compose(base, d);
    const art = made.art;
    hiddenReport(art, made.backCount, d.id).forEach(function (m) { console.log(m); });
    arts[d.id] = art;
    art.forEach(function (r) {
      if (r[0] < 0 || r[1] < 0 || r[0] + r[2] > 48 || r[1] + r[3] > 48) over++;
      if (!/^[A-DPkwryesWmg2]+$/.test(String(r[4])) && String(r[4]).charAt(0) !== '#') bad++;
    });
    row.steps.push({ id: d.id, name: d.name, colors: d.colors, art: art });
  });
  rows.push(row);
});

console.log('進化形:', Object.keys(arts).length, '体 ／ はみ出し:', over, '／ 色キーの まちがい:', bad);

/* 名前と id が かぶって いないか */
const names = {}, ids = {};
MQ.enemies.list.concat(MQ.enemies.bosses).forEach(function (e) { names[e.name] = e.id; ids[e.id] = 1; });
rows.forEach(function (r) {
  r.steps.forEach(function (s) {
    if (names[s.name]) console.log('  名前が かぶり:', s.name, '←', names[s.name]);
    if (ids[s.id]) console.log('  id が かぶり:', s.id);
    names[s.name] = s.id; ids[s.id] = 1;
  });
});

/* ---------------- 一覧の ページ ---------------- */
const common = { k: '#141018', w: '#FFFFFF', r: '#FF4D4D', y: '#FFD447', e: '#4FD3FF' };
const html = [];
html.push('<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>息子さんの モンスターの 進化</title>');
html.push('<link rel="stylesheet" href="file:///' + root.replace(/\\/g, '/') + '/css/style.css">');
html.push('<style>body{margin:0;background:#101a33;color:#e8ecf7;font-family:sans-serif;padding:14px}');
html.push('h1{font-size:17px;color:#ffd447;margin:0 0 12px}');
html.push('.r{background:#16224a;border-radius:12px;padding:10px;margin-bottom:12px;display:flex;align-items:flex-end;gap:14px}');
html.push('.c{text-align:center}.l{display:flex;align-items:flex-end;justify-content:center;height:104px}');
html.push('.n{font-size:13px;color:#fff;margin-top:6px}.s{font-size:11px;color:#9fb2dd}</style></head><body>');
html.push('<h1>息子さんの モンスターの 進化（左＝いまの すがた → 2段階 → 3段階）</h1><div id="g"></div>');
['js/core/util.js', 'js/core/blocks.js', 'js/core/pixel.js', 'js/content/monsterart.js', 'js/content/enemies.js']
  .forEach(function (f) { html.push('<script src="file:///' + root.replace(/\\/g, '/') + '/' + f + '"></script>'); });
html.push('<script>const ROWS = ' + JSON.stringify(rows.map(function (r) {
  return { base: { shape: r.from.shape, name: r.from.name, colors: r.from.colors }, steps: r.steps };
})) + ';</script>');
html.push('<script>');
html.push('const h = MQ.util.h, g = document.getElementById("g");');
html.push('const common = ' + JSON.stringify(common) + ';');
html.push('function cell(art, colors, name, sub) {');
html.push('  const p = MQ.blocks.fill(Object.assign({}, common, colors));');
html.push('  return h("div", { class: "c" }, [h("div", { class: "l" }, [MQ.blocks.box(art, p, { size: 96, raw: true }), MQ.blocks.box(art, p, { size: 48, raw: true })]),');
html.push('    h("div", { class: "n", text: name }), h("div", { class: "s", text: sub })]); }');
html.push('ROWS.forEach(function (r) {');
html.push('  const kids = [cell(MQ.monsterArt.mons[r.base.shape], r.base.colors, r.base.name, "1段階")];');
html.push('  r.steps.forEach(function (s, i) {');
html.push('    kids.push(cell(s.art, s.colors, s.name, (i + 2) + "段階 / " + s.id));');
html.push('  });');
html.push('  g.appendChild(h("div", { class: "r" }, kids));');
html.push('});');
html.push('</script></body></html>');
fs.writeFileSync(path.join(__dirname, 'sheet.html'), html.join('\n'));
fs.writeFileSync(path.join(__dirname, 'arts.json'), JSON.stringify(arts));
console.log('sheet.html を 書いた');
