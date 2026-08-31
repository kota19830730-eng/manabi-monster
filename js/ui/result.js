/* ---------------------------------------------------------
   04 けっかの画面（v1.9 / モック準拠）

   いちばん 大事な きまり：**スクロールなしで 1画面（400×720）に おさめる**。

   上から：
     1. クリアの バナー（金の 文字＋★3つ。まん中の ★だけ 大きい）
     2. たおした ボスの カード（ぐったりした ボス／たおした タグ／n / n もん／スタンプ）
     3. レベルアップの 帯（Lv.1 ▶ Lv.3 ／ +260 EXP ／ EXPバー）
     4. ボーナスチップ 3つ（はやとき／タイム／さいだいコンボ）
     5. 手に入れた もの 3枚（たからもの／そうび／コイン など）
     6. しょうごうの 1行
     7. ボタン（つぎの ステージへ／もういちど／マップへ）

   「むかしの じぶんと くらべる」は 帯の 下に 1行で 出します。
   音：ボスを たおした ときは ファンファーレ → しょうりの 曲（bgm.js）。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};
MQ.ui = MQ.ui || {};

MQ.ui.result = (function () {
  const h = MQ.util.h;

  /* ---- 小さな 部品 ---- */
  function chip(label, value, cls) {
    return h('div', { class: 'rs__chip ' + (cls || '') }, [
      h('span', { class: 'rs__chipk', text: label }),
      h('span', { class: 'rs__chipv', text: value })
    ]);
  }

  // 手に入れた ものの カード。img は DOM でも 画像の URL でも よい
  function itemCard(img, name, badge, cls) {
    return h('div', { class: 'rs__item ' + (cls || '') }, [
      badge ? h('span', { class: 'rs__badge ' + (badge.cls || ''), text: badge.text }) : null,
      h('div', { class: 'rs__itemimg' }, [
        (img && img.nodeType) ? img : (img ? h('img', { class: 'sprite', src: img, alt: '' }) : null)
      ]),
      h('span', { class: 'rs__itemname', text: name })
    ]);
  }

  // つぎの ステージ（開いていて、あそべる もの）
  function nextStageOf(player, stage) {
    const f = MQ.content.findStage(stage.id);
    if (!f || stage.tower) return null;
    const list = f.area.stages;
    // 学期で 閉じている ステージは とばして、つぎに 開いている ものを さがす
    let i = list.indexOf(f.stage) + 1;
    while (i < list.length && !MQ.content.isAvailable(list[i])) i++;
    const nx = list[i];
    if (!nx) return null;
    if (!MQ.content.isUnlocked(player, f.area, nx)) return null;
    return nx;
  }

  function render(sum, rw, ctx) {
    const player = MQ.save.current();
    const tokkun = !!ctx.tokkun;
    const tower = !!ctx.stage.tower;
    const perfect = sum.total > 0 && sum.correct === sum.total;

    const label = tower && sum.bossBeaten ? 'まおうを たおした！'
      : sum.stars === 3 ? 'パーフェクト！'
      : sum.stars >= 1 ? 'ステージ クリア！'
      : tokkun ? 'とっくん おわり' : 'ざんねん…';
    const mood = tower && sum.bossBeaten ? 'rs--maou' : sum.stars >= 1 ? '' : 'rs--sad';

    /* ---- 1. バナー ---- */
    const banner = h('div', { class: 'rs__banner' }, [
      h('h2', { class: 'rs__title', text: label }),
      tokkun ? null : MQ.ui.stars(sum.stars, 'rs__stars')
    ]);

    /* ---- 2. ボスの カード ---- */
    let bossCard;
    if (tokkun) {
      bossCard = h('div', { class: 'rs__boss' }, [
        h('div', { class: 'rs__bossbox' }, [MQ.ui.faceImg(player, 'rs__bossimg')]),
        h('div', { class: 'rs__score' }, [
          h('span', { class: 'rs__num', text: String(sum.correct) }),
          h('span', { class: 'rs__den', text: '/ ' + sum.total + ' もん' })
        ]),
        h('span', { class: 'rs__stamp' + (perfect ? ' rs__stamp--on' : ''), text: perfect ? 'ぜんもん せいかい' : sum.revengeBeaten.length + 'たい たおした' })
      ]);
    } else {
      const bossId = MQ.battle.bossId ? MQ.battle.bossId() : null;
      const escapedN = sum.escaped.length;
      bossCard = h('div', { class: 'rs__boss' + (sum.bossBeaten ? ' rs__boss--win' : '') }, [
        h('div', { class: 'rs__bossbox' + (sum.bossBeaten ? ' is-ko' : '') }, [
          bossId ? MQ.enemies.node(bossId, { size: 58, cls: 'rs__bossimg' }) : null,
          h('span', { class: 'rs__tag' + (sum.bossBeaten ? ' rs__tag--win' : ''), text: sum.bossBeaten ? 'たおした' : 'にげられた' })
        ]),
        h('div', { class: 'rs__score' }, [
          h('div', {}, [
            h('span', { class: 'rs__num', text: String(sum.correct) }),
            h('span', { class: 'rs__den', text: '/ ' + sum.total + ' もん' })
          ]),
          h('span', { class: 'rs__scoresub', text: escapedN ? 'にげた敵 ' + escapedN + '体 → マップの とっくんで' : (sum.bossBeaten ? (tower ? 'まおう' : 'ボス') + 'を たおした！' : 'また ちょうせんだ！') })
        ]),
        perfect
          ? h('span', { class: 'rs__stamp rs__stamp--on', text: 'ぜんもん せいかい' })
          : (sum.stars >= 1 ? h('span', { class: 'rs__stamp', text: 'クリア' }) : null)
      ]);
    }

    /* ---- 3. レベルの 帯 ---- */
    const pr = MQ.hero.progress(player.xp);
    const lvBand = h('div', { class: 'rs__lv' + (rw.leveledUp ? ' rs__lv--up' : '') }, [
      h('div', { class: 'rs__lvrow' }, [
        h('span', { class: 'rs__lvlabel', text: rw.leveledUp ? 'レベルアップ' : 'けいけんち' }),
        rw.leveledUp
          ? h('span', { class: 'rs__lvnum' }, [
              h('span', { class: 'rs__lvfrom', text: 'Lv.' + rw.levelBefore }),
              h('span', { class: 'rs__lvarrow', text: '▶' }),
              h('span', { class: 'rs__lvto', text: 'Lv.' + rw.levelAfter })
            ])
          : h('span', { class: 'rs__lvnum' }, [h('span', { class: 'rs__lvto', text: 'Lv.' + pr.level })]),
        h('span', { class: 'rs__exp', text: '+' + sum.xp + ' EXP' })
      ]),
      h('div', { class: 'rs__bar' }, [h('div', { class: 'rs__barfill', style: { width: Math.round(pr.ratio * 100) + '%' } })])
    ]);

    /* ---- むかしの じぶんと くらべる（あるときだけ） ---- */
    let best = null;
    if (rw.best && rw.best.now != null) {
      best = h('p', { class: 'rs__best', text: 'まえより つよく なった！　' + rw.best.was + ' → ' + rw.best.now + 'もん' });
    } else if (rw.best && rw.best.nowTime != null) {
      best = h('p', { class: 'rs__best', text: 'タイム しんきろく！　' + MQ.ui.fmtTime(rw.best.wasTime) + ' → ' + MQ.ui.fmtTime(rw.best.nowTime) });
    }

    /* ---- 4. ボーナスチップ ---- */
    const chips = h('div', { class: 'rs__chips' }, [
      chip('はやとき', sum.fastBonus ? '+' + sum.fastBonus : 'なし', sum.fastBonus ? 'rs__chip--on' : ''),
      chip('タイム', MQ.ui.fmtTime(sum.time)),
      chip('さいだいコンボ', sum.maxCombo >= 2 ? sum.maxCombo + 'れんぞく' : 'なし', sum.maxCombo >= 5 ? 'rs__chip--on' : '')
    ]);

    /* ---- 5. 手に入れた もの（3枚まで） ---- */
    const cards = [];
    if (rw.treasure) {
      cards.push(itemCard(MQ.treasure.node(rw.treasure.id, { gold: rw.gold, size: 44 }), rw.treasure.name,
        rw.gold ? { text: 'ぴかぴか', cls: 'rs__badge--pika' } : { text: 'NEW', cls: 'rs__badge--new' },
        rw.gold ? 'rs__item--gold' : ''));
    }
    rw.densetsu.forEach(function (g) {
      cards.push(itemCard(MQ.hero.gearSprite(g.id), g.name, { text: 'でんせつ', cls: 'rs__badge--gold' }, 'rs__item--gold'));
    });
    rw.frags.forEach(function (a) {
      cards.push(itemCard(MQ.ui.fragSprite(), a.short + 'の かけら', { text: 'かけら', cls: 'rs__badge--gold' }, 'rs__item--gold'));
    });
    if (rw.gear) cards.push(itemCard(MQ.hero.gearSprite(rw.gear.id), rw.gear.name, { text: 'NEW', cls: 'rs__badge--new' }));
    if (sum.coins) cards.push(itemCard(MQ.ui.coinNode(40), 'きんのコイン', { text: '+' + sum.coins, cls: 'rs__badge--gold' }));
    if (sum.multiKO.length) {
      cards.push(itemCard(null, sum.multiKO.map(function (n) { return n + '体'; }).join('・') + ' まとめて', { text: 'KO', cls: 'rs__badge--new' }, 'rs__item--text'));
    }
    const items = cards.length
      ? h('div', { class: 'rs__items' }, cards.slice(0, 3))
      : h('div', { class: 'rs__items rs__items--none' }, [
          itemCard(null, '★2で そうび', null, 'rs__item--dim'),
          itemCard(null, 'ボスで たからもの', null, 'rs__item--dim'),
          itemCard(null, 'たからばこで コイン', null, 'rs__item--dim')
        ]);

    /* ---- 6. しょうごう ---- */
    const owned = Array.isArray(player.titles) ? player.titles.length : 1;
    const gotTitle = rw.titles.length ? rw.titles[rw.titles.length - 1] : null;
    const ttl = h('div', { class: 'rs__ttl' }, [
      h('span', { class: 'rs__ttllabel', text: gotTitle ? 'しょうごう GET' : 'しょうごう' }),
      h('span', { class: 'rs__ttlname', text: gotTitle ? gotTitle.name : MQ.hero.titleName(player) }),
      h('span', { class: 'rs__ttlmore', text: owned > 1 ? 'ほか ' + (owned - 1) + 'つ' : '' })
    ]);

    /* ---- 7. ボタン ---- */
    const nx = tokkun ? null : nextStageOf(player, ctx.stage);
    function again() {
      MQ.sfx.tap();
      if (tokkun) MQ.ui.battle.startTokkun();
      else MQ.ui.battle.start(ctx.stage.id, { timeAttack: ctx.timeAttack });
    }
    function toMap() { MQ.sfx.tap(); MQ.ui.goMap(); }

    let main, row;
    if (tokkun) {
      main = h('button', { class: 'btn btn--big', type: 'button', onclick: again }, [h('span', { text: '▶ もう1回 とっくん' }), h('span', { class: 'btn__shine' })]);
      row = [h('button', { class: 'btn btn--stone', type: 'button', text: 'マップへ', onclick: toMap })];
    } else if (nx) {
      main = h('button', {
        class: 'btn btn--big', type: 'button',
        onclick: function () { MQ.sfx.tap(); MQ.ui.battle.start(nx.id, { timeAttack: ctx.timeAttack }); }
      }, [h('span', { text: '▶ つぎの ステージへ' }), h('span', { class: 'btn__shine' })]);
      row = [
        h('button', { class: 'btn btn--stone', type: 'button', text: 'もういちど', onclick: again }),
        h('button', { class: 'btn btn--cream', type: 'button', text: 'マップへ', onclick: toMap })
      ];
    } else {
      main = h('button', { class: 'btn btn--big', type: 'button', onclick: toMap }, [h('span', { text: '▶ マップへ' }), h('span', { class: 'btn__shine' })]);
      row = [h('button', { class: 'btn btn--stone', type: 'button', text: 'もういちど', onclick: again })];
    }
    const btns = h('div', { class: 'rs__btns' }, [main, h('div', { class: 'rs__row' }, row)]);

    const panel = h('div', { class: 'rs ' + mood }, [
      h('div', { class: 'rs__fx' }),
      banner, bossCard, lvBand, best, chips, items, ttl, btns
    ]);
    MQ.ui.mount('screen-result', panel);

    // 上から 順番に 出す
    Array.prototype.slice.call(panel.children).forEach(function (el, i) {
      if (el.classList.contains('rs__fx')) return;
      el.classList.add('rs__in');
      setTimeout(function () { el.classList.add('is-in'); }, 80 + i * 110);
    });

    /* ---- 音 ---- */
    if (!sum.bossBeaten) MQ.sfx.clear();          // ボスの ときは ファンファーレが 鳴っている
    if (rw.leveledUp) setTimeout(MQ.sfx.levelup, 700);
    if (rw.treasure) setTimeout(MQ.sfx.treasure, 1000);
    if (rw.frags.length) setTimeout(MQ.sfx.frag, 1400);
    if (rw.gear || rw.densetsu.length) setTimeout(MQ.sfx.item, 1200);
    // ボスを たおした ときだけ 祝う（ザコ戦・とっくん・にげられた ときは マップの 曲）
    if (sum.bossBeaten) {
      MQ.bgm.then(tower ? 'ending' : 'victory');   // ファンファーレが 鳴りおわったら つづける
    } else {
      MQ.bgm.stop();
      setTimeout(function () { MQ.bgm.play('map'); }, 1800);
    }
  }

  return { render: render };
})();
