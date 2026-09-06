/* ---------------------------------------------------------
   スタンプカレンダー（つづけた 日・v8.4）

   「あしたも 開く 理由」を 作る しくみ。
   その日 **1問でも 答えた 日**が スタンプ 1つ。7マスで ひとまわり。

   きまり（企画メモ v8.3ワクワクをつくる3つメモ.md の C）
     ・データは 新しく 作らない。v7.4 の `p.stats.days` を 読むだけ
     ・3日で コイン1／5日で コイン2／7日で コイン3。7日を こえたら また 1日めから
     ・**切れても ばつは ゼロ**（へらす・とりあげる ことは しない）。また 1日めから、だけ
     ・**あしたの ごほうびを 見せる**（ここが ワクワクの 本体）

   セーブ：`p.streak = { claimed: { '3': '2026-09-06' } }`
           （ごほうびを もらった 日。同じ 日に 2回は もらえない）

   ※ 企画では 7日めを「たからもの 1つ」に して いたが、たからものは
     ステージの ごほうび（ずかんの あつめぐあいが くるう）なので **コイン 3**に した。
     コインは なかまの こうかんと アイテムの「もう1回」に つかえる。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.streak = (function () {
  const CYCLE = 7;                                   // 7マスで ひとまわり
  const REWARDS = { 3: 1, 5: 2, 7: 3 };              // マスの 数 → コイン
  const MAX_BACK = 400;                              // さかのぼる 日数（stats は 400日 のこる）

  function nowDate(d) { return d || (MQ.stats ? MQ.stats.now() : new Date()); }
  function key(d) { return MQ.stats.dayKey(d); }
  function daysOf(player) { return (player && player.stats && player.stats.days) || {}; }
  function stamped(player, d) {
    const rec = daysOf(player)[key(d)];
    return !!(rec && rec.n > 0);
  }

  // 7マスの なんマスめか（8日め → 1マスめ）
  function posOf(n) { return n <= 0 ? 0 : ((n - 1) % CYCLE) + 1; }

  /* いまの ようす。
       days   … れんぞく 何日（きょう まだ なら きのうまでの 数）
       today  … きょう もう スタンプが ついたか
       fill   … 光って いる マスの 数（0〜7）
       here   … いま いる マス（きょう ついたら その マス／まだなら きょう つく マス）
       cells  … [{ n, on, today, reward }] 7つ
       next   … あしたの ようす { n, pos, coins }
       reward … きょう もらえる コイン（まだ もらって いなければ）  */
  function info(player, when) {
    const d = nowDate(when);
    const today = stamped(player, d);
    let days = 0;
    // きょう ついて いれば きょうから、まだなら きのうから さかのぼる
    for (let i = today ? 0 : 1; i < MAX_BACK; i++) {
      if (!stamped(player, MQ.stats.addDays(d, -i))) break;
      days++;
    }
    const here = today ? posOf(days) : posOf(days + 1);
    const fill = today ? posOf(days) : here - 1;
    const cells = [];
    for (let i = 1; i <= CYCLE; i++) {
      cells.push({ n: i, on: i <= fill, today: i === here, reward: REWARDS[i] || 0 });
    }
    const nextN = (today ? days : days + 1) + 1;     // あしたの れんぞく 日数
    const nextPos = posOf(nextN);
    return {
      days: days, today: today, fill: fill, here: here, cells: cells,
      pos: here, coinsToday: today ? (REWARDS[here] || 0) : 0,
      next: { n: nextN, pos: nextPos, coins: REWARDS[nextPos] || 0 },
      claimable: claimableOf(player, d, today, here)
    };
  }

  function claimedOf(player) {
    if (!player.streak || typeof player.streak !== 'object') player.streak = { claimed: {} };
    if (!player.streak.claimed || typeof player.streak.claimed !== 'object') player.streak.claimed = {};
    return player.streak.claimed;
  }

  // きょう もらえる ごほうび（もう もらって いたら 0）
  function claimableOf(player, d, today, here) {
    if (!today) return 0;
    const coins = REWARDS[here] || 0;
    if (!coins) return 0;
    return claimedOf(player)[String(here)] === key(d) ? 0 : coins;
  }

  /* ごほうびを わたす（コインを ふやす）。もらえない ときは null。
     player を 書きかえるので、呼ぶ 側で MQ.save.update の 中から よぶ */
  function claim(player, when) {
    const d = nowDate(when);
    const st = info(player, d);
    if (!st.claimable) return null;
    claimedOf(player)[String(st.here)] = key(d);
    player.coins = (player.coins || 0) + st.claimable;
    return { days: st.days, pos: st.here, coins: st.claimable };
  }

  return {
    CYCLE: CYCLE, REWARDS: REWARDS,
    info: info, claim: claim, posOf: posOf, stamped: stamped
  };
})();
