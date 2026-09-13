// node parts.js <bgm.js> <出す.js> … 部品ごとに 切れる 印つきの コピーを 作る（bench の off=pad,reverb などで 使う。どこが 重いかを はかる）
const fs = require('fs');
const [src, out] = process.argv.slice(2);
let s = fs.readFileSync(src, 'utf8');
function one(re, fn) {
  const m = s.match(new RegExp(re.source, 'g'));
  if (!m || m.length !== 1) throw new Error('出現 ' + (m ? m.length : 0) + ' ' + re);
  s = s.replace(re, fn);
}
one(/  let ctx = null;/, function (x) { return '  const OFF = window.__off || {};\n' + x; });
['supersaw', 'pluck', 'pad', 'bass', 'kick', 'snare', 'clap', 'hat', 'crash', 'riser', 'vibrato'].forEach(function (name) {
  one(new RegExp('function ' + name + '[(][^)]*[)] [{]'), function (x) { return x + '\n    if (OFF.' + name + ') return;'; });
});
one(/const verb = makeReverb[(]0[.]8[)];/, function () { return 'const verb = OFF.reverb ? null : makeReverb(0.8);'; });
one(/leadBus[.]connect[(]delay[)];/, function () { return 'if (!OFF.delay) leadBus.connect(delay);'; });
fs.writeFileSync(out, s);
console.log('ok', out);
