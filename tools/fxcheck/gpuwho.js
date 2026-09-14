// わざの はじめ（0.7秒）に GPU の メインが 何を して いたか（v14.3）
// node gpuwho.js <わざ> [ハッシュの のこり]
// 出る もの：GPU の メインの 10ms を こえる 仕事を 時間じゅんに（中身の 名前の 上位 4つ）＋ 画面に 描いた 時間（DrawAndSwap）
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sp = process.argv[2] || 'bolt', extra = process.argv[3] || '';
const MARK = "|js=" + encodeURIComponent("const o=MQ.ui.battle.demoSpecial;MQ.ui.battle.demoSpecial=function(){console.timeStamp('SPSTART');return o.apply(this,arguments);};");
function getJson(port, p) { return new Promise(function (res, rej) { http.get('http://127.0.0.1:' + port + p, function (r) { let d = ''; r.on('data', function (c) { d += c; }); r.on('end', function () { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej); }); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
(async function () {
  const port = 9300 + Math.floor(Math.random() * 600);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-'));
  const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + tmp,
    '--window-size=800,1280', '--force-device-scale-factor=2', '--hide-scrollbars', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
  let list = null;
  for (let i = 0; i < 50 && !list; i++) { await sleep(200); try { list = await getJson(port, '/json'); } catch (e) {} }
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
  await send('Tracing.start', { categories: 'toplevel,devtools.timeline,viz,gpu,cc,disabled-by-default-devtools.timeline.frame', transferMode: 'ReportEvents' });
  let page0 = 'file:///' + path.resolve(__dirname, '..', 'harness.html').split('\\').join('/');
  let ex = extra;
  if (ex.charAt(0) === '@') { const cut = ex.indexOf('|') < 0 ? ex.length : ex.indexOf('|'); page0 = 'file:///' + ex.slice(1, cut) + '/tools/harness.html'; ex = ex.slice(cut); }
  await send('Page.navigate', { url: page0 + '#perffx:' + sp + MARK + ex });
  await sleep(6500);
  await new Promise(function (r) { done = r; send('Tracing.end'); });
  ws.close(); ch.kill();
  const tn = {};
  ev.forEach(function (e) { if (e.name === 'thread_name') tn[e.pid + '/' + e.tid] = e.args.name; });
  const st = ev.find(function (e) { return e.name === 'TimeStamp' && e.args && e.args.data && e.args.data.message === 'SPSTART'; });
  if (!st) { console.log('しるし なし'); process.exit(0); }
  const a = st.ts, b = st.ts + 700000;
  const WANT = { CrGpuMain: 'GPU', CrRendererMain: 'メイン', Compositor: 'コンポ', VizCompositorThread: 'viz' };
  const gpuMain = function (k) { const n = tn[k.pid + '/' + k.tid]; return !!WANT[n] || /RasterWorker|CompositorTileWorker/.test(n || ''); };
  const tasks = ev.filter(function (k) { return k.ph === 'X' && gpuMain(k) && (k.name === 'ThreadControllerImpl::RunTask' || k.name === 'RunTask' || k.name === 'TaskGraphRunner::RunTask') && k.ts >= a && k.ts < b && k.dur > 8000; }).sort(function (x, y) { return x.ts - y.ts; });
  const seen = {};
  tasks.forEach(function (t) {
    if (seen[t.ts]) return; seen[t.ts] = 1;
    const agg = {};
    ev.forEach(function (k) { if (k.ph !== 'X' || k.pid !== t.pid || k.tid !== t.tid || k.ts < t.ts || k.ts + (k.dur || 0) > t.ts + t.dur || k === t) return; if (/RunTask|ThreadController|Scheduler|ExecuteDeferred|GPUTask|CommandBuffer|PutChanged|OnAsyncFlush/.test(k.name)) return; agg[k.name] = (agg[k.name] || 0) + k.dur; });
    const thn = tn[t.pid + '/' + t.tid] || '?';
    console.log('  +' + ((t.ts - a) / 1000).toFixed(0).padStart(4) + 'ms ' + (t.dur / 1000).toFixed(0).padStart(4) + 'ms ' + (WANT[thn] || thn).padEnd(6) + ' ' + Object.keys(agg).sort(function (x, y) { return agg[y] - agg[x]; }).slice(0, 4).map(function (k) { return k + '=' + (agg[k] / 1000).toFixed(1); }).join('  '));
  });
  const draws = ev.filter(function (e) { return e.name === 'Display::DrawAndSwap' && e.ph === 'X' && e.ts >= a && e.ts < b; });
  console.log('  画面に 描いた：' + draws.map(function (e) { return '+' + ((e.ts + e.dur - a) / 1000).toFixed(0) + '(' + (e.dur / 1000).toFixed(0) + ')'; }).join(' '));
  process.exit(0);
})();
