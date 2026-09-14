/* 自分で 見る ための ページ：node preview.js → preview.html → chrome で 撮る */
const fs = require('fs');
const R = require('./render.js');
delete require.cache[require.resolve('./shapes.js')];
const S = require('./shapes.js');
const list = (process.argv[2] || 'dragonA').split(',');
let html = '<!doctype html><meta charset="utf-8"><body style="margin:0;background:#131c36;display:flex;flex-wrap:wrap;gap:24px;padding:16px;font:14px sans-serif;color:#e8ecf7">';
list.forEach(function (id) {
  const pal = S.PALS[id];
  html += '<div><div>' + id + '</div>' + R.art(S[id], pal, 64, 384) + '<div style="display:flex;gap:12px;align-items:flex-end;background:#58ad4d;padding:8px">' + R.art(S[id], pal, 64, 144) + R.art(S[id], pal, 64, 52) + '</div></div>';
});
fs.writeFileSync(__dirname + '/preview.html', html + '</body>');
console.log('ok', list.join(','));
