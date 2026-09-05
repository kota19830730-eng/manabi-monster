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

  const COL_X = [16, 38, 60, 82];   // ノードの よこの いち（％）
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
    const wBlock = DECO_W[kind] / 2 + 26;     // 金ブロックは よこ 44〜50px
    const wLabel = DECO_W[kind] / 2 + 45;     // 文字チップは よこ 86px まで
    for (let i = 0; i < b.nodes.length; i++) {
      const n = b.nodes[i], nx = n.xPct * 4;
      if (Math.abs(nx - x) < wBlock && yPx > n.y - 32 - hh && yPx < n.y + 34) return false;
      if (BIG[kind] && Math.abs(nx - x) < wLabel && yPx > n.y + 14 - hh && yPx < n.y + 90) return false;
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

    bands.forEach(function (b) {
      /* ---- かざり（ノードより 下の そう） ---- */
      scatter(b, budget, placed).forEach(function (d) { layer.appendChild(d); });

      /* ---- ゾーン見出し（ノードの 行の 上の 余白に おく） ---- */
      const stars = MQ.content.starsIn(player, b.area);
      const need = MQ.content.fragNeed(b.area);
      const got = MQ.content.hasFrag(player, b.area.id);
      layer.appendChild(h('div', {
        class: 'biome', style: { top: b.pillY + 'px' }
      }, [
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

  /* ---- きょうの ミッション（v3.1）：HUD の 下。3つ ぜんぶ おわったら たたむ ---- */
    const missionPanel = missionsPanel(player);

    /* ---- 上の ヘッダー ---- */
    const top = h('div', { class: 'maptop' }, [
      MQ.ui.hud(player),
      missionPanel,
      h('div', { class: 'maptop__row' }, [
        h('button', { class: 'btn btn--stone', type: 'button', text: '図かん', onclick: function () { MQ.sfx.tap(); MQ.ui.dex.render(); MQ.ui.show('screen-dex'); } }),
        h('button', { class: 'btn btn--stone', type: 'button', text: 'タイムアタック', onclick: function () { MQ.sfx.tap(); timeAttack(player); } }),
        h('button', { class: 'btn btn--stone', type: 'button', text: 'プレイヤー', onclick: function () { MQ.sfx.tap(); MQ.ui.start.render(); MQ.ui.show('screen-start'); } }),
        // おうちの人ページへ まっすぐ（v7.1・とくい・にがて）
        h('button', { class: 'btn btn--stone maptop__parent', type: 'button', text: 'おうちの人', onclick: function () { MQ.sfx.tap(); MQ.ui.dex.render('parent'); MQ.ui.show('screen-dex'); } })
      ]),
      gradeRow(player)
    ]);

    /* ---- 下の ピンクの バー ---- */
    const escapedCount = MQ.save.countAllEscaped(player);
    const bottom = h('div', { class: 'mapbottom' }, [
      escapedCount ? h('button', {
        class: 'revenge', type: 'button',
        onclick: function () { MQ.sfx.tap(); MQ.ui.battle.startTokkun(); }
      }, [
        h('span', { class: 'revenge__new', text: 'NEW' }),
        h('span', { class: 'revenge__text', html: 'にげた敵が <b>' + escapedCount + '</b>ひき！' }),
        h('span', { class: 'revenge__go', text: 'とっくん ▶' })
      ]) : null
    ]);

    MQ.ui.mount('screen-map', h('div', { class: 'map map--' + plan.theme }, [
      top,
      h('div', { class: 'map__scroll' }, [sheet, h('div', { class: 'map__vig' })]),
      bottom
    ]));

    // いま あそぶ ところが 見えるように スクロール
    setTimeout(function () {
      const el = document.querySelector('#screen-map .node--now');
      const sc = document.querySelector('#screen-map .map__scroll');
      if (el && sc) sc.scrollTop = Math.max(0, el.offsetTop - sc.clientHeight * 0.45);
    }, 0);
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
    if (missionsOpen === null) missionsOpen = !all;
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
        h('span', { class: 'mission__prog', text: m.done ? 'コイン +' + MQ.missions.REWARD_EACH : (m.target > 1 && !once ? m.count + ' / ' + m.target : '') })
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
