/* ---------------------------------------------------------
   小1 さんすう（日本文教出版『小学算数 1年』の じゅん・v2.2）

   ステージ（名前も 問題文も ぜんぶ ひらがな。小1が じぶんで 読める ように）
     1 10までの かず          … ●を かぞえる／つぎの かず／どちらが おおい
     2 なんばんめ             … ○○●○ の ●は ひだりから なんばんめ
     3 いくつと いくつ        … 7は 3と □／□と 4で 10
     4 たしざん（1）          … 10までの たしざん・「あわせて」「ふえると」
     5 ひきざん（1）          … 10までの ひきざん・「のこりは」「ちがいは」
     6 20までの かず          … 10と 5で／14は 10と □／12+3・15−3
     7 3つの かずの けいさん  … 3+2+4／9−3−2／8+2+5
     8 なんじ なんじはん      … とけいの 絵（CSS で 描く）を 見て なんじ／なんじはん
     9 たしざん（2）          … くりあがり（9+4）
    10 ひきざん（2）          … くりさがり（13−8）
    11 100までの かず         … 10が 4こと 1が 3こ／つぎの かず／40+20・24+3
    12 なんじ なんぷん        … とけいの 絵を 見て なんぷん／なんじ なんぷん（5ふんとび → 1ぷん きざみ）

   作りかたは sansu3.js と 同じ。easy / normal / hard / boss の 4グループに
   「問題を 1つ かえす かんすう」を ならべる。たたかいでは easy → normal → hard。
   えらぶ問題は 2つだけの ことも ある（「あ」か「い」か）。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.sansu1 = (function () {
  const U = MQ.util;

  /* ---- 問題を 作る 小さな 道具 ---- */
  function span(s) { return '<span class="num">' + s + '</span>'; }
  function expr(a, sign, b) { return span(a + ' ' + sign + ' ' + b); }
  function box(text) { return span(text) + '<br>□に はいる かずは？'; }

  function num(unit, prompt, answer, extra) {
    return Object.assign({ type: 'number', unit: unit, prompt: prompt, answer: answer, scratch: false }, extra || {});
  }
  function choice(unit, prompt, choices, extra) {
    return Object.assign({ type: 'choice', unit: unit, prompt: prompt, choices: choices, answer: 0 }, extra || {});
  }

  // 正解 1つ ＋ まちがい 3つ（かぶらないように）
  function withDistractors(correct, candidates, format) {
    const seen = {};
    seen[String(correct)] = true;
    const out = [format ? format(correct) : String(correct)];
    U.shuffle(candidates).forEach(function (c) {
      if (out.length >= 4) return;
      const k = String(c);
      if (seen[k]) return;
      seen[k] = true;
      out.push(format ? format(c) : String(c));
    });
    return out;
  }

  // ●を n こ ならべる（5こずつ すこし あける）
  function dots(n, mark) {
    const m = mark || '●';
    let s = '';
    for (let i = 0; i < n; i++) { s += m; if ((i + 1) % 5 === 0 && i + 1 < n) s += ' '; }
    return '<span class="num dots">' + s + '</span>';
  }
  // ○を n こ ならべて、k ばんめだけ ●
  function row(n, k) {
    let s = '';
    for (let i = 1; i <= n; i++) s += (i === k ? '●' : '○');
    return '<span class="num dots">' + s + '</span>';
  }
  function other(lo, hi, not) {
    let v = U.randInt(lo, hi);
    while (v === not) v = U.randInt(lo, hi);
    return v;
  }

  /* =======================================================
     ステージ1 10までの かず
     ======================================================= */
  const stage1 = {
    easy: [
      function count() {
        const n = U.randInt(1, 10);
        return num('かぞえる', 'いくつ あるかな？<br>' + dots(n), n, {
          hint: 'ゆびで おさえながら、1、2、3… と かぞえよう。', note: n + 'こ', key: 'count:' + n
        });
      },
      function next() {
        const n = U.randInt(1, 9);
        return num('かずの ならび', span(n + ' の つぎの かずは？'), n + 1, {
          hint: '1、2、3… と じゅんに かぞえて、' + n + ' の つぎを いおう。', note: n + ' の つぎは ' + (n + 1)
        });
      },
      function blackOnly() {
        const a = U.randInt(1, 6), b = U.randInt(1, 4);
        return num('かぞえる', '●は いくつ あるかな？<br><span class="num dots">' + '●'.repeat(a) + '○'.repeat(b) + '</span>', a, {
          hint: '○は かぞえないよ。●だけ かぞえよう。', note: '●は ' + a + 'こ', key: 'black:' + a + ':' + b
        });
      }
    ],
    normal: [
      function bigger() {
        const n = U.randInt(1, 9);
        return num('1 おおきい かず', n + ' より 1 おおきい かずは？', n + 1, {
          hint: n + ' の つぎの かずだよ。', note: n + ' より 1 おおきい かずは ' + (n + 1)
        });
      },
      function smaller() {
        const n = U.randInt(2, 10);
        return num('1 ちいさい かず', n + ' より 1 ちいさい かずは？', n - 1, {
          hint: n + ' の 1つ まえの かずだよ。', note: n + ' より 1 ちいさい かずは ' + (n - 1)
        });
      },
      function compare() {
        const a = U.randInt(1, 10), b = other(1, 10, a);
        const big = a > b ? 'あ' : 'い';
        return choice('どちらが おおい', 'どちらが おおい？<br>あ ' + dots(a) + '<br>い ' + dots(b), [big, big === 'あ' ? 'い' : 'あ'], {
          hint: 'それぞれ かぞえて、おおきい かずの ほうを えらぼう。',
          note: 'あは ' + a + 'こ、いは ' + b + 'こ。' + big + ' の ほうが おおい', key: 'cmp:' + a + ':' + b
        });
      }
    ],
    hard: [
      function between() {
        const n = U.randInt(1, 8);
        return num('かずの ならび', box(n + '、□、' + (n + 2)), n + 1, {
          hint: n + ' の つぎの かずが はいるよ。', note: n + '、' + (n + 1) + '、' + (n + 2)
        });
      },
      function countDown() {
        const n = U.randInt(3, 10);
        return num('かずの ならび', box(n + '、' + (n - 1) + '、□'), n - 2, {
          hint: 'かずが 1つずつ ちいさく なっているよ。', note: n + '、' + (n - 1) + '、' + (n - 2)
        });
      },
      function twoRows() {
        const n = U.randInt(6, 10);
        return num('かぞえる', 'ぜんぶで いくつ あるかな？<br>' + dots(5) + '<br>' + dots(n - 5), n, {
          hint: 'うえは 5こ。5、6、7… と つづけて かぞえよう。', note: '5 と ' + (n - 5) + ' で ' + n, key: 'two:' + n
        });
      }
    ],
    boss: [
      function bossCompare() {
        const a = U.randInt(5, 10), b = other(5, 10, a);
        const big = a > b ? 'あ' : 'い';
        return choice('どちらが おおい', 'どちらが おおい？<br>あ ' + dots(a) + '<br>い ' + dots(b), [big, big === 'あ' ? 'い' : 'あ'], {
          hint: '5こずつ まとまっているよ。5、6、7… と かぞえよう。',
          note: 'あは ' + a + 'こ、いは ' + b + 'こ', key: 'bcmp:' + a + ':' + b
        });
      },
      function bossBetween() {
        const n = U.randInt(2, 9);
        return num('かずの ならび', box((n - 1) + '、□、' + (n + 1)), n, {
          hint: (n - 1) + ' の つぎの かずだよ。', note: (n - 1) + '、' + n + '、' + (n + 1)
        });
      },
      function bossBigger2() {
        const n = U.randInt(1, 8);
        return num('おおきい かず', n + ' より 2 おおきい かずは？', n + 2, {
          hint: n + ' の つぎの つぎだよ。', note: n + '、' + (n + 1) + '、' + (n + 2)
        });
      }
    ]
  };

  /* =======================================================
     ステージ2 なんばんめ
     ======================================================= */
  function fromLeft(lo, hi) {
    const n = U.randInt(lo, hi), k = U.randInt(1, n);
    return num('なんばんめ', '●は ひだりから なんばんめ？<br>' + row(n, k), k, {
      hint: 'ひだりから 1、2、3… と かぞえよう。', note: 'ひだりから ' + k + 'ばんめ', key: 'L:' + n + ':' + k
    });
  }
  function fromRight(lo, hi) {
    const n = U.randInt(lo, hi), k = U.randInt(1, n);
    return num('なんばんめ', '●は みぎから なんばんめ？<br>' + row(n, k), n - k + 1, {
      hint: 'みぎの はしから 1、2、3… と かぞえよう。', note: 'みぎから ' + (n - k + 1) + 'ばんめ', key: 'R:' + n + ':' + k
    });
  }
  const stage2 = {
    easy: [
      function left() { return fromLeft(4, 7); },
      function right() { return fromRight(4, 6); }
    ],
    normal: [
      function leftLong() { return fromLeft(7, 10); },
      function rightLong() { return fromRight(6, 9); },
      function whichOne() {
        const n = U.randInt(5, 8), k = U.randInt(1, n), ask = U.randInt(1, n);
        const ans = ask === k ? '●' : '○';
        return choice('なんばんめ', 'ひだりから ' + ask + 'ばんめは どっち？<br>' + row(n, k), [ans, ans === '●' ? '○' : '●'], {
          hint: 'ひだりから ' + ask + 'こめを ゆびで おさえよう。', note: 'ひだりから ' + ask + 'ばんめは ' + ans, key: 'W:' + n + ':' + k + ':' + ask
        });
      }
    ],
    hard: [
      function total() {
        const n = U.randInt(6, 10), k = U.randInt(1, n);
        return num('なんこ', 'ぜんぶで なんこ ならんでいる？<br>' + row(n, k), n, {
          hint: '○も ●も ぜんぶ かぞえよう。', note: 'ぜんぶで ' + n + 'こ', key: 'T:' + n + ':' + k
        });
      },
      function leftCount() {
        const n = U.randInt(5, 9), k = U.randInt(2, n);
        return num('なんこ', '●より ひだりに ○は なんこ？<br>' + row(n, k), k - 1, {
          hint: '●の ひだりがわだけ かぞえよう。', note: '●の ひだりに ' + (k - 1) + 'こ', key: 'LC:' + n + ':' + k
        });
      },
      function rightCount() {
        const n = U.randInt(5, 9), k = U.randInt(1, n - 1);
        return num('なんこ', '●より みぎに ○は なんこ？<br>' + row(n, k), n - k, {
          hint: '●の みぎがわだけ かぞえよう。', note: '●の みぎに ' + (n - k) + 'こ', key: 'RC:' + n + ':' + k
        });
      }
    ],
    boss: [
      function bossRight() { return fromRight(8, 10); },
      function bossLeftCount() {
        const n = U.randInt(7, 10), k = U.randInt(3, n);
        return num('なんこ', '●より ひだりに ○は なんこ？<br>' + row(n, k), k - 1, {
          hint: '●の ひだりがわだけ かぞえよう。', note: '●の ひだりに ' + (k - 1) + 'こ', key: 'BLC:' + n + ':' + k
        });
      },
      function bossBoth() {
        const n = U.randInt(6, 10), k = U.randInt(1, n);
        return num('なんばんめ', n + 'にんが ならんでいます。ひだりから ' + k + 'ばんめの ひとは、みぎから なんばんめ？', n - k + 1, {
          hint: '○を ' + n + 'こ かいて、ひだりから ' + k + 'ばんめに しるしを つけて、みぎから かぞえよう。',
          note: 'みぎから ' + (n - k + 1) + 'ばんめ', key: 'B:' + n + ':' + k
        });
      }
    ]
  };

  /* =======================================================
     ステージ3 いくつと いくつ
     ======================================================= */
  function splitQ(total, hideFirst) {
    const a = U.randInt(1, total - 1), b = total - a;
    const shown = hideFirst ? '□ と ' + b : a + ' と □';
    return num('いくつと いくつ', box(total + ' は ' + shown), hideFirst ? a : b, {
      hint: (hideFirst ? b : a) + ' に いくつ たすと ' + total + ' に なるかな。ゆびで かぞえてみよう。',
      note: total + ' は ' + a + ' と ' + b, key: 'split:' + total + ':' + a + ':' + (hideFirst ? 1 : 0)
    });
  }
  function pair10() {
    const a = U.randInt(1, 9);
    const ok = a + ' と ' + (10 - a);
    const cands = [];
    [1, -1, 2, -2].forEach(function (d) {
      const b = 10 - a + d;
      if (b >= 1 && b <= 10) cands.push(a + ' と ' + b);
    });
    return choice('10 に なる かず', 'あわせて 10 に なるのは どれ？', withDistractors(ok, cands), {
      hint: a + ' に いくつ たすと 10 に なるかな。ゆびを つかおう。', note: a + ' と ' + (10 - a) + ' で 10', key: 'pair:' + a
    });
  }
  const stage3 = {
    easy: [
      function s5() { return splitQ(U.randInt(4, 6), false); },
      function s7() { return splitQ(U.randInt(6, 7), false); }
    ],
    normal: [
      function s9() { return splitQ(U.randInt(7, 9), false); },
      function s9r() { return splitQ(U.randInt(6, 9), true); },
      function make10() {
        const a = U.randInt(1, 9);
        return num('10 に なる かず', a + ' と いくつで 10？', 10 - a, {
          hint: 'ゆびを 10ぽん ひらいて、' + a + 'ほん おって みよう。のこりは？', note: a + ' と ' + (10 - a) + ' で 10'
        });
      }
    ],
    hard: [
      function s10() { return splitQ(10, false); },
      function s10r() { return splitQ(10, true); },
      pair10
    ],
    boss: [
      function b10() { return splitQ(10, Math.random() < 0.5); },
      function b9r() { return splitQ(U.randInt(8, 9), true); },
      pair10
    ]
  };

  /* =======================================================
     ステージ4 たしざん（1）・ステージ9 たしざん（2）
     ======================================================= */
  function addQ(unit, a, b, extra) {
    return num(unit, expr(a, '+', b), a + b, Object.assign({
      hint: a + ' から ' + b + ' つづけて かぞえよう。' + (a + 1) + '、' + (a + 2) + '…',
      note: a + ' + ' + b + ' = ' + (a + b)
    }, extra || {}));
  }
  function carryQ(a, b) {
    // くりあがり：a に たして 10 に する
    const up = 10 - a;
    return addQ('くりあがりの たしざん', a, b, {
      scratch: true,
      hint: a + ' に ' + up + ' を たして 10。' + b + ' を ' + up + ' と ' + (b - up) + ' に わけよう。10 と ' + (b - up) + ' で？',
      note: a + ' + ' + b + '：' + a + ' + ' + up + ' = 10、10 + ' + (b - up) + ' = ' + (a + b)
    });
  }
  function awaseteQ(maxA, maxSum) {
    const a = U.randInt(1, maxA), b = U.randInt(1, Math.min(9, maxSum - a));
    return num('ぶんしょうの もんだい', 'あかい はなが ' + a + 'ほん、しろい はなが ' + b + 'ほん あります。あわせて なんぼん？', a + b, {
      hint: '「あわせて」は たしざん。' + a + ' + ' + b + ' だよ。', note: a + ' + ' + b + ' = ' + (a + b) + '（ほん）', key: 'aw:' + a + ':' + b
    });
  }
  function fueruQ(maxA, maxSum) {
    const a = U.randInt(1, maxA), b = U.randInt(1, Math.min(9, maxSum - a));
    return num('ぶんしょうの もんだい', 'こうえんに こどもが ' + a + 'にん います。' + b + 'にん きました。みんなで なんにん？', a + b, {
      hint: '「きました」は ふえる。たしざんだよ。' + a + ' + ' + b + '。', note: a + ' + ' + b + ' = ' + (a + b) + '（にん）', key: 'fu:' + a + ':' + b
    });
  }
  function missingAdd(sumLo, sumHi, hideFirst) {
    const c = U.randInt(sumLo, sumHi), a = U.randInt(1, Math.min(9, c - 1)), b = c - a;
    const shown = hideFirst ? '□ + ' + b + ' = ' + c : a + ' + □ = ' + c;
    return num('□の たしざん', box(shown), hideFirst ? a : b, {
      hint: (hideFirst ? b : a) + ' に いくつ たすと ' + c + ' に なるかな。', note: a + ' + ' + b + ' = ' + c, key: 'ma:' + a + ':' + b + ':' + (hideFirst ? 1 : 0)
    });
  }
  function sumItems(count, maxA, maxSum) {
    const used = {}, items = [];
    let guard = 0;
    while (items.length < count && guard++ < 80) {
      const a = U.randInt(1, maxA), b = U.randInt(1, maxA);
      if (a + b > maxSum || used[a + b]) continue;
      used[a + b] = true;
      items.push({ text: a + ' + ' + b, v: a + b });
    }
    return items;
  }
  function biggestSum(maxA, maxSum) {
    const items = sumItems(4, maxA, maxSum);
    if (items.length < 2) return addQ('たしざん', 3, 4);
    items.sort(function (x, y) { return y.v - x.v; });
    return choice('たしざん', 'こたえが いちばん おおきいのは どれ？', items.map(function (it) { return it.text; }), {
      hint: 'ひとつずつ けいさんして、こたえを くらべよう。',
      note: items[0].text + ' = ' + items[0].v + ' が いちばん おおきい',
      key: 'big:' + items.map(function (it) { return it.text; }).join(',')
    });
  }
  const stage4 = {
    easy: [
      function small() { const a = U.randInt(1, 5), b = U.randInt(1, 5); return addQ('たしざん', a, b); },
      function plusOne() { const a = U.randInt(1, 9); return addQ('たしざん', a, 1); }
    ],
    normal: [
      function any() { const a = U.randInt(1, 9), b = U.randInt(1, 10 - a); return addQ('たしざん', a, b); },
      function zero() {
        const a = U.randInt(0, 10);
        return addQ('0 の たしざん', a, 0, { hint: '0 を たしても かずは かわらないよ。', note: a + ' + 0 = ' + a });
      },
      function awasete() { return awaseteQ(6, 10); }
    ],
    hard: [
      function fueru() { return fueruQ(6, 10); },
      function missing() { return missingAdd(5, 10, false); },
      function missingFirst() { return missingAdd(5, 10, true); }
    ],
    boss: [
      function bossWord() { return fueruQ(8, 10); },
      function bossMissing() { return missingAdd(7, 10, Math.random() < 0.5); },
      function bossBig() { return biggestSum(9, 10); }
    ]
  };

  const stage9 = {
    easy: [
      function nine() { return carryQ(9, U.randInt(2, 9)); },
      function eight() { return carryQ(8, U.randInt(3, 9)); }
    ],
    normal: [
      function seven() { return carryQ(7, U.randInt(4, 9)); },
      function six() { return carryQ(6, U.randInt(5, 9)); },
      function anyCarry() { const a = U.randInt(5, 9); return carryQ(a, U.randInt(11 - a, 9)); }
    ],
    hard: [
      function smallFirst() { const a = U.randInt(2, 5); return carryQ(a, U.randInt(11 - a, 9)); },
      function awasete() { return awaseteQ(9, 18); },
      function fueru() { return fueruQ(9, 18); }
    ],
    boss: [
      function bossWord() { return fueruQ(9, 18); },
      function bossMissing() { return missingAdd(11, 18, Math.random() < 0.5); },
      function bossBig() { return biggestSum(9, 18); }
    ]
  };

  /* =======================================================
     ステージ5 ひきざん（1）・ステージ10 ひきざん（2）
     ======================================================= */
  function subQ(unit, a, b, extra) {
    return num(unit, expr(a, '−', b), a - b, Object.assign({
      hint: a + ' から ' + b + ' もどして かぞえよう。' + (a - 1) + '、' + (a - 2) + '…',
      note: a + ' − ' + b + ' = ' + (a - b)
    }, extra || {}));
  }
  function borrowQ(a, b) {
    // くりさがり：10 から ひいて のこりを たす
    const ones = a - 10;
    return subQ('くりさがりの ひきざん', a, b, {
      scratch: true,
      hint: a + ' を 10 と ' + ones + ' に わけよう。10 − ' + b + ' = ' + (10 - b) + '。' + (10 - b) + ' と ' + ones + ' で？',
      note: a + ' − ' + b + '：10 − ' + b + ' = ' + (10 - b) + '、' + (10 - b) + ' + ' + ones + ' = ' + (a - b)
    });
  }
  function nokoriQ(lo, hi) {
    const a = U.randInt(lo, hi), b = U.randInt(1, Math.min(9, a - 1));
    return num('ぶんしょうの もんだい', 'あめが ' + a + 'こ あります。' + b + 'こ たべました。のこりは なんこ？', a - b, {
      hint: '「のこり」は ひきざん。' + a + ' − ' + b + ' だよ。', note: a + ' − ' + b + ' = ' + (a - b) + '（こ）', key: 'no:' + a + ':' + b
    });
  }
  function chigaiQ(lo, hi) {
    const a = U.randInt(lo, hi), b = U.randInt(1, a - 1);
    return num('ぶんしょうの もんだい', 'あかい ふうせんが ' + a + 'こ、あおい ふうせんが ' + b + 'こ あります。あかは あおより なんこ おおい？', a - b, {
      hint: '「ちがい」は ひきざん。おおきい かずから ちいさい かずを ひこう。', note: a + ' − ' + b + ' = ' + (a - b) + '（こ）', key: 'ch:' + a + ':' + b
    });
  }
  function missingSub(lo, hi, hideFirst) {
    const a = U.randInt(lo, hi), b = U.randInt(1, Math.min(9, a - 1)), c = a - b;
    const shown = hideFirst ? '□ − ' + b + ' = ' + c : a + ' − □ = ' + c;
    return num('□の ひきざん', box(shown), hideFirst ? a : b, {
      hint: hideFirst ? (c + ' と ' + b + ' を たすと もとの かずに なるよ。') : (a + ' から いくつ ひくと ' + c + ' に なるかな。'),
      note: a + ' − ' + b + ' = ' + c, key: 'ms:' + a + ':' + b + ':' + (hideFirst ? 1 : 0)
    });
  }
  const stage5 = {
    easy: [
      function small() { const a = U.randInt(2, 6), b = U.randInt(1, a - 1); return subQ('ひきざん', a, b); },
      function minusOne() { const a = U.randInt(2, 10); return subQ('ひきざん', a, 1); }
    ],
    normal: [
      function any() { const a = U.randInt(3, 10), b = U.randInt(1, a - 1); return subQ('ひきざん', a, b); },
      function zeroOrSame() {
        const a = U.randInt(1, 10);
        return Math.random() < 0.5
          ? subQ('0 の ひきざん', a, 0, { hint: '0 を ひいても かずは かわらないよ。', note: a + ' − 0 = ' + a })
          : subQ('0 の ひきざん', a, a, { hint: 'ぜんぶ ひくと、のこりは 0 だよ。', note: a + ' − ' + a + ' = 0' });
      },
      function nokori() { return nokoriQ(4, 10); }
    ],
    hard: [
      function chigai() { return chigaiQ(4, 10); },
      function missing() { return missingSub(4, 10, false); },
      function missingFirst() { return missingSub(3, 10, true); }
    ],
    boss: [
      function bossChigai() { return chigaiQ(6, 10); },
      function bossMissing() { return missingSub(6, 10, Math.random() < 0.5); },
      function bossNokori() { return nokoriQ(7, 10); }
    ]
  };

  const stage10 = {
    easy: [
      function minusNine() { return borrowQ(10 + U.randInt(1, 8), 9); },
      function minusEight() { return borrowQ(10 + U.randInt(1, 7), 8); }
    ],
    normal: [
      function minusSeven() { return borrowQ(10 + U.randInt(1, 6), 7); },
      function minusSix() { return borrowQ(10 + U.randInt(1, 5), 6); },
      function anyBorrow() { const b = U.randInt(5, 9); return borrowQ(10 + U.randInt(1, b - 1), b); }
    ],
    hard: [
      function smallSub() { const b = U.randInt(2, 5); return borrowQ(10 + U.randInt(1, b - 1), b); },
      function nokori() {
        const b = U.randInt(4, 9), a = 10 + U.randInt(1, b - 1);
        return num('ぶんしょうの もんだい', 'くっきーが ' + a + 'まい あります。' + b + 'まい たべました。のこりは なんまい？', a - b, {
          hint: '「のこり」は ひきざん。' + a + ' を 10 と ' + (a - 10) + ' に わけて、10 − ' + b + ' から かんがえよう。',
          note: a + ' − ' + b + ' = ' + (a - b) + '（まい）', key: 'no2:' + a + ':' + b
        });
      },
      function chigai() {
        const b = U.randInt(4, 9), a = 10 + U.randInt(1, b - 1);
        return num('ぶんしょうの もんだい', 'いぬが ' + a + 'ひき、ねこが ' + b + 'ひき います。いぬは ねこより なんびき おおい？', a - b, {
          hint: '「ちがい」は ひきざん。' + a + ' − ' + b + ' だよ。', note: a + ' − ' + b + ' = ' + (a - b) + '（ひき）', key: 'ch2:' + a + ':' + b
        });
      }
    ],
    boss: [
      function bossBorrow() { const b = U.randInt(3, 9); return borrowQ(10 + U.randInt(1, b - 1), b); },
      function bossMissing() {
        const b = U.randInt(4, 9), a = 10 + U.randInt(1, b - 1), c = a - b;
        return num('□の ひきざん', box(a + ' − □ = ' + c), b, {
          hint: a + ' から いくつ ひくと ' + c + ' に なるかな。' + c + ' に いくつ たすと ' + a + '？', note: a + ' − ' + b + ' = ' + c, key: 'bms:' + a + ':' + b
        });
      },
      function bossChigai() {
        const b = U.randInt(5, 9), a = 10 + U.randInt(1, b - 1);
        return num('ぶんしょうの もんだい', 'あかぐみが ' + a + 'てん、しろぐみが ' + b + 'てん です。ちがいは なんてん？', a - b, {
          hint: 'おおきい かずから ちいさい かずを ひこう。' + a + ' − ' + b + '。', note: a + ' − ' + b + ' = ' + (a - b) + '（てん）', key: 'bch:' + a + ':' + b
        });
      }
    ]
  };

  /* =======================================================
     ステージ6 20までの かず
     ======================================================= */
  const stage6 = {
    easy: [
      function tenAnd() {
        const k = U.randInt(1, 9);
        return num('10 と いくつ', '10 と ' + k + ' で いくつ？', 10 + k, { hint: '10 の つぎから ' + k + 'こ かぞえよう。11、12…', note: '10 と ' + k + ' で ' + (10 + k) });
      },
      function isTenAnd() {
        const k = U.randInt(1, 9);
        return num('10 と いくつ', box((10 + k) + ' は 10 と □'), k, { hint: (10 + k) + ' から 10 を とると いくつ のこる？', note: (10 + k) + ' は 10 と ' + k });
      }
    ],
    normal: [
      function add() {
        const k = U.randInt(1, 6), m = U.randInt(1, 9 - k);
        return num('たしざん', expr(10 + k, '+', m), 10 + k + m, { hint: '10 は そのまま。' + k + ' + ' + m + ' を けいさんしよう。', note: (10 + k) + ' + ' + m + ' = ' + (10 + k + m) });
      },
      function sub() {
        const k = U.randInt(2, 9), m = U.randInt(1, k - 1);
        return num('ひきざん', expr(10 + k, '−', m), 10 + k - m, { hint: '10 は そのまま。' + k + ' − ' + m + ' を けいさんしよう。', note: (10 + k) + ' − ' + m + ' = ' + (10 + k - m) });
      },
      function next() {
        const n = U.randInt(10, 19);
        return num('かずの ならび', span(n + ' の つぎの かずは？'), n + 1, { hint: n + ' より 1 おおきい かずだよ。', note: n + ' の つぎは ' + (n + 1) });
      }
    ],
    hard: [
      function compare() {
        const a = U.randInt(10, 20), b = other(10, 20, a);
        const big = Math.max(a, b), small = Math.min(a, b);
        return choice('どちらが おおきい', 'どちらが おおきい かず？', [String(big), String(small)], {
          hint: '10 の いくつ おおきいか くらべよう。', note: big + ' の ほうが おおきい', key: 'cmp:' + a + ':' + b
        });
      },
      function seq() {
        const n = U.randInt(10, 17);
        return num('かずの ならび', box(n + '、' + (n + 1) + '、□、' + (n + 3)), n + 2, { hint: '1つずつ おおきく なっているよ。', note: n + '、' + (n + 1) + '、' + (n + 2) + '、' + (n + 3) });
      },
      function missing() {
        const k = U.randInt(1, 9);
        return num('□の たしざん', box('10 + □ = ' + (10 + k)), k, { hint: (10 + k) + ' は 10 と いくつ？', note: '10 + ' + k + ' = ' + (10 + k) });
      }
    ],
    boss: [
      function toTen() {
        const k = U.randInt(1, 9);
        return num('ひきざん', expr(10 + k, '−', k), 10, { hint: (10 + k) + ' は 10 と ' + k + '。' + k + ' を ひくと？', note: (10 + k) + ' − ' + k + ' = 10' });
      },
      function seq2() {
        const n = U.randInt(10, 14);
        return num('かずの ならび', box(n + '、' + (n + 2) + '、□、' + (n + 6)), n + 4, { hint: '2つずつ おおきく なっているよ。', note: n + '、' + (n + 2) + '、' + (n + 4) + '、' + (n + 6) });
      },
      function bossAdd() {
        const k = U.randInt(2, 8), m = U.randInt(1, 9 - k);
        return num('たしざん', expr(10 + k, '+', m), 10 + k + m, { hint: '10 は そのまま。' + k + ' + ' + m + ' を さきに。', note: (10 + k) + ' + ' + m + ' = ' + (10 + k + m) });
      }
    ]
  };

  /* =======================================================
     ステージ7 3つの かずの けいさん
     ======================================================= */
  function three(a, s1, b, s2, c, unit, hintText) {
    const mid = s1 === '+' ? a + b : a - b;
    const ans = s2 === '+' ? mid + c : mid - c;
    return num(unit || '3つの かず', span(a + ' ' + s1 + ' ' + b + ' ' + s2 + ' ' + c), ans, {
      hint: hintText || ('まえから じゅんに。' + a + ' ' + s1 + ' ' + b + ' = ' + mid + '、' + mid + ' ' + s2 + ' ' + c + ' = ？'),
      note: a + ' ' + s1 + ' ' + b + ' ' + s2 + ' ' + c + ' = ' + ans
    });
  }
  const stage7 = {
    easy: [
      function addAdd() { const a = U.randInt(1, 4), b = U.randInt(1, 3), c = U.randInt(1, 10 - a - b); return three(a, '+', b, '+', c); },
      function subSub() { const a = U.randInt(5, 10), b = U.randInt(1, 3), c = U.randInt(1, a - b - 1); return three(a, '−', b, '−', c); }
    ],
    normal: [
      function addSub() { const a = U.randInt(2, 6), b = U.randInt(1, 10 - a), c = U.randInt(1, a + b - 1); return three(a, '+', b, '−', c); },
      function subAdd() { const a = U.randInt(4, 10), b = U.randInt(1, a - 1), c = U.randInt(1, 10 - (a - b)); return three(a, '−', b, '+', c); },
      function addAddBig() { const a = U.randInt(2, 5), b = U.randInt(2, 5), c = U.randInt(1, 10 - a - b); return three(a, '+', b, '+', c); }
    ],
    hard: [
      function makeTen() {
        const a = U.randInt(1, 9), b = 10 - a, c = U.randInt(1, 9);
        return three(a, '+', b, '+', c, '10 を つくる', a + ' + ' + b + ' で ちょうど 10。10 と ' + c + ' で？');
      },
      function fromTen() { const b = U.randInt(1, 5), c = U.randInt(1, 9 - b); return three(10, '−', b, '−', c); },
      function teenSub() { const a = 10 + U.randInt(2, 9), b = U.randInt(1, a - 11), c = U.randInt(1, a - 10 - b); return three(a, '−', b, '−', c); }
    ],
    boss: [
      function bossMakeTen() {
        const a = U.randInt(2, 8), b = 10 - a, c = U.randInt(3, 9);
        return three(a, '+', b, '+', c, '10 を つくる', a + ' + ' + b + ' で 10。10 と ' + c + ' で？');
      },
      function bus() {
        const a = U.randInt(5, 10), b = U.randInt(1, a - 1), c = U.randInt(1, 10 - (a - b));
        return num('ぶんしょうの もんだい', 'ばすに ' + a + 'にん のっています。' + b + 'にん おりて、' + c + 'にん のりました。いま なんにん？', a - b + c, {
          hint: 'おりたら ひく、のったら たす。' + a + ' − ' + b + ' + ' + c + '。', note: a + ' − ' + b + ' + ' + c + ' = ' + (a - b + c) + '（にん）', key: 'bus:' + a + ':' + b + ':' + c
        });
      },
      function bossTeen() { const a = 10 + U.randInt(3, 9), b = U.randInt(1, a - 11), c = U.randInt(1, a - 10 - b); return three(a, '−', b, '−', c); }
    ]
  };

  /* =======================================================
     とけいの 絵（CSS の div だけ。画像なし）
     12 が 上・黒い ふち・白い 文字ばん・目もり 60・赤い はり 2本。
     見た目は css/style.css の .clock。数字と はりの むきだけ ここで 計算する。
     ======================================================= */
  function clockHtml(h, m) {
    const hd = (h % 12) * 30 + m * 0.5;   // みじかい はり（1じかんで 30度・1ぷんで 0.5度）
    const md = m * 6;                     // ながい はり（1ぷんで 6度）
    let s = '<span class="clock">';
    for (let i = 0; i < 60; i++) {
      s += '<i class="clock__tick' + (i % 5 === 0 ? ' clock__tick--big' : '') + '" style="transform:rotate(' + (i * 6) + 'deg)"></i>';
    }
    for (let n = 1; n <= 12; n++) {
      const a = n * Math.PI / 6;
      const x = 86 + 62 * Math.sin(a), y = 86 - 62 * Math.cos(a);
      s += '<b class="clock__num" style="left:' + x.toFixed(1) + 'px;top:' + y.toFixed(1) + 'px">' + n + '</b>';
    }
    s += '<i class="clock__hand clock__hand--h" style="transform:rotate(' + hd + 'deg)"></i>';
    s += '<i class="clock__hand clock__hand--m" style="transform:rotate(' + md + 'deg)"></i>';
    s += '<i class="clock__center"></i></span>';
    return s;
  }
  // 問題文の 右に とけいを おく（カードが 高く ならない ように よこならび）
  function clockQ(text, h, m) {
    return '<span class="clockq"><span class="clockq__t">' + text + '</span><span class="clockbox">' + clockHtml(h, m) + '</span></span>';
  }
  function ji(h) { return h + 'じ'; }
  function han(h) { return h + 'じはん'; }
  function nextH(h) { return h === 12 ? 1 : h + 1; }
  function prevH(h) { return h === 1 ? 12 : h - 1; }
  // 「ふん」「ぷん」の つかいわけ（1ぷん・2ふん・3ぷん・4ぷん・5ふん・6ぷん・7ふん・8ぷん・9ふん・10ぷん）
  function fun(m) { return [1, 3, 4, 6, 8, 0].indexOf(m % 10) !== -1 ? 'ぷん' : 'ふん'; }
  function jifun(h, m) { return h + 'じ' + m + fun(m); }
  function nearMin(m, d) { const v = m + d; return (v >= 1 && v <= 59) ? v : m - d; }

  /* =======================================================
     ステージ8 なんじ なんじはん（とけいの 絵つき）
     ======================================================= */
  const stage8 = {
    easy: [
      function exact() {
        const h = U.randInt(1, 12);
        return num('なんじ', clockQ('なんじ？', h, 0), h, {
          hint: 'ながい はりが 12 だから「ちょうど」。みじかい はりが さしている かずを よもう。', note: ji(h), key: 'ex:' + h
        });
      },
      function exactChoice() {
        const h = U.randInt(1, 12);
        return choice('なんじ', clockQ('なんじ？', h, 0), withDistractors(ji(h), [han(h), ji(nextH(h)), ji(prevH(h))]), {
          hint: 'ながい はりが 12 の ときは「ちょうど なんじ」。', note: ji(h), key: 'exc:' + h
        });
      }
    ],
    normal: [
      function half() {
        const h = U.randInt(1, 12);
        return choice('なんじはん', clockQ('なんじ？', h, 30), withDistractors(han(h), [han(nextH(h)), ji(h), ji(nextH(h))]), {
          hint: 'ながい はりが 6 だから「なんじはん」。みじかい はりは ' + h + ' を すぎた ところ。まだ ' + nextH(h) + ' じゃないよ。', note: han(h), key: 'half:' + h
        });
      },
      function halfLong() {
        const h = U.randInt(1, 12);
        return num('ながい はり', clockQ('ながい はりは どの かずを さしている？', h, 30), 6, {
          hint: 'ながくて ほそい ほうが ながい はり。さきの かずを よもう。', note: h + 'じはん の ながい はりは 6', key: 'hl:' + h
        });
      },
      function shortHand() {
        const h = U.randInt(1, 12);
        return num('みじかい はり', clockQ('みじかい はりは どの かずを さしている？', h, 0), h, {
          hint: 'みじかくて ふとい ほうが みじかい はり。', note: 'みじかい はりは ' + h, key: 'sh:' + h
        });
      }
    ],
    hard: [
      function which() {
        const h = U.randInt(1, 12), isHalf = Math.random() < 0.5;
        const ans = isHalf ? han(h) : ji(h);
        return choice('なんじ', clockQ('なんじ？', h, isHalf ? 30 : 0), withDistractors(ans, [isHalf ? ji(h) : han(h), ji(nextH(h)), han(nextH(h))]), {
          hint: 'ながい はりが 12 なら「ちょうど」、6 なら「はん」。', note: ans, key: 'wh:' + h + ':' + (isHalf ? 1 : 0)
        });
      },
      function hourLater() {
        const h = U.randInt(1, 12);
        return choice('1じかん あと', clockQ('この とけいの 1じかん あとは なんじ？', h, 0), withDistractors(ji(nextH(h)), [ji(h), han(h), ji(nextH(nextH(h)))]), {
          hint: 'いまは ' + ji(h) + '。1じかん たつと みじかい はりが 1つ すすむよ。', note: ji(h) + ' の 1じかん あとは ' + ji(nextH(h)), key: 'la:' + h
        });
      },
      function halfLater() {
        const h = U.randInt(1, 12);
        return choice('1じかん あと', clockQ('この とけいの 1じかん あとは？', h, 30), withDistractors(han(nextH(h)), [ji(nextH(h)), han(h), ji(h)]), {
          hint: 'いまは ' + han(h) + '。「はん」は そのまま、みじかい はりだけ 1つ すすむ。', note: han(h) + ' の 1じかん あとは ' + han(nextH(h)), key: 'hla:' + h
        });
      }
    ],
    boss: [
      function hourBefore() {
        const h = U.randInt(1, 12);
        return choice('1じかん まえ', clockQ('この とけいの 1じかん まえは なんじ？', h, 0), withDistractors(ji(prevH(h)), [ji(h), han(prevH(h)), ji(nextH(h))]), {
          hint: 'いまは ' + ji(h) + '。1じかん まえは みじかい はりが 1つ もどる。', note: ji(h) + ' の 1じかん まえは ' + ji(prevH(h)), key: 'lb:' + h
        });
      },
      function halfLaterBoss() {
        const h = U.randInt(1, 12);
        return choice('1じかん あと', clockQ('この とけいの 1じかん あとは？', h, 30), withDistractors(han(nextH(h)), [ji(nextH(h)), han(h), han(nextH(nextH(h)))]), {
          hint: 'いまは ' + han(h) + '。「はん」は そのまま、みじかい はりだけ 1つ すすむ。', note: han(h) + ' の 1じかん あとは ' + han(nextH(h)), key: 'bhla:' + h
        });
      },
      function whichBoss() {
        const h = U.randInt(1, 12);
        return choice('なんじはん', clockQ('なんじ？', h, 30), withDistractors(han(h), [han(nextH(h)), ji(h), ji(nextH(h))]), {
          hint: 'みじかい はりは ' + h + ' と ' + nextH(h) + ' の あいだ。すぎた ほうの かず（' + h + '）を よむ。', note: han(h), key: 'bwh:' + h
        });
      }
    ]
  };

  /* =======================================================
     ステージ12 なんじ なんぷん（とけいの 絵つき）
     ======================================================= */
  function fiveMin() { return U.randInt(1, 11) * 5; }
  function oddMin() { let m = U.randInt(1, 59); while (m % 5 === 0) m = U.randInt(1, 59); return m; }
  function readQ(unit, h, m, extraHint, key) {
    return choice(unit, clockQ('なんじ なんぷん？', h, m),
      withDistractors(jifun(h, m), [jifun(nextH(h), m), jifun(h, nearMin(m, 5)), jifun(h, nearMin(m, 1))]), {
        hint: 'みじかい はりが すぎた かずが「なんじ」、ながい はりは 1めもりが 1ぷん。' + (extraHint || ''), note: jifun(h, m), key: key + ':' + h + ':' + m
      });
  }
  const stage12 = {
    easy: [
      function minFive() {
        const h = U.randInt(1, 12), m = fiveMin();
        return num('なんぷん', clockQ('なんぷん？', h, m), m, {
          hint: 'ながい はりは 1 で 5ふん、2 で 10ぷん。5、10、15… と かぞえよう。', note: m + fun(m), key: 'f5:' + h + ':' + m
        });
      },
      function hourFive() {
        const h = U.randInt(1, 12), m = fiveMin();
        return num('なんじ', clockQ('なんじ？', h, m), h, {
          hint: 'みじかい はりが すぎた かずが「なんじ」。まだ ' + nextH(h) + ' には なっていないよ。', note: ji(h) + m + fun(m) + ' だから ' + ji(h), key: 'h5:' + h + ':' + m
        });
      }
    ],
    normal: [
      function minAny() {
        const h = U.randInt(1, 12), m = oddMin();
        return num('なんぷん', clockQ('なんぷん？', h, m), m, {
          hint: '5、10、15… と かぞえてから、のこりの めもりを 1つずつ たそう。', note: m + fun(m), key: 'fa:' + h + ':' + m
        });
      },
      function readFive() { const h = U.randInt(1, 12); return readQ('なんじ なんぷん', h, fiveMin(), '', 'r5'); },
      function hourTrap() {
        const h = U.randInt(1, 12), m = U.randInt(50, 59);
        return num('なんじ', clockQ('なんじ？', h, m), h, {
          hint: 'みじかい はりは ' + nextH(h) + ' の ちかくだけど、まだ すぎていない。すぎた かずは ' + h + '。', note: jifun(h, m) + ' だから ' + ji(h), key: 'tr:' + h + ':' + m
        });
      }
    ],
    hard: [
      function readAny() { const h = U.randInt(1, 12); return readQ('なんじ なんぷん', h, oddMin(), '', 'ra'); },
      function minLate() {
        const h = U.randInt(1, 12), m = U.randInt(31, 59);
        return num('なんぷん', clockQ('なんぷん？', h, m), m, {
          hint: '6 で 30ぷん。そこから 35、40… と かぞえて、のこりの めもりを たそう。', note: m + fun(m), key: 'fl:' + h + ':' + m
        });
      },
      function readTrap() {
        const h = U.randInt(1, 12), m = U.randInt(46, 59);
        return readQ('なんじ なんぷん', h, m, 'みじかい はりは ' + nextH(h) + ' の てまえ。', 'rt');
      }
    ],
    boss: [
      function bossRead() { const h = U.randInt(1, 12); return readQ('なんじ なんぷん', h, oddMin(), '', 'br'); },
      function bossTrap() {
        const h = U.randInt(1, 12), m = U.randInt(51, 59);
        return readQ('なんじ なんぷん', h, m, 'みじかい はりは ' + nextH(h) + ' の すぐ てまえ。', 'bt');
      },
      function bossMin() {
        const h = U.randInt(1, 12), m = oddMin();
        return num('なんぷん', clockQ('なんぷん？', h, m), m, {
          hint: '5とびで かぞえてから、のこりの めもりを 1つずつ。', note: m + fun(m), key: 'bm:' + h + ':' + m
        });
      }
    ]
  };

  /* =======================================================
     ステージ11 100までの かず
     ======================================================= */
  function distinctNums(count, lo, hi) {
    const used = {}, out = [];
    let guard = 0;
    while (out.length < count && guard++ < 80) {
      const v = U.randInt(lo, hi);
      if (used[v]) continue;
      used[v] = true;
      out.push(v);
    }
    return out;
  }
  const stage11 = {
    easy: [
      function tensOnes() {
        const t = U.randInt(1, 9), o = U.randInt(1, 9);
        return num('10 が いくつ', '10 が ' + t + 'こ と 1 が ' + o + 'こ で いくつ？', t * 10 + o, {
          hint: '10 が ' + t + 'こ で ' + (t * 10) + '。それに ' + o + ' を たそう。', note: (t * 10) + ' と ' + o + ' で ' + (t * 10 + o), key: 'to:' + t + ':' + o
        });
      },
      function tensOnly() {
        const t = U.randInt(2, 9);
        return num('10 が いくつ', '10 が ' + t + 'こ で いくつ？', t * 10, { hint: '10、20、30… と ' + t + 'かい かぞえよう。', note: '10 が ' + t + 'こ で ' + (t * 10) });
      }
    ],
    normal: [
      function next() {
        const n = U.randInt(20, 98);
        return num('かずの ならび', span(n + ' の つぎの かずは？'), n + 1, { hint: n + ' より 1 おおきい かずだよ。', note: n + ' の つぎは ' + (n + 1) });
      },
      function prev() {
        const n = U.randInt(21, 100);
        return num('かずの ならび', span(n + ' の 1つ まえの かずは？'), n - 1, { hint: n + ' より 1 ちいさい かずだよ。', note: n + ' の まえは ' + (n - 1) });
      },
      function addTens() {
        const a = U.randInt(1, 8), b = U.randInt(1, 9 - a);
        return num('なん十の たしざん', expr(a * 10, '+', b * 10), (a + b) * 10, { hint: '10 が ' + a + 'こ と ' + b + 'こ で、10 が なんこ？', note: (a * 10) + ' + ' + (b * 10) + ' = ' + ((a + b) * 10) });
      }
    ],
    hard: [
      function biggest() {
        const ns = distinctNums(4, 10, 99);
        ns.sort(function (x, y) { return y - x; });
        return choice('おおきい かず', 'いちばん おおきい かずは どれ？', ns.map(String), {
          hint: 'まず 10 の くらい（ひだりの かず）を くらべよう。', note: ns[0] + ' が いちばん おおきい', key: 'big:' + ns.join(',')
        });
      },
      function seqTen() {
        const t = U.randInt(1, 7);
        return num('かずの ならび', box((t * 10) + '、' + ((t + 1) * 10) + '、□、' + ((t + 3) * 10)), (t + 2) * 10, {
          hint: '10 ずつ おおきく なっているよ。', note: (t * 10) + '、' + ((t + 1) * 10) + '、' + ((t + 2) * 10) + '、' + ((t + 3) * 10)
        });
      },
      function addOnes() {
        const t = U.randInt(2, 9), o = U.randInt(1, 5), c = U.randInt(1, 9 - o);
        return num('たしざん', expr(t * 10 + o, '+', c), t * 10 + o + c, { hint: (t * 10) + ' は そのまま。' + o + ' + ' + c + ' を けいさんしよう。', note: (t * 10 + o) + ' + ' + c + ' = ' + (t * 10 + o + c) });
      }
    ],
    boss: [
      function subTens() {
        const a = U.randInt(3, 10), b = U.randInt(1, a - 1);
        return num('なん十の ひきざん', expr(a * 10, '−', b * 10), (a - b) * 10, { hint: '10 が ' + a + 'こ から ' + b + 'こ とると、10 が なんこ？', note: (a * 10) + ' − ' + (b * 10) + ' = ' + ((a - b) * 10) });
      },
      function subOnes() {
        const t = U.randInt(2, 9), o = U.randInt(4, 9), c = U.randInt(1, o - 1);
        return num('ひきざん', expr(t * 10 + o, '−', c), t * 10 + o - c, { hint: (t * 10) + ' は そのまま。' + o + ' − ' + c + ' を けいさんしよう。', note: (t * 10 + o) + ' − ' + c + ' = ' + (t * 10 + o - c) });
      },
      function seqFive() {
        const s = U.randInt(1, 15) * 5;
        return num('かずの ならび', box(s + '、' + (s + 5) + '、' + (s + 10) + '、□'), s + 15, { hint: '5 ずつ おおきく なっているよ。', note: s + '、' + (s + 5) + '、' + (s + 10) + '、' + (s + 15) });
      },
      function hundred() {
        const pick = U.randInt(0, 1);
        return pick === 0
          ? num('100', '100 は 10 が なんこ？', 10, { hint: '10、20、30… と 100 まで かぞえると なんかい？', note: '100 は 10 が 10こ' })
          : num('100', '10 が 10こ で いくつ？', 100, { hint: '10 を 10かい あつめた かずだよ。', note: '10 が 10こ で 100' });
      }
    ]
  };

  const stages = { 1: stage1, 2: stage2, 3: stage3, 4: stage4, 5: stage5, 6: stage6, 7: stage7, 8: stage8, 9: stage9, 10: stage10, 11: stage11, 12: stage12 };

  // maker を かたよらないように じゅんばんに 使う
  function cycle(list, n) {
    const out = [];
    if (!list || !list.length) return out;
    let order = U.shuffle(list);
    for (let i = 0; i < n; i++) {
      if (i % list.length === 0 && i > 0) order = U.shuffle(list);
      out.push(order[i % list.length]);
    }
    return out;
  }

  function levelCounts(n) {
    const easy = Math.ceil(n / 3);
    const hard = Math.floor(n / 3);
    return [easy, n - easy - hard, hard];
  }

  const TIERS = { 1: 'easy', 2: 'normal', 3: 'hard' };

  function idOf(stageNo, q) { return 'sansu1-' + stageNo + ':' + (q.key || U.stripTags(q.prompt)); }

  /* opts.boss … ボスの 問題だけ
     opts.lv   … その むずかしさ だけ（たからばこ など）
     どちらも ないときは やさしい → ふつう → むずかしい の じゅんで n 問。
     小1は かずの はばが せまいので、同じ問題が 2回 出ないように 作り直す */
  function make(stageNo, n, opts) {
    const st = stages[stageNo];
    if (!st) return [];
    let plan;
    if (opts && opts.boss) {
      plan = [[st.boss, 3, n]];
    } else if (opts && opts.lv) {
      plan = [[st[TIERS[opts.lv]] || st.normal, opts.lv, n]];
    } else {
      const c = levelCounts(n);
      plan = [[st.easy, 1, c[0]], [st.normal, 2, c[1]], [st.hard, 3, c[2]]];
    }
    const out = [], seen = {};
    plan.forEach(function (p) {
      cycle(p[0], p[2]).forEach(function (maker) {
        let q = maker(), tries = 0;
        while (seen[idOf(stageNo, q)] && tries++ < 12) q = maker();
        q.lv = p[1];
        q.id = idOf(stageNo, q);
        seen[q.id] = true;
        out.push(q);
      });
    });
    return out;
  }

  return { make: make, stages: stages, levelCounts: levelCounts, clockHtml: clockHtml, clockQ: clockQ };
})();
