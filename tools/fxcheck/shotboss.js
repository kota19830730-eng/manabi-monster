// ラスボスの 3D と「書いて いる あいだの 2D」を 撮って くらべる
const { spawn } = require('child_process');
const http = require('http'); const fs = require('fs'); const os = require('os'); const path = require('path');
const HARN = process.argv[2] || 'C:/mqt187';
const MODE = process.argv[3] || 'last';
const OUT = process.argv[4] || '.';
const TAG = process.argv[5] || '';
function getJson(port, p) { return new Promise(function (res, rej) { http.get('http://127.0.0.1:' + port + p, function (r) { let d = ''; r.on('data', function (c) { d += c; }); r.on('end', function () { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej); }); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
(async function () {
  const port = 9300 + Math.floor(Math.random() * 200);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sb-'));
  const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port,
    '--user-data-dir=' + tmp, '--window-size=800,1280', '--hide-scrollbars', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
  let list = null;
  for (let i = 0; i < 60 && !list; i++) { await sleep(200); try { list = await getJson(port, '/json'); } catch (e) {} }
  const page = list.find(function (t) { return t.type === 'page'; });
  const ws = new WebSocket(page.webSocketDebuggerUrl); let id = 0; const waits = {};
  const send = function (m, p) { return new Promise(function (res) { const n = ++id; waits[n] = res; ws.send(JSON.stringify({ id: n, method: m, params: p || {} })); }); };
  ws.onmessage = function (e) { const m = JSON.parse(e.data); if (m.id && waits[m.id]) { waits[m.id](m.result); delete waits[m.id]; } };
  await new Promise(function (r) { ws.onopen = r; });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: 'file:///' + HARN + '/tools/harness.html#' + MODE });
  let ok = false;
  for (let i = 0; i < 120; i++) {
    await send('Runtime.evaluate', { expression: "(function(){var b=document.querySelector('.bosspick__btn--norm');if(b)b.click();})()" });
    const r = await send('Runtime.evaluate', { returnByValue: true, expression:
      "document.querySelectorAll('#stage .foes .v3 .f').length >= 250" });
    if (r.result && r.result.value) { ok = true; break; }
    await sleep(400);
  }
  if (!ok) { console.log('ボスが 出なかった'); ws.close(); ch.kill(); return; }
  await sleep(1500);
  const st = async function () {
    const r = await send('Runtime.evaluate', { returnByValue: true, expression:
      "(function(){var a=document.querySelector('.enemy__img3d--heavy'),b=document.querySelector('.enemy__flat');" +
      "var cs=function(e){return e?getComputedStyle(e).display:'なし';};" +
      "var v=document.querySelectorAll('#stage .foes .v3 .f').length;" +
      "return '3D='+cs(a)+'('+v+'面) 2D='+cs(b);})()" });
    return r.result.value;
  };
  const shot = async function (n) { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, n), Buffer.from(r.data, 'base64')); };
  console.log('  3Dの とき     : ' + await st());
  await shot('boss_3d' + TAG + '.png');
  await send('Runtime.evaluate', { expression: "document.querySelector('.battle').classList.add('is-writing')" });
  await sleep(900);
  console.log('  書いて いる とき: ' + await st());
  await shot('boss_flat' + TAG + '.png');
  await send('Runtime.evaluate', { expression: "document.querySelector('.battle').classList.remove('is-writing')" });
  await sleep(900);
  console.log('  もどした とき  : ' + await st());
  await shot('boss_back' + TAG + '.png');
  ws.close(); ch.kill();
})();
