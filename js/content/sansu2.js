/* ---------------------------------------------------------
   小2 さんすう（日本文教出版『小学算数 2年』の じゅん・v2.3）

   ステージ（問題文は ひらがな＋小1の かん字だけ。小2が じぶんで 読める ように）
     1 ひょうと グラフ            … ○の グラフを 見て なんこ／いちばん おおい／ちがい
     2 たしざんの ひっさん        … 2けた＋2けた（くり上がり）
     3 ひきざんの ひっさん        … 2けた−2けた（くり下がり）
     4 ながさ（cm・mm）           … 1cm=10mm／3cm5mm は なんmm／くらべる
     5 100より 大きい かず        … 100が 3こ 10が 4こ 1が 7こ／つぎの かず／大小／500+300
     6 かさ（L・dL・mL）          … 1L=10dL／2L3dL は なんdL／1L=1000mL
     7 とけいと じかん            … とけいの 絵（sansu1 から 借りる）／30ぷん あと／なんじかん／ごぜん・ごご
     8 3けたの けいさん           … 67+58／134−58／245+38（ひっさん）
     9 かたち                     … さんかくけい・しかくけい・ちょうほうけい・せいほうけい・はこの めん／へん／ちょうてん
    10 かけざん（1）              … 2・5・3・4の だん／しきを つくる
    11 かけざん（2）              … 6・7・8・9・1の だん／九九 ぜんぶ／□ × 7 = 56
    12 ながい ものの ながさ（m）  … 1m=100cm／1m30cm は なんcm
    13 1000より 大きい かず       … 1000が 3こ…／つぎの かず／大小／3000+4000
    14 ぶんすう                   … 2ぶんの 1・4ぶんの 1／8この 2ぶんの 1 は なんこ

   作りかたは sansu1.js / sansu3.js と 同じ（easy / normal / hard / boss）。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.sansu2 = (function () {
  const U = MQ.util;
  const S1 = MQ.sansu1;   // とけいの 絵（clockQ）を 借りる

  /* ---- 問題を 作る 小さな 道具 ---- */
  function span(s) { return '<span class="num">' + s + '</span>'; }
  function expr(a, sign, b) { return span(a + ' ' + sign + ' ' + b); }
  function box(text) { return span(text) + '<br>□に はいる かずは？'; }

  function num(unit, prompt, answer, extra) {
    return Object.assign({ type: 'number', unit: unit, prompt: prompt, answer: answer, scratch: false }, extra || {});
  }
  function vertical(unit, a, sign, b, answer, extra) {
    return num(unit, expr(a, sign, b), answer, Object.assign({ layout: 'vertical', a: a, b: b, sign: sign, scratch: true }, extra || {}));
  }
  function choice(unit, prompt, choices, extra) {
    return Object.assign({ type: 'choice', unit: unit, prompt: prompt, choices: choices, answer: 0 }, extra || {});
  }
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
  function distinctNums(count, lo, hi) {
    const used = {}, out = [];
    let guard = 0;
    while (out.length < count && guard++ < 100) {
      const v = U.randInt(lo, hi);
      if (used[v]) continue;
      used[v] = true;
      out.push(v);
    }
    return out;
  }
  function pickFrom(list) { return list[U.randInt(0, list.length - 1)]; }
  // 決まった 問題の リストから 1つ（かたち など）
  function fixed(list) { return function () { const q = pickFrom(list); return Object.assign({}, q); }; }

  /* =======================================================
     ステージ1 ひょうと グラフ（○を ならべた グラフ）
     ======================================================= */
  const FRUITS = ['りんご', 'みかん', 'ばなな', 'ぶどう', 'いちご', 'もも'];
  function graphData(kinds, lo, hi) {
    const names = U.shuffle(FRUITS.slice()).slice(0, kinds);
    const counts = distinctNums(kinds, lo, hi);
    return names.map(function (n, i) { return { name: n, n: counts[i] }; });
  }
  function graphHtml(data) {
    return data.map(function (d) {
      let s = '';
      for (let i = 0; i < d.n; i++) s += '○';
      return '<span class="num dots">' + d.name + '　' + s + '</span>';
    }).join('<br>');
  }
  function gKey(tag, data) { return tag + ':' + data.map(function (d) { return d.name + d.n; }).join(','); }
  const stage1 = {
    easy: [
      function countOf() {
        const data = graphData(3, 2, 8), d = pickFrom(data);
        return num('グラフを よむ', d.name + 'は なんこ？<br>' + graphHtml(data), d.n, {
          hint: d.name + ' の れつの ○を かぞえよう。', note: d.name + 'は ' + d.n + 'こ', key: gKey('c' + d.name, data)
        });
      },
      function most() {
        const data = graphData(3, 2, 8);
        const top = data.slice().sort(function (x, y) { return y.n - x.n; })[0];
        return choice('グラフを よむ', 'いちばん おおいのは どれ？<br>' + graphHtml(data), [top.name].concat(data.filter(function (d) { return d !== top; }).map(function (d) { return d.name; })), {
          hint: '○が いちばん ながい れつを さがそう。', note: top.name + ' が ' + top.n + 'こで いちばん おおい', key: gKey('m', data)
        });
      }
    ],
    normal: [
      function least() {
        const data = graphData(4, 1, 9);
        const low = data.slice().sort(function (x, y) { return x.n - y.n; })[0];
        return choice('グラフを よむ', 'いちばん すくないのは どれ？<br>' + graphHtml(data), [low.name].concat(data.filter(function (d) { return d !== low; }).map(function (d) { return d.name; })), {
          hint: '○が いちばん みじかい れつを さがそう。', note: low.name + ' が ' + low.n + 'こで いちばん すくない', key: gKey('l', data)
        });
      },
      function diff() {
        const data = graphData(3, 2, 9);
        const s = data.slice().sort(function (x, y) { return y.n - x.n; });
        return num('グラフを よむ', s[0].name + 'は ' + s[1].name + 'より なんこ おおい？<br>' + graphHtml(data), s[0].n - s[1].n, {
          hint: s[0].name + ' は ' + s[0].n + 'こ、' + s[1].name + ' は ' + s[1].n + 'こ。ひきざんで ちがいを だそう。', note: s[0].n + ' − ' + s[1].n + ' = ' + (s[0].n - s[1].n), key: gKey('d', data)
        });
      }
    ],
    hard: [
      function total() {
        const data = graphData(3, 2, 9);
        const t = data.reduce(function (a, d) { return a + d.n; }, 0);
        return num('グラフを よむ', 'ぜんぶで なんこ？<br>' + graphHtml(data), t, {
          hint: 'れつごとに かぞえて、ぜんぶ たそう。', note: data.map(function (d) { return d.n; }).join(' + ') + ' = ' + t, key: gKey('t', data)
        });
      },
      function diff4() {
        const data = graphData(4, 1, 9);
        const s = data.slice().sort(function (x, y) { return y.n - x.n; });
        const a = s[0], b = s[s.length - 1];
        return num('グラフを よむ', a.name + 'と ' + b.name + 'の ちがいは なんこ？<br>' + graphHtml(data), a.n - b.n, {
          hint: a.name + ' は ' + a.n + 'こ、' + b.name + ' は ' + b.n + 'こ。', note: a.n + ' − ' + b.n + ' = ' + (a.n - b.n), key: gKey('d4', data)
        });
      }
    ],
    boss: [
      function bossTotal() {
        const data = graphData(4, 2, 9);
        const t = data.reduce(function (a, d) { return a + d.n; }, 0);
        return num('グラフを よむ', 'ぜんぶで なんこ？<br>' + graphHtml(data), t, {
          hint: '4つの れつを ぜんぶ たそう。', note: data.map(function (d) { return d.n; }).join(' + ') + ' = ' + t, key: gKey('bt', data)
        });
      },
      function bossSecond() {
        const data = graphData(4, 1, 9);
        const s = data.slice().sort(function (x, y) { return y.n - x.n; });
        return choice('グラフを よむ', '2ばんめに おおいのは どれ？<br>' + graphHtml(data), [s[1].name, s[0].name, s[2].name, s[3].name], {
          hint: 'いちばん おおい れつの つぎに ながい れつは？', note: s[1].name + ' が ' + s[1].n + 'こで 2ばんめ', key: gKey('b2', data)
        });
      }
    ]
  };

  /* =======================================================
     ステージ2 たしざんの ひっさん／ステージ3 ひきざんの ひっさん／ステージ8 3けたの けいさん
     ======================================================= */
  function addV(a, b, unit) {
    const carry = (a % 10) + (b % 10) >= 10;
    return vertical(unit || 'たしざんの ひっさん', a, '+', b, a + b, {
      hint: 'いちの くらいから。' + (a % 10) + ' + ' + (b % 10) + ' = ' + ((a % 10) + (b % 10)) + (carry ? '。10 を じゅうの くらいに くり上げよう。' : '。つぎは じゅうの くらい。'),
      note: a + ' + ' + b + ' = ' + (a + b)
    });
  }
  function subV(a, b, unit) {
    const borrow = (a % 10) < (b % 10);
    return vertical(unit || 'ひきざんの ひっさん', a, '−', b, a - b, {
      hint: 'いちの くらいから。' + (borrow ? (a % 10) + ' から ' + (b % 10) + ' は ひけないので、じゅうの くらいから 1 くり下げて ' + (a % 10 + 10) + ' − ' + (b % 10) + '。' : (a % 10) + ' − ' + (b % 10) + '。つぎは じゅうの くらい。'),
      note: a + ' − ' + b + ' = ' + (a - b)
    });
  }
  function addWord(lo, hi) {
    const a = U.randInt(lo, hi), b = U.randInt(lo, hi);
    return num('ぶんしょうの もんだい', 'あかい おりがみが ' + a + 'まい、あおい おりがみが ' + b + 'まい あります。あわせて なんまい？', a + b, {
      scratch: true, hint: '「あわせて」は たしざん。' + a + ' + ' + b + ' を ひっさんで。', note: a + ' + ' + b + ' = ' + (a + b) + '（まい）', key: 'aw:' + a + ':' + b
    });
  }
  function subWord(lo, hi) {
    const a = U.randInt(lo, hi), b = U.randInt(10, a - 1);
    return num('ぶんしょうの もんだい', 'シールが ' + a + 'まい あります。' + b + 'まい つかいました。のこりは なんまい？', a - b, {
      scratch: true, hint: '「のこり」は ひきざん。' + a + ' − ' + b + ' を ひっさんで。', note: a + ' − ' + b + ' = ' + (a - b) + '（まい）', key: 'sw:' + a + ':' + b
    });
  }
  function twoDigits(loT, hiT, loO, hiO) { return U.randInt(loT, hiT) * 10 + U.randInt(loO, hiO); }
  const stage2 = {
    easy: [
      function noCarry() { const a = twoDigits(1, 8, 0, 5), b = twoDigits(1, 9 - Math.floor(a / 10), 0, 9 - a % 10); return addV(a, b); },
      function plusOneDigit() { const a = twoDigits(1, 8, 0, 9), b = U.randInt(1, 9); return addV(a, b); }
    ],
    normal: [
      function carry() { const a = twoDigits(1, 7, 1, 9), b = twoDigits(1, 8 - Math.floor(a / 10), 10 - a % 10, 9); return addV(a, b); },
      function carry2() { const a = twoDigits(2, 6, 5, 9), b = twoDigits(1, 8 - Math.floor(a / 10), 5, 9); return addV(a, b); },
      function word() { return addWord(11, 44); }
    ],
    hard: [
      function carryBig() { const a = twoDigits(3, 7, 4, 9), b = twoDigits(1, 8 - Math.floor(a / 10), 10 - a % 10, 9); return addV(a, b); },
      function word2() { return addWord(15, 49); },
      function missing() {
        const a = twoDigits(1, 5, 0, 9), b = twoDigits(1, 8 - Math.floor(a / 10), 0, 9);
        return num('□の たしざん', box(a + ' + □ = ' + (a + b)), b, { scratch: true, hint: (a + b) + ' から ' + a + ' を ひくと □ が わかるよ。', note: a + ' + ' + b + ' = ' + (a + b) });
      }
    ],
    boss: [
      function bossCarry() { const a = twoDigits(2, 7, 6, 9), b = twoDigits(1, 8 - Math.floor(a / 10), 6, 9); return addV(a, b); },
      function bossWord() { return addWord(26, 49); },
      function bossMissing() {
        const a = twoDigits(1, 5, 5, 9), b = twoDigits(1, 8 - Math.floor(a / 10), 5, 9);
        return num('□の たしざん', box('□ + ' + b + ' = ' + (a + b)), a, { scratch: true, hint: (a + b) + ' から ' + b + ' を ひくと □ が わかるよ。', note: a + ' + ' + b + ' = ' + (a + b) });
      }
    ]
  };
  const stage3 = {
    easy: [
      function noBorrow() { const a = twoDigits(3, 9, 5, 9), b = twoDigits(1, Math.floor(a / 10) - 1, 0, a % 10); return subV(a, b); },
      function minusOneDigit() { const a = twoDigits(2, 9, 5, 9), b = U.randInt(1, a % 10); return subV(a, b); }
    ],
    normal: [
      function borrow() { const a = twoDigits(3, 9, 0, 4), b = twoDigits(1, Math.floor(a / 10) - 1, a % 10 + 1, 9); return subV(a, b); },
      function borrowOneDigit() { const a = twoDigits(2, 9, 0, 5), b = U.randInt(a % 10 + 1, 9); return subV(a, b); },
      function word() { return subWord(40, 79); }
    ],
    hard: [
      function borrowBig() { const a = twoDigits(5, 9, 0, 3), b = twoDigits(1, Math.floor(a / 10) - 1, a % 10 + 1, 9); return subV(a, b); },
      function word2() { return subWord(50, 99); },
      function chigai() {
        const a = twoDigits(4, 9, 0, 4), b = twoDigits(1, Math.floor(a / 10) - 1, a % 10 + 1, 9);
        return num('ぶんしょうの もんだい', 'おとうとは ' + b + 'こ、おねえさんは ' + a + 'こ どんぐりを ひろいました。ちがいは なんこ？', a - b, {
          scratch: true, hint: '「ちがい」は ひきざん。おおきい かずから ちいさい かずを ひく。', note: a + ' − ' + b + ' = ' + (a - b) + '（こ）', key: 'ch:' + a + ':' + b
        });
      }
    ],
    boss: [
      function bossBorrow() { const a = twoDigits(6, 9, 0, 2), b = twoDigits(2, Math.floor(a / 10) - 1, a % 10 + 3, 9); return subV(a, b); },
      function bossWord() { return subWord(60, 99); },
      function bossMissing() {
        const a = twoDigits(4, 9, 0, 4), b = twoDigits(1, Math.floor(a / 10) - 1, a % 10 + 1, 9);
        return num('□の ひきざん', box(a + ' − □ = ' + (a - b)), b, { scratch: true, hint: a + ' から ' + (a - b) + ' を ひくと □ が わかるよ。', note: a + ' − ' + b + ' = ' + (a - b) });
      }
    ]
  };
  const stage8 = {
    easy: [
      function toHundred() { const a = twoDigits(5, 9, 0, 9), b = twoDigits(10 - Math.floor(a / 10), 9, 0, 9); return addV(a, b, '3けたの たしざん'); },
      function toHundred2() { const a = twoDigits(6, 9, 5, 9), b = twoDigits(10 - Math.floor(a / 10), 9, 10 - a % 10, 9); return addV(a, b, '3けたの たしざん'); }
    ],
    normal: [
      function fromHundred() { const a = 100 + twoDigits(1, 5, 0, 9), b = twoDigits(Math.floor((a - 100) / 10) + 1, 9, 0, 9); return subV(a, b, '3けたの ひきざん'); },
      function threePlusTwo() { const a = 100 * U.randInt(1, 8) + twoDigits(1, 8, 0, 9), b = twoDigits(1, 9 - Math.floor((a % 100) / 10), 0, 9); return addV(a, b, '3けたの たしざん'); },
      function threeMinusTwo() { const a = 100 * U.randInt(1, 9) + twoDigits(2, 9, 0, 9), b = twoDigits(1, Math.floor((a % 100) / 10) - 1, 0, 9); return subV(a, b, '3けたの ひきざん'); }
    ],
    hard: [
      function threePlusThree() { const a = 100 * U.randInt(1, 5) + twoDigits(1, 8, 0, 9), b = 100 * U.randInt(1, 9 - Math.floor(a / 100)) + twoDigits(0, 9 - Math.floor((a % 100) / 10), 0, 9); return addV(a, b, '3けたの たしざん'); },
      function doubleBorrow() { const a = 100 * U.randInt(1, 9) + U.randInt(0, 9), b = twoDigits(1, 9, a % 10 + 1, 9); return subV(a, b, '3けたの ひきざん'); },
      function word() {
        const a = 100 + twoDigits(0, 5, 0, 9), b = twoDigits(2, 9, 0, 9);
        return num('ぶんしょうの もんだい', a + 'えんの ノートと ' + b + 'えんの けしゴムを かいました。あわせて なんえん？', a + b, {
          scratch: true, hint: '「あわせて」は たしざん。ひっさんで。', note: a + ' + ' + b + ' = ' + (a + b) + '（えん）', key: 'w8:' + a + ':' + b
        });
      }
    ],
    boss: [
      function bossBorrow() { const a = 100 * U.randInt(1, 9) + U.randInt(0, 5), b = twoDigits(2, 9, a % 10 + 2, 9); return subV(a, b, '3けたの ひきざん'); },
      function bossWord() {
        const a = 100 + twoDigits(0, 9, 0, 9), b = twoDigits(3, 9, 0, 9);
        return num('ぶんしょうの もんだい', a + 'えん もっています。' + b + 'えんの おかしを かうと、のこりは なんえん？', a - b, {
          scratch: true, hint: '「のこり」は ひきざん。ひっさんで。', note: a + ' − ' + b + ' = ' + (a - b) + '（えん）', key: 'bw8:' + a + ':' + b
        });
      },
      function bossAdd() { const a = 100 * U.randInt(2, 6) + twoDigits(4, 9, 5, 9), b = 100 * U.randInt(1, 9 - Math.floor(a / 100)) + twoDigits(0, 9 - Math.floor((a % 100) / 10), 5, 9); return addV(a, b, '3けたの たしざん'); }
    ]
  };

  /* =======================================================
     ステージ4 ながさ（cm・mm）／ステージ12 ながい ものの ながさ（m・cm）
     ======================================================= */
  function cmmm(c, m) { return m ? c + 'cm ' + m + 'mm' : c + 'cm'; }
  function mcm(m, c) { return c ? m + 'm ' + c + 'cm' : m + 'm'; }
  const stage4 = {
    easy: [
      function cmToMm() { const c = U.randInt(1, 9); return num('cm と mm', c + 'cm は なんmm？', c * 10, { hint: '1cm は 10mm。' + c + 'cm は 10mm が ' + c + 'こ。', note: c + 'cm = ' + (c * 10) + 'mm' }); },
      function mmToCm() { const c = U.randInt(1, 9); return num('cm と mm', (c * 10) + 'mm は なんcm？', c, { hint: '10mm で 1cm。' + (c * 10) + 'mm は 10mm が なんこ？', note: (c * 10) + 'mm = ' + c + 'cm' }); }
    ],
    normal: [
      function mixToMm() { const c = U.randInt(1, 9), m = U.randInt(1, 9); return num('cm と mm', c + 'cm ' + m + 'mm は なんmm？', c * 10 + m, { hint: c + 'cm は ' + (c * 10) + 'mm。それに ' + m + 'mm を たそう。', note: c + 'cm ' + m + 'mm = ' + (c * 10 + m) + 'mm' }); },
      function mmToMix() {
        const c = U.randInt(1, 9), m = U.randInt(1, 9), t = c * 10 + m;
        return choice('cm と mm', t + 'mm は なんcm なんmm？', withDistractors(cmmm(c, m), [cmmm(m, c), cmmm(c, m + 1), cmmm(c + 1, m), cmmm(c - 1 || 1, m)]), {
          hint: '10mm ごとに 1cm。' + t + ' は 10 が ' + c + 'こ と ' + m + '。', note: t + 'mm = ' + cmmm(c, m), key: 'm2c:' + t
        });
      },
      function addCm() { const a = U.randInt(1, 6), b = U.randInt(1, 9 - a); return num('ながさの けいさん', expr(a + 'cm', '+', b + 'cm') + '<br>なんcm？', a + b, { hint: 'おなじ たんい どうしを たそう。', note: a + 'cm + ' + b + 'cm = ' + (a + b) + 'cm' }); }
    ],
    hard: [
      function addMix() {
        const a = U.randInt(1, 5), am = U.randInt(1, 4), b = U.randInt(1, 4), bm = U.randInt(1, 5);
        return choice('ながさの けいさん', cmmm(a, am) + ' + ' + cmmm(b, bm) + ' は？', withDistractors(cmmm(a + b, am + bm), [cmmm(a + b, am + bm + 1), cmmm(a + b + 1, am + bm), cmmm(a + b, Math.abs(am - bm)), cmmm(a + b - 1, am + bm)]), {
          hint: 'cm は cm どうし、mm は mm どうし たそう。', note: cmmm(a, am) + ' + ' + cmmm(b, bm) + ' = ' + cmmm(a + b, am + bm), key: 'am:' + a + ':' + am + ':' + b + ':' + bm
        });
      },
      function compare() {
        const c = U.randInt(2, 9), m = U.randInt(1, 9), t = c * 10 + m, d = U.randInt(1, 5) * (Math.random() < 0.5 ? 1 : -1);
        const other = t + d;
        const big = t > other ? cmmm(c, m) : other + 'mm';
        return choice('ながさを くらべる', 'どちらが ながい？', [big, big === other + 'mm' ? cmmm(c, m) : other + 'mm'], {
          hint: 'どちらも mm に なおして くらべよう。' + cmmm(c, m) + ' は ' + t + 'mm。', note: cmmm(c, m) + ' = ' + t + 'mm だから ' + big + ' の ほうが ながい', key: 'cmp:' + t + ':' + other
        });
      },
      function subMix() {
        const a = U.randInt(3, 9), am = U.randInt(3, 9), b = U.randInt(1, a - 1), bm = U.randInt(1, am - 1);
        return choice('ながさの けいさん', cmmm(a, am) + ' − ' + cmmm(b, bm) + ' は？', withDistractors(cmmm(a - b, am - bm), [cmmm(a - b, am - bm + 1), cmmm(a - b + 1, am - bm), cmmm(a - b, am + bm), cmmm(a - b - 1 || 1, am - bm)]), {
          hint: 'cm は cm どうし、mm は mm どうし ひこう。', note: cmmm(a, am) + ' − ' + cmmm(b, bm) + ' = ' + cmmm(a - b, am - bm), key: 'sm:' + a + ':' + am + ':' + b + ':' + bm
        });
      }
    ],
    boss: [
      function bossMmToMix() {
        const c = U.randInt(2, 9), m = U.randInt(1, 9), t = c * 10 + m;
        return choice('cm と mm', t + 'mm は なんcm なんmm？', withDistractors(cmmm(c, m), [cmmm(m, c), cmmm(c, m + 1), cmmm(c + 1, m), cmmm(c - 1, m)]), {
          hint: '10mm ごとに 1cm。', note: t + 'mm = ' + cmmm(c, m), key: 'bm2c:' + t
        });
      },
      function bossAddCarry() {
        const a = U.randInt(1, 5), am = U.randInt(5, 9), b = U.randInt(1, 3), bm = U.randInt(11 - am, 9);
        const tm = am + bm, tc = a + b + Math.floor(tm / 10), rm = tm % 10;
        return choice('ながさの けいさん', cmmm(a, am) + ' + ' + cmmm(b, bm) + ' は？', withDistractors(cmmm(tc, rm), [cmmm(a + b, tm), cmmm(tc, rm + 1), cmmm(tc - 1, rm), cmmm(tc, rm + 5)]), {
          hint: 'mm どうしを たすと 10 を こえる。10mm を 1cm に くり上げよう。', note: cmmm(a, am) + ' + ' + cmmm(b, bm) + ' = ' + (am + bm) + 'mm と ' + (a + b) + 'cm → ' + cmmm(tc, rm), key: 'bac:' + a + ':' + am + ':' + b + ':' + bm
        });
      },
      function bossWord() {
        const c = U.randInt(2, 9), m = U.randInt(1, 9);
        return num('ながさの けいさん', 'えんぴつの ながさは ' + c + 'cm ' + m + 'mm です。なんmm？', c * 10 + m, { hint: c + 'cm = ' + (c * 10) + 'mm。それに ' + m + 'mm。', note: cmmm(c, m) + ' = ' + (c * 10 + m) + 'mm', key: 'bw:' + c + ':' + m });
      }
    ]
  };
  const stage12 = {
    easy: [
      function mToCm() { const m = U.randInt(1, 9); return num('m と cm', m + 'm は なんcm？', m * 100, { hint: '1m は 100cm。' + m + 'm は 100cm が ' + m + 'こ。', note: m + 'm = ' + (m * 100) + 'cm' }); },
      function cmToM() { const m = U.randInt(1, 9); return num('m と cm', (m * 100) + 'cm は なんm？', m, { hint: '100cm で 1m。', note: (m * 100) + 'cm = ' + m + 'm' }); }
    ],
    normal: [
      function mixToCm() { const m = U.randInt(1, 5), c = U.randInt(1, 99); return num('m と cm', m + 'm ' + c + 'cm は なんcm？', m * 100 + c, { hint: m + 'm は ' + (m * 100) + 'cm。それに ' + c + 'cm を たそう。', note: mcm(m, c) + ' = ' + (m * 100 + c) + 'cm' }); },
      function cmToMix() {
        const m = U.randInt(1, 5), c = U.randInt(1, 99), t = m * 100 + c;
        return choice('m と cm', t + 'cm は なんm なんcm？', withDistractors(mcm(m, c), [mcm(m + 1, c), mcm(m, c + 10), mcm(c % 10 || 1, m), mcm(m, c + 1)]), {
          hint: '100cm ごとに 1m。' + t + ' は 100 が ' + m + 'こ と ' + c + '。', note: t + 'cm = ' + mcm(m, c), key: 'c2m:' + t
        });
      },
      function addM() { const a = U.randInt(1, 5), b = U.randInt(1, 4); return num('ながさの けいさん', expr(a + 'm', '+', b + 'm') + '<br>なんm？', a + b, { hint: 'おなじ たんい どうしを たそう。', note: a + 'm + ' + b + 'm = ' + (a + b) + 'm' }); }
    ],
    hard: [
      function addMix() {
        const a = U.randInt(1, 3), ac = U.randInt(10, 40), b = U.randInt(1, 3), bc = U.randInt(10, 50);
        return choice('ながさの けいさん', mcm(a, ac) + ' + ' + mcm(b, bc) + ' は？', withDistractors(mcm(a + b, ac + bc), [mcm(a + b, ac + bc + 10), mcm(a + b + 1, ac + bc), mcm(a + b, Math.abs(ac - bc)), mcm(a + b - 1, ac + bc)]), {
          hint: 'm は m どうし、cm は cm どうし たそう。', note: mcm(a, ac) + ' + ' + mcm(b, bc) + ' = ' + mcm(a + b, ac + bc), key: 'am12:' + a + ':' + ac + ':' + b + ':' + bc
        });
      },
      function compare() {
        const m = U.randInt(1, 5), c = U.randInt(1, 99), t = m * 100 + c, other = t + U.randInt(1, 20) * (Math.random() < 0.5 ? 1 : -1);
        const big = t > other ? mcm(m, c) : other + 'cm';
        return choice('ながさを くらべる', 'どちらが ながい？', [big, big === other + 'cm' ? mcm(m, c) : other + 'cm'], {
          hint: 'どちらも cm に なおして くらべよう。' + mcm(m, c) + ' は ' + t + 'cm。', note: mcm(m, c) + ' = ' + t + 'cm', key: 'cmp12:' + t + ':' + other
        });
      },
      function subMix() {
        const a = U.randInt(2, 5), ac = U.randInt(50, 99), b = U.randInt(1, a - 1), bc = U.randInt(10, ac - 1);
        return choice('ながさの けいさん', mcm(a, ac) + ' − ' + mcm(b, bc) + ' は？', withDistractors(mcm(a - b, ac - bc), [mcm(a - b, ac - bc + 10), mcm(a - b + 1, ac - bc), mcm(a - b, ac + bc), mcm(a - b, ac - bc + 1)]), {
          hint: 'm は m どうし、cm は cm どうし ひこう。', note: mcm(a, ac) + ' − ' + mcm(b, bc) + ' = ' + mcm(a - b, ac - bc), key: 'sm12:' + a + ':' + ac + ':' + b + ':' + bc
        });
      }
    ],
    boss: [
      function bossCmToMix() {
        const m = U.randInt(2, 9), c = U.randInt(1, 99), t = m * 100 + c;
        return choice('m と cm', t + 'cm は なんm なんcm？', withDistractors(mcm(m, c), [mcm(m + 1, c), mcm(m, c + 10), mcm(m - 1, c), mcm(m, c + 1)]), {
          hint: '100cm ごとに 1m。', note: t + 'cm = ' + mcm(m, c), key: 'bc2m:' + t
        });
      },
      function bossWord() {
        const m = U.randInt(1, 3), c = U.randInt(10, 99);
        return num('ながさの けいさん', 'ロープの ながさは ' + m + 'm ' + c + 'cm です。なんcm？', m * 100 + c, { hint: m + 'm = ' + (m * 100) + 'cm。それに ' + c + 'cm。', note: mcm(m, c) + ' = ' + (m * 100 + c) + 'cm', key: 'bw12:' + m + ':' + c });
      },
      function bossAddCarry() {
        const a = U.randInt(1, 3), ac = U.randInt(60, 90), b = U.randInt(1, 3), bc = U.randInt(101 - ac, 99);
        const tc = ac + bc, tm = a + b + Math.floor(tc / 100), rc = tc % 100;
        return choice('ながさの けいさん', mcm(a, ac) + ' + ' + mcm(b, bc) + ' は？', withDistractors(mcm(tm, rc), [mcm(a + b, tc), mcm(tm, rc + 10), mcm(tm - 1, rc), mcm(tm, rc + 1)]), {
          hint: 'cm どうしを たすと 100 を こえる。100cm を 1m に くり上げよう。', note: mcm(a, ac) + ' + ' + mcm(b, bc) + ' = ' + mcm(tm, rc), key: 'bac12:' + a + ':' + ac + ':' + b + ':' + bc
        });
      }
    ]
  };

  /* =======================================================
     ステージ5 100より 大きい かず／ステージ13 1000より 大きい かず
     ======================================================= */
  function bigNumStage(maxDigit) {
    const top = maxDigit === 3 ? 100 : 1000;          // 3けた（〜999）か 4けた（〜9999）か
    const hi = top * 10 - 1;
    const unitName = top === 100 ? '100 が いくつ' : '1000 が いくつ';
    return {
      easy: [
        function compose() {
          const h = U.randInt(1, 9), t = U.randInt(1, 9), o = U.randInt(1, 9);
          const th = top === 1000 ? U.randInt(1, 9) : 0;
          const v = th * 1000 + h * 100 + t * 10 + o;
          const text = (top === 1000 ? '1000 が ' + th + 'こ、' : '') + '100 が ' + h + 'こ、10 が ' + t + 'こ、1 が ' + o + 'こ で いくつ？';
          return num(unitName, text, v, { hint: 'くらいごとに ならべて 書こう。' + (top === 1000 ? 'せんの くらい、' : '') + 'ひゃくの くらい、じゅうの くらい、いちの くらい。', note: v, key: 'cp:' + v });
        },
        function tops() {
          const n = U.randInt(2, 9);
          return num(unitName, top + ' が ' + n + 'こ で いくつ？', top * n, { hint: top + '、' + (top * 2) + '、' + (top * 3) + '… と ' + n + 'かい かぞえよう。', note: top + ' が ' + n + 'こ で ' + (top * n) });
        }
      ],
      normal: [
        function next() { const n = U.randInt(top, hi - 1); return num('かずの ならび', span(n + ' の つぎの かずは？'), n + 1, { hint: n + ' より 1 大きい かず。いちの くらいが 9 なら くり上がるよ。', note: n + ' の つぎは ' + (n + 1) }); },
        function prev() { const n = U.randInt(top + 1, hi); return num('かずの ならび', span(n + ' の 1つ まえの かずは？'), n - 1, { hint: n + ' より 1 小さい かず。', note: n + ' の まえは ' + (n - 1) }); },
        function howManyTens() {
          const sub = top / 10, n = U.randInt(11, 99);
          return num(sub + ' が いくつ', sub + ' が ' + n + 'こ で いくつ？', sub * n, { hint: sub + ' が 10こ で ' + (sub * 10) + '。' + n + 'こ なら？', note: sub + ' が ' + n + 'こ で ' + (sub * n) });
        }
      ],
      hard: [
        function biggest() {
          const ns = distinctNums(4, top, hi);
          ns.sort(function (x, y) { return y - x; });
          return choice('大きい かず', 'いちばん 大きい かずは どれ？', ns.map(String), { hint: 'いちばん 上の くらいから くらべよう。', note: ns[0] + ' が いちばん 大きい', key: 'big:' + ns.join(',') });
        },
        function seq() {
          const step = pickFrom([top / 10, top / 100 || 10, top]);
          const s = U.randInt(1, Math.floor((hi - step * 3) / step)) * step;
          return num('かずの ならび', box(s + '、' + (s + step) + '、□、' + (s + step * 3)), s + step * 2, { hint: step + ' ずつ 大きく なっているよ。', note: s + '、' + (s + step) + '、' + (s + step * 2) + '、' + (s + step * 3) });
        },
        function addTops() {
          const a = U.randInt(1, 8), b = U.randInt(1, 9 - a);
          return num('大きい かずの けいさん', expr(a * top, '+', b * top), (a + b) * top, { hint: top + ' が ' + a + 'こ と ' + b + 'こ で、' + top + ' が なんこ？', note: (a * top) + ' + ' + (b * top) + ' = ' + ((a + b) * top) });
        }
      ],
      boss: [
        function subTops() {
          const a = U.randInt(3, 10), b = U.randInt(1, a - 1);
          return num('大きい かずの けいさん', expr(a * top, '−', b * top), (a - b) * top, { hint: top + ' が ' + a + 'こ から ' + b + 'こ とると？', note: (a * top) + ' − ' + (b * top) + ' = ' + ((a - b) * top) });
        },
        function howManyTop() { return num(unitName, (top * 10) + ' は ' + top + ' が なんこ？', 10, { hint: top + '、' + (top * 2) + '… と ' + (top * 10) + ' まで かぞえると なんかい？', note: (top * 10) + ' は ' + top + ' が 10こ' }); },
        function seqCross() {
          const step = top / 10;
          const base = U.randInt(1, 9) * top - step * 2;
          return num('かずの ならび', box(base + '、' + (base + step) + '、□、' + (base + step * 3)), base + step * 2, { hint: step + ' ずつ 大きく なる。' + (base + step) + ' の つぎは くり上がって ' + (base + step * 2) + '。', note: base + '、' + (base + step) + '、' + (base + step * 2) + '、' + (base + step * 3) });
        },
        function biggestBoss() {
          const ns = distinctNums(4, top * 3, hi);
          ns.sort(function (x, y) { return y - x; });
          return choice('大きい かず', 'いちばん 大きい かずは どれ？', ns.map(String), { hint: '上の くらいが おなじなら、つぎの くらいで くらべよう。', note: ns[0] + ' が いちばん 大きい', key: 'bbig:' + ns.join(',') });
        }
      ]
    };
  }
  const stage5 = bigNumStage(3);
  const stage13 = bigNumStage(4);

  /* =======================================================
     ステージ6 かさ（L・dL・mL）
     ======================================================= */
  function ldl(l, d) { return d ? l + 'L ' + d + 'dL' : l + 'L'; }
  const stage6 = {
    easy: [
      function lToDl() { const l = U.randInt(1, 9); return num('L と dL', l + 'L は なんdL？', l * 10, { hint: '1L は 10dL。' + l + 'L は 10dL が ' + l + 'こ。', note: l + 'L = ' + (l * 10) + 'dL' }); },
      function dlToL() { const l = U.randInt(1, 9); return num('L と dL', (l * 10) + 'dL は なんL？', l, { hint: '10dL で 1L。', note: (l * 10) + 'dL = ' + l + 'L' }); },
      function lToMl() { const l = U.randInt(1, 5); return num('L と mL', l + 'L は なんmL？', l * 1000, { hint: '1L は 1000mL。', note: l + 'L = ' + (l * 1000) + 'mL' }); }
    ],
    normal: [
      function mixToDl() { const l = U.randInt(1, 9), d = U.randInt(1, 9); return num('L と dL', l + 'L ' + d + 'dL は なんdL？', l * 10 + d, { hint: l + 'L は ' + (l * 10) + 'dL。それに ' + d + 'dL を たそう。', note: ldl(l, d) + ' = ' + (l * 10 + d) + 'dL' }); },
      function dlToMix() {
        const l = U.randInt(1, 9), d = U.randInt(1, 9), t = l * 10 + d;
        return choice('L と dL', t + 'dL は なんL なんdL？', withDistractors(ldl(l, d), [ldl(d, l), ldl(l, d + 1), ldl(l + 1, d), ldl(l - 1 || 1, d)]), {
          hint: '10dL ごとに 1L。', note: t + 'dL = ' + ldl(l, d), key: 'd2l:' + t
        });
      },
      function dlToMl() { const d = U.randInt(1, 9); return num('dL と mL', d + 'dL は なんmL？', d * 100, { hint: '1dL は 100mL。', note: d + 'dL = ' + (d * 100) + 'mL' }); }
    ],
    hard: [
      function addMix() {
        const a = U.randInt(1, 5), ad = U.randInt(1, 4), b = U.randInt(1, 4), bd = U.randInt(1, 5);
        return choice('かさの けいさん', ldl(a, ad) + ' + ' + ldl(b, bd) + ' は？', withDistractors(ldl(a + b, ad + bd), [ldl(a + b, ad + bd + 1), ldl(a + b + 1, ad + bd), ldl(a + b, Math.abs(ad - bd)), ldl(a + b - 1, ad + bd)]), {
          hint: 'L は L どうし、dL は dL どうし たそう。', note: ldl(a, ad) + ' + ' + ldl(b, bd) + ' = ' + ldl(a + b, ad + bd), key: 'al:' + a + ':' + ad + ':' + b + ':' + bd
        });
      },
      function compare() {
        const l = U.randInt(1, 9), d = U.randInt(1, 9), t = l * 10 + d, other = t + U.randInt(1, 5) * (Math.random() < 0.5 ? 1 : -1);
        const big = t > other ? ldl(l, d) : other + 'dL';
        return choice('かさを くらべる', 'どちらが おおい？', [big, big === other + 'dL' ? ldl(l, d) : other + 'dL'], {
          hint: 'どちらも dL に なおして くらべよう。' + ldl(l, d) + ' は ' + t + 'dL。', note: ldl(l, d) + ' = ' + t + 'dL', key: 'cmpl:' + t + ':' + other
        });
      },
      function subMix() {
        const a = U.randInt(3, 9), ad = U.randInt(3, 9), b = U.randInt(1, a - 1), bd = U.randInt(1, ad - 1);
        return choice('かさの けいさん', ldl(a, ad) + ' − ' + ldl(b, bd) + ' は？', withDistractors(ldl(a - b, ad - bd), [ldl(a - b, ad - bd + 1), ldl(a - b + 1, ad - bd), ldl(a - b, ad + bd), ldl(a - b - 1 || 1, ad - bd)]), {
          hint: 'L は L どうし、dL は dL どうし ひこう。', note: ldl(a, ad) + ' − ' + ldl(b, bd) + ' = ' + ldl(a - b, ad - bd), key: 'sl:' + a + ':' + ad + ':' + b + ':' + bd
        });
      }
    ],
    boss: [
      function bossMlToMix() {
        const l = U.randInt(1, 5), d = U.randInt(1, 9), t = l * 1000 + d * 100;
        return choice('L と dL と mL', t + 'mL は なんL なんdL？', withDistractors(ldl(l, d), [ldl(d, l), ldl(l, d + 1), ldl(l + 1, d), ldl(l, d - 1 || 1)]), {
          hint: '1000mL で 1L、100mL で 1dL。', note: t + 'mL = ' + ldl(l, d), key: 'ml2l:' + t
        });
      },
      function bossWord() {
        const a = U.randInt(1, 4), ad = U.randInt(1, 5), b = U.randInt(1, 3), bd = U.randInt(1, 4);
        return num('かさの けいさん', 'ぎゅうにゅうが ' + ldl(a, ad) + '、ジュースが ' + ldl(b, bd) + ' あります。あわせて なんdL？', (a + b) * 10 + ad + bd, {
          hint: 'どちらも dL に なおして たそう。' + ldl(a, ad) + ' は ' + (a * 10 + ad) + 'dL。', note: (a * 10 + ad) + 'dL + ' + (b * 10 + bd) + 'dL = ' + ((a + b) * 10 + ad + bd) + 'dL', key: 'bwl:' + a + ':' + ad + ':' + b + ':' + bd
        });
      },
      function bossAddCarry() {
        const a = U.randInt(1, 4), ad = U.randInt(5, 9), b = U.randInt(1, 3), bd = U.randInt(11 - ad, 9);
        const td = ad + bd, tl = a + b + Math.floor(td / 10), rd = td % 10;
        return choice('かさの けいさん', ldl(a, ad) + ' + ' + ldl(b, bd) + ' は？', withDistractors(ldl(tl, rd), [ldl(a + b, td), ldl(tl, rd + 1), ldl(tl - 1, rd), ldl(tl, rd + 5)]), {
          hint: 'dL どうしを たすと 10 を こえる。10dL を 1L に くり上げよう。', note: ldl(a, ad) + ' + ' + ldl(b, bd) + ' = ' + ldl(tl, rd), key: 'balc:' + a + ':' + ad + ':' + b + ':' + bd
        });
      }
    ]
  };

  /* =======================================================
     ステージ7 とけいと じかん（とけいの 絵は sansu1 の clockQ）
     ======================================================= */
  function nextH(h) { return h === 12 ? 1 : h + 1; }
  function fun(m) { return [1, 3, 4, 6, 8, 0].indexOf(m % 10) !== -1 ? 'ぷん' : 'ふん'; }
  function jf(h, m) { return m === 0 ? h + 'じ' : h + 'じ' + m + fun(m); }
  function addMin(h, m, d) { let mm = m + d, hh = h; while (mm >= 60) { mm -= 60; hh = nextH(hh); } return [hh, mm]; }
  const stage7 = {
    easy: [
      function read() {
        const h = U.randInt(1, 12), m = U.randInt(0, 11) * 5;
        return choice('とけいを よむ', S1.clockQ('なんじ なんぷん？', h, m), withDistractors(jf(h, m), [jf(nextH(h), m), jf(h, (m + 5) % 60), jf(h, (m + 55) % 60)]), {
          hint: 'みじかい はりが すぎた かずが「なんじ」、ながい はりは 1めもりが 1ぷん（5とび）。', note: jf(h, m), key: 'rd:' + h + ':' + m
        });
      },
      function readHour() {
        const h = U.randInt(1, 12);
        return choice('とけいを よむ', S1.clockQ('なんじ？', h, 0), withDistractors(jf(h, 0), [jf(nextH(h), 0), h + 'じはん', jf(h === 1 ? 12 : h - 1, 0)]), {
          hint: 'ながい はりが 12 だから「ちょうど」。みじかい はりの かずを よもう。', note: jf(h, 0), key: 'rh:' + h
        });
      },
      function unitFacts() {
        const list = [
          { t: '1じかん は なんぷん？', a: 60, n: '1じかん = 60ぷん', h: 'ながい はりが 1しゅう する じかんだよ。' },
          { t: '1にち は なんじかん？', a: 24, n: '1にち = 24じかん', h: 'ごぜん 12じかん と ごご 12じかん。' },
          { t: 'ごぜん は なんじかん？', a: 12, n: 'ごぜん は 12じかん', h: 'よなかの 12じ から ひるの 12じ まで。' },
          { t: 'ごご は なんじかん？', a: 12, n: 'ごご は 12じかん', h: 'ひるの 12じ から よなかの 12じ まで。' },
          { t: '2じかん は なんぷん？', a: 120, n: '2じかん = 120ぷん', h: '1じかんは 60ぷん。60 + 60。' },
          { t: '30ぷんが 2つで なんぷん？', a: 60, n: '30 + 30 = 60ぷん（1じかん）', h: '30 + 30。' }
        ];
        const it = pickFrom(list);
        return num('じかんの たんい', it.t, it.a, { hint: it.h, note: it.n, key: 'uf:' + it.t });
      }
    ],
    normal: [
      function laterMin() {
        const h = U.randInt(1, 12), m = U.randInt(0, 5) * 5, d = pickFrom([10, 20, 30]);
        const r = addMin(h, m, d);
        return choice(d + 'ぷん あと', S1.clockQ('この とけいの ' + d + 'ぷん あとは？', h, m), withDistractors(jf(r[0], r[1]), [jf(h, m), jf(nextH(r[0]), r[1]), jf(r[0], (r[1] + 5) % 60)]), {
          hint: 'いまは ' + jf(h, m) + '。ながい はりを ' + d + 'ぷん ぶん すすめよう。', note: jf(h, m) + ' の ' + d + 'ぷん あとは ' + jf(r[0], r[1]), key: 'lm:' + h + ':' + m + ':' + d
        });
      },
      function hoursBetween() {
        const a = U.randInt(1, 9), b = U.randInt(a + 1, 12);
        return num('なんじかん', a + 'じ から ' + b + 'じ まで なんじかん？', b - a, { hint: 'みじかい はりが ' + a + ' から ' + b + ' まで いくつ すすむ？', note: b + ' − ' + a + ' = ' + (b - a) + '（じかん）', key: 'hb:' + a + ':' + b });
      },
      function amPm() {
        const items = [['あさ おきる', 'ごぜん'], ['あさごはん を たべる', 'ごぜん'], ['がっこうへ いく', 'ごぜん'], ['ゆうごはん を たべる', 'ごご'], ['おふろに はいる', 'ごご'], ['よる ねる', 'ごご'], ['ひるごはん の あとに あそぶ', 'ごご'], ['よなかの 1じ', 'ごぜん']];
        const it = pickFrom(items);
        return choice('ごぜん と ごご', '「' + it[0] + '」のは ごぜん？ ごご？', [it[1], it[1] === 'ごぜん' ? 'ごご' : 'ごぜん'], {
          hint: 'よなかの 12じ から ひるの 12じ までが ごぜん、ひるの 12じ から よなかの 12じ までが ごご。', note: it[0] + ' のは ' + it[1], key: 'ap:' + it[0]
        });
      }
    ],
    hard: [
      function minutesBetween() {
        const h = U.randInt(1, 12), a = U.randInt(0, 5) * 5, b = U.randInt(a / 5 + 1, 11) * 5;
        return num('なんぷん', jf(h, a) + ' から ' + jf(h, b) + ' まで なんぷん？', b - a, { hint: 'ながい はりが ' + (a / 5) + ' から ' + (b / 5) + ' まで すすむ。5とびで かぞえよう。', note: b + ' − ' + a + ' = ' + (b - a) + '（ぷん）', key: 'mb:' + h + ':' + a + ':' + b });
      },
      function laterCross() {
        const h = U.randInt(1, 12), m = U.randInt(7, 11) * 5, d = pickFrom([10, 20, 30]);
        const r = addMin(h, m, d);
        return choice(d + 'ぷん あと', S1.clockQ('この とけいの ' + d + 'ぷん あとは？', h, m), withDistractors(jf(r[0], r[1]), [jf(h, (m + d) % 60), jf(h, m), jf(nextH(r[0]), r[1])]), {
          hint: 'いまは ' + jf(h, m) + '。' + d + 'ぷん すすめると 12 を こえて つぎの じに なるよ。', note: jf(h, m) + ' の ' + d + 'ぷん あとは ' + jf(r[0], r[1]), key: 'lc:' + h + ':' + m + ':' + d
        });
      },
      function hourMinToMin() {
        const h = U.randInt(1, 2), m = pickFrom([10, 20, 30, 40, 50]);
        return num('じかんの たんい', h + 'じかん ' + m + 'ぷん は なんぷん？', h * 60 + m, { hint: '1じかん は 60ぷん。' + h + 'じかん は ' + (h * 60) + 'ぷん。それに ' + m + 'ぷん。', note: h + 'じかん ' + m + 'ぷん = ' + (h * 60 + m) + 'ぷん', key: 'hm:' + h + ':' + m });
      }
    ],
    boss: [
      function bossBetween() {
        const h = U.randInt(1, 11), a = U.randInt(1, 11) * 5, b = U.randInt(0, a / 5 - 1) * 5;
        return num('なんぷん', jf(h, a) + ' から ' + jf(nextH(h), b) + ' まで なんぷん？', 60 - a + b, { hint: jf(h, a) + ' から ' + nextH(h) + 'じ まで ' + (60 - a) + 'ぷん。それに ' + b + 'ぷん。', note: (60 - a) + ' + ' + b + ' = ' + (60 - a + b) + '（ぷん）', key: 'bb:' + h + ':' + a + ':' + b });
      },
      function bossEarlier() {
        const h = U.randInt(1, 12), m = U.randInt(0, 3) * 5, d = pickFrom([10, 20, 30]);
        let mm = m - d, hh = h; while (mm < 0) { mm += 60; hh = hh === 1 ? 12 : hh - 1; }
        return choice(d + 'ぷん まえ', S1.clockQ('この とけいの ' + d + 'ぷん まえは？', h, m), withDistractors(jf(hh, mm), [jf(h, m), jf(h, (m + d) % 60), jf(nextH(hh), mm)]), {
          hint: 'いまは ' + jf(h, m) + '。ながい はりを ' + d + 'ぷん ぶん もどそう。12 を こえたら まえの じ。', note: jf(h, m) + ' の ' + d + 'ぷん まえは ' + jf(hh, mm), key: 'be:' + h + ':' + m + ':' + d
        });
      },
      function bossMinToHourMin() {
        const h = U.randInt(1, 2), m = pickFrom([10, 20, 30, 40, 50]);
        return choice('じかんの たんい', (h * 60 + m) + 'ぷん は なんじかん なんぷん？', withDistractors(h + 'じかん ' + m + 'ぷん', [(h + 1) + 'じかん ' + m + 'ぷん', h + 'じかん ' + (m + 10) + 'ぷん', h + 'じかん ' + (h * 60 + m) + 'ぷん']), {
          hint: '60ぷん ごとに 1じかん。', note: (h * 60 + m) + 'ぷん = ' + h + 'じかん ' + m + 'ぷん', key: 'bmh:' + h + ':' + m
        });
      }
    ]
  };

  /* =======================================================
     かたちの 図（inline SVG。画像ファイルは 使わない）
     線は 黒・中は クリーム・ちょっかくの しるしは 赤。はこは 見えない へんを てんせんで。
     viewBox は いつも 160×120。大きさは CSS（.figbox / .figpair）で 決める。
     ======================================================= */
  const FIG_STROKE = '#1a1a1a', FIG_FILL = '#FFF3C4', FIG_FILL2 = '#FFE58A', FIG_FILL3 = '#F2C96B', FIG_RED = '#d42a20';
  function poly(points, fill) {
    return '<polygon points="' + points.map(function (p) { return p.join(','); }).join(' ') + '" fill="' + (fill || FIG_FILL) + '" stroke="' + FIG_STROKE + '" stroke-width="4" stroke-linejoin="round"/>';
  }
  function line(a, b, dashed) {
    return '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="' + FIG_STROKE + '" stroke-width="4" stroke-linecap="round"' + (dashed ? ' stroke-dasharray="7 6"' : '') + '/>';
  }
  // ちょっかくの しるし（かどに 小さな 四角）。corner=かどの 点、dx/dy=となりの 2つの へんの むき
  function raMark(corner, ux, uy, vx, vy) {
    const s = 12;
    const p1 = [corner[0] + ux * s, corner[1] + uy * s];
    const p2 = [corner[0] + ux * s + vx * s, corner[1] + uy * s + vy * s];
    const p3 = [corner[0] + vx * s, corner[1] + vy * s];
    return '<polyline points="' + [p1, p2, p3].map(function (p) { return p.join(','); }).join(' ') + '" fill="none" stroke="' + FIG_RED + '" stroke-width="3"/>';
  }
  function svgWrap(inner) { return '<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + inner + '</svg>'; }
  const FIGS = {
    tri: function () { return svgWrap(poly([[20, 104], [140, 104], [80, 18]])); },
    rtri: function () { return svgWrap(poly([[28, 104], [138, 104], [28, 16]]) + raMark([28, 104], 1, 0, 0, -1)); },
    quad: function () { return svgWrap(poly([[28, 104], [142, 94], [122, 24], [44, 36]])); },
    rect: function (diag) {
      const pts = [[18, 24], [142, 24], [142, 100], [18, 100]];
      return svgWrap(poly(pts) + raMark(pts[0], 1, 0, 0, 1) + raMark(pts[1], -1, 0, 0, 1) + raMark(pts[2], -1, 0, 0, -1) + raMark(pts[3], 1, 0, 0, -1) + (diag ? line([18, 100], [142, 24], true) : ''));
    },
    square: function () {
      const pts = [[40, 20], [120, 20], [120, 100], [40, 100]];
      return svgWrap(poly(pts) + raMark(pts[0], 1, 0, 0, 1) + raMark(pts[1], -1, 0, 0, 1) + raMark(pts[2], -1, 0, 0, -1) + raMark(pts[3], 1, 0, 0, -1));
    },
    // はこの かたち（見える 3つの めん ＋ 見えない へんは てんせん）
    box: function (cube) {
      const w = cube ? 64 : 84, h = cube ? 64 : 58, d = cube ? 26 : 30;
      const x0 = cube ? 34 : 24, y0 = 110 - h;                 // まえの めんの ひだり下
      const F = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]];               // まえ
      const T = [[x0, y0], [x0 + d, y0 - d], [x0 + w + d, y0 - d], [x0 + w, y0]];       // うえ
      const S = [[x0 + w, y0], [x0 + w + d, y0 - d], [x0 + w + d, y0 + h - d], [x0 + w, y0 + h]]; // よこ
      const hidden = [x0 + d, y0 + h - d];                                              // うしろの ひだり下（見えない ちょうてん）
      return svgWrap(poly(F) + poly(T, FIG_FILL2) + poly(S, FIG_FILL3) +
        line(hidden, [x0 + d, y0 - d], true) + line(hidden, [x0 + w + d, y0 + h - d], true) + line(hidden, [x0, y0 + h], true));
    }
  };
  function fig(kind, arg) { return '<span class="figbox">' + FIGS[kind](arg) + '</span>'; }
  // 問題文の 右に 図を おく（とけいと 同じ よこならび）
  function figQ(text, kind, arg) { return '<span class="figq"><span class="figq__t">' + text + '</span>' + fig(kind, arg) + '</span>'; }
  // 図を 2つ ならべて「あ」「い」で えらばせる
  function figPair(text, kindA, kindB) {
    return text + '<span class="figpair"><span class="fig"><b>あ</b>' + FIGS[kindA]() + '</span><span class="fig"><b>い</b>' + FIGS[kindB]() + '</span></span>';
  }

  /* =======================================================
     ステージ9 かたち（図つき・決まった 問題から えらぶ）
     ======================================================= */
  function fq(unit, prompt, choices, note, hint, key) { return { type: 'choice', unit: unit, prompt: prompt, choices: choices, answer: 0, note: note, hint: hint, key: 'k:' + key }; }
  function fn(unit, prompt, answer, note, hint, key) { return { type: 'number', unit: unit, prompt: prompt, answer: answer, scratch: false, note: note, hint: hint, key: 'k:' + key }; }
  const NAMES4 = ['さんかくけい', 'しかくけい', 'ちょうほうけい', 'せいほうけい', 'ちょっかくさんかくけい'];
  function nameChoices(ans) { return [ans].concat(NAMES4.filter(function (n) { return n !== ans; }).slice(0, 3)); }
  const SHAPE_EASY = [
    fn('さんかくけい', figQ('この さんかくけいの へんは なんぼん？', 'tri'), 3, 'さんかくけいは 3ぼんの まっすぐな せん（へん）で かこまれた かたち。', 'まわりの まっすぐな せんを かぞえよう。', 'tri-e'),
    fn('さんかくけい', figQ('この さんかくけいの ちょうてんは いくつ？', 'tri'), 3, 'かどの てんが ちょうてん。さんかくけいは 3つ。', 'かどを かぞえよう。', 'tri-v'),
    fn('しかくけい', figQ('この しかくけいの へんは なんぼん？', 'quad'), 4, 'しかくけいは 4ほんの へんで かこまれた かたち。', 'まわりの まっすぐな せんを かぞえよう。', 'quad-e'),
    fn('しかくけい', figQ('この しかくけいの ちょうてんは いくつ？', 'quad'), 4, 'しかくけいの かど（ちょうてん）は 4つ。', 'かどを かぞえよう。', 'quad-v'),
    fq('かたちの なまえ', figQ('この かたちの なまえは？', 'tri'), ['さんかくけい', 'しかくけい', 'まる', 'はこの かたち'], 'さんかくけい。「さん」は 3 の こと。へんが 3ぼん。', 'へんを かぞえよう。', 'name-tri'),
    fq('かたちの なまえ', figQ('この かたちの なまえは？', 'quad'), ['しかくけい', 'さんかくけい', 'まる', 'ぼうの かたち'], 'しかくけい。「し」は 4 の こと。へんが 4ほん。', 'へんを かぞえよう。', 'name-quad'),
    fq('かたちの なまえ', figPair('へんが 3ぼんの かたちは どっち？', 'tri', 'quad'), ['あ', 'い'], 'あ が さんかくけい（へん 3ぼん）。い は しかくけい（へん 4ほん）。', 'まわりの せんを かぞえよう。', 'pair-tri'),
    fq('かたちの なまえ', figPair('ちょうてんが 4つの かたちは どっち？', 'tri', 'quad'), ['い', 'あ'], 'い が しかくけい（ちょうてん 4つ）。', 'かどを かぞえよう。', 'pair-quad')
  ];
  const SHAPE_NORMAL = [
    fq('ちょうほうけい', figQ('この かたちの なまえは？（かどは みんな ちょっかく）', 'rect'), nameChoices('ちょうほうけい'), 'ちょうほうけい。4つの かどが みんな ちょっかく。', 'ノートや ドアの かたち。', 'name-rect'),
    fq('せいほうけい', figQ('この かたちの なまえは？（かどは みんな ちょっかく・へんは みんな おなじ ながさ）', 'square'), nameChoices('せいほうけい'), 'せいほうけい。かども へんも みんな おなじ。', 'おりがみの かたち。', 'name-square'),
    fq('ちょっかくさんかくけい', figQ('この かたちの なまえは？（赤い しるしは ちょっかく）', 'rtri'), nameChoices('ちょっかくさんかくけい'), 'ちょっかくさんかくけい。ちょっかくの かどが 1つ ある さんかくけい。', 'ちょうほうけいを ななめに きった かたち。', 'name-rtri'),
    fn('ちょっかく', figQ('この かたちに ちょっかくの かどは いくつ？（赤い しるし）', 'rect'), 4, 'ちょうほうけいの かどは 4つ とも ちょっかく。', '赤い しるしを かぞえよう。', 'ra-rect'),
    fn('ちょっかく', figQ('この かたちに ちょっかくの かどは いくつ？（赤い しるし）', 'rtri'), 1, 'ちょっかくさんかくけいの ちょっかくは 1つ。', '赤い しるしを かぞえよう。', 'ra-rtri'),
    fq('ちょうほうけい', figQ('ちょうほうけいの むかいあう へんの ながさは？', 'rect'), ['おなじ', 'ちがう', 'かたほうが 2ばい', 'きまっていない'], 'ちょうほうけいは むかいあう へんの ながさが おなじ。', 'うえと したの へんを くらべよう。', 'rect-opp'),
    fq('ちょっかく', 'かみを 2かい おって できる かどを なんと いう？', ['ちょっかく', 'まるいかど', 'とがった かど', 'はんかく'], 'ちょっかく。ちょうほうけいの かどは みんな ちょっかく。', 'ノートの かどと おなじ 大きさの かど。', 'ra-fold'),
    fq('かたちの なまえ', figPair('せいほうけいは どっち？', 'rect', 'square'), ['い', 'あ'], 'い が せいほうけい（へんが みんな おなじ ながさ）。あ は ちょうほうけい。', 'へんの ながさを くらべよう。', 'pair-square')
  ];
  const SHAPE_HARD = [
    fn('はこの かたち', figQ('この はこの めんは いくつ？（見えない めんも かぞえる）', 'box'), 6, 'はこの めんは 6つ。うえ・した・まえ・うしろ・みぎ・ひだり。', 'さいころを おもいだそう。見えない めんも あるよ。', 'box-f'),
    fn('はこの かたち', figQ('この はこの へんは なんぼん？（てんせんも かぞえる）', 'box'), 12, 'はこの へんは 12ほん。', 'うえに 4ほん、したに 4ほん、たてに 4ほん。', 'box-e'),
    fn('はこの かたち', figQ('この はこの ちょうてんは いくつ？（見えない ちょうてんも かぞえる）', 'box'), 8, 'はこの ちょうてんは 8つ。', 'うえに 4つ、したに 4つ。', 'box-v'),
    fq('さいころの かたち', figQ('この さいころの かたちの めんは どんな かたち？', 'box', true), ['せいほうけい', 'ちょうほうけい', 'さんかくけい', 'まる'], 'さいころの めんは ぜんぶ せいほうけい。', 'めんは ぜんぶ おなじ 大きさの ましかく。', 'cube-face'),
    fq('はこの かたち', figQ('この はこの めんは どんな かたち？', 'box'), ['ちょうほうけい', 'さんかくけい', 'まる', 'ほし'], 'はこの めんは ちょうほうけい（か せいほうけい）。', 'ティッシュの はこの めんを 見てみよう。', 'box-face'),
    fq('ちょっかくさんかくけい', figQ('ちょうほうけいを てんせんで きると、できる かたちは？', 'rect', true), ['ちょっかくさんかくけい', 'せいほうけい', 'まる', 'ちょうほうけい'], 'ななめに きると ちょっかくさんかくけいが 2つ できる。', 'ちょっかくの かどが のこるよ。', 'rect-cut'),
    fn('ちょっかくさんかくけい', figQ('ちょうほうけいを てんせんで きると、ちょっかくさんかくけいは いくつ できる？', 'rect', true), 2, 'ちょっかくさんかくけいが 2つ できる。', 'てんせんの うえと したで 1つずつ。', 'rect-cut-n')
  ];
  const SHAPE_BOSS = [
    fq('さいころの かたち', figQ('さいころの かたちに ついて、ただしいのは どれ？', 'box', true), ['めんが 6つで、ぜんぶ せいほうけい', 'めんが 4つ', 'へんが 6ぽん', 'ちょうてんが 6つ'], 'さいころは めん 6・へん 12・ちょうてん 8。めんは ぜんぶ せいほうけい。', 'めん・へん・ちょうてんの かずを おもいだそう。', 'cube-fact'),
    fn('はこの かたち', figQ('この はこの へんの かずから ちょうてんの かずを ひくと？', 'box'), 4, 'へん 12 − ちょうてん 8 = 4。', 'へんは 12ほん、ちょうてんは 8つ。', 'box-sub'),
    fq('せいほうけい', figQ('この かたちに ついて、ただしいのは どれ？', 'square'), ['4つの へんの ながさが みんな おなじ', 'へんが 3ぼん', 'かどが 1つだけ ちょっかく', 'まるい'], 'せいほうけいは へん 4ほんが みんな おなじ ながさで、かどは みんな ちょっかく。', 'おりがみの かたち。', 'square-fact'),
    fq('ちょうほうけい', figPair('あ と い の ちがいは？', 'rect', 'square'), ['へんの ながさが ぜんぶ おなじか どうか', 'かどが ちょっかくか どうか', 'へんの かず', 'ちょうてんの かず'], 'どちらも かどは ちょっかく。い（せいほうけい）は へんが ぜんぶ おなじ ながさ。', 'かどは どちらも ちょっかく。', 'pair-diff'),
    fn('さんかくけい', figQ('てんせんで わけた 2つの さんかくけいを あわせると、ちょうてんは いくつ？', 'rect', true), 4, 'あわせると ちょうほうけい。ちょうてんは 4つ。', 'できあがった かたちは しかくけい。', 'rect-join'),
    fn('はこの かたち', figQ('この さいころの かたちの へんは なんぼん？', 'box', true), 12, 'さいころの かたちも へんは 12ほん。', 'はこの かたちと おなじ。', 'cube-e')
  ];
  const stage9 = {
    easy: [fixed(SHAPE_EASY), fixed(SHAPE_EASY)],
    normal: [fixed(SHAPE_NORMAL), fixed(SHAPE_NORMAL)],
    hard: [fixed(SHAPE_HARD), fixed(SHAPE_HARD)],
    boss: [fixed(SHAPE_BOSS), fixed(SHAPE_BOSS)]
  };

  /* =======================================================
     ステージ10 かけざん（1）2・5・3・4の だん／ステージ11 かけざん（2）6・7・8・9・1の だん
     ======================================================= */
  function mulQ(a, b, unit) {
    return num(unit || 'かけざん', expr(a, '×', b), a * b, {
      hint: a + ' の ' + b + 'こぶん。' + a + 'のだんを となえよう。' + a + '、' + (a * 2) + '、' + (a * 3) + '…', note: a + ' × ' + b + ' = ' + (a * b)
    });
  }
  function mulWord(dans) {
    const a = pickFrom(dans), b = U.randInt(2, 9);
    const items = [['1さらに ' + a + 'こずつ', 'さら', 'こ'], ['1ふくろに ' + a + 'こずつ', 'ふくろ', 'こ'], ['1人に ' + a + 'ほんずつ', '人', 'ほん'], ['1はこに ' + a + 'こずつ', 'はこ', 'こ']];
    const it = pickFrom(items);
    return num('かけざんの もんだい', it[0] + ' ' + b + it[1] + ' ぶん あります。ぜんぶで なん' + it[2] + '？', a * b, {
      hint: '「1つぶん × いくつぶん」。' + a + ' × ' + b + '。', note: a + ' × ' + b + ' = ' + (a * b) + '（' + it[2] + '）', key: 'mw:' + a + ':' + b + ':' + it[1]
    });
  }
  function mulMissing(dans, hideFirst) {
    const a = pickFrom(dans), b = U.randInt(2, 9);
    const shown = hideFirst ? '□ × ' + b + ' = ' + (a * b) : a + ' × □ = ' + (a * b);
    return num('□の かけざん', box(shown), hideFirst ? a : b, {
      hint: hideFirst ? ('なんのだんの ' + b + 'こめが ' + (a * b) + ' に なる？') : (a + 'のだんで ' + (a * b) + ' に なるのは いくつめ？'), note: a + ' × ' + b + ' = ' + (a * b), key: 'mm:' + a + ':' + b + ':' + (hideFirst ? 1 : 0)
    });
  }
  function mulWhich(dans) {
    const a = pickFrom(dans), b = U.randInt(2, 9), p = a * b;
    const cands = [];
    let guard = 0;
    while (cands.length < 3 && guard++ < 40) {
      const x = U.randInt(2, 9), y = U.randInt(2, 9);
      if (x * y === p) continue;
      const t = x + ' × ' + y;
      if (cands.indexOf(t) === -1) cands.push(t);
    }
    return choice('かけざん', 'こたえが ' + p + ' に なる しきは どれ？', [a + ' × ' + b].concat(cands), {
      hint: 'ひとつずつ けいさんして、' + p + ' に なる ものを さがそう。', note: a + ' × ' + b + ' = ' + p, key: 'mwh:' + a + ':' + b + ':' + cands.join('|')
    });
  }
  function bai(dans) {
    const a = pickFrom(dans), b = U.randInt(2, 6);
    return num('ばい', a + 'cm の ' + b + 'ばいは なんcm？', a * b, { hint: b + 'ばい は ' + b + 'こぶん。' + a + ' × ' + b + '。', note: a + ' × ' + b + ' = ' + (a * b) + '（cm）', key: 'bai:' + a + ':' + b });
  }
  const D1 = [2, 5, 3, 4], D2 = [6, 7, 8, 9, 1], DALL = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const stage10 = {
    easy: [
      function two() { return mulQ(pickFrom([2, 5]), U.randInt(1, 9)); },
      function three() { return mulQ(pickFrom([3, 4]), U.randInt(1, 9)); }
    ],
    normal: [
      function any() { return mulQ(pickFrom(D1), U.randInt(2, 9)); },
      function word() { return mulWord(D1); },
      function missing() { return mulMissing(D1, false); }
    ],
    hard: [
      function which() { return mulWhich(D1); },
      function baiQ() { return bai(D1); },
      function missingFirst() { return mulMissing(D1, true); }
    ],
    boss: [
      function bossWord() { return mulWord(D1); },
      function bossWhich() { return mulWhich(D1); },
      function bossMissing() { return mulMissing(D1, Math.random() < 0.5); }
    ]
  };
  const stage11 = {
    easy: [
      function six() { return mulQ(pickFrom([6, 7]), U.randInt(1, 9)); },
      function eight() { return mulQ(pickFrom([8, 9, 1]), U.randInt(1, 9)); }
    ],
    normal: [
      function any() { return mulQ(pickFrom(D2), U.randInt(2, 9)); },
      function all() { return mulQ(pickFrom(DALL), U.randInt(2, 9), '九九'); },
      function word() { return mulWord(D2); }
    ],
    hard: [
      function which() { return mulWhich(DALL); },
      function missing() { return mulMissing(DALL, Math.random() < 0.5); },
      function sameAnswer() {
        const pairs = [[2, 6, 3, 4], [2, 8, 4, 4], [2, 9, 3, 6], [3, 8, 4, 6], [4, 9, 6, 6], [2, 4, 1, 8], [3, 6, 2, 9], [4, 6, 3, 8], [6, 6, 4, 9]];
        const p = pickFrom(pairs);
        const ans = p[2] + ' × ' + p[3];
        const cands = [];
        let guard = 0;
        while (cands.length < 3 && guard++ < 40) {
          const x = U.randInt(2, 9), y = U.randInt(2, 9);
          if (x * y === p[0] * p[1]) continue;
          const t = x + ' × ' + y;
          if (cands.indexOf(t) === -1) cands.push(t);
        }
        return choice('九九', p[0] + ' × ' + p[1] + ' と こたえが おなじ しきは？', [ans].concat(cands), {
          hint: p[0] + ' × ' + p[1] + ' = ' + (p[0] * p[1]) + '。おなじ こたえに なる しきを さがそう。', note: p[0] + ' × ' + p[1] + ' = ' + ans + ' = ' + (p[0] * p[1]), key: 'same:' + p.join(':') + ':' + cands.join('|')
        });
      }
    ],
    boss: [
      function bossMissing() { return mulMissing(D2, true); },
      function bossWord() { return mulWord(D2); },
      function bossBai() { return bai(D2); },
      function bossWhich() { return mulWhich(D2); }
    ]
  };

  /* =======================================================
     ステージ14 ぶんすう（図つき：おなじ 大きさに わけた 1つに いろ）
     ======================================================= */
  function bun(n) { return n + 'ぶんの 1'; }
  // よこながの 四角を n こに わけて、shaded こに いろを つける
  function fracSvg(n, shaded) {
    const w = 150 / n;
    let s = '';
    for (let i = 0; i < n; i++) {
      s += '<rect x="' + (5 + i * w) + '" y="30" width="' + w + '" height="60" fill="' + (i < shaded ? FIG_RED : '#fff') + '" stroke="' + FIG_STROKE + '" stroke-width="4"/>';
    }
    return '<span class="figbox">' + svgWrap(s) + '</span>';
  }
  function fracQ(text, n, shaded) { return '<span class="figq"><span class="figq__t">' + text + '</span>' + fracSvg(n, shaded == null ? 1 : shaded) + '</span>'; }
  const stage14 = {
    easy: [
      function figName() {
        const n = pickFrom([2, 3, 4]);
        return choice('ぶんすう', fracQ('赤い ところは もとの 大きさの？', n), withDistractors(bun(n), [bun(n + 1), bun(n - 1 || 5), '1ぶんの ' + n, bun(n * 2)]), {
          hint: 'おなじ 大きさに いくつに わけているか かぞえよう。' + n + 'つなら「' + n + 'ぶんの 1」。', note: n + 'つに わけた 1つぶん ＝ ' + bun(n), key: 'fn:' + n
        });
      },
      function name() {
        const n = pickFrom([2, 3, 4]);
        return choice('ぶんすう', 'おなじ 大きさに ' + n + 'つに わけた 1つぶんの 大きさを なんと いう？', withDistractors(bun(n), [bun(n + 1), bun(n - 1 || 5), '1ぶんの ' + n, bun(n * 2)]), {
          hint: n + 'つに わけたら「' + n + 'ぶんの 1」。', note: n + 'つに わけた 1つぶんは ' + bun(n), key: 'nm:' + n
        });
      },
      function halfOf() {
        const n = U.randInt(2, 6) * 2;
        return num('ぶんすう', n + 'この 2ぶんの 1 は なんこ？', n / 2, { hint: n + 'こを おなじ かずずつ 2つに わけよう。', note: n + 'この 2ぶんの 1 は ' + (n / 2) + 'こ', key: 'hf:' + n });
      }
    ],
    normal: [
      function figCount() {
        const n = pickFrom([2, 3, 4, 5, 6]);
        return num('ぶんすう', fracQ('いくつに わけている？', n), n, { hint: 'しきりで わけられた ますを かぞえよう。', note: n + 'つに わけている。赤い ところは ' + bun(n), key: 'fc:' + n });
      },
      function quarterOf() {
        const n = U.randInt(2, 5) * 4;
        return num('ぶんすう', n + 'この 4ぶんの 1 は なんこ？', n / 4, { hint: n + 'こを おなじ かずずつ 4つに わけよう。', note: n + 'この 4ぶんの 1 は ' + (n / 4) + 'こ', key: 'qt:' + n });
      },
      function thirdOf() {
        const n = U.randInt(2, 6) * 3;
        return num('ぶんすう', n + 'この 3ぶんの 1 は なんこ？', n / 3, { hint: n + 'こを おなじ かずずつ 3つに わけよう。', note: n + 'この 3ぶんの 1 は ' + (n / 3) + 'こ', key: 'th:' + n });
      },
      function bigger() {
        const a = pickFrom([2, 3, 4]), b = pickFrom([2, 3, 4].filter(function (x) { return x !== a; }));
        const big = Math.min(a, b);
        return choice('ぶんすう', bun(a) + ' と ' + bun(b) + '、大きいのは どっち？', [bun(big), bun(Math.max(a, b))], {
          hint: 'わける かずが すくない ほうが 1つぶんは 大きい。', note: bun(big) + ' の ほうが 大きい', key: 'bg:' + a + ':' + b
        });
      }
    ],
    hard: [
      function figWhich() {
        const n = pickFrom([2, 3, 4]);
        return choice('ぶんすう', fracQ('赤い ところは もとの 大きさの？', n), withDistractors(bun(n), [bun(n + 1), bun(n - 1 || 5), bun(n * 2)]), {
          hint: 'いくつに わけているか かぞえよう。', note: bun(n), key: 'fw:' + n
        });
      },
      function whole() {
        const n = pickFrom([2, 3, 4]);
        return num('ぶんすう', bun(n) + ' を ' + n + 'こ あつめると もとの 大きさの いくつぶん？', 1, { hint: n + 'つに わけた ものを ' + n + 'こ あわせると もとに もどる。', note: bun(n) + ' が ' + n + 'こで 1', key: 'wh:' + n });
      },
      function howMany() {
        const n = pickFrom([2, 3, 4]);
        return num('ぶんすう', fracQ('もとの 大きさは 赤い ところの いくつぶん？', n), n, { hint: n + 'つに わけたのだから、' + n + 'こぶん。', note: 'もとの 大きさは ' + bun(n) + ' の ' + n + 'こぶん', key: 'hm:' + n });
      },
      function partOfLen() {
        const n = pickFrom([2, 4]), len = U.randInt(2, 5) * n;
        return num('ぶんすう', len + 'cm の テープの ' + bun(n) + ' は なんcm？', len / n, { hint: len + ' を ' + n + 'つに わけよう。', note: len + 'cm の ' + bun(n) + ' は ' + (len / n) + 'cm', key: 'pl:' + n + ':' + len });
      }
    ],
    boss: [
      function bossPart() {
        const n = pickFrom([2, 3, 4]), len = U.randInt(3, 8) * n;
        return num('ぶんすう', len + 'この あめの ' + bun(n) + ' は なんこ？', len / n, { hint: len + ' を おなじ かずずつ ' + n + 'つに わけよう。', note: len + 'この ' + bun(n) + ' は ' + (len / n) + 'こ', key: 'bp:' + n + ':' + len });
      },
      function bossWhich() {
        const n = pickFrom([2, 3, 4]), part = U.randInt(2, 6);
        return num('ぶんすう', 'ある かずの ' + bun(n) + ' が ' + part + 'こ です。もとの かずは いくつ？', part * n, { hint: bun(n) + ' が ' + part + 'こ なら、もとは ' + part + ' の ' + n + 'ばい。', note: part + ' × ' + n + ' = ' + (part * n), key: 'bw:' + n + ':' + part });
      },
      function bossTwo() {
        const n = pickFrom([3, 4, 5, 6]);
        return choice('ぶんすう', fracQ('赤い ところは もとの 大きさの？', n), withDistractors(bun(n), [bun(n + 1), bun(n - 1), bun(2)]), {
          hint: 'ますの かずを かぞえよう。', note: bun(n), key: 'bt:' + n
        });
      }
    ]
  };

  const stages = { 1: stage1, 2: stage2, 3: stage3, 4: stage4, 5: stage5, 6: stage6, 7: stage7, 8: stage8, 9: stage9, 10: stage10, 11: stage11, 12: stage12, 13: stage13, 14: stage14 };

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
  function idOf(stageNo, q) { return 'sansu2-' + stageNo + ':' + (q.key || U.stripTags(q.prompt)); }

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
        while (seen[idOf(stageNo, q)] && tries++ < 16) q = maker();
        q.lv = p[1];
        q.id = idOf(stageNo, q);
        seen[q.id] = true;
        out.push(q);
      });
    });
    return out;
  }

  return { make: make, stages: stages, levelCounts: levelCounts, fig: fig, figPair: figPair, fracSvg: fracSvg };
})();
