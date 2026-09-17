/* ボスを ふやす（v14.7）の キャンバスを 作る（絵は final2.js）：node build2.js <出力フォルダ>
   出力フォルダ/project/ に Main.dc.html・Big.dc.html・canvas.json・arena.jpg を 書く */
const fs = require('fs');
const path = require('path');
const R = require('./render.js');
delete require.cache[require.resolve('./final2.js')];
const F2 = require('./final2.js');
const S = Object.assign({ PALS: F2.PALS }, F2.SHAPES);
delete require.cache[require.resolve('./final.js')];
const F = require('./final.js');

const OUT = path.join(process.argv[2] || path.join(__dirname, 'canvas2'), 'project');
fs.mkdirSync(OUT, { recursive: true });

/* いまの ボス（ゲームの ままの 絵と 色） */
const common = { k: '#141018', w: '#FFFFFF', r: '#FF4D4D', y: '#FFD447', e: '#4FD3FF' };
function palOf(colors, matk) {
  const p = Object.assign({}, common, colors);
  if (!p.B) p.B = R.darker(p.A, 0.34);
  if (!p.C) p.C = R.lighter(p.A, 0.34);
  if (!p.D) p.D = R.darker(p.B, 0.3);
  const MATK = Object.assign({ y: 'metal', r: 'gem', e: 'gem', w: 'bone', A: 'body', B: 'body', C: 'body', D: 'body' }, matk || {});
  const out = {};
  Object.keys(p).forEach(function (k) { out[k] = { c: p[k], m: MATK[k] }; });
  return out;
}

/* v14.6 の 竜王・青鬼（64マス・final.js）＋enemies.js の 色 */
const DRAGON_PAL = palOf({ A: '#B31F1A', B: '#761612', C: '#8E1A16', D: '#5A1210', w: '#F5E0B0', y: '#F2C14E', k: '#2B1512', e: '#FFE14A', r: '#FFB13A' });
const ONI_PAL = palOf({ A: '#3F7FD6', B: '#2B5AA6', C: '#B8281F', D: '#8F1F1A', y: '#F2C14E', s: '#CFD8E6', P: '#8B95A8', w: '#F1E6C8', W: '#F4F0E6', e: '#FFE14A', k: '#1B0C0C', r: '#7A1512', m: '#5A2D17' }, { s: 'metal', P: 'metal', W: 'bone' });

/* いまの 48マスの ボス（monsterart.js から 写し） */
const NOW48 = {
  knight: { pal: palOf({ A: '#8A9BB8', B: '#12121A' }), shape: [
    [22, 0, 5, 6, 'r', 'g'], [12, 4, 24, 18, 'A', 'h'], [15, 11, 18, 6, 'k', 'n'],
    [17, 12, 5, 4, 'r', 'g'], [26, 12, 5, 4, 'r', 'g'], [11, 22, 26, 16, 'A'], [19, 26, 10, 8, 'B'],
    [3, 23, 8, 13, 'B'], [37, 23, 8, 13, 'B'], [14, 38, 9, 8, 'B'], [25, 38, 9, 8, 'B']] },
  titan: { pal: palOf({ A: '#8A7B63', B: '#4E4436' }), shape: [
    [19, 0, 10, 4, 'B'], [14, 3, 20, 14, 'A', 'h'], [17, 7, 5, 5, 'y', 'g'], [26, 7, 5, 5, 'y', 'g'],
    [19, 14, 10, 3, 'r', 'g'], [1, 16, 13, 13, 'B'], [34, 16, 13, 13, 'B'], [12, 17, 24, 19, 'A'],
    [20, 22, 8, 9, 'r', 'g'], [3, 28, 10, 13, 'A'], [35, 28, 10, 13, 'A'], [13, 36, 10, 12, 'B'], [25, 36, 10, 12, 'B']] },
  kingslime: { pal: palOf({ A: '#FFA33A', B: '#B35F00' }), shape: [
    [14, 1, 5, 7, 'y'], [21, 0, 6, 8, 'y'], [29, 1, 5, 7, 'y'], [13, 6, 22, 6, 'y'],
    [11, 11, 26, 9, 'A', 'h'], [4, 18, 40, 24, 'A'], [4, 36, 40, 6, 'B', 'n'],
    [13, 24, 6, 8, 'k', 'n'], [29, 24, 6, 8, 'k', 'n'], [19, 33, 10, 4, 'k', 'n']] }
};

const HF = "font-family: 'Mochiy Pop One', 'Hiragino Maru Gothic ProN', 'Yu Gothic', sans-serif";
const BF = "font-family: 'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'Yu Gothic', sans-serif";

function page(w, h, inner) {
  return '<!doctype html>\n<html lang="ja">\n<head>\n  <meta charset="utf-8">\n  <script src="./support.js"></script>\n</head>\n<body>\n<x-dc>\n<helmet>\n' +
    '  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mochiy+Pop+One&amp;family=Zen+Maru+Gothic:wght@500;700&amp;display=swap">\n' +
    '  <style>\n    body { margin: 0; background: #131c36; }\n  </style>\n</helmet>\n' +
    '<div style="width: ' + w + 'px; height: ' + h + 'px; box-sizing: border-box; padding: 40px 44px; background: #131c36; display: flex; flex-direction: column; gap: 24px; overflow: hidden">' +
    inner + '</div>\n</x-dc>\n' +
    '<script data-dc-script data-props=\'{"$preview":{"width":' + w + ',"height":' + h + '}}\'>\nclass Component extends DCLogic {\n  renderVals() { return {}; }\n}\n</script>\n</body>\n</html>\n';
}

/* バトル画面（400×210）に ボスを おく。base 64＝足もと y 62／base 48＝足もと y 46 */
function cell(art, base, size, label, sub, tone) {
  const feet = base === 64 ? 62 : 46;
  const top = Math.round(143 - size * feet / base);
  const inner = '<div style="position: absolute; left: ' + (390 - size) + 'px; top: ' + top + 'px">' + art + '</div>';
  return '<div style="display: flex; flex-direction: column; gap: 8px; width: 400px; flex: none">' +
    '<div style="position: relative; width: 400px; height: 210px; overflow: hidden; border-radius: 10px; box-shadow: 0 0 0 2px #1b2540">' +
    '<img src="arena.jpg" style="position: absolute; left: 0; top: 0; width: 400px; height: 210px; display: block" alt="">' + inner + '</div>' +
    '<div style="display: flex; align-items: baseline; gap: 10px">' +
    '<div style="' + HF + '; font-size: 17px; color: ' + (tone || '#ffd447') + '">' + label + '</div>' +
    '<div style="' + BF + '; font-weight: 700; font-size: 14px; color: #e8ecf7">' + sub + '</div></div></div>';
}

function head(txt, color) {
  return '<div style="' + HF + '; font-size: 22px; color: ' + color + '">' + txt + '</div>';
}
function row(cells) {
  return '<div style="display: flex; gap: 28px">' + cells.join('') + '</div>';
}

const A64 = function (id, size) { return R.art(S[id], S.PALS[id], 64, size); };

/* ---------- Main：バトル画面で 序盤 → 中盤 → 終盤 ---------- */
function main() {
  const rows = [];
  rows.push(head('算数の山（序盤 → 中盤 → 終盤）', '#ff8f5e') + row([
    cell(A64('saidon', 120), 64, 120, 'イワサイドン', '序盤の ボス（新）・岩の よろいの サイ'),
    cell(A64('majin', 128), 64, 128, 'ナンバーマジン', '中盤の ボス（新）・数字の 魔人'),
    cell(R.art(F.dragon, DRAGON_PAL, 64, 136), 64, 136, '竜王 ナンバードラゴン', '終盤＝いまの ボスの まま', '#9fd4f2')
  ]));
  rows.push(head('国語の森', '#63d94f') + row([
    cell(A64('fude', 120), 64, 120, 'フデダヌキ', '序盤の ボス（新）・大筆の たぬき'),
    cell(A64('tengu', 128), 64, 128, 'カラステング', '中盤の ボス（新）・カラス天狗'),
    cell(R.art(F.oni, ONI_PAL, 64, 136), 64, 136, '青鬼の 大将 モジオニ', '終盤＝いまの ボスの まま', '#9fd4f2')
  ]));
  rows.push(head('理科の湖', '#4fd3ff') + row([
    cell(A64('namazu', 120), 64, 120, 'ビリビリナマズ', '序盤の ボス（新）・電気の 大なまず'),
    cell(A64('mizuchi', 128), 64, 128, 'アオミズチ', '中盤の ボス（新）・湖の 水竜'),
    cell(A64('mech', 136), 64, 136, 'メカナイト（作り直し）', '終盤・64マスで 作り直し'),
    cell(R.art(NOW48.knight.shape, NOW48.knight.pal, 48, 96), 48, 96, 'いまの メカナイト', '48マス（作り直し 前）', '#8fa0c4')
  ]));
  rows.push(head('社会の町', '#ffb43a') + row([
    cell(A64('koban', 120), 64, 120, 'コバンネズミ', '序盤の ボス（新）・小判の 大ネズミ'),
    cell(A64('haniwa', 128), 64, 128, 'ハニワショーグン', '中盤の ボス（新）・はにわの 将軍'),
    cell(A64('titan', 136), 64, 136, 'グランドタイタン（作り直し）', '終盤・64マスで 作り直し'),
    cell(R.art(NOW48.titan.shape, NOW48.titan.pal, 48, 96), 48, 96, 'いまの グランドタイタン', '48マス（作り直し 前）', '#8fa0c4')
  ]));
  rows.push(head('英語の空', '#c9b8ff') + row([
    cell(A64('prince', 120), 64, 120, 'プリンススライム', '序盤の ボス（新）・スライムの 王子'),
    cell(A64('griffon', 128), 64, 128, 'アルファグリフォン', '中盤の ボス（新）・「A」の グリフォン'),
    cell(A64('kingslime', 136), 64, 136, 'キングスライム（作り直し）', '終盤・64マスで 作り直し'),
    cell(R.art(NOW48.kingslime.shape, NOW48.kingslime.pal, 48, 96), 48, 96, 'いまの キングスライム', '48マス（作り直し 前）', '#8fa0c4')
  ]));
  const header =
    '<div style="display: flex; flex-direction: column; gap: 10px">' +
    '<div style="' + HF + '; font-size: 34px; color: #ffd447; letter-spacing: 1px">ボスを ふやす（序盤・中盤・終盤の 3体に）</div>' +
    '<div style="' + BF + '; font-weight: 700; font-size: 17px; color: #e8ecf7; line-height: 1.7; text-wrap: pretty">' +
    '決まった こと：エリアの ボスを ザコと 同じ ように 序盤 → 中盤 → 終盤で 交代（終盤＝いまの ボス）／5エリア いっきに／古い 3体は 64マスで 作り直し。<br>' +
    'ここでは 新しい 10体の すがたと 名前、作り直しの 3体を えらびます。絵は ゲームと 同じ ぬり方の 2D（3D に すると 奥ゆきが つきます）。' +
    '大きさは 序盤 120px・中盤 128px・終盤 136px（ボスが 強く なるほど 大きい）。</div></div>';
  return page(1840, 2010, header + rows.join(''));
}

/* ---------- Big：13体を 大きく ---------- */
const NOTES = [
  ['saidon', 'イワサイドン', '算数・序盤', '岩の よろいの サイ。山の 番人。大きな つのが じまん。'],
  ['majin', 'ナンバーマジン', '算数・中盤', '数字の 魔人。つえの「＋」と 数字の ふだで 数の まほうを つかう。'],
  ['fude', 'フデダヌキ', '国語・序盤', '大筆を もった たぬき。すみの まほうで あばれる。'],
  ['tengu', 'カラステング', '国語・中盤', '森の カラス天狗。葉うちわで かまいたちを おこす。'],
  ['namazu', 'ビリビリナマズ', '理科・序盤', '湖の 大なまず。ひげから 電気を 出す（理科の 電気）。'],
  ['mizuchi', 'アオミズチ', '理科・中盤', '湖の ぬし・水の 竜。とぐろを まいて 水を あやつる。'],
  ['koban', 'コバンネズミ', '社会・序盤', '町の おたから どろぼう。大きな 小判を かかえて はなさない。'],
  ['haniwa', 'ハニワショーグン', '社会・中盤', '大むかしの はにわの 将軍（歴史）。目の おくが 赤く 光る。'],
  ['prince', 'プリンススライム', '英語・序盤', 'キングスライムの 王子。じしんまんまんの わらい。'],
  ['griffon', 'アルファグリフォン', '英語・中盤', '空の 王者。むねに 金の「A」の もんしょう。'],
  ['mech', 'メカナイト', '理科・終盤（作り直し）', 'バイザーと コアが 光る。エネルギーの 大けんと 大きな たて。'],
  ['haniwa2', '', '', ''],
  ['kingslime', 'キングスライム', '英語・終盤（作り直し）', '大きな かんむりと 王の マント。けらいの 小スライム 2ひき。'],
  ['titan', 'グランドタイタン', '社会・終盤（作り直し）', 'かたの 岩・むねの 光る もんしょう・地面に つく 大こぶし。']
];
function big() {
  const cells = NOTES.filter(function (n) { return n[1]; }).map(function (n) {
    return '<div style="display: flex; flex-direction: column; gap: 8px; width: 272px; flex: none">' +
      '<div style="display: flex; justify-content: center; padding: 10px 0; background: #101a33; border-radius: 12px; box-shadow: inset 0 0 0 2px #1b2540">' +
      R.art(S[n[0]], S.PALS[n[0]], 64, 248) + '</div>' +
      '<div style="display: flex; align-items: baseline; gap: 8px"><div style="' + HF + '; font-size: 16px; color: #ffd447">' + n[1] + '</div>' +
      '<div style="' + BF + '; font-weight: 700; font-size: 12px; color: #8fa0c4">' + n[2] + '</div></div>' +
      '<div style="' + BF + '; font-weight: 700; font-size: 13px; color: #e8ecf7; line-height: 1.6; text-wrap: pretty">' + n[3] + '</div></div>';
  });
  const header = '<div style="' + HF + '; font-size: 28px; color: #ffd447">13体を 大きく（名前と せってい）</div>';
  return page(1620, 1560, header + '<div style="display: flex; flex-wrap: wrap; gap: 28px">' + cells.join('') + '</div>');
}

fs.writeFileSync(path.join(OUT, 'Main.dc.html'), main());
fs.writeFileSync(path.join(OUT, 'Big.dc.html'), big());
fs.copyFileSync(path.join(__dirname, 'arena.jpg'), path.join(OUT, 'arena.jpg'));

const canvas = {
  v: 3,
  createdOnFiles: { v: 1, at: new Date().toISOString() },
  title: 'ボスを ふやす 案',
  launch: { view: 'canvas' },
  boards: {
    'Main.dc.html': { x: 0, y: 0, w: 1840, h: 2010, title: 'バトル画面で 見る（序盤 → 中盤 → 終盤）' },
    'Big.dc.html': { x: 0, y: 2170, w: 1620, h: 1560, title: '13体を 大きく' }
  },
  order: ['Main.dc.html', 'Big.dc.html'],
  notes: {
    kettei: { x: 1900, y: 40, w: 330, text: '決まった こと（2026-09-17）\n\n・エリアの ボスを 序盤・中盤・終盤の 3体に（終盤＝いまの ボス）\n・5エリア いっきに（新ボス 10体）\n・古い 3体（メカナイト・キングスライム・グランドタイタン）は 64マスで 作り直し\n・ボスは 強く なるほど 大きい（120 → 128 → 136px）' },
    tsugi: { x: 1900, y: 560, w: 330, text: 'OK の あとに 作る もの\n\n・3D の 部品分け（13体・boss3d.js）\n・おこった とき（第2形態）の 色\n・ゲームに つなぐ（bossFor に 序盤・中盤・終盤／図かん／smoke／harness）\n・にげた敵・きろくは id ごと なので 古い セーブは そのまま' },
    kiku: { x: 1900, y: 1080, w: 330, text: '聞きたい こと\n\n・気に 入らない 1体が あれば 名ざしで（その 1体だけ 別の 案を 出します）\n・名前も 変えられます\n・ぜんぶ OK なら「OKだよ」で 3D と ゲームつなぎに 進みます' }
  }
};
fs.writeFileSync(path.join(OUT, 'canvas.json'), JSON.stringify(canvas, null, 2));
console.log('ok', OUT);
