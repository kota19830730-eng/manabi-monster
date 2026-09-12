// ひっさつわざの ひっかかりの 犯人さがし：Chrome の トレースを とって、長い コマの 中身を 種類ごとに 足す
// node trace.js <harness の モード（例 perffx:starburst）> [秒] [出す.json]
// 出る もの：わざが 始まって から の 長い 仕事（30ms こえ）と、その 中の いちばん 重い 子（Layout・Paint・スクリプト など）
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const mode = process.argv[2] || 'perffx:starburst', secs = +(process.argv[3] || 8), outJson = process.argv[4];
const port = 9800 + Math.floor(Math.random() * 400);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tr-'));
const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + tmp,
  '--window-size=800,1280', '--hide-scrollbars', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
function getJson(p) { return new Promise(function (res, rej) { http.get('http://127.0.0.1:' + port + p, function (r) { let d = ''; r.on('data', function (c) { d += c; }); r.on('end', function () { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej); }); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
(async function () {
  let list = null;
  for (let i = 0; i < 50 && !list; i++) { await sleep(200); try { list = await getJson('/json'); } catch (e) {} }
  const page = list.find(function (t) { return t.type === 'page'; });
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0; const waits = {}; const events = []; let done = null;
  const send = function (method, params) { return new Promise(function (res) { const n = ++id; waits[n] = res; ws.send(JSON.stringify({ id: n, method: method, params: params || {} })); }); };
  ws.onmessage = function (ev) {
    const m = JSON.parse(ev.data);
    if (m.id && waits[m.id]) { waits[m.id](m.result); delete waits[m.id]; }
    if (m.method === 'Tracing.dataCollected') events.push.apply(events, m.params.value);
    if (m.method === 'Tracing.tracingComplete' && done) done();
  };
  await new Promise(function (r) { ws.onopen = r; });
  await send('Page.enable');
  await send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,blink.console,v8.execute', transferMode: 'ReportEvents' });
  await send('Page.navigate', { url: 'file:///' + path.resolve(__dirname, '..', 'harness.html').split('\\').join('/') + '#' + mode });
  await sleep(secs * 1000);
  await new Promise(function (r) { done = r; send('Tracing.end'); });
  ws.close(); ch.kill();
  if (outJson) fs.writeFileSync(outJson, JSON.stringify(events));
  // メインスレッドの 長い 仕事
  const kidsOf = {};
  const main = events.filter(function (e) { return e.ph === 'X' && e.name === 'RunTask' && e.dur > 30000; });
  const byThread = {};
  events.forEach(function (e) { if (e.ph === 'X' && e.name === 'RunTask') byThread[e.tid] = (byThread[e.tid] || 0) + e.dur; });
  const mainTid = +Object.keys(byThread).sort(function (a, b) { return byThread[b] - byThread[a]; })[0];
  const kinds = ['Layout', 'UpdateLayoutTree', 'Paint', 'PrePaint', 'Layerize', 'Commit', 'FunctionCall', 'EvaluateScript', 'TimerFire', 'FireAnimationFrame', 'ParseHTML', 'HitTest', 'UpdateLayer', 'CompositeLayers', 'RasterTask', 'Decode Image', 'GPUTask', 'v8.run', 'v8.compile', 'MajorGC', 'MinorGC', 'V8.GC_SCAVENGER', 'BlinkGC.AtomicPhase'];
  let t0 = Infinity; events.forEach(function (e) { if (e.ts && e.ts < t0) t0 = e.ts; });
  const sums = {};
  main.filter(function (e) { return e.tid === mainTid; }).forEach(function (e) {
    const kids = events.filter(function (k) { return k.tid === e.tid && k.ph === 'X' && k.ts >= e.ts && k.ts + (k.dur || 0) <= e.ts + e.dur && k !== e && kinds.indexOf(k.name) >= 0; });
    const agg = {};
    kids.forEach(function (k) { agg[k.name] = (agg[k.name] || 0) + k.dur; });
    const top = Object.keys(agg).sort(function (a, b) { return agg[b] - agg[a]; }).slice(0, 5).map(function (k) { return k + '=' + (agg[k] / 1000).toFixed(0); });
    console.log('t=' + ((e.ts - t0) / 1e6).toFixed(2) + 's ' + (e.dur / 1000).toFixed(0) + 'ms  ' + top.join(' '));
  });
  // 名前ごとの 合計（全体・メイン）
  events.forEach(function (e) { if (e.ph === 'X' && e.tid === mainTid && kinds.indexOf(e.name) >= 0) sums[e.name] = (sums[e.name] || 0) + e.dur; });
  console.log('合計(メイン) ' + Object.keys(sums).sort(function (a, b) { return sums[b] - sums[a]; }).map(function (k) { return k + '=' + (sums[k] / 1000).toFixed(0) + 'ms'; }).join(' '));
  process.exit(0);
})();
