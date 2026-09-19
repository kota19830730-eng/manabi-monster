// iPhone・iPad の 大きさで harness の 画面を 撮る（CDP の 端末エミュレーション）
// node tools/fullcheck/devices.js <出力フォルダ> <端末名,…|all> <モード,…> [root]
//   端末の 大きさは CSS px（Safari の タブ＝上下の バーを のぞいた 高さ／app＝ホーム画面から ひらいた とき）
//   inset＝ホームバー・ノッチの よけ幅（Emulation.setSafeAreaInsetsOverride。古い Chrome だと 効かない）
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const DEVICES = {
  'se-safari':      { w: 375, h: 548, dpr: 2 },                          // iPhone SE（Safari・バーあり）
  'se-app':         { w: 375, h: 647, dpr: 2 },                          // iPhone SE（ホーム画面から・上 20 は 時計）
  'iphone-safari':  { w: 390, h: 664, dpr: 3 },                          // iPhone 13〜15（Safari）
  'iphone-app':     { w: 390, h: 797, dpr: 3, inset: { bottom: 34 } },  // iPhone 13〜15（ホーム画面・上 47 は 時計・下 34 は ホームバー）
  'max-app':        { w: 430, h: 873, dpr: 3, inset: { bottom: 34 } },  // iPhone 15 Pro Max（ホーム画面）
  'ipad-safari':    { w: 820, h: 1106, dpr: 2 },                         // iPad 第10世代（Safari）
  'ipad-app':       { w: 820, h: 1156, dpr: 2, inset: { bottom: 20 } }, // iPad（ホーム画面）
  'ipadmini-app':   { w: 744, h: 1109, dpr: 2, inset: { bottom: 20 } },
  'ipad-land':      { w: 1180, h: 746, dpr: 2 },                         // iPad よこ（Safari）
  'iphone-land':    { w: 844, h: 390, dpr: 3, inset: { left: 47, right: 47, bottom: 21 } }
};

const out = process.argv[2];
const devs = (process.argv[3] || 'all') === 'all' ? Object.keys(DEVICES) : process.argv[3].split(',');
const modes = (process.argv[4] || 'start').split(',');
const root = process.argv[5] || 'C:/Users/win11/OneDrive/デスクトップ/こどもアプリ作業場/manabi-quest';
fs.mkdirSync(out, { recursive: true });

const port = 9300 + Math.floor(Math.random() * 400);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-'));
const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + port, '--user-data-dir=' + tmp, '--hide-scrollbars', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
function getJson(p) {
  return new Promise(function (res, rej) {
    http.get('http://127.0.0.1:' + port + p, function (r) { let d = ''; r.on('data', function (c) { d += c; }); r.on('end', function () { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej);
  });
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

(async function () {
  let list = null;
  for (let i = 0; i < 60 && !list; i++) { await sleep(200); try { list = await getJson('/json'); } catch (e) {} }
  const page = list.find(function (t) { return t.type === 'page'; });
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0; const waits = {};
  const send = function (method, params) { return new Promise(function (res) { const n = ++id; waits[n] = res; ws.send(JSON.stringify({ id: n, method: method, params: params || {} })); }); };
  ws.onmessage = function (ev) { const m = JSON.parse(ev.data); if (m.id && waits[m.id]) { waits[m.id](m.error ? { error: m.error } : m.result); delete waits[m.id]; } };
  await new Promise(function (r) { ws.onopen = r; });
  await send('Page.enable');
  await send('Runtime.enable');
  for (const dn of devs) {
    const d = DEVICES[dn];
    await send('Emulation.setDeviceMetricsOverride', { width: d.w, height: d.h, deviceScaleFactor: d.dpr, mobile: true });
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    const ins = Object.assign({ top: 0, bottom: 0, left: 0, right: 0 }, d.inset || {});
    const r = await send('Emulation.setSafeAreaInsetsOverride', { insets: ins });
    if (r && r.error && dn === devs[0]) console.log('inset の まね は 使えない:', r.error.message);
    for (const m of modes) {
      await send('Page.navigate', { url: 'about:blank' });
      await sleep(200);
      await send('Page.navigate', { url: 'file:///' + root + '/tools/harness.html#' + m });
      await sleep(m.indexOf('fit') === 0 ? 150000 : 6000);
      const info = await send('Runtime.evaluate', { returnByValue: true, expression:
        '(function(){var s=document.getElementById("stage");var r=s.getBoundingClientRect();var L=document.getElementById("log");' +
        'return JSON.stringify({vw:innerWidth,vh:innerHeight,stage:[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)],h:MQ.stage.size().h,scale:+MQ.stage.size().scale.toFixed(3),log:L?L.textContent.split("\\n").filter(function(x){return /fit:|MISSING|NG|ERROR/.test(x)}).slice(0,4):[]});})()' });
      console.log(dn, m, info && info.result ? info.result.value : JSON.stringify(info));
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      if (shot && shot.data) fs.writeFileSync(path.join(out, dn + '_' + m.replace(/[^a-z0-9]/gi, '_') + '.png'), Buffer.from(shot.data, 'base64'));
    }
  }
  ws.close(); ch.kill();
  process.exit(0);
})();
