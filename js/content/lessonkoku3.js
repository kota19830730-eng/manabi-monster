/* ---------------------------------------------------------
   しゅぎょうば の 指導の 中身：小3 国語「ものがたりを 読む」（v14.13）

   ユーザーの 壁打ち（2026-09-20）で わかった 息子さんの つまずきは 2つ。
     ①長い 文を 読みたがらない
     ②読んでも 意味が 入って こない
   だから 1本めの コツは「なぜ」の 解き方では なく、
   **「だれが・どこで・何を した」の 3つだけ さがす**。
   ぜんぶ おぼえようと しなくて いい、と 先に 伝えるのが いちばん 大事。

   書き方は lesson3.js と 同じ（intro／explain／steps／miss）。
   ただし この ステージは 問題が ぜんぶ 同じ unit なので、
   steps の when は ぜんぶ 同じに して、**中身の 出しわけは make の 中で 問題文を 見て** やる
   （make が null を かえすと つぎの step に 進む しくみ）。

   文は 小3までの かん字＋ひらがな・文節ごとに スペース（smoke が 検査）。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.lessons = MQ.lessons || (function () {
  const table = {};
  function add(stageId, lesson) { lesson.id = stageId; table[stageId] = lesson; return lesson; }
  function get(stageId) { return table[stageId] || null; }
  function has(stageId) { return !!table[stageId]; }
  function ids() { return Object.keys(table); }
  return { add: add, get: get, has: has, ids: ids, table: table };
})();

(function () {
  const L = MQ.lessons;

  function ex(html) { return '<div class="dojo__ex">' + html + '</div>'; }
  function line(s) { return '<p>' + s + '</p>'; }
  const ASK = 'まず なにを さがす？';
  const WHEN = /ものがたり/;

  // 問題文の しゅるいを 見わける
  function kind(q) {
    const t = String(q.text || q.prompt || '').replace(/<[^>]+>/g, '');
    if (/なぜ|どうして/.test(t)) return 'why';
    if (/気もち/.test(t)) return 'kimochi';
    if (/だれ/.test(t)) return 'who';
    if (/どこ/.test(t)) return 'where';
    if (/どのよう|どんな ふう|どのように/.test(t)) return 'how';
    if (/どんな/.test(t)) return 'what';
    return 'other';
  }
  function pick3(ask, ok, ng1, ng2, why) { return { ask: ask, choices: [ok, ng1, ng2], why: why }; }
  function stepIf(want, fn) {
    return { when: WHEN, make: function (q) { return kind(q) === want ? fn(q) : null; } };
  }

  L.add('kokugo3-6', {
    intro: 'きょうは お話の 読み方だよ。長い 文を ぜんぶ おぼえなくて いい。コツが あるんだ。',

    explain: [
      {
        say: 'お話を 読む とき、ぜんぶ おぼえようと しなくて いいよ。さがすのは たった 3つ。「だれが」「どこで」「何を した」。この 3つが わかれば、その 場面が 頭の 中に 見えて くるよ。',
        ex: ex(line('<b>① だれが</b>　← 人や 生きものの 名前') +
               line('<b>② どこで</b>　← 場所の ことば') +
               line('<b>③ 何を した</b>　← うごきの ことば'))
      },
      {
        say: 'やって みよう。この 一文で、3つを さがすよ。',
        ex: ex(line('「十月の 金よう日。<b>けんたは</b> ぞうきんを <b>持って</b>、<b>音楽室へ</b> 向かった。」') +
               line('だれが → <b>けんた</b>') +
               line('どこで → <b>音楽室</b>') +
               line('何を した → <b>ぞうきんを 持って 向かった</b>'))
      },
      {
        say: '「なぜ？」と 聞かれたら、「〜から」「〜ので」で おわる ところを さがす。「どんな 気もち？」と 聞かれたら、体の ようすを 見る。気もちは 書いて いない ことが 多いんだ。',
        ex: ex(line('<b>なぜ</b>　「だれも いない はずなのに 音が した<b>から</b>、足を 止めた。」') +
               line('<b>気もち</b>　「せなかが すうっと <b>つめたく なった</b>」 → こわい') +
               line('<b>気もち</b>　「ぎゅっと <b>にぎりしめる</b>」 → きんちょうして いる'))
      }
    ],

    steps: [
      stepIf('where', function () {
        return pick3(ASK, '場所を あらわす ことば', '人の 名前', '数を あらわす ことば',
          '「どこ」と 聞かれたら、場所の ことばを さがそう。');
      }),
      stepIf('who', function () {
        return pick3(ASK, '人や 生きものの 名前', '場所の ことば', '時こくの ことば',
          '「だれ」と 聞かれたら、名前を さがそう。');
      }),
      stepIf('why', function () {
        return pick3(ASK, '「〜から」「〜ので」で おわる ところ', 'いちばん さいごの 文', 'かぎかっこの 中',
          '「なぜ」の 答えは「〜から」「〜ので」の ところに かくれて いる ことが 多いよ。');
      }),
      stepIf('kimochi', function () {
        return pick3(ASK, '体の ようすを あらわす ことば', '天気を あらわす ことば', '数を あらわす ことば',
          '気もちは 書いて いない ことが 多い。体の ようすから 考えよう。');
      }),
      stepIf('how', function () {
        return pick3(ASK, 'ようすを あらわす ことば', '人の 名前', '場所の ことば',
          '「どのように」は、ようすの ことば（ゆっくり・一気に など）を さがそう。');
      }),
      stepIf('what', function () {
        return pick3(ASK, '聞かれた ことばの すぐ あと', 'いちばん はじめの 文', 'かぎかっこの 中',
          '「どんな〜」は、その ことばの すぐ あとに 書いて ある ことが 多いよ。');
      }),
      {
        when: WHEN,
        make: function () {
          return pick3(ASK, '話を もう一度 ゆっくり 読む', 'えらぶ ことばを 先に 読む', '長い 答えを えらぶ',
            'まよったら 話に もどる。答えは かならず 話の 中に あるよ。');
        }
      }
    ],

    miss: [
      function (q) {
        if (kind(q) !== 'why') return null;
        return '「なぜ」の 答えは、「〜から」「〜ので」で おわる ところに あるよ。さがして みよう。';
      },
      function (q) {
        if (kind(q) !== 'kimochi') return null;
        return '気もちは ことばで 書いて いない ことが 多いよ。体の ようす（せなか・手・顔）を 見て みよう。';
      },
      function (q) {
        if (kind(q) !== 'where') return null;
        return '場所の ことばを さがそう。「〜へ」「〜で」「〜に」の 前に ある ことが 多いよ。';
      },
      function (q) {
        if (kind(q) !== 'who') return null;
        return 'だれが した ことかな。人や 生きものの 名前を さがして みよう。';
      },
      function (q) {
        if (!q || !q.story) return null;
        return 'もう一度 話を ゆっくり 読んで みよう。答えは かならず この 中に あるよ。';
      }
    ]
  });
})();
