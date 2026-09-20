/* harness に ボスの 見る モードを 足す（v14.6）
   #boss64[:<ms>]      … 2体を 2D と 3D（ふつう・おこった）で 大きく ならべる。ms＝その 時間で 動きを 止める
   #bossof:<ステージ>  … その ステージの ボス戦まで 進める（例 #bossof:kokugo3-1） */
const fs = require('fs');
const path = require('path');
const ROOT = process.argv[2] || path.join(__dirname, '..', '..');
const f = path.join(ROOT, 'tools', 'harness.html');
let s = fs.readFileSync(f, 'utf8');
const A = "    if (mode === 'boss') {\n      fresh();\n      MQ.ui.battle.start('sansu3-6');";
if (s.split(A).length !== 2) throw new Error('アンカー');
const ADD = [
  "    /* ボスの 作り直し（v14.6）：#boss64[:<ms>]＝2体を 2D・3D・おこった で ならべる／#bossof:<ステージ>＝その ボス戦まで */",
  "    if (mode.indexOf('boss64') === 0) {",
  "      fresh();",
  "      const ms = +(mode.split(':')[1] || 0);",
  "      const wrap = document.createElement('div');",
  "      wrap.style.cssText = 'position:fixed;inset:0;z-index:999;background:#5b8fd8;display:grid;grid-template-columns:repeat(3,260px);gap:10px;padding:10px;align-content:start';",
  "      ['boss-dragon', 'boss-oni'].forEach(function (id) {",
  "        const cell = function (el, t) { const c = document.createElement('div'); c.style.cssText = 'position:relative;height:270px;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.08)'; c.appendChild(el); const l = document.createElement('div'); l.textContent = t; l.style.cssText = 'position:absolute;left:4px;top:2px;font:12px sans-serif;color:#fff'; c.appendChild(l); wrap.appendChild(c); };",
  "        cell(MQ.enemies.node(id, { size: 256 }), id + ' 2D');",
  "        cell(MQ.ui.v3.monster(id, 256, { mo: 'mo-menace' }), id + ' 3D');",
  "        cell(MQ.ui.v3.monster(id, 256, { mo: 'mo-menace', enrage: true }), id + ' 3D おこった');",
  "        const v = MQ.ui.v3.monster(id, 256, { mo: 'mo-menace' });",
  "        const vv = v.querySelector('.v3');",
  "        say(id + ': parts=' + (vv ? vv.dataset.parts : '-') + ' boxes=' + (vv ? vv.dataset.boxes : '-') + ' faces=' + (vv ? vv.dataset.faces : '-'));",
  "      });",
  "      document.body.appendChild(wrap);",
  "      await wait(300);",
  "      if (ms) { freeze(); document.getAnimations().forEach(function (a) { a.pause(); a.currentTime = ms; }); }",
  "      return;",
  "    }",
  "    if (mode.indexOf('bossof:') === 0) {",
  "      fresh();",
  "      MQ.ui.battle.start(mode.split(':')[1]);",
  "      await wait(400);",
  "      await playBattle('boss', { stopAtBoss: true });",
  "      await wait(2200);",
  "      const b = $('.foes .enemy');",
  "      say('bossof: ' + (b ? b.className : 'none') + ' name=' + (($('.hpbar__name') || {}).textContent || ''));",
  "      return;",
  "    }",
  ""
].join('\n');
s = s.replace(A, function () { return ADD + A; });
fs.writeFileSync(f, s);
console.log('ok');
