// node cdpwait.js <url> <maxSec>  … ページの #out が 'wait' で なくなるまで 待って 中身を 出す
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const url = process.argv[2], maxSec = +(process.argv[3] || 120);
const port = 9222 + Math.floor(Math.random() * 500);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cdpw-'));
const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + port, '--user-data-dir=' + tmp,
   '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required', '--no-first-run', 'about:blank'],
  { stdio: 'ignore' });
function getJson(p) {
  return new Promise(function (res, rej) {
    http.get('http://127.0.0.1:' + port + p, function (r) { let d = ''; r.on('data', function (c) { d += c; }); r.on('end', function () { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej);
  });
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
(async function () {
  let list = null;
  for (let i = 0; i < 50 && !list; i++) { await sleep(200); try { list = await getJson('/json'); } catch (e) {} }
  if (!list) { console.error('no chrome'); ch.kill(); process.exit(1); }
  const page = list.find(function (t) { return t.type === 'page'; });
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0; const waits = {};
  const send = function (method, params) { return new Promise(function (res) { const n = ++id; waits[n] = res; ws.send(JSON.stringify({ id: n, method: method, params: params || {} })); }); };
  ws.onmessage = function (ev) { const m = JSON.parse(ev.data); if (m.id && waits[m.id]) { waits[m.id](m.result); delete waits[m.id]; } };
  await new Promise(function (r) { ws.onopen = r; });
  await send('Page.enable');
  await send('Page.navigate', { url: url });
  const t0 = Date.now();
  let txt = 'wait';
  while (Date.now() - t0 < maxSec * 1000) {
    await sleep(500);
    const r = await send('Runtime.evaluate', { expression: "(document.getElementById('out')||{}).textContent", returnByValue: true });
    txt = r && r.result ? r.result.value : 'wait';
    if (txt && txt !== 'wait') break;
  }
  // 大きな WAV は 1MB ずつ 取りに いく（いっぺんに 返すと とまる）
  const rd = /\nREADY (\d+)$/.exec(txt || '');
  if (rd) {
    const total = +rd[1];
    let b64 = '';
    for (let a = 0; a < total; a += 1000000) {
      const r = await send('Runtime.evaluate', { expression: 'window.__wav.slice(' + a + ',' + (a + 1000000) + ')', returnByValue: true });
      b64 += r.result.value;
    }
    txt = txt.replace(/\nREADY \d+$/, '\nWAV ' + b64 + '\nEND');
  }
  process.stdout.write(String(txt));
  ws.close(); ch.kill();
  process.exit(0);
})();
