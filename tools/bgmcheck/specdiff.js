// node specdiff.js a.wav b.wav … 耳に 近い くらべ方：0.05秒ごと × 高さの 帯（1/3 オクターブ）の 大きさの ちがい（dB）
const fs = require('fs');
const path = require('path');
function rd(f) {
  const b = fs.readFileSync(f);
  const n = (b.length - 44) / 8;
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = b.readFloatLE(44 + i * 8); R[i] = b.readFloatLE(48 + i * 8); }
  return { L, R, n };
}
const SR = 44100, N = 2048, HOP = 2048;
// 実数 FFT（かんたんな 再帰なしの 基数2）
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k], ai = im[i + k];
        const br = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const bi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ar + br; im[i + k] = ai + bi;
        re[i + k + len / 2] = ar - br; im[i + k + len / 2] = ai - bi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}
const edges = [];
for (let f = 50; f < 20000; f *= Math.pow(2, 1 / 3)) edges.push(f);
function bands(x, ch) {
  const out = [];
  const win = new Float32Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
  for (let s = 0; s + N <= x.n; s += HOP) {
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = x[ch][s + i] * win[i];
    fft(re, im);
    const e = new Float64Array(edges.length - 1);
    for (let k = 1; k < N / 2; k++) {
      const f = k * SR / N;
      let b = -1;
      for (let j = 0; j < edges.length - 1; j++) if (f >= edges[j] && f < edges[j + 1]) { b = j; break; }
      if (b >= 0) e[b] += re[k] * re[k] + im[k] * im[k];
    }
    out.push(e);
  }
  return out;
}
const a = rd(process.argv[2]), b = rd(process.argv[3]);
let diffs = [], wsum = 0, wd = 0;
let top = 0;
['L', 'R'].forEach(function (ch) {
  const A = bands(a, ch), B = bands(b, ch);
  A.forEach(function (e) { e.forEach(function (v) { top = Math.max(top, v); }); });
  for (let f = 0; f < Math.min(A.length, B.length); f++) {
    for (let j = 0; j < A[f].length; j++) {
      const va = A[f][j], vb = B[f][j];
      if (Math.max(va, vb) < top * 1e-6) continue;       // 60dB より 小さい ところは 聞こえない ので 数えない
      const dd = Math.abs(10 * Math.log10((va + 1e-20) / (vb + 1e-20)));
      diffs.push(dd); const w = Math.max(va, vb); wsum += w; wd += w * dd;
    }
  }
});
diffs.sort(function (x, y) { return x - y; });
const mean = diffs.reduce(function (s, v) { return s + v; }, 0) / diffs.length;
console.log(path.basename(process.argv[2]).padEnd(20), 'vs', path.basename(process.argv[3]).padEnd(20),
  'へいきん ' + mean.toFixed(2) + 'dB', '90% ' + diffs[Math.floor(diffs.length * 0.9)].toFixed(2) + 'dB', '99% ' + diffs[Math.floor(diffs.length * 0.99)].toFixed(2) + 'dB', '大きい所の重み ' + (wd / wsum).toFixed(2) + 'dB');
