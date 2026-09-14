/* ゲームの blocks.js の part() と 同じ ぬり方で、四角の ならびを HTML に する（node 用）。
   ずかん・バトルと 同じ 見え方（上の 面が 明るい・右と 下が 暗い・同じ 色みの ふち・光る ものは グロー）。 */
function mix(hex, to, k) {
  const n = parseInt(hex.slice(1, 7), 16), m = parseInt(to.slice(1), 16);
  const out = [16, 8, 0].map(function (sh) { const a = (n >> sh) & 255, b = (m >> sh) & 255; return Math.round(a + (b - a) * k); });
  return '#' + out.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
}
const darker = (h, k) => mix(h, '#000000', k == null ? 0.28 : k);
const lighter = (h, k) => mix(h, '#ffffff', k == null ? 0.3 : k);
const rightFace = w => w >= 16 ? 5 : w >= 10 ? 4 : w >= 6 ? 3 : w >= 3 ? 2 : 0;
const bottomFace = h => h >= 16 ? 4 : h >= 10 ? 3 : h >= 6 ? 2 : h >= 3 ? 1 : 0;
const topFace = h => h >= 16 ? 3 : h >= 10 ? 2 : h >= 6 ? 1 : 0;
const MAT = {
  metal: 'linear-gradient(116deg, rgba(255,255,255,0) 30%, rgba(255,255,255,.40) 42%, rgba(255,255,255,.12) 50%, rgba(255,255,255,0) 62%)',
  gem: 'radial-gradient(ellipse at 32% 26%, rgba(255,255,255,.55), rgba(255,255,255,0) 62%)',
  bone: 'linear-gradient(152deg, rgba(255,255,255,.24), rgba(255,255,255,0) 55%)',
  body: 'linear-gradient(178deg, rgba(255,255,255,.13), rgba(255,255,255,0) 38%, rgba(0,0,0,.10))'
};

/* shape の 色は パレットの キー。pal[key] = { c: 色, m: 材質 } */
function part(p, pal) {
  const x = p[0], y = p[1], w = p[2], h = p[3], key = p[4], fl = p[5] || '';
  const def = pal[key]; if (!def) throw new Error('色が ない: ' + key);
  const color = def.c;
  const st = ['position:absolute', 'left:' + x + 'px', 'top:' + y + 'px', 'width:' + w + 'px', 'height:' + h + 'px', 'background-color:' + color];
  const sh = [];
  if (fl.indexOf('n') < 0) {
    const rs = rightFace(w), bs = bottomFace(h), ts = topFace(h);
    if (ts) sh.push('inset 0 ' + ts + 'px 0 ' + lighter(color, 0.22));
    if (rs) sh.push('inset ' + (-rs) + 'px 0 0 ' + darker(color, 0.3));
    if (bs) sh.push('inset 0 ' + (-bs) + 'px 0 rgba(0,0,0,.15)');
    if (w >= 6 && h >= 6) sh.push('0 0 0 1px ' + darker(color, 0.45));
    if (w >= 5 && h >= 5 && def.m && MAT[def.m]) st.push('background-image:' + MAT[def.m]);
  }
  if (fl.indexOf('g') >= 0) sh.push('0 0 6px ' + color, '0 0 14px ' + color);
  if (sh.length) st.push('box-shadow:' + sh.join(', '));
  let out = '<div style="' + st.join(';') + '"></div>';
  if (fl.indexOf('h') >= 0) {
    const hw = Math.min(7, Math.max(3, w - 6)), hh = Math.min(5, Math.max(2, h - 6));
    out += '<div style="position:absolute;left:' + (x + 3) + 'px;top:' + (y + 3) + 'px;width:' + hw + 'px;height:' + hh + 'px;background:rgba(255,255,255,.5)"></div>';
  }
  return out;
}

/* 1体を base×base の 箱に 描いて、size px に 拡大した HTML。flip＝左右を 反転 */
function art(shape, pal, base, size, flip) {
  const k = size / base;
  const inner = shape.map(function (p) { return part(p, pal); }).join('');
  return '<div style="position:relative;width:' + size + 'px;height:' + size + 'px;flex:none">' +
    '<div style="position:absolute;left:0;top:0;width:' + base + 'px;height:' + base + 'px;transform-origin:0 0;transform:scale(' + k + ')' + (flip ? ' translateX(' + base + 'px) scaleX(-1)' : '') + '">' + inner + '</div></div>';
}

module.exports = { art: art, part: part, darker: darker, lighter: lighter, mix: mix };
