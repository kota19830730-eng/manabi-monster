// v14.3：cidemo.html を 本当の 時計で 動かして、案ごとに わざを 出して カットインを 撮る＋メーターの 数字を 読む
// node cidemo_check.js <出す フォルダ> [わざ=bolt] [撮る ms=650] [CPU の おそさ=1] [よこ=520] [たて=940] [まわす 回数=3]
//   さいしょに 1回 すてる わざを 出して（はじめての わざは 字・音・Canvas の 用意で おそい）、
//   そのあと 案を じゅんばんを かえながら 何回も まわして 中央の 値を 出す（案の じゅんで 数字が かわる ため）
const { spawn } = require('child_process');
const http = require('http'), fs = require('fs'), os = require('os'), path = require('path');
const out = process.argv[2] || '.', sp = process.argv[3] || 'bolt', at = +(process.argv[4] || 650), thr = +(process.argv[5] || 1);
const W = +(process.argv[6] || 520), H = +(process.argv[7] || 940), rounds = +(process.argv[8] || 3);
function getJson(port, p) { return new Promise(function (res, rej) { http.get('http://127.0.0.1:' + port + p, function (r) { let d = ''; r.on('data', function (c) { d += c; }); r.on('end', function () { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej); }); }
const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
(async function () {
  const port = 9300 + Math.floor(Math.random() * 600);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-'));
  const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + tmp,
    '--window-size=' + W + ',' + H, '--hide-scrollbars', '--no-first-run', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
  let list = null;
  for (let i = 0; i < 50 && !list; i++) { await sleep(200); try { list = await getJson(port, '/json'); } catch (e) {} }
  const page = list.find(function (t) { return t.type === 'page'; });
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0; const waits = {};
  const send = function (m, p) { return new Promise(function (res) { const n = ++id; waits[n] = res; ws.send(JSON.stringify({ id: n, method: m, params: p || {} })); }); };
  ws.onmessage = function (e) { const m = JSON.parse(e.data); if (m.id && waits[m.id]) { waits[m.id](m.result); delete waits[m.id]; } };
  await new Promise(function (r) { ws.onopen = r; });
  await send('Page.enable');
  if (thr > 1) await send('Emulation.setCPUThrottlingRate', { rate: thr });
  await send('Page.navigate', { url: 'file:///' + path.resolve(__dirname, 'cidemo.html').split('\\').join('/') });
  const ev = async function (x) { const r = await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }); return r && r.result ? r.result.value : null; };
  for (let i = 0; i < 80; i++) { await sleep(250); if (await ev("!!document.querySelector('.mihon__b--var') && /押して/.test((document.querySelector('.cid__meter')||{}).textContent||'')")) break; }
  await sleep(1500);
  const meter = function () { return ev("document.querySelector('.cid__meter').textContent"); };
  const one = async function (v, shotName) {
    await ev("document.querySelector('.mihon__b--var[data-id=\"" + v + "\"]').click()");
    for (let i = 0; i < 60; i++) { await sleep(250); const dis = await ev("!!document.querySelector('.mihon__b--" + sp + "').disabled"); if (!dis) break; }
    await sleep(700);
    const on = await ev("(document.querySelector('.mihon__b--var.is-on')||{}).dataset.id");
    await ev("document.querySelector('.mihon__b--" + sp + "').click()");
    await sleep(at);
    if (shotName) { const shot = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(out, shotName), Buffer.from(shot.data, 'base64')); }
    const what = await ev("(function(){var c=document.querySelector('.ci');var f=c&&c.querySelector('.ci__hero > *');return (f?f.tagName.toLowerCase()+'.'+String(f.className).split(' ')[0]:'-');})()");
    await sleep(2800);
    const m = await meter();
    const ms = +((/止まった (\d+)ms/.exec(m) || [])[1] || -1), n = +((/カクッ (\d+)回/.exec(m) || [])[1] || -1);
    return { v: v, on: on, ms: ms, n: n, hero: what };
  };
  await one('now', null);   // すてる 1回（はじめての わざ）
  const vs = ['now', 'A', 'B', 'C'];
  const res = {}; vs.forEach(function (v) { res[v] = []; });
  for (let r = 0; r < rounds; r++) {
    const order = vs.slice(r % 4).concat(vs.slice(0, r % 4));
    for (const v of order) {
      const x = await one(v, r === 0 ? 'cid_' + sp + '_' + v + '.png' : null);
      if (x.on !== v) console.log('  ！ 案が 切りかわって いない ' + v + ' → ' + x.on);
      res[v].push(x);
    }
  }
  const med = function (a) { const s = a.slice().sort(function (p, q) { return p - q; }); return s[Math.floor(s.length / 2)]; };
  console.log('CPU ×' + thr + ' ' + sp + '（' + rounds + '回・中央）');
  vs.forEach(function (v) {
    const a = res[v];
    console.log('  ' + v.padEnd(4) + ' いちばん 長く 止まった ' + med(a.map(function (x) { return x.ms; })) + 'ms（' + a.map(function (x) { return x.ms; }).join('/') + '）・カクッ ' + med(a.map(function (x) { return x.n; })) + '回（' + a.map(function (x) { return x.n; }).join('/') + '）・主人公 ' + a[0].hero);
  });
  ws.close(); ch.kill(); process.exit(0);
})();
