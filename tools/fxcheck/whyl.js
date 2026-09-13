// わざを 出した ときに「なぜ レイアウトし直しに なったか」を 数える（v14.2.1）
// node whyl.js <わざ> [ハッシュの のこり]
//   LayoutInvalidationTracking（どの 要素が どの 理由で）と 大きな Layout（dirty の 数）を 時間じゅんに 出す
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sp = process.argv[2] || 'set-capsule', extra = process.argv[3] || '';
const SEED = "(function(){let a=20260914;Math.random=function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};})();";
const MARK = "|js=" + encodeURIComponent(SEED + "const o=MQ.ui.battle.demoSpecial;MQ.ui.battle.demoSpecial=function(){console.timeStamp('SPSTART');return o.apply(this,arguments);};");
function getJson(port, p) { return new Promise(function (res, rej) { http.get('http://127.0.0.1:' + port + p, function (r) { let d = ''; r.on('data', function (c) { d += c; }); r.on('end', function () { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej); }); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
(async function () {
  const port = 9000 + Math.floor(Math.random() * 900);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wl-'));
  const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + tmp,
    '--window-size=800,1280', '--force-device-scale-factor=2', '--hide-scrollbars', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
  let list = null;
  for (let i = 0; i < 50 && !list; i++) { await sleep(200); try { list = await getJson(port, '/json'); } catch (e) {} }
  const ws = new WebSocket(list.find(function (t) { return t.type === 'page'; }).webSocketDebuggerUrl);
  let id = 0; const waits = {}; const ev = []; let done = null;
  const send = function (m, p) { return new Promise(function (res) { const n = ++id; waits[n] = res; ws.send(JSON.stringify({ id: n, method: m, params: p || {} })); }); };
  ws.onmessage = function (e) { const m = JSON.parse(e.data); if (m.id && waits[m.id]) { waits[m.id](m.result); delete waits[m.id]; } if (m.method === 'Tracing.dataCollected') ev.push.apply(ev, m.params.value); if (m.method === 'Tracing.tracingComplete' && done) done(); };
  await new Promise(function (r) { ws.onopen = r; });
  await send('Page.enable');
  await send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.invalidationTracking,disabled-by-default-devtools.timeline.stack', transferMode: 'ReportEvents' });
  await send('Page.navigate', { url: 'file:///' + path.resolve(__dirname, '..', 'harness.html').split(String.fromCharCode(92)).join('/') + '#perffx:' + sp + MARK + extra });
  await sleep(+(process.env.WAIT || 6000));
  await new Promise(function (r) { done = r; send('Tracing.end'); });
  ws.close(); ch.kill();
  const sts = ev.filter(function (e) { return e.name === 'TimeStamp' && e.args && e.args.data && e.args.data.message === 'SPSTART'; }).sort(function (a, b) { return a.ts - b.ts; });
  const st = sts[+(process.env.NTH || 0)] || sts[sts.length - 1];
  console.log('わざの しるし ' + sts.length + ' こ・' + (+(process.env.NTH || 0) + 1) + 'こめを 見る');
  if (!st) { console.log('しるし なし'); process.exit(0); }
  const lo = st.ts - 2000, hi = st.ts + 600000;
  const rows = ev.filter(function (e) { return e.ts >= lo && e.ts <= hi && (e.name === 'LayoutInvalidationTracking' || e.name === 'StyleRecalcInvalidationTracking' || e.name === 'StyleInvalidatorInvalidationTracking' || (e.name === 'Layout' && e.ph === 'X') || (e.name === 'UpdateLayoutTree' && e.ph === 'X')); })
    .sort(function (a, b) { return a.ts - b.ts; });
  let lastKey = '', cnt = 0;
  const flush = function () { if (lastKey) console.log(lastKey + (cnt > 1 ? '  ×' + cnt : '')); };
  rows.forEach(function (e) {
    const t = '+' + ((e.ts - st.ts) / 1000).toFixed(0) + 'ms ';
    let key;
    if (e.name === 'Layout') { const d = e.args && e.args.beginData || {}; key = t + '== Layout ' + (e.dur / 1000).toFixed(1) + 'ms dirty ' + d.dirtyObjects + '/' + d.totalObjects; }
    else if (e.name === 'UpdateLayoutTree') { const d = e.args && e.args.elementCount; key = t + '== Style ' + (e.dur / 1000).toFixed(1) + 'ms el ' + (e.args && e.args.elementCount); }
    else {
      const d = (e.args && e.args.data) || {};
      const stk = d.stackTrace && d.stackTrace.length ? ' [' + d.stackTrace.slice(0, 2).map(function (f) { return (f.functionName || '?') + ':' + f.lineNumber; }).join('<') + ']' : '';
      key = '   ' + e.name.replace('InvalidationTracking', '') + ' ' + (d.reason || d.changedAttribute || d.changedClass || d.changedId || d.invalidationList && JSON.stringify(d.invalidationList).slice(0, 60) || '') + ' ' + (d.nodeName || '') + stk;
    }
    if (key.replace(/^\+\d+ms /, '') === lastKey.replace(/^\+\d+ms /, '') && key.indexOf('==') < 0) cnt++; else { flush(); lastKey = key; cnt = 1; }
  });
  flush();
  process.exit(0);
})();
