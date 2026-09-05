/* ---------------------------------------------------------
   たからもの

   ステージごとに 1つ。そのステージの ボスが 落とします。
   ★3で クリアすると「ぴかぴか版（金色）」に かわります。

   v2.0：たからものは たたかいの 中で 使える「どうぐ」です。
     ・形（shape）ごとに わざが 決まる（下の POWERS）
     ・金色は 効果が 上がる（val の 2つめ）
     ・もちもの（player.bag）に 3つまで 入れて たたかいに もっていく
     ・1つの どうぐは 1回の たたかいで 1回（みちしるべの 金色だけ 2回）
   効果は かならず「正解した とき」に 出る。正解しなくても
   てきが たおれる どうぐは 作らない（v2.0 企画書の 大原則）。

   形（shape）は 敵と 同じ しくみで、
   同じ形でも 色を かえると べつの たからものに なります。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.treasure = (function () {
  // 絵は js/content/monsterart.js（CSS の div を かさねて 描く）
  const shapes = MQ.monsterArt.items;

  const common = { k: '#141018', w: '#FFF8E6', y: '#FFD447', r: '#E8443A' };

  // 金色版（★3）に なったときの 色
  const GOLD = { A: '#FFD96B', B: '#B8860B', w: '#FFFDF0', y: '#FFF3B8' };

  function c(A, B, extra) {
    return Object.assign({ A: A, B: B || A }, extra || null);
  }

  /* ステージ1つに たからもの1つ。
     いま 開いている 19ステージ分は すぐ 取れる。
     算数7以降は 学校で 習ったら 開く。 */
  const list = [
    /* ---- 算数の山（18） ---- */
    { stage: 'sansu3-1',  id: 'tr-kake',    name: 'かけ算の オーブ',      shape: 'orb',       colors: c('#4F8CFF', '#1F4FB0') },
    { stage: 'sansu3-2',  id: 'tr-wari',    name: 'わり算の みどりいし',   shape: 'gem',       colors: c('#4CD164', '#1E7A3C') },
    { stage: 'sansu3-3',  id: 'tr-jikoku',  name: 'じこくの すなどけい',   shape: 'hourglass', colors: c('#C89A5B', '#7A5326') },
    { stage: 'sansu3-4',  id: 'tr-hissan',  name: 'ひっ算の 書',          shape: 'book',      colors: c('#3E7FD0', '#1F4FB0') },
    { stage: 'sansu3-5',  id: 'tr-graph',   name: 'グラフの ほし',        shape: 'star',      colors: c('#FFD166') },
    { stage: 'sansu3-6',  id: 'tr-amari',   name: 'あまりの かぎ',        shape: 'key',       colors: c('#C9D3DC', '#6B7C8C') },
    { stage: 'sansu3-7',  id: 'tr-ookii',   name: '大きな 王かん',        shape: 'crown',     colors: c('#F2C14E', '#B8860B') },
    { stage: 'sansu3-8',  id: 'tr-nagasa',  name: 'ながさの わ',          shape: 'ring',      colors: c('#8FD3FF', '#4FA3E0') },
    { stage: 'sansu3-9',  id: 'tr-en',      name: 'まるい 球',            shape: 'orb',       colors: c('#F2F2F2', '#B9BCCF') },
    { stage: 'sansu3-10', id: 'tr-kake1',   name: 'かけ算の あかいし',     shape: 'gem',       colors: c('#FF5A5A', '#A82424') },
    { stage: 'sansu3-11', id: 'tr-shousuu', name: '小数の しずく',        shape: 'potion',    colors: c('#6FD3FF', '#2E7FB0') },
    { stage: 'sansu3-12', id: 'tr-omosa',   name: 'おもさの すず',        shape: 'bell',      colors: c('#C0A060', '#7A5326') },
    { stage: 'sansu3-13', id: 'tr-bunsuu',  name: '分数の むらさきいし',   shape: 'gem',       colors: c('#A96BE0', '#5A2D8A') },
    { stage: 'sansu3-14', id: 'tr-shiki',   name: 'しきの 書',            shape: 'book',      colors: c('#3E9A6B', '#1E5A3C') },
    { stage: 'sansu3-15', id: 'tr-bai',     name: 'ばいの ほし',          shape: 'star',      colors: c('#FF9A4A') },
    { stage: 'sansu3-16', id: 'tr-sankaku', name: '三角の かんむり',      shape: 'crown',     colors: c('#C9D3DC', '#6B7C8C') },
    { stage: 'sansu3-17', id: 'tr-kake2',   name: 'ひっ算の 金かぎ',      shape: 'key',       colors: c('#F2C14E', '#B8860B') },
    { stage: 'sansu3-18', id: 'tr-soroban', name: 'そろばんの まきもの',   shape: 'scroll',    colors: c('#D8B889', '#8A5A2B') },

    /* ---- 国語の森（5） ---- */
    { stage: 'kokugo3-1', id: 'tr-yomi',    name: 'よみの 書',            shape: 'book',      colors: c('#E8443A', '#8A1F18') },
    { stage: 'kokugo3-2', id: 'tr-kaki',    name: 'かきの まきもの',      shape: 'scroll',    colors: c('#C4762E', '#7A4318') },
    { stage: 'kokugo3-3', id: 'tr-kimari',  name: 'ことばの らしんばん',   shape: 'compass',   colors: c('#8A6BD8', '#4A2F8A') },
    { stage: 'kokugo3-4', id: 'tr-imi',     name: 'ことばの ももいし',    shape: 'gem',       colors: c('#FF6B9A', '#A8244F') },
    { stage: 'kokugo3-5', id: 'tr-romaji',  name: 'ローマ字の かぎ',      shape: 'key',       colors: c('#8FD3FF', '#3E7FB0') },

    /* ---- 理科社会の海（4） ---- */
    { stage: 'rikashakai3-1', id: 'tr-mushi',  name: 'はっぱの はね',      shape: 'feather',   colors: c('#4CD164', '#1E7A3C') },
    { stage: 'rikashakai3-2', id: 'tr-hikari', name: 'ひかりの たま',      shape: 'orb',       colors: c('#FFE96B', '#B8860B') },
    { stage: 'rikashakai3-3', id: 'tr-chizu',  name: 'ちずの らしんばん',   shape: 'compass',   colors: c('#C89A5B', '#7A5326') },
    { stage: 'rikashakai3-4', id: 'tr-machi',  name: 'まちの かね',        shape: 'bell',      colors: c('#E0846B', '#8A3A24') },

    /* ---- 英語の空（4） ---- */
    { stage: 'eigo3-1', id: 'tr-hello',   name: 'あいさつの ベル',        shape: 'bell',      colors: c('#F2F2F2', '#9AA7B8') },
    { stage: 'eigo3-2', id: 'tr-iro',     name: 'いろの びん',            shape: 'potion',    colors: c('#FF9A4A', '#A8542A') },
    { stage: 'eigo3-3', id: 'tr-tori',    name: 'とりの はね',            shape: 'feather',   colors: c('#F2F2F2', '#9AA7B8') },
    { stage: 'eigo3-4', id: 'tr-tenki',   name: 'てんきの ほし',          shape: 'star',      colors: c('#8FD3FF') },

    /* ---- さいごの塔（ラスボスを たおすと） ---- */
    { stage: 'tower3',  id: 'tr-maou',    name: 'まおうの かんむり',      shape: 'crown',     colors: c('#8A2438', '#3A0E18') },

    /* ---- 小1 さんすうの やま（11）・こくごの もり（5）（v2.2）。名前は ひらがな ---- */
    { stage: 'sansu1-1',  id: 'tr1-kazu',    name: 'かずの たま',            shape: 'orb',       colors: c('#FF9A4A', '#A8542A') },
    { stage: 'sansu1-2',  id: 'tr1-banme',   name: 'なんばんめの らしんばん', shape: 'compass',   colors: c('#4CD164', '#1E7A3C') },
    { stage: 'sansu1-3',  id: 'tr1-ikutsu',  name: 'いくつの あおいし',      shape: 'gem',       colors: c('#4F8CFF', '#1F4FB0') },
    { stage: 'sansu1-4',  id: 'tr1-tashi',   name: 'たしざんの ほん',        shape: 'book',      colors: c('#E8443A', '#8A1F18') },
    { stage: 'sansu1-5',  id: 'tr1-hiki',    name: 'ひきざんの わ',          shape: 'ring',      colors: c('#A96BE0', '#5A2D8A') },
    { stage: 'sansu1-6',  id: 'tr1-nijuu',   name: 'にじゅうの ほし',        shape: 'star',      colors: c('#8FD3FF') },
    { stage: 'sansu1-7',  id: 'tr1-mittsu',  name: 'みっつの びん',          shape: 'potion',    colors: c('#4CD164', '#1E7A3C') },
    { stage: 'sansu1-8',  id: 'tr1-tokei',   name: 'とけいの すなどけい',    shape: 'hourglass', colors: c('#FFD166', '#B8860B') },
    { stage: 'sansu1-9',  id: 'tr1-tashi2',  name: 'たしざんの かんむり',    shape: 'crown',     colors: c('#FF6B9A', '#A8244F') },
    { stage: 'sansu1-10', id: 'tr1-hiki2',   name: 'ひきざんの かぎ',        shape: 'key',       colors: c('#4F8CFF', '#1F4FB0') },
    { stage: 'sansu1-11', id: 'tr1-hyaku',   name: 'ひゃくの まきもの',      shape: 'scroll',    colors: c('#F2C14E', '#B8860B') },
    { stage: 'sansu1-12', id: 'tr1-fun',     name: 'なんぷんの たま',        shape: 'orb',       colors: c('#8FD3FF', '#4FA3E0') },
    { stage: 'kokugo1-1', id: 'tr1-hira',    name: 'ひらがなの はね',        shape: 'feather',   colors: c('#FF6B9A', '#A8244F') },
    { stage: 'kokugo1-2', id: 'tr1-kata',    name: 'かたかなの すず',        shape: 'bell',      colors: c('#8FD3FF', '#4FA3E0') },
    { stage: 'kokugo1-3', id: 'tr1-yomi',    name: 'かん字の ほん',          shape: 'book',      colors: c('#3E9A6B', '#1E5A3C') },
    { stage: 'kokugo1-4', id: 'tr1-kaki',    name: 'かん字の まきもの',      shape: 'scroll',    colors: c('#A96BE0', '#5A2D8A') },
    { stage: 'kokugo1-5', id: 'tr1-kotoba',  name: 'ことばの きいろいし',    shape: 'gem',       colors: c('#FFD166', '#B8860B') },

    /* ---- 小2 さんすうの やま（14）・こくごの もり（4）（v2.3） ---- */
    { stage: 'sansu2-1',  id: 'tr2-hyou',    name: 'ひょうの ほし',          shape: 'star',      colors: c('#FF9A4A') },
    { stage: 'sansu2-2',  id: 'tr2-tashi',   name: 'たしざんの あかいし',    shape: 'gem',       colors: c('#FF5A5A', '#A82424') },
    { stage: 'sansu2-3',  id: 'tr2-hiki',    name: 'ひきざんの あおいし',    shape: 'gem',       colors: c('#4F8CFF', '#1F4FB0') },
    { stage: 'sansu2-4',  id: 'tr2-nagasa',  name: 'ながさの わ',            shape: 'ring',      colors: c('#4CD164', '#1E7A3C') },
    { stage: 'sansu2-5',  id: 'tr2-hyaku',   name: 'ひゃくの かんむり',      shape: 'crown',     colors: c('#FF9A4A', '#A8542A') },
    { stage: 'sansu2-6',  id: 'tr2-kasa',    name: 'かさの びん',            shape: 'potion',    colors: c('#8FD3FF', '#4FA3E0') },
    { stage: 'sansu2-7',  id: 'tr2-jikan',   name: 'じかんの すなどけい',    shape: 'hourglass', colors: c('#A96BE0', '#5A2D8A') },
    { stage: 'sansu2-8',  id: 'tr2-sanketa', name: 'さんけたの ほん',        shape: 'book',      colors: c('#E8443A', '#8A1F18') },
    { stage: 'sansu2-9',  id: 'tr2-katachi', name: 'かたちの らしんばん',    shape: 'compass',   colors: c('#FFD166', '#B8860B') },
    { stage: 'sansu2-10', id: 'tr2-kake',    name: 'かけざんの たま',        shape: 'orb',       colors: c('#4CD164', '#1E7A3C') },
    { stage: 'sansu2-11', id: 'tr2-kuku',    name: 'くくの かぎ',            shape: 'key',       colors: c('#F2C14E', '#B8860B') },
    { stage: 'sansu2-12', id: 'tr2-metoru',  name: 'メートルの わ',          shape: 'ring',      colors: c('#8FD3FF', '#4FA3E0') },
    { stage: 'sansu2-13', id: 'tr2-sen',     name: 'せんの まきもの',        shape: 'scroll',    colors: c('#A96BE0', '#5A2D8A') },
    { stage: 'sansu2-14', id: 'tr2-bunsuu',  name: 'ぶんすうの すず',        shape: 'bell',      colors: c('#FF6B9A', '#A8244F') },
    { stage: 'kokugo2-1', id: 'tr2-yomi',    name: 'かん字の はね',          shape: 'feather',   colors: c('#FFD166', '#B8860B') },
    { stage: 'kokugo2-2', id: 'tr2-kaki',    name: 'かきかたの まきもの',    shape: 'scroll',    colors: c('#3E9A6B', '#1E5A3C') },
    { stage: 'kokugo2-3', id: 'tr2-kimari',  name: 'きまりの ほん',          shape: 'book',      colors: c('#8A6BD8', '#4A2F8A') },
    { stage: 'kokugo2-4', id: 'tr2-imi',     name: 'いみの みどりいし',      shape: 'gem',       colors: c('#4CD164', '#1E7A3C') },

    /* ---- 小4 算数の山（15）（v4.4） ---- */
    { stage: 'sansu4-1',  id: 'tr4-oku',     name: '億の 王かん',            shape: 'crown',     colors: c('#7FD8FF', '#2E7FB0') },
    { stage: 'sansu4-2',  id: 'tr4-graph',   name: 'グラフの はね',          shape: 'feather',   colors: c('#4F8CFF', '#1F4FB0') },
    { stage: 'sansu4-3',  id: 'tr4-wari1',   name: 'わり算の 銀のかぎ',      shape: 'key',       colors: c('#C9D3DC', '#6B7C8C') },
    { stage: 'sansu4-4',  id: 'tr4-kaku',    name: '角の らしんばん',        shape: 'compass',   colors: c('#E0846B', '#8A3A24') },
    { stage: 'sansu4-5',  id: 'tr4-shou',    name: '小数の しずく',          shape: 'potion',    colors: c('#8FD3FF', '#3E7FB0') },
    { stage: 'sansu4-6',  id: 'tr4-wari2',   name: '筆算の 書',              shape: 'book',      colors: c('#3E9A6B', '#1E5A3C') },
    { stage: 'sansu4-7',  id: 'tr4-seiri',   name: '整理の すなどけい',      shape: 'hourglass', colors: c('#A96BE0', '#5A2D8A') },
    { stage: 'sansu4-8',  id: 'tr4-heikou',  name: '平行の わ',              shape: 'ring',      colors: c('#FFD166', '#B8860B') },
    { stage: 'sansu4-9',  id: 'tr4-gaisuu',  name: 'がい数の ほし',          shape: 'star',      colors: c('#FF9A4A') },
    { stage: 'sansu4-10', id: 'tr4-kimari',  name: 'きまりの まきもの',      shape: 'scroll',    colors: c('#D8B889', '#8A5A2B') },
    { stage: 'sansu4-11', id: 'tr4-menseki', name: '面積の あおいし',        shape: 'gem',       colors: c('#4F8CFF', '#1F4FB0') },
    { stage: 'sansu4-12', id: 'tr4-shoukake', name: '小数の すず',           shape: 'bell',      colors: c('#6FD3FF', '#2E7FB0') },
    { stage: 'sansu4-13', id: 'tr4-bunsuu',  name: '分数の たま',            shape: 'orb',       colors: c('#A96BE0', '#5A2D8A') },
    { stage: 'sansu4-14', id: 'tr4-kawari',  name: 'かわり方の らしんばん',  shape: 'compass',   colors: c('#4CD164', '#1E7A3C') },
    { stage: 'sansu4-15', id: 'tr4-hako',    name: 'はこの あかいし',        shape: 'gem',       colors: c('#FF5A5A', '#A82424') },

    /* ---- 小4 国語の森（4）（v4.5） ---- */
    { stage: 'kokugo4-1', id: 'tr4-yomi',    name: '読みの はね',            shape: 'feather',   colors: c('#E8443A', '#8A1F18') },
    { stage: 'kokugo4-2', id: 'tr4-kaki',    name: '書きの まきもの',        shape: 'scroll',    colors: c('#3E9A6B', '#1E5A3C') },
    { stage: 'kokugo4-3', id: 'tr4-kotoba',  name: 'ことばの らしんばん',    shape: 'compass',   colors: c('#8A6BD8', '#4A2F8A') },
    { stage: 'kokugo4-4', id: 'tr4-imi',     name: '意味の ももいし',        shape: 'gem',       colors: c('#FF6B9A', '#A8244F') },

    /* ---- 小4 理科の山（4）・社会の町（4）（v4.6） ---- */
    { stage: 'rika4-1',   id: 'tr4-tenki',   name: '天気の はね',            shape: 'feather',   colors: c('#8FD3FF', '#3E7FB0') },
    { stage: 'rika4-2',   id: 'tr4-denki',   name: '電気の たま',            shape: 'orb',       colors: c('#FFE96B', '#B8860B') },
    { stage: 'rika4-3',   id: 'tr4-hoshi',   name: '星の ほし',              shape: 'star',      colors: c('#C9B8FF') },
    { stage: 'rika4-4',   id: 'tr4-mizu',    name: '水の びん',              shape: 'potion',    colors: c('#6FD3FF', '#2E7FB0') },
    { stage: 'shakai4-1', id: 'tr4-ken',     name: '県の らしんばん',        shape: 'compass',   colors: c('#4CD164', '#1E7A3C') },
    { stage: 'shakai4-2', id: 'tr4-gomi',    name: 'リサイクルの わ',        shape: 'ring',      colors: c('#4CD164', '#1E7A3C') },
    { stage: 'shakai4-3', id: 'tr4-mamori',  name: 'まもりの すず',          shape: 'bell',      colors: c('#E8443A', '#8A1F18') },
    { stage: 'shakai4-4', id: 'tr4-kyodo',   name: 'きょう土の まきもの',    shape: 'scroll',    colors: c('#D8B889', '#8A5A2B') },

    /* ---- 小4 英語の空（4）（v4.7） ---- */
    { stage: 'eigo4-1',   id: 'tr4-hello',   name: 'あいさつの すず',        shape: 'bell',      colors: c('#8FD3FF', '#3E7FB0') },
    { stage: 'eigo4-2',   id: 'tr4-youbi',   name: '曜日の すなどけい',      shape: 'hourglass', colors: c('#FF9A4A', '#A8542A') },
    { stage: 'eigo4-3',   id: 'tr4-abc',     name: 'ABCの かぎ',             shape: 'key',       colors: c('#C9D3DC', '#6B7C8C') },
    { stage: 'eigo4-4',   id: 'tr4-want',    name: 'ほしいものの たま',      shape: 'orb',       colors: c('#4CD164', '#1E7A3C') },
    /* ---- 小5 算数（v6.5・18） ---- */
    { stage: 'sansu5-1',  id: 'tr5-shosu',   name: '小数の 水しょう',        shape: 'gem',       colors: c('#8FD3FF', '#3E7FB0') },
    { stage: 'sansu5-2',  id: 'tr5-taiseki', name: '体積の はこ',            shape: 'orb',       colors: c('#C89A5B', '#7A5326') },
    { stage: 'sansu5-3',  id: 'tr5-hirei',   name: '比例の はね',            shape: 'feather',   colors: c('#4F8CFF', '#1F4FB0') },
    { stage: 'sansu5-4',  id: 'tr5-kake',    name: '小数かけ算の 書',        shape: 'book',      colors: c('#FF8A5A', '#A83A1A') },
    { stage: 'sansu5-5',  id: 'tr5-wari',    name: '小数わり算の かぎ',      shape: 'key',       colors: c('#C9D3DC', '#6B7C8C') },
    { stage: 'sansu5-6',  id: 'tr5-godo',    name: '合同の ふたごいし',      shape: 'gem',       colors: c('#4CD164', '#1E7A3C') },
    { stage: 'sansu5-7',  id: 'tr5-kaku',    name: '角の らしんばん',        shape: 'compass',   colors: c('#E0846B', '#8A3A24') },
    { stage: 'sansu5-8',  id: 'tr5-baisu',   name: '倍数の 歯車',            shape: 'ring',      colors: c('#B8A060', '#6E5A2A') },
    { stage: 'sansu5-9',  id: 'tr5-bunsu',   name: '分数の 天びん',          shape: 'hourglass', colors: c('#A96BE0', '#5A2D8A') },
    { stage: 'sansu5-10', id: 'tr5-bunsu2',  name: '通分の まきもの',        shape: 'scroll',    colors: c('#D8B889', '#8A5A2B') },
    { stage: 'sansu5-11', id: 'tr5-heikin',  name: '平均の すず',            shape: 'bell',      colors: c('#C0A060', '#7A5326') },
    { stage: 'sansu5-12', id: 'tr5-tani',    name: '単位量の しずく',        shape: 'potion',    colors: c('#6FD3FF', '#2E7FB0') },
    { stage: 'sansu5-13', id: 'tr5-hayasa',  name: '速さの はね',            shape: 'feather',   colors: c('#FFD166', '#B8860B') },
    { stage: 'sansu5-14', id: 'tr5-menseki', name: '面積の ほし',            shape: 'star',      colors: c('#FF9A4A') },
    { stage: 'sansu5-15', id: 'tr5-wariai',  name: '割合の 王かん',          shape: 'crown',     colors: c('#F2C14E', '#B8860B') },
    { stage: 'sansu5-16', id: 'tr5-graph',   name: 'グラフの わ',            shape: 'ring',      colors: c('#8FD3FF', '#4FA3E0') },
    { stage: 'sansu5-17', id: 'tr5-enshu',   name: '円周の たま',            shape: 'orb',       colors: c('#F2F2F2', '#B9BCCF') },
    { stage: 'sansu5-18', id: 'tr5-kakuchu', name: '角柱の 水しょう',        shape: 'gem',       colors: c('#7FD8FF', '#2E7FB0') },
    /* ---- 小5 国語（v6.6・4） ---- */
    { stage: 'kokugo5-1', id: 'tr5-yomi',    name: '読みの 書',              shape: 'book',      colors: c('#3E7FD0', '#1F4FB0') },
    { stage: 'kokugo5-2', id: 'tr5-kaki',    name: '書きの まきもの',        shape: 'scroll',    colors: c('#D8B889', '#8A5A2B') },
    { stage: 'kokugo5-3', id: 'tr5-keigo',   name: '敬語の すず',            shape: 'bell',      colors: c('#C0A060', '#7A5326') },
    { stage: 'kokugo5-4', id: 'tr5-kotoba',  name: 'ことばの むらさきいし',  shape: 'gem',       colors: c('#A96BE0', '#5A2D8A') },
    /* ---- 小5 理科・社会（v6.7・8） ---- */
    { stage: 'rika5-1',   id: 'tr5-tenki',   name: '天気の はね',            shape: 'feather',   colors: c('#8FD3FF', '#3E7FB0') },
    { stage: 'rika5-2',   id: 'tr5-medaka',  name: 'メダカの しずく',        shape: 'potion',    colors: c('#6FD3FF', '#2E7FB0') },
    { stage: 'rika5-3',   id: 'tr5-mizu',    name: '流れる 水の たま',       shape: 'orb',       colors: c('#4F8CFF', '#1F4FB0') },
    { stage: 'rika5-4',   id: 'tr5-furiko',  name: 'ふりこの すず',          shape: 'bell',      colors: c('#C0A060', '#7A5326') },
    { stage: 'shakai5-1', id: 'tr5-kokudo',  name: '国土の らしんばん',      shape: 'compass',   colors: c('#E0846B', '#8A3A24') },
    { stage: 'shakai5-2', id: 'tr5-kome',    name: '米づくりの ほし',        shape: 'star',      colors: c('#FFD166') },
    { stage: 'shakai5-3', id: 'tr5-kogyo',   name: '工業の 歯車',            shape: 'ring',      colors: c('#B8A060', '#6E5A2A') },
    { stage: 'shakai5-4', id: 'tr5-joho',    name: '情報の 書',              shape: 'book',      colors: c('#3E9A6B', '#1E5A3C') },
    /* ---- 小5 英語（v6.8・4） ---- */
    { stage: 'eigo5-1',   id: 'tr5-hello',   name: 'あいさつの ほし',        shape: 'star',      colors: c('#FFD166') },
    { stage: 'eigo5-2',   id: 'tr5-can',     name: 'できることの たま',      shape: 'orb',       colors: c('#4CD164', '#1E7A3C') },
    { stage: 'eigo5-3',   id: 'tr5-map',     name: '道あんないの コンパス',  shape: 'compass',   colors: c('#4F8CFF', '#1F4FB0') },
    { stage: 'eigo5-4',   id: 'tr5-hero',    name: 'ヒーローの 王かん',      shape: 'crown',     colors: c('#F2C14E', '#B8860B') },

    /* ---- 小4 さいごの塔（v4.8） ---- */
    { stage: 'tower4',    id: 'tr4-dark',    name: 'やみの かんむり',        shape: 'crown',     colors: c('#7A4BC2', '#2A1240') },
    // 小1・小2の さいごの とう（v6.4）
    { stage: 'tower1',    id: 'tr1-obake',   name: 'おばけの かんむり',      shape: 'crown',     colors: c('#C9B8FF', '#6A4FB8') },
    { stage: 'tower2',    id: 'tr2-kaizoku', name: 'かいぞくの かんむり',    shape: 'crown',     colors: c('#C42B2B', '#5A1010') }
  ];

  const byStage = {};
  const byId = {};
  list.forEach(function (t) { byStage[t.stage] = t; byId[t.id] = t; });

  function forStage(stageId) { return byStage[stageId] || null; }
  function get(id) { return byId[id]; }

  /* 画面に おく 絵（40×40 の ブロック）。gold は ★3の「ぴかぴか」版 */
  function node(id, opts) {
    opts = opts || {};
    const t = byId[id];
    const size = opts.size || 40;
    const cls = 'item' + (opts.cls ? ' ' + opts.cls : '');
    if (!t) return MQ.blocks.box([], {}, { size: size, cls: cls, base: 40 });
    const palette = MQ.blocks.fill(Object.assign({}, common, t.colors, opts.gold ? GOLD : null));
    const box = MQ.blocks.box(shapes[t.shape] || [], palette, { size: size, cls: cls, base: 40, raw: true });
    if (opts.shadow) box.classList.add('is-shadow');
    return box;
  }

  // まだ 見つけていない たからもの（かげ）
  function shadowNode(id, opts) {
    const o = Object.assign({}, opts || {});
    o.shadow = true;
    return node(id, o);
  }

  // きんのコイン（たからものでは ないが 同じ しくみで 描く）
  function coinNode(opts) {
    opts = opts || {};
    const palette = MQ.blocks.fill({ A: '#FFD447', B: '#B8801D', C: '#FFF3B8' });
    return MQ.blocks.box(shapes.coin, palette, { size: opts.size || 40, base: 40, cls: 'item', raw: true });
  }
  // いくつ 持っているか（金色は 1つと数える）
  function countOwned(player) {
    return Object.keys((player && player.treasure) || {}).length;
  }
  function countGold(player) {
    const t = (player && player.treasure) || {};
    return Object.keys(t).filter(function (k) { return t[k] >= 2; }).length;
  }
  function total() { return list.length; }
  // その ワールド（学年）の ステージに ついている たからものだけ（v2.2）
  function listFor(world) {
    const ids = {};
    ((world && world.areas) || []).forEach(function (a) { a.stages.forEach(function (st) { ids[st.id] = true; }); });
    return list.filter(function (t) { return ids[t.stage]; });
  }

  /* =======================================================
     どうぐの わざ（v2.0）。形ごとに 1つ。
       val  … [ふつう, 金色]
       kind … atk=こうげき / def=まもり / wis=かしこさ / luck=ラッキー
       mobOnly … ザコの ときだけ 使える（ボス戦では グレー）
     効果の 中身は js/core/battle.js（useItem）。ここは 名前と 数字だけ。
     ======================================================= */
  const POWERS = [
    { id: 'burst',  name: 'ばくれつ こうげき', kind: 'atk',  shapes: ['gem'],                      val: [2, 3],
      desc:  function (v) { return 'つぎの 正解が ' + v + 'ばい！ ボスには ' + v + 'ダメージ'; },
      short: function (v) { return '正解が ' + v + 'ばい'; },
      chips: function (v) { return ['正解 ×' + v, 'ボス ' + v + 'ダメージ']; } },
    { id: 'shield', name: 'てっぺき まもり',   kind: 'def',  shapes: ['crown'],                    val: [1, 2],
      desc:  function (v) { return 'まちがえても ' + v + '回 セーフ。てきは にげない'; },
      short: function (v) { return v + '回 セーフ'; },
      chips: function (v) { return ['セーフ ' + v + '回', 'にげられない']; } },
    { id: 'freeze', name: '時とめ',            kind: 'def',  shapes: ['hourglass'],                val: [1, 2],
      desc:  function (v) { return 'まちがえても コンボが 切れない（' + v + '回）'; },
      short: function (v) { return 'コンボを まもる'; },
      chips: function (v) { return ['コンボ キープ', v + '回']; } },
    { id: 'guide',  name: 'みちしるべ',        kind: 'wis',  shapes: ['book'],                     val: [1, 2],
      desc:  function (v) { return 'ヒントを 先に 見られる（' + v + '回）'; },
      short: function (v) { return '先に ヒント'; },
      chips: function (v) { return ['先に ヒント', v + '回']; } },
    { id: 'golden', name: 'ゴールデンコール',  kind: 'luck', shapes: ['star'],                     val: [1, 2], mobOnly: true,
      desc:  function (v) { return 'てきが ゴールデンスライムに なる（' + v + '体）。けいけんち 3ばい＋コイン'; },
      short: function (v) { return 'ゴールデン ' + v + '体'; },
      chips: function (v) { return ['ゴールデン ' + v + '体', 'けいけんち ×3', 'コイン +1']; } },
    { id: 'chest',  name: 'たからばこ よび',   kind: 'luck', shapes: ['key'],                      val: [1, 2], mobOnly: true,
      desc:  function (v) { return 'たからばこが もう1つ 出る（コイン ' + v + 'まい）'; },
      short: function (v) { return 'はこ ＋1'; },
      chips: function (v) { return ['たからばこ +1', 'コイン +' + v]; } },
    { id: 'power',  name: 'パワーアップ',      kind: 'atk',  shapes: ['orb'],                      val: [1.5, 2],
      desc:  function (v) { return 'おわりまで けいけんち ' + v + 'ばい'; },
      short: function (v) { return 'けいけんち ' + v + 'ばい'; },
      chips: function (v) { return ['けいけんち ×' + v, 'おわりまで']; } },
    { id: 'charge', name: 'ひっさつ チャージ', kind: 'atk',  shapes: ['bell'],                     val: [3, 5],
      desc:  function (v) { return 'コンボ ＋' + v + '。ひっさつわざに 近づく'; },
      short: function (v) { return 'コンボ ＋' + v; },
      chips: function (v) { return ['コンボ +' + v, 'ひっさつに 近づく']; } },

    /* ---- v5.4 で ふえた 5つ ----
       ここも 大原則は 同じ：効果は「正解した とき」に 出る。 */
    { id: 'bond',   name: 'きずなの わ',       kind: 'luck', shapes: ['ring'],                     val: [2, 3], palOnly: true,
      desc:  function (v) { return '正解 1回で なかまゲージが ' + v + 'つ たまる'; },
      short: function (v) { return 'ゲージ ' + v + 'つ'; },
      chips: function (v) { return ['ゲージ ×' + v, 'なかまの 追い打ちが 早い']; } },
    { id: 'rush',   name: 'コンボの まきもの', kind: 'atk',  shapes: ['scroll'],                   val: [1, 2],
      desc:  function (v) { return '正解するたび コンボが ＋' + v + ' 多く たまる'; },
      short: function (v) { return 'コンボ ＋' + v + 'ずつ'; },
      chips: function (v) { return ['コンボ +' + v + ' ずつ', 'ひっさつが 早い']; } },
    { id: 'find',   name: 'たからの コンパス', kind: 'luck', shapes: ['compass'],                  val: [2, 3],
      desc:  function (v) { return 'コインが ' + v + 'まい 見つかる'; },
      short: function (v) { return 'コイン ＋' + v; },
      chips: function (v) { return ['コイン +' + v, 'すぐ もらえる']; } },
    { id: 'swift',  name: 'はやての はね',     kind: 'luck', shapes: ['feather'],                  val: [30, 60],
      desc:  function (v) { return 'はやとき ボーナス（けいけんち ＋' + v + '）が かならず もらえる'; },
      short: function (v) { return 'はやとき ＋' + v; },
      chips: function (v) { return ['はやとき かくてい', 'けいけんち +' + v]; } },
    { id: 'elixir', name: 'なかまの くすり',   kind: 'wis',  shapes: ['potion'],                   val: [2, 3], palOnly: true,
      desc:  function (v) { return '相棒の けいけんちが ' + v + 'ばい'; },
      short: function (v) { return '相棒 ' + v + 'ばい'; },
      chips: function (v) { return ['相棒の けいけんち ×' + v, 'おわりまで']; } }
  ];
  const KIND_NAME = { atk: 'こうげき', def: 'まもり', wis: 'かしこさ', luck: 'ラッキー' };
  const powerByShape = {};
  const powerById = {};
  POWERS.forEach(function (p) {
    powerById[p.id] = p;
    p.shapes.forEach(function (sh) { powerByShape[sh] = p; });
  });

  // たからもの id → わざ（形で 決まる）
  function powerOf(id) {
    const t = byId[id];
    return t ? (powerByShape[t.shape] || null) : null;
  }
  function getPower(pid) { return powerById[pid] || null; }

  /* たたかいに もっていく 1つぶんの 情報。持っていなければ null。
       { id, name, power, powerName, kind, kindName, val, gold, uses, desc, short, mobOnly } */
  function item(player, id) {
    const t = byId[id];
    const lv = (player && player.treasure && player.treasure[id]) || 0;
    if (!t || !lv) return null;
    const pw = powerOf(id);
    if (!pw) return null;
    const gold = lv >= 2;
    const val = pw.val[gold ? 1 : 0];
    return {
      id: id, name: t.name, power: pw.id, powerName: pw.name, kind: pw.kind, kindName: KIND_NAME[pw.kind],
      val: val, gold: gold,
      uses: pw.id === 'guide' ? val : 1,      // みちしるべだけ「回数」が 効果
      desc: pw.desc(val), short: pw.short(val), chips: pw.chips(val),
      mobOnly: !!pw.mobOnly, palOnly: !!pw.palOnly
    };
  }

  // もちもの（player.bag）を たたかい用の ならびに する
  function bagItems(player) {
    return ((player && player.bag) || []).map(function (id) { return item(player, id); }).filter(Boolean);
  }

  return {
    list: list, shapes: shapes, get: get, forStage: forStage,
    node: node, shadowNode: shadowNode, coinNode: coinNode,
    countOwned: countOwned, countGold: countGold, total: total, listFor: listFor,
    powers: POWERS, kindName: KIND_NAME, powerOf: powerOf, getPower: getPower, item: item, bagItems: bagItems
  };
})();
