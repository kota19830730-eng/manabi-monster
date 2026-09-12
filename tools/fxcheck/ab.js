// ひっさつわざの あいだの 仕事の 量を くらべる（部品を 1つずつ 外して どれが 重いか 見る）
// node ab.js <わざ> <回数> <名前=ハッシュの のこり> ...
//   例：node ab.js starburst 3 base= noquake="|css=.battle{animation:none!important}"
// はかる もの（わざを 出して から 2.6秒）：
//   main＝メイン（CrRendererMain）が いそがしかった 時間（入れ子は 1回だけ 数える）・その 中身（Layerize・Paint など）
//   gpu／viz／cc＝GPU・画面を 組み立てる スレッドの いそがしさ
//   コマ＝画面を 描いた 回数（DrawFrame）・おそいコマ＝20ms を こえた あいだ・いちばん＝いちばん 長い あいだ
// タブレットと 同じ こまかさ（dpr 2・800×1280）で はかる。PC が 混んで いると ぶれる ので 3回いじょう。
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sp = process.argv[2] || 'starburst', reps = +(process.argv[3] || 2);
const variants = process.argv.slice(4).map(function (v) { const i = v.indexOf('='); return [v.slice(0, i), v.slice(i + 1)]; });
const MARK = "|js=" + encodeURIComponent("const o=MQ.ui.battle.demoSpecial;MQ.ui.battle.demoSpecial=function(){console.timeStamp('SPSTART');return o.apply(this,arguments);};");
const WATCH = { CrRendererMain: 1, CrGpuMain: 1, VizCompositorThread: 1, Compositor: 1 };
const KIND = { Layerize: 1, Commit: 1, Paint: 1, PrePaint: 1, UpdateLayoutTree: 1, Layout: 1, FunctionCall: 1, FireAnimationFrame: 1, TimerFire: 1, UpdateLayer: 1, HitTest: 1, MinorGC: 1, MajorGC: 1, RasterTask: 1 };
function getJson(port, p) { return new Promise(function (res, rej) { http.get('http://127.0.0.1:' + port + p, function (r) { let d = ''; r.on('data', function (c) { d += c; }); r.on('end', function () { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej); }); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function merged(list) {
  const L = list.sort(function (x, y) { return x[0] - y[0]; });
  let tot = 0, cs = -1, cf = -1;
  L.forEach(function (x) { if (x[0] > cf) { if (cf > cs) tot += cf - cs; cs = x[0]; cf = x[1]; } else if (x[1] > cf) cf = x[1]; });
  if (cf > cs) tot += cf - cs;
  return tot;
}
async function once(extra) {
  const port = 9100 + Math.floor(Math.random() * 600);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ab-'));
  const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + tmp,
    '--window-size=800,1280', '--force-device-scale-factor=2', '--hide-scrollbars', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
  let list = null;
  for (let i = 0; i < 50 && !list; i++) { await sleep(200); try { list = await getJson(port, '/json'); } catch (e) {} }
  const page = list.find(function (t) { return t.type === 'page'; });
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0; const waits = {}; const ev = []; let done = null;
  const send = function (method, params) { return new Promise(function (res) { const n = ++id; waits[n] = res; ws.send(JSON.stringify({ id: n, method: method, params: params || {} })); }); };
  ws.onmessage = function (e) {
    const m = JSON.parse(e.data);
    if (m.id && waits[m.id]) { waits[m.id](m.result); delete waits[m.id]; }
    if (m.method === 'Tracing.dataCollected') ev.push.apply(ev, m.params.value);
    if (m.method === 'Tracing.tracingComplete' && done) done();
  };
  await new Promise(function (r) { ws.onopen = r; });
  await send('Page.enable');
  await send('Tracing.start', { categories: 'toplevel,devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.frame,benchmark', transferMode: 'ReportEvents' });
  await send('Page.navigate', { url: 'file:///' + path.resolve(__dirname, '..', 'harness.html').split('\\').join('/') + '#perffx:' + sp + MARK + extra });
  await sleep(8000);
  await new Promise(function (r) { done = r; send('Tracing.end'); });
  ws.close(); ch.kill();
  const tn = {};
  ev.forEach(function (e) { if (e.name === 'thread_name') tn[e.pid + '/' + e.tid] = e.args.name; });
  const st = ev.find(function (e) { return e.name === 'TimeStamp' && e.args && e.args.data && e.args.data.message === 'SPSTART'; });
  if (!st) return null;
  const a = st.ts, b = st.ts + 2600000;
  const iv = {}, parts = {}, pc = { n: 0, px: 0 };
  ev.forEach(function (e) {
    if (e.ph !== 'X') return;
    const n = tn[e.pid + '/' + e.tid];
    const s = Math.max(a, e.ts), f = Math.min(b, e.ts + (e.dur || 0));
    if (f <= s) return;
    if ((e.name === 'RunTask' || e.name === 'ThreadControllerImpl::RunTask') && WATCH[n]) (iv[n] = iv[n] || []).push([s, f]);
    if (KIND[e.name] && n === 'CrRendererMain') parts[e.name] = (parts[e.name] || 0) + (f - s);
    // 描き直し（Paint）の 回数と 広さ（PC の 混みぐあいに よらない 数）
    if (e.name === 'Paint' && n === 'CrRendererMain') { pc.n++; const q = e.args && e.args.data && e.args.data.clip; if (q && q.length >= 8) { const xs = [q[0], q[2], q[4], q[6]], ys = [q[1], q[3], q[5], q[7]]; pc.px += (Math.max.apply(null, xs) - Math.min.apply(null, xs)) * (Math.max.apply(null, ys) - Math.min.apply(null, ys)); } }
  });
  const busy = {};
  Object.keys(iv).forEach(function (n) { busy[n] = merged(iv[n]); });
  const frames = ev.filter(function (e) { return (e.name === 'DrawFrame' || e.name === 'Graphics.Pipeline.DrawAndSwap') && e.ts >= a && e.ts <= b; }).map(function (e) { return e.ts; }).sort(function (x, y) { return x - y; });
  let slow = 0, worst = 0;
  for (let i = 1; i < frames.length; i++) { const g = (frames[i] - frames[i - 1]) / 1000; if (g > 20) slow++; worst = Math.max(worst, g); }
  return { pn: pc.n, ppx: pc.px / 1e6, parts: parts, main: (busy.CrRendererMain || 0) / 1000, gpu: (busy.CrGpuMain || 0) / 1000, viz: (busy.VizCompositorThread || 0) / 1000, cc: (busy.Compositor || 0) / 1000, frames: frames.length, slow: slow, worst: worst };
}
(async function () {
  for (const v of variants) {
    const rs = [];
    for (let i = 0; i < reps; i++) { const r = await once(v[1]); if (r) rs.push(r); }
    const avg = function (k) { return rs.reduce(function (s, r) { return s + r[k]; }, 0) / (rs.length || 1); };
    const pk = {};
    rs.forEach(function (r) { Object.keys(r.parts).forEach(function (k) { pk[k] = (pk[k] || 0) + r.parts[k] / rs.length; }); });
    console.log(v[0].padEnd(10) + ' main ' + avg('main').toFixed(0) + 'ms  gpu ' + avg('gpu').toFixed(0) + 'ms  viz ' + avg('viz').toFixed(0) + 'ms  cc ' + avg('cc').toFixed(0) +
      'ms  コマ ' + avg('frames').toFixed(0) + '  おそいコマ ' + avg('slow').toFixed(1) + '  いちばん ' + avg('worst').toFixed(0) + 'ms  (n=' + rs.length + ')  描き直し ' + avg('pn').toFixed(0) + '回 ' + avg('ppx').toFixed(1) + 'M画素');
    console.log('           中身 ' + Object.keys(pk).sort(function (x, y) { return pk[y] - pk[x]; }).slice(0, 9).map(function (k) { return k + '=' + (pk[k] / 1000).toFixed(0); }).join(' '));
  }
  process.exit(0);
})();
