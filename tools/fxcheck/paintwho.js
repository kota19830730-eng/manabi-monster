// 何が 描き直されて いるか（Paint の 相手の 要素）を 数える
// node paintwho.js "<harness の モード>" [はじめる秒] [はかる秒]
//   例：node paintwho.js perffx:fire   … わざの あいだ
//       node paintwho.js battle 4 3    … ふつうの たたかい（何も して いない とき）
// 出る もの：Paint の 回数が 多い 要素（タグ.クラス）じゅん。毎コマ 描き直す ものは 60回/秒 くらいに なる
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const mode = process.argv[2] || 'perffx:fire', a = +(process.argv[3] || 2.5), dur = +(process.argv[4] || 3);
const port = 9700 + Math.floor(Math.random() * 200);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-'));
const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + tmp,
  '--window-size=800,1280', '--force-device-scale-factor=2', '--hide-scrollbars', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
function getJson(p) { return new Promise(function (res, rej) { http.get('http://127.0.0.1:' + port + p, function (r) { let d = ''; r.on('data', function (c) { d += c; }); r.on('end', function () { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej); }); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
(async function () {
  let list = null;
  for (let i = 0; i < 50 && !list; i++) { await sleep(200); try { list = await getJson('/json'); } catch (e) {} }
  const page = list.find(function (t) { return t.type === 'page'; });
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0; const waits = {}; const ev = []; let done = null;
  const send = function (method, params) { return new Promise(function (res) { const n = ++id; waits[n] = res; ws.send(JSON.stringify({ id: n, method: method, params: params || {} })); }); };
  ws.onmessage = function (e) {
    const m = JSON.parse(e.data);
    if (m.id && waits[m.id]) { waits[m.id](m.result); delete waits[m.id]; }
    if (m.method === 'Tracing.dataCollected') ev.push.apply(ev, m.params.value);
    if (m.method === 'Tracing.tracingComplete' && done) done();
  };
  await new Promise(function (r) { ws.onopen = r; });
  await send('Page.enable');
  await send('Page.navigate', { url: 'file:///' + path.resolve(__dirname, '..', 'harness.html').split('\\').join('/') + '#' + mode });
  await sleep(a * 1000);
  await send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline', transferMode: 'ReportEvents' });
  await sleep(dur * 1000);
  await new Promise(function (r) { done = r; send('Tracing.end'); });
  const cnt = {};
  ev.forEach(function (e) { if (e.name === 'Paint' && e.args && e.args.data && e.args.data.nodeId) cnt[e.args.data.nodeId] = (cnt[e.args.data.nodeId] || 0) + 1; });
  const ids = Object.keys(cnt).map(Number);
  await send('DOM.enable');
  await send('DOM.getDocument', { depth: -1 });
  const pushed = await send('DOM.pushNodesByBackendIdsToFrontend', { backendNodeIds: ids });
  const rows = [];
  for (let i = 0; i < ids.length; i++) {
    const nid = pushed && pushed.nodeIds ? pushed.nodeIds[i] : 0;
    let label = '#' + ids[i];
    if (nid) {
      const d = await send('DOM.describeNode', { nodeId: nid });
      const n = d && d.node;
      if (n) { const at = n.attributes || []; const ci = at.indexOf('class'); label = n.localName + (ci >= 0 ? '.' + at[ci + 1].split(/\s+/).slice(0, 3).join('.') : ''); }
    }
    rows.push([cnt[ids[i]], label]);
  }
  rows.sort(function (x, y) { return y[0] - x[0]; });
  const total = rows.reduce(function (s, r) { return s + r[0]; }, 0);
  console.log('Paint ' + total + '回 / ' + dur + '秒（' + (total / dur).toFixed(0) + '回/秒）');
  rows.slice(0, 20).forEach(function (r) { console.log('  ' + String(r[0]).padStart(4) + '  ' + r[1]); });
  ws.close(); ch.kill();
  process.exit(0);
})();
