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
  COLOR[ROAD]   = ['#cdc6b6', '#c2bba9'];
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
    [ROAD,   ['#e2dbca', '#d7d0be']]
  ]), { margin: 3, wob: 1, taper: [9, 6, 3, 1] });

  theme('g2', pal([
    [GRASS,  ['#3fa251', '#399a4a']],
    [FOREST, ['#227a35', '#1e7130']],
    [SEA,    ['#1f6fc6', '#1b66ba']],
    [SHAL,   ['#4fb6ea', '#48ade2']],
    [SAND,   ['#f4eecd', '#ede6c3']],
    [ROAD,   ['#d9d3c1', '#cec8b5']]
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
    [ROAD,   ['#cbc1a8', '#c1b79e']]
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
    [ROAD,   ['#c9c2b4', '#bfb8aa']]
  ]), { margin: 1, wob: 2, taper: [8, 5, 3, 1] });

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
      colors: th.colors,
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
  function paint(canvas, grid) {
    if (!canvas || !grid) return;
    canvas.width = grid.cols;
    canvas.height = grid.rows;
    const ctx = canvas.getContext('2d');
    for (let y = 0; y < grid.rows; y++) {
      const r = grid.cells[y];
      for (let x = 0; x < grid.cols; x++) {
        const table = grid.colors || COLOR;
        const pair = table[r[x]] || table[SEA];
        ctx.fillStyle = pair[(x + y) & 1];
        ctx.fillRect(x, y, 1, 1);
      }
    }
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

  return {
    COLS: COLS, CELL: CELL, COLOR: COLOR, THEMES: THEMES,
    SEA: SEA, SHAL: SHAL, RIVER: RIVER, SAND: SAND, GRASS: GRASS,
    FOREST: FOREST, ROCK: ROCK, ROAD: ROAD, BRIDGE: BRIDGE,
    DGRASS: DGRASS, DSAND: DSAND,
    build: build, paint: paint, at: at, landAt: landAt, isLand: isLand, isWater: isWater
  };
})();
