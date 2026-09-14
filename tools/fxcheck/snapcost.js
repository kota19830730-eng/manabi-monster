// v14.3 案B：カットインの 主人公の 絵を 作る 時間（本当の 時計・CPU の おそさを かえて）
// node snapcost.js [CPU の おそさ=4]
//   harness #cisnap を 開いて、ポーズごとの 作る 時間（render の はじめ〜おわり）と その あいだの いちばん 長い メインの しごとを 出す
const { spawn } = require('child_process');
const http = require('http'), fs = require('fs'), os = require('os'), path = require('path');
const thr = +(process.argv[2] || 4);
function getJson(port, p) { return new Promise(function (res, rej) { http.get('http://127.0.0.1:' + port + p, function (r) { let d = ''; r.on('data', function (c) { d += c; }); r.on('end', function () { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej); }); }
const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
(async function () {
  const port = 9300 + Math.floor(Math.random() * 600);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-'));
  const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + tmp,
    '--window-size=800,1280', '--force-device-scale-factor=2', '--hide-scrollbars', '--no-first-run', '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });
  let list = null;
  for (let i = 0; i < 50 && !list; i++) { await sleep(200); try { list = await getJson(port, '/json'); } catch (e) {} }
  const page = list.find(function (t) { return t.type === 'page'; });
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0; const waits = {};
  const send = function (m, p) { return new Promise(function (res) { const n = ++id; waits[n] = res; ws.send(JSON.stringify({ id: n, method: m, params: p || {} })); }); };
  ws.onmessage = function (e) { const m = JSON.parse(e.data); if (m.id && waits[m.id]) { waits[m.id](m.result); delete waits[m.id]; } };
  await new Promise(function (r) { ws.onopen = r; });
  await send('Page.enable');
  if (thr > 1) await send('Emulation.setCPUThrottlingRate', { rate: thr });
  // ロング タスク（50ms こえの メインの しごと）を ぜんぶ おぼえる
  const LT = "window.__lt=[];try{new PerformanceObserver(function(l){l.getEntries().forEach(function(e){window.__lt.push(Math.round(e.duration));});}).observe({entryTypes:['longtask']});}catch(e){}";
  await send('Page.addScriptToEvaluateOnNewDocument', { source: LT });
  const url = 'file:///' + path.resolve(__dirname, '..', 'harness.html').split('\\').join('/') + '#cisnap:190';
  await send('Page.navigate', { url: url });
  let log = '';
  for (let i = 0; i < 120; i++) {
    await sleep(500);
    const r = await send('Runtime.evaluate', { expression: "(document.getElementById('log')||{}).textContent||''", returnByValue: true });
    log = r.result.value;
    if (/cisnap: /.test(log)) break;
  }
  const lt = await send('Runtime.evaluate', { expression: 'JSON.stringify(window.__lt||[])', returnByValue: true });
  console.log('CPU ×' + thr);
  console.log((log.match(/cisnap: [^\n]*/) || ['(ログなし)'])[0]);
  console.log('50ms こえの しごと（ms）: ' + lt.result.value);
  ws.close(); ch.kill(); process.exit(0);
})();
