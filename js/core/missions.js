/* ---------------------------------------------------------
   きょうの ミッション（v3.1）

   毎日 3つの 小さな 目あて。1つ クリアで きんのコイン 1まい、
   3つ ぜんぶで さらに コイン 2まい ＋ けいけんち 50。
   「きょうは ここまで」が 決めやすく、毎日 ひらく 理由に なる（ユーザー「すごく いい」）。

   しくみ：
     ・プレイヤーごとに p.missions = { day, list: [ { id, text, target, count, done, param } ], claimedAll }
     ・日づけが 変わったら 作り直す（ensure）。前の日の のこりは 消える
     ・たたかいが おわった とき（applyRewards）に progress(p, summary, ctx) で 進める。
       クリアした ぶんの ごほうびは その場で p.coins / p.xp に 入る
     ・3つは グループ a（かず）・b（わざ）・c（いろいろ）から 1つずつ。
       その 子に できない ものは 出さない（かん字が ない 学期・アイテムが ない など）
   DOM を 知らない。日づけは テスト用に setNow で 入れかえられる。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.missions = (function () {
  const REWARD_EACH = 1;        // 1つ クリア → コイン
  const REWARD_ALL_COINS = 2;   // 3つ ぜんぶ → コイン
  const REWARD_ALL_XP = 50;     // 3つ ぜんぶ → けいけんち
  let NOW = null;

  function now() { return NOW || new Date(); }
  function dayKey(d) { d = d || now(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  /* ---- その 子に できるか ---- */
  function stageOk(id) {
    try {
      const f = MQ.content.findStage(id);
      return !!(f && f.stage && MQ.content.isAvailable(f.stage));
    } catch (e) { return false; }
  }
  /* かん字を 書く問題が ある ステージ（小1 こくご4・小2 こくご2・小3 国語2）。
     その 学年の ワールドに ない ときは 出さない
     （小4は いま 算数だけ。国語を 足したら ここに 1行 足す） */
  const WRITE_STAGE = { 1: 'kokugo1-4', 2: 'kokugo2-2', 3: 'kokugo3-2', 4: 'kokugo4-2' };
  function hasWrite(p) {
    const g = p.grade || 3;
    const id = WRITE_STAGE[g];
    if (!id) return false;
    try {
      const w = MQ.content.worldForGrade(g);
      const inWorld = (w.areas || []).some(function (a) {
        return (a.stages || []).some(function (st) { return st.id === id; });
      });
      if (!inWorld) return false;
    } catch (e) { return false; }
    return stageOk(id);
  }
  // 開いている ステージが ある 教科の エリア
  function areasOf(p) {
    try {
      return MQ.content.subjectAreas().filter(function (a) {
        return (a.stages || []).some(function (st) { return MQ.content.isAvailable(st); });
      }).map(function (a) { return { id: a.id, name: a.name }; });
    } catch (e) { return []; }
  }
  function escapedCount(p) { return MQ.save && MQ.save.countAllEscaped ? MQ.save.countAllEscaped(p) : 0; }

  /* ---- 種類 ----
       group  … a=かず・b=わざ・c=いろいろ（1つずつ えらぶ）
       targets… 目あての 数（ランダムに 1つ）
       text   … 画面の 文（小1でも 読める ように ひらがな 多め）
       count  … 1回の たたかいで 進む 数（summary, ctx, mission）
       once   … 「出せたか どうか」の 目あて（進み具合は 出さない）
       ok     … その 子に 出して よいか
       param  … 目あての 相手（エリアなど） */
  const KINDS = [
    { id: 'battle', group: 'a', targets: [1, 2], text: function (n) { return 'バトルを ' + n + 'かい する'; }, count: function () { return 1; } },
    { id: 'correct', group: 'a', targets: [10, 15, 20], text: function (n) { return 'もんだいに ' + n + 'もん せいかいする'; }, count: function (sum) { return sum.correct || 0; } },
    { id: 'boss', group: 'b', targets: [1], text: function () { return 'ボスを 1たい たおす'; }, count: function (sum) { return sum.bossBeaten ? 1 : 0; } },
    { id: 'combo', group: 'b', targets: [5, 8], once: true, text: function (n) { return n + 'コンボを 出す'; }, count: function (sum, ctx, m) { return (sum.maxCombo || 0) >= m.target ? m.target : 0; } },
    { id: 'star3', group: 'b', targets: [1], text: function () { return '★3を 1かい とる'; }, count: function (sum) { return sum.mode === 'normal' && sum.stars === 3 ? 1 : 0; } },
    { id: 'perfect', group: 'b', targets: [1], text: function () { return 'ぜんもん せいかいを 1かい'; }, count: function (sum) { return sum.total >= 10 && sum.correct === sum.total ? 1 : 0; } },
    { id: 'fast', group: 'b', targets: [1], text: function () { return 'はやとき ボーナスを 1かい'; }, count: function (sum) { return sum.fastBonus ? 1 : 0; } },
    { id: 'chest', group: 'b', targets: [1], text: function () { return 'たからばこを 1かい あける'; }, count: function (sum) { return sum.chestOpened ? 1 : 0; } },
    { id: 'write', group: 'c', targets: [2, 3], text: function (n) { return 'かん字の もんだいに ' + n + 'もん せいかい'; }, count: function (sum) { return (sum.typeOk && sum.typeOk.write) || 0; }, ok: hasWrite },
    { id: 'area', group: 'c', targets: [1], text: function (n, m) { return m.name + 'で 1かい たたかう'; }, count: function (sum, ctx, m) { return ctx && ctx.areaId === m.param && sum.mode === 'normal' ? 1 : 0; }, ok: function (p) { return areasOf(p).length > 0; }, param: function (p) { return pick(areasOf(p)); } },
    { id: 'revenge', group: 'c', targets: [1], text: function () { return 'リベンジを 1かい せいこう'; }, count: function (sum) { return (sum.revengeBeaten || []).length; }, ok: function (p) { return escapedCount(p) > 0; } },
    { id: 'item', group: 'c', targets: [1], text: function () { return 'アイテムを 1かい つかう'; }, count: function (sum) { return (sum.itemsUsed || []).length; }, ok: function (p) { return (p.bag || []).length > 0; } },
    { id: 'tokkun', group: 'c', targets: [1], text: function () { return 'とっくんを 1かい する'; }, count: function (sum) { return sum.mode === 'tokkun' ? 1 : 0; }, ok: function (p) { return escapedCount(p) > 0; } }
  ];
  const byId = {};
  KINDS.forEach(function (k) { byId[k.id] = k; });

  function generate(p) {
    const list = [];
    ['a', 'b', 'c'].forEach(function (g) {
      const cands = KINDS.filter(function (k) { return k.group === g && (!k.ok || k.ok(p)); });
      const k = cands.length ? pick(cands) : byId.battle;
      const target = pick(k.targets);
      const param = k.param ? k.param(p) : null;
      list.push({
        id: k.id, target: target, count: 0, done: false,
        param: param ? param.id : null, name: param ? param.name : null,
        text: k.text(target, { param: param ? param.id : null, name: param ? param.name : '' })
      });
    });
    return list;
  }

  // きょうの ミッション（日づけが 変わっていたら 作り直す）。p を 書きかえる
  function ensure(p) {
    if (!p) return null;
    const day = dayKey();
    if (!p.missions || !Array.isArray(p.missions.list) || p.missions.day !== day) {
      p.missions = { day: day, list: generate(p), claimedAll: false };
    }
    return p.missions;
  }

  /* たたかいの まとめ（battle.summary()）を 反映。p を 書きかえる。
     かえり値 { completed: [mission], allDone, coins, xp, list } */
  function progress(p, sum, ctx) {
    const ms = ensure(p);
    const completed = [];
    ms.list.forEach(function (m) {
      if (m.done) return;
      const k = byId[m.id];
      if (!k) return;
      const inc = k.count(sum || {}, ctx || {}, m) || 0;
      if (!inc) return;
      m.count = Math.min(m.target, (m.count || 0) + inc);
      if (m.count >= m.target) { m.done = true; completed.push(m); }
    });
    let coins = completed.length * REWARD_EACH, xp = 0, allDone = false;
    if (ms.list.every(function (m) { return m.done; }) && !ms.claimedAll) {
      ms.claimedAll = true;
      allDone = true;
      coins += REWARD_ALL_COINS;
      xp += REWARD_ALL_XP;
      p.missionDays = (p.missionDays || 0) + 1;
    }
    if (completed.length) p.missionsDone = (p.missionsDone || 0) + completed.length;
    p.coins = (p.coins || 0) + coins;
    p.xp = (p.xp || 0) + xp;
    return { completed: completed, allDone: allDone, coins: coins, xp: xp, list: ms.list };
  }

  function isOnce(m) { const k = byId[m.id]; return !!(k && k.once); }

  return {
    KINDS: KINDS,
    REWARD_EACH: REWARD_EACH, REWARD_ALL_COINS: REWARD_ALL_COINS, REWARD_ALL_XP: REWARD_ALL_XP,
    ensure: ensure,
    generate: generate,
    progress: progress,
    isOnce: isOnce,
    dayKey: dayKey,
    now: now,
    setNow: function (d) { NOW = d || null; }
  };
})();
