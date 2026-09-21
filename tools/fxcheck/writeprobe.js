// 書いて いる あいだ「どの スレッドが・何で」ふさがって いるかを 出す
// node writeprobe.js <mode> <回数> [変える ところ]
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const MODE = process.argv[2] || 'last';
const REPS = +(process.argv[3] || 2);
// 4つめ いこうは 「名前=ハッシュの のこり」。交互に まわして 中央の 値（この PC は ぶれる）
const VARS = process.argv.slice(4).map(function (s) { const i = s.indexOf('='); return i < 0 ? { name: 'base', extra: s } : { name: s.slice(0, i), extra: s.slice(i + 1) }; });
if (!VARS.length) VARS.push({ name: 'base', extra: '' });
let EXTRA = '';
const CPU = +(process.env.CPU || 4);
const MOVES = +(process.env.MOVES || 60);
const GAP = +(process.env.GAP || 16);
const DUR = +(process.env.DUR || 3000);
const MINFACE = +(process.env.MINFACE || 0);   // てきの 3D が この 面の 数に なるまで 待つ（ボスが 出る まで）   // 何ミリ秒 ゆびを 動かすか
const HARN = process.env.HARN || require('path').resolve(__dirname, '..', 'harness.html').split(require('path').sep).join('/');

const WATCH = { CrRendererMain: 1, CrGpuMain: 1, VizCompositorThread: 1, Compositor: 1 };
const KIND = { Layerize: 1, Commit: 1, Paint: 1, PrePaint: 1, UpdateLayoutTree: 1, Layout: 1, FunctionCall: 1,
  FireAnimationFrame: 1, TimerFire: 1, UpdateLayer: 1, RasterTask: 1, EventDispatch: 1, HitTest: 1, ScrollLayer: 1 };

function getJson(port, p) { return new Promise(function (res, rej) { http.get('http://127.0.0.1:' + port + p, function (r) { let d = ''; r.on('data', function (c) { d += c; }); r.on('end', function () { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej); }); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function med(a) { const b = a.slice().sort(function (x, y) { return x - y; }); return b[Math.floor(b.length / 2)]; }
function merged(list) {
  const L = list.sort(function (x, y) { return x[0] - y[0]; });
  let tot = 0, cs = -1, cf = -1;
  L.forEach(function (x) { if (x[0] > cf) { if (cf > cs) tot += cf - cs; cs = x[0]; cf = x[1]; } else if (x[1] > cf) cf = x[1]; });
  if (cf > cs) tot += cf - cs;
  return tot;
}

async function once() {
  const port = 9000 + Math.floor(Math.random() * 900);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-'));
  const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port,
    '--user-data-dir=' + tmp, '--window-size=800,1280', '--force-device-scale-factor=2', '--hide-scrollbars', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
  let list = null;
  for (let i = 0; i < 60 && !list; i++) { await sleep(200); try { list = await getJson(port, '/json'); } catch (e) {} }
  if (!list) { ch.kill(); return null; }
  const page = list.find(function (t) { return t.type === 'page'; });
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0; const waits = {}; const ev = []; let done = null;
  const send = function (m, p) { return new Promise(function (res) { const n = ++id; waits[n] = res; ws.send(JSON.stringify({ id: n, method: m, params: p || {} })); }); };
  ws.onmessage = function (e) {
    const m = JSON.parse(e.data);
    if (m.id && waits[m.id]) { waits[m.id](m.result); delete waits[m.id]; }
    if (m.method === 'Tracing.dataCollected') ev.push.apply(ev, m.params.value);
    if (m.method === 'Tracing.tracingComplete' && done) done();
  };
  await new Promise(function (r) { ws.onopen = r; });
  await send('Page.enable'); await send('Runtime.enable');
  if (CPU > 1) await send('Emulation.setCPUThrottlingRate', { rate: CPU });
  // 「@<フォルダ>」で はじめる と その 版の harness で（まえ／あとを 交互に くらべる）
  // 「M:<モード>;」を 先頭に つけると その 変えかただけ モードを 変える（ふつうの たたかいと ボスを 交互に）
  let harn = HARN, extra = EXTRA, mode = MODE;
  if (extra.indexOf('M:') === 0) { const j = extra.indexOf(';'); mode = extra.slice(2, j); extra = extra.slice(j + 1); }
  if (extra.charAt(0) === '@') {
    const cut = extra.indexOf('|') < 0 ? extra.length : extra.indexOf('|');
    harn = extra.slice(1, cut) + '/tools/harness.html'; extra = extra.slice(cut);
  }
  await send('Page.navigate', { url: 'file:///' + harn + '#' + mode + extra });

  /* 「メモが 出て いて・ボスの ふつう／本気 パネルが なく・そこを さわると canvas に 当たる」
     瞬間まで 待つ。ラスボス戦は 教科が 回る ので メモの ない 問題も ある（ここを 見ないと
     指が どこにも 当たって いない のに 測って しまう） */
  let box = null;
  for (let i = 0; i < 140; i++) {
    await send('Runtime.evaluate', { expression: "(function(){var b=document.querySelector('.bosspick__btn--norm');if(b)b.click();})()" });
    const r = await send('Runtime.evaluate', { returnByValue: true, expression:
      "(function(){var c=document.querySelector('.memo canvas');if(!c)return null;var r=c.getBoundingClientRect();" +
      "if(r.width<20||r.height<20)return null;" +
      "if(document.querySelectorAll('#stage .foes .v3 .f').length < " + MINFACE + ")return null;" +
      "var e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);" +
      "if(!e||e.tagName!=='CANVAS')return null;return {ok:1};})()" });
    if (r.result && r.result.value) { box = 1; break; }
    await sleep(400);
  }
  if (!box) { ws.close(); ch.kill(); return null; }
  const info = await send('Runtime.evaluate', { returnByValue: true, expression:
    "(function(){var c=document.querySelector('.memo canvas');var r=c.getBoundingClientRect();" +
    "var f=document.querySelectorAll('#stage .foes .v3 .f');var a=document.getAnimations().filter(function(x){return x.playState==='running';});" +
    "var fe=document.querySelector('#stage .foes .v3');var fr=fe?fe.getBoundingClientRect():{width:0,height:0};" +
    "return {x:r.left,y:r.top,w:r.width,h:r.height,foeFace:f.length,allFace:document.querySelectorAll('#stage .v3 .f').length," +
    "anim:a.length,foeW:Math.round(fr.width),foeH:Math.round(fr.height)};})()" });
  const B = info.result.value;

  await send('Tracing.start', { categories: 'toplevel,devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.frame,cc,gpu,viz,benchmark', transferMode: 'ReportEvents' });
  await sleep(200);

  /* ほんものの ゆびに 近づける：返事を 待たずに 60回/秒 で ちょうど DUR ミリ秒 動かす。
     そのあと「canvas が 何点 ひろえたか」を 見る＝線が どれだけ 飛ぶか（子が 感じる ところ）。
     1点ずつ 返事を 待つ やり方だと ページの おそさが そのまま 待ち時間に なり、
     ほんものの 指（イベントは まとめられる）とは ちがう 数字に なる */
  const x0 = B.x + B.w * 0.15, y0 = B.y + B.h * 0.5, dx = (B.w * 0.7) / MOVES;
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0, id: 1 }] });
  const t0 = Date.now();
  let sent = 0;
  while (Date.now() - t0 < DUR) {
    const i = (sent++ % MOVES) + 1;
    send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + dx * i, y: y0 + Math.sin(i / 4) * B.h * 0.25, id: 1 }] });
    await sleep(GAP);
  }
  const span = Date.now() - t0;
  await sleep(600);
  const gotR = await send('Runtime.evaluate', { returnByValue: true, expression:
    "(function(){var b=MQ.ui.battle;var ps=(b.memoPaths?b.memoPaths():[])||[];var n=0;" +
    "ps.forEach(function(p){ n += (p && p.length) ? p.length : ((p && p.pts && p.pts.length) ? p.pts.length : 0); });" +
    "return {pts:n,strokes:b.memoStrokes?b.memoStrokes():-1,paths:ps.length};})()" });
  const G = (gotR.result && gotR.result.value) || {};
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(300);
  await new Promise(function (r) { done = r; send('Tracing.end'); });
  ws.close(); ch.kill();

  const tn = {};
  ev.forEach(function (e) { if (e.name === 'thread_name') tn[e.pid + '/' + e.tid] = e.args.name; });
  const xs = ev.filter(function (e) { return e.ph === 'X' && e.ts; });
  if (!xs.length) return null;
  // apply は 数が 多いと 落ちる（トレースは 何万件も ある）
  const a0 = xs.reduce(function (m, e) { return e.ts < m ? e.ts : m; }, Infinity);
  const b0 = a0 + (span + 500) * 1000;
  const iv = {}, parts = {};
  let evd = 0, evdN = 0;
  ev.forEach(function (e) {
    if (e.ph !== 'X') return;
    const n = tn[e.pid + '/' + e.tid];
    const s = Math.max(a0, e.ts), f = Math.min(b0, e.ts + (e.dur || 0));
    if (f <= s) return;
    if ((e.name === 'RunTask' || e.name === 'ThreadControllerImpl::RunTask') && WATCH[n]) (iv[n] = iv[n] || []).push([s, f]);
    if (KIND[e.name] && n === 'CrRendererMain') parts[e.name] = (parts[e.name] || 0) + (f - s);
    if (e.name === 'EventDispatch' && e.args && e.args.data && e.args.data.type === 'touchmove') { evd += (f - s); evdN++; }
  });
  const frames = ev.filter(function (e) { return e.name === 'Display::DrawAndSwap' && e.ph === 'X' && e.ts >= a0 && e.ts <= b0; }).length;
  const out = { span: span, frames: frames, sent: sent, pts: G.pts || 0, strokes: G.strokes, foeFace: B.foeFace, allFace: B.allFace, anim: B.anim, foeW: B.foeW, foeH: B.foeH,
    evd: evd / 1000, evdN: evdN, parts: parts };
  ['CrRendererMain', 'CrGpuMain', 'VizCompositorThread', 'Compositor'].forEach(function (k) { out[k] = iv[k] ? merged(iv[k]) / 1000 : 0; });
  return out;
}

(async function () {
  const all = {};
  VARS.forEach(function (v) { all[v.name] = []; });
  for (let i = 0; i < REPS; i++) {
    // まわす じゅんばんを 毎回 ずらす（さいしょに はかった ものが 悪く 見える のを ふせぐ）
    const order = VARS.slice(i % VARS.length).concat(VARS.slice(0, i % VARS.length));
    for (const v of order) { EXTRA = v.extra; const r = await once(); if (r) all[v.name].push(r); }
  }
  console.log('■ ' + MODE + '（CPU×' + CPU + '・' + MOVES + '点・' + REPS + '回を 交互に・中央の 値）');
  console.log('  ' + 'やりかた'.padEnd(18) + 'アニメ'.padStart(6) + '送った→ひろえた'.padStart(16) + 'コマ'.padStart(6) +
    '   main'.padStart(8) + '  viz'.padStart(7) + '  gpu'.padStart(7) + '  style(main)'.padStart(12));
  VARS.forEach(function (v) {
    const runs = all[v.name];
    if (!runs.length) { console.log('  ' + v.name + ' … とれない'); return; }
    const g = function (k) { return med(runs.map(function (r) { return r[k]; })); };
    const st = med(runs.map(function (r) { return (r.parts.UpdateLayoutTree || 0) / 1000; }));
    console.log('  ' + v.name.padEnd(18) + String(g('anim')).padStart(6) +
      (g('sent') + '→' + g('pts') + '点(' + Math.round(g('pts')/g('sent')*100) + '%)').padStart(16) + String(g('frames')).padStart(6) +
      (g('CrRendererMain').toFixed(0) + 'ms').padStart(8) + (g('VizCompositorThread').toFixed(0) + 'ms').padStart(7) +
      (g('CrGpuMain').toFixed(0) + 'ms').padStart(7) + (st.toFixed(0) + 'ms').padStart(12));
  });
})();
