/* ---------------------------------------------------------
   読解（ものがたり・せつめい文を 読む）の しくみ（v14.27）

   v14.13 の 小3「ものがたりを 読む」（dokkai3.js）の しくみを どの 学年でも つかえる ように 切り出した。
   ユーザー 2026-09-24「読解力の 問題も 全学年で 実装したい」→ 小1・小2 から、高学年は 説明文も。

     MQ.dokkaiEngine.create({ grade, unit, stories, saveKey })
       → { stories, unit, titleOf, deal, ensure, peek, left, reset, fullOf, make, pool }
       （dokkai3.js が 出して いた ものと 同じ 形。world3.js の ステージ・harness・smoke は これを 見る）

   考え方（v14.13 と 同じ）
     文章を 一気に 見せない。ザコを 1体 たおすごとに 話が 1〜2文 進み、そのつど 小さく 意味を たしかめる。
     場面 1〜4（lv1）… 1文／5〜8（lv2）… 2文／9〜12（lv3）… 2〜3文／ボス … お話 ぜんぶ（まきもの）。
     お話は トランプ方式（v14.14）＝山（p[saveKey].bag）から 1本ずつ・使い切ったら シャッフル・同じ 話は 2回 つづかない。
     山を へらすのは ザコの 1回だけ（make(n, { boss: false }））。たからばこ・ボス・しゅぎょうばは peek()。

   お話の 書きかた（各 dokkaiN.js）
     { id, kind, title, scenes: [{ t, text, choices: [正解, …], note, hint }] × 12, chest: [...], boss: [...] }
     学年ごとの かん字の きまりは その ファイルの 頭に 書く（smoke が 見る）。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.dokkaiEngine = (function () {
  'use strict';

  /* 場面の 番号 → むずかしさ（core の 4/4/4 の ならびに 乗せる） */
  function lvOf(i) { return i < 4 ? 1 : (i < 8 ? 2 : 3); }

  function create(cfg) {
    const STORIES = cfg.stories;
    const UNIT = cfg.unit;
    const KEY = cfg.saveKey || ('dokkai' + cfg.grade);
    let cur = null;

    function shuffled() { return MQ.util.shuffle(STORIES.map(function (s) { return s.id; })); }
    function byId(id) { for (let i = 0; i < STORIES.length; i++) if (STORIES[i].id === id) return STORIES[i]; return null; }
    function player(pl) { return pl || (MQ.save && MQ.save.current ? MQ.save.current() : null); }

    /* つぎの 1本を 配る（山を へらす） */
    function deal(pl) {
      const p = player(pl);
      if (!p) return STORIES[Math.floor(Math.random() * STORIES.length)];   // セーブが ない とき（テスト）
      const d = ensure(p);
      if (!d.bag.length) {
        d.bag = shuffled();
        if (d.bag.length > 1 && d.bag[0] === d.last) { const t = d.bag[0]; d.bag[0] = d.bag[1]; d.bag[1] = t; }
      }
      const id = d.bag.shift();
      d.last = id;
      if (MQ.save && MQ.save.update && MQ.save.current && MQ.save.current() === p) MQ.save.update(function () {});
      return byId(id) || STORIES[0];
    }
    /* セーブの 形を そろえる（古い セーブ・新しい 子）。知らない id は すてる */
    function ensure(p) {
      if (!p[KEY] || typeof p[KEY] !== 'object') p[KEY] = { bag: shuffled(), last: null };
      const d = p[KEY];
      if (!Array.isArray(d.bag)) d.bag = shuffled();
      d.bag = d.bag.filter(function (id) { return !!byId(id); });
      if (typeof d.last !== 'string') d.last = null;
      return d;
    }
    function peek() { return cur || STORIES[Math.floor(Math.random() * STORIES.length)]; }

    function toQ(story, src, key, lv, storyText) {
      return {
        type: 'choice', unit: UNIT,
        id: (cfg.idPrefix || ('dokkai' + cfg.grade)) + ':' + story.id + ':' + key,   // 小3は むかしの まま 'dokkai:'（セーブの 記ろくと 合わせる）
        story: storyText || '', storyTitle: story.title,
        text: src.text, prompt: MQ.util.esc(src.text),
        choices: src.choices.slice(), answer: 0,
        hint: src.hint || '', note: src.note || '', lv: lv
      };
    }
    function fullText(story) { return story.scenes.map(function (s) { return s.t; }).join(''); }
    /* n 場面 出す。n が 12 より 少ない ときは 場面を まとめて、お話の さいごまで かならず とどく */
    function scenesFor(story, n) {
      const all = story.scenes;
      const want = Math.max(1, Math.min(n, all.length));
      if (want === all.length) return all.map(function (s, i) { return { s: s, t: s.t, i: i }; });
      const out = [];
      let at = 0;
      for (let k = 0; k < want; k++) {
        const end = Math.round(all.length * (k + 1) / want);
        let t = '';
        for (let j = at; j < end; j++) t += all[j].t;
        const last = Math.max(at, end - 1);
        out.push({ s: all[last], t: t, i: last });
        at = end;
      }
      return out;
    }

    return {
      grade: cfg.grade, stories: STORIES, unit: UNIT, saveKey: KEY,
      titleOf: function () { return cur ? cur.title : ''; },
      deal: deal, ensure: ensure, peek: peek,
      left: function (pl) { const p = player(pl); return p ? ensure(p).bag.length : 0; },
      reset: function () { cur = null; },
      fullOf: function () { return cur ? fullText(cur) : ''; },
      make: function (n, opts) {
        opts = opts || {};
        // たからばこ：お話に 出て きた ことばの 意味
        if (!opts.boss && opts.lv === 2 && n === 1) {
          const st = cur || (cur = peek());
          const list = st.chest || [];
          if (list.length) {
            const k = Math.floor(Math.random() * list.length);
            return [toQ(st, list[k], 'c' + k, 2, list[k].t || '')];
          }
        }
        // しゅぎょうば（boss が わたされない）：同じ お話を つかう
        if (opts.lv && !('boss' in opts)) {
          const st = cur || (cur = peek());
          return scenesFor(st, Math.min(n, st.scenes.length)).map(function (o, k) { return toQ(st, o.s, 's' + o.i, lvOf(Math.min(k, 11)), o.t); });
        }
        if (opts.boss) {
          const story = cur || (cur = peek());
          const list = story.boss;
          const src = list[Math.floor(Math.random() * list.length)];
          const q = toQ(story, src, 'b' + list.indexOf(src), 3, fullText(story));
          q.storyFull = true;
          return [q];
        }
        const story = (cur = deal());
        return scenesFor(story, n).map(function (o, k) { return toQ(story, o.s, 's' + o.i, lvOf(Math.min(k, 11)), o.t); });
      },
      pool: function () { let n = 0; STORIES.forEach(function (s) { n += s.scenes.length; }); return n; }
    };
  }
  return { create: create, lvOf: lvOf };
})();
