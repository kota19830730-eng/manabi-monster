/* ---------------------------------------------------------
   小3 算数：問題を その場で作る（日本文教出版『小学算数』の順）

   ステージ 1〜6 は 1学期、7〜13 は 2学期（v3.0・2026-08-31 に 追加）、
   14〜18 は 3学期（v6.3・2026-09-05 に 追加。□を 使った 式／倍の 見方／三角形と 角／かけ算の 筆算(2)／そろばん）。
   出すか どうかは 学期の しくみ（terms.js・おうちの人ページ）が 決める。

   問題の作り方は 関数として 入っていて、数字は 毎回かわります。
   ステージごとに 4つの グループが あります：
     easy   … やさしい（たたかいの さいしょに 出る）    lv 1
     normal … ふつう                                    lv 2
     hard   … むずかしい（ボスの 前に 出る）            lv 3
     boss   … ボスの 問題（ザコより むずかしい まとめ問題）
   たたかいでは easy → normal → hard の じゅんに 出ます。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.sansu3 = (function () {
  const U = MQ.util;

  /* ---- 問題を作る 小さな道具 ---- */
  function expr(a, sign, b) {
    return '<span class="num">' + a + ' ' + sign + ' ' + b + '</span>';
  }

  /* 図（グラフ・円・表 など）の ある 問題に メモ欄は 出さない。
     たて700の 端末では 図と メモ欄が 両方 入らず、**問題文が 切れて 読めなく なる**
     （v4.4 で 小4に 決めた きまり。v5.6 で 小3も 自動で そろえた）。
     `extra` で `scratch: true` を 書けば わざと 出す ことも できる。 */
  const HAS_FIG = /figbox|class="graph"|class="figwide"|class="tbl"|<svg/;
  function num(unit, prompt, answer, extra) {
    return Object.assign(
      { type: 'number', unit: unit, prompt: prompt, answer: answer, scratch: !HAS_FIG.test(String(prompt)) },
      extra || {}
    );
  }

  function vertical(unit, a, sign, b, answer, extra) {
    return num(unit, expr(a, sign, b), answer, Object.assign({ layout: 'vertical', a: a, b: b, sign: sign }, extra || {}));
  }

  function choice(unit, prompt, choices, extra) {
    return Object.assign({ type: 'choice', unit: unit, prompt: prompt, choices: choices, answer: 0 }, extra || {});
  }

  function divrem(unit, a, b, extra) {
    return Object.assign({
      type: 'divrem', unit: unit, prompt: expr(a, '÷', b), a: a, b: b,
      answer: { q: Math.floor(a / b), r: a % b }, scratch: true
    }, extra || {});
  }

  // 正解 1つ ＋ まちがい3つ（かぶらないように）
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

  /* =======================================================
     ステージ1 かけ算のきまり
     ======================================================= */
  function zeroQ() {
    const a = U.randInt(1, 9);
    const flip = Math.random() < 0.5;
    const x = flip ? 0 : a, y = flip ? a : 0;
    return num('0のかけ算', expr(x, '×', y), 0, {
      hint: '0を かけても、0に かけても、答えは いつも 0だよ。',
      note: x + ' × ' + y + ' = 0'
    });
  }
  function tenQ() {
    const a = U.randInt(1, 9);
    const flip = Math.random() < 0.5;
    const x = flip ? 10 : a, y = flip ? a : 10;
    return num('10のかけ算', expr(x, '×', y), a * 10, {
      hint: '10が ' + a + 'こ。10、20、30… と かぞえよう。',
      note: x + ' × ' + y + ' = ' + (a * 10)
    });
  }
  function unknownQ(lo, hi) {
    const a = U.randInt(lo, hi), b = U.randInt(lo, hi);
    const flip = Math.random() < 0.5;
    const shown = flip ? '□ × ' + b + ' = ' + (a * b) : b + ' × □ = ' + (a * b);
    return num('かける数・かけられる数', '<span class="num">' + shown + '</span><br>□に 入る数は？', a, {
      hint: b + 'のだんで ' + (a * b) + ' に なる数を さがそう。',
      note: shown.replace('□', a)
    });
  }

  const stage1 = {
    easy: [
      zeroQ,
      tenQ,
      function kuku() {
        const a = U.randInt(2, 9), b = U.randInt(2, 9);
        return num('九九の ふくしゅう', expr(a, '×', b), a * b, {
          hint: a + 'のだんを となえよう。' + a + '、' + (a * 2) + '、' + (a * 3) + '…',
          note: a + ' × ' + b + ' = ' + (a * b)
        });
      }
    ],
    normal: [
      function unknown() { return unknownQ(2, 9); },
      function rule() {
        const a = U.randInt(2, 9), b = U.randInt(3, 9);
        return num('かけ算のきまり', expr(a, '×', b) + ' は ' + expr(a, '×', b - 1) + ' より いくつ 大きい？', a, {
          hint: 'かける数が 1 ふえると、答えは かけられる数（' + a + '）だけ ふえるよ。',
          note: a + '×' + b + '=' + (a * b) + '、' + a + '×' + (b - 1) + '=' + (a * (b - 1)) + '。ちがいは ' + a
        });
      },
      function swap() {
        const a = U.randInt(2, 9);
        let b = U.randInt(2, 9);
        if (b === a) b = a === 9 ? 8 : a + 1;
        return num('かけ算のきまり（入れかえ）', '<span class="num">' + a + ' × ' + b + ' = ' + b + ' × □</span><br>□に 入る数は？', a, {
          hint: 'かける数と かけられる数を 入れかえても、答えは 同じに なるよ。',
          note: a + ' × ' + b + ' = ' + b + ' × ' + a + ' = ' + (a * b)
        });
      }
    ],
    hard: [
      function split() {
        const a = U.randInt(2, 9), b = U.randInt(6, 9);
        return num('分けて計算', expr(a, '×', b) + ' を ' + expr(a, '×', 5) + ' と ' + expr(a, '×', '□') + ' に 分けて 計算します。□は？', b - 5, {
          hint: b + ' は 5 と いくつに 分けられる？',
          note: a + '×' + b + ' = ' + a + '×5 + ' + a + '×' + (b - 5)
        });
      },
      function ruleMinus() {
        const a = U.randInt(2, 9), b = U.randInt(2, 8);
        return num('かけ算のきまり', expr(a, '×', b) + ' は ' + expr(a, '×', b + 1) + ' より いくつ 小さい？', a, {
          hint: 'かける数が 1 へると、答えは かけられる数（' + a + '）だけ へるよ。',
          note: a + '×' + (b + 1) + '=' + (a * (b + 1)) + '、' + a + '×' + b + '=' + (a * b) + '。ちがいは ' + a
        });
      },
      function unknownBig() { return unknownQ(6, 9); }
    ],
    boss: [
      function triple() {
        const a = U.randInt(2, 4), b = U.randInt(2, 4), c = U.randInt(2, 5);
        return num('3つの数のかけ算', '<span class="num">' + a + ' × ' + b + ' × ' + c + '</span>', a * b * c, {
          hint: 'じゅんばんに。' + a + '×' + b + '=' + (a * b) + '。その答えに ' + c + ' を かけよう。',
          note: a + '×' + b + '×' + c + ' = ' + (a * b * c)
        });
      },
      function distribute() {
        const a = U.randInt(3, 9), b = U.randInt(6, 9);
        return num('分けて計算', expr(a, '×', b) + ' を ' + expr(a, '×', 5) + ' と ' + expr(a, '×', b - 5) + ' に 分けて 計算します。答えは？', a * b, {
          hint: a + '×5=' + (a * 5) + '、' + a + '×' + (b - 5) + '=' + (a * (b - 5)) + '。2つを たそう。',
          note: (a * 5) + ' + ' + (a * (b - 5)) + ' = ' + (a * b)
        });
      },
      function sameAnswer() {
        const a = U.randInt(2, 9);
        let b = U.randInt(2, 9);
        if (b === a) b = a === 9 ? 8 : a + 1;
        const f = function (x, y) { return x + ' × ' + y; };
        const choices = withDistractors(f(b, a), [f(a, b + 1), f(a + 1, b), f(a, b - 1), f(b, a + 1)]);
        return choice('かけ算のきまり', expr(a, '×', b) + ' と 同じ 答えに なる 式は？', choices, {
          key: 'same:' + a + 'x' + b,
          hint: 'かける数と かけられる数を 入れかえても 答えは 同じだよ。',
          note: a + '×' + b + ' = ' + b + '×' + a + ' = ' + (a * b)
        });
      }
    ]
  };

  /* =======================================================
     ステージ2 わり算
     ======================================================= */
  function basicDiv(lo, hi) {
    const b = U.randInt(lo, hi), q = U.randInt(2, 9);
    return num('わり算', expr(b * q, '÷', b), q, {
      hint: b + 'のだんで ' + (b * q) + ' に なるのは、' + b + ' × いくつ？',
      note: (b * q) + ' ÷ ' + b + ' = ' + q
    });
  }
  function twoDigitDiv(bs, tLo) {
    const b = U.pick(bs);
    const t = b * U.randInt(tLo, Math.floor(9 / b));
    const o = b * U.randInt(1, Math.floor(9 / b));
    const a = t * 10 + o;
    return num('答えが九九にないわり算', expr(a, '÷', b), a / b, {
      hint: (t * 10) + '÷' + b + '=' + (t / b * 10) + '、' + o + '÷' + b + '=' + (o / b) + '。合わせると？',
      note: a + ' ÷ ' + b + ' = ' + (a / b)
    });
  }

  const stage2 = {
    easy: [
      function basicSmall() { return basicDiv(2, 5); },
      function oneZero() {
        const a = U.randInt(2, 9);
        const kind = U.pick(['one', 'zero', 'same']);
        if (kind === 'one') return num('1や0のわり算', expr(a, '÷', 1), a, { hint: '1人に 分けると、そのまま ぜんぶ もらえるね。', note: a + ' ÷ 1 = ' + a });
        if (kind === 'zero') return num('1や0のわり算', expr(0, '÷', a), 0, { hint: '何もないものを 分けても 0だよ。', note: '0 ÷ ' + a + ' = 0' });
        return num('1や0のわり算', expr(a, '÷', a), 1, { hint: a + 'こを ' + a + '人で 分けると、1人 いくつ？', note: a + ' ÷ ' + a + ' = 1' });
      }
    ],
    normal: [
      function basic() { return basicDiv(6, 9); },
      function tens() {
        const b = U.randInt(2, 9);
        const q = U.randInt(1, Math.floor(9 / b));
        const a = b * q * 10;
        return num('答えが九九にないわり算', expr(a, '÷', b), q * 10, {
          hint: '10のたばで 考えよう。' + (b * q) + '÷' + b + '=' + q + ' だから、10のたばが ' + q + 'こ。',
          note: a + ' ÷ ' + b + ' = ' + (q * 10)
        });
      },
      function word() {
        const b = U.randInt(2, 9), q = U.randInt(2, 9);
        const a = b * q;
        if (Math.random() < 0.5) {
          return num('わり算の文しょうだい', a + 'この あめを ' + b + '人で 同じ数ずつ 分けます。1人分は 何こ？', q, {
            hint: '「同じ数ずつ 分ける」は わり算。' + a + ' ÷ ' + b + ' を 計算しよう。',
            note: a + ' ÷ ' + b + ' = ' + q + '（こ）'
          });
        }
        return num('わり算の文しょうだい', a + '本の 花を ' + b + '本ずつ たばにします。花たばは 何たば できる？', q, {
          hint: '「' + b + '本ずつ」は わり算。' + a + ' ÷ ' + b + ' を 計算しよう。',
          note: a + ' ÷ ' + b + ' = ' + q + '（たば）'
        });
      }
    ],
    hard: [
      function twoDigit() { return twoDigitDiv([2, 3, 4], 1); },
      function formula() {
        const b = U.randInt(2, 9), q = U.randInt(2, 9);
        const a = b * q;
        const choices = [a + ' ÷ ' + b, a + ' × ' + b, a + ' + ' + b, a + ' − ' + b];
        return choice('式を えらぶ', a + 'この あめを ' + b + '人で 同じ数ずつ 分けます。1人分を もとめる 式は？', choices, {
          key: 'formula:' + a + '/' + b,
          hint: '「同じ数ずつ 分ける」ときは、わり算の 式に なるよ。',
          note: a + ' ÷ ' + b + ' = ' + q + '（こ）'
        });
      },
      function unknownDividend() {
        const b = U.randInt(2, 9), q = U.randInt(2, 9);
        return num('わり算と かけ算', '<span class="num">□ ÷ ' + b + ' = ' + q + '</span><br>□に 入る数は？', b * q, {
          hint: 'わる数 × 答え で、もとの数に もどるよ。' + b + ' × ' + q + ' は？',
          note: b + ' × ' + q + ' = ' + (b * q) + ' だから □ は ' + (b * q)
        });
      }
    ],
    boss: [
      function bossTwoDigit() { return twoDigitDiv([2, 3], 2); },
      function bossWord() {
        const b = U.randInt(3, 9), q = U.randInt(4, 9);
        return num('わり算の文しょうだい', (b * q) + 'まいの 色紙を ' + b + '人で 同じ数ずつ 分けると、1人分は 何まい？', q, {
          hint: (b * q) + ' ÷ ' + b + '。' + b + 'のだんで さがそう。',
          note: (b * q) + ' ÷ ' + b + ' = ' + q + '（まい）'
        });
      },
      function bossTensWord() {
        const b = U.randInt(2, 4), q = U.randInt(2, Math.floor(9 / b));
        const a = b * q * 10;
        return num('わり算の文しょうだい', a + '円を ' + b + '人で 同じ 金がくずつ 出し合います。1人 何円？', q * 10, {
          hint: '10円玉が ' + (b * q) + 'まい と 考えよう。' + (b * q) + ' ÷ ' + b + ' = ' + q + '。10円玉が ' + q + 'まい。',
          note: a + ' ÷ ' + b + ' = ' + (q * 10) + '（円）'
        });
      },
      function bossCompare() {
        const qs = U.sample([2, 3, 4, 5, 6, 7, 8, 9], 4);
        const items = qs.map(function (q) { const b = U.randInt(2, 9); return { text: (b * q) + ' ÷ ' + b, q: q }; });
        items.sort(function (x, y) { return y.q - x.q; });
        return choice('わり算', '答えが いちばん 大きいのは どれ？', items.map(function (it) { return it.text; }), {
          key: 'compare:' + items.map(function (it) { return it.text; }).join(','),
          hint: '4つとも 計算してから くらべよう。',
          note: items[0].text + ' = ' + items[0].q + ' が いちばん 大きい'
        });
      }
    ]
  };

  /* =======================================================
     ステージ3 時こくと時間
     ======================================================= */
  function fmtTime(h, m) { return h + '時' + (m === 0 ? '' : m + '分'); }
  function addMin(h, m, d) {
    let total = h * 60 + m + d;
    total = ((total % 720) + 720) % 720;
    let hh = Math.floor(total / 60);
    if (hh === 0) hh = 12;
    return [hh, total % 60];
  }
  function fiveMin() { return U.randInt(0, 11) * 5; }

  function afterQ(h, m, d, wordy) {
    const ans = addMin(h, m, d);
    const cands = [addMin(h, m, d + 10), addMin(h, m, d - 10), addMin(h, m, d + 60), addMin(h, m, d - 5), addMin(h, m, d + 5)];
    const choices = withDistractors(fmtTime(ans[0], ans[1]), cands.map(function (t) { return fmtTime(t[0], t[1]); }));
    const cross = m + d >= 60;
    const prompt = wordy
      ? 'ゆうきさんは ' + fmtTime(h, m) + ' に 家を 出て、' + d + '分 歩いて 学校に 着きました。着いた 時こくは？'
      : fmtTime(h, m) + ' の ' + d + '分後の 時こくは？';
    return choice('時こくをもとめる', prompt, choices, {
      hint: cross ? 'まず ' + (h === 12 ? 1 : h + 1) + '時 までは ' + (60 - m) + '分。のこりの ' + (d - (60 - m)) + '分を たそう。' : '分だけ たせば いいね。' + m + ' + ' + d + ' は？',
      note: fmtTime(h, m) + ' の ' + d + '分後は ' + fmtTime(ans[0], ans[1])
    });
  }
  function beforeQ(h, m, d) {
    const ans = addMin(h, m, -d);
    const cands = [addMin(h, m, -d + 10), addMin(h, m, -d - 10), addMin(h, m, d), addMin(h, m, -d + 5), addMin(h, m, -d - 60)];
    const choices = withDistractors(fmtTime(ans[0], ans[1]), cands.map(function (t) { return fmtTime(t[0], t[1]); }));
    const cross = m - d < 0;
    return choice('時こくをもとめる', fmtTime(h, m) + ' の ' + d + '分前の 時こくは？', choices, {
      hint: cross ? 'まず ' + h + '時 までは ' + m + '分 もどる。のこりの ' + (d - m) + '分を さらに もどそう。' : '分だけ ひけば いいね。' + m + ' − ' + d + ' は？',
      note: fmtTime(h, m) + ' の ' + d + '分前は ' + fmtTime(ans[0], ans[1])
    });
  }
  function durationQ(h, m, d) {
    const end = addMin(h, m, d);
    const cross = m + d >= 60;
    return num('時間をもとめる', fmtTime(h, m) + ' から ' + fmtTime(end[0], end[1]) + ' までは 何分？', d, {
      scratch: false,
      hint: cross ? 'ちょうどの時こく（' + end[0] + '時）までが ' + (60 - m) + '分、そこから ' + end[1] + '分。合わせて？' : end[1] + ' − ' + m + ' を 計算しよう。',
      note: fmtTime(h, m) + ' → ' + fmtTime(end[0], end[1]) + ' は ' + d + '分'
    });
  }

  const stage3 = {
    easy: [
      function afterEasy() {
        const h = U.randInt(1, 11), m = U.randInt(0, 5) * 5, d = U.pick([5, 10, 15, 20, 30]);
        return afterQ(h, m, d, false);   // 時を またがない
      },
      function minToSec() {
        const n = U.randInt(1, 3);
        return num('秒', n + '分は 何秒？', n * 60, { scratch: false, hint: '1分 ＝ 60秒。60 を ' + n + '回 たそう。', note: n + '分 = ' + (n * 60) + '秒' });
      },
      function hourToMin() {
        const m = U.pick([10, 20, 30, 40, 50]);
        return num('時間の たんい', '1時間' + m + '分は 何分？', 60 + m, { scratch: false, hint: '1時間 ＝ 60分。60 に ' + m + ' を たそう。', note: '1時間' + m + '分 = ' + (60 + m) + '分' });
      }
    ],
    normal: [
      function after() {
        const h = U.randInt(1, 11), m = fiveMin(), d = U.pick([10, 15, 20, 25, 30, 35, 40, 45, 50]);
        return afterQ(h, m, d, false);
      },
      function before() {
        const h = U.randInt(1, 11), m = fiveMin(), d = U.pick([10, 15, 20, 25, 30, 35, 40, 45, 50]);
        return beforeQ(h, m, d);
      },
      function durationEasy() {
        const h = U.randInt(1, 11), m = U.randInt(0, 4) * 5, d = U.pick([15, 20, 25, 30, 35]);
        return durationQ(h, m, d);   // 時を またがない
      }
    ],
    hard: [
      function duration() {
        const h = U.randInt(1, 11), m = U.pick([30, 35, 40, 45, 50]), d = U.pick([35, 40, 45, 50, 55]);
        return durationQ(h, m, d);   // 時を またぐ
      },
      function seconds() {
        if (Math.random() < 0.5) {
          const n = U.randInt(1, 2), s = U.pick([10, 20, 30, 40, 50]);
          return num('秒', n + '分' + s + '秒は 何秒？', n * 60 + s, { scratch: false, hint: n + '分 は ' + (n * 60) + '秒。それに ' + s + '秒 を たそう。', note: n + '分' + s + '秒 = ' + (n * 60 + s) + '秒' });
        }
        const s = U.pick([70, 80, 90, 100, 110, 120, 130, 150]);
        const mm = Math.floor(s / 60), ss = s % 60;
        const correct = mm + '分' + (ss === 0 ? '' : ss + '秒');
        const choices = withDistractors(correct, [
          (mm + 1) + '分' + (ss === 0 ? '' : ss + '秒'), mm + '分' + (ss + 10) + '秒', '1分' + s + '秒', (s / 10) + '分', mm + '分' + (ss === 0 ? '10秒' : (ss - 10 === 0 ? '' : (ss - 10) + '秒'))
        ]);
        return choice('秒', s + '秒は 何分何秒？', choices, { hint: '60秒で 1分。' + s + ' の中に 60 は いくつ 入る？', note: s + '秒 = ' + correct });
      },
      function minToHour() {
        const m = U.pick([70, 80, 90, 100, 110, 120, 130, 140, 150]);
        const hh = Math.floor(m / 60), mm = m % 60;
        const f = function (h, x) { return h + '時間' + (x === 0 ? '' : x + '分'); };
        const correct = f(hh, mm);
        const choices = withDistractors(correct, [f(hh + 1, mm), f(hh, mm + 10), f(hh, mm === 0 ? 30 : Math.max(0, mm - 10)), f(hh - 1 > 0 ? hh - 1 : hh + 2, mm)]);
        return choice('時間の たんい', m + '分は 何時間何分？', choices, {
          hint: '60分で 1時間。' + m + ' から 60 を ひくと？',
          note: m + '分 = ' + correct
        });
      }
    ],
    boss: [
      function bossDuration() {
        const h = U.randInt(1, 11), m = U.pick([25, 35, 40, 45, 50, 55]), d = U.pick([35, 40, 45, 50, 55]);
        return durationQ(h, m, d);
      },
      function bossBefore() {
        const h = U.randInt(2, 11), m = U.pick([5, 10, 15, 20, 25]), d = U.pick([30, 35, 40, 45, 50]);
        return beforeQ(h, m, d);     // 時を またいで もどる
      },
      function bossWalk() {
        const h = U.randInt(1, 11), m = U.pick([30, 35, 40, 45, 50]), d = U.pick([30, 35, 40, 45, 50]);
        return afterQ(h, m, d, true);   // 時を またぐ
      }
    ]
  };

  /* =======================================================
     ステージ4 たし算とひき算の筆算
     ======================================================= */
  const hintAdd = '一のくらいから じゅんに たそう。10 に なったら 上のくらいに 1 くり上げる。';
  const hintSub = '一のくらいから。ひけないときは 上のくらいから 1 かりてこよう。';

  const stage4 = {
    easy: [
      function add2NoCarry() {
        const a1 = U.randInt(1, 8), a0 = U.randInt(0, 8);
        const b1 = U.randInt(1, 9 - a1), b0 = U.randInt(0, 9 - a0);
        const a = a1 * 10 + a0, b = b1 * 10 + b0;
        return num('暗算', expr(a, '+', b), a + b, { hint: '十のくらい どうし、一のくらい どうしで 分けて たそう。', note: a + ' + ' + b + ' = ' + (a + b) });
      },
      function sub2NoBorrow() {
        const a1 = U.randInt(2, 9), a0 = U.randInt(1, 9);
        const b1 = U.randInt(1, a1 - 1), b0 = U.randInt(0, a0);
        const a = a1 * 10 + a0, b = b1 * 10 + b0;
        return num('暗算', expr(a, '−', b), a - b, { hint: '十のくらい どうし、一のくらい どうしで 分けて ひこう。', note: a + ' − ' + b + ' = ' + (a - b) });
      },
      function add3NoCarry() {
        const a2 = U.randInt(1, 7), a1 = U.randInt(0, 8), a0 = U.randInt(0, 8);
        const b2 = U.randInt(1, 9 - a2), b1 = U.randInt(0, 9 - a1), b0 = U.randInt(0, 9 - a0);
        const a = a2 * 100 + a1 * 10 + a0, b = b2 * 100 + b1 * 10 + b0;
        return vertical('たし算の筆算', a, '+', b, a + b, { hint: '一のくらいから じゅんに たそう。くり上がりは ないよ。', note: a + ' + ' + b + ' = ' + (a + b) });
      }
    ],
    normal: [
      function add3() {
        const a = U.randInt(100, 899), b = U.randInt(100, 999);
        return vertical('たし算の筆算', a, '+', b, a + b, { hint: hintAdd, note: a + ' + ' + b + ' = ' + (a + b) });
      },
      function sub3() {
        const a = U.randInt(200, 999), b = U.randInt(100, a - 1);
        return vertical('ひき算の筆算', a, '−', b, a - b, { hint: hintSub, note: a + ' − ' + b + ' = ' + (a - b) });
      },
      function add2() {
        const a = U.randInt(11, 89), b = U.randInt(11, 89);
        return num('暗算', expr(a, '+', b), a + b, { hint: '十のくらい どうし、一のくらい どうしで 分けて たそう。', note: a + ' + ' + b + ' = ' + (a + b) });
      },
      function sub2() {
        const a = U.randInt(30, 99), b = U.randInt(11, a - 1);
        return num('暗算', expr(a, '−', b), a - b, { hint: 'まず ' + b + ' を 何十と いくつに 分けて、じゅんに ひこう。', note: a + ' − ' + b + ' = ' + (a - b) });
      }
    ],
    hard: [
      function subZero() {
        const hun = U.randInt(2, 9), one = U.randInt(0, 8);
        const a = hun * 100 + one;
        let b = U.randInt(100, a - 1);
        if (b % 10 <= one) b = b - (b % 10) + one + 1;
        if (b >= a) b = a - 9;
        return vertical('ひき算の筆算', a, '−', b, a - b, {
          hint: '十のくらいが 0 のときは、百のくらいから かりてきて、十のくらいを 10 に してから 考えよう。',
          note: a + ' − ' + b + ' = ' + (a - b)
        });
      },
      function add3Big() {
        const a = U.randInt(500, 999), b = U.randInt(500, 999);
        return vertical('たし算の筆算', a, '+', b, a + b, { hint: hintAdd + ' 百のくらいから くり上がると 千のくらいが できるよ。', note: a + ' + ' + b + ' = ' + (a + b) });
      },
      function subTwoBorrow() {
        const a2 = U.randInt(2, 9), a1 = U.randInt(0, 8), a0 = U.randInt(0, 8);
        const b2 = U.randInt(1, a2 - 1), b1 = U.randInt(a1, 9), b0 = U.randInt(a0 + 1, 9);
        const a = a2 * 100 + a1 * 10 + a0, b = b2 * 100 + b1 * 10 + b0;
        return vertical('ひき算の筆算', a, '−', b, a - b, { hint: hintSub + ' くり下がりが 2回 あるよ。', note: a + ' − ' + b + ' = ' + (a - b) });
      }
    ],
    boss: [
      function add4() {
        const a = U.randInt(1000, 8999), b = U.randInt(1000, 8999);
        return vertical('大きい数の筆算', a, '+', b, a + b, { hint: hintAdd + ' 4けたでも やり方は 同じ。', note: a + ' + ' + b + ' = ' + (a + b) });
      },
      function subThousand() {
        const a = 1000 + U.randInt(1, 9), b = U.randInt(100, 999);
        return vertical('大きい数の筆算', a, '−', b, a - b, { hint: '千のくらいから じゅんに かりてこよう。1000 は 100が 10こ。', note: a + ' − ' + b + ' = ' + (a - b) });
      },
      function addThree() {
        const a = U.randInt(100, 999), b = U.randInt(100, 999), c = U.randInt(100, 999);
        return num('3つの数の たし算', '<span class="num">' + a + ' + ' + b + ' + ' + c + '</span>', a + b + c, {
          hint: 'まず ' + a + ' + ' + b + ' = ' + (a + b) + '。その答えに ' + c + ' を たそう。',
          note: a + ' + ' + b + ' + ' + c + ' = ' + (a + b + c)
        });
      },
      function unknownAdd() {
        const b = U.randInt(100, 899), x = U.randInt(100, 999);
        const c = b + x;
        return num('たし算と ひき算の かんけい', '<span class="num">□ + ' + b + ' = ' + c + '</span><br>□に 入る数は？', x, {
          hint: '□ は ' + c + ' から ' + b + ' を ひけば わかるよ。',
          note: c + ' − ' + b + ' = ' + x
        });
      }
    ]
  };
  /* =======================================================
     ステージ5 ぼうグラフ
     ======================================================= */
  const graphSets = [
    { title: 'すきなスポーツ', items: ['サッカー', 'やきゅう', 'ドッジボール', '水泳'], unit: '人' },
    { title: 'すきなくだもの', items: ['りんご', 'バナナ', 'みかん', 'ぶどう'], unit: '人' },
    { title: 'かいたい動物', items: ['犬', 'ねこ', 'うさぎ', 'ハムスター'], unit: '人' },
    { title: '1週間に 読んだ本', items: ['月', '火', '水', '木'], unit: 'さつ' },
    { title: 'すきな 給食', items: ['カレー', 'あげパン', 'ラーメン', 'シチュー'], unit: '人' },
    { title: 'とれた 野さい', items: ['トマト', 'なす', 'きゅうり', 'ピーマン'], unit: 'こ' }
  ];

  function makeGraph(scale) {
    const set = U.pick(graphSets);
    const values = [];
    const used = {};
    set.items.forEach(function () {
      let v;
      do { v = scale * U.randInt(1, 9); } while (used[v]);
      used[v] = true;
      values.push(v);
    });
    return { set: set, scale: scale, values: values, svg: graphSvg(set, scale, values) };
  }

  /* ぼうグラフの 絵。
     たてに 長いと 下の キーボードが かくれてしまうので、
     よこ長（300 × 118）に して、字は 大きめに してある。 */
  function graphSvg(set, scale, values) {
    const W = 300, H = 118, left = 32, top = 17, bottom = 24, right = 8;
    const plotH = H - top - bottom, plotW = W - left - right;
    const maxTick = scale * 10;
    const barW = plotW / values.length * 0.55;
    let s = '<svg class="graph" viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="' + U.esc(set.title) + 'のぼうグラフ">';
    s += '<text x="' + left + '" y="11" font-size="11" fill="#1F2D3A">' + U.esc(set.title) + '（' + set.unit + '）</text>';
    for (let i = 0; i <= 10; i++) {
      const y = top + plotH - plotH * i / 10;
      s += '<line x1="' + left + '" y1="' + y + '" x2="' + (W - right) + '" y2="' + y + '" stroke="' + (i % 5 === 0 ? '#B9B29A' : '#E3DCC4') + '" stroke-width="0.8"/>';
      if (i % 5 === 0) {
        s += '<text x="' + (left - 5) + '" y="' + (y + 3.5) + '" font-size="10" text-anchor="end" fill="#1F2D3A">' + (scale * i) + '</text>';
      }
    }
    values.forEach(function (v, i) {
      const cx = left + plotW * (i + 0.5) / values.length;
      const h = plotH * v / maxTick;
      s += '<rect x="' + (cx - barW / 2) + '" y="' + (top + plotH - h) + '" width="' + barW + '" height="' + h + '" fill="#4F8CFF"/>';
      s += '<text x="' + cx + '" y="' + (H - 7) + '" font-size="10" text-anchor="middle" fill="#1F2D3A">' + U.esc(set.items[i]) + '</text>';
    });
    s += '<line x1="' + left + '" y1="' + top + '" x2="' + left + '" y2="' + (top + plotH) + '" stroke="#1F2D3A" stroke-width="1.2"/>';
    s += '<line x1="' + left + '" y1="' + (top + plotH) + '" x2="' + (W - right) + '" y2="' + (top + plotH) + '" stroke="#1F2D3A" stroke-width="1.2"/>';
    s += '</svg>';
    return s;
  }

  function tallyText(count) {
    const full = Math.floor(count / 5), rem = count % 5;
    const part = { 0: '', 1: '一', 2: 'T', 3: '下' }[rem];
    let s = '';
    for (let i = 0; i < full; i++) s += '正';
    return s + part;
  }

  function orderOf(g, desc) {
    return g.set.items.map(function (it, i) { return { it: it, v: g.values[i] }; })
      .sort(function (a, b) { return desc ? b.v - a.v : a.v - b.v; });
  }
  function readQ(scale) {
    const g = makeGraph(scale);
    const i = U.randInt(0, g.set.items.length - 1);
    return num('ぼうグラフ', g.svg + '「' + g.set.items[i] + '」は 何' + g.set.unit + '？', g.values[i], {
      key: 'read:' + i + ':' + g.values.join(','),
      scratch: false,
      hint: '1目もりは ' + g.scale + '。ぼうの 上を 左の 目もりで 読もう。',
      note: '「' + g.set.items[i] + '」は ' + g.values[i] + g.set.unit
    });
  }
  function diffQ(scale, keyName) {
    const g = makeGraph(scale);
    const idx = U.sample([0, 1, 2, 3], 2);
    const a = idx[0], b = idx[1];
    const big = g.values[a] > g.values[b] ? a : b, small = big === a ? b : a;
    return num('ぼうグラフ', g.svg + '「' + g.set.items[big] + '」は「' + g.set.items[small] + '」より 何' + g.set.unit + ' 多い？', g.values[big] - g.values[small], {
      key: keyName + ':' + big + ':' + small + ':' + g.values.join(','),
      scratch: false,
      hint: '1目もりは ' + g.scale + '。それぞれの 数を 読んでから ひき算しよう。' + g.values[big] + ' − ' + g.values[small] + '。',
      note: g.values[big] + ' − ' + g.values[small] + ' = ' + (g.values[big] - g.values[small])
    });
  }

  const stage5 = {
    easy: [
      function most() {
        const g = makeGraph(U.pick([1, 2, 5]));
        const order = orderOf(g, true);
        return choice('ぼうグラフ', g.svg + 'いちばん 多いのは どれ？', order.map(function (o) { return o.it; }), {
          key: 'most:' + g.values.join(','),
          hint: 'ぼうが いちばん 高いものを さがそう。',
          note: 'いちばん高い ぼうは「' + order[0].it + '」（' + order[0].v + g.set.unit + '）'
        });
      },
      function least() {
        const g = makeGraph(U.pick([1, 2, 5]));
        const order = orderOf(g, false);
        return choice('ぼうグラフ', g.svg + 'いちばん 少ないのは どれ？', order.map(function (o) { return o.it; }), {
          key: 'least:' + g.values.join(','),
          hint: 'ぼうが いちばん 低いものを さがそう。',
          note: 'いちばん低い ぼうは「' + order[0].it + '」（' + order[0].v + g.set.unit + '）'
        });
      }
    ],
    normal: [
      function read() { return readQ(U.pick([1, 2])); },
      function tally() {
        let count;
        do { count = U.randInt(6, 24); } while (count % 5 === 4);
        return num('整理のしかた', '「正」の字で 数えました。<div class="tally">' + tallyText(count) + '</div>ぜんぶで 何人？', count, {
          key: 'tally:' + count,
          scratch: false,
          hint: '「正」は 5。「一」は 1、「T」は 2、「下」は 3。',
          note: '正 が ' + Math.floor(count / 5) + 'つ で ' + (Math.floor(count / 5) * 5) + '、のこり ' + (count % 5) + '。合わせて ' + count
        });
      },
      function second() {
        const g = makeGraph(U.pick([1, 2]));
        const order = orderOf(g, true);
        const choices = [order[1].it, order[0].it, order[2].it, order[3].it];
        return choice('ぼうグラフ', g.svg + '2ばんめに 多いのは どれ？', choices, {
          key: 'second:' + g.values.join(','),
          hint: 'いちばん 高い ぼうの つぎに 高いのは？',
          note: '「' + order[1].it + '」（' + order[1].v + g.set.unit + '）が 2ばんめ'
        });
      }
    ],
    hard: [
      function read5() { return readQ(5); },
      function diff() { return diffQ(U.pick([1, 2]), 'diff'); },
      function sumTwo() {
        const g = makeGraph(U.pick([1, 2]));
        const idx = U.sample([0, 1, 2, 3], 2);
        const a = idx[0], b = idx[1];
        return num('ぼうグラフ', g.svg + '「' + g.set.items[a] + '」と「' + g.set.items[b] + '」を 合わせると 何' + g.set.unit + '？', g.values[a] + g.values[b], {
          key: 'sum2:' + a + ':' + b + ':' + g.values.join(','),
          scratch: false,
          hint: '1目もりは ' + g.scale + '。2つの 数を 読んでから たし算しよう。',
          note: g.values[a] + ' + ' + g.values[b] + ' = ' + (g.values[a] + g.values[b])
        });
      }
    ],
    boss: [
      function bossDiff() { return diffQ(5, 'bossdiff'); },
      function bossSum() {
        const g = makeGraph(5);
        const total = g.values.reduce(function (s, v) { return s + v; }, 0);
        return num('ぼうグラフ', g.svg + 'ぜんぶで 何' + g.set.unit + '？', total, {
          key: 'bosssum:' + g.values.join(','),
          hint: '1目もりは 5。4つ ぜんぶ 読んでから たし算しよう。',
          note: g.values.join(' + ') + ' = ' + total
        });
      },
      function bossSecond5() {
        const g = makeGraph(5);
        const order = orderOf(g, true);
        const choices = [order[2].it, order[0].it, order[1].it, order[3].it];
        return choice('ぼうグラフ', g.svg + '3ばんめに 多いのは どれ？', choices, {
          key: 'third:' + g.values.join(','),
          hint: '多い じゅんに ならべて みよう。',
          note: '「' + order[2].it + '」（' + order[2].v + g.set.unit + '）が 3ばんめ'
        });
      }
    ]
  };

  /* =======================================================
     ステージ6 あまりのあるわり算
     ======================================================= */
  function remBasic(bLo, bHi, qLo, qHi) {
    const b = U.randInt(bLo, bHi), q = U.randInt(qLo, qHi), r = U.randInt(1, b - 1);
    const a = b * q + r;
    return divrem('あまりのあるわり算', a, b, {
      hint: b + 'のだんで、' + a + ' を こえない いちばん大きい答えを さがそう。あまりは ' + b + ' より 小さくなるよ。',
      note: a + ' ÷ ' + b + ' = ' + q + ' あまり ' + r
    });
  }
  function checkQ(bLo, bHi, qLo, qHi) {
    const b = U.randInt(bLo, bHi), q = U.randInt(qLo, qHi), r = U.randInt(1, b - 1);
    const a = b * q + r;
    return num('答えのたしかめ', '<span class="num">□ ÷ ' + b + ' = ' + q + ' あまり ' + r + '</span><br>□に 入る数は？', a, {
      hint: 'たしかめの式は「わる数 × 答え + あまり」。' + b + ' × ' + q + ' + ' + r + ' を 計算しよう。',
      note: b + ' × ' + q + ' + ' + r + ' = ' + a
    });
  }

  const stage6 = {
    easy: [
      function basicSmall() { return remBasic(2, 4, 1, 5); },
      function remOnly() {
        const b = U.randInt(2, 5), q = U.randInt(1, 6), r = U.randInt(1, b - 1);
        const a = b * q + r;
        return num('あまり', expr(a, '÷', b) + ' の あまりは？', r, {
          hint: b + ' × ' + q + ' = ' + (b * q) + '。' + a + ' から ' + (b * q) + ' を ひくと？',
          note: a + ' ÷ ' + b + ' = ' + q + ' あまり ' + r
        });
      }
    ],
    normal: [
      function basic() { return remBasic(5, 9, 2, 9); },
      function check() { return checkQ(2, 9, 2, 9); },
      function quotientOnly() {
        const b = U.randInt(3, 9), q = U.randInt(2, 9), r = U.randInt(1, b - 1);
        const a = b * q + r;
        return num('あまりのあるわり算', a + 'この みかんを ' + b + 'こずつ ふくろに 入れます。' + b + 'こ 入った ふくろは 何ふくろ？', q, {
          hint: a + ' ÷ ' + b + ' = ' + q + ' あまり ' + r + '。あまりの ' + r + 'こは ふくろに ならないよ。',
          note: q + 'ふくろ できて ' + r + 'こ あまる'
        });
      }
    ],
    hard: [
      function wordPlus() {
        const b = U.randInt(3, 6), q = U.randInt(2, 7), r = U.randInt(1, b - 1);
        const a = b * q + r;
        return num('あまりを考える問題', a + '人が ' + b + '人ずつ 車に のります。ぜんいんが のるには 車は 何台 いる？', q + 1, {
          hint: a + ' ÷ ' + b + ' = ' + q + ' あまり ' + r + '。あまりの ' + r + '人も のるには、もう1台 いるね。',
          note: q + '台 に あまりの人の 1台を たして ' + (q + 1) + '台'
        });
      },
      function wordFloor() {
        const b = U.randInt(3, 8), q = U.randInt(2, 8), r = U.randInt(1, b - 1);
        const a = b * q + r;
        return num('あまりを考える問題', a + '本の 花を ' + b + '本ずつ 花たばに します。' + b + '本の 花たばは 何こ できる？', q, {
          hint: a + ' ÷ ' + b + ' = ' + q + ' あまり ' + r + '。あまりの ' + r + '本では ' + b + '本の 花たばは できないね。',
          note: '花たばは ' + q + 'こ（' + r + '本 あまる）'
        });
      },
      function fixWrong() {
        const b = U.randInt(3, 9), q = U.randInt(2, 8), r = U.randInt(1, b - 1);
        const a = b * q + r;
        const f = function (x, y) { return x + ' あまり ' + y; };
        const wrong = f(q - 1, r + b);
        const choices = withDistractors(f(q, r), [wrong, f(q, r === 1 ? 2 : r - 1), f(q + 1, r)]);
        return choice('あまりの大きさ', 'ゆうきさんは <span class="num">' + a + ' ÷ ' + b + ' = ' + wrong + '</span> と 答えました。正しい 答えは？', choices, {
          key: 'fix:' + a + '/' + b,
          hint: 'あまりは わる数（' + b + '）より 小さく なるよ。あまりが ' + (r + b) + ' なら、まだ ' + b + ' で われるね。',
          note: a + ' ÷ ' + b + ' = ' + q + ' あまり ' + r + '。あまりは わる数より 小さく。'
        });
      }
    ],
    boss: [
      function bossWordPlus() {
        const b = U.randInt(4, 8), q = U.randInt(5, 9), r = U.randInt(1, b - 1);
        const a = b * q + r;
        return num('あまりを考える問題', a + 'この ボールを 1箱に ' + b + 'こずつ 入れます。ぜんぶ 入れるには 箱は 何箱 いる？', q + 1, {
          hint: a + ' ÷ ' + b + ' = ' + q + ' あまり ' + r + '。あまりの ' + r + 'こを 入れる箱も いるよ。',
          note: q + '箱 + 1箱 = ' + (q + 1) + '箱'
        });
      },
      function bossBasic() { return remBasic(6, 9, 5, 9); },
      function bossCheck() { return checkQ(6, 9, 6, 9); },
      function bossWordRem() {
        const b = U.randInt(4, 9), q = U.randInt(5, 9), r = U.randInt(1, b - 1);
        const a = b * q + r;
        return divrem('あまりを考える問題', a, b, {
          prompt: a + 'まいの 色紙を 1人に ' + b + 'まいずつ くばります。何人に くばれて、何まい あまる？<br>' + expr(a, '÷', b),
          hint: b + 'のだんで ' + a + ' を こえない いちばん大きい数を さがそう。のこりが あまり。',
          note: a + ' ÷ ' + b + ' = ' + q + ' あまり ' + r + '。' + q + '人に くばれて ' + r + 'まい あまる'
        });
      }
    ]
  };

  /* =======================================================
     2学期（v3.0・2026-08-31）：ステージ 7〜13
       7 大きい数／8 長さ（km）／9 円と球／10 かけ算の筆算（1）／
       11 小数／12 重さ／13 分数
     図は inline SVG（円・ボールの箱・はかり・数直線）。
     小数の 答えは decimal: true（テンキーに「.」が 出る）。
     ======================================================= */
  const FS = '#1a1a1a', FF = '#FFF3C4', FR = '#d42a20', FB = '#4F8CFF';
  function pf(list) { return list[U.randInt(0, list.length - 1)]; }
  function svgBox(inner) { return '<span class="figbox">' + '<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + inner + '</svg></span>'; }
  function figQ3(text, svg) { return '<span class="figq"><span class="figq__t">' + text + '</span>' + svg + '</span>'; }
  // 小数の 答え（tenths = 0.1 の 何こ分）
  function fmtDec(tenths) { return String(Math.round(tenths) / 10); }
  function dec(unit, prompt, tenths, extra) {
    return num(unit, prompt, Math.round(tenths) / 10, Object.assign({ decimal: true }, extra || {}));
  }

  /* ---- 漢数字（一万二千三百・一億） ---- */
  const K_D = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const K_U = ['', '十', '百', '千'];
  function kanjiChunk(n) {
    let s = '';
    for (let i = 3; i >= 0; i--) {
      const d = Math.floor(n / Math.pow(10, i)) % 10;
      if (!d) continue;
      s += (i > 0 && d === 1 ? '' : K_D[d]) + K_U[i];
    }
    return s;
  }
  function kanjiNum(n) {
    const oku = Math.floor(n / 100000000), man = Math.floor(n / 10000) % 10000, low = n % 10000;
    let s = '';
    if (oku) s += (oku === 1 ? '一' : kanjiChunk(oku)) + '億';
    if (man) s += (man === 1 ? '一' : kanjiChunk(man)) + '万';
    if (low) s += kanjiChunk(low);
    return s || '零';
  }
  const PLACES = ['一', '十', '百', '千', '一万', '十万', '百万', '千万', '一億'];
  function bigNum(digits, allowZero) {
    // digits けたの 数（先頭は 0 でない）。allowZero なら 0 が 入っても よい
    let n = 0;
    for (let i = 0; i < digits; i++) {
      let d = i === 0 ? U.randInt(1, 9) : U.randInt(allowZero ? 0 : 1, 9);
      n = n * 10 + d;
    }
    return n;
  }

  /* ---- 数直線（0〜max を div 等分。mark の 目もりに ↓？） ---- */
  function lineSvg(max, div, mark, labelEvery, fmt) {
    const W = 300, H = 62, left = 26, right = 26, y = 36;
    const plotW = W - left - right;
    fmt = fmt || function (v) { return String(v); };
    let s = '<svg class="graph numline" viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="数直線">';
    s += '<line x1="' + (left - 10) + '" y1="' + y + '" x2="' + (W - right + 12) + '" y2="' + y + '" stroke="' + FS + '" stroke-width="1.6"/>';
    s += '<polygon points="' + (W - right + 12) + ',' + (y - 4) + ' ' + (W - right + 20) + ',' + y + ' ' + (W - right + 12) + ',' + (y + 4) + '" fill="' + FS + '"/>';
    for (let i = 0; i <= div; i++) {
      const x = left + plotW * i / div;
      const big = i % labelEvery === 0;
      s += '<line x1="' + x + '" y1="' + (y - (big ? 9 : 5)) + '" x2="' + x + '" y2="' + y + '" stroke="' + FS + '" stroke-width="' + (big ? 1.6 : 1) + '"/>';
      if (big) s += '<text x="' + x + '" y="' + (y + 16) + '" font-size="11" text-anchor="middle" fill="' + FS + '">' + fmt(max * i / div) + '</text>';
      if (i === mark) {
        s += '<polygon points="' + (x - 5) + ',' + (y - 22) + ' ' + (x + 5) + ',' + (y - 22) + ' ' + x + ',' + (y - 12) + '" fill="' + FR + '"/>';
        s += '<text x="' + x + '" y="' + (y - 25) + '" font-size="13" font-weight="bold" text-anchor="middle" fill="' + FR + '">？</text>';
      }
    }
    return s + '</svg>';
  }

  /* ---- 円・球の 図 ---- */
  function circleSvg(kind, label) {
    let s = '';
    if (kind === 'two') {
      s += '<circle cx="47" cy="56" r="33" fill="' + FF + '" stroke="' + FS + '" stroke-width="4"/><circle cx="113" cy="56" r="33" fill="' + FF + '" stroke="' + FS + '" stroke-width="4"/>';
      s += '<circle cx="47" cy="56" r="3" fill="' + FS + '"/><circle cx="113" cy="56" r="3" fill="' + FS + '"/>';
      s += '<line x1="14" y1="104" x2="146" y2="104" stroke="' + FR + '" stroke-width="2.5"/><line x1="14" y1="98" x2="14" y2="110" stroke="' + FR + '" stroke-width="2.5"/><line x1="146" y1="98" x2="146" y2="110" stroke="' + FR + '" stroke-width="2.5"/>';
      s += '<text x="80" y="118" font-size="13" text-anchor="middle" fill="' + FR + '" font-weight="bold">' + label + '</text>';
      return svgBox(s);
    }
    s += '<circle cx="80" cy="60" r="46" fill="' + FF + '" stroke="' + FS + '" stroke-width="4"/>';
    s += '<circle cx="80" cy="60" r="3.5" fill="' + FS + '"/>';
    if (kind === 'radius') {
      s += '<line x1="80" y1="60" x2="126" y2="60" stroke="' + FR + '" stroke-width="3"/>';
      s += '<text x="103" y="52" font-size="14" text-anchor="middle" fill="' + FR + '" font-weight="bold">' + label + '</text>';
    } else if (kind === 'diameter') {
      s += '<line x1="34" y1="60" x2="126" y2="60" stroke="' + FR + '" stroke-width="3"/>';
      s += '<text x="80" y="50" font-size="14" text-anchor="middle" fill="' + FR + '" font-weight="bold">' + label + '</text>';
    } else if (kind === 'chord') {
      // 中心を 通らない 直線（直径では ない）
      s += '<line x1="46" y1="30" x2="124" y2="46" stroke="' + FB + '" stroke-width="3"/>';
      s += '<line x1="34" y1="60" x2="126" y2="60" stroke="' + FR + '" stroke-width="3"/>';
      s += '<text x="30" y="26" font-size="12" fill="' + FB + '" font-weight="bold">あ</text><text x="131" y="78" font-size="12" fill="' + FR + '" font-weight="bold">い</text>';
    }
    return svgBox(s);
  }
  function ballsSvg(n, ballLabel, boxLabel) {
    const bw = 140, d = bw / n, y0 = 30;
    let s = '<rect x="10" y="' + y0 + '" width="' + bw + '" height="' + d + '" fill="#fff" stroke="' + FS + '" stroke-width="4"/>';
    for (let i = 0; i < n; i++) {
      const cx = 10 + d * (i + 0.5), cy = y0 + d / 2;
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (d / 2 - 2) + '" fill="' + FF + '" stroke="' + FS + '" stroke-width="3"/>';
    }
    if (ballLabel) {
      s += '<line x1="10" y1="' + (y0 - 10) + '" x2="' + (10 + d) + '" y2="' + (y0 - 10) + '" stroke="' + FR + '" stroke-width="2.5"/>';
      s += '<text x="' + (10 + d / 2) + '" y="' + (y0 - 14) + '" font-size="12" text-anchor="middle" fill="' + FR + '" font-weight="bold">' + ballLabel + '</text>';
    }
    if (boxLabel) {
      const yb = y0 + d + 14;
      s += '<line x1="10" y1="' + yb + '" x2="150" y2="' + yb + '" stroke="' + FR + '" stroke-width="2.5"/><line x1="10" y1="' + (yb - 5) + '" x2="10" y2="' + (yb + 5) + '" stroke="' + FR + '" stroke-width="2.5"/><line x1="150" y1="' + (yb - 5) + '" x2="150" y2="' + (yb + 5) + '" stroke="' + FR + '" stroke-width="2.5"/>';
      s += '<text x="80" y="' + (yb + 16) + '" font-size="13" text-anchor="middle" fill="' + FR + '" font-weight="bold">' + boxLabel + '</text>';
    }
    return svgBox(s);
  }

  /* ---- はかり（1kg まで。0 が 上・時計まわり） ---- */
  function dialSvg(grams, max) {
    max = max || 1000;
    const cx = 80, cy = 64, r = 52;
    let s = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#fff" stroke="' + FS + '" stroke-width="4"/>';
    const minor = max / 50, major = max / 10;
    for (let g = 0; g < max; g += minor) {
      const a = -Math.PI / 2 + Math.PI * 2 * g / max;
      const big = g % major === 0;
      const r1 = r - (big ? 9 : 5);
      s += '<line x1="' + (cx + Math.cos(a) * r1) + '" y1="' + (cy + Math.sin(a) * r1) + '" x2="' + (cx + Math.cos(a) * (r - 1)) + '" y2="' + (cy + Math.sin(a) * (r - 1)) + '" stroke="' + FS + '" stroke-width="' + (big ? 2 : 1) + '"/>';
      if (big) {
        const rt = r - 18;
        const lab = g === 0 ? '0' : (g % 1000 === 0 ? (g / 1000) + 'kg' : String(g));
        s += '<text x="' + (cx + Math.cos(a) * rt) + '" y="' + (cy + Math.sin(a) * rt + 3) + '" font-size="8.5" text-anchor="middle" fill="' + FS + '">' + lab + '</text>';
      }
    }
    // 目もりの 字と かさならない ように、0 と まん中の あいだに 小さく
    s += '<text x="' + cx + '" y="' + (cy - 13) + '" font-size="7.5" text-anchor="middle" fill="#666">' + (max / 1000) + 'kg まで</text>';
    const a = -Math.PI / 2 + Math.PI * 2 * grams / max;
    s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + Math.cos(a) * (r - 8)) + '" y2="' + (cy + Math.sin(a) * (r - 8)) + '" stroke="' + FR + '" stroke-width="3" stroke-linecap="round"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="4" fill="' + FR + '"/>';
    return svgBox(s);
  }

  /* =======================================================
     ステージ7 大きい数（10000より 大きい数）
     ======================================================= */
  function kanjiToNumQ(digits) {
    const n = bigNum(digits, true);
    return num('大きい数', '「' + kanjiNum(n) + '」を 数字で 書くと？', n, {
      maxLen: 9, scratch: false,
      hint: '万の 位で 区切って 考えよう。' + (n >= 100000000 ? '億は 1 の 右に 0 が 8こ。' : '一万は 1 の 右に 0 が 4こ。'),
      note: kanjiNum(n) + ' = ' + n
    });
  }
  function numToKanjiQ(digits) {
    const n = bigNum(digits, true);
    const cands = [n + 10000, n - 10000, n * 10, Math.floor(n / 10), n + 1000, n + 100000].filter(function (x) { return x > 0 && x !== n; });
    return choice('大きい数', '<span class="num">' + n + '</span> の 読み方は？', withDistractors(kanjiNum(n), cands.map(kanjiNum)), {
      key: 'read:' + n,
      hint: '右から 4けたごとに 区切ると、万・億が 見えるよ。',
      note: n + ' = ' + kanjiNum(n)
    });
  }
  function placeQ(digits) {
    const n = bigNum(digits, true);
    const i = U.randInt(1, digits - 1);
    const d = Math.floor(n / Math.pow(10, i)) % 10;
    return num('位', '<span class="num">' + n + '</span> の ' + PLACES[i] + 'の位の 数字は？', d, {
      scratch: false,
      hint: '右から 一・十・百・千・一万・十万・百万・千万 の 位。右から ' + (i + 1) + 'ばんめの 数字だよ。',
      note: n + ' の ' + PLACES[i] + 'の位は ' + d
    });
  }
  function composeQ(hardMode) {
    const parts = hardMode ? [10000, 1000, 100, 10] : [10000, 1000, 100];
    const cnt = parts.map(function () { return U.randInt(1, 9); });
    const n = parts.reduce(function (s, p, i) { return s + p * cnt[i]; }, 0);
    const text = parts.map(function (p, i) { return p + ' を ' + cnt[i] + 'こ'; }).join('、');
    return num('大きい数の しくみ', text + ' 合わせた 数は？', n, {
      maxLen: 9,
      hint: '10000 が ' + cnt[0] + 'こ で ' + (cnt[0] * 10000) + '。それに ' + parts.slice(1).map(function (p, i) { return p * cnt[i + 1]; }).join(' と ') + ' を たそう。',
      note: parts.map(function (p, i) { return p * cnt[i]; }).join(' + ') + ' = ' + n
    });
  }
  function timesQ(mult) {
    const n = mult === 100 ? U.randInt(12, 999) : U.randInt(12, 9999);
    return num(mult + '倍', '<span class="num">' + n + '</span> を ' + mult + '倍した 数は？', n * mult, {
      maxLen: 9, scratch: false,
      hint: mult + '倍すると、右に 0 が ' + (mult === 10 ? '1こ' : '2こ') + ' つくよ。',
      note: n + ' × ' + mult + ' = ' + (n * mult)
    });
  }
  function divTenQ() {
    const n = U.randInt(12, 9999) * 10;
    return num('10で わる', '<span class="num">' + n + '</span> を 10で わった 数は？', n / 10, {
      maxLen: 9, scratch: false,
      hint: '10で わると、右の 0 が 1こ とれるよ。',
      note: n + ' ÷ 10 = ' + (n / 10)
    });
  }
  function compareQ(digits) {
    const a = bigNum(digits, true);
    const b = a + U.randInt(1, 9) * Math.pow(10, U.randInt(0, digits - 2));
    const x = Math.random() < 0.5 ? a : b, y = x === a ? b : a;
    if (x === y) return compareQ(digits);
    const big = Math.max(x, y);
    return choice('大きさくらべ', '<span class="num">' + x + '</span> と <span class="num">' + y + '</span>。大きいのは？', [String(big), String(Math.min(x, y))], {
      key: 'cmp:' + x + ':' + y,
      hint: 'けた数が 同じなら、上の 位から じゅんに くらべよう。',
      note: big + ' の ほうが 大きい'
    });
  }
  function thousandsQ() {
    const k = U.randInt(11, 99);
    return num('1000を あつめた数', '1000 を ' + k + 'こ あつめた 数は？', k * 1000, {
      maxLen: 9, scratch: false,
      hint: '1000 が 10こ で 10000。' + k + 'こ なら ' + k + ' の 右に 0 を 3こ つけよう。',
      note: '1000 × ' + k + ' = ' + (k * 1000)
    });
  }
  function howManyThousandsQ() {
    const k = U.randInt(11, 99);
    return num('1000を あつめた数', '<span class="num">' + (k * 1000) + '</span> は 1000 を 何こ あつめた 数？', k, {
      scratch: false,
      hint: '右の 0 を 3こ とると、1000 の こ数が わかるよ。',
      note: (k * 1000) + ' は 1000 が ' + k + 'こ'
    });
  }
  function untilQ() {
    const target = pf([10000, 100000, 1000000]);
    const n = target - U.randInt(1, 9) * (target / 100) - U.randInt(0, 9) * (target / 1000);
    return num('あと いくつ', '<span class="num">' + n + '</span> に あと いくつ たすと ' + target + ' に なる？', target - n, {
      maxLen: 9,
      hint: target + ' − ' + n + ' を 計算しよう。筆算でも いいよ。',
      note: target + ' − ' + n + ' = ' + (target - n)
    });
  }
  function bigLineQ(max) {
    const div = 10;
    const mark = U.randInt(1, 9);
    const unit = max / div;
    return num('数直線', lineSvg(max, div, mark, 5, function (v) { return v === 0 ? '0' : v >= 10000 ? (v / 10000) + '万' : String(v); }) + '↓ の 目もりの 数は？', unit * mark, {
      key: 'line:' + max + ':' + mark, maxLen: 9, scratch: false,
      hint: '0 から ' + kanjiNum(max) + ' までを 10 に 分けた 1目もりは ' + unit + '。',
      note: unit + ' × ' + mark + ' = ' + (unit * mark)
    });
  }
  const stage7 = {
    easy: [
      function k2n() { return kanjiToNumQ(5); },
      function n2k() { return numToKanjiQ(5); },
      function place() { return placeQ(5); },
      function compose() { return composeQ(false); }
    ],
    normal: [
      function times10() { return timesQ(10); },
      function times100() { return timesQ(100); },
      function div10() { return divTenQ(); },
      function cmp() { return compareQ(pf([5, 6])); },
      function k2n6() { return kanjiToNumQ(pf([6, 7])); }
    ],
    hard: [
      thousandsQ,
      howManyThousandsQ,
      function line() { return bigLineQ(pf([10000, 100000])); },
      untilQ,
      function place8() { return placeQ(8); }
    ],
    boss: [
      function oku() { return kanjiToNumQ(9); },
      function n2k8() { return numToKanjiQ(8); },
      function line1000000() { return bigLineQ(1000000); },
      function composeHard() { return composeQ(true); },
      function cmp8() { return compareQ(8); }
    ]
  };

  /* =======================================================
     ステージ8 長さ（km）
     ======================================================= */
  function kmText(m) { const k = Math.floor(m / 1000), r = m % 1000; return (k ? k + 'km' : '') + (r ? r + 'm' : '') || '0m'; }
  function kmChoices(m) {
    const k = Math.floor(m / 1000), r = m % 1000;
    return withDistractors(kmText(m), [kmText(m + 1000), kmText(m - 1000 > 0 ? m - 1000 : m + 2000), (k ? k + 'km' : '') + (r ? Math.floor(r / 10) + 'm' : '9m'), kmText(m + 100), kmText(m * 10)]);
  }
  const UNIT_ITEMS = [
    ['家から 駅までの 道のり', 'km'], ['東京から 大阪までの 道のり', 'km'], ['マラソンで 走る 長さ', 'km'],
    ['学校の ろうかの 長さ', 'm'], ['プールの 長さ', 'm'], ['教室の たての 長さ', 'm'],
    ['えんぴつの 長さ', 'cm'], ['ノートの よこの 長さ', 'cm'], ['くつの 大きさ', 'cm'],
    ['ノートの あつさ', 'mm'], ['10円玉の あつさ', 'mm'], ['ありの 体の 長さ', 'mm']
  ];
  const stage8 = {
    easy: [
      function kmToM() {
        const k = U.randInt(1, 9);
        return num('km と m', k + 'km は 何m？', k * 1000, {
          scratch: false, hint: '1km = 1000m。' + k + 'km なら 1000 が ' + k + 'こ。', note: k + 'km = ' + (k * 1000) + 'm'
        });
      },
      function kmMToM() {
        const k = U.randInt(1, 9), r = U.randInt(1, 9) * 100;
        return num('km と m', k + 'km' + r + 'm は 何m？', k * 1000 + r, {
          scratch: false, hint: k + 'km は ' + (k * 1000) + 'm。それに ' + r + 'm を たそう。', note: k + 'km' + r + 'm = ' + (k * 1000 + r) + 'm'
        });
      },
      function unitPick() {
        const it = pf(UNIT_ITEMS);
        const others = ['km', 'm', 'cm', 'mm'].filter(function (u) { return u !== it[1]; });
        return choice('長さの たんい', '「' + it[0] + '」を はかる とき、ちょうど よい たんいは？', [it[1]].concat(others), {
          key: 'unit:' + it[0], hint: 'mm ＜ cm ＜ m ＜ km。とても 長い 道のりは km。', note: it[0] + ' → ' + it[1]
        });
      },
      function mToKm() {
        const k = U.randInt(2, 9);
        return num('km と m', (k * 1000) + 'm は 何km？', k, {
          scratch: false, hint: '1000m で 1km。', note: (k * 1000) + 'm = ' + k + 'km'
        });
      }
    ],
    normal: [
      function mToKmM() {
        const m = U.randInt(1, 9) * 1000 + U.randInt(1, 9) * 100;
        return choice('km と m', m + 'm は 何km 何m？', kmChoices(m), {
          key: 'mkm:' + m, hint: '1000m ごとに 1km。' + m + ' の 千の位が km、のこりが m。', note: m + 'm = ' + kmText(m)
        });
      },
      function addLen() {
        const a = U.randInt(1, 3) * 1000 + U.randInt(1, 9) * 100, b = U.randInt(1, 9) * 100;
        return choice('長さの たし算', kmText(a) + ' + ' + b + 'm = ？', kmChoices(a + b), {
          key: 'add:' + a + ':' + b, hint: 'm どうしを たして、1000m を こえたら 1km に くり上げよう。', note: kmText(a) + ' + ' + b + 'm = ' + kmText(a + b)
        });
      },
      function subLen() {
        const a = U.randInt(1, 3) * 1000 + U.randInt(1, 9) * 100, b = U.randInt(1, 9) * 100;
        const big = Math.max(a, b), small = Math.min(a, b);
        return num('長さの ひき算', kmText(big) + ' − ' + kmText(small) + ' は 何m？', big - small, {
          hint: 'どちらも m に なおして ひこう。' + big + ' − ' + small + '。', note: big + 'm − ' + small + 'm = ' + (big - small) + 'm'
        });
      },
      function michinori() {
        const kyori = U.randInt(6, 12) * 100, extra = U.randInt(2, 9) * 100;
        const michi = kyori + extra;
        return num('道のりと きょり', '家から 公園まで、道のりは ' + kmText(michi) + '、きょりは ' + kmText(kyori) + ' です。道のりは きょりより 何m 長い？', extra, {
          hint: '道のり は 道に そって はかった 長さ、きょり は まっすぐ はかった 長さ。' + michi + ' − ' + kyori + '。', note: michi + ' − ' + kyori + ' = ' + extra + 'm'
        });
      }
    ],
    hard: [
      function addTwo() {
        const a = U.randInt(1, 2) * 1000 + U.randInt(1, 9) * 100, b = U.randInt(1, 3) * 1000 + U.randInt(1, 9) * 100;
        return choice('長さの たし算', '学校から 図書館まで ' + kmText(a) + '、図書館から 駅まで ' + kmText(b) + '。学校から 図書館を 通って 駅まで 行くと 何km 何m？', kmChoices(a + b), {
          key: 'add2:' + a + ':' + b, hint: 'km どうし、m どうしを たそう。m が 1000 を こえたら 1km に。', note: kmText(a) + ' + ' + kmText(b) + ' = ' + kmText(a + b)
        });
      },
      function remain() {
        const total = U.randInt(1, 3) * 1000, walked = U.randInt(2, 9) * 100 + (Math.random() < 0.5 ? 50 : 0);
        return num('のこりの 長さ', total / 1000 + 'km の 道を ' + walked + 'm 歩きました。のこりは 何m？', total - walked, {
          hint: total / 1000 + 'km は ' + total + 'm。' + total + ' − ' + walked + '。', note: total + ' − ' + walked + ' = ' + (total - walked) + 'm'
        });
      },
      function trickyM() {
        const k = U.randInt(1, 9), r = pf([5, 8, 30, 40, 60, 70]);
        return num('km と m', k + 'km' + r + 'm は 何m？', k * 1000 + r, {
          scratch: false, hint: k + 'km = ' + (k * 1000) + 'm。' + r + 'm は 100m より 小さいよ。0 の 数に 気をつけて。', note: k + 'km' + r + 'm = ' + (k * 1000 + r) + 'm'
        });
      },
      function trickyKm() {
        const m = U.randInt(1, 9) * 1000 + pf([5, 8, 30, 40, 60, 70]);
        return choice('km と m', m + 'm は 何km 何m？', kmChoices(m), {
          key: 'tk:' + m, hint: '1000m ごとに 1km。のこりの m の 0 の 数に 気をつけて。', note: m + 'm = ' + kmText(m)
        });
      }
    ],
    boss: [
      function roundTrip() {
        const a = U.randInt(1, 2) * 1000 + U.randInt(1, 9) * 100, b = U.randInt(1, 2) * 1000 + U.randInt(1, 9) * 100;
        return choice('道のり', '行きは ' + kmText(a) + '、帰りは べつの 道で ' + kmText(b) + ' 歩きました。合わせて 何km 何m？', kmChoices(a + b), {
          key: 'rt:' + a + ':' + b, hint: 'km どうし、m どうしを たして、m が 1000 を こえたら くり上げ。', note: kmText(a) + ' + ' + kmText(b) + ' = ' + kmText(a + b)
        });
      },
      function diffPath() {
        const a = U.randInt(2, 4) * 1000 + U.randInt(1, 9) * 100, b = U.randInt(1, 9) * 100 + 1000;
        const big = Math.max(a, b), small = Math.min(a, b);
        return num('道のりの ちがい', '学校から 駅まで ' + kmText(big) + '、学校から 公園まで ' + kmText(small) + '。ちがいは 何m？', big - small, {
          hint: 'どちらも m に なおして ひき算。' + big + ' − ' + small + '。', note: big + ' − ' + small + ' = ' + (big - small) + 'm'
        });
      },
      function kyoriDiff() {
        const kyori = U.randInt(7, 15) * 100, extra = U.randInt(3, 9) * 100 + 50;
        return num('道のりと きょり', '家から 学校まで、きょりは ' + kmText(kyori) + '、道のりは ' + kmText(kyori + extra) + ' です。ちがいは 何m？', extra, {
          hint: (kyori + extra) + ' − ' + kyori + '。', note: (kyori + extra) + ' − ' + kyori + ' = ' + extra + 'm'
        });
      },
      function threeLeg() {
        const legs = [U.randInt(3, 9) * 100, U.randInt(3, 9) * 100, U.randInt(3, 9) * 100];
        const sum = legs[0] + legs[1] + legs[2];
        return choice('道のり', '家から 公園まで ' + legs[0] + 'm、公園から 図書館まで ' + legs[1] + 'm、図書館から 学校まで ' + legs[2] + 'm。ぜんぶで 何km 何m？', kmChoices(sum), {
          key: 'three:' + legs.join(':'), hint: legs.join(' + ') + ' = ' + sum + 'm。1000m を こえたら km に。', note: sum + 'm = ' + kmText(sum)
        });
      }
    ]
  };

  /* =======================================================
     ステージ9 円と球
     ======================================================= */
  const CIRCLE_WORDS = [
    ['円の まん中の 点を 何と いう？', '中心', ['半径', '直径', '球']],
    ['中心から 円の まわりまで ひいた 直線を 何と いう？', '半径', ['直径', '中心', '球']],
    ['中心を 通って、円の まわりから まわりまで ひいた 直線を 何と いう？', '直径', ['半径', '中心', '円']],
    ['ボールのように、どこから 見ても 円に 見える 形を 何と いう？', '球', ['円', '直径', 'まる']],
    ['球を 切った ときの 切り口の 形は？', '円', ['三角形', '四角形', '球']],
    ['円の 中に ひける いちばん 長い 直線は？', '直径', ['半径', '中心', 'まわり']],
    ['球を ちょうど 半分に 切った とき、切り口の 円が いちばん 大きく なる ところは？', '球の 中心を 通る ところ', ['球の はし', '中心から はなれた ところ', 'どこでも 同じ']],
    ['同じ 円の 半径は、どこを はかっても？', 'ぜんぶ 同じ 長さ', ['ばらばら', '直径より 長い', '2倍 ずつ ちがう']]
  ];
  function circleWordQ() {
    const w = pf(CIRCLE_WORDS);
    return choice('円と 球の ことば', w[0], [w[1]].concat(w[2]), { key: 'word:' + w[1] + ':' + w[0].length, hint: '中心・半径・直径・球。半径は 直径の 半分。', note: w[0] + ' → ' + w[1] });
  }
  function radiusToDiameterQ(lo, hi, ball) {
    const r = U.randInt(lo, hi);
    return num('半径と 直径', figQ3('半径 ' + r + 'cm の ' + (ball ? '球' : '円') + '。直径は 何cm？', circleSvg('radius', r + 'cm')), r * 2, {
      key: 'r2d:' + r + (ball ? 'b' : ''), scratch: false, hint: '直径は 半径の 2倍。' + r + ' × 2。', note: '直径 = ' + r + ' × 2 = ' + (r * 2) + 'cm'
    });
  }
  function diameterToRadiusQ(lo, hi, ball) {
    const r = U.randInt(lo, hi);
    return num('半径と 直径', figQ3('直径 ' + (r * 2) + 'cm の ' + (ball ? '球' : '円') + '。半径は 何cm？', circleSvg('diameter', (r * 2) + 'cm')), r, {
      key: 'd2r:' + r + (ball ? 'b' : ''), scratch: false, hint: '半径は 直径の 半分。' + (r * 2) + ' ÷ 2。', note: '半径 = ' + (r * 2) + ' ÷ 2 = ' + r + 'cm'
    });
  }
  function ballsBoxQ() {
    const n = U.randInt(2, 5), d = pf([4, 6, 8, 10]);
    return num('球と 箱', figQ3('直径 ' + d + 'cm の ボールが ' + n + 'こ ぴったり 入っています。箱の 横の 長さは 何cm？', ballsSvg(n, d + 'cm', '？cm')), d * n, {
      key: 'bb:' + n + ':' + d, hint: 'ボール 1この 直径 × こ数。' + d + ' × ' + n + '。', note: d + ' × ' + n + ' = ' + (d * n) + 'cm'
    });
  }
  function ballsDiameterQ() {
    const n = U.randInt(2, 5), d = pf([4, 5, 6, 8, 10]);
    return num('球と 箱', figQ3('箱の 横の 長さは ' + (d * n) + 'cm。ボールが ' + n + 'こ ぴったり 入っています。ボール 1この 直径は 何cm？', ballsSvg(n, '？cm', (d * n) + 'cm')), d, {
      key: 'bd:' + n + ':' + d, hint: '箱の 長さを こ数で わろう。' + (d * n) + ' ÷ ' + n + '。', note: (d * n) + ' ÷ ' + n + ' = ' + d + 'cm'
    });
  }
  function ballsCountQ() {
    const n = U.randInt(2, 6), d = pf([4, 5, 6, 8]);
    return num('球と 箱', '直径 ' + d + 'cm の ボールを、横の 長さ ' + (d * n) + 'cm の 箱に 1れつに ならべます。ぴったり 何こ 入る？', n, {
      scratch: false, hint: (d * n) + ' ÷ ' + d + '。', note: (d * n) + ' ÷ ' + d + ' = ' + n + 'こ'
    });
  }
  function twoCirclesQ() {
    const r = U.randInt(2, 9);
    return num('半径と 直径', figQ3('同じ 大きさの 円が 2つ ならんで、はしから はしまで ' + (r * 4) + 'cm。円の 半径は 何cm？', circleSvg('two', (r * 4) + 'cm')), r, {
      key: 'two:' + r, hint: '直径 2つ分 が ' + (r * 4) + 'cm。直径は ' + (r * 2) + 'cm、半径は その 半分。', note: (r * 4) + ' ÷ 2 = ' + (r * 2) + '（直径）、' + (r * 2) + ' ÷ 2 = ' + r + 'cm'
    });
  }
  function compassQ() {
    const r = U.randInt(2, 8);
    const which = Math.random() < 0.5;
    return which
      ? num('コンパス', '半径 ' + r + 'cm の 円を かきます。コンパスは 何cm に 開く？', r, { scratch: false, hint: 'コンパスの 開きは 半径の 長さ。', note: 'コンパスは 半径と 同じ ' + r + 'cm' })
      : num('コンパス', '直径 ' + (r * 2) + 'cm の 円を かきます。コンパスは 何cm に 開く？', r, { scratch: false, hint: 'コンパスの 開きは 半径。直径の 半分だよ。', note: (r * 2) + ' ÷ 2 = ' + r + 'cm' });
  }
  function chordQ() {
    return choice('直径', figQ3('円の 中に ひいた 2本の 直線。直径は どっち？', circleSvg('chord', '')), ['い', 'あ'], {
      key: 'chord', hint: '直径は 中心を 通る 直線だよ。', note: '中心を 通る「い」が 直径'
    });
  }
  function circlesInRowQ() {
    const r = U.randInt(2, 7), n = U.randInt(2, 4);
    return num('半径と 直径', '半径 ' + r + 'cm の 円を ' + n + 'つ、横に くっつけて ならべました。はしから はしまで 何cm？', r * 2 * n, {
      hint: '1つの 円の 直径は ' + (r * 2) + 'cm。それが ' + n + 'つ分。', note: (r * 2) + ' × ' + n + ' = ' + (r * 2 * n) + 'cm'
    });
  }
  const stage9 = {
    easy: [
      circleWordQ,
      function r2d() { return radiusToDiameterQ(2, 9, false); },
      function d2r() { return diameterToRadiusQ(2, 9, false); },
      compassQ
    ],
    normal: [
      ballsBoxQ,
      function ballR2d() { return radiusToDiameterQ(3, 12, true); },
      function ballD2r() { return diameterToRadiusQ(3, 12, true); },
      chordQ,
      circleWordQ
    ],
    hard: [
      ballsDiameterQ,
      twoCirclesQ,
      ballsCountQ,
      circlesInRowQ
    ],
    boss: [
      function bossBalls() { return ballsDiameterQ(); },
      function bossTwo() { return twoCirclesQ(); },
      function bossRow() { return circlesInRowQ(); },
      function bossBox2() {
        const n = U.randInt(3, 5), d = pf([4, 6, 8]);
        return num('球と 箱', figQ3('直径 ' + d + 'cm の ボールが ' + n + 'こ 入る 箱。箱の 横の 長さは 何cm？', ballsSvg(n, d + 'cm', '？cm')), d * n, {
          key: 'bbx:' + n + ':' + d, hint: d + ' × ' + n + '。', note: d + ' × ' + n + ' = ' + (d * n) + 'cm'
        });
      }
    ]
  };

  /* =======================================================
     ステージ10 かけ算の筆算（1）（2けた・3けた × 1けた）
     ======================================================= */
  const hintMul = '一の位から じゅんに かけよう。くり上がりは 上の 位に たす。';
  function mulV(unit, a, b, extra) {
    return vertical(unit, a, '×', b, a * b, Object.assign({ hint: hintMul, note: a + ' × ' + b + ' = ' + (a * b) }, extra || {}));
  }
  function twoDigitNoCarry() {
    let a, b;
    do { a = U.randInt(11, 44); b = U.randInt(2, 4); } while ((a % 10) * b >= 10 || Math.floor(a / 10) * b >= 10);
    return mulV('2けた × 1けた', a, b, { hint: '一の位 ' + (a % 10) + ' × ' + b + '、十の位 ' + Math.floor(a / 10) + ' × ' + b + '。くり上がりは ないよ。' });
  }
  function twoDigitCarry() {
    let a, b;
    do { a = U.randInt(12, 99); b = U.randInt(3, 9); } while ((a % 10) * b < 10);
    return mulV('2けた × 1けた', a, b);
  }
  function threeDigit(carryLevel) {
    let a, b, tries = 0;
    do {
      a = U.randInt(112, 999); b = U.randInt(2, 9);
      const c1 = (a % 10) * b >= 10, c2 = (Math.floor(a / 10) % 10) * b >= 10;
      if (carryLevel === 0 && !c1 && !c2) break;
      if (carryLevel === 1 && (c1 || c2)) break;
      if (carryLevel === 2 && c1 && c2) break;
    } while (tries++ < 200);
    return mulV('3けた × 1けた', a, b);
  }
  function tensQ() {
    const a = U.randInt(2, 9) * 10, b = U.randInt(2, 9);
    return num('何十 × 1けた', expr(a, '×', b), a * b, { scratch: false, hint: (a / 10) + ' × ' + b + ' = ' + (a / 10 * b) + '。それを 10倍。', note: a + ' × ' + b + ' = ' + (a * b) });
  }
  function hundredsQ() {
    const a = U.randInt(2, 9) * 100, b = U.randInt(2, 9);
    return num('何百 × 1けた', expr(a, '×', b), a * b, { scratch: false, hint: (a / 100) + ' × ' + b + ' = ' + (a / 100 * b) + '。それを 100倍。', note: a + ' × ' + b + ' = ' + (a * b) });
  }
  const MUL_WORDS = [
    ['1本 □円の えんぴつを ○本 買います。何円？', 'えんぴつ', '円', '本'],
    ['1箱に □この あめが 入っています。○箱では 何こ？', 'あめ', 'こ', '箱'],
    ['1日に □ページ ずつ 本を 読みます。○日で 何ページ？', '本', 'ページ', '日'],
    ['1人に □まい ずつ 色紙を くばります。○人では 何まい？', '色紙', 'まい', '人'],
    ['1ふくろに □この みかんが 入っています。○ふくろで 何こ？', 'みかん', 'こ', 'ふくろ']
  ];
  function mulWordQ(lo, hi) {
    const w = pf(MUL_WORDS);
    const a = U.randInt(lo, hi), b = U.randInt(2, 9);
    const text = w[0].replace('□', a).replace('○', b);
    return num('かけ算の 文章題', text, a * b, {
      hint: a + ' × ' + b + ' の 筆算で 計算しよう。', note: a + ' × ' + b + ' = ' + (a * b) + w[2]
    });
  }
  function unknownMulQ() {
    const a = U.randInt(12, 48), b = U.randInt(2, 4);
    return num('□を 使った かけ算', '<span class="num">□ × ' + b + ' = ' + (a * b) + '</span><br>□に 入る 数は？', a, {
      hint: (a * b) + ' ÷ ' + b + ' で もとめられるよ。', note: (a * b) + ' ÷ ' + b + ' = ' + a
    });
  }
  const stage10 = {
    easy: [tensQ, hundredsQ, twoDigitNoCarry, function w2() { return mulWordQ(11, 43); }],
    normal: [twoDigitCarry, function t0() { return threeDigit(0); }, function w2c() { return mulWordQ(13, 99); }, twoDigitCarry],
    hard: [function t1() { return threeDigit(1); }, function t2() { return threeDigit(2); }, function w3() { return mulWordQ(112, 499); }, unknownMulQ,
      function zeroIn() { const a = U.randInt(1, 9) * 100 + U.randInt(1, 9), b = U.randInt(3, 9); return mulV('0の ある 3けた × 1けた', a, b, { hint: '十の位が 0 でも、くり上がりが あれば その 位に 書くよ。' }); }],
    boss: [function b1() { return threeDigit(2); }, function b2() { return mulWordQ(215, 999); },
      function b3() { const a = U.randInt(6, 9) * 100 + U.randInt(50, 99), b = U.randInt(6, 9); return mulV('3けた × 1けた', a, b); },
      function b4() { const a = U.randInt(1, 9) * 100 + U.randInt(1, 9), b = U.randInt(6, 9); return mulV('0の ある 3けた × 1けた', a, b, { hint: '十の位の 0 に 気をつけて。くり上がりを わすれずに。' }); }]
  };

  /* =======================================================
     ステージ11 小数（0.1 の いくつ分・たし算 ひき算）
     ======================================================= */
  function tenthsQ() {
    const t = U.randInt(2, 9);
    return dec('小数', '0.1 を ' + t + 'こ あつめた 数は？', t, { scratch: false, hint: '0.1 が 10こ で 1。' + t + 'こ なら 0.' + t + '。', note: '0.1 × ' + t + ' = 0.' + t });
  }
  function tenthsBigQ() {
    const t = U.randInt(11, 59);
    return dec('小数', '0.1 を ' + t + 'こ あつめた 数は？', t, { scratch: false, hint: '0.1 が 10こ で 1。' + t + 'こ は 1 が ' + Math.floor(t / 10) + 'こ と 0.1 が ' + (t % 10) + 'こ。', note: '0.1 × ' + t + ' = ' + fmtDec(t) });
  }
  function howManyTenthsQ() {
    const t = U.randInt(11, 79);
    if (t % 10 === 0) return howManyTenthsQ();
    return num('小数', '<span class="num">' + fmtDec(t) + '</span> は 0.1 を 何こ あつめた 数？', t, { scratch: false, hint: '1 は 0.1 が 10こ。' + Math.floor(t / 10) + ' は ' + (Math.floor(t / 10) * 10) + 'こ、それに ' + (t % 10) + 'こ。', note: fmtDec(t) + ' は 0.1 が ' + t + 'こ' });
  }
  function ldlQ() {
    const l = U.randInt(1, 4), d = U.randInt(1, 9);
    return dec('小数と かさ', l + 'L' + d + 'dL は 何L？', l * 10 + d, { scratch: false, hint: '1dL = 0.1L。' + d + 'dL は 0.' + d + 'L。', note: l + 'L' + d + 'dL = ' + fmtDec(l * 10 + d) + 'L' });
  }
  function cmmmQ() {
    const c = U.randInt(1, 9), m = U.randInt(1, 9);
    return dec('小数と 長さ', c + 'cm' + m + 'mm は 何cm？', c * 10 + m, { scratch: false, hint: '1mm = 0.1cm。' + m + 'mm は 0.' + m + 'cm。', note: c + 'cm' + m + 'mm = ' + fmtDec(c * 10 + m) + 'cm' });
  }
  function firstDecimalQ() {
    const t = U.randInt(11, 99);
    if (t % 10 === 0) return firstDecimalQ();
    return num('小数の 位', '<span class="num">' + fmtDec(t) + '</span> の 小数第一位（しょうすう だいいちい）の 数字は？', t % 10, { scratch: false, hint: '小数点の すぐ 右の 数字だよ。', note: fmtDec(t) + ' の 小数第一位は ' + (t % 10) });
  }
  function decAddQ(carry) {
    let a, b;
    do { a = U.randInt(11, 69); b = U.randInt(11, 39); } while (carry ? (a % 10) + (b % 10) < 10 : (a % 10) + (b % 10) >= 10);
    return dec('小数の たし算', expr(fmtDec(a), '+', fmtDec(b)), a + b, {
      layout: 'vertical', a: fmtDec(a), b: fmtDec(b), sign: '+',
      hint: '小数点を そろえて 筆算。0.1 が ' + a + 'こ と ' + b + 'こ で ' + (a + b) + 'こ。', note: fmtDec(a) + ' + ' + fmtDec(b) + ' = ' + fmtDec(a + b)
    });
  }
  function decSubQ(borrow) {
    let a, b;
    do { a = U.randInt(21, 89); b = U.randInt(11, 49); } while (a <= b || (borrow ? (a % 10) >= (b % 10) : (a % 10) < (b % 10)));
    return dec('小数の ひき算', expr(fmtDec(a), '−', fmtDec(b)), a - b, {
      layout: 'vertical', a: fmtDec(a), b: fmtDec(b), sign: '−',
      hint: '小数点を そろえて 筆算。0.1 が ' + a + 'こ から ' + b + 'こ を ひくと ' + (a - b) + 'こ。', note: fmtDec(a) + ' − ' + fmtDec(b) + ' = ' + fmtDec(a - b)
    });
  }
  function decCompareQ() {
    let a = U.randInt(5, 59), b = U.randInt(5, 59);
    if (a === b) b = a + 1;
    const big = Math.max(a, b);
    return choice('小数の 大きさ', '<span class="num">' + fmtDec(a) + '</span> と <span class="num">' + fmtDec(b) + '</span>。大きいのは？', [fmtDec(big), fmtDec(Math.min(a, b))], {
      key: 'dcmp:' + a + ':' + b, hint: 'まず 一の位を くらべ、同じなら 小数第一位を くらべよう。', note: fmtDec(big) + ' の ほうが 大きい'
    });
  }
  function decLineQ() {
    const mark = U.randInt(1, 19);
    if (mark % 10 === 0) return decLineQ();
    return dec('小数の 数直線', lineSvg(2, 20, mark, 10, function (v) { return String(v); }) + '↓ の 目もりの 数は？', mark, {
      key: 'dline:' + mark, scratch: false, hint: '1目もりは 0.1。0 から ' + mark + ' こめ。', note: '0.1 × ' + mark + ' = ' + fmtDec(mark)
    });
  }
  function decComposeQ() {
    const w = U.randInt(1, 9), t = U.randInt(1, 9);
    return dec('小数の しくみ', '1 を ' + w + 'こ と 0.1 を ' + t + 'こ 合わせた 数は？', w * 10 + t, { scratch: false, hint: w + ' と 0.' + t + ' を 合わせる。', note: w + ' + 0.' + t + ' = ' + fmtDec(w * 10 + t) });
  }
  function decWordQ(add) {
    const a = U.randInt(8, 25), b = U.randInt(3, 12);
    if (add) return dec('小数の 文章題', 'ジュースが ' + fmtDec(a) + 'L と ' + fmtDec(b) + 'L あります。合わせて 何L？', a + b, { hint: fmtDec(a) + ' + ' + fmtDec(b) + ' を 筆算で。小数点を そろえてね。', note: fmtDec(a) + ' + ' + fmtDec(b) + ' = ' + fmtDec(a + b) + 'L' });
    return dec('小数の 文章題', 'リボンが ' + fmtDec(a + b) + 'm あります。' + fmtDec(b) + 'm 使うと、のこりは 何m？', a, { hint: fmtDec(a + b) + ' − ' + fmtDec(b) + ' を 筆算で。', note: fmtDec(a + b) + ' − ' + fmtDec(b) + ' = ' + fmtDec(a) + 'm' });
  }
  function oneMinusQ() {
    const t = U.randInt(1, 9);
    return dec('小数の ひき算', expr(1, '−', '0.' + t), 10 - t, { scratch: false, hint: '1 は 0.1 が 10こ。10 − ' + t + ' = ' + (10 - t) + 'こ。', note: '1 − 0.' + t + ' = 0.' + (10 - t) });
  }
  const stage11 = {
    easy: [tenthsQ, howManyTenthsQ, ldlQ, cmmmQ, firstDecimalQ],
    normal: [function a0() { return decAddQ(false); }, function s0() { return decSubQ(false); }, decCompareQ, decLineQ, decComposeQ],
    hard: [function a1() { return decAddQ(true); }, function s1() { return decSubQ(true); }, oneMinusQ, function w1() { return decWordQ(true); }, tenthsBigQ],
    boss: [function ba() { return decAddQ(true); }, function bs() { return decSubQ(true); }, function bw() { return decWordQ(false); }, function bt() { return tenthsBigQ(); }]
  };

  /* =======================================================
     ステージ12 重さ（g・kg・t）
     ======================================================= */
  function kgText(g) { const k = Math.floor(g / 1000), r = g % 1000; return (k ? k + 'kg' : '') + (r ? r + 'g' : '') || '0g'; }
  function kgChoices(g) {
    const k = Math.floor(g / 1000), r = g % 1000;
    return withDistractors(kgText(g), [kgText(g + 1000), kgText(g > 1000 ? g - 1000 : g + 2000), (k ? k + 'kg' : '') + (r ? Math.floor(r / 10) + 'g' : '9g'), kgText(g + 100), kgText(g * 10)]);
  }
  const WEIGHT_ITEMS = [
    ['ぞうの 体重', 't'], ['トラックの 重さ', 't'], ['大きな 船の 重さ', 't'],
    ['ランドセルの 重さ', 'kg'], ['3年生の 体重', 'kg'], ['お米の ふくろの 重さ', 'kg'],
    ['りんご 1この 重さ', 'g'], ['えんぴつの 重さ', 'g'], ['ノートの 重さ', 'g'], ['たまご 1この 重さ', 'g']
  ];
  function dialQ(step, max) {
    max = max || 1000;
    let g;
    do { g = U.randInt(1, Math.floor((max - 1) / step)) * step; } while (g % (max / 10) === 0 && step < 100);
    return num('はかり', figQ3('はかりの はりは 何g を さしている？', dialSvg(g, max)), g, {
      key: 'dial:' + g + ':' + max, scratch: false,
      hint: '大きい 目もりは ' + (max / 10) + 'g ごと、小さい 目もりは ' + (max / 50) + 'g ごと。',
      note: 'はりは ' + g + 'g（' + kgText(g) + '）'
    });
  }
  const stage12 = {
    easy: [
      function kgToG() { const k = U.randInt(1, 9); return num('kg と g', k + 'kg は 何g？', k * 1000, { scratch: false, hint: '1kg = 1000g。', note: k + 'kg = ' + (k * 1000) + 'g' }); },
      function unitPick() {
        const it = pf(WEIGHT_ITEMS);
        const others = ['t', 'kg', 'g'].filter(function (u) { return u !== it[1]; });
        return choice('重さの たんい', '「' + it[0] + '」を あらわす とき、ちょうど よい たんいは？', [it[1]].concat(others), { key: 'wunit:' + it[0], hint: 'g ＜ kg ＜ t。1kg = 1000g、1t = 1000kg。', note: it[0] + ' → ' + it[1] });
      },
      function dialEasy() { return dialQ(100); },
      function gToKg() { const k = U.randInt(2, 9); return num('kg と g', (k * 1000) + 'g は 何kg？', k, { scratch: false, hint: '1000g で 1kg。', note: (k * 1000) + 'g = ' + k + 'kg' }); }
    ],
    normal: [
      function kgGToG() { const k = U.randInt(1, 9), r = U.randInt(1, 9) * 100; return num('kg と g', k + 'kg' + r + 'g は 何g？', k * 1000 + r, { scratch: false, hint: k + 'kg は ' + (k * 1000) + 'g。それに ' + r + 'g。', note: k + 'kg' + r + 'g = ' + (k * 1000 + r) + 'g' }); },
      function gToKgG() { const g = U.randInt(1, 9) * 1000 + U.randInt(1, 9) * 100; return choice('kg と g', g + 'g は 何kg 何g？', kgChoices(g), { key: 'gkg:' + g, hint: '1000g ごとに 1kg。', note: g + 'g = ' + kgText(g) }); },
      function dialNormal() { return dialQ(50); },
      function addW() { const a = U.randInt(1, 3) * 1000 + U.randInt(1, 9) * 100, b = U.randInt(1, 9) * 100; return choice('重さの たし算', kgText(a) + ' + ' + b + 'g = ？', kgChoices(a + b), { key: 'wadd:' + a + ':' + b, hint: 'g どうしを たして、1000g を こえたら 1kg に。', note: kgText(a) + ' + ' + b + 'g = ' + kgText(a + b) }); },
      function tToKg() { const t = U.randInt(1, 9); return num('t と kg', t + 't は 何kg？', t * 1000, { scratch: false, hint: '1t = 1000kg。', note: t + 't = ' + (t * 1000) + 'kg' }); }
    ],
    hard: [
      function dialHard() { return dialQ(20); },
      function subW() { const a = U.randInt(1, 3) * 1000 + U.randInt(0, 9) * 100, b = U.randInt(1, 9) * 100 + 50; return num('重さの ひき算', kgText(a) + ' − ' + b + 'g は 何g？', a - b, { hint: kgText(a) + ' は ' + a + 'g。' + a + ' − ' + b + '。', note: a + ' − ' + b + ' = ' + (a - b) + 'g' }); },
      function wordAdd() { const a = U.randInt(1, 2) * 1000 + U.randInt(1, 9) * 100, b = U.randInt(5, 9) * 100 + U.randInt(1, 9) * 10; return choice('重さの 文章題', 'ランドセルの 重さは ' + kgText(a) + '。中に ' + kgText(b) + ' の 本を 入れると、ぜんぶで 何kg 何g？', kgChoices(a + b), { key: 'wword:' + a + ':' + b, hint: 'g どうしを たして、1000g を こえたら kg に くり上げ。', note: kgText(a) + ' + ' + kgText(b) + ' = ' + kgText(a + b) }); },
      function trickyG() { const k = U.randInt(1, 9), r = pf([5, 8, 30, 50, 70, 90]); return num('kg と g', k + 'kg' + r + 'g は 何g？', k * 1000 + r, { scratch: false, hint: k + 'kg = ' + (k * 1000) + 'g。' + r + 'g は 100g より 小さいよ。0 の 数に 気をつけて。', note: k + 'kg' + r + 'g = ' + (k * 1000 + r) + 'g' }); },
      function kgToT() { const t = U.randInt(2, 9); return num('t と kg', (t * 1000) + 'kg は 何t？', t, { scratch: false, hint: '1000kg で 1t。', note: (t * 1000) + 'kg = ' + t + 't' }); }
    ],
    boss: [
      function bossDial() { return dialQ(40, 2000); },
      function bossNet() { const box = U.randInt(2, 9) * 100, total = U.randInt(2, 4) * 1000 + U.randInt(0, 9) * 100; return num('重さの 文章題', 'かごに みかんを 入れて はかると ' + kgText(total) + ' でした。かごだけの 重さは ' + box + 'g です。みかんの 重さは 何g？', total - box, { hint: kgText(total) + ' は ' + total + 'g。' + total + ' − ' + box + '。', note: total + ' − ' + box + ' = ' + (total - box) + 'g' }); },
      function bossT() { const t = U.randInt(2, 5), k = U.randInt(1, 9) * 100; return num('t と kg', t + 't − ' + k + 'kg は 何kg？', t * 1000 - k, { hint: t + 't は ' + (t * 1000) + 'kg。', note: (t * 1000) + ' − ' + k + ' = ' + (t * 1000 - k) + 'kg' }); },
      function bossAdd2() { const a = U.randInt(1, 2) * 1000 + U.randInt(1, 9) * 100, b = U.randInt(1, 2) * 1000 + U.randInt(1, 9) * 100; return choice('重さの たし算', '箱の 重さ ' + kgText(a) + '、中身の 重さ ' + kgText(b) + '。ぜんぶで 何kg 何g？', kgChoices(a + b), { key: 'badd2:' + a + ':' + b, hint: 'kg どうし、g どうしを たして、g が 1000 を こえたら くり上げ。', note: kgText(a) + ' + ' + kgText(b) + ' = ' + kgText(a + b) }); }
    ]
  };

  /* =======================================================
     ステージ13 分数（同じ 分母の たし算 ひき算・大小・小数）
     ======================================================= */
  function bunsu(n, d) { return d + '分の' + n; }
  function fracChoices(n, d) {
    return withDistractors(bunsu(n, d), [bunsu(d, n), bunsu(n + 1, d), bunsu(n, d + 1), bunsu(n - 1 || d, d), bunsu(n, d * 2)]);
  }
  function fracFigQ() {
    const d = U.randInt(3, 8), n = U.randInt(1, d - 1);
    const svg = MQ.sansu2 && MQ.sansu2.fracSvg ? MQ.sansu2.fracSvg(d, n) : '';
    return choice('分数', figQ3('色の ついた ところは もとの 大きさの 何分の何？', svg), fracChoices(n, d), {
      key: 'ffig:' + n + '/' + d, hint: d + 'つに 分けた ' + n + 'こ分 だから「' + bunsu(n, d) + '」。', note: d + '等分の ' + n + 'こ分 = ' + bunsu(n, d)
    });
  }
  function fracLenQ() {
    const d = U.randInt(3, 8), n = U.randInt(1, d - 1);
    const thing = pf([['1m の テープ', 'm'], ['1L の ジュース', 'L'], ['1kg の さとう', 'kg']]);
    return choice('分数', thing[0] + 'を ' + d + '等分した ' + n + 'こ分は 何' + thing[1] + '？', fracChoices(n, d), {
      key: 'flen:' + n + '/' + d + thing[1], hint: d + '等分した 1こ分は ' + bunsu(1, d) + thing[1] + '。それが ' + n + 'こ。', note: bunsu(n, d) + thing[1]
    });
  }
  function fracUnitsQ() {
    const d = U.randInt(3, 9), n = U.randInt(2, d - 1);
    return num('分数の しくみ', bunsu(n, d) + ' は ' + bunsu(1, d) + ' の 何こ分？', n, { scratch: false, hint: '分子（上の 数）が こ数だよ。', note: bunsu(n, d) + ' = ' + bunsu(1, d) + ' が ' + n + 'こ' });
  }
  function fracAddQ() {
    const d = U.randInt(3, 9), a = U.randInt(1, d - 2), b = U.randInt(1, d - 1 - a);
    return num('分数の たし算', '<span class="num">' + bunsu(a, d) + ' + ' + bunsu(b, d) + '</span> = ' + d + '分の □。□は？', a + b, {
      scratch: false, hint: bunsu(1, d) + ' が ' + a + 'こ と ' + b + 'こ。分子だけ たそう。', note: bunsu(a, d) + ' + ' + bunsu(b, d) + ' = ' + bunsu(a + b, d)
    });
  }
  function fracSubQ() {
    const d = U.randInt(3, 9), a = U.randInt(2, d - 1), b = U.randInt(1, a - 1);
    return num('分数の ひき算', '<span class="num">' + bunsu(a, d) + ' − ' + bunsu(b, d) + '</span> = ' + d + '分の □。□は？', a - b, {
      scratch: false, hint: bunsu(1, d) + ' が ' + a + 'こ から ' + b + 'こ へる。分子だけ ひこう。', note: bunsu(a, d) + ' − ' + bunsu(b, d) + ' = ' + bunsu(a - b, d)
    });
  }
  function fracCompareQ() {
    const d = U.randInt(3, 9), a = U.randInt(1, d - 1);
    let b = U.randInt(1, d - 1);
    if (b === a) b = a === d - 1 ? a - 1 : a + 1;
    const big = Math.max(a, b);
    return choice('分数の 大きさ', bunsu(a, d) + ' と ' + bunsu(b, d) + '。大きいのは？', [bunsu(big, d), bunsu(Math.min(a, b), d)], {
      key: 'fcmp:' + a + ':' + b + '/' + d, hint: '分母が 同じなら、分子の 大きい ほうが 大きいよ。', note: bunsu(big, d) + ' の ほうが 大きい'
    });
  }
  function oneAsFracQ() {
    const d = U.randInt(2, 9);
    return num('1 と 分数', '1 = ' + d + '分の □。□は？', d, { scratch: false, hint: d + '分の ' + d + ' で ちょうど 1。', note: '1 = ' + bunsu(d, d) });
  }
  function oneMinusFracQ() {
    const d = U.randInt(3, 9), a = U.randInt(1, d - 1);
    return num('1 から ひく', '<span class="num">1 − ' + bunsu(a, d) + '</span> = ' + d + '分の □。□は？', d - a, {
      scratch: false, hint: '1 は ' + bunsu(d, d) + '。' + d + ' − ' + a + '。', note: '1 − ' + bunsu(a, d) + ' = ' + bunsu(d - a, d)
    });
  }
  function fracToDecQ() {
    const n = U.randInt(1, 9);
    return dec('分数と 小数', bunsu(n, 10) + ' を 小数で 書くと？', n, { scratch: false, hint: '10分の1 = 0.1。', note: bunsu(n, 10) + ' = 0.' + n });
  }
  function decToFracQ() {
    const n = U.randInt(1, 9);
    return choice('分数と 小数', '0.' + n + ' を 分数で 書くと？', withDistractors(bunsu(n, 10), [bunsu(10, n), bunsu(n, 100), bunsu(1, n), bunsu(n + 1, 10)]), {
      key: 'd2f:' + n, hint: '0.1 = 10分の1。', note: '0.' + n + ' = ' + bunsu(n, 10)
    });
  }
  function fracSumOneQ() {
    const d = U.randInt(3, 9), a = U.randInt(1, d - 1);
    return choice('分数の たし算', '<span class="num">' + bunsu(a, d) + ' + ' + bunsu(d - a, d) + '</span> = ？', withDistractors('1', [bunsu(d, d * 2), bunsu(a, d), '2', bunsu(d - a, d)]), {
      key: 'fsum1:' + a + '/' + d, hint: '分子を たすと ' + d + '。' + bunsu(d, d) + ' は ちょうど 1。', note: bunsu(a, d) + ' + ' + bunsu(d - a, d) + ' = ' + bunsu(d, d) + ' = 1'
    });
  }
  function fracWordQ() {
    const d = U.randInt(3, 9), a = U.randInt(1, d - 2), b = U.randInt(1, d - 1 - a);
    const w = pf([['ジュースを ' + bunsu(a, d) + 'L のみ、あとで ' + bunsu(b, d) + 'L のみました。合わせて 何L のんだ？', a + b], ['1L の 牛にゅうの うち ' + bunsu(a + b, d) + 'L を 使いました。のこりは 何L？', d - a - b]]);
    return num('分数の 文章題', w[0] + ' 答えは ' + d + '分の □。□は？', w[1], {
      scratch: false, hint: '分母は そのまま、分子を 計算しよう。', note: '答えは ' + bunsu(w[1], d) + 'L'
    });
  }
  function fracLineQ() {
    const d = U.randInt(3, 8), n = U.randInt(1, d - 1);
    return choice('分数の 数直線', lineSvg(1, d, n, d, function (v) { return v === 0 ? '0' : '1'; }) + '0 から 1 を ' + d + '等分。↓ の 目もりは？', fracChoices(n, d), {
      key: 'fline:' + n + '/' + d, hint: '1目もりは ' + bunsu(1, d) + '。0 から ' + n + 'こめ。', note: bunsu(n, d)
    });
  }
  const stage13 = {
    easy: [fracFigQ, fracLenQ, fracUnitsQ, oneAsFracQ],
    normal: [fracAddQ, fracSubQ, fracCompareQ, fracLineQ, fracToDecQ],
    hard: [oneMinusFracQ, fracSumOneQ, decToFracQ, fracWordQ],
    boss: [function b1() { return fracWordQ(); }, function b2() { return oneMinusFracQ(); }, function b3() { return fracSumOneQ(); }, function b4() { return fracLineQ(); }]
  };

  /* =======================================================
     ここから 3学期（ステージ 14〜18・v6.3・2026-09-05）
     ======================================================= */

  /* ---- 3学期の 図（三角形・角・テープ図・そろばん） ---- */
  // 三角形。kind: iso（二等辺）/ equi（正）/ sca（ふつう）。labels: [左の辺, 右の辺, 底辺]（null で 出さない）。corners: ['あ','い','う']（上・左下・右下）
  const TRI_PTS = {
    iso:  [[80, 14], [30, 104], [130, 104]],
    equi: [[80, 16], [30, 103], [130, 103]],
    sca:  [[56, 16], [18, 104], [142, 104]]
  };
  function triSvg(kind, labels, corners) {
    const p = TRI_PTS[kind] || TRI_PTS.sca;
    let s = '<polygon points="' + p.map(function (q) { return q.join(','); }).join(' ') + '" fill="' + FF + '" stroke="' + FS + '" stroke-width="4" stroke-linejoin="round"/>';
    if (labels) {
      const mids = [
        [(p[0][0] + p[1][0]) / 2 - 14, (p[0][1] + p[1][1]) / 2 - 2],
        [(p[0][0] + p[2][0]) / 2 + 14, (p[0][1] + p[2][1]) / 2 - 2],
        [(p[1][0] + p[2][0]) / 2, p[1][1] + 14]
      ];
      labels.forEach(function (t, i) {
        if (t == null) return;
        s += '<text x="' + mids[i][0] + '" y="' + mids[i][1] + '" font-size="12" font-weight="bold" text-anchor="middle" fill="' + FR + '">' + t + '</text>';
      });
    }
    if (corners) {
      const at = [[p[0][0], p[0][1] + 24], [p[1][0] + 18, p[1][1] - 6], [p[2][0] - 18, p[2][1] - 6]];
      corners.forEach(function (t, i) {
        if (t == null) return;
        s += '<text x="' + at[i][0] + '" y="' + at[i][1] + '" font-size="12" font-weight="bold" text-anchor="middle" fill="' + FB + '">' + t + '</text>';
      });
    }
    return svgBox(s);
  }
  // 角を 2つ ならべる（あ・い）。deg は 開きぐあい、len は 辺の 長さ（小さい 角に 長い 辺を つけて ひっかけに できる）
  function anglePart(vx, vy, deg, len, label) {
    const a = deg * Math.PI / 180;
    const ex = vx + Math.cos(a) * len, ey = vy - Math.sin(a) * len;
    let s = '<line x1="' + vx + '" y1="' + vy + '" x2="' + (vx + len) + '" y2="' + vy + '" stroke="' + FS + '" stroke-width="3.5" stroke-linecap="round"/>';
    s += '<line x1="' + vx + '" y1="' + vy + '" x2="' + ex + '" y2="' + ey + '" stroke="' + FS + '" stroke-width="3.5" stroke-linecap="round"/>';
    const r = 16;
    s += '<path d="M ' + (vx + r) + ' ' + vy + ' A ' + r + ' ' + r + ' 0 ' + (deg > 180 ? 1 : 0) + ' 0 ' + (vx + Math.cos(a) * r) + ' ' + (vy - Math.sin(a) * r) + '" fill="none" stroke="' + FR + '" stroke-width="2.5"/>';
    s += '<text x="' + (vx + 6) + '" y="' + (vy + 16) + '" font-size="13" font-weight="bold" fill="' + FB + '">' + label + '</text>';
    return s;
  }
  function anglesSvg(degA, lenA, degB, lenB) {
    return svgBox(anglePart(28, 92, degA, lenA, 'あ') + anglePart(106, 92, degB, lenB, 'い'));
  }
  // 三角じょうぎ 2まい（あ＝直角二等辺・い＝30/60/90）。flip で あ・い を 入れかえる
  function setSquareSvg(flip) {
    function one(ox, kind, label) {
      const pts = kind === 'iso'
        ? [[ox + 6, 104], [ox + 66, 104], [ox + 6, 44]]
        : [[ox + 6, 104], [ox + 66, 104], [ox + 66, 22]];
      let s = '<polygon points="' + pts.map(function (q) { return q.join(','); }).join(' ') + '" fill="' + FF + '" stroke="' + FS + '" stroke-width="4" stroke-linejoin="round"/>';
      const rx = kind === 'iso' ? ox + 6 : ox + 66;
      s += '<rect x="' + (kind === 'iso' ? rx : rx - 8) + '" y="96" width="8" height="8" fill="none" stroke="' + FR + '" stroke-width="1.5"/>';
      s += '<text x="' + (ox + 36) + '" y="118" font-size="12" font-weight="bold" text-anchor="middle" fill="' + FB + '">' + label + '</text>';
      return s;
    }
    return svgBox(flip ? one(4, 'sca', 'あ') + one(84, 'iso', 'い') : one(4, 'iso', 'あ') + one(84, 'sca', 'い'));
  }
  // 円の 中に 三角形（中心と 円周の 2点）。rLabel は 半径の 文字
  function circleTriSvg(rLabel) {
    const cx = 80, cy = 62, r = 46;
    let s = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#fff" stroke="' + FS + '" stroke-width="3"/>';
    const a1 = -Math.PI * 0.72, a2 = -Math.PI * 0.28;
    const p1 = [cx + Math.cos(a1) * r, cy + Math.sin(a1) * r], p2 = [cx + Math.cos(a2) * r, cy + Math.sin(a2) * r];
    s += '<polygon points="' + cx + ',' + cy + ' ' + p1.join(',') + ' ' + p2.join(',') + '" fill="' + FF + '" stroke="' + FR + '" stroke-width="3.5" stroke-linejoin="round"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="3.5" fill="' + FS + '"/>';
    if (rLabel) s += '<text x="' + (cx - 30) + '" y="' + (cy - 14) + '" font-size="12" font-weight="bold" fill="' + FR + '">' + rLabel + '</text>';
    return svgBox(s);
  }
  // テープ図（倍の 見方）。上「あ」が 下「い」の times 倍。labels: [あの 文字, いの 文字]
  function tapeSvg(times, labels) {
    const left = 30, full = 124, unit = full / Math.max(times, 1);
    let s = '';
    s += '<text x="8" y="38" font-size="13" font-weight="bold" fill="' + FB + '">あ</text>';
    s += '<rect x="' + left + '" y="24" width="' + full + '" height="20" fill="' + FR + '" stroke="' + FS + '" stroke-width="2"/>';
    for (let i = 1; i < times; i++) s += '<line x1="' + (left + unit * i) + '" y1="24" x2="' + (left + unit * i) + '" y2="44" stroke="#fff" stroke-width="1.5" stroke-dasharray="3 2"/>';
    s += '<text x="8" y="86" font-size="13" font-weight="bold" fill="' + FB + '">い</text>';
    s += '<rect x="' + left + '" y="72" width="' + unit + '" height="20" fill="' + FB + '" stroke="' + FS + '" stroke-width="2"/>';
    if (labels) {
      s += '<text x="' + (left + full / 2) + '" y="16" font-size="12" font-weight="bold" text-anchor="middle" fill="' + FS + '">' + labels[0] + '</text>';
      s += '<text x="' + (left + unit / 2) + '" y="108" font-size="12" font-weight="bold" text-anchor="middle" fill="' + FS + '">' + labels[1] + '</text>';
    }
    return svgBox(s);
  }
  // そろばん。digits: 上の 位から ならべた 数字の 配列、unitIdx: 一の位の 列（定位点）
  function sorobanSvg(digits, unitIdx) {
    const cols = digits.length, gap = Math.min(30, 130 / cols), x0 = 80 - gap * (cols - 1) / 2;
    const top = 8, bot = 116, bar = 40;
    let s = '<rect x="' + (x0 - gap / 2 - 4) + '" y="' + top + '" width="' + (gap * cols + 8) + '" height="' + (bot - top) + '" rx="4" fill="#E9D3A8" stroke="#6B4A22" stroke-width="3"/>';
    s += '<line x1="' + (x0 - gap / 2 - 4) + '" y1="' + bar + '" x2="' + (x0 + gap * (cols - 0.5) + 4) + '" y2="' + bar + '" stroke="#6B4A22" stroke-width="3"/>';
    for (let c = 0; c < cols; c++) {
      const x = x0 + gap * c, d = digits[c];
      s += '<line x1="' + x + '" y1="' + (top + 2) + '" x2="' + x + '" y2="' + (bot - 2) + '" stroke="#8A6A3A" stroke-width="1.5"/>';
      // 定位点（一の位・その 3つ ごと）
      if ((c - unitIdx) % 3 === 0) s += '<circle cx="' + x + '" cy="' + bar + '" r="2.4" fill="#fff" stroke="#6B4A22" stroke-width="1"/>';
      // 五玉（はりの 上）。5 いじょうなら はりに つける
      const fy = d >= 5 ? bar - 8 : top + 10;
      s += '<ellipse cx="' + x + '" cy="' + fy + '" rx="' + (gap / 2 - 2) + '" ry="6" fill="' + (d >= 5 ? '#D42A20' : '#B98A5A') + '" stroke="#3A2610" stroke-width="1.2"/>';
      // 一玉 4つ（はりの 下）。d%5 こが はりに つく
      const up = d % 5;
      for (let i = 0; i < 4; i++) {
        const y = i < up ? bar + 8 + i * 13 : bot - 8 - (3 - i) * 13;
        s += '<ellipse cx="' + x + '" cy="' + y + '" rx="' + (gap / 2 - 2) + '" ry="6" fill="' + (i < up ? '#D42A20' : '#B98A5A') + '" stroke="#3A2610" stroke-width="1.2"/>';
      }
    }
    return svgBox(s);
  }
  function digitsOf(n, len) {
    const out = [];
    for (let i = 0; i < len; i++) { out.unshift(n % 10); n = Math.floor(n / 10); }
    return out;
  }

  /* =======================================================
     ステージ14 □を 使った 式
     ======================================================= */
  // 場面の 文。□＝わからない 数、○＝わかっている 数、△＝けっか
  const BOX_STORY = {
    addL: [['はじめに シールが □まい ありました。○まい もらったので、ぜんぶで △まいに なりました。', 'まい'],
           ['水そうに 金魚が □ひき いました。○ひき 入れたので、△ひきに なりました。', 'ひき'],
           ['ちょ金ばこに □円 入って いました。○円 入れたので、△円に なりました。', '円']],
    addR: [['ノートを ○さつ もって いました。□さつ 買ったので、ぜんぶで △さつに なりました。', 'さつ'],
           ['おり紙を ○まい もって いました。□まい もらったので、△まいに なりました。', 'まい']],
    subL: [['あめが □こ ありました。○こ 食べたので、のこりは △こに なりました。', 'こ'],
           ['シールを □まい もって いました。○まい あげたので、のこりは △まいに なりました。', 'まい'],
           ['□円 もって いました。○円の 本を 買ったので、のこりは △円に なりました。', '円']],
    subR: [['色紙が ○まい ありました。□まい 使ったので、のこりは △まいに なりました。', 'まい'],
           ['○円 もって いました。□円の おかしを 買ったので、のこりは △円に なりました。', '円']],
    mulL: [['1ふくろに □こずつ 入った みかんを ○ふくろ 買ったら、ぜんぶで △こでした。', 'こ'],
           ['1本 □円の えんぴつを ○本 買ったら、ぜんぶで △円でした。', '円'],
           ['1はこに □こずつ 入った チョコが ○はこ あって、ぜんぶで △こです。', 'こ']],
    mulR: [['1本 ○円の ジュースを □本 買ったら、ぜんぶで △円でした。', '本'],
           ['1人に ○まいずつ 色紙を くばります。□人に くばったら、ぜんぶで △まい いりました。', '人']],
    divL: [['□まいの 色紙を ○人で 同じ 数ずつ 分けたら、1人分は △まいに なりました。', 'まい'],
           ['□この いちごを 1さらに ○こずつ のせたら、△さらに なりました。', 'さら']]
  };
  const BOX_SIGN = { addL: '+', addR: '+', subL: '−', subR: '−', mulL: '×', mulR: '×', divL: '÷' };
  // 式の 文字（□ + 5 = 12 など）
  function boxEq(kind, a, b) {
    const sg = BOX_SIGN[kind];
    if (kind === 'addR' || kind === 'mulR' || kind === 'subR') return a + ' ' + sg + ' □ = ' + b;
    return '□ ' + sg + ' ' + a + ' = ' + b;
  }
  // 数を きめる。かえす: { a: わかっている 数, b: けっか, x: □の 数 }
  function boxNums(kind, big) {
    let x, a;
    if (kind === 'addL' || kind === 'addR') { x = big ? U.randInt(120, 680) : U.randInt(12, 68); a = big ? U.randInt(100, 300) : U.randInt(5, 29); return { a: a, b: x + a, x: x }; }
    if (kind === 'subL') { x = big ? U.randInt(300, 900) : U.randInt(30, 90); a = big ? U.randInt(100, 280) : U.randInt(5, 28); return { a: a, b: x - a, x: x }; }
    if (kind === 'subR') { a = big ? U.randInt(400, 900) : U.randInt(40, 90); x = big ? U.randInt(100, 350) : U.randInt(5, 35); return { a: a, b: a - x, x: x }; }
    if (kind === 'mulL' || kind === 'mulR') {
      a = U.randInt(2, 9);
      if (big) { do { x = U.randInt(11, 49); } while (Math.floor(x / 10) * a >= 10 || (x % 10) * a >= 10); }   // 各位で わりきれる（96 ÷ 3 の 形）
      else x = U.randInt(2, 9);
      return { a: a, b: x * a, x: x };
    }
    // divL: □ ÷ a = b
    a = U.randInt(2, 9); const q = big ? U.randInt(10, 12) : U.randInt(2, 9); return { a: a, b: q, x: q * a };
  }
  function boxHow(kind, n) {
    if (kind === 'addL' || kind === 'addR') return n.b + ' − ' + n.a;
    if (kind === 'subL') return n.b + ' + ' + n.a;
    if (kind === 'subR') return n.a + ' − ' + n.b;
    if (kind === 'mulL' || kind === 'mulR') return n.b + ' ÷ ' + n.a;
    return n.b + ' × ' + n.a;
  }
  function boxHint(kind) {
    if (kind === 'addL' || kind === 'addR') return 'たし算の □は、答えから たした 数を ひくと わかるよ。';
    if (kind === 'subL') return 'ひかれる 数は、答えに ひいた 数を たすと もどるよ。';
    if (kind === 'subR') return 'ひいた 数は、はじめの 数から 答えを ひくと わかるよ。';
    if (kind === 'mulL' || kind === 'mulR') return 'かけ算の □は、答えを かけた 数で わると わかるよ。';
    return 'わり算の □は、答えに わった 数を かけると もどるよ。';
  }
  const BOX_KINDS = ['addL', 'addR', 'subL', 'subR', 'mulL', 'mulR', 'divL'];
  // 中身が 同じに なる 式（□ + 12 = 40 と 12 + □ = 40）。まちがいの 候補に 入れない
  const BOX_MIRROR = { addL: 'addR', addR: 'addL', mulL: 'mulR', mulR: 'mulL' };
  // 式だけ：□ + 24 = 61 → □は？
  function eqQ(kind, big) {
    const n = boxNums(kind, big);
    return num('□を 使った 式', '<span class="num">' + boxEq(kind, n.a, n.b) + '</span><br>□に 入る 数は？', n.x, {
      hint: boxHint(kind) + ' ' + boxHow(kind, n) + '。', note: boxEq(kind, n.a, n.b).replace('□', n.x)
    });
  }
  // 場面 → 式を えらぶ
  function pickEqQ(kind) {
    const st = pf(BOX_STORY[kind]), n = boxNums(kind, false);
    const text = st[0].replace('□', '□').replace('○', n.a).replace('△', n.b);
    const wrong = BOX_KINDS.filter(function (k) { return k !== kind && k !== BOX_MIRROR[kind]; }).map(function (k) { return boxEq(k, n.a, n.b); });
    wrong.push(n.b + ' ' + BOX_SIGN[kind] + ' ' + n.a + ' = □');
    return choice('場面と 式', text + ' わからない 数を □と して、式に 書くと？', withDistractors(boxEq(kind, n.a, n.b), wrong), {
      key: 'peq:' + kind + ':' + n.a + ':' + n.b + ':' + st[1],
      hint: 'ことばの じゅんばんの とおりに 式に しよう。「ぜんぶで」は たし算、「のこり」は ひき算、「ずつ」は かけ算か わり算。',
      note: '式は ' + boxEq(kind, n.a, n.b) + '。□ = ' + n.x
    });
  }
  // 場面 → □の 数
  function storyQ(kind, big) {
    const st = pf(BOX_STORY[kind]), n = boxNums(kind, big);
    const text = st[0].replace('○', n.a).replace('△', n.b);
    return num('□を 使った 式', text + ' □は いくつ？', n.x, {
      key: 'story:' + kind + ':' + n.a + ':' + n.b + ':' + st[1],
      hint: '式は ' + boxEq(kind, n.a, n.b) + '。' + boxHint(kind), note: boxHow(kind, n) + ' = ' + n.x
    });
  }
  // □の もとめ方（式を えらぶ）
  function howQ(kind) {
    const n = boxNums(kind, false);
    const right = boxHow(kind, n);
    const cands = [n.b + ' + ' + n.a, n.b + ' − ' + n.a, n.a + ' − ' + n.b, n.b + ' × ' + n.a, n.b + ' ÷ ' + n.a, n.a + ' ÷ ' + n.b, n.a + ' × ' + n.b];
    return choice('□の もとめ方', '<span class="num">' + boxEq(kind, n.a, n.b) + '</span><br>□を もとめる 式は？', withDistractors(right, cands), {
      key: 'how:' + kind + ':' + n.a + ':' + n.b, hint: boxHint(kind), note: '□ = ' + right + ' = ' + n.x
    });
  }
  const stage14 = {
    easy: [
      function e1() { return eqQ(pf(['addL', 'addR']), false); },
      function e2() { return eqQ('subL', false); },
      function e3() { return howQ(pf(['addL', 'subL', 'addR'])); },
      function e4() { return pickEqQ(pf(['addL', 'subL'])); }
    ],
    normal: [
      function n1() { return eqQ('subR', false); },
      function n2() { return eqQ(pf(['mulL', 'mulR']), false); },
      function n3() { return storyQ(pf(['addL', 'addR', 'subL']), false); },
      function n4() { return pickEqQ(pf(['mulL', 'subR', 'addR'])); },
      function n5() { return howQ(pf(['mulL', 'subR', 'divL'])); }
    ],
    hard: [
      function h1() { return eqQ('divL', false); },
      function h2() { return eqQ(pf(['addL', 'subL', 'subR']), true); },
      function h3() { return storyQ(pf(['subR', 'mulL', 'mulR', 'divL']), false); },
      function h4() { return pickEqQ(pf(['divL', 'mulR'])); },
      function h5() { return eqQ('mulL', true); }
    ],
    boss: [
      function b1() { return storyQ(pf(['addL', 'subL', 'subR']), true); },
      function b2() { return eqQ('divL', true); },
      function b3() { return storyQ('divL', false); },
      function b4() { return eqQ(pf(['subR', 'mulR']), true); }
    ]
  };

  /* =======================================================
     ステージ15 倍の 見方
     ======================================================= */
  const BAI_THINGS = [['赤い テープ', '青い テープ', 'cm'], ['長い ひも', '短い ひも', 'cm'], ['大きい 木', '小さい 木', 'm'], ['ジュース', '牛にゅう', 'dL'], ['ビルの 高さ', '家の 高さ', 'm'], ['お兄さんの ビー玉', '弟の ビー玉', 'こ'], ['白い リボン', '赤い リボン', 'cm']];
  function timesOfQ(big) {
    const t = pf(BAI_THINGS), k = U.randInt(2, 9), base = big ? U.randInt(12, 24) : U.randInt(2, 9);
    return num('何倍', t[0] + 'は ' + (base * k) + t[2] + '、' + t[1] + 'は ' + base + t[2] + '。' + t[0] + 'は ' + t[1] + 'の 何倍？', k, {
      key: 'times:' + t[0] + ':' + base + ':' + k, scratch: !!big,
      hint: '何倍かを もとめる ときは わり算。' + (base * k) + ' ÷ ' + base + '。', note: (base * k) + ' ÷ ' + base + ' = ' + k + '（' + k + '倍）'
    });
  }
  function timesAmountQ(big) {
    const t = pf(BAI_THINGS), k = U.randInt(2, 9), base = big ? U.randInt(12, 48) : U.randInt(2, 9);
    return num('何倍かの 大きさ', t[1] + 'は ' + base + t[2] + '。' + t[0] + 'は ' + t[1] + 'の ' + k + '倍です。' + t[0] + 'は 何' + t[2] + '？', base * k, {
      key: 'amount:' + t[0] + ':' + base + ':' + k, scratch: !!big,
      hint: k + '倍は かけ算。' + base + ' × ' + k + '。', note: base + ' × ' + k + ' = ' + (base * k) + t[2]
    });
  }
  function baseAmountQ(big) {
    const t = pf(BAI_THINGS), k = U.randInt(2, 9);
    let base = U.randInt(2, 9);
    if (big) { do { base = U.randInt(11, 33); } while (Math.floor(base / 10) * k >= 10 || (base % 10) * k >= 10); }
    return num('もとに する 大きさ', t[0] + 'は ' + (base * k) + t[2] + 'で、' + t[1] + 'の ' + k + '倍です。' + t[1] + 'は 何' + t[2] + '？', base, {
      key: 'base:' + t[0] + ':' + base + ':' + k, scratch: !!big,
      hint: 'もとに する 大きさを □と すると、□ × ' + k + ' = ' + (base * k) + '。□は ' + (base * k) + ' ÷ ' + k + '。', note: (base * k) + ' ÷ ' + k + ' = ' + base + t[2]
    });
  }
  function tapeTimesQ() {
    const k = U.randInt(2, 6), base = U.randInt(2, 9);
    return num('テープ図', figQ3('あの テープは いの 何倍？', tapeSvg(k, [(base * k) + 'cm', base + 'cm'])), k, {
      key: 'tape:' + k + ':' + base, scratch: false,
      hint: 'いの 長さで あを はかると、何こ分 あるかな。' + (base * k) + ' ÷ ' + base + '。', note: (base * k) + ' ÷ ' + base + ' = ' + k + '（' + k + '倍）'
    });
  }
  function tapeBaseQ() {
    const k = U.randInt(2, 6), base = U.randInt(2, 9);
    return num('テープ図', figQ3('あは いの ' + k + '倍で ' + (base * k) + 'cm。いは 何cm？', tapeSvg(k, [(base * k) + 'cm', '？cm'])), base, {
      key: 'tapeb:' + k + ':' + base, scratch: false,
      hint: 'い × ' + k + ' = ' + (base * k) + '。いは ' + (base * k) + ' ÷ ' + k + '。', note: (base * k) + ' ÷ ' + k + ' = ' + base + 'cm'
    });
  }
  function tapeAmountQ() {
    const k = U.randInt(2, 6), base = U.randInt(2, 9);
    return num('テープ図', figQ3('あは いの ' + k + '倍。あは 何cm？', tapeSvg(k, ['？cm', base + 'cm'])), base * k, {
      key: 'tapea:' + k + ':' + base, scratch: false,
      hint: base + 'cm の ' + k + 'こ分。' + base + ' × ' + k + '。', note: base + ' × ' + k + ' = ' + (base * k) + 'cm'
    });
  }
  function priceTimesQ() {
    const it = pf([['ケーキ', 'プリン'], ['本', 'ノート'], ['くつ', 'くつ下'], ['かばん', 'ハンカチ']]);
    const base = U.randInt(11, 32) * 10, k = U.randInt(2, 4);
    return num('ねだんの 倍', it[1] + 'の ねだんは ' + base + '円。' + it[0] + 'は ' + it[1] + 'の ' + k + '倍の ねだんです。' + it[0] + 'は 何円？', base * k, {
      key: 'price:' + it[0] + ':' + base + ':' + k,
      hint: base + ' × ' + k + ' を 筆算で。', note: base + ' × ' + k + ' = ' + (base * k) + '円'
    });
  }
  function twoStepQ() {
    const base = U.randInt(2, 5), k1 = U.randInt(2, 4), k2 = U.randInt(2, 3);
    return num('倍の 倍', '赤の リボンは ' + base + 'cm。青は 赤の ' + k1 + '倍、黄は 青の ' + k2 + '倍です。黄の リボンは 何cm？', base * k1 * k2, {
      key: 'two:' + base + ':' + k1 + ':' + k2,
      hint: 'まず 青 = ' + base + ' × ' + k1 + ' = ' + (base * k1) + '。つぎに 黄 = ' + (base * k1) + ' × ' + k2 + '。', note: base + ' × ' + k1 + ' × ' + k2 + ' = ' + (base * k1 * k2) + 'cm'
    });
  }
  function whichOpQ() {
    const w = pf([
      ['「12 は 3 の 何倍？」を もとめる 式は？', '12 ÷ 3', ['12 × 3', '12 − 3', '12 + 3']],
      ['「4 の 5倍」を もとめる 式は？', '4 × 5', ['4 ÷ 5', '5 ÷ 4', '4 + 5']],
      ['「ある 数の 6倍が 42。ある 数は？」を もとめる 式は？', '42 ÷ 6', ['42 × 6', '42 − 6', '6 ÷ 42']],
      ['「24 は 8 の 何倍？」を もとめる 式は？', '24 ÷ 8', ['24 × 8', '24 − 8', '8 ÷ 24']],
      ['「7 の 3倍」を もとめる 式は？', '7 × 3', ['7 ÷ 3', '3 ÷ 7', '7 + 3']],
      ['「ある 数の 4倍が 36。ある 数は？」を もとめる 式は？', '36 ÷ 4', ['36 × 4', '36 − 4', '4 ÷ 36']]
    ]);
    return choice('倍と 式', w[0], [w[1]].concat(w[2]), {
      key: 'whichop:' + w[1], hint: '「何倍」と「もとの 大きさ」は わり算、「○倍の 大きさ」は かけ算。', note: w[1]
    });
  }
  const stage15 = {
    easy: [function e1() { return timesOfQ(false); }, function e2() { return timesAmountQ(false); }, tapeTimesQ, whichOpQ],
    normal: [function n1() { return baseAmountQ(false); }, tapeBaseQ, tapeAmountQ, function n4() { return timesAmountQ(true); }, whichOpQ],
    hard: [function h1() { return timesOfQ(true); }, function h2() { return baseAmountQ(true); }, priceTimesQ, twoStepQ],
    boss: [function b1() { return baseAmountQ(true); }, function b2() { return twoStepQ(); }, function b3() { return priceTimesQ(); }, function b4() { return timesOfQ(true); }]
  };

  /* =======================================================
     ステージ16 三角形と 角
     ======================================================= */
  const TRI_NAMES = ['二等辺三角形', '正三角形', 'どちらでも ない'];
  function triChoices(kind) {
    const right = kind === 'iso' ? TRI_NAMES[0] : kind === 'equi' ? TRI_NAMES[1] : TRI_NAMES[2];
    return [right].concat(TRI_NAMES.filter(function (n) { return n !== right; }));
  }
  const TRI_WORDS = [
    ['2つの 辺（へん）の 長さが 等しい 三角形を 何と いう？', '二等辺三角形', ['正三角形', '直角三角形', '四角形'], '「二等辺」は 2つの 辺が 等しい と いう 意味。'],
    ['3つの 辺（へん）の 長さが みんな 等しい 三角形を 何と いう？', '正三角形', ['二等辺三角形', '直角三角形', '長方形'], '「正」は 辺も 角も みんな 同じ と いう 意味。'],
    ['二等辺三角形は、いくつの 角の 大きさが 等しい？', '2つ', ['3つ', '1つ', 'ない'], 'まん中で おると 2つの 角が ぴったり かさなるよ。'],
    ['正三角形の 3つの 角の 大きさは？', 'みんな 等しい', ['2つだけ 等しい', 'ぜんぶ ちがう', '1つは 直角'], '正三角形は 3つの 角が みんな 同じ 大きさ。'],
    ['角の 大きさは 何で 決まる？', '辺の 開きぐあい', ['辺の 長さ', '三角形の 大きさ', '辺の 数'], '辺が 長くても 短くても、開きぐあいが 同じなら 角の 大きさは 同じ。'],
    ['1組の 三角じょうぎの うち、二等辺三角形は 何まい？', '1まい', ['2まい', '0まい', '3まい'], '直角の となりの 2つの 角が 同じ ほうの 三角じょうぎが 二等辺三角形。'],
    ['円の 中心と、円のまわりの 2つの 点を むすんで できる 三角形は？', '二等辺三角形', ['正三角形', 'どちらでも ない', '四角形'], '中心から 円のまわりまでは どこも 半径で 同じ 長さ。だから 2つの 辺が 等しい。']
  ];
  function triWordQ() {
    const w = pf(TRI_WORDS);
    return choice('三角形', w[0], [w[1]].concat(w[2]), { key: 'tw:' + w[1] + ':' + w[0].slice(0, 6), hint: w[3], note: w[1] });
  }
  function sidesKind() {
    const r = Math.random();
    if (r < 0.4) { const a = U.randInt(3, 9); let c; do { c = U.randInt(2, 9); } while (c === a || c >= a * 2); return { kind: 'iso', s: U.shuffle([a, a, c]) }; }
    if (r < 0.7) { const a = U.randInt(3, 9); return { kind: 'equi', s: [a, a, a] }; }
    let a, b, c; do { a = U.randInt(3, 9); b = U.randInt(3, 9); c = U.randInt(3, 9); } while (a === b || b === c || a === c || a + b <= c || b + c <= a || a + c <= b);
    return { kind: 'sca', s: [a, b, c] };
  }
  function sidesQ() {
    const t = sidesKind();
    return choice('三角形の 名前', '辺（へん）の 長さが ' + t.s.join('cm、') + 'cm の 三角形は？', triChoices(t.kind), {
      key: 'sides:' + t.s.join(','), hint: '同じ 長さの 辺が いくつ あるか 数えよう。2つなら 二等辺三角形、3つなら 正三角形。',
      note: t.s.join('cm、') + 'cm → ' + triChoices(t.kind)[0]
    });
  }
  function figNameQ() {
    const t = sidesKind();
    let labels;
    if (t.kind === 'iso') { const eq = t.s.filter(function (v, i, arr) { return arr.indexOf(v) !== i; })[0]; const other = t.s.filter(function (v) { return v !== eq; })[0]; labels = [eq + 'cm', eq + 'cm', other + 'cm']; }
    else labels = t.s.map(function (v) { return v + 'cm'; });
    return choice('三角形の 名前', figQ3('この 三角形の 名前は？', triSvg(t.kind, labels)), triChoices(t.kind), {
      key: 'fname:' + t.kind + ':' + labels.join(','), hint: '辺の 長さを 見くらべよう。同じ 長さの 辺が 2つ → 二等辺三角形、3つ → 正三角形。',
      note: labels.join('、') + ' → ' + triChoices(t.kind)[0]
    });
  }
  function angleCmpQ(trick) {
    let a = U.randInt(20, 115), b = U.randInt(20, 115);
    while (Math.abs(a - b) < 25) b = U.randInt(20, 115);
    const bigIsA = a > b;
    const lenA = trick ? (bigIsA ? 32 : 50) : U.randInt(36, 50), lenB = trick ? (bigIsA ? 50 : 32) : U.randInt(36, 50);
    return choice('角の 大きさ', figQ3('角が 大きいのは どっち？', anglesSvg(a, lenA, b, lenB)), [bigIsA ? 'あ' : 'い', bigIsA ? 'い' : 'あ'], {
      key: 'acmp:' + a + ':' + b + ':' + (trick ? 't' : 'n'), hint: '辺の 長さでは なく、辺の 開きぐあいで くらべよう。' + (trick ? '辺が 長い ほうが 大きい とは かぎらないよ。' : ''),
      note: (bigIsA ? 'あ' : 'い') + ' の ほうが 開いて いる'
    });
  }
  function isoAngleQ() {
    const eq = U.randInt(4, 9), other = pf([eq - 1, eq - 2, eq + 1].filter(function (v) { return v >= 2 && v < eq * 2; }));
    // 上が あ、左下が い、右下が う。等しい 角は い と う
    const ask = pf(['い', 'う']);
    const ans = ask === 'い' ? 'う' : 'い';
    return choice('二等辺三角形の 角', figQ3('二等辺三角形。角' + ask + ' と 同じ 大きさの 角は？', triSvg('iso', [eq + 'cm', eq + 'cm', other + 'cm'], ['あ', 'い', 'う'])), [ans, 'あ', 'ない'], {
      key: 'isoang:' + eq + ':' + other + ':' + ask, hint: '二等辺三角形は、等しい 2つの 辺の 下に ある 2つの 角が 同じ 大きさ。',
      note: '角' + ask + ' = 角' + ans
    });
  }
  function perimeterQ(kind) {
    if (kind === 'equi') {
      const a = U.randInt(3, 9);
      return num('まわりの 長さ', figQ3('1辺（へん）が ' + a + 'cm の 正三角形。まわりの 長さは 何cm？', triSvg('equi', [a + 'cm', a + 'cm', a + 'cm'])), a * 3, {
        key: 'per:equi:' + a, scratch: false, hint: '3つの 辺が みんな ' + a + 'cm。' + a + ' × 3。', note: a + ' × 3 = ' + (a * 3) + 'cm'
      });
    }
    const eq = U.randInt(3, 9); let other; do { other = U.randInt(2, 9); } while (other === eq || other >= eq * 2);
    return num('まわりの 長さ', figQ3('二等辺三角形。まわりの 長さは 何cm？', triSvg('iso', [eq + 'cm', eq + 'cm', other + 'cm'])), eq * 2 + other, {
      key: 'per:iso:' + eq + ':' + other, scratch: false, hint: eq + ' + ' + eq + ' + ' + other + '。', note: eq + ' + ' + eq + ' + ' + other + ' = ' + (eq * 2 + other) + 'cm'
    });
  }
  function sideFromPerQ() {
    const a = U.randInt(3, 9);
    return num('正三角形の 辺', 'まわりの 長さが ' + (a * 3) + 'cm の 正三角形。1つの 辺（へん）は 何cm？', a, {
      key: 'sfp:' + a, scratch: false, hint: '3つの 辺が 同じ 長さ。' + (a * 3) + ' ÷ 3。', note: (a * 3) + ' ÷ 3 = ' + a + 'cm'
    });
  }
  function isoOtherQ() {
    const eq = U.randInt(3, 9); let other; do { other = U.randInt(2, 9); } while (other === eq || other >= eq * 2);
    return num('二等辺三角形の 辺', '等しい 辺（へん）が ' + eq + 'cm で、まわりの 長さが ' + (eq * 2 + other) + 'cm の 二等辺三角形。のこりの 辺は 何cm？', other, {
      key: 'isoo:' + eq + ':' + other, scratch: false, hint: (eq * 2 + other) + ' から ' + eq + ' を 2回 ひこう。', note: (eq * 2 + other) + ' − ' + eq + ' − ' + eq + ' = ' + other + 'cm'
    });
  }
  function compassTriQ() {
    const eq = U.randInt(3, 9); let base; do { base = U.randInt(2, 9); } while (base === eq || base >= eq * 2);
    return num('コンパスで かく', '辺（へん）の 長さが ' + eq + 'cm・' + eq + 'cm・' + base + 'cm の 二等辺三角形を かきます。' + base + 'cm の 辺を ひいた あと、その 両はしから コンパスで 円を かきます。コンパスの 開きは 何cm？', eq, {
      key: 'comp:' + eq + ':' + base, scratch: false, hint: 'のこりの 2つの 辺の 長さに コンパスを 開くよ。', note: 'コンパスは ' + eq + 'cm に 開く'
    });
  }
  function circleTriQ(kindAsk) {
    const r = U.randInt(3, 9);
    if (kindAsk === 'name') {
      return choice('円と 三角形', figQ3('円の 中心と、円のまわりの 2つの 点を むすんだ 三角形。この 三角形は？', circleTriSvg(r + 'cm')), triChoices('iso'), {
        key: 'ctri:name:' + r, hint: '中心から 円のまわりまでの 長さ（半径）は どこも 同じ。', note: '半径 2本が 等しい → 二等辺三角形'
      });
    }
    return num('円と 三角形', figQ3('半径 ' + r + 'cm の 円。赤い 三角形の 等しい 2つの 辺（へん）は 何cm？', circleTriSvg(r + 'cm')), r, {
      key: 'ctri:side:' + r, scratch: false, hint: '中心から 円のまわりまでは 半径の 長さ。', note: '2つの 辺は 半径と 同じ ' + r + 'cm'
    });
  }
  function setSquareQ() {
    const flip = Math.random() < 0.5;
    const ask = pf(['iso', 'sca']);
    const isoLabel = flip ? 'い' : 'あ', scaLabel = flip ? 'あ' : 'い';
    const right = ask === 'iso' ? isoLabel : scaLabel;
    const text = ask === 'iso' ? '三角じょうぎ 2まい。二等辺三角形は どっち？' : '三角じょうぎ 2まい。3つの 辺（へん）の 長さが みんな ちがうのは どっち？';
    return choice('三角じょうぎ', figQ3(text, setSquareSvg(flip)), [right, right === 'あ' ? 'い' : 'あ'], {
      key: 'ss:' + ask + ':' + (flip ? 'f' : 'n'), hint: '直角の となりの 2つの 辺が 同じ 長さの ほうが 二等辺三角形。', note: right
    });
  }
  const stage16 = {
    easy: [triWordQ, sidesQ, figNameQ, function e4() { return angleCmpQ(false); }],
    normal: [isoAngleQ, function n2() { return perimeterQ('equi'); }, function n3() { return circleTriQ('name'); }, setSquareQ, function n5() { return angleCmpQ(true); }, triWordQ],
    hard: [function h1() { return perimeterQ('iso'); }, sideFromPerQ, compassTriQ, function h4() { return circleTriQ('side'); }, isoOtherQ],
    boss: [function b1() { return isoOtherQ(); }, function b2() { return compassTriQ(); }, function b3() { return perimeterQ('iso'); }, function b4() { return sideFromPerQ(); }]
  };

  /* =======================================================
     ステージ17 かけ算の 筆算（2）（2けた × 2けた・3けた × 2けた）
     ======================================================= */
  const hintMul2 = 'かける数の 一の位、十の位の じゅんに かけて、ずらして 書いて たそう。';
  function tensTensQ() {
    const a = U.randInt(2, 9) * 10, b = U.randInt(2, 9) * 10;
    return num('何十 × 何十', expr(a, '×', b), a * b, { scratch: false, hint: (a / 10) + ' × ' + (b / 10) + ' = ' + (a * b / 100) + '。それを 100倍。', note: a + ' × ' + b + ' = ' + (a * b) });
  }
  function timesTensQ() {
    const a = U.randInt(12, 48), b = U.randInt(2, 9) * 10;
    return num('2けた × 何十', expr(a, '×', b), a * b, { hint: a + ' × ' + (b / 10) + ' = ' + (a * b / 10) + '。それを 10倍。', note: a + ' × ' + b + ' = ' + (a * b) });
  }
  function mul22(noCarry) {
    let a, b, tries = 0;
    do {
      a = U.randInt(12, 99); b = U.randInt(12, 99);
      if (b % 10 === 0) continue;
      const ok = (a % 10) * (b % 10) < 10 && Math.floor(a / 10) * (b % 10) < 10 && (a % 10) * Math.floor(b / 10) < 10 && Math.floor(a / 10) * Math.floor(b / 10) < 10;
      if (noCarry ? ok : !ok) break;
    } while (tries++ < 300);
    return mulV('2けた × 2けた', a, b, { hint: noCarry ? 'まず ' + a + ' × ' + (b % 10) + '、つぎに ' + a + ' × ' + Math.floor(b / 10) + '0。たすと 答え。' : hintMul2 });
  }
  function mul32(zero) {
    let a, b;
    if (zero) { a = U.randInt(1, 9) * 100 + U.randInt(1, 9); b = U.randInt(12, 99); if (b % 10 === 0) b += 3; }
    else { do { a = U.randInt(112, 999); b = U.randInt(12, 99); } while (b % 10 === 0 || a % 10 === 0); }
    return mulV('3けた × 2けた', a, b, { hint: zero ? '十の位の 0 に 気をつけて。' + hintMul2 : hintMul2 });
  }
  const MUL2_WORDS = [
    ['1こ □円の あめを ○こ 買います。何円？', 11, 45, '円'],
    ['1日に □分ずつ ○日 走りました。ぜんぶで 何分？', 15, 45, '分'],
    ['1はこに □こずつ 入った クッキーが ○はこ。ぜんぶで 何こ？', 12, 36, 'こ'],
    ['1m □円の リボンを ○m 買います。何円？', 25, 85, '円'],
    ['1回に □人 のれる バスが ○回 走ります。ぜんぶで 何人 のれる？', 24, 48, '人'],
    ['1本 □円の ジュースを ○本 買います。何円？', 80, 120, '円'],
    ['1さつ □ページの 本を ○さつ 読みました。ぜんぶで 何ページ？', 110, 250, 'ページ']
  ];
  function mul2WordQ(big) {
    const w = pf(big ? MUL2_WORDS.slice(3) : MUL2_WORDS.slice(0, 5));
    const a = U.randInt(w[1], w[2]), b = U.randInt(12, big ? 48 : 30);
    return num('かけ算の 文章題', w[0].replace('□', a).replace('○', b), a * b, {
      key: 'mw2:' + w[3] + ':' + a + ':' + b, hint: a + ' × ' + b + ' の 筆算で。', note: a + ' × ' + b + ' = ' + (a * b) + w[3]
    });
  }
  function kufuuQ() {
    const w = pf([[25, 4], [50, 2], [20, 5], [125, 8]]);
    const c = U.randInt(3, 9);
    const flip = Math.random() < 0.5;
    const text = flip ? w[0] + ' × ' + c + ' × ' + w[1] : w[1] + ' × ' + w[0] + ' × ' + c;
    return num('計算の くふう', '<span class="num">' + text + '</span>', w[0] * w[1] * c, {
      key: 'kufuu:' + text, scratch: false, hint: w[0] + ' × ' + w[1] + ' = ' + (w[0] * w[1]) + ' を 先に 計算すると かんたん。かけ算は じゅんばんを かえても 答えは 同じ。', note: (w[0] * w[1]) + ' × ' + c + ' = ' + (w[0] * w[1] * c)
    });
  }
  function mentalQ() {
    const a = pf([12, 15, 25, 35, 45, 24, 21, 32]), b = pf([3, 4, 2]);
    return num('あん算', expr(a, '×', b) + '（あん算で）', a * b, { scratch: false, hint: a + ' を ' + (Math.floor(a / 10) * 10) + ' と ' + (a % 10) + ' に 分けて、それぞれ ' + b + '倍して たそう。', note: a + ' × ' + b + ' = ' + (a * b) });
  }
  const stage17 = {
    easy: [tensTensQ, timesTensQ, function e3() { return mul22(true); }, mentalQ],
    normal: [function n1() { return mul22(false); }, function n2() { return mul2WordQ(false); }, function n3() { return mul22(false); }, timesTensQ],
    hard: [function h1() { return mul32(false); }, function h2() { return mul32(true); }, function h3() { return mul2WordQ(true); }, kufuuQ],
    boss: [function b1() { return mul32(false); }, function b2() { return mul2WordQ(true); }, function b3() { return mul32(true); }, function b4() { return mul22(false); }]
  };

  /* =======================================================
     ステージ18 そろばん
     ======================================================= */
  const SORO_WORDS = [
    ['そろばんで、はりの 上に ある 玉（五玉）1つは いくつ を あらわす？', '5', ['1', '10', '4'], '上の 玉は 五玉（ごだま）。1つで 5。'],
    ['そろばんで、はりの 下に ある 玉（一玉）1つは いくつ を あらわす？', '1', ['5', '2', '10'], '下の 玉は 一玉（いちだま）。1つで 1。'],
    ['そろばんの はりに ついた 白い 点（定位点・ていいてん）が ある けたは 何の 位？', '一の位', ['十の位', '百の位', '千の位'], '定位点の ある けたを 一の位に して 数を おくよ。'],
    ['そろばんで 数を あらわす とき、はりに よせた 玉と はなれた 玉、どちらを 読む？', 'はりに よせた 玉', ['はりから はなれた 玉', 'どちらも', '上の 玉だけ'], 'はりに くっついて いる 玉だけ 数えるよ。'],
    ['そろばんで、一の位の 右どなりの けたは 何の 位？', '小数第一位', ['十の位', '百の位', '一の位'], '定位点の 右は 小数の 位（0.1 の 位）。'],
    ['そろばんで、一の位の 左どなりの けたは 何の 位？', '十の位', ['百の位', '小数第一位', '一の位'], '左へ 行くほど 位が 大きく なるよ。']
  ];
  function soroWordQ() {
    const w = pf(SORO_WORDS);
    return choice('そろばん', w[0], [w[1]].concat(w[2]), { key: 'sw:' + w[1] + ':' + w[0].slice(0, 8), hint: w[3], note: w[1] });
  }
  function soroReadQ(len, allowZero) {
    const n = allowZero ? U.randInt(Math.pow(10, len - 1), Math.pow(10, len) - 1) : bigNum(len, false);
    const cols = Math.max(4, len);
    const digs = digitsOf(n, cols);
    return num('そろばんを 読む', figQ3('そろばんは いくつ を あらわして いる？', sorobanSvg(digs, cols - 1)), n, {
      key: 'sr:' + n, scratch: false, maxLen: 9,
      hint: '定位点の けたが 一の位。はりに よせた 玉を、五玉は 5・一玉は 1 として けたごとに 読もう。',
      note: 'そろばんは ' + n
    });
  }
  function soroReadDecQ() {
    const t = U.randInt(11, 99); if (t % 10 === 0) return soroReadDecQ();
    const digs = digitsOf(t, 4);   // 十・一・小数第一位 ＋ 左に 1けた
    return dec('そろばんと 小数', figQ3('定位点（ていいてん）の 右の けたは 0.1 の 位。そろばんは いくつ？', sorobanSvg(digs, 2)), t, {
      key: 'srd:' + t, scratch: false, hint: '定位点の けたまでが 整数。右の けたは 0.1 が いくつ分。', note: 'そろばんは ' + fmtDec(t)
    });
  }
  function soroPutQ() {
    const n = U.randInt(6, 9);
    return num('玉の おき方', 'そろばんで ' + n + ' を おく とき、五玉 1つと 一玉 いくつ を はりに よせる？', n - 5, {
      key: 'sp:' + n, scratch: false, hint: '5 と いくつで ' + n + ' かな。', note: '5 + ' + (n - 5) + ' = ' + n + ' → 一玉 ' + (n - 5) + 'つ'
    });
  }
  function soroAddQ(useFive) {
    let n, k;
    if (useFive) { do { n = U.randInt(1, 4); k = U.randInt(1, 4); } while (n + k < 5); }
    else { do { n = U.randInt(11, 44); k = U.randInt(1, 3); } while ((n % 10) % 5 + k >= 5 || (n % 10) + k >= 10); }
    const digs = useFive ? [0, n] : digitsOf(n, 2);
    return num('そろばんの たし算', figQ3('そろばんに ' + n + ' が おいて あります。' + k + ' を たすと？', sorobanSvg(digs, 1)), n + k, {
      key: 'sa:' + n + ':' + k, scratch: false,
      hint: useFive ? '一玉が 足りない ときは、五玉を 入れて 一玉を ' + (5 - k) + 'つ とるよ。' : '一玉を ' + k + 'つ はりに よせよう。',
      note: n + ' + ' + k + ' = ' + (n + k)
    });
  }
  function soroSubQ(useFive) {
    let n, k;
    if (useFive) { do { n = U.randInt(5, 8); k = U.randInt(1, 4); } while (n - k >= 5); }
    else { do { n = U.randInt(12, 49); k = U.randInt(1, 3); } while ((n % 10) % 5 < k || n % 10 < k); }
    const digs = useFive ? [0, n] : digitsOf(n, 2);
    return num('そろばんの ひき算', figQ3('そろばんに ' + n + ' が おいて あります。' + k + ' を ひくと？', sorobanSvg(digs, 1)), n - k, {
      key: 'ss:' + n + ':' + k, scratch: false,
      hint: useFive ? '一玉が 足りない ときは、五玉を とって 一玉を ' + (5 - k) + 'つ 入れるよ。' : '一玉を ' + k + 'つ はりから はなそう。',
      note: n + ' − ' + k + ' = ' + (n - k)
    });
  }
  function soroTenQ() {
    const n = U.randInt(6, 9), k = U.randInt(10 - n, 9);
    return num('くり上がり', 'そろばんに ' + n + ' が おいて あります。' + k + ' を たすと？（十の位に 一玉を 1つ 入れて、一の位から ' + (10 - k) + ' を とる）', n + k, {
      key: 'st:' + n + ':' + k, scratch: false, hint: '一の位で 足りない ときは 10 を 入れて、10 − ' + k + ' = ' + (10 - k) + ' を とる。', note: n + ' + ' + k + ' = ' + (n + k)
    });
  }
  function soroFiveBeadQ() {
    const n = U.randInt(1, 4), k = U.randInt(5 - n, 4);
    return num('五玉を 使う たし算', 'そろばんに ' + n + ' が おいて あります。' + k + ' を たす とき、五玉を 入れて 一玉を いくつ とる？', 5 - k, {
      key: 'sf:' + n + ':' + k, scratch: false, hint: k + ' は 5 より ' + (5 - k) + ' 小さい。だから 5 を 入れて ' + (5 - k) + ' を とる。', note: '五玉を 入れて 一玉を ' + (5 - k) + 'つ とる → ' + (n + k)
    });
  }
  const stage18 = {
    easy: [soroWordQ, function e2() { return soroReadQ(2, false); }, soroPutQ, function e4() { return soroAddQ(false); }],
    normal: [function n1() { return soroReadQ(3, true); }, function n2() { return soroSubQ(false); }, function n3() { return soroAddQ(true); }, soroWordQ, function n5() { return soroReadQ(4, true); }],
    hard: [soroReadDecQ, soroFiveBeadQ, function h3() { return soroSubQ(true); }, soroTenQ, function h5() { return soroReadQ(5, true); }],
    boss: [function b1() { return soroReadQ(6, true); }, function b2() { return soroReadDecQ(); }, function b3() { return soroTenQ(); }, function b4() { return soroFiveBeadQ(); }]
  };

  // 図を 見る ため（tools/harness.html #figs3 / #figs3b）
  const figs3 = { lineSvg: lineSvg, circleSvg: circleSvg, ballsSvg: ballsSvg, dialSvg: dialSvg, kanjiNum: kanjiNum,
    triSvg: triSvg, anglesSvg: anglesSvg, setSquareSvg: setSquareSvg, circleTriSvg: circleTriSvg, tapeSvg: tapeSvg, sorobanSvg: sorobanSvg };

  const stages = { 1: stage1, 2: stage2, 3: stage3, 4: stage4, 5: stage5, 6: stage6, 7: stage7, 8: stage8, 9: stage9, 10: stage10, 11: stage11, 12: stage12, 13: stage13,
    14: stage14, 15: stage15, 16: stage16, 17: stage17, 18: stage18 };

  // maker を かたよらないように じゅんばんに 使う
  function cycle(list, n) {
    const out = [];
    if (!list || !list.length) return out;
    let order = MQ.util.shuffle(list);
    for (let i = 0; i < n; i++) {
      if (i % list.length === 0 && i > 0) order = MQ.util.shuffle(list);
      out.push(order[i % list.length]);
    }
    return out;
  }

  // n 問を やさしい → ふつう → むずかしい の わりあいで（12問なら 4/4/4）
  function levelCounts(n) {
    const easy = Math.ceil(n / 3);
    const hard = Math.floor(n / 3);
    return [easy, n - easy - hard, hard];
  }

  const TIERS = { 1: 'easy', 2: 'normal', 3: 'hard' };

  /* opts.boss … ボスの 問題だけ
     opts.lv   … その むずかしさ だけ（たからばこ など）
     どちらも ないときは やさしい → ふつう → むずかしい の じゅんで n 問 */
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
    // 同じ問題が 2回 出ないように 作り直す（乱数の かたよりを ふせぐ）
    const out = [], seen = {};
    function idOf(q) { return 'sansu3-' + stageNo + ':' + (q.key || U.stripTags(q.prompt)); }
    plan.forEach(function (p) {
      cycle(p[0], p[2]).forEach(function (maker) {
        let q = maker(), tries = 0;
        while (seen[idOf(q)] && tries++ < 12) q = maker();
        q.lv = p[1];
        q.id = idOf(q);
        seen[q.id] = true;
        out.push(q);
      });
    });
    return out;
  }

  return { make: make, stages: stages, levelCounts: levelCounts, figs3: figs3 };
})();
