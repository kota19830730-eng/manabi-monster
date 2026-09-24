// dokkaiN.js の 形と かん字を しらべる： node chkdok.js <manabi-quest> <学年>
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const base = process.argv[2];
const g = +process.argv[3];
const ctx = { window: {}, console: console, Math: Math, Set: Set, Array: Array, Object: Object, JSON: JSON };
ctx.window.MQ = {};
ctx.MQ = ctx.window.MQ;
vm.createContext(ctx);
['js/core/util.js', 'js/content/kakusu.js', 'js/content/dokkai.js', 'js/content/dokkai' + g + '.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(base, f), 'utf8'), ctx, { filename: f });
});
const MQ = ctx.MQ;
const D = MQ['dokkai' + g];
let bad = [];
D.stories.forEach(function (st) {
  if (st.scenes.length !== 12) bad.push(st.id + ' scenes ' + st.scenes.length);
  if (st.chest.length < 3) bad.push(st.id + ' chest ' + st.chest.length);
  if (st.boss.length < 6) bad.push(st.id + ' boss ' + st.boss.length);
  st.scenes.concat(st.chest, st.boss).forEach(function (x, i) {
    if (!x.text || !x.note || !x.choices || new Set(x.choices).size !== 4) bad.push(st.id + ' q' + i + ' ' + (x.text || '').slice(0, 20));
    x.choices.forEach(function (c) { if (/[a-zA-Z]{3,}/.test(c)) bad.push(st.id + ' 英字 ' + c); });
  });
});
const over = {};
D.stories.forEach(function (st) {
  const txt = [st.title].concat(st.scenes.concat(st.chest, st.boss).map(function (x) { return [x.t, x.text, x.hint, x.note].concat(x.choices).join(''); })).join('');
  txt.split('').forEach(function (c) { if (/[一-龯]/.test(c) && !MQ.kakusu.upTo(c, g)) { over[c] = (over[c] || 0) + 1; } });
});
// どの 文に あるか
const where = {};
Object.keys(over).forEach(function (c) {
  D.stories.forEach(function (st) {
    st.scenes.concat(st.chest, st.boss).forEach(function (x) {
      const s = [x.t, x.text, x.hint, x.note].concat(x.choices).join('｜');
      if (s.indexOf(c) >= 0 && !where[c]) where[c] = st.id + ': ' + s.slice(Math.max(0, s.indexOf(c) - 8), s.indexOf(c) + 8);
    });
  });
});
console.log('dokkai' + g + ': stories ' + D.stories.length + ' 形NG ' + bad.length + (bad.length ? '\n  ' + bad.join('\n  ') : ''));
console.log((g + '年こえ: ') + JSON.stringify(Object.keys(over)));
Object.keys(where).forEach(function (c) { console.log('  ' + c + ' … ' + where[c]); });
// 1文の 長さ
let maxT = 0, sum = 0, n = 0;
D.stories.forEach(function (st) { st.scenes.forEach(function (s) { maxT = Math.max(maxT, s.t.length); sum += s.t.length; n++; }); });
console.log('場面の 文: へいきん ' + Math.round(sum / n) + '字・さいだい ' + maxT + '字');
