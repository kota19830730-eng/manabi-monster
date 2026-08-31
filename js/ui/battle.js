/* ---------------------------------------------------------
   たたかいの画面

   ・戦う場所は 枠なしの ブロックの 世界（エリアごとに 時間帯が ちがう）
   ・下の パネルは  問題カード → メモ欄（大きく） → こたえ → キー（一番下）
     ＝ 息子さんの リクエスト（B案）。「メモを ひろげる」で 画面いっぱい
   ・2体同時／3体同時、たからばこ、ひっさつわざ、タイム表示
   --------------------------------------------------------- */
window.MQ = window.MQ || {};
MQ.ui = MQ.ui || {};

MQ.ui.battle = (function () {
  const h = MQ.util.h;
  const MOBS = 12;              // ザコの数（やさしい4 → ふつう4 → むずかしい4）
  const REVENGE_MAX = 2;
  const RARE_CHANCE = 0.4;
  const TRIO_CHANCE = 0.35;

  let d = null;
  let ctx = null;
  let memo = null;
  let timer = null;
  let tickTimer = null;
  let locked = false;
  let input = '';
  let div = { q: '', r: '', active: 'q' };
  let bossOnScreen = false;
  let fxTimer = null;
  let quakeTimer = null;
  let writeState = 'draw';     // かん字を 書く問題： 'draw' → 'check'
  let leftSec = 0;

  // 遠くの 山（四角い ブロック 2つ）
  function hill(w1, h1, w2, h2) {
    return h('span', {}, [
      h('i', { style: { width: w1 + 'px', height: h1 + 'px' } }),
      h('b', { style: { width: w2 + 'px', height: h2 + 'px' } })
    ]);
  }

  /* =======================================================
     画面を くみ立てる
     ======================================================= */
  function build() {
    if (d) return;
    d = {};
    d.root = h('div', { class: 'battle' }, [
      h('section', { class: 'arena' }, [
        // 背景は CSS の しきつめ（空・遠くの山・草・地面）。画像ファイルは 使わない
        d.bg = h('div', { class: 'arena__bg' }, [
          h('div', { class: 'arena__sky' }),
          h('div', { class: 'cloud cloud--c' }, [h('i'), h('i'), h('i')]),
          h('div', { class: 'arena__hills' }, [
            hill(26, 16, 54, 20), hill(34, 20, 66, 24), hill(22, 14, 46, 18)
          ]),
          h('div', { class: 'arena__grass' }),
          h('div', { class: 'arena__ground' })
        ]),
        d.top = h('div', { class: 'arena__top' }, [
          d.count = h('span', { class: 'pillstat' }),
          d.prog = h('div', { class: 'hpbar' }, [d.progFill = h('div', { class: 'hpbar__fill', style: { width: '100%' } })]),
          d.time = h('span', { class: 'pillstat pillstat--time' })
        ]),
        d.msg = h('p', { class: 'arena__msg', 'aria-live': 'polite' }),
        d.field = h('div', { class: 'arena__field' }, [
          d.hero = h('div', { class: 'hero' }, [
            d.heroImg = h('img', { class: 'sprite hero__img', alt: '主人公' }),
            h('div', { class: 'shadow shadow--hero' })
          ]),
          d.foes = h('div', { class: 'foes' })
        ]),
        d.fx = h('div', { class: 'fx' }),
        d.combo = h('div', { class: 'combo', hidden: true }),
        // アイテム（v2.0）：右下の 金の 3Dボタン（光沢＋のこり数）。モーダルは 下の d.bag
        d.bagBtn = h('button', { class: 'bagbtn', type: 'button', hidden: true, onclick: openBag }, [
          h('i', { class: 'ic ic--bag' }),
          h('span', { class: 'bagbtn__t', text: 'アイテム' }),
          d.bagN = h('span', { class: 'bagbtn__n', text: '' }),
          h('span', { class: 'btn__shine' }),
          d.bagDots = h('span', { class: 'bagbtn__dots' })
        ]),
        d.warning = h('div', { class: 'warning', hidden: true }, [
          d.warnText = h('span', { class: 'warning__text', text: 'WARNING' }),
          d.warnSub = h('span', { class: 'warning__sub', text: 'ボスが ちかづいてくる…！' })
        ])
      ]),
      d.panel = h('section', { class: 'battle__body' }, [
        d.card = h('div', { class: 'card' }, [
          d.unit = h('p', { class: 'card__unit' }),
          d.prompt = h('div', { class: 'card__q' })
        ]),
        d.choices = h('div', { class: 'choices' }),
        d.memo = h('div', { class: 'memo' }, [
          d.memoQ = h('div', { class: 'memo__q' }),
          d.hissan = h('div', { class: 'hissan', hidden: true }),
          d.canvas = h('canvas', { class: 'memo__canvas' }),
          h('div', { class: 'memo__btns' }, [
            d.memoWide = h('button', { class: 'memo__btn', type: 'button', text: 'ひろげる' }),
            d.memoClear = h('button', { class: 'memo__btn', type: 'button', text: 'けす' })
          ]),
          d.memoHint = h('span', { class: 'memo__hint', text: 'ここに ゆびで 書けるよ' })
        ]),
        d.spacer = h('div', { class: 'panelspacer', hidden: true }),
        d.displays = h('div', { class: 'displays' }),
        d.keys = h('div', { class: 'keys' }),
        d.hint = h('div', { class: 'hintbox', hidden: true }),
        d.feedback = h('p', { class: 'feedback', role: 'status' })
      ]),
      d.fxs = h('div', { class: 'fxscreen' }),   // ひっさつの 画面ぜんたいの 演出（v2.5）
      // アイテム（v2.0）：画面ぜんたいに かぶせる モーダル（紺の カード＋金わく＋金の バナー）
      d.bag = h('div', { class: 'bag', hidden: true, onclick: function (e) { if (e.target === d.bag) closeBag(); } }, [
        h('div', { class: 'bagcard' }, [
          h('span', { class: 'bagcard__star bagcard__star--l' }),
          h('span', { class: 'bagcard__star bagcard__star--r' }),
          h('div', { class: 'bagcard__head' }, [
            h('h3', { class: 'bagcard__title', text: 'アイテム' }),
            h('div', { class: 'bagcard__subrow' }, [
              h('span', { class: 'bagcard__sub', text: '1回の たたかいで 1回ずつ つかえる' }),
              d.bagCoins = h('span', { class: 'bagcard__coins' })
            ])
          ]),
          d.bagList = h('div', { class: 'bag__list' }),
          h('button', { class: 'btn btn--stone bag__close', type: 'button', text: 'とじる', onclick: closeBag })
        ])
      ])
    ]);

    MQ.ui.mount('screen-battle', d.root);
    memo = makeMemo(d.canvas, d.memoClear);
    d.memoWide.addEventListener('click', toggleWide);
  }

  function toggleWide() {
    MQ.sfx.tap();
    const wide = d.memo.classList.toggle('memo--wide');
    d.panel.classList.toggle('is-wide', wide);   // 下に かくれた 部品（金の 光など）が はみ出ないように
    d.memoWide.textContent = wide ? 'もどす' : 'ひろげる';
    memo.resizeKeep();
  }

  function closeWide() {
    if (d.memo.classList.contains('memo--wide')) {
      d.memo.classList.remove('memo--wide');
      d.panel.classList.remove('is-wide');
      d.memoWide.textContent = 'ひろげる';
    }
  }

  /* =======================================================
     たたかいを はじめる
     ======================================================= */
  function start(stageId, opts) {
    opts = opts || {};
    const found = MQ.content.findStage(stageId);
    const player = MQ.save.current();
    if (!found || !player) return;
    build();
    MQ.ui.syncCustom();
    clearTimeout(timer);
    clearInterval(tickTimer);
    bossOnScreen = false;

    const isTower = !!found.stage.tower;
    ctx = { player: player, world: found.world, area: found.area, stage: found.stage, timeAttack: opts.timeAttack || 0 };
    d.root.classList.toggle('battle--tower', isTower);

    if (isTower) {
      MQ.battle.start({
        stage: found.stage, mode: 'tower',
        bossId: 'boss-maou', bossHp: 5, bossMax: 8, enrageAt: 3,
        timeAttack: ctx.timeAttack, items: bagOf(player), coins: player.coins || 0
      });
    } else {
      const escaped = MQ.util.shuffle(MQ.save.escapedIn(player, ctx.area.id)).slice(0, REVENGE_MAX);
      // 開いている ステージの 中で 何番目か → むずかしさ（0=最初 1=最後）
      const opened = ctx.area.stages.filter(function (st) { return MQ.content.isAvailable(st); });
      const hard = opened.length > 1 ? Math.max(0, opened.indexOf(found.stage)) / (opened.length - 1) : 0.5;
      const enemies = MQ.enemies.pickIds(ctx.area.id, MOBS, hard);
      let rareId = null;
      if (Math.random() < RARE_CHANCE) {
        rareId = Math.random() < 0.5 ? MQ.enemies.goldenId() : MQ.enemies.rareIdFor(ctx.area.id);
      }
      let trioIds = null;
      const trio = MQ.enemies.trioFor(ctx.area.id);
      if (trio && Math.random() < TRIO_CHANCE) { trioIds = trio; rareId = null; }
      const boss = MQ.enemies.bossFor(ctx.area.id);
      MQ.battle.start({
        stage: found.stage, mode: 'normal',
        escaped: escaped, enemies: enemies, bossId: boss.id,
        rareId: rareId, trioIds: trioIds, chest: true, mobs: MOBS,
        timeAttack: ctx.timeAttack, items: bagOf(player), coins: player.coins || 0
      });
    }

    d.heroImg.src = MQ.hero.sprite(player);
    paintScene(isTower ? 'tower' : (ctx.area.biome || 'mountain'));
    MQ.bgm.play(isTower ? 'maou' : 'battle');
    MQ.ui.show('screen-battle');
    if (isTower) towerIntro(); else renderQuestion();
  }

  // にげた敵だけと たたかう（とっくん）
  function startTokkun() {
    const player = MQ.save.current();
    if (!player) return;
    const all = MQ.util.shuffle(MQ.save.allEscaped(player)).slice(0, 5);
    if (!all.length) { MQ.ui.toast('にげた敵は いないよ'); return; }
    build();
    MQ.ui.syncCustom();
    clearTimeout(timer);
    clearInterval(tickTimer);
    bossOnScreen = false;

    const first = MQ.content.findStage(all[0].entry.stageId) || MQ.content.findStage('sansu3-1');
    ctx = {
      player: player, world: first.world, area: first.area, stage: first.stage,
      tokkun: true, timeAttack: 0
    };
    MQ.battle.start({
      stage: first.stage, mode: 'tokkun',
      escaped: all.map(function (o) {
        const e = Object.assign({}, o.entry);
        e.areaId = o.areaId;
        return e;
      }),
      items: bagOf(player),
      coins: player.coins || 0
    });
    d.heroImg.src = MQ.hero.sprite(player);
    paintScene('mountain');
    MQ.bgm.play('battle');
    MQ.ui.show('screen-battle');
    renderQuestion();
  }

  function paintScene(biome) {
    if (d.bg) d.bg.className = 'arena__bg arena__bg--' + (biome || 'mountain');
  }

  /* =======================================================
     問題を 出す
     ======================================================= */
  function renderFoes(q) {
    d.foes.innerHTML = '';
    const ids = q.groupIds || [q.enemyId];
    const pos = q.groupPos || 0;
    const boss = !!q.boss;
    const last = MQ.battle.mode() === 'tower';
    const enraged = boss && MQ.battle.isEnraged();

    ids.forEach(function (id, i) {
      const e = MQ.enemies.get(id) || { name: '' };
      let cls = 'enemy';
      let size = 72;
      if (boss) { cls += last ? ' enemy--last enemy--boss' : ' enemy--boss'; size = last ? 112 : 96; }
      else if (ids.length > 1) { cls += ' enemy--small'; size = 54; }
      else if ((e.rank || 2) === 3) { cls += ' enemy--r3'; size = 86; }   // 強そうなのは 大きく
      else if ((e.rank || 2) === 1) { cls += ' enemy--r1'; size = 60; }   // よわそうなのは 小さく
      if (q.rare && i === pos) cls += ' enemy--rare';
      if (i < pos) cls += ' enemy--done';
      else if (i > pos) cls += ' enemy--waiting';

      const box = h('div', { class: cls }, [
        MQ.enemies.node(id, { size: size, cls: 'enemy__img', enrage: enraged }),
        h('div', { class: 'shadow shadow--foe' }),
        h('span', { class: 'enemy__name', text: (boss ? (last ? 'ラスボス ' : 'ボス ') : '') + e.name }),
        boss ? h('div', { class: 'bosshp' }) : null
      ]);
      d.foes.appendChild(box);
    });

    d.cur = d.foes.children[Math.min(pos, d.foes.children.length - 1)];
    if (boss) renderBossHp();
  }

  function renderBossHp() {
    const el = d.foes.querySelector('.bosshp');
    if (!el) return;
    el.innerHTML = '';
    const max = MQ.battle.bossHpMax();
    const hp = MQ.battle.bossHp();
    for (let i = 0; i < max; i++) {
      el.appendChild(h('span', { class: 'bosshp__seg' + (i >= hp ? ' is-lost' : '') }));
    }
  }

  // 上の バー（ザコの ときは のこりの数、ボスの ときは ボスの HP）
  function setProgress(r) {
    if (!d.progFill) return;
    d.progFill.style.width = Math.max(0, Math.min(1, r)) * 100 + '%';
  }

  function comboShow(n) {
    // コンボで 曲が もりあがる（3〜 ドラム／5〜 もう1本の メロディ＋テンポ）
    MQ.bgm.setIntensity(n >= 5 ? 2 : (n >= 3 ? 1 : 0));
    d.combo.hidden = n < 2;
    if (n < 2) return;
    const sp = specialOf(n);
    d.combo.textContent = n + ' コンボ！' + (sp ? '　ひっさつ！' : '');
    d.combo.className = 'combo' + (n >= 3 ? ' combo--crit' : '') + (sp ? ' combo--' + sp.id : '');
    d.combo.classList.remove('is-pop');
    void d.combo.offsetWidth;
    d.combo.classList.add('is-pop');
  }

  function startCountdown() {
    clearInterval(tickTimer);
    if (!ctx.timeAttack) {
      d.time.innerHTML = '<span>タイム</span>';
      d.timeVal = h('b', { text: MQ.ui.fmtTime(MQ.battle.elapsed()) });
      d.time.appendChild(d.timeVal);
      tickTimer = setInterval(function () {
        if (d.timeVal) d.timeVal.textContent = MQ.ui.fmtTime(MQ.battle.elapsed());
      }, 500);
      d.time.classList.remove('is-hurry');
      return;
    }
    leftSec = ctx.timeAttack;
    d.time.innerHTML = '<span>のこり</span>';
    d.timeVal = h('b', { text: leftSec + 'びょう' });
    d.time.appendChild(d.timeVal);
    d.time.classList.remove('is-hurry');
    tickTimer = setInterval(function () {
      if (locked) return;
      leftSec--;
      if (d.timeVal) d.timeVal.textContent = Math.max(0, leftSec) + 'びょう';
      if (leftSec <= 5) { d.time.classList.add('is-hurry'); if (leftSec > 0) MQ.sfx.tick(); }
      if (leftSec <= 0) {
        clearInterval(tickTimer);
        MQ.sfx.timeup();
        onTimeUp();
      }
    }, 1000);
  }

  function onTimeUp() {
    if (locked) return;
    locked = true;
    const q = MQ.battle.current();
    const res = MQ.battle.timeUp();
    d.msg.textContent = '時間切れ！ でも つづけられるよ';
    sayAnswer(res);
    markChoices(q, -1);
    if (res.outcome === 'guard') { guardFx(); wait(2600, res.fled ? finish : advanceBoss); }
    else { flee(); wait(2600, advance); }
  }

  function renderQuestion() {
    const q = MQ.battle.current();
    if (!q) { finish(); return; }
    const bossPhase = MQ.battle.phase() === 'boss';
    const last = MQ.battle.mode() === 'tower';
    locked = false;
    input = '';
    writeState = 'draw';
    div = { q: '', r: '', active: 'q' };
    closeWide();
    d.feedback.textContent = '';
    d.feedback.className = 'feedback';
    d.msg.classList.remove('is-quiet');
    d.fx.textContent = '';
    d.fx.className = 'fx';
    d.hint.hidden = true;
    d.hint.innerHTML = '';
    d.unit.textContent = q.unit || '';
    renderCount();
    comboShow(MQ.battle.combo());
    startCountdown();
    closeBag();
    renderBag();
    syncBuffs();

    renderFoes(q);

    const e = MQ.enemies.get(q.enemyId) || { name: '' };
    if (!bossPhase || !bossOnScreen) {
      void d.cur.offsetWidth;
      d.cur.classList.add('is-appear');
      if (q.chest) MQ.sfx.chestAppear();
      else { MQ.sfx.appear(); if (q.rare) MQ.sfx.rare(); }
    }

    if (q.chest) {
      d.msg.textContent = 'たからばこが 出てきた！ あけてみよう';
    } else if (bossPhase) {
      d.msg.textContent = !bossOnScreen ? (last ? 'まおうが 立ちはだかる…！' : 'ボスの ' + e.name + ' が たちふさがる！')
        : MQ.battle.isEnraged() ? e.name + ' は 本気だ！ あと ' + MQ.battle.bossHp() + 'かい！'
        : 'こうげきだ！ あと ' + MQ.battle.bossHp() + 'かい！';
      bossOnScreen = true;
    } else if (q.groupIds && q.groupPos === 0) {
      d.msg.textContent = q.groupSize + '体 まとめて あらわれた！';
    } else {
      d.msg.textContent = q.revenge ? 'にげた ' + e.name + ' が もどってきた！'
        : q.rare ? e.name + ' が あらわれた！ けいけんち 3ばい！'
        : e.name + ' が あらわれた！';
    }

    renderAnswerArea(q);
  }

  // 上の バー（ザコの ときは のこりの数、ボスの ときは 出題数と HP）
  function renderCount() {
    const bossPhase = MQ.battle.phase() === 'boss';
    const last = MQ.battle.mode() === 'tower';
    d.count.innerHTML = bossPhase
      ? '<span>' + (last ? 'ラスボス' : 'ボス') + '</span>'
      : (ctx.tokkun ? '<span>とっくん</span>' : '<span>てき</span>');
    if (!bossPhase) {
      d.count.appendChild(h('b', { text: (MQ.battle.mobIndex() + 1) + ' / ' + MQ.battle.mobTotal() }));
      setProgress(1 - MQ.battle.mobIndex() / Math.max(1, MQ.battle.mobTotal()));
    } else {
      d.count.appendChild(h('b', { text: MQ.battle.bossAsked() + ' / ' + MQ.battle.bossMax() }));
      setProgress(MQ.battle.bossHp() / Math.max(1, MQ.battle.bossHpMax()));
    }
  }

  /* =======================================================
     どうぐ（v2.0）。もちもの（たからもの）を たたかいの 中で 使う。
     ルールは core/battle.js の useItem()。ここは ボタン・シート・演出だけ。
       右下の「どうぐ」ボタン → シート（3つ ならぶ）→ タップで 発動
       発動：技名の バナー＋色の 光＋主人公の まわりの つぶつぶ＋効果音
       効果が のこっている あいだは 主人公が 光る（has-burst / has-shield …）
     ======================================================= */
  function bagOf(player) { return MQ.treasure.bagItems(player); }

  // 右下の ボタン（もちものが ない とき・タイムアタックでは 出さない）
  function renderBag() {
    if (!d.bagBtn) return;
    const list = MQ.battle.items();
    d.bagBtn.hidden = !list.length || !!(ctx && ctx.timeAttack);
    const left = list.filter(function (it) { return it.left > 0; }).length;
    d.bagBtn.classList.toggle('is-empty', left === 0);
    if (d.bagN) d.bagN.textContent = String(left);
  }

  function openBag() {
    if (locked || !d.bag) return;
    MQ.sfx.tap();
    renderBagList();
    d.bag.hidden = false;
  }

  function renderBagList() {
    // もっている コイン（さいふ ＋ この たたかいで ひろった ぶん）
    if (d.bagCoins) {
      d.bagCoins.textContent = '';
      d.bagCoins.appendChild(MQ.ui.coinNode(16));
      d.bagCoins.appendChild(h('b', { text: String(MQ.battle.coinsLeft()) }));
      d.bagCoins.appendChild(h('span', { text: 'まい' }));
    }
    const list = MQ.battle.items();
    d.bagList.innerHTML = '';
    list.forEach(function (it) {
      const used = it.left <= 0;
      const off = !it.can && !used;
      const cls = 'bagrow k--' + it.kind + (it.gold ? ' is-gold' : '')
        + (used ? (it.reOk ? ' is-re' : ' is-used') : '') + (off ? ' is-off' : '');
      const more = it.uses > 1 && !used ? '（あと ' + it.left + '回）' : '';
      let right;
      if (used && it.reOk) {
        // じゅうてん：コイン 2まいで もう1回（1たたかいに 1回）
        right = h('div', { class: 'bagrow__recol' }, [
          h('button', {
            class: 'bagrow__re', type: 'button',
            onclick: function () { rechargeUI(it.id); }
          }, [h('span', { text: 'もう1回' })]),
          h('span', { class: 'bagrow__recost' }, [
            MQ.ui.coinNode(14),
            h('span', { text: 'コイン ' + MQ.battle.rechargeCost + 'まい' })
          ])
        ]);
      } else if (used) {
        right = h('span', { class: 'bagrow__stamp', text: 'つかった' });
      } else if (off) {
        right = h('span', { class: 'bagrow__stamp bagrow__stamp--off', text: it.why });
      } else {
        right = h('button', {
          class: 'btn btn--small bagrow__use', type: 'button',
          onclick: function () { useItemUI(it.id); }
        }, [h('span', { text: 'つかう' }), h('span', { class: 'btn__shine' })]);
      }
      d.bagList.appendChild(h('div', { class: cls }, [
        h('div', { class: 'bagrow__art' }, [MQ.treasure.node(it.id, { gold: it.gold, size: 44 })]),
        h('div', { class: 'bagrow__body' }, [
          h('span', { class: 'bagrow__pw', text: it.powerName }),
          h('span', { class: 'bagrow__desc', text: it.short + more }),
          h('div', { class: 'bagrow__tags' }, [
            h('span', { class: 'bagrow__tag bagrow__tag--kind', text: it.kindName }),
            it.gold ? h('span', { class: 'bagrow__tag bagrow__tag--gold', text: 'ぴかぴか' }) : null
          ])
        ]),
        right
      ]));
    });
  }

  function rechargeUI(id) {
    const res = MQ.battle.recharge(id);
    if (!res.ok) { MQ.ui.toast(res.why || 'いまは できない'); return; }
    MQ.sfx.coin();
    MQ.ui.toast('コイン ' + res.spent + 'まいで もう1回 つかえる！');
    renderBagList();
    renderBag();
  }

  function closeBag() { if (d.bag) d.bag.hidden = true; }

  function useItemUI(id) {
    if (locked) return;
    const res = MQ.battle.useItem(id);
    if (!res.ok) { MQ.ui.toast(res.why || 'いまは つかえない'); return; }
    closeBag();
    locked = true;
    const q = MQ.battle.current();
    playItemFx(res);
    renderBag();
    syncBuffs();

    if (res.power === 'burst') {
      d.msg.textContent = 'けんが 赤く もえる！ つぎの 正解は ' + res.val + 'ばい！';
    } else if (res.power === 'shield') {
      d.msg.textContent = 'たてが ひかる！ まちがえても ' + res.val + '回 セーフ！';
    } else if (res.power === 'freeze') {
      d.msg.textContent = '時が 止まった！ まちがえても コンボは そのまま！';
    } else if (res.power === 'guide') {
      d.msg.textContent = 'みちしるべが ひかる！ ヒントを 見てみよう';
      if (res.hint) showHint(res.hint, q, -1);
    } else if (res.power === 'golden') {
      if (res.now) {
        renderFoes(MQ.battle.current());
        void d.cur.offsetWidth;
        d.cur.classList.add('is-appear');
        MQ.sfx.rare();
        d.msg.textContent = 'ゴールデンスライムが あらわれた！ けいけんち 3ばい！';
      } else {
        d.msg.textContent = 'つぎの てきが ゴールデンスライムに なる！';
      }
    } else if (res.power === 'chest') {
      renderCount();
      d.msg.textContent = 'かぎが 回った！ つぎに たからばこが 出る！';
    } else if (res.power === 'power') {
      d.msg.textContent = 'パワーアップ！ けいけんち ' + res.val + 'ばい！';
    } else if (res.power === 'charge') {
      comboShow(res.combo);
      d.msg.textContent = 'コンボ ＋' + res.val + '！ ' + chargeNote(res.combo);
    }
    setTimeout(function () { locked = false; }, 900);
  }

  function chargeNote(combo) {
    const sp = specialOf(combo);
    if (sp) return 'つぎの 正解で ' + sp.name;
    const next = TIER1_MIN;
    return 'ひっさつまで あと ' + Math.max(0, next - combo) + '！';
  }

  // 使った ときの 演出：技名＋色の 光＋主人公の まわりの つぶつぶ（種類で 色が 変わる）
  const ITEM_FX_MS = { atk: 1000, def: 1000, wis: 900, luck: 1000 };
  function playItemFx(res) {
    if (!d.fx) return;
    const kind = res.kind || 'atk';
    d.fx.textContent = '';
    d.fx.className = 'fx fx--item fx--' + kind;
    d.fx.appendChild(h('span', { class: 'fxname', text: res.powerName + '！' }));
    d.fx.appendChild(h('span', { class: 'fx__tint fx__tint--' + kind }));
    const sp = sparks(14, 'fx__sparks--' + kind, 60);
    sp.classList.add('fx__sparks--hero');
    d.fx.appendChild(sp);
    if (kind === 'def') d.fx.appendChild(h('span', { class: 'fx__aura fx__aura--def' }));
    MQ.sfx.item(kind);
    flash(kind === 'luck');
    d.hero.classList.remove('is-special');
    void d.hero.offsetWidth;
    d.hero.classList.add('is-special');
    if (d.msg) d.msg.classList.add('is-quiet');
    clearTimeout(fxTimer);
    fxTimer = setTimeout(function () {
      d.fx.textContent = '';
      d.fx.className = 'fx';
      if (d.msg) d.msg.classList.remove('is-quiet');
    }, ITEM_FX_MS[kind] || 1000);
  }

  // のこっている 効果 → 主人公の 光と ボタンの 点
  function syncBuffs() {
    if (!d.hero) return;
    const b = MQ.battle.buffs();
    d.hero.classList.toggle('has-burst', b.dmg > 1);
    d.hero.classList.toggle('has-shield', b.shield > 0);
    d.hero.classList.toggle('has-freeze', b.freeze > 0);
    d.hero.classList.toggle('has-power', b.xpMul > 1);
    if (!d.bagDots) return;
    d.bagDots.innerHTML = '';
    [['burst', b.dmg > 1], ['shield', b.shield > 0], ['freeze', b.freeze > 0], ['power', b.xpMul > 1]].forEach(function (p) {
      if (p[1]) d.bagDots.appendChild(h('i', { class: 'bagbtn__dot bagbtn__dot--' + p[0] }));
    });
  }

  // ばくれつが 当たった（赤い つぶが はじける）
  function burstHit() {
    if (!d.fx) return;
    const sp = sparks(12, 'fx__sparks--atk', 72);
    d.fx.appendChild(sp);
    setTimeout(function () { if (sp.parentNode) sp.parentNode.removeChild(sp); }, 800);
  }

  // たてが まもった
  function shieldFx() {
    MQ.sfx.guard();
    if (d.fx) {
      const ring = h('span', { class: 'fx__aura fx__aura--def' });
      d.fx.appendChild(ring);
      setTimeout(function () { if (ring.parentNode) ring.parentNode.removeChild(ring); }, 800);
    }
    d.hero.classList.remove('is-hurt');
    void d.hero.offsetWidth;
    d.hero.classList.add('is-hurt');
  }

  /* ---- 答える ところ ---- */
  function fitPrompt() {
    const n = (d.prompt.textContent || '').replace(/s/g, '').length;
    const q = MQ.battle.current();
    const vert = !!(q && q.layout === 'vertical');   // ひっさん：メモ欄に 数字が あるので カードは 小さめ
    d.prompt.className = 'card__q' + (n > 30 ? ' card__q--s' : (n > 14 || vert ? ' card__q--m' : ''));
  }

  function renderAnswerArea(q) {
    d.prompt.innerHTML = q.prompt || '';
    fitPrompt();
    d.card.hidden = false;

    // えらぶ
    if (q.type === 'choice') {
      d.choices.hidden = false;
      d.memo.hidden = true;
      d.spacer.hidden = true;
      d.displays.hidden = true;
      d.keys.hidden = true;
      d.choices.innerHTML = '';
      q.choices.forEach(function (text, i) {
        d.choices.appendChild(h('button', {
          class: 'choice', type: 'button', text: text, 'data-i': String(i),
          onclick: function () { if (locked) return; MQ.sfx.tap(); submit(i); }
        }));
      });
      return;
    }

    d.choices.hidden = true;
    d.choices.innerHTML = '';

    // かん字を 書く（じぶんで 答え合わせ）
    if (q.type === 'write') {
      d.memo.hidden = false;
      d.spacer.hidden = true;
      d.hissan.hidden = true;
      d.memoHint.textContent = 'ここに ゆびで かん字を かこう';
      d.memoQ.innerHTML = d.prompt.innerHTML;
      d.displays.hidden = true;
      d.keys.hidden = false;
      memo.reset();
      renderWriteKeys(q);
      return;
    }

    // 数字 / わりざん / ローマ字
    const useMemo = q.scratch !== false;
    d.memo.hidden = !useMemo;
    d.spacer.hidden = useMemo;      // メモが ない ときだけ 下に よせる
    d.displays.hidden = false;
    d.keys.hidden = false;

    if (useMemo) {
      d.memoHint.textContent = 'ここに ゆびで ひっさんが かけるよ';
      if (q.layout === 'vertical') {
        d.hissan.hidden = false;
        d.memoQ.innerHTML = '';          // ひっさんの 数字が メモの 中に あるので 問題文は いらない
        d.hissan.innerHTML =
          '<span class="hissan__row">' + q.a + '</span>' +
          '<span class="hissan__row"><span class="hissan__sign">' + q.sign + '</span>' + q.b + '</span>';
      } else {
        d.hissan.hidden = true;
        d.memoQ.innerHTML = d.prompt.innerHTML;
      }
      memo.reset();
    }

    renderDisplays();
    if (q.type === 'roma') renderRomaKeys();
    else renderNumKeys();
  }

  function renderDisplays() {
    const q = MQ.battle.current();
    d.displays.innerHTML = '';
    if (q.type === 'divrem') {
      ['q', 'r'].forEach(function (f) {
        d.displays.appendChild(h('button', {
          class: 'display display--half' + (div.active === f ? ' is-on' : ''), type: 'button',
          onclick: function () { if (locked) return; MQ.sfx.tap(); div.active = f; renderDisplays(); }
        }, [
          h('span', { class: 'display__label', text: f === 'q' ? 'こたえ' : 'あまり' }),
          h('span', { class: 'display__value', text: div[f] === '' ? '?' : div[f] })
        ]));
      });
      return;
    }
    if (q.type === 'roma') {
      d.displays.appendChild(h('div', { class: 'display' }, [
        h('span', { class: 'display__label', text: 'ローマ字' }),
        h('span', { class: 'display__value display__value--roma' }, [
          h('span', { text: input }),
          h('span', { class: 'display__caret' })
        ])
      ]));
      return;
    }
    d.displays.appendChild(h('div', { class: 'display is-on' }, [
      h('span', { class: 'display__label', text: 'こたえ' }),
      h('span', { class: 'display__value', text: input === '' ? '?' : input })
    ]));
  }

  function renderNumKeys() {
    d.keys.className = 'keys';
    d.keys.innerHTML = '';
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'けす', '0', 'こたえる'].forEach(function (label) {
      const cls = 'key' + (label === 'けす' ? ' key--del' : '') + (label === 'こたえる' ? ' key--go' : '');
      d.keys.appendChild(h('button', { class: cls, type: 'button', text: label, onclick: function () { pressKey(label); } }));
    });
  }

  // ローマ字は 本物と 同じ QWERTY ならび（タイピングの れんしゅうに なる）
  function renderRomaKeys() {
    d.keys.className = 'keys keys--roma';
    d.keys.innerHTML = '';
    const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
    rows.forEach(function (row, i) {
      const r = h('div', { class: 'keyrow' + (i === 1 ? ' keyrow--in1' : i === 2 ? ' keyrow--in2' : '') });
      row.split('').forEach(function (ch) {
        r.appendChild(h('button', { class: 'key', type: 'button', text: ch, onclick: function () { pressKey(ch); } }));
      });
      if (i === 2) {
        r.appendChild(h('button', { class: 'key key--del key--wide', type: 'button', text: 'けす', onclick: function () { pressKey('けす'); } }));
      }
      d.keys.appendChild(r);
    });
    const last = h('div', { class: 'keyrow' }, [
      h('button', { class: 'key', type: 'button', text: '-', onclick: function () { pressKey('-'); } }),
      h('button', { class: 'key key--go key--go3', type: 'button', text: 'こたえる', onclick: function () { pressKey('こたえる'); } })
    ]);
    d.keys.appendChild(last);
  }

  // かん字を 書く問題の ボタン
  function renderWriteKeys(q) {
    d.keys.className = 'keys keys--write';
    d.keys.innerHTML = '';
    if (writeState === 'draw') {
      d.keys.appendChild(h('button', {
        class: 'key key--go key--go3', type: 'button', text: 'かけた！',
        onclick: function () {
          if (locked) return;
          MQ.sfx.tap();
          writeState = 'check';
          d.prompt.innerHTML = q.prompt + '<br><span class="card__ans">' + MQ.util.esc(q.answer) + '</span>';
          fitPrompt();
          feedback('じぶんの 字と 見くらべてみよう。');
          renderWriteKeys(q);
        }
      }));
      return;
    }
    d.keys.appendChild(h('button', {
      class: 'key key--go', type: 'button', text: '◯ かけた',
      onclick: function () { if (locked) return; MQ.sfx.tap(); submit(true); }
    }));
    d.keys.appendChild(h('button', {
      class: 'key key--del', type: 'button', text: '✕ ちがった',
      onclick: function () { if (locked) return; MQ.sfx.tap(); submit(false); }
    }));
  }

  function pressKey(label) {
    if (locked) return;
    const q = MQ.battle.current();
    MQ.sfx.key();

    if (q.type === 'roma') {
      if (label === 'けす') input = input.slice(0, -1);
      else if (label === 'こたえる') { if (input === '') return; submit(input); return; }
      else if (input.length < 14) input += label;
      renderDisplays();
      return;
    }

    if (q.type === 'divrem') {
      if (label === 'けす') {
        div[div.active] = div[div.active].slice(0, -1);
      } else if (label === 'こたえる') {
        if (div.active === 'q' && div.q !== '' && div.r === '') { div.active = 'r'; renderDisplays(); MQ.ui.toast('つぎは あまり を 入れてね'); return; }
        if (div.q === '' || div.r === '') { MQ.ui.toast('こたえ と あまり を 入れてね'); return; }
        submit({ q: parseInt(div.q, 10), r: parseInt(div.r, 10) });
        return;
      } else if (div[div.active].length < 3) {
        div[div.active] += label;
      }
      renderDisplays();
      return;
    }

    if (label === 'けす') input = input.slice(0, -1);
    else if (label === 'こたえる') { if (input === '') return; submit(parseInt(input, 10)); return; }
    else if (input.length < 5) input += label;
    renderDisplays();
  }

  /* =======================================================
     答え合わせ
     ======================================================= */
  function submit(value) {
    if (locked) return;
    locked = true;
    clearInterval(tickTimer);
    closeWide();
    const q = MQ.battle.current();
    const e = MQ.enemies.get(q.enemyId) || { name: '' };
    const res = MQ.battle.answer(value);
    closeBag();
    syncBuffs();

    /* ---- たからばこ ---- */
    if (res.outcome === 'chest') {
      markChoices(q, value);
      MQ.sfx.chestOpen();
      flash(true);
      popDamage('+' + res.xp, true);
      comboShow(res.combo);
      d.msg.textContent = 'たからばこが 開いた！ きんのコイン ＋' + (res.coins || 1);
      ok(res.note);
      wait(1900, advance);
      return;
    }
    if (res.outcome === 'chestlost') {
      markChoices(q, value);
      MQ.sfx.miss();
      d.cur.classList.add('is-flee');
      d.msg.textContent = 'たからばこは にげてしまった… でも だいじょうぶ！';
      sayAnswer(res);
      wait(2400, advance);
      return;
    }

    /* ---- ザコを たおした ---- */
    if (res.outcome === 'correct') {
      markChoices(q, value);
      const spc = specialOf(res.combo);
      attack(res.crit, false, spc);
      if (res.burst) burstHit();
      popDamage('+' + res.xp, res.crit || res.rare || !!res.multi || !!res.burst);
      comboShow(res.combo);
      if (res.multi) {
        MQ.sfx.multiKO(res.multi);
        flash(true);
        shake(true);
        d.msg.textContent = res.multi >= 3 ? 'トリプル KO！！ ぜんぶ 一発で たおした！' : 'ダブル KO！ 2体 まとめて たおした！';
        d.foes.querySelectorAll('.enemy').forEach(function (el) { el.classList.add('is-down'); });
      } else {
        d.msg.textContent = (res.burst ? 'ばくれつ！ ' : res.crit ? 'クリティカル！ ' : '') + e.name + ' を たおした！'
          + (res.burst ? '　けいけんち ' + res.burst + 'ばい！' : res.rare ? '　3ばいだ！' : '')
          + (res.coins ? '　コイン ＋' + res.coins : '');
      }
      ok(res.note);
      wait((res.multi ? 2200 : 1700) + (spc ? Math.max(0, spc.ms - 1100) : 0), advance);   // 大きな わざは 見おわるまで まつ
      return;
    }

    /* ---- もう1回 ---- */
    if (res.outcome === 'shielded') {
      // てっぺき まもり：2回目に まちがえても にげられない。答えは 見せずに もう1回
      shieldFx();
      comboShow(res.combo || 0);
      d.msg.textContent = 'たてが まもった！ もう1回 こたえよう！' + (res.left ? '（あと ' + res.left + '回）' : '');
      if (q.type === 'choice') {
        const b = d.choices.querySelector('.choice[data-i="' + value + '"]');
        if (b) { b.classList.add('is-out'); b.disabled = true; }
      }
      input = '';
      writeState = 'draw';
      div = { q: '', r: '', active: 'q' };
      if (q.type === 'write') { d.prompt.innerHTML = q.prompt; renderWriteKeys(q); memo.clear(); }
      else if (q.type !== 'choice') renderDisplays();
      startCountdown();
      wait(500, function () { locked = false; });
      return;
    }

    if (res.outcome === 'retry') {
      dodge();
      comboShow(res.combo || 0);
      d.msg.textContent = res.frozen ? 'おしい！ でも 時とめで コンボは そのまま！ もう1回！'
        : q.boss ? 'おしい！ ふせがれた。もう1回！' : 'おしい！ ' + e.name + ' に よけられた。もう1回！';
      showHint(res.hint, q, value);
      input = '';
      writeState = 'draw';
      div = { q: '', r: '', active: 'q' };
      if (q.type === 'write') { d.prompt.innerHTML = q.prompt; renderWriteKeys(q); memo.clear(); }
      else if (q.type !== 'choice') renderDisplays();
      startCountdown();
      wait(500, function () { locked = false; });
      return;
    }

    /* ---- ボスに ダメージ ---- */
    if (res.outcome === 'bosshit') {
      markChoices(q, value);
      attack(res.crit, true, specialOf(res.combo));
      if (res.burst) burstHit();
      popDamage((res.burst ? res.dmg + 'ダメージ ' : '') + '+' + res.xp, res.crit || !!res.burst);
      comboShow(res.combo);
      setTimeout(renderBossHp, 350);
      ok(res.note);

      if (res.defeated) {
        d.msg.textContent = (res.burst ? 'ばくれつ こうげき！ ' : '') + (res.last ? 'まおうを たおした！！！' : 'ボスの ' + e.name + ' を たおした！！');
        MQ.sfx.bossdown();
        MQ.bgm.stop();
        // ドーン の あとに ファンファーレ → けっか画面で しょうりの 曲へ つながる
        setTimeout(function () { MQ.bgm.play('fanfare', { then: res.last ? 'ending' : 'victory' }); }, 450);
        d.cur.classList.add('is-bossdown');
        if (res.last) flash(true);
        wait(res.last ? 3200 : 2600, finish);
        return;
      }
      if (res.fled) {
        d.msg.textContent = 'おしい！ あと すこしだったのに にげられた…';
        wait(2600, finish);
        return;
      }
      if (res.enrage) {
        const last = res.last;
        d.msg.textContent = last ? 'まおう「まだ 本気では なかった…！」' : e.name + ' は おこりだした！';
        if (last) MQ.sfx.henshin(); else MQ.sfx.enrage();
        MQ.bgm.setEnrage(true);          // 曲が 速くなる
        shake(true);
        if (last) flash(true);
        setTimeout(function () {
          const img = d.cur.querySelector('.enemy__img');
          if (img) {
            const size = img.offsetWidth || 96;
            const hot = MQ.enemies.node(q.enemyId, { size: size, cls: 'enemy__img', enrage: true });
            img.parentNode.replaceChild(hot, img);
          }
          d.cur.classList.add('is-enrage');
        }, 400);
        wait(2600, advanceBoss);
        return;
      }
      d.msg.textContent = (res.burst ? 'ばくれつ こうげき！ ' + res.dmg + 'ダメージ！ ' : 'いいぞ！ ') + 'あと ' + res.hpLeft + 'かい だ！';
      wait(1700, advanceBoss);
      return;
    }

    /* ---- ガード ---- */
    if (res.outcome === 'guard') {
      markChoices(q, value);
      guardFx();
      comboShow(0);
      sayAnswer(res);
      if (res.fled) {
        d.msg.textContent = 'ガードされた！ ' + e.name + ' は まもりを かためて 去っていった…';
        wait(3000, finish);
      } else {
        d.msg.textContent = 'ガードされた！ つぎの こうげきだ！';
        wait(3000, advanceBoss);
      }
      return;
    }

    /* ---- にげられた ---- */
    markChoices(q, value);
    flee();
    comboShow(0);
    d.msg.textContent = e.name + ' に にげられた…';
    sayAnswer(res);
    wait(3000, advance);
  }

  /* こたえた あとの ふきだし。
     「せいかい！」などの 見出しと、補足（note）を **べつの 行**に する。
     補足は 40字ちかく あることが あるので、小さい字で 折り返す。
     こうしないと 1行に ならんで 画面から はみ出る。 */
  function feedback(head, note, cls) {
    d.feedback.textContent = '';
    d.feedback.appendChild(h('b', { class: 'feedback__head', text: head }));
    if (note) d.feedback.appendChild(h('span', { class: 'feedback__note', text: note }));
    d.feedback.className = 'feedback' + (cls ? ' ' + cls : '');
  }

  function ok(note) { feedback('せいかい！', note, 'feedback--ok'); }

  // まちがい・時間切れ・にげられた ときの「こたえは ○○。」
  function sayAnswer(res) { feedback('こたえは ' + res.answerText + '。', res.note); }

  function wait(ms, fn) {
    clearTimeout(timer);
    timer = setTimeout(fn, ms);
  }

  function advance() {
    const nx = MQ.battle.next();
    if (nx.phase === 'done') { finish(); return; }
    if (nx.entering) bossIntro();
    else renderQuestion();
  }

  function advanceBoss() {
    if (MQ.battle.isOver()) { finish(); return; }
    MQ.battle.next();
    renderQuestion();
  }

  /* =======================================================
     ボス・ラスボス 登場
     ======================================================= */
  function bossIntro() {
    bossOnScreen = false;
    MQ.bgm.play('boss');
    MQ.sfx.alarm();
    d.msg.textContent = '';
    d.foes.innerHTML = '';
    d.warnText.textContent = 'WARNING';
    d.warnSub.textContent = 'ボスが ちかづいてくる…！';
    d.warning.className = 'warning';
    d.warning.hidden = false;
    void d.warning.offsetWidth;
    d.warning.classList.add('is-run');
    wait(1700, function () {
      d.warning.hidden = true;
      renderQuestion();
    });
  }

  function towerIntro() {
    bossOnScreen = false;
    MQ.sfx.towerIntro();
    d.msg.textContent = '';
    d.foes.innerHTML = '';
    d.card.hidden = true;
    d.choices.hidden = true;
    d.memo.hidden = true;
    d.displays.hidden = true;
    d.keys.hidden = true;
    d.warnText.textContent = 'FINAL BATTLE';
    d.warnSub.textContent = 'まおうが 目を さました…！';
    d.warning.className = 'warning warning--last';
    d.warning.hidden = false;
    void d.warning.offsetWidth;
    d.warning.classList.add('is-run');
    shake(true);
    wait(2600, function () {
      d.warning.hidden = true;
      renderQuestion();
    });
  }

  /* =======================================================
     しるし・アニメーション
     ======================================================= */
  function markChoices(q, picked) {
    if (q.type !== 'choice') return;
    d.choices.querySelectorAll('.choice').forEach(function (b) {
      const i = Number(b.getAttribute('data-i'));
      b.disabled = true;
      if (i === q.answer) b.classList.add('is-correct');
      else if (i === picked) b.classList.add('is-wrong');
    });
  }

  function showHint(hint, q, picked) {
    d.hint.hidden = false;
    d.hint.innerHTML = '<span class="hintbox__label">ヒント</span>' + MQ.util.esc(hint.text);
    if (q.type !== 'choice') return;
    d.choices.querySelectorAll('.choice').forEach(function (b) {
      const i = Number(b.getAttribute('data-i'));
      const out = (i === picked) || (hint.kind === 'eliminate' && hint.remove.indexOf(i) !== -1);
      if (out) { b.classList.add('is-out'); b.disabled = true; }
    });
  }

  function popDamage(text, big) {
    if (!d.cur) return;
    const el = h('span', { class: 'dmg' + (big ? ' dmg--crit' : ''), text: text });
    d.cur.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 950);
  }

  function shake(big) {
    const cls = big ? 'is-shake-big' : 'is-shake';
    d.field.parentNode.classList.remove('is-shake', 'is-shake-big');
    void d.field.offsetWidth;
    d.field.parentNode.classList.add(cls);
    setTimeout(function () { d.field.parentNode.classList.remove(cls); }, 460);
  }

  function flash(gold) {
    const el = d.field.parentNode;
    el.classList.remove('is-flash', 'is-flash-gold');
    void el.offsetWidth;
    el.classList.add(gold ? 'is-flash-gold' : 'is-flash');
    setTimeout(function () { el.classList.remove('is-flash', 'is-flash-gold'); }, 520);
  }

  /* =======================================================
     ひっさつわざ（v2.5：7しゅるい。コンボが つづくほど はでに なる）

       5〜7 コンボ … 教科の わざ（その問題の 教科で 変わる。塔では 問題ごと）
                      算数＝ほのお ギリ／国語＝はっぱ カッター／
                      理科社会＝こおりの やいば／英語＝かぜの たつまき
       8〜11コンボ … いなずま おとし！（青白い かみなり・2本）
      12〜15コンボ … ひかりの メテオ！（金の いん石 5つ）
      16 コンボ〜  … ぎんがの ビッグバン！（すいこんで 虹色の 大ばくはつ）

     絵は ぜんぶ CSS の 四角。画像ファイルは 使いません。
     ・敵の まわりの 絵 …… d.fx（.fx・アリーナの 中）
     ・画面ぜんたいの 演出 … d.fxs（.fxscreen：色の 光・集中線・しょうげきの わ）
     ・画面の ゆれ ………… d.root に is-quake-1〜4（コンボが 高いほど 大きく 長く）
     ・敵の ふっとび ……… is-blast / is-blast-big / is-blast-max
     ======================================================= */
  const TIER1_MIN = 5;
  const SPECIALS = [
    { min: 16, tier: 4, id: 'nova', name: 'ぎんがの ビッグバン！', ms: 1900 },
    { min: 12, tier: 3, id: 'star', name: 'ひかりの メテオ！',     ms: 1350 },
    { min: 8,  tier: 2, id: 'bolt', name: 'いなずま おとし！',     ms: 1100 }
  ];
  // 5〜7 コンボの わざ（教科ごと）
  const ELEMENTS = {
    fire: { min: 5, tier: 1, id: 'fire', name: 'ほのお ギリ！',     ms: 950 },
    leaf: { min: 5, tier: 1, id: 'leaf', name: 'はっぱ カッター！', ms: 950 },
    ice:  { min: 5, tier: 1, id: 'ice',  name: 'こおりの やいば！', ms: 1000 },
    wind: { min: 5, tier: 1, id: 'wind', name: 'かぜの たつまき！', ms: 1000 }
  };
  // 主人公の オーラと コンボの 色
  const FX_COLOR = { fire: '#ff9a3c', leaf: '#7ee06a', ice: '#9fe6ff', wind: '#e6f6ff', bolt: '#9fd8ff', star: '#ffd447', nova: '#ffffff' };
  const NOVA_COLORS = ['#ff5e7a', '#ffd447', '#7cf9c4', '#4fd3ff', '#c48bff', '#ffffff'];

  function elementOf(areaId) {
    const a = String(areaId || '');
    if (a.indexOf('kokugo') === 0) return 'leaf';
    if (a.indexOf('rika') === 0) return 'ice';
    if (a.indexOf('eigo') === 0) return 'wind';
    return 'fire';
  }
  // いまの 問題の 教科の わざ（塔では 問題ごとに 教科が 変わる）
  function currentElement() {
    const q = MQ.battle.current ? MQ.battle.current() : null;
    const area = (q && q.areaId) || (ctx && ctx.area && ctx.area.id) || '';
    return elementOf(area);
  }
  function specialOf(combo) {
    for (let i = 0; i < SPECIALS.length; i++) if (combo >= SPECIALS[i].min) return SPECIALS[i];
    if (combo >= TIER1_MIN) return ELEMENTS[currentElement()];
    return null;
  }
  function specialById(id) {
    if (ELEMENTS[id]) return ELEMENTS[id];
    for (let i = 0; i < SPECIALS.length; i++) if (SPECIALS[i].id === id) return SPECIALS[i];
    return SPECIALS[0];
  }

  // つぶつぶ（火の粉・電気・きらきら）を n個 作る。
  // opts: delay（何秒 あとから）／dur（長さ）／colors（色を 順に）／inward（外から 中へ すいこむ）
  function sparks(n, cls, spread, opts) {
    opts = opts || {};
    const box = h('span', { class: 'fx__sparks ' + cls + (opts.inward ? ' fx__sparks--in' : '') });
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (i % 3) * 0.4;
      const r = spread * (0.55 + ((i * 7) % 5) / 8);
      const st = {
        '--x': Math.round(Math.cos(a) * r) + 'px',
        '--y': Math.round(Math.sin(a) * r - 14) + 'px',
        width: (4 + (i % 3) * 2) + 'px',
        height: (4 + (i % 3) * 2) + 'px',
        animationDelay: ((i % 4) * 0.05 + (opts.delay || 0)) + 's'
      };
      if (opts.colors) {
        const c = opts.colors[i % opts.colors.length];
        st.background = c; st.boxShadow = '0 0 8px ' + c;
      }
      if (opts.dur) st.animationDuration = opts.dur + 's';
      box.appendChild(h('i', { style: st }));
    }
    return box;
  }

  function buildFx(sp) {
    const out = [];

    /* ---- ほのお ギリ：3本の 斬撃＋大きな 炎＋火の わ ---- */
    if (sp.id === 'fire') {
      out.push(h('span', { class: 'fx__sky fx__sky--fire' }));
      out.push(h('span', { class: 'fx__slash' }));
      out.push(h('span', { class: 'fx__slash fx__slash--b' }));
      out.push(h('span', { class: 'fx__slash fx__slash--c' }));
      const flame = h('span', { class: 'fx__flame' });
      [40, 62, 84, 100, 88, 104, 80, 60, 42].forEach(function (hgt, i) {
        flame.appendChild(h('i', { style: { height: hgt + 'px', animationDelay: (i * 0.03) + 's' } }, [h('b')]));
      });
      out.push(flame);
      out.push(h('span', { class: 'fx__ring fx__ring--fire' }));
      out.push(sparks(24, 'fx__sparks--fire', 96));
    }

    /* ---- こおりの やいば：左から 5本の こおりが とんで、当たって パリーン ---- */
    if (sp.id === 'ice') {
      out.push(h('span', { class: 'fx__sky fx__sky--ice' }));
      const sh = h('span', { class: 'fx__shards' });
      [[0, -34], [0, 0], [0, 34], [-44, -17], [-44, 17]].forEach(function (p, i) {
        sh.appendChild(h('i', { style: { marginLeft: p[0] + 'px', marginTop: p[1] + 'px', animationDelay: (i * 0.05) + 's' } }));
      });
      out.push(sh);
      out.push(h('span', { class: 'fx__frost' }));
      out.push(h('span', { class: 'fx__ring fx__ring--ice' }));
      const cubes = h('span', { class: 'fx__cubes' });
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        cubes.appendChild(h('i', { style: {
          '--x': Math.round(Math.cos(a) * 78) + 'px', '--y': Math.round(Math.sin(a) * 56 - 12) + 'px',
          animationDelay: (0.32 + (i % 3) * 0.04) + 's'
        } }));
      }
      out.push(cubes);
      out.push(sparks(18, 'fx__sparks--ice', 96, { delay: 0.32 }));
      const snow = h('span', { class: 'fx__snow' });
      for (let i = 0; i < 12; i++) {
        snow.appendChild(h('i', { style: { left: (i * 33) + 'px', animationDelay: ((i % 5) * 0.08) + 's', width: (4 + (i % 3) * 2) + 'px', height: (4 + (i % 3) * 2) + 'px' } }));
      }
      out.push(snow);
    }

    /* ---- はっぱ カッター：みどりの 斬撃＋ぐるぐる まわる はっぱの あらし ---- */
    if (sp.id === 'leaf') {
      out.push(h('span', { class: 'fx__sky fx__sky--leaf' }));
      out.push(h('span', { class: 'fx__slash fx__slash--leaf' }));
      out.push(h('span', { class: 'fx__slash fx__slash--b fx__slash--leaf' }));
      const storm = h('span', { class: 'fx__storm' });
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * 360, r = 28 + (i % 4) * 16;
        storm.appendChild(h('i', { style: { transform: 'rotate(' + a + 'deg) translate(' + r + 'px) rotate(' + (i * 37) + 'deg)', animationDelay: ((i % 4) * 0.05) + 's' } }));
      }
      out.push(storm);
      out.push(h('span', { class: 'fx__ring fx__ring--leaf' }));
      out.push(sparks(18, 'fx__sparks--leaf', 96, { delay: 0.2 }));
    }

    /* ---- かぜの たつまき：地面から たちのぼる たつまき＋横に はしる 風の すじ ---- */
    if (sp.id === 'wind') {
      out.push(h('span', { class: 'fx__sky fx__sky--wind' }));
      const tor = h('span', { class: 'fx__tornado' });
      [22, 34, 46, 58, 70, 84, 98].forEach(function (w, i) {
        tor.appendChild(h('i', { style: { width: w + 'px', bottom: (i * 17) + 'px', animationDelay: (i * 0.04) + 's' } }));
      });
      out.push(tor);
      const gust = h('span', { class: 'fx__gust' });
      [24, 62, 100, 138].forEach(function (top, i) {
        gust.appendChild(h('i', { style: { top: top + 'px', animationDelay: (i * 0.08) + 's' } }));
      });
      out.push(gust);
      out.push(h('span', { class: 'fx__ring fx__ring--wind' }));
      out.push(sparks(18, 'fx__sparks--wind', 100, { delay: 0.15 }));
    }

    /* ---- いなずま おとし：空が 2回 光る → 太い 雷＋細い 雷 → 地面に ひび ---- */
    if (sp.id === 'bolt') {
      out.push(h('span', { class: 'fx__sky fx__sky--bolt' }));
      const bolt = h('span', { class: 'fx__bolt' });
      /* つながった ジグザグ。[左, 上, よこ, たて] を となりどうし
         かさなるように ならべて、1本の 雷に 見せる。 */
      [[30, 0, 15, 26], [16, 22, 29, 13], [16, 30, 15, 26],
       [16, 54, 32, 13], [33, 62, 15, 26], [20, 86, 28, 13],
       [20, 94, 15, 26]].forEach(function (r, i) {
        bolt.appendChild(h('i', { style: { left: r[0] + 'px', top: r[1] + 'px', width: r[2] + 'px', height: r[3] + 'px', animationDelay: (i * 0.018) + 's' } }));
      });
      out.push(bolt);
      const bolt2 = h('span', { class: 'fx__bolt fx__bolt--b' });
      [[8, 0, 9, 22], [0, 18, 17, 8], [0, 22, 9, 22], [4, 40, 16, 8], [12, 44, 9, 24], [4, 64, 14, 8], [4, 68, 9, 22]].forEach(function (r, i) {
        bolt2.appendChild(h('i', { style: { left: r[0] + 'px', top: r[1] + 'px', width: r[2] + 'px', height: r[3] + 'px', animationDelay: (0.12 + i * 0.018) + 's' } }));
      });
      out.push(bolt2);
      out.push(h('span', { class: 'fx__ring' }));
      out.push(h('span', { class: 'fx__ring fx__ring--b' }));
      const cracks = h('span', { class: 'fx__cracks' });
      [[-46, 0, 28], [-14, 6, 40], [26, 2, 32], [56, 8, 24], [-72, 8, 22]].forEach(function (c, i) {
        cracks.appendChild(h('i', { style: { left: c[0] + 'px', top: c[1] + 'px', width: c[2] + 'px', animationDelay: (0.1 + i * 0.03) + 's' } }));
      });
      out.push(cracks);
      out.push(sparks(28, 'fx__sparks--bolt', 100));
    }

    /* ---- ひかりの メテオ：5つの いん石 → 大ばくはつ＋12本の 光 ---- */
    if (sp.id === 'star') {
      out.push(h('span', { class: 'fx__sky fx__sky--gold' }));
      const met = h('span', { class: 'fx__meteor' });
      [[0, 0], [-52, -38], [46, -62], [-90, -70], [24, -110]].forEach(function (p, i) {
        met.appendChild(h('i', { style: { marginLeft: p[0] + 'px', marginTop: p[1] + 'px', animationDelay: (i * 0.09) + 's' } }));
      });
      out.push(met);
      const rays = h('span', { class: 'fx__rays' });
      for (let i = 0; i < 12; i++) rays.appendChild(h('i', { style: { transform: 'rotate(' + (i * 30) + 'deg)' } }));
      out.push(rays);
      out.push(h('span', { class: 'fx__burst' }));
      out.push(h('span', { class: 'fx__ring fx__ring--gold' }));
      out.push(sparks(30, 'fx__sparks--gold', 120));
    }

    /* ---- ぎんがの ビッグバン：まっくら → 星を すいこむ → まっしろ → 虹の わ＋光＋うずまき ---- */
    if (sp.id === 'nova') {
      out.push(h('span', { class: 'fx__sky fx__sky--dark' }));
      out.push(sparks(16, 'fx__sparks--nova', 120, { inward: true, colors: NOVA_COLORS, dur: 0.5 }));
      out.push(h('span', { class: 'fx__core' }));
      out.push(h('span', { class: 'fx__sky fx__sky--white' }));
      const rings = h('span', { class: 'fx__nrings' });
      NOVA_COLORS.slice(0, 4).forEach(function (c, i) {
        rings.appendChild(h('i', { style: { borderColor: c, boxShadow: '0 0 18px ' + c, animationDelay: (0.5 + i * 0.08) + 's' } }));
      });
      out.push(rings);
      const rays = h('span', { class: 'fx__rays fx__rays--nova' });
      for (let i = 0; i < 16; i++) {
        const c = NOVA_COLORS[i % NOVA_COLORS.length];
        rays.appendChild(h('i', { style: { transform: 'rotate(' + (i * 22.5) + 'deg)', background: 'linear-gradient(rgba(255,255,255,0), ' + c + ')' } }));
      }
      out.push(rays);
      const gal = h('span', { class: 'fx__galaxy' });
      for (let i = 0; i < 24; i++) {
        const arm = i % 2, t = Math.floor(i / 2);
        const c = NOVA_COLORS[i % NOVA_COLORS.length];
        gal.appendChild(h('i', { style: { transform: 'rotate(' + (arm * 180 + t * 28) + 'deg) translate(' + (12 + t * 9) + 'px)', background: c, boxShadow: '0 0 6px ' + c } }));
      }
      out.push(gal);
      out.push(sparks(36, 'fx__sparks--nova', 170, { colors: NOVA_COLORS, delay: 0.5, dur: 0.9 }));
    }

    return out;
  }

  /* 画面ぜんたいの 演出：色の 光（tint）＋集中線（8コンボ〜）＋しょうげきの わ（12コンボ〜）＋ゆれ */
  function playScreenFx(sp) {
    if (!d.fxs) return;
    d.fxs.textContent = '';
    d.fxs.className = 'fxscreen fxscreen--' + sp.id + ' fxscreen--t' + sp.tier;
    if (sp.tier >= 4) d.fxs.appendChild(h('span', { class: 'fxscreen__dark' }));   // すいこむ あいだは まっくら
    d.fxs.appendChild(h('span', { class: 'fxscreen__tint' }));
    if (sp.tier >= 2) {
      const lines = h('span', { class: 'fxscreen__lines' });
      const n = sp.tier >= 4 ? 28 : sp.tier === 3 ? 20 : 14;
      const base = sp.tier >= 4 ? 0.5 : sp.tier === 3 ? 0.42 : 0;   // 当たる しゅんかんに 合わせる
      for (let i = 0; i < n; i++) {
        lines.appendChild(h('i', { style: { transform: 'rotate(' + (i * 360 / n + (i % 2) * 6) + 'deg)', animationDelay: (base + (i % 3) * 0.04) + 's', height: (700 + (i % 3) * 120) + 'px' } }));
      }
      d.fxs.appendChild(lines);
    }
    if (sp.tier >= 3) d.fxs.appendChild(h('span', { class: 'fxscreen__ring' }));
    if (sp.tier >= 4) d.fxs.appendChild(h('span', { class: 'fxscreen__ring fxscreen__ring--b' }));
    // 技名（黒い 帯＋大きな 文字＋星）は いちばん 上に
    d.fxs.appendChild(h('span', { class: 'fxband' }));
    d.fxs.appendChild(h('span', { class: 'fxname' + (sp.tier >= 4 ? ' fxname--max' : sp.tier === 3 ? ' fxname--big' : ''), text: sp.name }));
    const stars = h('span', { class: 'fxstars' });
    [[-150, -6, 0], [148, 2, 0.08], [-112, 26, 0.16], [118, -22, 0.12]].forEach(function (s) {
      stars.appendChild(h('i', { style: { '--x': s[0] + 'px', '--y': s[1] + 'px', animationDelay: s[2] + 's' } }));
    });
    d.fxs.appendChild(stars);
    quake(sp.tier);
  }

  // 画面ぜんたいが ゆれる（1〜4。大きいほど はげしく 長く）
  function quake(level) {
    const el = d.root;
    el.classList.remove('is-quake-1', 'is-quake-2', 'is-quake-3', 'is-quake-4');
    void el.offsetWidth;
    el.classList.add('is-quake-' + level);
    clearTimeout(quakeTimer);
    quakeTimer = setTimeout(function () { el.classList.remove('is-quake-' + level); }, level >= 4 ? 1600 : level === 3 ? 1000 : 700);
  }

  // 敵の ふっとび（is-hit より 強い。12コンボ〜は 大きく、16〜は すいこまれて はじける）
  function blast(sp) {
    if (!d.cur) return;
    d.cur.classList.remove('is-blast', 'is-blast-big', 'is-blast-max');
    void d.cur.offsetWidth;
    d.cur.classList.add(sp.tier >= 4 ? 'is-blast-max' : sp.tier >= 3 ? 'is-blast-big' : 'is-blast');
  }

  function playSpecial(sp) {
    if (!d.fx) return;
    d.fx.textContent = '';
    d.fx.className = 'fx fx--' + sp.id + ' fx--t' + sp.tier;
    buildFx(sp).forEach(function (el) { d.fx.appendChild(el); });
    playScreenFx(sp);
    MQ.sfx.special(sp.tier, sp.id);
    flash(true);
    if (d.msg) d.msg.classList.add('is-quiet');   // 技名と ぶつからないように
    clearTimeout(fxTimer);
    fxTimer = setTimeout(function () {
      d.fx.textContent = '';
      d.fx.className = 'fx';
      if (d.fxs) { d.fxs.textContent = ''; d.fxs.className = 'fxscreen'; }
      if (d.msg) d.msg.classList.remove('is-quiet');
    }, sp.ms);
  }

  function attack(crit, boss, sp) {
    d.hero.classList.remove('is-attack', 'is-special');
    void d.hero.offsetWidth;
    d.hero.classList.add('is-attack');
    if (sp) {
      d.hero.classList.add('is-special');
      d.hero.style.setProperty('--el', FX_COLOR[sp.id] || '#ffd447');   // うしろの オーラの 色
      playSpecial(sp);
      setTimeout(function () { d.hero.classList.remove('is-special'); }, 900);
    } else if (crit) { MQ.sfx.crit(); flash(false); } else { MQ.sfx.hit(); }
    if (!d.cur) return;
    d.cur.classList.remove('is-appear', 'is-enrage');
    d.cur.classList.add('is-hit');
    if (sp) blast(sp);
    stamp(true);
    shake(crit || boss || !!sp);
    setTimeout(function () {
      if (!d.cur) return;
      d.cur.classList.remove('is-hit');
      if (!boss && !d.cur.classList.contains('is-down')) {
        d.cur.classList.add('is-down');
        MQ.sfx.defeat();
      }
    }, sp ? (sp.tier >= 4 ? 750 : sp.tier === 3 ? 600 : 420) : 420);   // 大きな わざは 当たるのが おそい
  }

  function dodge() {
    MQ.sfx.dodge();
    if (!d.cur) return;
    d.cur.classList.remove('is-appear', 'is-enrage');
    void d.cur.offsetWidth;
    d.cur.classList.add('is-dodge');
    setTimeout(function () { if (d.cur) d.cur.classList.remove('is-dodge'); }, 500);
  }

  function guardFx() {
    MQ.sfx.guard();
    stamp(false);
    if (d.cur) {
      d.cur.classList.remove('is-appear', 'is-enrage');
      void d.cur.offsetWidth;
      d.cur.classList.add('is-guard');
      setTimeout(function () { if (d.cur) d.cur.classList.remove('is-guard'); }, 600);
    }
    d.hero.classList.remove('is-hurt');
    void d.hero.offsetWidth;
    d.hero.classList.add('is-hurt');
    shake(false);
  }

  function flee() {
    MQ.sfx.miss();
    stamp(false);
    if (!d.cur) return;
    d.cur.classList.remove('is-appear');
    d.cur.classList.add('is-flee');
  }

  function stamp(good) {
    if (!d.cur) return;
    const el = h('div', { class: 'stamp ' + (good ? 'stamp--maru' : 'stamp--batsu') });
    d.cur.appendChild(el);
    void el.offsetWidth;
    el.classList.add('is-shown');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1400);
  }

  /* =======================================================
     たたかい 終わり → ごほうび → けっか画面
     ======================================================= */
  function finish() {
    clearInterval(tickTimer);
    closeWide();
    const sum = MQ.battle.summary();
    const rewards = applyRewards(sum);
    MQ.ui.result.render(sum, rewards, ctx);
    MQ.ui.show('screen-result');
  }

  function applyRewards(sum) {
    const before = MQ.hero.progress(ctx.player.xp).level;
    const out = {
      levelBefore: before, levelAfter: before, leveledUp: false,
      gear: null, densetsu: [], treasure: null, gold: false,
      frags: [], titles: [], best: null, fullSet: null
    };

    MQ.save.update(function (p) {
      p.xp += sum.xp;
      p.battles = (p.battles || 0) + 1;
      p.defeated = (p.defeated || 0) + sum.defeated.length;
      p.coins = Math.max(0, (p.coins || 0) + (sum.coins || 0) - (sum.coinsSpent || 0));
      // しょうごう用の カウンター
      p.itemUses = (p.itemUses || 0) + ((sum.itemsUsed || []).length);
      if (sum.fastBonus) p.fastCount = (p.fastCount || 0) + 1;
      if ((sum.maxCombo || 0) > (p.bestCombo || 0)) p.bestCombo = sum.maxCombo;
      if (!p.dexNew) p.dexNew = {};
      sum.defeated.forEach(function (id) {
        if (id === 'chest') return;
        if (!p.dex[id]) p.dexNew[id] = true;     // はじめて 出会った → ずかんで NEW
        p.dex[id] = (p.dex[id] || 0) + 1;
      });

      /* ---- ★ と じぶんの さいこう記ろく ---- */
      if (!ctx.tokkun) {
        const prevStars = p.stars[ctx.stage.id] || 0;
        if (sum.stars > prevStars) p.stars[ctx.stage.id] = sum.stars;

        const prevBest = p.best[ctx.stage.id];
        if (prevBest && sum.correct > prevBest.correct) {
          out.best = { was: prevBest.correct, now: sum.correct, total: sum.total };
        }
        const bestTime = prevBest && prevBest.time ? prevBest.time : 0;
        if (!prevBest || sum.correct > prevBest.correct || (sum.correct === prevBest.correct && sum.time < bestTime)) {
          p.best[ctx.stage.id] = { correct: sum.correct, total: sum.total, time: sum.time };
        }
        if (prevBest && bestTime && sum.time < bestTime && !out.best) {
          out.best = { wasTime: bestTime, nowTime: sum.time };
        }
      }

      /* ---- にげた敵 ---- */
      sum.revengeBeaten.forEach(function (key) {
        MQ.content.subjectAreas().forEach(function (a) { MQ.save.removeEscaped(p, a.id, key); });
      });
      sum.escaped.forEach(function (en) {
        const areaId = en.areaId || ctx.area.id;
        // ボスの問題は、つぎは ザコの姿で もどってくる
        if (String(en.enemyId).indexOf('boss-') === 0) en.enemyId = MQ.enemies.pickIds(areaId, 1)[0];
        en.areaId = areaId;
        MQ.save.addEscaped(p, areaId, en);
      });

      /* ---- そうび（グレード1〜3。★2以上で 1つずつ） ---- */
      if (sum.stars >= 2 && !ctx.tokkun) {
        const g = MQ.hero.nextGear(p);
        if (g) { p.gear.push(g.id); p.equipped[g.slot] = g.id; out.gear = g; }
      }

      /* ---- たからもの（ボスを たおしたら） ---- */
      if (sum.bossBeaten && !ctx.tokkun) {
        const tr = MQ.treasure.forStage(ctx.stage.id);
        if (tr) {
          const had = p.treasure[tr.id] || 0;
          const lv = sum.stars >= 3 ? 2 : 1;
          if (lv > had) {
            p.treasure[tr.id] = lv;
            out.treasure = tr;
            out.gold = lv === 2;
            // はじめての たからものは、もちものに あきが あれば 自動で 入れる
            if (!Array.isArray(p.bag)) p.bag = [];
            if (!had && p.bag.length < MQ.save.BAG_MAX && p.bag.indexOf(tr.id) === -1) p.bag.push(tr.id);
          }
        }
      }

      /* ---- まなびの かけら（エリアで ★8） ---- */
      MQ.content.subjectAreas().forEach(function (area) {
        if (MQ.content.hasFrag(p, area.id)) return;
        if (!MQ.content.fragReady(p, area)) return;
        p.frags[area.id] = true;
        out.frags.push(area);
        const g = MQ.hero.nextDensetsu(p);
        if (g) { p.gear.push(g.id); p.equipped[g.slot] = g.id; out.densetsu.push(g); }
        MQ.save.addLog(p, area.name + ' の まなびの かけらを 手に入れた');
      });

      /* ---- ラスボスを たおした → でんせつ 一式の さいごの1点 ---- */
      if (sum.bossBeaten && ctx.stage.tower) {
        const g = MQ.hero.nextDensetsu(p);
        if (g) { p.gear.push(g.id); p.equipped[g.slot] = g.id; out.densetsu.push(g); }
        MQ.save.addLog(p, 'さいごの塔で まおうを たおした！');
      }

      out.fullSet = MQ.hero.equippedSetOf(p);

      /* ---- しょうごう ---- */
      out.titles = MQ.hero.checkTitles(p);

      /* ---- きろく ---- */
      const name = ctx.tokkun ? 'とっくん' : ctx.stage.name;
      MQ.save.addLog(p, name + '：' + sum.correct + '/' + sum.total + '　★' + sum.stars + '　' + MQ.ui.fmtTime(sum.time));
    });

    const p2 = MQ.save.current();
    out.levelAfter = MQ.hero.progress(p2.xp).level;
    out.leveledUp = out.levelAfter > before;
    ctx.player = p2;
    return out;
  }

  /* =======================================================
     ゆびで 書く メモ欄
     ======================================================= */
  function makeMemo(canvas, clearBtn) {
    /* v2.7.1 で 作り直し（息子さん「ひっさんの ところで 字が 書けない」）
         ・iPad などは touch-action だけでは 画面が スクロールしようとして 線が 切れる（pointercancel）
           → touchstart / touchmove を passive:false で preventDefault
         ・キャンバスの 大きさが 画面と ずれていたら、書く 前に 合わせる（線が 指から ずれない）
         ・ResizeObserver で、画面が 出た とき・ひろげた とき・向きを 変えた ときも 合わせる
         ・書いている 指だけを 見る（手のひらや 2本目の 指は むし）
         ・線の 太さは 画面の 拡大に 合わせる（大きい タブレットでも 細く ならない）
         ・getCoalescedEvents で 速く 動かしても なめらかに */
    const c = canvas.getContext('2d');
    let drawing = false;
    let activeId = null;
    let last = null;

    function lineWidth() {
      const st = (MQ.stage && MQ.stage.size) ? MQ.stage.size().scale : 1;
      return Math.max(4, 4.5 * st);
    }
    function setup() {
      c.lineWidth = lineWidth();
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.strokeStyle = '#1F2D3A';
    }
    // いまの 大きさに 合っているか
    function fits() {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      return rect.width > 0 && Math.abs(canvas.width - rect.width * dpr) < 2 && Math.abs(canvas.height - rect.height * dpr) < 2;
    }
    function resize() {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      setup();
      return true;
    }
    // 大きさを 変えても 書いたものを のこす
    function resizeKeep() {
      if (fits()) return;
      let data = null;
      try { data = (canvas.width && canvas.height) ? canvas.toDataURL() : null; } catch (e) {}
      if (!resize()) return;
      if (data) {
        const img = new Image();
        img.onload = function () {
          const r = canvas.getBoundingClientRect();
          c.drawImage(img, 0, 0, r.width, r.height);
        };
        img.src = data;
      }
    }
    function clear() {
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, canvas.width, canvas.height);
      c.restore();
    }
    function point(e) {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    function segment(p) {
      c.beginPath();
      c.moveTo(last.x, last.y);
      c.lineTo(p.x, p.y);
      c.stroke();
      last = p;
    }

    canvas.addEventListener('pointerdown', function (e) {
      if (drawing && activeId !== null && e.pointerId !== activeId) return;   // 2本目の 指は むし
      e.preventDefault();
      if (!fits()) resizeKeep();   // 大きさが ずれていたら 先に 直す
      drawing = true;
      activeId = e.pointerId;
      last = point(e);
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      c.beginPath();
      c.moveTo(last.x, last.y);
      c.lineTo(last.x + 0.1, last.y + 0.1);
      c.stroke();
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drawing || e.pointerId !== activeId) return;
      e.preventDefault();
      let evs = null;
      try { evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null; } catch (err) { evs = null; }
      if (!evs || !evs.length) evs = [e];
      for (let i = 0; i < evs.length; i++) segment(point(evs[i]));
    });
    function stop(e) {
      if (e && activeId !== null && e.pointerId !== undefined && e.pointerId !== activeId) return;
      drawing = false;
      activeId = null;
    }
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
    canvas.addEventListener('lostpointercapture', stop);
    // iPad などで 画面が スクロールしようとして 線が 切れるのを ふせぐ
    ['touchstart', 'touchmove', 'touchend'].forEach(function (t) {
      canvas.addEventListener(t, function (e) { if (e.cancelable) e.preventDefault(); }, { passive: false });
    });
    // PointerEvent が ない 古い 端末は touch で 書く（保険）
    if (!window.PointerEvent) {
      canvas.addEventListener('touchstart', function (e) {
        const t = e.touches[0]; if (!t) return;
        if (!fits()) resizeKeep();
        drawing = true; last = point(t);
        c.beginPath(); c.moveTo(last.x, last.y); c.lineTo(last.x + 0.1, last.y + 0.1); c.stroke();
      }, { passive: false });
      canvas.addEventListener('touchmove', function (e) {
        const t = e.touches[0]; if (!drawing || !t) return;
        segment(point(t));
      }, { passive: false });
      canvas.addEventListener('touchend', function () { drawing = false; }, { passive: false });
    }
    // 大きさが 変わったら（画面が 出た・ひろげた・向きを 変えた）合わせる
    if (window.ResizeObserver) {
      try { new ResizeObserver(function () { resizeKeep(); }).observe(canvas); } catch (e) {}
    }
    window.addEventListener('resize', function () { resizeKeep(); });

    clearBtn.addEventListener('click', function () { MQ.sfx.tap(); clear(); });

    return { reset: function () { resize(); clear(); }, clear: clear, resizeKeep: resizeKeep };
  }

  /* 見た目を たしかめる ための 入口（tools/harness.html から よぶ）。
     ふつうの あそびでは 使いません。 */
  function demoSpecial(id) {
    build();
    const sp = specialById(id);
    comboShow(sp.min);
    playSpecial(sp);
    return sp;
  }

  // どうぐの 演出を 見る（harness 用）。power の どうぐが もちものに なければ 1つめ
  function demoItem(power) {
    const list = MQ.battle.items();
    const it = list.filter(function (x) { return x.power === power; })[0] || list[0];
    if (!it) return null;
    locked = false;
    useItemUI(it.id);
    return it;
  }

  return { start: start, startTokkun: startTokkun, demoSpecial: demoSpecial, demoItem: demoItem, openBag: openBag };
})();
