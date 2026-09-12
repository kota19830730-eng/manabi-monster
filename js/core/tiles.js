/* ---------------------------------------------------------
   ワールドマップの 地形（v1.6 / RPGの 世界地図ふう）

   地図は **マス目**で 作ります。
     ・よこ 32マス（画面 400px ÷ 32 ＝ 1マス 12.5px）
     ・たては 地図の 高さ ÷ 12.5 マス
     ・となりあう マスで 色を 2つ こうごに する（市松もよう）

   えがきかたは Canvas に「1マス＝1ピクセル」。
   CSS で 12.5倍に のばす（image-rendering: pixelated）ので、
   何マス あっても 軽く、かどが くっきり 出ます。
   板の 橋の ような「マスの 中に もようが ある」ものだけ、
   map.js が CSS の div を 上に かさねます。

   作る 順番（ここが だいじ）：
     1. ぜんぶ 海に する
     2. 本島を おく（行ごとに 左右の はしを ずらして ギザギザに）
     3. 森・岩場を ちらす
     4. 川を よこに 2行ぶん 通す
     5. さいごの塔の 小島を おく（本島とは はなす）
     6. 水に せっする 陸 → 砂の きしべ
     7. 陸に せっする 海 → 浅瀬（あさせ）
     8. ステージを つなぐ 道を ひく（はば2マス・よこ線＋たての 背骨）
        川と 交わった ところは 木の 橋に する
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.tiles = (function () {
  const COLS = 32;                 // よこの マス数（ここは 動かさない）
  const CELL = 400 / COLS;         // 1マスが 画面で 何ピクセルに なるか（12.5）

  // 地形の ばんごう。SAND より 小さい ものが「水」
  const SEA = 0, SHAL = 1, RIVER = 2,
        SAND = 3, GRASS = 4, FOREST = 5, ROCK = 6, ROAD = 7, BRIDGE = 8,
        DGRASS = 9, DSAND = 10;

  // 市松もよう用に 1マスごと 2色（となりあう マスで こうごに 出る）
  const COLOR = {};
  COLOR[SEA]    = ['#2f7fd0', '#2a76c4'];
  COLOR[SHAL]   = ['#63b2e8', '#5babe2'];
  COLOR[RIVER]  = ['#54a9e4', '#4ba0dc'];
  COLOR[SAND]   = ['#ecd58e', '#e5cc82'];
  COLOR[GRASS]  = ['#58ad4d', '#52a548'];
  COLOR[FOREST] = ['#368a30', '#31822c'];
  COLOR[ROCK]   = ['#8892a8', '#7e88a0'];
  COLOR[ROAD]   = ['#d9b878', '#cfae6c'];   // v8.0：うすい 灰色 → 砂色（道が 追える）
  COLOR[BRIDGE] = ['#b58a58', '#a67c4d'];
  COLOR[DGRASS] = ['#3e7a58', '#397151'];
  COLOR[DSAND]  = ['#8f86a8', '#857c9e'];

  /* =======================================================
     学年ごとの 見た目（v4.7）

     ユーザー要望「学年ごとに マップも 変えて」。
     4つの ワールドを **べつの 島**に 見せる：
       小1 はるの しま  … 明るい 黄緑・水色の 海・まるい 小さめの 島
       小2 なつの しま  … こい 緑・青い 海・白い 砂・よこに 広い 島
       小3 いまの しま  … これまでの 見た目（正本。ここは 変えない）
       小4 あきの 大陸  … 黄みどりの 草・紅葉した 森・深い 海・ごつごつした 海岸

     colors … 上の COLOR を 土台に、書いた ところだけ 差しかえる
     edge   … 島の 形（margin＝左右の あき／wob＝海岸線の ギザギザ／taper＝上下の まるみ）
            **margin + wob は 4 いか**に する。ノードは よこ 16%（5マスめ）〜82%（27マスめ）に
            おかれるので、それより 外に 海が 入ると 道が 切れる（smoke.js が 検査）
     ======================================================= */
  function pal(list) {
    const o = {};
    list.forEach(function (p) { o[p[0]] = p[1]; });
    return o;
  }
  const THEMES = {};
  function theme(id, over, edge) {
    const c = {};
    Object.keys(COLOR).forEach(function (k) { c[k] = COLOR[k]; });
    Object.keys(over).forEach(function (k) { c[k] = over[k]; });
    THEMES[id] = { colors: c, edge: edge };
  }
  theme('g1', pal([
    [GRASS,  ['#7cc95f', '#74c157']],
    [FOREST, ['#4aa348', '#43993f']],
    [SEA,    ['#4fa3e0', '#4a9ad6']],
    [SHAL,   ['#8ed0f2', '#85c8ec']],
    [SAND,   ['#f7e6b6', '#f1dfac']],
    [ROCK,   ['#a8b2c4', '#9da7ba']],
    [ROAD,   ['#e6c78d', '#dcbd82']]
  ]), { margin: 3, wob: 1, taper: [9, 6, 3, 1] });

  theme('g2', pal([
    [GRASS,  ['#3fa251', '#399a4a']],
    [FOREST, ['#227a35', '#1e7130']],
    [SEA,    ['#1f6fc6', '#1b66ba']],
    [SHAL,   ['#4fb6ea', '#48ade2']],
    [SAND,   ['#f4eecd', '#ede6c3']],
    [ROAD,   ['#dbb87a', '#d1ae70']]
  ]), { margin: 1, wob: 2, taper: [5, 3, 1, 0] });

  theme('g3', pal([]), { margin: 2, wob: 2, taper: [7, 4, 2, 1] });

  theme('g4', pal([
    [GRASS,  ['#84a244', '#7c9a3e']],
    [FOREST, ['#b3652c', '#a75d27']],
    [SEA,    ['#265f9e', '#225795']],
    [SHAL,   ['#4f9ccf', '#4894c8']],
    [RIVER,  ['#4a9ad2', '#4291ca']],
    [SAND,   ['#e2bb7c', '#dab372']],
    [ROCK,   ['#95908a', '#8a8580']],
    [ROAD,   ['#d2ad6d', '#c8a363']]
  ]), { margin: 1, wob: 3, taper: [8, 5, 3, 1] });

  // 小5 ふゆの 大陸（v6.5）：雪の 草原・こい 緑の 森・氷の 海・青白い 砂
  theme('g5', pal([
    [GRASS,  ['#dfe9ee', '#d4e1e8']],
    [FOREST, ['#2f6b4f', '#2a6147']],
    [SEA,    ['#2b5f9e', '#265694']],
    [SHAL,   ['#6fb4e4', '#66abdc']],
    [RIVER,  ['#5aa6da', '#519dd2']],
    [SAND,   ['#eef2f5', '#e4e9ee']],
    [ROCK,   ['#aab7c9', '#9fabbd']],
    [ROAD,   ['#cfc0a2', '#c5b698']]
  ]), { margin: 1, wob: 2, taper: [8, 5, 3, 1] });

  /* 小6 やみの 大陸（v11.0）：ユーザー指定「小6は 闇の ステージ」。
     かれた むらさきの 大地・黒に 近い 森・どす黒い 海・灰むらさきの 砂・血の 色の 道。
     ノードの 色は CSS の .map--g6 で 変える（木・岩・花）。 */
  theme('g6', pal([
    [GRASS,  ['#4a3f63', '#443a5b']],
    [FOREST, ['#2a2140', '#251d39']],
    [SEA,    ['#141026', '#110d20']],
    [SHAL,   ['#2a1f4a', '#241a41']],
    [RIVER,  ['#3a2a5e', '#332555']],
    [SAND,   ['#6b5f80', '#625777']],
    [ROCK,   ['#4f4660', '#473f57']],
    [ROAD,   ['#8a5a6e', '#7f5265']]
  ]), { margin: 1, wob: 3, taper: [8, 5, 3, 1] });

  function isLand(v) { return v >= SAND; }
  function isWater(v) { return v < SAND; }

  // いつも 同じ ゆらぎ（読みこみ直しても 地図が 変わらない）
  function wob(n, max) {
    const t = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
    return Math.floor((t - Math.floor(t)) * (max + 1));
  }

  /* =======================================================
     マス目を 作る

     spec = {
       height:   地図ぜんたいの 高さ（px）
       island:   { top, bottom }        本島の 上と 下（px）
       bands:    [{ top, height, biome }]  森・岩場を ちらす ため
       riverY:   川の まんなか（px。なければ 川なし）
       tower:    { xPct, y }            塔の 小島の まんなか
       path:     [{ xPct, y }, ...]     道が つなぐ ところ（順番）
       theme:    'g1'〜'g4'              学年ごとの 色と 島の 形（v4.7）
     }
     ======================================================= */
  function build(spec) {
    const th = THEMES[spec.theme] || THEMES.g3;
    const edge = th.edge;
    const rows = Math.max(10, Math.ceil(spec.height / CELL));
    const g = [];
    const dark = [];               // さいごの塔の 小島の マスか
    for (let y = 0; y < rows; y++) {
      g.push(new Array(COLS).fill(SEA));
      dark.push(new Array(COLS).fill(false));
    }

    function put(x, y, v) {
      if (y < 0 || y >= rows || x < 0 || x >= COLS) return;
      g[y][x] = v;
    }
    function get(x, y) {
      if (y < 0 || y >= rows || x < 0 || x >= COLS) return SEA;
      return g[y][x];
    }
    const row = function (py) { return Math.round(py / CELL); };
    const col = function (pct) { return Math.round(COLS * pct / 100); };

    /* ---- 2. 本島 ---------------------------------------
       行ごとに 左右の はしを 1〜2マス ずらして 海岸線を ギザギザに。
       上と 下の はしは けずって、四角い 板に 見えないように する。 */
    const yTop = Math.max(1, row(spec.island.top));
    const yBot = Math.min(rows - 2, row(spec.island.bottom));
    for (let y = yTop; y <= yBot; y++) {
      const k = Math.min(y - yTop, yBot - y);
      const taper = k >= edge.taper.length ? 0 : edge.taper[k];
      const l = edge.margin + taper + wob(y, edge.wob);
      const r = (COLS - 3 - edge.margin) + 2 - taper - wob(y + 91, edge.wob);
      for (let x = l; x <= r; x++) put(x, y, GRASS);
    }

    /* ---- 3. 森と 岩場 ---------------------------------- */
    (spec.bands || []).forEach(function (b, bi) {
      const y0 = row(b.top) + 1;
      const y1 = row(b.top + b.height) - 1;
      if (b.biome === 'forest') {
        for (let y = y0; y <= y1; y++) {
          for (let x = 1; x < COLS - 1; x++) {
            if (get(x, y) !== GRASS) continue;
            if (wob(x * 31 + y * 17 + bi, 5) === 0) {
              put(x, y, FOREST);
              if (get(x + 1, y) === GRASS) put(x + 1, y, FOREST);
              if (get(x, y + 1) === GRASS) put(x, y + 1, FOREST);
            }
          }
        }
      }
      /* 理科の 湖（v4.7）：ノードの 行の 下に 池を おく。
         きしべ（砂）は あとの 6番が 自動で つけて くれる。
         道は ノードの 下では 左はし（16%）を たてに 通るので、
         池は 12マスめより 右に おいて 橋に ならない ように する。 */
      if (b.biome === 'lake') {
        const ly0 = row(b.top + 118);
        const ly1 = y1;
        const cy = Math.round((ly0 + ly1) / 2);
        [[20, 6, 2], [11, 3, 1]].forEach(function (p, pi) {
          const cx = p[0], rx = p[1], ry = Math.min(p[2], Math.max(1, Math.floor((ly1 - ly0) / 2)));
          for (let y = cy - ry; y <= cy + ry; y++) {
            for (let x = cx - rx; x <= cx + rx; x++) {
              const dx = (x - cx) / rx, dy = (y - cy) / (ry + 0.4);
              if (dx * dx + dy * dy <= 1 && get(x, y) === GRASS) put(x, y, RIVER);
            }
          }
          if (pi === 0) {   // 湖の まわりに 木を 少し
            for (let y = ly0; y <= ly1; y++) {
              for (let x = 1; x < COLS - 1; x++) {
                if (get(x, y) === GRASS && wob(x * 5 + y * 13 + bi, 9) === 0) put(x, y, FOREST);
              }
            }
          }
        });
      }
      if (b.biome === 'mountain') {
        for (let y = y0; y <= y1; y++) {
          for (let x = 1; x < COLS - 1; x++) {
            if (get(x, y) !== GRASS) continue;
            if (wob(x * 13 + y * 29 + bi, 10) === 0) {
              put(x, y, ROCK);
              if (get(x + 1, y) === GRASS) put(x + 1, y, ROCK);
              if (get(x + 1, y + 1) === GRASS) put(x + 1, y + 1, ROCK);
            }
          }
        }
      }
      if (b.biome === 'sea' || b.biome === 'sky' || b.biome === 'town') {
        // 草はらの ぽつぽつ（少しだけ 木を まぜて さみしくしない）
        for (let y = y0; y <= y1; y++) {
          for (let x = 1; x < COLS - 1; x++) {
            if (get(x, y) === GRASS && wob(x * 7 + y * 23 + bi, 13) === 0) put(x, y, FOREST);
          }
        }
      }
    });

    /* ---- 4. 川（よこに 2行ぶん・すこし ゆれる） --------- */
    if (spec.riverY != null) {
      const ry = row(spec.riverY);
      for (let x = 0; x < COLS; x++) {
        const off = wob(Math.floor(x / 4) * 5, 1);   // 4マスごとに ゆっくり 曲がる
        for (let k = 0; k < 2; k++) {
          const y = ry + off + k;
          if (isLand(get(x, y))) put(x, y, RIVER);
        }
      }
    }

    /* ---- 5. さいごの塔の 小島（本島とは 海で はなす） --- */
    if (spec.tower) {
      const tx = col(spec.tower.xPct);
      const ty = row(spec.tower.y);
      const W = [4, 7, 9, 10, 10, 9, 7, 4];   // まんなかから 左右に 何マス
      for (let i = 0; i < W.length; i++) {
        const y = ty - 4 + i;
        const w = W[i] + wob(y * 3 + 7, 1);
        for (let x = tx - w; x <= tx + w; x++) {
          if (y < 0 || y >= rows) continue;
          put(x, y, DGRASS);
          if (x >= 0 && x < COLS) dark[y][x] = true;
        }
      }
    }

    /* ---- 6. きしべ（砂）------------------------------- */
    const beach = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!isLand(g[y][x])) continue;
        if (isWater(get(x - 1, y)) || isWater(get(x + 1, y)) ||
            isWater(get(x, y - 1)) || isWater(get(x, y + 1))) beach.push([x, y]);
      }
    }
    beach.forEach(function (p) { g[p[1]][p[0]] = dark[p[1]][p[0]] ? DSAND : SAND; });

    /* ---- 7. 浅瀬 -------------------------------------- */
    const shal = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < COLS; x++) {
        if (g[y][x] !== SEA) continue;
        let near = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (isLand(get(x + dx, y + dy))) near = true;
          }
        }
        if (near) shal.push([x, y]);
      }
    }
    shal.forEach(function (p) { g[p[1]][p[0]] = SHAL; });

    /* ---- 8. 道（はば2マス）＋ 橋 ---------------------- */
    const bridges = [];
    function road(x, y) {
      if (y < 0 || y >= rows || x < 0 || x >= COLS) return;
      const v = g[y][x];
      if (v === RIVER) { g[y][x] = BRIDGE; bridges.push([x, y]); return; }
      if (isLand(v) && v !== BRIDGE) g[y][x] = ROAD;
    }
    function hRoad(x0, x1, y) {
      const a = Math.min(x0, x1), b = Math.max(x0, x1);
      for (let x = a; x <= b; x++) { road(x, y); road(x, y + 1); }
    }
    function vRoad(y0, y1, x) {
      const a = Math.min(y0, y1), b = Math.max(y0, y1);
      for (let y = a; y <= b; y++) { road(x, y); road(x + 1, y); }
    }

    const path = spec.path || [];
    for (let i = 0; i < path.length - 1; i++) {
      const ax = col(path[i].xPct), ay = row(path[i].y);
      const bx = col(path[i + 1].xPct), by = row(path[i + 1].y);
      hRoad(ax, bx, ay);        // よこに 動いて
      vRoad(ay, by, bx);        // たてに 動く（かどで かさなる）
    }

    // 橋を「板の もよう」で 上に かさねる ための まとまり
    const bridgeRects = mergeRects(bridges);

    return {
      cells: g, cols: COLS, rows: rows, cell: CELL,
      colors: th.colors, theme: THEMES[spec.theme] ? spec.theme : 'g3',
      heightPx: rows * CELL,
      bridges: bridgeRects.map(function (r) {
        return { x: r.x * CELL, y: r.y * CELL, w: r.w * CELL, h: r.h * CELL };
      })
    };
  }

  // となりあう 橋の マスを 四角に まとめる
  function mergeRects(cells) {
    if (!cells.length) return [];
    const groups = [];
    const sorted = cells.slice().sort(function (a, b) { return a[1] - b[1] || a[0] - b[0]; });
    let cur = null;
    sorted.forEach(function (c) {
      if (cur && c[1] <= cur.y1 + 1 && c[0] >= cur.x0 - 2 && c[0] <= cur.x1 + 2) {
        cur.x0 = Math.min(cur.x0, c[0]); cur.x1 = Math.max(cur.x1, c[0]);
        cur.y0 = Math.min(cur.y0, c[1]); cur.y1 = Math.max(cur.y1, c[1]);
      } else {
        cur = { x0: c[0], x1: c[0], y0: c[1], y1: c[1] };
        groups.push(cur);
      }
    });
    return groups.map(function (b) {
      return { x: b.x0, y: b.y0, w: b.x1 - b.x0 + 1, h: b.y1 - b.y0 + 1 };
    });
  }

  /* =======================================================
     マス目を Canvas に 描く（1マス＝1ピクセル・市松もよう）
     ======================================================= */
  /* -------------------------------------------------------
     地面を 描く（v9.2 で 4ばいの こまかさに した）

     まえは「1マス＝1ピクセル」だった。CSS で 12.5倍に のばすので、
     **1マスが 画面で 12.5px の まっ平らな 1色**に なって いた。
     モンスターと 同じ「四角の 中が 空っぽ」の 問題。

     いまは **1マスを 4×4 の 点**で 描く（絵は 4倍・のばす 倍率は 3.125）。
     マスの 中に つみきの 立体感を 入れられる：

       ・上の 行を 明るく／下の 行を 暗く（左も 少し 明るく・右を 少し 暗く）
         ＝ blocks.js の モンスターと 同じ 3面の 光
       ・水に せっする 陸の へりは もっと はっきり（がけに 見える）
       ・陸の となりの 水は 暗く（岸の かげ。島が うく）
       ・ぜんぶの 点に ほんの少し ざらつき（同じ 場所は いつも 同じ）
       ・水は 立体に せず、よこに ながれる 明るい すじ（波）

     **マス目・道・島の 形は 1マスも 変えて いない。**
     ------------------------------------------------------- */
  /* 1マスを 何点で 描くか。

     v9.6（HD）：**4 → 12**。canvas は よこ 32×12 ＝ **384点**に なり、
     画面の 400px と ほぼ 1:1。前は 1点が 3.1px の 四角に 見えて いた
     （地図が いちばん 粗い ところ だった）。
     たて長の 地図でも 384 ×（行数×12）なので 1回 描くだけなら 軽い。

     **マス目・道・島の 形は 1マスも 変えて いない。**
     ふえた こまかさは ぜんぶ「その 場所が 何で できて いるか」に つかう。 */
  const SUB = 12;
  // つみきの ふちの あつさ。SUB に 合わせて 太くし、v9.2 の 見た目を たもつ
  const EDGE = Math.max(1, Math.round(SUB / 4));
  // 波の すじの あいだ（マス 2つ分ちょっと。SUB を 変えても 同じ 幅に 見える）
  const WAVE = SUB * 2 + 3;

  function rgbOf(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  // いつも 同じ ざらつき（読みこみ直しても 地面が ちらつかない）
  function grain(x, y) {
    let h = x * 73856093 ^ y * 19349663;
    h = (h ^ (h >>> 13)) * 1274126177;
    return (((h ^ (h >>> 16)) >>> 0) % 1000) / 1000 - 0.5;   // -0.5 〜 0.5
  }

  /* 地面の きめ（v9.6・HD）

     SUB を 上げた ぶんを、**その 場所が 何で できて いるか**に つかう。
       草  … たての 葉すじ（4点ごとに ちぎれる）
       森  … もっと こい 葉すじ
       岩  … かくばった まだら ＋ ななめの ひび
       砂  … こまかい つぶ
       道  … じゃりの つぶ ＋ ときどき 小石
       橋  … よこの 板の 線
     ぜんぶ grain()（同じ 場所は いつも 同じ）なので、描き直しても ちらつかない。
     数字を 大きく しすぎると「ざらざらの 紙」に 見えるので、
     いちばん 強い 森でも 0.1 まで。 */
  function texture(v, gx, gy) {
    // 葉すじは **長く・まばら**に する。短くて 多いと「ざらざらの ノイズ」に 見える
    if (v === GRASS || v === DGRASS) {
      const b = grain(gx, (gy / 8) | 0);                 // たてに 8点（マスの 2/3）のびる 葉すじ
      return b > 0.36 ? 0.07 : (b < -0.37 ? -0.05 : 0);
    }
    if (v === FOREST) {
      const b = grain(gx, (gy / 6) | 0);
      return b > 0.30 ? 0.09 : (b < -0.32 ? -0.07 : 0);
    }
    if (v === ROCK || v === DSAND) {
      const b = grain((gx / 2) | 0, (gy / 2) | 0);       // 2×2 の かくばった まだら
      let k = b > 0.28 ? 0.10 : (b < -0.26 ? -0.085 : 0);
      if ((gx + gy) % 9 === 0 && grain(gx, gy) > 0.18) k -= 0.06;   // ななめの ひび
      return k;
    }
    if (v === SAND) {
      const b = grain(gx, gy);
      return b > 0.36 ? 0.06 : (b < -0.36 ? -0.05 : 0);
    }
    if (v === ROAD) {
      const b = grain(gx, gy);
      let k = b > 0.32 ? 0.07 : (b < -0.32 ? -0.06 : 0);
      if (grain((gx / 2) | 0, (gy / 2) | 0) > 0.42) k += 0.05;      // 小石
      return k;
    }
    if (v === BRIDGE) {
      const step = Math.max(3, Math.round(SUB / 3));
      return (gy % step === 0 ? -0.10 : 0) + grain(gx, gy) * 0.05;  // よこの 板の 線
    }
    return 0;
  }

  function paintBlocks(canvas, grid) {
    if (!canvas || !grid) return;
    canvas.classList.remove('map__bg--smooth');
    const cols = grid.cols, rows = grid.rows;
    canvas.width = cols * SUB;
    canvas.height = rows * SUB;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(cols * SUB, rows * SUB);
    const data = img.data;
    const table = grid.colors || COLOR;
    const W = cols * SUB;

    const typeAt = function (x, y) {
      if (x < 0 || y < 0 || x >= cols || y >= rows) return SEA;
      return grid.cells[y][x];
    };

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const v = grid.cells[y][x];
        const pair = table[v] || table[SEA];
        const base = rgbOf(pair[(x + y) & 1]);
        const land = isLand(v);
        const upW = isWater(typeAt(x, y - 1));
        const dnW = isWater(typeAt(x, y + 1));
        const upL = isLand(typeAt(x, y - 1));
        const lfL = isLand(typeAt(x - 1, y));

        const shore = EDGE * 2;                            // 岸の かげの ふかさ
        for (let sy = 0; sy < SUB; sy++) {
          for (let sx = 0; sx < SUB; sx++) {
            const gx = x * SUB + sx, gy = y * SUB + sy;
            let k = 0;
            if (land) {
              // マスの ふち。上と 左が 明るく、下と 右が 暗い（つみきの 3面）。
              // **よこ と たての 強さを そろえる**のが だいじ。
              // 上下だけ 強くすると、地面が マス目では なく「よこじま」に 見える。
              // あつさは EDGE（SUB の 1/4）。SUB を 変えても 同じ 見た目に なる。
              if (sy < EDGE) k += upW ? 0.22 : 0.11;         // 水ぎわは がけに 見せる
              if (sy >= SUB - EDGE) k -= dnW ? 0.20 : 0.10;
              if (sx < EDGE) k += 0.08;
              if (sx >= SUB - EDGE) k -= 0.08;
              k += texture(v, gx, gy);                       // 材質の きめ（v9.6）
            } else {
              // 水。波の すじ と 岸の かげ
              const wv = (gy + (gx >> 1)) % WAVE;
              if (wv === 0) k += 0.10;
              else if (wv === 1) k += 0.05;                  // すじを 2点ぶん の 厚みに
              if (upL && sy < shore) k -= 0.16 * (1 - sy / shore);   // 陸の 下は 暗い
              if (lfL && sx < shore) k -= 0.07 * (1 - sx / shore);
            }
            k += grain(gx, gy) * (land ? 0.05 : 0.04);

            const i = (gy * W + gx) * 4;
            for (let c = 0; c < 3; c++) {
              const b = base[c];
              data[i + c] = k >= 0 ? b + (255 - b) * k : b * (1 + k);
            }
            data[i + 3] = 255;
          }
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  // その ばしょの マスは 何か（かざりを おく ばしょ を えらぶのに 使う）
  function at(grid, xPct, yPx) {
    if (!grid) return SEA;
    const x = Math.round(grid.cols * xPct / 100);
    const y = Math.round(yPx / grid.cell);
    if (y < 0 || y >= grid.rows || x < 0 || x >= grid.cols) return SEA;
    return grid.cells[y][x];
  }

  function landAt(grid, xPct, yPx) { return isLand(at(grid, xPct, yPx)); }


  /* =======================================================
     地図を なめらかに 描く（v13.4・B案「ジオラマ」）

     ユーザー「ブロック感 なくして 映像を 綺麗に」→ 3案（A 絵本／B ジオラマ／C アニメ）→ **B**。
     マスの 表（cells）は そのまま。**見た目だけ** 変える：
       ① マスの 表を 小さな 絵に して ぼかし → しきい値＝なめらかな 海岸線・道・川（maskOf）
       ② 島に 高さ（南の へりに 2だんの がけ）・海岸の 白い 波・あさせ
       ③ 草は 大きな やわらかい 明暗（おかの ふくらみ）・森・岩場・道の じゃり
       ④ 橋は 板の 絵
     色は 学年ごとの テーマ（grid.colors）から 作る＝春・夏・秋・冬・闇 が そのまま 出る。
     マスクは 画面と 同じ はば（400）で 作り、2ばいの canvas に なめらかに 引きのばす
     （800 で 作ると 1回 300ms を こえた。400 なら 1/4）。
     **ctx.filter（ぼかし）が ない ブラウザは いままでの paint（ブロック）**に もどる。
     かざり（木・岩・花）は paintDecos、家と 城は js/ui/map.js が 本物の 3D（vox）で おく。
     見た目の 正本は docs/STYLE_GUIDE.md の「地図を なめらかに（v13.4）」
     ======================================================= */
  const SK = 2;                 // 画面の 何ばいで 描くか
  const MK = 1;                 // マスクは 画面と 同じ
  function hexMix(hex, to, k) {
    const a = rgbOf(hex), b = rgbOf(to);
    return '#' + a.map(function (v, i) { return ('0' + Math.round(v + (b[i] - v) * k).toString(16)).slice(-2); }).join('');
  }
  function lit(hex, k) { return hexMix(hex, '#ffffff', k); }
  function drk(hex, k) { return hexMix(hex, '#000000', k); }
  function rnd(i) { let h = (i * 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967295; }

  const smoothCache = [];       // [{ key, canvas }]（同じ 地図を 2回 描かない・学年を 行き来しても 3枚まで）
  /* しきい値の フィルター（SVG）。ぼかし stdDeviation → 不とうめい度 a を slope·a + intercept に。
     ctx.filter = 'url(#…)' で canvas に かける（Chrome）。画素の 読み出しが いらない ので 速い */
  const svgFilters = {};
  let svgRoot = null;
  function thresholdFilter(blur, slope, intercept) {
    const id = 'mqth-' + String(blur).replace('.', '_') + '-' + slope + '-' + String(Math.round(intercept * 1000)).replace('-', 'm');
    if (svgFilters[id]) return 'url(#' + id + ')';
    const NS = 'http://www.w3.org/2000/svg';
    if (!svgRoot) {
      svgRoot = document.createElementNS(NS, 'svg');
      svgRoot.setAttribute('width', '0'); svgRoot.setAttribute('height', '0');
      svgRoot.setAttribute('aria-hidden', 'true');
      svgRoot.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
      (document.body || document.documentElement).appendChild(svgRoot);
    }
    const f = document.createElementNS(NS, 'filter');
    f.setAttribute('id', id);
    f.setAttribute('x', '-5%'); f.setAttribute('y', '-5%'); f.setAttribute('width', '110%'); f.setAttribute('height', '110%');
    f.setAttribute('color-interpolation-filters', 'sRGB');
    if (blur > 0) { const b = document.createElementNS(NS, 'feGaussianBlur'); b.setAttribute('stdDeviation', String(blur)); f.appendChild(b); }
    const ct = document.createElementNS(NS, 'feComponentTransfer');
    const fa = document.createElementNS(NS, 'feFuncA');
    fa.setAttribute('type', 'linear'); fa.setAttribute('slope', String(slope)); fa.setAttribute('intercept', String(intercept));
    ct.appendChild(fa); f.appendChild(ct); svgRoot.appendChild(f);
    svgFilters[id] = true;
    return 'url(#' + id + ')';
  }
  let gpuOK = null;
  function gpuThreshold() {        // 1回だけ ためす：不とうめい度を 0 に する フィルターで 本当に 消えるか
    if (gpuOK !== null) return gpuOK;
    try {
      const c = document.createElement('canvas'); c.width = 4; c.height = 4;
      const x = c.getContext('2d');
      x.filter = thresholdFilter(0, 0, 0);
      x.fillStyle = '#fff'; x.fillRect(0, 0, 4, 4);
      x.filter = 'none';
      gpuOK = x.getImageData(1, 1, 1, 1).data[3] === 0;
    } catch (e) { gpuOK = false; }
    return gpuOK;
  }
  function canSmooth() {
    try {
      const c = document.createElement('canvas').getContext('2d');
      return !!c && typeof c.filter === 'string';
    } catch (e) { return false; }
  }
  // テーマの 色 → なめらかな 地図の 色（テスト用にも 出す）
  function smoothColors(colors) {
    const c = colors || COLOR;
    const g = c[GRASS][0];
    return {
      sea: c[SEA][0], seaDeep: drk(c[SEA][0], 0.28), shal: c[SHAL][0], sand: c[SAND][0],
      grass: [lit(g, 0.12), drk(g, 0.14)], forest: c[FOREST][0], rock: c[ROCK][0],
      road: c[ROAD][0], roadEdge: drk(c[ROAD][0], 0.2), river: c[RIVER][0], bridge: c[BRIDGE][0],
      cliff: drk(g, 0.32), cliffDeep: drk(g, 0.55), dgrass: c[DGRASS][0], dsand: c[DSAND][0]
    };
  }
  function cellsKey(grid) {
    let h = 2166136261;
    for (let y = 0; y < grid.rows; y++) for (let x = 0; x < grid.cols; x++) { h ^= grid.cells[y][x]; h = Math.imul(h, 16777619); }
    return (grid.theme || '') + ':' + grid.rows + ':' + (h >>> 0);
  }

  function paintSmooth(canvas, grid) {
    const W = 400 * SK, Hh = Math.round(grid.heightPx * SK);
    canvas.width = W; canvas.height = Hh;
    canvas.classList.add('map__bg--smooth');
    const ctx = canvas.getContext('2d');
    const key = cellsKey(grid);
    const hit = smoothCache.filter(function (c) { return c.key === key; })[0];
    if (hit) { ctx.drawImage(hit.canvas, 0, 0); return; }
    const gpu = gpuThreshold();

    const P = smoothColors(grid.colors);
    const MW = 400 * MK, MH = Math.round(grid.heightPx * MK);
    const dark = grid.theme === 'g6';
    // マスの 表 → なめらかな 形（ぼかして しきい値）。MW×MH で 作る
    function maskOf(pred, blur, thresh, offY) {
      const small = document.createElement('canvas'); small.width = grid.cols; small.height = grid.rows;
      const sc = small.getContext('2d');
      sc.fillStyle = '#fff';
      for (let y = 0; y < grid.rows; y++) for (let x = 0; x < grid.cols; x++) if (pred(grid.cells[y][x])) sc.fillRect(x, y, 1, 1);
      const m = document.createElement('canvas'); m.width = MW; m.height = MH;
      const mc = m.getContext('2d');
      mc.imageSmoothingEnabled = true;
      const t0 = (thresh == null ? 0.5 : thresh);
      if (gpu) {         // (a·255 − t)·6 + 128 ＝ a·6 + (128/255 − 6t)
        mc.filter = thresholdFilter(blur * MK, 6, 128 / 255 - 6 * t0);
        mc.drawImage(small, 0, (offY || 0) * MK, MW, MH);
        mc.filter = 'none';
        return m;
      }
      mc.filter = 'blur(' + (blur * MK) + 'px)';
      mc.drawImage(small, 0, (offY || 0) * MK, MW, MH);
      mc.filter = 'none';
      const img = mc.getImageData(0, 0, MW, MH), d = img.data, t = (thresh == null ? 0.5 : thresh) * 255;
      // きっちり 0/255 に 切ると 2ばいに した とき 階段に なる → しきい値の まわり 1px だけ なだらかに（ふちの ぼかし）
      for (let i = 3; i < d.length; i += 4) { const a = (d[i] - t) * 6 + 128; d[i] = a < 0 ? 0 : a > 255 ? 255 : a; }
      mc.putImageData(img, 0, 0);
      return m;
    }
    // マスクの ふち（外がわ／内がわ に px）
    function edgeOf(mask, px, inside) {
      const t = document.createElement('canvas'); t.width = MW; t.height = MH;
      const c = t.getContext('2d');
      if (gpu) {         // (a·255 − 8)·10 ＝ a·10 − 80/255
        c.filter = thresholdFilter(px * MK, 10, -80 / 255);
        c.drawImage(mask, 0, 0);
        c.filter = 'none';
      } else {
        c.filter = 'blur(' + (px * MK) + 'px)';
        c.drawImage(mask, 0, 0);
        c.filter = 'none';
        const img = c.getImageData(0, 0, MW, MH), d = img.data;
        for (let i = 3; i < d.length; i += 4) { const a = (d[i] - 8) * 10; d[i] = a < 0 ? 0 : a > 255 ? 255 : a; }
        c.putImageData(img, 0, 0);
      }
      c.globalCompositeOperation = inside ? 'destination-in' : 'destination-out';
      c.drawImage(mask, 0, 0);
      return t;
    }
    // マスクの 形に ぬる（2ばいに なめらかに 引きのばす）
    const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = Hh;
    const tc = tmp.getContext('2d');
    function fill(mask, paintFn, offY) {
      tc.globalCompositeOperation = 'source-over';
      tc.globalAlpha = 1;
      tc.clearRect(0, 0, W, Hh);
      paintFn(tc);
      tc.globalAlpha = 1;
      tc.globalCompositeOperation = 'destination-in';
      tc.imageSmoothingEnabled = true;
      tc.drawImage(mask, 0, (offY || 0) * SK, W, Hh);
      tc.globalCompositeOperation = 'source-over';
      ctx.drawImage(tmp, 0, 0);
    }
    function flat(color, a) { return function (c) { c.globalAlpha = a == null ? 1 : a; c.fillStyle = color; c.fillRect(0, 0, W, Hh); }; }

    const bl = 2.6;   // ぼかし（マスが 12.5px なので その 2わり）
    // 海：まん中が 明るく、はしが ふかい
    const sg = ctx.createLinearGradient(0, 0, W, 0);
    sg.addColorStop(0, P.seaDeep); sg.addColorStop(0.5, P.sea); sg.addColorStop(1, P.seaDeep);
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, Hh);
    ctx.globalAlpha = dark ? 0.06 : 0.12; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2 * SK;
    for (let i = 0; i < Math.round(Hh / 70); i++) {
      const y = rnd(i) * Hh, x = rnd(i + 99) * W, w = (30 + rnd(i + 7) * 90) * SK / 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + w / 2, y - 3 * SK, x + w, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const land = maskOf(function (v) { return v >= SAND; }, bl);
    fill(maskOf(function (v) { return v >= SAND || v === SHAL; }, bl * 2.2, 0.35), flat(P.shal, 0.55));
    fill(edgeOf(land, 5, false), flat('#ffffff', dark ? 0.18 : 0.35));
    // 島の 高さ（南の へりに 2だんの がけ）
    fill(land, flat(P.cliffDeep), 3.5);
    fill(land, flat(P.cliff), 1.75);
    // 砂 → 草
    fill(land, flat(P.sand));
    const grass = maskOf(function (v) { return v === GRASS || v === FOREST || v === ROCK || v === ROAD; }, bl);
    fill(grass, function (c) {
      const gg = c.createLinearGradient(0, 0, W, Hh); gg.addColorStop(0, P.grass[0]); gg.addColorStop(1, P.grass[1]);
      c.fillStyle = gg; c.fillRect(0, 0, W, Hh);
      const n = Math.round(Hh / 48);
      for (let i = 0; i < n; i++) {           // おかの ふくらみ（やわらかい 明暗）
        const x = rnd(i + 300) * W, y = rnd(i + 400) * Hh, r = (40 + rnd(i + 500) * 70) * SK;
        const a = c.createRadialGradient(x - r * .3, y - r * .3, 0, x, y, r);
        a.addColorStop(0, 'rgba(255,255,220,.05)'); a.addColorStop(1, 'rgba(255,255,220,0)');
        c.fillStyle = a; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
        const b = c.createRadialGradient(x + r * .5, y + r * .6, 0, x + r * .5, y + r * .6, r * .9);
        b.addColorStop(0, 'rgba(20,60,30,.035)'); b.addColorStop(1, 'rgba(20,60,30,0)');
        c.fillStyle = b; c.beginPath(); c.arc(x + r * .5, y + r * .6, r * .9, 0, Math.PI * 2); c.fill();
      }
    });
    fill(edgeOf(grass, 2, true), flat(lit(P.grass[0], 0.4), 0.35));
    // 塔の 小島（こい 草・むらさきの 砂）
    fill(maskOf(function (v) { return v === DSAND || v === DGRASS; }, bl), flat(P.dsand));
    fill(maskOf(function (v) { return v === DGRASS; }, bl), flat(P.dgrass));
    // 森
    const forest = maskOf(function (v) { return v === FOREST; }, bl * 1.2);
    fill(forest, flat(P.forest));
    fill(edgeOf(forest, 3, true), flat(lit(P.forest, 0.35), 0.3));
    // 岩場（まるい 石の まだら）
    fill(maskOf(function (v) { return v === ROCK || v === DSAND; }, bl * 1.1), function (c) {
      c.fillStyle = P.rock; c.fillRect(0, 0, W, Hh);
      const n = Math.round(Hh / 10);
      for (let i = 0; i < n; i++) {
        const x = rnd(i + 900) * W, y = rnd(i + 950) * Hh, r = (3 + rnd(i + 970) * 6) * SK;
        c.fillStyle = i % 2 ? 'rgba(255,255,255,.22)' : 'rgba(0,0,0,.13)';
        c.beginPath(); c.ellipse(x, y, r, r * .7, 0, 0, Math.PI * 2); c.fill();
      }
    });
    // 川（砂の 岸 → 水）
    const river = maskOf(function (v) { return v === RIVER; }, bl);
    fill(edgeOf(river, 3, false), flat(P.sand));
    fill(river, flat(P.river));
    // 道（ふち → じゃり）
    const road = maskOf(function (v) { return v === ROAD || v === BRIDGE; }, bl * 0.9);
    fill(edgeOf(road, 2, false), flat(P.roadEdge, 0.55));
    fill(road, function (c) {
      c.fillStyle = P.road; c.fillRect(0, 0, W, Hh);
      const n = Math.round(Hh / 6);
      for (let i = 0; i < n; i++) {
        c.fillStyle = 'rgba(120,80,30,.16)';
        c.beginPath(); c.arc(rnd(i + 1300) * W, rnd(i + 1350) * Hh, (1 + rnd(i + 1370) * 1.6) * SK, 0, Math.PI * 2); c.fill();
      }
    });
    // 橋（板）
    (grid.bridges || []).forEach(function (r) {
      const x = r.x * SK, y = r.y * SK, w = r.w * SK, h = r.h * SK;
      ctx.fillStyle = drk(P.bridge, 0.25); ctx.fillRect(x - 2 * SK, y - 2 * SK, w + 4 * SK, h + 4 * SK);
      ctx.fillStyle = lit(P.bridge, 0.1); ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(80,40,10,.35)';
      for (let yy = y; yy < y + h; yy += 5 * SK) ctx.fillRect(x, yy, w, 1.2 * SK);
    });
    // 光（左上 明るく・右下 すこし 暗く）
    const lg = ctx.createLinearGradient(0, 0, W, Hh * 0.6);
    lg.addColorStop(0, 'rgba(255,245,200,.12)'); lg.addColorStop(1, 'rgba(30,20,60,.1)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W, Hh);

    const keep = document.createElement('canvas'); keep.width = W; keep.height = Hh;
    keep.getContext('2d').drawImage(canvas, 0, 0);
    smoothCache.unshift({ key: key, canvas: keep });
    if (smoothCache.length > 3) smoothCache.length = 3;
  }

  /* ---- かざり（木・岩・花・雪山・枯れ木・クリスタル・家の 絵）を 描いた 3D で ----
     光は 左上から。面を 3つ（光・まん中・かげ）に 分けて、右下へ 長い かげ。
     家と 城は ふだん 本物の 3D（map.js）。りったいを 切った ときだけ ここで 家を 描く。 */
  const DECO_PAL = {
    g1: { tree: ['#9be07a', '#62c153', '#3c8832'], flower: ['#ff9ec4', '#ffc2da', '#ffffff'] },
    g2: { tree: ['#55c060', '#2f9a3f', '#175f23'], flower: ['#fffbe8', '#ffffff', '#ffe36b'] },
    g3: { tree: ['#7fd05a', '#4fae44', '#2c7a34'], flower: ['#ffd84a', '#ff8fb0', '#ffffff', '#ffb04a'] },
    g4: { tree: ['#f0a650', '#cf7330', '#96421c'], flower: ['#ffcf6b', '#ffb04a'] },
    g5: { tree: ['#4f8f70', '#2f6b4f', '#1c4030'], snow: true, flower: ['#9fe3ff', '#ffffff'] },
    g6: { tree: ['#4a3d66', '#2a2140', '#171227'], flower: ['#c07bff'], glow: true }
  };
  function paintDecos(canvas, grid, decos) {
    if (!canvas || !decos || !decos.length) return;
    const ctx = canvas.getContext('2d');
    const k = canvas.width / 400;
    const pal = DECO_PAL[grid && grid.theme] || DECO_PAL.g3;
    const rockC = (grid && grid.colors ? grid.colors[ROCK][0] : COLOR[ROCK][0]);
    const trunk = grid && grid.theme === 'g6' ? '#4a3a2c' : '#6a4a2c';
    const shadowA = grid && grid.theme === 'g6' ? 0.4 : 0.3;
    function longShadow(x, y, w, hgt) {
      ctx.fillStyle = 'rgba(15,30,20,' + shadowA + ')';
      ctx.beginPath(); ctx.moveTo(x - w * .6, y); ctx.lineTo(x + w * .6, y); ctx.lineTo(x + w * .6 + hgt * .9, y + hgt * .5); ctx.lineTo(x - w * .6 + hgt * .9, y + hgt * .5); ctx.closePath(); ctx.fill();
    }
    function cone(cx, by, hh, ww, c3) {
      ctx.fillStyle = c3[0]; ctx.beginPath(); ctx.moveTo(cx, by - hh); ctx.lineTo(cx - ww * .35, by); ctx.lineTo(cx - ww, by); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c3[1]; ctx.beginPath(); ctx.moveTo(cx, by - hh); ctx.lineTo(cx + ww * .3, by); ctx.lineTo(cx - ww * .35, by); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c3[2]; ctx.beginPath(); ctx.moveTo(cx, by - hh); ctx.lineTo(cx + ww, by); ctx.lineTo(cx + ww * .3, by); ctx.closePath(); ctx.fill();
    }
    function tree(x, y, i) {
      const s = k * (0.9 + rnd(i + 77) * 0.3), cx = x * k, by0 = y * k;
      longShadow(cx, by0, 8 * s, 26 * s);
      ctx.fillStyle = trunk; ctx.fillRect(cx - 2 * s, by0 - 8 * s, 4 * s, 8 * s);
      [[0, 24, 14], [9, 18, 11], [17, 12, 7]].forEach(function (t, j) {
        const c3 = (pal.snow && j === 2) ? ['#ffffff', '#e8f1f7', '#b9c9d6'] : pal.tree;
        cone(cx, by0 - t[0] * s, t[1] * s, t[2] * s, c3);
        ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(cx - t[2] * s, by0 - t[0] * s - 1.2 * s, t[2] * 2 * s, 1.2 * s);
      });
    }
    function rock(x, y, i) {
      const s = k * (0.9 + rnd(i + 5) * 0.4), cx = x * k, by = y * k;
      longShadow(cx, by, 7 * s, 9 * s);
      ctx.fillStyle = lit(rockC, 0.25); ctx.beginPath(); ctx.moveTo(cx - 9 * s, by); ctx.lineTo(cx - 4 * s, by - 9 * s); ctx.lineTo(cx + 3 * s, by - 8 * s); ctx.lineTo(cx, by); ctx.closePath(); ctx.fill();
      ctx.fillStyle = rockC; ctx.beginPath(); ctx.moveTo(cx, by); ctx.lineTo(cx + 3 * s, by - 8 * s); ctx.lineTo(cx + 9 * s, by); ctx.closePath(); ctx.fill();
      ctx.fillStyle = drk(rockC, 0.28); ctx.beginPath(); ctx.moveTo(cx + 3 * s, by - 8 * s); ctx.lineTo(cx + 9 * s, by); ctx.lineTo(cx + 5 * s, by); ctx.closePath(); ctx.fill();
    }
    function flower(x, y, i) {
      const col = pal.flower[i % pal.flower.length], cx = x * k, cy = (y - 3) * k;
      if (pal.glow) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 8 * k);
        g.addColorStop(0, 'rgba(192,123,255,.55)'); g.addColorStop(1, 'rgba(192,123,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 8 * k, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = col;
      for (let a = 0; a < 5; a++) { ctx.beginPath(); ctx.arc(cx + Math.cos(a * 1.257) * 2.2 * k, cy + Math.sin(a * 1.257) * 2.2 * k, 1.4 * k, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, cy, 1.1 * k, 0, Math.PI * 2); ctx.fill();
    }
    function mountain(x, y) {
      const cx = x * k, by = y * k, m = k;
      longShadow(cx, by, 26 * m, 34 * m);
      const base = lit(rockC, 0.05);
      ctx.fillStyle = lit(base, 0.15); ctx.beginPath(); ctx.moveTo(cx - 28 * m, by); ctx.lineTo(cx - 4 * m, by - 42 * m); ctx.lineTo(cx - 2 * m, by); ctx.closePath(); ctx.fill();
      ctx.fillStyle = base; ctx.beginPath(); ctx.moveTo(cx - 2 * m, by); ctx.lineTo(cx - 4 * m, by - 42 * m); ctx.lineTo(cx + 10 * m, by); ctx.closePath(); ctx.fill();
      ctx.fillStyle = drk(base, 0.3); ctx.beginPath(); ctx.moveTo(cx - 4 * m, by - 42 * m); ctx.lineTo(cx + 28 * m, by); ctx.lineTo(cx + 10 * m, by); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f7fbff'; ctx.beginPath(); ctx.moveTo(cx - 4 * m, by - 42 * m); ctx.lineTo(cx - 12 * m, by - 28 * m); ctx.lineTo(cx - 7 * m, by - 30 * m); ctx.lineTo(cx - 3 * m, by - 26 * m); ctx.lineTo(cx + 2 * m, by - 31 * m); ctx.lineTo(cx + 7 * m, by - 27 * m); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d6e2ef'; ctx.beginPath(); ctx.moveTo(cx - 4 * m, by - 42 * m); ctx.lineTo(cx + 7 * m, by - 27 * m); ctx.lineTo(cx + 2 * m, by - 31 * m); ctx.closePath(); ctx.fill();
    }
    function house(x, y) {        // りったいを 切った ときだけ
      const cx = x * k, by = y * k, m = k;
      longShadow(cx, by, 14 * m, 18 * m);
      ctx.fillStyle = '#f4ead8'; ctx.fillRect(cx - 12 * m, by - 16 * m, 24 * m, 16 * m);
      ctx.fillStyle = '#d9cdb4'; ctx.fillRect(cx + 6 * m, by - 16 * m, 6 * m, 16 * m);
      ctx.fillStyle = '#6d4726'; ctx.fillRect(cx - 3 * m, by - 9 * m, 6 * m, 9 * m);
      ctx.fillStyle = '#ffd86b'; ctx.fillRect(cx - 10 * m, by - 13 * m, 4 * m, 4 * m);
      ctx.fillStyle = '#d9483a'; ctx.beginPath(); ctx.moveTo(cx - 15 * m, by - 16 * m); ctx.lineTo(cx, by - 27 * m); ctx.lineTo(cx + 15 * m, by - 16 * m); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#a8322a'; ctx.beginPath(); ctx.moveTo(cx, by - 27 * m); ctx.lineTo(cx + 15 * m, by - 16 * m); ctx.lineTo(cx + 6 * m, by - 16 * m); ctx.closePath(); ctx.fill();
    }
    function houseShadow(x, y) { longShadow(x * k, y * k, 15 * k, 20 * k); }
    function dead(x, y) {
      const cx = x * k, by = y * k;
      longShadow(cx, by, 4 * k, 14 * k);
      ctx.fillStyle = '#3a2a45'; ctx.fillRect(cx - 1.5 * k, by - 14 * k, 3 * k, 14 * k); ctx.fillRect(cx - 6 * k, by - 10 * k, 6 * k, 2 * k); ctx.fillRect(cx, by - 7 * k, 6 * k, 2 * k);
    }
    function crystal(x, y) {
      const cx = x * k, by = y * k;
      const g = ctx.createRadialGradient(cx, by - 6 * k, 1, cx, by - 6 * k, 14 * k); g.addColorStop(0, 'rgba(200,140,255,.45)'); g.addColorStop(1, 'rgba(200,140,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, by - 6 * k, 14 * k, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c48bff'; ctx.beginPath(); ctx.moveTo(cx, by - 16 * k); ctx.lineTo(cx + 5 * k, by - 4 * k); ctx.lineTo(cx, by); ctx.lineTo(cx - 5 * k, by - 4 * k); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ecd8ff'; ctx.beginPath(); ctx.moveTo(cx, by - 16 * k); ctx.lineTo(cx - 5 * k, by - 4 * k); ctx.lineTo(cx - 1 * k, by - 4 * k); ctx.closePath(); ctx.fill();
    }
    decos.slice().sort(function (a, b) { return a.y - b.y; }).forEach(function (d, i) {
      if (d.kind === 'tree') tree(d.x, d.y, i);
      else if (d.kind === 'rock') rock(d.x, d.y, i);
      else if (d.kind === 'flower') flower(d.x, d.y, i);
      else if (d.kind === 'mt') mountain(d.x, d.y);
      else if (d.kind === 'house') { if (d.flat) house(d.x, d.y); else houseShadow(d.x, d.y + 4); }
      else if (d.kind === 'dead') dead(d.x, d.y);
      else if (d.kind === 'crystal') crystal(d.x, d.y);
    });
  }

  let smoothOK = null;
  function paint(canvas, grid) {
    if (!canvas || !grid) return;
    if (smoothOK === null) smoothOK = canSmooth();
    if (smoothOK) paintSmooth(canvas, grid); else paintBlocks(canvas, grid);
  }
  function smooth() { if (smoothOK === null) smoothOK = canSmooth(); return smoothOK; }
  // 先に 描いて とって おく（見えない canvas。タイトル画面の ひまな ときに 呼ぶ）
  function warm(grid) { if (!grid || !smooth()) return; paintSmooth(document.createElement('canvas'), grid); }

  return {
    COLS: COLS, CELL: CELL, COLOR: COLOR, THEMES: THEMES,
    SEA: SEA, SHAL: SHAL, RIVER: RIVER, SAND: SAND, GRASS: GRASS,
    FOREST: FOREST, ROCK: ROCK, ROAD: ROAD, BRIDGE: BRIDGE,
    DGRASS: DGRASS, DSAND: DSAND,
    build: build, paint: paint, paintBlocks: paintBlocks, paintDecos: paintDecos, smooth: smooth, warm: warm, smoothColors: smoothColors, DECO_PAL: DECO_PAL,
    at: at, landAt: landAt, isLand: isLand, isWater: isWater
  };
})();
