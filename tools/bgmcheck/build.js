// WAV を 22kHz に して 切りつめ（前の 音は モノラル）、template.html に 埋めこむ
const fs = require('fs');
const path = require('path');
const D = __dirname;
function readWav(f) {
  const b = fs.readFileSync(path.join(D, f));
  const sr = b.readUInt32LE(24), n = (b.length - 44) / 4;
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = b.readInt16LE(44 + i * 4) / 32768; R[i] = b.readInt16LE(46 + i * 4) / 32768; }
  return { sr, L, R };
}
function toWav(w, outSr, maxSec, mono) {
  const ratio = w.sr / outSr;
  const ch = mono ? 1 : 2;
  const n = Math.min(Math.floor(w.L.length / ratio), Math.floor(outSr * maxSec));
  const buf = Buffer.alloc(44 + n * 2 * ch);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2 * ch, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(ch, 22);
  buf.writeUInt32LE(outSr, 24); buf.writeUInt32LE(outSr * 2 * ch, 28); buf.writeUInt16LE(2 * ch, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2 * ch, 40);
  const fade = Math.floor(outSr * 0.4);
  const win = Math.max(1, Math.round(ratio));   // かんたんな 平均（折り返しの ざらつきを へらす）
  function at(arr, x) {
    let s = 0, c = 0;
    const i0 = Math.floor(x);
    for (let k = 0; k < win; k++) { const j = Math.min(i0 + k, arr.length - 1); s += arr[j]; c++; }
    return s / c;
  }
  for (let i = 0; i < n; i++) {
    const x = i * ratio;
    let l = at(w.L, x), r = at(w.R, x);
    if (i > n - fade) { const g = (n - i) / fade; l *= g; r *= g; }
    const cl = function (v) { return Math.round(Math.max(-1, Math.min(1, v)) * 32767); };
    if (mono) buf.writeInt16LE(cl((l + r) / 2), 44 + i * 2);
    else { buf.writeInt16LE(cl(l), 44 + i * 4); buf.writeInt16LE(cl(r), 46 + i * 4); }
  }
  return 'data:audio/wav;base64,' + buf.toString('base64');
}
const SR = 22050;
const clips = {
  title_old: ['title_before.wav', 12, true], title_new: ['v14_title.wav', 27, false],
  battle_old: ['battle_old.wav', 10, true], battle_new: ['v14_battle.wav', 13, false],
  boss_old: ['boss_old.wav', 10, true], boss_new: ['v14_boss.wav', 12, false],
  maou_old: ['old_maou.wav', 10, true], maou_new: ['v14_maou.wav', 12, false],
  map_old: ['old_map.wav', 8, true], map_new: ['v14_map.wav', 12, false],
  atk_old: ['atk_old.wav', 5, true], atk_new: ['v14_atk.wav', 5, false],
  dojo_old: ['old_dojo.wav', 5, true], dojo_new: ['v14_dojo.wav', 5, false]
};
let html = fs.readFileSync(path.join(D, 'template.html'), 'utf8');
for (const k of Object.keys(clips)) {
  const c = clips[k];
  const uri = toWav(readWav(c[0]), SR, c[1], c[2]);
  const before = html;
  html = html.split('{{' + k + '}}').join(uri);
  if (html === before) throw new Error('no slot ' + k);
}
if (/\{\{/.test(html)) throw new Error('slot left');
const out = path.join(D, 'bgm-kikikurabe.html');
fs.writeFileSync(out, html);
console.log(out, (html.length / 1024 / 1024).toFixed(2) + ' MB');
