/* ---------------------------------------------------------
   写真から じぶんの モンスターを つくる（v2.7 で 作り直し）

   ① カメラで 紙に かいた 絵を とる
   ② わくは 自動で 絵に 合わせる（手でも 動かせる）
   ③ 紙を すけさせて、線を のこしたまま ドット絵に する
   ④ なまえと 出てくる エリアを えらぶ
   ⑤ つぎの バトルから ほんとうに 出てくる／図かんにも のる

   v2.6 までは 24マスに ちぢめて 明るさで 紙を 消していたので、
   細い 線が 消えて「ぜんぜん ちがう 姿」に なっていた（息子さんの 感想）。
   v2.7 の 作りかた：
     ・切りぬいた ところを 320px に して しらべる
     ・紙の 明るさは 場所ごとに 見る（かげが あっても OK）
     ・紙は「外から つながっている ところ」だけ 消す（目の 白は のこる）
     ・64マス（48／96 も えらべる）に 落とすとき、マスの 中に 1つでも
       こい線が あれば 線の 色に する（線が 消えない）
     ・色は 絵に ある 色から 16色を えらんで そろえる（ドット絵らしく）
     ・絵の まわりの 余白を 切って、マスいっぱいに 入れる

   v3.2（2026-08-31）：息子さんの 本物の 絵（夜の 室内・えんぴつ）で ためしたら
   ほぼ 何も 出なかった ので、しらべかたを 作り直した。
     ・写真を「白い 紙に かいた 色」に 直してから 見る（紙の 色で わる）
     ・しきい値は 写真ごとに 自動（紙の ゆらぎから）。スライダーは その 倍率
     ・うすい えんぴつの 線も「紙より 暗い」で ひろう。色の 線も 線
     ・わくの 中の 本体だけ（題名・仕切りの 線・となりの 絵は 外す）
     ・自動わくは 先に「紙」を 見つけて、その 中の 絵を えらぶ（つくえや キーボードを えらばない）
     ・わくは 長方形でも OK（できあがりは 絵の はんいで 正方形に する）

   写真は 外に 送りません。小さな ドット絵だけを タブレットの 中に
   ほぞんします（1体 数キロバイト）。

   v2.8「AIで かっこよく する」：おうちの人が おうちの人ページで AIの かぎを
   入れた ときだけ、金の ボタンが 出る。切りぬいた 絵を Google の 画像AI に
   送って「絵に 忠実な まま ゲームの モンスターらしく」かき直して もらい、
   その 絵を 上の しくみで ドット絵に する（js/core/ai.js）。
   「もとの しゃしんに もどす」で AI前に もどれる。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};
MQ.ui = MQ.ui || {};

MQ.ui.photo = (function () {
  const h = MQ.util.h;
  const WORK = 320;                 // しらべる ときの 大きさ（長い ほう。たてよこの 比は そのまま）
  const SIZES = [[48, 'あらい'], [64, 'ふつう'], [96, 'こまかい']];
  let size = 96;                    // ドット絵の マス数（初期は こまかい・v3.3）
  let autoClean = true;             // じどうで きれいに（v3.3・自動補正）
  let img = null;                   // 読みこんだ 写真
  let crop = { x: 0.15, y: 0.15, w: 0.7, h: 0.7 };   // わく（0〜1の わりあい・長方形で OK）
  let tol = 55;                     // 「はいけいを 消す」（55 = 自動の しきい値の まま。大きいほど よく 消える）
  let inkLv = 50;                   // 線の こさ（大きいほど 線を ひろう）
  let outUrl = '';
  let lastInfo = null;              // できあがりの 情報（テスト用）
  // AI（v2.8）
  const SEND = 640;                 // AIに 送る 絵の 大きさ（正方形）
  let origImg = null;               // AIに 送る 前の 写真（もどす 用）
  let origCrop = null;
  let aiBusy = false;               // AIに たのんで まっている
  let aiUsed = false;               // いまの 絵は AIが かいた もの
  let aiError = '';
  let edited = '';                  // ドット絵エディタで 直した 絵（v2.9）。あれば これを つかう

  /* =======================================================
     しらべる 道具（v3.2 で 作り直し）
       ・紙の 色は 場所ごと（8×8）に R・G・B で しらべ、写真を「白い 紙に かいた 色」に
         直してから 見る（暗い 写真・黄色い 電灯・かげ でも 同じ 結果に なる）
       ・「紙かどうか」の しきい値は 写真ごとに 自動（紙の ゆらぎの 3倍）。
         スライダー「はいけいを 消す」は その 倍率（55 = 自動の まま）
       ・線は「紙より どれだけ 暗いか」で ひろう（うすい えんぴつでも のこる）。色の 線も 線
       ・線の すきま（2px）は うめて 見るので、線で 囲まれた 白い ところ（ガイコツの 顔）は 絵の 中
       ・わくの 中の「いちばん 大きな かたまり」と その 近くだけを つかう
         （題名・仕切りの 線・となりの 絵は 外す）
     ======================================================= */
  function lumOf(r, g, b) { return 0.299 * r + 0.587 * g + 0.114 * b; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* 場所ごとの「紙の 色」[r,g,b]。8×8 の ますに 分けて、色みの ない 点の うち 明るい ほうから
     5〜15% の 平均を その ますの 紙と 考える（色えんぴつの 塗りは 紙の 候補に しない）。
     候補が 足りない ます・暗い ます（絵で うまっている・つくえ）は 明るい ますの 平均に 合わせる。
     かえり値：(x, y) → [r, g, b]（あいだは なめらかに つなぐ） */
  function paperMap(p, w, hh) {
    const G = 8;
    const cw = w / G, ch = hh / G;
    // 紙の 色み：明るい 3割の 点の 色みの 中央値（黄色い 電灯なら 紙も 少し 黄色い）。これより はっきり 色が ある 点は 候補に しない
    const all = [];
    for (let y = 0; y < hh; y += 3) {
      for (let x = 0; x < w; x += 3) {
        const i = (y * w + x) * 4;
        all.push([lumOf(p[i], p[i + 1], p[i + 2]), Math.max(p[i], p[i + 1], p[i + 2]) - Math.min(p[i], p[i + 1], p[i + 2])]);
      }
    }
    all.sort(function (a, b) { return b[0] - a[0]; });
    const top = all.slice(0, Math.max(1, Math.floor(all.length * 0.3))).map(function (a) { return a[1]; }).sort(function (a, b) { return a - b; });
    const sPaper = top[top.length >> 1] + 14;
    const cells = [];
    for (let gy = 0; gy < G; gy++) {
      for (let gx = 0; gx < G; gx++) {
        const arr = [];
        const x0 = Math.floor(gx * cw), y0 = Math.floor(gy * ch);
        const x1 = Math.floor((gx + 1) * cw), y1 = Math.floor((gy + 1) * ch);
        for (let y = y0; y < y1; y += 2) {
          for (let x = x0; x < x1; x += 2) {
            const i = (y * w + x) * 4;
            const r = p[i], g = p[i + 1], b = p[i + 2];
            if (Math.max(r, g, b) - Math.min(r, g, b) > sPaper) continue;
            arr.push([lumOf(r, g, b), r, g, b]);
          }
        }
        if (arr.length < 12) { cells.push(null); continue; }
        arr.sort(function (a, b) { return b[0] - a[0]; });
        const a = Math.floor(arr.length * 0.05), b = Math.max(a + 1, Math.floor(arr.length * 0.15));
        let r = 0, g = 0, bl = 0, n = 0;
        for (let k = a; k < b && k < arr.length; k++) { r += arr[k][1]; g += arr[k][2]; bl += arr[k][3]; n++; }
        cells.push(n ? [r / n, g / n, bl / n] : null);
      }
    }
    const lums = cells.map(function (c) { return c ? lumOf(c[0], c[1], c[2]) : -1; });
    const sorted = lums.filter(function (v) { return v >= 0; }).sort(function (a, b) { return b - a; });
    const bright = sorted.length ? sorted[Math.floor(sorted.length * 0.25)] : 255;
    let br = 0, bg = 0, bb = 0, bn = 0;
    cells.forEach(function (c, i) { if (c && lums[i] >= bright - 25) { br += c[0]; bg += c[1]; bb += c[2]; bn++; } });
    const ref = bn ? [br / bn, bg / bn, bb / bn] : [255, 255, 255];
    cells.forEach(function (c, i) { if (!c || lums[i] < bright - 60) cells[i] = ref; });
    return function (x, y) {
      const fx = clamp(x / cw - 0.5, 0, G - 1), fy = clamp(y / ch - 0.5, 0, G - 1);
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      const x1 = Math.min(G - 1, x0 + 1), y1 = Math.min(G - 1, y0 + 1);
      const tx = fx - x0, ty = fy - y0;
      const out = [0, 0, 0];
      for (let k = 0; k < 3; k++) {
        const a = cells[y0 * G + x0][k] * (1 - tx) + cells[y0 * G + x1][k] * tx;
        const b = cells[y1 * G + x0][k] * (1 - tx) + cells[y1 * G + x1][k] * tx;
        out[k] = a * (1 - ty) + b * ty;
      }
      return out;
    };
  }

  /* 写真を「白い 紙に かいた 色」に 直す（紙の 色で わる）。
     かえり値：Float32Array（r, g, b が 0〜255・紙は ほぼ 255,255,255） */
  function normalize(p, w, hh) {
    const paper = paperMap(p, w, hh);
    const q = new Float32Array(w * hh * 3);
    for (let y = 0; y < hh; y++) {
      let pp = null;
      for (let x = 0; x < w; x++) {
        if ((x & 3) === 0) pp = paper(x + 1.5, y);
        const i = (y * w + x) * 4, k = (y * w + x) * 3;
        q[k] = Math.min(255, p[i] * 255 / Math.max(8, pp[0]));
        q[k + 1] = Math.min(255, p[i + 1] * 255 / Math.max(8, pp[1]));
        q[k + 2] = Math.min(255, p[i + 2] * 255 / Math.max(8, pp[2]));
      }
    }
    return q;
  }

  /* 「紙でない」と 見なす しきい値を 写真ごとに 決める。
     d = 紙より どれだけ 暗いか、s = 色み。紙らしい 点（d < 100・s < 40）の 中央値と
     ばらつき（MAD）から「ゆらぎの 3倍」を しきい値に する。box が あれば その 中だけ 見る */
  function thresholds(q, w, hh, box) {
    const all = [];
    const x0 = box ? box.x0 : 0, y0 = box ? box.y0 : 0, x1 = box ? box.x1 : w - 1, y1 = box ? box.y1 : hh - 1;
    for (let y = y0; y <= y1; y += 2) {
      for (let x = x0; x <= x1; x += 2) {
        const k = (y * w + x) * 3;
        const r = q[k], g = q[k + 1], b = q[k + 2];
        const d = 255 - lumOf(r, g, b);
        const s = Math.max(r, g, b) - Math.min(r, g, b);
        if (d < 60 && s < 40) all.push([d, s]);
      }
    }
    function medMad(arr) {
      if (!arr.length) return [0, 0];
      const a = arr.slice().sort(function (x, y) { return x - y; });
      const m = a[a.length >> 1];
      const dev = a.map(function (v) { return Math.abs(v - m); }).sort(function (x, y) { return x - y; });
      return [m, dev[dev.length >> 1] * 1.4826];
    }
    // 1回目：ざっくり → 2回目：紙の 山（中央値＋3σ）の 中だけで もう一度（えんぴつの 塗りに 引きずられない）
    let md = medMad(all.map(function (v) { return v[0]; })), ms = medMad(all.map(function (v) { return v[1]; }));
    const lim = md[0] + 3 * Math.max(md[1], 2), limS = ms[0] + 3 * Math.max(ms[1], 2);
    const inner = all.filter(function (v) { return v[0] <= lim && v[1] <= limS; });
    if (inner.length > 200) { md = medMad(inner.map(function (v) { return v[0]; })); ms = medMad(inner.map(function (v) { return v[1]; })); }
    return {
      d: clamp(md[0] + 3 * Math.max(md[1], 2), 8, 45),
      s: clamp(ms[0] + 3 * Math.max(ms[1], 2), 12, 60)
    };
  }

  /* マスクを ふくらませる（半径 r・四角）。線の すきまを うめる ため */
  function dilate(m, w, hh, r) {
    const t = new Uint8Array(w * hh), out = new Uint8Array(w * hh);
    for (let y = 0; y < hh; y++) {
      const row = y * w;
      let cnt = 0;
      for (let x = -r; x < w; x++) {
        const xi = x + r; if (xi < w && m[row + xi]) cnt++;
        const xo = x - r - 1; if (xo >= 0 && m[row + xo]) cnt--;
        if (x >= 0) t[row + x] = cnt > 0 ? 1 : 0;
      }
    }
    for (let x = 0; x < w; x++) {
      let cnt = 0;
      for (let y = -r; y < hh; y++) {
        const yi = y + r; if (yi < hh && t[yi * w + x]) cnt++;
        const yo = y - r - 1; if (yo >= 0 && t[yo * w + x]) cnt--;
        if (y >= 0) out[y * w + x] = cnt > 0 ? 1 : 0;
      }
    }
    return out;
  }

  /* 端から 端まで とどく まっすぐな 線（紙の 仕切り・ノートの 罫線）を 消す。
     よこ ±6°・たて ±6° で さがし、つぎの ぜんぶを 満たす 線だけ 消す：
       ・はばの 85% いじょうに わたり、7割 いじょうの 列に 点が あり、切れ目が 6% 以下（途切れない）
       ・帯の 中の 点に ゆるい 曲線（2次式・紙の たわみ ぶん）を あてはめると ずれ（RMS）が 1px 以下（絵の 曲線は ここで 落ちる）
       ・半分 いじょうの ところで 細い（±4px の 両がわに 絵が ない）
       ・えんぴつ色（色みが ない）が 7割 いじょう（色えんぴつの 塗りの すじは 消さない）
     消すのは あてはめた 線から 1.5px 以内の 細い 点だけ（線と 交わる 絵・くっついた 塗りは のこす）。
     絵の 中の 直線（本の へり など）は 端まで とどかない ので 消えない */
  function removeLines(m, q, w, hh, loose) {
    // loose = 写真ぜんたい（自動わく）の とき：ちぢめて 見るので 少し ゆるく（絵は 小さく、端まで とどく 線は 仕切りだけ）
    const rmsMax = loose ? 1.8 : 1, colsMin = loose ? 0.6 : 0.7, gapMax = loose ? 0.1 : 0.06;
    const pts = [];
    for (let k = 0; k < m.length; k++) if (m[k]) pts.push(k);
    if (pts.length < 50) return m;
    const out = new Uint8Array(m);
    [false, true].forEach(function (vert) {
      const len = vert ? hh : w, other = vert ? w : hh;
      for (let ai = -8; ai <= 8; ai++) {
        const t = Math.tan(ai * 0.75 * Math.PI / 180);
        const off = Math.ceil(Math.abs(t) * len) + 2;
        const votes = new Int32Array(other + off * 2 + 2);
        pts.forEach(function (k) {
          const x = k % w, y = (k - x) / w;
          votes[(vert ? Math.round(x - y * t) : Math.round(y - x * t)) + off]++;
        });
        for (let b = 1; b < votes.length - 1; b++) {
          if (votes[b - 1] + votes[b] + votes[b + 1] < len * 0.5) continue;
          if (votes[b] < votes[b - 1] || votes[b] < votes[b + 1]) continue;     // 山の てっぺんだけ
          const o0 = b - off;
          // 帯（±2px）の 中の 点を あつめる：s = 線に そった 位置、u = 帯の 中の 位置
          const hit = [];
          for (let s = 0; s < len; s++) {
            const c = Math.round(o0 + s * t);
            for (let dd = -2; dd <= 2; dd++) {
              const x = vert ? c + dd : s, y = vert ? s : c + dd;
              if (x < 0 || y < 0 || x >= w || y >= hh) continue;
              const k = y * w + x;
              if (m[k]) hit.push({ k: k, s: s, u: vert ? x : y, x: x, y: y });
            }
          }
          if (hit.length < len * 0.5) continue;
          // ゆるい 曲線（u = a + b s + c s²・紙の たわみ ぶん）を あてはめる（2回：1回目で 大きく はずれた 点を のぞく）
          let a = 0, bb = 0, cc = 0, keep = hit;
          function fit(pts2) {
            // 最小二乗（正規方程式 3×3）。s は 0〜1 に 直して 計算
            let S0 = 0, S1 = 0, S2 = 0, S3 = 0, S4 = 0, T0 = 0, T1 = 0, T2 = 0;
            pts2.forEach(function (h) { const x = h.s / len, y = h.u; const x2 = x * x; S0++; S1 += x; S2 += x2; S3 += x2 * x; S4 += x2 * x2; T0 += y; T1 += x * y; T2 += x2 * y; });
            const M = [[S0, S1, S2, T0], [S1, S2, S3, T1], [S2, S3, S4, T2]];
            for (let i = 0; i < 3; i++) {
              let p = i; for (let r = i + 1; r < 3; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r;
              const tmp = M[i]; M[i] = M[p]; M[p] = tmp;
              if (Math.abs(M[i][i]) < 1e-12) return null;
              for (let r = 0; r < 3; r++) { if (r === i) continue; const f = M[r][i] / M[i][i]; for (let k = i; k < 4; k++) M[r][k] -= f * M[i][k]; }
            }
            return [M[0][3] / M[0][0], M[1][3] / M[1][1], M[2][3] / M[2][2]];
          }
          function at(sv) { const x = sv / len; return a + bb * x + cc * x * x; }
          let ok = true;
          for (let it = 0; it < 2; it++) {
            const f = fit(keep);
            if (!f) { ok = false; break; }
            a = f[0]; bb = f[1]; cc = f[2];
            keep = hit.filter(function (h) { return Math.abs(h.u - at(h.s)) <= 2; });
            if (keep.length < len * 0.4) { ok = false; break; }
          }
          if (!ok) continue;
          let rss = 0;
          keep.forEach(function (h) { const r = h.u - at(h.s); rss += r * r; });
          if (Math.sqrt(rss / keep.length) > rmsMax) continue;                // 線に そっていない → 絵の 曲線
          // 列ごとの 途切れ・細さ・色
          const colHit = new Uint8Array(len), colThin = new Uint8Array(len);
          let pencil = 0;
          keep.forEach(function (h) {
            colHit[h.s] = 1;
            const ax = vert ? h.x + 4 : h.x, ay = vert ? h.y : h.y + 4, bx = vert ? h.x - 4 : h.x, by = vert ? h.y : h.y - 4;
            h.thick = ax < w && ay < hh && m[ay * w + ax] && bx >= 0 && by >= 0 && m[by * w + bx];
            if (!h.thick) colThin[h.s] = 1;
            if (Math.max(q[h.k * 3], q[h.k * 3 + 1], q[h.k * 3 + 2]) - Math.min(q[h.k * 3], q[h.k * 3 + 1], q[h.k * 3 + 2]) < 38) pencil++;
          });
          let cols = 0, thinCols = 0, first = -1, last = -1, gap = 0, maxGap = 0;
          for (let s = 0; s < len; s++) {
            if (colHit[s]) { if (first >= 0 && gap > maxGap) maxGap = gap; gap = 0; cols++; if (colThin[s]) thinCols++; if (first < 0) first = s; last = s; }
            else if (first >= 0) gap++;
          }
          if (last - first < len * 0.85) continue;                            // 端まで とどかない → 絵の 一部
          if (cols < len * colsMin || maxGap > len * gapMax) continue;        // 途切れる → 絵の 一部
          if (thinCols < cols * 0.5) continue;                                // 太い → 塗りの へり（絵が 線に くっついている ところは 太い ので 半分で よい）
          if (pencil < keep.length * 0.7) continue;                           // 色が ある → 色えんぴつの すじ
          keep.forEach(function (h) { if (!h.thick && Math.abs(h.u - at(h.s)) <= 1.5) out[h.k] = 0; });
        }
      }
    });
    return out;
  }

  /* 「紙でない」点の マスク（紙より 暗い or 色が ある）。ぽつんと ある ごみと 長い まっすぐな 線は 消す */
  function notPaperMask(q, w, hh, thr, loose) {
    const np = new Uint8Array(w * hh);
    for (let k = 0; k < w * hh; k++) {
      const r = q[k * 3], g = q[k * 3 + 1], b = q[k * 3 + 2];
      const d = 255 - lumOf(r, g, b);
      const s = Math.max(r, g, b) - Math.min(r, g, b);
      if (d > thr.d || s > thr.s) np[k] = 1;
    }
    const cl = removeLines(np, q, w, hh, loose);
    for (let y = 1; y < hh - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const k = y * w + x;
        if (!cl[k]) continue;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && cl[k + dy * w + dx]) n++;
        if (n <= 2) cl[k] = 0;
      }
    }
    return cl;
  }

  /* 「絵の 一部」の マスク：外から つながる 紙だけ 背景に する。
     線の すきまは 半径 2 で うめて 見るので、線で 囲まれた 白い ところは 絵の 中（目の 白・ガイコツの 顔）。
     かえり値：Uint8Array（1 = 絵の 一部） */
  function foregroundMask(q, w, hh, thr) {
    const cl = notPaperMask(q, w, hh, thr);
    const wall = dilate(cl, w, hh, 2);
    const bg = new Uint8Array(w * hh);
    const stack = [];
    function push(k) { if (bg[k] || wall[k]) return; bg[k] = 1; stack.push(k); }
    for (let x = 0; x < w; x++) { push(x); push((hh - 1) * w + x); }
    for (let y = 0; y < hh; y++) { push(y * w); push(y * w + w - 1); }
    while (stack.length) {
      const k = stack.pop();
      const x = k % w, y = (k - x) / w;
      if (x + 1 < w) push(k + 1);
      if (x > 0) push(k - 1);
      if (y + 1 < hh) push(k + w);
      if (y > 0) push(k - w);
    }
    const fg = new Uint8Array(w * hh);
    for (let k = 0; k < w * hh; k++) fg[k] = bg[k] ? 0 : 1;
    // ふくらませた ぶん（線の まわり 2px の 紙）は 背景に もどす（線が 太らない）
    const ring = dilate(bg, w, hh, 2);
    for (let k = 0; k < w * hh; k++) if (fg[k] && !cl[k] && ring[k]) fg[k] = 0;
    return fg;
  }

  /* つながった かたまりに 分ける（近い 線どうしは 半径 r で つないで 見る）。
     かえり値：{ label: Int32Array（0 = なし）, comps: [{ id, n, x0, y0, x1, y1, edge }] }
     n・x0〜y1 は もとの マスクの 点で 数える。edge = わくの ふちに かかる */
  function components(fg, w, hh, r) {
    const m = r > 0 ? dilate(fg, w, hh, r) : fg;
    const label = new Int32Array(w * hh);
    const comps = [];
    for (let k0 = 0; k0 < m.length; k0++) {
      if (!m[k0] || label[k0]) continue;
      const id = comps.length + 1;
      const c = { id: id, n: 0, x0: w, y0: hh, x1: -1, y1: -1, edge: false };
      const st = [k0];
      label[k0] = id;
      while (st.length) {
        const k = st.pop();
        const x = k % w, y = (k - x) / w;
        if (fg[k]) {
          c.n++;
          if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
          if (x <= 1 || y <= 1 || x >= w - 2 || y >= hh - 2) c.edge = true;
        }
        if (x + 1 < w && m[k + 1] && !label[k + 1]) { label[k + 1] = id; st.push(k + 1); }
        if (x > 0 && m[k - 1] && !label[k - 1]) { label[k - 1] = id; st.push(k - 1); }
        if (y + 1 < hh && m[k + w] && !label[k + w]) { label[k + w] = id; st.push(k + w); }
        if (y > 0 && m[k - w] && !label[k - w]) { label[k - w] = id; st.push(k - w); }
      }
      if (c.n > 0) comps.push(c);
    }
    return { label: label, comps: comps };
  }

  /* かたまりを まとめる：いちばん 大きな もの ＋ その 近く（reach）に ある もの。
     かえり値：のこす id の 表 と まとめた はんい */
  function cluster(comps, reach, vtol) {
    const sorted = comps.slice().sort(function (a, b) { return b.n - a.n; });
    const main = sorted[0];
    const keep = {};
    keep[main.id] = true;
    let x0 = main.x0, y0 = main.y0, x1 = main.x1, y1 = main.y1;
    for (let it = 0; it < 2; it++) {
      sorted.forEach(function (c) {
        if (keep[c.id]) return;
        // 本体の 上端より 上／下端より 下に まるごと ある 小さな もの＝題名（絵の 名前）→ まとめない
        if (vtol && c.n < main.n * 0.3 && (c.y1 < main.y0 + vtol || c.y0 > main.y1 - vtol)) return;
        if (c.x1 < x0 - reach || c.x0 > x1 + reach || c.y1 < y0 - reach || c.y0 > y1 + reach) return;
        keep[c.id] = true;
        x0 = Math.min(x0, c.x0); y0 = Math.min(y0, c.y0); x1 = Math.max(x1, c.x1); y1 = Math.max(y1, c.y1);
      });
    }
    return { keep: keep, main: main, x0: x0, y0: y0, x1: x1, y1: y1 };
  }

  /* わくの 中の「本体」だけ のこす：いちばん 大きな かたまり ＋ その 近く。
     わくの ふちに かかる 細長い もの（仕切りの 線）と、はなれた もの（題名・となりの 絵）は 消す */
  function keepMain(fg, w, hh) {
    const cc = components(fg, w, hh, 3);
    if (cc.comps.length <= 1) return fg;
    function thin(c) {
      const bw = c.x1 - c.x0 + 1, bh = c.y1 - c.y0 + 1;
      return Math.max(bw, bh) >= 5 * Math.min(bw, bh) && Math.max(bw, bh) > Math.max(w, hh) * 0.3;
    }
    let maxN = 0;
    cc.comps.forEach(function (c) { if (c.n > maxN) maxN = c.n; });
    // 端に かかる 小さな 細長い もの（わくで 切れた 仕切りの 線）も 落とす
    function scrap(c) {
      const bw = c.x1 - c.x0 + 1, bh = c.y1 - c.y0 + 1;
      return c.n < maxN * 0.1 && Math.max(bw, bh) >= 5 * Math.min(bw, bh);
    }
    let cand = cc.comps.filter(function (c) { return (c.n >= 10 || c.n === maxN) && !(c.edge && (thin(c) || scrap(c))); });
    if (!cand.length) cand = cc.comps;
    const cl = cluster(cand, Math.max(w, hh) * 0.05, hh * 0.04);
    const out = new Uint8Array(w * hh);
    for (let k = 0; k < out.length; k++) if (fg[k] && cl.keep[cc.label[k]]) out[k] = 1;
    return out;
  }

  // 絵が ある はんい（絵の まわりの 余白を 切る ため）
  function bbox(fg, w, hh) {
    let x0 = w, y0 = hh, x1 = -1, y1 = -1, n = 0;
    for (let y = 0; y < hh; y++) {
      for (let x = 0; x < w; x++) {
        if (!fg[y * w + x]) continue;
        n++;
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    return n ? { x0: x0, y0: y0, x1: x1, y1: y1, n: n } : null;
  }

  /* 色を 16色に そろえる（絵に ある 色から えらぶ。k-means を 4回） */
  function palette(colors, k) {
    if (colors.length <= k) return colors.slice();
    // はじめの 候補：いままでの 候補から いちばん 遠い 色を 順に とる（にた色ばかりに ならない）
    const samp = colors.length > 900 ? colors.filter(function (c, i) { return i % Math.ceil(colors.length / 900) === 0; }) : colors;
    const cents = [samp[0].slice()];
    while (cents.length < k) {
      let far = null, fd = -1;
      samp.forEach(function (c) {
        let md = 1e9;
        for (let j = 0; j < cents.length; j++) {
          const d = (c[0] - cents[j][0]) * (c[0] - cents[j][0]) + (c[1] - cents[j][1]) * (c[1] - cents[j][1]) + (c[2] - cents[j][2]) * (c[2] - cents[j][2]);
          if (d < md) md = d;
        }
        if (md > fd) { fd = md; far = c; }
      });
      if (!far || fd < 60) break;
      cents.push(far.slice());
    }
    for (let it = 0; it < 4; it++) {
      const sum = cents.map(function () { return [0, 0, 0, 0]; });
      colors.forEach(function (c) {
        let best = 0, bd = 1e9;
        for (let j = 0; j < cents.length; j++) {
          const d = (c[0] - cents[j][0]) * (c[0] - cents[j][0]) + (c[1] - cents[j][1]) * (c[1] - cents[j][1]) + (c[2] - cents[j][2]) * (c[2] - cents[j][2]);
          if (d < bd) { bd = d; best = j; }
        }
        sum[best][0] += c[0]; sum[best][1] += c[1]; sum[best][2] += c[2]; sum[best][3]++;
      });
      for (let j = 0; j < cents.length; j++) {
        if (sum[j][3]) cents[j] = [sum[j][0] / sum[j][3], sum[j][1] / sum[j][3], sum[j][2] / sum[j][3]];
      }
    }
    return cents;
  }
  function nearest(c, pal) {
    let best = pal[0], bd = 1e9;
    for (let j = 0; j < pal.length; j++) {
      const d = (c[0] - pal[j][0]) * (c[0] - pal[j][0]) + (c[1] - pal[j][1]) * (c[1] - pal[j][1]) + (c[2] - pal[j][2]) * (c[2] - pal[j][2]);
      if (d < bd) { bd = d; best = pal[j]; }
    }
    return best;
  }
  // 色を 少し あざやかに（色えんぴつ・クレヨンは 紙の 上では うすいので）
  function vivid(r, g, b) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const mid = (mx + mn) / 2;
    const k = mx - mn > 16 ? 1.35 : 1;
    function f(v) { return Math.max(0, Math.min(255, mid + (v - mid) * k)); }
    return [f(r), f(g), f(b)];
  }
  // 色えんぴつの うすさを こく する（白からの 距離を 1.7倍）。白は 白の まま
  function dense(c) {
    return [255 - Math.min(255, (255 - c[0]) * 1.7), 255 - Math.min(255, (255 - c[1]) * 1.7), 255 - Math.min(255, (255 - c[2]) * 1.7)];
  }

  /* =======================================================
     写真 → ドット絵
     ======================================================= */
  /* わくの 中を しらべる 大きさ（長い ほうが WORK）に して かえす。たてよこの 比は そのまま（ゆがまない） */
  function workCanvas(src, c) {
    const sx = Math.round(src.naturalWidth * c.x);
    const sy = Math.round(src.naturalHeight * c.y);
    const sw = Math.max(1, Math.round(src.naturalWidth * c.w));
    const sh = Math.max(1, Math.round(src.naturalHeight * c.h));
    const cv = document.createElement('canvas');
    if (sw >= sh) { cv.width = WORK; cv.height = Math.max(8, Math.round(WORK * sh / sw)); }
    else { cv.height = WORK; cv.width = Math.max(8, Math.round(WORK * sw / sh)); }
    const x = cv.getContext('2d');
    x.imageSmoothingEnabled = true;
    x.drawImage(src, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
    return cv;
  }

  /* AIに 送る 絵（わくの 中だけ・白い 下地の 正方形 JPEG。たてよこの 比は そのまま） */
  function sendCanvas(src, c) {
    const cv = document.createElement('canvas');
    cv.width = SEND; cv.height = SEND;
    const x = cv.getContext('2d');
    x.fillStyle = '#fff';
    x.fillRect(0, 0, SEND, SEND);
    x.imageSmoothingEnabled = true;
    const sx = Math.round(src.naturalWidth * c.x);
    const sy = Math.round(src.naturalHeight * c.y);
    const sw = Math.max(1, Math.round(src.naturalWidth * c.w));
    const sh = Math.max(1, Math.round(src.naturalHeight * c.h));
    const k = SEND / Math.max(sw, sh);
    const dw = Math.round(sw * k), dh = Math.round(sh * k);
    x.drawImage(src, sx, sy, sw, sh, Math.round((SEND - dw) / 2), Math.round((SEND - dh) / 2), dw, dh);
    return cv;
  }

  /* じどうで きれいに（v3.3・自動補正）。ドット絵の マス目を そうじする：
       ①ぽつんと ある マスを 消す（ごみ）
       ②線の 1マスの すきまを つなぐ（上下 or 左右 が 線）
       ③まわりを 6マス いじょう かこまれた あなを うめる（多数決の 色）×2
       ④ぬりの 中の 白い ぬけを まわりの 色に（色えんぴつの すじの あいだ）×2
       ⑤ぬりむらを 一色に：同じ 色あいで つながった マスを ひとまとまりに して、いちばん こく ぬれている 色に そろえる
       ⑥ふちの マスを こく して 輪かくの 線に（ゲームの モンスターらしく）
     子どもの 絵の 形は 変えない（マスを うごかさない・ならべ直さない） */
  function cleanCells(cells, N) {
    function at(g, x, y) { return (x < 0 || y < 0 || x >= N || y >= N) ? null : g[y * N + x]; }
    const D8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
    function bucket(c) { return [Math.round(c[0] / 28), Math.round(c[1] / 28), Math.round(c[2] / 28)].join(','); }
    function majority(list) {
      const cnt = {};
      let best = null, bn = 0;
      list.forEach(function (c) { const k = bucket(c.c); cnt[k] = (cnt[k] || 0) + 1; if (cnt[k] > bn) { bn = cnt[k]; best = c; } });
      return best;
    }
    function isWhite(c) { return !c.ink && lumOf(c.c[0], c.c[1], c.c[2]) > 232 && Math.max(c.c[0], c.c[1], c.c[2]) - Math.min(c.c[0], c.c[1], c.c[2]) < 22; }
    // ① ごみ
    let src = cells.slice();
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const c = at(src, x, y);
        if (!c) continue;
        let n = 0;
        D8.forEach(function (d) { if (at(src, x + d[0], y + d[1])) n++; });
        if (n <= 1) cells[y * N + x] = null;
      }
    }
    // ② 線を つなぐ
    src = cells.slice();
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (at(src, x, y)) continue;
        const u = at(src, x, y - 1), d = at(src, x, y + 1), l = at(src, x - 1, y), r = at(src, x + 1, y);
        let pair = null;
        if (u && d && u.ink && d.ink) pair = [u, d];
        else if (l && r && l.ink && r.ink) pair = [l, r];
        if (pair) cells[y * N + x] = { ink: true, c: [(pair[0].c[0] + pair[1].c[0]) / 2, (pair[0].c[1] + pair[1].c[1]) / 2, (pair[0].c[2] + pair[1].c[2]) / 2] };
      }
    }
    // ③ あな ④ 白い ぬけ（2回ずつ）
    for (let it = 0; it < 2; it++) {
      src = cells.slice();
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const me = at(src, x, y);
          const around = [];
          D8.forEach(function (d) { const c = at(src, x + d[0], y + d[1]); if (c) around.push(c); });
          if (!me) {
            // ③ あな：まわり 6マス いじょう。色（線でない）が あれば その 多数決、なければ 線
            if (around.length >= 6) {
              const fillsN = around.filter(function (c) { return !c.ink; });
              cells[y * N + x] = fillsN.length >= 3 ? { ink: false, c: majority(fillsN).c.slice() } : { ink: true, c: majority(around).c.slice() };
            }
            continue;
          }
          // ④ 白い ぬけ：白っぽい マスの まわりに 色（白でも 線でも ない）が 5マス いじょう → その 色
          if (isWhite(me)) {
            const colored = around.filter(function (c) { return !c.ink && !isWhite(c); });
            if (colored.length >= 5) cells[y * N + x] = { ink: false, c: majority(colored).c.slice() };
          }
        }
      }
    }
    // ⑤ ぬりむらを 一色に：色あいが 近くて つながっている マスを ひとまとまりに して、
    //    「いちばん こく ぬれている ほうの 半分」の 平均色に そろえる（子どもが えらんだ 色に 寄せる）
    function hueOf(c) {
      const r = c[0], g = c[1], b = c[2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), ch = mx - mn;
      if (ch < 1) return { h: 0, ch: 0, lum: lumOf(r, g, b) };
      let h;
      if (mx === r) h = ((g - b) / ch + 6) % 6;
      else if (mx === g) h = (b - r) / ch + 2;
      else h = (r - g) / ch + 4;
      return { h: h * 60, ch: ch, lum: lumOf(r, g, b) };
    }
    function similar(a, b) {
      const A = hueOf(a.c), B = hueOf(b.c);
      if (A.ch < 22 && B.ch < 22) return Math.abs(A.lum - B.lum) < 45;    // 白・うすい 灰色 どうし
      if (A.ch < 22 || B.ch < 22) return false;
      let dh = Math.abs(A.h - B.h); if (dh > 180) dh = 360 - dh;
      return dh < 45;
    }
    const region = new Int32Array(N * N);
    let rid = 0;
    for (let k0 = 0; k0 < N * N; k0++) {
      if (region[k0] || !cells[k0] || cells[k0].ink) continue;
      rid++;
      const members = [];
      const st = [k0];
      region[k0] = rid;
      while (st.length) {
        const k = st.pop();
        members.push(k);
        const x = k % N, y = (k - x) / N;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          const nx = x + d[0], ny = y + d[1];
          if (nx < 0 || ny < 0 || nx >= N || ny >= N) return;
          const nk = ny * N + nx;
          if (region[nk] || !cells[nk] || cells[nk].ink) return;
          if (!similar(cells[k], cells[nk])) return;
          region[nk] = rid;
          st.push(nk);
        });
      }
      if (members.length < 4) continue;
      const byCh = members.slice().sort(function (a, b) { return hueOf(cells[b].c).ch - hueOf(cells[a].c).ch; });
      const top = byCh.slice(0, Math.max(1, Math.floor(byCh.length / 2)));
      let r = 0, g = 0, bl = 0;
      top.forEach(function (k) { r += cells[k].c[0]; g += cells[k].c[1]; bl += cells[k].c[2]; });
      const rep2 = [r / top.length, g / top.length, bl / top.length];
      members.forEach(function (k) { cells[k] = { ink: false, c: rep2.slice() }; });
    }

    // ⑥ 輪かく：すけている ところ（か 絵の はし）に となりあう 色の マスを こく（線の マスは そのまま）
    src = cells.slice();
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const me = at(src, x, y);
        if (!me || me.ink) continue;
        const open = !at(src, x, y - 1) || !at(src, x, y + 1) || !at(src, x - 1, y) || !at(src, x + 1, y);
        if (open) cells[y * N + x] = { ink: true, c: [me.c[0] * 0.55, me.c[1] * 0.55, me.c[2] * 0.55] };
      }
    }
  }

  function build() {
    if (!img) return '';
    const cv = workCanvas(img, crop);
    const W = cv.width, H = cv.height;
    let data;
    try { data = cv.getContext('2d').getImageData(0, 0, W, H); } catch (e) { return cv.toDataURL(); }
    const q = normalize(data.data, W, H);
    const auto = thresholds(q, W, H);
    const kTol = tol / 55;                                   // スライダー「はいけいを 消す」（55 = 自動の まま）
    const thr = { d: auto.d * kTol, s: auto.s * kTol };
    let fg = foregroundMask(q, W, H, thr);
    fg = keepMain(fg, W, H);
    const box = bbox(fg, W, H);
    if (!box || box.n < 30) { lastInfo = { empty: true, thr: thr }; return ''; }

    // 線と 見なす こさ：紙との 差が「紙でない」しきい値の 0.4〜2.2倍（スライダー「線を こく」で 変わる。50 = 1.3倍）
    const lineD = Math.max(10, thr.d * (2.2 - inkLv * 0.018));
    const lineS = Math.max(16, thr.s * 1.4);                 // これより 色が あれば「色」

    // 絵の まわりの 余白を 切って、正方形に する（少し 余白を のこす）
    const bw = box.x1 - box.x0 + 1, bh = box.y1 - box.y0 + 1;
    const side = Math.max(bw, bh) * 1.06;
    const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2;
    const ox = cx - side / 2, oy = cy - side / 2;

    const N = size;
    const cell = side / N;
    const M = 6;                                  // 1マスの 中で しらべる 点の 数（M×M）
    const cells = new Array(N * N);
    const fills = [];
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        let fgN = 0, total = 0, darkN = 0, colN = 0, fn = 0;
        let dl = 0, dr = 0, dg = 0, db = 0;         // えんぴつの 明るさ・色（合計）
        let cr = 0, cg = 0, cb = 0;                 // 色（ぬり・色の 線）
        let fr = 0, fgc = 0, fb = 0;                // 白っぽい ところ（囲まれた 紙）
        for (let v = 0; v < M; v++) {
          for (let u = 0; u < M; u++) {
            const x = Math.floor(ox + (i + (u + 0.5) / M) * cell);
            const y = Math.floor(oy + (j + (v + 0.5) / M) * cell);
            total++;
            if (x < 0 || y < 0 || x >= W || y >= H) continue;
            const k = y * W + x;
            if (!fg[k]) continue;
            fgN++;
            const r = q[k * 3], g = q[k * 3 + 1], b = q[k * 3 + 2];
            const d = 255 - lumOf(r, g, b);
            const s = Math.max(r, g, b) - Math.min(r, g, b);
            if (d > lineD && s < 14 + d * 0.08) { darkN++; dl += 255 - d; dr += r; dg += g; db += b; }    // えんぴつ・ペン：暗くて ほんとうに 灰色
            else if (s > lineS) { colN++; cr += r; cg += g; cb += b; }         // 色：ぬり・色の 線（うすくても 色）
            else { fn++; fr += r; fgc += g; fb += b; }                         // 白っぽい：線で 囲まれた 紙
          }
        }
        if (!fgN) { cells[j * N + i] = null; continue; }
        // えんぴつ・ペンの 線：マスの 中に 3点 あれば 線（細い 線でも 消えない・ごみは ひろわない）。しっかり 暗く（うすい 線ほど 少し 明るい 灰色）
        if (darkN >= 3 && darkN >= fgN * 0.1 && darkN * 2.5 >= colN) {
          const ac = [dr / darkN, dg / darkN, db / darkN];
          const as = Math.max(ac[0], ac[1], ac[2]) - Math.min(ac[0], ac[1], ac[2]);
          if (as >= 10) {
            // 1点ずつは 灰色に 見えても、平均すると 色が ある → 色えんぴつの 線（黄色い 電灯の 下の 水色 など）。
            // 色の 点も 合わせた 平均に する（すじの あいだの 明るい ところも 入れて、その 色えんぴつの 明るさに）
            const tn = darkN + colN;
            const col = vivid((dr + cr) / tn, (dg + cg) / tn, (db + cb) / tn);
            cells[j * N + i] = { ink: false, c: col };
            fills.push(col);
            continue;
          }
          const dk = clamp((255 - dl / darkN) / 70, 0.4, 1);
          const lv = Math.round(120 - 95 * dk);
          cells[j * N + i] = { ink: true, c: [lv, lv, lv + 8] };
          continue;
        }
        // 色（ぬり・色の 線）：3点 あれば その 色（色えんぴつの すじの あいだも ぬる）。細い 色の 線（マスの 3分の1 より 少ない）は 少し こく
        if (colN >= 3 && colN >= fgN * 0.1) {
          let col = vivid.apply(null, dense([cr / colN, cg / colN, cb / colN]));
          if (colN < total * 0.35) col = [col[0] * 0.8, col[1] * 0.8, col[2] * 0.8];
          cells[j * N + i] = { ink: false, c: col };
          fills.push(col);
          continue;
        }
        // ふち（マスの 一部だけ 絵）は 消して きれいな 輪かくに
        if (fgN < total * 0.4) { cells[j * N + i] = null; continue; }
        if (!fn) { cells[j * N + i] = null; continue; }
        const vc = vivid(fr / fn, fgc / fn, fb / fn);
        cells[j * N + i] = { ink: false, c: vc };
        fills.push(vc);
      }
    }
    // じどうで きれいに（v3.3・自動補正）：ごみ・線の すきま・あな・白い ぬけ・輪かく
    if (autoClean) cleanCells(cells, N);

    // 色を 16色に そろえる
    const pal = palette(fills, 16);

    const out = document.createElement('canvas');
    out.width = N; out.height = N;
    const ox2 = out.getContext('2d');
    const od = ox2.createImageData(N, N);
    let drawn = 0;
    for (let k = 0; k < N * N; k++) {
      const c = cells[k];
      if (!c) continue;
      const col = c.ink ? c.c : nearest(c.c, pal);
      od.data[k * 4] = Math.round(col[0]); od.data[k * 4 + 1] = Math.round(col[1]); od.data[k * 4 + 2] = Math.round(col[2]); od.data[k * 4 + 3] = 255;
      drawn++;
    }
    ox2.putImageData(od, 0, 0);
    lastInfo = { size: N, drawn: drawn, colors: pal.length, clean: autoClean, box: box, thr: { d: Math.round(thr.d * 10) / 10, s: Math.round(thr.s * 10) / 10, line: Math.round(lineD * 10) / 10 } };
    return out.toDataURL('image/png');
  }

  /* 写真ぜんたいから 絵の 場所を 見つけて、わくを 合わせる。
     写真を「白い 紙」に 直してから、紙でない ところを かたまりに 分け、
       ・写真の ふちに かかる もの（つくえ・キーボード・ゆか）
       ・長くて 細い もの（紙の 仕切りの 線・紙の ふちの かげ）
     を 落として、いちばん 大きな 絵 ＋ その 近くの 小さな もの（目・つの・かざり）を わくに する */
  function autoCrop() {
    if (!img) return;
    const cv = workCanvas(img, { x: 0, y: 0, w: 1, h: 1 });
    const W = cv.width, H = cv.height;
    let data;
    try { data = cv.getContext('2d').getImageData(0, 0, W, H); } catch (e) { return; }
    const q = normalize(data.data, W, H);
    const thr = thresholds(q, W, H);
    const np = notPaperMask(q, W, H, thr, true);
    const cc = components(np, W, H, 2);
    const L = Math.max(W, H);
    function thin(c) {
      const bw = c.x1 - c.x0 + 1, bh = c.y1 - c.y0 + 1;
      return Math.max(bw, bh) >= 8 * Math.min(bw, bh) && Math.max(bw, bh) > L * 0.4;
    }
    let cand = cc.comps.filter(function (c) { return !c.edge && !thin(c) && c.n >= 12; });
    if (!cand.length) cand = cc.comps.filter(function (c) { return !thin(c); });
    if (!cand.length) return;
    cand.sort(function (a, b) { return b.n - a.n; });
    const main = cand[0];
    if (main.n < 40) return;
    // 近くの 小さな かたまりだけ まとめる（大きな ものは となりの 絵）
    const reach = L * 0.03;
    let x0 = main.x0, y0 = main.y0, x1 = main.x1, y1 = main.y1;
    for (let it = 0; it < 2; it++) {
      cand.forEach(function (c) {
        if (c === main || c.n > main.n * 0.4) return;
        if (c.y1 < main.y0 + H * 0.04 || c.y0 > main.y1 - H * 0.04) return;   // 本体の 上／下の 小さな もの＝題名
        if (c.x1 < x0 - reach || c.x0 > x1 + reach || c.y1 < y0 - reach || c.y0 > y1 + reach) return;
        x0 = Math.min(x0, c.x0); y0 = Math.min(y0, c.y0); x1 = Math.max(x1, c.x1); y1 = Math.max(y1, c.y1);
      });
    }
    // しらべた 大きさ → 写真の ピクセルに もどして、まわりに 少し 余白
    const kx = img.naturalWidth / W, ky = img.naturalHeight / H;
    const bw = (x1 - x0 + 1) * kx, bh = (y1 - y0 + 1) * ky;
    const pad = Math.max(bw, bh) * 0.08;
    crop = rectCrop(x0 * kx - pad, y0 * ky - pad, (x1 + 1) * kx + pad, (y1 + 1) * ky + pad);
  }

  // 写真を 90度 回す（横向きに とった とき）
  function rotateImg() {
    if (!img) return;
    const cv = document.createElement('canvas');
    cv.width = img.naturalHeight; cv.height = img.naturalWidth;
    const x = cv.getContext('2d');
    x.translate(cv.width / 2, cv.height / 2);
    x.rotate(Math.PI / 2);
    x.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    const im = new Image();
    im.onload = function () { img = im; autoCrop(); if (onImage) onImage(); };
    im.src = cv.toDataURL('image/png');
  }

  let onImage = null;   // 写真が 入れかわった ときに 画面を 書きなおす

  /* わくを「写真の ピクセルで 正方形」に する（0〜1の わりあいに 直す）。
     cx, cy, side は 写真の ピクセル。はみ出す ときは 中に おさめる */
  function squareCrop(cx, cy, side) {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    side = Math.max(32, Math.min(side, iw, ih));
    let x = cx - side / 2, y = cy - side / 2;
    x = Math.max(0, Math.min(iw - side, x));
    y = Math.max(0, Math.min(ih - side, y));
    return { x: x / iw, y: y / ih, w: side / iw, h: side / ih };
  }
  /* 長方形の わく（写真の ピクセル x0,y0〜x1,y1 → 0〜1の わりあい）。はみ出す ときは 中に おさめる */
  function rectCrop(x0, y0, x1, y1) {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const w = Math.max(32, Math.min(iw, x1 - x0)), hh = Math.max(32, Math.min(ih, y1 - y0));
    const x = clamp(x0, 0, iw - w), y = clamp(y0, 0, ih - hh);
    return { x: x / iw, y: y / ih, w: w / iw, h: hh / ih };
  }
  function defaultCrop() {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    return squareCrop(iw / 2, ih / 2, Math.min(iw, ih) * 0.7);
  }

  /* =======================================================
     画面
     ======================================================= */
  function render() {
    const player = MQ.save.current();
    if (!player) return;

    const fileIn = h('input', { class: 'file', type: 'file', accept: 'image/*', capture: 'environment' });
    const stage = h('div', { class: 'photo__stage' });
    const preview = h('img', { class: 'photo__out', alt: 'できあがり' });
    const previewBattle = h('img', { class: 'photo__outb', alt: '' });
    const nameIn = h('input', { class: 'input', type: 'text', maxlength: '8', placeholder: 'モンスターの なまえ' });
    const emptyNote = h('p', { class: 'note photo__empty', hidden: 'hidden', text: '絵が 見つからないよ。わくを 絵に 合わせるか、「はいけいを 消す」を 弱めてみてね' });

    let areaId = 'sansu';
    const areaChips = h('div', { class: 'chips' }, MQ.content.subjectAreas().map(function (a) {
      const b = h('button', {
        class: 'chip' + (areaId === a.id ? ' is-on' : ''), type: 'button', text: a.name,
        onclick: function () {
          areaId = a.id;
          MQ.sfx.tap();
          areaChips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('is-on'); });
          b.classList.add('is-on');
        }
      });
      return b;
    }));

    function sliderRow(label, min, max, get, set) {
      const s = h('input', { class: 'slider', type: 'range', min: String(min), max: String(max), value: String(get()) });
      s.addEventListener('input', function () { set(Number(s.value)); refresh(); });
      return h('div', { class: 'photo__row' }, [h('span', { class: 'photo__lbl', text: label }), s]);
    }
    const cleanChips = h('div', { class: 'chips chips--tight' }, [[true, 'する'], [false, 'しない']].map(function (cch) {
      const b = h('button', {
        class: 'chip chip--s' + (autoClean === cch[0] ? ' is-on' : ''), type: 'button', text: cch[1],
        onclick: function () {
          autoClean = cch[0]; MQ.sfx.tap();
          cleanChips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('is-on'); });
          b.classList.add('is-on');
          refresh();
        }
      });
      return b;
    }));
    const sizeChips = h('div', { class: 'chips chips--tight' }, SIZES.map(function (s) {
      const b = h('button', {
        class: 'chip chip--s' + (size === s[0] ? ' is-on' : ''), type: 'button', text: s[1],
        onclick: function () {
          size = s[0]; MQ.sfx.tap();
          sizeChips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('is-on'); });
          b.classList.add('is-on');
          refresh();
        }
      });
      return b;
    }));

    /* ---- AIで かっこよく する（v2.8）。かぎが ある ときだけ 金の ボタン ---- */
    const aiCount = h('span', { class: 'btn--ai__n' });
    const aiBtn = h('button', { class: 'btn btn--ai photo__ai', type: 'button', hidden: 'hidden', onclick: function () { askAi(); } }, [
      h('span', { class: 'btn--ai__t', text: 'AIで かっこよく する' }),
      aiCount,
      h('span', { class: 'btn__shine' })
    ]);
    const aiAgain = h('button', { class: 'btn btn--small btn--cream', type: 'button', text: 'もう1回 AIに たのむ', onclick: function () { askAi(); } });
    const aiRow = h('div', { class: 'photo__airow', hidden: 'hidden' }, [
      aiAgain,
      h('button', { class: 'btn btn--small btn--stone', type: 'button', text: 'もとの しゃしんに もどす', onclick: function () { MQ.sfx.tap(); restoreOrig(); } })
    ]);
    const aiNote = h('p', { class: 'note photo__ainote', hidden: 'hidden', text: 'おうちの人ページで AIの かぎを 入れると、絵を AIが ゲームの モンスターみたいに かっこよく してくれるよ。' });
    const aiErr = h('p', { class: 'note photo__empty', hidden: 'hidden' });
    const aiWait = h('div', { class: 'photo__wait', hidden: 'hidden' }, [
      h('div', { class: 'photo__waitbox' }, [
        h('div', { class: 'photo__waiticon' }, [h('span'), h('span'), h('span')]),
        h('div', { class: 'photo__waitt', text: 'AIが かいて いるよ…' }),
        h('div', { class: 'photo__waits', text: '10〜30びょう くらい まってね' })
      ])
    ]);
    function paintAi() {
      const on = !!(MQ.ai && MQ.ai.ready());
      const n = on ? MQ.ai.left() : 0;
      aiBtn.hidden = !(img && on && !aiUsed);
      aiBtn.disabled = aiBusy || n <= 0;
      aiCount.textContent = n > 0 ? 'きょう あと ' + n + '回' : 'きょうは もう つかえないよ';
      aiRow.hidden = !(img && aiUsed);
      aiAgain.disabled = aiBusy || n <= 0;
      aiNote.hidden = !(img && !on);
      aiWait.hidden = !aiBusy;
      aiErr.hidden = !aiError;
      aiErr.textContent = aiError;
    }
    function askAi() {
      if (!img || aiBusy || !MQ.ai) return;
      if (!MQ.ai.canUse()) { MQ.ui.toast(MQ.ai.message(MQ.ai.ready() ? 'limit' : 'nokey')); return; }
      MQ.sfx.tap();
      // いつも「AI前の 写真」を 送る（AIの 絵を もう一度 AIに 送らない）
      const src = origImg || img;
      const c = origImg ? origCrop : crop;
      let send = '';
      try { send = sendCanvas(src, c).toDataURL('image/jpeg', 0.85); } catch (e) { send = ''; }
      if (!send) { aiError = MQ.ai.message('unknown'); paintAi(); return; }
      aiBusy = true; aiError = '';
      paintAi();
      MQ.ai.generate(send).then(function (url) {
        const im = new Image();
        im.onload = function () {
          if (!origImg) { origImg = img; origCrop = Object.assign({}, crop); }
          img = im;
          aiUsed = true; aiBusy = false; edited = '';
          crop = { x: 0, y: 0, w: 1, h: 1 };
          autoCrop();
          drawStage(); refresh(); paintAi();
          MQ.sfx.rare();
        };
        im.onerror = function () { aiBusy = false; aiError = MQ.ai.message('noimage'); paintAi(); };
        im.src = url;
      }, function (e) {
        aiBusy = false;
        aiError = MQ.ai.message(e);
        paintAi();
      });
    }
    function restoreOrig() {
      if (!origImg) return;
      img = origImg; crop = origCrop;
      origImg = null; origCrop = null;
      aiUsed = false; aiError = ''; edited = '';
      drawStage(); refresh(); paintAi();
    }

    // ドット絵エディタ（v2.9）：できあがりを マス目で 直す
    const editRow = h('div', { class: 'photo__editrow', hidden: 'hidden' }, [
      h('button', { class: 'btn btn--small btn--cream photo__edit', type: 'button', text: 'ドットを 直す', onclick: function () { openEditor(false); } }),
      h('button', { class: 'btn btn--small btn--stone photo__redo', type: 'button', text: '写真から やり直す', onclick: function () { MQ.sfx.tap(); edited = ''; drawStage(); refresh(); } })
    ]);

    // できあがりの みほん。しゃしんを とるまでは かくしておく
    const previewRow = h('div', { class: 'photo__preview', hidden: 'hidden' }, [
      h('div', { class: 'photo__views' }, [
        h('div', { class: 'photo__view' }, [preview, h('span', { class: 'photo__cap', text: 'できあがり' })]),
        h('div', { class: 'photo__view photo__view--battle' }, [
          h('div', { class: 'photo__sky' }, [previewBattle, h('span', { class: 'shadow shadow--foe photo__shadow' })]),
          h('span', { class: 'photo__cap', text: 'バトルでは' })
        ])
      ]),
      emptyNote,
      sliderRow('はいけいを 消す', 15, 120, function () { return tol; }, function (v) { tol = v; }),
      sliderRow('線を こく', 0, 100, function () { return inkLv; }, function (v) { inkLv = v; }),
      h('div', { class: 'photo__row' }, [h('span', { class: 'photo__lbl', text: 'ドットの こまかさ' }), sizeChips]),
      h('div', { class: 'photo__row' }, [h('span', { class: 'photo__lbl', text: 'じどうで きれいに' }), cleanChips]),
      h('div', { class: 'photo__btns' }, [
        h('button', { class: 'btn btn--small btn--cream', type: 'button', text: 'わくを 自動で', onclick: function () { MQ.sfx.tap(); autoCrop(); drawStage(); refresh(); } }),
        h('button', { class: 'btn btn--small btn--cream', type: 'button', text: '回す', onclick: function () { MQ.sfx.tap(); rotateImg(); } })
      ]),
      h('p', { class: 'note photo__edited', text: '直した ドット絵を つかうよ。もっと 直すことも、写真から やり直すことも できるよ。' }),
      editRow
    ]);

    // ドラッグ中は 1フレームに 1回だけ 作り直す（重い 計算を まとめる）
    let refreshReq = 0;
    function scheduleRefresh() { if (refreshReq) return; refreshReq = requestAnimationFrame(function () { refreshReq = 0; refresh(); }); }
    function refresh() {
      outUrl = edited || build();
      preview.src = outUrl || '';
      previewBattle.src = outUrl || '';
      previewRow.hidden = !(img || edited);   // しゃしんも 直した 絵も ない ときは かくす
      previewRow.classList.toggle('is-edited', !!edited);
      emptyNote.hidden = !!edited || !(img && !outUrl);
      editRow.hidden = !outUrl;
    }
    // ドット絵エディタ（v2.9）を 開く。できあがりを 直す／まっしろから かく
    function openEditor(blank) {
      if (!MQ.ui.pixedit) return;
      MQ.sfx.tap();
      MQ.ui.pixedit.open({
        png: blank ? null : outUrl,
        size: blank ? 48 : null,
        title: blank ? 'ドット絵を かく' : 'ドットを 直す',
        onDone: function (url) {
          if (!url) return;
          if (blank) { img = null; origImg = null; origCrop = null; aiUsed = false; aiError = ''; }
          edited = url;
          drawStage(); refresh(); paintAi();
          MQ.sfx.rare();
        }
      });
    }

    /* ---- わく（ドラッグして 動かす／右下で 大きさ。長方形でも OK） ---- */
    function drawStage() {
      stage.innerHTML = '';
      if (!img) {
        stage.appendChild(h('p', { class: 'note', style: { padding: '20px', textAlign: 'center' }, text: edited ? 'ドット絵を じぶんで かいたよ。「ドットを 直す」で つづきが かけるよ' : 'まず したの ボタンで しゃしんを とってね。ドット絵を じぶんで かくことも できるよ' }));
        return;
      }
      const el = h('img', { class: 'photo__img', src: img.src, alt: '' });
      const box = h('div', { class: 'photo__crop' });
      const handle = h('div', { class: 'photo__handle' });
      box.appendChild(handle);
      stage.appendChild(el);
      stage.appendChild(box);

      function place() {
        // 画面は ぜんたいが 拡大縮小されている（stage.js）ので、getBoundingClientRect でなく offset の 値で
        const w = el.offsetWidth, hh = el.offsetHeight;
        box.style.left = (el.offsetLeft + w * crop.x) + 'px';
        box.style.top = (el.offsetTop + hh * crop.y) + 'px';
        box.style.width = (w * crop.w) + 'px';
        box.style.height = (hh * crop.h) + 'px';
      }
      el.addEventListener('load', place);
      setTimeout(place, 30);
      window.addEventListener('resize', place);

      let mode = null, startPt = null, startCrop = null;
      function down(e, m) {
        e.preventDefault();
        e.stopPropagation();
        mode = m;
        startPt = { x: e.clientX, y: e.clientY };
        startCrop = Object.assign({}, crop);
        try { (m === 'size' ? handle : box).setPointerCapture(e.pointerId); } catch (err) {}
      }
      function move(e) {
        if (!mode) return;
        const r = el.getBoundingClientRect();   // 指の うごきは 画面の px なので、画面上の 大きさで わる
        const dx = (e.clientX - startPt.x) / r.width;
        const dy = (e.clientY - startPt.y) / r.height;
        if (mode === 'move') {
          crop.x = Math.max(0, Math.min(1 - startCrop.w, startCrop.x + dx));
          crop.y = Math.max(0, Math.min(1 - startCrop.h, startCrop.y + dy));
        } else {
          // 大きさは たて・よこ べつべつ（長方形で OK。できあがりは 絵の はんいで 正方形に なる）
          const iw = img.naturalWidth, ih = img.naturalHeight;
          crop.w = Math.max(32, Math.min((startCrop.w + dx) * iw, (1 - startCrop.x) * iw)) / iw;
          crop.h = Math.max(32, Math.min((startCrop.h + dy) * ih, (1 - startCrop.y) * ih)) / ih;
        }
        place();
        scheduleRefresh();
      }
      function up() {
        if (!mode) return;
        mode = null;
        // 指を はなした ときは かならず 作り直す（ドラッグ中の 1フレーム 1回 は とちゅうの もの）
        if (refreshReq) { cancelAnimationFrame(refreshReq); refreshReq = 0; }
        refresh();
      }
      box.addEventListener('pointerdown', function (e) { down(e, 'move'); });
      handle.addEventListener('pointerdown', function (e) { down(e, 'size'); });
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    }

    function useImage(im) {
      img = im;
      origImg = null; origCrop = null; aiUsed = false; aiError = ''; edited = '';
      crop = defaultCrop();
      autoCrop();
      drawStage();
      refresh();
      paintAi();
    }
    onImage = function () { drawStage(); refresh(); };

    fileIn.addEventListener('change', function () {
      const f = fileIn.files && fileIn.files[0];
      if (!f) return;
      MQ.sfx.shutter();
      const r = new FileReader();
      r.onload = function () {
        const im = new Image();
        im.onload = function () { useImage(im); };
        im.src = String(r.result);
      };
      r.readAsDataURL(f);
    });

    function save() {
      if (!outUrl) { MQ.ui.toast('まず しゃしんを とるか、ドット絵を かいてね'); return; }
      const name = (nameIn.value || '').trim();
      if (!name) { MQ.ui.toast('なまえを 入れてね'); return; }
      const mon = { id: 'my-' + MQ.util.uid(), name: name, area: areaId, png: outUrl };
      if (aiUsed) mon.ai = true;
      if (edited) mon.edited = true;
      const how = aiUsed ? '（AIで かっこよく）' : edited && !img ? '（ドット絵を じぶんで かいた）' : edited ? '（ドットを 直した）' : '';
      MQ.save.update(function (p) {
        MQ.save.addCustom(p, mon);
        MQ.save.addLog(p, 'じぶんの モンスター「' + name + '」を つくった' + how);
      });
      MQ.ui.syncCustom();
      MQ.sfx.rare();
      MQ.ui.toast(name + ' が なかまに なった！ バトルに 出てくるよ');
      img = null; outUrl = ''; edited = '';
      origImg = null; origCrop = null; aiUsed = false; aiError = '';
      MQ.ui.dex.render('mons');
      MQ.ui.show('screen-dex');
    }

    /* ---- じぶんの モンスター 一覧 ---- */
    const mine = (player.custom || []).map(function (m) {
      const area = MQ.content.areaOf(m.area);
      return h('div', { class: 'cell' }, [
        MQ.blocks.imgBox(m.png, { size: 52, cls: 'cell__img' }),
        h('span', { class: 'cell__name', text: m.name }),
        h('span', { class: 'cell__tag', text: area ? area.short : '' }),
        h('button', {
          class: 'btn btn--small btn--cream', type: 'button', text: '直す',
          onclick: function () {
            if (!MQ.ui.pixedit) return;
            MQ.sfx.tap();
            MQ.ui.pixedit.open({
              png: m.png, title: m.name + ' を 直す',
              onDone: function (url) {
                if (!url) return;
                MQ.save.update(function (p) { (p.custom || []).forEach(function (c) { if (c.id === m.id) { c.png = url; c.edited = true; } }); });
                MQ.ui.syncCustom();
                MQ.ui.toast(m.name + ' を 直したよ');
                render();
              }
            });
          }
        }),
        h('button', {
          class: 'btn btn--small btn--danger', type: 'button', text: '消す',
          onclick: function () {
            if (!window.confirm(m.name + ' を 消しますか？')) return;
            MQ.save.update(function (p) { MQ.save.removeCustom(p, m.id); });
            MQ.ui.syncCustom();
            render();
          }
        })
      ]);
    });

    MQ.ui.mount('screen-dex', h('div', { class: 'wrap' }, [
      h('h2', { class: 'label', text: 'じぶんの モンスターを つくる', style: { marginTop: '6px' } }),
      h('p', { class: 'note', text: '紙に かいた 絵を しゃしんに とると、ドット絵に なって バトルに 出てくるよ。明るい ところで、紙が ぜんぶ 入るように まっすぐ とると きれいに なるよ。' }),
      h('div', { class: 'photo' }, [
        stage,
        h('button', { class: 'btn', type: 'button', text: '📷 しゃしんを とる', onclick: function () { MQ.sfx.tap(); fileIn.click(); } }),
        fileIn,
        h('button', { class: 'btn btn--cream photo__blank', type: 'button', text: 'ドット絵を じぶんで かく', onclick: function () { openEditor(true); } }),
        aiBtn,
        aiRow,
        aiErr,
        aiNote,
        previewRow,
        aiWait,
        nameIn,
        h('p', { class: 'note', style: { margin: '0' }, text: 'どの エリアに 出す？' }),
        areaChips,
        h('button', { class: 'btn btn--big', type: 'button', text: 'なかまに する！', onclick: function () { MQ.sfx.tap(); save(); } })
      ]),
      mine.length ? h('h2', { class: 'label', text: 'つくった モンスター' }) : null,
      mine.length ? h('div', { class: 'grid' }, mine) : null,
      h('button', {
        class: 'btn btn--big btn--stone', type: 'button', text: '図かんへ もどる',
        style: { marginTop: '18px' },
        onclick: function () { MQ.sfx.tap(); MQ.ui.dex.render('mons'); MQ.ui.show('screen-dex'); }
      })
    ]));
    MQ.ui.show('screen-dex');
    drawStage();
    paintAi();

    // テスト用（tools/harness.html）：写真の かわりに 画像を わたす／AIの ボタンを 押す
    render.load = function (dataUrl, cb) {
      const im = new Image();
      im.onload = function () { useImage(im); if (cb) cb(lastInfo, outUrl); };
      im.src = dataUrl;
    };
    render.askAi = askAi;
    render.restore = restoreOrig;
    render.edit = openEditor;
  }

  /* テスト用：いま の わくを どう 見ているか（白い 紙に 直した 写真 と 判定の 図） */
  function debugImages() {
    if (!img) return null;
    const cv = workCanvas(img, crop);
    const W = cv.width, H = cv.height;
    const p = cv.getContext('2d').getImageData(0, 0, W, H).data;
    const q = normalize(p, W, H);
    const auto = thresholds(q, W, H);
    const kTol = tol / 55;
    const thr = { d: auto.d * kTol, s: auto.s * kTol };
    const fg = keepMain(foregroundMask(q, W, H, thr), W, H);
    const lineD = Math.max(10, thr.d * (2.2 - inkLv * 0.018)), lineS = Math.max(16, thr.s * 1.4);
    const a = document.createElement('canvas'); a.width = W; a.height = H;
    const b = document.createElement('canvas'); b.width = W; b.height = H;
    const ad = a.getContext('2d').createImageData(W, H), bd = b.getContext('2d').createImageData(W, H);
    for (let k = 0; k < W * H; k++) {
      const r = q[k * 3], g = q[k * 3 + 1], bl = q[k * 3 + 2];
      ad.data[k * 4] = r; ad.data[k * 4 + 1] = g; ad.data[k * 4 + 2] = bl; ad.data[k * 4 + 3] = 255;
      if (!fg[k]) { bd.data[k * 4 + 3] = 0; continue; }
      const d = 255 - lumOf(r, g, bl), s = Math.max(r, g, bl) - Math.min(r, g, bl);
      let c;
      if (d > lineD && s < 14 + d * 0.08) c = [0, 0, 0];
      else if (s > lineS) c = vivid.apply(null, dense([r, g, bl]));
      else c = [225, 225, 225];
      bd.data[k * 4] = c[0]; bd.data[k * 4 + 1] = c[1]; bd.data[k * 4 + 2] = c[2]; bd.data[k * 4 + 3] = 255;
    }
    a.getContext('2d').putImageData(ad, 0, 0);
    b.getContext('2d').putImageData(bd, 0, 0);
    return { norm: a.toDataURL('image/jpeg', 0.85), cls: b.toDataURL('image/png'), thr: thr, lineD: lineD, lineS: lineS };
  }

  return {
    render: render,
    // テスト用：さいごの できあがりの 情報／作り直し
    info: function () { return lastInfo; },
    debug: debugImages,
    crop: function () { return crop; },
    build: build,
    // AI（v2.8）の いまの 状態（テスト用）
    aiState: function () { return { busy: aiBusy, ai: aiUsed, error: aiError, hasOrig: !!origImg, out: outUrl.length, edited: !!edited }; },
    setOptions: function (o) { if (o.size) size = o.size; if (o.tol != null) tol = o.tol; if (o.ink != null) inkLv = o.ink; if (o.clean != null) autoClean = !!o.clean; }
  };
})();
