/* カプセルの 演出（v13.14）を 1つだけ 動かす 検査ページ tools/3d/capfx.html を 作る。
   index.html の css と script の じゅんばんを そのまま 写す（boot.js は のぞく）。
   まだ index.html に 入って いない ときは capsule3d.js／capsulefx.js／capsulefx.css を 足す。
   使い方：node tools/3d/mkcapfx.js → capfx.html#<n|r|sr>[:<4けたの はしご 例 0123>][:<おまけ sneeze|peek|double|none>]
   headless では --virtual-time-budget の 時間が 画面の 時間（タップは 自動で 進む）。 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = [], js = [];
idx.replace(/<link rel="stylesheet" href="([^"]+)"/g, function (m, href) { css.push(href); return m; });
idx.replace(/<script src="([^"]+)"><\/script>/g, function (m, src) { if (src.indexOf('boot.js') < 0) js.push(src); return m; });
if (css.indexOf('css/capsulefx.css') < 0) css.push('css/capsulefx.css');
if (js.indexOf('js/content/capsule3d.js') < 0) js.splice(js.indexOf('js/content/chest3d.js') + 1, 0, 'js/content/capsule3d.js');
if (js.indexOf('js/ui/capsulefx.js') < 0) js.splice(js.indexOf('js/ui/capsule.js'), 0, 'js/ui/capsulefx.js');
const rel = function (u) { return /^https?:/.test(u) ? u : '../../' + u; };
const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>カプセルの 演出の 検査</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
${css.map(function (c) { return '<link rel="stylesheet" href="' + rel(c).replace(/&/g, '&amp;') + '">'; }).join('\n')}
</head><body>
<div id="stage" class="stage">
  <main id="screen-start" class="screen is-active"></main>
  <div id="toast" class="toast" role="status"></div>
</div>
${js.map(function (s) { return '<script src="' + rel(s) + '"></script>'; }).join('\n')}
<script>
/* #<n|r|sr>[:<はしご 4けた>][:<おまけ>][:nopal][:2d][:cold] */
(function () {
  const q = (location.hash || '#sr').slice(1).split(':');
  const rar = ['n', 'r', 'sr'].indexOf(q[0]) >= 0 ? q[0] : 'sr';
  const plan = q[1] && /^[0-3]{4}$/.test(q[1]) ? q[1].split('').map(Number) : undefined;
  const bonus = q[2] && q[2] !== '-' ? (q[2] === 'none' ? null : q[2]) : null;
  try { localStorage.clear(); } catch (e) {}
  MQ.stage.fit();
  MQ.save.load();
  MQ.save.setSetting('sfx', false); MQ.save.setSetting('bgm', false);
  if (q.indexOf('2d') >= 0) MQ.save.setSetting('v3', false);
  MQ.save.createPlayer('こうた', { hair: 'gold', skin: 'mid', style: 'short' });
  if (q.indexOf('nopal') < 0) MQ.save.update(function (pl) { MQ.pals.add(pl, 'slime-green'); });
  const item = rar === 'sr' ? ['cap-phoenix', 'フェニクス'] : rar === 'r' ? ['cap-starcat', 'ホシネコ'] : ['cap-knight', 'ミニナイト'];
  /* ゲームと 同じ：カプセルの 画面を ひらいた ときに 先に 組んで おいて（warm）、すこし あとで まわす。:cold は 組まずに すぐ */
  const cold = q.indexOf('cold') >= 0;
  if (!cold) MQ.ui.capsuleFx.warm();
  setTimeout(function () { MQ.ui.capsuleFx.play({
    rarity: rar, plan: plan, bonus: bonus,
    reveal: {
      badge: { n: 'ノーマル', r: 'レア', sr: 'げきレア' }[rar],
      art: function (s) { return MQ.ui.v3.on() ? MQ.ui.v3.monster(item[0], s, { ry: -14, mo: 'mo-title' }) : MQ.enemies.node(item[0], { size: s }); },
      name: item[1], msg: q.indexOf('dup') >= 0 ? 'コインが 5まい もどって きた！' : 'あたらしい なかま！',
      isNew: q.indexOf('dup') < 0, dup: q.indexOf('dup') >= 0, refund: 5
    },
    onNext: function () { document.title = 'next'; }
  }); }, cold ? 0 : 700);
  window.__fx = MQ.ui.capsuleFx;
})();
</script>
</body></html>
`;
fs.writeFileSync(path.join(__dirname, 'capfx.html'), html);
console.log('ok', css.length + ' css', js.length + ' js');
