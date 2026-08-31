/* ---------------------------------------------------------
   小3 算数：問題を その場で作る（日本文教出版『小学算数』の順）

   ステージ 1〜6 が いま入っています（2026年8月時点で 習った範囲）。
   ステージ 7 以降は 学校で習ったら 足していきます。

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

  function num(unit, prompt, answer, extra) {
    return Object.assign({ type: 'number', unit: unit, prompt: prompt, answer: answer, scratch: true }, extra || {});
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

  const stages = { 1: stage1, 2: stage2, 3: stage3, 4: stage4, 5: stage5, 6: stage6 };

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

  return { make: make, stages: stages, levelCounts: levelCounts };
})();
