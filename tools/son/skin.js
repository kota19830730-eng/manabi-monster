// 息子さんの 4体の「そのまま」「かっこよく」の 絵を js/content/sonskin.js に 書きこむ（v14.5）
// 使い方: node tools/son/skin.js <PNG の フォルダ> <接尾>
//   フォルダの <名前><接尾>-pick0.png（そのまま）と -pick1.png（かっこよく）を 使う。
//   名前は skull / shark / abc / zukan（写真ドット絵テスト/きみの絵テスト道具/all.sh の 出力）。
//   <skin-data> と </skin-data> の あいだを 書きかえる ので 何回 流しても 同じ。
const fs = require('fs');
const path = require('path');
const dir = process.argv[2], suf = process.argv[3];
if (!dir || !suf) { console.log('使い方: node tools/son/skin.js <フォルダ> <接尾>'); process.exit(1); }
const MAP = { skull: 'skullhorse', shark: 'sameoni', abc: 'abc', zukan: 'zukan' };
const out = {};
Object.keys(MAP).forEach(function (n) {
  const d = {};
  [['trace', '-pick0.png'], ['cool', '-pick1.png']].forEach(function (k) {
    const f = path.join(dir, n + suf + k[1]);
    if (!fs.existsSync(f)) { console.log('ない:', f); process.exit(1); }
    d[k[0]] = 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
  });
  out[MAP[n]] = d;
});
const F = path.join(__dirname, '../../js/content/sonskin.js');
const s = fs.readFileSync(F, 'utf8');
const a = s.indexOf('/* <skin-data> */'), b = s.indexOf('/* </skin-data> */');
if (a < 0 || b < a) { console.log('しるしが ない'); process.exit(1); }
const body = '/* <skin-data> */\n  const DATA = {\n' + Object.keys(out).map(function (line) {
  return '    ' + line + ': {\n      trace: \'' + out[line].trace + '\',\n      cool: \'' + out[line].cool + '\'\n    }';
}).join(',\n') + '\n  };\n  ';
fs.writeFileSync(F, s.slice(0, a) + body + s.slice(b));
console.log('ok', Object.keys(out).join(','), fs.statSync(F).size + 'B');
