/* ---------------------------------------------------------
   きょうの フィーバー教科 ＋ サポート（v7.2）

   「得意な 教科ばかり やって、にがてな 教科を さけて しまう」への 手当て。
   ばつを 与える 方向（得意を ロックする など）は とらない。
   **にがてな 教科の ほうが おトクで、こわくない** ように する。

   ① フィーバー教科（毎日 1つ）
        いちばん やって いない 教科（回数が 同じなら 正解率の 低い ほう）が
        その日の フィーバー。そこで たたかうと
          ・けいけんち 2ばい  ・おわりに コイン +1  ・レアが 出やすい（画面がわ）
          ・なかまゲージが 2ばい（相棒が いる とき）
        おうちの人ページで「おまかせ／教科を えらぶ／なし」を 選べる（p.feverPick）。
   ② 相棒の おねがい
        相棒が いれば 地図で「きょうは 国語の森に 行きたいな！」と 言う（palLine）。
   ③ サポート（にがて・はじめての 教科）
        その 教科の さいきんの 正解率が 70% みまん、または まだ 5問 みまん なら
          ・やさしい 問題 多め（ザコ 12体が 4/4/4 → 5/5/2）
          ・ヒントが 先に 出る（みちしるべと 同じ）
          ・まちがえても コンボが 切れない（2回）
        効果は どれも「正解した とき」に 出る（v2.0 の 大原則）。答えは 見せない。

   セーブ：p.areaPlays { 'g3:kokugo': たたかった 回数 }／p.fever { day, g, areaId, pick }／
           p.feverPick（null=おまかせ・'off'=なし・エリア id）
   正解率は js/core/stats.js の 記ろく（さいきん 20問／ステージ）を 教科ごとに 足して 見る。
   DOM を 知らない。日づけは テスト用に setNow で 入れかえられる。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.fever = (function () {
  const XP_MUL = 2;        // けいけんち
  const COINS = 1;         // おわりに コイン
  const PAL_PLUS = 1;      // なかまゲージが 正解 1回で ＋(1+PAL_PLUS)
  const KEEP = 2;          // サポート：コンボを まもる 回数
  const EASY_EXTRA = 3;    // サポート：多めに 作って むずかしい ぶんを 落とす 数
  const WEAK_PCT = 70;     // これ みまん → にがて
  const FEW = 5;           // これ みまん → まだ はじめて
  let NOW = null;

  function now() { return NOW || new Date(); }
  function dayKey(d) { d = d || now(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function key(p, areaId) { return MQ.save && MQ.save.areaKey ? MQ.save.areaKey(areaId, p) : areaId; }
  function grade(p) { return MQ.save && MQ.save.playGrade ? MQ.save.playGrade(p) : 3; }

  /* ---- たたかった 回数（学年ごと） ---- */
  function plays(p, areaId) { return (p && p.areaPlays && p.areaPlays[key(p, areaId)]) || 0; }
  function addPlay(p, areaId) {
    if (!p || !areaId) return 0;
    if (!p.areaPlays || typeof p.areaPlays !== 'object') p.areaPlays = {};
    const k = key(p, areaId);
    p.areaPlays[k] = (p.areaPlays[k] || 0) + 1;
    return p.areaPlays[k];
  }

  /* ---- 正解率（さいきん）。stats の ステージごとの「さいきん 20問」を 教科で 足す ---- */
  function accuracy(p, areaId) {
    const area = MQ.content && MQ.content.areaOf ? MQ.content.areaOf(areaId) : null;
    const rows = p && p.stats && p.stats.rows ? p.stats.rows : {};
    let ok = 0, n = 0;
    if (area) {
      (area.stages || []).forEach(function (st) {
        const r = rows[st.id];
        if (!r || !r.r) return;
        n += r.r.length;
        ok += r.r.split('1').length - 1;
      });
    }
    return { ok: ok, n: n, pct: n ? Math.round(ok / n * 100) : null };
  }
  // 'new'（まだ 5問 みまん）／'weak'（70% みまん）／'ok'
  function level(p, areaId) {
    const a = accuracy(p, areaId);
    if (a.n < FEW) return 'new';
    return a.pct < WEAK_PCT ? 'weak' : 'ok';
  }
  function needsSupport(p, areaId) { return level(p, areaId) !== 'ok'; }
  function supportText(lv) {
    return lv === 'weak' ? 'サポート！ やさしく スタート・ヒントつき・コンボ ガード'
      : 'はじめての 教科は やさしく スタート！ ヒントつき・コンボ ガード';
  }

  /* ---- フィーバーに なれる 教科（塔は のぞく・開いている ステージが ある もの） ---- */
  function candidates() {
    if (!MQ.content || !MQ.content.subjectAreas) return [];
    return MQ.content.subjectAreas().filter(function (a) {
      return (a.stages || []).some(function (st) { return MQ.content.isAvailable(st); });
    });
  }
  function hash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }

  /* きょうの フィーバー教科の id（ない ときは null）。
     おうちの人の えらび（feverPick）→ いちばん やって いない → 正解率の 低い → 日づけで 決まる くじ */
  function choose(p) {
    const cands = candidates();
    if (cands.length < 2) return null;
    const pick = p.feverPick || null;
    if (pick === 'off') return null;
    if (pick && cands.some(function (a) { return a.id === pick; })) return pick;
    const day = dayKey();
    const scored = cands.map(function (a) {
      const acc = accuracy(p, a.id);
      return { id: a.id, plays: plays(p, a.id), pct: acc.pct == null ? -1 : acc.pct, h: hash(day + ':' + a.id) };
    });
    scored.sort(function (x, y) { return (x.plays - y.plays) || (x.pct - y.pct) || (x.h - y.h); });
    return scored[0].id;
  }

  // きょうの ぶんを 作る／読む（p を 書きかえる）。日づけ・学年・えらびが 変わったら 作り直す
  function ensure(p) {
    if (!p) return null;
    const day = dayKey(), g = grade(p), pick = p.feverPick || null;
    if (!p.fever || typeof p.fever !== 'object' || p.fever.day !== day || p.fever.g !== g || (p.fever.pick || null) !== pick) {
      p.fever = { day: day, g: g, areaId: choose(p), pick: pick };
    }
    return p.fever.areaId ? p.fever : null;
  }

  /* 画面用の まとめ：{ areaId, area, name, short, xpMul, coins, palPlus, support, level } か null */
  function today(p) {
    const f = ensure(p);
    if (!f) return null;
    const area = MQ.content.areaOf(f.areaId);
    if (!area) return null;
    const lv = level(p, f.areaId);
    return {
      areaId: f.areaId, area: area, name: area.name, short: area.short || area.name,
      xpMul: XP_MUL, coins: COINS, palPlus: PAL_PLUS,
      support: lv !== 'ok', level: lv
    };
  }
  function isFever(p, areaId) { const f = today(p); return !!f && f.areaId === areaId; }

  /* 相棒の おねがい（相棒が いて フィーバーが ある ときだけ） */
  function palLine(p) {
    const f = today(p);
    const pal = MQ.pals && MQ.pals.active ? MQ.pals.active(p) : null;
    if (!f || !pal) return null;
    return { pal: pal, text: 'きょうは ' + f.name + 'に 行きたいな！' };
  }

  /* たたかいに わたす もの（core/battle.js の start の fever / support） */
  function battleOpts(p, areaId) {
    const lv = level(p, areaId);
    return {
      fever: isFever(p, areaId) ? { xpMul: XP_MUL, coins: COINS, palPlus: PAL_PLUS } : null,
      support: lv !== 'ok' ? { easy: true, hint: true, keep: KEEP, extra: EASY_EXTRA, level: lv } : null
    };
  }

  /* おうちの人ページ用：教科ごとの ようす */
  function overview(p) {
    return candidates().map(function (a) {
      const acc = accuracy(p, a.id);
      return { id: a.id, name: a.name, short: a.short || a.name, plays: plays(p, a.id), pct: acc.pct, n: acc.n, level: level(p, a.id) };
    });
  }

  return {
    XP_MUL: XP_MUL, COINS: COINS, PAL_PLUS: PAL_PLUS, KEEP: KEEP, EASY_EXTRA: EASY_EXTRA, WEAK_PCT: WEAK_PCT, FEW: FEW,
    plays: plays, addPlay: addPlay, accuracy: accuracy, level: level, needsSupport: needsSupport, supportText: supportText,
    candidates: candidates, choose: choose, ensure: ensure, today: today, isFever: isFever, palLine: palLine,
    battleOpts: battleOpts, overview: overview,
    dayKey: dayKey, now: now, setNow: function (d) { NOW = d || null; }
  };
})();
