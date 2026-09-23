const fs = require('fs'), vm = require('vm');
const dir = 'c:/Users/win11/OneDrive/デスクトップ/こどもアプリ作業場/manabi-quest/';
const src = fs.readFileSync(dir + 'tools/smoke.js', 'utf8');
global.require = require; process.argv[2] = dir;
vm.runInNewContext(src.slice(0, src.indexOf('const MQ = global.MQ;')), global);
const MQ = global.MQ;
const qs = (MQ.shakai6 && MQ.shakai6.questions) || [];
const hist = qs.filter(function (q) { return /鎌倉|平安|江戸|明治|飛鳥|奈良|室町|戦国|大昔|戦争|世界と日本/.test(q.unit || ''); });
console.log('歴史の 問題 ' + hist.length + '問 / 社会6 ぜんぶ ' + qs.length + '問');
// 問い方の 型を 数える
const kind = {};
hist.forEach(function (q) {
  const t = String(q.text || '').replace(/<[^>]*>/g, '');
  let k = 'その他';
  if (/だれ|人物|は 何と/.test(t)) k = 'だれ（人物）';
  else if (/いつ|何年|時代/.test(t)) k = 'いつ（時代）';
  else if (/どこ/.test(t)) k = 'どこ（場所）';
  else if (/何と いう|何を|何が|とは/.test(t)) k = 'ことば・名前';
  else if (/なぜ|ため/.test(t)) k = 'なぜ（りゆう）';
  kind[k] = (kind[k] || 0) + 1;
});
Object.keys(kind).sort(function (a, b) { return kind[b] - kind[a]; }).forEach(function (k) {
  console.log('  ' + k + ' ' + kind[k] + '問');
});
console.log('--- 見本 12問 ---');
hist.slice(0, 12).forEach(function (q) {
  console.log('[' + q.unit + '] ' + String(q.text || '').replace(/<[^>]*>/g, ''));
});
