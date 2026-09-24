/* Chrome の canvas で 切りぬき＋縮小＋明るさ
   node crop.js <入力> <出力> <x,y,w,h わりあい> <よこの px> [filter]
   れい: node crop.js cand/scroll7.jpg out/a.jpg 0.1,0,0.15,1 900 "brightness(1.15)" */
const { execFileSync } = require('child_process');
const fs = require('fs');
const SP = process.cwd().replace(/\\/g, '/') + '/';   /* 呼んだ ところが 作業フォルダ */

const [inp, outp, boxs, wArg, filt] = process.argv.slice(2);
const box = (boxs || '0,0,1,1').split(',').map(Number);
const W = Number(wArg || 900);

const page = [
  '<body style="margin:0;background:#fff">',
  '<pre id="log" style="white-space:pre-wrap;word-break:break-all;font-size:6px"></pre>',
  '<script>',
  'const BOX = ' + JSON.stringify(box) + ', W = ' + W + ', F = ' + JSON.stringify(filt || '') + ';',
  'const im = new Image();',
  'im.onload = function () {',
  '  const sw = im.naturalWidth, sh = im.naturalHeight;',
  '  const sx = Math.round(sw * BOX[0]), sy = Math.round(sh * BOX[1]);',
  '  const cw = Math.round(sw * BOX[2]), ch = Math.round(sh * BOX[3]);',
  '  const w = W, h = Math.max(1, Math.round(ch * W / cw));',
  '  const c = document.createElement("canvas"); c.width = w; c.height = h;',
  '  const g = c.getContext("2d");',
  '  g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);',
  '  g.imageSmoothingQuality = "high";',
  '  if (F) g.filter = F;',
  '  g.drawImage(im, sx, sy, cw, ch, 0, 0, w, h);',
  '  document.getElementById("log").textContent = "###" + JSON.stringify({ w: w, h: h, src: sw + "x" + sh, url: c.toDataURL("image/jpeg", 0.82) }) + "###";',
  '};',
  'im.onerror = function () { document.getElementById("log").textContent = "###ERR###"; };',
  'im.src = ' + JSON.stringify(inp) + ';',
  '<\/script>'
].join('\n');

fs.writeFileSync(SP + 'crop.html', page);
const dom = execFileSync('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--user-data-dir=' + SP + 'crop_profile',
  '--allow-file-access-from-files', '--virtual-time-budget=120000', '--dump-dom',
  'file:///' + SP + 'crop.html'
], { maxBuffer: 1 << 28 }).toString();
const m = dom.match(/###(\{.*\})###/s);
if (!m) { console.log('だめ'); process.exit(1); }
const r = JSON.parse(m[1]);
fs.mkdirSync(require('path').dirname(SP + outp), { recursive: true });
const b = Buffer.from(r.url.split(',')[1], 'base64');
fs.writeFileSync(SP + outp, b);
console.log(outp + ' ' + r.w + 'x' + r.h + ' ' + Math.round(b.length / 1024) + 'KB（もと ' + r.src + '）');
