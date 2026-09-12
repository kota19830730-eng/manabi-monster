/* ---------------------------------------------------------
   ことばを 学年に 合わせる（v13.2）

   画面の 文は ぜんぶ「小3の 書き方」（ひらがな＋小3までの かん字・文節ごとに スペース）で
   1つだけ 書いて ある。ここが、出す ときに その子の 学年に 合わせて 直す。

     小1・小2 … かん字を ひらがなに（小1は 小1の 字も ひらがな・小2は 小1の 字まで）
     小3・小4 … その 学年までに ならう かん字
     小5・小6 … その 学年までの かん字 ＋ マンガや ゲームで 読み慣れて いる 字（魔王・冒険・攻撃 …）
                ＋ 文節の スペースを 外す ＋ 文の おわりの「よ」を 落とす（〜だよ → 〜だ）

   直すのは 辞書（js/content/kotoba.js）に ある ことばだけ。ない ことばは 1文字も さわらない。
   問題の 中身（問題文・えらぶ こたえ・ヒント・せつめい）は 辞書を 当てない（`raw`）＝
   かん字の 読みを 答える 問題で 答えが ばれたり、問題文が 変わって しまったり しない。
   スペースを 外す ことだけは 問題文にも する（小5・小6）。

   入り口は 2つ：
     ① MQ.util.h() が text / html / 子の 文字列 を 作る ときに fit() を 通す（同期）
     ② #stage の 中の 文字が 変わった ときに MutationObserver が 直す（textContent = … の 分）
   どちらも 同じ fit() なので 2回 かかっても 形は 変わらない（idempotent）。

   見る 学年は その子の 学校の 学年（p.grade）。おうちの人ページの「ことばの 表示」で
   やさしく（小2）／高学年（小6）に 上書き できる（p.textLevel）。
   おうちの人ページ（#screen-parent）は 大人の 文なので さわらない。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.text = (function () {
  const RE_HIRA = /[぀-ゟ]/;
  const RE_KANJI = /[一-鿿々]/;
  const RE_JPANY = /[぀-ヿ一-鿿々]/;
  const RE_DIGIT = /[0-9０-９]/;
  // スペースを 外す ときの 両どなり（かな・かん字・数字・英字。記号の となりは のこす）
  const RE_TIGHT = /[぀-ヿ一-鿿々ー0-9０-９A-Za-z]/;
  const RE_JPCH = /[぀-ヿ一-鿿々ー]/;

  /* ことばの あとに つづいて よい もの（助詞・よく ある 語尾）。直しは しない・つづきとして みとめる だけ */
  const PART = ['ながら', 'ばかり', 'くらい', 'ぐらい', 'だけ', 'ほど', 'まで', 'から', 'より', 'のに', 'ので', 'よね', 'かな', 'かも',
    'とか', 'など', 'ずつ', 'じゃ', 'って', 'です', 'でした', 'だった', 'だよ', 'だね', 'だぞ', 'なら', 'ならば', 'になる', 'になった',
    'になって', 'になろう', 'になれる', 'にする', 'にした', 'にして',
    'が', 'を', 'に', 'は', 'で', 'と', 'の', 'も', 'へ', 'か', 'な', 'だ', 'よ', 'ね', 'ぞ', 'ぜ', 'や'];

  // ことばの おわりが はっきり わかる 助詞（この あとなら つぎの ことばを さがして よい）
  const AFTER = ['から', 'まで', 'より', 'など', 'が', 'を', 'に', 'は', 'で', 'と', 'の', 'も', 'へ', 'か', 'よ', 'ね', 'や'];

  let built = null;
  let paused = false;
  const cache = new Map();

  function sortBucket(list) {
    list.sort(function (a, b) {
      if (b.h.length !== a.h.length) return b.h.length - a.h.length;   // 長い ことばが 先
      const ra = a.same ? 0 : a.tails && !a.s ? 1 : a.s ? 2 : 3;        // 同じ 長さ：さわらない → 送りがな あり → あってもなくても → なし
      const rb = b.same ? 0 : b.tails && !b.s ? 1 : b.s ? 2 : 3;
      return ra - rb;
    });
  }
  function sortBucketK(list) {
    list.sort(function (a, b) {
      if (b.k.length !== a.k.length) return b.k.length - a.k.length;
      const ra = a.tails && !a.s ? 0 : a.n ? 1 : a.s ? 2 : 3;
      const rb = b.tails && !b.s ? 0 : b.n ? 1 : b.s ? 2 : 3;
      return ra - rb;
    });
  }
  function splitTails(t) {
    if (!t) return null;
    const seen = {};
    return t.split('|').filter(function (x) { if (!x || seen[x]) return false; seen[x] = true; return true; })
      .sort(function (a, b) { return b.length - a.length; });
  }

  /* 辞書を 引きやすい 形に（1回だけ） */
  function build() {
    const K = MQ.kakusu;
    const rows = (MQ.kotoba && MQ.kotoba.entries) || [];
    const byH = {}, byK = {}, all = [];
    const seen = {};
    rows.forEach(function (row) {
      const h = row[0], k = row[1], min = row[2], tails = row[3], flags = row[4] || '', ut = row[5];
      if (!h || !k) return;
      const key = h + '\t' + k + '\t' + (tails || '');
      if (seen[key]) return;
      seen[key] = true;
      let need;
      if (min != null) need = min;
      else {
        need = 0;
        for (let i = 0; i < k.length; i++) {
          const c = k[i];
          if (!RE_KANJI.test(c)) continue;
          const g = K ? K.gradeOf(c) : 0;
          need = g ? Math.max(need, g) : 99;
        }
      }
      const same = h === k;
      if (same) need = 0;
      const e = {
        h: h, k: k, need: need, same: same,
        tails: splitTails(tails), ut: splitTails(ut),
        n: flags.indexOf('n') >= 0, d: flags.indexOf('d') >= 0, s: flags.indexOf('s') >= 0
      };
      all.push(e);
      (byH[h[0]] = byH[h[0]] || []).push(e);
      if (!same) (byK[k[0]] = byK[k[0]] || []).push(e);
    });
    Object.keys(byH).forEach(function (c) { sortBucket(byH[c]); });
    Object.keys(byK).forEach(function (c) { sortBucketK(byK[c]); });
    built = { byH: byH, byK: byK, all: all };
    return built;
  }
  function ensure() { return built || build(); }
  function reset() { built = null; cache.clear(); lastClassLv = 0; }

  /* ---- 学年 ---- */
  function level() {
    try {
      const p = MQ.save && MQ.save.current ? MQ.save.current() : null;
      if (!p) return 3;
      if (p.textLevel === 'easy') return 2;
      if (p.textLevel === 'high') return 6;
      const g = parseInt(p.grade, 10);
      return g >= 1 && g <= 6 ? g : 3;
    } catch (e) { return 3; }
  }
  // かん字を 出して よい 学年の 上限。小1は ひらがなだけ、小2は 小1の 字まで、小3からは その 学年まで
  function limitOf(lv) { return lv <= 2 ? lv - 1 : lv; }

  /* ---- 小さな 道具 ---- */
  function isHira(c) { return !!c && RE_HIRA.test(c); }
  function isKanji(c) { return !!c && RE_KANJI.test(c); }
  function numBefore(s, i) {
    let j = i - 1;
    while (j >= 0 && s[j] === ' ') j--;
    if (j < 0) return false;
    if (RE_DIGIT.test(s[j])) return true;
    return s.slice(Math.max(0, j - 1), j + 1) === 'なん' || s[j] === '何' || s[j] === '数';
  }
  function matchTail(s, j, tails) {
    for (let t = 0; t < tails.length; t++) {
      if (s.startsWith(tails[t], j)) return tails[t];
    }
    return null;
  }

  /* かん字 → ひらがな（その 学年で まだ ならわない ことば） */
  function down(s, lim) {
    const B = ensure();
    let out = '';
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      const list = B.byK[c];
      let hit = null;
      if (list) {
        for (let n = 0; n < list.length; n++) {
          const e = list[n];
          if (e.need <= lim) continue;                 // この 学年なら かん字の まま
          if (!s.startsWith(e.k, i)) continue;
          if (e.n && !numBefore(s, i)) continue;
          let tail = '';
          if (e.tails) {
            const t = matchTail(s, i + e.k.length, e.tails);
            if (t == null) { if (!e.s) continue; } else tail = t;
          }
          hit = { len: e.k.length + tail.length, out: e.h + tail };
          break;
        }
      }
      if (hit) { out += hit.out; i += hit.len; }
      else { out += c; i++; }
    }
    return out;
  }

  /* ことばの あとの つづきが「助詞の ならび」か「べつの ことば」か「おわり」なら OK */
  function restOk(s, j, lim, memo) {
    if (j >= s.length) return true;
    const c = s[j];
    if (!isHira(c)) return true;
    if (memo[j] !== undefined) return memo[j];
    memo[j] = false;   // 同じ 場所を ぐるぐる しない
    let ok = false;
    for (let p = 0; p < PART.length && !ok; p++) {
      if (s.startsWith(PART[p], j)) ok = restOk(s, j + PART[p].length, lim, memo);
    }
    if (!ok) {
      const list = ensure().byH[c];
      if (list) {
        for (let n = 0; n < list.length && !ok; n++) {
          const e = list[n];
          if (!s.startsWith(e.h, j)) continue;
          if (!e.same && (e.d || e.need > lim)) continue;
          if (e.n && !numBefore(s, j)) continue;
          let tail = '';
          if (!e.same && e.tails) {
            const t = matchTail(s, j + e.h.length, e.tails);
            if (t == null) { if (!e.s) continue; } else tail = t;
          }
          ok = restOk(s, j + e.h.length + tail.length, lim, memo);
        }
      }
    }
    memo[j] = ok;
    return ok;
  }

  /* ひらがな → かん字（その 学年で ならって いる ことば） */
  function up(s, lim) {
    const B = ensure();
    let out = '';
    let i = 0;
    const allowed = {};
    const memo = {};
    while (i < s.length) {
      const c = s[i];
      const canStart = i === 0 || (!isHira(s[i - 1]) && !isKanji(s[i - 1])) || allowed[i];
      let hit = null;
      if (canStart) {
        const list = B.byH[c];
        if (list) {
          for (let n = 0; n < list.length; n++) {
            const e = list[n];
            if (!s.startsWith(e.h, i)) continue;
            if (e.same) { hit = { len: e.h.length, out: e.h }; break; }
            if (e.d) continue;
            if (e.n && !numBefore(s, i)) continue;
            if (e.need > lim) {
              /* v13.6：長い ことばが この 学年では まだ かん字に できない ときは、中の 短い ことばも かん字に しない
                 （「ぎんがの」→「銀がの」・「ほしい」→「星い」に しない）。ことばは 長い じゅんに ならんで いる */
              const tl0 = e.ut || e.tails;
              if (tl0 && matchTail(s, i + e.h.length, tl0) == null && !e.s) continue;
              hit = { len: e.h.length, out: e.h };
              break;
            }
            const j = i + e.h.length;
            let tail = '';
            const tl = e.ut || e.tails;
            if (tl) {
              const t = matchTail(s, j, tl);
              if (t == null) { if (!e.s) continue; } else tail = t;
            }
            if (!restOk(s, j + tail.length, lim, memo)) continue;
            hit = { len: e.h.length + tail.length, out: e.k + tail };
            break;
          }
        }
      }
      if (hit) {
        out += hit.out;
        i += hit.len;
        // つづく 助詞（が・を・の …）の あとから また ことばを さがして よい（すぐ あとは 送りがなや つづきの ことが 多い）
        const q = [i];
        while (q.length) {
          const p = q.pop();
          for (let n = 0; n < AFTER.length; n++) {
            if (!s.startsWith(AFTER[n], p)) continue;
            const e2 = p + AFTER[n].length;
            if (allowed[e2]) continue;
            allowed[e2] = true;
            q.push(e2);
          }
        }
      } else { out += c; i++; }
    }
    return out;
  }

  /* 文節の スペースを 外す（小5・小6）。数字・英字の となりは かなと つながる ときだけ */
  function unspace(s) {
    let out = '';
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === ' ' && i > 0 && i < s.length - 1) {
        const a = s[i - 1], b = s[i + 1];
        // 数の ついた かん字（1回・2問）の あとの かん字とは くっつけない（1回答えよう と 読めない）
        const counter = isKanji(a) && isKanji(b) && i >= 2 && RE_DIGIT.test(s[i - 2]);
        if (RE_TIGHT.test(a) && RE_TIGHT.test(b) && (RE_JPCH.test(a) || RE_JPCH.test(b)) && !counter) continue;
      }
      out += c;
    }
    return out;
  }

  /* 文の おわりの「よ」を 落とす（〜だよ → 〜だ・〜なったよ → 〜なった）。小5・小6 */
  function soften(s) {
    return s.replace(/([だるうくすつぬぶむぐずいた])よ(?=[！!。」』）)]|\s|$)/g, '$1');
  }

  // 小5・小6（スペースなし）の ときは body に is-nospace（CSS で ことばの 途中でも 折り返す）
  let lastClassLv = 0;
  function syncClass(lv) {
    if (lv === lastClassLv || typeof document === 'undefined' || !document.body) return;
    lastClassLv = lv;
    document.body.classList.toggle('is-nospace', lv >= 5);
  }

  /* 1つの 文字列を 学年に 合わせる。opts.raw ＝ 問題の 中身（スペースだけ）／opts.level ＝ テスト用 */
  function fit(s, opts) {
    if (s == null) return s;
    s = String(s);
    if (!RE_JPANY.test(s)) return s;
    if (paused && !(opts && opts.level)) return s;   // おうちの人ページを 作って いる あいだ
    const lv = (opts && opts.level) || level();
    const raw = !!(opts && opts.raw);
    const key = (raw ? 'r' : 'f') + lv + '\t' + s;
    const hitC = cache.get(key);
    if (hitC !== undefined) return hitC;
    syncClass(lv);
    const lim = limitOf(lv);
    let out = s;
    if (!raw) {
      out = down(out, lim);
      out = down(out, lim);       // 見た目 → みため の ように 2だんかい ある ことば
      out = up(out, lim);
      out = up(out, lim);         // わりざん → わり算 → 割り算
      if (lv >= 5) out = soften(out);
    }
    if (lv >= 5) out = unspace(out);
    if (cache.size > 6000) cache.clear();
    cache.set(key, out);
    return out;
  }

  /* HTML の 文字列：タグの 中は さわらない。<rt>（ふりがな）の 中も さわらない */
  function fitHtml(html, opts) {
    if (html == null) return html;
    html = String(html);
    if (html.indexOf('<') < 0) return fit(html, opts);
    const parts = html.split(/(<[^>]*>)/);
    let skip = 0;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (!p) continue;
      if (p[0] === '<') {
        const m = /^<(\/?)(rt|rp|script|style|textarea)\b/i.exec(p);
        if (m) skip += m[1] ? -1 : 1;
        continue;
      }
      if (skip > 0) continue;
      parts[i] = fit(p, opts);
    }
    return parts.join('');
  }

  /* ---- 画面の 中で あとから 変わった 文字を 直す ---- */
  function modeOf(el) {
    let e = el;
    while (e && e.nodeType === 1) {
      if (e.id === 'screen-parent' || e.hasAttribute('data-noconv')) return 'skip';
      if (e.hasAttribute('data-raw')) return 'raw';
      if (e.id === 'toast') {
        const pp = document.getElementById('screen-parent');
        if (pp && pp.classList.contains('is-active')) return 'skip';
      }
      e = e.parentNode;
    }
    return 'full';
  }
  function fixNode(t) {
    const data = t.data;
    if (!data || !RE_JPANY.test(data)) return;
    if (t.__mqfit === data) return;
    if (paused) return;
    const p = t.parentNode;
    if (!p || p.nodeType !== 1) return;
    const tag = p.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'RT' || tag === 'RP') return;
    const mode = modeOf(p);
    if (mode === 'skip') return;
    const out = fit(data, { raw: mode === 'raw' });
    if (out !== data) t.data = out;
    t.__mqfit = out;
  }
  function scan(node) {
    if (node.nodeType === 3) { fixNode(node); return; }
    if (node.nodeType !== 1) return;
    const w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
    let t;
    while ((t = w.nextNode())) fixNode(t);
  }
  let observer = null;
  function watch(root) {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return false;
    if (observer) return true;
    root = root || document.getElementById('stage') || document.body;
    if (!root) return false;
    observer = new MutationObserver(function (recs) {
      for (let i = 0; i < recs.length; i++) {
        const r = recs[i];
        if (r.type === 'characterData') fixNode(r.target);
        else for (let n = 0; n < r.addedNodes.length; n++) scan(r.addedNodes[n]);
      }
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    scan(root);
    return true;
  }
  /* 学年や せっていが 変わった ときに、いま 出て いる 画面を 直す */
  function refresh() {
    cache.clear();
    lastClassLv = 0;
    if (typeof document === 'undefined') return;
    const root = document.getElementById('stage');
    if (!root) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let t;
    while ((t = w.nextNode())) { t.__mqfit = null; fixNode(t); }
  }
  function pause(on) { paused = !!on; }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { watch(); });
    else watch();
  }

  return {
    fit: fit, fitHtml: fitHtml, level: level, limitOf: limitOf, unspace: unspace, soften: soften,
    watch: watch, refresh: refresh, pause: pause, reset: reset,
    entries: function () { return ensure().all; },
    _down: down, _up: up
  };
})();
