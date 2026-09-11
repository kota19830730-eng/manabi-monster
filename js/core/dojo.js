/* ---------------------------------------------------------
   しゅぎょうば（相棒が 指導して くれる 予習・復習・v13.0）の ルール

   ■ なに
     ステージを えらぶと 相棒が ① せつめい → ② いっしょに とく → ③ ひとりで やってみる の
     3だんで 教えて くれる。学期で まだ 閉じて いる「つぎの 1ステージ」も ここからは 入れる（予習）。
     合格すると そのステージが 地図で 開く（world3.js の isAvailable が previewOpen を 見る）。

   ■ きまり
     ・アプリの 中で ただ 1つ「答えを 見せて いい 場所」（バトルは いままで どおり 見せない）
     ・ばつは ない（★は へらない・敵は にげない）。合格しなければ ②に もどる だけ
     ・問題は ステージの make() を そのまま 使う。指導の 文は js/content/lessonN.js
     ・けいけんちは 合格した ときだけ（はじめて +30・2回め いこう +10）

   ■ セーブ
     p.dojo      = { 'sansu3-6': { done: 回数, at: 日時 } }
     p.dojoDone  = 合格した ステージの 数（しょうごう「しゅぎょうの たつじん」）
     p.previewOk = 予習を ゆるすか（おうちの人ページ・はじめは true）

   DOM を 知らない。画面は js/ui/dojo.js。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.dojo = (function () {
  const GUIDED_N = 2;      // いっしょに とく
  const PRACTICE_N = 3;    // ひとりで やってみる
  const PASS_MISS = 1;     // まちがい この 数まで なら 合格
  const XP_FIRST = 30;     // はじめての 合格
  const XP_AGAIN = 10;     // 2回め いこう
  const OK_TYPES = { number: true, choice: true, divrem: true, frac: true };
  const SENSEI_ID = 'owl-brown';   // 相棒が いない 子の 先生（フクロン）

  const PRAISE = ['そう！ その ちょうし！', 'せいかい！ ばっちりだね！', 'できた！ すごい！', 'いいね！ わかって きたね！'];
  const CHEER = ['おしい！ もう いちど やって みよう。', 'だいじょうぶ。ゆっくり 考えよう。', 'ちかい！ もう 1回！'];

  /* ---- 指導の 中身 ---- */
  function lesson(stageId) { return MQ.lessons ? MQ.lessons.get(stageId) : null; }
  function has(stageId) { return !!lesson(stageId); }

  /* ---- セーブ ---- */
  function rec(player, stageId) { return (player && player.dojo && player.dojo[stageId]) || null; }
  function doneCount(player, stageId) { const r = rec(player, stageId); return r ? (r.done || 0) : 0; }
  function previewOk(player) { return !player || player.previewOk !== false; }
  // 学期で 閉じて いる ステージを 開いて よいか（world3.js の isAvailable が 見る）
  function previewOpen(player, stageId) { return previewOk(player) && doneCount(player, stageId) > 0; }

  // 学期で まだ ならって いない ステージか（isAvailable を 通さず 生で）
  function termClosed(player, st) {
    if (!MQ.terms || !MQ.terms.stageLearned) return false;
    return !MQ.terms.stageLearned(player, st.id);
  }

  /* 予習の 相手：エリアの 中で 学期で 閉じて いる いちばん 手前の ステージ。
     そこに 指導の 中身が なければ null（じゅんばんを とばして 先の ステージには 行かない） */
  function previewTarget(player, area) {
    if (!area || !previewOk(player)) return null;
    for (let i = 0; i < area.stages.length; i++) {
      const st = area.stages[i];
      if (st.tower || !st.available) continue;
      if (!termClosed(player, st)) continue;
      return has(st.id) ? st : null;
    }
    return null;
  }

  /* 一覧：いま あそんで いる 学年で、指導の 中身が ある ステージ
       preview … 学期で 閉じて いて、しゅぎょうばからだけ 入れる
       now     … 開いて いて ★が まだ ない
       review  … ★が ある */
  function candidates(player) {
    const out = { preview: [], now: [], review: [] };
    if (!MQ.content) return out;
    MQ.content.subjectAreas().forEach(function (area) {
      const target = previewTarget(player, area);
      area.stages.forEach(function (st) {
        if (st.tower || !has(st.id)) return;
        const done = doneCount(player, st.id);
        const stars = (player && player.stars && player.stars[st.id]) || 0;
        const e = { area: area, stage: st, done: done, stars: stars, preview: termClosed(player, st) };
        if (MQ.content.isAvailable(st)) {
          if (!MQ.content.isUnlocked(player, area, st)) return;
          (stars ? out.review : out.now).push(e);
        } else if (target && target.id === st.id) {
          out.preview.push(e);
        }
      });
    });
    return out;
  }
  function count(player) { const c = candidates(player); return c.preview.length + c.now.length + c.review.length; }

  /* ---- 問題の 数字（声かけの 文に 使う） ---- */
  function nums(q) {
    const t = String(q.prompt || '').replace(/<[^>]+>/g, ' ');
    return (t.match(/\d+(?:\.\d+)?/g) || []).map(Number);
  }

  /* ---- 「まず なにを する？」 ---- */
  function stepFor(les, q) {
    if (!les || !les.steps || !q) return null;
    for (let i = 0; i < les.steps.length; i++) {
      const s = les.steps[i];
      if (!s.when.test(q.unit || '')) continue;
      let r = null;
      try { r = s.make(q, nums(q)); } catch (e) { r = null; }
      if (!r || !r.choices || r.choices.length !== 3) continue;
      const opts = r.choices.map(function (t, k) { return { text: t, ok: k === 0 }; });
      return { ask: r.ask, options: MQ.util.shuffle(opts), why: r.why };
    }
    return null;
  }

  /* ---- 問題を えらぶ ---- */
  function usable(q) { return q && OK_TYPES[q.type]; }
  function pickFrom(stage, lv, n, avoid, preferStep, les) {
    let qs = [];
    try { qs = stage.make(Math.max(6, n * 3), { lv: lv }) || []; } catch (e) { qs = []; }
    qs = qs.filter(function (q) { return usable(q) && !avoid[q.id]; });
    if (preferStep) {
      const withStep = qs.filter(function (q) { return !!stepFor(les, q); });
      const rest = qs.filter(function (q) { return !stepFor(les, q); });
      qs = withStep.concat(rest);
    }
    const out = [];
    qs.forEach(function (q) { if (out.length < n && !avoid[q.id]) { out.push(q); avoid[q.id] = true; } });
    return out;
  }

  function session(stageId, player) {
    const found = MQ.content.findStage(stageId);
    const les = lesson(stageId);
    if (!found || !les) return null;
    const avoid = {};
    const guided = pickFrom(found.stage, 1, 1, avoid, true, les).concat(pickFrom(found.stage, 2, 1, avoid, true, les));
    while (guided.length < GUIDED_N) { const more = pickFrom(found.stage, 2, 1, avoid, true, les); if (!more.length) break; guided.push(more[0]); }
    const practice = pickFrom(found.stage, 1, 1, avoid, false, les).concat(pickFrom(found.stage, 2, 2, avoid, false, les));
    while (practice.length < PRACTICE_N) { const more = pickFrom(found.stage, 1, 1, avoid, false, les); if (!more.length) break; practice.push(more[0]); }
    return {
      stageId: stageId, stage: found.stage, area: found.area, world: found.world, lesson: les,
      guided: guided, practice: practice,
      done: doneCount(player, stageId), preview: termClosed(player, found.stage)
    };
  }

  /* ---- はんてい・声かけ ---- */
  function judge(q, value) { return MQ.battle.isCorrect(q, value); }
  function answerText(q) { return MQ.battle.answerText(q); }

  // どの 単元にも 効く 声かけ（lesson の miss が ぜんぶ null の とき）
  function commonMiss(q, v) {
    if (q.type === 'choice') return 'ちがうよ。ヒントを もういちど 読んで、ほかの ものを 見て みよう。';
    if (q.type === 'divrem' || q.type === 'frac') return null;
    const a = Number(q.answer), x = Number(v);
    if (isNaN(x)) return null;
    if (a !== 0 && (Math.abs(x - a * 10) < 1e-9 || Math.abs(x * 10 - a) < 1e-9)) return '0 の 数（位）を もう いちど たしかめよう。';
    if (Math.abs(x - a) === 1) return '1 だけ ちがう。かぞえ直して みよう。';
    return null;
  }
  function missText(les, q, value) {
    const n = nums(q);
    if (les && les.miss) {
      for (let i = 0; i < les.miss.length; i++) {
        let t = null;
        try { t = les.miss[i](q, value, n); } catch (e) { t = null; }
        if (t) return t;
      }
    }
    return commonMiss(q, value) || 'おしい。ヒントを もういちど 読んで、ゆっくり やり直そう。';
  }
  function praise() { return MQ.util.pick(PRAISE); }
  function cheer() { return MQ.util.pick(CHEER); }
  function passed(misses) { return misses <= PASS_MISS; }

  /* ---- 先生（相棒） ---- */
  function sensei(player) {
    const pal = MQ.pals && player ? MQ.pals.active(player) : null;
    if (pal) return { id: pal.id, name: pal.name, pal: true };
    const e = MQ.enemies && MQ.enemies.get(SENSEI_ID);
    return { id: SENSEI_ID, name: (e && e.name) || 'フクロン', pal: false };
  }

  /* ---- 合格の ごほうび（player を 書きかえる。呼ぶ側が MQ.save.update の 中で） ---- */
  function complete(p, stageId) {
    if (!p.dojo || typeof p.dojo !== 'object') p.dojo = {};
    const r = p.dojo[stageId] || { done: 0 };
    r.done = (r.done || 0) + 1;
    r.at = new Date().toISOString();
    p.dojo[stageId] = r;
    const first = r.done === 1;
    const xp = first ? XP_FIRST : XP_AGAIN;
    const before = MQ.hero.progress(p.xp || 0).level;
    p.xp = (p.xp || 0) + xp;
    const after = MQ.hero.progress(p.xp).level;
    p.dojoDone = Object.keys(p.dojo).filter(function (k) { return (p.dojo[k].done || 0) > 0; }).length;
    let pal = null;
    if (MQ.pals && MQ.pals.active(p)) pal = MQ.pals.gain(p, xp);
    const found = MQ.content.findStage(stageId);
    if (MQ.save && MQ.save.addLog) MQ.save.addLog(p, 'しゅぎょうば：' + (found ? found.stage.name : stageId) + (first ? '　はじめて 合格' : '　合格'));
    const titles = MQ.hero.checkTitles ? MQ.hero.checkTitles(p) : [];
    return { xp: xp, first: first, levelUp: after > before, level: after, pal: pal, titles: titles, done: r.done };
  }

  return {
    lesson: lesson, has: has, rec: rec, doneCount: doneCount,
    previewOk: previewOk, previewOpen: previewOpen, previewTarget: previewTarget, termClosed: termClosed,
    candidates: candidates, count: count,
    session: session, stepFor: stepFor, nums: nums,
    judge: judge, answerText: answerText, missText: missText, commonMiss: commonMiss, praise: praise, cheer: cheer, passed: passed,
    sensei: sensei, complete: complete,
    GUIDED_N: GUIDED_N, PRACTICE_N: PRACTICE_N, PASS_MISS: PASS_MISS, XP_FIRST: XP_FIRST, XP_AGAIN: XP_AGAIN, SENSEI_ID: SENSEI_ID
  };
})();
