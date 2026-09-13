// node bench.js jobs.json   … 1つの Chrome で じゅんに 書き出して 重さを はかる
// jobs: [{ name, src, song, sec, lv, enrage, off, nosmp, seed, at, wav, reps }]（src は この フォルダから・wav は float32 で 書く）
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const D = __dirname.replace(/\\/g, '/');
const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const port = 9222 + Math.floor(Math.random() * 500);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bb-'));
const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + port, '--user-data-dir=' + tmp,
   '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required', '--no-first-run', 'about:blank'],
  { stdio: 'ignore' });
function getJson(p) {
  return new Promise(function (res, rej) {
    http.get('http://127.0.0.1:' + port + p, function (r) { let d = ''; r.on('data', function (c) { d += c; }); r.on('end', function () { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej);
  });
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
(async function () {
  let list = null;
  for (let i = 0; i < 50 && !list; i++) { await sleep(200); try { list = await getJson('/json'); } catch (e) {} }
  const page = list.find(function (t) { return t.type === 'page'; });
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0; const waits = {};
  const send = function (method, params) { return new Promise(function (res) { const n = ++id; waits[n] = res; ws.send(JSON.stringify({ id: n, method: method, params: params || {} })); }); };
  ws.onmessage = function (ev) { const m = JSON.parse(ev.data); if (m.id && waits[m.id]) { waits[m.id](m.result); delete waits[m.id]; } };
  await new Promise(function (r) { ws.onopen = r; });
  await send('Page.enable');
  for (const j of jobs) {
    const reps = j.reps || 1;
    const outs = [];
    for (let k = 0; k < reps; k++) {
      const src = /^file:/.test(j.src) ? j.src : 'file:///' + D + '/' + j.src;
      const url = 'file:///' + D + '/bench.html?src=' + encodeURIComponent(src) + '&song=' + j.song + '&sec=' + (j.sec || 12) +
        '&lv=' + (j.lv || 0) + '&enrage=' + (j.enrage ? 1 : 0) + '&off=' + (j.off || '') + '&nosmp=' + (j.nosmp ? 1 : 0) + '&seed=' + (j.seed || 12345) + (j.at ? '&at=' + j.at : '') + '&wav=' + (j.wav && k === 0 ? 1 : 0);
      await send('Page.navigate', { url: url });
      await sleep(300);
      const t0 = Date.now();
      let txt = 'wait';
      while (Date.now() - t0 < 300000) {
        await sleep(300);
        const r = await send('Runtime.evaluate', { expression: "(document.getElementById('out')||{}).textContent", returnByValue: true });
        txt = r && r.result ? r.result.value : 'wait';
        if (txt && txt !== 'wait') break;
      }
      const rd = /\nREADY (\d+)$/.exec(txt || '');
      if (rd) {
        const total = +rd[1];
        let b64 = '';
        for (let a = 0; a < total; a += 1000000) {
          const r = await send('Runtime.evaluate', { expression: 'window.__wav.slice(' + a + ',' + (a + 1000000) + ')', returnByValue: true });
          b64 += r.result.value;
        }
        fs.writeFileSync(path.join(__dirname, j.wav), Buffer.from(b64, 'base64'));
      }
      const st = /STATS (.*)/.exec(txt);
      outs.push(st ? st[1] : txt.slice(0, 300));
    }
    // 重さは reps の 中で いちばん 小さい もの（ほかの 仕事の じゃまを のぞく）
    const rs = outs.map(function (o) { const m = /render=([\d.]+)%/.exec(o); return m ? +m[1] : NaN; });
    const js = outs.map(function (o) { const m = /js=([\d.]+)%/.exec(o); return m ? +m[1] : NaN; });
    console.log((j.name || j.song).padEnd(22), 'min=' + Math.min.apply(null, rs).toFixed(1) + '%', 'all=' + rs.join('/'), 'js=' + Math.min.apply(null, js).toFixed(1) + '%', outs[0].replace(/render=\S+ js=\S+ /, ''));
  }
  ws.close(); ch.kill();
  process.exit(0);
})();
