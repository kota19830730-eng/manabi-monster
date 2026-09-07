/* カプセル専用モンスターの 進化形 36体（2・3段階め）を 組み立てて 一覧に する。
     node tools/capsule/build.js   →  tools/capsule/sheet2.html と evo-arts.json

   まだ ゲームには 入れない。**目で 見て 直す ための 道具**。
   ゲームに 入れるのは tools/capsule/apply.js（これから 作る）。

   ここで する 検査（v8.2 / v8.6 の 教訓を そのまま 引きついだ もの）
     ① 48マスから はみ出して いないか
     ② 知らない 色キーが ないか
     ③ **うしろに 置いた かざりが 7わり いじょう かくれて いないか**
        （かくれる かざりは 足す いみが ない。かざりは 本体の 外がわに 出す）
     ④ **意図しない まばたき**が ないか（blocks.js の pickEyes を そのまま つかう）
     ⑤ 名前・id が いまの 220体と かぶって いないか
     ⑥ **1段階めから 変わって いるか**（3段階め ＋5こ いじょう／2段階めは 色だけでも 可）。
        「24個 いじょう」の ような 絶対の 数では 見ない：足しすぎると もとの 絵が 消える ので、
        たくさん のせる ことが 良い わけでは ない（1回目の 失敗）
     ⑦ カプセルの 宝石（j1/j2）が のこって いるか                              */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
const kit = require('./kit.js');
const render = require('./render.js');
const defs = require('./defs.js');
const evo = require('./evo.js');

/* いまの モンスターの 名前と id（かぶり を 見る ため） */
global.window = global;
global.MQ = {};
['js/core/util.js', 'js/core/blocks.js', 'js/core/pixel.js',
  'js/content/monsterart.js', 'js/content/enemies.js']
  .forEach(function (f) { eval(fs.readFileSync(path.join(root, f), 'utf8')); });

/* ---- 色を すこし 明るく（A・B・C を 同じだけ 白に よせる）---- */
function lift(colors, k) {
  if (!k) return colors;
  const out = Object.assign({}, colors);
  ['A', 'B', 'C'].forEach(function (key) {
    if (out[key]) out[key] = mixWhite(out[key], k);
  });
  return out;
}
function mixWhite(hex, k) {
  if (!hex || hex.charAt(0) !== '#') return hex;
  if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  const n = parseInt(hex.slice(1, 7), 16);
  return '#' + [16, 8, 0].map(function (sh) {
    const a = (n >> sh) & 255;
    return ('0' + Math.round(a + (255 - a) * k).toString(16)).slice(-2);
  }).join('');
}

/* ---- ③ うしろの かざりが どれだけ かくれるか ---- */
/* かくれぐあい。**マントは 体の うしろに 置く ものなので 7〜9わり かくれるのが ふつう**
   （見えるのは まわりに はみ出す ふち）。だから
     9わりを こえた もの … 直す（bad。足した いみが ない）
     7〜9わり          … 見て おく（note。ふちが 見えて いれば それで よい）  */
function hiddenReport(all, backCount, label) {
  const N = 48, out = [];
  for (let i = 0; i < backCount; i++) {
    const r = all[i];
    const later = new Uint8Array(N * N);
    for (let j = i + 1; j < all.length; j++) {
      const q = all[j];
      for (let y = q[1]; y < q[1] + q[3]; y++) for (let x = q[0]; x < q[0] + q[2]; x++) later[y * N + x] = 1;
    }
    let total = 0, hid = 0;
    for (let y = r[1]; y < r[1] + r[3]; y++) for (let x = r[0]; x < r[0] + r[2]; x++) {
      total++; if (later[y * N + x]) hid++;
    }
    if (!total) continue;
    const k = hid / total;
    if (k > 0.7) {
      out.push({ bad: k > 0.9, msg: label + ' うしろの かざりが ' + Math.round(k * 100) + '% かくれる: [' + r.join(',') + ']' });
    }
  }
  return out;
}

/* ---- 組み立て ---- */
const byId = {};
defs.ALL.forEach(function (m) { byId[m.id] = m; });

const names = {}, ids = {};
MQ.enemies.list.concat(MQ.enemies.bosses).forEach(function (e) { names[e.name] = e.id; ids[e.id] = 1; });
defs.ALL.forEach(function (m) { if (!ids[m.id]) { ids[m.id] = 1; names[m.name] = m.id; } });

const problems = [];   // 直す ところ
const notes = [];      // 見て おく ところ（マントの ふち など）
const arts = {};
const rows = [];

evo.forEach(function (line) {
  const base = byId[line.from];
  if (!base) throw new Error('1段階めが ない: ' + line.from);
  const row = { from: base, steps: [] };

  line.steps.forEach(function (d) {
    const made = kit.compose(base.shape, d);
    const art = made.art;
    const colors = lift(base.colors, d.lift);
    if (d.cx) Object.assign(colors, d.cx);   // 体の 色を はっきり 変える（けもの・ほしの 子）
    if (d.m) colors.m = d.m;

    /* ① はみ出し ② 色キー は render.box が 見る（下の card で 数える） */

    /* ③ かくれる かざり */
    hiddenReport(art, made.backCount, d.id).forEach(function (m) {
      (m.bad ? problems : notes).push(m.msg);
    });

    /* ④ 意図しない まばたき */
    const blink = Object.keys(MQ.blocks.pickEyesTest(art)).length;
    if (blink) problems.push(d.id + ' 意図しない まばたき ' + blink + 'こ');

    /* ⑦ カプセルの 宝石 */
    const gem = art.filter(function (r) { return r[4] === 'j1' || r[4] === 'j2'; }).length;
    if (gem < 2) problems.push(d.id + ' カプセルの 宝石が ない（' + gem + '）');

    /* ⑤ 名前・id の かぶり */
    if (names[d.name]) problems.push(d.id + ' 名前が かぶり: ' + d.name + ' ← ' + names[d.name]);
    if (ids[d.id]) problems.push(d.id + ' id が かぶり');
    names[d.name] = d.id; ids[d.id] = 1;

    /* ⑥ 1段階めから 変わって いるか。
       **2段階めは「色が 変わる だけ」でも よい**（いまの ゲームの スカル → ゴールドスカル、
       ロボ → メカロボ は 色だけ）。けもの・ほしの 子は 体に 金の かざりを つけると
       顔や 体の まん中に 板が わたって 見えるので、色で 進化を 見せる。 */
    const add = art.length - base.shape.length;
    if (d.stage === 3 && add < 5) problems.push(d.id + ' 3段階めなのに ' + add + 'こ しか ふえて いない');
    if (d.stage === 2 && add < 1 && !d.cx) problems.push(d.id + ' 2段階めが 1段階めと 同じ（かざりも 色の さしかえも ない）');

    arts[d.id] = art;
    row.steps.push({ id: d.id, name: d.name, stage: d.stage, colors: colors, art: art });
  });

  rows.push(row);
});

/* ---- 一覧の ページ ---- */
let warnCount = 0;

function cell(name, id, sub, shape, colors) {
  const big = render.box(shape, colors, 132);
  const small = render.box(shape, colors, 52);
  warnCount += big.warns.length;
  return '<div class="cell">'
    + '<div class="row">' + big.html + '<div class="side">' + small.html + '<div class="lab">ずかん</div></div></div>'
    + '<div class="nm">' + name + '</div>'
    + '<div class="id">' + id + ' <b>' + sub + '</b>（' + shape.length + 'こ）</div>'
    + (big.warns.length ? '<div class="warn">' + big.warns.join('<br>') + '</div>' : '')
    + '</div>';
}

const body = rows.map(function (r) {
  return '<div class="line">'
    + cell(r.from.name, r.from.id, '1だんかい', r.from.shape, r.from.colors)
    + '<div class="arrow">▶</div>'
    + cell(r.steps[0].name, r.steps[0].id, '2だんかい Lv.10', r.steps[0].art, r.steps[0].colors)
    + '<div class="arrow">▶</div>'
    + cell(r.steps[1].name, r.steps[1].id, '3だんかい Lv.20', r.steps[1].art, r.steps[1].colors)
    + '</div>';
}).join('');

const html = '<!doctype html><html><head><meta charset="utf-8"><title>カプセル モンスターの 進化</title>'
  + render.FONTS + '<style>' + render.CSS
  + '.line{display:flex;align-items:center;gap:10px;margin-bottom:14px;'
  + 'background:linear-gradient(#243255,#1a2442);border-radius:16px;padding:12px;'
  + 'box-shadow:0 6px 0 #0c1330,inset 0 2px 0 rgba(255,255,255,.1)}'
  + '.cell{flex:1}.arrow{color:#ffd447;font-size:20px;flex:none}'
  + '.id b{color:#ffd447}'
  + '</style></head><body>'
  + '<h1>カプセル専用モンスター 18系統 × 3段階（54体）</h1>'
  + '<p style="color:#8fa0c4;font-size:12px;margin:0 0 14px">'
  + '引けるのは 1段階め だけ。2段階め＝相棒に して Lv.10／3段階め＝Lv.20。</p>'
  + body + '</body></html>';

fs.writeFileSync(path.join(__dirname, 'sheet2.html'), html);
fs.writeFileSync(path.join(__dirname, 'evo-arts.json'), JSON.stringify(arts, null, 1));

console.log('進化形 ' + Object.keys(arts).length + '体 ／ 気に なる ところ ' + warnCount);
notes.forEach(function (p) { console.log('  （見て おく）' + p); });
problems.forEach(function (p) { console.log('  ' + p); });
console.log(problems.length || warnCount ? '--- 直す ところが ある ---' : 'OK');
if (problems.length || warnCount) process.exitCode = 1;
