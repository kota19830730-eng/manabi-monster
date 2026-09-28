// 起動の はやさを はかる（v14.40）
// node tools/mapcheck/startperf.js <url> [回数] [cpu倍率] [net]
//   net＝none（なし）／4g（9Mbps・RTT 170ms）／3g（1.6Mbps・RTT 300ms）
//   1回め＝はじめて ひらく（キャッシュなし）。2回め いこう＝同じ プロフィールで ひらき直す（SW の キャッシュ）
// 出す もの：タイトルが 出るまでの ms・メインで 動いた JS の ms・読んだ バイト数
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const url = process.argv[2];
const runs = +(process.argv[3] || 3), cpu = +(process.argv[4] || 4), net = process.argv[5] || 'none', prof = process.argv[6] === 'prof';
const NET = { '4g': { latency: 170, downloadThroughput: 9e6 / 8, uploadThroughput: 1.5e6 / 8 }, '3g': { latency: 300, downloadThroughput: 1.6e6 / 8, uploadThroughput: 0.75e6 / 8 } };
const port = 9222 + Math.floor(Math.random() * 500);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-'));
const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + tmp, '--window-size=800,1280', '--hide-scrollbars', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const getJson = p => new Promise((res, rej) => { http.get('http://127.0.0.1:' + port + p, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let list = null;
  for (let i = 0; i < 50 && !list; i++) { await sleep(200); try { list = await getJson('/json'); } catch (e) {} }
  const page = list.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0; const waits = {}; let bytes = 0, reqs = 0;
  const send = (m, p) => new Promise(res => { const n = ++id; waits[n] = res; ws.send(JSON.stringify({ id: n, method: m, params: p || {} })); });
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && waits[m.id]) { waits[m.id](m.result); delete waits[m.id]; } if (m.method === 'Network.loadingFinished') { bytes += m.params.encodedDataLength || 0; reqs++; } };
  await new Promise(r => ws.onopen = r);
  await send('Page.enable'); await send('Network.enable'); await send('Performance.enable');
  await send('Emulation.setCPUThrottlingRate', { rate: cpu });
  if (NET[net]) await send('Network.emulateNetworkConditions', Object.assign({ offline: false }, NET[net]));
  for (let r = 0; r < runs; r++) {
    bytes = 0; reqs = 0;
    if (prof) { await send('Profiler.enable'); await send('Profiler.setSamplingInterval', { interval: 200 }); await send('Profiler.start'); }
    const t0 = Date.now();
    await send('Page.navigate', { url: url });
    let ms = -1;
    for (let i = 0; i < 600; i++) {
      await sleep(50);
      const v = await send('Runtime.evaluate', { expression: "!!document.querySelector('#screen-start.is-active .title__actions button')", returnByValue: true });
      if (v && v.result && v.result.value) { ms = Date.now() - t0; break; }
    }
    await sleep(1500);
    const m1 = await send('Performance.getMetrics');
    const get = (m, k) => (m.metrics.find(x => x.name === k) || {}).value || 0;
    const script = Math.round(get(m1, 'ScriptDuration') * 1000);
    const task = Math.round(get(m1, 'TaskDuration') * 1000);
    if (prof) {
      const pr = (await send('Profiler.stop')).profile; const by = {}; const dt = {};
      pr.samples.forEach((sid, i) => { dt[sid] = (dt[sid] || 0) + (pr.timeDeltas[i] || 0); });
      pr.nodes.forEach(n => { const u = (n.callFrame.url || '(' + n.callFrame.functionName + ')').replace(/^.*\/manabi-(quest|monster)\//, ''); by[u] = (by[u] || 0) + (dt[n.id] || 0) / 1000; });
      Object.keys(by).sort((a, b) => by[b] - by[a]).slice(0, 14).forEach(u => console.log('   ' + Math.round(by[u]) + 'ms\t' + u));
    }
    console.log((r === 0 ? 'はじめて' : 'ひらき直し' + r) + '\tタイトル ' + ms + 'ms\tJS ' + script + 'ms\tメインの しごと ' + task + 'ms\t読んだ ' + reqs + 'こ ' + Math.round(bytes / 1024) + 'KB');
  }
  ws.close(); ch.kill(); process.exit(0);
})();
