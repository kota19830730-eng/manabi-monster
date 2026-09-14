// 広がる 動き（0.28秒）の あいだに 画面が 何コマ 出たか（v14.3）
// Chrome の trace の「画面に 描いた」しるし（Display::DrawAndSwap）と、ページが 教える 広がる 動きの はじまりの 時間を あわせる。
// node growtrace.js <わざ> <回数> [CPU の おそさ] [ハッシュの のこり（前の 版は @C:/mqtold）]
// 画面の 録画（Page.startScreencast）は 30コマ/秒 ぐらいしか とれず、とれない コマと 本当に 止まった コマが 見わけられない ので こちらで はかる
// 出る もの：はじまるまで（わざを 出して から 動きだすまで）・0.28秒の あいだの コマ数・いちばん 長い コマの あいだ・
//          1コマで いちばん 大きく とんだ ぶん（動く はばの %・コマの 時間で 動きの 進みぐあいを 計算）
//          わざを 出して から さいしょに 画面に 出た コマまで
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sp = process.argv[2] || 'bolt', reps = +(process.argv[3] || 3), thr = +(process.argv[4] || 1), extra = process.argv[5] || '';
const HOOK = "const o=MQ.ui.battle.demoSpecial;MQ.ui.battle.demoSpecial=function(){console.timeStamp('SPSTART');window.__sp0=performance.now();const r=o.apply(this,arguments);" +
  "const ar=document.querySelector('#screen-battle .arena');const poll=function(){const a=document.getAnimations().filter(function(x){return x.effect&&x.effect.target===ar&&!(x instanceof CSSAnimation);})[0];" +
  "if(a&&a.startTime!==null){window.__g0=a.startTime;window.__gms=(a.effect.getComputedTiming().duration)||280;return;}setTimeout(poll,20);};poll();return r;};";
const MARK = '|js=' + encodeURIComponent(HOOK);
function getJson(port, p) { return new Promise(function (res, rej) { http.get('http://127.0.0.1:' + port + p, function (r) { let d = ''; r.on('data', function (c) { d += c; }); r.on('end', function () { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej); }); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
// cubic-bezier(.2,.85,.25,1) の 進みぐあい
function ease(x) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  let lo = 0, hi = 1, t = x;
  for (let i = 0; i < 40; i++) { t = (lo + hi) / 2; const xt = 3 * (1 - t) * (1 - t) * t * 0.2 + 3 * (1 - t) * t * t * 0.25 + t * t * t; if (xt < x) lo = t; else hi = t; }
  return 3 * (1 - t) * (1 - t) * t * 0.85 + 3 * (1 - t) * t * t * 1 + t * t * t;
}
async function once(extra) {
  const port = 9300 + Math.floor(Math.random() * 600);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gt-'));
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
  await send('Tracing.start', { categories: 'devtools.timeline,viz,cc,toplevel,disabled-by-default-devtools.timeline.frame', transferMode: 'ReportEvents' });
  let page0 = 'file:///' + path.resolve(__dirname, '..', 'harness.html').split('\\').join('/');
  if (extra.charAt(0) === '@') { const cut = extra.indexOf('|') < 0 ? extra.length : extra.indexOf('|'); page0 = 'file:///' + extra.slice(1, cut) + '/tools/harness.html'; extra = extra.slice(cut); }
  await send('Page.navigate', { url: page0 + '#perffx:' + sp + MARK + extra });
  await sleep(6000 + thr * 2000);
  await new Promise(function (r) { done = r; send('Tracing.end'); });
  const info = JSON.parse((await send('Runtime.evaluate', { expression: 'JSON.stringify({sp0:window.__sp0||0,g0:window.__g0||0,gms:window.__gms||280})', returnByValue: true })).result.value);
  ws.close(); ch.kill();
  const st = ev.find(function (e) { return e.name === 'TimeStamp' && e.args && e.args.data && e.args.data.message === 'SPSTART'; });
  if (!st || !info.g0) return null;
  // trace の 時間（µs）→ ページの 時間（ms）：SPSTART で あわせる
  const toPage = function (ts) { return info.sp0 + (ts - st.ts) / 1000; };
  const draws = ev.filter(function (e) { return e.name === 'Display::DrawAndSwap' && e.ph === 'X'; }).map(function (e) { return toPage(e.ts + (e.dur || 0)); }).sort(function (a, b) { return a - b; });
  const g0 = info.g0, g1 = g0 + info.gms;
  const firstShown = draws.find(function (t) { return t > info.sp0 + 1; });
  // 動きの あいだ（と その 前後 1コマ）
  const inWin = draws.filter(function (t) { return t >= g0 && t <= g1; });
  const before = draws.filter(function (t) { return t < g0; }).pop();
  const after = draws.find(function (t) { return t > g1; });
  const seq = [before].concat(inWin, [after]).filter(function (t) { return t !== undefined; });
  let maxGap = 0, maxJump = 0;
  for (let i = 1; i < seq.length; i++) {
    maxGap = Math.max(maxGap, seq[i] - seq[i - 1]);
    maxJump = Math.max(maxJump, ease((seq[i] - g0) / info.gms) - ease((seq[i - 1] - g0) / info.gms));
  }
  // メインの コマ（高さの アニメは これの たびに しか 動かない）
  const mains = ev.filter(function (e) { return e.name === 'ProxyMain::BeginMainFrame' && e.ph === 'X'; }).map(function (e) { return toPage(e.ts + (e.dur || 0)); }).filter(function (t) { return t >= g0 && t <= g1; }).length;
  return { mains: mains, wait: g0 - info.sp0, first: firstShown ? firstShown - info.sp0 : -1, frames: inWin.length, maxGap: maxGap, jumpPct: maxJump * 100 };
}
function med(xs) { const s = xs.slice().sort(function (p, q) { return p - q; }); return s[Math.floor(s.length / 2)]; }
(async function () {
  const rs = [];
  for (let i = 0; i < reps; i++) {
    const r = await once(extra);
    if (r) rs.push(r);
    console.log('  #' + (i + 1) + ' ' + JSON.stringify(r, function (k, x) { return typeof x === 'number' ? Math.round(x) : x; }));
  }
  if (!rs.length) { console.log('はかれない'); process.exit(0); }
  const m = function (k) { return med(rs.map(function (r) { return r[k]; })).toFixed(0); };
  console.log(sp + '（CPU ×' + thr + '・' + rs.length + '回の 中央）：わざ → 画面に さいしょに 出る ' + m('first') + 'ms ・ 動きだす ' + m('wait') + 'ms ・ 0.28秒の あいだの 画面の コマ ' + m('frames') + '（メインの コマ ' + m('mains') + '）' + ' ・ いちばん 長い あいだ ' + m('maxGap') + 'ms ・ 1コマで とんだ ' + m('jumpPct') + '%');
  process.exit(0);
})();
