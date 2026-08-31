/* ---------------------------------------------------------
   敵の ドット絵と 名前

   形（shape）は 32×32（ボスと まおうは 48×48）の マス目。文字と色の対応は colors で決めます。
     A … メインの色   B … 影・2番目の色   C … 3番目の色
     k … 黒   w … 白   r … 赤   y … 黄色
   同じ形でも 色を変えると べつの敵に なります。

   area … どのエリアに 出るか（sansu=山 kokugo=森 rikashakai=海 eigo=空）
   rare … ゴールデンスライム。たまにしか 出ず、けいけんち 3倍

   ※ 息子さんの絵に 差しかえたいときは js/content/art.js を見てください。
   ※ 実在のキャラクター（ポケモンなど）の名前・絵は 使いません。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.enemies = (function () {
  // 絵は js/content/monsterart.js（CSS の div を かさねて 描く）
  const shapes = MQ.monsterArt.mons;

  const common = { k: '#141018', w: '#FFFFFF', r: '#FF4D4D', y: '#FFD447', e: '#4FD3FF' };

  // ふつうの敵。area ごとに 顔ぶれが かわる
  const list = [
    /* 山（算数） */
    { id: 'golem-gray',   name: 'ゴーレム',        shape: 'golem',   area: 'sansu', rank: 2, colors: { A: '#9AA7B8', B: '#5A6A80' } },
    { id: 'golem-lava',   name: 'マグマゴーレム',   shape: 'golem',   area: 'sansu', rank: 3, colors: { A: '#E8642C', B: '#7A2E0E' } },
    { id: 'lizard-green', name: 'リザード',        shape: 'lizard',  area: 'sansu', rank: 2, colors: { A: '#3E9A6B', B: '#C9F0A8' } },
    { id: 'lizard-fire',  name: 'ファイアリザード', shape: 'lizard',  area: 'sansu', rank: 3, colors: { A: '#F26B2B', B: '#FFD27A' } },
    { id: 'skull-white',  name: 'スカル',          shape: 'skull',   area: 'sansu', rank: 2, colors: { A: '#F2F2F2' } },
    { id: 'skull-gold',   name: 'ゴールドスカル',   shape: 'skull',   area: 'sansu', rank: 3, colors: { A: '#FFD166' } },
    { id: 'robot-gray',   name: 'ロボ',            shape: 'robot',   area: 'sansu', rank: 2, colors: { A: '#B8C4D6', B: '#4A5568' } },
    { id: 'robot-red',    name: 'メカロボ',        shape: 'robot',   area: 'sansu', rank: 3, colors: { A: '#FF8A5A', B: '#7A2E0E' } },
    { id: 'eyeball',      name: 'アイボール',      shape: 'eyeball', area: 'sansu', rank: 1, colors: { A: '#2F6FD0' } },
    /* 森（国語） */
    { id: 'mush-red',     name: 'キノコン',        shape: 'mushroom', area: 'kokugo', rank: 1, colors: { A: '#FF5A5A', B: '#FFFFFF', C: '#F2E2C4' } },
    { id: 'mush-purple',  name: 'ドクキノコン',     shape: 'mushroom', area: 'kokugo', rank: 3, colors: { A: '#8A4FD1', B: '#FFD166', C: '#F2E2C4' } },
    { id: 'spider-black', name: 'スパイダー',      shape: 'spider',   area: 'kokugo', rank: 3, colors: { A: '#3A3A4A' } },
    { id: 'spider-green', name: 'モリグモ',        shape: 'spider',   area: 'kokugo', rank: 2, colors: { A: '#3E9A6B' } },
    { id: 'slime-green',  name: 'スライム',        shape: 'slime',    area: 'kokugo', rank: 1, colors: { A: '#4CD164', B: '#1E7A3C' } },
    { id: 'slime-red',    name: 'レッドスライム',   shape: 'slime',    area: 'kokugo', rank: 2, colors: { A: '#FF5A5A', B: '#A82424' } },
    { id: 'bat-black',    name: 'バット',          shape: 'bat',      area: 'kokugo', rank: 2, colors: { A: '#3A3A4A', B: '#22222E' } },
    /* 海（理科社会） */
    { id: 'tako-red',     name: 'オクトパン',      shape: 'tako',  area: 'rikashakai', rank: 2, colors: { A: '#FF7A6B' } },
    { id: 'tako-purple',  name: 'ドクタコン',      shape: 'tako',  area: 'rikashakai', rank: 3, colors: { A: '#8A4FD1' } },
    { id: 'crab-red',     name: 'カニカニ',        shape: 'crab',  area: 'rikashakai', rank: 2, colors: { A: '#FF5A5A', B: '#A82424' } },
    { id: 'crab-green',   name: 'イソガニン',      shape: 'crab',  area: 'rikashakai', rank: 2, colors: { A: '#3E9A6B', B: '#1E5A3C' } },
    { id: 'shark-gray',   name: 'サメゾー',        shape: 'shark', area: 'rikashakai', rank: 3, colors: { A: '#8FA6C0' } },
    { id: 'slime-blue',   name: 'ブルースライム',   shape: 'slime', area: 'rikashakai', rank: 1, colors: { A: '#4F8CFF', B: '#1F4FB0' } },
    { id: 'ghost-blue',   name: 'アイスゴースト',   shape: 'ghost', area: 'rikashakai', rank: 2, colors: { A: '#8FD3FF', B: '#4FA3E0' } },
    /* 空（英語） */
    { id: 'cloud-white',   name: 'クラウドン',      shape: 'cloud', area: 'eigo', rank: 1, colors: { A: '#EDEEF5' } },
    { id: 'cloud-thunder', name: 'ゴロゴロクン',    shape: 'cloud', area: 'eigo', rank: 3, colors: { A: '#6B7C9C', y: '#FFD166' } },
    { id: 'bat-purple',    name: 'ダークバット',    shape: 'bat',   area: 'eigo', rank: 3, colors: { A: '#8A4FD1', B: '#4A2380' } },
    { id: 'ghost-white',   name: 'ゴースト',        shape: 'ghost', area: 'eigo', rank: 2, colors: { A: '#EDEEF5', B: '#B9BCCF' } },
    { id: 'slime-sky',     name: 'ソラスライム',    shape: 'slime', area: 'eigo', rank: 1, colors: { A: '#8FD3FF', B: '#4FA3E0' } },
    { id: 'eyeball-red',   name: 'レッドアイ',      shape: 'eyeball', area: 'eigo', rank: 3, colors: { A: '#E8443A' } },
    /* レア（どのエリアにも たまに出る。けいけんち3倍） */
    /* 山（算数）の ついか組 */
    { id: 'dice-white', name: 'サイコロン', shape: 'dice', area: 'sansu', rank: 1, colors: { A: '#F4F6FA', B: '#B9C2D4', P: '#2B3350' } },
    { id: 'dice-gold', name: 'キンサイコロン', shape: 'dice', area: 'sansu', rank: 2, colors: { A: '#FFD166', B: '#C98F1B', P: '#6B4A0E' } },
    { id: 'snake-green', name: 'ヘビゴン', shape: 'snake', area: 'sansu', rank: 1, colors: { A: '#4CD164', B: '#1E7A3C' } },
    { id: 'snake-purple', name: 'ドクヘビゴン', shape: 'snake', area: 'sansu', rank: 3, colors: { A: '#8A4FD1', B: '#4A2380' } },
    { id: 'scorpion-sand', name: 'サソリン', shape: 'scorpion', area: 'sansu', rank: 2, colors: { A: '#E0B15C', B: '#9C742E' } },
    { id: 'scorpion-black', name: 'ダークサソリン', shape: 'scorpion', area: 'sansu', rank: 3, colors: { A: '#4A4A5E', B: '#26263A' } },
    { id: 'turtle-rock', name: 'イワガメン', shape: 'turtle', area: 'sansu', rank: 2, colors: { A: '#9AA7B8', B: '#5A6A80', C: '#C9A06B' } },
    { id: 'turtle-lava', name: 'マグマガメン', shape: 'turtle', area: 'sansu', rank: 3, colors: { A: '#7A2E0E', B: '#E8642C', C: '#4A4A5E' } },
    { id: 'mole', name: 'モグラン', shape: 'mole', area: 'sansu', rank: 1, colors: { A: '#8A5A3C', B: '#C9A06B', C: '#FF9DB0' } },
    { id: 'crystal-blue', name: 'クリスタルン', shape: 'crystal', area: 'sansu', rank: 1, colors: { A: '#8FD3FF', B: '#4FA3E0' } },
    { id: 'crystal-pink', name: 'ルビリン', shape: 'crystal', area: 'sansu', rank: 2, colors: { A: '#FF7A9C', B: '#C4365E' } },
    { id: 'wolf-gray', name: 'ウルフン', shape: 'wolf', area: 'sansu', rank: 2, colors: { A: '#9AA7B8', B: '#E6ECF5', C: '#FF9DB0' } },
    { id: 'wolf-dark', name: 'ヤミウルフン', shape: 'wolf', area: 'sansu', rank: 3, colors: { A: '#5A4A80', B: '#C9BCE6', C: '#FF9DB0' } },
    /* 森（国語）の ついか組 */
    { id: 'owl-brown', name: 'フクロン', shape: 'owl', area: 'kokugo', rank: 2, colors: { A: '#8A5A3C', B: '#C9A06B' } },
    { id: 'owl-white', name: 'シロフクロン', shape: 'owl', area: 'kokugo', rank: 3, colors: { A: '#EDEEF5', B: '#C9CFDB' } },
    { id: 'frog-green', name: 'ケロッポ', shape: 'frog', area: 'kokugo', rank: 1, colors: { A: '#4CD164', B: '#C9F0A8', C: '#FF9DB0' } },
    { id: 'frog-blue', name: 'アメケロン', shape: 'frog', area: 'kokugo', rank: 2, colors: { A: '#4F8CFF', B: '#B3D9FF', C: '#FF9DB0' } },
    { id: 'bee-yellow', name: 'ブンバチン', shape: 'bee', area: 'kokugo', rank: 1, colors: { A: '#FFD166' } },
    { id: 'bee-red', name: 'アカバチン', shape: 'bee', area: 'kokugo', rank: 3, colors: { A: '#FF6B5A' } },
    { id: 'snail-orange', name: 'デンデロン', shape: 'snail', area: 'kokugo', rank: 1, colors: { A: '#F2A24B', B: '#B36A1B', C: '#F2E2C4' } },
    { id: 'snail-purple', name: 'ドクデンデロン', shape: 'snail', area: 'kokugo', rank: 3, colors: { A: '#8A4FD1', B: '#4A2380', C: '#C9F0A8' } },
    { id: 'tree-green', name: 'ツリーン', shape: 'tree', area: 'kokugo', rank: 2, colors: { A: '#3E9A6B', B: '#1E5A3C', C: '#8A5A3C' } },
    { id: 'tree-autumn', name: 'モミジーン', shape: 'tree', area: 'kokugo', rank: 3, colors: { A: '#E8853A', B: '#B34E14', C: '#6B4A2E' } },
    { id: 'fox-orange', name: 'コンゴン', shape: 'fox', area: 'kokugo', rank: 2, colors: { A: '#F2A24B', B: '#FFF3E0', C: '#FF9DB0' } },
    { id: 'fox-white', name: 'ユキコンゴン', shape: 'fox', area: 'kokugo', rank: 3, colors: { A: '#E6ECF5', B: '#FFFFFF', C: '#FF9DB0' } },
    { id: 'hedgehog-brown', name: 'ハリマル', shape: 'hedgehog', area: 'kokugo', rank: 2, colors: { A: '#F2E2C4', B: '#8A5A3C', C: '#FF9DB0' } },
    { id: 'hedgehog-blue', name: 'トゲマル', shape: 'hedgehog', area: 'kokugo', rank: 3, colors: { A: '#E6ECF5', B: '#4F6FB8', C: '#FF9DB0' } },
    { id: 'butterfly-pink', name: 'フラッタン', shape: 'butterfly', area: 'kokugo', rank: 1, colors: { A: '#FF7A9C', B: '#C4365E' } },
    /* 海（理科社会）の ついか組 */
    { id: 'fish-blue', name: 'トトマル', shape: 'fish', area: 'rikashakai', rank: 1, colors: { A: '#4F8CFF', B: '#B3D9FF', C: '#FFD166' } },
    { id: 'fish-red', name: 'アカトトマル', shape: 'fish', area: 'rikashakai', rank: 2, colors: { A: '#FF6B5A', B: '#FFC9A8', C: '#FFD166' } },
    { id: 'jelly-pink', name: 'プルリン', shape: 'jelly', area: 'rikashakai', rank: 1, colors: { A: '#FF9DB0', B: '#E06080' } },
    { id: 'jelly-elec', name: 'エレキプルリン', shape: 'jelly', area: 'rikashakai', rank: 3, colors: { A: '#FFD166', B: '#C98F1B' } },
    { id: 'turtle-sea', name: 'ウミガメン', shape: 'turtle', area: 'rikashakai', rank: 3, colors: { A: '#3E9A6B', B: '#1E5A3C', C: '#A8E6C0' } },
    { id: 'seahorse-green', name: 'タツリン', shape: 'seahorse', area: 'rikashakai', rank: 1, colors: { A: '#3E9A6B', B: '#C9F0A8' } },
    { id: 'seahorse-gold', name: 'キンタツリン', shape: 'seahorse', area: 'rikashakai', rank: 3, colors: { A: '#FFD166', B: '#FFF0B8' } },
    { id: 'puffer-yellow', name: 'フグマル', shape: 'puffer', area: 'rikashakai', rank: 2, colors: { A: '#FFD166', B: '#C98F1B', C: '#FFF0B8' } },
    { id: 'puffer-purple', name: 'ドクフグマル', shape: 'puffer', area: 'rikashakai', rank: 3, colors: { A: '#8A4FD1', B: '#4A2380', C: '#C9A8F0' } },
    { id: 'star-orange', name: 'ホシデン', shape: 'star', area: 'rikashakai', rank: 1, colors: { A: '#F2A24B', B: '#C4702B' } },
    { id: 'star-blue', name: 'アオホシデン', shape: 'star', area: 'rikashakai', rank: 2, colors: { A: '#4F8CFF', B: '#1F4FB0' } },
    { id: 'penguin-navy', name: 'ペンペコ', shape: 'penguin', area: 'rikashakai', rank: 1, colors: { A: '#3A4A6E' } },
    { id: 'penguin-ice', name: 'アイスペコ', shape: 'penguin', area: 'rikashakai', rank: 2, colors: { A: '#8FD3FF' } },
    { id: 'angler-navy', name: 'チカリン', shape: 'angler', area: 'rikashakai', rank: 3, colors: { A: '#2F4A8C', B: '#4F6FB8' } },
    { id: 'angler-black', name: 'クロチカリン', shape: 'angler', area: 'rikashakai', rank: 3, colors: { A: '#2B2B3A', B: '#4A4A5E' } },
    /* 空（英語）の ついか組 */
    { id: 'bird-yellow', name: 'ピヨリン', shape: 'bird', area: 'eigo', rank: 1, colors: { A: '#FFD166', B: '#F2A24B', C: '#FFF0B8' } },
    { id: 'bird-blue', name: 'アオピヨリン', shape: 'bird', area: 'eigo', rank: 2, colors: { A: '#4F8CFF', B: '#1F4FB0', C: '#B3D9FF' } },
    { id: 'ufo-silver', name: 'ユーフォン', shape: 'ufo', area: 'eigo', rank: 2, colors: { A: '#4CD164', B: '#B8C4D6', C: '#8FD3FF' } },
    { id: 'ufo-dark', name: 'ダークユーフォン', shape: 'ufo', area: 'eigo', rank: 3, colors: { A: '#FF6B5A', B: '#4A4A5E', C: '#C9A8F0' } },
    { id: 'balloon-pink', name: 'フワリン', shape: 'balloon', area: 'eigo', rank: 1, colors: { A: '#FF9DB0', B: '#E06080', C: '#FF5A7A' } },
    { id: 'balloon-sky', name: 'ソラフワリン', shape: 'balloon', area: 'eigo', rank: 1, colors: { A: '#8FD3FF', B: '#4FA3E0', C: '#FF9DB0' } },
    { id: 'star-gold', name: 'ピカボシ', shape: 'star', area: 'eigo', rank: 2, colors: { A: '#FFD166', B: '#C98F1B' } },
    { id: 'sun', name: 'サンサンドン', shape: 'sun', area: 'eigo', rank: 2, colors: { A: '#FFD166', B: '#F2A24B', C: '#FF9DB0' } },
    { id: 'moon', name: 'ミカヅキン', shape: 'moon', area: 'eigo', rank: 2, colors: { A: '#FFE08A', B: '#E0B15C' } },
    { id: 'rocket-red', name: 'ロケットン', shape: 'rocket', area: 'eigo', rank: 3, colors: { A: '#F4F6FA', B: '#C9CFDB', C: '#FF6B5A', D: '#4F8CFF' } },
    { id: 'rocket-blue', name: 'アオロケットン', shape: 'rocket', area: 'eigo', rank: 3, colors: { A: '#B3D9FF', B: '#8FB8E8', C: '#1F4FB0', D: '#FFD166' } },
    { id: 'kite-red', name: 'カイトン', shape: 'kite', area: 'eigo', rank: 2, colors: { A: '#FF6B5A', B: '#FFD166' } },
    { id: 'kite-blue', name: 'アオカイトン', shape: 'kite', area: 'eigo', rank: 2, colors: { A: '#4F8CFF', B: '#FFD166' } },
    { id: 'tornado-gray', name: 'グルグルン', shape: 'tornado', area: 'eigo', rank: 2, colors: { A: '#B8C4D6', B: '#8A97AB' } },
    { id: 'tornado-storm', name: 'アラシグルン', shape: 'tornado', area: 'eigo', rank: 3, colors: { A: '#6B7C9C', B: '#4A5568' } },
    { id: 'butterfly-sky', name: 'ソラフラッタン', shape: 'butterfly', area: 'eigo', rank: 1, colors: { A: '#8FD3FF', B: '#4FA3E0' } },

    { id: 'slime-golden', name: 'ゴールデンスライム', shape: 'slime', rare: true, colors: { A: '#FFD166', B: '#B8860B' } },

    /* ---- 息子さんの モンスター（エリアごとの レア敵。けいけんち3倍） ---- */
    { id: 'skullhorse', name: 'スカルホース', shape: 'skullhorse', area: 'sansu', rare: true, by: 'son',
      colors: { A: '#F4F4F4', B: '#B9BFCC', w: '#FFFFFF', r: '#FF4D4D', k: '#1A1A22', s: '#8FA0BC', y: '#F2C14E' } },
    { id: 'sameoni', name: 'サメオニ', shape: 'sameoni', area: 'rikashakai', rare: true, by: 'son',
      colors: { A: '#5FA8DC', B: '#2E5F8A', r: '#FF9A4A', w: '#FFFFFF' } },
    { id: 'zukan', name: 'ずかんの あくま', shape: 'zukan', area: 'kokugo', rare: true, by: 'son',
      colors: { A: '#C4762E', w: '#FBF4DF', r: '#E8443A', k: '#2B2438', B: '#8A4B12', W: '#4A2D6B' } },

    /* ABC3きょうだい … 英語の空に 3体まとめて 出てくる */
    { id: 'abc-a', name: 'エー', shape: 'letterA', area: 'eigo', rare: true, by: 'son', trio: 'abc',
      colors: { A: '#E8443A', B: '#A82424', w: '#FFFFFF', k: '#12121A' } },
    { id: 'abc-b', name: 'ビー', shape: 'letterB', area: 'eigo', rare: true, by: 'son', trio: 'abc',
      colors: { A: '#4CAF50', B: '#2E7D32', w: '#FFFFFF', k: '#12121A' } },
    { id: 'abc-c', name: 'シー', shape: 'letterC', area: 'eigo', rare: true, by: 'son', trio: 'abc',
      colors: { A: '#F2C14E', B: '#B8860B', w: '#FFFFFF', k: '#12121A' } },

    /* たからばこ（敵あつかい だが 図鑑には のせない） */
    { id: 'chest', name: 'たからばこ', shape: 'chest', hidden: true,
      colors: { p: '#A6753F', P: '#7A5326', y: '#F2C14E' } }
  ];

  // ボス（エリアごとに 1体）
  const bosses = [
    { id: 'boss-dragon', area: 'sansu',      name: 'ナンバードラゴン', shape: 'dragon',    colors: { A: '#4F8CFF', B: '#FFD166' } },
    { id: 'boss-oni',    area: 'kokugo',     name: 'モジオニ',        shape: 'oni',       colors: { A: '#FF5A5A', C: '#2B2B3A' } },
    { id: 'boss-knight', area: 'rikashakai', name: 'メカナイト',      shape: 'knight',    colors: { A: '#8A9BB8', B: '#12121A' } },
    { id: 'boss-slime',  area: 'eigo',       name: 'キングスライム',   shape: 'kingslime', colors: { A: '#FFA33A', B: '#B35F00' } },
    /* ラスボス。HPを 2つ けずると 第2形態（色が かわる）に なる */
    { id: 'boss-maou', area: 'tower', name: 'まおう', shape: 'maou', last: true,
      colors: { A: '#7A2436', B: '#3A0E18', r: '#FF3B30', y: '#FFD447', w: '#F2F2F2' },
      phase2: { A: '#A81828', B: '#5A0A12', r: '#FFD447', y: '#FFF3B8', w: '#FFE08A' } }
  ];

  // おこったときの 色（ボスの HPが1に なったとき）
  const ENRAGE = { A: '#E8443A', B: '#6E1414', C: '#FF8A5A' };

  const byId = {};
  list.concat(bosses).forEach(function (e) { byId[e.id] = e; });

  // 写真から 作った モンスター（プレイヤーごと）。あとから 足す
  let customs = [];

  /* 色を そろえる。B・C が なくても A から 自動で 作られる（blocks.js） */
  function paletteOf(e, enrage) {
    const extra = enrage ? (e.phase2 || ENRAGE) : null;
    return MQ.blocks.fill(Object.assign({}, common, e.colors, extra));
  }
  function get(id) { return byId[id]; }

  /* 画面に おく 絵。CSS の div を かさねた かたまりを かえす。
     opts: { size 大きさ(px) ／ cls 足す クラス ／ enrage おこった色 ／ shadow シルエット } */
  function node(id, opts) {
    opts = opts || {};
    const size = opts.size || 48;
    const cls = 'mons' + (opts.cls ? ' ' + opts.cls : '');
    const e = byId[id];
    if (!e) return MQ.blocks.box([], {}, { size: size, cls: cls });
    // 写真から 作った モンスターだけは 画像（それ いがいは ぜんぶ div）
    if (e.png) return MQ.blocks.imgBox(e.png, { size: size, cls: cls, alt: e.name });
    const drawn = MQ.art && MQ.art.enemies && MQ.art.enemies[id];
    if (drawn && !opts.enrage) return MQ.blocks.imgBox(drawn, { size: size, cls: cls, alt: e.name });
    const box = MQ.blocks.box(shapes[e.shape] || [], paletteOf(e, opts.enrage), { size: size, cls: cls, raw: true });
    if (opts.shadow) box.classList.add('is-shadow');
    return box;
  }

  // まだ 見ていない モンスター（まっ黒の かげ）
  function shadowNode(id, opts) {
    const o = Object.assign({}, opts || {});
    o.shadow = true;
    return node(id, o);
  }
  // 図鑑に のせる 敵（たからばこ などは のぞく）
  function dexList() {
    return list.filter(function (e) { return !e.hidden; }).concat(customs);
  }

  /* バトルに 出す 敵を えらぶ。
     hard は 0〜1 の むずかしさ。かんたんな ステージは よわそうな 敵（rank1）が 多く、
     むずかしい ステージほど 強そうな 敵（rank3）が ふえる。ならびも よわい→強い。 */
  function pickIds(areaId, n, hard) {
    let pool = list.filter(function (e) { return e.area === areaId && !e.rare && !e.hidden; });
    if (!pool.length) pool = list.filter(function (e) { return !e.rare && !e.hidden && e.area; });
    if (hard == null) hard = 0.5;
    hard = Math.max(0, Math.min(1, hard));
    const byRank = { 1: [], 2: [], 3: [] };
    pool.forEach(function (e) { byRank[e.rank || 2].push(e.id); });
    [1, 2, 3].forEach(function (r) { byRank[r] = MQ.util.shuffle(byRank[r]); });
    const strong = Math.round(hard * n * 2 / 3);          // 9体なら 0〜6
    const weak = Math.round((1 - hard) * n * 2 / 3);
    const normal = Math.max(0, n - strong - weak);
    function take(rank, m, out) {
      let src = byRank[rank];
      if (!src.length) src = byRank[2].length ? byRank[2] : (byRank[1].length ? byRank[1] : byRank[3]);
      for (let i = 0; i < m && src.length; i++) out.push(src[i % src.length]);
    }
    const out = [];
    take(1, weak, out);        // よわいのから 出て
    take(2, normal, out);
    take(3, strong, out);      // だんだん 強そうに なる
    while (out.length < n && pool.length) out.push(pool[out.length % pool.length].id);
    return out.slice(0, n);
  }

  function goldenId() { return 'slime-golden'; }

  // そのエリアの レア敵（息子さんの モンスター）。写真から 作ったものも まざる
  function rareIdsFor(areaId) {
    const own = list.filter(function (e) { return e.rare && e.area === areaId && !e.trio; })
                    .map(function (e) { return e.id; });
    const mine = customs.filter(function (e) { return e.area === areaId; }).map(function (e) { return e.id; });
    return own.concat(mine);
  }

  function rareIdFor(areaId) {
    const ids = rareIdsFor(areaId);
    return ids.length ? MQ.util.pick(ids) : goldenId();
  }

  // 3体まとめて 出てくる 組（いまは ABC3きょうだいだけ）
  function trioFor(areaId) {
    const ids = list.filter(function (e) { return e.trio && e.area === areaId; }).map(function (e) { return e.id; });
    return ids.length >= 3 ? ids : null;
  }

  function bossFor(areaId) {
    for (let i = 0; i < bosses.length; i++) if (bosses[i].area === areaId) return bosses[i];
    return bosses[0];
  }

  /* 写真から 作った モンスターを 敵として つかえるように する。
     プレイヤーを 切りかえるたびに 呼ぶ。 */
  function setCustom(monList) {
    customs.forEach(function (m) { delete byId[m.id]; });
    customs = (monList || []).map(function (m) {
      return { id: m.id, name: m.name, area: m.area, png: m.png, rare: true, by: 'photo' };
    });
    customs.forEach(function (m) { byId[m.id] = m; });
  }

  return {
    list: list, bosses: bosses, shapes: shapes,
    get: get, node: node, shadowNode: shadowNode, dexList: dexList,
    pickIds: pickIds, goldenId: goldenId, rareId: goldenId, rareIdFor: rareIdFor, rareIdsFor: rareIdsFor,
    trioFor: trioFor, bossFor: bossFor, setCustom: setCustom,
    customs: function () { return customs; }
  };
})();
