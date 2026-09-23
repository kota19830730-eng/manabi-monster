/* jin/ の 写真を Chrome の canvas で 小さくして out/ に 書く */
const { execFileSync } = require('child_process');
const fs = require('fs');
const SP = 'C:/Users/win11/AppData/Local/Temp/claude/c--Users-win11-OneDrive-----------------/452111fa-cd32-4fab-8390-61c2dbd86309/scratchpad/';
const IN = SP + 'jin/';
const OUT = SP + 'out/';
fs.mkdirSync(OUT, { recursive: true });

const files = fs.readdirSync(IN).filter(function (f) { return /\.(jpg|jpeg|png|webp)$/i.test(f); });

const MAXW = 260, MAXH = 320, Q = 0.7;
const page = [
  '<body style="margin:0;background:#fff">',
  '<pre id="log" style="white-space:pre-wrap;word-break:break-all;font-size:6px"></pre>',
  '<script>',
  'const FILES = ' + JSON.stringify(files) + ';',
  'const MAXW = ' + MAXW + ', MAXH = ' + MAXH + ', Q = ' + Q + ';',
  'function one(name) {',
  '  return new Promise(function (res) {',
  '    const im = new Image();',
  '    im.onload = function () {',
  '      let w = im.naturalWidth, h = im.naturalHeight;',
  '      const k = Math.min(MAXW / w, MAXH / h, 1);',
  '      w = Math.max(1, Math.round(w * k)); h = Math.max(1, Math.round(h * k));',
  '      const c = document.createElement("canvas"); c.width = w; c.height = h;',
  '      const g = c.getContext("2d");',
  '      g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);',
  '      g.imageSmoothingQuality = "high";',
  '      g.drawImage(im, 0, 0, w, h);',
  '      res({ name: name, w: w, h: h, url: c.toDataURL("image/jpeg", Q) });',
  '    };',
  '    im.onerror = function () { res({ name: name, err: 1 }); };',
  '    im.src = "jin/" + name;',
  '  });',
  '}',
  '(async function () {',
  '  const out = [];',
  '  for (const f of FILES) out.push(await one(f));',
  '  document.getElementById("log").textContent = "###" + JSON.stringify(out) + "###";',
  '})();',
  '<\/script>'
].join('\n');

fs.writeFileSync(SP + 'shrink.html', page);

const tmp = SP + 'shrink_profile';
const dom = execFileSync('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--user-data-dir=' + tmp,
  '--allow-file-access-from-files', '--virtual-time-budget=120000', '--dump-dom',
  'file:///' + SP + 'shrink.html'
], { maxBuffer: 1 << 28 }).toString();

const m = dom.match(/###(\[.*\])###/s);
if (!m) { console.log('だめ：ログが 取れなかった'); process.exit(1); }
const list = JSON.parse(m[1]);
let total = 0, ng = 0;
list.forEach(function (r) {
  if (r.err || !r.url) { console.log('NG ' + r.name); ng++; return; }
  const b = Buffer.from(r.url.split(',')[1], 'base64');
  const id = r.name.replace(/\.[^.]+$/, '');
  fs.writeFileSync(OUT + id + '.jpg', b);
  total += b.length;
  console.log(id.padEnd(12) + ' ' + r.w + 'x' + r.h + ' ' + Math.round(b.length / 1024) + 'KB');
});
console.log('--- ' + (list.length - ng) + 'まい / 合計 ' + Math.round(total / 1024) + 'KB');
