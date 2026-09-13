/* ---------------------------------------------------------
   レベルの ごほうび（v13.15）

   **DOM を 知らない。** 画面は js/ui/result.js（けっか画面の 帯）と
   js/ui/dex.js（メニュー「じぶん」の レベルの みち）。

   なぜ 作ったか（2026-09-13 に 実測）：
     見た目の パーツは Lv15 で ぜんぶ 開き、しょうごうは Lv20 が さいご。
     1日 3回 たたかう 子は **2週目で レベルが 上がっても 何も もらえなく なって いた**
     （けいけんちは ずっと 入りつづけるのに）。
     → Lv50 まで ずっと ごほうびが つづく ように する。

   ごほうび（レベルが 1つ 上がる たび）
     ・コイン … Lv2〜9：2まい／Lv10〜19：3まい／Lv20〜29：4まい／Lv30〜：5まい
     ・5の ばいすう … カプセル「むりょう券」1まい
                     （おうちの人が カプセルを かくして いる 子は かわりに コイン 10まい）
     ・10の ばいすう … レベルの バッジの 色が かわる
                     （Lv10 ブロンズ → 20 シルバー → 30 ゴールド → 40 プラチナ → 50 レインボー）
   Lv50 を こえても コインと むりょう券は つづく（バッジは レインボーの まま）。

   2回 もらわない ために、はらった レベルを p.lvPaid に おぼえる。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.levelup = (function () {
  const TICKET_EVERY = 5;       // 何レベルごとに むりょう券
  const TICKET_COINS = 10;      // カプセルを かくして いる 子への かわり（カプセル 1回ぶん）
  const RETRO_MAX = 5;          // もう レベルが 高い 子への「これまでの ぶん」の むりょう券（さいだい）

  const BADGES = [
    { lv: 10, id: 'bronze',  name: 'ブロンズ' },
    { lv: 20, id: 'silver',  name: 'シルバー' },
    { lv: 30, id: 'gold',    name: 'ゴールド' },
    { lv: 40, id: 'plat',    name: 'プラチナ' },
    { lv: 50, id: 'rainbow', name: 'レインボー' }
  ];

  function coinsFor(lv) {
    if (lv < 10) return 2;
    if (lv < 20) return 3;
    if (lv < 30) return 4;
    return 5;
  }

  // その レベルに なった ときの バッジ（10の ばいすうで 新しい 色に なる とき だけ）
  function badgeAt(lv) {
    for (let i = 0; i < BADGES.length; i++) if (BADGES[i].lv === lv) return BADGES[i];
    return null;
  }
  // いまの レベルで つけて いる バッジ（まだ なければ null）
  function badgeOf(lv) {
    let b = null;
    BADGES.forEach(function (x) { if (lv >= x.lv) b = x; });
    return b;
  }

  function capsuleOn(p) { return !(p && p.capsuleOff === true); }

  /* 1つの レベルの ごほうび（まだ わたして いない）
     { lv, coins, ticket, badge } … ticket は まい数（0 か 1） */
  function rewardFor(lv, p) {
    const r = { lv: lv, coins: coinsFor(lv), ticket: 0, badge: badgeAt(lv) };
    if (lv % TICKET_EVERY === 0) {
      if (capsuleOn(p)) r.ticket = 1;
      else r.coins += TICKET_COINS;
    }
    return r;
  }

  function levelOf(p) {
    return (MQ.hero && MQ.hero.levelOf) ? MQ.hero.levelOf((p && p.xp) || 0) : 1;
  }

  function addTickets(p, n) {
    if (!n) return;
    if (MQ.capsule && MQ.capsule.ensure) MQ.capsule.ensure(p);
    if (!p.capsule || typeof p.capsule !== 'object') p.capsule = {};
    p.capsule.tickets = Math.max(0, (p.capsule.tickets || 0) + n);
  }

  /* 古い セーブ・新しい 子の じゅんび（save.js の migratePlayer から）。
       はじめての 子 … いまの レベル（=1）から
       もう たたかって いる 子 … いまの レベルまでは はらった ことに して、
         かわりに「これまでの ぶん」の むりょう券を 5の ばいすう × 1まい（さいだい 5まい） */
  function init(p) {
    if (!p) return 0;
    if (typeof p.lvPaid === 'number' && p.lvPaid >= 1) return 0;
    const lv = levelOf(p);
    p.lvPaid = lv;
    if ((p.battles || 0) <= 0) return 0;
    const n = Math.min(RETRO_MAX, Math.floor(lv / TICKET_EVERY));
    if (!n) return 0;
    if (capsuleOn(p)) addTickets(p, n);
    else p.coins = (p.coins || 0) + n * TICKET_COINS;
    p.lvGift = n;                  // お知らせ用（何まい もらったか）
    return n;
  }

  /* けいけんちを 足した あとに よぶ。まだ はらって いない レベルの ぶんを わたす。
     かえり値 { levels: [rewardFor...], coins, tickets, badge }（なにも なければ levels は からっぽ） */
  function claim(p) {
    const out = { levels: [], coins: 0, tickets: 0, badge: null };
    if (!p) return out;
    if (typeof p.lvPaid !== 'number' || p.lvPaid < 1) init(p);
    const lv = levelOf(p);
    for (let n = p.lvPaid + 1; n <= lv; n++) {
      const r = rewardFor(n, p);
      out.levels.push(r);
      out.coins += r.coins;
      out.tickets += r.ticket;
      if (r.badge) out.badge = r.badge;
    }
    if (out.levels.length) {
      p.coins = (p.coins || 0) + out.coins;
      addTickets(p, out.tickets);
      p.lvPaid = lv;
    }
    return out;
  }

  /* つぎの ごほうびの ならび（メニューの「レベルの みち」）。
     いまの レベルの つぎから n こ。バッジと むりょう券が ある レベルは かならず 1つ 入れる */
  function road(p, n) {
    const lv = levelOf(p);
    const list = [];
    for (let x = lv + 1; list.length < (n || 4) && x <= lv + 60; x++) {
      const r = rewardFor(x, p);
      if (list.length === 0 || r.ticket || r.badge || x === lv + 1 || x % TICKET_EVERY === 0) list.push(r);
    }
    return list;
  }

  function tickets(p) { return (p && p.capsule && p.capsule.tickets) || 0; }

  return {
    TICKET_EVERY: TICKET_EVERY, TICKET_COINS: TICKET_COINS, RETRO_MAX: RETRO_MAX, BADGES: BADGES,
    coinsFor: coinsFor, rewardFor: rewardFor, badgeAt: badgeAt, badgeOf: badgeOf,
    init: init, claim: claim, road: road, tickets: tickets, addTickets: addTickets
  };
})();
