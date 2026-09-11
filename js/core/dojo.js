/* ---------------------------------------------------------
   しゅぎょうば（相棒が 指導して くれる 予習・復習・v13.0）の ルール

   ■ なに
     ステージを えらぶと 相棒が ① せつめい → ② いっしょに とく → ③ ひとりで やってみる の
     3だんで 教えて くれる。学期で まだ 閉じて いる「つぎの 1ステージ」も ここからは 入れる（予習）。
     合格すると そのステージが 地図で 開く（world3.js の isAvailable が previewOpen を 見る）。

   ■ 指導の 中身は 2しゅるい（v13.1 で 全学年・全教科に）
     ・手書き … js/content/lessonN.js（いまは 小3 算数 18ステージ）。
                「まず なにを する？」の 3たく・まちがい方ごとの 声かけ つき
     ・自動   … 手書きが ない ステージは、問題に 入って いる ヒント（hint）と
                答えの せつめい（note）から その場で 作る（autoLesson）。
                せつめいは「れい」を 2つ 見せる だけ・声かけは 共通の もの
     かん字を 書く／ローマ字を うつ 問題は 使えない ので、使える 問題が 少ない ステージは 出さない。

   ■ 予習が できるのは 問題を その場で 作る ステージ（算数）だけ
     国語・理科・社会・英語の 問題リストは 学期で しぼられる（world3.js の listStage）ので、
     まだ ならって いない ステージは 問題が 0に なり、合格しても たたかいに ならない。

   ■ きまり
     ・アプリの 中で ただ 1つ「答えを 見せて いい 場所」（バトルは いままで どおり 見せない）
     ・ばつは ない（★は へらない・敵は にげない）。合格しなければ ②に もどる だけ
     ・問題は ステージの make() を そのまま 使う
     ・けいけんちは 合格した ときだけ（はじめて +30・2回め いこう +10）
     ・画面の 文は TEXT に まとめる。小1・小2で あそんで いる ときは KID（小1の かん字だけ）

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
  const MIN_USABLE = 5;    // 自動の 指導を 作るのに いる 使える 問題の 数（いっしょに 2＋ひとりで 3）
  const OK_TYPES = { number: true, choice: true, divrem: true, frac: true };
  const SENSEI_ID = 'owl-brown';   // 相棒が いない 子の 先生（フクロン）

  /* ---- 画面の 文（小3〜 と 小1・小2）---- */
  const TEXT = {
    listHello: 'どこを べんきょう する？ いっしょに やろう！',
    listEmpty: 'ここの しゅぎょうは じゅんびちゅう。',
    secPreview: 'よしゅう', secPreviewNote: 'まだ 学校で ならって いない ところを 先に',
    secNow: 'いまの ステージ', secReview: 'ふくしゅう',
    rowPreDone: 'しゅぎょうずみ・地図で あそべる', rowPre: 'まだ 学校で ならって いない ところ',
    rowDoneN: 'しゅぎょう $回', rowReview: 'もう いちど たしかめる', rowNow: 'これから たたかう ところ',
    helloPre: 'まだ 学校で ならって いない ところ。さきに 見て おこう！', helloPlan: '3つの だんで すすむよ。',
    start: 'はじめる！', exLabel: 'せつめい', next: 'つぎへ', toGuided: 'いっしょに といて みよう',
    guidedLabel: 'いっしょに', practiceLabel: 'ひとりで',
    hintIs: 'ヒントは これ。', think: 'いっしょに 考えよう。', seeHint: 'ヒントを 見る', seeAns: '答えを 見る',
    ansIs: '答えは $。', nextQ: 'つぎの 問題', toPractice: 'ひとりで やって みよう',
    yourTurn: 'こんどは きみの ばん。ヒントを 見ながら やって みよう！', goOn: 'つぎ！ この ちょうしで。',
    ansLabel: 'こたえ', seeResult: 'けっかを 見る', reveal: 'つぎで とりかえそう！',
    stepOk: 'そう！ ', stepNg: 'おしい。',
    againTitle: 'もう いちど', againText: 'まちがえても だいじょうぶ。あたらしい 問題で もう 1回 いっしょに とこう。',
    againBtn: 'いっしょに とく', againSay: 'おしい！ もう いちど いっしょに やろう。こんどは できるよ！',
    doneTitle: 'しゅぎょう かんりょう！', doneSayPre: 'しゅぎょう かんりょう！ これで $ が 地図で あそべるよ！',
    doneSay: 'しゅぎょう かんりょう！ ばっちり おぼえたね！', first: 'はじめて クリア！', lvUp: 'レベルアップ！ Lv.$',
    palXp: '$ にも けいけんち', title: 'しょうごう「$」', fight: 'たたかいに いく！', toList: 'しゅぎょうばへ', toMap: 'ちずへ',
    preTag: '（よしゅう）', none: 'この ステージの しゅぎょうは じゅんびちゅう',
    needAns: 'こたえを 入れてね', needDiv: 'こたえと あまりを 入れてね', ans: 'こたえ', rem: 'あまり',
    autoIntro: 'きょうは「$」だよ。れいを 見ながら いっしょに やろう！', autoSee: 'れいを 見て みよう。', autoMore: 'もう 1つ。', autoHint: 'ヒントは「$」', exAns: 'こたえ',
    missChoice: 'ちがうよ。ヒントを もういちど 読んで、ほかの ものを 見て みよう。',
    missTen: '0 の 数（位）を もう いちど たしかめよう。', missOne: '1 だけ ちがう。かぞえ直して みよう。',
    missDefault: 'おしい。ヒントを もういちど 読んで、ゆっくり やり直そう。',
    praise: ['そう！ その ちょうし！', 'せいかい！ ばっちりだね！', 'できた！ すごい！', 'いいね！ わかって きたね！']
  };
  // 小1・小2（小1の かん字だけ）。書いて いない ものは TEXT の まま（もともと ひらがなか 小1の 字）
  const KID = Object.assign({}, TEXT, {
    rowPreDone: 'しゅぎょうずみ・ちずで あそべる', rowDoneN: 'しゅぎょう $かい',
    think: 'いっしょに かんがえよう。', seeAns: 'こたえを 見る', ansIs: 'こたえは $。', nextQ: 'つぎの もんだい',
    againText: 'まちがえても だいじょうぶ。あたらしい もんだいで もう 1かい いっしょに とこう。',
    doneSayPre: 'しゅぎょう かんりょう！ これで $ が ちずで あそべるよ！',
    missChoice: 'ちがうよ。ヒントを もういちど よんで、ほかの ものを 見て みよう。',
    missTen: '0 の かずを もう いちど たしかめよう。', missOne: '1 だけ ちがう。かぞえなおして みよう。',
    missDefault: 'おしい。ヒントを もういちど よんで、ゆっくり やりなおそう。'
  });
  function isKid() { return !!(MQ.content && MQ.content.activeWorld && (MQ.content.activeWorld().grade || 3) <= 2); }
  function text(kid) { return (kid === undefined ? isKid() : kid) ? KID : TEXT; }
  function fmt(s, v) { return String(s).replace('$', v); }

  /* ---- 使える 問題が 足りて いるか（自動の 指導を 作れるか）----
     make を 1回 ためして 数える。学期の せっていで 変わる ので キーに 入れる */
  const usableCache = {};
  function usableFor(st) {
    if (!st || st.tower || !st.available || !st.make) return false;
    const p = MQ.terms && MQ.terms.current ? MQ.terms.current() : null;
    const key = st.id + '|' + ((p && p.term) || 0) + '|' + ((p && p.units) ? Object.keys(p.units).length : 0) + '|' + ((p && p.playGrade) || '');
    if (usableCache[key] !== undefined) return usableCache[key];
    // ローマ字の ように 打つ問題と えらぶ問題が まざる ステージは 1回では ばらつく（12問中 2〜9問）ので 3回まで ためす
    let n = 0;
    for (let k = 0; k < 3 && n < MIN_USABLE; k++) {
      let qs = [];
      try { qs = st.make(12, {}) || []; } catch (e) { qs = []; }
      n += qs.filter(function (q) { return q && OK_TYPES[q.type]; }).length;
    }
    return (usableCache[key] = n >= MIN_USABLE);
  }

  /* ---- 指導の 中身 ---- */
  function autoLesson(st) {
    return { id: st.id, auto: true, intro: null, explain: null, steps: [], miss: [] };
  }
  function lesson(stageId) {
    const hand = MQ.lessons ? MQ.lessons.get(stageId) : null;
    if (hand) return hand;
    const found = MQ.content && MQ.content.findStage ? MQ.content.findStage(stageId) : null;
    if (!found || found.stage.mix || !usableFor(found.stage)) return null;
    return autoLesson(found.stage);
  }
  function has(stageId) { return !!lesson(stageId); }
  function isHand(stageId) { return !!(MQ.lessons && MQ.lessons.has(stageId)); }

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
     問題を その場で 作る ステージ（pool が ない）で、指導が 作れる ときだけ。
     （じゅんばんを とばして 先の ステージには 行かない） */
  function previewTarget(player, area) {
    if (!area || !previewOk(player)) return null;
    for (let i = 0; i < area.stages.length; i++) {
      const st = area.stages[i];
      if (st.tower || !st.available) continue;
      if (!termClosed(player, st)) continue;
      return (!st.pool && has(st.id)) ? st : null;
    }
    return null;
  }

  /* 一覧：いま あそんで いる 学年で、指導が ある（作れる）ステージ
       preview … 学期で 閉じて いて、しゅぎょうばからだけ 入れる
       now     … 開いて いて ★が まだ ない
       review  … ★が ある */
  function candidates(player) {
    const out = { preview: [], now: [], review: [] };
    if (!MQ.content) return out;
    MQ.content.subjectAreas().forEach(function (area) {
      const target = previewTarget(player, area);
      area.stages.forEach(function (st) {
        if (st.tower) return;
        const stars = (player && player.stars && player.stars[st.id]) || 0;
        const done = doneCount(player, st.id);
        const e = { area: area, stage: st, done: done, stars: stars, preview: termClosed(player, st), hand: isHand(st.id) };
        if (MQ.content.isAvailable(st)) {
          if (!MQ.content.isUnlocked(player, area, st)) return;
          if (!has(st.id)) return;
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
  function strip(s) { return String(s || '').replace(/<[^>]+>/g, ''); }

  /* ---- 「まず なにを する？」（手書きの 指導だけ）---- */
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
  function pickFrom(stage, lv, n, avoid, preferStep, les, preferHint) {
    let qs = [];
    try { qs = stage.make(Math.max(12, n * 6), { lv: lv }) || []; } catch (e) { qs = []; }
    qs = qs.filter(function (q) { return usable(q) && !avoid[q.id]; });
    if (preferStep) {
      const withStep = qs.filter(function (q) { return !!stepFor(les, q); });
      const rest = qs.filter(function (q) { return !stepFor(les, q); });
      qs = withStep.concat(rest);
    }
    if (preferHint) {
      const withHint = qs.filter(function (q) { return q.hint || q.note; });
      qs = withHint.concat(qs.filter(function (q) { return !(q.hint || q.note); }));
    }
    const out = [];
    qs.forEach(function (q) { if (out.length < n && !avoid[q.id]) { out.push(q); avoid[q.id] = true; } });
    return out;
  }
  function fill(list, n, stage, lvs, avoid, preferStep, les) {
    for (let k = 0; list.length < n && k < lvs.length * 2; k++) {
      const more = pickFrom(stage, lvs[k % lvs.length], 1, avoid, preferStep, les);
      if (more.length) list.push(more[0]);
    }
    return list;
  }

  /* 自動の 指導：「れい」を 2つ 見せる（ヒント → 問題 → こたえ → せつめい） */
  function autoExplain(stage, avoid, T) {
    const ex = pickFrom(stage, 1, 2, avoid, false, null, true);
    if (ex.length < 2) fill(ex, 2, stage, [2, 1], avoid, false, null);
    return ex.map(function (q, i) {
      const ans = MQ.battle.answerText(q);
      return {
        // 1つめ「れいを 見て みよう。」2つめ「もう 1つ。」＋ ヒントが あれば「ヒントは「…」」
        say: (i === 0 ? T.autoSee : T.autoMore) + (q.hint ? ' ' + fmt(T.autoHint, strip(q.hint)) : ''),
        ex: '<div class="dojo__ex"><div class="dojo__exq">' + q.prompt + '</div>' +
            '<p>' + T.exAns + ' → <b>' + MQ.util.esc(ans) + '</b></p>' +
            (q.note ? '<p class="dojo__exnote">' + MQ.util.esc(strip(q.note)) + '</p>' : '') + '</div>'
      };
    });
  }

  function session(stageId, player) {
    const found = MQ.content.findStage(stageId);
    const base = lesson(stageId);
    if (!found || !base) return null;
    const T = text();
    const avoid = {};
    let les = base;
    if (base.auto) {
      les = Object.assign({}, base, { intro: fmt(T.autoIntro, found.stage.name), explain: autoExplain(found.stage, avoid, T) });
      if (!les.explain.length) return null;
    }
    const hand = !base.auto;
    const guided = fill(pickFrom(found.stage, 1, 1, avoid, hand, les).concat(pickFrom(found.stage, 2, 1, avoid, hand, les)), GUIDED_N, found.stage, [2, 1, 3], avoid, hand, les);
    const practice = fill(pickFrom(found.stage, 1, 1, avoid, false, les).concat(pickFrom(found.stage, 2, 2, avoid, false, les)), PRACTICE_N, found.stage, [1, 2, 3], avoid, false, les);
    // 問題が そろわない ときは 出さない（そのまま 進むと ただで 合格に なって しまう）
    if (guided.length < GUIDED_N || practice.length < PRACTICE_N) return null;
    return {
      stageId: stageId, stage: found.stage, area: found.area, world: found.world, lesson: les, auto: !!base.auto,
      guided: guided, practice: practice,
      done: doneCount(player, stageId), preview: termClosed(player, found.stage)
    };
  }

  /* ---- はんてい・声かけ ---- */
  function judge(q, value) { return MQ.battle.isCorrect(q, value); }
  function answerText(q) { return MQ.battle.answerText(q); }

  // どの 単元にも 効く 声かけ（lesson の miss が ぜんぶ null の とき）
  function commonMiss(q, v, T) {
    T = T || text();
    if (q.type === 'choice') return T.missChoice;
    if (q.type === 'divrem' || q.type === 'frac') return null;
    const a = Number(q.answer), x = Number(v);
    if (isNaN(x)) return null;
    if (a !== 0 && (Math.abs(x - a * 10) < 1e-9 || Math.abs(x * 10 - a) < 1e-9)) return T.missTen;
    if (Math.abs(x - a) === 1) return T.missOne;
    return null;
  }
  function missText(les, q, value, T) {
    T = T || text();
    const n = nums(q);
    if (les && les.miss) {
      for (let i = 0; i < les.miss.length; i++) {
        let t = null;
        try { t = les.miss[i](q, value, n); } catch (e) { t = null; }
        if (t) return t;
      }
    }
    return commonMiss(q, value, T) || T.missDefault;
  }
  function praise(T) { return MQ.util.pick((T || text()).praise); }
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
    if (MQ.save && MQ.save.addLog) MQ.save.addLog(p, 'しゅぎょうば：' + (found ? found.stage.name : stageId) + (first ? '　はじめて クリア' : '　クリア'));
    const titles = MQ.hero.checkTitles ? MQ.hero.checkTitles(p) : [];
    return { xp: xp, first: first, levelUp: after > before, level: after, pal: pal, titles: titles, done: r.done };
  }

  return {
    lesson: lesson, has: has, isHand: isHand, usableFor: usableFor, rec: rec, doneCount: doneCount,
    previewOk: previewOk, previewOpen: previewOpen, previewTarget: previewTarget, termClosed: termClosed,
    candidates: candidates, count: count,
    session: session, stepFor: stepFor, nums: nums, autoExplain: autoExplain,
    judge: judge, answerText: answerText, missText: missText, commonMiss: commonMiss, praise: praise, passed: passed,
    sensei: sensei, complete: complete, text: text, fmt: fmt, isKid: isKid, TEXT: TEXT, KID: KID,
    GUIDED_N: GUIDED_N, PRACTICE_N: PRACTICE_N, PASS_MISS: PASS_MISS, XP_FIRST: XP_FIRST, XP_AGAIN: XP_AGAIN, SENSEI_ID: SENSEI_ID, MIN_USABLE: MIN_USABLE
  };
})();
