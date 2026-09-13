// わざの はじめの ひっかかりを こまかく 見る（v14.2.1）
// node startcut.js <わざ> [回数] [CPU を おそく する 倍率（例 4＝タブレットの まね）] [ハッシュの のこり]
//   例：node startcut.js set-capsule 3 4
// 出る もの：わざを 出した しゅんかん から 0.7秒の あいだの メインの 長い 仕事（12ms こえ）と その 中身、
//          コマと コマの あいだの いちばん 長い ところ（＝画面が 止まって 見える 時間）
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sp = process.argv[2] || 'set-capsule', reps = +(process.argv[3] || 2), thr = +(process.argv[4] || 1), extra = process.argv[5] || '';
const MARK = "|js=" + encodeURIComponent("const o=MQ.ui.battle.demoSpecial;MQ.ui.battle.demoSpecial=function(){console.timeStamp('SPSTART');const r=o.apply(this,arguments);console.timeStamp('SPEND');return r;};");
const KIND = { Layerize: 1, Commit: 1, Paint: 1, PrePaint: 1, UpdateLayoutTree: 1, Layout: 1, FunctionCall: 1, TimerFire: 1, FireAnimationFrame: 1, ParseHTML: 1, MinorGC: 1, MajorGC: 1, 'V8.GC_SCAVENGER': 1, HitTest: 1, 'Decode Image': 1, ScheduleStyleRecalculation: 0, UpdateLayer: 1, RasterTask: 1, EventDispatch: 1 };
function getJson(port, p) { return new Promise(function (res, rej) { http.get('http://127.0.0.1:' + port + p, function (r) { let d = ''; r.on('data', function (c) { d += c; }); r.on('end', function () { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej); }); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
async function once() {
  const port = 9300 + Math.floor(Math.random() * 600);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-'));
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
  if (thr > 1) await send('Emulation.setCPUThrottlingRate', { rate: thr });
  await send('Tracing.start', { categories: 'toplevel,devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.frame,disabled-by-default-devtools.timeline.stack,v8.execute', transferMode: 'ReportEvents' });
  await send('Page.navigate', { url: 'file:///' + path.resolve(__dirname, '..', 'harness.html').split('\\').join('/') + '#perffx:' + sp + MARK + extra });
  await sleep(6000 + thr * 2500);
  await new Promise(function (r) { done = r; send('Tracing.end'); });
  ws.close(); ch.kill();
  const tn = {};
  ev.forEach(function (e) { if (e.name === 'thread_name') tn[e.pid + '/' + e.tid] = e.args.name; });
  const st = ev.find(function (e) { return e.name === 'TimeStamp' && e.args && e.args.data && e.args.data.message === 'SPSTART'; });
  const en = ev.find(function (e) { return e.name === 'TimeStamp' && e.args && e.args.data && e.args.data.message === 'SPEND'; });
  if (!st) return null;
  const a = st.ts - 5000, b = st.ts + 700000;
  const isMain = function (e) { return tn[e.pid + '/' + e.tid] === 'CrRendererMain'; };
  const tasks = ev.filter(function (e) { return e.ph === 'X' && isMain(e) && e.name === 'RunTask' && e.ts + e.dur > a && e.ts < b && e.dur > 12000; });
  const lines = [];
  tasks.forEach(function (t) {
    const agg = {};
    ev.forEach(function (k) {
      if (k.ph !== 'X' || !KIND[k.name] || k.tid !== t.tid || k.pid !== t.pid) return;
      if (k.ts < t.ts || k.ts + (k.dur || 0) > t.ts + t.dur) return;
      agg[k.name] = (agg[k.name] || 0) + k.dur;
    });
    const each = ev.filter(function (k) { return k.ph === 'X' && (k.name === 'Layout' || k.name === 'UpdateLayoutTree') && k.tid === t.tid && k.pid === t.pid && k.ts >= t.ts && k.ts + (k.dur || 0) <= t.ts + t.dur && k.dur > 1500; }).map(function (k) { const d = k.args && k.args.beginData; return k.name[0] + ':' + (k.dur / 1000).toFixed(1) + (d && d.dirtyObjects ? '(' + d.dirtyObjects + '/' + d.totalObjects + ')' : '') + (d && d.elementCount ? '(el ' + d.elementCount + ')' : '') + (d && d.stackTrace && d.stackTrace.length ? '[' + d.stackTrace.slice(0, 3).map(function (f) { return (f.functionName || '?') + ':' + f.lineNumber; }).join('<') + ']' : ''); });
    if (each.length) lines.push('      ' + each.join(' '));
    lines.push('  +' + ((t.ts - st.ts) / 1000).toFixed(0) + 'ms ' + (t.dur / 1000).toFixed(0) + 'ms  ' +
      Object.keys(agg).sort(function (x, y) { return agg[y] - agg[x]; }).slice(0, 6).map(function (k) { return k + '=' + (agg[k] / 1000).toFixed(1); }).join(' '));
  });
  const frames = ev.filter(function (e) { return (e.name === 'DrawFrame' || e.name === 'Graphics.Pipeline.DrawAndSwap') && e.ts >= a - 100000 && e.ts <= b; }).map(function (e) { return e.ts; }).sort(function (x, y) { return x - y; });
  let worst = 0, wAt = 0;
  for (let i = 1; i < frames.length; i++) { const g = frames[i] - frames[i - 1]; if (g > worst && frames[i] > st.ts) { worst = g; wAt = frames[i - 1] - st.ts; } }
  const lay = ev.filter(function (k) { return k.ph === 'X' && isMain(k) && k.name === 'Layout' && k.ts >= st.ts && k.ts < b; });
  const layMs = lay.reduce(function (x, k) { return x + k.dur; }, 0) / 1000, layBig = lay.filter(function (k) { const d = k.args && k.args.beginData; return d && d.dirtyObjects > 300; }).length;
  const pnt = ev.filter(function (k) { return k.ph === 'X' && isMain(k) && k.name === 'Paint' && k.ts >= st.ts && k.ts < b; }).length;
  const fail = {};
  ev.forEach(function (k) { if (k.name === 'Animation' && k.args && k.args.data && k.args.data.compositeFailed) { const dd = k.args.data; const key = (dd.compositeFailed) + ' ' + JSON.stringify(dd.unsupportedProperties || []) + ' ' + (dd.name || ''); fail[key] = (fail[key] || 0) + 1; } });
  if (process.env.FAIL) console.log('compositeFailed: ' + JSON.stringify(fail, null, 1));
  return { layMs: layMs, layN: lay.length, layBig: layBig, pnt: pnt, js: en ? (en.ts - st.ts) / 1000 : -1, worst: worst / 1000, wAt: wAt / 1000, lines: lines };
}
(async function () {
  for (let i = 0; i < reps; i++) {
    const r = await once();
    if (!r) { console.log('（わざの しるしが 見つからない）'); continue; }
    console.log('#' + (i + 1) + ' わざを 出す JS ' + r.js.toFixed(0) + 'ms ／ いちばん 長く 止まった ' + r.worst.toFixed(0) + 'ms（+' + r.wAt.toFixed(0) + 'ms から）／0.7秒の Layout ' + r.layMs.toFixed(0) + 'ms（' + r.layN + '回・ほぼ ぜんぶ ' + r.layBig + '回）Paint ' + r.pnt + '回');
    if (!process.env.QUIET) r.lines.forEach(function (l) { console.log(l); });
  }
  process.exit(0);
})();
