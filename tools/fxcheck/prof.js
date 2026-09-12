// ひっさつわざの あいだの JS の 重い 関数を 出す（CDP の Profiler）
// node prof.js <harness の モード（例 perffx:starburst）> [はじめる秒] [おわる秒]
// harness の perffx は たたかいを 始めて 1.5秒 後に わざを 出す → 既定は 3〜7秒を はかる
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const mode = process.argv[2] || 'perffx:starburst', a = +(process.argv[3] || 3), b = +(process.argv[4] || 7);
const port = 9500 + Math.floor(Math.random() * 300);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-'));
const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + tmp,
  '--window-size=800,1280', '--hide-scrollbars', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
function getJson(p) { return new Promise(function (res, rej) { http.get('http://127.0.0.1:' + port + p, function (r) { let d = ''; r.on('data', function (c) { d += c; }); r.on('end', function () { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej); }); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
(async function () {
  let list = null;
  for (let i = 0; i < 50 && !list; i++) { await sleep(200); try { list = await getJson('/json'); } catch (e) {} }
  const page = list.find(function (t) { return t.type === 'page'; });
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0; const waits = {};
  const send = function (method, params) { return new Promise(function (res) { const n = ++id; waits[n] = res; ws.send(JSON.stringify({ id: n, method: method, params: params || {} })); }); };
  ws.onmessage = function (ev) { const m = JSON.parse(ev.data); if (m.id && waits[m.id]) { waits[m.id](m.result); delete waits[m.id]; } };
  await new Promise(function (r) { ws.onopen = r; });
  await send('Page.enable');
  await send('Profiler.enable');
  await send('Profiler.setSamplingInterval', { interval: 200 });
  await send('Page.navigate', { url: 'file:///' + path.resolve(__dirname, '..', 'harness.html').split('\\').join('/') + '#' + mode });
  await sleep(a * 1000);
  await send('Profiler.start');
  await sleep((b - a) * 1000);
  const r = await send('Profiler.stop');
  ws.close(); ch.kill();
  const p = r.profile, self = {}, byId = {};
  p.nodes.forEach(function (n) { byId[n.id] = n; });
  const dt = {};
  for (let i = 0; i < p.samples.length; i++) dt[p.samples[i]] = (dt[p.samples[i]] || 0) + (p.timeDeltas[i + 1] || 0);
  p.nodes.forEach(function (n) {
    const f = n.callFrame, key = (f.functionName || '(anon)') + ' ' + (f.url ? f.url.split('/').slice(-2).join('/') : '') + ':' + (f.lineNumber + 1);
    self[key] = (self[key] || 0) + (dt[n.id] || 0);
  });
  // 時間の じゅんに：JS が 30ms いじょう 続いた ところ（ひっかかり）の 中の 関数（呼び出しの 道を たどって アプリの 関数を 出す）
  const parent = {};
  p.nodes.forEach(function (n) { (n.children || []).forEach(function (c) { parent[c] = n.id; }); });
  const label = function (nid) {
    const out = [];
    for (let x = nid; x != null && out.length < 4; x = parent[x]) {
      const f = byId[x].callFrame;
      if (f.url && f.url.indexOf('/js/') >= 0) out.push((f.functionName || '(anon)') + '@' + f.url.split('/').pop() + ':' + (f.lineNumber + 1));
    }
    const f0 = byId[nid].callFrame;
    return (f0.url ? '' : (f0.functionName || '') + ' ') + (out.join(' < ') || f0.functionName);
  };
  let t = p.startTime, runStart = null, runAgg = {};
  const flush = function (end) {
    if (runStart != null && end - runStart > 30000) {
      console.log('--- ' + ((runStart - p.startTime) / 1000 + a * 1000).toFixed(0) + 'ms から ' + ((end - runStart) / 1000).toFixed(0) + 'ms');
      Object.keys(runAgg).sort(function (x, y) { return runAgg[y] - runAgg[x]; }).slice(0, 8).forEach(function (k) { console.log('   ' + (runAgg[k] / 1000).toFixed(1) + 'ms ' + k); });
    }
    runStart = null; runAgg = {};
  };
  for (let i = 0; i < p.samples.length; i++) {
    t += p.timeDeltas[i] || 0;
    const n = byId[p.samples[i]], idle = n.callFrame.functionName === '(idle)';
    if (idle) { flush(t); continue; }
    if (runStart == null) runStart = t;
    const k = label(p.samples[i]);
    runAgg[k] = (runAgg[k] || 0) + (p.timeDeltas[i + 1] || 0);
  }
  flush(t);
  const tot = Object.keys(self).reduce(function (s, k) { return s + self[k]; }, 0);
  Object.keys(self).sort(function (x, y) { return self[y] - self[x]; }).slice(0, 30).forEach(function (k) { console.log((self[k] / 1000).toFixed(1) + 'ms  ' + k); });
  console.log('合計 ' + (tot / 1000).toFixed(0) + 'ms');
  process.exit(0);
})();
