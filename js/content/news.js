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
          text: '20コンボで あたらしい わざ「スターバースト ストライク」が 出る。' }
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
    },
    {
      /* 中身は v8.5（おうちの人からの てがみ）。**公開したのが v8.6 の あと**なので
         ここでは 版を v8.7 に して いちばん さいごに おく。
         ならびは いつも「古い → 新しい」＝公開した じゅん（先に 入れると、
         v8.6 を 見おわった 子に 出なく なる） */
      v: 'v8.7', date: '2026-09-06', sw: 102,
      items: [
        { kind: 'item', id: 'tr-kaki', title: 'おうちの人から てがみ',
          text: 'ちずに ふうとうが 出たら タップ！ ひとことと おねがいが とどくよ。' }
      ]
    },
    {
      v: 'v9.1', date: '2026-09-06', sw: 106,
      items: [
        { kind: 'mons', id: ['golem-gray', 'lizard-fire', 'boss-dragon'], grow: true,
          title: 'モンスターが きれいに なった',
          text: 'ひかりが あたる 上の めんが しろっぽく なって、つみきみたいに 見えるよ。' },
        { kind: 'hero', title: 'ゆうしゃも きれいに！',
          text: 'かたちの ふちが はっきりして、そうびが 見やすく なった。' },
        { kind: 'mons', id: 'eyeball', title: 'てきが いきて いる みたい',
          text: 'たたかいの あいだ、ときどき まばたきして、ひかる 目が ゆっくり ぴかぴか するよ。' }
      ]
    },
    {
      v: 'v9.2', date: '2026-09-07', sw: 108,
      items: [
        { kind: 'item', id: 'tr-chizu', title: 'ちずが きれいに なった',
          text: 'くさや すなが つみきみたいに なって、しまが くっきり 見えるよ。' }
      ]
    },
    {
      v: 'v9.3', date: '2026-09-07', sw: 109,
      items: [
        { kind: 'mons', id: 'boss-maou', title: 'さいごの とうが おしろに',
          text: 'てんしゅと こだかい とう、はたと 大きな もん。あかい 目が 見て いるよ。' }
      ]
    },
    {
      v: 'v9.4', date: '2026-09-07', sw: 110,
      items: [
        { kind: 'hero', title: 'きみが きれいに なった！',
          text: 'かみの すじ、ふくの おりめ、けんの ひかり。大きさも 大きく なったよ。' }
      ]
    },
    {
      v: 'v9.6', date: '2026-09-07', sw: 112,
      items: [
        { kind: 'mons', id: ['slime-king', 'sameoni-3'], title: 'モンスターが きれいに なった！',
          text: 'きんは ぴかっと ひかり、ほうせきは つやつや。ほねも ぬのも かわったよ。' },
        { kind: 'item', id: 'tr-chizu', title: 'ちずが こまかく なった',
          text: 'くさ・いわ・なみが 3ばい こまかく なって、よく 見えるように なったよ。' }
      ]
    },
    {
      v: 'v9.7', date: '2026-09-07', sw: 113,
      items: [
        { kind: 'mons', id: ['cap-knight', 'cap-starcat', 'cap-phoenix'], title: 'カプセルマシンが きた！',
          text: 'コイン 10まいで 1かい。ここでしか 出ない なかまが いるよ。' },
        { kind: 'coin', title: 'そうびと すがたも 出る',
          text: '10かい まわすと かならず げきレアが 出る。おなじのが 出ても コインが もどるよ。' },
        { kind: 'hero', title: 'げきレアの そうびが つよく なった',
          text: 'ひかる そうびを 5つ そろえると、きみが ぴかぴかに ひかるよ。' }
      ]
    },
    {
      v: 'v9.8', date: '2026-09-07', sw: 114,
      items: [
        { kind: 'hero', title: 'ゆうしゃが かっこよく なった！',
          text: 'かおが 大きく なって、あおい よろいと あかい マントに なったよ。' }
      ]
    },
    {
      v: 'v9.9', date: '2026-09-07', sw: 115,
      items: [
        { kind: 'hero', title: 'きみの かおが マイクラふうに！',
          text: 'めが 小さく なって、口が わらった かおに なったよ。かみと ふくも ざらざらに なった。' }
      ]
    },
    {
      v: 'v10.0', date: '2026-09-07', sw: 117,
      items: [
        { kind: 'hero', title: 'ゆうしゃの よろいが ぴかっと！',
          text: 'タイトルの ゆうしゃも きめが こまかく なったよ。金や ぬのの かんじが 出るように なった。' }
      ]
    },
    {
      v: 'v10.1', date: '2026-09-07', sw: 118,
      items: [
        { kind: 'hero', title: 'きみの 目が 大きく なった！',
          text: 'めが 大きく あおく なって、ゆうやけの ひかりが あたるように なったよ。' }
      ]
    },
    {
      v: 'v10.4', date: '2026-09-07', sw: 121,
      items: [
        { kind: 'mons', id: ['slime-green', 'drago-3'], title: 'みんなが とびこんで くる！',
          text: 'ひらくと かんばんが 上から おちて、モンスターと ゆうしゃが ジャンプして 出て くるよ。タップで とばせる。' }
      ]
    },
    {
      v: 'v10.5', date: '2026-09-07', sw: 122,
      items: [
        { kind: 'mons', id: 'drago-1', title: 'なかまの 立つ ばしょが かわった',
          text: 'なかまが ふきだしや カットインに かぶらなく なったよ。まん中に 立って、なまえと ゲージも 見やすく なった。' }
      ]
    },
    {
      v: 'v11.0', date: '2026-09-07', sw: 123,
      items: [
        { kind: 'mons', id: 'boss-hades', title: 'やみの 大りくが あらわれた！',
          text: '小6ワールドが あそべるように なったよ。まっくらな 大りくの おくに めいおうハデスが まって いる。' },
        { kind: 'hero', title: '小6の もんだいが 入った',
          text: 'さんすう 15・こくご 4・りか 4・しゃかい 4・えいご 4 の ステージ。がくねんは ちずの 下で えらべるよ。' }
      ]
    },
    {
      v: 'v11.1', date: '2026-09-07', sw: 124,
      items: [
        { kind: 'mons', id: 'slime-green', title: 'まちがえた もんだいが また 出る',
          text: '1かいめに まちがえた もんだいが、つぎの たたかいで もどって くるよ。あてると けいけんち ボーナス！' }
      ]
    },
    {
      v: 'v12.0', date: '2026-09-10', sw: 125,
      items: [
        { kind: 'hero', title: 'みんな りったいに なった！',
          text: 'ゆうしゃも モンスターも たからばこも はこの かたちに なったよ。てきの ところまで はしって こうげき！' },
        { kind: 'mons', id: 'drago-3', title: 'モンスターが うごく',
          text: 'あるいて 出て きたり、はねて 出て きたり。たおすと ばたんと たおれる。ボスは くずれおちる！' },
        { kind: 'item', id: 'tr-wari', title: 'たからばこが ひらく',
          text: 'たからばこの ふたが ぱかっと ひらいて きんかが とび出すよ。せっていの「りったい」で もどせる' }
      ]
    },
    {
      v: 'v12.1', date: '2026-09-11', sw: 126,
      items: [
        { kind: 'hero', title: 'りったいが かるく なった',
          text: '見えない ところを つくらなく したので、サクサク うごくよ。見た目は そのまま' },
        { kind: 'mons', id: 'drago-1', title: 'なかまは ゆうしゃの うしろに',
          text: 'なかまが おなじ 草の 上・ゆうしゃの うしろに 立つよ。パーティーみたいに ならんで たたかう！' }
      ]
    },
    {
      v: 'v12.2', date: '2026-09-11', sw: 127,
      items: [
        { kind: 'hero', title: 'ひっさつわざの うごきが 8つ',
          text: 'ジャンプぎり・つき・けんを ぐるぐる・空から おちる・けんを 天に・うかんで ばくはつ・6れんぞく つき！' },
        { kind: 'mons', id: 'slime-green', title: 'てきの やられかたも 8つ',
          text: 'しりもち・ゆれる・こおる・くるっと まわる・ビリビリ・ぺしゃんこ・すいこまれて ふっとぶ・はねて ばたん' },
        { kind: 'hero', title: 'わざの なまえは 下に',
          text: 'わざの なまえと ひかりが ゆうしゃと てきに かぶらなく なった。きる しゅんかんが よく 見える！' }
      ]
    },
    {
      v: 'v12.3', date: '2026-09-11', sw: 128,
      items: [
        { kind: 'mons', id: 'drago-1', title: 'なかまも いっしょに わざ！',
          text: 'ひっさつわざの とき なかまも いっしょに はしって とび出す。12コンボからは てきの よこに とんで はさみうち！' }
      ]
    },
    {
      v: 'v12.5', date: '2026-09-11', sw: 130,
      items: [
        { kind: 'hero', title: 'うごきが なめらかに',
          text: 'りったいの ゆうしゃと モンスターが かるく なって、バトルも タイトルも サクサク うごくよ。見た目は そのまま' }
      ]
    },
    {
      v: 'v12.6', date: '2026-09-11', sw: 132,
      items: [
        { kind: 'mons', id: 'boss-maou', title: 'とおくに まおうの おしろ',
          text: 'タイトルと バトルの うしろに、とおくの 山なみと まおうの おしろ、ブロックの 木が 見えるよ。ゆかは おくゆきの マス目' },
        { kind: 'hero', title: '空が じかんで かわる',
          text: 'あさ・ひる・ゆうやけ・よる。ほんとうの とけいと いっしょに 空の いろが かわるよ。ボスが くると 空が くらく なる' }
      ]
    },
    {
      v: 'v12.7', date: '2026-09-12', sw: 133,
      items: [
        { kind: 'mons', id: 'boss-dragon', title: 'ボスが つよく なった',
          text: 'ボスは 5かい、ラスボスは 9かい あてないと たおれない。さいごは まっかに なって さいごの 力を 出して くるぞ' },
        { kind: 'mons', id: 'boss-maou', title: '本気の ボスと たたかえる',
          text: 'ボスが 出たら「ふつう」か「本気」を えらべる。本気は 1かいめの せいかいだけ きくけど ごほうびが 2ばい！' },
        { kind: 'hero', title: 'ボスの まとめもんだい',
          text: 'ボスは まえに クリアした ステージの もんだいも 出して くる。ふくしゅうの チャンス！' }
      ]
    },
    {
      v: 'v12.8', date: '2026-09-12', sw: 134,
      items: [
        { kind: 'mons', id: 'boss-maou', title: 'ボスせんが 見やすく',
          text: 'ボスの 名まえと よわい きょうかは 右上に。ふきだしは みじかく なって、ゆうしゃと ボスが よく 見えるよ' }
      ]
    },
    {
      v: 'v12.9', date: '2026-09-12', sw: 135,
      items: [
        { kind: 'mons', id: 'slime-green', title: 'モンスターが かくれない',
          text: 'ふきだしは バトルの 下の おびに。アイテムの ボタンも 小さく なって、モンスターが ぜんぶ 見えるよ' }
      ]
    },
    {
      v: 'v13.0', date: '2026-09-12', sw: 137,
      items: [
        { kind: 'mons', id: 'owl-brown', title: 'しゅぎょうば が できた！',
          text: 'ちずの 下の「しゅぎょうば」で、なかまが となりで おしえて くれる。まだ ならって いない ところも さきに 見られるよ' }
      ]
    },
    {
      v: 'v13.1', date: '2026-09-12', sw: 138,
      items: [
        { kind: 'mons', id: 'owl-white', title: 'しゅぎょうばが ぜんぶの 学年に',
          text: 'こくご・りか・しゃかい・えいごも、どの 学年でも しゅぎょうば で なかまが おしえて くれるよ' }
      ]
    },
    {
      v: 'v13.2', date: '2026-09-12', sw: 139,
      items: [
        { kind: 'hero', title: 'ことばが がくねんで かわる',
          text: 'ボタンや ふきだしの かん字が、きみの がくねんに あわせて かわるよ。小5・小6は かん字が ふえて スペースが なくなる' }
      ]
    },
    {
      v: 'v13.3', date: '2026-09-12', sw: 140,
      items: [
        { kind: 'dock', id: 'dice', title: 'ちずの 下が アイコンに',
          text: 'ごちゃまぜは まん中の サイコロ、しゅぎょうば は まきもの。ちずが ひろく 見えるよ' }
      ]
    },
    {
      v: 'v13.4', date: '2026-09-13', sw: 141,
      items: [
        { kind: 'dock', id: 'scroll', title: 'ちずが きれいに なった',
          text: 'しまが なめらかに なって、いえと おしろが 立った！ 下の アイコンも ぴかぴかだよ' }
      ]
    },
    {
      v: 'v13.6', date: '2026-09-13', sw: 147,
      items: [
        { kind: 'hero', title: 'ひっさつわざが パワーアップ',
          text: 'ほのおや かみなりが ぴかぴか ひかる！ 大わざでは たたかいの がめんが 大きく なるよ' },
        { kind: 'hero', title: 'カットインが かっこよく',
          text: 'わざごとに ポーズを きめて、せりふも まいかい かわる。あいぼうと いっしょの ときも あるよ' },
        { kind: 'hero', title: 'まばたき するように なった',
          text: 'しゅじんこうが ときどき まばたき するよ。タイトルでも 見てみてね' }
      ]
    },
    {
      v: 'v13.7', date: '2026-09-13', sw: 149,
      items: [
        { kind: 'hero', title: 'おんがくが 大へんしん！',
          text: 'タイトルも たたかいも ボスせんも、きょくが ぜんぶ あたらしく なった。ドラムが ひびいて もりあがるよ' },
        { kind: 'hero', title: 'こうげきの 音が かっこよく',
          text: 'けんを ふると「しゅっ！ パシッ！」。つよい 一げきは もっと はでな 音が するよ' },
        { kind: 'mons', id: 'owl-brown', title: 'しゅぎょうばで ピンポーン',
          text: 'しゅぎょうばで 正かいすると「ピンポーン」、ちがうと「ブブー」。音で すぐ わかるよ' }
      ]
    },
    {
      v: 'v13.8', date: '2026-09-13', sw: 150,
      items: [
        { kind: 'hero', title: 'ひっさつわざが りったいに！',
          text: 'ほのおも はっぱも たつまきも、ぐるぐる まわる りったいに なった。いん石は ごつごつの いわだよ' },
        { kind: 'hero', title: 'スターバーストで 大ばくはつ',
          text: 'さいごに ドッカーン！ 大きな ほしが まわって、がめんが ぐらぐら ゆれるよ' }
      ]
    },
    {
      v: 'v13.9', date: '2026-09-12', sw: 152,
      items: [
        { kind: 'mons', id: 'drago-3', title: 'タイトルの けしきが きれいに',
          text: 'とおくの 山も おしろも、くさはらの みちも、ちずと おなじ きれいな え に なったよ' }
      ]
    },
    {
      v: 'v13.12', date: '2026-09-13', sw: 156,
      items: [
        { kind: 'prize', id: 'gift', title: 'おうちの人の マシン',
          text: 'おうちの人が ほんものの ごほうびを 入れて くれる マシンが できたよ。コインで まわしてね' }
      ]
    },
    {
      v: 'v13.14', date: '2026-09-13', sw: 157,
      items: [
        { kind: 'mons', id: 'cap-phoenix', title: 'カプセルマシンが 大へんしん',
          text: 'よぞらの ぶたいで マシンが りったいに。ハンドルを まわして、カプセルを 3かい タップして わろう！' },
        { kind: 'mons', id: 'slime-green', title: 'ひかりの いろで ドキドキ',
          text: 'きんいろなら レア いじょう、むらさきなら げきレア！ あいぼうも いっしょに よろこぶよ' }
      ]
    },
    {
      v: 'v13.15', date: '2026-09-13', sw: 159,
      items: [
        { kind: 'ticket', title: 'レベルの ごほうび',
          text: 'レベルが 上がる たびに コインが もらえる。5の ときは カプセルの むりょうけん！' },
        { kind: 'gear', id: 'ryu-weapon', title: 'そうびを きたえよう',
          text: 'メニューの「じぶん」で、コインを つかって そうびを ＋5まで つよく できるよ' }
      ]
    },
    {
      v: 'v13.16', date: '2026-09-14', sw: 161,
      items: [
        { kind: 'item', id: 'tr-graph', gold: true, title: 'ぴかぴか あつめ',
          text: 'パーフェクトで たからものが ぴかぴかに。5こ あつめる たびに カプセルの むりょうけん！' },
        { kind: 'mons', id: 'slime-golden', title: 'しゅうまつ イベント',
          text: 'どようびと にちようびは まつり！ しゅうごとに ちがう まつりが くるよ' }
      ]
    },
    {
      v: 'v13.17', date: '2026-09-14', sw: 162,
      items: [
        { kind: 'mons', id: 'cap-phoenix', title: 'カプセルが メニューに',
          text: 'メニューの タブに カプセルマシンが ふえたよ。いつでも まわしに いける！' },
        { kind: 'hero', title: 'すぐ タイトルへ',
          text: 'ちずの 上の いえの ボタンで、タイトルに もどれるよ' },
        { kind: 'mons', id: 'boss-knight', title: 'ボスの ガードくだき',
          text: 'ボスの 大わざは まもりを ねらって くる！ 1かいめで せいかいして はねかえそう' }
      ]
    },
    {
      // v14.2 セットわざ（お知らせの 版は 公開した じゅんの v13.18）
      v: 'v13.18', date: '2026-09-14', sw: 163,
      items: [
        { kind: 'gear', id: 'yami-weapon', title: 'セットわざ',
          text: 'おなじ しゅるいの そうびを 5こ つけると、せいかいで ゲージが たまって ひみつの わざが でる！' },
        { kind: 'gear', id: 'ryu-weapon', title: 'わざは 8しゅるい',
          text: 'りゅうの そうびなら ほのおの りゅう、てつなら 大きな けん。そうびで わざが かわるよ' },
        { kind: 'hero', title: 'わざの なまえが くっきり',
          text: 'ひっさつわざの なまえの もじが なめらかに なって、よみやすく なったよ' }
      ]
    },
    {
      // v13.19 そうびの 見た目（claude-f7）
      v: 'v13.19', date: '2026-09-14', sw: 165,
      items: [
        { kind: 'gear', id: 'ryu-helm', title: 'そうびが かっこよく',
          text: 'けん・たて・かぶと・よろい・マントを ぜんぶ かきなおしたよ。しゅるいごとに かたちが ちがう！' },
        { kind: 'gear', id: 'densetsu-weapon', title: 'けんと たてが 大きく',
          text: 'けんは ふとく ながく、たては 左うでの よこに なったよ' },
        { kind: 'hero', title: '5こ そろえると ひかる',
          text: 'おなじ しゅるいの そうびを 5こ つけると、そうびの いろで からだが ひかるよ' }
      ]
    },
    {
      // v13.21 ABC3きょうだいを 1体に（claude-f7）
      v: 'v13.21', date: '2026-09-14', sw: 167,
      items: [
        { kind: 'mons', id: 'abc', title: 'ABC3きょうだいが 1たいに',
          text: 'あかい A・みどりの B・きいろい C が くっついた 1たいに なったよ。目も いっぱい！' },
        { kind: 'mons', id: ['abc', 'abc-2', 'abc-3'], grow: true, title: 'なかまに すると しんか',
          text: 'なかまに して そだてると ABCナイツ、ABCロードに しんかするよ' }
      ]
    },
    {
      // v14.4 きみの 絵（写真 → 絵の かたちと 色 そのまま）＋ v14.5 かっこよく しあげ・息子さんの 4体の すがたを えらぶ（claude-f8）
      v: 'v13.22', date: '2026-09-14', sw: 169,
      items: [
        { kind: 'mons', id: 'zukan', title: 'かいた えが モンスターに',
          text: 'しゃしんを とると、かいた えの かたちと いろの まま モンスターに なるよ。「かっこよく」も えらべるよ' },
        { kind: 'mons', id: ['skullhorse', 'sameoni', 'abc'], title: 'すがたを えらべる モンスター',
          text: 'ずかんで スカルホースたちの すがたを えらべるよ。もとの えから つくった すがたにも なるよ' }
      ]
    },
    {
      // v14.6 ボスの 作り直し（ナンバードラゴン＝竜王・モジオニ＝青鬼の 大将）
      v: 'v13.23', date: '2026-09-15', sw: 170,
      items: [
        { kind: 'mons', id: 'boss-dragon', title: 'ナンバードラゴンが へんしん',
          text: 'さんすうの ボスが きんの よろいの りゅうおうに なったよ。つばさを ひろげて まって いるぞ！' },
        { kind: 'mons', id: 'boss-oni', title: 'モジオニが へんしん',
          text: 'こくごの ボスは しろい たてがみの あおおにの たいしょう。なぎなたを ふって くるぞ！' }
      ]
    },
    {
      // v14.7 ボスを ふやす（エリアごとに 序盤・中盤・終盤の 3体・新しい ボス 10体・メカナイト／グランドタイタン／キングスライムを 64マスで 作り直し）
      v: 'v13.24', date: '2026-09-17', sw: 171,
      items: [
        { kind: 'mons', id: ['boss-saidon', 'boss-majin', 'boss-dragon'], grow: true, title: 'ボスが 3たいに ふえた',
          text: 'どの きょうかも はじめ・まんなか・さいごで ちがう ボスが 出るよ。さいごは いつもの ボス！' },
        { kind: 'mons', id: ['boss-fude', 'boss-namazu', 'boss-koban'], title: 'あたらしい ボスが 10たい',
          text: 'フデダヌキ・ビリビリナマズ・コバンネズミ… 10たいの ボスが まって いるぞ！' },
        { kind: 'mons', id: ['boss-knight', 'boss-titan', 'boss-slime'], title: '3たいの ボスも へんしん',
          text: 'メカナイト・グランドタイタン・キングスライムも おおきく かっこよく なったよ' }
      ]
    },
    {
      // v14.8 カプセルの 景品を ふやす（第2弾 39しゅるい・シークレット・コンプリートの ごほうび）
      v: 'v13.25', date: '2026-09-17', sw: 172,
      items: [
        { kind: 'mons', id: ['cap-kappa', 'cap-mwolf', 'cap-unicorn'], grow: true, title: 'カプセルの けいひんが ふえた！',
          text: 'ようかいたい・メカ生きもの・でんせつの どうぶつ… なかま 9・そうび 10・すがた 20が ふえたよ' },
        { kind: 'mons', id: 'cap-nijislime', title: '？？？の シークレット',
          text: 'げきレアの 中に ？？？の 3たいが かくれて いるよ。だれに あえるかは おたのしみ！' },
        { kind: 'hero', title: 'ぜんぶ あつめると いい こと',
          text: 'だいを コンプリートすると 金の 王かんが ついて、かぶりの コインが ぜんぶ もどるように なるよ' }
      ]
    },
    {
      // プリズムと ギンガの セットわざ（分光烈破・超新星ノ轟砲）
      v: 'v13.26', date: '2026-09-17', sw: 173,
      items: [
        { kind: 'gear', id: 'prism-weapon', title: 'プリズムの セットわざ',
          text: 'プリズムを 5つ そろえると「ぶんこう れっぱ」。7いろの ひかりで きりさくよ' },
        { kind: 'gear', id: 'ginga-weapon', title: 'ギンガの セットわざ',
          text: 'ギンガを 5つ そろえると「ちょうしんせいの ごうほう」。ほしの 大ほうで うつよ' }
      ]
    },
    {
      // v14.10 暗い 写真の きみの絵（線の しきい値・色・目は どこ？・注意）＋ ゲーム版の パーツ 37と デザインの あん
      v: 'v13.27', date: '2026-09-17', sw: 174,
      items: [
        { kind: 'mons', id: 'zukan', title: 'くらい しゃしんでも だいじょうぶ',
          text: 'よるの へやで とった えも せんが きえにくく なったよ。あかるい ところで とると もっと きれい！' },
        { kind: 'mons', id: 'skullhorse', title: 'めは どこ？',
          text: 'きみの えの めが きえた ときは、めの ところを タップすると めが はいるよ' },
        { kind: 'mons', id: ['sameoni', 'abc'], title: 'パーツで じぶんの モンスターに',
          text: 'め・つの・くち・はね・もちもの… 37この パーツと デザインの あんで じぶんの えに ちかづけよう' }
      ]
    },
    /* v13.28（sw 176）… v14.11 まじん・あんこくの そうび */
    {
      v: 'v13.28', date: '2026-09-19', sw: 176,
      items: [
        { kind: 'gear', id: 'majin-weapon', title: 'まじんの そうび',
          text: 'ごちゃまぜバトルで ボスを たおすと あかい そうびが 1つずつ。5つ そろえると あたらしい セットわざ！' },
        { kind: 'gear', id: 'ankoku-weapon', title: 'あんこくの そうび',
          text: 'ボスを 本気で たおすと くろい そうびが 1つずつ。本気は ボスが 出た ときに えらべるよ' },
        { kind: 'hero', title: 'あと いくつで セットわざ？',
          text: 'メニューの「じぶん」で、そうびが あと いくつで セットわざに なるか 見えるよ' }
      ]
    },
    /* v13.29（sw 179）… ボスの 先制こうげき ＋ ザコ・中ボスの はんげき（docs/ボスの先制こうげきメモ.md） */
    {
      v: 'v13.29', date: '2026-09-19', sw: 179,
      items: [
        { kind: 'mons', id: 'boss-dragon', title: 'ボスが いきなり こうげき！',
          text: 'ボスは 出て すぐ 大わざで たてを こわして くる。ボスに 2もん つづけて せいかいすると なおるよ' },
        { kind: 'mons', id: ['boss-namazu', 'boss-mizuchi', 'boss-oni'], title: 'ボスごとに ちがう 大わざ',
          text: 'ほのおの ブレス・かみなり・こおり・大ぎり・じしん… ボスに よって わざが ちがうよ' },
        { kind: 'mons', id: 'slime-green', title: 'まちがえると はんげき',
          text: 'ザコや 中ボスも まちがえると たいあたりして くる。でも なにも へらないから だいじょうぶ！' }
      ]
    },
    /* v13.30（sw 180）… ラスボス 6体の 作り直し（docs/ラスボス6体の作り直しメモ.md） */
    {
      v: 'v13.30', date: '2026-09-19', sw: 180,
      items: [
        { kind: 'mons', id: ['boss-obake', 'boss-kaizoku', 'boss-maou'], title: 'ラスボスが かっこよく！',
          text: '6たいの ラスボスを こまかい ドットで ぜんぶ かきなおした。とうで たしかめよう！' },
        { kind: 'mons', id: 'boss-maou', title: 'デビルカイザー たんじょう',
          text: '小3の ラスボスは あたらしい 名まえ「デビルカイザー」に なった。つばさと やみの ほのおに ちゅうもく！' }
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
