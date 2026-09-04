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
         ・英語の空では ABC3きょうだいが「3体同時」＝トリプルKO
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
    fast: 30                       // はやとき ボーナス
  };
  const SEC_PER_Q = 20;            // これより 早ければ はやとき ボーナス

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
    ['boss', 'revenge', 'enemyId', 'rare', 'chest', 'groupId', 'groupSize', 'groupPos', 'groupIds', 'golden', 'coins'].forEach(function (k) {
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
    for (let i = 0; i < 6; i++) {
      const made = s.stage.make(1, { boss: true, index: s.bossAsked });
      if (!made || !made[0]) break;
      q = prepare(made[0]);
      if (s.usedBossKeys.indexOf(q.id) === -1) break;
    }
    if (!q) return null;
    s.usedBossKeys.push(q.id);
    q.boss = true;
    q.enemyId = s.bossId;
    return q;
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
       enemies  … ザコの id
       bossId   … ボスの id
       rareId   … レア敵の id（入れないときは null）
       trioIds  … 3体同時に する敵の id 3つ（入れないときは null）
       chest    … たからばこを 出すか
       mobs / bossHp / bossMax / enrageAt
       timeAttack … 1問ごとの 制限びょう（ふつうは 0＝制限なし）
       items    … もちもの（MQ.treasure.bagItems(player) の ならび）。
                  タイムアタックの ときは 無視される
       coins    … いま もっている きんのコイン（じゅうてん用の さいふ）  */
  function start(opts) {
    const mode = opts.mode || 'normal';
    const stage = opts.stage;

    let mobs = [];
    if (mode === 'tokkun') {
      // にげた敵だけ。問題は 保存してあるものを そのまま つかう
      mobs = (opts.escaped || []).map(function (entry) {
        const q = prepare(entry.q);
        q.id = entry.key;
        q.revenge = true;
        q.enemyId = entry.enemyId;
        q.areaId = entry.areaId || null;
        return q;
      });
    } else if (mode === 'normal') {
      const mobCount = opts.mobs || 9;
      const revenge = (opts.escaped || []).slice(0, 2);
      const freshCount = Math.max(1, mobCount - revenge.length);

      mobs = stage.make(freshCount, { boss: false }).map(prepare);
      mobs = sortByLevel(mobs);
      const enemyIds = (opts.enemies || []).slice();
      mobs.forEach(function (q, i) {
        q.enemyId = enemyIds.length ? enemyIds[i % enemyIds.length] : 'slime-green';
      });

      revenge.forEach(function (entry) {
        const q = prepare(entry.q);
        q.id = entry.key;
        q.revenge = true;
        q.enemyId = entry.enemyId;
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
        for (let i = 0; i < groupSize; i++) {
          const q = mobs[at + i];
          q.enemyId = ids[i];
          q.groupId = 'g' + at;
          q.groupSize = groupSize;
          q.groupPos = i;
          q.groupIds = ids;
          if (trio) q.rare = true;
        }
      }
    }

    // レアの しるし（敵の データを 見て つける）
    mobs.forEach(function (q) {
      const e = MQ.enemies.get(q.enemyId);
      if (e && e.rare) q.rare = true;
    });

    // たからばこ（まちがえても 罰なし）
    if (opts.chest && mode === 'normal' && mobs.length >= 3) {
      const at = MQ.util.randInt(2, mobs.length - 1);
      mobs.splice(at, 0, makeChestQuestion(stage));
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

    s = {
      items: bag,
      gear: gear,
      // どうぐ・そうびの 効果（のこり）
      buff: {
        dmg: 1,
        shield: opts.timeAttack ? 0 : gear.safe,   // たて：はじめから セーフ
        freeze: opts.timeAttack ? 0 : gear.keep,   // よろい：はじめから コンボを まもる
        xpMul: 1, palPlus: 0, comboPlus: 0, fastSure: 0, palXp: 1
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
      bossAsked: 0,
      usedBossKeys: [],
      bossQ: null,
      enraged: false,
      retry: false,
      combo: 0,
      pal: opts.pal || null,       // いまの 相棒（{ id, name }）。いなければ null
      palHits: 0,
      palGauge: 0,                 // なかまゲージ（正解で たまる・まちがえても へらない・v5.2）
      maxCombo: 0,
      correct: 0,
      answered: 0,
      xp: 0,
      coins: 0,
      defeated: [],
      escapedNow: [],
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
      endedAt: 0
    };

    // ザコが 0体なら いきなり ボス（塔）
    if (s.phase === 'boss') {
      s.bossQ = makeBossQuestion();
      s.bossAsked = 1;
    }
    return s;
  }

  function current() { return s.phase === 'boss' ? s.bossQ : s.mobs[s.index]; }

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
  function palHitNow() {
    if (!s.pal || !MQ.pals) return false;
    s.palGauge += 1 + (s.buff.palPlus || 0);     // きずなの わ（v5.4）で 早く たまる
    const need = MQ.pals.gaugeNeed();
    const hit = s.palGauge >= need;
    if (hit) { s.palGauge = 0; s.palHits++; }
    return hit;
  }

  function answer(value) {
    const q = current();
    const wasRetry = s.retry;

    if (isCorrect(q, value)) {
      s.retry = false;
      s.answered++;
      s.correct++;
      let crit = false;
      if (!wasRetry) {
        s.combo += 1 + (s.buff.comboPlus || 0);   // コンボの まきもの（v5.4）
        if (s.combo > s.maxCombo) s.maxCombo = s.combo;
        crit = s.combo >= 3;
      } else if (q.groupId) {
        s.groupClean = false;
      }

      /* ---- たからばこ ---- */
      if (q.chest) {
        const palHit = palHitNow();
        const xp = gain(XP.chest + (palHit ? XP.pal : 0) + s.gear.xpAdd);
        const coins = q.coins || 1;        // たからばこ よび（金色）は 2まい
        s.coins += coins;
        s.chestOpened = true;
        return { outcome: 'chest', xp: xp, coins: coins, combo: s.combo, crit: crit, note: q.note, palHit: palHit };
      }

      /* ---- ボス ---- */
      if (s.phase === 'boss') {
        const last = s.mode === 'tower';
        // ばくれつ こうげき：ダメージが ふえ、そのぶん けいけんちも 入る
        const palHit = palHitNow();
        let dmg = s.buff.dmg > 1 ? Math.min(s.buff.dmg, s.bossHp) : 1;
        if (palHit) dmg = Math.min(dmg + 1, s.bossHp);      // 相棒の 追い打ち
        s.buff.dmg = 1;
        let xp = (wasRetry ? (last ? XP.lastHitRetry : XP.bossHitRetry) : (last ? XP.lastHit : XP.bossHit)) * dmg;
        if (crit) xp += XP.critBonus;
        xp += s.gear.xpAdd;                  // けん（そうび）の 効果
        s.bossHp -= dmg;
        const defeated = s.bossHp <= 0;
        if (defeated) {
          xp += last ? XP.lastBonus : XP.bossBonus;
          s.coins += 1;            // ボスを たおすと コイン（v2.0 第2段階）
          s.phase = 'done';
          s.bossBeaten = true;
          s.defeated.push(s.bossId);
          s.endedAt = now();
        } else if (s.bossHp <= s.enrageAt && !s.enraged) {
          s.enraged = true;
        }
        xp = gain(xp);
        if (!defeated && s.bossAsked >= s.bossMax) { s.phase = 'done'; s.bossFled = true; s.endedAt = now(); }
        return {
          outcome: 'bosshit', xp: xp, crit: crit, combo: s.combo, note: q.note, palHit: palHit,
          dmg: dmg, burst: dmg > 1 ? dmg : 0, coins: defeated ? 1 : 0,
          hpLeft: s.bossHp, defeated: defeated, last: last,
          enrage: !defeated && s.bossHp <= s.enrageAt && s.enraged,
          fled: !defeated && s.phase === 'done'
        };
      }

      /* ---- ザコ ---- */
      const palHit = palHitNow();
      let xp = wasRetry ? XP.mobRetry : XP.mob;
      if (palHit) xp += XP.pal;
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
      // ばくれつ こうげき：この 1体ぶんの けいけんちが ばいに
      let burst = 0;
      if (s.buff.dmg > 1) { burst = s.buff.dmg; xp *= burst; s.buff.dmg = 1; }
      xp += s.gear.xpAdd;                    // けん（そうび）の 効果
      xp = gain(xp);
      s.typeOk[q.type] = (s.typeOk[q.type] || 0) + 1;
      // ゴールデンスライムは コインを 落とす
      let coins = 0;
      if (q.enemyId === goldenId()) { coins = 1; s.coins += 1; }
      s.defeated.push(q.enemyId);
      if (q.revenge) s.revengeBeaten.push(q.id);
      return {
        outcome: 'correct', xp: xp, crit: crit, combo: s.combo, rare: !!q.rare, palHit: palHit,
        multi: multi, note: q.note, burst: burst, coins: coins, revenge: !!q.revenge
      };
    }

    /* ---- まちがい ---- */
    if (!wasRetry && !s.timeAttack) {
      s.retry = true;
      // 時とめ：この 問題では コンボが 切れない
      let frozen = false;
      if (s.buff.freeze > 0) { s.buff.freeze--; s.frozenQ = q.id; frozen = true; }
      if (s.frozenQ !== q.id) s.combo = 0;
      if (q.groupId) s.groupClean = false;
      return { outcome: 'retry', hint: makeHint(q), frozen: frozen, combo: s.combo };
    }

    // てっぺき まもり：2回目に まちがえても にげられない（答えは 見せずに もう1回）
    if (s.buff.shield > 0 && !s.timeAttack) {
      s.buff.shield--;
      if (s.frozenQ !== q.id) s.combo = 0;
      if (q.groupId) s.groupClean = false;
      return { outcome: 'shielded', left: s.buff.shield, combo: s.combo, hint: makeHint(q) };
    }

    // 2回目の まちがい（タイムアタックでは 1回で）
    s.retry = false;
    if (s.frozenQ !== q.id) s.combo = 0;
    s.answered++;
    if (q.groupId) s.groupClean = false;

    if (q.chest) {
      return { outcome: 'chestlost', answerText: answerText(q), note: q.note };
    }

    s.escapedNow.push(q);
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
    const v = Math.round(xp * (s.buff.xpMul || 1) * (s.gear.setMul || 1));
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
      if (q.chest || q.groupId || q.rare) continue;
      out.push(i);
    }
    return out;
  }

  // たからばこを さしこむ 場所：いまの ザコ（まとめて 出た ときは その 組）の すぐ あと
  function chestSlot() {
    let i = s.index;
    const q = s.mobs[i];
    if (q && q.groupId) while (i + 1 < s.mobs.length && s.mobs[i + 1].groupId === q.groupId) i++;
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
    if (s.phase === 'mob') {
      if (s.index < s.mobs.length - 1) {
        s.index++;
        const q = s.mobs[s.index];
        if (!q.groupId || q.groupPos === 0) s.groupClean = true;
        return { phase: 'mob' };
      }
      if (!s.hasBoss) { s.phase = 'done'; s.endedAt = now(); return { phase: 'done' }; }
      s.phase = 'boss';
      s.bossQ = makeBossQuestion();
      s.bossAsked = 1;
      return { phase: 'boss', entering: true };
    }
    if (s.phase === 'boss') {
      s.bossQ = makeBossQuestion();
      s.bossAsked++;
      return { phase: 'boss' };
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
    const fastBonus = Math.max(fast ? XP.fast : 0, s.answered > 0 ? (s.buff.fastSure || 0) : 0);
    const stars = starsFor(s.correct, s.answered);
    // ★3で コイン +1（とっくんは のぞく）
    const starCoins = s.mode !== 'tokkun' && s.answered > 0 && stars === 3 ? 1 : 0;
    // マント（そうび）の コイン（とっくんは のぞく）
    const gearCoins = s.mode !== 'tokkun' && s.answered > 0 ? (s.gear.coins || 0) : 0;
    return {
      stageId: s.stage.id,
      mode: s.mode,
      correct: s.correct,
      total: s.answered,
      xp: s.xp + fastBonus,
      baseXp: s.xp,
      fastBonus: fastBonus,
      time: time,
      coins: s.coins + starCoins + gearCoins,
      starCoins: starCoins,
      gearCoins: gearCoins,
      gearSet: s.gear.setName || '',
      palXpMul: s.buff.palXp || 1,
      coinsSpent: s.coinsSpent,
      chestOpened: s.chestOpened,
      multiKO: s.multiKO.slice(),
      stars: stars,
      maxCombo: s.maxCombo,
      defeated: s.defeated,
      bossBeaten: s.bossBeaten,
      bossFled: s.bossFled,
      escaped: s.escapedNow.map(function (q) {
        return {
          key: q.id, q: plain(q), enemyId: q.enemyId,
          stageId: s.stage.id, areaId: q.areaId || null,
          at: new Date().toISOString()
        };
      }),
      revengeBeaten: s.revengeBeaten,
      revengeBonus: s.revengeBeaten.length * XP.revenge,
      typeOk: Object.assign({}, s.typeOk),
      itemsUsed: s.itemsUsed.slice(),
      palHits: s.palHits,
      palId: s.pal ? s.pal.id : null
    };
  }

  return {
    start: start, current: current, answer: answer, timeUp: timeUp, next: next, summary: summary,
    isCorrect: isCorrect, answerText: answerText,   // テスト用（v6.5・分数の 判定を smoke が 見る）
    useItem: useItem, canUse: canUse, items: items, buffs: buffs,
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
    combo: function () { return s.combo; },
    palGauge: function () { return s.palGauge; },
    palGaugeNeed: function () { return MQ.pals ? MQ.pals.gaugeNeed() : 3; },
    // かぶと（そうび）で ひっさつわざが 何コンボ 早く 出るか（v5.4）
    specialBoost: function () { return (s && s.gear && s.gear.special) || 0; },
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
