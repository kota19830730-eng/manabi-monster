/* ---------------------------------------------------------
   あたらしい こと！（お知らせ・v8.3）

   こうしんの あとに「何が ふえたか」を 子どもに 見せる ところ。
   いままでは 画面下に「あたらしい バージョンが あるよ［こうしん］」と
   出るだけで、中身は 分からなかった。

   きまり
     ・1つの 版に **3つまで**（多いと 読まない）
     ・文は **ひらがな ＋ 小1の かん字** だけ（どの 学年の 子も 読める）＋文節スペース
     ・絵は **ゲームに ある もの**（モンスター・たからもの・コイン・主人公）を つかう。
       お知らせの ために 新しい 絵を 作らない
     ・**sw.js の 版（CACHE_NAME）を 上げたら、ここにも 1行 足す**
       （子どもに 見せる ものが 何も ない ときは 足さなくて よい。
         smoke は「さいごの 版の sw が いまの sw を こえて いないか」だけ 見る）

   絵の しゅるい（kind）
     mons  … MQ.enemies.node(id)。id を 配列に すると 小さく よこに ならぶ（進化など）
     item  … MQ.treasure.node(id, { gold })
     coin  … きんのコイン
     hero  … その子の 主人公

   ならびは **古い → 新しい**。まだ 見て いない ものだけ、3つずつ ページ送りで 出す。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.news = (function () {
  /* sw … その とき の sw.js の CACHE_NAME の 番号（smoke が 見る） */
  const list = [
    {
      v: 'v7.2', date: '2026-09-05', sw: 87,
      items: [
        { kind: 'coin', title: 'きょうの フィーバー きょうか',
          text: 'まい日 ひとつ えらばれる きょうかは けいけんちが 2ばい！ コインも 1まい 出るよ。' },
        { kind: 'item', id: 'tr-hissan', title: 'はじめての ばしょは やさしく',
          text: 'まだ なれて いない ばしょでは ヒントが 先に 出て、コンボも きれにくく なるよ。' }
      ]
    },
    {
      v: 'v7.3', date: '2026-09-05', sw: 88,
      items: [
        { kind: 'mons', id: ['slime-green', 'crab-green', 'ghost-white'], title: 'ごちゃまぜ バトル',
          text: 'いろんな きょうかの てきが まとめて 出てくる！ ちずの いちばん 下の むらさきの バーから いこう。' }
      ]
    },
    {
      v: 'v7.5', date: '2026-09-05', sw: 89,
      items: [
        { kind: 'hero', title: 'こうげきが はでに なった！',
          text: 'けんの ひかりが はしる。コンボが つづくと 2かい きれるよ。' },
        { kind: 'item', id: 'tr-graph', gold: true, title: 'ひっさつわざが 8つに！',
          text: '20コンボで あたらしい わざ「オーロラ フィナーレ」が 出る。' }
      ]
    },
    {
      v: 'v7.7', date: '2026-09-06', sw: 92,
      items: [
        { kind: 'mons', id: 'drago-3', title: 'てきが こうげきして くる！',
          text: 'ためて いる ときに 正かいすると カウンター！ けいけんちが ふえる。まちがえても なにも へらないよ。' }
      ]
    },
    {
      v: 'v8.0', date: '2026-09-06', sw: 95,
      items: [
        { kind: 'item', id: 'tr-chizu', title: 'ちずが 大きく なった',
          text: 'ステージの 名まえが よみやすく なって、みちも 見やすく なったよ。' }
      ]
    },
    {
      v: 'v8.1', date: '2026-09-06', sw: 97,
      items: [
        { kind: 'mons', id: 'mid-golem', title: '中ボスが 出るように なった！',
          text: 'さいごの てきは HP が 2つ。つよい 一げきなら 一はつで たおせる！' },
        { kind: 'item', id: 'tr-kake1', title: 'よわい ところを つく！',
          text: 'ごちゃまぜと さいごの とうでは、てきの よわい きょうかを つくと ダメージが 大きい。' },
        { kind: 'mons', id: 'boss-dragon', title: 'ボスが わざを つかう',
          text: 'かまえたり、ぶんしんしたり、なかまを よんだり。チャンスも ふえるよ。' }
      ]
    },
    {
      v: 'v8.2', date: '2026-09-06', sw: 98,
      items: [
        { kind: 'mons', id: ['slime-green', 'slime-red', 'slime-king'], grow: true, title: 'なかまが 王さまに なる！',
          text: 'あいぼうは Lv.10 と Lv.20 で しんか。さいごは 王さまの すがたに なるよ。' },
        { kind: 'mons', id: 'skullhorse', title: 'じぶんの モンスターも しんか',
          text: 'しゃしんから つくった モンスターも 3だんかいに かわる。もっと つよく なるよ。' }
      ]
    },
    {
      v: 'v8.6', date: '2026-09-06', sw: 101,
      items: [
        { kind: 'mons', id: ['skullhorse', 'skullhorse-2', 'skullhorse-3'], grow: true,
          title: 'きみの 4たいが しんか する！',
          text: 'スカルホース・サメオニ・ずかんの あくま・ABCも、あいぼうに すると Lv.10 と Lv.20 で かわるよ。' }
      ]
    }
  ];

  const PER_PAGE = 3;

  // 'v8.2' → [8, 2]（くらべる ため）
  function num(v) {
    return String(v || '').replace(/^v/, '').split('.').map(function (n) { return parseInt(n, 10) || 0; });
  }
  // a が b より 新しければ 1、同じなら 0、古ければ -1
  function cmp(a, b) {
    const x = num(a), y = num(b);
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
      const d = (x[i] || 0) - (y[i] || 0);
      if (d) return d > 0 ? 1 : -1;
    }
    return 0;
  }

  function latest() { return list.length ? list[list.length - 1].v : null; }

  // まだ 見て いない 版（古い → 新しい）
  function unseen(player) {
    const seen = player && typeof player.seenNews === 'string' ? player.seenNews : null;
    if (!seen) return list.slice();
    return list.filter(function (e) { return cmp(e.v, seen) > 0; });
  }

  // まだ 見て いない お知らせ（1つずつ）
  function items(player) {
    const out = [];
    unseen(player).forEach(function (e) {
      e.items.forEach(function (it) { out.push(Object.assign({ v: e.v, date: e.date }, it)); });
    });
    return out;
  }

  // 3つずつの ページに 分ける
  function pages(player) {
    const all = items(player), out = [];
    for (let i = 0; i < all.length; i += PER_PAGE) out.push(all.slice(i, i + PER_PAGE));
    return out;
  }

  // ひさしぶりに 見る 子（版が 2つ いじょう たまって いる）＝「大アップデート」
  function big(player) { return unseen(player).length >= 2; }

  // 見た ことに する（セーブは 呼んだ ところで）
  function markSeen(player) {
    if (player) player.seenNews = latest();
    return player;
  }

  return {
    list: list, PER_PAGE: PER_PAGE,
    latest: latest, cmp: cmp, unseen: unseen, items: items, pages: pages, big: big, markSeen: markSeen
  };
})();
