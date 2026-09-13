// カプセルの 演出（v13.14）の「作業の 量」を 場面ごとに 数える（1コマの 時間より ぶれない）
// node tools/3d/capfxwork.js "<capfx.html の hash>" [くり返し 2] [css=<かぶせる CSS>]
//   Chrome の 記録（トレース）から、場面ごとに：メインの 作業（スタイル・レイアウト・描く・JS）の ms と
//   ラスター（絵を 点に する GPU がわ）の ms と Paint の 回数。タブレットと 同じ 800×1280・dpr 2
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const hash = process.argv[2] || 'sr:1223';
const REP = +(process.argv[3] || 2);
const extraCss = (process.argv.slice(4).find(function (a) { return a.indexOf('css=') === 0; }) || '').slice(4);
const TAPS = [1000, 4200, 4600, 5000];
const MAIN = ['UpdateLayoutTree', 'Layout', 'PrePaint', 'Paint', 'Layerize', 'FunctionCall', 'TimerFire', 'HitTest'];
function getJson(port, p) { return new Promise(function (res, rej) { http.get('http://127.0.0.1:' + port + p, function (r) { let d = ''; r.on('data', function (c) { d += c; }); r.on('end', function () { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej); }); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
async function once() {
  const port = 9600 + Math.floor(Math.random() * 300);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cfw-'));
  const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + tmp,
    '--window-size=800,1280', '--force-device-scale-factor=2', '--hide-scrollbars', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
  let list = null;
  for (let i = 0; i < 50 && !list; i++) { await sleep(200); try { list = await getJson(port, '/json'); } catch (e) {} }
  const ws = new WebSocket(list.find(function (t) { return t.type === 'page'; }).webSocketDebuggerUrl);
  let id = 0; const waits = {}; const ev = []; let done = null;
  const send = function (m, p) { return new Promise(function (res) { const n = ++id; waits[n] = res; ws.send(JSON.stringify({ id: n, method: m, params: p || {} })); }); };
  ws.onmessage = function (e) {
    const m = JSON.parse(e.data);
    if (m.id && waits[m.id]) { waits[m.id](m.result); delete waits[m.id]; }
    if (m.method === 'Tracing.dataCollected') ev.push.apply(ev, m.params.value);
    if (m.method === 'Tracing.tracingComplete' && done) done();
  };
  await new Promise(function (r) { ws.onopen = r; });
  await send('Runtime.enable');
  await send('Page.navigate', { url: 'file:///' + __dirname.split(String.fromCharCode(92)).join('/') + '/capfx.html#' + hash });
  for (let i = 0; i < 200; i++) { await sleep(20); const r = await send('Runtime.evaluate', { expression: '!!window.__fx', returnByValue: true }); if (r && r.result && r.result.value) break; }
  await send('Runtime.evaluate', { expression: 'window.__capfxTrace = true; 1' });
  if (extraCss) await send('Runtime.evaluate', { expression: 'var s=document.createElement("style");s.textContent=' + JSON.stringify(extraCss) + ';document.head.appendChild(s);1' });
  await send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline', transferMode: 'ReportEvents' });
  for (let i = 0; i < 200; i++) { await sleep(20); const r = await send('Runtime.evaluate', { expression: '!!(window.__fx && window.__fx.isOpen())', returnByValue: true }); if (r && r.result && r.result.value) break; }
  const t0 = Date.now();
  for (const t of TAPS) { const w = t - (Date.now() - t0); if (w > 0) await sleep(w); await send('Runtime.evaluate', { expression: 'window.__fx.tap(); 1' }); }
  for (let i = 0; i < 100; i++) { const r = await send('Runtime.evaluate', { expression: 'window.__fx.phase()', returnByValue: true }); if (r.result.value === 'reveal') break; await sleep(100); }
  await sleep(1500);
  await new Promise(function (r) { done = r; send('Tracing.end'); });
  ws.close(); ch.kill();
  // 場面の さかいめ（console.timeStamp）
  const marks = ev.filter(function (e) { return e.name === 'TimeStamp' && e.args && e.args.data && /^capfx:/.test(e.args.data.message || ''); })
    .map(function (e) { return { ts: e.ts, p: e.args.data.message.slice(6) }; }).sort(function (a, b) { return a.ts - b.ts; });
  const endTs = Math.max.apply(null, ev.filter(function (e) { return e.ts; }).map(function (e) { return e.ts + (e.dur || 0); }));
  const win = marks.map(function (m, i) { return { p: m.p, a: m.ts, b: i + 1 < marks.length ? marks[i + 1].ts : endTs }; });
  const out = {};
  win.forEach(function (w) { out[w.p] = { secs: (w.b - w.a) / 1e6, main: 0, raster: 0, paint: 0, by: {} }; });
  ev.forEach(function (e) {
    if (!e.ts) return;
    const w = win.find(function (x) { return e.ts >= x.a && e.ts < x.b; });
    if (!w) return;
    const o = out[w.p];
    if (e.ph === 'X' && e.dur && MAIN.indexOf(e.name) >= 0) { o.main += e.dur / 1000; o.by[e.name] = (o.by[e.name] || 0) + e.dur / 1000; }
    if (e.ph === 'X' && e.dur && e.name === 'RasterTask') o.raster += e.dur / 1000;
    if (e.name === 'Paint') o.paint++;
  });
  return out;
}
(async function () {
  const runs = [];
  for (let i = 0; i < REP; i++) runs.push(await once());
  const phases = Object.keys(runs[0]);
  console.log('場面      秒   | メインの 作業 ms（1秒あたり） | ラスター ms | Paint 回');
  phases.forEach(function (p) {
    const cells = runs.map(function (r) { const o = r[p]; if (!o) return '-'; return o.main.toFixed(0) + '(' + (o.main / Math.max(o.secs, 0.05)).toFixed(0) + '/s) ' + o.raster.toFixed(0) + ' ' + o.paint; });
    console.log('  ' + p.padEnd(9) + (runs[0][p].secs).toFixed(2).padStart(5) + ' | ' + cells.join('  ||  '));
    if (process.env.BREAK) console.log('            ' + Object.keys(runs[0][p].by).map(function (k) { return k + ' ' + runs[0][p].by[k].toFixed(0); }).join(' · '));
  });
  process.exit(0);
})();
