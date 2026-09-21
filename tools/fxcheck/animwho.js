// バトル画面で「いま 動いて いる アニメ」を 中身べつに 数える
// node animwho.js <mode>
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const MODE = process.argv[2] || 'last';
const HARN = process.env.HARN || require('path').resolve(__dirname, '..', 'harness.html').split(require('path').sep).join('/');
function getJson(port, p) { return new Promise(function (res, rej) { http.get('http://127.0.0.1:' + port + p, function (r) { let d = ''; r.on('data', function (c) { d += c; }); r.on('end', function () { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej); }); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
(async function () {
  const port = 9400 + Math.floor(Math.random() * 300);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-'));
  const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port,
    '--user-data-dir=' + tmp, '--window-size=800,1280', '--force-device-scale-factor=2', '--hide-scrollbars', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
  let list = null;
  for (let i = 0; i < 60 && !list; i++) { await sleep(200); try { list = await getJson(port, '/json'); } catch (e) {} }
  const page = list.find(function (t) { return t.type === 'page'; });
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0; const waits = {};
  const send = function (m, p) { return new Promise(function (res) { const n = ++id; waits[n] = res; ws.send(JSON.stringify({ id: n, method: m, params: p || {} })); }); };
  ws.onmessage = function (e) { const m = JSON.parse(e.data); if (m.id && waits[m.id]) { waits[m.id](m.result); delete waits[m.id]; } };
  await new Promise(function (r) { ws.onopen = r; });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await send('Page.navigate', { url: 'file:///' + HARN + '#' + MODE });
  for (let i = 0; i < 60; i++) { await sleep(500); const r = await send('Runtime.evaluate', { returnByValue: true, expression: "!!document.querySelector('.memo canvas')" }); if (r.result && r.result.value) break; }
  await sleep(10000);
  const r = await send('Runtime.evaluate', { returnByValue: true, expression:
    "(function(){var out={};var tot=0;" +
    "document.getAnimations().forEach(function(a){if(a.playState!=='running')return;tot++;" +
    "var t=a.effect&&a.effect.target;var nm=(a.animationName||(a.effect&&a.effect.getKeyframes&&'transition')||'?');" +
    "var cls=t?(t.className&&t.className.baseVal!==undefined?t.className.baseVal:String(t.className||'')):'(なし)';" +
    "var where=t?(t.closest('.foes')?'てき':t.closest('.hero')?'主人公':t.closest('.arena')?'アリーナ':'ほか'):'?';" +
    "var key=where+' | '+nm+' | '+cls.split(' ').slice(0,3).join('.');" +
    "out[key]=(out[key]||0)+1;});" +
    "return {tot:tot,rows:Object.keys(out).map(function(k){return k+'  ×'+out[k];}).sort()};})()" });
  const v = r.result.value;
  console.log('■ ' + MODE + '：動いて いる アニメ ' + v.tot + '個');
  v.rows.forEach(function (s) { console.log('   ' + s); });
  ws.close(); ch.kill();
})();
