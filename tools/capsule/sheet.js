/* カプセル専用モンスター 18系統を 1まいの HTML に ならべて 見る。
   node tools/capsule/sheet.js  →  tools/capsule/sheet.html

   ぬり方は js/core/blocks.js（v9.1）と 同じ 計算を 写して ある。
   ここで 見た とおりに ゲームでも 出る。 */
const fs = require('fs');
const path = require('path');
const defs = require('./defs.js');

/* ---- blocks.js（v9.1）と 同じ 計算 ---- */
function mix(hex, to, k) {
  if (!hex || hex.charAt(0) !== '#') return hex;
  if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  const n = parseInt(hex.slice(1, 7), 16), m = parseInt(to.slice(1), 16);
  return '#' + [16, 8, 0].map(function (sh) {
    const a = (n >> sh) & 255, b = (m >> sh) & 255;
    return ('0' + Math.round(a + (b - a) * k).toString(16)).slice(-2);
  }).join('');
}
const darker = (h, k) => mix(h, '#000000', k == null ? 0.28 : k);
const lighter = (h, k) => mix(h, '#ffffff', k == null ? 0.3 : k);
function fill(colors) {
  const p = Object.assign({}, colors || {});
  if (!p.A) p.A = '#9aa7b8';
  if (!p.B) p.B = darker(p.A, 0.34);
  if (!p.C) p.C = lighter(p.A, 0.34);
  if (!p.D) p.D = darker(p.B, 0.3);
  if (!p.P) p.P = darker(p.A, 0.55);
  return p;
}
const rightFace = w => (w >= 16 ? 5 : w >= 10 ? 4 : w >= 6 ? 3 : w >= 3 ? 2 : 0);
const bottomFace = h => (h >= 16 ? 4 : h >= 10 ? 3 : h >= 6 ? 2 : h >= 3 ? 1 : 0);
const topFace = h => (h >= 16 ? 3 : h >= 10 ? 2 : h >= 6 ? 1 : 0);

function isEye(p, key) {
  const flags = p[5] || '';
  if (flags.indexOf('d') !== -1 || flags.indexOf('o') !== -1) return false;
  if (p[1] > 30 || p[2] > 9 || p[3] > 11) return false;
  return key === 'w' || key === 'k' || key === 'r' || key === 'y' || key === 'e';
}

const COMMON = { k: '#141018', w: '#FFFFFF', r: '#FF4D4D', y: '#FFD447', e: '#4FD3FF' };

function part(p, palette) {
  const flags = p[5] || '', key = p[4];
  const color = (key && key.charAt(0) === '#') ? key : palette[key];
  if (!color) return { html: '', warn: 'いろが ない: ' + key };
  const [x, y, w, hh] = p;
  const st = ['left:' + x + 'px', 'top:' + y + 'px', 'width:' + w + 'px', 'height:' + hh + 'px'];
  const sh = [];
  const glow = flags.indexOf('g') !== -1;
  if (flags.indexOf('o') !== -1) {
    st.push('background:transparent');
    sh.push('inset 0 0 0 ' + Math.max(3, Math.round(Math.min(w, hh) * 0.24)) + 'px ' + color);
  } else {
    st.push('background-color:' + color);
    if (flags.indexOf('n') === -1) {
      const rs = rightFace(w), bs = bottomFace(hh), ts = topFace(hh);
      if (ts) sh.push('inset 0 ' + ts + 'px 0 ' + lighter(color, 0.22));
      if (rs) sh.push('inset ' + (-rs) + 'px 0 0 ' + darker(color, 0.3));
      if (bs) sh.push('inset 0 ' + (-bs) + 'px 0 rgba(0,0,0,.15)');
      if (w >= 6 && hh >= 6) sh.push('0 0 0 1px ' + darker(color, 0.45));
    }
  }
  if (glow) sh.push('0 0 6px ' + color, '0 0 14px ' + color);
  if (sh.length) st.push('box-shadow:' + sh.join(', '));
  if (flags.indexOf('d') !== -1) st.push('transform:rotate(45deg)');
  const cls = glow ? ' class="g"' : (isEye(p, key) ? ' class="eye"' : '');
  let html = '<i' + cls + ' style="' + st.join(';') + '"></i>';
  if (flags.indexOf('h') !== -1) {
    const hw = Math.min(7, Math.max(3, w - 6)), hh2 = Math.min(5, Math.max(2, hh - 6));
    html += '<i style="left:' + (x + 3) + 'px;top:' + (y + 3) + 'px;width:' + hw + 'px;height:' + hh2
      + 'px;background:rgba(255,255,255,.5)"></i>';
  }
  return { html: html, warn: null };
}

function box(shape, colors, size) {
  const palette = fill(Object.assign({}, COMMON, colors));
  const k = size / 48;
  const warns = [];
  const inner = shape.map(function (p) {
    if (!p) return '';
    if (p[0] < 0 || p[1] < 0 || p[0] + p[2] > 48 || p[1] + p[3] > 48) {
      warns.push('はみ出し [' + p.join(',') + ']');
    }
    const r = part(p, palette);
    if (r.warn) warns.push(r.warn + ' [' + p.join(',') + ']');
    return r.html;
  }).join('');
  return {
    html: '<div class="bxbox" style="width:' + size + 'px;height:' + size + 'px">'
      + '<div class="bx" style="width:48px;height:48px;transform:scale(' + k + ')">' + inner + '</div></div>',
    warns: warns
  };
}

/* ---- 1まいに する ---- */
const RARITY = { n: ['ふつう', '#9fb2dd'], r: ['レア', '#ffd447'], sr: ['げきレア', '#b48cff'] };
let allWarns = 0;

function card(m) {
  const big = box(m.shape, m.colors, 144);
  const small = box(m.shape, m.colors, 52);
  allWarns += big.warns.length;
  const rr = RARITY[m.cap];
  return '<div class="card">'
    + '<div class="row">' + big.html + '<div class="side">' + small.html
    + '<div class="lab">ずかん 52px</div></div></div>'
    + '<div class="nm">' + m.name + '</div>'
    + '<div class="id">' + m.id + ' <b style="color:' + rr[1] + '">' + rr[0] + '</b></div>'
    + (big.warns.length ? '<div class="warn">' + big.warns.join('<br>') + '</div>' : '')
    + '</div>';
}

function group(title, list, color) {
  return '<h2 style="color:' + color + '">' + title + '（' + list.length + '系統）</h2>'
    + '<div class="grid">' + list.map(card).join('') + '</div>';
}

const html = '<!doctype html><html><head><meta charset="utf-8"><title>カプセル専用モンスター</title>'
  + '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mochiy+Pop+One&family=Zen+Maru+Gothic:wght@500;700&display=swap">'
  + '<style>'
  + 'body{margin:0;padding:20px;background:radial-gradient(1200px 700px at 50% -10%,#1d2b4d 0%,#0d1220 70%);'
  + 'color:#e8ecf7;font-family:"Zen Maru Gothic",sans-serif;font-weight:500}'
  + 'h1,h2{font-family:"Mochiy Pop One",sans-serif;margin:18px 0 10px}'
  + 'h1{font-size:22px;color:#ffd447}h2{font-size:17px}'
  + '.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}'
  + '.card{background:linear-gradient(#243255,#1a2442);border-radius:14px;padding:12px;'
  + 'box-shadow:0 6px 0 #0c1330,inset 0 2px 0 rgba(255,255,255,.1)}'
  + '.row{display:flex;align-items:flex-end;gap:12px}'
  + '.side{text-align:center}.lab{font-size:10px;color:#8fa0c4;margin-top:4px}'
  + '.nm{font-family:"Mochiy Pop One",sans-serif;font-size:16px;margin-top:8px}'
  + '.id{font-size:11px;color:#8fa0c4}'
  + '.warn{margin-top:6px;font-size:11px;color:#ff8f8f;background:rgba(255,60,60,.12);'
  + 'border-radius:8px;padding:5px 7px}'
  + '.bxbox{position:relative;flex:none}.bxbox>.bx{position:absolute;left:0;top:0;transform-origin:0 0}'
  + '.bx{position:relative}.bx i{position:absolute;display:block}'
  + '.g{animation:br 2.4s ease-in-out infinite}'
  + '@keyframes br{0%,100%{filter:brightness(1)}50%{filter:brightness(1.35)}}'
  + '</style></head><body>'
  + '<h1>カプセル専用モンスター 18系統（1段階め）</h1>'
  + group('ふつう ・ ちいさな きし', defs.KNIGHT, '#9fb2dd')
  + group('レア ・ ほしの モンスター', defs.STAR, '#ffd447')
  + group('げきレア ・ しんじゅう', defs.DIVINE, '#b48cff')
  + '</body></html>';

const out = path.join(__dirname, 'sheet.html');
fs.writeFileSync(out, html);
console.log('wrote ' + out + '（' + defs.ALL.length + '体・気に なる ところ ' + allWarns + '）');
if (allWarns) process.exitCode = 1;
