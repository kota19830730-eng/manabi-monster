// カプセルの 演出（v13.14）の 重さを はかる：1コマの 時間（場面ごと）と 描き直し（Paint）の 回数
// node tools/3d/capfxperf.js "<capfx.html の hash>" [タップの ms,ms…] [css=<かぶせる CSS>]
//   タブレットと 同じ 800×1280・画素 2ばい（dpr 2）。本当の 時計。
//   出る もの：場面ごとの 1コマ（ふつう／上位5%／いちばん 長い／20ms こえの 数）と Paint の 多い 要素
//   ※ この PC が 混んで いる（Chrome 30こ いじょう）と 時間は ぶれる。くらべる ときは 同じ ときに 2回
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const hash = process.argv[2] || 'sr:1223';
const TAPS = (process.argv[3] || '1000,4200,4600,5000').split(',').filter(Boolean).map(Number);
const extraCss = (process.argv.slice(4).find(function (a) { return a.indexOf('css=') === 0; }) || '').slice(4);
const port = 9700 + Math.floor(Math.random() * 250);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cfp-'));
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
  await send('Runtime.enable');
  await send('Page.navigate', { url: 'file:///' + __dirname.split(String.fromCharCode(92)).join('/') + '/capfx.html#' + hash });
  // かぶせる CSS は 演出が はじまる 前に（capfx.html は warm の 0.7秒 あとに まわす）
  for (let i = 0; i < 100; i++) {
    await sleep(50);
    const r = await send('Runtime.evaluate', { expression: '!!window.__fx', returnByValue: true });
    if (r && r.result && r.result.value) break;
  }
  if (extraCss) await send('Runtime.evaluate', { expression: 'var s=document.createElement("style");s.textContent=' + JSON.stringify(extraCss) + ';document.head.appendChild(s);1' });
  for (let i = 0; i < 100; i++) {
    await sleep(30);
    const r = await send('Runtime.evaluate', { expression: '!!(window.__fx && window.__fx.isOpen())', returnByValue: true });
    if (r && r.result && r.result.value) break;
  }
  // 1コマの 時間を ページの 中で あつめる（場面ごと）
  await send('Runtime.evaluate', { expression: `window.__fr = []; (function loop(t0){ requestAnimationFrame(function (t) { if (t0) window.__fr.push([t - t0, window.__fx.phase() || 'end']); if (window.__fr.length < 4000) loop(t); }); })(0); 1` });
  await send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline', transferMode: 'ReportEvents' });
  const t0 = Date.now();
  for (const t of TAPS) {
    const w = t - (Date.now() - t0);
    if (w > 0) await sleep(w);
    await send('Runtime.evaluate', { expression: 'window.__fx.tap(); 1' });
  }
  for (let i = 0; i < 100; i++) {   // ⑤ 登場の あと 2.5秒 まで
    const r = await send('Runtime.evaluate', { expression: 'window.__fx.phase()', returnByValue: true });
    if (r.result.value === 'reveal') break;
    await sleep(100);
  }
  await sleep(2500);
  await new Promise(function (r) { done = r; send('Tracing.end'); });
  const fr = (await send('Runtime.evaluate', { expression: 'JSON.stringify(window.__fr)', returnByValue: true })).result.value;
  const frames = JSON.parse(fr);
  const by = {};
  frames.forEach(function (f) { (by[f[1]] = by[f[1]] || []).push(f[0]); });
  console.log('1コマ（ms）  場面: 数 / ふつう / 上位5% / いちばん長い / 20ms こえ / 33ms こえ');
  Object.keys(by).forEach(function (k) {
    const a = by[k].slice().sort(function (x, y) { return x - y; });
    const q = function (p) { return a[Math.min(a.length - 1, Math.floor(a.length * p))].toFixed(1); };
    console.log('  ' + k.padEnd(9) + a.length + ' / ' + q(0.5) + ' / ' + q(0.95) + ' / ' + a[a.length - 1].toFixed(1) + ' / ' + a.filter(function (x) { return x > 20; }).length + ' / ' + a.filter(function (x) { return x > 33; }).length);
  });
  const cnt = {};
  let paints = 0;
  ev.forEach(function (e) { if (e.name === 'Paint' && e.args && e.args.data && e.args.data.nodeId) { paints++; cnt[e.args.data.nodeId] = (cnt[e.args.data.nodeId] || 0) + 1; } });
  const secs = (Date.now() - t0) / 1000;
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
  console.log('Paint ' + paints + '回 / ' + secs.toFixed(1) + '秒（' + (paints / secs).toFixed(0) + '回/秒）');
  rows.slice(0, 14).forEach(function (r) { console.log('  ' + String(r[0]).padStart(4) + '  ' + r[1]); });
  const lay = ev.filter(function (e) { return e.name === 'Layout'; }).length;
  const rec = ev.filter(function (e) { return e.name === 'UpdateLayoutTree' || e.name === 'RecalculateStyles'; }).length;
  console.log('Layout ' + lay + '回・スタイル計算 ' + rec + '回');
  ws.close(); ch.kill();
  process.exit(0);
})();
