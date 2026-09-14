/* v14.6 ボスの 作り直しを ゲームに つなぐ パッチ（アンカーつき・1つでも 合わなければ 何も 書かない）
   使い方： node tools/bossart/patch-game.js <manabi-quest の フォルダ> */
const fs = require('fs');
const path = require('path');
const ROOT = process.argv[2] || path.join(__dirname, '..', '..');
const files = {};
function get(f) { if (!(f in files)) files[f] = fs.readFileSync(path.join(ROOT, f), 'utf8'); return files[f]; }
function rep(f, a, b) {
  const s = get(f);
  if (s.indexOf(String.fromCharCode(13, 10)) >= 0) { a = a.split(String.fromCharCode(10)).join(String.fromCharCode(13, 10)); b = b.split(String.fromCharCode(10)).join(String.fromCharCode(13, 10)); }   // CRLF の ファイル（sw.js）
  const n = s.split(a).length - 1;
  if (n !== 1) throw new Error(f + ': アンカーが ' + n + 'こ: ' + a.slice(0, 70));
  files[f] = s.replace(a, function () { return b; });
}

/* ---- enemies.js ---- */
rep('js/content/enemies.js',
  "{ id: 'boss-dragon', area: 'sansu',      name: 'ナンバードラゴン', shape: 'dragon',    colors: { A: '#4F8CFF', B: '#FFD166' } },",
  "/* v14.6：ナンバードラゴン・モジオニは 64マス（base）。絵は tools/bossart/final.js → emit.js。3D は js/content/boss3d.js */\n" +
  "    { id: 'boss-dragon', area: 'sansu',      name: 'ナンバードラゴン', shape: 'dragon',    base: 64,\n" +
  "      colors: { A: '#B31F1A', B: '#761612', C: '#8E1A16', D: '#5A1210', w: '#F5E0B0', y: '#F2C14E', k: '#2B1512', e: '#FFE14A', r: '#FFB13A' },\n" +
  "      phase2: { A: '#D42A1C', e: '#FF4A2A', r: '#FF5A1A', C: '#A81F18' } },");
rep('js/content/enemies.js',
  "{ id: 'boss-oni',    area: 'kokugo',     name: 'モジオニ',        shape: 'oni',       colors: { A: '#FF5A5A', C: '#2B2B3A' } },",
  "{ id: 'boss-oni',    area: 'kokugo',     name: 'モジオニ',        shape: 'oni',       base: 64,\n" +
  "      colors: { A: '#3F7FD6', B: '#2B5AA6', C: '#B8281F', D: '#8F1F1A', y: '#F2C14E', s: '#CFD8E6', P: '#8B95A8', w: '#F1E6C8', W: '#F4F0E6', e: '#FFE14A', k: '#1B0C0C', r: '#7A1512', m: '#5A2D17' },\n" +
  "      phase2: { A: '#2F5FB8', B: '#1F4488', e: '#FF3A3A' } },");
rep('js/content/enemies.js',
  "const box = MQ.blocks.box(shapes[e.shape] || [], paletteOf(e, opts.enrage), { size: size, cls: cls, raw: true });",
  "const box = MQ.blocks.box(shapes[e.shape] || [], paletteOf(e, opts.enrage), { size: size, cls: cls, raw: true, base: e.base });   // base＝64マスの ボス（v14.6）");
rep('js/content/enemies.js',
  "    midFor: midFor, midIdsFor: midIdsFor,\n",
  "    midFor: midFor, midIdsFor: midIdsFor, paletteOf: paletteOf,\n");

/* ---- vox.js：部品の 奥ゆきの ずれ（z） ---- */
rep('js/core/vox.js',
  "box.style.transform = 'translateZ(' + (d / 2) + 'px)';          // まん中ぞろえ（手まえと おくに 半分ずつ）",
  "box.style.transform = 'translateZ(' + (d / 2 + (r.z || 0) * U) + 'px)';          // まん中ぞろえ（手まえと おくに 半分ずつ）。r.z＝部品の 奥ゆきの ずれ（v14.6 ボスの 足・つばさ）");
rep('js/core/vox.js',
  "      if (gr.bottom) bd.boxes.forEach(function (r) { r.B = r.B.map(function () { return gr.bottom; }); r.litB = 'top'; });\n",
  "      if (gr.bottom) bd.boxes.forEach(function (r) { r.B = r.B.map(function () { return gr.bottom; }); r.litB = 'top'; });\n" +
  "      /* z … 部品ごとの 奥ゆきの ずれ（マス）。手まえの 足・つばさは +、向こうは −（v14.6 ボス） */\n" +
  "      if (gr.z) bd.boxes.forEach(function (r) { r.z = gr.z; });\n");

/* ---- three.js：64マスの ボスは 部品で 組む ---- */
rep('js/ui/three.js',
  "    const U = opts.unit || unitFor(size);\n    const ry = opts.ry == null ? -22 : opts.ry;\n    const sc = scene(size, ry, 48 * U, opts.cls);",
  "    const U = opts.unit || unitFor(size);\n" +
  "    /* v14.6：ナンバードラゴン・モジオニは 部品ごとの 絵から 組む（boss3d.js）。64マス。ドラゴンは 頭を 手まえに 向ける */\n" +
  "    const me0 = MQ.enemies.get ? MQ.enemies.get(id) : null;\n" +
  "    const b3 = me0 && MQ.vox.boss3d && MQ.vox.boss3d.has(me0.shape) ? MQ.vox.boss3d : null;\n" +
  "    const ry = b3 && b3.ry(me0.shape) != null && (opts.ry == null || opts.ry < 0) ? b3.ry(me0.shape) : (opts.ry == null ? -22 : opts.ry);\n" +
  "    const sc = scene(size, ry, ((me0 && me0.base) || 48) * U, opts.cls);");
rep('js/ui/three.js',
  "    if (monCache[key]) return put(sc, monCache[key].cloneNode(true), opts.mo || 'mo-menace');\n    const holder",
  "    if (monCache[key]) return put(sc, monCache[key].cloneNode(true), opts.mo || 'mo-menace');\n" +
  "    if (b3) { monCache[key] = b3.make(me0, { unit: U, hide: hideFor(ry, opts), enrage: !!opts.enrage }); return put(sc, monCache[key].cloneNode(true), opts.mo || 'mo-menace'); }\n" +
  "    const holder");

/* ---- battle.js：64マスの ボスは ドットの 大きさを ほかの ボスと そろえる（96 → 128） ---- */
rep('js/ui/battle.js',
  "      if (e.by === 'photo' && !boss && ids.length === 1) size = 96;          // じぶんの 絵の モンスターは 大きく（64マスの ドットが つぶれない・v3.2）\n",
  "      if (e.by === 'photo' && !boss && ids.length === 1) size = 96;          // じぶんの 絵の モンスターは 大きく（64マスの ドットが つぶれない・v3.2）\n" +
  "      if (e.base && e.base !== 48) size = Math.round(size * e.base / 48);    // 64マスの ボス（v14.6）：1ドットの 大きさを ほかの ボスと そろえる（96 → 128）\n");

/* ---- start.js：タイトルの ドラゴンも 新しい ナンバードラゴンに ---- */
rep('js/ui/start.js',
  "     うしろ：大きな ボスドラゴン（ドラゴニクス）と うかぶ「A」ブロック",
  "     うしろ：大きな ボスドラゴン（v14.6 から ナンバードラゴン＝竜王）と うかぶ「A」ブロック");
rep('js/ui/start.js',
  "      mob('drago-3', 128, 'dragon'),",
  "      mob('boss-dragon', 150, 'dragon'),   // v14.6：ユーザー「タイトル画面の ドラゴンも 今の ドラゴンに 差し換えて」");

/* ---- 読みこみ（index・sw・harness） ---- */
rep('index.html',
  '<script src="js/content/capsule3d.js"></script>   <!-- カプセルマシンの 3D（v13.14） -->\n',
  '<script src="js/content/capsule3d.js"></script>   <!-- カプセルマシンの 3D（v13.14） -->\n' +
  '<script src="js/content/boss3d.js"></script>   <!-- ナンバードラゴン・モジオニの 3D（v14.6）。enemies.js の あと -->\n');
rep('sw.js', "  './js/content/capsule3d.js',\n", "  './js/content/capsule3d.js',\n  './js/content/boss3d.js',\n");
rep('sw.js', "const CACHE_NAME = 'manabi-monster-v169';", "const CACHE_NAME = 'manabi-monster-v170';");
rep('tools/harness.html', '<script src="../js/content/capsule3d.js"></script>\n',
  '<script src="../js/content/capsule3d.js"></script>\n<script src="../js/content/boss3d.js"></script>\n');

/* ---- お知らせ ---- */
rep('js/content/news.js',
  "          text: 'ずかんで スカルホースたちの すがたを えらべるよ。もとの えから つくった すがたにも なるよ' }\n      ]\n    }\n  ];",
  "          text: 'ずかんで スカルホースたちの すがたを えらべるよ。もとの えから つくった すがたにも なるよ' }\n      ]\n    },\n" +
  "    {\n      // v14.6 ボスの 作り直し（ナンバードラゴン＝竜王・モジオニ＝青鬼の 大将）\n" +
  "      v: 'v13.23', date: '2026-09-15', sw: 170,\n      items: [\n" +
  "        { kind: 'mons', id: 'boss-dragon', title: 'ナンバードラゴンが へんしん',\n" +
  "          text: 'さんすうの ボスが きんの よろいの りゅうおうに なったよ。つばさを ひろげて まって いるぞ！' },\n" +
  "        { kind: 'mons', id: 'boss-oni', title: 'モジオニが へんしん',\n" +
  "          text: 'こくごの ボスは しろい たてがみの あおおにの たいしょう。なぎなたを ふって くるぞ！' }\n" +
  "      ]\n    }\n  ];");

/* ---- smoke ---- */
rep('tools/smoke.js', "  if (shape) checkShape(e.shape, shape, 48, 'モンスター');", "  if (shape) checkShape(e.shape, shape, e.base || 48, 'モンスター');   // v14.6：64マスの ボス");
rep('tools/smoke.js',
  "  ['./css/motion3d.css', './js/core/vox.js', './js/content/chest3d.js', './js/ui/three.js'].forEach(function (f) { check(sw.indexOf(\"'\" + f + \"'\") >= 0, 'sw.js の FILES に ' + f); });\n",
  "  ['./css/motion3d.css', './js/core/vox.js', './js/content/chest3d.js', './js/ui/three.js'].forEach(function (f) { check(sw.indexOf(\"'\" + f + \"'\") >= 0, 'sw.js の FILES に ' + f); });\n" +
  "  // v14.6 ボスの 作り直し：ナンバードラゴン・モジオニは 64マス・部品つき・3D は boss3d.js\n" +
  "  check(sw.indexOf(\"'./js/content/boss3d.js'\") >= 0, 'sw.js の FILES に boss3d.js');\n" +
  "  check(INDEX_HTML.indexOf('js/content/boss3d.js') > INDEX_HTML.indexOf('js/content/enemies.js'), 'index: boss3d.js は enemies.js の あと');\n" +
  "  ['boss-dragon', 'boss-oni'].forEach(function (id) {\n" +
  "    const e = MQ.enemies.get(id);\n" +
  "    const art = MQ.monsterArt.mons[e.shape] || [];\n" +
  "    check(e.base === 64 && art.length >= 40, id + ': 64マスの 絵（' + art.length + 'こ）');\n" +
  "    check(art.every(function (r) { return r[0] >= 0 && r[1] >= 0 && r[0] + r[2] <= 64 && r[1] + r[3] <= 64; }), id + ': 64マスに おさまる');\n" +
  "    check(!!e.phase2, id + ': おこった ときの 色');\n" +
  "    const cfg = MQ.vox.boss3d && MQ.vox.boss3d.CFG[e.shape];\n" +
  "    check(!!cfg, id + ': 3D の 部品の 表');\n" +
  "    if (cfg) cfg.parts.forEach(function (p) { check(art.some(function (r) { return r[6] === p.tag; }), id + ': 部品 ' + p.tag + ' の 絵が ある'); });\n" +
  "    check(art.every(function (r) { return cfg && cfg.parts.some(function (p) { return p.tag === r[6]; }); }), id + ': どの 四角も どこかの 部品に 入る');\n" +
  "  });\n");

/* ---- motion3d.css：ボスの 動き ---- */
const CSS_ADD = fs.readFileSync(path.join(__dirname, 'motion.css'), 'utf8');
files['css/motion3d.css'] = get('css/motion3d.css').replace(/\s*$/, '\n') + CSS_ADD;

Object.keys(files).forEach(function (f) { fs.writeFileSync(path.join(ROOT, f), files[f]); });
console.log('ok', Object.keys(files).join(' '));
