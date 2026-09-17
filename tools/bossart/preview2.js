/* 新ボス 10体＋作り直し 3体（final2.js）を 見る ページ：node preview2.js id1,id2 → preview2.html */
const fs = require('fs');
const R = require('./render.js');
delete require.cache[require.resolve('./final2.js')];
const F2 = require('./final2.js');
const S = Object.assign({ PALS: F2.PALS }, F2.SHAPES);
const list = (process.argv[2] || Object.keys(S.PALS).join(',')).split(',');
let html = '<!doctype html><meta charset="utf-8"><body style="margin:0;background:#131c36;display:flex;flex-wrap:wrap;gap:24px;padding:16px;font:14px sans-serif;color:#e8ecf7">';
list.forEach(function (id) {
  const pal = S.PALS[id];
  html += '<div><div>' + id + '</div>' + R.art(S[id], pal, 64, 384) + '<div style="display:flex;gap:12px;align-items:flex-end;background:#58ad4d;padding:8px">' + R.art(S[id], pal, 64, 136) + R.art(S[id], pal, 64, 56) + '</div></div>';
});
fs.writeFileSync(__dirname + '/preview2.html', html + '</body>');
console.log('ok', list.join(','));
