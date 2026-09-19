// 本当の 時計で 見本を うごかして、わざの とちゅうを 撮る
// node rt.js <わざ> <ms,ms,...> <出す名前> [W] [H]
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const [sp, times, name] = process.argv.slice(2);
const W = +(process.argv[5] || 800), H = +(process.argv[6] || 1280);
const T = times.split(',').map(Number);
const port = 9300 + Math.floor(Math.random() * 500);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rt-'));
const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + tmp,
  '--window-size=' + W + ',' + H, '--hide-scrollbars', '--no-first-run', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
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
  await send('Page.navigate', { url: 'file:///' + __dirname.replace(/\\/g, '/') + '/demo_ambush.html' });
  await sleep(7000);
  const SLOW = +(process.env.SLOW || 1);
  if (SLOW > 1) {
    await send('Animation.enable');
    await send('Animation.setPlaybackRate', { playbackRate: 1 / SLOW });
    await send('Runtime.evaluate', { expression: 'window.__st = window.setTimeout; window.setTimeout = function (f, ms) { return window.__st(f, (ms || 0) * ' + SLOW + '); }; 1' });
  }
  const t0 = Date.now();
  await send('Runtime.evaluate', { expression: "document.querySelector('.mihon__b--amb-" + sp + "').click(); 1" });
  for (let i = 0; i < T.length; i++) {
    const w = T[i] * SLOW - (Date.now() - t0);
    if (w > 0) await sleep(w);
    const at = Date.now() - t0;
    if (process.env.PROBE) { const pr = await send('Runtime.evaluate', { expression: process.env.PROBE, returnByValue: true }); console.log('probe', T[i], pr.result && pr.result.value); }
    const r = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(__dirname, name + '_' + T[i] + '.png'), Buffer.from(r.data, 'base64'));
    console.log(name + '_' + T[i] + '.png  (実際 ' + Math.round(at / SLOW) + 'ms)');
  }
  const e = await send('Runtime.evaluate', { expression: "JSON.stringify({err: (window.MQ && MQ.guard && MQ.guard.list) ? MQ.guard.list() : null})", returnByValue: true });
  console.log(e.result && e.result.value);
  ws.close(); ch.kill(); process.exit(0);
})();
