/* cand/ の 画像を 1まいの コンタクトシートに（名前つき） */
const { execFileSync } = require('child_process');
const fs = require('fs');
const SP = process.cwd().replace(/\\/g, '/') + '/';   /* 呼んだ ところが 作業フォルダ */
const names = process.argv.slice(2);
const COLS = 4, CW = 300, CH = 210;

const page = [
  '<body style="margin:0;background:#fff">',
  '<pre id="log" style="white-space:pre-wrap;word-break:break-all;font-size:6px"></pre>',
  '<script>',
  'const N = ' + JSON.stringify(names) + ', COLS = ' + COLS + ', CW = ' + CW + ', CH = ' + CH + ';',
  'function load(n) { return new Promise(function (r) { const i = new Image(); i.onload = function () { r(i); }; i.onerror = function () { r(null); }; i.src = "cand/" + n + ".jpg"; }); }',
  '(async function () {',
  '  const rows = Math.ceil(N.length / COLS);',
  '  const c = document.createElement("canvas"); c.width = COLS * CW; c.height = rows * (CH + 18);',
  '  const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);',
  '  for (let k = 0; k < N.length; k++) {',
  '    const im = await load(N[k]); const x = (k % COLS) * CW, y = Math.floor(k / COLS) * (CH + 18);',
  '    if (im) { const s = Math.min(CW / im.naturalWidth, CH / im.naturalHeight);',
  '      g.drawImage(im, x + (CW - im.naturalWidth * s) / 2, y + 18, im.naturalWidth * s, im.naturalHeight * s); }',
  '    g.fillStyle = "#000"; g.font = "bold 13px sans-serif"; g.fillText(N[k], x + 4, y + 13);',
  '  }',
  '  document.getElementById("log").textContent = "###" + c.toDataURL("image/jpeg", 0.85) + "###";',
  '})();',
  '<\/script>'
].join('\n');
fs.writeFileSync(SP + 'sheet.html', page);
const dom = execFileSync('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--user-data-dir=' + SP + 'sheet_prof',
  '--allow-file-access-from-files', '--virtual-time-budget=120000', '--dump-dom',
  'file:///' + SP + 'sheet.html'
], { maxBuffer: 1 << 28 }).toString();
const m = dom.match(/###(data:image[^#]*)###/);
if (!m) { console.log('だめ'); process.exit(1); }
fs.writeFileSync(SP + 'sheet.jpg', Buffer.from(m[1].split(',')[1], 'base64'));
console.log('sheet.jpg ' + names.length + 'まい');
