/* ---------------------------------------------------------
   02 ワールドマップ（v1.6 / RPGの 世界地図ふう）

   上：ヘッダー（顔＋なまえ＋Lv＋EXPバー）＋ タブ3つ
   中：見おろしの 世界地図（たてに スクロール）
   下：ピンクの「にげた敵」バー

   地形は js/core/tiles.js が マス目で 作ります（よこ32マス・1マス12.5px）。
   その上に ノード（ステージ）と かざり（山・木・家・岩・花・波）を
   CSS の div で のせます。

   ここで 大事にしていること：
     ・**島は ひとつ**。ゾーンは その 島の 上下に ならぶ
     ・道は はば2マス。ぜんぶの ステージを ひとふでがきで つなぐ
     ・国語の森と 理科社会の海の あいだに 川。道と 交わる ところは 木の 橋
     ・**さいごの塔は 海を はさんだ 右下の 小島**（不気味な 色・枯れ木・紫の クリスタル）
     ・ゾーン見出しの ピルは ノードの 行と かさならない ところに おく
     ・まだ 習っていない ステージは 出さない（霧の しるし 1つだけ）
   --------------------------------------------------------- */
window.MQ = window.MQ || {};
MQ.ui = MQ.ui || {};

MQ.ui.map = (function () {
  const h = MQ.util.h;

  /* ノードの よこの いち（％）。**1列 3つ**（v8.0）。
     前は 4つ（16/38/60/82）だったが、1つ 100px しか なく 名前が 3行に なって
     となりと ぶつかって いた。3つに して ブロックも 名前も 大きくした。
     18% と 82% は マスに すると 6・26 で、4列の ころ（16%・82%）と 同じ 場所。
     ここを 動かす ときは tiles.js の「margin + wob は 4 いか」を 見る */
  const COL_X = [18, 50, 82];
  const ROW_H = 132;                // 行と 行の あいだ（95px 以上）
  const PILL_H = 46;                // ゾーン見出しの ぶん
  const BAND_PAD = 20;
  const TOP_SEA = 34;               // いちばん 上の 海
  const RIVER_H = 56;               // 川の ぶん
  const STRAIT = 40;                // 本島と 塔の島の あいだの 海
  const TOWER_XPCT = 70;            // 塔の 小島の よこの いち（％）
  const TOWER_PAD = 58;             // 小島の 下の 余白

  let canvas = null, layer = null, sheet = null;
  let bands = [], grid = null, plan = null;
  // 上の 帯で ひらく パネル と 下の 学年えらび（v8.0）
  let panelEl = null, dimEl = null, obiEl = null, gradeEl = null;

  /* =======================================================
     上の 帯（v8.0）：フィーバー教科と ミッションを 1本に まとめる。
       押すと くわしい 中身（いままでの オレンジの 帯と ミッション 3つ）が
       地図の 上に かぶさって 出る。地図を さわると とじる。
     ======================================================= */
  let gotStamp = null;      // きょう もらった スタンプの ごほうび（v8.4）
  function closeAll() {
    if (panelEl) panelEl.hidden = true;
    if (gradeEl) gradeEl.hidden = true;
    if (obiEl) obiEl.classList.remove('is-open');
    if (dimEl) dimEl.hidden = true;
  }
  function togglePanel() {
    if (!panelEl) return;
    const open = panelEl.hidden;
    closeAll();
    panelEl.hidden = !open;
    if (obiEl) obiEl.classList.toggle('is-open', open);
    if (dimEl) dimEl.hidden = !open;
  }
  function toggleGrade() {
    if (!gradeEl) return;
    const open = gradeEl.hidden;
    closeAll();
    gradeEl.hidden = !open;
    if (dimEl) dimEl.hidden = !open;
  }

  function obiBar(player, fv) {
    let ms = null;
    if (MQ.missions) MQ.save.update(function (p) { ms = MQ.missions.ensure(p); });
    const stk = MQ.streak ? MQ.streak.info(player) : null;
    if (!fv && !ms && !(stk && stk.fill)) return null;   // どれも ない ときは 帯を 出さない
    const dailyN = ms ? ms.list.filter(function (m) { return !m.letter; }) : [];
    const doneN = dailyN.filter(function (m) { return m.done; }).length;

    obiEl = h('button', {
      class: 'mapobi', type: 'button',
      'aria-label': 'きょうの フィーバー教科と ミッション',
      onclick: function () { MQ.sfx.tap(); togglePanel(); }
    }, [
      fv ? h('span', { class: 'mapobi__fever' }, [
        h('i', { class: 'mapobi__star' }),
        h('span', { class: 'mapobi__lbl', text: 'フィーバー' }),
        h('span', { class: 'mapobi__name', text: fv.name }),
        h('i', { class: 'mapobi__x2', text: '×2' })
      ]) : null,
      ms ? h('span', { class: 'mapobi__mis' + (doneN === dailyN.length ? ' is-all' : '') }, [
        h('span', { text: 'ミッション' }),
        h('b', { text: doneN + '/' + dailyN.length })
      ]) : null,
      /* つづけた 日（v8.4）。せまい ので 火の しるしと 数だけ */
      (stk && stk.fill) ? h('span', { class: 'mapobi__stk' + (stk.today ? ' is-today' : '') }, [
        h('i', { class: 'mapobi__fire' }),
        h('b', { text: stk.days + '日' })
      ]) : null,
      h('i', { class: 'mapobi__arrow' })
    ]);
    return obiEl;
  }

  /* =======================================================
     どこに 何を おくか
     ======================================================= */
  function layout() {
    const areas = MQ.content.subjectAreas();
    const out = [];
    const path = [];
    let y = TOP_SEA;
    let riverY = null;

    areas.forEach(function (area, ai) {
      const open = area.stages.filter(function (st) { return MQ.content.isAvailable(st); });
      const locked = area.stages.length - open.length;

      const items = open.map(function (st, i) { return { stage: st, idx: i + 1 }; });   // 番号は 開いている じゅんに 1・2・3…
      if (locked > 0) {
        const firstLocked = area.stages.filter(function (st) { return !MQ.content.isAvailable(st); })[0];
        items.push({ fog: true, count: locked, when: MQ.content.lockedReason(firstLocked) });
      }

      const rows = Math.max(1, Math.ceil(items.length / COL_X.length));
      const nodeTop = y + PILL_H;

      items.forEach(function (it, i) {
        const r = Math.floor(i / COL_X.length);
        let c = i % COL_X.length;
        if (r % 2 === 1) c = COL_X.length - 1 - c;      // つづら折り（ヘビの ように）
        it.xPct = COL_X[c];
        it.y = nodeTop + r * ROW_H + 26;               // 金ブロックの まんなか
        path.push({ xPct: it.xPct, y: it.y });
      });

      const hgt = PILL_H + rows * ROW_H + BAND_PAD;
      out.push({
        area: area, biome: area.biome || 'mountain',
        top: y, height: hgt, pillY: y + 9, nodes: items
      });
      y += hgt;

      // 国語の森の あとに 川を 通す（エリアが 3つ いじょうの ときだけ。小1は 2エリアで 川なし）
      if (ai === 1 && areas.length > 2) { riverY = y + RIVER_H / 2; y += RIVER_H; }
    });

    const islandTop = TOP_SEA - 16;
    const islandBottom = y + 10;

    // かざりは つぎの ゾーンの 上（さいごは 島の 下）まで おける
    out.forEach(function (b, i) {
      b.scenicBottom = (i + 1 < out.length) ? out[i + 1].top - 4 : islandBottom - 8;
    });

    // 塔の ある ワールドだけ：道は さいごに、塔の 島が 見える きしべ まで のばす
    const withTower = MQ.content.hasTower();
    if (withTower) path.push({ xPct: TOWER_XPCT, y: islandBottom - 22 });

    const towerY = islandBottom + STRAIT + 46;
    const height = withTower ? towerY + 44 + TOWER_PAD : islandBottom + STRAIT + 24;

    return {
      theme: MQ.content.activeWorld().id,      // 学年ごとの 色と 島の 形（v4.7）
      bands: out, height: height, riverY: riverY,
      island: { top: islandTop, bottom: islandBottom },
      tower: withTower ? { xPct: TOWER_XPCT, y: towerY } : null,
      path: path
    };
  }

  /* =======================================================
     かざり（山・木・家・岩・花・波）を 陸の 上に ちらす
     ======================================================= */
  const DECO = {
    mountain: ['tree', 'rock', 'flower', 'tree', 'flower', 'rock', 'flower', 'tree'],
    forest:   ['tree', 'tree', 'flower', 'tree', 'rock', 'tree', 'tree', 'flower'],
    sea:      ['tree', 'flower', 'tree', 'flower', 'rock', 'tree', 'flower', 'tree'],
    sky:      ['tree', 'flower', 'tree', 'flower', 'tree', 'rock', 'flower', 'tree'],
    // 小4（v4.6）：理科の 山は 草と 岩の おか、社会の 町は 家が ならぶ
    lake:     ['tree', 'flower', 'tree', 'rock', 'flower', 'tree', 'flower', 'tree'],
    town:     ['house', 'tree', 'flower', 'house', 'rock', 'flower', 'tree', 'house']
  };
  const DECO_W = { mt: 56, tree: 28, house: 34, rock: 22, flower: 8 };
  const DECO_H = { mt: 42, tree: 32, house: 26, rock: 15, flower: 7 };

  function decoEl(kind, xPct, yPx) {
    return { kind: kind, xPct: xPct, x: xPct * 4, y: yPx };
  }
  // いままでの かざり（ぼかしが 使えない ブラウザ＝ブロックの 地図の とき）
  function decoDom(d) {
    return h('div', { class: 'deco deco--' + d.kind, style: { left: d.xPct + '%', top: d.y + 'px' } },
      [h('i'), h('i'), h('i')]);
  }

  /* ノードと かさならないか。
     ・小さい かざり（木・岩・花）は 金ブロックだけ よける
       （文字チップの うしろに 少し 見えるのは 地図らしくて よい）
     ・大きい かざり（雪山・家）は 文字チップも よける */
  const BIG = { mt: true, house: true };
  function freeAt(b, xPct, yPx, kind) {
    const x = xPct * 4;                       // ％ → px（画面 400px）
    const hh = DECO_H[kind];
    const wBlock = DECO_W[kind] / 2 + 30;     // 金ブロックは よこ 52〜60px（v8.0）
    const wLabel = DECO_W[kind] / 2 + 66;     // 文字チップは よこ 126px まで（v8.0）
    for (let i = 0; i < b.nodes.length; i++) {
      const n = b.nodes[i], nx = n.xPct * 4;
      if (Math.abs(nx - x) < wBlock && yPx > n.y - 36 - hh && yPx < n.y + 38) return false;
      if (BIG[kind] && Math.abs(nx - x) < wLabel && yPx > n.y + 18 - hh && yPx < n.y + 96) return false;
    }
    return true;
  }

  // その ばしょが かざりを おける 陸か（道・橋・水・塔の島は だめ）
  function plantable(xPct, yPx, kind) {
    const T = MQ.tiles;
    const dx = DECO_W[kind] / 8;
    const pts = [[xPct, yPx], [xPct - dx, yPx], [xPct + dx, yPx], [xPct, yPx - 8]];
    for (let i = 0; i < pts.length; i++) {
      const t = T.at(grid, pts[i][0], pts[i][1]);
      if (!T.isLand(t) || t === T.ROAD || t === T.BRIDGE || t === T.DGRASS || t === T.DSAND) return false;
    }
    return true;
  }

  function tooNear(placed, xPct, yPx, kind) {
    for (let k = 0; k < placed.length; k++) {
      const p = placed[k];
      const gap = (DECO_W[kind] + DECO_W[p.kind]) / 2 + 4;
      if (Math.abs(p.x - xPct * 4) < gap && Math.abs(p.y - yPx) < 20) return true;
    }
    return false;
  }

  /* 大きい かざり（雪山・家）は 入る ところが 少ないので、
     ゾーンの 下から 上へ ていねいに さがして おく。 */
  const BIG_FOR = { mountain: ['mt', 'mt', 'mt'], forest: [], sea: ['house'], sky: ['house', 'house'],
                    lake: [], town: ['house', 'house', 'house'] };

  function bigPass(b, budget, placed, out) {
    const want = BIG_FOR[b.biome] || [];
    const seed = Math.round(b.top / 9);
    want.forEach(function (kind, wi) {
      if (budget[kind] != null && budget[kind] <= 0) return;
      const y0 = b.top + PILL_H + 8;
      const y1 = (b.scenicBottom || b.top + b.height) - 6;
      for (let s = 0; s < 320; s++) {
        const yPx = y1 - Math.floor(s / 8) * 5;                    // 下から 上へ
        const xPct = 8 + ((s * 23 + seed * 7 + wi * 37) % 84);
        if (yPx < y0) break;
        if (!freeAt(b, xPct, yPx, kind)) continue;
        if (!plantable(xPct, yPx, kind)) continue;
        if (tooNear(placed, xPct, yPx, kind)) continue;
        placed.push({ x: xPct * 4, y: yPx, kind: kind });
        if (budget[kind] != null) budget[kind]--;
        out.push(decoEl(kind, xPct, yPx));
        return;
      }
    });
  }

  function scatter(b, budget, placed) {
    const out = [];
    bigPass(b, budget, placed, out);

    const kinds = DECO[b.biome] || DECO.mountain;
    const seed = Math.round(b.top / 9);
    const span = Math.max(60, (b.scenicBottom || b.top + b.height) - b.top - PILL_H - 12);
    const tries = b.biome === 'forest' ? 104 : 76;
    for (let i = 0; i < tries; i++) {
      const kind = kinds[(i + seed) % kinds.length];
      const xPct = 6 + ((i * 41 + seed * 13) % 88);
      const yPx = b.top + PILL_H + 6 + ((i * 67 + seed * 29) % span);
      if (!freeAt(b, xPct, yPx, kind)) continue;
      if (!plantable(xPct, yPx, kind)) continue;
      if (tooNear(placed, xPct, yPx, kind)) continue;
      placed.push({ x: xPct * 4, y: yPx, kind: kind });
      out.push(decoEl(kind, xPct, yPx));
    }
    // 波（海の 上）
    for (let i = 0; i < 4; i++) {
      const xPct = i % 2 ? 4 : 95;
      const yPx = b.top + 34 + i * 52;
      if (MQ.tiles.landAt(grid, xPct, yPx)) continue;
      out.push(h('div', {
        class: 'deco deco--wave',
        style: { left: xPct + '%', top: yPx + 'px', animationDuration: (5 + i) + 's' }
      }));
    }
    return out;
  }

  // 塔の 小島の かざり（枯れ木と 光る 紫の クリスタル）
  let decoList = [];            // なめらかな 地図に 描く かざり（paint() で 描き直す）
  function towerDeco(t) {
    const out = [];
    const set = [
      ['dead', -24, -18], ['dead', -14, 16], ['crystal', -20, 30],
      ['dead', 22, -14], ['crystal', 19, 22], ['crystal', 7, 34], ['crystal', -6, 40]
    ];
    set.forEach(function (s) { out.push(decoEl(s[0], t.xPct + s[1], t.y + s[2])); });
    return out;
  }

  /* =======================================================
     地図の 建物を 本物の 3D に（v13.4）
     家と さいごの塔の 城だけ（もともと 四角い もの）。木・岩は tiles.js の paintDecos が 地面に 描く
     （四角い 箱で 木を 作ると ブロックの 木に もどる）。
     奥ゆきは はばと 同じ くらい（家 36・天守 46・塔 30）。v12.0 の 自動の 厚み（上限 18）では
     「薄っぺらい」と 言われた。カメラは 横 32°・上から 22° 見おろす（下から だと 建物の うらが 見えた）。
     城は 部品ごとに 組み、左右の 塔を 天守より 手まえに 出す。
     **3D の 図に filter を かけない**（平らに なる）→ まだ 開いて いない 城は 暗い 色で 作る。
     りったいを 切った ときは いままでの 絵（家＝地面に 描く・城＝TOWER_B）。
     ======================================================= */
  const BLD_RX = -22, BLD_RY = -32;
  function bldScene(v, size, from) {
    const sc = h('div', { class: 'v3scene mapbld__scene', style: { width: size + 'px', height: size + 'px', perspective: '900px' } });
    const fig = h('div', { class: 'v3fig', style: { width: size + 'px', height: size + 'px', transform: 'rotateX(' + BLD_RX + 'deg) rotateY(' + BLD_RY + 'deg)' } });
    const k = size / from;
    const hold = h('div', { class: 'v3hold', style: { left: ((size - from) / 2) + 'px', top: (size - from) + 'px', width: from + 'px', height: from + 'px', transform: 'scale3d(' + k + ',' + k + ',' + k + ')' } });
    hold.appendChild(v); fig.appendChild(hold); sc.appendChild(fig);
    return sc;
  }
  function bldBx(rects, pal, base) {
    return MQ.blocks.el(rects, MQ.blocks.fill(pal), { raw: true, base: base, plain: true });
  }
  function use3d() { return !!(MQ.tiles.smooth() && MQ.vox && MQ.ui.v3 && MQ.ui.v3.on()); }
  const HOUSE3D = [[4, 6, 40, 12, 'r'], [8, 18, 32, 22, 'w'], [20, 28, 8, 12, 'd', 'n'], [11, 22, 6, 6, 'y', 'g'], [31, 22, 6, 6, 'y', 'g']];
  const HOUSE3D_PAL = { r: '#e0604e', w: '#f6efdc', d: '#6d4726', y: '#ffd86b' };
  function house3d(d) {
    const v = MQ.vox.fromBx(bldBx(HOUSE3D, HOUSE3D_PAL, 48), { unit: 2, max: 36 });
    return h('div', { class: 'mapbld', style: { left: d.xPct + '%', top: (d.y + 6) + 'px' } }, [bldScene(v, 50, 96)]);
  }
  const CASTLE_PAL = { s: '#6b5a96', t: '#7f6db0', d: '#3e3266', g: '#1e1638', a: '#a2385e', p: '#3a2d5e', f: '#d93a58', w: '#ff8a4d', e: '#ff5a5a' };
  const CASTLE_LOCK = { s: '#4d4760', t: '#5a5470', d: '#2c2840', g: '#16131f', a: '#6a3a4c', p: '#2a2538', f: '#8a3a4c', w: '#a86a4d', e: '#b85a5a' };
  function castle3d(locked) {
    const P = locked ? CASTLE_LOCK : CASTLE_PAL;
    const G = function (rects) { return bldBx(rects, P, 116); };
    const KEEP_D = 46, TOWER_D = 30, TOWER_Z = 12, CREN_D = 6;
    const keep = [[34, 38, 48, 78, 't'], [31, 29, 54, 9, 's'], [48, 86, 20, 30, 'g', 'n'], [51, 87, 14, 5, 'a', 'n'], [43, 58, 10, 12, 'e', 'g'], [63, 58, 10, 12, 'e', 'g']];
    const tL = [[10, 54, 22, 62, 's'], [8, 46, 26, 8, 't'], [16, 71, 8, 11, 'w', 'g']];
    const tR = [[84, 54, 22, 62, 's'], [82, 46, 26, 8, 't'], [90, 71, 8, 11, 'w', 'g']];
    const cK = [[31, 21, 8, 8, 'd'], [42, 21, 8, 8, 'd'], [53, 21, 8, 8, 'd'], [64, 21, 8, 8, 'd'], [77, 21, 8, 8, 'd']];
    const cL = [[8, 39, 7, 7, 'd'], [17, 39, 7, 7, 'd'], [27, 39, 7, 7, 'd']];
    const cR = [[82, 39, 7, 7, 'd'], [91, 39, 7, 7, 'd'], [101, 39, 7, 7, 'd']];
    const flag = [[56, 11, 4, 10, 'p'], [60, 8, 16, 9, 'f']];
    const v = MQ.vox.fromGroups([
      { cls: 'keep', bx: G(keep), joint: [58, 116], thick: KEEP_D },
      { cls: 'towerL', bx: G(tL), joint: [21, 116], thick: TOWER_D },
      { cls: 'towerR', bx: G(tR), joint: [95, 116], thick: TOWER_D },
      { cls: 'crenK', bx: G(cK), joint: [58, 29], thick: CREN_D, floor: false },
      { cls: 'crenKb', bx: G(cK), joint: [58, 29], thick: CREN_D, floor: false },
      { cls: 'crenL', bx: G(cL), joint: [21, 46], thick: CREN_D, floor: false },
      { cls: 'crenLb', bx: G(cL), joint: [21, 46], thick: CREN_D, floor: false },
      { cls: 'crenR', bx: G(cR), joint: [95, 46], thick: CREN_D, floor: false },
      { cls: 'crenRb', bx: G(cR), joint: [95, 46], thick: CREN_D, floor: false },
      { cls: 'flag', bx: G(flag), joint: [58, 21], thick: 3, floor: false }
    ], { unit: 1 });
    // 手まえ（+）・奥（−）へ ずらす。箱は 奥ゆきの まん中ぞろえ なので へりに そろえる
    const z = {
      towerL: TOWER_Z, towerR: TOWER_Z,
      crenK: KEEP_D / 2 - CREN_D / 2, crenKb: -(KEEP_D / 2 - CREN_D / 2),
      crenL: TOWER_Z + TOWER_D / 2 - CREN_D / 2, crenLb: TOWER_Z - TOWER_D / 2 + CREN_D / 2,
      crenR: TOWER_Z + TOWER_D / 2 - CREN_D / 2, crenRb: TOWER_Z - TOWER_D / 2 + CREN_D / 2
    };
    Object.keys(z).forEach(function (key) { const n = v.querySelector('.p--' + key); if (n) n.style.transform = 'translateZ(' + z[key] + 'px)'; });
    return h('span', { class: 'tower__art tower__art--3d' }, [bldScene(v, 116, 116)]);
  }

  /* =======================================================
     さいごの塔
     ======================================================= */
  function towerEl(player, t) {
    const open = MQ.content.towerOpen(player);
    const gotN = MQ.content.fragCount(player);
    const need = MQ.content.subjectAreas().length;          // 小3は 4教科・小4は 5教科（v4.8）
    const last = MQ.content.lastBoss();
    const beaten = (player.dex && player.dex[last.id]) > 0;
    const kid = (MQ.content.activeWorld().grade || 3) <= 2;   // 小1・小2は ひらがなで（v6.4）

    return h('button', {
      class: 'tower' + (open ? '' : ' tower--lock'), type: 'button',
      style: { left: t.xPct + '%', top: t.y + 'px' },
      onclick: function () {
        MQ.sfx.tap();
        if (!open) { MQ.ui.toast('まなびの かけらを ' + need + 'つ あつめよう'); return; }
        MQ.ui.battle.start(MQ.content.towerStageId());
      }
    }, [
      h('span', { class: 'tower__aura' }),
      h('span', { class: 'tower__sign', text: MQ.content.towerName().replace(' ', '') }),
      h('span', { class: 'tower__sub', text: open ? (beaten ? (kid ? 'もういちど いどむ' : 'もう一度 いどむ') : last.name + (kid ? 'が まって いる！' : 'が 待つ！')) : 'かけら ' + gotN + ' / ' + need }),
      use3d() ? castle3d(!open) : towerArt()
    ]);
  }

  /* さいごの塔の 絵（v9.3「まおうの 城」）

     まえは むらさきの 四角 1つに 赤い 目 2つ だけ だった。
     ユーザー「塔も もっと カッコ良くして」→ 3案を 見て もらって **B案（まおうの 城）**に 決定。

     まん中の 天守＋左右の 小塔＋ぎざぎざの 城かべ＋大きな もん＋旗。
     100×116 の 中に 四角を ならべる（monsterart.js と 同じ 書き方）。
     色と 光は CSS（`.twb--*`）が もつ ので、開いて いない ときは まとめて 暗く できる。 */
  const TOWER_B = [
    // [左, 下から, よこ, たて, たね]
    // 左の 小塔
    [2, 0, 22, 62, 'stone'], [0, 62, 26, 8, 'stone2'],
    [0, 70, 7, 7, 'dark'], [9, 70, 7, 7, 'dark'], [18, 70, 7, 7, 'dark'],
    [8, 34, 8, 11, 'win'],
    // 右の 小塔
    [76, 0, 22, 62, 'stone'], [74, 62, 26, 8, 'stone2'],
    [74, 70, 7, 7, 'dark'], [83, 70, 7, 7, 'dark'], [92, 70, 7, 7, 'dark'],
    [82, 34, 8, 11, 'win'],
    // まん中の 天守
    [26, 0, 48, 78, 'stone2'], [23, 78, 54, 9, 'stone'],
    [23, 87, 8, 8, 'dark'], [34, 87, 8, 8, 'dark'], [45, 87, 8, 8, 'dark'],
    [56, 87, 8, 8, 'dark'], [67, 87, 8, 8, 'dark'],
    // 大きな もん
    [40, 0, 20, 30, 'gate'], [43, 24, 14, 5, 'arch'],
    // もんの 上の 光る 目
    [35, 46, 10, 12, 'eye'], [55, 46, 10, 12, 'eye'],
    // はた
    [48, 95, 4, 10, 'pole'], [52, 99, 16, 9, 'flag']
  ];

  /* =======================================================
     地図の ドックの アイコン（v13.4・ジオラマ仕上げ）
     v13.3 の ブロックの アイコンは「荒い・汚く 見える」→ デザインの キャンバスで 3つの 仕上げ
     （ジオラマ／つやつや／フラット）を 作り、地図の B案と 同じ 光の **ジオラマ**を 使う。
     64×64 の SVG。面ごとに 平らな 3色（上＝明るい・前・横＝暗い）＋ 足もとの やわらかい かげ。光は 左上。
       book … メニュー／scroll … しゅぎょうば／dice … ごちゃまぜ（3つの 面が 算数・国語・理科の 色）
       hourglass … タイムアタック／coin … コイン
     まえの ごちゃまぜの 4まいの 四角は Windows の マークに にて いた ので 使わない。
     見た目の 正本は docs/STYLE_GUIDE.md の「地図の ドック（v13.3）」「地図を なめらかに（v13.4）」
     ======================================================= */
  const ICON_MAT = {
    gold: ['#ffe9a3', '#f3c545', '#b8801d'], gold2: ['#fff3c4', '#ffd447', '#d59a1b'],
    paper: ['#fffdf3', '#f6ebc9', '#d8c79a'], ink: ['#9c8a6a', '#8a7757', '#6d5c40'],
    red: ['#ff8a7a', '#e0463c', '#9f2b25'], wood: ['#c99263', '#9a6a3c', '#6b4526'],
    blue: ['#7ea8ff', '#4f7de0', '#2f4f9e'], bluedk: ['#5a7ad0', '#3457b0', '#1f3776'],
    cream: ['#fffdf5', '#f4ecd8', '#d9cdb4'], glass: ['#e9f7ff', '#bfe4f7', '#8fc6e6'],
    sand: ['#ffe6a8', '#f2c76a', '#c99a3c'], orange: ['#ffb08a', '#ff8f5e', '#c9562b'],
    green: ['#a7ee7b', '#63d94f', '#3c9a33'], sky: ['#a6e9ff', '#4fd3ff', '#2a9cc9'],
    white: ['#ffffff', '#ffffff', '#e6e6e6']
  };
  // [材料, 面（top／front／side／detail）, かたち]
  const DOCK_ICONS = {
    dice: [
      ['green', 'top', 'M32 6 L58 19 L32 32 L6 19 Z'],
      ['orange', 'front', 'M6 19 L32 32 L32 60 L6 47 Z'],
      ['sky', 'side', 'M32 32 L58 19 L58 47 L32 60 Z'],
      ['white', 'detail', 'M32 19 m-4 0 a4 2.2 0 1 0 8 0 a4 2.2 0 1 0 -8 0'],
      ['white', 'detail', 'M14 33 a2.6 3.2 0 1 0 5.2 0 a2.6 3.2 0 1 0 -5.2 0 M19 40 a2.6 3.2 0 1 0 5.2 0 a2.6 3.2 0 1 0 -5.2 0 M24 47 a2.6 3.2 0 1 0 5.2 0 a2.6 3.2 0 1 0 -5.2 0'],
      ['white', 'detail', 'M39 36 a2.6 3.2 0 1 0 5.2 0 a2.6 3.2 0 1 0 -5.2 0 M47 46 a2.6 3.2 0 1 0 5.2 0 a2.6 3.2 0 1 0 -5.2 0']
    ],
    book: [
      ['cream', 'side', 'M50 12 L56 16 L56 58 L50 54 Z'],
      ['cream', 'front', 'M16 54 L50 54 L56 58 L22 58 Z'],
      ['bluedk', 'side', 'M10 12 L16 8 L16 54 L10 50 Z'],
      ['blue', 'top', 'M10 12 L16 8 L50 8 L44 12 Z'],
      ['blue', 'front', 'M10 12 L44 12 Q50 12 50 18 L50 54 L10 54 Z'],
      ['bluedk', 'detail', 'M10 12 L17 12 L17 54 L10 54 Z'],
      ['paper', 'detail', 'M22 22 L42 22 L42 25 L22 25 Z M22 30 L42 30 L42 33 L22 33 Z M22 38 L36 38 L36 41 L22 41 Z'],
      ['red', 'detail', 'M36 12 L44 12 L44 32 L40 28 L36 32 Z']
    ],
    scroll: [
      ['paper', 'front', 'M14 16 L50 16 L50 48 L14 48 Z'],
      ['ink', 'detail', 'M20 24 L42 24 L42 26.5 L20 26.5 Z M20 31 L44 31 L44 33.5 L20 33.5 Z M20 38 L36 38 L36 40.5 L20 40.5 Z'],
      ['red', 'detail', 'M43 16 L47 16 L47 44 L45 41 L43 44 Z'],
      ['gold', 'top', 'M8 10 Q8 6 12 6 L52 6 Q56 6 56 10 L56 12 L8 12 Z'],
      ['gold', 'front', 'M8 12 L56 12 L56 16 Q56 20 52 20 L12 20 Q8 20 8 16 Z'],
      ['gold', 'side', 'M52 6 Q58 6 58 13 Q58 20 52 20 Q55 20 55 13 Q55 6 52 6 Z'],
      ['gold', 'top', 'M8 46 Q8 42 12 42 L52 42 Q56 42 56 46 L56 48 L8 48 Z'],
      ['gold', 'front', 'M8 48 L56 48 L56 52 Q56 56 52 56 L12 56 Q8 56 8 52 Z'],
      ['gold', 'side', 'M52 42 Q58 42 58 49 Q58 56 52 56 Q55 56 55 49 Q55 42 52 42 Z'],
      ['wood', 'detail', 'M4 10 L8 8 L8 18 L4 16 Z M4 46 L8 44 L8 54 L4 52 Z M56 8 L60 10 L60 16 L56 18 Z M56 44 L60 46 L60 52 L56 54 Z']
    ],
    hourglass: [
      ['wood', 'side', 'M16 12 L19 12 L19 52 L16 52 Z M45 12 L48 12 L48 52 L45 52 Z'],
      ['glass', 'front', 'M19 12 L45 12 Q45 26 34 32 Q45 38 45 52 L19 52 Q19 38 30 32 Q19 26 19 12 Z'],
      ['sand', 'front', 'M22 44 Q32 34 42 44 L45 52 L19 52 Z'],
      ['sand', 'detail', 'M23 12 L41 12 Q41 21 33 26 L31 26 Q23 21 23 12 Z'],
      ['sand', 'detail', 'M31.4 30 L32.6 30 L32.6 46 L31.4 46 Z'],
      ['white', 'detail', 'M22 15 Q23 22 27 26 L24 27 Q21 22 21 15 Z'],
      ['wood', 'top', 'M12 6 Q12 4 14 4 L50 4 Q52 4 52 6 L52 8 L12 8 Z'],
      ['wood', 'front', 'M12 8 L52 8 L52 12 L12 12 Z'],
      ['wood', 'top', 'M12 52 L52 52 L52 55 L12 55 Z'],
      ['wood', 'front', 'M12 55 L52 55 L52 58 Q52 60 50 60 L14 60 Q12 60 12 58 Z']
    ],
    coin: [
      ['gold', 'side', 'M32 8 a24 24 0 1 0 0.1 0 Z'],
      ['gold2', 'front', 'M32 6 a24 24 0 1 0 0.1 0 Z'],
      ['gold', 'detail', 'M32 12 a18 18 0 1 0 0.1 0 Z'],
      ['gold2', 'top', 'M32 14 a16 16 0 1 0 0.1 0 Z'],
      ['gold', 'side', 'M32 18 L35.5 26.5 L44.5 27.2 L37.6 33.1 L39.8 42 L32 37.2 L24.2 42 L26.4 33.1 L19.5 27.2 L28.5 26.5 Z']
    ]
  };
  function dockSvg(name, size) {
    const shapes = DOCK_ICONS[name] || DOCK_ICONS.dice;
    const body = shapes.map(function (p) {
      const t = ICON_MAT[p[0]];
      const fill = p[1] === 'top' ? t[0] : p[1] === 'side' ? t[2] : t[1];
      const edge = p[1] === 'top' ? ' stroke="rgba(255,255,255,.35)" stroke-width=".8" stroke-linejoin="round"' : '';
      return '<path d="' + p[2] + '" fill="' + fill + '"' + edge + '/>';
    }).join('');
    const shadow = name === 'coin' ? '' : '<ellipse cx="34" cy="60" rx="24" ry="4" fill="rgba(10,20,40,.28)"/>';
    return '<svg viewBox="0 0 64 64" width="' + size + '" height="' + size + '" aria-hidden="true" focusable="false">' + shadow + body + '</svg>';
  }
  function dockIcon(name, size) {
    const el = document.createElement('span');
    el.className = 'dockico';
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.innerHTML = dockSvg(name, size);
    return el;
  }

  /* 地図の 下の あき（ドックの ぶん）と スクロールの すきまを 海と 同じ 色に（v13.4）。
     なめらかな 地図は 海が まん中 明るく はしが ふかい ので、1色だと 帯に 見える */
  function seaBg() {
    if (!grid || !MQ.tiles.smooth()) return '';
    const c = MQ.tiles.smoothColors(grid.colors);
    return 'linear-gradient(90deg, ' + c.seaDeep + ', ' + c.sea + ' 50%, ' + c.seaDeep + ')';
  }

  function towerArt() {
    const art = h('span', { class: 'tower__art' });
    TOWER_B.forEach(function (p) {
      art.appendChild(h('i', {
        class: 'twb twb--' + p[4],
        style: { left: p[0] + 'px', bottom: p[1] + 'px', width: p[2] + 'px', height: p[3] + 'px' }
      }));
    });
    return art;
  }

  /* =======================================================
     画面を つくる
     ======================================================= */
  /* はじめての 子（v11.1）
       1回も たたかって いない あいだは、地図の 上下を からっぽに して
       「ステージを おす」ことだけに する。フィーバー・ミッション・スタンプ・
       ごちゃまぜ・タイムアタックは 1回 たたかうと 出る（unlockPop で 知らせる）。
     ※ 息子さんは もう ぜんぶ 知って いる ので、この 道は 新しく 作った 子だけ 通る */
  function isFirstTime(player) { return (player.battles || 0) === 0; }

  function render() {
    const player = MQ.save.current();
    if (!player) { MQ.ui.start.render(); MQ.ui.show('screen-start'); return; }
    const firstTime = isFirstTime(player);
    MQ.ui.syncCustom();
    /* スタンプの ごほうび（v8.4）：3日・5日・7日で コイン。
       もらえる 日は 下で パネルを ひらいて 見せる（1日 1回だけ） */
    gotStamp = null;
    if (MQ.streak && !firstTime) MQ.save.update(function (p) {
      gotStamp = MQ.streak.claim(p);
      if (gotStamp) MQ.save.addLog(p, 'れんぞく ' + gotStamp.days + '日！ コイン +' + gotStamp.coins);
    });
    MQ.bgm.play('map');

    plan = layout();
    bands = plan.bands;
    grid = MQ.tiles.build(plan);

    canvas = h('canvas', { class: 'map__bg' });
    layer = h('div', { class: 'map__layer' });
    sheet = h('div', { class: 'map__sheet', style: { height: Math.round(grid.heightPx) + 'px' } }, [
      canvas, layer
    ]);
    MQ.tiles.paint(canvas, grid);
    // 背景（v12.6）：海の 向こうの うすい 山なみ（A）と 時間帯の 光（C）。島・道・マス目は さわらない
    if (MQ.ui.scenery) { layer.appendChild(MQ.ui.scenery.mapFar(plan.theme)); sheet.appendChild(MQ.ui.scenery.mapTint()); }

    // 木の 板の 橋（ブロックの 地図の とき だけ。なめらかな 地図は tiles.js が 板を 描く）
    const smooth = MQ.tiles.smooth();
    const bld3d = use3d();
    decoList = [];
    function addDeco(d) {
      if (d && d.nodeType) { if (!smooth) layer.appendChild(d); return; }      // 波（ブロックの 地図だけ）
      if (!smooth) { layer.appendChild(decoDom(d)); return; }
      if (d.kind === 'house') { d.flat = !bld3d; if (bld3d) layer.appendChild(house3d(d)); }
      decoList.push(d);
    }
    if (!smooth) grid.bridges.forEach(function (r) {
      layer.appendChild(h('div', {
        class: 'bridge',
        style: { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' }
      }));
    });

    // いま あそぶ ところ（まだ ★の ない いちばん さいしょの ステージ）
    let nowId = null;
    bands.forEach(function (b) {
      b.nodes.forEach(function (n) {
        if (nowId || n.fog) return;
        const st = n.stage;
        if (!MQ.content.isUnlocked(player, b.area, st)) return;
        if (!(player.stars && player.stars[st.id])) nowId = st.id;
      });
    });

    // かざりの 数の じょうげん（家は 3けん まで）と、おいた ばしょ
    const budget = { house: 3, mt: 5 };
    const placed = [];

    // きょうの フィーバー教科（v7.2）。日づけが 変わって いれば ここで 決め直す
    let feverNow = null;
    if (MQ.fever && !firstTime) MQ.save.update(function (p) { feverNow = MQ.fever.today(p); });

    bands.forEach(function (b) {
      /* ---- かざり（ノードより 下の そう） ---- */
      scatter(b, budget, placed).forEach(addDeco);

      /* ---- ゾーン見出し（ノードの 行の 上の 余白に おく） ---- */
      const stars = MQ.content.starsIn(player, b.area);
      const need = MQ.content.fragNeed(b.area);
      const got = MQ.content.hasFrag(player, b.area.id);
      const isFever = !!(feverNow && feverNow.areaId === b.area.id);   // きょうの フィーバー教科（v7.2）
      layer.appendChild(h('div', {
        class: 'biome' + (isFever ? ' biome--fever' : ''), style: { top: b.pillY + 'px' }
      }, [
        isFever ? h('span', { class: 'biome__fever', text: 'フィーバー' }) : null,
        h('span', { class: 'biome__name', text: b.area.name }),
        h('span', { class: 'biome__stars', text: got ? '★' + stars + ' ✓' : '★' + stars + ' / ' + need })
      ]));

      /* ---- ステージ ---- */
      b.nodes.forEach(function (n) {
        if (n.fog) {
          /* しゅぎょうば（v13.0）：つぎの ステージに 指導の 中身が あれば、霧の ノードを 押すと 予習に 行ける */
          const pt = (!firstTime && MQ.dojo && MQ.ui.dojo) ? MQ.dojo.previewTarget(player, b.area) : null;
          layer.appendChild(h(pt ? 'button' : 'div', {
            class: 'node node--fog' + (pt ? ' node--dojo' : ''), type: pt ? 'button' : null,
            style: { left: n.xPct + '%', top: n.y + 'px' },
            onclick: pt ? function () { MQ.sfx.tap(); MQ.ui.dojo.open(pt.id); } : null
          }, [
            h('span', { class: 'node__dot', text: '?' }),
            pt ? h('span', { class: 'node__pre node__pre--fog', text: 'よしゅう' }) : null,
            h('span', { class: 'node__soon', text: 'あと ' + n.count + 'こ' }),
            n.when ? h('span', { class: 'node__name', text: pt ? 'しゅぎょうばで' : n.when }) : null
          ]));
          return;
        }
        const st = n.stage;
        const sc = (player.stars && player.stars[st.id]) || 0;
        const unlocked = MQ.content.isUnlocked(player, b.area, st);
        const isNow = st.id === nowId;

        let cls = 'node';
        if (!unlocked) cls += ' node--lock';
        else if (isNow) cls += ' node--now';
        else if (sc) cls += ' node--clear';
        if (isFever && unlocked) cls += ' node--fever';   // フィーバー教科の ステージは 光る（v7.2）
        // しゅぎょうばの 予習で 開いた ステージ（学期では まだ）には「よしゅう」の リボン（v13.0）
        const previewed = !!(MQ.dojo && MQ.dojo.termClosed(player, st) && MQ.dojo.previewOpen(player, st.id));
        if (previewed) cls += ' node--preview';

        const dot = h('span', { class: 'node__dot', text: unlocked ? String(n.idx || st.no) : '?' });
        if (isNow) dot.appendChild(h('span', { class: 'node__here', text: 'いま ここ' }));

        /* はじめての 子には 指さしの ふきだし（v11.1）
           **ノードの 下**に 出す。実測（harness #firstplay:measure）で
             いま ここ ノード（ステージ名 こみ） y 76〜170 ／ ゾーン見出し y 43〜75 ／ つぎの 行 y 212
           ＝ あいて いるのは y 170〜212 の 42px だけ。ふきだしは 31px。
           上や よこに おくと 見出し・となりの ステージに かさなる（2回 ふんだ）。
           はじめての 子の「いま ここ」は かならず 1行めの 1つめ なので 下は 空いて いる */
        if (firstTime && isNow) {
          layer.appendChild(h('div', {
            class: 'mapguide', style: { left: n.xPct + '%', top: (n.y + 64) + 'px' }
          }, [
            h('div', { class: 'mapguide__in' }, [
              h('i', { class: 'mapguide__tail' }),
              h('div', { class: 'mapguide__box', text: 'ここを おしてね！' })
            ])
          ]));
        }
        layer.appendChild(h('button', {
          class: cls, type: 'button', disabled: !unlocked,
          style: { left: n.xPct + '%', top: n.y + 'px' },
          title: st.name,
          onclick: function () {
            if (!unlocked) { MQ.sfx.tap(); MQ.ui.toast('まえの ステージで ★を とろう'); return; }
            MQ.sfx.tap();
            MQ.ui.battle.start(st.id);
          }
        }, [
          dot,
          previewed ? h('span', { class: 'node__pre', text: 'よしゅう' }) : null,
          MQ.ui.stars(sc),
          h('span', { class: 'node__name', text: st.name })
        ]));
      });
    });

    /* ---- さいごの塔の 小島（小1には ない） ---- */
    if (plan.tower) {
      towerDeco(plan.tower).forEach(addDeco);
      layer.appendChild(towerEl(player, plan.tower));
    }
    // なめらかな 地図：木・岩・花・雪山・枯れ木・クリスタル（と 家の かげ）を 地面に 描く（v13.4）
    if (smooth) MQ.tiles.paintDecos(canvas, grid, decoList);

    /* ---- がくねん えらび（v4.5）------------------------------------------
     予習・復習の ために 学年を いつでも 変えられる。
     ★が ついて いるのが その子の 学校の 学年（学期の せっていは そこだけに かかる）。
     じゅんびちゅうの 学年は うすく 出て、押すと おしらせだけ 出る。
     -------------------------------------------------------------------- */
  function gradeRow(player) {
    const own = player.grade || 3;
    const nowId = MQ.content.activeWorld().id;
    return h('div', { class: 'grrow' }, MQ.content.worlds.map(function (w) {
      const open = !w.locked;
      const on = w.id === nowId;
      return h('button', {
        class: 'chip chip--g' + (on ? ' is-on' : '') + (open ? '' : ' is-prep'),
        type: 'button',
        'aria-label': '小' + w.grade + (open ? '' : '（じゅんびちゅう）'),
        onclick: function () {
          MQ.sfx.tap();
          if (!open) { MQ.ui.toast('小' + w.grade + 'は じゅんびちゅう。もう すこし まってね'); return; }
          if (on) return;
          if (!MQ.save.setPlayGrade(w.grade)) return;
          MQ.ui.toast(w.grade === own ? '小' + w.grade + 'に もどったよ'
            : w.grade < own ? '小' + w.grade + 'の ふくしゅう！'
            : '小' + w.grade + 'の よしゅう！');
          MQ.ui.goMap();
        }
      }, [
        h('b', { text: '小' + w.grade }),
        w.grade === own ? h('i', { class: 'chip__own', text: '★' }) : null
      ]);
    }));
  }

    /* ---- 上の ヘッダー（v8.0）------------------------------------------
       前は 顔・フィーバー・ミッション・ボタン3つ・学年チップ で 355px あり、
       たて700 の タブレットでは **画面の 半分**を 上が 使って いた。
       いまは 顔の 段（60px）＋ 1本の 帯（40px）だけ。
       フィーバーと ミッションの くわしい 中身は 帯を 押すと
       地図の 上に かぶさって 出る（mappanel）。
       メニュー・タイムアタック・プレイヤー・学年は 画面の 下の 段へ。
       -------------------------------------------------------------------- */
    panelEl = h('div', { class: 'mappanel', hidden: true }, [
      stampPanel(player),
      feverPanel(player, feverNow),
      missionsPanel(player)
    ]);
    dimEl = h('div', { class: 'mapdim', hidden: true, onclick: function () { closeAll(); } });

    const top = h('div', { class: 'maptop' }, [
      MQ.ui.hud(player, { slim: true }),
      // はじめての 子には 帯を 出さない（1回 たたかうと 出る・v11.1）
      firstTime ? null : obiBar(player, feverNow),
      firstTime ? null : panelEl
    ]);

    /* ---- 下の ドック（v13.3・案A）----
       まえは 地図の 下に 大きな 帯が つみ上がって いた（てがみ・しゅぎょうば・ごちゃまぜ・とっくん）。
       混む 日は 地図が 画面の 44%（311/700）まで へった。
       → 下の 段を アイコンの ならび（ドック）に して、ごちゃまぜは まん中の 大きな ボタンに。
         てがみ と にげた敵は 地図の すみに 浮かぶ 小さな ふだ（出る 日だけ）。
         プレイヤーの ボタンは 学年えらび（小3 ▾）の 中へ。
       → 地図は どの 日も 513（タブレット）。
       class 名（.maptab .maptab--grade .mixbtn .dojobtn .tegamibtn .tegamibtn__t .revenge）は
       harness が 見て いる ので 名前を 変えない。
       はじめての 子（v11.1）は メニューと 学年だけ（ほかは 1回 たたかうと 出る）。
       見た目の 正本は docs/STYLE_GUIDE.md の「地図の ドック（v13.3）」 */
    const escapedCount = MQ.save.countAllEscaped(player);
    const hasLetter = !!(!firstTime && MQ.letter && MQ.letter.pending(player));
    const hasRevenge = !firstTime && escapedCount > 0;
    const revFirst = hasRevenge ? (MQ.save.allEscaped(player)[0] || {}).entry : null;
    const dojoOn = !!(!firstTime && MQ.dojo && MQ.ui.dojo);
    const mixOn = !firstTime && MQ.content.mixOpen(player);
    const hasChips = hasLetter || hasRevenge;
    function tab(label, ico, onclick, cls, extra, aria) {
      return h('button', {
        class: 'maptab' + (cls ? ' ' + cls : ''), type: 'button', 'aria-label': aria || label,
        onclick: function () { MQ.sfx.tap(); onclick(); }
      }, [dockIcon(ico, 30), h('b', { class: 'maptab__t', text: label }), extra || null]);
    }
    const bottom = h('div', { class: 'mapbottom' + (mixOn ? ' has-mix' : '') }, [
      /* 地図の すみの ふだ：おうちの人からの てがみ（v8.5・読んだら 消える）と にげた敵（とっくん） */
      hasChips ? h('div', { class: 'mapchips' }, [
        hasLetter ? h('button', {
          class: 'mapchip tegamibtn', type: 'button', 'aria-label': 'おうちの人から てがみ',
          onclick: function () { MQ.sfx.tap(); openLetter(); }
        }, [
          h('span', { class: 'tegamibtn__env' }, [h('i', { class: 'flap' }), h('i', { class: 'seal' })]),
          h('b', { class: 'tegamibtn__t', text: 'てがみ' })
        ]) : h('span'),
        hasRevenge ? h('button', {
          class: 'mapchip revenge', type: 'button', 'aria-label': 'にげた敵と とっくん',
          onclick: function () { MQ.sfx.tap(); MQ.ui.battle.startTokkun(); }
        }, [
          (revFirst && revFirst.enemyId) ? MQ.enemies.node(revFirst.enemyId, { size: 30, cls: 'revenge__mon' }) : null,
          h('span', { class: 'revenge__text' }, ['にげた敵 ', h('b', { text: String(escapedCount) }), 'ひき']),
          h('i', { class: 'revenge__go' })
        ]) : null
      ]) : null,

      /* 学年えらび（v8.0）：ふだんは かくして おき、下の「小3 ▾」で 出す。
         プレイヤーを かえる ボタンも ここ（v13.3・ドックに 入りきらない ため） */
      gradeEl = h('div', { class: 'gradesheet', hidden: true }, [
        h('p', { class: 'gradesheet__note', text: 'べつの 学年で あそぶ（よしゅう・ふくしゅう）' }),
        gradeRow(player),
        h('button', {
          class: 'gradesheet__player', type: 'button',
          onclick: function () { MQ.sfx.tap(); MQ.ui.start.render(); MQ.ui.show('screen-start'); }
        }, [h('span', { text: 'プレイヤーを かえる' }), h('i', { class: 'gradesheet__go', text: '▶' })])
      ]),

      /* ドック（v13.3）：メニュー／しゅぎょう／ごちゃまぜ（まん中・大きい）／タイム／学年 */
      h('div', { class: 'maptabs' }, [
        tab('メニュー', 'book', function () { MQ.ui.dex.render(); MQ.ui.show('screen-dex'); }),
        /* しゅぎょうば（v13.0）：どの 学年でも 出す（v13.1）。よしゅうが できる ときは ふだ */
        dojoOn ? tab('しゅぎょう', 'scroll', function () { MQ.ui.dojo.openList(); }, 'maptab--dojo dojobtn',
          MQ.dojo.candidates(player).preview.length ? h('span', { class: 'maptab__badge', text: 'よしゅう' }) : null,
          'しゅぎょうば') : null,
        /* ごちゃまぜ バトル（v7.3）：にがて対策の 1つ なので いちばん 目立つ まん中に */
        mixOn ? h('button', {
          class: 'maptab maptab--mix mixbtn', type: 'button', 'aria-label': 'ごちゃまぜ バトル',
          onclick: function () { MQ.sfx.tap(); MQ.ui.battle.start(MQ.content.mixStage().id); }
        }, [
          dockIcon('dice', 42),
          h('b', { class: 'maptab__t', text: 'ごちゃまぜ' }),
          h('span', { class: 'maptab__coin', 'aria-label': 'コイン +1' }, [dockIcon('coin', 18), h('span', { text: '+1' })])
        ]) : null,
        // タイムアタックは 1回 たたかってから（v11.1）
        firstTime ? null : tab('タイム', 'hourglass', function () { timeAttack(player); }, '', null, 'タイムアタック'),
        h('button', {
          class: 'maptab maptab--grade', type: 'button',
          'aria-label': '学年と プレイヤー',
          onclick: function () { MQ.sfx.tap(); toggleGrade(); }
        }, [
          h('b', { text: '小' + (MQ.content.activeWorld().grade || 3) }),
          h('i', { class: 'maptab__arrow' })
        ])
      ])
    ]);

    MQ.ui.mount('screen-map', h('div', { class: 'map map--' + plan.theme }, [
      top,
      /* ふちの かげ（.map__vig）は スクロールの 外（.map__view）に おく（v13.4.1）。
         中に あると 画面 1枚ぶんの 高さで いっしょに スクロールし、下の はしが 地図の まん中に よこ線で 出た（iPhone の スクショ） */
      h('div', { class: 'map__view' }, [
        h('div', { class: 'map__scroll', style: { background: seaBg() } }, [sheet, h('div', { class: 'map__pad' + (hasChips ? ' has-chips' : '') })]),
        h('div', { class: 'map__vig' })
      ]),
      dimEl,
      bottom
    ]));

    /* さいしょの たたかいが おわった あと 1回だけ：できる ことが ふえた（v11.1） */
    if (!firstTime && !player.seenUnlock) {
      MQ.save.update(function (p) { p.seenUnlock = true; });
      setTimeout(function () { unlockPop(player); }, 260);
    }

    /* ごほうびを もらった 日は スタンプの 帯を ひらいて 見せる（v8.4） */
    if (gotStamp) {
      togglePanel();
      MQ.sfx.coin();
      MQ.ui.toast('れんぞく ' + gotStamp.days + '日！ コイン +' + gotStamp.coins);
    }

    // いま あそぶ ところが 見えるように スクロール
    setTimeout(function () {
      const el = document.querySelector('#screen-map .node--now');
      const sc = document.querySelector('#screen-map .map__scroll');
      if (el && sc) sc.scrollTop = Math.max(0, el.offsetTop - sc.clientHeight * 0.45);
    }, 0);
  }

  /* =======================================================
     できる ことが ふえた！（v11.1）

     はじめての たたかいが おわって 地図に もどった とき 1回だけ。
     さいしょの 地図は わざと からっぽに して ある ので、
     ここで「ふえた もの」を 見せて から 出す。
       ・きょうの フィーバー教科（オレンジの 帯）
       ・きょうの ミッション（3つ・コイン）
       ・ごちゃまぜ バトル と タイムアタック
     わくは アイテム画面と 同じ .bagcard（.newscard は 借りない＝お知らせ画面と
     見分けが つかなく なる。v9.3 で 1回 ふんだ）。
     文は ひらがな＋小1の かん字だけ（小1の 子も 見る）。
     ======================================================= */
  let unlockEl = null;
  function unlockPop(player) {
    if (unlockEl) return null;
    /* アイコンは 地図で つかって いる ものを そのまま 借りる
       （ただの 四角に すると ゲームの ほかの 画面と 見た目が そろわない） */
    const rows = [
      [h('i', { class: 'mapobi__star unlockpop__star' }), 'きょうの フィーバー', 'その きょうかが けいけんち 2ばい！'],
      [MQ.ui.coinNode(30), 'きょうの ミッション', '3つ できたら コインが もらえる'],
      [dockIcon('dice', 32), 'あそび方が ふえた', 'ごちゃまぜ バトル・タイムアタック']
    ];
    function close() {
      if (!unlockEl) return;
      const gone = unlockEl;
      unlockEl = null;
      if (gone.parentNode) gone.parentNode.removeChild(gone);
    }
    unlockEl = h('div', {
      class: 'news unlockpop', onclick: function (e) { if (e.target === unlockEl) close(); }
    }, [
      h('div', { class: 'bagcard unlockpop__card' }, [
        h('span', { class: 'bagcard__star bagcard__star--l' }),
        h('span', { class: 'bagcard__star bagcard__star--r' }),
        h('div', { class: 'bagcard__head' }, [
          h('h3', { class: 'bagcard__title', text: 'できる ことが ふえた！' }),
          h('div', { class: 'bagcard__subrow' }, [
            h('span', { class: 'bagcard__sub', text: 'はじめての たたかい おつかれさま' })
          ])
        ]),
        h('div', { class: 'unlockpop__list' }, rows.map(function (r) {
          return h('div', { class: 'unlockpop__row' }, [
            h('span', { class: 'unlockpop__ico' }, [r[0]]),
            h('span', { class: 'unlockpop__body' }, [
              h('b', { class: 'unlockpop__t', text: r[1] }),
              h('span', { class: 'unlockpop__s', text: r[2] })
            ])
          ]);
        })),
        h('button', {
          class: 'btn btn--big', type: 'button',
          onclick: function () { MQ.sfx.tap(); close(); }
        }, [h('span', { text: 'つぎへ！' }), h('span', { class: 'btn__shine' })])
      ])
    ]);
    (document.getElementById('stage') || document.body).appendChild(unlockEl);
    if (MQ.sfx.coin) MQ.sfx.coin();
    return unlockEl;
  }

  /* =======================================================
     おうちの人からの てがみ（v8.5）：地図の 封筒を おすと ひらく。
       紙の 色の カード。読むと ミッションが 1つ ふえる（教科を えらんで いた とき）。
       **外には 送らない**。ルールは js/core/letter.js
     ======================================================= */
  function openLetter() {
    const player = MQ.save.current();
    if (!player || !MQ.letter || !MQ.letter.pending(player)) return;
    const l = MQ.letter.get(player);
    let got = null;
    MQ.save.update(function (p) { got = MQ.letter.read(p); });
    MQ.sfx.coin();
    const stage = document.getElementById('stage') || document.body;
    const wrap = h('div', { class: 'tegami' }, [
      h('div', { class: 'tegami__card' }, [
        h('div', { class: 'tegami__head' }, [
          h('span', { class: 'tegami__env' }, [h('i', { class: 'flap' }), h('i', { class: 'seal' })]),
          h('span', { class: 'tegami__ttl', text: 'おうちの人から' })
        ]),
        h('p', { class: 'tegami__text', text: l.text }),
        (got && got.mission) ? h('div', { class: 'tegami__mis' }, [
          h('span', { class: 'tegami__mislbl', text: 'おねがい' }),
          h('span', { class: 'tegami__mistx', text: l.areaName + 'で 1かい たたかう' }),
          l.reward ? h('span', { class: 'tegami__coin' }, [MQ.ui.coinNode(16), h('b', { text: '+' + l.reward })]) : null
        ]) : null,
        (got && got.coins) ? h('div', { class: 'tegami__mis' }, [
          h('span', { class: 'tegami__mislbl', text: 'おくりもの' }),
          h('span', { class: 'tegami__mistx', text: 'コインを ' + got.coins + 'まい もらった！' }),
          h('span', { class: 'tegami__coin' }, [MQ.ui.coinNode(16), h('b', { text: '+' + got.coins })])
        ]) : null,
        h('button', {
          class: 'btn btn--big tegami__ok', type: 'button',
          onclick: function () {
            MQ.sfx.tap();
            if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
            render();          // 封筒を 消して ミッションを 出しなおす
          }
        }, [h('span', { text: 'よんだ！' }), h('span', { class: 'btn__shine' })])
      ])
    ]);
    stage.appendChild(wrap);
  }

  /* =======================================================
     スタンプカレンダー（v8.4）：つづけた 日。
       その日 1問でも 答えたら スタンプ 1つ。7マスで ひとまわり。
       3日 コイン1／5日 コイン2／7日 コイン3。
       **切れても ばつは ゼロ**（「また 1日めから！」だけ）。
       ルールは js/core/streak.js
     ======================================================= */
  function stampPanel(player) {
    if (!MQ.streak) return null;
    const st = MQ.streak.info(player);
    const kid = (MQ.content.activeWorld().grade || 3) <= 2;
    const cells = h('div', { class: 'stamp__row' }, st.cells.map(function (c) {
      return h('div', {
        class: 'stamp__cell' + (c.on ? ' is-on' : '') + (c.today ? ' is-today' : '') + (c.reward ? ' has-gift' : '') +
               ((gotStamp && gotStamp.pos === c.n) ? ' is-got' : '')
      }, [
        h('b', { class: 'stamp__n', text: c.on ? '★' : String(c.n) }),
        c.reward ? h('i', { class: 'stamp__gift', text: '+' + c.reward }) : null
      ]);
    }));
    // あしたの ごほうび（ここが ワクワクの 本体）
    let sub;
    if (!st.today) sub = kid ? 'きょう 1もん こたえると スタンプ！' : 'きょう 1問 こたえると スタンプ！';
    else if (st.next.coins) sub = 'あした 来ると ' + st.next.n + '日め！ コイン +' + st.next.coins;
    else sub = 'あした 来ると ' + st.next.n + '日め！';
    return h('div', { class: 'stamp' + (st.today ? ' is-done' : '') }, [
      h('div', { class: 'stamp__head' }, [
        h('span', { class: 'stamp__ttl', text: kid ? 'つづけた 日' : 'つづけた 日' }),
        h('span', { class: 'stamp__days' }, [h('b', { text: String(st.days) }), h('span', { text: '日 れんぞく' })])
      ]),
      cells,
      h('span', { class: 'stamp__sub', text: sub })
    ]);
  }

  /* =======================================================
     きょうの フィーバー教科（v7.2）：HUD の すぐ 下の オレンジの 帯。
       いちばん やって いない 教科が「きょうは おトク」に なる
       （けいけんち 2ばい・コイン +1・レアが 出やすい・なかまゲージ 2ばい）。
       相棒が いれば ふきだしで「行きたいな！」と おねがい する。
       「いく ▶」で その ゾーンまで スクロール。ルールは js/core/fever.js
     ======================================================= */
  function feverPanel(player, fv) {
    if (!fv) return null;
    const line = MQ.fever.palLine(player);
    const band = bands.filter(function (b) { return b.area.id === fv.areaId; })[0];
    /* たてに 短く（タブレットは ステージが 700 しか ない・v5.6 の 教訓）：
       1行め＝星・「フィーバー教科」・教科名・「いく ▶」／2行め＝効果／3行め＝相棒の ふきだし（いる ときだけ）。
       なかまゲージの ことは ふきだしの 中に 入れて 2行めを 1行に おさめる */
    return h('div', { class: 'fever' }, [
      h('div', { class: 'fever__row' }, [
        h('span', { class: 'fever__star' }),
        h('span', { class: 'fever__label', text: 'フィーバー教科' }),
        h('span', { class: 'fever__name', text: fv.name }),
        h('button', {
          class: 'btn btn--small fever__go', type: 'button', text: 'いく ▶',
          onclick: function () {
            MQ.sfx.tap();
            closeAll();                                   // パネルを とじてから 動かす（v8.0）
            const sc = document.querySelector('#screen-map .map__scroll');
            if (sc && band) sc.scrollTo({ top: Math.max(0, band.top - 16), behavior: 'smooth' });
          }
        })
      ]),
      h('span', { class: 'fever__sub', text: 'けいけんち 2ばい・コイン +1・レアが 出やすい' }),
      line ? h('div', { class: 'fever__pal' }, [
        h('span', { class: 'fever__palimg' }, [MQ.enemies.node(line.pal.id, { size: 26 })]),
        // 1行に おさめる（「きょうは」は 帯の 見出しで わかる ので 言わない）
        h('span', { class: 'fever__bubble', text: line.pal.name + '「' + fv.name + 'に 行きたいな！ ゲージ 2ばい」' })
      ]) : null
    ]);
  }

  /* =======================================================
     きょうの ミッション（v3.1）：3つの 目あて。押すと たたむ／ひらく
     ======================================================= */
  let missionsOpen = null;   // null = まだ 決めていない（ぜんぶ おわっていれば たたむ）
  function missionsPanel(player) {
    if (!MQ.missions) return null;
    let ms = null;
    MQ.save.update(function (p) { ms = MQ.missions.ensure(p); });
    if (!ms) return null;
    // てがみの ミッション（v8.5）は おまけ なので「N / 3」には 数えない
    const daily = ms.list.filter(function (m) { return !m.letter; });
    const doneN = daily.filter(function (m) { return m.done; }).length;
    const all = doneN === daily.length;
    /* v8.0：ここは 地図の 上に かぶさる パネルの 中なので、いつも ひらいて おく
       （地図を せまく しない。たたむ／ひらくは 上の 帯が やる） */
    if (missionsOpen === null) missionsOpen = true;
    const panel = h('div', { class: 'missions' + (missionsOpen ? ' is-open' : '') + (all ? ' is-all' : '') });
    panel.appendChild(h('button', {
      class: 'missions__head', type: 'button',
      onclick: function () { MQ.sfx.tap(); missionsOpen = !missionsOpen; panel.classList.toggle('is-open', missionsOpen); }
    }, [
      h('span', { class: 'missions__title', text: 'きょうの ミッション' }),
      h('span', { class: 'missions__count', text: doneN + ' / ' + daily.length }),
      h('span', { class: 'missions__arrow' })
    ]));
    panel.appendChild(h('div', { class: 'missions__list' }, ms.list.map(function (m) {
      const once = MQ.missions.isOnce(m);
      return h('div', { class: 'mission' + (m.done ? ' is-done' : '') + (m.letter ? ' mission--letter' : '') }, [
        h('span', { class: 'mission__check', text: m.done ? '✓' : '' }),
        h('span', { class: 'mission__text', text: m.text }),
        h('span', { class: 'mission__prog', text: m.done ? 'コイン +' + (m.reward || MQ.missions.REWARD_EACH) : (m.fever ? 'コイン +' + (m.reward || MQ.missions.REWARD_EACH) : (m.target > 1 && !once ? m.count + ' / ' + m.target : '')) })
      ]);
    }).concat([
      h('div', { class: 'missions__all', text: all ? 'ぜんぶ クリア！ コイン +' + MQ.missions.REWARD_ALL_COINS + '・EXP +' + MQ.missions.REWARD_ALL_XP + ' もらった' : '3つ ぜんぶで コイン +' + MQ.missions.REWARD_ALL_COINS + '・EXP +' + MQ.missions.REWARD_ALL_XP })
    ])));
    return panel;
  }

  /* =======================================================
     タイムアタック（やりたい ときだけ の 別モード）
     ======================================================= */
  function timeAttack(player) {
    const open = [];
    MQ.content.subjectAreas().forEach(function (area) {
      area.stages.forEach(function (st) {
        if (MQ.content.isAvailable(st) && MQ.content.isUnlocked(player, area, st)) open.push({ area: area, stage: st });
      });
    });
    if (!open.length) { MQ.ui.toast('まずは ふつうに あそんでみよう'); return; }

    MQ.ui.mount('screen-dex', h('div', { class: 'page' }, [
      h('div', { class: 'page__body' }, [
        h('div', { class: 'wrap' }, [
          h('h2', { class: 'label', text: 'タイムアタック' }),
          h('p', { class: 'note', text: '1問 20びょう。時間切れは まちがい あつかいだけど、まけは ないよ。ふつうの ★とは べつの あそびかた。' }),
          h('div', { class: 'grid' }, open.map(function (o) {
            return h('button', {
              class: 'cell', type: 'button',
              onclick: function () { MQ.sfx.tap(); MQ.ui.battle.start(o.stage.id, { timeAttack: 20 }); }
            }, [
              h('span', { class: 'cell__name', text: o.stage.name }),
              h('span', { class: 'cell__tag', text: o.area.short })
            ]);
          })),
          h('button', { class: 'btn btn--big btn--stone', type: 'button', text: 'マップへ もどる', style: { marginTop: '16px' }, onclick: function () { MQ.sfx.tap(); MQ.ui.goMap(); } })
        ])
      ])
    ]));
    MQ.ui.show('screen-dex');
  }

  function paint() {
    if (!canvas || !grid) return;
    MQ.tiles.paint(canvas, grid);
    if (MQ.tiles.smooth()) MQ.tiles.paintDecos(canvas, grid, decoList);
  }

  /* 地図の 地面を 先に 描いて おく（v13.4）。なめらかな 地図は 1回 約110ms（PC）かかる ので、
     タイトル画面の オープニング（1.75秒）が おわった あとの ひまな ときに 描いて tiles.js に とって おく。
     地図を 開いた ときは とって おいた 絵を 写す だけ（約30ms）。 */
  function warm() {
    try {
      if (!MQ.save || !MQ.save.current() || !MQ.tiles.smooth()) return;
      MQ.tiles.warm(MQ.tiles.build(Object.assign(layout(), {})));
    } catch (e) { /* 先に 描けなくても 地図を 開いた ときに 描く */ }
  }
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('load', function () {
      setTimeout(function () { (window.requestIdleCallback || function (f) { f(); })(warm, { timeout: 2000 }); }, 2600);
    });
  }

  // unlockPop は harness の 検査用にも 出す（v11.1）
  return { render: render, paint: paint, unlockPop: unlockPop, isFirstTime: isFirstTime, dockIcon: dockIcon, warm: warm };
})();
