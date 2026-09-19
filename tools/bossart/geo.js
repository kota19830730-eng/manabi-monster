/* 形を 点で 指定して、2マスの ブロックの ならびに する（マイクラらしい 段々に なる）。
   poly(点の ならび, 色, フラグ) … 多角形を ぬる
   line(a, b, 色, ふとさ, フラグ) … 太い 線（ほね・つの・きば）
   rect(x, y, w, h, 色, フラグ)    … そのまま
   できた 行は 横に つなぎ、同じ はばの 行は たてにも つなぐ（四角の 数を へらす） */
const C = 2;   // ブロックの 大きさ（マス）
let BASE = 64; // 絵の はば（ラスボスは 96マス・final3.js が setBase で かえて もどす）
function setBase(b) { BASE = b || 64; }

function inPoly(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
/* セルの 集まり（Set of "cx,cy"）→ 四角 */
function cellsToRects(cells, key, fl) {
  const rows = {};
  cells.forEach(function (s) { const a = s.split(','); const cx = +a[0], cy = +a[1]; if (cx < 0 || cy < 0 || cx * C >= BASE || cy * C >= BASE) return; (rows[cy] = rows[cy] || []).push(cx); });   // 64マスの 外は すてる
  let runs = [];
  Object.keys(rows).map(Number).sort(function (a, b) { return a - b; }).forEach(function (cy) {
    const xs = rows[cy].sort(function (a, b) { return a - b; });
    let s = xs[0], p = xs[0];
    for (let i = 1; i <= xs.length; i++) {
      if (i < xs.length && xs[i] === p + 1) { p = xs[i]; continue; }
      runs.push({ x: s, y: cy, w: p - s + 1, h: 1 });
      if (i < xs.length) { s = xs[i]; p = xs[i]; }
    }
  });
  // たてに つなぐ（同じ x・同じ はばで すぐ 下の 行）
  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < runs.length && !merged; i++) for (let j = 0; j < runs.length && !merged; j++) {
      const a = runs[i], b = runs[j];
      if (i !== j && a.x === b.x && a.w === b.w && b.y === a.y + a.h) { a.h += b.h; runs.splice(j, 1); merged = true; }
    }
  }
  return runs.map(function (r) { return [r.x * C, r.y * C, r.w * C, r.h * C, key, fl || '']; });
}
function poly(pts, key, fl) {
  const cells = new Set();
  let x0 = 99, y0 = 99, x1 = 0, y1 = 0;
  pts.forEach(function (p) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
  for (let cy = Math.floor(y0 / C); cy * C < y1; cy++) for (let cx = Math.floor(x0 / C); cx * C < x1; cx++) {
    if (inPoly(cx * C + C / 2, cy * C + C / 2, pts)) cells.add(cx + ',' + cy);
  }
  return cellsToRects(cells, key, fl);
}
function line(a, b, key, th, fl) {
  const cells = new Set();
  const n = Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) / C) * 2 + 1;
  const r = (th || 2) / 2;
  for (let i = 0; i <= n; i++) {
    const x = a[0] + (b[0] - a[0]) * i / n, y = a[1] + (b[1] - a[1]) * i / n;
    for (let cy = Math.floor((y - r) / C); cy * C < y + r; cy++) for (let cx = Math.floor((x - r) / C); cx * C < x + r; cx++) {
      const mx = cx * C + C / 2, my = cy * C + C / 2;
      if (Math.abs(mx - x) <= r && Math.abs(my - y) <= r) cells.add(cx + ',' + cy);
    }
  }
  return cellsToRects(cells, key, fl);
}
function rect(x, y, w, h, key, fl) { return [[x, y, w, h, key, fl || '']]; }
/* まとめる：配列の 配列を 1本に */
function join() { return [].concat.apply([], Array.prototype.slice.call(arguments)); }
/* 左右 反転（base の はばで） */
function flipX(shape, base) { return shape.map(function (p) { return [base - p[0] - p[2], p[1], p[2], p[3], p[4], p[5]]; }); }

module.exports = { poly: poly, line: line, rect: rect, join: join, flipX: flipX, setBase: setBase };
