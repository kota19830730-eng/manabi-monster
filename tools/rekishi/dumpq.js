const fs = require('fs'), vm = require('vm');
const dir = 'c:/Users/win11/OneDrive/デスクトップ/こどもアプリ作業場/manabi-quest/';
const want = process.argv.slice(2);
const src = fs.readFileSync(dir + 'tools/smoke.js', 'utf8');
global.require = require; process.argv[2] = dir;
vm.runInNewContext(src.slice(0, src.indexOf('const MQ = global.MQ;')), global);
const MQ = global.MQ;
[['rika4', MQ.rika4], ['rika5', MQ.rika5], ['rika6', MQ.rika6]].forEach(function (pair) {
  const qs = (pair[1] && pair[1].questions) || [];
  qs.forEach(function (q, i) {
    const u = String(q.unit || '');
    if (!want.some(function (w) { return u.indexOf(w) >= 0; })) return;
    const t = String(q.text || '').replace(/<[^>]*>/g, '');
    const a = q.type === 'choice' ? (q.choices || [])[q.answer === undefined ? 0 : q.answer] : q.answer;
    console.log(pair[0] + '#' + i + ' [' + u + '] lv' + (q.lv || '') + ' ' + t + '  →  ' + a);
  });
});
