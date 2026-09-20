// ボス戦の 重さを はかる（v14.14）
// node bossab.js <mode> <回数> <名前=ハッシュの のこり> ...
//   例：node bossab.js last 3 base= nowing="|css=.v3--b64last .v3p{animation:none!important}"
// mode＝harness の モード（last／boss／battle）。画面が おちついた あとの 3秒を はかる
//   ＝「なにも して いない ボス戦」の 1コマの 重さ（子は この 時間を いちばん 長く 見る）。
// はかる もの：
//   main／gpu／viz／cc＝スレッドが いそがしかった 時間（入れ子は 1回だけ）
//   コマ＝画面を 描いた 回数・おそいコマ＝20ms こえ・いちばん＝いちばん 長い あいだ
//   面／箱＝3D の 数（PC の 混みぐあいに よらない）
// CPU=4 で タブレットの まね（CPU=1 で PC の まま）。dpr 2・800×1280。
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const mode = process.argv[2] || 'last', reps = +(process.argv[3] || 3);
const variants = process.argv.slice(4).map(function (v) { const i = v.indexOf('='); return [v.slice(0, i), v.slice(i + 1)]; });
const CPU = +(process.env.CPU || 4);
const SETTLE = +(process.env.SETTLE || 6000);   // 画面が おちつくまで まつ
const WIN = +(process.env.WIN || 3000);         // はかる 長さ

const WATCH = { CrRendererMain: 1, CrGpuMain: 1, VizCompositorThread: 1, Compositor: 1 };
const KIND = { Layerize: 1, Commit: 1, Paint: 1, PrePaint: 1, UpdateLayoutTree: 1, Layout: 1, FunctionCall: 1, FireAnimationFrame: 1, TimerFire: 1, UpdateLayer: 1, RasterTask: 1 };

function getJson(port, p) {
  return new Promise(function (res, rej) {
    http.get('http://127.0.0.1:' + port + p, function (r) { let d = ''; r.on('data', function (c) { d += c; }); r.on('end', function () { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej);
  });
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function merged(list) {
  const L = list.sort(function (x, y) { return x[0] - y[0]; });
  let tot = 0, cs = -1, cf = -1;
  L.forEach(function (x) { if (x[0] > cf) { if (cf > cs) tot += cf - cs; cs = x[0]; cf = x[1]; } else if (x[1] > cf) cf = x[1]; });
  if (cf > cs) tot += cf - cs;
  return tot;
}

async function once(extra) {
  const port = 9100 + Math.floor(Math.random() * 600);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bab-'));
  const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port,
    '--user-data-dir=' + tmp, '--window-size=800,1280', '--force-device-scale-factor=2', '--hide-scrollbars', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
  let list = null;
  for (let i = 0; i < 50 && !list; i++) { await sleep(200); try { list = await getJson(port, '/json'); } catch (e) {} }
  if (!list) { ch.kill(); return null; }
  const page = list.find(function (t) { return t.type === 'page'; });
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0; const waits = {}; const ev = []; let done = null;
  const send = function (m, p) { return new Promise(function (res) { const n = ++id; waits[n] = res; ws.send(JSON.stringify({ id: n, method: m, params: p || {} })); }); };
  ws.onmessage = function (e) {
    const m = JSON.parse(e.data);
    if (m.id && waits[m.id]) { waits[m.id](m.result); delete waits[m.id]; }
    if (m.method === 'Tracing.dataCollected') ev.push.apply(ev, m.params.value);
    if (m.method === 'Tracing.tracingComplete' && done) done();
  };
  await new Promise(function (r) { ws.onopen = r; });
  await send('Page.enable');
  await send('Runtime.enable');
  if (CPU > 1) await send('Emulation.setCPUThrottlingRate', { rate: CPU });
  const url = 'file:///' + path.resolve(__dirname, '..', 'harness.html').split('\\').join('/') + '#' + mode + extra;
  await send('Page.navigate', { url: url });
  await sleep(SETTLE);
  // 3D の 数（PC の 混みぐあいに よらない）
  const cnt = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: "(function(){var s=document.getElementById('screen-battle');if(!s)return null;" +
      "return {dom:s.querySelectorAll('*').length,box:s.querySelectorAll('.v3 .b').length,face:s.querySelectorAll('.v3 .f').length," +
      "anim:document.getAnimations().filter(function(a){return a.playState==='running';}).length};})()"
  });
  await send('Tracing.start', { categories: 'toplevel,devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.frame,benchmark', transferMode: 'ReportEvents' });
  await sleep(WIN);
  await new Promise(function (r) { done = r; send('Tracing.end'); });
  ws.close(); ch.kill();

  const tn = {};
  ev.forEach(function (e) { if (e.name === 'thread_name') tn[e.pid + '/' + e.tid] = e.args.name; });
  const ts = ev.filter(function (e) { return e.ph === 'X' && e.ts; }).map(function (e) { return e.ts; });
  if (!ts.length) return null;
  const a = Math.min.apply(null, ts), b = a + WIN * 1000;
  const iv = {}, parts = {}, pc = { n: 0 };
  ev.forEach(function (e) {
    if (e.ph !== 'X') return;
    const n = tn[e.pid + '/' + e.tid];
    const s = Math.max(a, e.ts), f = Math.min(b, e.ts + (e.dur || 0));
    if (f <= s) return;
    if ((e.name === 'RunTask' || e.name === 'ThreadControllerImpl::RunTask') && WATCH[n]) (iv[n] = iv[n] || []).push([s, f]);
    if (KIND[e.name] && n === 'CrRendererMain') parts[e.name] = (parts[e.name] || 0) + (f - s);
    if (e.name === 'Paint' && n === 'CrRendererMain') pc.n++;
  });
  const busy = {};
  Object.keys(iv).forEach(function (n) { busy[n] = merged(iv[n]); });
  const frames = ev.filter(function (e) { return (e.name === 'DrawFrame' || e.name === 'Graphics.Pipeline.DrawAndSwap') && e.ts >= a && e.ts <= b; })
    .map(function (e) { return e.ts; }).sort(function (x, y) { return x - y; });
  let slow = 0, worst = 0;
  for (let i = 1; i < frames.length; i++) { const g = (frames[i] - frames[i - 1]) / 1000; if (g > 20) slow++; worst = Math.max(worst, g); }
  const c = (cnt && cnt.result && cnt.result.value) || {};
  return { main: (busy.CrRendererMain || 0) / 1000, gpu: (busy.CrGpuMain || 0) / 1000, viz: (busy.VizCompositorThread || 0) / 1000,
    cc: (busy.Compositor || 0) / 1000, frames: frames.length, slow: slow, worst: worst, pn: pc.n, parts: parts,
    dom: c.dom || 0, box: c.box || 0, face: c.face || 0, anim: c.anim || 0 };
}

(async function () {
  console.log('mode=' + mode + ' CPU×' + CPU + ' はかる ' + WIN + 'ms（おちつくまで ' + SETTLE + 'ms）');
  /* PC の 混みぐあいで ぶれる ので **じゅんばんを かえながら 交互に** まわす（v14.3 の 教訓） */
  const got = {};
  variants.forEach(function (v) { got[v[0]] = []; });
  for (let i = 0; i < reps; i++) {
    const order = i % 2 ? variants.slice().reverse() : variants;
    for (const v of order) { const r = await once(v[1]); if (r) got[v[0]].push(r); }
  }
  for (const v of variants) {
    const rs = got[v[0]];
    if (!rs.length) { console.log(v[0] + ' … とれなかった'); continue; }
    const avg = function (k) { const v = rs.map(function (r) { return r[k]; }).sort(function (x, y) { return x - y; }); return v[Math.floor(v.length / 2)]; };   // 中央の 値（ぶれに 強い）
    const pk = {};
    rs.forEach(function (r) { Object.keys(r.parts).forEach(function (k) { pk[k] = (pk[k] || 0) + r.parts[k] / rs.length; }); });
    console.log(v[0].padEnd(10) + ' 面 ' + avg('face').toFixed(0) + ' 箱 ' + avg('box').toFixed(0) + ' DOM ' + avg('dom').toFixed(0) + ' アニメ ' + avg('anim').toFixed(0) +
      ' | main ' + avg('main').toFixed(0) + 'ms gpu ' + avg('gpu').toFixed(0) + 'ms viz ' + avg('viz').toFixed(0) + 'ms cc ' + avg('cc').toFixed(0) + 'ms' +
      ' | コマ ' + avg('frames').toFixed(0) + ' おそいコマ ' + avg('slow').toFixed(1) + ' いちばん ' + avg('worst').toFixed(0) + 'ms 描き直し ' + avg('pn').toFixed(0) + '回 (n=' + rs.length + ')');
    console.log('           中身 ' + Object.keys(pk).sort(function (x, y) { return pk[y] - pk[x]; }).slice(0, 8).map(function (k) { return k + '=' + (pk[k] / 1000).toFixed(0); }).join(' '));
  }
  process.exit(0);
})();
