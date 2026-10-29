/* ---------------------------------------------------------
   あそぶ 時間（v14.56・2026-10-29）
   ユーザー「親が プレイ時間を 管理できる 機能。一定の 時間で 休憩しましょうの ふきだし・
   強制終了の オンオフ」→ 壁打ち →「オススメで」。

   ・休憩の お知らせ（breakMin 分 つづけて あそぶと、たたかいの けっか画面で 相棒が「ひとやすみ」）
   ・1日の 上限（limitMin 分。こえたら たたかいが おわった ところで「きょうは ここまで」）
   ・夜の 時間（bedtime 時 〜 朝 6時は あそべない）
   ぜんぶ はじめは「なし」。おうちの人ページで プレイヤーごとに えらぶ（p.ptSet）。

   きまり（もどさない）：
   ・たたかいの とちゅうでは 止めない（★・けいけんちが なくなると ばつに なる）。
     止めるのは 地図に もどる とき・つぎの たたかいを はじめる とき（ui/playtime.js の gate）。
   ・数えるのは 画面が 見えて いて、さいごに さわってから 90秒 いないの 時間だけ。
   ・のばすのは おうちの人の 4けたの 番号（ごほうびマシンと 同じ 番号）。
   ・外には 何も 送らない。記録は その 子の セーブの 中（p.playMs・14日ぶん）。
   DOM を さわるのは いちばん 下の「数える しかけ」だけ（node では 動かない）。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.playtime = (function () {
  const BREAKS = [0, 20, 30, 45];
  const LIMITS = [0, 30, 45, 60, 90];
  const BEDS = [0, 20, 21, 22];        // この 時から 朝 MORNING 時まで
  const MORNING = 6;
  const EXTENDS = [15, 30];
  const SOON_MS = 3 * 60000;           // のこり 3分で「もう すこしで おしまい」
  const SNOOZE_MS = 10 * 60000;        // 「あとで」＝10分 あとに もう一度
  const IDLE_MS = 90 * 1000;           // さわらずに 90秒 → 数えない
  const RESET_MS = 5 * 60000;          // 5分 はなれたら 休憩した ことに する
  const KEEP_DAYS = 14;

  let nowFn = function () { return Date.now(); };
  function setNow(t) { nowFn = t == null ? function () { return Date.now(); } : (typeof t === 'function' ? t : function () { return +t; }); }
  function now() { return nowFn(); }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dayOf(t) { const d = new Date(t == null ? now() : t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  function pick(list, v, def) { v = Number(v); return list.indexOf(v) >= 0 ? v : def; }
  function settings(p) {
    const s = (p && p.ptSet) || {};
    return { breakMin: pick(BREAKS, s.breakMin, 0), limitMin: pick(LIMITS, s.limitMin, 0), bedtime: pick(BEDS, s.bedtime, 0) };
  }
  function set(p, key, val) {
    if (!p) return false;
    const list = key === 'breakMin' ? BREAKS : key === 'limitMin' ? LIMITS : key === 'bedtime' ? BEDS : null;
    if (!list || list.indexOf(Number(val)) < 0) return false;
    p.ptSet = Object.assign({}, p.ptSet || {});
    p.ptSet[key] = Number(val);
    return true;
  }
  function anyOn(p) { const s = settings(p); return !!(s.breakMin || s.limitMin || s.bedtime); }

  /* ---- きょう あそんだ 時間 ---- */
  function played(p, t) { return p && p.playMs ? (p.playMs[dayOf(t)] || 0) : 0; }
  function add(p, ms, t) {
    if (!p || !(ms > 0)) return;
    if (!p.playMs || typeof p.playMs !== 'object') p.playMs = {};
    const k = dayOf(t);
    p.playMs[k] = (p.playMs[k] || 0) + ms;
    const days = Object.keys(p.playMs).sort();
    while (days.length > KEEP_DAYS) delete p.playMs[days.shift()];
  }
  // さいきん n 日（きょうが さいご）の 分
  function recent(p, n) {
    const out = [];
    const t = now();
    for (let i = (n || 7) - 1; i >= 0; i--) {
      const d = dayOf(t - i * 86400000);
      out.push({ day: d, min: Math.round(((p && p.playMs && p.playMs[d]) || 0) / 60000) });
    }
    return out;
  }

  /* ---- 1日の 上限 ---- */
  function extra(p, t) { const e = p && p.ptExtra; return e && e.day === dayOf(t) ? (e.ms || 0) : 0; }
  function limitMs(p) { const m = settings(p).limitMin; return m ? m * 60000 : 0; }
  // まだ セーブに 入って いない ぶん（数える しかけが ためて いる）も 引く
  function remain(p, t) {
    const L = limitMs(p);
    if (!L) return Infinity;
    const live = (p && p.id === pendingId && t == null) ? pending : 0;
    return L + extra(p, t) - played(p, t) - live;
  }
  function over(p, t) { return remain(p, t) <= 0; }
  function soon(p, t) { const r = remain(p, t); return r > 0 && r <= SOON_MS; }
  // 今日だけ のばす。のこりが マイナスなら 0 から min 分（あそんだ ぶんを 足して そろえる）
  function extend(p, min, t) {
    if (!p) return 0;
    const ms = (Number(min) || EXTENDS[0]) * 60000;
    const over0 = Math.max(0, -remain(p, t));
    p.ptExtra = { day: dayOf(t), ms: extra(p, t) + (isFinite(over0) ? over0 : 0) + ms };
    return remain(p, t);
  }

  /* ---- 夜の 時間 ---- */
  // 夜は 日づけを またぐ ので、朝 6時 までは まえの 日の 夜として 数える
  function nightKey(t) { const d = new Date(t == null ? now() : t); if (d.getHours() < MORNING) d.setDate(d.getDate() - 1); return dayOf(d.getTime()); }
  function bedNow(p, t) {
    const b = settings(p).bedtime;
    if (!b) return false;
    const hr = new Date(t == null ? now() : t).getHours();
    if (!(hr >= b || hr < MORNING)) return false;
    return !(p.ptBedOk && p.ptBedOk === nightKey(t));
  }
  function allowTonight(p, t) { if (p) p.ptBedOk = nightKey(t); }

  // 止める わけ：'bed'（夜）／'limit'（上限）／null
  function blocked(p, t) {
    if (!p) return null;
    if (bedNow(p, t)) return 'bed';
    if (over(p, t)) return 'limit';
    return null;
  }
  // 数える しかけの 中身（下で 使う。remain より 前に 宣言して おく）
  let lastInput = 0, lastTick = 0, pending = 0, pendingId = null, timerId = null;

  /* ---- 休憩（つづけて あそんだ 時間・メモリだけ） ---- */
  let run = 0;            // つづけて あそんだ ms
  let runOwner = null;    // だれの run か
  let snoozeAt = 0;       // 「あとで」を 押した ときの run
  function runMs() { return run; }
  function breakDue(p) {
    const m = settings(p).breakMin;
    if (!m || !p || p.id !== runOwner) return false;
    if (snoozeAt) return run - snoozeAt >= SNOOZE_MS;
    return run >= m * 60000;
  }
  function takeBreak() { run = 0; snoozeAt = 0; }
  function snooze() { snoozeAt = run; }
  // 数える しかけ（と テスト）から よぶ
  function tick(p, ms, t) {
    if (!p || !(ms > 0)) return;
    if (p.id !== runOwner) { runOwner = p.id; run = 0; snoozeAt = 0; }
    run += ms;
    add(p, ms, t);
  }
  function idleReset() { run = 0; snoozeAt = 0; }

  // その日 1回だけ「もう すこしで おしまい」
  function soonWarned(p, t) { return !!(p && p.ptSoonDay === dayOf(t)); }
  function markSoon(p, t) { if (p) p.ptSoonDay = dayOf(t); }

  /* ---- 数える しかけ（ブラウザだけ） ---- */
  function flush() {
    if (!pending || !MQ.save || !MQ.save.update) { pending = 0; return; }
    const ms = pending, id = pendingId;
    pending = 0;
    MQ.save.update(function (p) { if (p && p.id === id) add(p, ms); });
  }
  function step() {
    const t = Date.now();
    const dt = Math.min(t - (lastTick || t), 15000);
    lastTick = t;
    if (typeof document === 'undefined' || document.visibilityState === 'hidden') return;
    if (t - lastInput > RESET_MS) { idleReset(); return; }
    if (t - lastInput > IDLE_MS) return;
    const p = MQ.save && MQ.save.current && MQ.save.current();
    if (!p || !(dt > 0)) return;
    if (p.id !== runOwner) { runOwner = p.id; run = 0; snoozeAt = 0; }
    if (pendingId && pendingId !== p.id) flush();
    pendingId = p.id;
    run += dt;
    pending += dt;
    if (pending >= 30000) flush();
  }
  // セーブに まだ 入って いない ぶんも 足した きょうの 時間
  function playedNow(p) { return played(p) + (p && p.id === pendingId ? pending : 0); }
  function startTracker() {
    if (timerId || typeof window === 'undefined' || typeof document === 'undefined' || typeof window.addEventListener !== 'function') return;
    const touch = function () { lastInput = Date.now(); };
    ['pointerdown', 'touchstart', 'keydown'].forEach(function (ev) { window.addEventListener(ev, touch, { passive: true, capture: true }); });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); else lastTick = Date.now(); });
    window.addEventListener('pagehide', flush);
    lastTick = Date.now();
    timerId = setInterval(step, 5000);
  }
  if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__mqNoPlaytime) startTracker();

  return {
    BREAKS: BREAKS, LIMITS: LIMITS, BEDS: BEDS, EXTENDS: EXTENDS, MORNING: MORNING, SOON_MS: SOON_MS, SNOOZE_MS: SNOOZE_MS,
    setNow: setNow, dayOf: dayOf, settings: settings, set: set, anyOn: anyOn,
    played: played, playedNow: playedNow, add: add, recent: recent,
    remain: remain, over: over, soon: soon, extend: extend, bedNow: bedNow, allowTonight: allowTonight, blocked: blocked,
    breakDue: breakDue, takeBreak: takeBreak, snooze: snooze, tick: tick, runMs: runMs,
    soonWarned: soonWarned, markSoon: markSoon, flush: flush
  };
})();
