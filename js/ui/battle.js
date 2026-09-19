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
  const REPEAT_MAX = 3;         // リベンジ＋ふくしゅう を あわせて 1回の たたかいに 3問まで（v11.1）
  const REVIEW_MAX = 2;         // そのうち ふくしゅうは 2問まで（v11.1）
  const FIRST_MOBS = 6;         // はじめての たたかいは ザコ 6体（ふつうは 12体・v11.1）
  const RARE_CHANCE = 0.4;
  const RARE_CHANCE_FEVER = 0.8;   // フィーバー教科（v7.2）では レア（じぶんの モンスターも）が 出やすい
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
  let palNow = null;              // いまの 相棒（v4.3）
  let fxTimer = null;
  let quakeTimer = null;
  let writeState = 'draw';     // かん字を 書く問題： 'draw' → 'check'（はんていが まよった ときだけ）
  let writeModel = false;      // ×の あとは おてほんを 見せながら 書き直す（v2.9）
  let writeMsg = '';           // ×の ときの ふきだし
  let lastJudge = null;        // はんていの 結果（harness 用）
  let leftSec = 0;

  /* =======================================================
     画面を くみ立てる
     ======================================================= */
  function build() {
    if (d) return;
    d = {};
    d.root = h('div', { class: 'battle' }, [
      d.arena = h('section', { class: 'arena' }, [
        // 背景（v12.6）：空 → ボス戦の 暗さ → 雲 → 遠景（scenery.js・エリアごと）→ 草 → 奥ゆきの ゆか。画像ファイルは 使わない
        d.bg = h('div', { class: 'arena__bg' }, [
          h('div', { class: 'arena__sky' }),
          d.dusk = h('div', { class: 'arena__dusk' }),
          h('div', { class: 'cloud cloud--c' }, [h('i'), h('i'), h('i')]),
          d.far = h('div', { class: 'bgfar' }),         // paintScene() が エリアの 遠景に 入れかえる
          h('div', { class: 'arena__grass' }),
          d.floor = h('div', { class: 'afloorwrap' }),  // paintScene() が エリアの ゆかに 入れかえる
          d.spsky = h('div', { class: 'arena__spsky' })  // ひっさつの あいだ 背景だけ 暗く（v13.6・光る 粒が 映える／キャラは 明るい まま）
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
            h('div', { class: 'shadow shadow--hero' }),
            d.guard = h('div', { class: 'guardrow', hidden: true })   // まもりの アイコン（ガードくだき・2026-09-14）
          ]),
          d.pal = h('div', { class: 'pal', hidden: true }, [
            d.palBox = h('div', { class: 'pal__box' }),
            d.palName = h('span', { class: 'pal__name', text: '' }),
            d.palGauge = h('div', { class: 'pal__gauge' })
          ]),
          d.foes = h('div', { class: 'foes' })
        ]),
        // ボスの 名前・HP・弱点は 右上の パネル（v12.8）。足もとに おくと 右下の アイテムボタンに かくれ、頭の 上だと 画面から はみ出た
        d.bossInfo = h('div', { class: 'bossinfo', hidden: true }),
        d.fx = h('div', { class: 'fx' }),
        d.combo = h('div', { class: 'combo', hidden: true }),
        d.charge = h('div', { class: 'charge', hidden: true }),   // ⑦ ためゲージ（v7.5）
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
        d.card = h('div', { class: 'card', raw: true }, [
          d.unit = h('p', { class: 'card__unit' }),
          d.prompt = h('div', { class: 'card__q' }),
          d.listen = h('div', { class: 'card__listen', hidden: true })   // よみあげ（v5.3）
        ]),
        d.choices = h('div', { class: 'choices', raw: true }),
        d.memo = h('div', { class: 'memo' }, [
          d.memoQ = h('div', { class: 'memo__q', raw: true }),
          d.hissan = h('div', { class: 'hissan', hidden: true }),
          d.canvas = h('canvas', { class: 'memo__canvas' }),
          h('div', { class: 'memo__btns' }, [
            d.memoWide = h('button', { class: 'memo__btn', type: 'button', text: 'ひろげる' }),
            d.memoClear = h('button', { class: 'memo__btn', type: 'button', text: 'けす' })
          ]),
          d.memoHint = h('span', { class: 'memo__hint', text: 'ここに ゆびで 書けるよ' })
        ]),
        d.spacer = h('div', { class: 'panelspacer', hidden: true }),
        // はじめての たたかいの 1問めだけ、こたえ方を 教える（v11.1）
        d.guide = h('p', { class: 'qguide', hidden: true }),
        d.displays = h('div', { class: 'displays' }),
        d.keys = h('div', { class: 'keys' }),
        d.hint = h('div', { class: 'hintbox', hidden: true, raw: true }),
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
    endSpecial(true);   // v13.6：前の たたかいの 広げた 画面・光の 粒が のこって いたら 消す
    MQ.ui.syncCustom();
    clearTimeout(timer);
    clearInterval(tickTimer);
    bossOnScreen = false;

    const isTower = !!found.stage.tower;
    const isMix = !!found.stage.mix;
    const atk = player.attacks !== false;   // てきの ため → カウンター（v7.7・おうちの人ページで 切れる）
    ctx = { player: player, world: found.world, area: found.area, stage: found.stage, timeAttack: opts.timeAttack || 0, mix: isMix };
    d.root.classList.toggle('battle--tower', isTower);
    /* しゅうまつ イベント（v13.16）：ふつうの たたかいと ごちゃまぜ だけ（塔・タイムアタックは なし）。
       ゴールデン まつりは ゴールデンスライムを かならず 1体 出す（ここ）。コイン・たからばこは core が */
    const wk = (MQ.weekend && !isTower && !ctx.timeAttack) ? MQ.weekend.battleOpts(player) : null;
    ctx.weekend = wk;

    let mixBiome = null;
    if (isMix) {
      /* ごちゃまぜ バトル（v7.3）：ザコは 問題が じぶんの 教科の モンスターを つれて くる（world3.js）。
         ボスは フィーバー教科の ボス（フィーバーが なければ くじ）。★なし・コイン +1・にげた敵は 教科ごとに */
      const groups = MQ.content.mixGroups(player);
      let fv = null;
      if (MQ.fever) MQ.save.update(function (p) { fv = MQ.fever.today(p); });
      const hit = fv ? groups.filter(function (g) { return g.area.id === fv.areaId; })[0] : null;
      const bossArea = hit ? hit.area : (groups.length ? MQ.util.pick(groups).area : found.area);
      ctx.bossArea = bossArea.id;
      mixBiome = bossArea.biome || 'mountain';
      const boss = MQ.enemies.bossFor(bossArea.id, Math.random());   // v14.7：ごちゃまぜは 序盤・中盤・終盤の どれか
      MQ.battle.start({
        stage: found.stage, mode: 'normal', mix: true, bossArea: bossArea.id,
        escaped: [], enemies: [], bossId: boss.id,
        rareId: ((wk && wk.golden) || Math.random() < RARE_CHANCE) ? MQ.enemies.goldenId() : null, trioIds: null, chest: true, mobs: MOBS, weekend: wk,
        timeAttack: ctx.timeAttack, items: bagOf(player), coins: player.coins || 0, pal: palOf(player),
        gear: MQ.hero.gearPower(player), attacks: atk,
        elite: true, summon: true, areaId: bossArea.id,     // 中ボス・なかまを よぶ（v8.1）
        bossHp: BSET().normal.bossHp, bossMax: BSET().normal.bossMax, enrageAt: BSET().normal.enrageAt, finalAt: BSET().normal.finalAt   // v12.7
      });
    } else if (isTower) {
      /* ラスボスの 弱点（v8.1）：塔で 出る 教科の どれか 1つ。きょうの フィーバー教科が あれば それ
         （にがて教科を 自然に 応援する。画面では「ボスの 弱点」としか 言わない） */
      const subs = MQ.content.towerSubjects ? MQ.content.towerSubjects(found.stage) : [];
      let fv2 = null;
      if (MQ.fever && subs.length) MQ.save.update(function (p) { fv2 = MQ.fever.today(p); });
      const weakArea = subs.length ? (fv2 && subs.indexOf(fv2.areaId) >= 0 ? fv2.areaId : MQ.util.pick(subs)) : null;
      ctx.weakArea = weakArea;
      const TS = BSET()[((found.world && found.world.grade) || 3) <= 2 ? 'towerSmall' : 'tower'];
      MQ.battle.start({
        stage: found.stage, mode: 'tower',
        bossId: found.stage.bossId || 'boss-maou',
        // ラスボスの つよさ（v12.7）：小1・小2 は すこし みじかく
        bossHp: TS.bossHp, bossMax: TS.bossMax, enrageAt: TS.enrageAt, finalAt: TS.finalAt,
        timeAttack: ctx.timeAttack, items: bagOf(player), coins: player.coins || 0, pal: palOf(player),
        gear: MQ.hero.gearPower(player), attacks: atk,
        weakArea: weakArea, areaId: subs[0] || null
      });
    } else {
      // リベンジ（v3.1）：にげてから 時間が たった 敵だけ（古い ものから）。にげた その日は とっくんで
      const ready = MQ.save.revengeReady(player, ctx.area.id).slice().sort(function (a, b) { return Date.parse(a.at || 0) - Date.parse(b.at || 0); });
      const escaped = ready.slice(0, REVENGE_MAX);
      // 開いている ステージの 中で 何番目か → むずかしさ（0=最初 1=最後）
      const opened = ctx.area.stages.filter(function (st) { return MQ.content.isAvailable(st); });
      const hard = opened.length > 1 ? Math.max(0, opened.indexOf(found.stage)) / (opened.length - 1) : 0.5;
      /* はじめての たたかい（v11.1）：ザコ 6体・中ボスなし・てきの こうげきなし。
         16〜18問 → 10〜12問。2回目からは ふつう（はじめて でも たからばこと ボスは 出る） */
      const first = (player.battles || 0) === 0 && !ctx.timeAttack;
      const mobCount = first ? FIRST_MOBS : MOBS;
      /* ふくしゅう（v11.1）：まえに 1回めで まちがえた 問題が そのまま もどって くる。
         リベンジ（にげた敵）と あわせて 3問まで。はじめての たたかいでは 出ない */
      const reviewList = (!first && MQ.review) ? MQ.review.pick(player, ctx.area.id, Math.min(REVIEW_MAX, Math.max(0, REPEAT_MAX - escaped.length))) : [];
      const enemies = MQ.enemies.pickIds(ctx.area.id, mobCount, hard);
      // きょうの フィーバー教科 と サポート（v7.2）。タイムアタックでは なし
      const fs = (MQ.fever && !ctx.timeAttack) ? MQ.fever.battleOpts(player, ctx.area.id) : { fever: null, support: null };
      ctx.fever = fs.fever; ctx.support = fs.support;
      let rareId = null;
      if (Math.random() < (fs.fever ? RARE_CHANCE_FEVER : RARE_CHANCE)) {
        rareId = Math.random() < 0.5 ? MQ.enemies.goldenId() : MQ.enemies.rareIdFor(ctx.area.id);
      }
      let trioIds = null;
      const trio = MQ.enemies.trioFor(ctx.area.id);
      if (trio && Math.random() < TRIO_CHANCE) { trioIds = trio; rareId = null; }
      if (wk && wk.golden) { rareId = MQ.enemies.goldenId(); trioIds = null; }   // ゴールデン まつり（v13.16）
      const boss = MQ.enemies.bossFor(ctx.area.id, hard);   // v14.7：ステージの 位置で 序盤・中盤・終盤の ボス
      ctx.first = first;
      /* ボスを 強く（v12.7）：HP5・最大8問（はじめての たたかいは HP3 の まま）。
         まとめ問題＝ボスの 2・4…問めは、この エリアで 前に ★を とった ステージから */
      const BS = BSET()[first ? 'first' : 'normal'];
      const here = ctx.area.stages.indexOf(found.stage);
      const recap = first ? [] : ctx.area.stages.filter(function (st, i) {
        return i < here && MQ.content.isAvailable(st) && ((player.stars || {})[st.id] || 0) >= 1;
      });
      MQ.battle.start({
        stage: found.stage, mode: 'normal',
        bossHp: BS.bossHp, bossMax: BS.bossMax, enrageAt: BS.enrageAt, finalAt: BS.finalAt, recap: recap,
        escaped: escaped, review: reviewList, enemies: enemies, bossId: boss.id,
        rareId: rareId, trioIds: trioIds, chest: true, mobs: mobCount,
        timeAttack: ctx.timeAttack, items: bagOf(player), coins: player.coins || 0, pal: palOf(player),
        gear: MQ.hero.gearPower(player),
        fever: fs.fever, support: fs.support, attacks: first ? false : atk,
        weekend: wk,                                          // しゅうまつ イベント（v13.16）
        elite: !first, summon: !first, areaId: ctx.area.id   // 中ボス・なかまを よぶ（v8.1）
      });
    }

    setHero(player);
    syncPal(player);
    paintScene(isTower ? 'tower' : (mixBiome || ctx.area.biome || 'mountain'));
    MQ.bgm.play(isTower ? 'maou' : 'battle');
    MQ.ui.show('screen-battle');
    if (isTower) towerIntro(); else { renderQuestion(); modeBanner(); }
  }

  /* はじめての たたかい（v11.1）：1問めだけ、こたえ方を 短く 教える。
       2問めからは 消える（じゃまに ならない ように）。
       文は ひらがな＋小1の かん字だけ（小1の 子も 見る） */
  const GUIDE = {
    number: 'したの すうじを おして 「こたえる」だよ',
    divrem: 'わりざんの こたえと あまりを 入れてね',
    frac:   'ぶんしと ぶんぼを 入れてね',
    choice: 'こたえだと おもう ものを えらんでね',
    roma:   'ローマじで うってね',
    write:  'ゆびで かいてから 「かけた！」を おしてね'
  };
  function renderGuide(q) {
    if (!d.guide) return;
    const on = !!(ctx && ctx.first) && MQ.battle.mobIndex() === 0 && MQ.battle.phase() !== 'boss' && !q.chest;
    d.guide.hidden = !on;
    d.guide.textContent = on ? (GUIDE[q.type] || GUIDE.number) : '';
  }

  /* きょうの フィーバー教科 と サポート（v7.2）：
       上の バーの「てき 1 / 12」の ピルに「×2」の しるし（renderCount・たたかいの あいだ ずっと）と、
       さいしょの 1問めに 出る 帯（けいけんち 2ばい／やさしく スタート）。
       帯が 出ている あいだは ふきだしを 消す（かさならない ように）。
       ※ べつの ピルに すると 3段目に 落ちて HPバーと ふきだしが かさなる ので ピルの 中に 入れる */
  function modeBanner() {
    const fv = MQ.battle.fever ? MQ.battle.fever() : null;
    const sp = MQ.battle.support ? MQ.battle.support() : null;
    const mx = !!(ctx && ctx.mix);
    const wk = ctx && ctx.weekend ? ctx.weekend : null;   // しゅうまつ イベント（v13.16）
    if (!fv && !sp && !mx && !wk) return;
    const lines = [];
    if (wk) {
      const ev = MQ.weekend ? MQ.weekend.EVENTS.filter(function (e) { return e.id === wk.id; })[0] : null;
      lines.push(h('b', { class: 'modebanner__wk', text: 'しゅうまつ ' + wk.name + '！' }));
      if (ev) lines.push(h('span', { text: ev.line }));
    }
    if (mx) {
      const ba = ctx.bossArea ? MQ.content.areaOf(ctx.bossArea) : null;
      lines.push(h('b', { text: 'ごちゃまぜ バトル！' }));
      lines.push(h('span', { text: 'ぜんぶの 教科が まざる' + (ba ? '・ボスは ' + ba.name : '') + '・コイン +1' }));
    }
    if (fv) lines.push(h('b', { text: 'フィーバー教科！ けいけんち ' + (fv.xpMul || 2) + 'ばい' }));
    if (fv && palNow) lines.push(h('span', { text: palNow.name + 'も はりきって いる！ なかまゲージ 2ばい' }));
    if (sp) lines.push(h('span', { text: MQ.fever ? MQ.fever.supportText(sp.level) : 'やさしく スタート！' }));
    const b = h('div', { class: 'modebanner' + (fv ? ' modebanner--fever' : wk ? ' modebanner--wk' : '') }, lines);
    d.fx.appendChild(b);
    if (d.msg) d.msg.classList.add('is-quiet');
    setTimeout(function () {
      b.remove();
      if (d.msg) d.msg.classList.remove('is-quiet');
    }, 2600);
  }

  // にげた敵だけと たたかう（とっくん）
  function startTokkun() {
    const player = MQ.save.current();
    if (!player) return;
    const all = MQ.util.shuffle(MQ.save.allEscaped(player)).slice(0, 5);
    if (!all.length) { MQ.ui.toast('にげた敵は いないよ'); return; }
    build();
    endSpecial(true);   // v13.6：前の たたかいの 広げた 画面・光の 粒が のこって いたら 消す
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
      coins: player.coins || 0,
      pal: palOf(player),
      gear: MQ.hero.gearPower(player)
    });
    setHero(player);
    syncPal(player);
    paintScene('mountain');
    MQ.bgm.play('battle');
    MQ.ui.show('screen-battle');
    renderQuestion();
  }

  /* 単元の れんしゅう（v7.1・おうちの人ページ「この 単元を れんしゅう」）。
     その ステージの 問題を 6問、にげた敵と 同じ しくみ（とっくん）で。
     ★・さいこう記ろく・コインは つかず、リベンジ あつかいにも しない */
  const DRILL_N = 6;
  function startDrill(stageId) {
    const player = MQ.save.current();
    const found = MQ.content.findStage(stageId);
    if (!player || !found || found.stage.tower) return false;
    const qs = found.stage.make(DRILL_N, { boss: false });
    if (!qs || !qs.length) { MQ.ui.toast('この 単元の 問題は まだ ないよ'); return false; }
    build();
    endSpecial(true);   // v13.6：前の たたかいの 広げた 画面・光の 粒が のこって いたら 消す
    MQ.ui.syncCustom();
    clearTimeout(timer);
    clearInterval(tickTimer);
    bossOnScreen = false;
    ctx = { player: player, world: found.world, area: found.area, stage: found.stage, tokkun: true, drill: true, timeAttack: 0 };
    const ids = MQ.enemies.pickIds(found.area.id, qs.length, 0.5);
    MQ.battle.start({
      stage: found.stage, mode: 'tokkun',
      escaped: qs.map(function (q, i) {
        return { key: q.id, q: q, enemyId: ids[i % ids.length], areaId: found.area.id, stageId: found.stage.id, revenge: false };
      }),
      items: bagOf(player),
      coins: player.coins || 0,
      pal: palOf(player),
      gear: MQ.hero.gearPower(player)
    });
    setHero(player);
    syncPal(player);
    paintScene(found.area.biome || 'mountain');
    MQ.bgm.play('battle');
    MQ.ui.show('screen-battle');
    renderQuestion();
    return true;
  }

  /* 背景（v12.6）：エリアの 遠景と ゆかを 入れかえる。空が 時計で 変わる エリア（山・湖・町）には tod-* を つける。
     className を 書き直す ので ボス戦の is-dusk も ここで 消える（つぎの たたかいの はじめ） */
  function paintScene(biome, time) {
    if (!d.bg) return;
    biome = biome || 'mountain';
    const sc = MQ.ui.scenery;
    const tod = sc && !sc.FIXED[biome] ? sc.skyOf(biome, time) : null;
    d.bg.className = 'arena__bg arena__bg--' + biome + (tod ? ' tod-' + tod : '');
    if (sc) {
      const far = sc.arena(biome, time), fl = sc.floor(biome);
      d.bg.replaceChild(far, d.far); d.far = far;
      d.bg.replaceChild(fl, d.floor); d.floor = fl;
    }
  }

  /* =======================================================
     問題を 出す
     ======================================================= */
  /* 敵がわの 攻防（v8.1）の 名前。小1・小2でも 読める ように ひらがな中心 */
  const SKILL_NAME = { kamae: 'たての かまえ', clone: 'ぶんしん', call: 'なかまを よんだ' };
  // ボスの つよさの 表（v12.7・core/battle.js の BOSS_SET）
  function BSET() { return MQ.battle.BOSS_SET; }
  function weakText(areaId) {
    const a = MQ.content.areaOf ? MQ.content.areaOf(areaId) : null;
    const g = (MQ.content.activeWorld && MQ.content.activeWorld().grade) || 3;
    return (g <= 2 ? 'よわい：' : '弱点：') + (a ? (a.short || a.name) : '');
  }

  /* りったい（v12.0）：せっていが つけて あれば 主人公・てき・たからばこ・相棒を 3D に。絵も ルールも 同じ */
  function V3() { return !!(MQ.ui.v3 && MQ.ui.v3.on()); }
  function foeArt(id, size, o) {
    o = o || {};
    if (V3()) {
      const n = id === 'chest'
        ? MQ.ui.v3.chest(size, { cls: 'enemy__img3d', mo: 'mo-chest' })
        : MQ.ui.v3.monster(id, size, { cls: 'enemy__img3d', enrage: !!o.enrage, mo: 'mo-menace' });
      if (n) return n;
    }
    return MQ.enemies.node(id, { size: size, cls: 'enemy__img', enrage: !!o.enrage });
  }

  function renderFoes(q) {
    d.foes.innerHTML = '';
    const last = MQ.battle.mode() === 'tower';
    const sk = MQ.battle.bossSkill ? MQ.battle.bossSkill() : null;
    const bossId = MQ.battle.bossId();
    let ids = q.groupIds || [q.enemyId];
    let pos = q.groupPos || 0;
    let bossAt = null;       // どの 位置が ボスか（呼ばれた ザコ・ぶんしん の とき 2体 ならぶ・v8.1）
    if (q.called) { ids = [q.enemyId, bossId]; pos = 0; bossAt = { 1: true }; }
    else if (q.boss && sk && sk.kind === 'clone') { ids = [bossId, bossId]; pos = sk.pos; bossAt = { 0: true, 1: true }; }
    else if (q.boss) bossAt = { 0: true };
    const enraged = !!bossAt && MQ.battle.isEnraged();
    // 塔の ラスボスの 弱点（v8.1）：いつも バッジを 出す。その 教科の 問題の ときは 光る
    const bossWeak = last && bossAt ? MQ.battle.weakArea() : null;

    ids.forEach(function (id, i) {
      const e = MQ.enemies.get(id) || { name: '' };
      const boss = !!(bossAt && bossAt[i]);
      const twin = boss && ids.length > 1;         // ボスが 2体 ならぶ（ぶんしん・呼ばれた ザコの となり）
      let cls = 'enemy';
      let size = 72;
      // 2体 ならぶ ときは 小さめ（ラスボスは 名前が 頭の 上に ある ので とくに 小さく）
      if (boss) { cls += last ? ' enemy--last enemy--boss' : ' enemy--boss'; size = twin ? (last ? 72 : 80) : (last ? 112 : 96); if (twin) cls += ' enemy--twin'; }
      else if (q.elite) { cls += ' enemy--elite'; size = 96; }                // 中ボス（v8.1）は 大きく
      else if (ids.length > 1 && !q.called) { cls += ' enemy--small'; size = 54; }
      else if ((e.rank || 2) === 3) { cls += ' enemy--r3'; size = 86; }   // 強そうなのは 大きく
      else if ((e.rank || 2) === 1) { cls += ' enemy--r1'; size = 60; }   // よわそうなのは 小さく
      if (e.by === 'photo' && !boss && ids.length === 1) size = 96;          // じぶんの 絵の モンスターは 大きく（64マスの ドットが つぶれない・v3.2）
      if (e.base && e.base !== 48) size = Math.round(size * e.base / 48);    // 64マスの ボス（v14.6）：1ドットの 大きさを ほかの ボスと そろえる（96 → 128）
      if (boss && e.tier === 1) size = Math.round(size * 0.94);                // 序盤の ボス（v14.7）は すこし 小さく（128 → 120）
      if (q.rare && i === pos) cls += ' enemy--rare';
      if (q.revenge && i === pos) cls += ' enemy--revenge';   // リベンジ：赤い オーラ＋リボン（v3.1）
      if (q.review && !q.revenge && i === pos) cls += ' enemy--review';   // ふくしゅう：水色の オーラ＋リボン（v11.1）
      if (q.summon && i === 1 && pos === 1) cls += ' is-summoned';   // よばれて とんできた（v8.1）
      if (i < pos) cls += ' enemy--done';
      else if (i > pos) cls += ' enemy--waiting';
      // さいごの 力（第3形態）・本気モード（v12.7）
      if (boss && MQ.battle.isFinal && MQ.battle.isFinal()) cls += ' is-final';
      if (boss && MQ.battle.bossHard && MQ.battle.bossHard()) cls += ' enemy--hard';
      if (boss && sk && !q.called) {
        if (sk.kind === 'clone' && i !== pos) cls += ' enemy--clone';
        if (sk.kind === 'kamae') cls += ' enemy--kamae';
        if (sk.open) cls += ' enemy--open';
      }
      const skillLabel = boss && sk && sk.kind && (i === pos || q.called) ? SKILL_NAME[sk.kind] : (boss && sk && sk.open && i === pos ? 'すきだらけ！' : null);
      const wk = (q.weak && i === pos) ? q.weak : (boss && bossWeak && (i === pos || q.called) ? bossWeak : null);

      const box = h('div', { class: cls }, [
        foeArt(id, size, { enrage: boss && enraged }),
        h('div', { class: 'shadow shadow--foe' }),
        boss && sk && sk.kind === 'kamae' && !q.called ? h('span', { class: 'enemy__kamae' }) : null,
        // ラスボスは 名前が 長い（かいぞくキャプテン）ので「ラスボス」は 左上の ピルに まかせて 名前だけ（v6.4）
        // 1体だけの ボスは 名前・弱点・HP を 右上の パネル（d.bossInfo）に 出す（v12.8）
        boss && !twin ? null : h('span', { class: 'enemy__name', text: sk && sk.kind === 'clone' && boss && i !== pos ? 'ぶんしん' : (boss && !last ? 'ボス ' : '') + e.name }),
        q.revenge && i === pos && !boss ? h('span', { class: 'enemy__ribbon', text: 'リベンジ' }) : null,
        q.review && !q.revenge && i === pos && !boss ? h('span', { class: 'enemy__ribbon enemy__ribbon--review', text: 'もういちど' }) : null,
        q.elite && i === pos ? h('span', { class: 'enemy__ribbon enemy__ribbon--elite', text: '中ボス' }) : null,
        boss && i === pos && MQ.battle.bossHard && MQ.battle.bossHard() ? h('span', { class: 'enemy__ribbon enemy__ribbon--hard', text: '本気' }) : null,
        skillLabel ? h('span', { class: 'enemy__skill' + (sk.open && !sk.kind ? ' enemy__skill--open' : ''), text: skillLabel }) : null,
        wk && !(boss && !twin) ? h('span', { class: 'enemy__weak' + (q.weak === wk ? ' is-now' : ''), text: weakText(wk) }) : null,
        boss && i === pos && twin ? h('div', { class: 'bosshp' }) : null,
        q.elite && i === pos ? h('div', { class: 'bosshp elitehp' }) : null
      ]);
      d.foes.appendChild(box);
      if (boss && !twin && i === pos) {
        // 2行だけ：名前／弱点＋ため。HP の 玉は 出さない（左上の バーが ボスの HP・ふきだしが「あと Nかい」）。
        // 3行に すると ラスボス（112px）の 頭に かぶる
        d.bossInfo.innerHTML = '';
        d.bossInfo.appendChild(h('span', { class: 'enemy__name', text: e.name }));
        d.bossInfo.appendChild(h('div', { class: 'bossinfo__row' }, [
          wk ? h('span', { class: 'enemy__weak' + (q.weak === wk ? ' is-now' : ''), text: weakText(wk) }) : null
        ]));
        d.bossInfo.hidden = false;
      }
    });
    if (!(bossAt && ids.length === 1)) d.bossInfo.hidden = true;

    d.cur = d.foes.children[Math.min(pos, d.foes.children.length - 1)];
    if (q.boss) renderBossHp();
    if (q.elite) renderEliteHp();
    renderCharge();
  }

  // 中ボス（v8.1）の HP（ボスと 同じ 赤い 玉）
  function renderEliteHp() {
    const el = d.foes.querySelector('.elitehp');
    if (!el) return;
    el.innerHTML = '';
    const q = MQ.battle.current();
    const max = (q && q.eliteHp) || MQ.battle.ELITE_HP || 2;
    const hp = MQ.battle.eliteLeft ? MQ.battle.eliteLeft() : max;
    for (let i = 0; i < max; i++) el.appendChild(h('span', { class: 'bosshp__seg' + (i >= hp ? ' is-lost' : '') }));
  }

  /* 弱点・ボスの わざ の 帯（v8.1）。カウンターの 帯と 同じ 作り（arena に おく・自分で 消える） */
  function skillBanner(text, kind) {
    const b = h('div', { class: 'counterbanner counterbanner--' + kind, text: text });
    d.arena.appendChild(b);
    if (d.msg) d.msg.classList.add('is-quiet');
    setTimeout(function () { b.remove(); if (d.msg) d.msg.classList.remove('is-quiet'); }, 1100);
  }
  function weakFx() { MQ.sfx.weak(); flash(true); skillBanner('こうかは ばつぐん！', 'weak'); }

  /* てきの ため（v7.7）：いまの 敵の 頭の 上に 玉（ザコ 3つ・ボス 2つ）。
     たまりきった 問題は「こうげき！」の ラベルが ついて 敵が 赤く 光る */
  function renderCharge() {
    if (!d.cur || !MQ.battle.chargeInfo) return;
    const old = d.arena.querySelector('.foecharge');
    if (old) old.remove();
    d.cur.classList.remove('is-charging', 'is-attacking');
    const ci = MQ.battle.chargeInfo();
    if (!ci) return;
    const box = h('div', { class: 'foecharge' });
    for (let i = 0; i < ci.need; i++) box.appendChild(h('span', { class: 'foecharge__dot' + (i < ci.level ? ' is-on' : '') }));
    if (ci.attacking) box.appendChild(h('span', { class: 'foecharge__label', text: ci.boss ? 'ガードくだき！' : 'こうげき！' }));   // ボスの 大わざは ガードくだき（2026-09-14）
    // 1体だけの ボスは 右上の パネルの 2行め（v12.8）。頭の 上だと パネルと ぶつかる
    const host = (!d.bossInfo.hidden && d.bossInfo.querySelector('.bossinfo__row')) || d.cur;
    host.appendChild(box);
    if (ci.attacking) { d.cur.classList.add('is-attacking'); MQ.sfx.charge(); }
    else if (ci.level > 0) d.cur.classList.add('is-charging');
  }

  /* カウンター（v7.7）：金の 帯「カウンター！」＋主人公の 大きな ふみこみ。
     帯は d.fx（つぎの 問題で 消える）に おく。ふきだしは 帯の あいだ 消す */
  function counterFx() {
    const b = h('div', { class: 'counterbanner', text: 'カウンター！' });
    d.arena.appendChild(b);          // d.fx は ひっさつの 演出が 空に する ことが ある ので arena に おく（1.1秒で 自分で 消える）
    if (d.msg) d.msg.classList.add('is-quiet');   // 帯と ふきだしが かさならない ように
    MQ.sfx.counter();
    d.hero.classList.remove('is-counter');
    void d.hero.offsetWidth;
    d.hero.classList.add('is-counter');
    flash(true);
    setTimeout(function () { d.hero.classList.remove('is-counter'); }, 600);
    setTimeout(function () { b.remove(); if (d.msg) d.msg.classList.remove('is-quiet'); }, 1100);
  }

  /* くらった（v7.7）：敵が つっこんで きて 主人公が よろける。うしなう ものは ない */
  function struckFx() {
    MQ.sfx.enemyHit();
    if (d.cur) {
      d.cur.classList.remove('is-appear', 'is-enrage', 'is-lunge');
      void d.cur.offsetWidth;
      d.cur.classList.add('is-lunge');
      if (V3()) MQ.ui.v3.play(d.cur, 'mo-attack', 600);
      setTimeout(function () { if (d.cur) d.cur.classList.remove('is-lunge'); }, 600);
    }
    setTimeout(function () {
      d.hero.classList.remove('is-struck');
      void d.hero.offsetWidth;
      d.hero.classList.add('is-struck');
      if (V3()) MQ.ui.v3.play(d.hero, 'mo-hurt', 550);
      shake(false);
      setTimeout(function () { d.hero.classList.remove('is-struck'); }, 650);
    }, 220);
  }

  function renderBossHp() {
    const el = (!d.bossInfo.hidden && d.bossInfo.querySelector('.bosshp')) || d.foes.querySelector('.bosshp');
    if (!el) return;
    el.innerHTML = '';
    const max = MQ.battle.bossHpMax();
    const hp = MQ.battle.bossHp();
    el.classList.toggle('bosshp--many', max >= 7);   // ラスボス HP9（v12.7）
    for (let i = 0; i < max; i++) {
      el.appendChild(h('span', { class: 'bosshp__seg' + (i >= hp ? ' is-lost' : '') }));
    }
  }

  // 上の バー（ザコの ときは のこりの数、ボスの ときは ボスの HP）
  function setProgress(r) {
    if (!d.progFill) return;
    d.progFill.style.width = Math.max(0, Math.min(1, r)) * 100 + '%';
  }

  /* ⑦ つぎの ひっさつまで あと 何問か（v7.5）。
     いまの コンボ（＋かぶとの ぶん）から、つぎの わざの さかいめを さがす */
  function nextSpecialAt(combo) {
    const c = combo + specialBoost();
    const mins = SPECIALS.map(function (x) { return x.min; }).concat([TIER1_MIN]);
    let best = null;
    mins.forEach(function (m) { if (m > c && (best === null || m < best)) best = m; });
    return best;   // null＝もう いちばん 上
  }

  function comboShow(n) {
    syncPalGauge();                    // なかまゲージ（v5.2）
    if (MQ.ui.setwaza) MQ.ui.setwaza.sync(d.arena);   // セットゲージ（v14.2）
    // コンボで 曲が もりあがる（3〜 ドラム／5〜 もう1本の メロディ＋テンポ）
    MQ.bgm.setIntensity(n >= 5 ? 2 : (n >= 3 ? 1 : 0));
    d.combo.hidden = n < 2;
    if (n < 2) { if (d.charge) d.charge.hidden = true; return; }
    const sp = specialOf(n);
    d.combo.textContent = n + ' コンボ！' + (sp ? '　ひっさつ！' : '');
    // クリティカルの 色。オーロラの けん（げきレア）を つけて いると 2コンボから（v9.0）
    const critFrom = (MQ.battle.critFrom && MQ.battle.critFrom()) || 3;
    d.combo.className = 'combo' + (n >= critFrom ? ' combo--crit' : '') + (sp ? ' combo--' + sp.id + ' is-sp' : '');
    chargeShow(n, sp);
    d.combo.classList.remove('is-pop');
    void d.combo.offsetWidth;
    d.combo.classList.add('is-pop');
  }

  /* ⑦ ためゲージ：コンボの 下に「あと N で ひっさつ」と 玉 */
  function chargeShow(n, sp) {
    if (!d.charge) return;
    const next = nextSpecialAt(n);
    if (sp || next === null) {                       // いま わざが 出た／もう 最上位
      d.charge.hidden = true;
      return;
    }
    const c = n + specialBoost();
    const prevMins = SPECIALS.map(function (x) { return x.min; }).concat([TIER1_MIN])
      .filter(function (m) { return m <= c; });
    const from = prevMins.length ? Math.max.apply(null, prevMins) : 0;
    const need = next - from;                        // この だんかいの 玉の 数
    const got = c - from;
    d.charge.hidden = false;
    d.charge.textContent = '';
    const dots = h('span', { class: 'charge__dots' });
    const show = Math.min(need, 8);                  // 玉が 多すぎる ときは 8つまで
    for (let i = 0; i < show; i++) {
      dots.appendChild(h('i', { class: 'charge__dot' + (i < got ? ' is-on' : '') }));
    }
    d.charge.appendChild(dots);
    d.charge.appendChild(h('span', { class: 'charge__tx', text: 'あと ' + (next - c) + ' で ひっさつ' }));
    d.charge.classList.remove('is-pop');
    void d.charge.offsetWidth;
    d.charge.classList.add('is-pop');
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
    else if (res.called) { flee(); wait(2600, advance); }   // 呼ばれた ザコ（v8.1）：advance が ボスの 問題に もどす
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
    writeModel = false; writeMsg = '';
    div = { q: '', r: '', active: 'q' };
    closeWide();
    d.feedback.textContent = '';
    d.feedback.className = 'feedback';
    d.msg.classList.remove('is-quiet');
    d.fx.textContent = '';
    d.fx.className = 'fx';
    endSpecial(true);
    d.hint.hidden = true;
    d.hint.innerHTML = '';
    renderGuide(q);
    if (d.charge && MQ.battle.combo() < 2) d.charge.hidden = true;
    d.panel.classList.remove('has-hint');
    d.unit.textContent = q.recap ? 'まとめ：' + q.recap : (q.unit || '');   // まとめ問題（v12.7）
    d.unit.classList.toggle('card__unit--recap', !!q.recap);
    renderCount();
    comboShow(MQ.battle.combo());
    startCountdown();
    closeBag();
    renderBag();
    syncBuffs();

    renderFoes(q);

    const e = MQ.enemies.get(q.enemyId) || { name: '' };
    const sk = MQ.battle.bossSkill ? MQ.battle.bossSkill() : null;
    if (!bossPhase || !bossOnScreen || q.called || (sk && sk.kind === 'clone' && sk.pos === 0)) {
      void d.cur.offsetWidth;
      d.cur.classList.add('is-appear');
      if (V3()) MQ.ui.v3.enter(d.cur, q.chest ? 'chest' : (bossPhase || (MQ.battle.mobIndex() === 0 && !q.called)) ? 'walk' : 'hop');
      if (q.chest) MQ.sfx.chestAppear();
      else if (q.elite && q.elitePos === 0) MQ.sfx.elite();
      else { MQ.sfx.appear(); if (q.rare) MQ.sfx.rare(); }
    }

    const left = ' あと ' + MQ.battle.bossHp() + 'かい！';
    if (q.chest) {
      d.msg.textContent = 'たからばこが 出てきた！ あけてみよう';
    } else if (q.called) {
      // ボスが なかまを よんだ（v8.1）：ザコを 1体 たおしてから ボスの 問題へ
      const b = MQ.enemies.get(MQ.battle.bossId()) || { name: 'ボス' };
      d.msg.textContent = b.name + ' が なかまを よんだ！ ' + e.name + ' が あらわれた！';
      MQ.sfx.whistle();
    } else if (bossPhase && sk && sk.kind === 'kamae') {
      // わざの ふきだしは 2行に おさめる（長いと ボスの 絵に かぶる）
      d.msg.textContent = 'たてを かまえた！ 正解で ガードブレイク！';
      MQ.sfx.kamae();
    } else if (bossPhase && sk && sk.kind === 'clone') {
      d.msg.textContent = sk.pos === 0 ? 'ぶんしんした！ 2問 つづけて 正解で 見やぶれ！' : 'ぶんしんが のこって いる！ もう1問！';
      if (sk.pos === 0) MQ.sfx.clone();
    } else if (bossPhase && sk && sk.open) {
      d.msg.textContent = 'すきだらけだ！ 正解で 2ダメージ！';
    } else if (bossPhase) {
      // ふきだしは 3行まで（v12.8）。名前は 右上の パネルに ある ので くり返さない
      d.msg.textContent = !bossOnScreen ? (last ? e.name + 'が 立ちはだかる…！' : 'ボスの ' + e.name + ' が たちふさがる！')
        : MQ.battle.isFinal && MQ.battle.isFinal() ? 'さいごの 力だ！' + left
        : MQ.battle.isEnraged() ? 'おこって いる！' + left
        : 'こうげきだ！' + left;
      bossOnScreen = true;
    } else if (q.elite) {
      // 中ボス（v8.1）
      d.msg.textContent = q.elitePos === 0 ? '中ボスの ' + e.name + ' が あらわれた！ HP ' + (q.eliteHp || 2) + '！'
        : e.name + ' は まだ たおれない！ もう1発！';
    } else if (q.summon && q.groupPos === 0) {
      // なかまを よぶ（v8.1）：1体めが 口ぶえで 2体めを よぶ
      d.msg.textContent = e.name + ' が なかまを よんでいる…！';
      MQ.sfx.whistle();
    } else if (q.summon && q.groupPos === 1) {
      d.msg.textContent = q.golden ? 'ゴールデンスライムが よばれて 来た！ けいけんち 3ばい！' : e.name + ' が よばれて とんできた！';
    } else if (q.groupIds && q.groupPos === 0) {
      d.msg.textContent = q.groupSize + '体 まとめて あらわれた！';
    } else {
      d.msg.textContent = q.revenge ? 'リベンジ！ にげた ' + e.name + ' が もどってきた！ たおせば ボーナス！'
        : q.review ? 'まえの もんだいが もどってきた！ こんどは いけるぞ！'
        : q.rare ? e.name + ' が あらわれた！ けいけんち 3ばい！'
        : e.name + ' が あらわれた！';
    }
    // 弱点（v8.1）：この 問題の 教科が 弱点 → チャンス
    if (q.weak && !q.chest && !q.called) d.msg.textContent += bossPhase ? ' 弱点！ チャンス！' : ' ' + weakText(q.weak) + '！ チャンス！';
    if (bossPhase && !q.called) bossOnScreen = true;
    // てきの こうげき（v7.7）：たまりきった 問題は ふきだしも「正解で カウンター！」に
    const ci = MQ.battle.chargeInfo ? MQ.battle.chargeInfo() : null;
    if (ci && ci.attacking && !q.chest) {
      d.msg.textContent = ci.boss ? gbreakLine()
        : e.name + ' が こうげきして きた！ 正解で カウンター！';
    }

    renderAnswerArea(q);
    fitPrompt();      // メモ欄・キーが そろった あとで もう一度（v5.6）
    // サポート（v7.2）：にがて・はじめての 教科では ヒントが 先に 出る（ザコだけ）
    const ph = MQ.battle.preHint ? MQ.battle.preHint() : null;
    if (ph) showHint(ph, q, -1);
  }

  // 上の バー（ザコの ときは のこりの数、ボスの ときは 出題数と HP）
  function renderCount() {
    const bossPhase = MQ.battle.phase() === 'boss';
    const last = MQ.battle.mode() === 'tower';
    // ボス戦は ラベルなし（v12.8）：「ラスボス にげるまで 14」だと タイムの ピルが 2行めに 落ちて、HPバーが 勇者に かぶった
    d.count.innerHTML = bossPhase ? '' : (ctx.tokkun ? '<span>とっくん</span>' : '<span>てき</span>');
    if (d.prog) d.prog.classList.toggle('hpbar--boss', bossPhase);   // ボス戦は バーが ボスの HP（赤）
    // 中ボス（v8.1）の 2問は 1体と 数える
    const fc = MQ.battle.foeCount ? MQ.battle.foeCount() : { no: MQ.battle.mobIndex() + 1, total: MQ.battle.mobTotal() };
    if (!bossPhase) {
      d.count.appendChild(h('b', { text: fc.no + ' / ' + fc.total }));
    }
    // フィーバー教科（v7.2）：けいけんち 2ばいの しるし
    const fv = MQ.battle.fever ? MQ.battle.fever() : null;
    if (fv && !bossPhase) d.count.appendChild(h('i', { class: 'pillstat__fever', text: '×' + (fv.xpMul || 2) }));
    if (!bossPhase) {
      setProgress(1 - (fc.no - 1) / Math.max(1, fc.total));
    } else {
      // にげるまで あと 何問か（v12.7。前は「3 / 5」）
      d.count.appendChild(h('b', { text: 'にげるまで ' + Math.max(1, MQ.battle.bossMax() - MQ.battle.bossAsked() + 1) }));
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
  // いまの 相棒（core に わたす ぶん）
  function palOf(player) {
    const cur = MQ.pals ? MQ.pals.active(player) : null;
    // 追い打ちの つよさは 段階で 変わる（v8.2）
    return cur ? { id: cur.id, name: cur.name, lv: cur.lv, stage: (cur.enemy && cur.enemy.stage) || 1, power: MQ.pals.power(player) } : null;
  }

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
        if (V3()) MQ.ui.v3.enter(d.cur, 'hop');
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
    } else if (res.power === 'bond') {
      syncPalGauge();
      d.msg.textContent = 'きずなの わが ひかる！ なかまゲージが ' + res.val + 'つ ずつ たまる！';
    } else if (res.power === 'rush') {
      d.msg.textContent = 'まきものが ひらいた！ コンボが ＋' + res.val + ' ずつ たまる！';
    } else if (res.power === 'find') {
      MQ.sfx.coin();
      d.msg.textContent = 'コンパスが 光った！ コインが ' + res.val + 'まい 見つかった！';
    } else if (res.power === 'swift') {
      d.msg.textContent = 'かぜが 味方だ！ はやとき ボーナスが かならず もらえる！';
    } else if (res.power === 'elixir') {
      d.msg.textContent = 'くすりを のませた！ なかまの けいけんちが ' + res.val + 'ばい！';
    }
    setTimeout(function () { locked = false; }, 900);
  }

  function chargeNote(combo) {
    const sp = specialOf(combo);
    if (sp) return 'つぎの 正解で ' + sp.name;
    const next = TIER1_MIN - specialBoost();
    return 'ひっさつまで あと ' + Math.max(0, next - combo) + '！';
  }

  // 使った ときの 演出：技名＋色の 光＋主人公の まわりの つぶつぶ（種類で 色が 変わる）
  const ITEM_FX_MS = { atk: 1000, def: 1000, wis: 900, luck: 1000 };
  function playItemFx(res) {
    if (!d.fx) return;
    const kind = res.kind || 'atk';
    d.fx.textContent = '';
    d.fx.className = 'fx fx--item fx--' + kind;
    // v14.2：わざ名も なめらかな ふちの SVG（js/ui/fxtext.js）
    d.fx.appendChild(MQ.ui.fxtext ? MQ.ui.fxtext.name(res.powerName + '！', kind, { size: 26 }) : h('span', { class: 'fxname', text: res.powerName + '！' }));
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
    renderGuards();
    d.hero.classList.toggle('has-burst', b.dmg > 1);
    d.hero.classList.toggle('has-shield', b.shield > 0);
    d.hero.classList.toggle('has-freeze', b.freeze > 0);
    d.hero.classList.toggle('has-power', b.xpMul > 1 || b.comboPlus > 0 || b.palPlus > 0 || b.palXp > 1);
    if (!d.bagDots) return;
    d.bagDots.innerHTML = '';
    [['burst', b.dmg > 1], ['shield', b.shield > 0], ['freeze', b.freeze > 0],
      ['power', b.xpMul > 1 || b.comboPlus > 0 || b.palPlus > 0 || b.palXp > 1]].forEach(function (p) {
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

  /* ---- ガードくだき（2026-09-14）----
     まもり（たて・よろい）の アイコンは 主人公の 頭の 左よこ（.guardrow）。
     頭の 真上は ボスの HP バー（タブレットで 実測：バーの すぐ 下から 主人公）なので、左の あき（相棒の なまえより 上）に。
     こわれた まもりは 灰色、なおるまでの れんぞく 正解を 点で */
  const GUARD_NAMES = { shield: 'たて', freeze: 'よろい' };
  function renderGuards() {
    if (!d.guard || !MQ.battle.guards) return;
    const g = MQ.battle.guards();
    d.guard.textContent = '';
    let any = false;
    ['shield', 'freeze'].forEach(function (t) {
      const n = g[t] || 0;
      let broken = 0;
      g.broken.forEach(function (x) { if (x === t) broken++; });
      if (!n && !broken) return;
      any = true;
      d.guard.appendChild(h('span', {
        class: 'guardico guardico--' + t + (n ? '' : ' is-out') + (broken ? ' has-broken' : ''), 'aria-label': GUARD_NAMES[t] + ' ' + n
      }, [h('i', { class: 'guardico__shape' }), n > 1 ? h('b', { class: 'guardico__n', text: String(n) }) : null]));
    });
    if (g.broken.length) {
      any = true;
      const dots = [];
      for (let i = 0; i < g.need; i++) dots.push(h('i', { class: i < g.streak ? 'is-on' : '' }));
      d.guard.appendChild(h('span', { class: 'guardfix', 'aria-label': 'なおるまで' }, dots));
    }
    d.guard.hidden = !any;
  }
  // ボスの 大わざの ふきだし。本気で まもりが ある ときは「こわれる」と 先に 言う（うそを つかない）
  function gbreakLine() {
    const g = MQ.battle.guards ? MQ.battle.guards() : { shield: 0, freeze: 0 };
    if (MQ.battle.bossHard() && (g.shield || g.freeze)) return 'ガードくだきが くる！ まちがえると まもりが こわれる。正解で カウンター！';
    return 'ガードくだきが くる！ 正解で はね返して カウンター ' + MQ.battle.COUNTER_DMG + 'ダメージ！';
  }
  function guardPop(text, kind) {
    if (!d.guard) return;
    const p = h('span', { class: 'guardpop guardpop--' + kind, text: text });
    d.hero.appendChild(p);
    setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 1400);
  }
  function kickCls(el, cls, ms) {
    if (!el) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, ms || 900);
  }
  // いまの 答えで おきた ガードくだきの 出来事を 見せる（answer の あと・syncBuffs の あと）。出来事を かえす
  function guardEventFx() {
    const ev = MQ.battle.guardEvent ? MQ.battle.guardEvent() : null;
    if (!ev || !d.guard) return ev;
    const ico = function (t) { return d.guard.querySelector('.guardico--' + t); };
    if (ev.kind === 'crack') {
      kickCls(ico(ev.type), 'is-crack', 900);
      guardPop('ヒビ！ でも ぶじ', 'ok');
      setTimeout(function () { MQ.sfx.guard(); }, 260);
    } else if (ev.kind === 'broke') {
      const el = ico(ev.type);
      if (el) {
        kickCls(el, 'is-break', 900);
        for (let i = 0; i < 4; i++) {
          const c = h('i', { class: 'guardshard guardshard--' + ev.type });
          c.style.setProperty('--dx', (i % 2 ? 1 : -1) * (8 + i * 5) + 'px');
          c.style.setProperty('--dy', (-10 - i * 4) + 'px');
          el.appendChild(c);
          setTimeout(function () { if (c.parentNode) c.parentNode.removeChild(c); }, 800);
        }
      }
      guardPop(GUARD_NAMES[ev.type] + 'が こわれた！', 'bad');
      setTimeout(function () { MQ.sfx.guardBreak(); }, 260);
    } else if (ev.kind === 'hit') {
      if (ev.repaired) {
        kickCls(ico(ev.repaired), 'is-fix', 1000);
        guardPop(GUARD_NAMES[ev.repaired] + 'が なおった！ ＋' + MQ.battle.GB_REPAIR_XP, 'fix');
        MQ.sfx.guard();
      } else if (ev.gain) {
        kickCls(ico(ev.gain), 'is-gain', 900);
        guardPop('はね返した！ たて ＋1', 'gain');
      } else if (ev.block) {
        guardPop('はね返した！', 'gain');
      }
    }
    return ev;
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
  /* 問題文の 大きさを 決める。
     v5.6：字の 数だけで 決めて いたので、**たて700の 端末（タブレット）では
     問題文が 下で 切れて 読めなかった**。いまは 決めた あと
     **ほんとうに はみ出して いないかを はかって、入るまで 小さくする**。
     それでも 入らない ときは 図を 小さくする（`card--tight`）。 */
  const Q_SIZES = [' card__q--xl', ' card__q--l', '', ' card__q--m', ' card__q--s', ' card__q--xs'];
  // 図（グラフ・表・とけい・かたち・見くらべ）が 入って いるか
  const HAS_FIG = /class="(graph|tbl|figwide|figbox|clockbox|figpair|wcmp)/;
  /* 入らない ときの 手（上から じゅんに ためす）。
       [図の 大きさ, 字を いくつ 小さくするか]
     字を 1つ 小さく → 図を 少し → また 字 … と かわりばんこに して、
     どちらか 一方だけが むりに 小さく ならない ように して ある。 */
  const FIT_STEPS = [[1, 0], [1, 1], [0.85, 1], [0.85, 2], [0.7, 2], [0.7, 3], [0.55, 3], [0.45, 3]];
  function fitPrompt() {
    const n = (d.prompt.textContent || '').replace(/\s/g, '').length;
    const q = MQ.battle.current();
    const vert = !!(q && q.layout === 'vertical');   // ひっさん：メモ欄に 数字が あるので カードは 小さめ
    // グラフや 表が 入って いる ときは 図に 場所を ゆずる（v4.4）
    const fig = HAS_FIG.test(d.prompt.innerHTML || '');
    let start = (n > 30 || fig) ? 4 : (n > 14 || vert) ? 3 : 2;
    // メモ欄が ない 問題は 下が あく → 大きい 字から ためす（v5.6・「見やすく」）。
    // 長い 文が でかく なりすぎない ように、字の 数で 上限を 決める
    if (d.memo.hidden && !fig) start = Math.min(start, n <= 10 ? 0 : n <= 20 ? 1 : 2);
    d.root.classList.remove('is-cram');
    // 2周する。1周めで だめなら バトル画面（上）を 少し ちぢめて もう一度
    for (let round = 0; round < 2; round++) {
      for (let s = 0; s < FIT_STEPS.length; s++) {
        d.card.style.setProperty('--figk', FIT_STEPS[s][0]);
        d.prompt.className = 'card__q' + Q_SIZES[Math.min(Q_SIZES.length - 1, start + FIT_STEPS[s][1])];
        if (!overflowing()) return;
      }
      d.root.classList.add('is-cram');
    }
  }
  // カードから 中身が はみ出して いるか（カードが 見えて いない ときは しらべない）
  function overflowing() {
    return d.card && !d.card.hidden && d.card.clientHeight > 0 && d.card.scrollHeight > d.card.clientHeight + 1;
  }

  /* よみあげ（v5.3）：英語の 文（英語ステージ）／小1の 問題文 に「きく」を つける。
     声が 入って いない 端末・せっていが 切って ある ときは 何も 出ない */
  function renderListen(q) {
    if (!d.listen) return;
    if (MQ.speech) MQ.speech.stop();          // 前の 読み上げを 止める
    d.listen.textContent = '';
    d.listen.hidden = true;
    if (!MQ.speech || !MQ.ui.listenButton) return;
    const grade = ctx && ctx.world ? ctx.world.grade : 0;
    const areaId = q.areaId || (ctx && ctx.area ? ctx.area.id : '');
    const say = MQ.speech.forQuestion(q, { areaId: areaId, grade: grade });
    const btn = MQ.ui.listenButton(say);
    if (!btn) return;
    d.listen.appendChild(btn);
    d.listen.hidden = false;
  }

  function renderAnswerArea(q) {
    d.prompt.innerHTML = q.prompt || '';
    d.card.hidden = false;      // 先に 見えるように する（fitPrompt が 高さを はかるため・v5.6）
    renderListen(q);
    fitPrompt();

    // えらぶ
    if (q.type === 'choice') {
      d.choices.hidden = false;
      d.memo.hidden = true;
      d.panel.classList.remove('has-memo');
      d.spacer.hidden = true;
      d.displays.hidden = true;
      d.keys.hidden = true;
      d.choices.innerHTML = '';
      q.choices.forEach(function (text, i) {
        d.choices.appendChild(h('button', {
          class: 'choice', type: 'button', text: text, 'data-i': String(i), raw: true,
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
      d.panel.classList.add('has-memo');
      d.spacer.hidden = true;
      d.hissan.hidden = true;
      d.memo.classList.remove('is-hissan');
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
    d.panel.classList.toggle('has-memo', useMemo);
    d.spacer.hidden = useMemo;      // メモが ない ときだけ 下に よせる
    d.displays.hidden = false;
    d.keys.hidden = false;

    if (useMemo) {
      d.memoHint.textContent = 'ここに ゆびで ひっさんが かけるよ';
      if (q.layout === 'vertical') {
        d.hissan.hidden = false;
        d.memoQ.innerHTML = '';          // ひっさんの 数字が メモの 中に あるので 問題文は いらない
        d.hissan.innerHTML = hissanHtml(q);
        d.memo.classList.add('is-hissan');
      } else {
        d.hissan.hidden = true;
        d.memo.classList.remove('is-hissan');
        d.memoQ.innerHTML = d.prompt.innerHTML;
      }
      memo.reset();
    }

    renderDisplays();
    if (q.type === 'roma') renderRomaKeys();
    else renderNumKeys();
  }

  /* v13.20 ひっさんを 方眼の マスに 1字ずつ（ノートの ひっさんと 同じ）。
     マスの 大きさは CSS の --hc で、メモの 方眼も 同じ 大きさ・同じ 起点に そろえる＝線が 数字に かからない。
     たし算・ひき算は 小数点で そろえ、かけ算・わり算は 右で そろえる。小数点は 前の 数字の マスの 右下（ノートと 同じ）。 */
  function hissanHtml(q) {
    const addLike = q.sign === '+' || q.sign === '−' || q.sign === '-';
    function parts(v) { const s = String(v); const i = s.indexOf('.'); return i < 0 ? [s, ''] : [s.slice(0, i), s.slice(i + 1)]; }
    const P = [parts(q.a), parts(q.b)];
    let rows;   // [{ d: 数字, pt: 小数点 }] の ならび（左が 空き）
    if (addLike) {
      const il = Math.max(P[0][0].length, P[1][0].length), fl = Math.max(P[0][1].length, P[1][1].length);
      rows = P.map(function (p) {
        const r = [];
        for (let i = p[0].length; i < il; i++) r.push(null);
        p[0].split('').forEach(function (c, i) { r.push({ d: c, pt: !!p[1] && i === p[0].length - 1 }); });
        p[1].split('').forEach(function (c) { r.push({ d: c }); });
        for (let i = p[1].length; i < fl; i++) r.push(null);
        return r;
      });
    } else {
      const raw = P.map(function (p) {
        return (p[0] + p[1]).split('').map(function (c, i) { return { d: c, pt: !!p[1] && i === p[0].length - 1 }; });
      });
      const w = Math.max(raw[0].length, raw[1].length);
      rows = raw.map(function (r) { const pad = []; for (let i = r.length; i < w; i++) pad.push(null); return pad.concat(r); });
    }
    const cols = rows[0].length + 1;   // 左の 1列は 記号（＋ − × ÷）
    let html = '';
    rows.forEach(function (r, y) {
      r.forEach(function (c, x) {
        if (!c) return;
        html += '<span class="hs__c" style="grid-row:' + (y + 1) + ';grid-column:' + (x + 2) + '">' + MQ.util.esc(c.d) +
          (c.pt ? '<i class="hs__pt"></i>' : '') + '</span>';
      });
    });
    html += '<span class="hs__c hs__sign" style="grid-row:2;grid-column:1">' + MQ.util.esc(q.sign) + '</span>';
    html += '<span class="hs__bar"></span>';
    d.memo.style.setProperty('--cols', cols);   // メモ欄に おく＝方眼（canvas）の マスの 大きさも 同じ 式で 決まる
    return html;
  }

  function renderDisplays() {
    const q = MQ.battle.current();
    d.displays.innerHTML = '';
    if (q.type === 'divrem' || q.type === 'frac') {
      const isFrac = q.type === 'frac';   // 分数（v6.5）：q＝分子・r＝分母
      ['q', 'r'].forEach(function (f) {
        d.displays.appendChild(h('button', {
          class: 'display display--half' + (div.active === f ? ' is-on' : ''), type: 'button',
          onclick: function () { if (locked) return; MQ.sfx.tap(); div.active = f; renderDisplays(); }
        }, [
          h('span', { class: 'display__label', text: isFrac ? (f === 'q' ? '分子（上）' : '分母（下）') : (f === 'q' ? 'こたえ' : 'あまり') }),
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
    const q = MQ.battle.current();
    const decimal = !!(q && q.decimal);   // 小数（v3.0）：「.」の キーが 出て、こたえる が 1行 ぜんぶ
    d.keys.className = 'keys' + (decimal ? ' keys--dec' : '');
    d.keys.innerHTML = '';
    const labels = decimal ? ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'けす', 'こたえる'] : ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'けす', '0', 'こたえる'];
    labels.forEach(function (label) {
      const cls = 'key' + (label === 'けす' ? ' key--del' : '') + (label === 'こたえる' ? ' key--go' + (decimal ? ' key--go3' : '') : '') + (label === '.' ? ' key--dot' : '');
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

  // かん字を 書く問題の ボタン（v2.9：「かけた！」で 形を はんてい。まよった ときだけ じぶんで ◯✕）
  function renderWriteKeys(q) {
    d.keys.className = 'keys keys--write';
    d.keys.innerHTML = '';
    if (writeState === 'draw') {
      d.keys.appendChild(h('button', {
        class: 'key key--go key--go3', type: 'button', text: 'かけた！',
        onclick: function () { if (locked) return; MQ.sfx.tap(); judgeWrite(q); }
      }));
      return;
    }
    d.keys.appendChild(h('button', {
      class: 'key key--go', type: 'button', text: '◯ おなじに かけた',
      onclick: function () { if (locked) return; MQ.sfx.tap(); submit(true); }
    }));
    d.keys.appendChild(h('button', {
      class: 'key key--del', type: 'button', text: '✕ ちがった',
      onclick: function () { if (locked) return; MQ.sfx.tap(); submit(false); }
    }));
  }
  // 問題文（×の あとは おてほんつき）
  function writePrompt(q) {
    return q.prompt + (writeModel ? '<span class="card__model">おてほん<b>' + MQ.util.esc(q.answer) + '</b></span>' : '');
  }
  // きみの 字 と おてほん を ならべる
  /* きみの 字 と おてほん を ならべる。
     v5.6：前は 上に 黒い ふきだしを 出して いたが、それが **ならべた 2つの 字の 上に
     かぶさって、くらべる ものが 見えなかった**（実機の 写真で わかった）。
     いまは 言うことを カードの 中（絵の すぐ 上）に 書く。 */
  function showWriteCompare(q) {
    let url = '';
    try { url = MQ.handwrite.cropUrl(d.canvas, 96); } catch (e) { url = ''; }
    /* v7.6：「寒い」「大きい」の ような 2〜3文字の ことばは 62px だと 84px の わくに 入らず
       上に はみ出して 言うことに かぶって いた（800×1280 の スクショで 発見）→ 文字数で わくを 横長に・字を 小さく */
    const n = Math.min(3, Math.max(1, String(q.answer || '').length));
    d.prompt.innerHTML = q.prompt +
      '<span class="wcmp__say">おなじ 形に かけたら ◯、ちがったら ✕</span>' +
      '<span class="wcmp wcmp--n' + n + '">' +
        '<span class="wcmp__box"><img class="wcmp__img" alt="きみの 字" src="' + url + '"><span class="wcmp__cap">きみの 字</span></span>' +
        '<span class="wcmp__box"><span class="wcmp__k">' + MQ.util.esc(q.answer) + '</span><span class="wcmp__cap">おてほん</span></span>' +
      '</span>';
    fitPrompt();
  }
  // 書いた 字を おてほんと くらべる（js/core/handwrite.js）
  function judgeWrite(q) {
    if (MQ.handwrite) MQ.handwrite.setLevel(MQ.save.getSetting('judge', 'normal'));   // きびしさ（おうちの人ページ）
    const r = MQ.handwrite ? MQ.handwrite.judge(d.canvas, q.answer, { strokes: memo.strokes ? memo.strokes() : 0, paths: memo.paths ? memo.paths() : null }) : { verdict: 'maybe', reason: 'nojudge' };
    lastJudge = r;
    if (r.reason === 'empty') { MQ.ui.toast('まず ゆびで かん字を かいてね'); return; }
    if (r.verdict === 'ok') {
      writeModel = true;
      d.prompt.innerHTML = writePrompt(q);
      fitPrompt();
      submit(true);
      return;
    }
    if (r.verdict === 'ng') {
      writeModel = true;
      writeMsg = r.reason === 'blob' ? 'ぬりつぶしじゃ なくて、字を かいてね。おてほんを 見て もう1回！'
        : r.reason === 'scribble' ? 'なぐりがきは ✕だよ。1画ずつ ていねいに かいてね！'
        // 答えの 字は raw（小1で「山」が「やま」に なる のを ふせぐ）。「画（かく）」は 小3で「画（書く）」に 化けた ので「画」だけ
        : r.reason === 'strokes' ? ['「', h('span', { text: q.answer, raw: true }), '」は ' + r.expected + '画だよ。1画ずつ かいてね！']
        : 'うーん、形が ちがうみたい。おてほんを 見て もう1回！';
      submit(false);
      return;
    }
    writeState = 'check';
    showWriteCompare(q);
    // ふきだしは 出さない（くらべる 字の 上に かぶさる）。言うことは カードの 中に ある
    d.msg.textContent = 'おてほんと くらべてみよう';
    renderWriteKeys(q);
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

    if (q.type === 'divrem' || q.type === 'frac') {
      const second = q.type === 'frac' ? '分母' : 'あまり', first = q.type === 'frac' ? '分子' : 'こたえ';
      if (label === 'けす') {
        div[div.active] = div[div.active].slice(0, -1);
      } else if (label === 'こたえる') {
        if (div.active === 'q' && div.q !== '' && div.r === '') { div.active = 'r'; renderDisplays(); MQ.ui.toast('つぎは ' + second + ' を 入れてね'); return; }
        if (div.q === '' || div.r === '') { MQ.ui.toast(first + ' と ' + second + ' を 入れてね'); return; }
        submit({ q: parseInt(div.q, 10), r: parseInt(div.r, 10) });
        return;
      } else if (div[div.active].length < 3) {
        div[div.active] += label;
      }
      renderDisplays();
      return;
    }

    if (label === 'けす') input = input.slice(0, -1);
    else if (label === 'こたえる') { if (input === '' || input === '.' || input === '0.') return; submit(q.decimal ? parseFloat(input) : parseInt(input, 10)); return; }
    else if (label === '.') { if (!q.decimal || input.indexOf('.') >= 0) return; input = (input === '' ? '0' : input) + '.'; }
    else if (input.length < (q.maxLen || (q.decimal ? 6 : 5))) input += label;   // 大きい数は maxLen: 9
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
    const gbe = guardEventFx();   // ガードくだき（2026-09-14）：ヒビ・こわれた・はね返した・なおった

    /* ---- たからばこ ---- */
    if (res.outcome === 'chest') {
      markChoices(q, value);
      MQ.sfx.chestOpen();
      if (V3() && d.cur) MQ.ui.v3.play(d.cur, 'mo-chest-open');
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

    /* ---- 中ボスに ダメージ（まだ たおれない・v8.1） ---- */
    if (res.outcome === 'elitehit') {
      markChoices(q, value);
      const spc = specialFor(res);
      if (res.counter) counterFx();
      if (res.weakHit) weakFx();
      attack(res.crit, true, spc, { combo: res.combo || 0, finish: false, withPal: !!(spc && res.palHit) });
      if (res.palHit) palAttack();
      if (res.burst) burstHit();
      popDamage(res.dmg + 'ダメージ +' + res.xp, res.crit || !!res.burst || !!res.counter || !!res.weakHit);
      comboShow(res.combo);
      setTimeout(renderEliteHp, 350);
      d.msg.textContent = (res.counter ? 'カウンター！ ' : res.crit ? 'クリティカル！ ' : '') + e.name + ' に ' + res.dmg + 'ダメージ！ あと ' + res.hpLeft + '！';
      ok(res.note);
      wait(1700 + (spc ? Math.max(0, spc.ms - 1100) : 0), advance);
      return;
    }

    /* ---- ザコを たおした ---- */
    if (res.outcome === 'correct') {
      markChoices(q, value);
      const spc = specialFor(res);
      if (res.counter) counterFx();          // てきの こうげきを はね返した（v7.7）
      if (res.weakHit) weakFx();             // 弱点を ついた（v8.1）
      attack(res.crit, false, spc, { combo: res.combo || 0, finish: isFinisher(res) || !!res.elite, withPal: !!(spc && res.palHit) });
      if (res.burst) burstHit();
      popDamage((res.counter ? 'カウンター ' : res.weakHit ? 'ばつぐん ' : '') + '+' + res.xp, res.crit || res.rare || !!res.multi || !!res.burst || !!res.counter || !!res.weakHit || !!res.elite);
      comboShow(res.combo);
      if (res.palHit) palAttack();
      if (res.multi) {
        MQ.sfx.multiKO(res.multi);
        flash(true);
        shake(true);
        d.msg.textContent = res.multi >= 3 ? 'トリプル KO！！ ぜんぶ 一発で たおした！' : 'ダブル KO！ 2体 まとめて たおした！';
        d.foes.querySelectorAll('.enemy').forEach(function (el) { el.classList.add('is-down'); if (V3()) MQ.ui.v3.play(el, 'mo-fall'); });
      } else if (res.elite) {
        // 中ボス（v8.1）を たおした：大きく 光って ゆれる
        flash(true);
        shake(true);
        setTimeout(renderEliteHp, 350);
        d.msg.textContent = (res.counter ? 'カウンター！ ' : res.crit ? 'クリティカル！ ' : '') + '中ボスの ' + e.name + ' を たおした！　けいけんち ＋' + MQ.battle.XP.eliteBonus + '　コイン ＋1';
      } else if (res.called) {
        // ボスが 呼んだ ザコ（v8.1）
        d.msg.textContent = (res.palHit && palNow ? palNow.name + 'の こうげき！ ' : res.crit ? 'クリティカル！ ' : '') + 'よばれた ' + e.name + ' を たおした！ つぎは ボスだ！';
      } else {
        d.msg.textContent = (res.counter ? 'カウンター！ ' : '') + (res.weakHit ? 'こうかは ばつぐん！ ' : '') + (res.palHit && palNow ? palNow.name + 'の こうげき！ ' : '') + (res.revenge ? 'リベンジ せいこう！ ' : res.reviewOk ? 'おぼえたね！ ' : res.burst ? 'ばくれつ！ ' : res.crit ? 'クリティカル！ ' : '') + e.name + ' を たおした！'
          + (res.reviewOk ? '　ボーナス ＋' + MQ.battle.XP_REVIEW : res.revenge ? '　ボーナス ＋' + MQ.battle.XP.revenge : res.burst ? '　けいけんち ' + res.burst + 'ばい！' : res.counter || res.weakHit ? '　けいけんち 1.5ばい！' : res.rare ? '　3ばいだ！' : '')
          + (res.coins ? '　コイン ＋' + res.coins : '');
      }
      ok(res.note);
      wait((res.multi ? 2200 : res.elite ? 2300 : 1700) + (spc ? Math.max(0, spc.ms - 1100) : 0), advance);   // 大きな わざは 見おわるまで まつ
      return;
    }

    /* ---- もう1回 ---- */
    if (res.outcome === 'shielded') {
      // てっぺき まもり：2回目に まちがえても にげられない。答えは 見せずに もう1回
      shieldFx();
      if (res.hit) struckFx();
      comboShow(res.combo || 0);
      d.msg.textContent = 'たてが まもった！ もう1回 こたえよう！' + (res.left ? '（あと ' + res.left + '回）' : '');
      if (q.type === 'choice') {
        const b = d.choices.querySelector('.choice[data-i="' + value + '"]');
        if (b) { b.classList.add('is-out'); b.disabled = true; }
      }
      input = '';
      writeState = 'draw';
      div = { q: '', r: '', active: 'q' };
      if (q.type === 'write') { d.prompt.innerHTML = writePrompt(q); fitPrompt(); renderWriteKeys(q); memo.clear(); }
      else if (q.type !== 'choice') renderDisplays();
      startCountdown();
      wait(500, function () { locked = false; });
      return;
    }

    if (res.outcome === 'retry') {
      // てきの こうげきの 問題で まちがえた → くらった（演出だけ・v7.7）。ほかは よけられた
      const strikeMs = counterStrike(q, res);   // 2026-09-19：ザコ・中ボスの はんげき（演出だけ）
      if (strikeMs == null) { if (res.hit) struckFx(); else dodge(); }
      comboShow(res.combo || 0);
      d.msg.textContent = res.hit ? (res.frozen ? 'くらった！ でも 時とめで コンボは そのまま！ もう1回！' : 'くらった！ でも だいじょうぶ。もう1回 こたえよう！')
        : res.frozen ? 'おしい！ でも 時とめで コンボは そのまま！ もう1回！'
        : res.skill === 'kamae' ? 'たてで ふせがれた！ でも だいじょうぶ。もう1回！'
        : res.elite ? 'おしい！ 中ボスは 手ごわい。もう1回！'
        : q.boss ? 'おしい！ ふせがれた。もう1回！'
        : strikeMs != null ? 'おしい！ ' + e.name + 'の はんげき！ でも だいじょうぶ。もう1回！'
        : 'おしい！ ' + e.name + ' に よけられた。もう1回！';
      // ガードくだき（2026-09-14）：ボスの 大わざで まちがえた
      if (gbe && gbe.kind === 'broke') d.msg.textContent = 'ガードくだき！ ' + GUARD_NAMES[gbe.type] + 'が こわれた…　1回めで ' + gbe.need + 'もん れんぞく 正解すると なおる！';
      else if (gbe && gbe.kind === 'crack') d.msg.textContent = 'ガードくだき！ でも ' + GUARD_NAMES[gbe.type] + 'は ぶじ！ もう1回 こたえよう！';
      if (res.skill === 'kamae') MQ.sfx.kamae();
      if (q.type === 'write' && writeMsg) {
        d.msg.textContent = '';
        if (Array.isArray(writeMsg)) d.msg.appendChild(h('span', null, writeMsg));
        else d.msg.textContent = writeMsg;
        writeMsg = '';
      }
      showHint(res.hint, q, value);
      input = '';
      writeState = 'draw';
      div = { q: '', r: '', active: 'q' };
      if (q.type === 'write') { d.prompt.innerHTML = writePrompt(q); fitPrompt(); renderWriteKeys(q); memo.clear(); }
      else if (q.type !== 'choice') renderDisplays();
      startCountdown();
      wait(Math.max(500, strikeMs || 0), function () { locked = false; });
      return;
    }

    /* ---- ボスに ダメージ ---- */
    if (res.outcome === 'bosshit') {
      markChoices(q, value);
      // 本気モード（v12.7）：2回めの 正解は ガード。けいけんちだけ 入る（相棒の 追い打ちが あれば 下の ふつうの 流れ）
      if (res.blocked && !res.dmg) {
        guardFx();
        comboShow(res.combo);
        popDamage('ガード +' + res.xp, false);
        ok(res.note);
        if (res.fled) {
          d.msg.textContent = 'ガードされた！ ' + e.name + ' は まもりを かためて 去っていった…';
          wait(3000, finish);
        } else {
          d.msg.textContent = 'ガードされた！ 本気の ボスには 1回めの 正解だけ きく！';
          wait(2000, advanceBoss);
        }
        return;
      }
      if (res.counter) counterFx();          // ボスの 大わざを はね返した（v7.7）
      // ボスの わざ・弱点（v8.1）
      if (res.weakHit) weakFx();
      else if (res.broke) { MQ.sfx.guardBreak(); flash(false); skillBanner('ガードブレイク！', 'break'); }
      else if (res.open) { flash(true); skillBanner('すきを ついた！', 'open'); }
      else if (res.cloneKO) { flash(true); skillBanner('見やぶった！', 'clone'); }
      const bsp = specialFor(res);
      attack(res.crit, true, bsp, { combo: res.combo || 0, finish: !!res.defeated, withPal: !!(bsp && res.palHit) });
      if (res.palHit) palAttack();
      if (res.burst) burstHit();
      popDamage((res.counter ? 'カウンター ' + res.dmg + 'ダメージ ' : res.weakHit || res.open || res.setMove ? res.dmg + 'ダメージ ' : res.burst ? res.dmg + 'ダメージ ' : '') + '+' + res.xp, res.crit || !!res.burst || !!res.counter || !!res.weakHit || !!res.open || !!res.cloneKO || !!res.broke || !!res.setMove);
      comboShow(res.combo);
      setTimeout(renderBossHp, 350);
      ok(res.note);
      // ぶんしんの 1問め：その ボスは 消えて もう1体 のこる
      if (res.skill === 'clone' && res.clonePos === 0 && d.cur) d.cur.classList.add('is-vanish');

      if (res.defeated) {
        d.msg.textContent = (res.burst ? 'ばくれつ こうげき！ ' : '') + (res.hard ? '本気の ' + e.name + ' を たおした！！ ごほうび 2ばい！'
          : res.last ? e.name + 'を たおした！！！' : 'ボスの ' + e.name + ' を たおした！！');
        MQ.sfx.bossdown();
        MQ.bgm.stop();
        // ドーン の あとに ファンファーレ → けっか画面で しょうりの 曲へ つながる
        setTimeout(function () { MQ.bgm.play('fanfare', { then: res.last ? 'ending' : 'victory' }); }, 450);
        d.cur.classList.add('is-bossdown');
        if (V3()) { MQ.ui.v3.play(d.cur, 'mo-crumble'); MQ.ui.v3.play(d.hero, 'mo-win', 1000); }
        if (res.last) flash(true);
        wait(res.last ? 3200 : 2600, finish);
        return;
      }
      if (res.fled) {
        d.msg.textContent = 'おしい！ あと すこしだったのに にげられた…';
        wait(2600, finish);
        return;
      }
      if (res.enrage || res.final) {
        const last = res.last;
        // 第2形態（おこる）→ 第3形態（さいごの 力・v12.7）
        d.msg.textContent = res.final
          ? (last ? e.name + '「これが わたしの さいごの 力だ…！」' : e.name + ' は さいごの 力を ふりしぼった！')
          : (last ? e.name + '「まだ 本気では なかった…！」' : e.name + ' は おこりだした！');
        if (last || res.final) MQ.sfx.henshin(); else MQ.sfx.enrage();
        MQ.bgm.setEnrage(true);          // 曲が 速くなる
        if (d.bg && !last) d.bg.classList.add('is-dusk2');   // v12.6：おこると 空が 赤黒く
        shake(true);
        if (last || res.final) flash(true);
        setTimeout(function () {
          if (!d.cur) return;
          if (res.final) d.cur.classList.add('is-final');
          const img = d.cur.classList.contains('is-hot') ? null : d.cur.querySelector('.enemy__img, .enemy__img3d');
          d.cur.classList.add('is-hot');     // おこった 絵に かえるのは 1回だけ
          if (img) {
            const size = img.offsetWidth || 96;
            const hot = foeArt(q.enemyId, size, { enrage: true });
            img.parentNode.replaceChild(hot, img);
            if (V3()) MQ.ui.v3.play(d.cur, 'mo-lunge', 800);
          }
          d.cur.classList.add('is-enrage');
        }, 400);
        wait(2600, advanceBoss);
        return;
      }
      d.msg.textContent = (res.setMove ? 'セットわざ！ ' + res.dmg + 'ダメージ！ '
        : res.counter ? 'カウンター！ ' + res.dmg + 'ダメージ！ '
        : res.weakHit ? 'こうかは ばつぐん！ ' + res.dmg + 'ダメージ！ '
        : res.open ? 'すきを ついた！ ' + res.dmg + 'ダメージ！ '
        : res.broke ? 'ガードブレイク！ つぎの 1問は 2ダメージの チャンス！ '
        : res.cloneKO ? 'ぶんしんを 見やぶった！ ボーナス ＋' + MQ.battle.XP.cloneBonus + '！ '
        : res.skill === 'clone' && res.clonePos === 0 ? 'ぶんしんに あたった！ もう1体！ '
        : res.burst ? 'ばくれつ こうげき！ ' + res.dmg + 'ダメージ！ '
        : res.blocked ? 'ガードされた！ でも なかまの こうげきが 入った！ '   // 本気モード＋相棒（v12.7）
        : 'いいぞ！ ') + 'あと ' + res.hpLeft + 'かい だ！';
      wait(1700 + (bsp ? Math.max(0, bsp.ms - 1100) : 0), advanceBoss);   // 大きな わざ（ビッグバン・スターバースト・セットわざ）は 見おわるまで まつ（ザコと 同じ）
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
    d.msg.textContent = res.golden ? e.name + ' は にげあしが はやい！ 1回で にげられた…'   // 2026-09-19
      : res.called ? e.name + ' に にげられた… でも ボスとの たたかいは つづく！'
      : res.elite ? '中ボスの ' + e.name + ' に にげられた… また あとで！'
      : e.name + ' に にげられた…';
    sayAnswer(res);
    wait(3000, advance);
  }

  /* こたえた あとの ふきだし。
     「せいかい！」などの 見出しと、補足（note）を **べつの 行**に する。
     補足は 40字ちかく あることが あるので、小さい字で 折り返す。
     こうしないと 1行に ならんで 画面から はみ出る。 */
  function feedback(head, note, cls) {
    d.feedback.textContent = '';
    // head は 文字 か [文字, 部品, …]（答えの ぶんは raw の 部品）
    d.feedback.appendChild(Array.isArray(head)
      ? h('b', { class: 'feedback__head' }, head)
      : h('b', { class: 'feedback__head', text: head }));
    if (note) d.feedback.appendChild(h('span', { class: 'feedback__note', text: note, raw: true }));
    // よみあげ（v5.3）：ふきだしの 中の 英語も 聞ける
    if (note && MQ.speech && MQ.ui.listenButton) {
      const areaId = (ctx && ctx.area) ? ctx.area.id : '';
      const cur = MQ.battle.current();
      const say = MQ.speech.forNote(note, { areaId: (cur && cur.areaId) || areaId });
      const b = MQ.ui.listenButton(say);
      if (b) d.feedback.appendChild(b);
    }
    d.feedback.className = 'feedback' + (cls ? ' ' + cls : '');
  }

  function ok(note) { feedback('せいかい！', note, 'feedback--ok'); }

  // まちがい・時間切れ・にげられた ときの「こたえは ○○。」
  // 答えは raw（辞書を 当てない）。当てると「山」の よみの 問題で 答えが「山」に なったり、小1で かん字の 答えが ひらがなに なる
  function sayAnswer(res) { feedback(['こたえは ', h('span', { text: String(res.answerText), raw: true }), '。'], res.note); }

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
    ambushTok++;   // 前の 先制こうげきの のこりの タイマーを 止める
    MQ.bgm.play('boss');
    MQ.sfx.alarm();
    d.msg.textContent = '';
    d.foes.innerHTML = '';
    d.warnText.textContent = 'WARNING';
    d.warnSub.textContent = 'ボスが ちかづいてくる…！';
    if (d.bg) d.bg.classList.add('is-dusk');   // v12.6：ボス戦は 空が 暗く なる（塔は もともと 夜・CSS で 効かない）
    endSpecial(true);   // v13.6：さいごの ザコを 大わざで たおして 画面が 広がって いたら もどす
    d.warning.className = 'warning';
    d.warning.hidden = false;
    void d.warning.offsetWidth;
    d.warning.classList.add('is-in');   // v13.6：前は にげる 動き（is-run＝左へ 30px）を 借りて いて 幕ごと ずれて いた
    wait(1700, function () {
      d.warning.hidden = true;
      renderQuestion();
      ambush(bossPick);   // 2026-09-19：出て すぐ いきなり こうげき → ふつう／本気の パネル
    });
  }

  /* 本気モード（v12.7）：ボスが 出た ところで「ふつう／本気」を 子どもが えらぶ。
     本気＝1回めの 正解だけ ダメージ・ごほうび 2ばい。ふつうを えらべば いままでと 同じ（負けない）。
     はじめての たたかい・タイムアタックでは 出さない（ふつう）。えらぶ まで 問題には 答えられない */
  function bossPick() {
    if (!MQ.battle.setBossHard || ctx.first || ctx.timeAttack) return;
    const last = MQ.battle.mode() === 'tower';
    const e = MQ.enemies.get(MQ.battle.bossId()) || { name: 'ボス' };
    locked = true;
    closePick();
    function choose(hard) {
      if (!d.pick) return;
      MQ.sfx.tap();
      MQ.battle.setBossHard(hard);
      closePick();
      locked = false;
      if (hard) {
        MQ.sfx.enrage();
        shake(true);
        renderFoes(MQ.battle.current());
        d.msg.textContent = '本気の ' + e.name + ' だ！ 1回めの 正解だけ きくぞ！';
      }
    }
    d.pick = h('div', { class: 'bosspick' + (last ? ' bosspick--last' : '') }, [
      h('p', { class: 'bosspick__t', text: (last ? '' : 'ボスの ') + e.name + ' が あらわれた！' }),
      h('p', { class: 'bosspick__s', text: 'どっちで たたかう？' }),
      h('button', { class: 'bosspick__btn bosspick__btn--norm', type: 'button', onclick: function () { choose(false); } }, [
        h('b', { text: 'ふつうに たたかう' }),
        h('span', { text: 'いつもの つよさ' })
      ]),
      h('button', { class: 'bosspick__btn bosspick__btn--hard', type: 'button', onclick: function () { choose(true); } }, [
        h('b', { text: '本気の ボスと たたかう' }),
        h('span', { text: '1回めの 正解だけ ダメージ・ごほうび 2ばい' }),
        h('span', { class: 'btn__shine' })
      ])
    ]);
    d.panel.appendChild(d.pick);
  }
  /* =======================================================
     ボスの 先制こうげき ＋ てきの はんげき（2026-09-19）
     ユーザー「ボス戦の 緊迫感を。いきなり 攻撃して ガード（盾を 壊す）ぐらい」→「A（ふつうでも 本当に こわれる）」
     「派手さを もっと。ドラゴン系なら 火を 吐くなど」「ザコや 中ボスも まちがえたら 同じ モーションで ガードが こわれる 演出を。ザコは 派手じゃなくて OK」
       ボス  … 出て すぐ 1回（ルールは core の bossAmbush＝まもりが 本当に 1つ こわれる・2問 れんぞく 正解で なおる）
       中ボス … まちがえた とき（1回め）。ザコより 少し 強め（ユーザー「中ボスも そんなに 派手じゃなくて いい」）。**演出だけ**
       ザコ  … まちがえた とき（1回め）。すばやく つっこんで 小さな たてが くだける。**演出だけ**
     大わざは ボスの しゅるいで 6つ（AMB_STYLE・光は js/ui/bossfx.js）：
       ①ため（赤い「！」・赤い 光・画面の ふち）→ ②はなつ（ほのお・かみなり・こおり・やみの 玉）か つっこむ（大ぎり・じしん）
       → ③当たる（光の たてが くだける・主人公が ふっとぶ・ゆれ・帯）→ ④もどる
     てきの こうげき なし（おうちの人ページ）・はじめての たたかい・とっくん・タイムアタックでは 出ない（ザコ・中ボスは いままでの よける 動き）
     ======================================================= */
  const AMB = { wind: 700 };                                          // ボスが 出て から ため まで（ms）
  const STRIKE = { rush: 450, hit: 750, back: 1250, end: 1950 };      // 大わざの 中の 時間（ため を 0・bossfx.js の IMP と そろえる）
  // [わざ, わざの 名前, 口の よこ, 口の たて]（口＝絵の 左上から の わりあい。ほのお・かみなり・こおり・やみ の はなつ ところ）
  const AMB_STYLE = {
    'boss-dragon': ['fire', 'ほのおの ブレス', 0.1, 0.3], 'boss-maou': ['fire', 'やみの ほのお', 0.3, 0.35], 'boss-kaizoku': ['fire', 'たいほう ドカン', 0.12, 0.5],
    'boss-namazu': ['bolt', 'ビリビリ ほうでん', 0.18, 0.45], 'boss-knight': ['bolt', 'でんげき ビーム', 0.3, 0.3], 'boss-griffon': ['bolt', 'かみなりの つばさ', 0.22, 0.3],
    'boss-mizuchi': ['ice', 'みずの ブレス', 0.12, 0.3], 'boss-blizzard': ['ice', 'ブリザード', 0.3, 0.35],
    'boss-oni': ['slash', 'なぎなた 大ぎり'], 'boss-haniwa': ['slash', 'はにわ 大ぎり'], 'boss-tengu': ['slash', 'かまいたち'], 'boss-dark': ['slash', 'やみの 大けん'],
    'boss-saidon': ['quake', 'いわくだき とっしん'], 'boss-titan': ['quake', 'だいち わり'], 'boss-slime': ['quake', 'ジャンボ プレス'], 'boss-prince': ['quake', 'ぷるぷる プレス'],
    'boss-majin': ['dark', 'すうじの のろい', 0.3, 0.3], 'boss-fude': ['dark', 'すみの ばくだん', 0.25, 0.4], 'boss-obake': ['dark', 'おばけ ボール', 0.3, 0.4],
    'boss-hades': ['dark', 'めいかいの ほのお', 0.3, 0.3], 'boss-koban': ['gold', 'こばん シャワー', 0.3, 0.4]
  };
  const MELEE = { slash: true, quake: true };
  let ambushTok = 0;
  function styleOf(id) { return AMB_STYLE[id] || ['slash', 'はんげき']; }
  function stageK() { return (MQ.stage && MQ.stage.size) ? (MQ.stage.size().scale || 1) : 1; }
  // ボスの 左はし → 主人公の 右はし（たての ぶん 少し 手まえで 止まる）
  function rushDist(f, extra) {
    const fr = f.getBoundingClientRect(), hr = d.hero.getBoundingClientRect();
    return Math.max(50, Math.round((fr.left - hr.right) / stageK() + (extra == null ? 26 : extra)));
  }
  // 光の たて（主人公の 前）。くだける／ヒビ
  function lightShield(type, mini) {
    const sh = h('span', { class: 'ambushshield ambushshield--' + (type || 'shield') + (mini ? ' ambushshield--mini' : '') }, [h('i', { class: 'ambushshield__in' })]);
    d.hero.appendChild(sh);
    return sh;
  }
  function shatter(sh, type, pieces) {
    sh.classList.add('is-shatter');
    for (let i = 0; i < pieces; i++) {
      const a = (i / pieces) * Math.PI * 2 + 0.3;
      const c = h('i', { class: 'ambushshard ambushshard--' + (type || 'shield') });
      c.style.setProperty('--dx', Math.round(Math.cos(a) * (34 + (i % 3) * 14) - 18) + 'px');
      c.style.setProperty('--dy', Math.round(Math.sin(a) * (30 + (i % 2) * 16) - 10) + 'px');
      c.style.setProperty('--rot', ((i % 2 ? 1 : -1) * (140 + i * 30)) + 'deg');
      sh.appendChild(c);
    }
    setTimeout(function () { sh.remove(); }, 900);
  }
  function hitMark(claws, small) {
    const ar = d.arena.getBoundingClientRect(), hr = d.hero.getBoundingClientRect(), k = stageK();
    const kids = [h('i', { class: 'ambushhit__ring' }), h('i', { class: 'ambushhit__core' })];
    if (claws) for (let i = 0; i < 3; i++) kids.push(h('i', { class: 'ambushclaw' }));
    const hit = h('div', { class: 'ambushhit' + (small ? ' ambushhit--small' : '') }, kids);
    hit.style.left = ((hr.left + hr.width * 0.72 - ar.left) / k) + 'px';
    hit.style.top = ((hr.top + hr.height * 0.42 - ar.top) / k) + 'px';
    d.arena.appendChild(hit);
    setTimeout(function () { hit.remove(); }, 900);
  }
  function knock(cls, ms) {
    d.hero.classList.remove('is-smashed', 'is-smashed--lite', 'is-struck');
    void d.hero.offsetWidth;
    d.hero.classList.add(cls);
    if (V3()) MQ.ui.v3.play(d.hero, 'mo-hurt', 600);
    setTimeout(function () { d.hero.classList.remove(cls); }, ms);
  }

  // ボスが 出た すぐ あと（bossIntro／towerIntro から）。おわったら then（ふつう／本気の パネル）
  function ambush(then) {
    const ev = MQ.battle.bossAmbush ? MQ.battle.bossAmbush() : null;
    if (!ev) { then(); return; }
    const tk = ++ambushTok;
    locked = true;
    if (d.msg) d.msg.classList.remove('is-quiet');
    setTimeout(function () {
      if (tk !== ambushTok || !d.cur || !d.cur.isConnected || MQ.battle.phase() !== 'boss') return;
      bigStrike({ tk: tk, ev: ev, boss: true, enemyId: MQ.battle.bossId(), onEnd: function () { locked = false; then(); } });
    }, AMB.wind);
  }

  /* 大わざ（ボス・中ボス）。o.ev＝core の 出来事（{ kind: 'broke'|'crack'|'none', type }）か 演出だけ（{ kind: 'show' }） */
  function bigStrike(o) {
    const tk = o.tk, f0 = d.cur, ev = o.ev;
    const alive = function () { return tk === ambushTok && d.cur === f0 && f0 && f0.isConnected; };
    const at = function (ms, fn) { setTimeout(function () { if (alive()) fn(); }, ms); };
    const st = styleOf(o.enemyId), kind = st[0], melee = !!MELEE[kind];
    const e = MQ.enemies.get(o.enemyId) || { name: 'てき' };
    const gtype = ev.kind === 'show' ? 'shield' : (ev.type || null);
    let vig = null, shield = null;
    // ① ため
    d.msg.textContent = e.name + 'の ' + st[1] + '！';
    MQ.sfx.ambushWarn();
    vig = h('div', { class: 'ambushvig' });
    d.arena.appendChild(vig);
    skyOn('amb-' + kind);
    const bang = h('span', { class: 'ambushbang', text: '！' });
    f0.appendChild(bang);
    setTimeout(function () { bang.remove(); }, 900);
    const aura = h('span', { class: 'ambushaura ambushaura--' + kind });
    f0.insertBefore(aura, f0.firstChild);
    setTimeout(function () { aura.remove(); }, 1300);
    f0.classList.remove('is-appear', 'is-enrage', 'is-lunge', 'is-dodge');
    void f0.offsetWidth;
    f0.classList.add('is-windup');
    const fxc = MQ.ui.fxc;
    if (fxc && fxc.attach(d.root) && fxc.ok() && fxc.has('amb-' + kind)) {
      if (MQ.ui.bossfx) MQ.ui.bossfx.set({ mouth: [st[2] == null ? 0.3 : st[2], st[3] == null ? 0.4 : st[3]] });
      const img = f0.querySelector('.enemy__img3d, .enemy__img') || f0;
      fxc.play('amb-' + kind, { foe: boxOf(img, 0), hero: boxOf(d.hero.querySelector('.hero__img3d') || d.heroImg, 0), height: d.arena.offsetHeight });
    }
    // ② はなつ・つっこむ
    at(STRIKE.rush, function () {
      f0.classList.remove('is-windup');
      if (melee) f0.style.setProperty('--rush', rushDist(f0) + 'px');
      void f0.offsetWidth;
      f0.classList.add(melee ? 'is-rush' : 'is-cast');
      if (V3()) MQ.ui.v3.play(f0, 'mo-attack', 700);
      if (MQ.sfx['amb_' + kind]) MQ.sfx['amb_' + kind](); else MQ.sfx.ambushRush();
      if (gtype) shield = lightShield(gtype, false);
    });
    // ③ 当たる
    at(STRIKE.hit, function () {
      MQ.sfx.ambushSmash();
      flash(false);
      shake(true);
      quake(kind === 'quake' ? 3 : 2);
      hitMark(kind === 'slash', false);
      knock('is-smashed', 800);
      const real = ev.kind === 'broke' || ev.kind === 'crack';
      const band = h('div', { class: 'ambushband', text: ev.kind === 'none' ? 'ふいうち！' : ev.kind === 'crack' ? 'ガード！' : 'ガードくだき！' });
      d.arena.appendChild(band);
      setTimeout(function () { band.remove(); }, 1300);
      if (shield) {
        if (ev.kind === 'crack') { shield.classList.add('is-crack'); setTimeout(function () { MQ.sfx.guard(); }, 90); const sh = shield; setTimeout(function () { sh.remove(); }, 900); }
        else { shatter(shield, gtype, 9); setTimeout(function () { MQ.sfx.guardBreak(); }, 90); }
      }
      if (real) {
        // 頭の よこの アイコンも いっしょに（本当に こわれた／ヒビ）
        syncBuffs();
        const ico = d.guard ? d.guard.querySelector('.guardico--' + gtype) : null;
        if (ev.kind === 'broke') { kickCls(ico, 'is-break', 900); guardPop(GUARD_NAMES[gtype] + 'が こわれた！', 'bad'); }
        else { kickCls(ico, 'is-crack', 900); guardPop('ヒビ！ でも ぶじ', 'ok'); }
      }
      if (ev.kind === 'broke') d.msg.textContent = 'ガードくだき！ ' + GUARD_NAMES[gtype] + 'が こわされた！';
      else if (ev.kind === 'crack') d.msg.textContent = 'ガード！ ' + GUARD_NAMES[gtype] + 'に ヒビ！ でも ぶじだ！';
      else if (ev.kind === 'show') d.msg.textContent = 'ガードが くだけた！ でも だいじょうぶ。もう1回 こたえよう！';
      else d.msg.textContent = 'ふいうちを くらった！ でも まけないぞ！';
    });
    // ④ もどる
    at(STRIKE.back, function () {
      f0.classList.remove('is-rush', 'is-cast');
      if (ev.kind === 'broke') d.msg.textContent = GUARD_NAMES[gtype] + 'が こわされた！ ボスに 1回目で ' + ev.need + '問 れんぞく 正解すると なおるぞ！';
    });
    setTimeout(function () {
      if (vig) vig.remove();
      if (tk !== ambushTok) return;
      skyOff();
      if (MQ.ui.fxc) MQ.ui.fxc.fade();
      if (f0) f0.classList.remove('is-windup', 'is-rush', 'is-cast');
      if (o.onEnd && alive()) o.onEnd();
    }, STRIKE.end);
  }

  /* ザコ・中ボスの はんげき（まちがえた とき・演出だけ）：すばやく つっこんで たてが くだける。0.5秒で また 答えられる。
     mid＝中ボス（たてが 大きい・ゆれも 大きい・つめあと） */
  function mobStrike(hit, mid) {
    const f = d.cur;
    if (!f) return;
    const tk = ++ambushTok;
    f.classList.remove('is-appear', 'is-enrage', 'is-lunge', 'is-dodge', 'is-rush', 'is-rush--quick');
    f.style.setProperty('--rush', rushDist(f, 18) + 'px');
    void f.offsetWidth;
    f.classList.add('is-rush', 'is-rush--quick');
    if (V3()) MQ.ui.v3.play(f, 'mo-attack', 450);
    const sh = lightShield('shield', !mid);
    setTimeout(function () {
      if (tk !== ambushTok) { sh.remove(); return; }
      MQ.sfx.enemyHit();
      setTimeout(function () { MQ.sfx.guardBreak(); }, 40);
      shatter(sh, 'shield', mid ? 9 : 6);
      hitMark(!!mid, !mid);
      knock(mid ? 'is-smashed' : 'is-smashed--lite', mid ? 700 : 520);
      if (mid) { shake(true); flash(false); } else if (hit) shake(false);
    }, 150);
    setTimeout(function () { if (f) f.classList.remove('is-rush', 'is-rush--quick'); }, 480);
  }
  // まちがえた とき：てきの こうげきが あり なら はんげき（ザコ・中ボス）。かえりち＝答えられる までの ms（なし＝null）
  function counterStrike(q, res) {
    if (!MQ.battle.attacksOn || !MQ.battle.attacksOn() || MQ.battle.phase() !== 'mob' || q.chest) return null;
    mobStrike(!!res.hit, !!res.elite);
    return 500;
  }
  function closePick() { if (d.pick && d.pick.parentNode) d.pick.parentNode.removeChild(d.pick); d.pick = null; }

  function towerIntro() {
    bossOnScreen = false;
    ambushTok++;
    MQ.sfx.towerIntro();
    d.msg.textContent = '';
    d.foes.innerHTML = '';
    d.card.hidden = true;
    if (MQ.speech) MQ.speech.stop();
    d.choices.hidden = true;
    d.memo.hidden = true;
    d.displays.hidden = true;
    d.keys.hidden = true;
    d.warnText.textContent = 'FINAL BATTLE';
    d.warnSub.textContent = MQ.content.lastBoss().name + 'が 目を さました…！';
    endSpecial(true);
    d.warning.className = 'warning warning--last';
    d.warning.hidden = false;
    void d.warning.offsetWidth;
    d.warning.classList.add('is-in');
    shake(true);
    wait(2600, function () {
      d.warning.hidden = true;
      renderQuestion();
      ambush(bossPick);
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
    d.panel.classList.add('has-hint');
    fitPrompt();      // ヒントの ぶん 場所が へるので、問題文の 大きさを 合わせ直す（v5.6）
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
    { min: 20, tier: 5, id: 'starburst', name: 'スターバースト ストライク！', ms: 2500 },   // v7.5（名前は v9.5 で 変えた）・v13.8 で さいごの 大ばくはつの ぶん 長く
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
  /* v12.2：わざごとの 3D の 動き（css/motion3d.css の mo-sp-<id>／mo-hit-<id>）。
     scene＝主人公の 器の 走り方（null＝その場）／hit＝てきに 当たる 時間（やられ方は CSS の delay で 同じ 時間に 始まる）／
     down＝ザコが たおれ始める 時間（3D の ときだけ。当たって から 0.45秒 やられ方を 見せる） */
  const SP_MOTION = {
    fire:      { scene: 'mo-dash-sp',   hit: 500,  down: 950 },
    leaf:      { scene: 'mo-dash-sp',   hit: 340,  down: 800 },
    ice:       { scene: 'mo-dash-thru', hit: 360,  down: 820 },
    wind:      { scene: 'mo-dash-sp',   hit: 380,  down: 850 },
    bolt:      { scene: 'mo-dash-jump', hit: 600,  down: 1000 },
    star:      { scene: null,           hit: 620,  down: 1000 },
    nova:      { scene: 'mo-rise',      hit: 550,  down: 1150 },
    starburst: { scene: 'mo-dash-sp',   hit: 500,  down: 1600, palHit: 1300 }   // 相棒は さいごの 一閃に 合わせる
  };
  /* v12.2.1 ③：相棒も わざに 合わせる（ユーザー「③お願いします」2026-09-11）。
     5〜11コンボ＝主人公の うしろを ついて 走り、当たる ころに いっしょに とび出す（mo-pal-follow）。
     12コンボ〜＝てきの 右がわに とんで はさみうち（mo-pal-flank）。ルールは 変えない（見た目だけ）。
     その あいだ 追い打ち（palAttack）の 2D の ジャンプと mo-attack は 出さない（二重に 動く） */
  let palJoinUntil = 0;
  // 主人公の オーラと コンボの 色
  const NAME_SIZE = { nova: 30, starburst: 26 };   // 技名の 字の 大きさ（長い 名前だけ 小さく。ほかは tier で 34／38／36）
  const FX_COLOR = { fire: '#ff9a3c', leaf: '#7ee06a', ice: '#9fe6ff', wind: '#e6f6ff', bolt: '#9fd8ff', star: '#ffd447', nova: '#ffffff', starburst: '#b8ffe6' };
  const NOVA_COLORS = ['#ff5e7a', '#ffd447', '#7cf9c4', '#4fd3ff', '#c48bff', '#ffffff'];

  function elementOf(areaId) {
    const a = String(areaId || '');
    if (a.indexOf('kokugo') === 0) return 'leaf';
    if (a.indexOf('rika') === 0 || a.indexOf('shakai') === 0) return 'ice';
    if (a.indexOf('eigo') === 0) return 'wind';
    return 'fire';
  }
  // いまの 問題の 教科の わざ（塔では 問題ごとに 教科が 変わる）
  function currentElement() {
    const q = MQ.battle.current ? MQ.battle.current() : null;
    const area = (q && q.areaId) || (ctx && ctx.area && ctx.area.id) || '';
    return elementOf(area);
  }
  // かぶと（そうび・v5.4）を つけて いると、ひっさつわざが N コンボ 早く 出る
  function specialBoost() {
    return (MQ.battle.specialBoost && MQ.battle.specialBoost()) || 0;
  }
  /* オーロラの かぶと（げきレア・v9.0）で わざが 1つ 上に なるか。
     SPECIALS は 上（強い）から ならんで いるので、1つ 前を かえす。
     教科の わざ（いちばん 下）の ときは SPECIALS の いちばん 下＝いなずま おとしへ */
  function specialTierUp() {
    return !!(MQ.battle.specialTierUp && MQ.battle.specialTierUp());
  }
  function specialOf(combo) {
    const c = combo + specialBoost();
    const up = specialTierUp() ? 1 : 0;
    for (let i = 0; i < SPECIALS.length; i++) {
      if (c >= SPECIALS[i].min) return SPECIALS[Math.max(0, i - up)];
    }
    if (c >= TIER1_MIN) return up ? SPECIALS[SPECIALS.length - 1] : ELEMENTS[currentElement()];
    return null;
  }
  /* セットわざ（v14.2・js/content/setwaza.js）：ゲージが いっぱいに なった 正解は コンボの わざの かわりに これ。
     色・詠唱・ポーズ・3D の 動きを ここの 表に 入れて、あとは ひっさつわざと 同じ 流れ（playSpecial）で 出す */
  function setSpecial(id) {
    const sp = MQ.ui.setwaza && MQ.ui.setwaza.sp(id);
    if (!sp) return null;
    FX_COLOR[sp.id] = sp.color; SP_LINES[sp.id] = sp.lines; CI_POSE[sp.id] = sp.pose; SP_MOTION[sp.id] = sp.motion;
    return sp;
  }
  function specialFor(res) {
    const info = res && res.setMove && MQ.battle.setInfo ? MQ.battle.setInfo() : null;
    return (info && setSpecial(info.id)) || specialOf(res ? res.combo || 0 : 0);
  }
  function specialById(id) {
    if (String(id).indexOf('set-') === 0) { const sw = setSpecial(id); if (sw) return sw; }
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

    /* ---- スターバースト ストライク（20コンボ〜・v7.5。名前は v9.5 で 変えた）：
       空に 虹の カーテンが ゆれ、光の 柱が 立ち、雪のような 光が ふる ---- */
    if (sp.id === 'starburst') {
      out.push(h('span', { class: 'fx__sky fx__sky--starburst' }));
      const cur = h('span', { class: 'fx__curtain' });
      ['#7cf9c4', '#4fd3ff', '#c48bff', '#ffd447', '#ff8ec4', '#7cf9c4'].forEach(function (c, i) {
        cur.appendChild(h('i', { style: {
          background: 'linear-gradient(180deg, ' + c + ', rgba(255,255,255,0))',
          left: (10 + i * 66) + 'px', animationDelay: (i * 0.07) + 's'
        } }));
      });
      out.push(cur);
      const pil = h('span', { class: 'fx__pillars' });
      for (let i = 0; i < 5; i++) {
        pil.appendChild(h('i', { style: { left: (i * 22 - 44) + 'px', animationDelay: (0.45 + i * 0.05) + 's' } }));
      }
      out.push(pil);
      out.push(h('span', { class: 'fx__ring fx__ring--starburst' }));
      out.push(sparks(30, 'fx__sparks--starburst', 110, { delay: 0.5 }));
      const fall = h('span', { class: 'fx__fall' });
      for (let i = 0; i < 16; i++) {
        fall.appendChild(h('i', { style: {
          left: (i * 25) + 'px', animationDelay: (0.5 + (i % 6) * 0.09) + 's',
          width: (3 + (i % 3) * 2) + 'px', height: (3 + (i % 3) * 2) + 'px'
        } }));
      }
      out.push(fall);
    }

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
  function playScreenFx(sp, withPal, arenaH, dlt, canvas) {
    if (!d.fxs) return;
    d.fxs.textContent = '';
    d.fxs.className = 'fxscreen fxscreen--' + sp.id + ' fxscreen--t' + sp.tier + (withPal ? ' fxscreen--pal' : '') + (canvas ? ' fxscreen--c' : '');
    /* v12.2 ②：色の 光は アリーナの 中だけ・集中線と わの 中心は てきの 位置・技名の 帯は アリーナの いちばん 下
       （主人公と てきが 見える 場所に よける）。てきの 中心は 画面の px を ステージの 拡大で 割って 出す */
    const c = foeCenter();
    c.y += dlt || 0;
    d.fxs.style.setProperty('--arena-h', (arenaH || (d.arena ? d.arena.offsetHeight : 176)) + 'px');
    d.fxs.style.setProperty('--fs-x', c.x + 'px');
    d.fxs.style.setProperty('--fs-y', c.y + 'px');
    d.fxs.style.setProperty('--sp-ms', sp.ms + 'ms');
    /* v13.6：色の 光・集中線・わ は アリーナの 中に とじこめる（下の カットインに かからない） */
    const clip = h('span', { class: 'fxscreen__clip' });
    d.fxs.appendChild(clip);
    if (sp.tier >= 4 && !canvas) clip.appendChild(h('span', { class: 'fxscreen__dark' }));   // すいこむ あいだは まっくら（Canvas の ときは 背景だけ まっくら＝.arena__spsky）
    if (!canvas) clip.appendChild(h('span', { class: 'fxscreen__tint' }));        // Canvas の ときは 光は Canvas が 出す
    if (sp.tier >= 2) {
      const lines = h('span', { class: 'fxscreen__lines' });
      const n = sp.tier >= 4 ? 28 : sp.tier === 3 ? 20 : 14;
      const base = sp.tier >= 4 ? 0.5 : sp.tier === 3 ? 0.42 : 0;   // 当たる しゅんかんに 合わせる
      for (let i = 0; i < n; i++) {
        lines.appendChild(h('i', { style: { transform: 'rotate(' + (i * 360 / n + (i % 2) * 6) + 'deg)', animationDelay: (base + (i % 3) * 0.04) + 's', height: (700 + (i % 3) * 120) + 'px' } }));
      }
      clip.appendChild(lines);
    }
    if (!canvas && sp.tier >= 3) clip.appendChild(h('span', { class: 'fxscreen__ring' }));
    if (!canvas && sp.tier >= 4) clip.appendChild(h('span', { class: 'fxscreen__ring fxscreen__ring--b' }));
    // 下の 問題の ところは 暗く（カットインの 舞台・v13.6）
    d.fxs.appendChild(h('span', { class: 'fxveil' }));
    // 技名（黒い 帯＋大きな 文字＋星）は いちばん 上に
    d.fxs.appendChild(h('span', { class: 'fxband' }));
    // v14.2：技名は なめらかな ふちの SVG（js/ui/fxtext.js）。8方向の 影（ギザギザ）に もどさない。
    // セットわざは 漢字の 名前の 上に カタカナの ルビ
    const nameCls = sp.set ? 'fxname--set' : sp.tier >= 4 ? 'fxname--max' : sp.tier === 3 ? 'fxname--big' : '';
    d.fxs.appendChild(MQ.ui.fxtext
      ? MQ.ui.fxtext.name(sp.name, sp.id, { size: NAME_SIZE[sp.id] || (sp.set ? 36 : sp.tier >= 4 ? 36 : sp.tier === 3 ? 38 : 34), ruby: sp.ruby, cls: nameCls, raw: !!sp.set, ls: sp.set ? 2 : 1 })
      : h('span', { class: 'fxname ' + nameCls, text: sp.name }));
    const stars = h('span', { class: 'fxstars' });
    [[-150, -6, 0], [148, 2, 0.08], [-112, 26, 0.16], [118, -22, 0.12]].forEach(function (s) {
      stars.appendChild(h('i', { style: { '--x': s[0] + 'px', '--y': s[1] + 'px', animationDelay: s[2] + 's' } }));
    });
    d.fxs.appendChild(stars);
    quake(sp.tier);
  }

  /* いまの てきの 中心（.battle の 左上から の px）。てきが いなければ いままでの 場所（右上 348, 112） */
  function foeCenter() {
    const fb = { x: 348, y: 112 };
    if (!d.cur || !d.root || !d.root.getBoundingClientRect) return fb;
    const img = d.cur.querySelector('.enemy__img, .enemy__img3d') || d.cur;
    const r = img.getBoundingClientRect(), b = d.root.getBoundingClientRect();
    if (!r.width) return fb;
    const k = (MQ.stage && MQ.stage.size) ? (MQ.stage.size().scale || 1) : 1;
    return { x: Math.round((r.left + r.width / 2 - b.left) / k), y: Math.round((r.top + r.height / 2 - b.top) / k) };
  }
  // 画面ぜんたいが ゆれる（1〜5。大きいほど はげしく 長く。5＝スターバースト：一閃で 小さく → 1.3秒の 大ばくはつで 大きく）
  function quake(level) {
    const el = d.root;
    el.classList.remove('is-quake-1', 'is-quake-2', 'is-quake-3', 'is-quake-4', 'is-quake-5');
    void el.offsetWidth;
    el.classList.add('is-quake-' + level);
    clearTimeout(quakeTimer);
    quakeTimer = setTimeout(function () { el.classList.remove('is-quake-' + level); }, level >= 5 ? 2800 : level === 4 ? 1600 : level === 3 ? 1000 : 700);
  }

  // 敵の ふっとび（is-hit より 強い。12コンボ〜は 大きく、16〜は すいこまれて はじける）
  function blast(sp) {
    if (!d.cur) return;
    d.cur.classList.remove('is-blast', 'is-blast-big', 'is-blast-max');
    void d.cur.offsetWidth;
    d.cur.classList.add(sp.tier >= 4 ? 'is-blast-max' : sp.tier >= 3 ? 'is-blast-big' : 'is-blast');
  }

  /* =======================================================
     v13.6 ひっさつわざを 派手に
     （ユーザー「必殺技の 炎や 雷を 3Dか 解像度 あげて 綺麗に」「カットインが 棒立ちで いくぞ だけ」
       「こどもは 派手なの 好き」2026-09-13 → A＋B＋C）
       A＝光る ブロックの 粒（js/ui/fxcanvas.js）。空だけ 暗く して（.arena__spsky・キャラの うしろ）光を 映えさせる
       B＝8コンボ いじょうの わざの あいだ バトル画面を 広げる（grow）。
          高さを ふやした ぶん margin-bottom を マイナスに する＝下の 問題の 大きさは 1px も 変わらない（上に かぶさる だけ）
       C＝カットインは 下の 問題の ところ（アリーナの 下）に 出す＝わざの 動きを かくさない。
          5つの 形（band／slash／face／duo＝相棒と／full＝16コンボ〜）・わざごとの ポーズ・毎回 ちがう せりふ
     ルールは 変えない（見た目だけ）。わざの 長さ（sp.ms）も 変えない。
     ======================================================= */
  const BIG_TIER = 2;        // 8コンボ（いなずま おとし）から 画面を 広げる
  const BIG_RATIO = 0.56;    // 広げた ときの アリーナの 高さ（ステージの 56%）
  const SP_LINES = {
    fire: ['もえろ！', 'ほのおの けん！', 'もえる 一げきだ！'],
    leaf: ['きりさけ！', 'はっぱよ おどれ！', 'みどりの かぜよ！'],
    ice: ['こおりつけ！', 'つめたい やいば！', 'ぜんぶ こおらせる！'],
    wind: ['ふきとべ！', 'たつまきよ おこれ！', 'かぜに なれ！'],
    bolt: ['かみなりよ！', 'しびれろ！', '空から いくぞ！'],
    star: ['ほしよ ふれ！', 'メテオ いくぞ！', 'ひかりの あめだ！'],
    nova: ['ぜんぶの 力を あつめる！', 'これが 本気だ！', 'うちゅうの 力だ！'],
    starburst: ['これで きめる！', 'さいごの 一げき！', 'ほしの 力よ！']
  };
  const PAL_LINES = ['{p}、いっしょに いくぞ！', '{p}と いっしょに！', 'いくぞ、{p}！'];
  const CI_POSE = { fire: 'raise', leaf: 'thrust', ice: 'guard', wind: 'sweep', bolt: 'sky', star: 'point', nova: 'spread', starburst: 'charge' };
  const CI_MS = { 1: 760, 2: 900, 3: 980, 4: 1050, 5: 1150 };   // カットインが 出て いる 長さ
  let ciLast = '', lineLast = '', growT = null, ciForce = null, instantGrow = false, ciLateT = null;
  /* v14.3 カットインを 軽く（ユーザーが 見本で 3案を くらべて「B案でお願いします」2026-09-14）：
       late … 画面が 広がる わざ（8コンボ〜）で カットインを 何 ms あとから 出すか（0＝いつもの とおり すぐ）。
              わざの 1コマめに 描く ものが へって、画面が 広がる 動きが 見える（CPU ×4 で いちばん 長く 止まる 174 → 76〜105ms）
       hero … '3d'（いつもの 3D・面 約300）／'snap'（同じ 3D を 1まいの 絵に した もの・js/ui/cisnap.js）／'flat'（2D の ドット絵）
     見本の ページ（tools/fxcheck/build_cidemo.js）と harness が MQ.ui.battle.ciOption で 切りかえる。
     はじめは 案B（あとから ＋ 1まいの 絵）。CPU ×4 で いちばん 長く 止まる 100 → 50〜67ms・カクッ 5 → 2回（docs/v14.3画面が広がるわざメモ.md）。
     WebGL が ない 端末・絵が まだ できて いない ときは いつもの 3D */
  const ciOpt = { late: 300, hero: 'snap' };
  /* 作る じゅんばん：いまの 教科の わざ（5コンボ）→ いなずま → メテオ → ビッグバン → スターバースト → のこり（セットわざ） */
  function ciPoses() {
    const u = [];
    const add = function (p) { if (p && u.indexOf(p) < 0) u.push(p); };
    try { add(CI_POSE[currentElement()]); } catch (e) {}
    ['bolt', 'star', 'nova', 'starburst'].forEach(function (k) { add(CI_POSE[k]); });
    Object.keys(CI_POSE).forEach(function (k) { add(CI_POSE[k]); });
    return u;
  }
  function ciOption(o) {
    if (o) Object.keys(o).forEach(function (k) { ciOpt[k] = o[k]; });
    if (ciOpt.hero === 'snap' && MQ.ui.ciSnap && ctx && ctx.player) MQ.ui.ciSnap.warm(ctx.player, ciPoses());
    return { late: ciOpt.late, hero: ciOpt.hero };
  }

  function ciLayout(sp, withPal) {
    if (withPal && palNow) return 'duo';
    if (sp.tier >= 4) return 'full';
    const pool = ['band', 'slash', 'face'].filter(function (x) { return x !== ciLast; });
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function pickLine(sp, withPal) {
    const list = withPal && palNow
      ? PAL_LINES.map(function (s) { return s.replace('{p}', palNow.name); })
      : (SP_LINES[sp.id] || ['いくぞ！']);
    const pool = list.filter(function (x) { return x !== lineLast; });
    const s = pool[Math.floor(Math.random() * pool.length)] || list[0];
    lineLast = s;
    return s;
  }
  /* 3D は 見せる 大きさで 作らないと ぼやける（48マス × unit）。大きすぎる unit は 作るのも 描くのも 重いので 4まで（5〜6 は はじめの 1コマが 0.1秒 重く なった） */
  function ciUnit(size) { return Math.max(2, Math.min(4, Math.round(size / 48))); }
  /* v14.2.1 軽く：わざの 字（技名・ルビ・カットインの せりふ・アイテムの わざ名）の 字の ファイルを
     たたかいの はじめに 先に よみこんで おく（document.fonts.load）。
     Google Fonts の 字は 漢字・かなの まとまりごとに 分かれて いて、まだ よみこんで いない 字は
     わざの 1コマめを べつの 字で 描いて、よみこめたら 画面ぜんたいを 計算し直して いた
     （はじめての わざの 出だしで PC 0.05秒・タブレット 0.2秒 ひっかかる＋字が 一しゅん かわる）。
     見た目は 変えない（字の ファイルを 先に 取って おくだけ）。はかり方は tools/fxcheck/fontsdiff.js・whyl.js */
  const fontWarmed = {};
  function fxWarm() {
    if (typeof document === 'undefined' || !document.fonts || !document.fonts.load) return;
    const fit = function (t) { return MQ.text && MQ.text.fit ? MQ.text.fit(t) : t; };
    const list = [];
    SPECIALS.forEach(function (x) { list.push(x.name); });
    Object.keys(ELEMENTS).forEach(function (k) { list.push(ELEMENTS[k].name); });
    Object.keys(SP_LINES).forEach(function (k) { SP_LINES[k].forEach(function (x) { list.push(x); }); });
    PAL_LINES.forEach(function (x) { list.push(x.replace('{p}', palNow ? palNow.name : '')); });
    if (MQ.setwaza && MQ.setwaza.list) MQ.setwaza.list().forEach(function (w) { list.push(w.name, w.ruby || '', (w.lines || []).join('')); });
    if (MQ.treasure && MQ.treasure.powers) MQ.treasure.powers.forEach(function (p) { list.push(p.name + '！'); });
    list.push('0123456789 コンボ！ ひっさつ！カウンター！セットわざ！');
    const seen = {};
    let text = '';
    list.forEach(function (t) { [t, fit(t)].forEach(function (u) { for (const ch of String(u)) { if (!seen[ch] && !fontWarmed[ch]) { seen[ch] = 1; text += ch; } } }); });
    if (!text) return;
    for (const ch of text) fontWarmed[ch] = 1;
    try { document.fonts.load("36px 'Mochiy Pop One'", text).catch(function () {}); } catch (e) { /* 字の ファイルが なくても わざは 出る */ }
  }
  /* はじめての わざで 1コマ ひっかからない ように、たたかいの はじめに 作って おく（しまって おくだけ） */
  function ciWarm(player) {
    setTimeout(fxWarm, 600);   // v14.2.1：わざの 字を 先に よみこむ（3D が なくても）
    if (!V3() || !MQ.ui.v3) return;
    if (ciOpt.hero === 'snap' && MQ.ui.ciSnap && MQ.ui.ciSnap.ok()) { setTimeout(function () { MQ.ui.ciSnap.warm(player, ciPoses()); }, 1200); return; }   // v14.3 案B：ポーズごとの 絵を 1つずつ 作って おく（WebGL が なければ 下の いつもの 3D を 用意）
    setTimeout(function () {
      if (!d || !d.root) return;
      const hold = h('div', { class: 'ciwarm' });
      try { hold.appendChild(MQ.ui.v3.hero(player, 192, { ry: 22, unit: 4, mo: 'mo-ci' })); } catch (e) {}
      d.root.appendChild(hold);
      setTimeout(function () { hold.remove(); }, 250);   // 絵を 1回 描けば 読みこみは のこる
    }, 900);
  }
  /* カットインの 主人公（3D は ポーズつき。部品の 回し方は css/specialfx.css の ci-pose-*） */
  function ciFigure(sp, size) {
    const pose = 'ci-pose-' + (CI_POSE[sp.id] || 'raise');
    if (V3() && MQ.ui.v3 && ciOpt.hero === 'snap' && MQ.ui.ciSnap) {   // v14.3 案B：1まいの 絵（まだ できて いなければ いつもの 3D）
      const snap = MQ.ui.ciSnap.get(ctx.player, CI_POSE[sp.id] || 'raise', size);
      if (snap) return snap;
    }
    if (V3() && MQ.ui.v3 && ciOpt.hero !== 'flat') {
      const sc = MQ.ui.v3.hero(ctx.player, size, { ry: 22, unit: ciUnit(size), mo: 'mo-ci', cls: 'ci__fig ' + pose });
      if (sc) return sc;
    }
    const img = h('img', { class: 'ci__img ' + pose, alt: '' });
    img.src = MQ.hero.sprite(ctx.player);
    return img;
  }
  function cutIn(sp, withPal, arenaH) {
    if (!d.fxs) return;
    const lay = ciForce || ciLayout(sp, withPal);
    ciLast = lay;
    const lower = (d.root.offsetHeight || 700) - arenaH;
    const hgt = lay === 'full' ? Math.max(140, lower - 6) : Math.max(120, Math.min(236, lower - 18));
    const box = h('div', { class: 'ci ci--' + lay + ' ci--' + sp.id + ' ci--t' + sp.tier + (withPal ? ' ci--pal' : '') });
    box.style.setProperty('--el', FX_COLOR[sp.id] || '#ffd447');
    box.style.setProperty('--ci-h', hgt + 'px');
    box.style.setProperty('--ci-ms', (CI_MS[sp.tier] + (withPal ? 150 : 0)) + 'ms');
    box.appendChild(h('span', { class: 'ci__bg' }));
    box.appendChild(h('span', { class: 'ci__speed' }));
    const win = h('span', { class: 'ci__win' });
    const heroBox = h('span', { class: 'ci__hero' });
    const fig = lay === 'face' ? Math.round(hgt * 1.6) : lay === 'full' ? Math.round(Math.min(hgt * 0.86, 240)) : lay === 'duo' ? Math.round(hgt * 1.0) : Math.round(hgt * 1.15);
    heroBox.style.setProperty('--fig', fig + 'px');
    heroBox.appendChild(ciFigure(sp, fig));
    win.appendChild(heroBox);
    box.appendChild(win);
    if (lay === 'duo' && palNow) {
      const pb = h('span', { class: 'ci__pal' });
      const size = Math.round(hgt * 0.78);
      pb.appendChild((V3() && MQ.ui.v3.monster(palNow.id, size, { ry: 22, mo: 'mo-menace', cls: 'ci__palfig' })) || MQ.enemies.node(palNow.id, { size: size }));
      win.appendChild(pb);
      box.appendChild(h('span', { class: 'ci__div' }));
    }
    box.appendChild(h('span', { class: 'ci__tx', text: pickLine(sp, withPal) }));
    box.appendChild(h('span', { class: 'ci__shine' }));
    d.fxs.appendChild(box);
  }

  /* B：バトル画面を 広げる／もどす。広げた ぶん（px）を かえす。
     v14.3 なめらかに（ユーザー「画面が 大きくなる 必殺技が 多少 カクつく。クオリティは 下げないで」）：
     前は 高さ（height）と margin-bottom を 0.28秒 アニメして いた＝毎コマ メインで レイアウト・描き直し・層の つみ直しを して、
     広がる アリーナの 絵（空・遠景・ゆか）を GPU で 毎コマ 描き直して いた。わざの はじめの いちばん 重い コマと かさなる。
     いまは 高さを さいしょに 広げた あとの 大きさに して、見た目が 前と 同じに なる ように 3つを 同じ 時間・同じ 速さで 動かす
     （translate／scale だけ＝GPU が 動かす。メインが いそがしくても 動きは 止まらない・アリーナの 絵は 1回 描くだけ）：
       ① アリーナを 上に ずらして おいて もどす＝下の へり（と かげ）が のびて いく ように 見える（上は 画面の 外で 見えない）
       ② 上に くっついて いる もの（上の バー・ボスの パネル・コンボ・ためゲージ・帯）は 反対に ずらす＝その 場所に のこる
       ③ 空の グラデーション（空・ボスの 暗さ・わざの 暗い 空）は 下を 中心に のばす＝前と 同じ 色の ならび
     下に くっついて いる もの（地面・遠景・主人公・てき・相棒・ふきだし・アイテムボタン）は ①と いっしょに 動くので 何も しない。
     ゆれ（is-shake）・コンボの ポン と ぶつからない ように、transform では なく 1つずつの プロパティ（translate／scale）を 動かす。
     前と あとを 同じ 時間で 止めて 撮って くらべた＝ちがうのは 動いて いる あいだの 1px みまんの ふちだけ（harness #growshot）。
     わざの 光・集中線・技名は 前と 同じく 広げた あとの 場所（動きの はじまりも 前と 同じ）。 */
  const GROW_MS = 280, GROW_EASE = 'cubic-bezier(.2,.85,.25,1)';
  const GROW_PIN = ':scope > .arena__top, :scope > .bossinfo, :scope > .combo, :scope > .charge, :scope > .counterbanner, :scope > .fx > .palbanner, :scope > .fx > .modebanner';   // 雲（.cloud--c）は 大きさ 0 で 見えない ので 入れない
  const GROW_SKY = ':scope > .arena__bg > .arena__sky, :scope > .arena__bg > .arena__dusk, :scope > .arena__bg > .arena__spsky';
  let growAnims = [], growDlt = 0;
  function growGpu(a) {
    try {
      return !!(a.animate && window.CSS && CSS.supports && CSS.supports('translate', '0 1px') && CSS.supports('scale', '1 .5') &&
        !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));
    } catch (e) { return false; }
  }
  function growStop() { growAnims.forEach(function (x) { try { x.cancel(); } catch (e) {} }); growAnims = []; growDlt = 0; }
  /* 動きを 1つ 足す。あとから 足す もの（とちゅうで 出た 相棒の 帯）は はじまりの 時間を そろえる */
  function growAdd(el, kf) {
    if (!el || !el.animate) return;
    try {
      const an = el.animate(kf, { duration: GROW_MS, easing: GROW_EASE });
      const lead = growAnims[0];
      if (lead && lead.startTime !== null) an.startTime = lead.startTime;
      growAnims.push(an);
    } catch (e) {}
  }
  /* ② 広がって いる とちゅうに あとから 足した 上の もの（相棒の 帯）も その 場所に のこす */
  function growFollow(el) {
    if (!growDlt || !growAnims.length || growAnims[0].playState === 'finished') return;
    growAdd(el, [{ translate: '0 ' + growDlt + 'px' }, { translate: '0 0' }]);
  }
  function grow(on, now) {
    const a = d && d.arena;
    if (!a) return 0;
    clearTimeout(growT);
    if (on) {
      const base = a.classList.contains('is-big') ? (+a.dataset.base || a.offsetHeight) : a.offsetHeight;
      const big = Math.round(Math.max(base, (d.root.offsetHeight || 700) * BIG_RATIO));
      const dlt = big - base;
      if (dlt < 8) return 0;
      growStop();
      a.dataset.base = base;
      if (!instantGrow && !growGpu(a)) {
        // むかしの ブラウザ（translate / scale が ない）：前と 同じ 高さの アニメ
        a.style.height = base + 'px';
        a.style.marginBottom = '0px';
        a.classList.add('is-big', 'is-growcss');
        void a.offsetHeight;
        a.style.height = big + 'px';
        a.style.marginBottom = (-dlt) + 'px';
        return dlt;
      }
      a.classList.add('is-big');
      a.style.height = big + 'px';
      a.style.marginBottom = (-dlt) + 'px';
      if (instantGrow) return dlt;   // harness（virtual-time）は すぐ 広げる
      // すぐ 作る（この あとの 場所の はかり（boxOf・foeCenter）は 前と 同じく 広げる 前の 見た目で はかる）
      growAdd(a, [{ translate: '0 ' + (-dlt) + 'px' }, { translate: '0 0' }]);
      a.querySelectorAll(GROW_PIN).forEach(function (el) { growAdd(el, [{ translate: '0 ' + dlt + 'px' }, { translate: '0 0' }]); });
      a.querySelectorAll(GROW_SKY).forEach(function (el) { growAdd(el, [{ scale: '1 ' + (base / big) }, { scale: '1 1' }]); });
      growDlt = dlt;
      return dlt;
    }
    if (!a.classList.contains('is-big')) return 0;
    growStop();
    const done = function () { a.classList.remove('is-big', 'is-growcss'); a.style.height = ''; a.style.marginBottom = ''; delete a.dataset.base; };
    if (now) { done(); return 0; }
    a.classList.add('is-growcss');
    a.style.height = a.dataset.base + 'px';
    a.style.marginBottom = '0px';
    growT = setTimeout(done, 320);
    return 0;
  }
  function skyOn(id) { if (d.spsky) { d.spsky.setAttribute('data-sp', id); d.spsky.classList.add('is-on'); } }
  function skyOff() { if (d && d.spsky) d.spsky.classList.remove('is-on'); }

  /* 画面の 中の ものの まん中と 大きさ（.battle の 左上から の ステージ px）。dlt＝広げて 下に ずれる ぶん */
  function boxOf(el, dlt) {
    if (!el || !d.root || !d.root.getBoundingClientRect) return null;
    const r = el.getBoundingClientRect(), b = d.root.getBoundingClientRect();
    if (!r.width) return null;
    const k = (MQ.stage && MQ.stage.size) ? (MQ.stage.size().scale || 1) : 1;
    return { x: (r.left + r.width / 2 - b.left) / k, y: (r.top + r.height / 2 - b.top) / k + (dlt || 0), w: r.width / k, h: r.height / k };
  }

  function playSpecial(sp, withPal) {
    if (!d.fx) return;
    clearTimeout(fxTimer);
    const fxc = MQ.ui.fxc;
    const canvas = !!(fxc && fxc.attach(d.root) && fxc.ok() && fxc.has(sp.id));
    d.fx.textContent = '';
    d.fx.className = 'fx fx--' + sp.id + ' fx--t' + sp.tier;
    const base = d.arena.offsetHeight;
    const dlt = sp.tier >= BIG_TIER ? grow(true) : 0;
    const arenaH = base + dlt;
    if (canvas) {
      skyOn(sp.id);
      const foe = d.cur ? (d.cur.querySelector('.enemy__img3d, .enemy__img') || d.cur) : null;
      fxc.play(sp.id, { foe: boxOf(foe, dlt), hero: boxOf(d.hero.querySelector('.hero__img3d') || d.heroImg, dlt), height: arenaH });
    } else {
      buildFx(sp).forEach(function (el) { d.fx.appendChild(el); });
    }
    playScreenFx(sp, withPal, arenaH, dlt, canvas);
    clearTimeout(ciLateT);
    if (ciOpt.late && sp.tier >= BIG_TIER) ciLateT = setTimeout(function () { if (d && d.fxs) cutIn(sp, withPal, arenaH); }, ciOpt.late);   // v14.3 案A
    else cutIn(sp, withPal, arenaH);
    MQ.sfx.special(sp.tier, sp.id);
    if (!canvas) flash(true);
    if (d.msg) d.msg.classList.add('is-quiet');   // 技名と ぶつからないように
    if (d.arena) d.arena.classList.add('is-cutin');
    fxTimer = setTimeout(function () { endSpecial(false); }, sp.ms);
  }
  /* わざの おわり。now＝すぐ 消す（つぎの 問題が 出た とき）。
     広げた 画面は わざの おわりでは もどさず、つぎの 問題が 出る しゅんかんに いっしょに もどす
     （ゆっくり もどすと 3D の 画面を 毎コマ 描きなおして 0.1秒 ひっかかる・実測 v13.6） */
  function endSpecial(now) {
    if (!d) return;
    clearTimeout(fxTimer);
    if (now) clearTimeout(ciLateT);   // v14.3：あとから 出す カットインが のこって いたら 出さない
    if (now && d.fxs) { d.fxs.textContent = ''; d.fxs.className = 'fxscreen'; }   // わざの おわり（now でない）は CSS で もう 見えない ので 消さない（3D の カットインを 消すと 1コマ 重い）
    if (now && d.fx && /\bfx--t\d/.test(d.fx.className)) { d.fx.textContent = ''; d.fx.className = 'fx'; }
    if (d.msg && !now) d.msg.classList.remove('is-quiet');
    if (d.arena) d.arena.classList.remove('is-cutin');
    skyOff();
    if (now) grow(false, true);
    if (MQ.ui.fxc) { if (now) MQ.ui.fxc.stop(); else MQ.ui.fxc.fade(); }
  }

  /* いまの 相棒を 画面に 出す（いなければ かくす） */
  /* 主人公の 絵を はりかえる。
     オーロラの そうびを 5点 そろえて つけて いたら **光る**（げきレア・v9.0）。
     自まん できる ように バトル・地図（HUD）・けっか画面の どこでも 光る。 */
  function setHero(player) {
    d.heroImg.src = MQ.hero.sprite(player);
    const on = !!(MQ.hero.hasAuroraSet && MQ.hero.hasAuroraSet(player));
    d.hero.classList.toggle('is-gearaura', on);
    /* りったい（v12.0）：2D の 絵は かくして、同じ 場所に 3D の 器を おく。せっていを 切れば 2D に もどる */
    const v3 = V3();
    if (d.root) d.root.classList.toggle('is-3d', v3);
    const old = d.hero.querySelector('.v3scene');
    if (old) old.remove();
    d.heroImg.hidden = v3;
    const sc3 = v3 ? MQ.ui.v3.hero(player, 84, { ry: 22, mo: 'mo-idle', cls: 'hero__img3d' }) : null;
    if (sc3) d.hero.insertBefore(sc3, d.heroImg);
    /* v13.19：同じ グレードを 5点 そろえて いると グレードごとの オーラ（js/ui/gearaura.js）。
       3D の ときは 器（.v3scene）の 中に 入れる＝こうげきで 走っても いっしょに 動く */
    if (MQ.ui.gearAura) {
      Array.prototype.slice.call(d.hero.querySelectorAll(':scope > .gaura')).forEach(function (e) { e.remove(); });
      d.hero.classList.toggle('has-gaura', !!MQ.ui.gearAura.attach(sc3 || d.hero, player, 1));
    }
    /* v12.5 軽く：3D の あいだ 2D の 絵は hidden なので、カットイン（tier ≥ 3）で はじめて デコードされて 1コマ ひっかかる → 先に デコードして おく */
    if (v3 && window.Image) { try { const pre = new Image(); pre.src = d.heroImg.src; if (pre.decode) pre.decode().catch(function () {}); } catch (e) {} }
    ciWarm(player);   // v13.6：カットインの 3D を 先に 作る
  }

  function syncPal(player) {
    const cur = MQ.pals ? MQ.pals.active(player) : null;
    palNow = cur;
    d.pal.hidden = !cur;
    d.palBox.innerHTML = '';
    if (!cur) return;
    d.palBox.appendChild((V3() && MQ.ui.v3.monster(cur.id, 40, { ry: 22, mo: 'mo-title', cls: 'pal__img3d' })) || MQ.enemies.node(cur.id, { size: 40, cls: 'pal__img' }));
    d.palName.textContent = cur.name + ' Lv.' + cur.lv;
    d.palGauge.innerHTML = '';
    const need = MQ.battle.palGaugeNeed ? MQ.battle.palGaugeNeed() : 3;
    for (let i = 0; i < need; i++) d.palGauge.appendChild(h('span', { class: 'pal__dot' }));
    syncPalGauge();
  }

  /* なかまゲージの 玉を ぬる（正解で たまる・まちがえても へらない・v5.2） */
  function syncPalGauge() {
    if (!d.palGauge || d.pal.hidden) return;
    const now = MQ.battle.palGauge ? MQ.battle.palGauge() : 0;
    const dots = d.palGauge.children;
    for (let i = 0; i < dots.length; i++) dots[i].classList.toggle('is-on', i < now);
  }

  /* 追い打ちの ときの 帯（「〇〇の こうげき！」）。
     ふきだしと かさならない ように、出ている あいだは ふきだしを 消す */
  function palBanner(name) {
    const b = h('div', { class: 'palbanner', text: name + 'の こうげき！' });
    d.fx.appendChild(b);
    growFollow(b);   // v14.3：画面が 広がって いる とちゅうでも その 場所に のこる
    if (d.msg) d.msg.classList.add('is-quiet');
    setTimeout(function () {
      b.remove();
      if (d.msg) d.msg.classList.remove('is-quiet');
    }, 900);
  }

  /* 3問 れんぞく 正解 → 相棒の 追い打ち。前に 出て ぶつかって もどる */
  function palAttack() {
    if (!palNow || d.pal.hidden) return;
    palBanner(palNow.name);
    const joining = V3() && Date.now() < palJoinUntil;   // ③ わざに 合わせて 走って いる さいちゅうは そちらに まかせる
    if (!joining) {
      d.pal.classList.remove('is-hit');
      void d.pal.offsetWidth;
      d.pal.classList.add('is-hit');
      if (V3()) MQ.ui.v3.play(d.pal, 'mo-attack', 600);
    }
    MQ.sfx.palHit();
    const s = h('span', { class: 'pal__slash' });
    d.fx.appendChild(s);
    setTimeout(function () { s.remove(); d.pal.classList.remove('is-hit'); }, 700);
  }

  /* ---------------------------------------------------------
     こうげきの 演出（v7.5）

     ① 斬撃の 弧 … 教科の 色で 光る 三日月が 敵の ところに 走る
     ② 着弾 … 白い 光の つぶが はじけ、敵が 一瞬 まっ白に、画面が ぐっと 寄る
     ③ モーション 3種 … 斬る／突く／たたく を じゅんばんに
     ④ コンボで 育つ … 2〜 弧が 大きく、4〜 2連斬り
     ⑤ とどめ … さいごの ザコ・ボスを たおす 一発は ゆっくり 大きく
     --------------------------------------------------------- */
  const MOTIONS = ['slash', 'thrust', 'smash'];   // ③ じゅんばんに 出す
  let motionNo = 0;

  /* ① 斬撃の 弧。敵に かさねる（教科の 色・コンボで 大きく）*/
  function slashArc(el, opts) {
    if (!d.cur) return;
    const o = opts || {};
    const arc = h('span', { class: 'slash slash--' + (o.motion || 'slash') });
    arc.style.setProperty('--el', FX_COLOR[el] || '#ffd447');
    if (o.big) arc.classList.add('slash--big');
    if (o.delay) arc.style.animationDelay = o.delay + 'ms';
    d.cur.appendChild(arc);
    setTimeout(function () { if (arc.parentNode) arc.parentNode.removeChild(arc); }, 560 + (o.delay || 0));
  }

  /* ② 着弾の つぶ（白い 四角が 外に はじける）。
     **名前は hitSparks**。sparks は ひっさつわざが すでに 使って いる
     （同じ IIFE の 中で 同じ 名前の function を 作ると 上書きして しまう）*/
  function hitSparks(n) {
    if (!d.cur) return;
    const box = h('span', { class: 'sparks' });
    const count = n || 5;
    for (let i = 0; i < count; i++) {
      const p = h('i', { class: 'sparks__p' });
      const a = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const r = 18 + Math.random() * 14;
      p.style.setProperty('--dx', Math.round(Math.cos(a) * r) + 'px');
      p.style.setProperty('--dy', Math.round(Math.sin(a) * r) + 'px');
      p.style.animationDelay = Math.round(Math.random() * 60) + 'ms';
      box.appendChild(p);
    }
    d.cur.appendChild(box);
    setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 560);
  }

  /* ② 敵が 一瞬 まっ白に */
  function whiteOut() {
    if (!d.cur) return;
    const img = d.cur.querySelector('.enemy__img');
    if (!img) return;
    img.classList.remove('is-white');
    void img.offsetWidth;
    img.classList.add('is-white');
    setTimeout(function () { img.classList.remove('is-white'); }, 120);
  }

  /* ② 画面が ほんの 少し 寄る（当たった 手ごたえ）*/
  function punch(strong) {
    if (!d.arena) return;
    d.arena.classList.remove('is-punch', 'is-punch-big');
    void d.arena.offsetWidth;
    d.arena.classList.add(strong ? 'is-punch-big' : 'is-punch');
    setTimeout(function () { d.arena.classList.remove('is-punch', 'is-punch-big'); }, strong ? 200 : 140);
  }

  function attack(crit, boss, sp, opts) {
    const o = opts || {};
    const combo = o.combo || 0;
    const el = currentElement();
    const motion = MOTIONS[motionNo++ % MOTIONS.length];        // ③
    const fin = !!o.finish;                                     // ⑤ とどめ

    d.hero.classList.remove('is-attack', 'is-special', 'is-finish',
      'atk--slash', 'atk--thrust', 'atk--smash');
    void d.hero.offsetWidth;
    d.hero.classList.add('is-attack', 'atk--' + motion);
    if (fin) d.hero.classList.add('is-finish');
    d.hero.style.setProperty('--el', FX_COLOR[sp ? sp.id : el] || '#ffd447');

    if (sp) {
      d.hero.classList.add('is-special');
      playSpecial(sp, !!o.withPal);          // ⑧ 相棒と いっしょ
      setTimeout(function () { d.hero.classList.remove('is-special'); }, 900);
    } else if (crit) { MQ.sfx.crit(); flash(false); } else { MQ.sfx.slash(); }
    if (!d.cur) return;
    d.cur.classList.remove('is-appear', 'is-enrage');
    d.cur.classList.add('is-hit');
    if (V3()) {
      if (sp) specialMotion(sp, d.cur);
      else {
        MQ.ui.v3.dashTo(d.hero, d.cur);
        MQ.ui.v3.play(d.hero, 'mo-attack', 480);
        const foe = d.cur;
        setTimeout(function () { MQ.ui.v3.play(foe, 'mo-hurt', 520); }, 200);
      }
    }
    if (sp) blast(sp);

    // ①④ 斬撃の 弧（ひっさつの ときは 大きな 演出が あるので 出さない）
    if (!sp) {
      const big = fin || combo >= 2;
      slashArc(el, { motion: motion, big: big });
      if (combo >= 4 || fin) slashArc(el, { motion: motion, big: big, delay: 120 });
      const at = motion === 'smash' ? 210 : 150;
      setTimeout(function () {
        whiteOut();
        hitSparks(fin ? 8 : (combo >= 4 ? 7 : 5));
        punch(fin || crit);
      }, at);
      if (fin) MQ.sfx.finish();
    }
    stamp(true);
    shake(crit || boss || !!sp);
    setTimeout(function () {
      if (!d.cur) return;
      d.cur.classList.remove('is-hit');
      if (!boss && !d.cur.classList.contains('is-down')) {
        d.cur.classList.add('is-down');
        if (V3()) MQ.ui.v3.play(d.cur, 'mo-fall');
        MQ.sfx.defeat();
      }
    }, sp ? (V3() && SP_MOTION[sp.id] ? SP_MOTION[sp.id].down : (sp.tier >= 4 ? 750 : sp.tier === 3 ? 600 : 420)) : 420);   // 大きな わざは 当たるのが おそい（3D は やられ方を 見せて から）
  }

  /* v12.2 ①：ひっさつわざ ごとの 3D の 動き。主人公＝mo-sp-<id>（器は SP_MOTION.scene）、てき＝mo-hit-<id>
     （当たる 前から つけて おく。やられ方は CSS の animation-delay で 当たる 時間に 始まる＝harness で 止めて 撮っても 正しい） */
  function specialMotion(sp, foe) {
    const m = SP_MOTION[sp.id];
    if (!m) { MQ.ui.v3.dashTo(d.hero, foe); MQ.ui.v3.play(d.hero, 'mo-attack', 480); return; }
    if (m.scene) MQ.ui.v3.dashTo(d.hero, foe);
    const mo = m.mo || sp.id;   // セットわざ（v14.2）は ひっさつわざの 動きを 借りる
    MQ.ui.v3.play(d.hero, 'mo-sp-' + mo, sp.ms, { scene: m.scene, ms: sp.ms });
    if (foe) MQ.ui.v3.play(foe, 'mo-hit-' + mo, sp.ms);
    palJoin(sp, foe, m);
  }

  /* ③ 相棒の きょりと 時間を CSS に わたして 走らせる。
     --pdash＝行き先（follow＝主人公の 走った 先の 48px 左／flank＝てきの 右はしより 22px 左）
     --pdelay＝器の 動きの はじまり（follow は 0.35秒で つく・flank は 0.58秒で 着地 → 当たる 時間から 引く）
     --phit＝とび出し（0.5秒・山は 0.275秒）の はじまり */
  function palJoin(sp, foe, m) {
    if (!palNow || !d.pal || d.pal.hidden || !foe) return;
    const ps = MQ.ui.v3.sceneOf(d.pal), hs = MQ.ui.v3.sceneOf(d.hero);
    if (!ps || !hs) return;
    const k = (MQ.stage && MQ.stage.size) ? (MQ.stage.size().scale || 1) : 1;
    const img = foe.querySelector('.enemy__img, .enemy__img3d') || foe;
    const pr = ps.getBoundingClientRect(), hr = hs.getBoundingClientRect(), fr = img.getBoundingClientRect();
    const flank = sp.tier >= 3;
    const palHit = m.palHit || m.hit;
    let px;
    if (flank) px = (fr.right - pr.left) / k - 22;
    else px = (hr.left - pr.left) / k + (parseFloat(hs.style.getPropertyValue('--dash')) || 0) - 48;
    ps.style.setProperty('--pdash', Math.max(20, Math.round(px)) + 'px');
    ps.style.setProperty('--pdelay', (palHit - (flank ? 600 : 500)) + 'ms');
    ps.style.setProperty('--phit', (palHit - 200) + 'ms');
    MQ.ui.v3.play(d.pal, 'mo-pal-sp', sp.ms, { scene: flank ? 'mo-pal-flank' : 'mo-pal-follow' });
    palJoinUntil = Date.now() + sp.ms;
  }

  /* ⑤ とどめ か（さいごの ザコ／ボスを たおした 一発）*/
  function isFinisher(res) {
    if (!res) return false;
    if (res.defeated) return true;                       // ボスを たおした
    if (MQ.battle.phase() === 'boss') return false;
    return MQ.battle.mobIndex() >= MQ.battle.mobTotal() - 1;   // ザコの さいご
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
    if (V3()) MQ.ui.v3.play(d.hero, 'mo-hurt', 550);
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
      gear: null, densetsu: [], treasure: null, gold: false, pal: null, palOffer: null,
      frags: [], titles: [], best: null, fullSet: null,
      missions: null
    };

    MQ.save.update(function (p) {
      // レベルの ごほうび（v13.15）：けいけんちを 足す 前に「どこまで はらったか」を そろえる
      if (MQ.levelup) MQ.levelup.init(p);
      p.xp += sum.xp;
      p.battles = (p.battles || 0) + 1;
      p.defeated = (p.defeated || 0) + sum.defeated.length;
      p.coins = Math.max(0, (p.coins || 0) + (sum.coins || 0) - (sum.coinsSpent || 0));
      // しょうごう用の カウンター
      p.itemUses = (p.itemUses || 0) + ((sum.itemsUsed || []).length);
      if (sum.fastBonus) p.fastCount = (p.fastCount || 0) + 1;
      if ((sum.maxCombo || 0) > (p.bestCombo || 0)) p.bestCombo = sum.maxCombo;
      p.revengeWins = (p.revengeWins || 0) + (sum.revengeBeaten || []).length;
      p.counters = (p.counters || 0) + (sum.counters || 0);   // カウンター（v7.7・しょうごう用）
      p.elites = (p.elites || 0) + (sum.elites || 0);         // 中ボス・弱点（v8.1・しょうごう用）
      p.weakHits = (p.weakHits || 0) + (sum.weakHits || 0);
      // まじん・あんこく（v14.11）：ごちゃまぜで ボスを たおした 数・本気で ボスを たおした 数
      if (sum.bossBeaten && !ctx.tokkun) {
        if (ctx.mix) p.mixWins = (p.mixWins || 0) + 1;
        if (sum.bossHard) p.hardWins = (p.hardWins || 0) + 1;
      }
      // フィーバー教科（v7.2）：教科ごとの たたかった 回数（いちばん やって いない 教科を さがす ため）
      if (MQ.fever && !ctx.tokkun && !ctx.stage.tower && !ctx.mix) MQ.fever.addPlay(p, ctx.area.id);
      // とくい・にがて（v7.1）：1問ごとの 結果を 単元ごとに ためる（おうちの人ページ用）
      if (MQ.stats) MQ.stats.record(p, sum);
      // きょうの ミッション（v3.1）：進めて、クリアぶんの コイン・けいけんちは その場で
      if (MQ.missions) out.missions = MQ.missions.progress(p, sum, { areaId: ctx.tokkun ? null : ctx.area.id, stageId: ctx.stage.id });
      // 図かんを 先に ふやす（v5.2）。なかまの「3回 たおしたら かならず」が
      // この たたかいの ぶんも 数えられる ように、なかまの 処理より 先に やる
      if (!p.dexNew) p.dexNew = {};
      sum.defeated.forEach(function (id) {
        if (id === 'chest') return;
        if (!p.dex[id]) p.dexNew[id] = true;     // はじめて 出会った → ずかんで NEW
        p.dex[id] = (p.dex[id] || 0) + 1;
      });
      // なかま（v4.3）：けいけんちの 半分が 相棒にも 入る／たおした 中から「なかまに なりたい」1体
      if (MQ.pals) {
        // なかまの くすり（v5.4）で 相棒の けいけんちが ばいに なる
        // なかま まつり（v13.16・しゅうまつ イベント）：相棒の けいけんち 2ばい・なかまに なりたがる 見こみ 2ばい
        const wkp = (!ctx.tokkun && ctx.weekend) ? ctx.weekend : null;
        out.pal = MQ.pals.gain(p, Math.round(sum.xp * (sum.palXpMul || 1) * ((wkp && wkp.palXp) || 1)));
        out.palOffer = MQ.pals.offerFrom(p, sum.defeated, null, (wkp && wkp.palOffer) || 1);
      }

      /* ---- ★ と じぶんの さいこう記ろく（ごちゃまぜ バトルには つかない・v7.3） ---- */
      if (!ctx.tokkun && !ctx.mix) {
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
        // 塔で にげた 敵は 'tower' に 入って いる（塔の 問題に areaId が ない）。ここも 消さないと とっくんに ずっと のこる
        MQ.content.subjectAreas().map(function (a) { return a.id; }).concat(['tower']).forEach(function (id) {
          MQ.save.removeEscaped(p, id, key);
        });
      });
      /* ふくしゅう（v11.1）
           ・1回めで 正解した ふくしゅう問題 → おぼえた ので 消す
           ・この たたかいで 1回めに まちがえた 問題 → つぎの たたかいに もどす
           ・2回 まちがえて にげられた ぶんは リベンジに ひっこす ので ここから 消す */
      if (MQ.review) {
        (sum.reviewDone || []).forEach(function (key) { MQ.review.done(p, key); });
        (sum.escaped || []).forEach(function (en) { MQ.review.done(p, en.key); });
        if (!ctx.tokkun && !ctx.stage.tower) {
          const gone = {};
          (sum.escaped || []).forEach(function (en) { gone[en.key] = true; });
          (sum.review || []).forEach(function (en) {
            if (gone[en.key]) return;
            const rArea = en.areaId || ctx.area.id;
            // ボスの 問題は ザコの すがたで もどす（にげた敵と 同じ）。ボスの まま だと たおして「ボスを たおした」に なる
            if (String(en.enemyId).indexOf('boss-') === 0) en.enemyId = MQ.enemies.pickIds(rArea, 1)[0];
            MQ.review.add(p, rArea, en);
          });
        }
      }
      p.reviewWins = (p.reviewWins || 0) + (sum.reviewHits || 0);

      sum.escaped.forEach(function (en) {
        const areaId = en.areaId || ctx.area.id;
        // ボスの問題は、つぎは ザコの姿で もどってくる
        // ゴールデンスライムも ザコの すがたで もどす（ゴールデンの まま だと リベンジで コインを 何度でも もらえる）
        if (String(en.enemyId).indexOf('boss-') === 0 || en.enemyId === MQ.enemies.goldenId()) en.enemyId = MQ.enemies.pickIds(areaId, 1)[0];
        en.areaId = areaId;
        MQ.save.addEscaped(p, areaId, en);
      });

      /* ---- そうび（グレード1〜3。★2以上で 1つずつ） ---- */
      if (sum.stars >= 2 && !ctx.tokkun && !ctx.mix) {
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

      /* ---- ぴかぴか あつめ（v13.16）：ぴかぴかを 5こ あつめる たびに カプセルの むりょうけん ---- */
      if (MQ.pika) {
        out.pika = MQ.pika.claim(p);
        if (out.pika.tickets || out.pika.coins) MQ.save.addLog(p, 'ぴかぴかを ' + out.pika.count + 'こ あつめた！' + (out.pika.tickets ? ' むりょうけん ' + out.pika.tickets + 'まい' : ' コイン +' + out.pika.coins));
        out.pikaTr = (!ctx.tokkun && !ctx.mix) ? MQ.pika.stageTreasure(p, ctx.stage.id) : null;
      }

      /* ---- まなびの かけら（エリアで ★8） ---- */
      MQ.content.subjectAreas().forEach(function (area) {
        if (MQ.content.hasFrag(p, area.id)) return;
        if (!MQ.content.fragReady(p, area)) return;
        p.frags[MQ.content.fragKey(area.id, p)] = true;
        out.frags.push(area);
        const g = MQ.hero.nextDensetsu(p);
        if (g) { p.gear.push(g.id); p.equipped[g.slot] = g.id; out.densetsu.push(g); }
        MQ.save.addLog(p, area.name + ' の まなびの かけらを 手に入れた');
      });

      /* ---- ラスボスを たおした → でんせつ 一式の さいごの1点
             でんせつが そろっていたら「やみ」の 一式を 1点ずつ（v5.4） ---- */
      if (sum.bossBeaten && ctx.stage.tower) {
        const g = MQ.hero.nextDensetsu(p) || MQ.hero.nextYami(p);
        if (g) { p.gear.push(g.id); p.equipped[g.slot] = g.id; out.densetsu.push(g); }
        MQ.save.addLog(p, MQ.content.towerName().replace(' ', '') + 'で ' + MQ.content.lastBoss().name + 'を たおした！');
      }

      /* ---- ほし の 一式：★3の ステージが 3・6・9・12・15 に なったとき（v5.4） ---- */
      if (!ctx.tokkun && !ctx.mix) {
        const star3 = Object.keys(p.stars || {}).filter(function (k) { return p.stars[k] >= 3; }).length;
        const g = MQ.hero.nextHoshi(p, star3);
        if (g) {
          p.gear.push(g.id); p.equipped[g.slot] = g.id; out.densetsu.push(g);
          MQ.save.addLog(p, '★を あつめて ' + g.name + ' を 手に入れた');
        }
      }

      /* ---- まじん・あんこく の 一式（v14.11）：ごちゃまぜ／本気で ボスを たおした 数が 3・6・9・12・15 に なったとき ---- */
      if (!ctx.tokkun && MQ.hero.nextMajin) {
        [MQ.hero.nextMajin(p, p.mixWins || 0), MQ.hero.nextAnkoku(p, p.hardWins || 0)].forEach(function (g) {
          if (!g) return;
          p.gear.push(g.id); p.equipped[g.slot] = g.id; out.densetsu.push(g);
          MQ.save.addLog(p, (g.grade === 'majin' ? 'ごちゃまぜで ' : '本気で ') + 'ボスを たおして ' + g.name + ' を 手に入れた');
        });
      }

      out.fullSet = MQ.hero.equippedSetOf(p);

      /* ---- レベルの ごほうび（v13.15）：ミッションの けいけんちも 入った あとで ---- */
      if (MQ.levelup) {
        out.lvGift = MQ.levelup.claim(p);
        if (out.lvGift.levels.length) {
          const last = out.lvGift.levels[out.lvGift.levels.length - 1].lv;
          MQ.save.addLog(p, 'Lv.' + last + ' の ごほうび：コイン +' + out.lvGift.coins + (out.lvGift.tickets ? '・むりょうけん ' + out.lvGift.tickets + 'まい' : ''));
        }
      }

      /* ---- しょうごう ---- */
      out.titles = MQ.hero.checkTitles(p);

      /* ---- きろく ---- */
      const name = ctx.tokkun ? 'とっくん' : ctx.stage.name;
      MQ.save.addLog(p, name + '：' + sum.correct + '/' + sum.total + '　★' + sum.stars + '　' + MQ.ui.fmtTime(sum.time));
      if (out.missions && out.missions.completed.length) MQ.save.addLog(p, 'ミッション クリア：' + out.missions.completed.map(function (m) { return m.text; }).join('・') + (out.missions.allDone ? '（きょうの 3つ ぜんぶ！）' : ''));
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
         ・キャンバスの 大きさが 画面と ずれていたら、書く 前に 合わせる（線が 指から ずれない）
         ・ResizeObserver で、画面が 出た とき・ひろげた とき・向きを 変えた ときも 合わせる
         ・線の 太さを 画面の 拡大に 合わせる／getCoalescedEvents で なめらかに

       v5.5 で **入力を 作り直した**（「ペンや 指で うまく 書けない・反映されない」）。
       前の やり方の わるかった ところ：
         ① **指を はなしたのを 見のがすと、そのあと ずっと 書けなく なった。**
            pointerup / pointercancel が 来ない ことが 実機では ある（画面の 上に
            何かが 出た・システムが ジェスチャーを 取った）。すると `drawing` が
            true の まま のこり、つぎの 指は「2本目の 指」と 見なされて むしされる。
            → いまは **前の 指が 古ければ 引きつぐ**（`stale()`）。
         ② **iPad などは 書いて いる とちゅうで pointercancel が 来て 線が 切れる。**
            → **タッチの ある 端末では touch イベントで 描く**（touchmove は
            pointercancel の あとも 来つづける ので 線が つながる）。
            pointer は マウス・ペン用に のこす（同じ 指を 二重に 描かない）。
         ③ 指が canvas の 外で はなれた ときの おわりを 受けとって いなかった
            → window でも 見る。画面を はなれた ときも 線を おわらせる。 */
    const c = canvas.getContext('2d');
    let drawing = false;
    let activeId = null;       // いま 書いて いる 指／ペンの id
    let activeKind = '';       // 'touch' か 'pointer'
    let lastAt = 0;            // さいごに 点を もらった 時こく
    let hasTouch = false;      // touch イベントが 来る 端末か（1回でも 来たら true）
    let last = null;
    let strokes = 0;           // ペンを おろした 回数（かん字の はんてい用・v2.9）
    let paths = [];            // 線の ならび（1画ずつ・CSS px）。画数・なぐりがきの はんてい用
    let curPath = null;
    const STALE = 1200;        // これ いじょう 音さたが なければ 前の 指は おわったと みなす

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
      strokes = 0; paths = []; curPath = null;
      endStroke();
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, canvas.width, canvas.height);
      c.restore();
    }
    function pointOf(cx, cy) {
      const rect = canvas.getBoundingClientRect();
      return { x: cx - rect.left, y: cy - rect.top };
    }
    function segment(p) {
      c.beginPath();
      c.moveTo(last.x, last.y);
      c.lineTo(p.x, p.y);
      c.stroke();
      last = p;
      if (curPath) curPath.push(p);
    }

    /* ---- 1本の 線（begin → move → end） ---- */
    // 前の 指が 古い（はなしたのを 見のがした）？
    function stale() {
      if (!drawing) return true;
      if (Date.now() - lastAt > STALE) return true;
      if (activeKind === 'pointer' && activeId !== null && canvas.hasPointerCapture) {
        try { if (!canvas.hasPointerCapture(activeId)) return true; } catch (e) {}
      }
      return false;
    }
    function endStroke() {
      drawing = false; activeId = null; activeKind = ''; curPath = null;
    }
    function beginAt(kind, id, cx, cy) {
      // iPad などは pointerdown の すぐ あとに touchstart が 来る（同じ 指）。
      // あたらしい 線に せず、この 線を これから touch で 描く ように 切りかえる
      if (drawing && activeKind === 'pointer' && kind === 'touch' && Date.now() - lastAt < 400) {
        activeKind = 'touch'; activeId = id; lastAt = Date.now();
        return true;
      }
      if (drawing && !(activeKind === kind && activeId === id)) {
        if (!stale()) return false;      // ほんとうに 2本目の 指 → むし
        endStroke();                     // 前の 指は もう いない → 引きつぐ
      }
      if (!fits()) resizeKeep();         // 大きさが ずれていたら 先に 直す
      drawing = true; activeKind = kind; activeId = id; lastAt = Date.now();
      strokes++;
      last = pointOf(cx, cy);
      curPath = [last]; paths.push(curPath);
      c.beginPath();
      c.moveTo(last.x, last.y);
      c.lineTo(last.x + 0.1, last.y + 0.1);
      c.stroke();
      return true;
    }
    function moveAt(kind, id, cx, cy) {
      if (!drawing || activeKind !== kind || activeId !== id) return;
      lastAt = Date.now();
      segment(pointOf(cx, cy));
    }
    function endAt(kind, id) {
      if (!drawing) return;
      if (id != null && !(activeKind === kind && activeId === id)) return;   // ほかの 指の おわりは 気にしない
      endStroke();
    }

    /* ---- 指（touch）。iPad・Android は こちらが 本すじ ---- */
    function findTouch(e) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeId) return e.changedTouches[i];
      }
      return null;
    }
    canvas.addEventListener('touchstart', function (e) {
      hasTouch = true;
      if (e.cancelable) e.preventDefault();      // 画面が スクロールしようとするのを 止める
      const t = e.changedTouches[0];
      if (t) beginAt('touch', t.identifier, t.clientX, t.clientY);
    }, { passive: false });
    canvas.addEventListener('touchmove', function (e) {
      if (e.cancelable) e.preventDefault();
      const t = findTouch(e);
      if (t) moveAt('touch', t.identifier, t.clientX, t.clientY);
    }, { passive: false });
    function touchEnd(e) {
      if (e.cancelable) e.preventDefault();
      const t = findTouch(e);
      if (t) endAt('touch', t.identifier);
    }
    canvas.addEventListener('touchend', touchEnd, { passive: false });
    canvas.addEventListener('touchcancel', touchEnd, { passive: false });

    /* ---- マウス・ペン（pointer）。指は touch に まかせる ---- */
    canvas.addEventListener('pointerdown', function (e) {
      if (hasTouch && e.pointerType === 'touch') return;   // 二重に 描かない
      e.preventDefault();
      if (beginAt('pointer', e.pointerId, e.clientX, e.clientY)) {
        try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      }
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drawing || activeKind !== 'pointer' || e.pointerId !== activeId) return;
      e.preventDefault();
      let evs = null;
      try { evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null; } catch (err) { evs = null; }
      if (!evs || !evs.length) evs = [e];
      for (let i = 0; i < evs.length; i++) moveAt('pointer', e.pointerId, evs[i].clientX, evs[i].clientY);
    });
    function pointerEnd(e) { endAt('pointer', e.pointerId); }
    canvas.addEventListener('pointerup', pointerEnd);
    canvas.addEventListener('pointercancel', pointerEnd);
    canvas.addEventListener('lostpointercapture', pointerEnd);
    // 指・ペンが canvas の 外で はなれた ときの ほけん
    window.addEventListener('pointerup', pointerEnd);
    window.addEventListener('pointercancel', pointerEnd);
    document.addEventListener('visibilitychange', function () { if (document.hidden) endStroke(); });

    // 大きさが 変わったら（画面が 出た・ひろげた・向きを 変えた）合わせる
    if (window.ResizeObserver) {
      try { new ResizeObserver(function () { resizeKeep(); }).observe(canvas); } catch (e) {}
    }
    window.addEventListener('resize', function () { resizeKeep(); });

    clearBtn.addEventListener('click', function () { MQ.sfx.tap(); clear(); });

    return {
      reset: function () { resize(); clear(); }, clear: clear, resizeKeep: resizeKeep,
      strokes: function () { return strokes; }, paths: function () { return paths; },
      // テスト用（tools/harness.html）
      test: function () { return { drawing: drawing, kind: activeKind, id: activeId, hasTouch: hasTouch }; }
    };
  }

  /* 見た目を たしかめる ための 入口（tools/harness.html から よぶ）。
     ふつうの あそびでは 使いません。 */
  function demoSpecial(id, o) {
    build();
    o = o || {};
    const sp = specialById(id);
    comboShow(sp.min);
    ciForce = o.layout || null;         // v13.6：カットインの 形を きめて 撮る
    instantGrow = !!o.instant;         // harness（virtual-time）は transition が すすまない ので すぐ 広げる
    const late0 = ciOpt.late;
    if (o.instant) ciOpt.late = 0;     // v14.3：止めて 撮る harness では カットインを すぐ 出す（freeze で あとの タイマーが 止まる）
    playSpecial(sp, !!o.pal);
    ciForce = null; instantGrow = false; ciOpt.late = late0;
    if (V3() && d.cur) specialMotion(sp, d.cur);   // v12.2：3D の 動きも いっしょに
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

  return {
    ambushTimes: function () { return { wind: AMB.wind, strike: STRIKE }; },   // 先制こうげきの 時間（harness）
    demoQuestion: function () { build(); renderQuestion(); },   // 見本：core を 進めた あとの 問題を 出す（中ボスの はんげきを 見る）
    demoWarning: function (last) { build(); if (last) towerIntro(); else bossIntro(); },   // v13.6：harness #warning
    demoEnd: function () { endSpecial(true); },   // v13.6：見本の ページで つぎの わざの 前に もどす
    start: start, startTokkun: startTokkun, startDrill: startDrill, demoSpecial: demoSpecial, demoItem: demoItem, openBag: openBag, SP_MOTION: SP_MOTION,
    ciOption: ciOption,   // v14.3：カットインを 軽く する 案の 切りかえ（見本の ページ・harness 用）
    paintScene: paintScene,   // 背景（v12.6）を harness から 入れかえる 用
    lastJudge: function () { return lastJudge; },
    // メモ欄の 中を のぞく（tools/harness.html 用・v5.5）
    memoStrokes: function () { return memo && memo.strokes ? memo.strokes() : 0; },
    memoPaths: function () { return memo && memo.paths ? memo.paths() : []; },
    memoTest: function () { return memo && memo.test ? memo.test() : null; }
  };
})();
