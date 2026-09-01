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

    /* よこの 出っぱり（ひれ・はね・うで）：行ごとの 左はし／右はしが
       まん中より 外に 出て いる ところが あるか */
    function sideOut() {
      const L = [], R = [];
      for (let y = y0; y <= y1; y++) {
        let a = -1, b = -1;
        for (let x = x0; x <= x1; x++) if (occ[y * N + x]) { a = x; break; }
        for (let x = x1; x >= x0; x--) if (occ[y * N + x]) { b = x; break; }
        if (a >= 0) { L.push(a); R.push(b); }
      }
      if (L.length < 6) return 0;
      const ls = L.slice().sort(function (p, q) { return p - q; });
      const rs = R.slice().sort(function (p, q) { return p - q; });
      const lm = ls[ls.length >> 1], rm = rs[rs.length >> 1];
      const need = bw * 0.14;
      let out = 0;
      for (let i = 0; i < L.length; i++) if (lm - L[i] > need || R[i] - rm > need) out++;
      return out / L.length;
    }

    /* ギザギザ（歯・とげ）：はしの でこぼこが 4つ いじょう */
    const jag = bumps(true) + bumps(false);

    /* 白と 黒が どちらも 広い（ガイコツ・本の ページ など） */
    function contrast() {
      let light = 0, dark = 0, fill = 0;
      for (let k = 0; k < N * N; k++) {
        const c = cells[k];
        if (!c) continue;
        fill++;
        const l = lum(c.c);
        if (c.ink || l < 90) dark++;
        else if (l > 205) light++;
      }
      return fill ? { light: light / fill, dark: dark / fill } : { light: 0, dark: 0 };
    }

    const ratio = bw / bh;
    const eyeN = eyes();
    const so = sideOut();
    const ct = contrast();
    const rectness = n / (bw * bh);

    /* いくつに 分かれているか（同じくらいの 大きさの かたまりの 数）。
       ABC3きょうだい の ように 3つ ならぶ 絵を 見わける */
    function parts() {
      const label = new Int32Array(N * N);
      const sizes = [0];
      const D8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
      for (let k0 = 0; k0 < N * N; k0++) {
        if (label[k0] || !occ[k0]) continue;
        const id = sizes.length;
        sizes.push(0);
        const st = [k0];
        label[k0] = id;
        while (st.length) {
          const k = st.pop();
          sizes[id]++;
          const x = k % N, y = (k - x) / N;
          for (let d = 0; d < 8; d++) {
            const nx = x + D8[d][0], ny = y + D8[d][1];
            if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
            const j = ny * N + nx;
            if (occ[j] && !label[j]) { label[j] = id; st.push(j); }
          }
        }
      }
      const big = sizes.slice(1).filter(function (v) { return v > n * 0.12; });
      return big.length;
    }
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
      parts: parts(),
      rectness: rectness,
      sideOut: so >= 0.22,
      wings: so >= 0.34,
      skull: ct.light >= 0.3 && ct.dark >= 0.2 && lum(pop(main)) > 150 && (Math.max(main[0], main[1], main[2]) - Math.min(main[0], main[1], main[2])) < 45,
      teeth: jag >= 4,
      // ゆびもん：同じ 絵なら いつも 同じ すがた、ちがう 絵なら ちがう すがたに なる ための 数
      seed: Math.abs(Math.round(main[0] * 7 + main[1] * 13 + main[2] * 17 + n * 3 + ratio * 991 + bw * 5 + bh * 11))
    };
  }

  /* =======================================================
     ② 特徴 → 四角の ならび（monsterart.js と 同じ 書きかた）

     もとから いる てきは「体・頭・目・手足・しっぽ」の 四角を 数個 かさねて できている。
     ここも 同じ 作りで、**絵から 読んだ 特徴で 部品を えらんで** 組み立てる。

       体（8しゅるい）… まる／けもの／さかな／とり／人がた／むし／はこ／3つご
       頭の 上に かぶせる … ガイコツ頭（白と 黒の はっきりした 絵の とき）
       おまけ … つの／はね／しっぽ／きば／目 1〜3つ

     色のキー：A メイン／B かげ／C アクセント／w しろ／k くろ／y きいろ
     ======================================================= */

  // 目（白目＋くろめ）
  function eye(x, y, s2) {
    const p = Math.max(2, Math.round(s2 * 0.55));
    return [[x, y, s2, s2, 'w'], [x + 1, y + 1, p, p, 'k', 'n']];
  }

  /* 体ごとの 目の 場所 { y, size, xs（2つの とき）, cx（1つの とき） } */
  const EYE_AT = {
    blob:     { y: 19, size: 8, xs: [14, 27], cx: 19 },
    beast:    { y: 13, size: 6, xs: [3, 11], cx: 6 },
    fish:     { y: 19, size: 6, xs: [4, 12], cx: 6 },
    bird:     { y: 8, size: 6, xs: [18, 26], cx: 21 },
    humanoid: { y: 10, size: 7, xs: [17, 25], cx: 19 },
    bug:      { y: 9, size: 6, xs: [19, 27], cx: 21 },
    box:      { y: 20, size: 7, xs: [15, 27], cx: 20 },
    triple:   { y: 21, size: 5, xs: [6, 35], cx: 22 }
  };

  function eyesFor(kind, n) {
    const a = EYE_AT[kind] || EYE_AT.blob;
    const out = [];
    if (n === 1) return eye(a.cx, a.y, a.size + 2);
    if (n >= 3) {
      const mid = Math.round((a.xs[0] + a.xs[1]) / 2);
      out.push.apply(out, eye(a.xs[0], a.y + 2, a.size - 1));
      out.push.apply(out, eye(mid, a.y - 2, a.size - 1));
      out.push.apply(out, eye(a.xs[1], a.y + 2, a.size - 1));
      return out;
    }
    out.push.apply(out, eye(a.xs[0], a.y, a.size));
    out.push.apply(out, eye(a.xs[1], a.y, a.size));
    return out;
  }

  /* ---------- 体 8しゅるい ---------- */
  const BODIES = {
    // まる（スライムの ような）
    blob: function () {
      return [
        [8, 11, 32, 28, 'A', 'h'], [15, 27, 18, 12, 'B'],
        [21, 31, 6, 3, 'k', 'n'],
        [10, 39, 11, 7, 'B'], [27, 39, 11, 7, 'B']
      ];
    },
    // けもの（四本あし・左に 頭）
    beast: function () {
      return [
        [11, 15, 29, 17, 'A', 'h'],
        [1, 8, 17, 16, 'A', 'h'],
        [1, 21, 9, 3, 'k', 'n'],
        [15, 25, 22, 8, 'B'],
        [40, 15, 6, 6, 'C'], [43, 10, 5, 6, 'C'],
        [12, 32, 7, 13, 'B'], [21, 32, 7, 13, 'B'], [30, 32, 7, 13, 'B'], [37, 32, 7, 11, 'B']
      ];
    },
    // さかな（ひれ・しっぽ）
    fish: function () {
      return [
        [9, 13, 27, 21, 'A', 'h'],
        [2, 17, 9, 13, 'A'],
        [15, 26, 18, 8, 'B'],
        [36, 10, 8, 13, 'C'], [40, 19, 8, 13, 'C'],
        [17, 6, 11, 8, 'C'],
        [2, 29, 10, 3, 'k', 'n']
      ];
    },
    // とり（はね・くちばし）
    bird: function () {
      return [
        [14, 13, 20, 21, 'A', 'h'],
        [16, 3, 16, 13, 'A', 'h'],
        [31, 8, 8, 5, 'y'],
        [1, 14, 13, 15, 'C'], [34, 14, 13, 15, 'C'],
        [18, 26, 12, 8, 'B'],
        [17, 34, 6, 11, 'B'], [26, 34, 6, 11, 'B']
      ];
    },
    // 人がた（二足）
    humanoid: function () {
      return [
        [14, 4, 20, 17, 'A', 'h'],
        [20, 17, 8, 3, 'k', 'n'],
        [11, 21, 26, 17, 'A', 'h'],
        [17, 25, 14, 10, 'B'],
        [3, 22, 8, 15, 'B'], [37, 22, 8, 15, 'B'],
        [13, 38, 9, 8, 'B'], [26, 38, 9, 8, 'B']
      ];
    },
    // むし（あし 6本・しょっかく）
    bug: function () {
      return [
        [17, 4, 14, 12, 'A', 'h'],
        [15, 0, 3, 5, 'C'], [30, 0, 3, 5, 'C'],
        [12, 16, 24, 19, 'A', 'h'],
        [17, 22, 14, 9, 'B'],
        [2, 19, 10, 4, 'B'], [36, 19, 10, 4, 'B'],
        [2, 26, 10, 4, 'B'], [36, 26, 10, 4, 'B'],
        [11, 35, 7, 10, 'B'], [30, 35, 7, 10, 'B']
      ];
    },
    // はこ（本・宝箱の ような 四角い もの）
    box: function () {
      return [
        [5, 9, 38, 29, 'A', 'h'],
        [5, 9, 7, 29, 'B'],
        [14, 14, 25, 20, 'C'],
        [17, 30, 19, 4, 'B'],
        [12, 38, 9, 8, 'B'], [27, 38, 9, 8, 'B']
      ];
    },
    // 3つご（3つの 体が ならぶ）
    triple: function () {
      return [
        [1, 15, 14, 21, 'A', 'h'],
        [17, 12, 14, 24, 'C', 'h'],
        [33, 15, 14, 21, 'B', 'h'],
        [3, 36, 10, 8, 'B'], [19, 36, 10, 8, 'A'], [35, 36, 10, 8, 'A']
      ];
    }
  };

  /* ---------- おまけの 部品 ---------- */
  // ガイコツの 頭（白と 黒が はっきりした 絵）。体の 頭の 場所に かぶせる
  const SKULL_AT = {
    beast: [0, 7, 18, 17], fish: [1, 15, 12, 17], blob: [13, 12, 22, 20],
    humanoid: [13, 3, 22, 19], bird: [15, 2, 18, 15], bug: [16, 3, 16, 14],
    box: [13, 13, 22, 20], triple: [16, 11, 16, 18]
  };
  function skullHead(kind) {
    const a = SKULL_AT[kind] || SKULL_AT.blob;
    const x = a[0], y = a[1], w = a[2], h = a[3];
    const ew = Math.max(4, Math.round(w * 0.27));
    const eh = Math.max(5, Math.round(h * 0.34));
    return [
      [x, y, w, h, 'w', 'h'],
      [x + Math.round(w * 0.16), y + Math.round(h * 0.24), ew, eh, 'k', 'n'],
      [x + w - Math.round(w * 0.16) - ew, y + Math.round(h * 0.24), ew, eh, 'k', 'n'],
      [x + Math.round(w * 0.38), y + Math.round(h * 0.7), Math.round(w * 0.24), Math.max(3, Math.round(h * 0.18)), 'k', 'n']
    ];
  }
  // つの
  const HORN_AT = {
    blob: [[13, 3, 5, 10], [30, 3, 5, 10], [21, 2, 5, 10]],
    beast: [[3, 1, 5, 9], [11, 0, 5, 10], [7, 0, 4, 8]],
    fish: [[12, 8, 4, 7], [28, 8, 4, 7], [20, 6, 4, 8]],
    bird: [[17, 0, 4, 5], [27, 0, 4, 5], [22, 0, 4, 5]],
    humanoid: [[14, 0, 5, 6], [29, 0, 5, 6], [21, 0, 5, 5]],
    bug: [[13, 2, 4, 6], [31, 2, 4, 6], [22, 0, 4, 5]],
    box: [[9, 3, 5, 8], [34, 3, 5, 8], [21, 2, 5, 8]],
    triple: [[4, 9, 4, 8], [37, 9, 4, 8], [21, 5, 4, 8]]
  };
  function horns(kind, n) {
    const a = HORN_AT[kind] || HORN_AT.blob;
    const out = [a[0].concat('C'), a[1].concat('C')];
    if (n >= 3) out.push(a[2].concat('C'));
    return out;
  }
  // はね
  const WING_AT = {
    blob: [[0, 10, 10, 16], [38, 10, 10, 16]],
    beast: [[16, 4, 12, 11], [28, 6, 11, 9]],
    fish: [[14, 3, 11, 9], [26, 4, 10, 8]],
    bird: null,
    humanoid: [[0, 12, 11, 16], [37, 12, 11, 16]],
    bug: [[0, 14, 11, 14], [37, 14, 11, 14]],
    box: [[0, 12, 8, 16], [40, 12, 8, 16]],
    triple: [[0, 12, 6, 14], [42, 12, 6, 14]]
  };
  function wings(kind) {
    const a = WING_AT[kind];
    if (!a) return [];
    return [a[0].concat('C', 'h'), a[1].concat('C', 'h')];
  }
  // しっぽ
  const TAIL_AT = {
    blob: [[38, 30, 8, 5], [43, 25, 5, 6]],
    beast: null,
    fish: null,
    bird: [[20, 34, 8, 6], [24, 39, 8, 6]],
    humanoid: [[37, 30, 8, 5], [43, 26, 5, 6]],
    bug: [[38, 30, 8, 5], [43, 26, 5, 6]],
    box: null,
    triple: null
  };
  function tail(kind) {
    const a = TAIL_AT[kind];
    if (!a) return [];
    return [a[0].concat('C'), a[1].concat('C')];
  }
  // きば（口の ところに 白い ギザギザ）
  const TEETH_AT = { blob: [17, 30], beast: [1, 20], fish: [2, 27], bird: [31, 12], humanoid: [18, 17], bug: [19, 14], box: [17, 29], triple: [18, 30] };
  function teeth(kind) {
    const a = TEETH_AT[kind] || TEETH_AT.blob;
    const out = [];
    for (let i = 0; i < 4; i++) out.push([a[0] + i * 3, a[1], 2, 3, 'w', 'n']);
    return out;
  }

  /* しゅるいごとの「合う 度合い」。絵から わかる ことは かぎられる ので、
     いちばん 合う 1つに 決めうちせず、上位 3つを 候補に して 子どもに えらんで もらう */
  function kindScores(f) {
    const sc = {
      blob: 3,
      beast: (f.wide ? 3 : 0) + (f.legs >= 3 ? 3 : f.legs >= 2 ? 1 : 0),
      fish: (f.wide ? 3 : 0) + (f.sideOut ? 2 : 0),
      bird: (f.wings ? 4 : 0) + 1,
      humanoid: (f.tall ? 4 : 0) + (f.legs >= 2 ? 1 : 0) + 1,
      bug: (f.legs >= 4 ? 4 : 0) + (f.horns >= 2 ? 1 : 0),
      box: (f.rectness >= 0.9 ? 5 : f.rectness >= 0.82 ? 2 : 0),     // まる（だ円）でも 0.79 に なる ので、四角は 0.9 いじょう
      triple: (f.parts >= 3 ? 6 : 0)
    };
    // 同じ 点数の ときは 絵の ゆびもんで 順番を 変える（絵ごとに ちがう 顔ぶれに なる）
    const seed = f.seed || 0;
    return Object.keys(sc).map(function (k, i) {
      return { kind: k, score: sc[k] + ((seed + i * 7) % 5) * 0.3 };
    }).sort(function (a, b) { return b.score - a.score; });
  }

  /* 特徴から 体の しゅるいを えらぶ（いちばん 合う もの） */
  function pickKind(f) {
    return kindScores(f)[0].kind;
  }

  /* 使わなく なった 古い えらび方（のこして おく） */
  function pickKindOld(f) {
    if (f.parts >= 3) return 'triple';                        // 3つに 分かれた 絵（ABC3きょうだい など）
    if (f.rectness >= 0.74 && !f.wide) return 'box';
    if (f.rectness >= 0.78) return 'box';                     // 四角い 絵（本・はこ）
    if (f.wide && f.legs >= 3) return 'beast';
    if (f.wide && f.sideOut) return 'fish';
    if (f.wings) return 'bird';
    if (f.tall && f.legs >= 2) return 'humanoid';
    if (f.legs >= 4) return 'bug';
    if (f.wide) return 'fish';
    if (f.tall) return 'humanoid';
    return 'blob';
  }

  /* 特徴 → { shape, colors, kind }。kind を わたせば その すがたで 作る */
  function make(f, forceKind) {
    if (!f) return null;
    const kind = forceKind || pickKind(f);
    let shape = BODIES[kind]();
    if (f.horns >= 2) shape = horns(kind, f.horns).concat(shape);
    if (f.wings && kind !== 'bird') shape = wings(kind).concat(shape);
    shape = shape.concat(tail(kind));
    if (f.skull) shape = shape.concat(skullHead(kind));
    if (f.teeth) shape = shape.concat(teeth(kind));
    shape = shape.concat(eyesFor(kind, f.eyes));
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


  /* =======================================================
     ④ 絵の かたちを のこして「つみき」に する（v3.7・こっちが 本命）

     4つの 型（けもの・さかな…）に はめると、どの 絵も 同じ 犬に なって しまう。
     もとから いる てきの 正体は「**大きな 四角が 数個**・色が 少ない・右下が 暗い」だけ。
     だから **絵の かたちは そのまま** 残して、粗い マス（1マス 4px くらい）に して
     大きな 四角に まとめれば、特徴を のこした まま ゲームの 質感に なる。

       coarse … 絵を 12マスくらいに 粗く する（1マスの 色は そこの 平均）
       fewCol … 色を 4色に する
       tidy   … ぽつんと した マスを 消す・あなを うめる（形を ととのえる）
       rects  … 同じ 色の ところを 大きな 四角に まとめる
       paint  … 48×48 に 描いて、右と 下を 暗く・左と 上を 明るく（blocks.js と 同じ）
       eyesOn … 白目＋くろめを のせる（絵の 中の こい かたまりの 場所に）
     ======================================================= */

  /* 絵を 粗い マスに する。かえり値 {gw, gh, on, col, ink, cs, x0, y0} */
  function coarse(cells, N, G) {
    let x0 = N, y0 = N, x1 = -1, y1 = -1;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (!cells[y * N + x]) continue;
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    if (x1 < 0) return null;
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    const cs = Math.max(bw, bh) / G;                     // 1マスの 大きさ（もとの 絵の px）
    const gw = Math.max(1, Math.round(bw / cs)), gh = Math.max(1, Math.round(bh / cs));
    const on = new Uint8Array(gw * gh);
    const ink = new Uint8Array(gw * gh);
    const col = new Array(gw * gh);
    for (let gy = 0; gy < gh; gy++) {
      for (let gx = 0; gx < gw; gx++) {
        let total = 0, hit = 0, inkN = 0, r = 0, g = 0, b = 0, fn = 0;
        const sx0 = Math.floor(x0 + gx * cs), sx1 = Math.min(x1, Math.floor(x0 + (gx + 1) * cs) - 1);
        const sy0 = Math.floor(y0 + gy * cs), sy1 = Math.min(y1, Math.floor(y0 + (gy + 1) * cs) - 1);
        for (let y = sy0; y <= sy1; y++) {
          for (let x = sx0; x <= sx1; x++) {
            total++;
            const c = cells[y * N + x];
            if (!c) continue;
            hit++;
            if (c.ink) { inkN++; continue; }
            r += c.c[0]; g += c.c[1]; b += c.c[2]; fn++;
          }
        }
        const k = gy * gw + gx;
        if (!total || hit < total * 0.38) continue;      // 4割 うまっていなければ すけたまま
        on[k] = 1;
        if (fn && inkN <= fn) col[k] = [r / fn, g / fn, b / fn];
        else { ink[k] = 1; col[k] = [46, 44, 60]; }      // 線が おおい マス＝こい 色
      }
    }
    return { gw: gw, gh: gh, on: on, col: col, ink: ink, cs: cs, x0: x0, y0: y0 };
  }

  /* 色を k色に まとめる（k-means を 5回） */
  function fewCol(c, k) {
    const list = [];
    for (let i = 0; i < c.on.length; i++) if (c.on[i] && !c.ink[i] && c.col[i]) list.push(c.col[i]);
    if (list.length < 2) return;
    // いちばん あざやかな 色を さいしょの 候補に する（白い 紙の 色に のっとられない ように）
    let seedC = list[0], seedS = -1;
    list.forEach(function (p) {
      const ch = Math.max(p[0], p[1], p[2]) - Math.min(p[0], p[1], p[2]);
      if (ch > seedS) { seedS = ch; seedC = p; }
    });
    const cent = [seedC.slice()];
    while (cent.length < k) {
      let far = null, fd = -1;
      list.forEach(function (p) {
        let md = 1e9;
        cent.forEach(function (q) {
          const d = (p[0] - q[0]) * (p[0] - q[0]) + (p[1] - q[1]) * (p[1] - q[1]) + (p[2] - q[2]) * (p[2] - q[2]);
          if (d < md) md = d;
        });
        if (md > fd) { fd = md; far = p; }
      });
      if (!far || fd < 400) break;
      cent.push(far.slice());
    }
    for (let it = 0; it < 5; it++) {
      const sum = cent.map(function () { return [0, 0, 0, 0]; });
      list.forEach(function (p) {
        let bi = 0, bd = 1e9;
        cent.forEach(function (q, i) {
          const d = (p[0] - q[0]) * (p[0] - q[0]) + (p[1] - q[1]) * (p[1] - q[1]) + (p[2] - q[2]) * (p[2] - q[2]);
          if (d < bd) { bd = d; bi = i; }
        });
        sum[bi][0] += p[0]; sum[bi][1] += p[1]; sum[bi][2] += p[2]; sum[bi][3]++;
      });
      cent.forEach(function (q, i) { if (sum[i][3]) cent[i] = [sum[i][0] / sum[i][3], sum[i][1] / sum[i][3], sum[i][2] / sum[i][3]]; });
    }
    // ゲームの てきの 色の こさに そろえて わりあてる
    const pal = cent.map(function (q) { return pop(q); });
    for (let i = 0; i < c.on.length; i++) {
      if (!c.on[i] || c.ink[i] || !c.col[i]) continue;
      let bi = 0, bd = 1e9;
      cent.forEach(function (q, j) {
        const p = c.col[i];
        const d = (p[0] - q[0]) * (p[0] - q[0]) + (p[1] - q[1]) * (p[1] - q[1]) + (p[2] - q[2]) * (p[2] - q[2]);
        if (d < bd) { bd = d; bi = j; }
      });
      c.col[i] = pal[bi].slice();
    }
  }

  /* 形を ととのえる：ぽつんと した マスを 消す／あなを うめる／色の しみを まわりに 合わせる */
  function tidy(c) {
    const gw = c.gw, gh = c.gh;
    const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    function key(i) { return c.col[i] ? [Math.round(c.col[i][0] / 26), Math.round(c.col[i][1] / 26), Math.round(c.col[i][2] / 26)].join(',') : ''; }
    for (let it = 0; it < 2; it++) {
      const on = c.on.slice(), col = c.col.slice(), ink = c.ink.slice();
      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          const i = y * gw + x;
          let n = 0;
          const near = [];
          D4.forEach(function (d) {
            const nx = x + d[0], ny = y + d[1];
            if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) return;
            const j = ny * gw + nx;
            if (on[j]) { n++; near.push(j); }
          });
          if (on[i]) {
            if (n <= 1) { c.on[i] = 0; continue; }                       // ぽつんと 出っぱった マスは 消す
            // まわりに 同じ 色が 1つも なければ まわりの 色に そろえる
            const me = key(i);
            const same = near.filter(function (j) { return key(j) === me; }).length;
            if (!same && near.length) { c.col[i] = col[near[0]] ? col[near[0]].slice() : c.col[i]; c.ink[i] = ink[near[0]]; }
          } else if (n >= 3) {                                           // かこまれた あなは うめる
            c.on[i] = 1;
            c.col[i] = col[near[0]] ? col[near[0]].slice() : [150, 150, 160];
            c.ink[i] = ink[near[0]];
          }
        }
      }
    }
  }

  /* いちばん 大きな かたまりだけ のこす（はなれた らくがき・字を 消す） */
  function keepBody(c) {
    const gw = c.gw, gh = c.gh;
    const label = new Int32Array(gw * gh);
    const sizes = [0];
    const D8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (let i0 = 0; i0 < gw * gh; i0++) {
      if (label[i0] || !c.on[i0]) continue;
      const id = sizes.length;
      sizes.push(0);
      const st = [i0];
      label[i0] = id;
      while (st.length) {
        const i = st.pop();
        sizes[id]++;
        const x = i % gw, y = (i - x) / gw;
        for (let d = 0; d < 8; d++) {
          const nx = x + D8[d][0], ny = y + D8[d][1];
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          const j = ny * gw + nx;
          if (c.on[j] && !label[j]) { label[j] = id; st.push(j); }
        }
      }
    }
    let best = 0, bn = 0;
    sizes.forEach(function (v, i) { if (v > bn) { bn = v; best = i; } });
    for (let i = 0; i < gw * gh; i++) if (c.on[i] && label[i] !== best) c.on[i] = 0;
  }

  /* まわりの あきを 切って、絵を マスいっぱいに する */
  function trim(c) {
    const gw = c.gw, gh = c.gh;
    let x0 = gw, y0 = gh, x1 = -1, y1 = -1;
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        if (!c.on[y * gw + x]) continue;
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    if (x1 < 0 || (x0 === 0 && y0 === 0 && x1 === gw - 1 && y1 === gh - 1)) return;
    const nw = x1 - x0 + 1, nh = y1 - y0 + 1;
    const on = new Uint8Array(nw * nh), ink = new Uint8Array(nw * nh), col = new Array(nw * nh);
    for (let y = 0; y < nh; y++) {
      for (let x = 0; x < nw; x++) {
        const src = (y + y0) * gw + (x + x0);
        on[y * nw + x] = c.on[src];
        ink[y * nw + x] = c.ink[src];
        col[y * nw + x] = c.col[src];
      }
    }
    c.gw = nw; c.gh = nh; c.on = on; c.ink = ink; c.col = col;
    c.x0 += x0 * c.cs; c.y0 += y0 * c.cs;
  }

  /* 同じ 色の ところを 大きな 四角に まとめる（つみき） */
  function rects(c) {
    const gw = c.gw, gh = c.gh;
    const used = new Uint8Array(gw * gh);
    function key(i) { return c.on[i] ? (c.ink[i] ? 'i' : '') + [Math.round(c.col[i][0] / 26), Math.round(c.col[i][1] / 26), Math.round(c.col[i][2] / 26)].join(',') : null; }
    const out = [];
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const i = y * gw + x;
        if (used[i] || !c.on[i]) continue;
        const k = key(i);
        let w = 1;
        while (x + w < gw && !used[i + w] && key(i + w) === k) w++;
        let h = 1;
        for (;;) {
          const ny = y + h;
          if (ny >= gh) break;
          let ok = true;
          for (let dx = 0; dx < w; dx++) {
            const j = ny * gw + x + dx;
            if (used[j] || key(j) !== k) { ok = false; break; }
          }
          if (!ok) break;
          h++;
        }
        for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) used[(y + dy) * gw + x + dx] = 1;
        out.push({ x: x, y: y, w: w, h: h, c: c.col[i].slice(), ink: !!c.ink[i] });
      }
    }
    return out;
  }

  /* 48×48 に 描く。右と 下を 暗く、左と 上を 明るく（blocks.js と 同じ 立体感） */
  function paint(list, c, eyes) {
    const S = 48;
    const bs = Math.max(2, Math.floor(S / Math.max(c.gw, c.gh)));   // 1マスの ドット数
    const w = c.gw * bs, h = c.gh * bs;
    const ox = Math.round((S - w) / 2), oy = Math.round((S - h) / 2);
    const cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const g = cv.getContext('2d');
    list.forEach(function (r) {
      g.fillStyle = 'rgb(' + r.c.map(function (v) { return Math.round(v); }).join(',') + ')';
      g.fillRect(ox + r.x * bs, oy + r.y * bs, r.w * bs, r.h * bs);
    });
    // 目（白目＋くろめ）
    (eyes || []).forEach(function (e) {
      const ex = ox + Math.round(e.x * bs), ey = oy + Math.round(e.y * bs);
      const es = Math.max(4, bs + 2);
      g.fillStyle = '#f6f6f9';
      g.fillRect(ex, ey, es, es);
      g.fillStyle = '#1c1a26';
      g.fillRect(ex + 1, ey + 1, Math.max(2, es - 2), Math.max(2, es - 2));
    });
    // 立体感：すけている ところに となりあう ドットを 明るく／暗く
    const d = g.getImageData(0, 0, S, S);
    const p = d.data;
    const src = new Uint8ClampedArray(p);
    function alpha(x, y) { return (x < 0 || y < 0 || x >= S || y >= S) ? 0 : src[(y * S + x) * 4 + 3]; }
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const i = (y * S + x) * 4;
        if (!src[i + 3]) continue;
        const lo = !alpha(x, y + 1) || !alpha(x + 1, y);
        const hi = !alpha(x, y - 1) || !alpha(x - 1, y);
        if (lo) { p[i] = src[i] * 0.6; p[i + 1] = src[i + 1] * 0.6; p[i + 2] = src[i + 2] * 0.6; }
        else if (hi) {
          p[i] = src[i] + (255 - src[i]) * 0.32;
          p[i + 1] = src[i + 1] + (255 - src[i + 1]) * 0.32;
          p[i + 2] = src[i + 2] + (255 - src[i + 2]) * 0.32;
        }
      }
    }
    g.putImageData(d, 0, 0);
    return cv.toDataURL('image/png');
  }

  /* 目の 場所を 粗いマスの ざひょうで さがす（こい 小さな かたまり／なければ 上の ほうに 2つ） */
  function findEyes(cells, N, c) {
    const seen = new Int32Array(N * N);
    const found = [];
    const yEnd = c.y0 + Math.round(c.gh * c.cs * 0.55);
    const maxSize = Math.max(6, Math.round(c.cs * c.cs * 1.6));
    for (let y = c.y0; y <= yEnd && y < N; y++) {
      for (let x = 0; x < N; x++) {
        const k = y * N + x;
        if (seen[k] || !cells[k] || !cells[k].ink) continue;
        let size = 0, sx = 0, sy = 0;
        const st = [k];
        seen[k] = 1;
        while (st.length) {
          const q = st.pop();
          const qx = q % N, qy = (q - qx) / N;
          size++; sx += qx; sy += qy;
          [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (dd) {
            const nx = qx + dd[0], ny = qy + dd[1];
            if (nx < 0 || ny < 0 || nx >= N || ny > yEnd) return;
            const nk = ny * N + nx;
            if (!seen[nk] && cells[nk] && cells[nk].ink) { seen[nk] = 1; st.push(nk); }
          });
        }
        if (size >= 3 && size <= maxSize) found.push({ n: size, x: (sx / size - c.x0) / c.cs, y: (sy / size - c.y0) / c.cs });
      }
    }
    found.sort(function (a, b) { return b.n - a.n; });
    let eyes = found.filter(function (e) { return e.x >= 0 && e.y >= 0 && e.x < c.gw && e.y < c.gh && c.on[Math.round(e.y) * c.gw + Math.round(e.x)]; });
    // 3つの 目は「同じくらいの 大きさが 3つ」の ときだけ（サメオニ）。ふつうは 2つ
    if (eyes.length >= 3 && eyes[2].n < eyes[0].n * 0.45) eyes = eyes.slice(0, 2);
    eyes = eyes.slice(0, 3);
    if (eyes.length >= 2) return eyes;
    // 見つからない ときは 上の ほうの 体に 2つ おく
    const row = Math.max(1, Math.round(c.gh * 0.25));
    const cols = [];
    for (let x = 0; x < c.gw; x++) if (c.on[row * c.gw + x]) cols.push(x);
    if (cols.length < 3) return eyes;
    const a = cols[Math.floor(cols.length * 0.28)], b = cols[Math.floor(cols.length * 0.68)];
    return [{ x: a, y: row }, { x: b, y: row }];
  }

  /* 絵 → つみきの モンスター（本命の 道すじ） */
  function fromDrawing(cells, N, G) {
    const c = coarse(cells, N, G || 12);
    if (!c) return null;
    fewCol(c, 4);
    tidy(c);
    keepBody(c);
    trim(c);
    let n = 0;
    for (let i = 0; i < c.on.length; i++) if (c.on[i]) n++;
    if (n < 12) return null;
    const eyes = findEyes(cells, N, c);
    const list = rects(c);
    return { png: paint(list, c, eyes), blocks: list.length, gw: c.gw, gh: c.gh, eyes: eyes.length };
  }

  /* 絵から 候補を n体（初期 3体）作る。子どもが えらぶ */
  function variants(cells, N, n) {
    const f = analyze(cells, N);
    if (!f) return [];
    const order = kindScores(f);
    const out = [];
    for (let i = 0; i < order.length && out.length < (n || 3); i++) {
      const m = make(f, order[i].kind);
      if (!m) continue;
      out.push({ png: png(m.shape, m.colors), kind: m.kind, shape: m.shape, colors: m.colors });
    }
    return out;
  }

  /* 絵（cells）から いっきに PNG まで */
  function fromCells(cells, N) {
    // 絵から 読んだ 特徴で、ゲームの 部品を 組み合わせて 作る
    const f = analyze(cells, N);
    const m = make(f);
    if (!m) return null;
    return { png: png(m.shape, m.colors), shape: m.shape, colors: m.colors, kind: m.kind, features: f };
  }

  return {
    analyze: analyze,
    fromDrawing: fromDrawing,
    variants: variants,
    kindScores: kindScores,
    coarse: coarse,
    make: make,
    png: png,
    fromCells: fromCells,
    // テスト用
    pop: pop
  };
})();
