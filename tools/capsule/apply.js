/* カプセル専用モンスター 54体（18系統 × 3段階）を ゲームに 入れる。
     node tools/capsule/apply.js

   ・絵  → js/content/monsterart.js の mons
   ・データ → js/content/enemies.js の list
   どちらも **しるしの あいだ**（CAPSULE ここから／ここまで）を まるごと 書きかえる ので、
   何回 流しても 同じ 結果に なる（絵を 直したら もう1回 流すだけ）。

   **手で 座標を 打たない。** 形は tools/capsule/defs.js（1段階め）と
   tools/capsule/evo.js＋kit.js（2・3段階め）が 正本。

   きまり（docs/v9.0カプセルマシンとメニューメモ.md）
     ・1段階め … capsuleOnly（カプセルからだけ 出る）＋ cap（n / r / sr）
     ・2・3段階め … evoOnly（相棒に して Lv.10 / Lv.20 で なる。カプセルからも 出ない）
     ・どちらも area を つけない → pickIds（ふつうの たたかい）には 出ない
     ・line / stage / evo は つける（smoke の「系統に 入って いない モンスターが ない」）  */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
const kit = require('./kit.js');
const defs = require('./defs.js');
const evo = require('./evo.js');

const START = '    /* ---------- カプセル専用（v9.0）ここから：tools/capsule/apply.js が 書く ---------- */';
const END = '    /* ---------- カプセル専用 ここまで ---------- */';

/* ---- 色を すこし 明るく（build.js と 同じ）---- */
function mixWhite(hex, k) {
  if (!hex || hex.charAt(0) !== '#') return hex;
  if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  const n = parseInt(hex.slice(1, 7), 16);
  return '#' + [16, 8, 0].map(function (sh) {
    const a = (n >> sh) & 255;
    return ('0' + Math.round(a + (255 - a) * k).toString(16)).slice(-2);
  }).join('');
}
function lift(colors, k) {
  if (!k) return Object.assign({}, colors);
  const out = Object.assign({}, colors);
  ['A', 'B', 'C'].forEach(function (key) { if (out[key]) out[key] = mixWhite(out[key], k); });
  return out;
}

/* ---- 54体を 組み立てる ---- */
const byId = {};
defs.ALL.forEach(function (b) { byId[b.id] = b; });

const made = [];   // { id, name, shape, colors, cap, line, stage, evo, rank }
// つよさ（★の 数だけに つかう。ふつうの たたかいには 出ない）
const RANK = { n: 1, r: 2, sr: 3 };

evo.forEach(function (row) {
  const base = byId[row.from];
  if (!base) { console.log('FAIL: ' + row.from + ' が defs.js に ない'); process.exit(1); }
  const steps = row.steps;
  made.push({
    id: base.id, name: base.name, shape: base.shape, colors: base.colors,
    cap: base.cap, line: base.id, stage: 1, evo: steps[0].id,
    rank: RANK[base.cap] || 1, first: true
  });
  steps.forEach(function (d, i) {
    const m = kit.compose(base.shape, d);
    const colors = lift(base.colors, d.lift);
    if (d.cx) Object.assign(colors, d.cx);
    if (d.m) colors.m = d.m;
    made.push({
      id: d.id, name: d.name, shape: m.art, colors: colors,
      line: base.id, stage: d.stage, evo: steps[i + 1] ? steps[i + 1].id : null,
      rank: Math.min(3, (RANK[base.cap] || 1) + 1 + i), first: false
    });
  });
});

if (made.length !== 54) { console.log('FAIL: ' + made.length + '体（54体の はず）'); process.exit(1); }

/* ---- 48マスから はみ出して いないか（入れる 前の さいごの 検査）---- */
let ng = 0;
made.forEach(function (m) {
  m.shape.forEach(function (r) {
    if (r[0] < 0 || r[1] < 0 || r[0] + r[2] > 48 || r[1] + r[3] > 48) {
      console.log('FAIL: ' + m.id + ' が 48マスから はみ出す ' + JSON.stringify(r)); ng++;
    }
  });
});
if (ng) process.exit(1);

/* ---- 書き出す かたち ---- */
function rowStr(r) {
  const f = r[5];
  return '[' + r[0] + ', ' + r[1] + ', ' + r[2] + ', ' + r[3] + ", '" + r[4] + "'" + (f ? ", '" + f + "'" : '') + ']';
}
function shapeStr(shape, indent) {
  // 1行 3つずつ ならべる（monsterart.js の 書き方に そろえる）
  const out = [];
  for (let i = 0; i < shape.length; i += 3) {
    out.push(indent + shape.slice(i, i + 3).map(rowStr).join(', '));
  }
  return out.join(',\n');
}
function colorStr(c) {
  return '{ ' + Object.keys(c).map(function (k) {
    return (/^[A-Za-z][A-Za-z0-9]*$/.test(k) ? k : "'" + k + "'") + ": '" + c[k] + "'";
  }).join(', ') + ' }';
}

/* ---- ① monsterart.js ---- */
const artBody = made.map(function (m) {
  return '    // ' + m.name + '（' + m.stage + 'だんかい）\n'
    + "    '" + m.id + "': [\n" + shapeStr(m.shape, '      ') + '\n    ]';
}).join(',\n');

/* ---- ② enemies.js ---- */
const dataBody = made.map(function (m) {
  const bits = ["id: '" + m.id + "'", "name: '" + m.name + "'", "shape: '" + m.id + "'",
    'rank: ' + m.rank];
  if (m.first) { bits.push('capsuleOnly: true', "cap: '" + m.cap + "'"); }
  else bits.push('evoOnly: true');
  bits.push("line: '" + m.line + "'", 'stage: ' + m.stage);
  if (m.evo) bits.push("evo: '" + m.evo + "'");
  return '    { ' + bits.join(', ') + ',\n      colors: ' + colorStr(m.colors) + ' }';
}).join(',\n');

/* ---- はさみこむ ---- */
function splice(file, body, head) {
  const p = path.join(root, file);
  let s = fs.readFileSync(p, 'utf8');
  const block = START + '\n' + (head ? head + '\n' : '') + body + '\n' + END;
  const i = s.indexOf(START), j = s.indexOf(END);
  if (i >= 0 && j > i) {
    s = s.slice(0, i) + block + s.slice(j + END.length);
    console.log('ok   ' + file + ' … 書きかえた');
  } else {
    // はじめて 入れる ところを さがす（それぞれの ならびの さいごの 行の あと）
    const anchor = file.indexOf('monsterart') >= 0
      ? "    // きんのコイン"          // items の 前＝mons の おわり を さがす ため 下で 別あつかい
      : '  ];';
    if (file.indexOf('monsterart') >= 0) {
      // mons の おわり（「  };」の 1つめ）の 直前に 入れる
      const end = s.indexOf('\n  };');
      if (end < 0) { console.log('FAIL: monsterart.js の mons の おわりが 見つからない'); process.exit(1); }
      s = s.slice(0, end) + ',\n\n' + block + s.slice(end);
    } else {
      // list の おわり（「  ];」の 1つめ）の 直前に 入れる
      const end = s.indexOf('\n  ];');
      if (end < 0) { console.log('FAIL: enemies.js の list の おわりが 見つからない'); process.exit(1); }
      s = s.slice(0, end) + ',\n\n' + block + s.slice(end);
    }
    console.log('ok   ' + file + ' … はじめて 入れた（anchor ' + anchor.trim().slice(0, 6) + '）');
  }
  fs.writeFileSync(p, s);
}

splice('js/content/monsterart.js', artBody,
  '    /* 18系統 × 3段階。絵の 正本は tools/capsule/defs.js と evo.js。手で 直さない */');
splice('js/content/enemies.js', dataBody,
  '    /* カプセルマシンでしか 手に 入らない 18系統 × 3段階＝54体。\n'
  + '       1段階め＝capsuleOnly（引ける）／2・3段階め＝evoOnly（Lv.10 / Lv.20 で なる）。\n'
  + '       area を つけないので ふつうの たたかい（pickIds）には 出ない。 */');

console.log('\nカプセル専用 ' + made.length + '体（1段階め ' + made.filter(function (m) { return m.first; }).length + '体）を 入れた');
