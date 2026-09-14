/* final.js の ボスの 絵を js/content/monsterart.js の <boss64> の しるしの あいだに 書きこむ。
   使い方： node tools/bossart/emit.js [monsterart.js の パス]
   1回め：むかしの dragon／oni（48マス）を しるしつきの 64マスに 置きかえる。2回め いこう：しるしの あいだだけ 書きかえる（何回 流しても 同じ） */
const fs = require('fs');
const path = require('path');
delete require.cache[require.resolve('./final.js')];
const F = require('./final.js');
const file = process.argv[2] || path.join(__dirname, '..', '..', 'js', 'content', 'monsterart.js');
let s = fs.readFileSync(file, 'utf8');
const nl = s.indexOf('\r\n') >= 0 ? '\r\n' : '\n';

function rows(list) {
  const out = [];
  for (let i = 0; i < list.length; i += 4) {
    out.push('      ' + list.slice(i, i + 4).map(function (r) {
      return '[' + r[0] + ', ' + r[1] + ', ' + r[2] + ', ' + r[3] + ", '" + r[4] + "', '" + r[5] + "', '" + r[6] + "']";
    }).join(', ') + (i + 4 < list.length ? ',' : ''));
  }
  return out.join(nl);
}
const body = [
  '    /* <boss64> ここから tools/bossart/emit.js が 書く（手で さわらない・正本は tools/bossart/final.js）',
  '       64マス（enemies.js の base: 64）。7つめは 3D の 部品の 名前（js/content/boss3d.js）。',
  '       ナンバードラゴン＝左むきの 首長の 竜王（金の よろい）／モジオニ＝青鬼の 大将（白い たてがみ・赤い よろい・なぎなた） */',
  '    dragon: [', rows(F.dragon), '    ],',
  '    oni: [', rows(F.oni), '    ],',
  '    /* </boss64> */'
].join(nl);

const A = '    /* <boss64>', Z = '/* </boss64> */';
if (s.indexOf(A) >= 0) {
  const a = s.indexOf(A), z = s.indexOf(Z, a) + Z.length;
  s = s.slice(0, a) + body + s.slice(z);
} else {
  const a = s.indexOf('    // ナンバードラゴン：つの＋つばさ＋光る目');
  const z = s.indexOf('    // メカナイト：');
  if (a < 0 || z < 0 || z < a) throw new Error('むかしの dragon／oni が 見つからない');
  s = s.slice(0, a) + body + nl + s.slice(z);
}
fs.writeFileSync(file, s);
console.log('ok dragon=' + F.dragon.length + ' oni=' + F.oni.length);
