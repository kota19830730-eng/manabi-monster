/* ---------------------------------------------------------
   しゅうまつ イベント（v13.16）

   **DOM を 知らない。** 画面は js/ui/map.js（地図の ふだ・パネル・ポップ）と
   js/ui/battle.js（はじめの 帯・ゴールデンを 出す・なかま）と js/ui/result.js（1行）。

   なぜ 作ったか（v13.15 の 壁打ちの ④）：
     2週目いこうも「こんどの 土よう日は 何が あるかな」と 楽しみに できる ように。

   土よう日と 日よう日だけ、週ごとに かわる 4つの まつりの どれか 1つ：
     ゴールデン まつり … ゴールデンスライムが かならず 1体 出る・たおすと コイン 3まい（ふだんは 1まい）
     たからばこ まつり … たからばこが 2こ 出る・あけると コイン 2まいずつ（ふだんは 1こ・1まい）
     なかま まつり     … なかまに なりたがる 見こみが 2ばい・相棒の けいけんちも 2ばい
     コイン まつり     … たたかいの おわりに コイン +3
   どの まつりかは **日づけだけで 決まる**（月よう日はじまりの 週の 番号 % 4）。
   だから 平日に「こんどの しゅうまつは ○○まつり」と 予告しても かならず その とおりに なる
   （v8.3 の きまり「予告した ものは かならず 出す」）。

   きまり
     ・ばつは ない。へらす ものも ない。**効果は たたかった とき・正解した とき だけ**（大原則）
     ・ふつうの たたかいと ごちゃまぜ だけ（とっくん・さいごの塔・タイムアタックは なし）
     ・おうちの人ページで 切れる（p.weekendOff）
     ・ポップは しゅうまつごとに 1回（p.weekendSeen に 週の かぎ）
   日づけは テスト用に setNow で 入れかえられる。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.weekend = (function () {
  const EVENTS = [
    { id: 'golden', name: 'ゴールデン まつり', line: 'ゴールデンスライムが かならず 出る！', sub: 'たおすと コイン 3まい（いつもは 1まい）',
      goldenCoins: 3 },
    { id: 'chest',  name: 'たからばこ まつり', line: 'たからばこが 2こ 出る！', sub: 'あけると コイン 2まいずつ',
      chests: 2, chestCoins: 2 },
    { id: 'pal',    name: 'なかま まつり',     line: 'なかまに なりたがる 子が 2ばい！', sub: 'あいぼうの けいけんちも 2ばい',
      palOffer: 2, palXp: 2 },
    { id: 'coin',   name: 'コイン まつり',     line: 'たたかいの おわりに コイン +3', sub: 'ごちゃまぜ バトルでも もらえる',
      coins: 3 }
  ];
  // 週の 番号の はじまり（月よう日）。2026-09-14 の 週が 0＝ゴールデン まつり（公開して はじめての しゅうまつ 9/19・20）
  const BASE = Date.UTC(2026, 8, 14);
  let NOW = null;

  function now() { return NOW || new Date(); }
  function isWeekendDay(d) { const w = d.getDay(); return w === 0 || w === 6; }
  function weekNo(d) {
    const t = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.floor((t - BASE) / 86400000 / 7);
  }
  function eventOf(d) {
    const n = weekNo(d || now());
    return EVENTS[((n % EVENTS.length) + EVENTS.length) % EVENTS.length];
  }
  function weekKey(d) { return 'w' + weekNo(d || now()); }
  function on(p) { return !(p && p.weekendOff === true); }

  /* きょうの まつり（土・日 だけ）。{ ...EVENTS の 1つ, sunday } か null */
  function today(p) {
    const d = now();
    if (!on(p) || !isWeekendDay(d)) return null;
    return Object.assign({ sunday: d.getDay() === 0 }, eventOf(d));
  }
  /* 平日の 予告：{ ev, days }（days＝土よう日まで あと 何日。金よう日は 1）か null */
  function upcoming(p) {
    const d = now();
    if (!on(p) || isWeekendDay(d)) return null;
    return { ev: eventOf(d), days: 6 - d.getDay() };
  }

  /* たたかいに わたす もの。core（MQ.battle.start の weekend）が つかうのは
       goldenCoins・chests・chestCoins・coins
     画面（ui/battle.js）が つかうのは golden（ゴールデンを 出す）・palOffer・palXp */
  function battleOpts(p) {
    const t = today(p);
    if (!t) return null;
    return {
      id: t.id, name: t.name,
      golden: t.id === 'golden',
      goldenCoins: t.goldenCoins || 0, chests: t.chests || 0, chestCoins: t.chestCoins || 0, coins: t.coins || 0,
      palOffer: t.palOffer || 1, palXp: t.palXp || 1
    };
  }

  // ポップを 出すか（しゅうまつごとに 1回）
  function shouldPop(p) { return !!today(p) && p.weekendSeen !== weekKey(); }
  function markSeen(p) { if (p) p.weekendSeen = weekKey(); return p; }

  return {
    EVENTS: EVENTS, eventOf: eventOf, weekNo: weekNo, weekKey: weekKey, isWeekendDay: isWeekendDay,
    on: on, today: today, upcoming: upcoming, battleOpts: battleOpts, shouldPop: shouldPop, markSeen: markSeen,
    now: now, setNow: function (d) { NOW = d || null; }
  };
})();
