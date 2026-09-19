/* ラスボス 6体（final3.js・96マス）を 見る ページ：node preview3.js [id,id] → preview3.html（id＝shape の 名前） */
const fs = require('fs');
const R = require('./render.js');
delete require.cache[require.resolve('./final3.js')];
const F = require('./final3.js');
const list = (process.argv[2] || Object.keys(F.SHAPES).join(',')).split(',');
let html = '<!doctype html><meta charset="utf-8"><body style="margin:0;background:#131c36;display:flex;flex-wrap:wrap;gap:18px;padding:12px;font:14px sans-serif;color:#e8ecf7">';
list.forEach(function (id) {
  const pal = F.PALS[F.PAL_OF[id]];
  html += '<div><div>' + F.LABEL[id] + '　' + F.SHAPES[id].length + 'こ</div>' + R.art(F.SHAPES[id], pal, 96, 384) + '<div style="display:flex;gap:12px;align-items:flex-end;background:#3b2a5a;padding:8px">' + R.art(F.SHAPES[id], pal, 96, 144) + R.art(F.SHAPES[id], pal, 96, 60) + '</div></div>';
});
fs.writeFileSync(__dirname + '/preview3.html', html + '</body>');
console.log('ok', list.join(','));
