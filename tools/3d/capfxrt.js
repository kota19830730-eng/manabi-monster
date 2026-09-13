// カプセルの 演出（v13.14）を 本当の 時計で うごかして、とちゅうを 撮る
// node tools/3d/capfxrt.js "<hash>" <ms,ms,...> <出す場所の フォルダ> [W] [H] [tap の ms,ms…]
//   hash は capfx.html の # の あと（例 sr:1223）。ms は 演出が はじまってからの 時間。
//   tap … その 時間に 画面を タップ（しないと 自動で 進む）
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const [hash, times, outDir] = process.argv.slice(2);
const W = +(process.argv[5] || 520), H = +(process.argv[6] || 940);
const TAPS = (process.argv[7] || '').split(',').filter(Boolean).map(Number);
const T = times.split(',').map(Number);
const port = 9300 + Math.floor(Math.random() * 500);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cfx-'));
const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + tmp,
  '--window-size=' + W + ',' + H, '--hide-scrollbars', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
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
  await send('Runtime.enable');
  await send('Page.navigate', { url: 'file:///' + __dirname.split(String.fromCharCode(92)).join('/') + '/capfx.html#' + hash });
  for (let i = 0; i < 100; i++) {
    await sleep(100);
    const r = await send('Runtime.evaluate', { expression: '!!(window.__fx && window.__fx.isOpen())', returnByValue: true });
    if (r && r.result && r.result.value) break;
  }
  const t0 = Date.now();
  const ev = T.map(function (t) { return { t: t, kind: 'shot' }; }).concat(TAPS.map(function (t) { return { t: t, kind: 'tap' }; })).sort(function (a, b) { return a.t - b.t; });
  fs.mkdirSync(outDir, { recursive: true });
  for (const e of ev) {
    const w = e.t - (Date.now() - t0);
    if (w > 0) await sleep(w);
    if (e.kind === 'tap') { await send('Runtime.evaluate', { expression: 'window.__fx.tap(); 1' }); continue; }
    const at = Date.now() - t0;
    const r = await send('Page.captureScreenshot', { format: 'png' });
    const st = await send('Runtime.evaluate', { expression: 'JSON.stringify({ph: window.__fx.phase(), lv: window.__fx.level(), err: (MQ.guard && MQ.guard.list) ? MQ.guard.list().length : null})', returnByValue: true });
    const f = path.join(outDir, 'rt_' + hash.replace(/[:]/g, '_') + '_' + e.t + '.png');
    fs.writeFileSync(f, Buffer.from(r.data, 'base64'));
    console.log(path.basename(f) + '  実際 ' + at + 'ms  ' + (st.result && st.result.value));
  }
  ws.close(); ch.kill();
  process.exit(0);
})();
