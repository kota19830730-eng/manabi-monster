// わざの あいだに あとから よみこまれた 字の ファイル（Google Fonts の 字の まとまり）を 数える（v14.2.1）
// node fontsdiff.js <わざ> [ハッシュの のこり]
//   わざの 前と あとで document.fonts の「loaded」を くらべる。あとから よみこむ ＝ 1コマめは ほかの 字で 描いて、
//   よみこめたら 画面ぜんたいを 計算し直す（字が 一しゅん かわって 見える・重い）
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sp = process.argv[2] || 'set-capsule', extra = process.argv[3] || '';
const SEED = "(function(){let a=20260914;Math.random=function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};})();";
const MARK = "|js=" + encodeURIComponent(SEED + "const o=MQ.ui.battle.demoSpecial;MQ.ui.battle.demoSpecial=function(){window.__before=[];document.fonts.forEach(function(f){if(f.status==='loaded')window.__before.push(f.family+' '+f.weight+' '+f.unicodeRange.slice(0,24));});return o.apply(this,arguments);};");
const AFTER = "(function(){if(!window.__before)return 'まだ';const now=[];document.fonts.forEach(function(f){if(f.status==='loaded'||f.status==='loading')now.push(f.family+' '+f.weight+' '+f.unicodeRange.slice(0,24)+(f.status==='loading'?' (loading)':''));});const b=new Set(window.__before);const add=now.filter(function(x){return !b.has(x.replace(' (loading)',''));});return 'まえ '+window.__before.length+' ／ ふえた '+add.length+'\\n'+add.join('\\n');})()";
function getJson(port, p) { return new Promise(function (res, rej) { http.get('http://127.0.0.1:' + port + p, function (r) { let d = ''; r.on('data', function (c) { d += c; }); r.on('end', function () { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej); }); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
(async function () {
  const port = 9000 + Math.floor(Math.random() * 900);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fd-'));
  const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + tmp,
    '--window-size=800,1280', '--force-device-scale-factor=2', '--hide-scrollbars', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
  let list = null;
  for (let i = 0; i < 50 && !list; i++) { await sleep(200); try { list = await getJson(port, '/json'); } catch (e) {} }
  const ws = new WebSocket(list.find(function (t) { return t.type === 'page'; }).webSocketDebuggerUrl);
  let id = 0; const waits = {};
  const send = function (m, p) { return new Promise(function (res) { const n = ++id; waits[n] = res; ws.send(JSON.stringify({ id: n, method: m, params: p || {} })); }); };
  ws.onmessage = function (e) { const m = JSON.parse(e.data); if (m.id && waits[m.id]) { waits[m.id](m.result); delete waits[m.id]; } };
  await new Promise(function (r) { ws.onopen = r; });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: 'file:///' + path.resolve(__dirname, '..', 'harness.html').split(String.fromCharCode(92)).join('/') + '#perffx:' + sp + MARK + extra });
  await sleep(5000);
  const r = await send('Runtime.evaluate', { expression: AFTER, returnByValue: true });
  console.log(r && r.result ? r.result.value : '?');
  ws.close(); ch.kill(); process.exit(0);
})();
