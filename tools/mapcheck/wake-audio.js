// v13.11 iPad で 音楽が 流れない の 検査。
// Chrome は file:// や headless だと 音を はじめから 鳴らせて しまう ので、iPad の Safari の きまりを まねする：
//   AudioContext は はじめ suspended・resume() が 効くのは touchend／click／keydown／mouseup の 中だけ（pointerdown・touchstart では 効かない）
// その うえで 画面の 何も ない ところを 1回 クリック（pointerdown → click）して、BGM が 鳴りはじめるか を 見る。
// node tools/mapcheck/wake-audio.js [index.html の file URL]
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const url = process.argv[2] || 'file:///C:/Users/win11/OneDrive/デスクトップ/こどもアプリ作業場/manabi-quest/index.html';
const port = 9222 + Math.floor(Math.random() * 500);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wk-'));
const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + tmp, '--window-size=520,940', 'about:blank'], { stdio: 'ignore' });
function getJson(p) { return new Promise(function (res, rej) { http.get('http://127.0.0.1:' + port + p, function (r) { let d = ''; r.on('data', function (c) { d += c; }); r.on('end', function () { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej); }); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
const IOS = `(function () {
  const AC = window.AudioContext;
  window.__resumeLog = [];
  const OK = { touchend: 1, click: 1, keydown: 1, mouseup: 1 };
  window.AudioContext = window.webkitAudioContext = function () {
    const c = new AC(); let open = false;
    Object.defineProperty(c, 'state', { get: function () { return open ? 'running' : 'suspended'; } });
    c.resume = function () {
      const t = window.event && window.event.type;
      window.__resumeLog.push(t || '-');
      if (OK[t]) { open = true; return Promise.resolve(); }
      return Promise.reject(new Error('iOS: ' + t + ' では ひらけない'));
    };
    return c;
  };
})();`;
(async function () {
  let list = null;
  for (let i = 0; i < 50 && !list; i++) { await sleep(200); try { list = await getJson('/json'); } catch (e) {} }
  const page = list.find(function (t) { return t.type === 'page'; });
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0; const waits = {};
  const send = function (m, p) { return new Promise(function (res) { const n = ++id; waits[n] = res; ws.send(JSON.stringify({ id: n, method: m, params: p || {} })); }); };
  ws.onmessage = function (ev) { const m = JSON.parse(ev.data); if (m.id && waits[m.id]) { waits[m.id](m.result); delete waits[m.id]; } };
  await new Promise(function (r) { ws.onopen = r; });
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: IOS });
  await send('Page.navigate', { url: url });
  await sleep(3000);
  const ev = async function (e) { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true }); return r && r.result ? r.result.value : null; };
  const before = await ev('String(MQ.bgm.current())');
  // 空の ところ（ボタンでは ない）を 1回 タップ
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 30, y: 430, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 30, y: 430, button: 'left', clickCount: 1 });
  await sleep(800);
  const after = await ev('String(MQ.bgm.current())');
  const log = await ev('window.__resumeLog.join(",")');
  console.log(url.replace(/^.*\/(\w+)\/index\.html$/, '$1') + '｜タップ まえ: ' + before + ' → あと: ' + after + '｜resume を 呼んだ イベント: ' + log + (after !== 'null' && before === 'null' ? '｜OK 音楽が 鳴りはじめた' : '｜NG 音楽は 鳴らない'));
  ws.close(); ch.kill(); process.exit(0);
})();
