/* キャンバスの 作業ファイルを 作る：node build.js → canvas/ に .dc.html と canvas.json */
const fs = require('fs');
const path = require('path');
const R = require('./render.js');
delete require.cache[require.resolve('./shapes.js')];
const S = require('./shapes.js');
const OUT = path.join(__dirname, 'canvas');
fs.mkdirSync(OUT, { recursive: true });

/* いまの ボス（ゲームの monsterart.js の まま・48マス） */
const common = { k: '#141018', w: '#FFFFFF', r: '#FF4D4D', y: '#FFD447', e: '#4FD3FF' };
function palOf(colors) {
  const p = Object.assign({}, common, colors);
  if (!p.B) p.B = R.darker(p.A, 0.34);
  if (!p.C) p.C = R.lighter(p.A, 0.34);
  if (!p.D) p.D = R.darker(p.B, 0.3);
  const MATK = { y: 'metal', r: 'gem', e: 'gem', w: 'bone', A: 'body', B: 'body', C: 'body', D: 'body' };
  const out = {};
  Object.keys(p).forEach(function (k) { out[k] = { c: p[k], m: MATK[k] }; });
  return out;
}
const NOW = {
  dragon: { shape: [[1, 14, 10, 16, 'B'], [37, 14, 10, 16, 'B'], [10, 4, 28, 16, 'A', 'h'], [10, 0, 6, 8, 'B'], [32, 0, 6, 8, 'B'],
    [15, 9, 6, 6, 'y', 'g'], [27, 9, 6, 6, 'y', 'g'], [15, 16, 18, 4, 'w', 'n'], [11, 20, 26, 17, 'A'], [17, 25, 14, 8, 'B'],
    [12, 37, 9, 8, 'A'], [27, 37, 9, 8, 'A']], pal: palOf({ A: '#4F8CFF', B: '#FFD166' }) },
  oni: { shape: [[12, 0, 6, 9, 'w'], [30, 0, 6, 9, 'w'], [10, 7, 28, 21, 'A', 'h'], [15, 13, 7, 7, 'y', 'g'], [26, 13, 7, 7, 'y', 'g'],
    [15, 22, 18, 5, 'k', 'n'], [16, 22, 4, 5, 'w', 'n'], [28, 22, 4, 5, 'w', 'n'], [13, 28, 22, 12, 'C'], [4, 29, 9, 11, 'A'],
    [35, 29, 9, 11, 'A'], [14, 40, 8, 6, 'A'], [26, 40, 8, 6, 'A']], pal: palOf({ A: '#FF5A5A', C: '#2B2B3A' }) }
};

const OPTS = {
  dragonA: { file: 'DragonA', tag: 'ドラゴン A', name: '王者の 立ち姿',
    aim: '首を 高く 上げ、つばさを 大きく 広げた、いちばん ボスらしい 立ち姿。',
    good: '遠くからでも ひと目で ドラゴンと わかる。いただいた 画像に いちばん 近い。',
    care: 'かざりが 少ない ぶん、強さは 大きさと 動き（はばたき・ほえる）で 出す。' },
  dragonB: { file: 'DragonB', tag: 'ドラゴン B', name: '火を はく 前がかり',
    aim: '首を 前に のばし、口から 火を はく こうげきの かまえ。しっぽは うしろで 高く はねる。',
    good: '動きが あって いちばん こわい。ボスの 大わざ（ため）と ポーズが つながる。',
    care: 'いつも 火を はいて いると うるさい。ふだんは 口を とじて、わざの ときだけ 火に する のが よさそう。' },
  dragonC: { file: 'DragonC', tag: 'ドラゴン C', name: '竜王（金の よろい）',
    aim: 'A の 立ち姿に、金の よろい・かんむりの つの・むねの 光を 足した 王さま。',
    good: 'ボスの 中の ボスらしい。ザコの ドラゴニクス（赤い ドラゴン）と いちばん 見分けやすい。',
    care: 'かざりが 多い ぶん、小さく 出す ところ（図かん）では 少し ごちゃっと 見える。' },
  oniA: { file: 'OniA', tag: '鬼武者 A', name: '赤鬼の 武者',
    aim: '黒い よろい・金の くわがた・うしろに かまえた 大太刀。鬼武者の 王道。',
    good: '赤い 顔が 黒い よろいに 映えて、いちばん 強そう。',
    care: '中ボスの オーガロード（赤い 鬼）と 顔の 色が 同じ。かぶとと よろいで 見分ける。' },
  oniB: { file: 'OniB', tag: '鬼武者 B', name: '青鬼の 大将',
    aim: '青い 顔・白い たてがみ・赤い よろい・なぎなた。口には めんぼお（口の よろい）。',
    good: 'オーガロードと 色で はっきり 分かれる。たてがみで 体が 大きく 見える。',
    care: '青い 顔は 少し やさしく 見える。目と きばを もっと 強く する ひつようが ある。' },
  oniC: { file: 'OniC', tag: '鬼武者 C', name: '旗の 鬼武者',
    aim: '金の よろい・せなかの 旗に「文」の 字・大太刀を かたに かつぐ。',
    good: '国語の ボスらしく、名前の「モジオニ」と つながる。',
    care: '旗の 字は 小さいと 読みにくい。どの 字に するかは あとで えらべる。' }
};

const HEAD = '<!doctype html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <script src="./support.js"></script>\n</head>\n<body>\n<x-dc>\n<helmet>\n  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mochiy+Pop+One&amp;family=Zen+Maru+Gothic:wght@500;700&amp;display=swap">\n  <style>\n    body { margin: 0; background: #131c36; }\n    a { color: #ffd447; } a:hover { color: #ffe89a; }\n  </style>\n</helmet>\n';
const TAIL = '\n</x-dc>\n</body>\n</html>\n';
const HF = "font-family: 'Mochiy Pop One', 'Hiragino Maru Gothic ProN', 'Yu Gothic', sans-serif";
const BF = "font-family: 'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'Yu Gothic', sans-serif";

/* アリーナ（ゲームの バトル画面の 上・400×210 を そのまま）に ボスを おく */
function arena(inner, label, sub) {
  return '<div style="display: flex; flex-direction: column; gap: 10px; width: 400px">' +
    '<div style="position: relative; width: 400px; height: 210px; overflow: hidden; border-radius: 10px; box-shadow: 0 0 0 2px #1b2540">' +
    '<img src="arena.jpg" style="position: absolute; left: 0; top: 0; width: 400px; height: 210px; display: block" alt="">' + inner + '</div>' +
    '<div style="display: flex; align-items: baseline; gap: 10px">' +
    '<div style="' + HF + '; font-size: 18px; color: #ffd447">' + label + '</div>' +
    '<div style="' + BF + '; font-weight: 700; font-size: 15px; color: #e8ecf7">' + sub + '</div></div></div>';
}
/* 足もと y（ステージ px）＝143。新しい ボスは 136px（64マス・足 y=62）、いまの ボスは 96px（48マス・足 y≈46） */
function placeNew(id) {
  const size = 136, top = Math.round(143 - size * 62 / 64);
  return '<div style="position: absolute; left: ' + (392 - size) + 'px; top: ' + top + 'px">' + R.art(S[id], S.PALS[id], 64, size) + '</div>';
}
function placeNow(k) {
  const size = 96, top = Math.round(143 - size * 46 / 48);
  return '<div style="position: absolute; left: ' + (388 - size) + 'px; top: ' + top + 'px">' + R.art(NOW[k].shape, NOW[k].pal, 48, size) + '</div>';
}

/* ---------- Main：バトル画面で くらべる ---------- */
function main() {
  const row = function (k, nowName, ids) {
    return '<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 28px">' +
      arena(placeNow(k), 'いま', nowName) +
      ids.map(function (id) { return arena(placeNew(id), OPTS[id].tag.split(' ')[1], OPTS[id].name); }).join('') + '</div>';
  };
  return HEAD +
    '<div style="width: 1720px; box-sizing: border-box; padding: 40px 44px 44px; background: #131c36; display: flex; flex-direction: column; gap: 26px">' +
    '<div style="display: flex; flex-direction: column; gap: 10px">' +
    '<div style="' + HF + '; font-size: 34px; color: #ffd447; letter-spacing: 1px">ボスの 作り直し</div>' +
    '<div style="' + BF + '; font-weight: 700; font-size: 18px; color: #e8ecf7; line-height: 1.7; text-wrap: pretty">' +
    '決まった こと：ドラゴンは 右の 首長型・赤に 金の つの／鬼は 鬼武者／どちらも 3D の 部品で 組んで 動かす。<br>' +
    'ここでは 形と 色を えらびます。下の 絵は ゲームと 同じ ぬり方の 2D（3D に すると 奥ゆきが つきます）。バトル画面の 大きさは そのまま（いま 96 → 新しい ボス 136）。</div></div>' +
    '<div style="display: flex; flex-direction: column; gap: 14px">' +
    '<div style="' + HF + '; font-size: 22px; color: #ff8f5e">ナンバードラゴン（算数の ボス）</div>' +
    row('dragon', 'ナンバードラゴン', ['dragonA', 'dragonB', 'dragonC']) + '</div>' +
    '<div style="display: flex; flex-direction: column; gap: 14px">' +
    '<div style="' + HF + '; font-size: 22px; color: #63d94f">モジオニ（国語の ボス）</div>' +
    row('oni', 'モジオニ', ['oniA', 'oniB', 'oniC']) + '</div>' +
    '</div>' + TAIL;
}

/* ---------- 1案ずつ（大きく） ---------- */
function detail(id) {
  const o = OPTS[id];
  const line = function (label, color, text) {
    return '<div style="display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 10px; align-items: baseline">' +
      '<div style="' + HF + '; font-size: 15px; color: ' + color + '">' + label + '</div>' +
      '<div style="' + BF + '; font-weight: 700; font-size: 16px; line-height: 1.65; color: #e8ecf7; text-wrap: pretty">' + text + '</div></div>';
  };
  return HEAD +
    '<div style="width: 520px; box-sizing: border-box; padding: 30px 30px 32px; background: #131c36; display: flex; flex-direction: column; gap: 18px">' +
    '<div style="display: flex; align-items: baseline; gap: 12px">' +
    '<div style="' + HF + '; font-size: 26px; color: #ffd447">' + o.tag + '</div>' +
    '<div style="' + BF + '; font-weight: 700; font-size: 20px; color: #e8ecf7">' + o.name + '</div></div>' +
    '<div style="display: flex; justify-content: center; padding: 18px 0; background: #101a33; border-radius: 12px; box-shadow: inset 0 0 0 2px #1b2540">' +
    R.art(S[id], S.PALS[id], 64, 384) + '</div>' +
    '<div style="display: flex; flex-direction: column; gap: 10px">' +
    line('ねらい', '#ffd447', o.aim) + line('よいところ', '#63d94f', o.good) + line('気に なる', '#ff8f5e', o.care) + '</div>' +
    '<div style="display: flex; align-items: center; gap: 14px; padding: 12px 14px; background: #101a33; border-radius: 12px; box-shadow: inset 0 0 0 2px #1b2540">' +
    '<div style="width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; background: #243255; border-radius: 10px">' + R.art(S[id], S.PALS[id], 64, 56) + '</div>' +
    '<div style="' + BF + '; font-weight: 700; font-size: 15px; color: #8fa0c4; line-height: 1.6">図かんでの 大きさ（56px）</div></div>' +
    '</div>' + TAIL;
}

fs.writeFileSync(path.join(OUT, 'Main.dc.html'), main());
const files = ['Main.dc.html'];
Object.keys(OPTS).forEach(function (id) { const f = OPTS[id].file + '.dc.html'; fs.writeFileSync(path.join(OUT, f), detail(id)); files.push(f); });
fs.copyFileSync(path.join(__dirname, 'arena.jpg'), path.join(OUT, 'arena.jpg'));

const H = 850;   // 1案の わくの 高さ
const canvas = {
  artboards: [{ file: 'Main.dc.html', x: 0, y: 0, w: 1720, h: 860, title: 'バトル画面で くらべる' }]
    .concat(['dragonA', 'dragonB', 'dragonC'].map(function (id, i) { return { file: OPTS[id].file + '.dc.html', x: i * 600, y: 960, w: 520, h: H, title: OPTS[id].tag + '｜' + OPTS[id].name }; }))
    .concat(['oniA', 'oniB', 'oniC'].map(function (id, i) { return { file: OPTS[id].file + '.dc.html', x: i * 600, y: 960 + H + 140, w: 520, h: H, title: OPTS[id].tag + '｜' + OPTS[id].name }; })),
  annotations: [
    { id: 'parts3d', x: 1820, y: 960, w: 300, text: 'えらんだ あとに 作る もの\n\n・3D の 部品\n  ドラゴン＝体・首・頭・つばさ・足4本・しっぽ\n  鬼武者＝体・頭・うで（刀）・足\n・動き：はばたく／ほえる／火を はく／刀を ふり下ろす\n・おこった とき（第2形態）の 色\n・図かん・りったい OFF 用の 2D の 絵' },
    { id: 'size', x: 1820, y: 1300, w: 300, text: 'バトルでは 右上に ボスの 名前の わくが ある。つばさの 先が かさならない ように、大きさ（136 まわり）と 位置は 作る ときに 合わせる。' }
  ],
  launch: { view: 'canvas' }
};
fs.writeFileSync(path.join(OUT, 'canvas.json'), JSON.stringify(canvas, null, 2));
console.log('ok', files.join(' '));
