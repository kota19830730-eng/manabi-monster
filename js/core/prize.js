/* ---------------------------------------------------------
   おうちの人の マシン（v13.12）— 引く ルールだけ

   ユーザー「カプセルマシンの 景品を 保護者が 決める システム。新しい ゲームを
   買って あげる 口実とか、子どもが 親に 与えて ほしい ものを カプセルマシンに
   入れる 構造。確率も 親が 設定できるように」。壁打ちで 決めた こと（おすすめ 4つ）：
     ・カプセルマシンの 中に **新しい 台**（金色）。いまの 3つ（なかま・そうび・すがた）は そのまま
     ・景品の 設定は **4けたの 番号**で まもる（子どもが 自分で 100% に できない ように）
     ・子どもの 画面にも **景品ごとの %** と「あと 〇回で かくてい」を 出す（うそを つかない）
     ・大物は **回数で かくてい**（景品ごとに おうちの人が 決める）
     ・＋ユーザー「期限も あると 助かります」→ 景品ごとに「いつまで」
   ほかの きまり（もどさない）
     ・**はずれを 作らない**。出せる 景品が 1つも ない ときは「じゅんびちゅう」で 引けない
     ・当たると「ごほうび チケット」。おうちの人が 番号を 入れて「わたした」を 押す まで のこる
     ・お金は かからない。コインは 勉強でしか たまらない。**外には 送らない**（この 端末の セーブだけ）
     ・景品は 子どもごとに べつ（p.prize）。番号だけは 家に 1つ（settings.prizePin）

   セーブ：p.prize = { price, items: [item], tickets: [ticket], pulls, seq }
     item   = { id, name, icon, level(1〜5), stock(0＝いくつでも), got, pity(0＝なし), miss, until('YYYY-MM-DD'|null), at }
     ticket = { id, itemId, name, icon, level, at, pity, given, givenAt }

   DOM を 知らない。画面は js/ui/prize.js（おうちの人の 設定）と js/ui/capsule.js（子どもの マシン）。
   仕様は docs/v13.12おうちの人のマシンメモ.md。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.prize = (function () {
  const MAX_ITEMS = 8;          // 1台に 入れられる 景品の 数
  const NAME_MAX = 20;          // 景品の 名前の 長さ
  const MAX_TICKETS = 60;       // のこす チケットの 数（わたした ものから 古い じゅんに 消す）
  const DEFAULT_PRICE = 30;     // 1回の ねだん（1日 だいたい 15〜20まい たまる ので 1〜2日に 1回）
  const PRICES = [10, 20, 30, 50, 100];

  /* 出やすさ 5段階（w＝重み）。% は 出せる 景品の 重みの 合計で わって 出す */
  const LEVELS = [
    { id: 1, name: 'よく出る', w: 40 },
    { id: 2, name: 'ふつう', w: 20 },
    { id: 3, name: 'ときどき', w: 10 },
    { id: 4, name: 'めったに', w: 4 },
    { id: 5, name: 'ちょうレア', w: 1 }
  ];
  const STOCKS = [1, 2, 3, 5, 0];         // 0＝いくつでも
  const PITIES = [0, 10, 20, 30, 50];     // 0＝かくていなし
  /* 景品の 絵（絵そのものは js/ui/prize.js） */
  const ICONS = [
    { id: 'gift', name: 'プレゼント' }, { id: 'game', name: 'ゲーム' }, { id: 'sweets', name: 'おかし' },
    { id: 'outing', name: 'おでかけ' }, { id: 'time', name: 'じかん' }, { id: 'book', name: '本' },
    { id: 'toy', name: 'おもちゃ' }, { id: 'star', name: 'とくべつ' }
  ];
  const ICON_IDS = ICONS.map(function (x) { return x.id; });

  /* ---- 日づけ（テスト用に 入れかえられる） ---- */
  let NOW = null;
  function now() { return NOW ? new Date(NOW.getTime()) : new Date(); }
  function setNow(d) { NOW = d || null; }
  function ymd(d) {
    const x = d || now();
    return x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2) + '-' + ('0' + x.getDate()).slice(-2);
  }
  /* 期限の かんたん えらび：今週（日曜まで）／今月（月の おわりまで） */
  function endOfWeek(d) { const x = d || now(); const e = new Date(x.getFullYear(), x.getMonth(), x.getDate() + (7 - x.getDay()) % 7); return ymd(e); }
  function endOfMonth(d) { const x = d || now(); return ymd(new Date(x.getFullYear(), x.getMonth() + 1, 0)); }

  function levelOf(id) { for (let i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) return LEVELS[i]; return LEVELS[1]; }

  /* ---- セーブ ---- */
  function ensure(p) {
    if (!p) return null;
    if (!p.prize || typeof p.prize !== 'object') p.prize = {};
    const z = p.prize;
    if (PRICES.indexOf(z.price) === -1) z.price = DEFAULT_PRICE;
    if (!Array.isArray(z.items)) z.items = [];
    if (!Array.isArray(z.tickets)) z.tickets = [];
    if (typeof z.pulls !== 'number' || z.pulls < 0) z.pulls = 0;
    if (typeof z.seq !== 'number' || z.seq < 0) z.seq = 0;
    z.items.forEach(clean);
    return z;
  }
  function clean(it) {
    it.name = String(it.name || '').trim().slice(0, NAME_MAX) || 'ごほうび';
    if (ICON_IDS.indexOf(it.icon) === -1) it.icon = 'gift';
    if (!LEVELS.some(function (l) { return l.id === it.level; })) it.level = 2;
    if (STOCKS.indexOf(it.stock) === -1) it.stock = 1;
    if (typeof it.got !== 'number' || it.got < 0) it.got = 0;
    if (PITIES.indexOf(it.pity) === -1) it.pity = 0;
    if (typeof it.miss !== 'number' || it.miss < 0) it.miss = 0;
    if (it.until && !/^\d{4}-\d{2}-\d{2}$/.test(it.until)) it.until = null;
    if (!it.until) it.until = null;
    return it;
  }
  function items(p) { const z = ensure(p); return z ? z.items : []; }
  function find(p, id) { return items(p).filter(function (x) { return x.id === id; })[0] || null; }

  /* ---- この 景品は いま マシンに 入って いるか ---- */
  function soldOut(it) { return it.stock > 0 && it.got >= it.stock; }
  function expired(it) { return !!(it.until && ymd() > it.until); }
  function isLive(it) { return !soldOut(it) && !expired(it); }
  function live(p) { return items(p).filter(isLive); }
  /* 子どもの 画面に マシンを 出すか（景品が 1つでも 入って いれば 出す。ぜんぶ 期限切れなら「じゅんびちゅう」） */
  function hasAny(p) { return items(p).length > 0; }

  /* ---- わりあい（画面に 出す 数字。合計は かならず 1） ---- */
  function rates(p) {
    const L = live(p);
    const sum = L.reduce(function (n, it) { return n + levelOf(it.level).w; }, 0);
    const out = {};
    L.forEach(function (it) { out[it.id] = sum ? levelOf(it.level).w / sum : 0; });
    return out;
  }
  /* 1つぶんの わりあい（まだ 入れて いない 景品の 下見にも つかう）。extra＝ほかに 足す 景品 */
  function rateIf(p, level, exceptId) {
    const L = live(p).filter(function (x) { return x.id !== exceptId; });
    const sum = L.reduce(function (n, it) { return n + levelOf(it.level).w; }, 0) + levelOf(level).w;
    return levelOf(level).w / sum;
  }
  /* 画面の %：1% より 小さい ときは 小数 1けた（0.8%）。まるめて 0 に しない */
  function pctText(r) {
    const v = r * 100;
    if (v > 0 && v < 1) return (Math.max(0.1, Math.round(v * 10) / 10)) + '%';
    return Math.round(v) + '%';
  }
  /* あと 何回で かくていか（かくていが ない 景品は null） */
  function pityLeft(it) { return it.pity > 0 ? Math.max(1, it.pity - it.miss) : null; }

  /* ---- 引ける か ---- */
  function canPull(p) {
    const z = ensure(p);
    if (!z) return { ok: false, why: 'ない' };
    if (!live(p).length) return { ok: false, why: 'じゅんびちゅう' };
    const coins = p.coins || 0;
    if (coins < z.price) return { ok: false, why: 'コインが たりない', short: z.price - coins };
    return { ok: true };
  }

  /* ---- 1つ えらぶ ----
     ①かくてい：つぎで かくていに なる 景品が あれば それ（いくつも あれば いちばん 出にくい もの）
     ②そうでなければ 重みで くじ */
  function choose(p, rnd) {
    const L = live(p);
    if (!L.length) return { item: null, pity: false };
    const due = L.filter(function (it) { return it.pity > 0 && it.miss + 1 >= it.pity; });
    if (due.length) {
      due.sort(function (a, b) { return levelOf(a.level).w - levelOf(b.level).w || b.miss - a.miss; });
      return { item: due[0], pity: true };
    }
    const sum = L.reduce(function (n, it) { return n + levelOf(it.level).w; }, 0);
    let r = rnd() * sum;
    for (let i = 0; i < L.length; i++) {
      r -= levelOf(L[i].level).w;
      if (r < 0) return { item: L[i], pity: false };
    }
    return { item: L[L.length - 1], pity: false };
  }

  /* 演出の だんかい（色で うそを つかない：出た 景品の 出にくさ そのまま） */
  function rarityOf(it) { return it.level >= 5 ? 'sr' : it.level >= 3 ? 'r' : 'n'; }

  /* ---- 引く ----
     かえり値 { ok, item, ticket, rarity, pity, spent, coins } */
  function pull(p, rnd) {
    const r = rnd || Math.random;
    const can = canPull(p);
    if (!can.ok) return { ok: false, why: can.why, short: can.short || 0 };
    const z = ensure(p);
    const L = live(p);
    const pick = choose(p, r);
    const it = pick.item;
    p.coins = Math.max(0, (p.coins || 0) - z.price);
    // かくていの カウント：出た ものは 0・ほかの 出せる ものは 1つ すすむ
    L.forEach(function (x) { if (x !== it) x.miss += 1; });
    it.miss = 0;
    it.got += 1;
    z.pulls += 1;
    z.seq += 1;
    const ticket = {
      id: 't' + z.seq, itemId: it.id, name: it.name, icon: it.icon, level: it.level,
      at: now().toISOString(), pity: pick.pity, given: false, givenAt: null
    };
    z.tickets.unshift(ticket);
    trim(z);
    return { ok: true, item: Object.assign({}, it), ticket: ticket, rarity: rarityOf(it), pity: pick.pity, spent: z.price, coins: p.coins, soldOut: soldOut(it) };
  }
  function trim(z) {
    if (z.tickets.length <= MAX_TICKETS) return;
    // わたして いない ものは 消さない
    for (let i = z.tickets.length - 1; i >= 0 && z.tickets.length > MAX_TICKETS; i--) {
      if (z.tickets[i].given) z.tickets.splice(i, 1);
    }
  }

  /* ---- チケット ---- */
  function tickets(p) { const z = ensure(p); return z ? z.tickets : []; }
  function waiting(p) { return tickets(p).filter(function (t) { return !t.given; }); }
  function give(p, ticketId) {
    const t = tickets(p).filter(function (x) { return x.id === ticketId; })[0];
    if (!t || t.given) return false;
    t.given = true;
    t.givenAt = now().toISOString();
    return true;
  }

  /* ---- おうちの人の 設定 ---- */
  function setPrice(p, v) { const z = ensure(p); if (PRICES.indexOf(v) === -1) return false; z.price = v; return true; }
  /* 景品を 足す／直す。opts: { name, icon, level, stock, pity, until }。かえり値 景品（だめなら null） */
  function save(p, opts, id) {
    const z = ensure(p);
    const name = String((opts && opts.name) || '').trim().slice(0, NAME_MAX);
    if (!name) return null;
    let it = id ? find(p, id) : null;
    if (!it) {
      if (z.items.length >= MAX_ITEMS) return null;
      z.seq += 1;
      it = { id: 'z' + z.seq, got: 0, miss: 0, at: now().toISOString() };
      z.items.push(it);
    }
    it.name = name;
    it.icon = opts.icon; it.level = opts.level; it.stock = opts.stock; it.pity = opts.pity;
    it.until = opts.until || null;
    // 数を ふやしたら また 出せる ように（got は そのまま・のこりが ふえる）
    clean(it);
    return it;
  }
  function remove(p, id) {
    const z = ensure(p);
    const n = z.items.length;
    z.items = z.items.filter(function (x) { return x.id !== id; });
    return z.items.length < n;
  }
  /* 番号を わすれた とき：景品を ぜんぶ 消す（チケットは のこす＝もう 当たった 約束） */
  function clearItems(p) { const z = ensure(p); z.items = []; }

  /* ---- 4けたの 番号（家に 1つ・settings.prizePin に まぜた 形で しまう） ---- */
  function hash(pin) {
    let v = 2166136261;
    const s = 'mq-prize:' + pin;
    for (let i = 0; i < s.length; i++) { v ^= s.charCodeAt(i); v = Math.imul(v, 16777619); }
    return 'h' + (v >>> 0).toString(36);
  }
  function validPin(pin) { return /^\d{4}$/.test(String(pin || '')); }
  function hasPin() { return !!(MQ.save && MQ.save.getSetting('prizePin', null)); }
  function setPin(pin) { if (!validPin(pin)) return false; MQ.save.setSetting('prizePin', hash(pin)); return true; }
  function checkPin(pin) { const h = MQ.save.getSetting('prizePin', null); return !!h && validPin(pin) && hash(pin) === h; }
  /* 番号を わすれた：番号を 消して、ぜんぶの 子の 景品を 消す（子どもが 押しても 自分に ごほうびは 出せない） */
  /* 作り直した しるし（settings.prizeReset）。子どもが「番号を 忘れた」を 押して 自分で 番号を 作り直しても、
     おうちの人の 画面に「〇月〇日に 作り直されました」が 出る（おうちの人が「確認した」を 押すまで） */
  function forgetPin() {
    MQ.save.setSetting('prizePin', null);
    MQ.save.setSetting('prizeReset', now().toISOString());
    (MQ.save.get().players || []).forEach(function (pl) { if (pl.prize) pl.prize.items = []; });
    MQ.save.persist && MQ.save.persist();
  }

  function resetAt() { return MQ.save ? MQ.save.getSetting('prizeReset', null) : null; }
  function ackReset() { MQ.save.setSetting('prizeReset', null); }

  return {
    resetAt: resetAt, ackReset: ackReset,
    MAX_ITEMS: MAX_ITEMS, NAME_MAX: NAME_MAX, DEFAULT_PRICE: DEFAULT_PRICE, PRICES: PRICES,
    LEVELS: LEVELS, STOCKS: STOCKS, PITIES: PITIES, ICONS: ICONS, ICON_IDS: ICON_IDS,
    now: now, setNow: setNow, ymd: ymd, endOfWeek: endOfWeek, endOfMonth: endOfMonth, levelOf: levelOf,
    ensure: ensure, items: items, find: find, soldOut: soldOut, expired: expired, isLive: isLive, live: live, hasAny: hasAny,
    rates: rates, rateIf: rateIf, pctText: pctText, pityLeft: pityLeft, canPull: canPull, choose: choose, rarityOf: rarityOf, pull: pull,
    tickets: tickets, waiting: waiting, give: give,
    setPrice: setPrice, save: save, remove: remove, clearItems: clearItems,
    validPin: validPin, hasPin: hasPin, setPin: setPin, checkPin: checkPin, forgetPin: forgetPin
  };
})();
