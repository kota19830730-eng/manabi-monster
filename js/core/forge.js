/* ---------------------------------------------------------
   そうびを きたえる（v13.15）

   **DOM を 知らない。** 画面は js/ui/dex.js（メニュー「じぶん」の かじや）。

   なぜ 作ったか（2026-09-13 に 実測）：
     ★2で もらえる そうびは 15点で、1週目で 出つくす。
     カプセルも 約6週間で そろう。そのあと コインの 使いみちが へって
     「つよく なる たのしみ」が なくなる。
     → コインで そうびを +1〜+5 に きたえられる ように する。

   きまり（もどさない）
     ・きたえるのは **そうびの 場所（けん・たて・かぶと・よろい・マント）**。
       べつの けんに かえても +3 は そのまま（うけつぐ）。
       ＝ 弱い そうびを きたえて ムダに なる ことが ない（小3が まよわない）。
     ・その 場所に そうびを つけて いる ときだけ 効く・きたえられる。
     ・ねだん … +1：5まい／+2：10／+3：20／+4：30／+5：40（1か所 105まい・5か所で 525まい）
     ・効果は **正解した とき だけ**（アイテム・そうびと 同じ 大原則）。
         けん   … +1 ごとに 正解 1もんの けいけんち ＋1（+5 で ＋5）
         たて   … +2 と +4 で「まちがえても にげない」＋1回ずつ
         よろい … +2 と +4 で「コンボが 切れない」＋1回ずつ
         マント … +2 と +4 で「おわりに コイン」＋1まいずつ
         かぶと … +5 で「ひっさつわざが 1コンボ 早く」（かぶとの 合計は 3まで）
     ・+5 は 金色に 光る（見た目の ごほうび）。
   セーブ：p.forge = { weapon: 0〜5, shield, helm, armor, cape }
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.forge = (function () {
  const MAX = 5;
  const COST = [5, 10, 20, 30, 40];         // COST[n] … +n から +(n+1) に する ねだん
  const SLOTS = ['weapon', 'shield', 'helm', 'armor', 'cape'];
  const SPECIAL_CAP = 3;                    // かぶと（ひっさつが 早く 出る）の 合計の 上限

  /* 場所ごとの ふえ方。lv（0〜5）→ そうびの 数字に 足す ぶん */
  const RULE = {
    weapon: function (lv) { return lv; },
    shield: function (lv) { return (lv >= 2 ? 1 : 0) + (lv >= 4 ? 1 : 0); },
    armor:  function (lv) { return (lv >= 2 ? 1 : 0) + (lv >= 4 ? 1 : 0); },
    cape:   function (lv) { return (lv >= 2 ? 1 : 0) + (lv >= 4 ? 1 : 0); },
    helm:   function (lv) { return lv >= 5 ? 1 : 0; }
  };

  function ensure(p) {
    if (!p) return null;
    if (!p.forge || typeof p.forge !== 'object' || Array.isArray(p.forge)) p.forge = {};
    SLOTS.forEach(function (s) {
      const v = p.forge[s];
      p.forge[s] = (typeof v === 'number' && v >= 0) ? Math.min(MAX, Math.floor(v)) : 0;
    });
    return p.forge;
  }

  function level(p, slot) {
    return (p && p.forge && typeof p.forge[slot] === 'number') ? Math.min(MAX, p.forge[slot]) : 0;
  }
  function bonus(slot, lv) { return RULE[slot] ? RULE[slot](lv || 0) : 0; }
  function bonusOf(p, slot) { return bonus(slot, level(p, slot)); }
  function cost(lv) { return lv >= MAX ? 0 : COST[lv]; }

  /* つぎに 数字が ふえる のは +何か（けんは いつも つぎ。たては +2／+4 …） */
  function nextGain(slot, lv) {
    const now = bonus(slot, lv);
    for (let x = lv + 1; x <= MAX; x++) if (bonus(slot, x) > now) return x;
    return 0;
  }

  function equipped(p, slot) { return !!(p && p.equipped && p.equipped[slot]); }

  function canForge(p, slot) {
    if (SLOTS.indexOf(slot) === -1) return { ok: false, why: 'ない 場所' };
    const lv = level(p, slot);
    if (lv >= MAX) return { ok: false, why: 'さいだい', max: true };
    if (!equipped(p, slot)) return { ok: false, why: 'そうびを つけてね', cost: cost(lv) };
    const c = cost(lv);
    if ((p.coins || 0) < c) return { ok: false, why: 'コインが たりない', cost: c, short: c - (p.coins || 0) };
    return { ok: true, cost: c };
  }

  /* きたえる。かえり値 { ok, slot, from, to, cost, gained（数字が ふえたか）, max, coins } */
  function forge(p, slot) {
    const can = canForge(p, slot);
    if (!can.ok) return { ok: false, why: can.why, short: can.short || 0 };
    ensure(p);
    const from = p.forge[slot];
    p.coins = Math.max(0, (p.coins || 0) - can.cost);
    p.forge[slot] = from + 1;
    p.forgeCount = (p.forgeCount || 0) + 1;
    return {
      ok: true, slot: slot, from: from, to: from + 1, cost: can.cost,
      gained: bonus(slot, from + 1) > bonus(slot, from),
      max: from + 1 >= MAX, coins: p.coins
    };
  }

  function total(p) {
    let n = 0;
    SLOTS.forEach(function (s) { n += level(p, s); });
    return n;
  }
  function allMax(p) { return SLOTS.every(function (s) { return level(p, s) >= MAX; }); }

  return {
    MAX: MAX, COST: COST, SLOTS: SLOTS, SPECIAL_CAP: SPECIAL_CAP,
    ensure: ensure, level: level, bonus: bonus, bonusOf: bonusOf, cost: cost, nextGain: nextGain,
    canForge: canForge, forge: forge, total: total, allMax: allMax
  };
})();
