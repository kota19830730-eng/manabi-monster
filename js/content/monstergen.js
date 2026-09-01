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

  let lastF = null, lastHue = '';          // さいごに 読んだ 特徴（テスト・harness 用）

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

    /* 子どもが かいた「丸」を さがす（v3.9）。
       目は かならず **線で かこまれた ところ**として かかれる（中が 白でも 色でも いい）。
       線（こい ところ）の 外がわから ぬりつぶして いき、たどりつけなかった ところ＝丸の 中。
       かえり値：[{ n:大きさ, x, y, w, h }]（大きい じゅん） */
    function loops() {
      const inkM = new Uint8Array(N * N);
      for (let k = 0; k < N * N; k++) if (cells[k] && cells[k].ink) inkM[k] = 1;
      // 線を ふとらせて すきまを ふさぐ（えんぴつの 線は よく 切れて いる。半径 2 まで うめる）
      const R = 1;   // 線を ふとらせすぎると 小さな 丸（目）が つぶれる。1 が ちょうど よい
      const wall = new Uint8Array(N * N);
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          if (!inkM[y * N + x]) continue;
          for (let dy = -R; dy <= R; dy++) {
            for (let dx = -R; dx <= R; dx++) {
              const nx = x + dx, ny = y + dy;
              if (nx < x0 || ny < y0 || nx > x1 || ny > y1) continue;
              wall[ny * N + nx] = 1;
            }
          }
        }
      }
      // 外がわから ぬる
      const out = new Uint8Array(N * N);
      const st = [];
      for (let x = x0; x <= x1; x++) { [y0, y1].forEach(function (y) { const k = y * N + x; if (!wall[k] && !out[k]) { out[k] = 1; st.push(k); } }); }
      for (let y = y0; y <= y1; y++) { [x0, x1].forEach(function (x) { const k = y * N + x; if (!wall[k] && !out[k]) { out[k] = 1; st.push(k); } }); }
      while (st.length) {
        const k = st.pop();
        const x = k % N, y = (k - x) / N;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          const nx = x + d[0], ny = y + d[1];
          if (nx < x0 || ny < y0 || nx > x1 || ny > y1) return;
          const nk = ny * N + nx;
          if (!wall[nk] && !out[nk]) { out[nk] = 1; st.push(nk); }
        });
      }
      // たどりつけなかった ところ＝丸の 中。かたまりに 分ける
      const seen = new Uint8Array(N * N);
      const found = [];
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const k0 = y * N + x;
          if (seen[k0] || wall[k0] || out[k0]) continue;
          let cnt = 0, ax0 = x, ay0 = y, ax1 = x, ay1 = y, sx = 0, sy = 0;
          const q = [k0];
          seen[k0] = 1;
          while (q.length) {
            const k = q.pop();
            const qx = k % N, qy = (k - qx) / N;
            cnt++; sx += qx; sy += qy;
            if (qx < ax0) ax0 = qx; if (qx > ax1) ax1 = qx;
            if (qy < ay0) ay0 = qy; if (qy > ay1) ay1 = qy;
            [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
              const nx = qx + d[0], ny = qy + d[1];
              if (nx < x0 || ny < y0 || nx > x1 || ny > y1) return;
              const nk = ny * N + nx;
              if (!seen[nk] && !wall[nk] && !out[nk]) { seen[nk] = 1; q.push(nk); }
            });
          }
          found.push({ n: cnt, x: sx / cnt, y: sy / cnt, w: ax1 - ax0 + 1, h: ay1 - ay0 + 1 });
        }
      }
      return found.sort(function (a, b) { return b.n - a.n; });
    }

    /* 色の ついた 小さな かたまり（赤い 目・オレンジの 目 など）。
       線で かこまれて いなくても、まわりと ちがう こい 色で 小さく まとまって いれば 目 */
    function colorSpots() {
      const area = bw * bh;
      const seen = new Uint8Array(N * N);
      const out = [];
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const k = y * N + x;
          const c = cells[k];
          if (seen[k] || !c || c.ink) continue;
          const ch = Math.max(c.c[0], c.c[1], c.c[2]) - Math.min(c.c[0], c.c[1], c.c[2]);
          if (ch < 45) { seen[k] = 1; continue; }              // 色みが うすい ところは 目に しない
          const key = [Math.round(c.c[0] / 40), Math.round(c.c[1] / 40), Math.round(c.c[2] / 40)].join(',');
          let cnt = 0, sx = 0, sy = 0, ax0 = x, ay0 = y, ax1 = x, ay1 = y;
          const st = [k];
          seen[k] = 1;
          while (st.length) {
            const q = st.pop();
            const qx = q % N, qy = (q - qx) / N;
            cnt++; sx += qx; sy += qy;
            if (qx < ax0) ax0 = qx; if (qx > ax1) ax1 = qx;
            if (qy < ay0) ay0 = qy; if (qy > ay1) ay1 = qy;
            [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
              const nx = qx + d[0], ny = qy + d[1];
              if (nx < x0 || ny < y0 || nx > x1 || ny > y1) return;
              const nk = ny * N + nx;
              const c2 = cells[nk];
              if (seen[nk] || !c2 || c2.ink) return;
              const k2 = [Math.round(c2.c[0] / 40), Math.round(c2.c[1] / 40), Math.round(c2.c[2] / 40)].join(',');
              if (k2 !== key) return;
              seen[nk] = 1;
              st.push(nk);
            });
          }
          const w = ax1 - ax0 + 1, h = ay1 - ay0 + 1;
          const ar = w / h;
          if (cnt >= area * 0.002 && cnt <= area * 0.05 && ar >= 0.45 && ar <= 2.2 &&
              cnt >= w * h * 0.45 && (sy / cnt - y0) < bh * 0.7) {
            out.push({ n: cnt, x: sx / cnt, y: sy / cnt, w: w, h: h });
          }
        }
      }
      return out.sort(function (a, b) { return b.n - a.n; });
    }

    /* 丸の 中で「目」らしい もの：まるっこくて、大きすぎず、上の ほうに ある */
    function eyeLoops(all) {
      const area = bw * bh;
      return all.filter(function (l) {
        const ar = l.w / l.h;
        return l.n >= area * 0.002 && l.n <= area * 0.16 &&
               ar >= 0.45 && ar <= 2.2 &&
               l.n >= l.w * l.h * 0.42 &&                       // すきまだらけの ものは のぞく
               (l.y - y0) < bh * 0.72;                          // 顔は 上の ほう
      });
    }

    // 目：上の ほうに ある 小さな こい かたまり（v3.9 からは 丸を 見て 数える）
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
    const allLoops = loops();
    const spots = [];   // 色の かたまりは つながりやすく、目の 数を まちがえる ので つかわない
    // 丸と 色の かたまりを あわせる（同じ 場所は 1つに）
    const eLoops = eyeLoops(allLoops).slice();
    spots.forEach(function (sp) {
      const dup = eLoops.some(function (l) { return Math.abs(l.x - sp.x) < bw * 0.06 && Math.abs(l.y - sp.y) < bh * 0.08; });
      if (!dup) eLoops.push(sp);
    });
    eLoops.sort(function (a, b) { return b.n - a.n; });

    /* 目の 数：丸で 数える。近い 大きさの 丸が よこに ならんで いれば その 数（1〜3）。
       丸が 見つからない ときだけ 昔の やり方（こい かたまり）で 数える */
    function eyeCount() {
      if (!eLoops.length) return eyes();
      const big = eLoops[0].n;
      const same = eLoops.filter(function (l) { return l.n >= big * 0.25; });
      if (same.length >= 3) return 3;
      if (same.length === 2) return 2;
      return 1;
    }

    /* ドクロの 頭：**上の ほうに ある 白い まるい 顔の 中に、目のあなの 丸が 2つ ならぶ**。
       絵ぜんたいが 白っぽい だけの もの（サメ など）は ドクロに しない */
    function isSkull() {
      if (eLoops.length < 2) return false;
      const a = eLoops[0], b = eLoops[1];
      if (b.n < a.n * 0.35) return false;
      if (Math.abs(a.y - b.y) > bh * 0.18) return false;                 // よこに ならんで いる
      const dx = Math.abs(a.x - b.x);
      if (dx < Math.max(a.w, b.w) * 0.6 || dx > bw * 0.45) return false; // ちかすぎ・はなれすぎ は ちがう
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      if (cy - y0 > bh * 0.5) return false;                              // 顔は 上の ほう
      // 目の まわりが 白い か
      const r = Math.round(Math.max(dx * 1.2, Math.max(a.w, b.w) * 2.2));
      let light = 0, tot = 0;
      for (let y = Math.round(cy) - r; y <= Math.round(cy) + r; y++) {
        for (let x = Math.round(cx) - r; x <= Math.round(cx) + r; x++) {
          if (x < x0 || y < y0 || x > x1 || y > y1) continue;
          const c = cells[y * N + x];
          if (!c || c.ink) continue;
          tot++;
          if (lum(c.c) > 198) light++;
        }
      }
      if (tot < 25 || light / tot < 0.55) return false;
      // 絵ぜんたいが 白っぽい ときは「白い 顔」に ならない（サメ・紙の 色）
      let lightAll = 0, fill = 0;
      for (let k = 0; k < N * N; k++) {
        const c = cells[k];
        if (!c || c.ink) continue;
        fill++;
        if (lum(c.c) > 198) lightAll++;
      }
      return fill > 0 && lightAll / fill < 0.62;
    }

    /* 本・はこ：**大きくて 四角い「かこまれた ところ」**が ある（ずかんの あくま の 本） */
    /* 四すみが うまって いる か（本・はこの 絵は 四角い）。3つ いじょうで はこ */
    function corners() {
      const cw = Math.max(2, Math.round(bw * 0.16)), chh = Math.max(2, Math.round(bh * 0.16));
      let ok = 0;
      [[x0, y0], [x1 - cw + 1, y0], [x0, y1 - chh + 1], [x1 - cw + 1, y1 - chh + 1]].forEach(function (p) {
        let hit = 0, tot = 0;
        for (let y = p[1]; y < p[1] + chh; y++) {
          for (let x = p[0]; x < p[0] + cw; x++) {
            if (x < x0 || y < y0 || x > x1 || y > y1) continue;
            tot++;
            if (occ[y * N + x]) hit++;
          }
        }
        if (tot && hit / tot >= 0.6) ok++;
      });
      return ok;
    }

    function isBox() {
      const area = bw * bh;
      if (corners() >= 3 && n / area >= 0.55) return true;
      return allLoops.some(function (l) {
        const ar = l.w / l.h;
        return l.n >= area * 0.09 && l.w >= bw * 0.28 && l.h >= bh * 0.28 &&
               l.n >= l.w * l.h * 0.6 && ar >= 0.55 && ar <= 2.4;
      });
    }

    const eyeN = eyeCount();
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
      loops: eLoops.length,
      dbg: { all: allLoops.slice(0, 6).map(function (l) { return { n: +(l.n / (bw * bh) * 100).toFixed(1), x: +((l.x - x0) / bw).toFixed(2), y: +((l.y - y0) / bh).toFixed(2), w: +(l.w / bw).toFixed(2), h: +(l.h / bh).toFixed(2), fill: +(l.n / (l.w * l.h)).toFixed(2) }; }), eye: eLoops.slice(0, 4).map(function (l) { return { n: +(l.n / (bw * bh) * 100).toFixed(1), x: +((l.x - x0) / bw).toFixed(2), y: +((l.y - y0) / bh).toFixed(2) }; }) },
      loopBig: eLoops.length ? Math.round(eLoops[0].n / (bw * bh) * 1000) / 10 : 0,
      rectness: rectness,
      sideOut: so >= 0.22,
      wings: so >= 0.34,
      skull: isSkull(),
      boxish: isBox(),
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

  /* =======================================================
     ①-b アルファベットの 形（v4.0）

     息子さんの「ABC3きょうだい」は **A・B・C の 字**そのもの。
     けもの・さかな の 型に はめても ぜったいに 合わない ので、
     **字の 形を 部品として もつ**。5×7 の 点で 26文字＋数字を 書いて、
     となりあう 点を 大きな 四角に まとめる（もとから いる てきと 同じ つくり）。
     ======================================================= */

  const FONT5 = {
    A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
    B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
    C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
    D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
    E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
    F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
    G: ['01111', '10000', '10000', '10011', '10001', '10001', '01111'],
    H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
    I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
    J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
    K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
    L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
    M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
    N: ['10001', '11001', '10101', '10101', '10011', '10001', '10001'],
    O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
    P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
    Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
    R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
    T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
    U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
    V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
    W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
    X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
    Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
    Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
    '0': ['01110', '10011', '10101', '10101', '10101', '11001', '01110'],
    '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
    '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
    '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
    '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
    '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
    '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
    '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
    '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
    '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100']
  };
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');

  /* 5×7 の 点を 2ばいに して 少し ふとらせた マス目（11×15）。
     もとから いる てきの 字（letterA/B/C）と 同じ くらいの 太さに なる */
  const GW = 11, GH = 15;
  function glyphGrid(ch) {
    const rows = FONT5[ch];
    if (!rows) return null;
    const base = new Uint8Array(GW * GH);
    for (let j = 0; j < 7; j++) {
      for (let i = 0; i < 5; i++) {
        if (rows[j].charAt(i) !== '1') continue;
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) base[(j * 2 + dy) * GW + i * 2 + dx] = 1;
      }
    }
    const g = base.slice();
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        if (!base[y * GW + x]) continue;
        if (x + 1 < GW) g[y * GW + x + 1] = 1;
        if (y + 1 < GH) g[(y + 1) * GW + x] = 1;
      }
    }
    return g;
  }

  /* マス目 → 大きな 四角の ならび（x,y,w,h の わくの 中に 入れる） */
  function glyphRects(ch, x, y, w, h, key, flags) {
    const g = glyphGrid(ch);
    if (!g) return [];
    const ex = [], ey = [];
    for (let i = 0; i <= GW; i++) ex.push(x + Math.round(i * w / GW));
    for (let j = 0; j <= GH; j++) ey.push(y + Math.round(j * h / GH));
    const used = new Uint8Array(GW * GH);
    const out = [];
    for (let j = 0; j < GH; j++) {
      for (let i = 0; i < GW; i++) {
        const k = j * GW + i;
        if (used[k] || !g[k]) continue;
        let ww = 1;
        while (i + ww < GW && g[k + ww] && !used[k + ww]) ww++;
        let hh = 1;
        for (;;) {
          const nj = j + hh;
          if (nj >= GH) break;
          let ok = true;
          for (let d = 0; d < ww; d++) { const kk = nj * GW + i + d; if (!g[kk] || used[kk]) { ok = false; break; } }
          if (!ok) break;
          hh++;
        }
        for (let dj = 0; dj < hh; dj++) for (let di = 0; di < ww; di++) used[(j + dj) * GW + i + di] = 1;
        const rx = ex[i], ry = ey[j];
        out.push([rx, ry, ex[i + ww] - rx, ey[j + hh] - ry, key, flags || '']);
      }
    }
    return out;
  }

  /* 字の どこに 目を つけるか。
     上の ほうの 行を 見て ①2本の 線に 分かれて いれば その 2本に ②1本でも 太ければ よこに 2つ
     ③細ければ たてに 2つ（C や L の ような 字） */
  function glyphEyes(ch, x, y, w, h) {
    const g = glyphGrid(ch);
    if (!g) return [];
    const cw = w / GW, chh = h / GH;
    const es = Math.max(4, Math.round(w * 0.18));            // 小さい 字でも 目が 見える 大きさに
    function runsAt(j) {
      const rs = [];
      let a = -1;
      for (let i = 0; i < GW; i++) {
        const on = !!g[j * GW + i];
        if (on && a < 0) a = i;
        if ((!on || i === GW - 1) && a >= 0) { rs.push([a, on ? i : i - 1]); a = -1; }
      }
      return rs;
    }
    let best = null;
    for (let j = 2; j <= Math.floor(GH * 0.45); j++) {
      const rs = runsAt(j);
      if (!rs.length) continue;
      const two = rs.length >= 2 && rs[rs.length - 1][0] - rs[0][1] >= 2;
      const sc = (two ? 20 : 0) + (rs[0][1] - rs[0][0] >= 3 ? 6 : 0) - j;
      if (!best || sc > best.sc) best = { sc: sc, j: j, rs: rs };
    }
    if (!best) return [];
    const cy = Math.round(y + best.j * chh);
    function mid(run) { return Math.round(x + (run[0] + run[1] + 1) / 2 * cw - es / 2); }
    const rs = best.rs;
    if (rs.length >= 2 && rs[rs.length - 1][0] - rs[0][1] >= 2) {
      return eye(mid(rs[0]), cy, es).concat(eye(mid(rs[rs.length - 1]), cy, es));
    }
    const run = rs[0];
    const rw = (run[1] - run[0] + 1) * cw;
    if (rw >= es * 2 + 3) {                                   // 太い 線（C の 上の ぼう など）は よこに 2つ
      const left = Math.round(x + run[0] * cw + rw * 0.25 - es / 2);
      const right = Math.round(x + run[0] * cw + rw * 0.75 - es / 2);
      return eye(left, cy, es).concat(eye(right, cy, es));
    }
    return eye(mid(run), cy, es).concat(eye(mid(run), Math.round(cy + es + Math.max(2, chh)), es));
  }

  /* 字の モンスター。1〜4文字を よこに ならべる（色は 字ごと） */
  function letterBody(chars, cols) {
    const list = (chars && chars.length ? chars : ['A']).slice(0, 4);
    const n = list.length;
    const gap = n >= 3 ? 2 : 4;
    const total = 46 - gap * (n - 1);
    const w = Math.floor(total / n);
    const x0 = Math.round((48 - (w * n + gap * (n - 1))) / 2);
    const y = n === 1 ? 3 : 7;
    const h = n === 1 ? 42 : 34;
    let out = [];
    list.forEach(function (ch, i) {
      const x = x0 + i * (w + gap);
      const key = cols && cols[i] ? cols[i] : (i === 0 ? 'A' : i === 1 ? 'C' : 'B');
      out = out.concat(glyphRects(ch, x, y, w, h, key, ''));
      out = out.concat(glyphEyes(ch, x, y, w, h));
    });
    return out;
  }

  /* =======================================================
     ①-c 馬に のった ガイコツの きし（v4.0）

     息子さんの「スカルホース」は **馬の 上に ガイコツの きしが のって いる**。
     体 1つの 型では ぜったいに 出ない ので、乗りものと 乗り手を 組み立てる 部品を もつ。
       うま … 頭・首・体・あし4本・しっぽ
       きし … よろい・うで・けん・たて・ガイコツ（か かぶと）の 頭
     ======================================================= */

  function horsePart() {
    return [
      [4, 13, 3, 4, 'A'], [9, 13, 3, 4, 'A'],                      // 耳
      [2, 17, 14, 10, 'A', 'h'],                                   // 頭
      [5, 20, 5, 4, 'k', 'n'], [6, 21, 3, 2, 'r', 'g'],            // 目
      [0, 24, 10, 5, 'A'],                                         // 鼻づら
      [0, 29, 10, 3, 'k', 'n'], [1, 29, 2, 2, 'w', 'n'], [5, 29, 2, 2, 'w', 'n'],  // 口＋歯
      [0, 32, 11, 4, 'A'],                                         // 下あご
      [13, 20, 7, 9, 'A'],                                         // 首
      [17, 27, 26, 11, 'A', 'h'],                                  // 体
      [43, 25, 5, 3, 'A'], [45, 28, 3, 6, 'A'],                    // しっぽ
      [18, 38, 4, 10, 'A'], [24, 38, 4, 10, 'A'], [33, 38, 4, 10, 'A'], [40, 38, 4, 10, 'A'],  // あし
      [18, 45, 4, 3, 'B', 'n'], [24, 45, 4, 3, 'B', 'n'], [33, 45, 4, 3, 'B', 'n'], [40, 45, 4, 3, 'B', 'n']  // ひづめ
    ];
  }

  function knightPart(skull) {
    const body = [
      [28, 27, 4, 10, 's'], [28, 37, 5, 3, 'k', 'n'],              // あし＋くつ
      [26, 16, 12, 11, 's', 'h'], [30, 19, 4, 4, 'y', 'n'],        // よろい＋金の むねかざり
      [20, 17, 6, 8, 'C', 'h'], [22, 20, 2, 2, 'y', 'n'],          // たて
      [37, 19, 5, 4, 's'], [39, 17, 6, 2, 'y', 'n'], [41, 2, 3, 15, 'w', 'g']  // うで＋つば＋けん
    ];
    if (skull) {
      return body.concat([
        [25, 4, 13, 12, 'w', 'h'],                                 // ガイコツの 頭
        [24, 2, 15, 4, 's'], [29, 0, 5, 3, 'r'],                   // かぶと＋赤い かざり
        [27, 8, 4, 4, 'k', 'n'], [33, 8, 4, 4, 'k', 'n'],          // 目のあな
        [28, 9, 2, 2, 'r', 'g'], [34, 9, 2, 2, 'r', 'g'],          // 赤い 光
        [27, 13, 10, 2, 'k', 'n'], [28, 13, 2, 2, 'w', 'n'], [32, 13, 2, 2, 'w', 'n']  // 歯
      ]);
    }
    return body.concat([
      [25, 4, 13, 12, 'C', 'h'],                                   // 顔
      [24, 2, 15, 4, 's'], [29, 0, 5, 3, 'r'],                     // かぶと＋かざり
      [26, 9, 5, 5, 'w'], [32, 9, 5, 5, 'w'],
      [27, 10, 3, 3, 'k', 'n'], [33, 10, 3, 3, 'k', 'n']
    ]);
  }

  function riderBody(skull) {
    return horsePart().concat(knightPart(skull !== false));
  }

  /* =======================================================
     ①-d 絵を 読む（v4.0）

     「けもの か さかな か」を 当てるのは むずかしいが、
     **字か どうか**と **馬に のって いるか**は 形に はっきり 出る ので 読める。

       drawParts  … 絵を 色ごとの かたまりに 分ける（A＝赤・B＝緑・C＝黄 の ように）
       letterOf   … かたまりの 形を 26文字の おてほんと 見くらべて 字を 当てる
       riderGuess … 下が よこ長で 上に 細い 山が ある＝何かが 乗って いる
     ======================================================= */

  function bboxOf(cells, N) {
    let x0 = N, y0 = N, x1 = -1, y1 = -1, n = 0;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (!cells[y * N + x]) continue;
        n++;
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    if (x1 < 0) return null;
    return { x0: x0, y0: y0, x1: x1, y1: y1, w: x1 - x0 + 1, h: y1 - y0 + 1, n: n };
  }

  function hueOf(c) {
    const r = c[0], g = c[1], b = c[2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (d < 1) return -1;
    let hh;
    if (mx === r) hh = ((g - b) / d) % 6;
    else if (mx === g) hh = (b - r) / d + 2;
    else hh = (r - g) / d + 4;
    hh *= 60;
    return hh < 0 ? hh + 360 : hh;
  }
  function hueGap(a, b) { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }

  /* 絵を 色ごとの かたまりに 分ける。かえり値は 左から 右の じゅん */
  function drawParts(cells, N) {
    const bb = bboxOf(cells, N);
    if (!bb) return [];
    // 色の ついた マスを 色あいで まとめる
    const bins = new Array(24).fill(0);
    const sums = [];
    for (let i = 0; i < 24; i++) sums.push([0, 0, 0]);
    const pts = [];
    for (let k = 0; k < N * N; k++) {
      const c = cells[k];
      if (!c || c.ink) continue;
      const ch = Math.max(c.c[0], c.c[1], c.c[2]) - Math.min(c.c[0], c.c[1], c.c[2]);
      if (ch < 26) continue;
      const hu = hueOf(c.c);
      if (hu < 0) continue;
      const b = Math.floor(hu / 15) % 24;
      bins[b]++; sums[b][0] += c.c[0]; sums[b][1] += c.c[1]; sums[b][2] += c.c[2];
      pts.push({ k: k, h: hu });
    }
    if (pts.length < bb.n * 0.1) return [];
    // 山（多い 色あい）を さがす。近い 山は 1つに
    const order = bins.map(function (v, i) { return { i: i, n: v }; }).sort(function (a, b) { return b.n - a.n; });
    const peaks = [];
    order.forEach(function (o) {
      if (o.n < pts.length * 0.08) return;
      const hu = o.i * 15 + 7.5;
      if (peaks.some(function (p) { return hueGap(p.h, hu) < 34; })) return;
      peaks.push({ h: hu, n: o.n, c: [sums[o.i][0] / o.n, sums[o.i][1] / o.n, sums[o.i][2] / o.n] });
    });
    lastHue = 'bins[' + bins.map(function (v, i) { return v ? (i * 15) + ':' + v : ''; }).filter(Boolean).join(',') + '] peaks[' + peaks.map(function (p) { return Math.round(p.h) + '@' + p.n; }).join(',') + ']';
    if (!peaks.length) return [];
    // 色あいごとの マス
    const lab = new Int32Array(N * N).fill(-1);
    pts.forEach(function (p) {
      let bi = 0, bd = 1e9;
      peaks.forEach(function (q, i) { const d = hueGap(q.h, p.h); if (d < bd) { bd = d; bi = i; } });
      lab[p.k] = bi;
    });
    // 色あいごとに いちばん 大きな かたまり
    const D8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    const parts = [];
    peaks.forEach(function (pk, pi) {
      const seen = new Uint8Array(N * N);
      let best = null;
      for (let k0 = 0; k0 < N * N; k0++) {
        if (seen[k0] || lab[k0] !== pi) continue;
        const list = [];
        const st = [k0];
        seen[k0] = 1;
        while (st.length) {
          const k = st.pop();
          list.push(k);
          const x = k % N, y = (k - x) / N;
          for (let d = 0; d < 8; d++) {
            const nx = x + D8[d][0], ny = y + D8[d][1];
            if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
            const j = ny * N + nx;
            if (!seen[j] && lab[j] === pi) { seen[j] = 1; st.push(j); }
          }
        }
        if (!best || list.length > best.length) best = list;
      }
      if (best && best.length >= Math.max(8, pts.length * 0.06)) parts.push({ core: best, col: pk.c });
    });
    if (!parts.length) return [];
    // 線（えんぴつ）や 色の ない マスを いちばん 近い かたまりに くばる
    const owner = new Int32Array(N * N).fill(-1);
    const q = [];
    parts.forEach(function (p, i) { p.core.forEach(function (k) { owner[k] = i; q.push(k); }); });
    let head = 0;
    while (head < q.length) {
      const k = q[head++];
      const x = k % N, y = (k - x) / N;
      for (let d = 0; d < 8; d++) {
        const nx = x + D8[d][0], ny = y + D8[d][1];
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
        const j = ny * N + nx;
        if (owner[j] >= 0 || !cells[j]) continue;
        owner[j] = owner[k];
        q.push(j);
      }
    }
    // かたまりごとの わく（mask＝ぜんぶ／core＝ぬった 色だけ）
    const out = parts.map(function (p, i) {
      return { id: i, col: p.col, mask: new Uint8Array(N * N), core: new Uint8Array(N * N), coreN: 0, cx0: N, cy0: N, cx1: -1, cy1: -1, x0: N, y0: N, x1: -1, y1: -1, n: 0 };
    });
    for (let k = 0; k < N * N; k++) {
      const o = owner[k];
      if (o < 0) continue;
      const g = out[o];
      const x = k % N, y = (k - x) / N;
      g.mask[k] = 1; g.n++;
      if (x < g.x0) g.x0 = x; if (x > g.x1) g.x1 = x;
      if (y < g.y0) g.y0 = y; if (y > g.y1) g.y1 = y;
    }
    parts.forEach(function (p, i) {
      const g = out[i];
      p.core.forEach(function (k) {
        const x = k % N, y = (k - x) / N;
        g.core[k] = 1; g.coreN++;
        if (x < g.cx0) g.cx0 = x; if (x > g.cx1) g.cx1 = x;
        if (y < g.cy0) g.cy0 = y; if (y > g.cy1) g.cy1 = y;
      });
    });
    return out.filter(function (g) { return g.n >= bb.n * 0.06; })
      .sort(function (a, b) { return a.x0 - b.x0; });
  }

  /* ---------- 字の おてほん（5×7 → 12×16・かこまれた ところを うめた もの） ---------- */
  const TW = 12, TH = 16;
  let TPL = null;
  function fillHoles(g, w, h) {
    const out = g.slice();
    const seen = new Uint8Array(w * h);
    const st = [];
    for (let x = 0; x < w; x++) { [0, h - 1].forEach(function (y) { const k = y * w + x; if (!g[k] && !seen[k]) { seen[k] = 1; st.push(k); } }); }
    for (let y = 0; y < h; y++) { [0, w - 1].forEach(function (x) { const k = y * w + x; if (!g[k] && !seen[k]) { seen[k] = 1; st.push(k); } }); }
    while (st.length) {
      const k = st.pop();
      const x = k % w, y = (k - x) / w;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        const nx = x + d[0], ny = y + d[1];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
        const j = ny * w + nx;
        if (!g[j] && !seen[j]) { seen[j] = 1; st.push(j); }
      });
    }
    for (let k = 0; k < w * h; k++) if (!g[k] && !seen[k]) out[k] = 1;
    return out;
  }
  /* かこまれた ところ（あな）の 数。小さすぎる あなは 数えない */
  function holeCount(g, w, h, minCells) {
    const seen = new Uint8Array(w * h);
    const st = [];
    for (let x = 0; x < w; x++) { [0, h - 1].forEach(function (y) { const k = y * w + x; if (!g[k] && !seen[k]) { seen[k] = 1; st.push(k); } }); }
    for (let y = 0; y < h; y++) { [0, w - 1].forEach(function (x) { const k = y * w + x; if (!g[k] && !seen[k]) { seen[k] = 1; st.push(k); } }); }
    while (st.length) {
      const k = st.pop();
      const x = k % w, y = (k - x) / w;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        const nx = x + d[0], ny = y + d[1];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
        const j = ny * w + nx;
        if (!g[j] && !seen[j]) { seen[j] = 1; st.push(j); }
      });
    }
    let n = 0;
    for (let k0 = 0; k0 < w * h; k0++) {
      if (seen[k0] || g[k0]) continue;
      let cnt = 0;
      const q = [k0];
      seen[k0] = 1;
      while (q.length) {
        const k = q.pop();
        cnt++;
        const x = k % w, y = (k - x) / w;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          const nx = x + d[0], ny = y + d[1];
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
          const j = ny * w + nx;
          if (!g[j] && !seen[j]) { seen[j] = 1; q.push(j); }
        });
      }
      if (cnt >= (minCells || 1)) n++;
    }
    return n;
  }

  function templates() {
    if (TPL) return TPL;
    TPL = {};
    LETTERS.forEach(function (ch) {
      const gg = glyphGrid(ch);
      const st = new Uint8Array(TW * TH);
      for (let y = 0; y < TH; y++) {
        for (let x = 0; x < TW; x++) {
          const gx = Math.min(GW - 1, Math.floor(x * GW / TW)), gy = Math.min(GH - 1, Math.floor(y * GH / TH));
          if (gg[gy * GW + gx]) st[y * TW + x] = 1;
        }
      }
      // 線を 1マス ふとらせた もの（えんぴつの 線が 少し ずれても よい ように）
      const wide = st.slice();
      for (let y = 0; y < TH; y++) {
        for (let x = 0; x < TW; x++) {
          if (!st[y * TW + x]) continue;
          [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
            const nx = x + d[0], ny = y + d[1];
            if (nx < 0 || ny < 0 || nx >= TW || ny >= TH) return;
            wide[ny * TW + nx] = 1;
          });
        }
      }
      TPL[ch] = { raw: st, stroke: wide, fill: fillHoles(st, TW, TH), holes: holeCount(glyphGrid(ch), GW, GH, 2) };
    });
    return TPL;
  }

  /* 絵の 中の あな（線で かこまれた ところ）を 数える。
     子どもは 字の 中に 目も かく ので、**小さい 丸は 数えない**（あなは 字の あな だけ） */
  function partHoles(part, cells, N, box, src) {
    const bx = box || part;
    const x0 = bx.x0, y0 = bx.y0;
    const w = bx.x1 - x0 + 1, h = bx.y1 - y0 + 1;
    const area = w * h;
    const wall = new Uint8Array(area);
    for (let y = y0; y <= bx.y1; y++) {
      for (let x = x0; x <= bx.x1; x++) {
        const k = y * N + x;
        const inWall = src ? !!src[k] : (!part.mask[k] || (cells[k] && cells[k].ink));
        if (!inWall) continue;
        const i = (y - y0) * w + (x - x0);
        wall[i] = 1;
      }
    }
    // 線を 1マス ふとらせて 切れ目を ふさぐ
    const wide = wall.slice();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!wall[y * w + x]) continue;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          const nx = x + d[0], ny = y + d[1];
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
          wide[ny * w + nx] = 1;
        });
      }
    }
    // 外から とどかない ところ＝あな。大きさを はかる
    const seen = new Uint8Array(area);
    const st = [];
    for (let x = 0; x < w; x++) { [0, h - 1].forEach(function (y) { const k = y * w + x; if (!wide[k] && !seen[k]) { seen[k] = 1; st.push(k); } }); }
    for (let y = 0; y < h; y++) { [0, w - 1].forEach(function (x) { const k = y * w + x; if (!wide[k] && !seen[k]) { seen[k] = 1; st.push(k); } }); }
    while (st.length) {
      const k = st.pop();
      const x = k % w, y = (k - x) / w;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        const nx = x + d[0], ny = y + d[1];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
        const j = ny * w + nx;
        if (!wide[j] && !seen[j]) { seen[j] = 1; st.push(j); }
      });
    }
    const sizes = [];
    for (let k0 = 0; k0 < area; k0++) {
      if (seen[k0] || wide[k0]) continue;
      let cnt = 0;
      const q = [k0];
      seen[k0] = 1;
      while (q.length) {
        const k = q.pop();
        cnt++;
        const x = k % w, y = (k - x) / w;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          const nx = x + d[0], ny = y + d[1];
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
          const j = ny * w + nx;
          if (!wide[j] && !seen[j]) { seen[j] = 1; q.push(j); }
        });
      }
      sizes.push(cnt / area);
    }
    sizes.sort(function (a, b) { return b - a; });
    return sizes;
  }

  /* かたまりを TW×TH の マスに して、字の おてほんと 見くらべる。

     子どもは 字の 線を えんぴつで かいて、その 中を 色で ぬる。
     つまり **ぬった 色の 形＝字の 線その もの**。だから 色の マス（core）を
     おてほんの 線と 見くらべる のが いちばん よく 当たる。
     色で ぬって いない 絵（えんぴつだけ）の ときは、外の 形ぜんたいで 見くらべる */
  function letterOf(part, cells, N) {
    const useCore = !!(part.core && part.coreN >= Math.max(24, part.n * 0.22) && part.cx1 > part.cx0 + 2);
    const box = useCore ? { x0: part.cx0, y0: part.cy0, x1: part.cx1, y1: part.cy1 } : { x0: part.x0, y0: part.y0, x1: part.x1, y1: part.y1 };
    const src = useCore ? part.core : part.mask;
    const w = box.x1 - box.x0 + 1, h = box.y1 - box.y0 + 1;
    if (w < 4 || h < 6) return null;
    const on = new Float32Array(TW * TH), ink = new Float32Array(TW * TH), tot = new Float32Array(TW * TH);
    for (let y = box.y0; y <= box.y1; y++) {
      for (let x = box.x0; x <= box.x1; x++) {
        const gx = Math.min(TW - 1, Math.floor((x - box.x0) * TW / w));
        const gy = Math.min(TH - 1, Math.floor((y - box.y0) * TH / h));
        const g = gy * TW + gx;
        tot[g]++;
        const k = y * N + x;
        if (src[k]) on[g]++;
        if (part.mask[k] && cells[k] && cells[k].ink) ink[g]++;
      }
    }
    const F = new Uint8Array(TW * TH), I = new Uint8Array(TW * TH);
    for (let g = 0; g < TW * TH; g++) {
      if (!tot[g]) continue;
      if (on[g] / tot[g] >= 0.4) F[g] = 1;
      if (ink[g] / tot[g] >= 0.18) I[g] = 1;
    }
    let inkN = 0;
    for (let g = 0; g < TW * TH; g++) if (I[g]) inkN++;
    // 絵の あな（大きい ものだけ。目の 丸は 数えない）
    const hs = partHoles(part, cells, N, box, useCore ? src : null).filter(function (v) { return v >= 0.035; });
    const holes = Math.min(2, hs.length);
    const tpl = templates();
    const out = LETTERS.map(function (ch) {
      const t = tpl[ch];
      const shape = useCore ? t.raw : t.fill;
      let inter = 0, uni = 0, hit = 0;
      for (let g = 0; g < TW * TH; g++) {
        if (F[g] && shape[g]) inter++;
        if (F[g] || shape[g]) uni++;
        if (I[g] && t.stroke[g]) hit++;
      }
      const iou = uni ? inter / uni : 0;
      const prec = inkN >= 6 ? hit / inkN : iou;
      const dh = Math.abs(t.holes - holes);
      const hsc = dh === 0 ? 1 : dh === 1 ? 0.35 : 0;
      return { ch: ch, score: iou * 0.5 + prec * 0.22 + hsc * 0.28, iou: iou, prec: prec, holes: t.holes };
    }).sort(function (a, b) { return b.score - a.score; });
    out.holes = holes;
    out.hs = hs;
    out.inkN = inkN;
    out.core = useCore;
    return out;
  }

  /* しらべた ところを 図に する（テスト用）。
     こい 色＝ぬった 色（core・字の 線と 見なす ところ）／うすい 色＝その かたまり／黒＝えんぴつの 線 */
  function partsImg(cells, N) {
    const parts = drawParts(cells, N);
    const cv = document.createElement('canvas');
    cv.width = N; cv.height = N;
    const g = cv.getContext('2d');
    const d = g.createImageData(N, N);
    const HUES = [[240, 70, 70], [70, 210, 110], [240, 210, 70], [90, 150, 250], [220, 120, 240]];
    for (let k = 0; k < N * N; k++) {
      let c = null;
      parts.forEach(function (p, i) {
        const h = HUES[i % HUES.length];
        if (p.core[k]) c = h;
        else if (p.mask[k] && !c) c = [h[0] * 0.35 + 40, h[1] * 0.35 + 40, h[2] * 0.35 + 40];
      });
      if (cells[k] && cells[k].ink) c = [20, 20, 30];
      const o = k * 4;
      if (!c) { d.data[o + 3] = 0; continue; }
      d.data[o] = c[0]; d.data[o + 1] = c[1]; d.data[o + 2] = c[2]; d.data[o + 3] = 255;
    }
    g.putImageData(d, 0, 0);
    return { png: cv.toDataURL('image/png'), n: parts.length, boxes: parts.map(function (p) { return [p.x0, p.y0, p.x1, p.y1, p.cx0, p.cy0, p.cx1, p.cy1, p.coreN, p.n]; }) };
  }

  /* 絵ぜんたい（か かたまりごと）を 字として 読む */
  function letterGuess(cells, N) {
    const bb = bboxOf(cells, N);
    if (!bb) return null;
    let parts = drawParts(cells, N);
    // 色で 分かれない 絵は ぜんたいを 1文字として 読む
    if (parts.length < 2) {
      const one = { mask: new Uint8Array(N * N), x0: bb.x0, y0: bb.y0, x1: bb.x1, y1: bb.y1, n: bb.n, col: null };
      for (let k = 0; k < N * N; k++) if (cells[k]) one.mask[k] = 1;
      parts = [one];
    }
    // 字は よこに ならんで いて、それぞれ たてに 長い
    const use = parts.filter(function (p) {
      const w = p.x1 - p.x0 + 1, h = p.y1 - p.y0 + 1;
      return h >= bb.h * 0.4 && w >= 3 && w / h <= 2.2;
    });
    if (!use.length) return null;
    const guesses = use.map(function (p) {
      const r = letterOf(p, cells, N);
      return r ? { ch: r[0].ch, score: r[0].score, col: p.col, alt: r[1] ? r[1].ch : null, top: r.slice(0, 4), holes: r.holes, hs: r.hs, inkN: r.inkN, core: r.core } : null;
    }).filter(Boolean);
    if (!guesses.length) return null;
    const mean = guesses.reduce(function (s, g) { return s + g.score; }, 0) / guesses.length;
    /* 字が よこに ならんで いるか。
       ぬった 色の わく（なければ かたまりの わく）が **かさならずに 左から 右へ ならぶ** ときだけ
       「字が ならんで いる 絵」と 見る。サメの 目（体の 中に ある）や 水の らくがき（体と かさなる）は ここで はじく */
    const boxes = use.map(function (p) {
      const core = p.coreN > 0 && p.cx1 > p.cx0;
      return core ? { a: p.cx0, b: p.cx1, h: p.cy1 - p.cy0 + 1 } : { a: p.x0, b: p.x1, h: p.y1 - p.y0 + 1 };
    }).sort(function (a, b) { return a.a - b.a; });
    // 字は たてに 長い（サメの 目や 水の らくがきは ひくい）
    const hs2 = boxes.map(function (b) { return b.h; });
    const meanH = hs2.reduce(function (a, b) { return a + b; }, 0) / hs2.length;
    let row = boxes.length >= 2 && meanH >= bb.h * 0.38 && Math.max.apply(null, hs2) >= bb.h * 0.48;
    for (let i = 1; i < boxes.length && row; i++) {
      const A = boxes[i - 1], B = boxes[i];
      const ov = Math.min(A.b, B.b) - Math.max(A.a, B.a) + 1;
      const narrow = Math.min(A.b - A.a + 1, B.b - B.a + 1);
      if (ov > narrow * 0.45) row = false;
    }
    return {
      row: row,
      chars: guesses.map(function (g) { return g.ch; }),
      alts: guesses.map(function (g) { return g.alt; }),
      colors: guesses.map(function (g) { return g.col ? hex(pop(g.col)) : null; }),
      score: mean,
      parts: use.length,
      hue: lastHue,
      dbg: use.map(function (p, i) {
        const g = guesses[i];
        if (!g) return '[?]';
        return '[' + (p.col ? hex(p.col) : '-') + (g.core ? ' 色' : ' 形') + ' あな' + g.holes + '(' + g.hs.map(function (v) { return (v * 100).toFixed(0); }).join('/') + ') ink' + g.inkN + ' ' +
          g.top.map(function (t) { return t.ch + t.score.toFixed(2) + '(i' + t.iou.toFixed(2) + 'p' + t.prec.toFixed(2) + 'h' + t.holes + ')'; }).join(' ') + ']';
      }).join(' ')
    };
  }

  /* 何かが 上に 乗って いるか（馬＋きし）。
     下は よこ長の 体、上に **細い 山**が 1つ あり、その 左右に 体が つづく */
  function riderGuess(cells, N) {
    const bb = bboxOf(cells, N);
    if (!bb) return null;
    const top = [];
    for (let x = bb.x0; x <= bb.x1; x++) {
      let v = -1, cnt = 0;
      for (let y = bb.y0; y <= bb.y1; y++) if (cells[y * N + x]) { if (v < 0) v = y; cnt++; }
      top.push(cnt >= 3 ? v : -1);
    }
    const on = top.filter(function (v) { return v >= 0; }).slice().sort(function (a, b) { return a - b; });
    if (on.length < 10) return null;
    const mid = on[Math.floor(on.length * 0.6)];          // 体の 上の へり（下がわ 寄りの 中央値）
    const need = bb.h * 0.16;
    // 山（体より 上に 出て いる ところ）を さがす。2マスまでの 切れ目は つなぐ
    const runs = [];
    let cur = null, gap = 0;
    for (let i = 0; i < top.length; i++) {
      const v = top[i];
      const up = v >= 0 && mid - v >= need;
      if (up) {
        if (!cur) cur = { i0: i, i1: i, hi: v };
        else { cur.i1 = i; if (v < cur.hi) cur.hi = v; }
        gap = 0;
      } else if (cur) {
        gap++;
        if (gap > 2) { runs.push(cur); cur = null; }
      }
    }
    if (cur) runs.push(cur);
    if (!runs.length) return null;
    runs.sort(function (a, b) { return (b.i1 - b.i0) - (a.i1 - a.i0); });
    const r = runs[0];
    const w = r.i1 - r.i0 + 1;
    const high = mid - r.hi;
    const leftN = r.i0, rightN = top.length - 1 - r.i1;
    const ratioW = w / bb.w;
    // 山が 細すぎ／太すぎ、左右に 体が ない、高さが たりない → ちがう
    if (ratioW < 0.1 || ratioW > 0.62) return null;
    if (leftN < bb.w * 0.12 || rightN < bb.w * 0.12) return null;
    if (high < bb.h * 0.2) return null;
    let score = 0.45 + Math.min(0.25, high / bb.h * 0.5) + (ratioW < 0.45 ? 0.15 : 0);
    if (bb.w / bb.h >= 1.15) score += 0.12;               // 下が よこ長（馬・のりもの）
    return { score: Math.min(1, score), w: +ratioW.toFixed(2), high: +(high / bb.h).toFixed(2) };
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
      box: (f.boxish ? 5 : 0) + (f.rectness >= 0.9 ? 3 : f.rectness >= 0.82 ? 1 : 0),   // 四すみが うまって いれば 本・はこ
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
    /* 字（A〜Z）と 馬に のった きし は 体の 型を つかわず、専用の 部品で 組み立てる（v4.0） */
    if (kind === 'letters' || kind === 'letter') {
      const chars = f.letters && f.letters.length ? f.letters : ['A'];
      const list = kind === 'letter' ? chars.slice(0, 1) : chars.slice(0, 4);
      const base = hex(f.main);
      const acc = f.accent ? hex(f.accent) : base;
      const cols = list.map(function (ch, i) {
        const c = (f.letterColors || [])[i];
        return c || (i % 2 ? acc : base);
      });
      return { shape: letterBody(list, cols), colors: { A: base }, kind: kind, letters: list, cols: cols };
    }
    if (kind === 'rider' || kind === 'knight') {
      const cl = { A: hex(f.main) };
      if (f.accent) cl.C = hex(f.accent);
      return { shape: riderBody(kind === 'rider'), colors: cl, kind: kind };
    }
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
    p.s = [186, 196, 214];
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

  /* 絵から 候補を n体（初期 6体）作る。子どもが えらぶ（v4.0）

     ならべる じゅん：**はっきり 読めた もの（字・のりもの）→ 形が 合う もの**。
     読めなかった ときも 下の ほうに 出す ので、まちがえても 子どもが えらび直せる */
  function variants(cells, N, n) {
    const f = analyze(cells, N);
    if (!f) return [];
    const want = n || 8;
    const lt = letterGuess(cells, N);
    const rd = riderGuess(cells, N);
    if (lt) { f.letters = lt.chars; f.letterColors = lt.colors; f.letterScore = lt.score; f.letterDbg = lt.dbg; f.letterHue = lt.hue; }
    if (rd) f.riderScore = rd.score;
    lastF = f;
    const order = kindScores(f);
    const out = [];
    const done = {};
    function add(kind, tag, feat) {
      if (out.length >= want || done[tag || kind]) return;
      const m = make(feat || f, kind);
      if (!m) return;
      done[tag || kind] = 1;
      out.push({ png: png(m.shape, m.colors), kind: m.kind, tag: tag || m.kind, shape: m.shape, colors: m.colors, letters: m.letters || null, cols: m.cols || null });
    }
    const skullF = (function () {
      const g = {};
      Object.keys(f).forEach(function (k) { g[k] = f[k]; });
      g.skull = true;
      return g;
    })();
    // 字が よこに ならんで いる 絵（ABC3きょうだい）だけ 字を 先に 出す
    const rowOk = !!(lt && lt.row && lt.score >= 0.5 && lt.chars.length >= 2);
    const tall1 = !!(lt && !lt.row && lt.chars.length === 1 && lt.score >= 0.78 && f.tall);
    const riderOk = !!(rd && rd.score >= 0.62);
    const plan = [];
    if (rowOk) plan.push(['letters', 'letters']);
    if (tall1) plan.push(['letter', 'letter']);
    if (riderOk) plan.push(['rider', 'rider']);
    plan.push([order[0].kind, order[0].kind]);
    if (f.eyes === 2 && !f.skull) plan.push([order[0].kind, 'skull', skullF]);
    plan.push([order[1].kind, order[1].kind]);
    if (!riderOk) plan.push(['rider', 'rider']);                 // のりものは いつでも えらべる ように
    plan.push([order[2].kind, order[2].kind]);
    plan.push(['letters', 'letters']);                           // 字も いつでも えらべる（もじは あとから 直せる）
    if (!f.boxish) plan.push(['box', 'box']);
    for (let i = 3; i < order.length; i++) plan.push([order[i].kind, order[i].kind]);
    plan.forEach(function (p) { add(p[0], p[1], p[2]); });
    return out.slice(0, want);
  }

  /* 絵（cells）から いっきに PNG まで（候補の 1番め と 同じ） */
  function fromCells(cells, N) {
    const v = variants(cells, N, 1);
    if (!v.length) return null;
    return { png: v[0].png, shape: v[0].shape, colors: v[0].colors, kind: v[0].kind, features: lastF };
  }

  return {
    analyze: analyze,
    fromDrawing: fromDrawing,
    variants: variants,
    letterGuess: letterGuess,
    letterPng: function (chars, cols) { return png(letterBody(chars, cols), {}); },
    letterList: LETTERS,
    partsImg: partsImg,
    riderGuess: riderGuess,
    drawParts: drawParts,
    letterOf: letterOf,
    letterBody: letterBody,
    riderBody: riderBody,
    fonts: FONT5,
    features: function () { return lastF; },
    kindScores: kindScores,
    coarse: coarse,
    make: make,
    png: png,
    fromCells: fromCells,
    // テスト用
    pop: pop
  };
})();
