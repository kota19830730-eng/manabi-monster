/* ---------------------------------------------------------
   たたかいのルール（画面のことは 知らない）

   ■ ふつうの たたかい（mode: 'normal'）
     ザコ12体 ＋ ボス戦。
       ザコ … 1問 1体。正解で たおす
       問題には むずかしさ lv（1=やさしい／2=ふつう／3=むずかしい）が ついていて、
       やさしい → ふつう → むずかしい の じゅんに 出る（ボスに 近づくほど 手ごわい）。
       ボスの 問題は lv3 だけ（ザコより むずかしい）。
       12体の うち
         ・1回は「2体同時」… 2問 れんぞくで 一発正解＝ダブルKO（ボーナス）
         ・3体同時（trioIds）の しくみも ある（むかしの ABC3きょうだい。v13.21 で 1体に なり いまは 出ない）
         ・たまに レア敵（息子さんの モンスター／ゴールデンスライム）＝けいけんち3倍
       とちゅうに「たからばこ」が 1回 出る。
         開けるのに 1問。まちがえても 罰なし（箱が にげるだけ）
       ボス … HP3。ボス問題に 正解するたびに 1ダメージ。
              のこりHP 1で「おこりだす」。
              まちがえても ボスは にげず「ガード」される。
              ボス問題を 5問 やっても たおせなければ ボスの方が にげる
              （負けは ない。「またちょうせん」）

   ■ さいごの塔（mode: 'tower'）
     ザコなし。ラスボス「まおう」だけ。
       HP5・最大8問・負けなし。HPが 2へると 第2形態に 変身。
       出題は 算数 → 国語 → ローマ字 → 理科社会 → 英語 の じゅんばん。

   ■ とっくん（mode: 'tokkun'）
     にげた敵だけと たたかう。ボスなし。

   正解 → たおす（けいけんち）。1発目から連続正解で コンボが たまり、
          3コンボ以上は クリティカル（ボーナス）
   まちがい → ヒント → もう1回（コンボは 0に）
       もう1回で正解 → たおす（けいけんちは半分）
       それでも まちがい → 正解を見せる。ザコは にげる（あとで もどってくる）

   タイムは はかるが、ふつうの たたかいに 時間切れは ない。
   早く 終わると ボーナス（おそくても 減らない）。
   タイムアタックモード（timeAttack）でだけ 1問ごとの 制限時間が ある。

   ■ どうぐ（v2.0）
     たからものを もちもの（3つまで）として もっていき、たたかいの 中で 使う。
     1つの どうぐは 1回の たたかいで 1回（みちしるべの 金色だけ 2回）。
     わざの 表は js/content/treasure.js、効果の 中身は この ファイルの useItem()。
     効果は かならず「正解した とき」に 出る。正解しなくても てきが たおれる
     わざは ない。タイムアタックでは 使えない（きろくの 公平さ）。

   問題の形（すべての教科で 共通）：
     type 'number' / 'choice' / 'divrem' / 'roma'、prompt、unit、hint、note、
     layout 'vertical'（筆算）、scratch: false（メモ欄なし）
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.battle = (function () {
  const XP = {
    pal: 10,                 // 相棒の 追い打ち（ザコの とき）
    revenge: 15,        // リベンジ（にげた敵を たおす）の ボーナス（v3.1）
    mob: 10, mobRetry: 5,          // ザコ
    bossHit: 15, bossHitRetry: 8,  // ボスへの 1ダメージ
    bossBonus: 15,                 // ボスを たおしたら さらに
    lastHit: 25, lastHitRetry: 12, // ラスボス
    lastBonus: 60,
    critBonus: 5,                  // クリティカル
    rareMul: 3,                    // レア敵は 3倍
    doubleKO: 20,                  // 2体同時を 一発ずつで たおした
    tripleKO: 40,                  // 3体同時
    chest: 30,                     // たからばこ を 開けた
    fast: 30,                      // はやとき ボーナス
    eliteBonus: 20,                // 中ボスを たおした（v8.1）
    cloneBonus: 20,                // ぶんしんを 2問 つづけて 見やぶった（v8.1）
    kamaeBreak: 10,                // たての かまえを やぶった（v8.1）
    review: 10                     // ふくしゅう（前に まちがえた 問題を 1回めで 正解・v11.1）
  };
  const SEC_PER_Q = 20;            // これより 早ければ はやとき ボーナス

  /* ■ てきの ため → カウンター（v7.7）
       敵がわも「ため」て、たまりきった 問題で こうげきして くる。
         ザコ … 3問ごと（たからばこは 数えない）／ボス … 3問ごと（v12.7 で 2 → 3。2だと 2問めで かならず 2ダメージ）
       その 問題に 1回めで 正解 → **カウンター**（ザコは けいけんち 1.5ばい・ボスは 2ダメージ）
       まちがえると「くらった」… 演出と コンボ 0 だけ（コンボ 0は いつもの まちがいと 同じ）。
       **何も うしなわない**（ライフなし・負けなし の きまりは そのまま）。ユーザー決定 2026-09-06。
       おうちの人ページで 切れる（opts.attacks: false）。とっくんでは 出ない。 */
  const CHARGE_MOB = 3;
  const CHARGE_BOSS = 3;
  const COUNTER_MUL = 1.5;
  const COUNTER_DMG = 2;

  /* ■ 敵がわの 攻防（v8.1）。ぜんぶ「うばう」でなく「ボーナスの チャンス」（ユーザー決定 2026-09-06）
       中ボス   … さいごの ザコは HP2（問題は lv3 を 2問）。1回めの 正解で 1ダメージ、
                  クリティカル（コンボ3〜）・カウンター・相棒の 追い打ち・ばくれつ・弱点 なら 2ダメージ＝一発。
                  たおすと けいけんち ＋20・コイン 1。まちがえて にげても ふつうの ザコと 同じ（あとで もどる）。
       弱点     … 問題に weak（教科 id）が ついた 敵は、その 問題に 1回めで 正解すると
                  「こうかは ばつぐん」＝けいけんち 1.5ばい（ボス・中ボスは 2ダメージ）。
                  ごちゃまぜ バトル（world3.js が つける）と さいごの塔（opts.weakArea）だけ。
       ボスの わざ … ボスの 3問め・5問め（塔は 3・5・7）に 1つずつ（大わざ と かさならない）。
                  たての かまえ（kamae）… 正解で ガードブレイク → つぎの 1問が 2ダメージの チャンス（bossOpen）
                  ぶんしん（clone）  … 2問 つづけて 出る。両方 1回めで 正解 → けいけんち ＋20
                  なかまを よぶ（call）… ザコを 1体 呼ぶ（ボスの 問題数には 数えない＝おまけの けいけんち）
                  おうちの人ページの「てきの こうげき」（opts.attacks）と いっしょに 切れる。
       なかまを よぶ（ザコ）… 2体同時の 1体めが 2体めを よぶ（同じ 系統・たまに ゴールデンスライム）。 */
  const ELITE_HP = 2;
  const WEAK_MUL = 1.5;
  const WEAK_DMG = 2;
  const BOSS_SKILLS = ['kamae', 'clone', 'call'];
  const SUMMON_GOLDEN = 0.1;

  /* ■ ガードくだき（2026-09-14・ユーザー「ボス系の モンスターは 攻撃して きて ガードや 守りを 壊して くる 要素を」）
       ボスの 大わざ（ため 3問に 1回＝chargeInfo の attacking）が「ガードくだき」に なった。
       ねらうのは 子どもの まもり ＝ たて（buff.shield：2回めに まちがえても にげられない）と
                                   よろい（buff.freeze：コンボが きれない。時とめ・サポートの コンボ ガードも ここ）。
         1回めで 正解 … はね返した！（カウンター 2ダメージは いままでどおり）＋ たてが 1つ ふえる（1たたかい GB_GAIN_MAX まで）
         まちがえた   … ふつう：まもりに ヒビが 入る 演出だけ。**へらない**（「てきの 行動で 何も うしなわない」v7.7 の まま）
                        本気モード（v12.7・子どもが えらんだ ときだけ）：まもりが 1つ ほんとうに こわれる（たてが 先）
         こわれた まもりは ボスの 問題に 1回めで GB_REPAIR 問 れんぞく 正解すると なおる（けいけんち ＋GB_REPAIR_XP）
       てきの こうげき（opts.attacks）が なし・タイムアタック・とっくんでは おきない（chargeInfo が null）。
       画面へは answer() の 返りちでは なく guardEvent() で わたす（ほかの 作業の 返りちと ぶつからない ように） */
  const GB_GAIN_MAX = 2;
  const GB_REPAIR = 2;
  const GB_REPAIR_XP = 10;

  /* ■ ボスを 強く（v12.7・ユーザー「ボスと ラスボスが 弱すぎる。歯ごたえが ほしい」）
       実測（400回ずつ）：ぜんぶ 正解なら ボスは 2問・ラスボスは 4問で おわって いた（正答 60% でも 勝率 100%）。
       ・HP と 問題数を ふやす（下の 表。画面がわ ui/battle.js が わたす。core の 初期値は むかしの まま＝テストの ため）
       ・ボスの ためは 3問に 1回（CHARGE_BOSS）
       ・相棒の 追い打ちは ボスには 1ダメージまで（PAL_BOSS_MAX。ザコへの けいけんちは 段階の まま）
       ・3だんかい：HP が enrageAt いかで おこる（第2形態）→ finalAt いかで「さいごの 力」（第3形態）
       ・まとめ問題：ボスの 2・4・6…問めは そのエリアで 前に クリアした ステージから（opts.recap）
       ・本気モード（setBossHard）：子どもが ボスの 前に えらぶ。1回めの 正解だけ ダメージ（2回めは ガード）、
         ボスの けいけんち・コインが 2ばい。**ふつうを えらべば 勝率は いままでと ほぼ 同じ**（負けない きまりは そのまま）
       ふつうの ボスは 約5問・ラスボスは 約7問に なる（ぜんぶ 正解の とき）。 */
  const BOSS_SET = {
    normal: { bossHp: 5, bossMax: 8, enrageAt: 3, finalAt: 1 },
    first: { bossHp: 3, bossMax: 5, enrageAt: 1, finalAt: 0 },       // はじめての たたかい（v11.1）は みじかい まま
    tower: { bossHp: 9, bossMax: 14, enrageAt: 6, finalAt: 3 },
    towerSmall: { bossHp: 7, bossMax: 11, enrageAt: 5, finalAt: 2 }   // 小1・小2 の さいごの とう
  };
  const PAL_BOSS_MAX = 1;
  const HARD_MUL = 2;

  let s = null;

  function now() { return Date.now(); }

  // えらぶ形式は 出すたびに 選たくしの順を かえる
  function prepare(q) {
    const copy = Object.assign({}, q);
    if (q.type === 'choice') {
      const correctText = q.choices[q.answer || 0];
      copy.choices = MQ.util.shuffle(q.choices);
      copy.answer = copy.choices.indexOf(correctText);
    }
    return copy;
  }

  // 保存用：えらぶ形式は 正解を先頭に もどして 保存する
  function plain(q) {
    const copy = Object.assign({}, q);
    ['boss', 'revenge', 'enemyId', 'rare', 'chest', 'groupId', 'groupSize', 'groupPos', 'groupIds', 'golden', 'coins',
     'elite', 'eliteHp', 'elitePos', 'weak', 'summon', 'called', 'review', 'reviewMiss', 'recap'].forEach(function (k) {
      delete copy[k];
    });
    if (q.type === 'choice') {
      const correctText = q.choices[q.answer];
      copy.choices = [correctText].concat(q.choices.filter(function (c, i) { return i !== q.answer; }));
      copy.answer = 0;
    }
    return copy;
  }

  // むずかしさの じゅんに ならべる（同じ むずかしさの 中の じゅんは そのまま）
  function levelOf(q) { return q && q.lv ? q.lv : 2; }
  function sortByLevel(list) {
    return list.map(function (q, i) { return { q: q, i: i }; })
      .sort(function (a, b) { return (levelOf(a.q) - levelOf(b.q)) || (a.i - b.i); })
      .map(function (o) { return o.q; });
  }

  // ボス問題を 1問 作る（なるべく 同じ問題を くり返さない）
  function makeBossQuestion() {
    let q = null;
    // まとめ問題（v12.7）：2・4・6…問め（index が 奇数）は 前に クリアした ステージから
    const recapSt = (s.recap && s.recap.length && s.bossAsked % 2 === 1) ? MQ.util.pick(s.recap) : null;
    if (recapSt) {
      for (let i = 0; i < 6; i++) {
        const made = recapSt.make(1, { boss: true, index: s.bossAsked });
        if (!made || !made[0]) break;
        const c = prepare(made[0]);
        if (s.usedBossKeys.indexOf(c.id) === -1) { q = c; break; }
      }
      if (q) { q.stageId = recapSt.id; q.recap = recapSt.name; }   // とくい・にがては もとの ステージに ためる
    }
    for (let i = 0; i < 6 && !q; i++) {
      const made = s.stage.make(1, { boss: true, index: s.bossAsked, bossArea: s.bossArea });
      if (!made || !made[0]) break;
      q = prepare(made[0]);
      if (s.usedBossKeys.indexOf(q.id) !== -1 && i < 5) q = null;
    }
    if (!q) return null;
    s.usedBossKeys.push(q.id);
    q.boss = true;
    q.enemyId = s.bossId;
    // 弱点の 教科（v8.1・塔）：その 教科の 問題は 2ダメージの チャンス
    if (s.weakArea && (q.subject || q.areaId) === s.weakArea) q.weak = s.weakArea;
    return q;
  }

  /* 中ボス（v8.1）の 問題：lv3 を HP ぶん。ほかの ザコと かぶらない ように */
  function makeEliteQuestions(stage, n, taken) {
    const used = {};
    taken.forEach(function (q) { used[q.id] = true; });
    const out = [];
    for (let t = 0; t < 4 && out.length < n; t++) {
      const made = stage.make(n, { boss: false, lv: 3 }) || [];
      made.forEach(function (q) {
        if (out.length < n && q && !used[q.id]) { used[q.id] = true; out.push(prepare(q)); }
      });
    }
    return out;
  }

  // 中ボス専用の モンスター（v8.1）。いなければ つよそうな ザコ → ならびの さいごの 敵
  function pickElite(areaId, mobs) {
    if (areaId && MQ.enemies && MQ.enemies.midFor) {
      const id = MQ.enemies.midFor(areaId);
      if (id) return id;
    }
    return mobs.length ? mobs[mobs.length - 1].enemyId : 'slime-green';
  }

  // ボスが 呼ぶ ザコ（よわそうな rank1）
  function pickCalled(areaId) {
    if (MQ.enemies && MQ.enemies.pickIds) {
      const id = MQ.enemies.pickIds(areaId || 'sansu', 1, 0)[0];
      if (id) return id;
    }
    return 'slime-green';
  }

  /* ボスの わざの 予定（v8.1）。3問めから 2問おき（ぶんしんは 2問 つかう）。
     大わざ（ため）は わざの 問題では 出ない（chargeInfo が 見る） */
  function planBoss() {
    s.bossPlan = {};
    if (!s.attacks) return;
    const kinds = MQ.util.shuffle(BOSS_SKILLS.slice());
    let k = 3;
    while (k <= s.bossMax && kinds.length) {
      let kind = kinds.shift();
      if (kind === 'clone' && k + 1 > s.bossMax) { kind = kinds.shift(); if (!kind) break; }
      s.bossPlan[k] = { kind: kind, pos: 0 };
      if (kind === 'clone') { s.bossPlan[k + 1] = { kind: 'clone', pos: 1 }; k += 3; } else k += 2;
    }
  }

  // なかまを よぶ（ボスの わざ）：ボスの 問題の 前に ザコを 1体。ボスの 問題数には 数えない
  function makeCalledQuestion() {
    const bq = s.bossQ;
    const areaId = (bq && (bq.subject || bq.areaId)) || s.bossArea || s.areaId || null;
    let q = null;
    for (let t = 0; t < 4; t++) {
      const made = s.stage.make(1, { boss: false, lv: 2, index: Math.max(0, s.bossAsked - 1) });
      if (!made || !made[0]) break;
      q = prepare(made[0]);
      if (!bq || q.id !== bq.id) break;
    }
    if (!q) return null;
    q.called = true;
    q.id = 'call:' + q.id;
    q.enemyId = pickCalled(areaId);
    return q;
  }

  // いまの ボスの 問題に ついている わざ（画面用）。{ kind, pos, open, called } か null
  function bossSkill() {
    if (!s || s.phase !== 'boss') return null;
    const pl = s.bossPlan ? s.bossPlan[s.bossAsked] : null;
    if (!pl && !s.bossOpen && !s.called) return null;
    return { kind: pl ? pl.kind : null, pos: pl ? pl.pos : 0, open: !!s.bossOpen, called: !!s.called };
  }

  /* たからばこの 問題。そのステージの ふつうの問題を つかう */
  function makeChestQuestion(stage) {
    const q = prepare(stage.make(1, { boss: false, lv: 2 })[0]);
    q.chest = true;
    q.enemyId = 'chest';
    q.id = 'chest:' + q.id;
    return q;
  }

  /* opts:
       stage    … ステージ
       mode     … 'normal'（ふつう）/ 'tokkun'（にげた敵だけ）/ 'tower'（ラスボス）
       escaped  … にげた敵（save.js の entry）
       review   … ふくしゅう問題（v11.1・MQ.review.pick の ならび）。にげた敵と 同じ 形
       enemies  … ザコの id
       bossId   … ボスの id
       rareId   … レア敵の id（入れないときは null）
       trioIds  … 3体同時に する敵の id 3つ（入れないときは null）
       chest    … たからばこを 出すか
       mobs / bossHp / bossMax / enrageAt
       timeAttack … 1問ごとの 制限びょう（ふつうは 0＝制限なし）
       items    … もちもの（MQ.treasure.bagItems(player) の ならび）。
                  タイムアタックの ときは 無視される
       coins    … いま もっている きんのコイン（じゅうてん用の さいふ）
       fever    … きょうの フィーバー教科（v7.2）{ xpMul, coins, palPlus }。normal だけ
       support  … サポート（v7.2）{ easy, hint, keep, extra, level }。normal だけ
       mix      … ごちゃまぜ バトル（v7.3）。おわりに コイン +1。bossArea＝ボスの 教科 id
       attacks  … てきの ため → カウンター（v7.7）。true で あり（画面が おうちの人の せっていを 見て わたす）。とっくんでは いつも なし
       elite    … 中ボス（v8.1）。true で さいごの ザコが HP2 に（normal だけ）。eliteId で 顔ぶれを 指定
       summon   … なかまを よぶ（v8.1）。true で 2体同時が「よんだ」形に（同じ 系統・たまに ゴールデン）
       areaId   … 敵を えらぶ ときの エリア（中ボス・呼ばれる ザコ）
       weakArea … さいごの塔の ラスボスの 弱点（教科 id）。その 教科の 問題は 2ダメージ  */
  function start(opts) {
    const mode = opts.mode || 'normal';
    const stage = opts.stage;

    let mobs = [];
    if (mode === 'tokkun') {
      // にげた敵だけ。問題は 保存してあるものを そのまま つかう
      mobs = (opts.escaped || []).map(function (entry) {
        const q = prepare(entry.q);
        q.id = entry.key;
        q.revenge = entry.revenge !== false;      // 単元の れんしゅう（v7.1）は リベンジでは ない
        q.enemyId = entry.enemyId;
        q.areaId = entry.areaId || null;
        q.stageId = entry.stageId || null;        // とくい・にがて（v7.1）は もとの ステージに ためる
        return q;
      });
    } else if (mode === 'normal') {
      const mobCount = opts.mobs || 9;
      const revenge = (opts.escaped || []).slice(0, 2);
      const eliteOn = !!opts.elite;
      // 中ボス（v8.1）は さいごの 1体ぶんの 場所を つかう（問題は 2問）
      const freshCount = Math.max(1, mobCount - revenge.length - (eliteOn ? 1 : 0));

      /* サポート（v7.2・にがて・はじめての 教科）：少し 多めに 作って、
         むずかしい ぶんを 落とす（12体なら 4/4/4 → 5/5/2）。ボスは そのまま */
      const support = (opts.support && !opts.timeAttack) ? opts.support : null;
      const extra = support && support.easy ? (support.extra || 3) : 0;
      mobs = stage.make(freshCount + extra, { boss: false }).map(prepare);
      mobs = sortByLevel(mobs).slice(0, freshCount);
      const enemyIds = (opts.enemies || []).slice();
      mobs.forEach(function (q, i) {
        // ごちゃまぜ バトル（v7.3）は 問題が じぶんの 教科の モンスターを つれて くる
        if (!q.enemyId) q.enemyId = enemyIds.length ? enemyIds[i % enemyIds.length] : 'slime-green';
      });

      revenge.forEach(function (entry) {
        const q = prepare(entry.q);
        q.id = entry.key;
        q.revenge = true;
        q.enemyId = entry.enemyId;
        q.stageId = entry.stageId || null;        // とくい・にがて（v7.1）は もとの ステージに ためる
        mobs.splice(MQ.util.randInt(0, mobs.length), 0, q);
      });

      /* ふくしゅう（v11.1）：まえに 1回めで まちがえた 問題が そのまま もどって くる。
         ザコの わくを 1つ つかう（そのぶん 新しい 問題を 1つ 減らす）。
         1回めで 正解すると 消える（おぼえた）＝ ごほうびは けいけんち +10 */
      (opts.review || []).forEach(function (entry) {
        if (!entry || !entry.q) return;
        const q = prepare(entry.q);
        q.id = entry.key;
        q.review = true;
        q.reviewMiss = entry.miss || 1;
        q.enemyId = entry.enemyId || (mobs.length ? mobs[0].enemyId : 'slime-green');
        q.stageId = entry.stageId || null;
        q.areaId = entry.areaId || null;
        if (mobs.length > 1) mobs.splice(MQ.util.randInt(1, mobs.length - 1), 1);   // 新しい 問題と 入れかえ
        mobs.splice(MQ.util.randInt(0, mobs.length), 0, q);
      });

      // にげた敵を 入れたあとも、やさしい → むずかしい の じゅんは くずさない
      mobs = sortByLevel(mobs);

      // レア敵（けいけんち3倍）
      if (opts.rareId && mobs.length) {
        const at = MQ.util.randInt(0, mobs.length - 1);
        mobs[at].enemyId = opts.rareId;
      }

      // まとめて 出てくる 敵（2体同時／3体同時）
      const trio = opts.trioIds && opts.trioIds.length >= 3 ? opts.trioIds.slice(0, 3) : null;
      const groupSize = trio ? 3 : 2;
      if (mobs.length >= groupSize + 2) {
        const at = MQ.util.randInt(1, mobs.length - groupSize - 1);
        const ids = [];
        for (let i = 0; i < groupSize; i++) {
          ids.push(trio ? trio[i] : mobs[at + i].enemyId);
        }
        /* なかまを よぶ（v8.1）：1体めが 2体めを よぶ。2体めは 同じ 系統の なかま、たまに ゴールデンスライム */
        let summon = false, goldenAt = -1;
        if (!trio && opts.summon) {
          summon = true;
          if (Math.random() < SUMMON_GOLDEN) { ids[1] = goldenId(); goldenAt = 1; }
          else if (MQ.enemies && MQ.enemies.mateFor) { const m = MQ.enemies.mateFor(ids[0]); if (m) ids[1] = m; }
        }
        for (let i = 0; i < groupSize; i++) {
          const q = mobs[at + i];
          q.enemyId = ids[i];
          q.groupId = 'g' + at;
          q.groupSize = groupSize;
          q.groupPos = i;
          q.groupIds = ids;
          if (trio) q.rare = true;
          if (summon) q.summon = true;
          if (i === goldenAt) { q.rare = true; q.golden = true; }
        }
      }

      /* 中ボス（v8.1）：さいごに HP2 の 敵。問題は lv3 を 2問（ならびの さいご） */
      if (eliteOn) {
        const eq = makeEliteQuestions(stage, ELITE_HP, mobs);
        if (eq.length) {
          const eliteId = opts.eliteId || pickElite(eq[0].areaId || opts.areaId, mobs);
          eq.forEach(function (q, i) {
            q.elite = true; q.eliteHp = ELITE_HP; q.elitePos = i; q.enemyId = eliteId;
          });
          mobs = mobs.concat(eq);
        }
      }
    }

    // レアの しるし（敵の データを 見て つける）
    mobs.forEach(function (q) {
      const e = MQ.enemies.get(q.enemyId);
      if (e && e.rare) q.rare = true;
    });

    /* しゅうまつ イベント（v13.16）：ふつうの たたかい（ごちゃまぜ こみ）だけ。タイムアタックでは なし。
       { goldenCoins, chests, chestCoins, coins } … ui/battle.js が MQ.weekend.battleOpts を わたす */
    const weekend = (opts.weekend && mode === 'normal' && !opts.timeAttack) ? opts.weekend : null;

    // たからばこ（まちがえても 罰なし）。中ボス（v8.1）は さいごに おく ので その 前まで
    // たからばこ まつり（v13.16）の ときは 2こ（1こ あたりの コインも ふえる）
    if (opts.chest && mode === 'normal' && mobs.length >= 3) {
      const nChest = Math.max(1, (weekend && weekend.chests) || 1);
      for (let c = 0; c < nChest; c++) {
        let limit = mobs.length - 1;
        for (let i = 0; i < mobs.length; i++) if (mobs[i].elite) { limit = i; break; }
        const at = MQ.util.randInt(2, Math.max(2, limit));
        const cq = makeChestQuestion(stage);
        if (weekend && weekend.chestCoins) cq.coins = weekend.chestCoins;
        if (c > 0) cq.id = cq.id + ':' + c;       // 2こめは id を かえる（1問ごとの きろくが かさならない ように）
        mobs.splice(at, 0, cq);
      }
    }

    const hasBoss = mode !== 'tokkun';
    const bossHp = opts.bossHp || (mode === 'tower' ? 5 : 3);

    // もちもの（どうぐ）。タイムアタックでは 使えない
    const bag = (opts.timeAttack ? [] : (opts.items || [])).map(function (it) {
      return Object.assign({}, it, { left: it.uses || 1 });
    });

    /* そうびの 効果（v5.4）。MQ.hero.gearPower(player) の かたち。
       けん＝正解ごとの けいけんち／たて＝セーフ／かぶと＝ひっさつが 早い／
       よろい＝コンボを まもる／マント＝おわりの コイン／セットは けいけんち ばい */
    const gear = Object.assign(
      { xpAdd: 0, safe: 0, special: 0, keep: 0, coins: 0, setMul: 1, setName: '' },
      opts.gear || null
    );

    /* きょうの フィーバー教科（v7.2）：ふつうの たたかいだけ（とっくん・塔・タイムアタックは なし）。
       けいけんち ばい・おわりに コイン・なかまゲージが 早く たまる。
       サポート（v7.2）：にがて・はじめての 教科。やさしい 問題 多め（上）・ヒントを 先に・コンボを まもる */
    const fever = (opts.fever && mode === 'normal' && !opts.timeAttack) ? opts.fever : null;
    const support = (opts.support && mode === 'normal' && !opts.timeAttack) ? opts.support : null;
    /* セットわざ（v14.2・js/content/setwaza.js）：同じ グレードを 5点 つけて いると、正解で たまる ゲージが
       いっぱいに なった 正解で その セットの わざ。とっくん・タイムアタックでは なし。opts.setWaza（id）で 決めうちも できる（テスト用） */
    const setw = (mode === 'tokkun' || opts.timeAttack || !MQ.setwaza) ? null
      : (opts.setWaza !== undefined ? MQ.setwaza.byId(opts.setWaza) : MQ.setwaza.forGear(gear));

    s = {
      items: bag,
      gear: gear,
      fever: fever,
      support: support,
      feverXp: 0,                  // フィーバーで ふえた ぶんの けいけんち
      weekend: weekend,            // しゅうまつ イベント（v13.16）
      weekendGold: 0,              // ゴールデン まつりで もらった コイン
      chestCount: 0,               // あけた たからばこの 数（v13.16）
      mix: !!opts.mix,             // ごちゃまぜ バトル（v7.3）
      bossArea: opts.bossArea || null,   // ごちゃまぜ の ボスの 教科
      // てきの ため → カウンター（v7.7）。画面がわ（ui/battle.js）が おうちの人の せっていを 見て true を わたす。
      // core の 初期値は「なし」（むかしからの テストと ほかの 呼び出しを 変えない ため）。とっくんでは いつも なし
      attacks: opts.attacks === true && mode !== 'tokkun',
      counters: 0,                 // カウンターを 決めた 数
      // 敵がわの 攻防（v8.1）
      areaId: opts.areaId || null,
      weakArea: opts.weakArea || null,   // 塔の ラスボスの 弱点
      eliteLeft: ELITE_HP,         // 中ボスの のこり HP
      elites: 0,                   // たおした 中ボスの 数
      weakHits: 0,                 // 弱点を ついた 数
      bossPlan: {},                // ボスの わざの 予定 { 問題番号: { kind, pos } }
      bossOpen: false,             // ガードブレイクの あと（つぎの 1問は 2ダメージ）
      cloneClean: false,           // ぶんしんの 1問めを 1回めで 正解した
      called: null,                // ボスが 呼んだ ザコの 問題（いま 出ている）
      skillHits: 0,                // ボスの わざを うまく さばいた 数
      // どうぐ・そうびの 効果（のこり）
      buff: {
        dmg: 1,
        shield: opts.timeAttack ? 0 : gear.safe,   // たて：はじめから セーフ
        freeze: (opts.timeAttack ? 0 : gear.keep) + (support ? (support.keep || 0) : 0),   // よろい・サポート：はじめから コンボを まもる
        // オーロラの よろい（げきレア・v9.0）… なかまゲージが はじめから 2ばい
        xpMul: 1, palPlus: (fever ? (fever.palPlus || 0) : 0) + (gear.palPlus || 0),
        comboPlus: 0, fastSure: 0, palXp: gear.palXp2 ? 2 : 1   // ギンガの よろい（v14.8）：なかまの けいけんち 2ばい
      },
      itemsUsed: [],
      frozenQ: null,     // 時とめが 効いている 問題の id
      guidedQ: null,     // みちしるべを 使った 問題の id
      stage: stage,
      mode: mode,
      bossId: opts.bossId,
      mobs: mobs,
      index: 0,
      phase: mobs.length ? 'mob' : (hasBoss ? 'boss' : 'done'),
      hasBoss: hasBoss,
      bossHpMax: bossHp,
      bossHp: bossHp,
      bossMax: opts.bossMax || (mode === 'tower' ? 8 : 5),
      enrageAt: opts.enrageAt || (mode === 'tower' ? 3 : 1),
      finalAt: opts.finalAt || 0,  // さいごの 力（第3形態・v12.7）。0 は なし
      final: false,
      bossHard: false,             // 本気モード（v12.7・setBossHard）
      gb: { broken: [], streak: 0, gained: 0, blocks: 0, breaks: 0, cracks: 0, repairs: 0 },   // ガードくだき（2026-09-14）
      gbEvent: null,               // いまの 答えで おきた ガードくだきの 出来事（guardEvent）
      recap: mode === 'normal' && !opts.mix ? (opts.recap || []).filter(function (x) { return x && x.make && x !== stage; }) : [],
      bossAsked: 0,
      usedBossKeys: [],
      bossQ: null,
      enraged: false,
      retry: false,
      combo: 0,
      pal: opts.pal || null,       // いまの 相棒（{ id, name }）。いなければ null
      palHits: 0,
      palGauge: 0,                 // なかまゲージ（正解で たまる・まちがえても へらない・v5.2）
      setWaza: setw ? setw.id : null,   // セットわざ（v14.2）
      setGauge: 0,                 // セットゲージ（正解で たまる・まちがえても へらない）
      setMoves: 0,                 // この たたかいで 出した セットわざの 数
      maxCombo: 0,
      correct: 0,
      answered: 0,
      xp: 0,
      coins: 0,
      defeated: [],
      escapedNow: [],
      reviewNow: [],               // この たたかいで 1回めに まちがえた 問題（ふくしゅう行き・v11.1）
      reviewDone: [],              // ふくしゅう問題を 1回めで 正解した（＝おぼえた）
      reviewHits: 0,
      results: [],                 // 1問ごとの 結果（とくい・にがて 用・v7.1）
      retryGiven: null,            // 1回目に まちがえた ときの 答え（文字）
      revengeBeaten: [],
      typeOk: {},                  // 種類ごとの 正解数（ミッション「かん字を 3もん」用）
      multiKO: [],
      chestOpened: false,
      bossBeaten: false,
      bossFled: false,
      groupClean: true,
      timeAttack: opts.timeAttack || 0,
      wallet: opts.coins || 0,     // もっている コイン（じゅうてん用）
      coinsSpent: 0,               // この たたかいで つかった コイン
      recharged: false,            // じゅうてんは 1たたかいに 1回
      startedAt: now(),
      qAt: now(),                  // いまの 問題を 出した とき（1問の 時間・v7.3）
      endedAt: 0
    };

    // ザコが 0体なら いきなり ボス（塔）
    if (s.phase === 'boss') {
      planBoss();
      s.bossQ = makeBossQuestion();
      s.bossAsked = 1;
    }
    return s;
  }

  function current() { return s.phase === 'boss' ? (s.called || s.bossQ) : s.mobs[s.index]; }

  /* 画面の「てき N / M」用（v8.1）。中ボスの 2問は 1体と 数える */
  function foeCount() {
    let no = 0, total = 0;
    if (!s) return { no: 0, total: 0 };
    s.mobs.forEach(function (q, i) {
      if (q.elite && q.elitePos > 0) return;
      total++;
      if (i <= s.index) no++;
    });
    return { no: no, total: total };
  }

  /* てきの ため（v7.7）：いまの 問題の ようす。ない ときは null
       { level, need, attacking }  level＝たまった 数（attacking なら need と 同じ） */
  function chargeInfo() {
    if (!s || !s.attacks || s.phase === 'done') return null;
    if (s.phase === 'boss') {
      const k = s.bossAsked || 0;
      // わざ・弱点の 問題（v8.1）と 呼ばれた ザコには ため を 出さない（出来事は 1つずつ）
      if (s.called || (s.bossPlan && s.bossPlan[k])) return null;
      if (s.bossQ && s.bossQ.weak) return null;
      if (s.bossOpen) return null;         // ガードブレイクの つぎの 1問（すきだらけ）も 出来事は 1つ
      const att = k > 0 && k % CHARGE_BOSS === 0;
      return { level: att ? CHARGE_BOSS : k % CHARGE_BOSS, need: CHARGE_BOSS, attacking: att, boss: true };
    }
    const q = current();
    if (!q || q.chest) return null;
    // 1つの 問題に 出来事は 1つ（v8.1）：中ボス・弱点・なかまを よぶ 問題には ため を 出さない
    if (q.elite || q.weak || q.summon) return null;
    let k = 0;
    for (let i = 0; i <= s.index; i++) if (!s.mobs[i].chest && !s.mobs[i].elite) k++;
    const att = k % CHARGE_MOB === 0;
    return { level: att ? CHARGE_MOB : k % CHARGE_MOB, need: CHARGE_MOB, attacking: att, boss: false };
  }
  function attacking() { const c = chargeInfo(); return !!(c && c.attacking); }

  /* ---- ガードくだき（2026-09-14）。きまりは 上の GB_ の ところ ---- */
  // ボスの 問題で まちがえた（1回めも 2回めも ここを 通る）
  function guardOnMiss(q, wasRetry) {
    if (s.phase !== 'boss' || !q || q.called) return;
    if (!wasRetry) s.gb.streak = 0;           // なおす れんぞくは 1回めの まちがいで きれる
    if (wasRetry || s.timeAttack || !attacking()) return;
    const t = s.buff.shield > 0 ? 'shield' : s.buff.freeze > 0 ? 'freeze' : null;
    if (!t) { s.gbEvent = { kind: 'none' }; return; }
    if (!s.bossHard) { s.gb.cracks++; s.gbEvent = { kind: 'crack', type: t }; return; }   // ふつうは へらない
    s.buff[t]--;
    s.gb.broken.push(t);
    s.gb.breaks++;
    s.gbEvent = { kind: 'broke', type: t, need: GB_REPAIR };
  }
  // ボスに 正解した。はね返し（カウンター）と なおす れんぞく。ふえた けいけんちを かえす
  function guardAfterBossHit(counter, wasRetry) {
    let xp = 0;
    const ev = { kind: 'hit' };
    if (counter && !s.timeAttack) {
      s.gb.blocks++;
      ev.block = true;
      if (s.gb.gained < GB_GAIN_MAX) { s.buff.shield++; s.gb.gained++; ev.gain = 'shield'; }
    }
    if (!wasRetry && s.gb.broken.length) {
      s.gb.streak++;
      if (s.gb.streak >= GB_REPAIR) {
        const t = s.gb.broken.pop();
        s.buff[t]++;
        s.gb.streak = 0;
        s.gb.repairs++;
        ev.repaired = t;
        xp = GB_REPAIR_XP;
      } else ev.streak = s.gb.streak;
    }
    s.gbEvent = (ev.block || ev.repaired || ev.streak) ? ev : null;
    return xp;
  }
  function guards() {
    if (!s) return { shield: 0, freeze: 0, broken: [], streak: 0, need: GB_REPAIR, blocks: 0, breaks: 0, cracks: 0, repairs: 0, gained: 0 };
    return {
      shield: s.buff.shield || 0, freeze: s.buff.freeze || 0, broken: s.gb.broken.slice(), streak: s.gb.streak, need: GB_REPAIR,
      blocks: s.gb.blocks, breaks: s.gb.breaks, cracks: s.gb.cracks, repairs: s.gb.repairs, gained: s.gb.gained
    };
  }

  /* サポート（v7.2）：いまの 問題の ヒントを 先に 出す（みちしるべと 同じ 中身）。
     ザコだけ・たからばこ と ボスは なし・役に 立つ ヒントが ある ときだけ
     （ヒントの 文が ある／えらぶ問題は まちがいを 1つ 消す／ローマ字は さいしょの 2字）。
     1問に 1回。出した 問題は みちしるべの「もう 見た」と 同じ あつかい */
  function preHint() {
    if (!s || !s.support || !s.support.hint) return null;
    const q = current();
    if (!q || s.phase !== 'mob' || q.chest || s.retry) return null;
    if (s.guidedQ === q.id) return null;
    if (!q.hint && q.type !== 'choice' && q.type !== 'roma') return null;
    s.guidedQ = q.id;
    return makeHint(q, { max: 1 });
  }

  function isCorrect(q, value) {
    if (value === null || value === undefined) return false;
    if (q.type === 'number') return Number(value) === Number(q.answer);
    if (q.type === 'choice') return Number(value) === Number(q.answer);
    if (q.type === 'divrem') return value && Number(value.q) === q.answer.q && Number(value.r) === q.answer.r;
    // 分数（v6.5）：分子 n・分母 d。画面は divrem と 同じ 2つの わく（q＝分子・r＝分母）で 送って くる
    if (q.type === 'frac') return value && Number(value.q) === q.answer.n && Number(value.r) === q.answer.d;
    if (q.type === 'roma') {
      const t = String(value).toLowerCase().replace(/[^a-z'-]/g, '');
      const ok = q.accept || [q.answer];
      return ok.indexOf(t) !== -1;
    }
    // かん字を 書く問題は、じぶんで 答え合わせ（true / false が とどく）
    if (q.type === 'write') return value === true;
    return false;
  }

  function answerText(q) {
    if (q.type === 'number') return String(q.answer);
    if (q.type === 'choice') return q.choices[q.answer];
    if (q.type === 'divrem') return q.answer.q + ' あまり ' + q.answer.r;
    if (q.type === 'frac') return q.answer.d + '分の' + q.answer.n;
    if (q.type === 'roma' || q.type === 'write') return q.answer;
    return '';
  }

  // 子どもの 答えを 文字に（とくい・にがて の「落とした 問題」用・v7.1）
  function givenText(q, value) {
    if (value === null || value === undefined) return 'じかんぎれ';
    if (q.type === 'choice') return q.choices[Number(value)] != null ? String(q.choices[Number(value)]) : String(value);
    if (q.type === 'divrem') return value.q + ' あまり ' + value.r;
    if (q.type === 'frac') return value.r + '分の' + value.q;
    if (q.type === 'write') return value === true ? '○' : '×（じぶんで）';
    return String(value);
  }

  /* 1問の 結果を ためる（v7.1）。ok は 1回目で 合った ときだけ。
     given は まちがえた ときの 子どもの 答え（1回目の もの） */
  function pushResult(q, ok, given) {
    s.results.push({
      stageId: q.stageId || s.stage.id, areaId: q.areaId || null, unit: q.unit || '', type: q.type,
      ok: !!ok, given: ok ? null : given, answer: answerText(q), prompt: q.prompt, boss: s.phase === 'boss' && !q.called,
      sec: Math.max(0, Math.round((now() - (s.qAt || s.startedAt)) / 1000))
    });
    s.retryGiven = null;
  }

  /* ふくしゅう（v11.1）：正解した ときに 1回 だけ 呼ぶ。
       1回めで まちがえた（2回めで 合った） → つぎの たたかいに もどす（reviewNow）
       ふくしゅう問題に 1回めで 正解      → おぼえた（reviewDone・リストから 消える）
     たからばこは 数えない。タイムアタックは 1回で にげられる ので ここには 来ない */
  function noteReview(q, wasRetry) {
    if (!q || q.chest) return;
    if (q.review && !wasRetry) { s.reviewDone.push(q.id); s.reviewHits++; return; }
    if (wasRetry) s.reviewNow.push(q);
  }

  // opts.max … えらぶ問題で 消す まちがいの 数（みちしるべは 1つだけ）
  function makeHint(q, opts) {
    const maxRemove = (opts && opts.max) || 2;
    if (q.hint) return { kind: 'text', text: q.hint };
    if (q.type === 'choice' && q.choices.length >= 3) {
      const wrongs = [];
      q.choices.forEach(function (c, i) { if (i !== q.answer) wrongs.push(i); });
      const remove = MQ.util.sample(wrongs, Math.min(maxRemove, wrongs.length - 1));
      return { kind: 'eliminate', remove: remove, text: 'ちがう答えを ' + remove.length + 'つ 消したよ。もう1回！' };
    }
    if (q.type === 'roma') {
      return { kind: 'text', text: 'さいしょの 2字は「' + String(q.answer).slice(0, 2) + '」だよ。' };
    }
    if (q.type === 'write') {
      return { kind: 'text', text: 'もう1回 書いてみよう。とめ・はね・はらい も 見てね。' };
    }
    return { kind: 'text', text: 'おちついて、もう1回 考えてみよう。' };
  }

  // まとめて出た敵を ぜんぶ 一発で たおしたか
  function groupResult(q) {
    if (!q.groupId) return null;
    if (q.groupPos === 0) return null;
    if (q.groupPos !== q.groupSize - 1) return null;
    if (!s.groupClean) return null;
    return q.groupSize;
  }

  /* 答える。もどり値の outcome：
       'correct'    ザコを たおした
       'retry'      ヒント → もう1回
       'wrong'      ザコに にげられた
       'chest'      たからばこを 開けた
       'chestlost'  たからばこに にげられた（罰なし）
       'bosshit'    ボスに 1ダメージ
       'guard'      ボスに ガードされた                       */
  /* 相棒の 追い打ち：3問 れんぞく 正解するたび（3・6・9…）。まちがえ直しの ときは 出ない */
  /* なかまゲージ（v5.2）：正解するたびに 1つ たまり、たまりきったら 追い打ち。
     **まちがえても へらない**（アプリの「ばつを 与えない」きまりに そろえた） */
  /* 相棒の 追い打ちの つよさ（v8.2）。画面が わたして こない ときは 1段階めの あつかい */
  function palPower() {
    return (s.pal && s.pal.power) || { xp: XP.pal, dmg: 1 };
  }
  function palHitNow() {
    if (!s.pal || !MQ.pals) return false;
    s.palGauge += 1 + (s.buff.palPlus || 0);     // きずなの わ（v5.4）で 早く たまる
    const need = MQ.pals.gaugeNeed();
    const hit = s.palGauge >= need;
    if (hit) { s.palGauge = 0; s.palHits++; }
    return hit;
  }
  /* セットゲージ（v14.2）：正解ごとに 1つ。いっぱいに なった 正解で セットわざ（1たたかい MAX 回まで） */
  function setHitNow() {
    if (!s.setWaza || !MQ.setwaza || s.setMoves >= MQ.setwaza.MAX) return false;
    s.setGauge += s.gear.setX2 ? 2 : 1;   // ギンガの かぶと（v14.8）：セットゲージ 2ばい
    if (s.setGauge < MQ.setwaza.NEED) return false;
    s.setGauge = 0;
    s.setMoves++;
    return true;
  }

  function answer(value) {
    const q = current();
    const wasRetry = s.retry;
    s.gbEvent = null;                                // ガードくだき（2026-09-14）：この 答えの 出来事だけ
    if (s.phase === 'boss') s.bossAnswered = true;   // 本気モードは もう 変えられない（v12.7）

    if (isCorrect(q, value)) {
      s.retry = false;
      s.answered++;
      s.correct++;
      pushResult(q, !wasRetry, s.retryGiven);   // 2回目で 合った ときは ×（とくい・にがて 用）
      let crit = false;
      if (!wasRetry) {
        s.combo += 1 + (s.buff.comboPlus || 0);   // コンボの まきもの（v5.4）
        if (s.combo > s.maxCombo) s.maxCombo = s.combo;
        // オーロラの けん（げきレア・v9.0）… クリティカルが 2コンボから 出る
        crit = s.combo >= (s.gear.critEasy ? 2 : 3);
      } else if (q.groupId) {
        s.groupClean = false;
      }

      /* ---- たからばこ ---- */
      if (q.chest) {
        const palHit = palHitNow();
        const xp = gain(XP.chest + (palHit ? palPower().xp : 0) + s.gear.xpAdd);
        const coins = q.coins || 1;        // たからばこ よび（金色）は 2まい
        s.coins += coins;
        s.chestOpened = true;
        s.chestCount++;
        return { outcome: 'chest', xp: xp, coins: coins, combo: s.combo, crit: crit, note: q.note, palHit: palHit };
      }

      /* ---- ボスが 呼んだ ザコ（v8.1）：ふつうの ザコと 同じ けいけんち。ボスの 問題数には 数えない ---- */
      if (q.called) {
        const palHit = palHitNow();
        let xp = wasRetry ? XP.mobRetry : XP.mob;
        if (palHit) xp += palPower().xp;
        if (crit) xp += XP.critBonus;
        const setHit = setHitNow();          // セットわざ（v14.2）
        if (setHit) xp += MQ.setwaza.XP;
        xp += s.gear.xpAdd;
        xp = gain(xp);
        s.typeOk[q.type] = (s.typeOk[q.type] || 0) + 1;
        s.defeated.push(q.enemyId);
        noteReview(q, wasRetry);
        return { outcome: 'correct', called: true, xp: xp, crit: crit, combo: s.combo, palHit: palHit, note: q.note, rare: false, setMove: setHit };
      }

      /* ---- ボス ---- */
      if (s.phase === 'boss') {
        const last = s.mode === 'tower';
        const pl = s.bossPlan ? s.bossPlan[s.bossAsked] : null;
        const skill = pl ? pl.kind : null;
        // ばくれつ こうげき：ダメージが ふえ、そのぶん けいけんちも 入る
        const palHit = palHitNow();
        // 本気モード（v12.7）：2回めの 正解は ガードされる（相棒の 追い打ちだけ 通る）
        const blocked = s.bossHard && wasRetry;
        let dmg = blocked ? 0 : (s.buff.dmg > 1 ? Math.min(s.buff.dmg, s.bossHp) : 1);
        if (palHit) dmg = Math.min(dmg + Math.min(PAL_BOSS_MAX, palPower().dmg), s.bossHp);   // 相棒の 追い打ち（ボスには 1まで・v12.7）
        // カウンター（v7.7）：ボスの 大わざの 問題に 1回めで 正解 → 2ダメージ
        const counter = !wasRetry && attacking();
        if (counter) { dmg = Math.min(Math.max(dmg, COUNTER_DMG), s.bossHp); s.counters++; }
        // 弱点（v8.1・塔）：弱点の 教科の 問題に 1回めで 正解 → 2ダメージ
        const weakHit = !!q.weak && !wasRetry;
        if (weakHit) { dmg = Math.min(Math.max(dmg, WEAK_DMG), s.bossHp); s.weakHits++; }
        // すきだらけ（v8.1）：ガードブレイクの つぎの 1問に 1回めで 正解 → 2ダメージ
        const open = s.bossOpen && !wasRetry;
        if (open) { dmg = Math.min(Math.max(dmg, 2), s.bossHp); s.skillHits++; }
        s.bossOpen = false;
        // セットわざ（v14.2）：ボスには 2ダメージまで（カウンターと 同じ）。本気で ガードされた 正解では たまらない
        const setHit = !blocked && setHitNow();
        if (setHit) dmg = Math.min(Math.max(dmg, MQ.setwaza.BOSS_DMG), s.bossHp);
        const usedBurst = !blocked && s.buff.dmg > 1;   // 相棒の 追い打ちで 2に なった ときは「ばくれつ」と 言わない
        // たての かまえ（v8.1）：1回めで 正解 → ガードブレイク（つぎの 1問が すきだらけ）
        const broke = skill === 'kamae' && !wasRetry;
        if (broke) { s.bossOpen = true; s.skillHits++; }
        // ぶんしん（v8.1）：2問 つづけて 1回めで 正解 → ボーナス
        let cloneKO = false;
        if (skill === 'clone') {
          if (pl.pos === 0) s.cloneClean = !wasRetry;
          else { cloneKO = s.cloneClean && !wasRetry; if (cloneKO) s.skillHits++; }
        }
        if (!blocked) s.buff.dmg = 1;        // ガードされた ときは ばくれつを のこす（v12.7）
        const gbXp = guardAfterBossHit(counter, wasRetry);   // ガードくだき（2026-09-14）：はね返し・なおす
        let xp = (wasRetry ? (last ? XP.lastHitRetry : XP.bossHitRetry) : (last ? XP.lastHit : XP.bossHit)) * Math.max(1, dmg);
        if (crit) xp += XP.critBonus;
        if (broke) xp += XP.kamaeBreak;
        if (cloneKO) xp += XP.cloneBonus;
        xp += gbXp;
        xp += s.gear.xpAdd;                  // けん（そうび）の 効果
        s.bossHp -= dmg;
        const defeated = s.bossHp <= 0;
        // ボスを たおすと コイン 1（v2.0 第2段階）＋ オーロラの マント（げきレア・v9.0）で もう ＋2
        const bossCoins = (1 + (s.gear.bossCoin || 0)) * (s.bossHard ? HARD_MUL : 1);
        let enrageNow = false, finalNow = false;
        if (defeated) {
          xp += last ? XP.lastBonus : XP.bossBonus;
          s.coins += bossCoins;
          s.phase = 'done';
          s.bossBeaten = true;
          s.defeated.push(s.bossId);
          s.endedAt = now();
        } else {
          // おこる（第2形態）・さいごの 力（第3形態）。その 1回だけ 知らせる（前は おこった あと 毎回 true だった）
          if (s.bossHp <= s.enrageAt && !s.enraged) { s.enraged = true; enrageNow = true; }
          if (s.finalAt && s.bossHp <= s.finalAt && !s.final) { s.final = true; s.enraged = true; finalNow = true; }
        }
        if (s.bossHard) xp *= HARD_MUL;      // 本気モードは けいけんち 2ばい（v12.7）
        xp = gain(xp);
        noteReview(q, wasRetry);
        if (!defeated && s.bossAsked >= s.bossMax) { s.phase = 'done'; s.bossFled = true; s.endedAt = now(); }
        return {
          outcome: 'bosshit', xp: xp, crit: crit, combo: s.combo, note: q.note, palHit: palHit,
          counter: counter, setMove: setHit,
          weakHit: weakHit, skill: skill, clonePos: pl ? pl.pos : 0, broke: broke, open: open, cloneKO: cloneKO,   // v8.1
          dmg: dmg, burst: usedBurst && !counter && !weakHit && !open ? dmg : 0, coins: defeated ? bossCoins : 0,
          hpLeft: s.bossHp, defeated: defeated, last: last,
          blocked: blocked, hard: s.bossHard,                         // 本気モード（v12.7）
          enrage: enrageNow && !finalNow, final: finalNow,
          fled: !defeated && s.phase === 'done'
        };
      }

      /* ---- ザコ ---- */
      const palHit = palHitNow();
      let xp = wasRetry ? XP.mobRetry : XP.mob;
      if (palHit) xp += palPower().xp;
      if (q.rare) xp *= XP.rareMul;
      if (crit) xp += XP.critBonus;

      const multi = groupResult(q);
      if (multi) {
        const bonus = multi >= 3 ? XP.tripleKO : XP.doubleKO;
        xp += bonus;
        s.multiKO.push(multi);
      }
      if (q.groupPos === 0) s.groupClean = !wasRetry;

      // リベンジ（にげた敵が もどってきた）を たおしたら ボーナス（v3.1）
      if (q.revenge) xp += XP.revenge;
      // ふくしゅう（v11.1）：まえに まちがえた 問題に **1回めで** 正解 → ボーナス（おぼえた）
      if (q.review && !wasRetry) xp += XP.review;
      // ばくれつ こうげき：この 1体ぶんの けいけんちが ばいに
      let burst = 0;
      if (s.buff.dmg > 1) { burst = s.buff.dmg; xp *= burst; s.buff.dmg = 1; }
      // カウンター（v7.7）：てきの こうげきの 問題に 1回めで 正解 → けいけんち 1.5ばい
      const counter = !wasRetry && attacking();
      if (counter) { xp = Math.round(xp * COUNTER_MUL); s.counters++; }
      // 弱点（v8.1・ごちゃまぜ）：弱点の 教科の 問題に 1回めで 正解 → けいけんち 1.5ばい
      const weakHit = !!q.weak && !wasRetry;
      if (weakHit) { xp = Math.round(xp * WEAK_MUL); s.weakHits++; }
      // セットわざ（v14.2）：ザコは けいけんち ボーナス・中ボスは 一発
      const setHit = setHitNow();
      if (setHit) xp += MQ.setwaza.XP;
      xp += s.gear.xpAdd;                    // けん（そうび）の 効果

      /* ---- 中ボス（v8.1）：HP2。つよい 一発（クリティカル・カウンター・追い打ち・ばくれつ・弱点）なら 2ダメージ ---- */
      if (q.elite) {
        // オーロラの たて（げきレア・v9.0）… 中ボスを 一発で たおせる
        const dmg = Math.min(s.eliteLeft, (crit || counter || palHit || burst || weakHit || setHit || s.gear.pierce) ? 2 : 1);
        s.eliteLeft -= dmg;
        if (s.eliteLeft > 0) {
          xp = gain(xp);
          s.typeOk[q.type] = (s.typeOk[q.type] || 0) + 1;
          return {
            outcome: 'elitehit', xp: xp, crit: crit, combo: s.combo, palHit: palHit, note: q.note, setMove: setHit,
            burst: burst, counter: counter, weakHit: weakHit, dmg: dmg, hpLeft: s.eliteLeft, hpMax: q.eliteHp || ELITE_HP
          };
        }
        // たおした：のこりの 問題は とばす。ボーナス＋コイン
        while (s.mobs[s.index + 1] && s.mobs[s.index + 1].elite) s.mobs.splice(s.index + 1, 1);
        xp += XP.eliteBonus;
        s.coins += 1;
        s.elites++;
        xp = gain(xp);
        s.typeOk[q.type] = (s.typeOk[q.type] || 0) + 1;
        s.defeated.push(q.enemyId);
        noteReview(q, wasRetry);
        return {
          outcome: 'correct', elite: true, xp: xp, crit: crit, combo: s.combo, rare: !!q.rare, palHit: palHit, setMove: setHit,
          multi: null, note: q.note, burst: burst, coins: 1, revenge: false, counter: counter, weakHit: weakHit, dmg: dmg
        };
      }

      xp = gain(xp);
      s.typeOk[q.type] = (s.typeOk[q.type] || 0) + 1;
      // ゴールデンスライムは コインを 落とす
      let coins = 0;
      // ゴールデン まつり（v13.16）の ときは 3まい
      if (q.enemyId === goldenId()) {
        coins = (s.weekend && s.weekend.goldenCoins) || 1;
        s.coins += coins;
        if (s.weekend && s.weekend.goldenCoins) s.weekendGold += coins;
      }
      s.defeated.push(q.enemyId);
      if (q.revenge) s.revengeBeaten.push(q.id);
      noteReview(q, wasRetry);
      return {
        outcome: 'correct', xp: xp, crit: crit, combo: s.combo, rare: !!q.rare, palHit: palHit,
        multi: multi, note: q.note, burst: burst, coins: coins, revenge: !!q.revenge, counter: counter,
        weakHit: weakHit, summon: !!q.summon, review: !!q.review, reviewOk: !!q.review && !wasRetry, setMove: setHit
      };
    }

    /* ---- まちがい ---- */
    // てきの こうげきの 問題で まちがえた → 「くらった」（演出だけ・v7.7）
    const hit = !wasRetry && attacking();
    // ボスの わざの 問題（v8.1）：かまえは そのまま・ぶんしんは ボーナスなし・すきは とじる（演出だけ）
    const plNow = (s.phase === 'boss' && !q.called && s.bossPlan) ? s.bossPlan[s.bossAsked] : null;
    const skillNow = plNow ? plNow.kind : null;
    if (!wasRetry && s.phase === 'boss' && !q.called) {
      s.bossOpen = false;
      if (skillNow === 'clone' && plNow.pos === 0) s.cloneClean = false;
    }
    guardOnMiss(q, wasRetry);                        // ガードくだき（2026-09-14）：ボスの 大わざで まちがえた
    if (!wasRetry && !s.timeAttack) {
      s.retry = true;
      s.retryGiven = givenText(q, value);
      // 時とめ：この 問題では コンボが 切れない
      let frozen = false;
      if (s.buff.freeze > 0) { s.buff.freeze--; s.frozenQ = q.id; frozen = true; }
      if (s.frozenQ !== q.id) s.combo = 0;
      if (q.groupId) s.groupClean = false;
      return { outcome: 'retry', hint: makeHint(q), frozen: frozen, combo: s.combo, hit: hit, skill: skillNow, elite: !!q.elite, weak: !!q.weak };
    }

    // てっぺき まもり：2回目に まちがえても にげられない（答えは 見せずに もう1回）
    // ギンガの たて（v14.8）：たてが へらずに ずっと まもる（ガードくだきでも こわれない）
    if ((s.buff.shield > 0 || s.gear.noEscape) && !s.timeAttack) {
      if (!s.gear.noEscape) s.buff.shield--;
      if (s.frozenQ !== q.id) s.combo = 0;
      if (q.groupId) s.groupClean = false;
      return { outcome: 'shielded', left: s.buff.shield, combo: s.combo, hint: makeHint(q), hit: hit };
    }

    // 2回目の まちがい（タイムアタックでは 1回で）
    s.retry = false;
    if (s.frozenQ !== q.id) s.combo = 0;
    s.answered++;
    pushResult(q, false, s.retryGiven != null ? s.retryGiven : givenText(q, value));
    if (q.groupId) s.groupClean = false;

    if (q.chest) {
      return { outcome: 'chestlost', answerText: answerText(q), note: q.note };
    }

    s.escapedNow.push(q);
    // ボスが 呼んだ ザコ（v8.1）に にげられた：ボスとの たたかいは そのまま つづく
    if (q.called) {
      return { outcome: 'wrong', called: true, answerText: answerText(q), note: q.note };
    }
    // 中ボス（v8.1）に にげられた：のこりの 問題も とばす（ふつうの ザコと 同じく あとで もどる）
    if (q.elite) {
      while (s.mobs[s.index + 1] && s.mobs[s.index + 1].elite) s.mobs.splice(s.index + 1, 1);
      return { outcome: 'wrong', elite: true, answerText: answerText(q), note: q.note };
    }
    if (s.phase === 'boss') {
      if (s.bossAsked >= s.bossMax) {
        s.phase = 'done';
        s.bossFled = true;
        s.endedAt = now();
        return { outcome: 'guard', answerText: answerText(q), note: q.note, fled: true };
      }
      return { outcome: 'guard', answerText: answerText(q), note: q.note, fled: false };
    }
    return { outcome: 'wrong', answerText: answerText(q), note: q.note };
  }

  /* =======================================================
     どうぐ（v2.0）。たからものを たたかいの 中で 使う。
     わざの 表（名前・数字）は js/content/treasure.js の POWERS。ここは 効果の 中身。
       burst  … つぎの 正解が val ばい（ボスは val ダメージ・そのぶん けいけんち）
       shield … 2回目に まちがえても val 回 セーフ（answer の 'shielded'）
       freeze … まちがえても コンボが 切れない（val 回）
       guide  … いまの 問題の ヒントを 先に 出す（val 回 使える）
       golden … ふつうの ザコが ゴールデンスライムに（val 体）
       chest  … たからばこを もう1つ さしこむ（コイン val まい）
       power  … おわりまで けいけんち val ばい
       charge … コンボ ＋val
     v5.4 で ふえた 5つ：
       bond   … なかまゲージが 正解1回で val つ たまる（相棒が いる ときだけ）
       rush   … 正解するたび コンボが ＋val 多く たまる（ひっさつが 早い）
       find   … コインが その場で val まい
       swift  … はやとき ボーナス（けいけんち val）が かならず もらえる
       elixir … 相棒の けいけんちが val ばい（相棒が いる ときだけ）
     効果は 正解した ときに 出る。正解しなくても てきが たおれる わざは ない。
     ======================================================= */
  function goldenId() { return MQ.enemies && MQ.enemies.goldenId ? MQ.enemies.goldenId() : 'slime-golden'; }

  // けいけんちを 足す（パワーアップと そうびセットの ばいりつ こみ・四捨五入）
  function gain(xp) {
    const base = Math.round(xp * (s.buff.xpMul || 1) * (s.gear.setMul || 1));
    // フィーバー教科（v7.2）：1回ごとに ばいに なる（画面の「+20」も ばいで 出る）
    const v = s.fever ? base * (s.fever.xpMul || 1) : base;
    s.feverXp += v - base;
    s.xp += v;
    return v;
  }

  function itemById(id) {
    for (let i = 0; i < s.items.length; i++) if (s.items[i].id === id) return s.items[i];
    return null;
  }

  // ゴールデンコールの まと：いまの ザコから じゅんに、ふつうの ザコだけ（はこ・まとめ・レアは とばす）
  function goldenTargets(n) {
    const out = [];
    if (s.phase !== 'mob') return out;
    for (let i = s.index; i < s.mobs.length && out.length < n; i++) {
      const q = s.mobs[i];
      if (q.chest || q.groupId || q.rare || q.elite) continue;
      out.push(i);
    }
    return out;
  }

  // たからばこを さしこむ 場所：いまの ザコ（まとめて 出た ときは その 組・中ボスは 2問）の すぐ あと
  function chestSlot() {
    let i = s.index;
    const q = s.mobs[i];
    if (q && q.groupId) while (i + 1 < s.mobs.length && s.mobs[i + 1].groupId === q.groupId) i++;
    if (q && q.elite) while (i + 1 < s.mobs.length && s.mobs[i + 1].elite) i++;
    return i + 1;
  }

  // 使えるか。{ ok, why }（why は 画面に そのまま 出す 短い ことば）
  function canUse(id) {
    if (!s) return { ok: false, why: 'まだ' };
    const it = itemById(id);
    if (!it) return { ok: false, why: 'ない' };
    if (s.phase === 'done') return { ok: false, why: 'おわった' };
    if (it.left <= 0) return { ok: false, why: 'つかった' };
    if (it.mobOnly && s.phase !== 'mob') return { ok: false, why: 'ボスには つかえない' };
    if (it.palOnly && !s.pal) return { ok: false, why: 'なかまが いない' };
    if (it.power === 'golden' && !goldenTargets(1).length) return { ok: false, why: 'もう ザコが いない' };
    if (it.power === 'guide' && current() && s.guidedQ === current().id) return { ok: false, why: 'もう 見た' };
    return { ok: true };
  }

  /* 使う。もどり値：
       { ok:false, why }  … 使えなかった
       { ok:true, id, name, power, powerName, kind, val, gold, left, buff,
         hint（guide）, targets/now（golden）, at（chest）, combo（charge） } */
  function useItem(id) {
    const c = canUse(id);
    if (!c.ok) return { ok: false, why: c.why };
    const it = itemById(id);
    it.left--;
    s.itemsUsed.push(id);
    const q = current();
    const out = {
      ok: true, id: id, name: it.name, power: it.power, powerName: it.powerName, kind: it.kind,
      val: it.val, gold: !!it.gold, left: it.left
    };
    if (it.power === 'burst') {
      s.buff.dmg = Math.max(s.buff.dmg, it.val);
    } else if (it.power === 'shield') {
      s.buff.shield += it.val;
    } else if (it.power === 'freeze') {
      s.buff.freeze += it.val;
    } else if (it.power === 'guide') {
      s.guidedQ = q.id;
      out.hint = makeHint(q, { max: 1 });      // えらぶ問題は まちがいを 1つだけ 消す
    } else if (it.power === 'golden') {
      out.targets = goldenTargets(it.val);
      out.targets.forEach(function (i) {
        const m = s.mobs[i];
        m.enemyId = goldenId();
        m.rare = true;
        m.golden = true;
      });
      out.now = out.targets.indexOf(s.index) !== -1;   // いまの てきが 変わった
    } else if (it.power === 'chest') {
      const at = chestSlot();
      const cq = makeChestQuestion(s.stage);
      cq.coins = it.val;
      s.mobs.splice(at, 0, cq);
      out.at = at;
    } else if (it.power === 'power') {
      s.buff.xpMul = Math.max(s.buff.xpMul, it.val);
    } else if (it.power === 'charge') {
      s.combo += it.val;
      if (s.combo > s.maxCombo) s.maxCombo = s.combo;
      out.combo = s.combo;
    } else if (it.power === 'bond') {
      s.buff.palPlus = Math.max(s.buff.palPlus, it.val - 1);
      out.gauge = s.palGauge;
    } else if (it.power === 'rush') {
      s.buff.comboPlus = Math.max(s.buff.comboPlus, it.val);
    } else if (it.power === 'find') {
      s.coins += it.val;
      out.coins = it.val;
    } else if (it.power === 'swift') {
      s.buff.fastSure = Math.max(s.buff.fastSure, it.val);
    } else if (it.power === 'elixir') {
      s.buff.palXp = Math.max(s.buff.palXp, it.val);
    }
    out.buff = buffs();
    return out;
  }

  // もちものの いまの 状態（画面用）。can=使える / why=使えない わけ
  function items() {
    if (!s) return [];
    return s.items.map(function (it) {
      const c = canUse(it.id);
      const r = canRecharge(it.id);
      return Object.assign({}, it, { can: c.ok, why: c.ok ? '' : c.why, reOk: r.ok, reWhy: r.ok ? '' : r.why });
    });
  }
  // のこっている 効果（画面用）
  function buffs() {
    if (!s) return { dmg: 1, shield: 0, freeze: 0, xpMul: 1, palPlus: 0, comboPlus: 0, palXp: 1 };
    return {
      dmg: s.buff.dmg, shield: s.buff.shield, freeze: s.buff.freeze, xpMul: s.buff.xpMul,
      palPlus: s.buff.palPlus, comboPlus: s.buff.comboPlus, palXp: s.buff.palXp
    };
  }

  /* =======================================================
     じゅうてん（v2.0 第2段階）：使いおわった アイテムを
     コイン 2まいで もう1回 つかえるように する。1たたかいに 1回。
     さいふ ＝ もってきた コイン ＋ この たたかいで ひろった ぶん。
     ======================================================= */
  const RECHARGE_COST = 2;

  function coinsLeft() {
    if (!s) return 0;
    return Math.max(0, s.wallet + s.coins - s.coinsSpent);
  }

  function canRecharge(id) {
    if (!s) return { ok: false, why: 'まだ' };
    const it = itemById(id);
    if (!it) return { ok: false, why: 'ない' };
    if (s.phase === 'done') return { ok: false, why: 'おわった' };
    if (it.left > 0) return { ok: false, why: 'まだ つかえる' };
    if (s.recharged) return { ok: false, why: '1たたかいに 1回' };
    if (it.mobOnly && s.phase !== 'mob') return { ok: false, why: 'ボスには つかえない' };
    if (coinsLeft() < RECHARGE_COST) return { ok: false, why: 'コインが たりない' };
    return { ok: true };
  }

  function recharge(id) {
    const c = canRecharge(id);
    if (!c.ok) return { ok: false, why: c.why };
    const it = itemById(id);
    it.left = it.uses || 1;
    s.coinsSpent += RECHARGE_COST;
    s.recharged = true;
    return { ok: true, id: id, left: it.left, spent: RECHARGE_COST, coinsLeft: coinsLeft() };
  }

  // 時間切れ（タイムアタックモードのみ）。すぐ「まちがい」あつかいに する
  function timeUp() {
    s.retry = true;    // 2回目あつかいに して すぐ 決着させる
    return answer(null);
  }

  // つぎの問題へ。もどり値 { phase, entering }（entering=true なら ボス戦 開始）
  function next() {
    s.retry = false;
    s.qAt = now();
    if (s.phase === 'mob') {
      if (s.index < s.mobs.length - 1) {
        s.index++;
        const q = s.mobs[s.index];
        if (!q.groupId || q.groupPos === 0) s.groupClean = true;
        return { phase: 'mob' };
      }
      if (!s.hasBoss) { s.phase = 'done'; s.endedAt = now(); return { phase: 'done' }; }
      s.phase = 'boss';
      planBoss();
      s.bossQ = makeBossQuestion();
      s.bossAsked = 1;
      return { phase: 'boss', entering: true };
    }
    if (s.phase === 'boss') {
      // 呼ばれた ザコの あと（v8.1）：用意ずみの ボスの 問題へ（問題数は ふえない）
      if (s.called) { s.called = null; return { phase: 'boss', afterCall: true }; }
      s.bossQ = makeBossQuestion();
      s.bossAsked++;
      const pl = s.bossPlan ? s.bossPlan[s.bossAsked] : null;
      if (pl && pl.kind === 'call') s.called = makeCalledQuestion();
      return { phase: 'boss', call: !!s.called };
    }
    return { phase: 'done' };
  }

  function starsFor(correct, total) {
    if (!total) return 0;
    const rate = correct / total;
    if (rate >= 1) return 3;
    if (rate >= 0.8) return 2;
    if (rate >= 0.5) return 1;
    return 0;
  }

  function elapsed() {
    return Math.max(0, Math.round(((s.endedAt || now()) - s.startedAt) / 1000));
  }

  function summary() {
    const time = elapsed();
    const fast = s.answered > 0 && time <= s.answered * SEC_PER_Q;
    // はやての はね（v5.4）を つかった ときは かならず もらえる
    const fastBonus = Math.max(fast ? XP.fast : 0, s.answered > 0 ? (s.buff.fastSure || 0) : 0) * (s.gear.fastX2 ? 2 : 1);   // ギンガの けん（v14.8）
    const stars = starsFor(s.correct, s.answered);
    // ★3で コイン +1（とっくんは のぞく）
    const starCoins = s.mode !== 'tokkun' && s.answered > 0 && stars === 3 ? 1 : 0;
    // マント（そうび）の コイン（とっくんは のぞく）
    const gearCoins = s.mode !== 'tokkun' && s.answered > 0 ? (s.gear.coins || 0) : 0;
    // フィーバー教科（v7.2）の コイン
    const feverCoins = s.fever && s.answered > 0 ? (s.fever.coins || 0) : 0;
    // ごちゃまぜ バトル（v7.3）：★の かわりに コイン +1
    const mixCoins = s.mix && s.answered > 0 ? 1 : 0;
    // しゅうまつ イベントの コイン まつり（v13.16）
    const weekendCoins = s.weekend && s.answered > 0 ? (s.weekend.coins || 0) : 0;
    // ギンガの マント（v14.8）：パーフェクト（ぜんもん 1回めで 正解）なら コイン ＋5
    const perfectCoins = s.mode !== 'tokkun' && s.answered > 0 && s.correct === s.answered ? (s.gear.perfectCoin || 0) : 0;
    return {
      mix: s.mix,
      mixCoins: mixCoins,
      weekend: s.weekend ? (s.weekend.id || 'on') : null,   // しゅうまつ イベント（v13.16）
      weekendCoins: weekendCoins,
      weekendGold: s.weekendGold,
      chestCount: s.chestCount,
      counters: s.counters,            // カウンターを 決めた 数（v7.7）
      elites: s.elites,                // たおした 中ボス（v8.1）
      weakHits: s.weakHits,            // 弱点を ついた 数（v8.1）
      skillHits: s.skillHits,          // ボスの わざを さばいた 数（v8.1）
      fever: !!s.fever,
      feverBonus: s.feverXp,
      feverCoins: feverCoins,
      support: s.support ? (s.support.level || 'weak') : null,
      stageId: s.stage.id,
      mode: s.mode,
      correct: s.correct,
      total: s.answered,
      xp: s.xp + fastBonus,
      baseXp: s.xp,
      fastBonus: fastBonus,
      time: time,
      coins: s.coins + starCoins + gearCoins + feverCoins + mixCoins + weekendCoins + perfectCoins,
      perfectCoins: perfectCoins,
      starCoins: starCoins,
      gearCoins: gearCoins,
      gearSet: s.gear.setName || '',
      setMoves: s.setMoves || 0,         // セットわざを 出した 数（v14.2）
      palXpMul: s.buff.palXp || 1,
      coinsSpent: s.coinsSpent,
      chestOpened: s.chestOpened,
      multiKO: s.multiKO.slice(),
      stars: stars,
      maxCombo: s.maxCombo,
      defeated: s.defeated,
      bossBeaten: s.bossBeaten,
      bossFled: s.bossFled,
      bossHard: s.bossHard,            // 本気モードで たたかった（v12.7）
      escaped: s.escapedNow.map(function (q) {
        return {
          key: q.id, q: plain(q), enemyId: q.enemyId,
          stageId: s.stage.id, areaId: q.areaId || null,
          at: new Date().toISOString()
        };
      }),
      revengeBeaten: s.revengeBeaten,
      revengeBonus: s.revengeBeaten.length * XP.revenge,
      /* ふくしゅう（v11.1）。にげた敵と 同じ 形で かえす（画面が MQ.review に わたす） */
      review: s.reviewNow.map(function (q) {
        return {
          key: q.id, q: plain(q), enemyId: q.enemyId,
          stageId: q.stageId || s.stage.id, areaId: q.areaId || null,
          at: new Date().toISOString()
        };
      }),
      reviewDone: s.reviewDone.slice(),
      reviewHits: s.reviewHits,
      reviewBonus: s.reviewHits * XP.review,
      results: s.results.slice(),      // とくい・にがて（v7.1）
      typeOk: Object.assign({}, s.typeOk),
      itemsUsed: s.itemsUsed.slice(),
      palHits: s.palHits,
      palId: s.pal ? s.pal.id : null
    };
  }

  return {
    start: start, current: current, answer: answer, timeUp: timeUp, next: next, summary: summary,
    isCorrect: isCorrect, answerText: answerText,   // テスト用（v6.5・分数の 判定を smoke が 見る）
    givenText: givenText,                           // テスト用（v7.1）
    useItem: useItem, canUse: canUse, items: items, buffs: buffs,
    preHint: preHint,                                // サポート（v7.2）
    chargeInfo: chargeInfo, attacking: attacking,    // てきの ため → カウンター（v7.7）
    // ガードくだき（2026-09-14）：まもりの ようすと、いまの 答えで おきた こと（{ kind: 'crack'|'broke'|'hit'|'none', … } か null）
    guards: guards, guardEvent: function () { return s ? s.gbEvent : null; },
    GB_GAIN_MAX: GB_GAIN_MAX, GB_REPAIR: GB_REPAIR, GB_REPAIR_XP: GB_REPAIR_XP,
    _setBossHp: function (n) { if (s) { s.bossHp = n; if (n > s.bossHpMax) s.bossHpMax = n; } },   // テスト用
    CHARGE_MOB: CHARGE_MOB, CHARGE_BOSS: CHARGE_BOSS, COUNTER_MUL: COUNTER_MUL, COUNTER_DMG: COUNTER_DMG,
    // 敵がわの 攻防（v8.1）
    ELITE_HP: ELITE_HP, WEAK_MUL: WEAK_MUL, WEAK_DMG: WEAK_DMG, BOSS_SKILLS: BOSS_SKILLS,
    XP_REVIEW: XP.review,                            // ふくしゅう（v11.1）
    bossSkill: bossSkill, foeCount: foeCount,
    eliteLeft: function () { return s ? s.eliteLeft : 0; },
    weakArea: function () { return s ? s.weakArea : null; },
    bossPlan: function () { return s ? s.bossPlan : {}; },
    // テスト用：ボスの わざの 予定を 決めうちに する（harness / smoke）
    _setBossPlan: function (plan) { if (s) s.bossPlan = plan || {}; },
    fever: function () { return s ? s.fever : null; },
    weekend: function () { return s ? s.weekend : null; },   // v13.16
    support: function () { return s ? s.support : null; },
    recharge: recharge, canRecharge: canRecharge, rechargeCost: RECHARGE_COST, coinsLeft: coinsLeft,
    phase: function () { return s.phase; },
    mode: function () { return s.mode; },
    isOver: function () { return s.phase === 'done'; },
    bossId: function () { return s.bossId; },
    mobIndex: function () { return s.index; },
    mobTotal: function () { return s.mobs.length; },
    bossHp: function () { return s.bossHp; },
    bossHpMax: function () { return s.bossHpMax; },
    bossAsked: function () { return s.bossAsked; },
    bossMax: function () { return s.bossMax; },
    isEnraged: function () { return s.enraged; },
    // ボスを 強く（v12.7）
    BOSS_SET: BOSS_SET, PAL_BOSS_MAX: PAL_BOSS_MAX, HARD_MUL: HARD_MUL,
    isFinal: function () { return !!(s && s.final); },
    bossHard: function () { return !!(s && s.bossHard); },
    // 本気モード：ボスの 1問めに 答える 前だけ 変えられる（ボスが いない たたかいでは なにも しない）
    setBossHard: function (on) {
      if (!s || !s.hasBoss || s.bossAnswered) return false;
      s.bossHard = !!on;
      return true;
    },
    combo: function () { return s.combo; },
    palGauge: function () { return s.palGauge; },
    palGaugeNeed: function () { return MQ.pals ? MQ.pals.gaugeNeed() : 3; },
    // セットわざ（v14.2）：{ id, gauge, need, used, max }。セットわざの ない たたかいは null
    setInfo: function () {
      if (!s || !s.setWaza || !MQ.setwaza) return null;
      return { id: s.setWaza, gauge: s.setGauge, need: MQ.setwaza.NEED, used: s.setMoves, max: MQ.setwaza.MAX };
    },
    // かぶと（そうび）で ひっさつわざが 何コンボ 早く 出るか（v5.4）
    specialBoost: function () { return (s && s.gear && s.gear.special) || 0; },
    // オーロラの かぶと（げきレア・v9.0）で ひっさつわざが 1つ 上に なるか
    specialTierUp: function () { return !!(s && s.gear && s.gear.tierUp); },
    // クリティカルが 何コンボから 出るか（オーロラの けんで 2に なる・v9.0）
    critFrom: function () { return (s && s.gear && s.gear.critEasy) ? 2 : 3; },
    gear: function () { return s ? s.gear : null; },
    correct: function () { return s.correct; },
    isRetry: function () { return s.retry; },
    stage: function () { return s.stage; },
    elapsed: elapsed,
    timeAttack: function () { return s.timeAttack; },
    starsFor: starsFor,
    answerText: answerText,
    plain: plain,
    XP: XP
  };
})();
