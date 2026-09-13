// カプセルの 演出（v13.14）の 動く 見本：index.html の css/js を じゅんに インラインに して 1まいの HTML に する
// node tools/3d/build_capdemo.js <出す ファイル> → スマホで 見られる アーティファクト用（git には 入れない）
// index.html に まだ 入って いない ときは capsule3d.js／capsulefx.js／capsulefx.css を 足す（mkcapfx.js と 同じ）
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..').split(String.fromCharCode(92)).join('/') + '/';
const OUT = process.argv[2] || path.join(__dirname, 'capdemo.html');
const idx = fs.readFileSync(ROOT + 'index.html', 'utf8');
const css = [...idx.matchAll(/<link rel="stylesheet" href="(css\/[^"]+)"/g)].map(function (m) { return m[1]; });
const js = [...idx.matchAll(/<script src="(js\/[^"]+)"/g)].map(function (m) { return m[1]; }).filter(function (f) { return f.indexOf('boot.js') < 0; });
if (css.indexOf('css/capsulefx.css') < 0) css.push('css/capsulefx.css');
if (js.indexOf('js/content/capsule3d.js') < 0) js.splice(js.indexOf('js/content/chest3d.js') + 1, 0, 'js/content/capsule3d.js');
if (js.indexOf('js/ui/capsulefx.js') < 0) js.splice(js.indexOf('js/ui/capsule.js'), 0, 'js/ui/capsulefx.js');
const fontLink = (/<link rel="stylesheet" href="(https:\/\/fonts\.googleapis\.com[^"]+)"/.exec(idx) || [])[1];
const safe = function (s) { return s.replace(/<\/script/gi, '<\\/script'); };

let out = '<title>ほしぞらの しょうかん</title>\n';
if (fontLink) out += '<link rel="stylesheet" href="' + fontLink + '">\n';
out += '<style>\n' + css.map(function (f) { return '/* ' + f + ' */\n' + fs.readFileSync(ROOT + f, 'utf8'); }).join('\n') + '\n';
out += `
/* 見本の パネル */
.cdemo { position: absolute; inset: 0; z-index: 50; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 24px;
  background: radial-gradient(120% 70% at 50% 100%, #2a1f6b 0%, #141a44 45%, #0a0e24 100%); color: #e8ecf7; font-family: var(--f-body, sans-serif); text-align: center; }
.cdemo h1 { margin: 0; font-family: var(--f-head); font-weight: 400; font-size: 26px; color: #ffd447; text-shadow: 0 3px 0 #6a4208; }
.cdemo p { margin: 0; font-size: 14px; line-height: 1.6; color: #9fb2dd; }
.cdemo__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; width: 100%; max-width: 340px; }
.cdemo__grid button { min-height: 52px; padding: 8px 10px; border: 0; border-radius: 14px; cursor: pointer; font: 700 15px var(--f-body, sans-serif); line-height: 1.3;
  color: #1c2340; background: linear-gradient(#fffdf4, #ffe89a); box-shadow: 0 5px 0 #b8801d; }
.cdemo__grid button small { display: block; font-size: 11px; font-weight: 500; color: #6a4208; }
.cdemo__grid button.sr { color: #fff; background: linear-gradient(#c7a8ff, #8d5fe0); box-shadow: 0 5px 0 #4b2a8f; }
.cdemo__grid button.sr small { color: #efe4ff; }
.cdemo__grid button.wide { grid-column: 1 / -1; }
.cdemo label { font-size: 13px; color: #9fb2dd; }
</style>
<script>try { delete Navigator.prototype.serviceWorker; } catch (e) {}</script>
<div id="stage" class="stage">
  <main id="screen-start" class="screen is-active"></main>
  <div id="toast" class="toast" role="status"></div>
  <div class="cdemo" id="cdemo">
    <h1>カプセルの 演出</h1>
    <p>ボタンを おすと まわります。<br>ハンドルと カプセルは タップ（しなくても 進みます）。右上の「とばす」で すぐ 登場。</p>
    <div class="cdemo__grid">
      <button data-r="n" data-p="0000" data-b="none">ノーマル<small>ふつうの ながれ</small></button>
      <button data-r="n" data-p="0000" data-b="sneeze">ノーマル<small>おまけ：くしゃみ</small></button>
      <button data-r="r" data-p="0111">レア<small>早めに 金</small></button>
      <button data-r="r" data-p="0001">レア<small>さいごに 金へ ぎゃくてん</small></button>
      <button class="sr" data-r="sr" data-p="1223">げきレア<small>金 → むらさき → にじ</small></button>
      <button class="sr" data-r="sr" data-p="0003">げきレア<small>いきなり にじいろ</small></button>
      <button class="wide" data-r="sr" data-p="1223" data-dup="1">かぶり<small>コインが もどって くる</small></button>
    </div>
    <label><input type="checkbox" id="cdsnd" checked> 音を 出す</label>
  </div>
</div>
`;
js.forEach(function (f) { out += '<script>/* ' + f + ' */\n' + safe(fs.readFileSync(ROOT + f, 'utf8')) + '\n</script>\n'; });
out += `<script>
(function () {
  try { localStorage.clear(); } catch (e) {}
  MQ.stage.fit();
  MQ.save.load();
  MQ.save.setSetting('bgm', false);
  MQ.save.createPlayer('こうた', { hair: 'gold', skin: 'mid', style: 'short' });
  MQ.save.update(function (pl) { MQ.pals.add(pl, 'slime-green'); });
  const ITEM = { n: ['cap-knight', 'ミニナイト'], r: ['cap-starcat', 'ホシネコ'], sr: ['cap-phoenix', 'フェニクス'] };
  const panel = document.getElementById('cdemo');
  panel.addEventListener('click', function (e) {
    const b = e.target.closest ? e.target.closest('button') : null;
    if (!b) return;
    MQ.save.setSetting('sfx', !!document.getElementById('cdsnd').checked);
    if (MQ.sfx.setEnabled) MQ.sfx.setEnabled(!!document.getElementById('cdsnd').checked);
    if (MQ.sfx.unlock) MQ.sfx.unlock();
    const r = b.dataset.r, dup = !!b.dataset.dup, it = ITEM[r];
    panel.hidden = true;
    MQ.ui.capsuleFx.play({
      rarity: r, plan: b.dataset.p.split('').map(Number), bonus: b.dataset.b === 'none' ? null : (b.dataset.b || null),
      reveal: {
        badge: { n: 'ノーマル', r: 'レア', sr: 'げきレア' }[r],
        art: function (s) { return MQ.ui.v3.on() ? MQ.ui.v3.monster(it[0], s, { ry: -14, mo: 'mo-title' }) : MQ.enemies.node(it[0], { size: s }); },
        name: it[1], msg: dup ? 'コインが 5まい もどって きた！' : 'あたらしい なかま！', isNew: !dup, dup: dup, refund: 5
      },
      onNext: function () { panel.hidden = false; }
    });
  });
})();
</script>
`;
fs.writeFileSync(OUT, out);
console.log('css', css.length, 'js', js.length, 'bytes', out.length);
