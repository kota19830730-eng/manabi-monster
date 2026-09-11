const fs = require('fs');
const S = 'C:/Users/win11/AppData/Local/Temp/claude/c--Users-win11-OneDrive-----------------/9ab9c329-6486-4337-b53b-df1f0b34a2e9/scratchpad/bg3/';
const img = JSON.parse(fs.readFileSync(S + 'imgs.json', 'utf8'));
const dirs = [
  { k: 'A', name: 'A　遠くの 山なみと まおうの 城', axis: 'しずかな 遠景・RPG の 世界地図ふう',
    what: '遠くに 2重の 青い 山なみ（雪の 山頂）・松の 木の 列・右の 地平線に まおうの 城（窓の 明かり）・鳥。地面ぎわに うすい きり。手前には 何も 置かない。',
    good: ['キャラと モンスターの じゃまを しない（遠くは 色を うすく）', '「ここは ぼうけんの 世界」が 一目で わかる。城は さいごの 塔と つながる', '部品が 少なく 軽い'],
    bad: ['おとなしい。息子さんには 地味に 見えるかも', '動く ものが 鳥だけ'] },
  { k: 'B', name: 'B　ブロックの 森', axis: 'マイクラ寄り・近くて にぎやか',
    what: '緑の ブロックの 丘（上の 面が 明るい）・ブロックの 木 4本・しげみ・花・白い 雲。手前まで 物が ある。',
    good: ['いちばん「マイクラの 世界」に 見える。色が 明るく 子どもむき', 'エリアごとに 木や 花を 変えると ちがいが 出しやすい'],
    bad: ['にぎやかな ぶん、モンスターの うしろが ごちゃつく（バトルでは 木を はしに よせる）', '部品が 多く なるので 軽さは A より 落ちる'] },
  { k: 'C', name: 'C　夕やけ', axis: '空の 色で 見せる・ドラマチック',
    what: '空を 夕やけの グラデーションに。大きな ブロックの 太陽・ピンクの 雲・むらさきの 遠い 山・出はじめの 星。主人公の「ゆうやけの 光」（v10.1）と 同じ 向き。',
    good: ['キャラの 夕日の 光と そろって いちばん きれいに 見える', '空だけで 雰囲気が 変わる ので 部品が 少ない'],
    bad: ['青空の 明るい タイトルが なくなる（アプリ全体の 色の 印象が 変わる）', 'バトルは エリアで 空の 色が ちがう ので、夕やけに できるのは 一部'] }
];
function card(d) {
  return `<section class="dir">
  <header><h2>${d.name}</h2><p class="axis">${d.axis}</p></header>
  <div class="shots">
    <figure><img src="${img['title_' + d.k]}" alt="${d.name} タイトル"><figcaption>タイトル</figcaption></figure>
    <figure><img src="${img['battle_' + d.k]}" alt="${d.name} バトル"><figcaption>バトル（算数の 山）</figcaption></figure>
  </div>
  <p class="what">${d.what}</p>
  <div class="pm">
    <div><h3>良さ</h3><ul>${d.good.map(x => '<li>' + x + '</li>').join('')}</ul></div>
    <div><h3>ひきかえ</h3><ul>${d.bad.map(x => '<li>' + x + '</li>').join('')}</ul></div>
  </div>
</section>`;
}
const html = `<title>背景の 3案</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mochiy+Pop+One&family=Zen+Maru+Gothic:wght@500;700&display=swap">
<style>
:root{--bg:#f6efe3;--bg2:#fffaf0;--tx:#2a2540;--mute:#6b6480;--line:#e2d6bf;--acc:#d9931f;--acc2:#1f3a7a;--good:#2e7d4f;--bad:#b5473a}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#141a3a;--bg2:#1c2450;--tx:#f3eee2;--mute:#b8b2c8;--line:#2f3a6a;--acc:#ffd447;--acc2:#9fc4ff;--good:#7ee06a;--bad:#ff9a8a}}
:root[data-theme="dark"]{--bg:#141a3a;--bg2:#1c2450;--tx:#f3eee2;--mute:#b8b2c8;--line:#2f3a6a;--acc:#ffd447;--acc2:#9fc4ff;--good:#7ee06a;--bad:#ff9a8a}
body{background:var(--bg);color:var(--tx);font-family:"Zen Maru Gothic","Hiragino Maru Gothic ProN","Meiryo",sans-serif;font-weight:500;line-height:1.7;margin:0}
.wrap{max-width:980px;margin:0 auto;padding:28px 18px 60px}
h1{font-family:"Mochiy Pop One","Zen Maru Gothic",sans-serif;font-weight:400;font-size:28px;margin:0 0 6px;text-wrap:balance}
.lead{color:var(--mute);margin:0 0 24px;max-width:38em}
h2{font-family:"Mochiy Pop One","Zen Maru Gothic",sans-serif;font-weight:400;font-size:20px;margin:0}
h3{font-size:13px;letter-spacing:.08em;margin:0 0 4px;color:var(--mute)}
.dir{background:var(--bg2);border:2px solid var(--line);border-radius:14px;padding:18px 18px 16px;margin:0 0 22px}
.dir header{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 14px;margin-bottom:12px}
.axis{margin:0;color:var(--acc2);font-weight:700}
.shots{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.shots figure{margin:0}
.shots img{width:100%;display:block;border-radius:10px;border:2px solid var(--line);background:#000}
figcaption{font-size:12px;color:var(--mute);margin-top:4px}
.what{margin:12px 0 10px}
.pm{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.pm ul{margin:0;padding-left:1.2em}
.pm div:first-child h3{color:var(--good)}.pm div:last-child h3{color:var(--bad)}
.note{border-left:4px solid var(--acc);padding:6px 14px;margin:26px 0;background:var(--bg2);border-radius:0 10px 10px 0}
.note h2{font-size:17px;margin-bottom:6px}
.map{display:grid;grid-template-columns:200px 1fr;gap:16px;align-items:start}
.map img{width:100%;border-radius:10px;border:2px solid var(--line)}
ol,ul{margin:6px 0}
@media (max-width:640px){.shots,.pm,.map{grid-template-columns:1fr}}
</style>
<div class="wrap">
<h1>背景の 3案（タイトル・バトル・地図）</h1>
<p class="lead">キャラと モンスターが りったいに なった ので、うしろの 世界を それに 合わせます。3つは わざと ちがう 方向に して あります。どれか 1つ、または「A の 山なみに B の 木を 足す」の ような 組み合わせでも OK。見本は 本物の 画面に かぶせた 下がきで、細かい 形は 決まって から 作りこみます。</p>
${dirs.map(card).join('\n')}
<div class="note"><h2>3案 共通で やる こと：ゆか</h2>
<p>バトルの 地面を、しま模様から「手前が 大きく 奥が 小さい マス目の ゆか」に かえます（見本の バトルに 入って います）。3D の キャラが ゆかに 立って 見え、足もとの 影とも 合います。エリアごとに 石・土・すな・雲・石だたみ と 色を 変えます。</p></div>
<div class="note"><h2>地図は どう するか</h2>
<div class="map"><img src="${img.map}" alt="いまの 地図">
<div><p>地図は v9.6 で HD に した ので 島の 形や 道は さわりません。えらんだ 方向に 合わせて つぎを そろえます。</p>
<ul><li><b>A</b>：海の 向こうに うすい 山なみを 1列（地図の いちばん 上）。木・岩の 色を 青みに。</li>
<li><b>B</b>：木・家・岩の かざりを ブロックの 木と 同じ 形に 作り直す（上の 面が 明るい つみき）。花と しげみを ふやす。</li>
<li><b>C</b>：地図ぜんたいに 夕日の 色（右上 から の あたたかい 光と、左下の うすい かげ）。学年ごとの 色は そのまま。</li></ul></div></div></div>
<div class="note"><h2>聞きたい こと</h2>
<ol><li>A・B・C の どれか（組み合わせも OK）。</li>
<li>空の 時間は「エリアで 固定」の まま で よいか、「本当の 時計で 朝・昼・夕・夜」に したいか。</li>
<li>ボス戦で 空が 暗く なる 演出は ほしいか。</li></ol></div>
</div>`;
fs.writeFileSync(S + '背景の3案.html', html, 'utf8');
console.log('bytes', Buffer.byteLength(html));
