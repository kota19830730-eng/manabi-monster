// 画面が 広がる わざの はじめ（0.9秒）を くらべる（v14.3）
// node growcut.js <わざ> <回数> <CPU の おそさ> 名前=<ハッシュの のこり> 名前=…
//   例：node growcut.js bolt 3 4 base= notrans="|css=.arena.is-big{transition:none!important}"
//   前の 版と くらべる：old=@C:/mqtold（git -c core.autocrlf=false archive HEAD を 出した フォルダ。後ろに |css=… も つなげられる）
// 名前ごとに 交互に はかり、中央の 値を 出す（この PC は ぶれる ので 交互に・何回も）
// 出る もの：いちばん 長く 止まった コマの あいだ・16.7ms を こえた コマの あいだの 数（カクつき）・
//          メインの Paint／Layerize＋Commit／Layout の 合計・ラスター（全スレッド）の 合計・コマ数
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sp = process.argv[2] || 'bolt', reps = +(process.argv[3] || 3), thr = +(process.argv[4] || 1);
const vars = process.argv.slice(5).map(function (s) { const i = s.indexOf('='); return { name: s.slice(0, i), extra: s.slice(i + 1) }; });
if (!vars.length) vars.push({ name: 'base', extra: '' });
const WIN = +(process.env.WIN || 900) * 1000;
const MARK = "|js=" + encodeURIComponent("const o=MQ.ui.battle.demoSpecial;MQ.ui.battle.demoSpecial=function(){console.timeStamp('SPSTART');const r=o.apply(this,arguments);console.timeStamp('SPEND');return r;};");
function getJson(port, p) { return new Promise(function (res, rej) { http.get('http://127.0.0.1:' + port + p, function (r) { let d = ''; r.on('data', function (c) { d += c; }); r.on('end', function () { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej); }); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
async function once(extra) {
  const port = 9300 + Math.floor(Math.random() * 600);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gc-'));
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
  await send('Tracing.start', { categories: 'toplevel,devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.frame,cc,gpu,viz', transferMode: 'ReportEvents' });
  // extra が「@<フォルダ>」で はじまる ときは その フォルダの harness（前の 版と くらべる）
  let page0 = 'file:///' + path.resolve(__dirname, '..', 'harness.html').split('\\').join('/');
  if (extra.charAt(0) === '@') { const cut = extra.indexOf('|') < 0 ? extra.length : extra.indexOf('|'); page0 = 'file:///' + extra.slice(1, cut) + '/tools/harness.html'; extra = extra.slice(cut); }
  await send('Page.navigate', { url: page0 + '#perffx:' + sp + MARK + extra });
  await sleep(6000 + thr * 2500);
  await new Promise(function (r) { done = r; send('Tracing.end'); });
  ws.close(); ch.kill();
  const tn = {};
  ev.forEach(function (e) { if (e.name === 'thread_name') tn[e.pid + '/' + e.tid] = e.args.name; });
  const st = ev.find(function (e) { return e.name === 'TimeStamp' && e.args && e.args.data && e.args.data.message === 'SPSTART'; });
  if (!st) return null;
  const a = st.ts, b = st.ts + WIN;
  const inWin = function (k) { return k.ph === 'X' && k.ts >= a && k.ts < b; };
  const isMain = function (e) { return tn[e.pid + '/' + e.tid] === 'CrRendererMain'; };
  const sum = function (name, main) { return ev.filter(function (k) { return k.name === name && inWin(k) && (!main || isMain(k)); }).reduce(function (s, k) { return s + (k.dur || 0); }, 0) / 1000; };
  // 画面に 描いた しるし（viz の Display::DrawAndSwap の おわり）
  const frames = ev.filter(function (e) { return e.name === 'Display::DrawAndSwap' && e.ph === 'X' && e.ts >= a - 60000 && e.ts <= b; }).map(function (e) { return e.ts + (e.dur || 0); }).sort(function (x, y) { return x - y; });
  let worst = 0, jank = 0, after = 0;
  const gaps = [];
  for (let i = 1; i < frames.length; i++) {
    if (frames[i] <= a) continue;
    const g = (frames[i] - frames[i - 1]) / 1000;
    gaps.push(g);
    if (frames[i - 1] >= a + 250000) after = Math.max(after, g);   // わざを 出す JS の あとの いちばん 長い あいだ
    if (g > worst) worst = g;
    if (g > 34) jank++;
  }
  if (process.env.GAP) { let wi=0; for (let i=1;i<frames.length;i++){ if(frames[i]>a && frames[i]-frames[i-1]===worst*1000){wi=i;} } const g0=frames[wi-1], g1=frames[wi]; const agg={}; ev.forEach(function(k){ if(k.ph!=='X'||!k.dur) return; const s0=Math.max(k.ts,g0), s1=Math.min(k.ts+k.dur,g1); if(s1<=s0) return; const key=(tn[k.pid+'/'+k.tid]||k.tid)+' '+k.name; agg[key]=(agg[key]||0)+(s1-s0); }); console.log('   gap +'+((g0-a)/1000).toFixed(0)+'ms '+((g1-g0)/1000).toFixed(0)+'ms: '+Object.keys(agg).sort(function(x,y){return agg[y]-agg[x];}).slice(0,14).map(function(k){return k+'='+(agg[k]/1000).toFixed(1);}).join(' | ')); }
  const cnt=function(name,t0,t1){return ev.filter(function(k){return k.ph==='X'&&isMain(k)&&k.name===name&&k.ts>=a+t0*1000&&k.ts<a+t1*1000;}).length;};
  const en = ev.find(function (e) { return e.name === 'TimeStamp' && e.args && e.args.data && e.args.data.message === 'SPEND'; });
  const ff = frames.find(function (t) { return en && t > en.ts; });
  const first = ff ? (ff - a) / 1000 : -1;   // わざを 出して から さいしょに 画面が 出るまで
  const gpuR = ev.filter(function (k) { return k.ph === 'X' && k.name === 'RasterDecoderImpl::DoEndRasterCHROMIUM' && k.ts >= a && k.ts < a + 500000; }).reduce(function (x, k) { return x + k.dur; }, 0) / 1000;   // GPU で 絵を 描いた 時間
  const GW=(process.env.GW||'350,650').split(',').map(Number);
  const gpuW = ev.filter(function (k) { return k.ph === 'X' && k.name === 'RasterDecoderImpl::DoEndRasterCHROMIUM' && k.ts >= a + GW[0] * 1000 && k.ts < a + GW[1] * 1000; }).reduce(function (x, k) { return x + k.dur; }, 0) / 1000;   // GW＝この あいだの GPU の ラスター（あとから 出る もの 用）
  const pA=cnt('Paint',0,300), pB=cnt('Paint',300,900), lA=cnt('Layout',0,300), lB=cnt('Layout',300,900);
  return {
    first: first, gpuR: gpuR, gpuW: gpuW, pA: pA, pB: pB, lA: lA, lB: lB,
    worst: worst, after: after, jank: jank, frames: gaps.length,
    paint: sum('Paint', true), lc: sum('Layerize', true) + sum('Commit', true), layout: sum('Layout', true), style: sum('UpdateLayoutTree', true),
    raster: sum('RasterTask', false) + sum('RasterizerTaskImpl::RunOnWorkerThread', false)
  };
}
function med(xs) { const s = xs.slice().sort(function (p, q) { return p - q; }); return s[Math.floor(s.length / 2)]; }
(async function () {
  const res = {};
  vars.forEach(function (v) { res[v.name] = []; });
  for (let i = 0; i < reps; i++) {
    for (const v of vars) {
      const r = await once(v.extra);
      if (r) res[v.name].push(r);
      if (r && process.env.EACH) console.log('  ' + v.name + ' #' + (i + 1) + ' ' + JSON.stringify(r, function (k, x) { return typeof x === 'number' ? Math.round(x * 10) / 10 : x; }));
    }
  }
  console.log(sp + '（CPU ×' + thr + '・' + reps + '回の 中央・はじめ ' + (WIN / 1000) + 'ms）');
  vars.forEach(function (v) {
    const rs = res[v.name];
    if (!rs.length) { console.log('  ' + v.name + '：しるしが 見つからない'); return; }
    const m = function (k) { return med(rs.map(function (r) { return r[k]; })).toFixed(0); };
    console.log('  ' + v.name.padEnd(10) + ' 止まった いちばん ' + m('worst') + 'ms（出した あと ' + m('after') + 'ms）・34ms こえ ' + m('jank') + '回／' + m('frames') + 'コマ ・ Paint ' + m('paint') + ' Layerize+Commit ' + m('lc') + ' Layout ' + m('layout') + ' Style ' + m('style') + ' ラスター ' + m('raster') + 'ms ・ さいしょの コマ ' + m('first') + 'ms ・ GPU の ラスター 0.5秒 ' + m('gpuR') + 'ms ・ GW ' + m('gpuW') + 'ms ・ Paint回 0-300ms ' + m('pA') + ' / 300-900ms ' + m('pB') + ' ・ Layout回 ' + m('lA') + ' / ' + m('lB'));
  });
  process.exit(0);
})();
