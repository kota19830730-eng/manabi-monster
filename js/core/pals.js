/* ---------------------------------------------------------
   なかま（相棒）システム（v4.3）

   息子さんの「たおした モンスターを 連れて 歩きたい」を かたちに した もの。
   壁打ちで 決めた ルール：

     ・連れて 歩くのは **1体だけ**（「いまの 相棒」）
     ・**3問 れんぞく 正解**するたびに 相棒が 追い打ち（ボスには 1ダメージ・ザコでは けいけんち +10）
     ・けいけんちは **主人公の 半分**が 相棒にも 入る（連れて 歩くだけで 育つ）
     ・**Lv10・Lv20 で 進化**（enemies.js の `evo` が つぎの すがた）
     ・手に 入れ方は **たおすと たまに なかまに なりたがる**（けっか画面で えらぶ）と
       **コインで こうかん**（図かんで 出会った ことが ある モンスターだけ）
     ・写真から 作った じぶんの モンスターも 相棒に できる

   大原則（v2.0）：**効果は「正解した とき」だけ 出る**。
   勝手に 敵を たおしたり、答えを 見せたり する ことは しない。

   この ファイルは DOM を 知らない（画面は js/ui/ が 作る）。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.pals = (function () {

  const MAX_LV = 30;
  const EXP_SHARE = 0.5;               // 主人公が もらった けいけんちの 半分
  const HIT_EVERY = 3;                 // 何問 れんぞくで 追い打ちか（ふるい やりかた・のこして ある）
  const GAUGE_NEED = 3;                // なかまゲージ：正解 何問で 追い打ちか（v5.2）
  const SURE_KILLS = 3;                // 何回 たおしたら かならず なかまに なりたがるか（v5.2）
  const NAME_MAX = 8;                  // つけられる なまえの 長さ（v5.2）
  const EVO_LV = { 1: 10, 2: 20 };     // 1段階 → Lv10 で／2段階 → Lv20 で 進化
  const PRICE = { 1: 3, 2: 6, 3: 10 }; // コインで こうかんする ときの ねだん（つよさべつ）
  const OFFER = { 1: 0.16, 2: 0.10, 3: 0.06 };  // たおした ときに なかまに なりたがる 見こみ

  /* レベル ↔ けいけんち。Lv10 が 10回ぶん、Lv20 が 40回ぶん くらい */
  function expFor(lv) {
    const n = Math.max(0, lv - 1);
    return 15 * n * n + 25 * n;
  }
  function levelOf(exp) {
    let lv = 1;
    while (lv < MAX_LV && exp >= expFor(lv + 1)) lv++;
    return lv;
  }

  function enemyOf(id) { return MQ.enemies ? MQ.enemies.get(id) : null; }

  /* なかまゲージ：正解 何問で 追い打ちか。**まちがえても へらない**（v5.2） */
  function gaugeNeed() { return GAUGE_NEED; }

  /* つけた なまえ（なければ もとの 名前） */
  function baseName(id) { const e = enemyOf(id); return e ? e.name : id; }
  function displayName(p, id) {
    const rec = p && p.pals ? p.pals[id] : null;
    return (rec && rec.name) ? rec.name : baseName(id);
  }
  /* なまえを つける。から文字に すると もとの 名前に もどる */
  function setName(p, id, name) {
    if (!p || !p.pals || !p.pals[id]) return null;
    const t = String(name == null ? '' : name).replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
    if (t) p.pals[id].name = t; else delete p.pals[id].name;
    return info(p, id);
  }

  /* 相棒 1体の いまの ようす */
  function info(p, id) {
    if (!p || !p.pals || !p.pals[id]) return null;
    const rec = p.pals[id];
    const e = enemyOf(id);
    const exp = rec.exp || 0;
    const lv = levelOf(exp);
    const base = expFor(lv), next = lv >= MAX_LV ? base : expFor(lv + 1);
    return {
      id: id,
      name: displayName(p, id),          // つけた なまえ（なければ もとの 名前）
      baseName: e ? e.name : id,
      named: !!rec.name,
      enemy: e,
      exp: exp,
      lv: lv,
      max: lv >= MAX_LV,
      need: Math.max(0, next - exp),
      ratio: lv >= MAX_LV ? 1 : Math.max(0, Math.min(1, (exp - base) / Math.max(1, next - base))),
      evoAt: e && e.evo ? EVO_LV[e.stage] || null : null,
      got: rec.got || null
    };
  }

  function own(p) {
    if (!p || !p.pals) return [];
    return Object.keys(p.pals).map(function (id) { return info(p, id); })
      .filter(Boolean)
      .sort(function (a, b) { return (b.lv - a.lv) || String(a.got).localeCompare(String(b.got)); });
  }
  function has(p, id) { return !!(p && p.pals && p.pals[id]); }
  function count(p) { return p && p.pals ? Object.keys(p.pals).length : 0; }

  function add(p, id, exp) {
    if (!p || !id) return null;
    if (!p.pals) p.pals = {};
    if (!p.pals[id]) p.pals[id] = { exp: exp || 0, got: new Date().toISOString() };
    if (!p.pal) p.pal = id;                       // はじめての なかまは すぐ 相棒に
    return info(p, id);
  }

  function active(p) {
    if (!p || !p.pal || !has(p, p.pal)) return null;
    return info(p, p.pal);
  }
  function setActive(p, id) {
    if (!p) return null;
    if (id && !has(p, id)) return null;
    p.pal = id || null;
    return active(p);
  }

  /* 進化：Lv10 で 1段階 → 2段階、Lv20 で 2段階 → 3段階。
     すがたが 変わるだけで、けいけんちは そのまま 引きつぐ */
  function evolveIfReady(p) {
    const cur = active(p);
    if (!cur || !cur.enemy || !cur.enemy.evo) return null;
    const needLv = EVO_LV[cur.enemy.stage];
    if (!needLv || cur.lv < needLv) return null;
    const to = cur.enemy.evo;
    if (!enemyOf(to)) return null;
    const rec = p.pals[cur.id];
    delete p.pals[cur.id];
    p.pals[to] = { exp: rec.exp, got: rec.got, from: cur.id };
    if (rec.name) p.pals[to].name = rec.name;      // つけた なまえは そのまま（v5.2）
    p.pal = to;
    // 図かんにも のせる（進化した すがたを 見た ことに する）
    if (p.dex) {
      if (!p.dex[to]) { p.dex[to] = 1; if (p.dexNew) p.dexNew[to] = true; }
    }
    return { from: cur.id, fromName: cur.name, to: to, toName: (enemyOf(to) || {}).name || to };
  }

  /* たたかいの あとに よぶ。主人公の けいけんちの 半分が 相棒に 入る。
     かえり値：{ id, name, gained, lvBefore, lv, leveledUp, evolved } */
  function gain(p, xp) {
    const cur = active(p);
    if (!cur || !xp) return null;
    const add2 = Math.max(1, Math.round(xp * EXP_SHARE));
    const before = cur.lv;
    p.pals[cur.id].exp = (p.pals[cur.id].exp || 0) + add2;
    let evolved = null, guard = 0;
    while (guard++ < 3) {
      const e = evolveIfReady(p);
      if (!e) break;
      evolved = evolved || e;
      evolved.to = e.to;
      evolved.toName = e.toName;
    }
    const after = active(p);
    return {
      id: after.id, name: after.name, gained: add2,
      lvBefore: before, lv: after.lv, leveledUp: after.lv > before,
      evolved: evolved, ratio: after.ratio, max: after.max
    };
  }

  /* ふるい やりかた（コンボで 追い打ち）。まだ 使う ところが あるので のこす */
  function hitOn(combo) { return combo > 0 && combo % HIT_EVERY === 0; }

  /* コインで こうかん。**図かんで 出会った ことが ある** モンスターだけ */
  function price(id) {
    const e = enemyOf(id);
    if (!e) return 0;
    if (e.by === 'photo') return 3;               // じぶんで 作った モンスターは 安い
    return PRICE[e.rank || 2] || 6;
  }
  function shopList(p) {
    if (!p) return [];
    const out = [];
    (MQ.enemies.dexList() || []).forEach(function (e) {
      if (!p.dex || !p.dex[e.id]) return;         // 会った ことが ない
      if (has(p, e.id)) return;                   // もう なかま
      out.push({ id: e.id, name: e.name, price: price(e.id), enemy: e });
    });
    return out.sort(function (a, b) { return a.price - b.price; });
  }
  function canBuy(p, id) {
    if (!p || has(p, id) || !p.dex || !p.dex[id]) return false;
    return (p.coins || 0) >= price(id);
  }
  function buy(p, id) {
    if (!canBuy(p, id)) return null;
    p.coins = Math.max(0, (p.coins || 0) - price(id));
    return add(p, id);
  }

  /* たおした 中から「なかまに なりたい」1体を えらぶ（1回の たたかいで 1体まで）。
     もう なかまの もの・たからばこ・ボスは えらばない */
  function offerFrom(p, defeated, rnd) {
    if (!p || !defeated || !defeated.length) return null;
    const r = rnd || Math.random;
    const seen = {};
    for (let i = 0; i < defeated.length; i++) {
      const id = defeated[i];
      if (!id || seen[id]) continue;
      seen[id] = 1;
      if (id === 'chest' || String(id).indexOf('boss-') === 0) continue;
      if (has(p, id)) continue;
      const e = enemyOf(id);
      if (!e) continue;
      // 3回 たおした 相手は かならず なかまに なりたがる（v5.2）
      if (((p.dex && p.dex[id]) || 0) >= SURE_KILLS) return id;
      const rate = e.rare || e.by === 'photo' ? 0.2 : (OFFER[e.rank || 2] || 0.1);
      if (r() < rate) return id;
    }
    return null;
  }

  return {
    expFor: expFor, levelOf: levelOf, info: info, own: own, has: has, count: count,
    add: add, active: active, setActive: setActive, gain: gain, evolveIfReady: evolveIfReady,
    hitOn: hitOn, price: price, shopList: shopList, canBuy: canBuy, buy: buy, offerFrom: offerFrom,
    gaugeNeed: gaugeNeed, displayName: displayName, baseName: baseName, setName: setName,
    MAX_LV: MAX_LV, HIT_EVERY: HIT_EVERY, EVO_LV: EVO_LV, GAUGE_NEED: GAUGE_NEED,
    SURE_KILLS: SURE_KILLS, NAME_MAX: NAME_MAX
  };
})();
