/* ---------------------------------------------------------
   絵から モンスターを 組み立てる（v3.6）

   ユーザー「子どもの 絵は 参考にする 程度で、もともと いる モンスター風に」。

   写真を 1マスずつ ドット絵に すると、どうしても もとから いる てきと
   質感が ちがう（線が 細い・色が 多い・形が ばらける）。
   そこで **絵からは 特徴だけ 読みとって、ゲームと 同じ 部品で 組み立てる**。

     ① analyze(cells, N) … 絵から 特徴を 読む
          色（メイン・アクセント）／たてよこ の 形／つの／はね／あし／しっぽ／目の数
     ② make(f)           … 特徴 → 四角の ならび（monsterart.js と 同じ 書きかた）
     ③ png(shape, colors)… blocks.js と 同じ ぬり方で 48×48 の PNG に する

   ②で 作る 形は もとから いる てきと 同じ 作り（48×48・数個の 四角・
   色 3〜5・黒い ふち取り なし・右と 下に 暗い面・左上に ハイライト）なので、
   同じ 画面に ならべても 浮かない。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.monsterGen = (function () {

  /* =======================================================
     ① 絵から 特徴を 読む
     ======================================================= */

  function lum(c) { return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]; }
  function hex(c) {
    return '#' + [0, 1, 2].map(function (i) {
      return ('0' + Math.max(0, Math.min(255, Math.round(c[i]))).toString(16)).slice(-2);
    }).join('');
  }

  /* 色を あざやかに（ゲームの てきは はっきりした 色を つかう） */
  function pop(c) {
    const mx = Math.max(c[0], c[1], c[2]), mn = Math.min(c[0], c[1], c[2]);
    const ch = mx - mn;
    if (ch < 18) {                                  // 灰色っぽい → 明るさだけ ととのえる
      const l = Math.max(70, Math.min(215, lum(c)));
      return [l, l, l * 1.04];
    }
    const mid = (mx + mn) / 2;
    const k = 1.55;
    const out = [0, 1, 2].map(function (i) { return Math.max(0, Math.min(255, mid + (c[i] - mid) * k)); });
    const l = lum(out);
    const t = l < 70 ? 70 / l : l > 205 ? 205 / l : 1;   // 暗すぎ・明るすぎを なおす
    return out.map(function (v) { return Math.max(0, Math.min(255, v * t)); });
  }

  /* cells（{ink,c} か null の ならび）から 特徴を 読む */
  function analyze(cells, N) {
    const occ = new Uint8Array(N * N);
    for (let k = 0; k < N * N; k++) if (cells[k]) occ[k] = 1;

    // はんい
    let x0 = N, y0 = N, x1 = -1, y1 = -1, n = 0;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (!occ[y * N + x]) continue;
        n++;
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    if (n < 20) return null;
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;

    // 色：ぬりの マスを 24きざみで まとめて 多い じゅん
    const bins = {};
    for (let k = 0; k < N * N; k++) {
      const c = cells[k];
      if (!c || c.ink) continue;
      const key = [Math.round(c.c[0] / 30), Math.round(c.c[1] / 30), Math.round(c.c[2] / 30)].join(',');
      if (!bins[key]) bins[key] = { n: 0, s: [0, 0, 0] };
      bins[key].n++;
      bins[key].s[0] += c.c[0]; bins[key].s[1] += c.c[1]; bins[key].s[2] += c.c[2];
    }
    const list = Object.keys(bins).map(function (key) {
      const b = bins[key];
      const c = [b.s[0] / b.n, b.s[1] / b.n, b.s[2] / b.n];
      const ch = Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]);
      const l = lum(c);
      // ひろさ ×（色の あざやかさ）。白い 紙・まっ黒は メインに しない
      const vivid = 0.25 + Math.min(1, ch / 60);
      const okLum = l > 232 ? 0.15 : l < 45 ? 0.35 : 1;
      return { n: b.n, c: c, ch: ch, score: b.n * vivid * okLum };
    }).sort(function (a, b) { return b.score - a.score; });

    function far(a, b) {
      return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) > 90;
    }
    let main = list.length ? list[0].c : [150, 160, 180];
    let accent = null;
    for (let i = 1; i < list.length; i++) {
      if (far(list[i].c, main) && list[i].n > n * 0.03) { accent = list[i].c; break; }
    }

    /* はしの でこぼこを 数える。列ごとに いちばん 上（か 下）の 場所を とり、
       まん中あたり（中央値）より どれだけ 出っぱっているかで 数える。
       出っぱりが つづく あいだは 1つと 数える */
    function bumps(fromTop) {
      const edge = [];
      for (let x = x0; x <= x1; x++) {
        let v = -1;
        if (fromTop) { for (let y = y0; y <= y1; y++) if (occ[y * N + x]) { v = y; break; } }
        else { for (let y = y1; y >= y0; y--) if (occ[y * N + x]) { v = y; break; } }
        edge.push(v);
      }
      const on = edge.filter(function (v) { return v >= 0; }).sort(function (a, b) { return a - b; });
      if (on.length < 6) return 0;
      const mid = on[on.length >> 1];
      const need = Math.max(2, bh * 0.12);
      let cnt = 0, run = 0;
      for (let i = 0; i < edge.length; i++) {
        const v = edge[i];
        const out = v < 0 ? -1 : (fromTop ? mid - v : v - mid);
        if (out >= need) { run++; if (run === 2) cnt++; }        // 2列 いじょう つづいたら 1つ
        else run = 0;
      }
      return cnt;
    }

    // 目：上の ほうに ある 小さな こい かたまり（大きすぎ・小さすぎは 数えない）
    function eyes() {
      const seen = new Int32Array(N * N);
      const sizes = [];
      const yEnd = y0 + Math.round(bh * 0.6);
      const maxSize = Math.max(8, Math.round(n * 0.02));
      for (let y = y0; y <= yEnd; y++) {
        for (let x = x0; x <= x1; x++) {
          const k = y * N + x;
          if (seen[k] || !cells[k] || !cells[k].ink) continue;
          let size = 0;
          const st = [k];
          seen[k] = 1;
          while (st.length) {
            const q = st.pop();
            size++;
            const qx = q % N, qy = (q - qx) / N;
            [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
              const nx = qx + d[0], ny = qy + d[1];
              if (nx < x0 || ny < y0 || nx > x1 || ny > yEnd) return;
              const nk = ny * N + nx;
              if (!seen[nk] && cells[nk] && cells[nk].ink) { seen[nk] = 1; st.push(nk); }
            });
          }
          if (size >= 3 && size <= maxSize) sizes.push(size);
        }
      }
      if (sizes.length >= 3 && sizes.length <= 4) return 3;
      if (sizes.length === 1) return 1;
      return 2;                                                  // 0こ・5こ いじょうは ふつうの 2つ
    }

    const ratio = bw / bh;
    const eyeN = eyes();
    return {
      main: pop(main),
      accent: accent ? pop(accent) : null,
      ratio: ratio,
      wide: ratio >= 1.35,
      tall: ratio <= 0.9,
      horns: Math.min(3, bumps(true)),
      legs: Math.min(4, bumps(false)),
      eyes: eyeN,
      dense: n / (bw * bh),
      area: n,
      // ゆびもん：同じ 絵なら いつも 同じ すがた、ちがう 絵なら ちがう すがたに なる ための 数
      seed: Math.abs(Math.round(main[0] * 7 + main[1] * 13 + main[2] * 17 + n * 3 + ratio * 991 + bw * 5 + bh * 11))
    };
  }

  /* =======================================================
     ② 特徴 → 四角の ならび（monsterart.js と 同じ 書きかた）
        色のキー：A メイン／B かげ／C アクセント／w しろ／k くろ
     ======================================================= */

  // 目（白目＋くろめ）。x は 左はしの 位置
  function eye(x, y, s) {
    const p = Math.max(2, Math.round(s * 0.55));
    return [[x, y, s, s, 'w'], [x + 1, y + 1, p, p, 'k', 'n']];
  }

  /* まる型（スライムの ような 体）：たてよこ が 同じ くらい */
  function roundBody(f) {
    const s = [];
    s.push([8, 11, 32, 28, 'A', 'h']);
    s.push([15, 27, 18, 12, 'B']);
    if (f.eyes === 1) {
      s.push.apply(s, eye(19, 19, 10));
    } else if (f.eyes === 3) {
      s.push.apply(s, eye(12, 20, 7));
      s.push.apply(s, eye(21, 18, 7));
      s.push.apply(s, eye(30, 20, 7));
    } else {
      s.push.apply(s, eye(14, 19, 8));
      s.push.apply(s, eye(27, 19, 8));
    }
    s.push([21, 31, 6, 3, 'k', 'n']);
    s.push([10, 39, 11, 7, 'B']);
    s.push([27, 39, 11, 7, 'B']);
    return s;
  }

  /* たて長（二足で 立つ 体） */
  function standBody(f) {
    const s = [];
    s.push([14, 5, 20, 16, 'A', 'h']);
    if (f.eyes === 1) {
      s.push.apply(s, eye(19, 10, 9));
    } else if (f.eyes === 3) {
      s.push.apply(s, eye(15, 11, 6));
      s.push.apply(s, eye(21, 9, 6));
      s.push.apply(s, eye(27, 11, 6));
    } else {
      s.push.apply(s, eye(17, 10, 7));
      s.push.apply(s, eye(25, 10, 7));
    }
    s.push([20, 17, 8, 3, 'k', 'n']);
    s.push([11, 21, 26, 17, 'A', 'h']);
    s.push([17, 25, 14, 10, 'B']);
    s.push([3, 22, 8, 14, 'B']);
    s.push([37, 22, 8, 14, 'B']);
    s.push([13, 38, 9, 8, 'B']);
    s.push([26, 38, 9, 8, 'B']);
    return s;
  }

  /* よこ長・四足（けもの） */
  function beastBody(f) {
    const s = [];
    s.push([12, 15, 28, 17, 'A', 'h']);
    s.push([2, 9, 16, 15, 'A', 'h']);
    if (f.eyes === 3) {
      s.push.apply(s, eye(4, 13, 5));
      s.push.apply(s, eye(10, 12, 5));
      s.push.apply(s, eye(4, 19, 5));
    } else if (f.eyes === 1) {
      s.push.apply(s, eye(6, 13, 8));
    } else {
      s.push.apply(s, eye(4, 13, 6));
      s.push.apply(s, eye(11, 13, 6));
    }
    s.push([2, 21, 9, 3, 'k', 'n']);
    s.push([16, 25, 21, 8, 'B']);
    s.push([40, 16, 6, 6, 'C']);
    s.push([43, 11, 5, 6, 'C']);
    const legN = f.legs >= 3 ? 4 : 2;
    if (legN === 4) {
      s.push([13, 32, 7, 12, 'B']);
      s.push([21, 32, 7, 12, 'B']);
      s.push([31, 32, 7, 12, 'B']);
      s.push([38, 32, 7, 10, 'B']);
    } else {
      s.push([15, 32, 9, 13, 'B']);
      s.push([30, 32, 9, 13, 'B']);
    }
    return s;
  }

  /* よこ長・ひれ（さかな） */
  function fishBody(f) {
    const s = [];
    s.push([9, 14, 27, 20, 'A', 'h']);
    s.push([3, 18, 8, 13, 'A']);
    s.push([15, 26, 18, 8, 'B']);
    s.push([36, 11, 8, 12, 'C']);
    s.push([40, 20, 7, 12, 'C']);
    s.push([17, 7, 11, 8, 'C']);
    if (f.eyes === 3) {
      s.push.apply(s, eye(5, 20, 5));
      s.push.apply(s, eye(12, 18, 5));
      s.push.apply(s, eye(12, 25, 5));
    } else if (f.eyes === 1) {
      s.push.apply(s, eye(7, 19, 8));
    } else {
      s.push.apply(s, eye(5, 19, 6));
      s.push.apply(s, eye(13, 19, 6));
    }
    s.push([3, 29, 9, 3, 'k', 'n']);
    // ギザギザの 歯
    s.push([4, 27, 2, 3, 'w', 'n']);
    s.push([8, 27, 2, 3, 'w', 'n']);
    return s;
  }

  /* つの・はね などの おまけ */
  /* つの・とげ。かならず 体に くっつける（うくと おかしい） */
  function extras(f, kind) {
    const s = [];
    if (f.horns < 2) return s;
    if (kind === 'round') {                 // 体の 上は y=11
      s.push([13, 4, 5, 9, 'C']);
      s.push([30, 4, 5, 9, 'C']);
      if (f.horns >= 3) s.push([21, 3, 5, 9, 'C']);
    } else if (kind === 'stand') {           // 頭の 上は y=5
      s.push([15, 0, 5, 7, 'C']);
      s.push([28, 0, 5, 7, 'C']);
      if (f.horns >= 3) s.push([21, 0, 5, 6, 'C']);
    } else if (kind === 'beast') {           // 頭は [2,9,16,15]
      s.push([4, 3, 5, 8, 'C']);
      s.push([12, 2, 5, 9, 'C']);
    } else {                                 // さかな：せなかの とげ（体の 上は y=14）
      s.push([12, 10, 4, 6, 'C']);
      s.push([29, 10, 4, 6, 'C']);
    }
    return s;
  }

  /* 特徴 → { shape, colors, kind } */
  function make(f) {
    if (!f) return null;
    // たてよこ に 合う かたちの 中から、絵の ゆびもんで 1つ えらぶ（同じ 絵なら いつも 同じ）
    const cand = f.legs >= 3 ? ['beast'] : f.wide ? ['beast', 'fish'] : f.tall ? ['stand'] : ['round', 'stand'];
    const kind = cand[(f.seed || 0) % cand.length];
    const body = kind === 'beast' ? beastBody(f) : kind === 'fish' ? fishBody(f) : kind === 'stand' ? standBody(f) : roundBody(f);
    const shape = extras(f, kind).concat(body);
    const colors = { A: hex(f.main) };
    if (f.accent) colors.C = hex(f.accent);
    return { shape: shape, colors: colors, kind: kind };
  }

  /* =======================================================
     ③ 四角の ならび → PNG（blocks.js と 同じ ぬり方）
     ======================================================= */

  function mix(c, to, k) { return [0, 1, 2].map(function (i) { return c[i] + (to[i] - c[i]) * k; }); }
  function parse(h) {
    if (!h || h.charAt(0) !== '#') return [154, 167, 184];
    if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
    const n = parseInt(h.slice(1, 7), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rightFace(w) { return w >= 16 ? 5 : w >= 10 ? 4 : w >= 6 ? 3 : w >= 3 ? 2 : 0; }
  function bottomFace(h) { return h >= 16 ? 4 : h >= 10 ? 3 : h >= 6 ? 2 : h >= 3 ? 1 : 0; }

  /* blocks.js の fill() と 同じ：A から B・C・D・P を 作る */
  function palette(colors) {
    const p = {};
    Object.keys(colors || {}).forEach(function (k) { p[k] = parse(colors[k]); });
    if (!p.A) p.A = [154, 167, 184];
    if (!p.B) p.B = mix(p.A, [0, 0, 0], 0.34);
    if (!p.C) p.C = mix(p.A, [255, 255, 255], 0.34);
    if (!p.D) p.D = mix(p.B, [0, 0, 0], 0.3);
    if (!p.P) p.P = mix(p.A, [0, 0, 0], 0.55);
    p.w = [246, 246, 249];
    p.k = [28, 26, 38];
    p.r = [226, 62, 62];
    p.y = [247, 200, 60];
    p.e = [110, 226, 244];
    return p;
  }

  function png(shape, colors, side) {
    const N = side || 48;
    const cv = document.createElement('canvas');
    cv.width = N; cv.height = N;
    const g = cv.getContext('2d');
    const pal = palette(colors);
    function rgba(c, a) { return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a == null ? 1 : a) + ')'; }
    (shape || []).forEach(function (p) {
      if (!p) return;
      const key = p[4];
      const col = key && key.charAt(0) === '#' ? parse(key) : pal[key];
      if (!col) return;
      const x = p[0], y = p[1], w = p[2], h = p[3], flags = p[5] || '';
      g.fillStyle = rgba(col);
      g.fillRect(x, y, w, h);
      if (flags.indexOf('n') === -1) {
        const rs = rightFace(w), bs = bottomFace(h);
        if (rs) { g.fillStyle = rgba(mix(col, [0, 0, 0], 0.3)); g.fillRect(x + w - rs, y, rs, h); }
        if (bs) { g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(x, y + h - bs, w, bs); }
      }
      if (flags.indexOf('h') !== -1) {
        const hw = Math.min(7, Math.max(3, w - 6));
        const hh = Math.min(5, Math.max(2, h - 6));
        g.fillStyle = 'rgba(255,255,255,.5)';
        g.fillRect(x + 3, y + 3, hw, hh);
      }
    });
    return cv.toDataURL('image/png');
  }

  /* 絵（cells）から いっきに PNG まで */
  function fromCells(cells, N) {
    const f = analyze(cells, N);
    const m = make(f);
    if (!m) return null;
    return { png: png(m.shape, m.colors), shape: m.shape, colors: m.colors, kind: m.kind, features: f };
  }

  return {
    analyze: analyze,
    make: make,
    png: png,
    fromCells: fromCells,
    // テスト用
    pop: pop
  };
})();
