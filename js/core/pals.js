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
  /* 追い打ちの つよさ（v8.2）：育つほど 強く なる。
     xp＝ザコの ときの けいけんち／dmg＝ボスに あたえる ダメージ。
     大原則は そのまま：**正解した ときだけ 出る** */
  const POWER = { 1: { xp: 10, dmg: 1 }, 2: { xp: 15, dmg: 1 }, 3: { xp: 20, dmg: 2 } };
  /* コインで こうかんする ときの ねだん（v8.9）。
     **段階が 上がるほど 高い。** 前は つよさ（rank）べつの 3/6/10 だった ので、
     Lv.20 まで 育てて やっと なる 王さまの すがたが 10まいで 買えて しまい、
     **コツコツ 育てるより 買う ほうが 早かった**（けいけんち 5890 ぶん）。
     ねだんを 段階で 上げて、育てる ほうが 早い ように した（ユーザー決定 2026-09-06）。 */
  const PRICE = { 1: 3, 2: 20, 3: 40 };
  /* 系統に 入って いない もの（ゴールデンスライム・中ボス）は いままで どおり つよさべつ */
  const PRICE_SOLO = { 1: 3, 2: 6, 3: 10 };
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

  /* ---- レベルで 目に見えて 強くなる（v14.35）----
     ユーザー「相棒の 存在意義と 存在感が あまりない。もっと 育てたくなるように」→ 数えたら
     レベルは 進化（Lv10・Lv20）にしか 効かず、Lv5 と Lv9・Lv21 と Lv30 は 何も 変わらなかった
     （相棒が いても けいけんちは +10%・1段階も 3段階も「3問 正解ごとに 1回」は 同じ）。
     → 5レベルごとに 1つ 目に見える ごほうび。**効果は 正解した ときだけ**（大原則）は そのまま。
       ・追い打ちの けいけんち：5レベルごとに ＋2（Lv30 で ＋12）
       ・Lv15：ゲージが 2つで 追い打ち（3問 → 2問）
       ・Lv25：追い打ちで コンボ ＋1
     ボスへの ダメージは いままでどおり（core の PAL_BOSS_MAX＝1。v12.7 の ボスの 強さを こわさない） */
  const PERK_XP = 2;          // 5レベルごとに 追い打ちの けいけんち ＋2
  const FAST_LV = 15;         // この レベルから ゲージが 2つ
  const COMBO_LV = 25;        // この レベルから 追い打ちで コンボ ＋1
  const PERKS = [
    { lv: 5,  text: '追い打ちの けいけんち ＋2' },
    { lv: 10, text: '追い打ちの けいけんち ＋4' },
    { lv: 15, text: 'ゲージが 2つで 追い打ち！' },
    { lv: 20, text: '追い打ちの けいけんち ＋8' },
    { lv: 25, text: '追い打ちで コンボ ＋1！' },
    { lv: 30, text: '追い打ちの けいけんち ＋12' }
  ];
  function lvBonus(lv) { return PERK_XP * Math.floor((lv || 1) / 5); }
  /* lvA より 上 lvB まで で 手に 入れた ごほうび（けっか画面） */
  function perksBetween(lvA, lvB) { return PERKS.filter(function (k) { return k.lv > lvA && k.lv <= lvB; }); }
  /* つぎの ごほうび（メニュー。もう ない ときは null） */
  function nextPerk(lv) { for (let i = 0; i < PERKS.length; i++) if (PERKS[i].lv > lv) return PERKS[i]; return null; }

  /* いまの 相棒の 追い打ちの つよさ。系統に 入って いない モンスターは 1段階めの あつかい。
     { xp, dmg, need（ゲージの 数）, combo（追い打ちで ふえる コンボ）} */
  function power(p) {
    const cur = active(p);
    const st = cur && cur.enemy ? (cur.enemy.stage || 1) : 1;
    const base = POWER[st] || POWER[1];
    const lv = cur ? cur.lv : 1;
    return {
      xp: base.xp + lvBonus(lv),
      dmg: base.dmg,
      need: lv >= FAST_LV ? 2 : GAUGE_NEED,
      combo: lv >= COMBO_LV ? 1 : 0,
      move: moveOf(cur ? bondOf(p, cur.id).lv : 0, cur ? cur.enemy : null)
    };
  }
  /* 相棒の ひっさつ（v14.36）。きずなで 強く なる */
  /* ---- 相棒の わざの 名前と 系統（v14.37）----
     ユーザー「相棒システムやけど 主人公も 必殺技 出すから よく わからん。特別感も ない」→ 数えたら（300回）
     相棒が 動く 瞬間の 7〜9わりが 主人公の わざと 同じ 正解で、ことばも 同じ「ひっさつ」だった。
     → 相棒だけの 名前（カタカナ 2語・ユーザー「きずな ストライク」風＝かっこいい）を 系統ごとに 9しゅるい。
       光は js/ui/palfx.js（pm-<kind>）・出し方は js/ui/battle.js の palTurnAttack（相棒だけの ターン）。
       名前は kotoba.js の KEEP（どの 学年でも 同じ 字）。系統に ない もの（写真の モンスターも）は きずな ストライク */
  const MOVE_KINDS = {
    bond:   { name: 'きずな ストライク',   hex: '#ffc94d', sfx: 'star' },
    fang:   { name: 'ファング クラッシュ', hex: '#ff6a5a', sfx: 'triple' },
    blaze:  { name: 'ブレイズ ブレス',     hex: '#ff8a2a', sfx: 'fire' },
    heavy:  { name: 'ヘビー タックル',     hex: '#e8c890', sfx: 'fire' },
    sky:    { name: 'スカイ ダイブ',       hex: '#d6f0ff', sfx: 'wind' },
    bolt:   { name: 'ボルト シュート',     hex: '#8fd0ff', sfx: 'bolt' },
    aqua:   { name: 'アクア バースト',     hex: '#5fd8ff', sfx: 'ice' },
    shadow: { name: 'シャドウ スラッシュ', hex: '#c48bff', sfx: 'leaf' },
    holy:   { name: 'シャイン ブレイカー', hex: '#ffe9a8', sfx: 'star' }
  };
  /* 系統（enemies.js の line・なければ shape）→ わざ。ここに ない ものは bond */
  const KIND_OF = {
    fang:   'wolf shark sharkx fang fox crab scorpion snake serp angler puffer lizard sameoni beetle cap-mwolf cap-cerberus cap-lionking cap-mleon',
    blaze:  'drago magma sun cap-phoenix',
    heavy:  'golem turtle mole mushroom tree tank mecha hedgehog snail robot cap-hammer cap-shielder cap-axer cap-whale',
    sky:    'bird hawk owl bat butterfly bee kite balloon rocket cloud tornado cap-mhawk cap-owl cap-comet',
    bolt:   'bolt ufo saucer star crystal alpha dice cap-orb cap-starcat',
    aqua:   'tako krak fish jelly seahorse penguin frog moon cap-kappa cap-serpent',
    shadow: 'ninja ghost spect skull skullhorse zukan spider arac eyeball cap-kasa cap-chochin cap-dagger',
    holy:   'cap-knight cap-paladin cap-lancer cap-archer cap-mage cap-unicorn cap-kirin cap-kitsune'
  };
  const KIND_BY_LINE = {};
  Object.keys(KIND_OF).forEach(function (k) { KIND_OF[k].split(' ').forEach(function (l) { KIND_BY_LINE[l] = k; }); });
  function moveKindOf(e) {
    if (!e) return 'bond';
    return KIND_BY_LINE[e.line || ''] || KIND_BY_LINE[e.shape || ''] || 'bond';
  }
  function moveOf(bond, enemy) {
    const kind = moveKindOf(enemy), mk = MOVE_KINDS[kind];
    return {
      need: MOVE_NEED,
      xp: MOVE_XP + (bond >= 1 ? 10 : 0),
      callName: bond >= 2,
      cover: bond >= 3 ? 2 : 1,          // v14.38 C：かばうのは だれでも 1回（♥3 で 2回）
      whisper: bond >= 2 ? 2 : 1,        // v14.38 C：ヒントの ささやき（タッチ・♥2 で 2回）
      uses: bond >= 4 ? 2 : 1,
      gold: bond >= 5,
      bond: bond,
      kind: kind, name: mk.name, hex: mk.hex, sfx: mk.sfx   // v14.37：系統ごとの 名前・色・音
    };
  }

  /* ---- 相棒の ひっさつ（C）と きずな（E）（v14.36）----
     ユーザー「相棒ボタンで わざを 出す（C）と きずな（E） お願いします」。
     C：追い打ちを MOVE_NEED 回 すると 相棒が ひかる → **子どもが 相棒を タッチ** → **つぎの 正解で** 相棒の ひっさつ。
        ザコ＝けいけんち ＋MOVE_XP／中ボス＝一発／ボス＝＋1ダメージ（1たたかい 1回まで）。
        大原則は そのまま＝**正解した ときだけ 出る**・押さなくても 何も へらない。
     E：いっしょに たたかった 回数で たまる きずな（♥0〜5）。ひっさつを 使った たたかいは ＋1 おまけ。
        進化しても のこる（evolveIfReady が 引きつぐ）。♥ごとに 1つ ごほうび（BOND_PERKS）。 */
  const MOVE_NEED = 2;                 // 追い打ち 何回で ひっさつが たまるか
  const MOVE_XP = 30;                  // ザコの ときの けいけんち
  const BOND_AT = [4, 12, 24, 40, 60]; // ♥1〜♥5 に なる きずなの 点
  const BOND_PERKS = [
    { lv: 1, text: 'ひっさつの けいけんち ＋10' },
    { lv: 2, text: 'なまえを よんで くれる・ヒントが 2回' },
    { lv: 3, text: 'かばって くれるのが 2回に' },
    { lv: 4, text: 'ひっさつが 2回 出せる' },
    { lv: 5, text: 'ひっさつが 金色に！' }
  ];
  function bondLevel(pts) { let lv = 0; while (lv < BOND_AT.length && (pts || 0) >= BOND_AT[lv]) lv++; return lv; }
  function bondOf(p, id) {
    const rec = p && p.pals && id ? p.pals[id] : null;
    const pts = rec ? (rec.bond || 0) : 0;
    const lv = bondLevel(pts);
    const next = lv < BOND_AT.length ? BOND_AT[lv] : null;
    return { pts: pts, lv: lv, max: BOND_AT.length, next: next, need: next == null ? 0 : next - pts,
      nextPerk: BOND_PERKS[lv] || null };
  }
  /* たたかいの あとに よぶ（used＝ひっさつを 使った）。かえり値：{ id, gained, lvBefore, lv, up, perk } */
  function bondUp(p, used) {
    const cur = active(p);
    if (!cur) return null;
    const rec = p.pals[cur.id];
    const before = bondLevel(rec.bond || 0);
    const add2 = 1 + (used ? 1 : 0);
    rec.bond = (rec.bond || 0) + add2;
    const lv = bondLevel(rec.bond);
    return { id: cur.id, gained: add2, pts: rec.bond, lvBefore: before, lv: lv, up: lv > before,
      perk: lv > before ? BOND_PERKS[lv - 1] : null, info: bondOf(p, cur.id) };
  }
  function bondBest(p) {
    if (!p || !p.pals) return 0;
    return Object.keys(p.pals).reduce(function (b, id) { return Math.max(b, bondLevel((p.pals[id] || {}).bond || 0)); }, 0);
  }

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
      bond: bondOf(p, id),
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
    /* 進化先を もう 持って いる（お店・なかまに なりたそう で 2段階めを 先に もらった）ときは
       上書きせず 1体に まとめる。いちばん 育った ほうの けいけんちと、つけた なまえを のこす（mergeAbc と 同じ 考え方） */
    const old = p.pals[to] || null;
    delete p.pals[cur.id];
    p.pals[to] = { exp: Math.max(rec.exp || 0, old ? old.exp || 0 : 0), got: rec.got, from: cur.id };
    const bd = Math.max(rec.bond || 0, old ? old.bond || 0 : 0);
    if (bd) p.pals[to].bond = bd;                  // きずなも そのまま（v14.36）
    const nm = rec.name || (old && old.name);
    if (nm) p.pals[to].name = nm;                  // つけた なまえは そのまま（v5.2）
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
    if (e.stage) return PRICE[e.stage] || 3;      // 段階べつ（育てた ほうが 早い）
    if (e.by === 'photo') return 3;               // むかしの セーブの じぶんの モンスター（段階なし）
    return PRICE_SOLO[e.rank || 2] || 6;
  }
  /* お店に ならぶのは「**野生で 会える 子**」だけ（v9.0）。
     ・evoOnly … 育てないと 手に 入らない（息子さんの 4体の 2・3段階め）
     ・capsuleOnly … カプセルでしか 手に 入らない
       ここを 外さないと 抜け道が できる：カプセルで 引いた 1段階めを Lv.10 で 進化させると
       evolveIfReady が p.pals から 消す（図かんには のこる）ので、
       10まいで 出した 子が お店に 3まいで 復活して しまう。 */
  function shopOnly(e) { return !e.evoOnly && !e.capsuleOnly; }
  function shopList(p) {
    if (!p) return [];
    const out = [];
    (MQ.enemies.dexList() || []).forEach(function (e) {
      if (!p.dex || !p.dex[e.id]) return;         // 会った ことが ない
      if (has(p, e.id)) return;                   // もう なかま
      if (!shopOnly(e)) return;                   // 育てて／カプセルでしか 手に 入らない
      out.push({ id: e.id, name: e.name, price: price(e.id), enemy: e });
    });
    return out.sort(function (a, b) { return a.price - b.price; });
  }
  function canBuy(p, id) {
    if (!p || has(p, id) || !p.dex || !p.dex[id]) return false;
    const e = enemyOf(id);
    if (!e || !shopOnly(e)) return false;         // お店に 出ない ものは 買えない（v9.0）
    return (p.coins || 0) >= price(id);
  }
  function buy(p, id) {
    if (!canBuy(p, id)) return null;
    p.coins = Math.max(0, (p.coins || 0) - price(id));
    return add(p, id);
  }

  /* たおした 中から「なかまに なりたい」1体を えらぶ（1回の たたかいで 1体まで）。
     もう なかまの もの・たからばこ・ボスは えらばない */
  /* mul … なかま まつり（v13.16・しゅうまつ イベント）で 2。見こみを ばいに する（上は 6わり） */
  function offerFrom(p, defeated, rnd, mul) {
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
      const rate = Math.min(0.6, (e.rare || e.by === 'photo' ? 0.2 : (OFFER[e.rank || 2] || 0.1)) * (mul || 1));
      if (r() < rate) return id;
    }
    return null;
  }

  return {
    expFor: expFor, levelOf: levelOf, info: info, own: own, has: has, count: count,
    add: add, active: active, setActive: setActive, gain: gain, evolveIfReady: evolveIfReady,
    hitOn: hitOn, price: price, shopList: shopList, shopOnly: shopOnly, canBuy: canBuy, buy: buy, offerFrom: offerFrom,
    gaugeNeed: gaugeNeed, displayName: displayName, baseName: baseName, setName: setName,
    power: power, POWER: POWER,
    bondOf: bondOf, bondUp: bondUp, bondLevel: bondLevel, bondBest: bondBest, moveOf: moveOf,
    BOND_AT: BOND_AT, BOND_PERKS: BOND_PERKS, MOVE_NEED: MOVE_NEED, MOVE_XP: MOVE_XP, MOVE_KINDS: MOVE_KINDS, moveKindOf: moveKindOf, moveOf: moveOf,
    PERKS: PERKS, FAST_LV: FAST_LV, COMBO_LV: COMBO_LV, lvBonus: lvBonus, perksBetween: perksBetween, nextPerk: nextPerk,
    MAX_LV: MAX_LV, HIT_EVERY: HIT_EVERY, EVO_LV: EVO_LV, GAUGE_NEED: GAUGE_NEED,
    SURE_KILLS: SURE_KILLS, NAME_MAX: NAME_MAX
  };
})();
