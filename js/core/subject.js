/* ---------------------------------------------------------
   写真の まん中の「もの」（ぬいぐるみ・おもちゃ）を 切りぬく（まなびモンスター v14.47・2026-10-10）
   ころたま v0.1.17 の js/core/subject.js を そのまま 写した もの（直す ときは 両方）。
   ユーザー「ころたまの ぬいぐるみの 判定が 良かった。まなびモンスターにも」→ A「そのまま ドット絵に」。
   紙の 絵（白い 紙に かいた 絵）は いままでどおり photo.js の しくみ。紙が 見つからない 写真だけ こちら。
   手順の 説明は ころたまの manabi-tamago/docs/v0.1.17写真の主役を切りぬくメモ.md と、
   まなびモンスターの docs/v14.47ぬいぐるみを切りぬくメモ.md。
   通信なし・端末の 中だけ。しらべるのは 320px（photo.js と 同じ）。部品（workCanvas・dilate・bbox）は MQ.ui.photo.parts を 借りる。
     MQ.subject.isPaper(img, crop)  → 紙の 絵か（true なら いままでの photo.js）
     MQ.subject.mask(p, W, H)       → { m: Uint8Array, box, bg, fg } か null
     MQ.subject.levels(p, m, W, H)  → 明るさを そろえた RGB（Float32Array・W*H*3）
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.subject = (function () {
  const OUT = 256;
  const FL = { r2: true, r3: false };   // r3（背景に まあまあ ちかく へりも ゆるい なら 入る）は 暗い 写真で ぬいぐるみの 中まで 入った ので 使わない   // しらべる 用の スイッチ（本番は ぜんぶ true）
  function lum(r, g, b) { return 0.299 * r + 0.587 * g + 0.114 * b; }
  /* 色の 特徴：明るさ L と、明るさで わった 色み（赤み・青み）。明るさで わる ので、ランプの 近くの 明るい 床と ふちの 暗い 床が「同じ 色」に なる（影・光の むらに 強い）。
     きょりは 明るさを 半分に 数える（影で 大きく ぶれる ため） */
  function feat(r, g, b) { const L = lum(r, g, b), k = 160 / (L + 16); return [L, (r - g) * k, ((r + g) / 2 - b) * k]; }
  function dist(a, b) { const d0 = (a[0] - b[0]) * 0.5, d1 = a[1] - b[1], d2 = a[2] - b[2]; return Math.sqrt(d0 * d0 + d1 * d1 + d2 * d2); }
  function minDist(f, cs) { let m = 1e9; for (let i = 0; i < cs.length; i++) { const d = dist(f, cs[i]); if (d < m) m = d; } return m; }
  /* k-means（特徴 3つ・6回）。かえり値：中心の ならび（重み n つき） */
  function kmeans(pts, k) {
    if (!pts.length) return [];
    const cs = [];
    for (let i = 0; i < k; i++) cs.push(pts[Math.floor(pts.length * (i + 0.5) / k)].slice());
    const lab = new Int8Array(pts.length);
    for (let it = 0; it < 6; it++) {
      const sum = cs.map(function () { return [0, 0, 0, 0]; });
      for (let i = 0; i < pts.length; i++) {
        let b = 0, bd = 1e9;
        for (let j = 0; j < cs.length; j++) { const d = dist(pts[i], cs[j]); if (d < bd) { bd = d; b = j; } }
        lab[i] = b; sum[b][0] += pts[i][0]; sum[b][1] += pts[i][1]; sum[b][2] += pts[i][2]; sum[b][3]++;
      }
      for (let j = 0; j < cs.length; j++) if (sum[j][3]) { cs[j] = [sum[j][0] / sum[j][3], sum[j][1] / sum[j][3], sum[j][2] / sum[j][3]]; cs[j].n = sum[j][3]; }
    }
    return cs.filter(function (c) { return c.n > 0; });
  }
  function dilate(m, w, h, r) { return MQ.ui.photo.parts.dilate(m, w, h, r); }
  function erode(m, w, h, r) {
    const inv = new Uint8Array(m.length);
    for (let k = 0; k < m.length; k++) inv[k] = m[k] ? 0 : 1;
    const d = dilate(inv, w, h, r);
    for (let k = 0; k < m.length; k++) inv[k] = d[k] ? 0 : 1;
    return inv;
  }
  /* 外から ぬれない ところ（あな）を うめる */
  function fillHoles(m, w, h) {
    const reach = new Uint8Array(w * h), st = [];
    function push(k) { if (reach[k] || m[k]) return; reach[k] = 1; st.push(k); }
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (st.length) {
      const k = st.pop(), x = k % w;
      if (x > 0) push(k - 1); if (x < w - 1) push(k + 1); if (k >= w) push(k - w); if (k + w < w * h) push(k + w);
    }
    const out = new Uint8Array(w * h);
    for (let k = 0; k < w * h; k++) out[k] = reach[k] ? 0 : 1;
    return out;
  }
  /* 3×3 の 多数決で ギザギザを とる */
  function majority(m, w, h) {
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let c = 0, t = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        t++; c += m[yy * w + xx];
      }
      out[y * w + x] = c * 2 > t ? 1 : 0;
    }
    return out;
  }

  /* 紙の 絵か：ふちの 帯が「明るくて 色みが ない」なら 紙（いままでの cutout に まかせる） */
  function isPaper(img, crop) {
    const cv = MQ.ui.photo.parts.workCanvas(img, crop || { x: 0, y: 0, w: 1, h: 1 });
    const W = cv.width, H = cv.height;
    let p;
    try { p = cv.getContext('2d').getImageData(0, 0, W, H).data; } catch (e) { return true; }
    return paperness(p, W, H) >= PAPER_MIN;
  }
  /* 写真ぜんたいの うち「紙らしい 点」の わりあい（0〜1）。紙らしい＝写真の 明るい ほう 3割に 入り・色みが 小さい。
     ふちの 帯だけで 見ると、くらい つくえの 上の 紙（息子さんの 絵の 写真）が 紙と 見なされなかった → ぜんたいで 数える。
     床・机・布の 上の ぬいぐるみは 背景に 色が ある ので 低い（うさぎの 写真 0.08）。白い シーツの 上の ぬいぐるみは 紙あつかい＝いままでの 道で 抜ける */
  const PAPER_MIN = 0.35;
  function paperness(p, W, H) {
    const lums = [];
    for (let i = 0; i < W * H * 4; i += 4 * 5) lums.push(lum(p[i], p[i + 1], p[i + 2]));
    lums.sort(function (a, b) { return b - a; });
    const bright = lums[Math.floor(lums.length * 0.3)];
    let n = 0, ok = 0;
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
      const i = (y * W + x) * 4, r = p[i], g = p[i + 1], b = p[i + 2];
      n++;
      const L = lum(r, g, b);
      if (L >= bright - 12 && (Math.max(r, g, b) - Math.min(r, g, b)) * 160 / (L + 16) < 26) ok++;   // 色みは 明るさで わる（暗い 写真の 床が 紙に 見えない ように）
    }
    return n ? ok / n : 1;
  }

  /* 主役の マスク */
  function mask(p, W, H) {
    const n = W * H;
    // 暗い・ねむい 写真は 色の 差が 小さく、へりが かべに ならない（暗くした うさぎの 写真で 目と ほっぺだけ のこった）
    // → さきに 写真ぜんたいの 明るさ（2〜98%）を 0〜255 に のばし、色みも 同じ 倍率で ひろげてから しらべる
    const ls = [];
    for (let k = 0; k < n; k += 3) ls.push(lum(p[k * 4], p[k * 4 + 1], p[k * 4 + 2]));
    ls.sort(function (a, b) { return a - b; });
    const lo = ls[Math.floor(ls.length * 0.02)], hi = ls[Math.floor(ls.length * 0.98)];
    // 倍率は 2.6 まで（それ以上 のばすと ざらつきが 色の 差に 見えて 背景が ばらばらに なる＝暗くした うさぎで 実測）。大きく のばす ときは 1-2-1 で ならしてから
    const gain = Math.min(4, 255 / Math.max(60, hi - lo));
    let F = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) {
      const f = feat(p[k * 4], p[k * 4 + 1], p[k * 4 + 2]);
      F[k * 3] = (f[0] - lo) * gain; F[k * 3 + 1] = f[1]; F[k * 3 + 2] = f[2];   // 色みは 明るさで わって ある ので のばさない
    }
    if (gain > 1.8) {
      const T = new Float32Array(n * 3), O = new Float32Array(n * 3);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const xl = x ? x - 1 : x, xr = x < W - 1 ? x + 1 : x; for (let c = 0; c < 3; c++) T[(y * W + x) * 3 + c] = (F[(y * W + xl) * 3 + c] + 2 * F[(y * W + x) * 3 + c] + F[(y * W + xr) * 3 + c]) / 4; }
      for (let y = 0; y < H; y++) { const yu = y ? y - 1 : y, yd = y < H - 1 ? y + 1 : y; for (let x = 0; x < W; x++) for (let c = 0; c < 3; c++) O[(y * W + x) * 3 + c] = (T[(yu * W + x) * 3 + c] + 2 * T[(y * W + x) * 3 + c] + T[(yd * W + x) * 3 + c]) / 4; }
      F = O;
    }
    const fk = function (k) { return [F[k * 3], F[k * 3 + 1], F[k * 3 + 2]]; };
    // 1) 背景の 色（ふちの 帯）と 主役の 色（まん中）
    const bw = Math.max(3, Math.round(Math.min(W, H) * 0.08));
    const cx0 = Math.round(W * 0.325), cx1 = Math.round(W * 0.675), cy0 = Math.round(H * 0.325), cy1 = Math.round(H * 0.675);
    const edgePts = [], edgeSeg = [], midPts = [];
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
      const k = y * W + x;
      if (x < bw || y < bw || x >= W - bw || y >= H - bw) {
        edgePts.push(fk(k));
        // ふちを 8つに 分ける（上左・上右・下左・下右・左上・左下・右上・右下）
        edgeSeg.push(y < bw ? (x < W / 2 ? 0 : 1) : y >= H - bw ? (x < W / 2 ? 2 : 3) : x < bw ? (y < H / 2 ? 4 : 5) : (y < H / 2 ? 6 : 7));
      } else if (x >= cx0 && x < cx1 && y >= cy0 && y < cy1) midPts.push(fk(k));
    }
    // ふちの 帯の 色を 4つに → 帯の 8% に みたない 色は 落とす（帯に 少しだけ かかった 光の 反射が「背景の 色」に なると、白っぽい ぬいぐるみまで 背景に 見えた）
    // 帯の 中で 多い 色だけ（いちばん 多い 色の 4分の1 いじょう）。ふちに かかった ぬいぐるみ（大きく とった とき）や 光の 反射は 背景の 色に しない
    // ＋ 背景の 色は ふちの あちこちに ある（8つの うち 5つ いじょうで その 区切りの 15% いじょう）。大きく とった ぬいぐるみが ふちの 2〜3か所に かかって いても 背景に しない
    const bg0 = kmeans(edgePts, 4).sort(function (a, b) { return b.n - a.n; });
    const segCnt = [0, 0, 0, 0, 0, 0, 0, 0], segHit = bg0.map(function () { return [0, 0, 0, 0, 0, 0, 0, 0]; });
    for (let i = 0; i < edgePts.length; i++) { let b = 0, bd = 1e9; for (let j = 0; j < bg0.length; j++) { const d = dist(edgePts[i], bg0[j]); if (d < bd) { bd = d; b = j; } } segCnt[edgeSeg[i]]++; segHit[b][edgeSeg[i]]++; }
    bg0.forEach(function (c, j) { c.spread = segHit[j].filter(function (h, s) { return segCnt[s] && h >= segCnt[s] * 0.15; }).length; });
    // ＋ まん中にも 多い 色は 主役かも しれない（ふちの 6割が ぬいぐるみ、という 大きく とった 写真）：まん中の 箱での わりあい ÷ ふちでの わりあい が 1.3 を こえる 色は 背景に しない
    const midHit = bg0.map(function () { return 0; });
    for (let i = 0; i < midPts.length; i++) { let b = 0, bd = 1e9; for (let j = 0; j < bg0.length; j++) { const d = dist(midPts[i], bg0[j]); if (d < bd) { bd = d; b = j; } } if (bd < 40) midHit[b]++; }
    bg0.forEach(function (c, j) { c.ratio = midPts.length ? (midHit[j] / midPts.length) / (c.n / edgePts.length) : 0; });
    let bg = bg0.filter(function (c) { return c.n >= bg0[0].n * 0.25 && c.spread >= 5 && c.ratio < 1.3; });
    if (!bg.length) { const ok = bg0.filter(function (c) { return c.spread >= 3; }); bg = (ok.length ? ok : bg0).slice().sort(function (a, b) { return a.ratio - b.ratio; }).slice(0, 1); }
    lastBgRatio = bg0.map(function (c) { return Math.round(c.ratio * 100) / 100; });
    lastBgSpread = bg0.map(function (c) { return c.spread; });
    lastBgW = bg0.map(function (c) { return Math.round(c.n / edgePts.length * 100); });
    let fg = kmeans(midPts, 4).filter(function (c) { return minDist(c, bg) > 22; });   // 背景と 同じ 色は 主役の 色に しない
    // 背景の 色との きょり（点ごと）
    const dBg = new Float32Array(n);
    for (let k = 0; k < n; k++) dBg[k] = minDist(fk(k), bg);
    // 2) ふちから 広げる
    // へり（2px はなれた 点との 色の 差）。はっきりした へりは かべ＝ふちからの 広がりは ここで 止まる。
    // 床の 光の 反射は なだらか（かべが ない）ので 背景に 吸われ、ぬいぐるみは はっきりした へりで 止まる
    const E = new Float32Array(n);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const k = y * W + x;
      E[k] = Math.max(dist(fk(k - 1), fk(k + 1)), dist(fk(k - W), fk(k + W)));
    }
    // tolBg＝背景の 色に にて いれば 背景（床の 板の すじ・影も 入る）／tolEdge＝これより はっきりした へりは こえない
    // 床の 板の すじは はっきりした へりだが 色は 背景（暗い 板の すき間）→ 背景に まあまあ ちかい（tolBg2）なら 少し はっきりした へりも こえる
    // （こえないと、板の すじで かこまれた 床の 一部が 島に なって のこる＝明るさを のばした あとで 起きた）
    // しきい値は 写真の ざらつきに 合わせる：ふちの 帯（＝背景）の dBg の 75%点・E の 中央値を ざらつきと 見る
    const eb = [], db = [];
    for (let y = 1; y < H - 1; y += 2) for (let x = 1; x < W - 1; x += 2) { if (x < bw || y < bw || x >= W - bw || y >= H - bw) { eb.push(E[y * W + x]); db.push(dBg[y * W + x]); } }
    eb.sort(function (a, b) { return a - b; }); db.sort(function (a, b) { return a - b; });
    const noiseD = db[Math.floor(db.length * 0.75)], noiseE = eb[Math.floor(eb.length * 0.5)];
    const tolBg = 20, tolEdge = 16, tolBg2 = 40, tolEdge2 = 40;
    lastTol = [noiseD, noiseE].map(Math.round);
    // 背景と 主役の「かけっこ」（測地きょり）：ふちの 背景の 点と、まん中の 主役の 点の 両方から 同時に 広げ、
    // となりへ すすむ コスト＝色の 差。先に とどいた ほうの なかまに なる。
    // ぬいぐるみの ぼやけた へりに 小さな すきまが あっても、中は 主役の 点から ずっと 安く とどく ので 背景に 吸われない
    // （ふちから だけ 広げる やり方は、すきま 1つで ぬいぐるみ ぜんぶが 背景に なった＝角に よせた うさぎで 実測）
    const own = new Int8Array(n);              // 0＝まだ／1＝背景／2＝主役
    const cost = new Float32Array(n).fill(1e9);
    // 出発点：背景＝ふちの 点の うち 背景の 色に ちかい もの＋どこでも 背景の 色に とても ちかい 点（床の 島も ここから 背景に なる）
    //         主役＝まん中の 箱の うち 背景から 遠い 点（遠い ほう 4わり）の いちばん 大きな かたまり
    const heap = [];
    function hpush(c, k) { heap.push([c, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; const t = heap[p]; heap[p] = heap[i]; heap[i] = t; i = p; } }
    function hpop() { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let s = i; if (l < heap.length && heap[l][0] < heap[s][0]) s = l; if (r < heap.length && heap[r][0] < heap[s][0]) s = r; if (s === i) break; const t = heap[s]; heap[s] = heap[i]; heap[i] = t; i = s; } } return top; }
    function seedBg(k) { if (dBg[k] < tolBg2 && cost[k] > 0) { cost[k] = 0; own[k] = 1; hpush(0, k); } }
    for (let x = 0; x < W; x++) { seedBg(x); seedBg((H - 1) * W + x); }
    for (let y = 0; y < H; y++) { seedBg(y * W); seedBg(y * W + W - 1); }
    for (let k = 0; k < n; k++) if (dBg[k] < tolBg * 0.5) seedBg(k);
    {
      const cd = [];
      for (let y = cy0; y < cy1; y++) for (let x = cx0; x < cx1; x++) cd.push(dBg[y * W + x]);
      cd.sort(function (a, b) { return a - b; });
      // まん中が ぜんぶ 主役（大きく とった）なら 主役の 半分いじょうが 出発点に なる ように、中央値と tolBg2 の あいだ
      const far = tolBg2 + Math.max(0, cd[Math.floor(cd.length * 0.5)] - tolBg2) * 0.5;
      // 候補は 写真ぜんたい（主役が まん中から ずれて いても よい）。大きさ × まん中への 近さ で いちばんの かたまりを 出発点に
      const cand = new Uint8Array(n);
      for (let k = 0; k < n; k++) if (dBg[k] >= far && own[k] === 0) cand[k] = 1;
      const lab = new Int32Array(n); let best = 0, bestS = 0, bestN = 0, id = 0;
      for (let k0 = 0; k0 < n; k0++) {
        if (!cand[k0] || lab[k0]) continue;
        id++; const st = [k0]; lab[k0] = id; let c = 0, sx = 0, sy = 0;
        while (st.length) { const k = st.pop(), x = k % W, y = (k - x) / W; c++; sx += x; sy += y; if (x > 0 && cand[k - 1] && !lab[k - 1]) { lab[k - 1] = id; st.push(k - 1); } if (x < W - 1 && cand[k + 1] && !lab[k + 1]) { lab[k + 1] = id; st.push(k + 1); } if (k >= W && cand[k - W] && !lab[k - W]) { lab[k - W] = id; st.push(k - W); } if (k + W < n && cand[k + W] && !lab[k + W]) { lab[k + W] = id; st.push(k + W); } }
        const dx = sx / c - W / 2, dy = sy / c - H / 2, dd = Math.sqrt(dx * dx + dy * dy) / (Math.min(W, H) / 2);
        const s = c * Math.max(0.05, 1 - dd * 0.7);
        if (s > bestS) { bestS = s; best = id; bestN = c; }
      }
      for (let k = 0; k < n; k++) if (lab[k] === best) { cost[k] = 0; own[k] = 2; hpush(0, k); }
      lastSeeds = bestN;
    }
    const done = new Uint8Array(n);
    while (heap.length) {
      const top = hpop(), k = top[1];
      if (done[k] || top[0] > cost[k]) continue;
      done[k] = 1;
      const x = k % W, fkk = fk(k);
      const nb = [];
      if (x > 0) nb.push(k - 1); if (x < W - 1) nb.push(k + 1); if (k >= W) nb.push(k - W); if (k + W < n) nb.push(k + W);
      for (let i = 0; i < nb.length; i++) {
        const j = nb[i]; if (done[j]) continue;
        // となりとの 差 か、その 点の へり（2px はなれた 点との 差・E）の 大きい ほう。なだらかな へり（影の がわ）も 2px で 見れば 差が 出る
        const d = Math.max(dist(fkk, fk(j)), E[j] * 0.8);
        const c = cost[k] + d * d * d * d / 10000 + 0.02;   // 大きな 差（へり）は 4乗で 高く・小さな 差（ざらつき・毛なみ）は ほぼ ただ
        if (c < cost[j]) { cost[j] = c; own[j] = own[k]; hpush(c, j); }
      }
    }
    let m = new Uint8Array(n);
    for (let k = 0; k < n; k++) m[k] = own[k] === 2 ? 1 : 0;
    const stageN = []; lastStages = stageN; lastRace = new Uint8Array(m); lastSeedMask = new Uint8Array(n); for (let k = 0; k < n; k++) lastSeedMask[k] = cost[k] === 0 ? own[k] : 0;
    stageN.push(['race', (function () { let c = 0; for (let k = 0; k < n; k++) c += m[k]; return c; })()]);
    // 床の 色の 大きな かたまり：のこった 中で「背景の 色に まあまあ ちかい（tolBg2）」点が 400 いじょう つながって いれば 床（板の すじで かこまれた 島・ぬいぐるみに くっついた 床）→ 背景へ
    {
      const like = new Uint8Array(n);
      for (let k = 0; k < n; k++) like[k] = (m[k] && dBg[k] < tolBg2) ? 1 : 0;
      const sm = majority(like, W, H);
      const lab = new Int32Array(n); const drop = new Uint8Array(n); let id = 0, any = false;
      for (let k0 = 0; k0 < n; k0++) {
        if (!sm[k0] || lab[k0]) continue;
        id++; const st = [k0]; lab[k0] = id; const mem = [];
        while (st.length) { const k = st.pop(), x = k % W; mem.push(k); if (x > 0 && sm[k - 1] && !lab[k - 1]) { lab[k - 1] = id; st.push(k - 1); } if (x < W - 1 && sm[k + 1] && !lab[k + 1]) { lab[k + 1] = id; st.push(k + 1); } if (k >= W && sm[k - W] && !lab[k - W]) { lab[k - W] = id; st.push(k - W); } if (k + W < n && sm[k + W] && !lab[k + W]) { lab[k + W] = id; st.push(k + W); } }
        if (mem.length >= 400) { mem.forEach(function (k) { drop[k] = 1; }); any = true; }
      }
      if (any) { const dd = dilate(drop, W, H, 2); for (let k = 0; k < n; k++) if (dd[k]) m[k] = 0; }
    }
    stageN.push(['patch', (function () { let c = 0; for (let k = 0; k < n; k++) c += m[k]; return c; })()]);
    // 床の 島：板の すじで かこまれて ふちから とどかなかった 床（その 中の 光の 反射も）。
    // ぬいぐるみと 細い 橋（板の すじ）で つながって いる ことが ある ので、2px けずって 橋を 切ってから かたまりごとに しらべる。
    // 島と 見るのは ①中身の 半分いじょうが 背景の 色 ②色を 2つに まとめた 多い ほうが 背景に ちかい ③へりを はさんだ 内がわ（3px）と 外がわ（4px）の 色が 同じ（床と 床）の どれか
    {
      const er = erode(m, W, H, 2);
      islandDbg = [];
      (function () { const c0 = countComps(m, W, H), c1 = countComps(er, W, H); islandDbg.push({ compsM: c0, compsEr: c1 }); })();
      const label = new Int32Array(n);
      const drop = new Uint8Array(n);
      let id = 0, dropped = 0;
      for (let k0 = 0; k0 < n; k0++) {
        if (!er[k0] || label[k0]) continue;
        id++; const st = [k0]; label[k0] = id; let cnt = 0, bgc = 0; const mem = [];
        while (st.length) {
          const k = st.pop(), x = k % W; cnt++; mem.push(k); if (dBg[k] < tolBg2) bgc++;
          if (x > 0 && er[k - 1] && !label[k - 1]) { label[k - 1] = id; st.push(k - 1); }
          if (x < W - 1 && er[k + 1] && !label[k + 1]) { label[k + 1] = id; st.push(k + 1); }
          if (k >= W && er[k - W] && !label[k - W]) { label[k - W] = id; st.push(k - W); }
          if (k + W < n && er[k + W] && !label[k + W]) { label[k + W] = id; st.push(k + W); }
        }
        let island = bgc > cnt * 0.45;
        const dbgRow = { n: cnt, bg: Math.round(bgc / cnt * 100) };
        if (cnt > 40) {
          const pts = []; for (let i = 0; i < mem.length; i += Math.max(1, Math.floor(mem.length / 400))) pts.push(fk(mem[i]));
          const cs = kmeans(pts, 2);
          dbgRow.cs = cs.map(function (c) { return [Math.round(c.n / pts.length * 100), Math.round(minDist(c, bg))]; });
          for (let i = 0; i < cs.length; i++) if (cs[i].n > pts.length * 0.45 && minDist(cs[i], bg) < tolBg2 + 8) island = true;
        }
        if (cnt > 40) {
          let same = 0, tot = 0;
          for (let i = 0; i < mem.length; i++) {
            const k = mem[i], x = k % W, y = (k - x) / W;
            let dx = 0, dy = 0;
            if (x > 0 && !er[k - 1]) dx = -1; else if (x < W - 1 && !er[k + 1]) dx = 1; else if (y > 0 && !er[k - W]) dy = -1; else if (y < H - 1 && !er[k + W]) dy = 1; else continue;
            const xi = x - dx * 3, yi = y - dy * 3, xo = x + dx * 6, yo = y + dy * 6;
            if (xi < 0 || yi < 0 || xi >= W || yi >= H || xo < 0 || yo < 0 || xo >= W || yo >= H) continue;
            const ko = yo * W + xo;
            if (dBg[ko] >= tolBg2) continue;   // 外がわが 背景の 色で ない（主役の のこり）なら 島の 証拠に しない
            tot++; if (dist(fk(yi * W + xi), fk(ko)) < tolBg2) same++;
          }
          dbgRow.ring = [tot, Math.round(same / Math.max(1, tot) * 100)];
          if (tot >= 20 && same > tot * 0.6) island = true;
        }
        if (cnt > 200) islandDbg.push(dbgRow);
        if (island) { mem.forEach(function (k) { drop[k] = 1; }); dropped++; }
      }
      if (dropped) { const dd = dilate(drop, W, H, 3); for (let k = 0; k < n; k++) if (dd[k]) m[k] = 0; }
    }
    stageN.push(['island', (function () { let c = 0; for (let k = 0; k < n; k++) c += m[k]; return c; })()]);
    // 3) まん中に 近い 大きな かたまりを 主役に
    m = keepMain(m, W, H, F);
    if (!m) return null;
    stageN.push(['main', (function () { let c = 0; for (let k = 0; k < n; k++) c += m[k]; return c; })()]);
    // 4) 色の 手本で へりを 見なおす（2回）：主役の 色＝マスクの 内がわ・背景の 色＝外がわ から 取り直す
    for (let it = 0; it < 2; it++) {
      const inner = erode(m, W, H, 3), outer = dilate(m, W, H, 6);
      const fgPts = [], bgPts = [];
      for (let k = 0; k < n; k += 2) { if (inner[k]) fgPts.push(fk(k)); else if (!outer[k]) bgPts.push(fk(k)); }
      if (fgPts.length < 40 || bgPts.length < 40) break;
      const fgC = kmeans(fgPts, 5), bgC = kmeans(bgPts, 5);
      fg = fgC;
      const band = new Uint8Array(n);
      for (let k = 0; k < n; k++) band[k] = (outer[k] && !inner[k]) ? 1 : 0;
      const nm = new Uint8Array(m);
      for (let k = 0; k < n; k++) if (band[k]) { const f = fk(k); nm[k] = minDist(f, fgC) < minDist(f, bgC) ? 1 : 0; }
      m = majority(nm, W, H);
      m = keepMain(m, W, H, F) || m;
    }
    stageN.push(['refine', (function () { let c = 0; for (let k = 0; k < n; k++) c += m[k]; return c; })()]);
    // 5) 影・くっついた 床：背景の 色（ふちの 帯で 見つけた 4色・影の 暗い 色も 入って いる）に ちかい 点は 背景へ。
    //    ただし 主役の 色（マスクの 内がわ）にも ある 色なら 主役の 一部（くまの 茶色 など）として のこす
    {
      const nm = new Uint8Array(m);
      let changed = 0;
      for (let k = 0; k < n; k++) {
        if (!m[k]) continue;
        const f = fk(k);
        if (minDist(f, bg) >= tolBg + 4) continue;
        let own = false;
        for (let j = 0; j < fg.length; j++) if (dist(fg[j], f) < 18) { own = true; break; }
        if (!own) { nm[k] = 0; changed++; }
      }
      // ここで 3×3 の 多数決は かけない（へりに そった 細い 影が まわりの 主役に 負けて もどって しまう）
      if (changed) { const mm = keepMain(nm, W, H, F); if (mm) m = mm; }
    }
    stageN.push(['shadow', (function () { let c = 0; for (let k = 0; k < n; k++) c += m[k]; return c; })()]);
    m = fillHoles(m, W, H);
    // しらべる 用：主役の 中の dBg・E の 中央値と、ふちの 帯の dBg（gain も）
    { const a = [], e = []; for (let k = 0; k < n; k += 3) if (m[k]) { a.push(dBg[k]); e.push(E[k]); } a.sort(function (x, y) { return x - y; }); e.sort(function (x, y) { return x - y; }); lastDbg = { race: lastRace, seedMask: lastSeedMask, stages: lastStages, seeds: lastSeeds, spread: lastBgSpread, ratio: lastBgRatio, bgW: lastBgW, islands: islandDbg.slice(0, 4), tol: lastTol, gain: Math.round(gain * 100) / 100, dBg: [a[Math.floor(a.length * 0.25)], a[Math.floor(a.length * 0.5)], a[Math.floor(a.length * 0.75)]].map(Math.round), E: [e[Math.floor(e.length * 0.5)], e[Math.floor(e.length * 0.9)]].map(Math.round) }; }
    const box = MQ.ui.photo.parts.bbox(m, W, H);
    return box ? { m: m, box: box, bg: bg, fg: fg, comps: lastComps } : null;
  }
  function countComps(mm, W, H) { const n = W * H, lab = new Int32Array(n), out = []; let id = 0; for (let k0 = 0; k0 < n; k0++) { if (!mm[k0] || lab[k0]) continue; id++; const st = [k0]; lab[k0] = id; let c = 0; while (st.length) { const k = st.pop(), x = k % W; c++; if (x > 0 && mm[k - 1] && !lab[k - 1]) { lab[k - 1] = id; st.push(k - 1); } if (x < W - 1 && mm[k + 1] && !lab[k + 1]) { lab[k + 1] = id; st.push(k + 1); } if (k >= W && mm[k - W] && !lab[k - W]) { lab[k - W] = id; st.push(k - W); } if (k + W < n && mm[k + W] && !lab[k + W]) { lab[k + W] = id; st.push(k + W); } } if (c > 200) out.push(c); } return out; }
  /* まん中に 近くて 大きい かたまり＋その 近く。細い ごみは 落とす */
  /* F＝特徴（へりの はっきりさを はかる：床の 光の 反射は へりが ぼやけて いる・ぬいぐるみは はっきり） */
  function keepMain(m, W, H, F) {
    const n = W * H;
    const op = dilate(erode(erode(dilate(m, W, H, 1), W, H, 1), W, H, 1), W, H, 1);   // close → open（1〜2px の 板の すじを 落とす）
    const comps = [];
    const label = new Int32Array(n);
    for (let k0 = 0; k0 < n; k0++) {
      if (!op[k0] || label[k0]) continue;
      const id = comps.length + 1, st = [k0];
      const c = { id: id, n: 0, sx: 0, sy: 0, x0: W, y0: H, x1: -1, y1: -1 };
      label[k0] = id;
      while (st.length) {
        const k = st.pop(), x = k % W, y = (k - x) / W;
        c.n++; c.sx += x; c.sy += y;
        if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
        if (x > 0 && op[k - 1] && !label[k - 1]) { label[k - 1] = id; st.push(k - 1); }
        if (x < W - 1 && op[k + 1] && !label[k + 1]) { label[k + 1] = id; st.push(k + 1); }
        if (k >= W && op[k - W] && !label[k - W]) { label[k - W] = id; st.push(k - W); }
        if (k + W < n && op[k + W] && !label[k + W]) { label[k + W] = id; st.push(k + W); }
      }
      comps.push(c);
    }
    if (!comps.length) return null;
    // へりの はっきりさ：かたまりの ふちの 点と その 外どなりの 色の 差の 平均
    const sharp = new Float32Array(comps.length + 1), scnt = new Int32Array(comps.length + 1);
    if (F) for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const k = y * W + x, id = label[k]; if (!id) continue;
      const nb = [k - 1, k + 1, k - W, k + W];
      for (let i = 0; i < 4; i++) { const j = nb[i]; if (label[j]) continue; const d0 = F[k * 3] - F[j * 3], d1 = F[k * 3 + 1] - F[j * 3 + 1], d2 = F[k * 3 + 2] - F[j * 3 + 2]; sharp[id] += Math.sqrt(d0 * d0 * 0.25 + d1 * d1 + d2 * d2); scnt[id]++; }
    }
    // 点数＝大きさ × まん中への 近さ × へりの はっきりさ
    const cxm = W / 2, cym = H / 2, R = Math.min(W, H) / 2;
    comps.forEach(function (c) {
      const dx = c.sx / c.n - cxm, dy = c.sy / c.n - cym;
      const d = Math.sqrt(dx * dx + dy * dy) / R;
      const sh = scnt[c.id] ? sharp[c.id] / scnt[c.id] : 20;
      c.sharp = sh;
      c.score = c.n * Math.max(0.05, 1 - d * 0.7) * Math.min(1.5, Math.max(0.25, sh / 18));
    });
    comps.sort(function (a, b) { return b.score - a.score; });
    lastComps = comps.slice(0, 4).map(function (c) { return { n: c.n, sharp: Math.round(c.sharp), score: Math.round(c.score), x: Math.round(c.sx / c.n), y: Math.round(c.sy / c.n) }; });
    const main = comps[0];
    if (main.n < 60) return null;
    const keep = {}; keep[main.id] = true;
    // 主役の はこの 近く（はこの 大きさの 12%）に ある 小さめの かたまりは いっしょに（耳・しっぽ など 切れた ぶん）
    const reach = Math.max(4, Math.round(Math.max(main.x1 - main.x0, main.y1 - main.y0) * 0.12));
    comps.slice(1).forEach(function (c) {
      if (c.n < main.n * 0.01 || c.n > main.n * 0.5) return;
      if (c.sharp < main.sharp * 0.5) return;   // へりが ぼやけた かけら（床の 光の 反射の のこり）は つけない
      const gx = Math.max(0, main.x0 - c.x1, c.x0 - main.x1), gy = Math.max(0, main.y0 - c.y1, c.y0 - main.y1);
      if (gx <= reach && gy <= reach) keep[c.id] = true;
    });
    const out = new Uint8Array(n);
    for (let k = 0; k < n; k++) out[k] = keep[label[k]] ? 1 : 0;
    return out;
  }

  /* ---- 絵に する ---- */
  function softAlpha(m, w, h, r) {
    const a = new Float32Array(w * h), nn = (2 * r + 1) * (2 * r + 1);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let c = 0;
      for (let dy = -r; dy <= r; dy++) { const yy = Math.min(h - 1, Math.max(0, y + dy)); for (let dx = -r; dx <= r; dx++) { const xx = Math.min(w - 1, Math.max(0, x + dx)); c += m[yy * w + xx]; } }
      a[y * w + x] = c / nn;
    }
    return a;
  }
  function place(src, W, H, box, outSize) {
    const OUT = outSize || 256;
    const cv = document.createElement('canvas');
    cv.width = OUT; cv.height = OUT;
    const g = cv.getContext('2d');
    const bw = box.x1 - box.x0 + 1, bh = box.y1 - box.y0 + 1;
    const k = Math.min((OUT * 0.9) / bw, (OUT * 0.9) / bh);
    const dw = bw * k, dh = bh * k;
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(src, box.x0, box.y0, bw, bh, (OUT - dw) / 2, OUT * 0.95 - dh, dw, dh);
    return cv;
  }
  /* 明るさを ととのえる：主役の 中の 明るさの 2〜98% を 16〜250 に のばす（暗い 室内でも 明るく）。色みは 少し こく */
  function levels(p, m, W, H) {
    const ls = [];
    for (let k = 0; k < W * H; k += 2) if (m[k]) ls.push(lum(p[k * 4], p[k * 4 + 1], p[k * 4 + 2]));
    ls.sort(function (a, b) { return a - b; });
    const lo = ls.length ? ls[Math.floor(ls.length * 0.02)] : 0, hi = ls.length ? ls[Math.floor(ls.length * 0.98)] : 255;
    const k = (250 - 16) / Math.max(40, hi - lo);
    const out = new Float32Array(W * H * 3);
    for (let i = 0; i < W * H; i++) {
      const r = p[i * 4], g = p[i * 4 + 1], b = p[i * 4 + 2];
      const L = lum(r, g, b), L2 = 16 + (L - lo) * k, t = L2 / Math.max(1, L);
      const mean = (r + g + b) / 3;
      out[i * 3] = Math.max(0, Math.min(255, (mean + (r - mean) * 1.2) * t));
      out[i * 3 + 1] = Math.max(0, Math.min(255, (mean + (g - mean) * 1.2) * t));
      out[i * 3 + 2] = Math.max(0, Math.min(255, (mean + (b - mean) * 1.2) * t));
    }
    return out;
  }
  function renderRaw(q, m, W, H, box) {
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const od = g.createImageData(W, H);
    const a = softAlpha(m, W, H, 1);
    for (let k = 0; k < W * H; k++) {
      od.data[k * 4] = Math.round(q[k * 3]); od.data[k * 4 + 1] = Math.round(q[k * 3 + 1]); od.data[k * 4 + 2] = Math.round(q[k * 3 + 2]);
      od.data[k * 4 + 3] = Math.round(a[k] * 255);
    }
    g.putImageData(od, 0, 0);
    return place(cv, W, H, box);
  }
  /* 絵本ふう：主役の 色を 8色に まとめ、5×5 の 多数決で 平らに。目・口（暗い）と ほっぺ（色の こい）は そのまま のこす */
  function renderSoft(q, m, W, H, box, opt) {
    opt = opt || {};
    const win = opt.win || 2, OUTS = opt.out || OUT;
    const n = W * H;
    const pts = [];
    for (let k = 0; k < n; k += 2) if (m[k]) pts.push([q[k * 3], q[k * 3 + 1], q[k * 3 + 2]]);
    // RGB の k-means（8色・明るさの 順に ならべて 出発）。opt.chroma＝色みを 重く した きょり（うすい ピンクの ほっぺ・耳が クリーム色に とけない・まなびモンスター v14.47）
    const K = opt.K || 8;
    const cd = opt.chroma
      ? function (a, b) { const dl = (lum(a[0], a[1], a[2]) - lum(b[0], b[1], b[2])) * 0.6, d1 = ((a[0] - a[1]) - (b[0] - b[1])) * 1.8, d2 = (((a[0] + a[1]) / 2 - a[2]) - ((b[0] + b[1]) / 2 - b[2])) * 1.8; return dl * dl + d1 * d1 + d2 * d2; }
      : function (a, b) { return (a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]) + (a[2] - b[2]) * (a[2] - b[2]); };
    pts.sort(function (a, b) { return lum(a[0], a[1], a[2]) - lum(b[0], b[1], b[2]); });
    let cs = [];
    for (let i = 0; i < K; i++) cs.push(pts.length ? pts[Math.floor(pts.length * (i + 0.5) / K)].slice() : [128, 128, 128]);
    if (opt.chroma && pts.length) {   // はじめの 種は 色みの はなれた 点から（ピンクが 種に 入る）
      const step = Math.max(1, Math.ceil(pts.length / 1500));
      cs = [pts[Math.floor(pts.length / 2)].slice()];
      while (cs.length < K) { let far = null, fd = -1; for (let i = 0; i < pts.length; i += step) { let md = 1e9; for (let j = 0; j < cs.length; j++) { const d = cd(pts[i], cs[j]); if (d < md) md = d; } if (md > fd) { fd = md; far = pts[i]; } } if (!far || fd < 100) break; cs.push(far.slice()); }
    }
    let csN = cs.map(function () { return 0; });
    for (let it = 0; it < 6; it++) {
      const sum = cs.map(function () { return [0, 0, 0, 0]; });
      pts.forEach(function (c) { let b = 0, bd = 1e9; for (let j = 0; j < cs.length; j++) { const d = cd(c, cs[j]); if (d < bd) { bd = d; b = j; } } sum[b][0] += c[0]; sum[b][1] += c[1]; sum[b][2] += c[2]; sum[b][3]++; });
      cs = cs.map(function (c, j) { return sum[j][3] ? [sum[j][0] / sum[j][3], sum[j][1] / sum[j][3], sum[j][2] / sum[j][3]] : c; });
      csN = sum.map(function (x) { return x[3]; });
    }
    const cs0 = cs.map(function (c) { return c.slice(); });   // 点を あてる 用（ぬる 色を 変える 前）
    if (opt.chroma) {
      /* 灰色っぽい 中くらいの 明るさの 色（ぬいぐるみの 体の かげ）は、いちばん 多い 色みの ある 色の こい 色に（灰色の しみに 見えない） */
      let main = -1, mn = -1;
      cs.forEach(function (c, j) { const ch = Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]), L = lum(c[0], c[1], c[2]); if (ch >= 12 && L > 120 && csN[j] > mn) { mn = csN[j]; main = j; } });
      if (main >= 0) cs = cs.map(function (c, j) { const ch = Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]), L = lum(c[0], c[1], c[2]); if (j === main || ch >= 20 || L < 90 || L > 215) return c; const mc = cs[main], k = Math.max(0.78, Math.min(0.92, L / lum(mc[0], mc[1], mc[2]))); return [mc[0] * k, mc[1] * k, mc[2] * k]; });
    }
    // クレヨンの 色みに 少し 寄せる（さいどを 上げ・白は 紙の 白・黒は 線の 色）
    cs = cs.map(function (c) {
      const L = lum(c[0], c[1], c[2]), ch = Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]);
      if (ch < 24 && L > 200) return [255, 253, 247];
      if (ch < 30 && L < 70) return [74, 59, 50];
      const mean = (c[0] + c[1] + c[2]) / 3;
      return c.map(function (v) { return Math.max(0, Math.min(255, mean + (v - mean) * 1.3)); });
    });
    const lab = new Int8Array(n).fill(-1);
    for (let k = 0; k < n; k++) {
      if (!m[k]) continue;
      let b = 0, bd = 1e9;
      const pc = [q[k * 3], q[k * 3 + 1], q[k * 3 + 2]];
      for (let j = 0; j < cs.length; j++) { const d = cd(pc, cs0[j]); if (d < bd) { bd = d; b = j; } }
      lab[k] = b;
    }
    // こまかい ところ（目・口・ほっぺ）：暗い 色か、色の こい 色。多数決で 消さない
    const dark = cs.map(function (c) { return lum(c[0], c[1], c[2]) < 110 || Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 60; });
    const out = new Int8Array(n);
    const cnt = new Int32Array(cs.length);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = y * W + x;
      if (lab[k] < 0) { out[k] = -1; continue; }
      if (dark[lab[k]]) { out[k] = lab[k]; continue; }   // 目・口は そのまま
      cnt.fill(0); let best = lab[k], bv = 0;
      for (let dy = -win; dy <= win; dy++) for (let dx = -win; dx <= win; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const l = lab[yy * W + xx]; if (l < 0 || dark[l]) continue;
        cnt[l]++; if (cnt[l] > bv) { bv = cnt[l]; best = l; }
      }
      out[k] = best;
    }
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const od = g.createImageData(W, H);
    const a = softAlpha(m, W, H, opt.edge || 2);
    // 輪かく（opt.line）：主役の そとの ふち（line px）を こい 色に（ゲームの モンスターらしく）
    let edgeM = null;
    if (opt.line) {
      const er = erode(m, W, H, opt.line);
      edgeM = new Uint8Array(n);
      for (let k = 0; k < n; k++) if (m[k] && !er[k]) edgeM[k] = 1;
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = y * W + x;
      let r = 0, gg = 0, b = 0, ws = 0;
      if (edgeM && edgeM[k]) { const lc = opt.lineColor || [74, 59, 50]; od.data[k * 4] = lc[0]; od.data[k * 4 + 1] = lc[1]; od.data[k * 4 + 2] = lc[2]; od.data[k * 4 + 3] = Math.round(a[k] * 255); continue; }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const l = out[yy * W + xx]; if (l < 0) continue;
        const wgt = (dx ? 1 : 2) * (dy ? 1 : 2);
        r += cs[l][0] * wgt; gg += cs[l][1] * wgt; b += cs[l][2] * wgt; ws += wgt;
      }
      if (!ws) continue;
      od.data[k * 4] = Math.round(r / ws); od.data[k * 4 + 1] = Math.round(gg / ws); od.data[k * 4 + 2] = Math.round(b / ws);
      od.data[k * 4 + 3] = Math.round(a[k] * 255);
    }
    g.putImageData(od, 0, 0);
    return place(cv, W, H, box, OUTS);
  }

  let lastInfo = null, lastComps = null, lastDbg = null, lastTol = null, islandDbg = [], lastBgW = null, lastSeeds = 0, lastBgSpread = null, lastBgRatio = null, lastStages = null, lastRace = null, lastSeedMask = null;
  function fromImage(img, crop) {
    const cv = MQ.ui.photo.parts.workCanvas(img, crop || { x: 0, y: 0, w: 1, h: 1 });
    const W = cv.width, H = cv.height;
    let data;
    try { data = cv.getContext('2d').getImageData(0, 0, W, H); } catch (e) { return { drawn: 0, error: 'canvas' }; }
    const p = data.data;
    const r = mask(p, W, H);
    if (!r) return { drawn: 0, dark: false, kind: 'object' };
    let dim = 0; for (let k = 0; k < W * H; k += 7) dim += lum(p[k * 4], p[k * 4 + 1], p[k * 4 + 2]);
    dim /= Math.ceil(W * H / 7);
    const q = levels(p, r.m, W, H);
    const raw = renderRaw(q, r.m, W, H, r.box);
    const soft = renderSoft(q, r.m, W, H, r.box);
    lastInfo = { dbg: lastDbg, comps: r.comps, drawn: r.box.n, box: r.box, W: W, H: H, dark: dim < 90, kind: 'object', bg: r.bg, fg: r.fg, mask: r.m };
    return { raw: MQ.cutout.stages(raw), soft: MQ.cutout.stages(soft), drawn: r.box.n, dark: dim < 90, kind: 'object', box: r.box };
  }
  /* まなびモンスター：切りぬいた 写真（ころたまの「そのまま」と 同じ 作り方）。q＝levels の RGB・m＝マスク・r＝ふちの やわらかさ・out＝できあがりの 大きさ */
  function photo(q, m, W, H, box, r, out) {
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const od = g.createImageData(W, H);
    const a = softAlpha(m, W, H, r || 1);
    for (let k = 0; k < W * H; k++) {
      od.data[k * 4] = Math.round(q[k * 3]); od.data[k * 4 + 1] = Math.round(q[k * 3 + 1]); od.data[k * 4 + 2] = Math.round(q[k * 3 + 2]);
      od.data[k * 4 + 3] = Math.round(a[k] * 255);
    }
    g.putImageData(od, 0, 0);
    const O = out || OUT;
    const c2 = document.createElement('canvas');
    c2.width = O; c2.height = O;
    const g2 = c2.getContext('2d');
    const bw = box.x1 - box.x0 + 1, bh = box.y1 - box.y0 + 1;
    const k = Math.min((O * 0.9) / bw, (O * 0.9) / bh);
    const dw = bw * k, dh = bh * k;
    g2.imageSmoothingEnabled = true; g2.imageSmoothingQuality = 'high';
    g2.drawImage(cv, box.x0, box.y0, bw, bh, (O - dw) / 2, O * 0.95 - dh, dw, dh);
    return c2;
  }
  return { flags: FL, isPaper: isPaper, paperness: paperness, PAPER_MIN: PAPER_MIN, mask: mask, levels: levels, feat: feat, photo: photo, soft: renderSoft, info: function () { return lastInfo; } };
})();
