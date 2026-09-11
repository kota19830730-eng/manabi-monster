// Chrome を 遠隔操作（CDP）して、本当の 時計で harness の ログを とる
// node cdp.js <url> <待つ秒> [gpu]   … 3つめに gpu を 書くと --disable-gpu を 外す
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const url = process.argv[2], secs = +(process.argv[3] || 8), gpu = process.argv[4] === 'gpu';
const port = 9222 + Math.floor(Math.random() * 500);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-'));
const args = ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + tmp, '--window-size=520,940', '--hide-scrollbars', '--no-first-run', 'about:blank'];
if (!gpu) args.splice(1, 0, '--disable-gpu');
const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', args, { stdio: 'ignore' });
function getJson(p) {
  return new Promise(function (res, rej) {
    http.get('http://127.0.0.1:' + port + p, function (r) { let d = ''; r.on('data', function (c) { d += c; }); r.on('end', function () { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej);
  });
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
(async function () {
  let list = null;
  for (let i = 0; i < 50 && !list; i++) { await sleep(200); try { list = await getJson('/json'); } catch (e) {} }
  if (!list) { console.error('chrome が 起きない'); ch.kill(); process.exit(1); }
  const page = list.find(function (t) { return t.type === 'page'; });
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0; const waits = {};
  const send = function (method, params) { return new Promise(function (res) { const n = ++id; waits[n] = res; ws.send(JSON.stringify({ id: n, method: method, params: params || {} })); }); };
  ws.onmessage = function (ev) { const m = JSON.parse(ev.data); if (m.id && waits[m.id]) { waits[m.id](m.result); delete waits[m.id]; } };
  await new Promise(function (r) { ws.onopen = r; });
  await send('Page.enable');
  await send('Page.navigate', { url: url });
  await sleep(secs * 1000);
  const r = await send('Runtime.evaluate', { expression: '(document.getElementById("log")||{}).textContent || "(log なし)"', returnByValue: true });
  console.log(r && r.result ? r.result.value : JSON.stringify(r));
  ws.close(); ch.kill();
  process.exit(0);
})();
