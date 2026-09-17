/* ボスの 絵と 表を ゲームに 書きこむ（手で monsterart.js／enemies.js の しるしの あいだを さわらない）。
   使い方： node tools/bossart/emit.js [manabi-quest の パス]
     ① js/content/monsterart.js の <boss64> ～ </boss64> ＝ 64マスの エリアボス 15体の 絵
        （final.js＝竜王・青鬼の 大将／final2.js＝序盤・中盤の 10体と 作り直しの 3体）
     ② js/content/enemies.js の <areabosses> ～ </areabosses> ＝ エリアボス 15体の 表（tier・base・色）
   1回め：むかしの 48マスの メカナイト・グランドタイタン・キングスライム（monsterart.js）と
          手書きの 5体の 行（enemies.js）を しるしつきの ブロックに 置きかえる。2回め いこう：しるしの あいだだけ（何回 流しても 同じ） */
const fs = require('fs');
const path = require('path');
delete require.cache[require.resolve('./final.js')];
delete require.cache[require.resolve('./final2.js')];
const F = require('./final.js');
const F2 = require('./final2.js');
const root = process.argv[2] || path.join(__dirname, '..', '..');

function nlOf(s) { return s.indexOf('\r\n') >= 0 ? '\r\n' : '\n'; }
function replaceBlock(s, A, Z, body, fallback) {
  if (s.indexOf(A) >= 0) {
    const a = s.indexOf(A), z = s.indexOf(Z, a) + Z.length;
    if (z < Z.length) throw new Error('しるしの おわりが ない: ' + Z);
    return s.slice(0, a) + body + s.slice(z);
  }
  return fallback(s);
}

/* ---------- ① monsterart.js ---------- */
(function () {
  const file = path.join(root, 'js', 'content', 'monsterart.js');
  let s = fs.readFileSync(file, 'utf8');
  const nl = nlOf(s);
  const rows = function (list) {
    const out = [];
    for (let i = 0; i < list.length; i += 4) {
      out.push('      ' + list.slice(i, i + 4).map(function (r) {
        return '[' + r[0] + ', ' + r[1] + ', ' + r[2] + ', ' + r[3] + ", '" + r[4] + "', '" + (r[5] || '') + "', '" + r[6] + "']";
      }).join(', ') + (i + 4 < list.length ? ',' : ''));
    }
    return out.join(nl);
  };
  const shapes = [['dragon', F.dragon, 'ナンバードラゴン（算数・終盤）'], ['oni', F.oni, 'モジオニ（国語・終盤）']];
  Object.keys(F2.SHAPES).forEach(function (k) {
    const b = F2.BOSSES.filter(function (x) { return x.shape === k; })[0];
    const name = F2.REMAKE[k] || k;
    const label = b ? b.name + '（' + ['', '序盤', '中盤', '終盤'][b.tier] + '）' : ({ mech: 'メカナイト（理科・終盤）', kingslime: 'キングスライム（英語・終盤）', titan: 'グランドタイタン（社会・終盤）' })[k];
    shapes.push([name, F2.SHAPES[k], label]);
  });
  const lines = [
    '    /* <boss64> ここから tools/bossart/emit.js が 書く（手で さわらない・正本は tools/bossart/final.js と final2.js）',
    '       64マス（enemies.js の base: 64）の エリアボス 15体。7つめは 3D の 部品の 名前（js/content/boss3d.js）。',
    '       エリアごとに 序盤・中盤・終盤の 3体（v14.7）。 */'
  ];
  shapes.forEach(function (x) { lines.push('    // ' + x[2]); lines.push('    ' + x[0] + ': [', rows(x[1]), '    ],'); });
  lines.push('    /* </boss64> */');
  const body = lines.join(nl);
  s = replaceBlock(s, '    /* <boss64>', '/* </boss64> */', body, function () { throw new Error('<boss64> が ない'); });
  // むかしの 48マスの 3体（1回めだけ）
  const a = s.indexOf('    // メカナイト：かぶと');
  if (a >= 0) {
    const z = s.indexOf('    /* ダークロード', a);
    if (z < 0) throw new Error('むかしの 3体の おわりが 見つからない');
    s = s.slice(0, a) + s.slice(z);
  }
  fs.writeFileSync(file, s);
  console.log('monsterart.js: ' + shapes.map(function (x) { return x[0] + '=' + x[1].length; }).join(' '));
})();

/* ---------- ② enemies.js ---------- */
(function () {
  const file = path.join(root, 'js', 'content', 'enemies.js');
  let s = fs.readFileSync(file, 'utf8');
  const nl = nlOf(s);
  const obj = function (o) { return '{ ' + Object.keys(o).map(function (k) { return k + ": '" + o[k] + "'"; }).join(', ') + ' }'; };
  const list = [
    { id: 'boss-dragon', area: 'sansu', name: 'ナンバードラゴン', shape: 'dragon', tier: 3, colors: F.COLORS.dragon, phase2: F.PHASE2.dragon },
    { id: 'boss-oni', area: 'kokugo', name: 'モジオニ', shape: 'oni', tier: 3, colors: F.COLORS.oni, phase2: F.PHASE2.oni },
    { id: 'boss-knight', area: 'rikashakai', name: 'メカナイト', shape: 'knight', tier: 3, colors: F2.COLORS.mech, phase2: F2.PHASE2.mech },
    { id: 'boss-slime', area: 'eigo', name: 'キングスライム', shape: 'kingslime', tier: 3, colors: F2.COLORS.kingslime, phase2: F2.PHASE2.kingslime },
    { id: 'boss-titan', area: 'shakai', name: 'グランドタイタン', shape: 'titan', tier: 3, colors: F2.COLORS.titan, phase2: F2.PHASE2.titan }
  ].concat(F2.BOSSES.map(function (b) { return Object.assign({}, b, { colors: F2.COLORS[b.shape], phase2: F2.PHASE2[b.shape] }); }));
  const lines = [
    '    /* <areabosses> ここから tools/bossart/emit.js が 書く（手で さわらない・正本は tools/bossart/final.js と final2.js）',
    '       エリアの ボスは 序盤（tier 1）・中盤（tier 2）・終盤（tier 3）の 3体（v14.7）。どれが 出るかは bossFor(エリア, むずかしさ)。',
    '       ぜんぶ 64マス（base）。理科は rikashakai を、小4〜の 理科（rika）は べつ名（AREA_ALIAS）で 借りる。 */'
  ];
  list.forEach(function (b) {
    lines.push("    { id: '" + b.id + "', area: '" + b.area + "', name: '" + b.name + "', shape: '" + b.shape + "', base: 64, tier: " + b.tier + ',');
    lines.push('      colors: ' + obj(b.colors) + ',');
    lines.push('      phase2: ' + obj(b.phase2) + ' },');
  });
  lines.push('    /* </areabosses> */');
  const body = lines.join(nl);
  s = replaceBlock(s, '    /* <areabosses>', '/* </areabosses> */', body, function (t) {
    const a = t.indexOf('    /* v14.6：ナンバードラゴン・モジオニは 64マス');
    const z0 = t.indexOf("    { id: 'boss-titan'", a);
    if (a < 0 || z0 < 0) throw new Error('むかしの ボスの 行が 見つからない');
    const z = t.indexOf(nl, z0) + nl.length;
    return t.slice(0, a) + body + nl + t.slice(z);
  });
  fs.writeFileSync(file, s);
  console.log('enemies.js: ' + list.length + ' 体');
})();
