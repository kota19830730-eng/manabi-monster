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
    const doneN = ms ? ms.list.filter(function (m) { return m.done; }).length : 0;

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
      ms ? h('span', { class: 'mapobi__mis' + (doneN === ms.list.length ? ' is-all' : '') }, [
        h('span', { text: 'ミッション' }),
        h('b', { text: doneN + '/' + ms.list.length })
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
    return h('div', { class: 'deco deco--' + kind, style: { left: xPct + '%', top: yPx + 'px' } },
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
  function towerDeco(t) {
    const out = [];
    const set = [
      ['dead', -24, -18], ['dead', -14, 16], ['crystal', -20, 30],
      ['dead', 22, -14], ['crystal', 19, 22], ['crystal', 7, 34], ['crystal', -6, 40]
    ];
    set.forEach(function (s) {
      out.push(h('div', {
        class: 'deco deco--' + s[0],
        style: { left: (t.xPct + s[1]) + '%', top: (t.y + s[2]) + 'px' }
      }, [h('i'), h('i'), h('i')]));
    });
    return out;
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
      h('span', { class: 'tower__art' }, [
        h('span', { class: 'tower__bat' }, [h('i'), h('i'), h('i'), h('i'), h('i')]),
        h('span', { class: 'tower__body' }, [
          h('span', { class: 'tower__eye' }),
          h('span', { class: 'tower__eye tower__eye--r' }),
          h('span', { class: 'tower__door' })
        ])
      ])
    ]);
  }

  /* =======================================================
     画面を つくる
     ======================================================= */
  function render() {
    const player = MQ.save.current();
    if (!player) { MQ.ui.start.render(); MQ.ui.show('screen-start'); return; }
    MQ.ui.syncCustom();
    /* スタンプの ごほうび（v8.4）：3日・5日・7日で コイン。
       もらえる 日は 下で パネルを ひらいて 見せる（1日 1回だけ） */
    gotStamp = null;
    if (MQ.streak) MQ.save.update(function (p) {
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

    // 木の 板の 橋（マスの 中の もようだけは CSS で かさねる）
    grid.bridges.forEach(function (r) {
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
    if (MQ.fever) MQ.save.update(function (p) { feverNow = MQ.fever.today(p); });

    bands.forEach(function (b) {
      /* ---- かざり（ノードより 下の そう） ---- */
      scatter(b, budget, placed).forEach(function (d) { layer.appendChild(d); });

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
          layer.appendChild(h('div', {
            class: 'node node--fog',
            style: { left: n.xPct + '%', top: n.y + 'px' }
          }, [
            h('span', { class: 'node__dot', text: '?' }),
            h('span', { class: 'node__soon', text: 'あと ' + n.count + 'こ' }),
            n.when ? h('span', { class: 'node__name', text: n.when }) : null
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

        const dot = h('span', { class: 'node__dot', text: unlocked ? String(n.idx || st.no) : '?' });
        if (isNow) dot.appendChild(h('span', { class: 'node__here', text: 'いま ここ' }));

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
          MQ.ui.stars(sc),
          h('span', { class: 'node__name', text: st.name })
        ]));
      });
    });

    /* ---- さいごの塔の 小島（小1には ない） ---- */
    if (plan.tower) {
      towerDeco(plan.tower).forEach(function (d) { layer.appendChild(d); });
      layer.appendChild(towerEl(player, plan.tower));
    }

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
       図かん・タイムアタック・プレイヤー・学年は 画面の 下の 段へ。
       -------------------------------------------------------------------- */
    panelEl = h('div', { class: 'mappanel', hidden: true }, [
      stampPanel(player),
      feverPanel(player, feverNow),
      missionsPanel(player)
    ]);
    dimEl = h('div', { class: 'mapdim', hidden: true, onclick: function () { closeAll(); } });

    const top = h('div', { class: 'maptop' }, [
      MQ.ui.hud(player, { slim: true }),
      obiBar(player, feverNow),
      panelEl
    ]);

    /* ---- 下の バー：ごちゃまぜ バトル（v7.3・むらさき）と にげた敵（ピンク） ---- */
    const escapedCount = MQ.save.countAllEscaped(player);
    const kid = (MQ.content.activeWorld().grade || 3) <= 2;
    const bottom = h('div', { class: 'mapbottom' }, [
      MQ.content.mixOpen(player) ? h('button', {
        class: 'mixbtn', type: 'button',
        onclick: function () { MQ.sfx.tap(); MQ.ui.battle.start(MQ.content.mixStage().id); }
      }, [
        h('span', { class: 'mixbtn__ico' }, [h('i'), h('i'), h('i'), h('i')]),
        h('span', { class: 'mixbtn__body' }, [
          h('b', { class: 'mixbtn__t', text: 'ごちゃまぜ バトル' }),
          h('span', { class: 'mixbtn__s', text: (kid ? 'ぜんぶの きょうかが まざる' : 'ぜんぶの 教科が まざる') + '・コイン +1' })
        ]),
        h('span', { class: 'mixbtn__go', text: '▶' })
      ]) : null,
      escapedCount ? h('button', {
        class: 'revenge', type: 'button',
        onclick: function () { MQ.sfx.tap(); MQ.ui.battle.startTokkun(); }
      }, [
        h('span', { class: 'revenge__new', text: 'NEW' }),
        h('span', { class: 'revenge__text', html: 'にげた敵が <b>' + escapedCount + '</b>ひき！' }),
        h('span', { class: 'revenge__go', text: 'とっくん ▶' })
      ]) : null,

      /* 学年えらび（v8.0）：ふだんは かくして おき、下の「小3 ▾」で 出す */
      gradeEl = h('div', { class: 'gradesheet', hidden: true }, [
        h('p', { class: 'gradesheet__note', text: 'べつの 学年で あそぶ（よしゅう・ふくしゅう）' }),
        gradeRow(player)
      ]),

      /* ボタンの 段（v8.0）：上に あった 3つと 学年を ここへ */
      h('div', { class: 'maptabs' }, [
        h('button', { class: 'maptab', type: 'button', text: '図かん', onclick: function () { MQ.sfx.tap(); MQ.ui.dex.render(); MQ.ui.show('screen-dex'); } }),
        h('button', { class: 'maptab', type: 'button', text: 'タイムアタック', onclick: function () { MQ.sfx.tap(); timeAttack(player); } }),
        // 「おうちの人」は タイトル画面の 右上に ひっこした（v7.8）
        h('button', { class: 'maptab', type: 'button', text: 'プレイヤー', onclick: function () { MQ.sfx.tap(); MQ.ui.start.render(); MQ.ui.show('screen-start'); } }),
        h('button', {
          class: 'maptab maptab--grade', type: 'button',
          'aria-label': '学年を えらぶ',
          onclick: function () { MQ.sfx.tap(); toggleGrade(); }
        }, [
          h('b', { text: '小' + (MQ.content.activeWorld().grade || 3) }),
          h('i', { class: 'maptab__arrow' })
        ])
      ])
    ]);

    MQ.ui.mount('screen-map', h('div', { class: 'map map--' + plan.theme }, [
      top,
      h('div', { class: 'map__scroll' }, [sheet, h('div', { class: 'map__vig' })]),
      dimEl,
      bottom
    ]));

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
    const doneN = ms.list.filter(function (m) { return m.done; }).length;
    const all = doneN === ms.list.length;
    /* v8.0：ここは 地図の 上に かぶさる パネルの 中なので、いつも ひらいて おく
       （地図を せまく しない。たたむ／ひらくは 上の 帯が やる） */
    if (missionsOpen === null) missionsOpen = true;
    const panel = h('div', { class: 'missions' + (missionsOpen ? ' is-open' : '') + (all ? ' is-all' : '') });
    panel.appendChild(h('button', {
      class: 'missions__head', type: 'button',
      onclick: function () { MQ.sfx.tap(); missionsOpen = !missionsOpen; panel.classList.toggle('is-open', missionsOpen); }
    }, [
      h('span', { class: 'missions__title', text: 'きょうの ミッション' }),
      h('span', { class: 'missions__count', text: doneN + ' / ' + ms.list.length }),
      h('span', { class: 'missions__arrow' })
    ]));
    panel.appendChild(h('div', { class: 'missions__list' }, ms.list.map(function (m) {
      const once = MQ.missions.isOnce(m);
      return h('div', { class: 'mission' + (m.done ? ' is-done' : '') }, [
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
    if (canvas && grid) MQ.tiles.paint(canvas, grid);
  }

  return { render: render, paint: paint };
})();
