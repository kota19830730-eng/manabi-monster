// わざの 重さを「本物に ちかい じょうたい」で はかる
//   ＝カットインの 絵が できあがって から わざを 出す（＝子が 5コンボに とどく ころ）
// node spwarm.js <mode> <わざ,…> <回数> [変える ところ]
//   mode＝battle（ふつうの たたかい）／boss／last
// 出る もの：3秒の うち 画面に 出た コマ・いちばん 長く 止まった あいだ・面の 数
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const MODE = process.argv[2] || 'battle';
const SPS = (process.argv[3] || 'bolt').split(',');
const REPS = +(process.argv[4] || 2);
const EXTRA = process.argv[5] || '';
const CPU = +(process.env.CPU || 4);
const WIN = +(process.env.WIN || 2200);
const COLD = !!process.env.COLD;   // COLD=1 で わざと 絵が できる 前に 出す
const HARN = process.env.HARN || path.resolve(__dirname, '..', 'harness.html');

function getJson(port, p) { return new Promise(function (res, rej) { http.get('http://127.0.0.1:' + port + p, function (r) { let d = ''; r.on('data', function (c) { d += c; }); r.on('end', function () { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej); }); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function med(a) { const b = a.slice().sort(function (x, y) { return x - y; }); return b[Math.floor(b.length / 2)]; }

async function once(sp) {
  const port = 9000 + Math.floor(Math.random() * 900);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'spw-'));
  const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port,
    '--user-data-dir=' + tmp, '--window-size=800,1280', '--force-device-scale-factor=2', '--hide-scrollbars', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
  let list = null;
  for (let i = 0; i < 60 && !list; i++) { await sleep(200); try { list = await getJson(port, '/json'); } catch (e) {} }
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
  await send('Page.enable'); await send('Runtime.enable');
  if (CPU > 1) await send('Emulation.setCPUThrottlingRate', { rate: CPU });
  await send('Page.navigate', { url: 'file:///' + HARN.split('\\').join('/') + '#' + MODE + EXTRA });
  // 絵が そろう まで まつ（さいだい 40秒）
  let st = null;
  for (let i = 0; i < 80; i++) {
    await sleep(500);
    const r = await send('Runtime.evaluate', { returnByValue: true, expression:
      "(function(){var c=MQ&&MQ.ui&&MQ.ui.ciSnap;if(!c)return null;return {made:Object.keys(c.cache).length,busy:c.busy(),batt:!!document.querySelector('#screen-battle.is-active')};})()" });
    st = r.result && r.result.value;
    if (COLD && st && st.batt) break;
    if (st && st.batt && st.made >= 8 && !st.busy) break;
  }
  await sleep(400);
  await send('Tracing.start', { categories: 'toplevel,devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.frame,cc,gpu,viz', transferMode: 'ReportEvents' });
  await sleep(250);
  await send('Runtime.evaluate', { expression: "console.timeStamp('SPSTART');MQ.ui.battle.demoSpecial('" + sp + "')" });
  await sleep(WIN);
  const cnt = await send('Runtime.evaluate', { returnByValue: true, expression:
    "(function(){var s=document.getElementById('stage');return {face:s.querySelectorAll('.v3 .f').length," +
    "ciFace:s.querySelectorAll('.ci .v3 .f').length,ciSnap:s.querySelectorAll('.ci .cisnap').length," +
    "fxs:s.querySelectorAll('.fxscreen *').length,dom:s.querySelectorAll('*').length};})()" });
  await new Promise(function (r) { done = r; send('Tracing.end'); });
  ws.close(); ch.kill();

  const tn = {};
  ev.forEach(function (e) { if (e.name === 'thread_name') tn[e.pid + '/' + e.tid] = e.args.name; });
  const mark = ev.find(function (e) { return e.name === 'TimeStamp' && e.args && e.args.data && e.args.data.message === 'SPSTART'; });
  if (!mark) return null;
  const a = mark.ts, b = a + WIN * 1000;
  const isMain = function (e) { return tn[e.pid + '/' + e.tid] === 'CrRendererMain'; };
  const sum = function (name) { return ev.filter(function (k) { return k.ph === 'X' && k.name === name && isMain(k) && k.ts >= a && k.ts < b; }).reduce(function (s, k) { return s + (k.dur || 0); }, 0) / 1000; };
  const fr = ev.filter(function (e) { return e.name === 'Display::DrawAndSwap' && e.ph === 'X' && e.ts >= a && e.ts <= b; }).map(function (e) { return e.ts + (e.dur || 0); }).sort(function (x, y) { return x - y; });
  let worst = 0, jank = 0;
  for (let i = 1; i < fr.length; i++) { const g = (fr[i] - fr[i - 1]) / 1000; if (g > worst) worst = g; if (g > 34) jank++; }
  const ras = ev.filter(function (k) { return k.ph === 'X' && k.name === 'RasterDecoderImpl::DoEndRasterCHROMIUM' && k.ts >= a && k.ts < b; }).reduce(function (x, k) { return x + k.dur; }, 0) / 1000;
  const c = cnt.result.value;
  return { frames: fr.length, worst: worst, jank: jank, paint: sum('Paint'), layout: sum('Layout'), style: sum('UpdateLayoutTree'), ras: ras,
    face: c.face, ciFace: c.ciFace, ciSnap: c.ciSnap, fxs: c.fxs, dom: c.dom, made: st ? st.made : -1 };
}

(async function () {
  console.log(MODE + (COLD ? '（絵が できる 前＝さめた じょうたい）' : '（絵が できた あと＝本物に ちかい）') + '  CPU×' + CPU + '・' + WIN + 'ms・' + REPS + '回の 中央' + (EXTRA ? '  ' + EXTRA : ''));
  console.log('わざ'.padEnd(11) + 'コマ'.padStart(5) + ' 止まった'.padStart(9) + ' カク'.padStart(5) + ' | Paint'.padStart(8) + ' Layout'.padStart(8) + ' Style'.padStart(7) + ' ラスター'.padStart(9) + ' | 面'.padStart(6) + ' ci'.padStart(9) + ' fxscreen'.padStart(10));
  for (const sp of SPS) {
    const runs = [];
    for (let i = 0; i < REPS; i++) { const r = await once(sp); if (r) runs.push(r); }
    if (!runs.length) { console.log(sp + ' … とれない'); continue; }
    const g = function (k) { return med(runs.map(function (r) { return r[k]; })); };
    const last = runs[runs.length - 1];
    console.log(sp.padEnd(11) + String(g('frames')).padStart(5) + (g('worst').toFixed(0) + 'ms').padStart(9) + String(g('jank')).padStart(5) +
      ' | ' + g('paint').toFixed(0).padStart(6) + g('layout').toFixed(0).padStart(8) + g('style').toFixed(0).padStart(7) + g('ras').toFixed(0).padStart(9) +
      ' | ' + String(g('face')).padStart(4) + (last.ciSnap ? '  絵1まい' : '  3D' + last.ciFace).padStart(9) + String(g('fxs')).padStart(10));
  }
})();
