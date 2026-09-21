// モンスター 1体ずつ「光る ところ（.bx__glow）」が いくつ あるかを 数える
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const HARN = process.env.HARN || require('path').resolve(__dirname, '..', 'harness.html').split(require('path').sep).join('/');
function getJson(port, p) { return new Promise(function (res, rej) { http.get('http://127.0.0.1:' + port + p, function (r) { let d = ''; r.on('data', function (c) { d += c; }); r.on('end', function () { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej); }); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
(async function () {
  const port = 9500 + Math.floor(Math.random() * 300);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gc-'));
  const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port,
    '--user-data-dir=' + tmp, '--window-size=520,940', '--hide-scrollbars', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
  let list = null;
  for (let i = 0; i < 60 && !list; i++) { await sleep(200); try { list = await getJson(port, '/json'); } catch (e) {} }
  const page = list.find(function (t) { return t.type === 'page'; });
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0; const waits = {};
  const send = function (m, p) { return new Promise(function (res) { const n = ++id; waits[n] = res; ws.send(JSON.stringify({ id: n, method: m, params: p || {} })); }); };
  ws.onmessage = function (e) { const m = JSON.parse(e.data); if (m.id && waits[m.id]) { waits[m.id](m.result); delete waits[m.id]; } };
  await new Promise(function (r) { ws.onopen = r; });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: 'file:///' + HARN + '#battle' });
  for (let i = 0; i < 40; i++) { await sleep(500); const r = await send('Runtime.evaluate', { returnByValue: true, expression: "!!(window.MQ&&MQ.enemies&&MQ.enemies.node)" }); if (r.result && r.result.value) break; }
  const r = await send('Runtime.evaluate', { returnByValue: true, expression:
    "(function(){var out=[];var seen={};" +
    "var all=[].concat(MQ.enemies.list||[],MQ.enemies.bosses||[]);" +
    "all.forEach(function(e){ if(seen[e.id])return; seen[e.id]=1;" +
    "  try{ var n=MQ.enemies.node(e.id,{size:112}); var g=n.querySelectorAll('.bx__glow').length;" +
    "       out.push({id:e.id,name:e.name,g:g,boss:!!(e.id.indexOf('boss-')===0)}); }catch(err){} });" +
    "out.sort(function(a,b){return b.g-a.g;});" +
    "var hist={};out.forEach(function(x){var k=x.g;hist[k]=(hist[k]||0)+1;});" +
    "return {n:out.length,top:out.slice(0,16),hist:hist};})()" });
  const v = r.result.value;
  if (!v) { console.log('とれない'); ws.close(); ch.kill(); return; }
  console.log('モンスター ' + v.n + '体');
  console.log('■ 光る ところが 多い 順');
  v.top.forEach(function (x) { console.log('   ' + String(x.g).padStart(3) + ' こ  ' + x.id.padEnd(16) + ' ' + (x.name || '')); });
  console.log('■ 何こ 持って いるか（光の数: 体数）');
  console.log('   ' + Object.keys(v.hist).map(Number).sort(function (a, b) { return a - b; })
    .map(function (k) { return k + ':' + v.hist[k]; }).join('  '));
  ws.close(); ch.kill();
})();
