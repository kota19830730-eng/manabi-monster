/* ---------------------------------------------------------
   カプセルマシン（v9.0）— 引く ルールだけ

   **DOM を 知らない。** 画面は js/ui/capsule.js。
   仕様は docs/v9.0カプセルマシンとメニューメモ.md。

   きまり（もどさない）：
     ・1回 コイン 10まい
     ・ノーマル 70% ／ レア 25% ／ げきレア 5%（画面の ことばは「ノーマル」・内部の id は n）
     ・**10回 引いたら かならず げきレア**（天井。しゅるいごとに 数える）
     ・**はずれを 作らない。** かならず 何かが 出る
     ・**かぶったら コインが 5まい もどる**（半分）
     ・中身は ぜんぶ **カプセルでしか 手に 入らない もの**

   もらった ものの 記ろくは p.capsule.got に まとめる。
   なかまは 進化すると p.pals から 消える（pals.js の evolveIfReady）ので、
   p.pals を 見て かぶり判定を すると こわれる。**got が 正本。**
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.capsule = (function () {
  const COST = 10;          // 1回の ねだん
  const REFUND = 5;         // かぶった ときに もどる コイン
  const PITY = 10;          // 何回で げきレア かくていか

  // 出る わりあい。合計は かならず 1
  const RATES = { n: 0.70, r: 0.25, sr: 0.05 };

  const KINDS = [
    { id: 'mon', name: 'なかま', color: '#ff8f5e', sub: 'ここでしか 手に 入らない モンスター' },
    { id: 'gear', name: 'そうび', color: '#63d94f', sub: 'ここでしか 手に 入らない そうび' },
    { id: 'look', name: 'すがた', color: '#4fd3ff', sub: 'ここでしか もらえない かみ・ふく・かざり' }
  ];
  const KIND_IDS = KINDS.map(function (k) { return k.id; });

  const RARITY = {
    n:  { id: 'n',  name: 'ノーマル', color: '#9fb2dd' },   // v10.2：画面の ことばは「ノーマル」
    r:  { id: 'r',  name: 'レア',     color: '#ffd447' },
    sr: { id: 'sr', name: 'げきレア', color: '#b48cff' }
  };

  /* ---- セーブ ---- */
  function ensure(p) {
    if (!p) return null;
    if (!p.capsule || typeof p.capsule !== 'object') p.capsule = {};
    const c = p.capsule;
    if (!c.got || typeof c.got !== 'object') c.got = {};
    if (!c.pity || typeof c.pity !== 'object') c.pity = {};
    KIND_IDS.forEach(function (k) {
      if (typeof c.pity[k] !== 'number' || c.pity[k] < 0) c.pity[k] = 0;
    });
    if (typeof c.pulls !== 'number' || c.pulls < 0) c.pulls = 0;
    return c;
  }

  /* ---- 景品の 一覧（そのときの データから 作る）----
     読みこみ中には よばない こと（MQ.enemies などが まだ ない）。 */
  function pool(kind) {
    if (kind === 'mon') {
      const list = (MQ.enemies && MQ.enemies.dexList && MQ.enemies.dexList()) || [];
      return list.filter(function (e) { return e.capsuleOnly; }).map(function (e) {
        return { id: e.id, name: e.name, rarity: e.cap || 'n', kind: 'mon' };
      });
    }
    if (kind === 'gear') {
      const list = (MQ.hero && MQ.hero.capsuleGear && MQ.hero.capsuleGear()) || [];
      return list.map(function (g) {
        return { id: g.id, name: g.name, rarity: g.cap || 'n', kind: 'gear' };
      });
    }
    if (kind === 'look') {
      const list = (MQ.hero && MQ.hero.capsuleParts && MQ.hero.capsuleParts()) || [];
      return list.map(function (t) {
        return { id: t.id, name: t.name, rarity: t.cap || 'n', kind: 'look' };
      });
    }
    return [];
  }

  function byRarity(kind, rarity) {
    return pool(kind).filter(function (x) { return x.rarity === rarity; });
  }

  /* そのマシンで ほんとうに 出る わりあい（画面に 出す 数字）。
     そうびは カプセル 5点（ノーマル）と オーロラ 5点（げきレア）だけで
     「レア」の わくが ない ので、25% は pick() と 同じ じゅんで ふつうに 落ちる。
     **画面には ここで 出した 数字を 出す**（70/25/5 と 決めうちで 書くと ウソに なる）。 */
  function rates(kind) {
    const out = { n: 0, r: 0, sr: 0 };
    ['n', 'r', 'sr'].forEach(function (k) {
      const order = fallback(k);
      for (let i = 0; i < order.length; i++) {
        if (byRarity(kind, order[i]).length) { out[order[i]] += RATES[k]; break; }
      }
    });
    return out;
  }
  // わくが 空だった ときに どの じゅんで 落ちるか（pick と rates で 同じ ものを つかう）
  function fallback(rarity) {
    return rarity === 'sr' ? ['sr', 'r', 'n'] : rarity === 'r' ? ['r', 'n', 'sr'] : ['n', 'r', 'sr'];
  }

  /* ---- もっている か ---- */
  // レベルの ごほうびの むりょう券（v13.15・js/core/levelup.js が 入れる）
  function tickets(p) { return (p && p.capsule && p.capsule.tickets) || 0; }

  function has(p, id) {
    const c = ensure(p);
    return !!(c && c.got[id]);
  }
  function progress(p, kind) {
    const all = pool(kind);
    const c = ensure(p);
    let have = 0;
    all.forEach(function (x) { if (c && c.got[x.id]) have++; });
    return { have: have, total: all.length };
  }
  function pityLeft(p, kind) {
    const c = ensure(p);
    return Math.max(0, PITY - ((c && c.pity[kind]) || 0));
  }

  /* ---- 引ける か ---- */
  function canPull(p, kind) {
    if (!p || KIND_IDS.indexOf(kind) === -1) return { ok: false, why: 'ない マシン' };
    if (!pool(kind).length) return { ok: false, why: 'じゅんびちゅう' };
    // レベルの ごほうびの むりょう券（v13.15）が あれば コインは いらない
    if (tickets(p) > 0) return { ok: true, ticket: true };
    const coins = p.coins || 0;
    if (coins < COST) return { ok: false, why: 'コインが たりない', short: COST - coins };
    return { ok: true };
  }

  /* ---- レアさを 決める ---- */
  function rollRarity(kind, p, rnd) {
    const c = ensure(p);
    // 天井：10回めは かならず げきレア
    if ((c.pity[kind] || 0) >= PITY - 1 && byRarity(kind, 'sr').length) return 'sr';
    const r = rnd();
    if (r < RATES.sr && byRarity(kind, 'sr').length) return 'sr';
    if (r < RATES.sr + RATES.r && byRarity(kind, 'r').length) return 'r';
    return 'n';
  }

  /* ---- 1つ えらぶ ----
     ①決まった わくの 中で、**まだ 持って いない ものを 先に**（かぶりを へらす）
     ②その わくを ぜんぶ 持って いたら、**その わくの まま かぶりを 出す**（コインが もどる）
     ③その わくに 1つも 中身が ない ときだけ ほかの わくに 落とす（はずれを 作らない ため）

     ②が 大事：天井で「げきレア かくてい」と 見せた のに、
     ぜんぶ 持って いる からと いって ノーマルを 出したら 約束やぶりに なる。
     かぶりでも げきレアを 出して コインを もどす。 */
  function pick(kind, rarity, p, rnd) {
    const order = fallback(rarity);
    for (let i = 0; i < order.length; i++) {
      const list = byRarity(kind, order[i]);
      if (!list.length) continue;                 // ③ わくが 空の ときだけ つぎへ
      const fresh = list.filter(function (x) { return !has(p, x.id); });
      const from = fresh.length ? fresh : list;   // ① まだの もの → ② ぜんぶ 持って いたら かぶり
      return from[Math.floor(rnd() * from.length)];
    }
    return null;
  }

  /* ---- 手わたす ---- */
  function grant(p, item) {
    if (item.kind === 'mon') {
      if (!p.dex) p.dex = {};
      if (!p.dex[item.id]) {
        p.dex[item.id] = 1;
        if (p.dexNew) p.dexNew[item.id] = true;
      }
      if (MQ.pals && MQ.pals.add) MQ.pals.add(p, item.id);
    } else if (item.kind === 'gear') {
      if (!Array.isArray(p.gear)) p.gear = [];
      if (p.gear.indexOf(item.id) === -1) p.gear.push(item.id);
    } else if (item.kind === 'look') {
      if (!p.parts || typeof p.parts !== 'object') p.parts = {};
      p.parts[item.id] = 1;
    }
  }

  /* ---- 引く ----
     かえり値 { ok, kind, item, rarity, dup, refund, spent, coins, pity, pityLeft, progress } */
  function pull(p, kind, rnd) {
    const r = rnd || Math.random;
    const can = canPull(p, kind);
    if (!can.ok) return { ok: false, why: can.why, short: can.short || 0 };

    const c = ensure(p);
    // むりょう券（v13.15）を 先に つかう。なければ コイン
    const useTicket = !!can.ticket;
    if (useTicket) c.tickets = Math.max(0, (c.tickets || 0) - 1);
    else p.coins = Math.max(0, (p.coins || 0) - COST);

    const rarity = rollRarity(kind, p, r);
    const item = pick(kind, rarity, p, r);
    if (!item) {                       // ここには 来ない はず（canPull で 見て いる）
      if (useTicket) c.tickets = (c.tickets || 0) + 1;
      else p.coins += COST;            // 出せないなら コインを もどす
      return { ok: false, why: 'じゅんびちゅう' };
    }

    const dup = has(p, item.id);
    let refund = 0;
    if (dup) {
      refund = REFUND;
      p.coins += REFUND;
    } else {
      c.got[item.id] = 1;
      grant(p, item);
    }

    // 天井：げきレアが 出たら 0に もどす。そうでなければ 1つ すすむ
    if (item.rarity === 'sr') c.pity[kind] = 0;
    else c.pity[kind] = (c.pity[kind] || 0) + 1;
    c.pulls = (c.pulls || 0) + 1;

    return {
      ok: true, kind: kind, item: item, rarity: item.rarity,
      dup: dup, refund: refund, spent: useTicket ? 0 : COST, ticket: useTicket, tickets: c.tickets || 0, coins: p.coins,
      pity: c.pity[kind], pityLeft: pityLeft(p, kind), progress: progress(p, kind)
    };
  }

  return {
    COST: COST, REFUND: REFUND, PITY: PITY, RATES: RATES, tickets: tickets,
    KINDS: KINDS, KIND_IDS: KIND_IDS, RARITY: RARITY,
    ensure: ensure, pool: pool, byRarity: byRarity, rates: rates, has: has,
    progress: progress, pityLeft: pityLeft, canPull: canPull, pull: pull
  };
})();
