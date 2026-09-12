// node runsfx.js <src> <names> <out.wav>
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const [src, names, out] = process.argv.slice(2);
const dir = __dirname.replace(/\\/g, '/');
const url = 'file:///' + dir + '/sfx.html?src=' + src + '&names=' + names;
const expr = path.join(__dirname, 'expr.js');
fs.writeFileSync(expr, "document.getElementById('out').textContent");
const cdp = 'c:/Users/win11/OneDrive/デスクトップ/こどもアプリ作業場/manabi-quest/tools/mapcheck/cdp2.js';
const txt = execFileSync('node', [cdp, url, '5', 'nogpu', expr], { maxBuffer: 100 * 1024 * 1024 }).toString();
const m = /STATS ([^\n]*)\nWAV ([A-Za-z0-9+/=]+)\nEND/.exec(txt);
if (!m) { console.log('FAILED', txt.slice(0, 800)); process.exit(1); }
fs.writeFileSync(out, Buffer.from(m[2], 'base64'));
console.log(path.basename(out), m[1]);
