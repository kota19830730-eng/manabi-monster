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
    { id: 'golem-gray',   name: 'ゴーレム',        shape: 'golem',   area: 'sansu', rank: 2, line: 'golem', stage: 1, evo: 'golem-lava', colors: { A: '#9AA7B8', B: '#5A6A80' } },
    { id: 'golem-lava',   name: 'マグマゴーレム',   shape: 'golem',   area: 'sansu', rank: 3, line: 'golem', stage: 2, evo: 'golem-king', colors: { A: '#E8642C', B: '#7A2E0E' } },
    { id: 'lizard-green', name: 'リザード',        shape: 'lizard',  area: 'sansu', rank: 2, line: 'lizard', stage: 1, evo: 'lizard-fire', colors: { A: '#3E9A6B', B: '#C9F0A8' } },
    { id: 'lizard-fire',  name: 'ファイアリザード', shape: 'lizard',  area: 'sansu', rank: 3, line: 'lizard', stage: 2, evo: 'lizard-king', colors: { A: '#F26B2B', B: '#FFD27A' } },
    { id: 'skull-white',  name: 'スカル',          shape: 'skull',   area: 'sansu', rank: 2, line: 'skull', stage: 1, evo: 'skull-gold', colors: { A: '#F2F2F2' } },
    { id: 'skull-gold',   name: 'ゴールドスカル',   shape: 'skull',   area: 'sansu', rank: 3, line: 'skull', stage: 2, evo: 'skull-king', colors: { A: '#FFD166' } },
    { id: 'robot-gray',   name: 'ロボ',            shape: 'robot',   area: 'sansu', rank: 2, line: 'robot', stage: 1, evo: 'robot-red', colors: { A: '#B8C4D6', B: '#4A5568' } },
    { id: 'robot-red',    name: 'メカロボ',        shape: 'robot',   area: 'sansu', rank: 3, line: 'robot', stage: 2, evo: 'robot-king', colors: { A: '#FF8A5A', B: '#7A2E0E' } },
    { id: 'eyeball',      name: 'アイボール',      shape: 'eyeball', area: 'sansu', rank: 1, line: 'eyeball', stage: 1, evo: 'eyeball-red', colors: { A: '#2F6FD0' } },
    /* 森（国語） */
    { id: 'mush-red',     name: 'キノコン',        shape: 'mushroom', area: 'kokugo', rank: 1, line: 'mushroom', stage: 1, evo: 'mush-purple', colors: { A: '#FF5A5A', B: '#FFFFFF', C: '#F2E2C4' } },
    { id: 'mush-purple',  name: 'ドクキノコン',     shape: 'mushroom', area: 'kokugo', rank: 3, line: 'mushroom', stage: 2, evo: 'mushroom-king', colors: { A: '#8A4FD1', B: '#FFD166', C: '#F2E2C4' } },
    { id: 'spider-black', name: 'スパイダー',      shape: 'spider',   area: 'kokugo', rank: 3, line: 'spider', stage: 2, evo: 'spider-king', colors: { A: '#3A3A4A' } },
    { id: 'spider-green', name: 'モリグモ',        shape: 'spider',   area: 'kokugo', rank: 2, line: 'spider', stage: 1, evo: 'spider-black', colors: { A: '#3E9A6B' } },
    { id: 'slime-green',  name: 'スライム',        shape: 'slime',    area: 'kokugo', rank: 1, line: 'slime', stage: 1, evo: 'slime-red', colors: { A: '#4CD164', B: '#1E7A3C' } },
    { id: 'slime-red',    name: 'レッドスライム',   shape: 'slime',    area: 'kokugo', rank: 2, line: 'slime', stage: 2, evo: 'slime-king', colors: { A: '#FF5A5A', B: '#A82424' } },
    { id: 'bat-black',    name: 'バット',          shape: 'bat',      area: 'kokugo', rank: 2, line: 'bat', stage: 1, evo: 'bat-purple', colors: { A: '#3A3A4A', B: '#22222E' } },
    /* 海（理科社会） */
    { id: 'tako-red',     name: 'オクトパン',      shape: 'tako',  area: 'rikashakai', rank: 2, line: 'tako', stage: 1, evo: 'tako-purple', colors: { A: '#FF7A6B' } },
    { id: 'tako-purple',  name: 'ドクタコン',      shape: 'tako',  area: 'rikashakai', rank: 3, line: 'tako', stage: 2, evo: 'tako-king', colors: { A: '#8A4FD1' } },
    { id: 'crab-red',     name: 'カニカニ',        shape: 'crab',  area: 'rikashakai', rank: 2, line: 'crab', stage: 1, evo: 'crab-green', colors: { A: '#FF5A5A', B: '#A82424' } },
    { id: 'crab-green',   name: 'イソガニン',      shape: 'crab',  area: 'rikashakai', rank: 2, line: 'crab', stage: 2, evo: 'crab-king', colors: { A: '#3E9A6B', B: '#1E5A3C' } },
    { id: 'shark-gray',   name: 'サメゾー',        shape: 'shark', area: 'rikashakai', rank: 3, line: 'shark', stage: 1, evo: 'shark-king', colors: { A: '#8FA6C0' } },
    { id: 'slime-blue',   name: 'ブルースライム',   shape: 'slime', area: 'rikashakai', rank: 1, line: 'slime', stage: 1, evo: 'slime-red', colors: { A: '#4F8CFF', B: '#1F4FB0' } },
    { id: 'ghost-blue',   name: 'アイスゴースト',   shape: 'ghost', area: 'rikashakai', rank: 2, line: 'ghost', stage: 1, evo: 'ghost-white', colors: { A: '#8FD3FF', B: '#4FA3E0' } },
    /* 空（英語） */
    { id: 'cloud-white',   name: 'クラウドン',      shape: 'cloud', area: 'eigo', rank: 1, line: 'cloud', stage: 1, evo: 'cloud-thunder', colors: { A: '#EDEEF5' } },
    { id: 'cloud-thunder', name: 'ゴロゴロクン',    shape: 'cloud', area: 'eigo', rank: 3, line: 'cloud', stage: 2, evo: 'cloud-king', colors: { A: '#6B7C9C', y: '#FFD166' } },
    { id: 'bat-purple',    name: 'ダークバット',    shape: 'bat',   area: 'eigo', rank: 3, line: 'bat', stage: 2, evo: 'bat-king', colors: { A: '#8A4FD1', B: '#4A2380' } },
    { id: 'ghost-white',   name: 'ゴースト',        shape: 'ghost', area: 'eigo', rank: 2, line: 'ghost', stage: 2, evo: 'ghost-king', colors: { A: '#EDEEF5', B: '#B9BCCF' } },
    { id: 'slime-sky',     name: 'ソラスライム',    shape: 'slime', area: 'eigo', rank: 1, line: 'slime', stage: 1, evo: 'slime-red', colors: { A: '#8FD3FF', B: '#4FA3E0' } },
    { id: 'eyeball-red',   name: 'レッドアイ',      shape: 'eyeball', area: 'eigo', rank: 3, line: 'eyeball', stage: 2, evo: 'eyeball-king', colors: { A: '#E8443A' } },
    /* レア（どのエリアにも たまに出る。けいけんち3倍） */
    /* 山（算数）の ついか組 */
    { id: 'dice-white', name: 'サイコロン', shape: 'dice', area: 'sansu', rank: 1, line: 'dice', stage: 1, evo: 'dice-gold', colors: { A: '#F4F6FA', B: '#B9C2D4', P: '#2B3350' } },
    { id: 'dice-gold', name: 'キンサイコロン', shape: 'dice', area: 'sansu', rank: 2, line: 'dice', stage: 2, evo: 'dice-king', colors: { A: '#FFD166', B: '#C98F1B', P: '#6B4A0E' } },
    { id: 'snake-green', name: 'ヘビゴン', shape: 'snake', area: 'sansu', rank: 1, line: 'snake', stage: 1, evo: 'snake-purple', colors: { A: '#4CD164', B: '#1E7A3C' } },
    { id: 'snake-purple', name: 'ドクヘビゴン', shape: 'snake', area: 'sansu', rank: 3, line: 'snake', stage: 2, evo: 'snake-king', colors: { A: '#8A4FD1', B: '#4A2380' } },
    { id: 'scorpion-sand', name: 'サソリン', shape: 'scorpion', area: 'sansu', rank: 2, line: 'scorpion', stage: 1, evo: 'scorpion-black', colors: { A: '#E0B15C', B: '#9C742E' } },
    { id: 'scorpion-black', name: 'ダークサソリン', shape: 'scorpion', area: 'sansu', rank: 3, line: 'scorpion', stage: 2, evo: 'scorpion-king', colors: { A: '#4A4A5E', B: '#26263A' } },
    { id: 'turtle-rock', name: 'イワガメン', shape: 'turtle', area: 'sansu', rank: 2, line: 'turtle', stage: 1, evo: 'turtle-lava', colors: { A: '#9AA7B8', B: '#5A6A80', C: '#C9A06B' } },
    { id: 'turtle-lava', name: 'マグマガメン', shape: 'turtle', area: 'sansu', rank: 3, line: 'turtle', stage: 2, evo: 'turtle-king', colors: { A: '#7A2E0E', B: '#E8642C', C: '#4A4A5E' } },
    { id: 'mole', name: 'モグラン', shape: 'mole', area: 'sansu', rank: 1, line: 'mole', stage: 1, evo: 'mole-king', colors: { A: '#8A5A3C', B: '#C9A06B', C: '#FF9DB0' } },
    { id: 'crystal-blue', name: 'クリスタルン', shape: 'crystal', area: 'sansu', rank: 1, line: 'crystal', stage: 1, evo: 'crystal-pink', colors: { A: '#8FD3FF', B: '#4FA3E0' } },
    { id: 'crystal-pink', name: 'ルビリン', shape: 'crystal', area: 'sansu', rank: 2, line: 'crystal', stage: 2, evo: 'crystal-king', colors: { A: '#FF7A9C', B: '#C4365E' } },
    { id: 'wolf-gray', name: 'ウルフン', shape: 'wolf', area: 'sansu', rank: 2, line: 'wolf', stage: 1, evo: 'wolf-dark', colors: { A: '#9AA7B8', B: '#E6ECF5', C: '#FF9DB0' } },
    { id: 'wolf-dark', name: 'ヤミウルフン', shape: 'wolf', area: 'sansu', rank: 3, line: 'wolf', stage: 2, evo: 'wolf-king', colors: { A: '#5A4A80', B: '#C9BCE6', C: '#FF9DB0' } },
    /* 森（国語）の ついか組 */
    { id: 'owl-brown', name: 'フクロン', shape: 'owl', area: 'kokugo', rank: 2, line: 'owl', stage: 1, evo: 'owl-white', colors: { A: '#8A5A3C', B: '#C9A06B' } },
    { id: 'owl-white', name: 'シロフクロン', shape: 'owl', area: 'kokugo', rank: 3, line: 'owl', stage: 2, evo: 'owl-king', colors: { A: '#EDEEF5', B: '#C9CFDB' } },
    { id: 'frog-green', name: 'ケロッポ', shape: 'frog', area: 'kokugo', rank: 1, line: 'frog', stage: 1, evo: 'frog-blue', colors: { A: '#4CD164', B: '#C9F0A8', C: '#FF9DB0' } },
    { id: 'frog-blue', name: 'アメケロン', shape: 'frog', area: 'kokugo', rank: 2, line: 'frog', stage: 2, evo: 'frog-king', colors: { A: '#4F8CFF', B: '#B3D9FF', C: '#FF9DB0' } },
    { id: 'bee-yellow', name: 'ブンバチン', shape: 'bee', area: 'kokugo', rank: 1, line: 'bee', stage: 1, evo: 'bee-red', colors: { A: '#FFD166' } },
    { id: 'bee-red', name: 'アカバチン', shape: 'bee', area: 'kokugo', rank: 3, line: 'bee', stage: 2, evo: 'bee-king', colors: { A: '#FF6B5A' } },
    { id: 'snail-orange', name: 'デンデロン', shape: 'snail', area: 'kokugo', rank: 1, line: 'snail', stage: 1, evo: 'snail-purple', colors: { A: '#F2A24B', B: '#B36A1B', C: '#F2E2C4' } },
    { id: 'snail-purple', name: 'ドクデンデロン', shape: 'snail', area: 'kokugo', rank: 3, line: 'snail', stage: 2, evo: 'snail-king', colors: { A: '#8A4FD1', B: '#4A2380', C: '#C9F0A8' } },
    { id: 'tree-green', name: 'ツリーン', shape: 'tree', area: 'kokugo', rank: 2, line: 'tree', stage: 1, evo: 'tree-autumn', colors: { A: '#3E9A6B', B: '#1E5A3C', C: '#8A5A3C' } },
    { id: 'tree-autumn', name: 'モミジーン', shape: 'tree', area: 'kokugo', rank: 3, line: 'tree', stage: 2, evo: 'tree-king', colors: { A: '#E8853A', B: '#B34E14', C: '#6B4A2E' } },
    { id: 'fox-orange', name: 'コンゴン', shape: 'fox', area: 'kokugo', rank: 2, line: 'fox', stage: 1, evo: 'fox-white', colors: { A: '#F2A24B', B: '#FFF3E0', C: '#FF9DB0' } },
    { id: 'fox-white', name: 'ユキコンゴン', shape: 'fox', area: 'kokugo', rank: 3, line: 'fox', stage: 2, evo: 'fox-king', colors: { A: '#E6ECF5', B: '#FFFFFF', C: '#FF9DB0' } },
    { id: 'hedgehog-brown', name: 'ハリマル', shape: 'hedgehog', area: 'kokugo', rank: 2, line: 'hedgehog', stage: 1, evo: 'hedgehog-blue', colors: { A: '#F2E2C4', B: '#8A5A3C', C: '#FF9DB0' } },
    { id: 'hedgehog-blue', name: 'トゲマル', shape: 'hedgehog', area: 'kokugo', rank: 3, line: 'hedgehog', stage: 2, evo: 'hedgehog-king', colors: { A: '#E6ECF5', B: '#4F6FB8', C: '#FF9DB0' } },
    { id: 'butterfly-pink', name: 'フラッタン', shape: 'butterfly', area: 'kokugo', rank: 1, line: 'butterfly', stage: 1, evo: 'butterfly-sky', colors: { A: '#FF7A9C', B: '#C4365E' } },
    /* 海（理科社会）の ついか組 */
    { id: 'fish-blue', name: 'トトマル', shape: 'fish', area: 'rikashakai', rank: 1, line: 'fish', stage: 1, evo: 'fish-red', colors: { A: '#4F8CFF', B: '#B3D9FF', C: '#FFD166' } },
    { id: 'fish-red', name: 'アカトトマル', shape: 'fish', area: 'rikashakai', rank: 2, line: 'fish', stage: 2, evo: 'fish-king', colors: { A: '#FF6B5A', B: '#FFC9A8', C: '#FFD166' } },
    { id: 'jelly-pink', name: 'プルリン', shape: 'jelly', area: 'rikashakai', rank: 1, line: 'jelly', stage: 1, evo: 'jelly-elec', colors: { A: '#FF9DB0', B: '#E06080' } },
    { id: 'jelly-elec', name: 'エレキプルリン', shape: 'jelly', area: 'rikashakai', rank: 3, line: 'jelly', stage: 2, evo: 'jelly-king', colors: { A: '#FFD166', B: '#C98F1B' } },
    { id: 'turtle-sea', name: 'ウミガメン', shape: 'turtle', area: 'rikashakai', rank: 3, line: 'turtle', stage: 1, evo: 'turtle-lava', colors: { A: '#3E9A6B', B: '#1E5A3C', C: '#A8E6C0' } },
    { id: 'seahorse-green', name: 'タツリン', shape: 'seahorse', area: 'rikashakai', rank: 1, line: 'seahorse', stage: 1, evo: 'seahorse-gold', colors: { A: '#3E9A6B', B: '#C9F0A8' } },
    { id: 'seahorse-gold', name: 'キンタツリン', shape: 'seahorse', area: 'rikashakai', rank: 3, line: 'seahorse', stage: 2, evo: 'seahorse-king', colors: { A: '#FFD166', B: '#FFF0B8' } },
    { id: 'puffer-yellow', name: 'フグマル', shape: 'puffer', area: 'rikashakai', rank: 2, line: 'puffer', stage: 1, evo: 'puffer-purple', colors: { A: '#FFD166', B: '#C98F1B', C: '#FFF0B8' } },
    { id: 'puffer-purple', name: 'ドクフグマル', shape: 'puffer', area: 'rikashakai', rank: 3, line: 'puffer', stage: 2, evo: 'puffer-king', colors: { A: '#8A4FD1', B: '#4A2380', C: '#C9A8F0' } },
    { id: 'star-orange', name: 'ホシデン', shape: 'star', area: 'rikashakai', rank: 1, line: 'star', stage: 1, evo: 'star-gold', colors: { A: '#F2A24B', B: '#C4702B' } },
    { id: 'star-blue', name: 'アオホシデン', shape: 'star', area: 'rikashakai', rank: 2, line: 'star', stage: 1, evo: 'star-gold', colors: { A: '#4F8CFF', B: '#1F4FB0' } },
    { id: 'penguin-navy', name: 'ペンペコ', shape: 'penguin', area: 'rikashakai', rank: 1, line: 'penguin', stage: 1, evo: 'penguin-ice', colors: { A: '#3A4A6E' } },
    { id: 'penguin-ice', name: 'アイスペコ', shape: 'penguin', area: 'rikashakai', rank: 2, line: 'penguin', stage: 2, evo: 'penguin-king', colors: { A: '#8FD3FF' } },
    { id: 'angler-navy', name: 'チカリン', shape: 'angler', area: 'rikashakai', rank: 3, line: 'angler', stage: 1, evo: 'angler-black', colors: { A: '#2F4A8C', B: '#4F6FB8' } },
    { id: 'angler-black', name: 'クロチカリン', shape: 'angler', area: 'rikashakai', rank: 3, line: 'angler', stage: 2, evo: 'angler-king', colors: { A: '#2B2B3A', B: '#4A4A5E' } },
    /* 空（英語）の ついか組 */
    { id: 'bird-yellow', name: 'ピヨリン', shape: 'bird', area: 'eigo', rank: 1, line: 'bird', stage: 1, evo: 'bird-blue', colors: { A: '#FFD166', B: '#F2A24B', C: '#FFF0B8' } },
    { id: 'bird-blue', name: 'アオピヨリン', shape: 'bird', area: 'eigo', rank: 2, line: 'bird', stage: 2, evo: 'bird-king', colors: { A: '#4F8CFF', B: '#1F4FB0', C: '#B3D9FF' } },
    { id: 'ufo-silver', name: 'ユーフォン', shape: 'ufo', area: 'eigo', rank: 2, line: 'ufo', stage: 1, evo: 'ufo-dark', colors: { A: '#4CD164', B: '#B8C4D6', C: '#8FD3FF' } },
    { id: 'ufo-dark', name: 'ダークユーフォン', shape: 'ufo', area: 'eigo', rank: 3, line: 'ufo', stage: 2, evo: 'ufo-king', colors: { A: '#FF6B5A', B: '#4A4A5E', C: '#C9A8F0' } },
    { id: 'balloon-pink', name: 'フワリン', shape: 'balloon', area: 'eigo', rank: 1, line: 'balloon', stage: 1, evo: 'balloon-sky', colors: { A: '#FF9DB0', B: '#E06080', C: '#FF5A7A' } },
    { id: 'balloon-sky', name: 'ソラフワリン', shape: 'balloon', area: 'eigo', rank: 1, line: 'balloon', stage: 2, evo: 'balloon-king', colors: { A: '#8FD3FF', B: '#4FA3E0', C: '#FF9DB0' } },
    { id: 'star-gold', name: 'ピカボシ', shape: 'star', area: 'eigo', rank: 2, line: 'star', stage: 2, evo: 'star-king', colors: { A: '#FFD166', B: '#C98F1B' } },
    { id: 'sun', name: 'サンサンドン', shape: 'sun', area: 'eigo', rank: 2, line: 'sun', stage: 1, evo: 'sun-king', colors: { A: '#FFD166', B: '#F2A24B', C: '#FF9DB0' } },
    { id: 'moon', name: 'ミカヅキン', shape: 'moon', area: 'eigo', rank: 2, line: 'moon', stage: 1, evo: 'moon-king', colors: { A: '#FFE08A', B: '#E0B15C' } },
    { id: 'rocket-red', name: 'ロケットン', shape: 'rocket', area: 'eigo', rank: 3, line: 'rocket', stage: 1, evo: 'rocket-blue', colors: { A: '#F4F6FA', B: '#C9CFDB', C: '#FF6B5A', D: '#4F8CFF' } },
    { id: 'rocket-blue', name: 'アオロケットン', shape: 'rocket', area: 'eigo', rank: 3, line: 'rocket', stage: 2, evo: 'rocket-king', colors: { A: '#B3D9FF', B: '#8FB8E8', C: '#1F4FB0', D: '#FFD166' } },
    { id: 'kite-red', name: 'カイトン', shape: 'kite', area: 'eigo', rank: 2, line: 'kite', stage: 1, evo: 'kite-blue', colors: { A: '#FF6B5A', B: '#FFD166' } },
    { id: 'kite-blue', name: 'アオカイトン', shape: 'kite', area: 'eigo', rank: 2, line: 'kite', stage: 2, evo: 'kite-king', colors: { A: '#4F8CFF', B: '#FFD166' } },
    { id: 'tornado-gray', name: 'グルグルン', shape: 'tornado', area: 'eigo', rank: 2, line: 'tornado', stage: 1, evo: 'tornado-storm', colors: { A: '#B8C4D6', B: '#8A97AB' } },
    { id: 'tornado-storm', name: 'アラシグルン', shape: 'tornado', area: 'eigo', rank: 3, line: 'tornado', stage: 2, evo: 'tornado-king', colors: { A: '#6B7C9C', B: '#4A5568' } },
    { id: 'butterfly-sky', name: 'ソラフラッタン', shape: 'butterfly', area: 'eigo', rank: 1, line: 'butterfly', stage: 2, evo: 'butterfly-king', colors: { A: '#8FD3FF', B: '#4FA3E0' } },

    { id: 'slime-golden', name: 'ゴールデンスライム', shape: 'slime', rare: true, colors: { A: '#FFD166', B: '#B8860B' } },

    /* ---- 息子さんの モンスター（エリアごとの レア敵。けいけんち3倍） ---- */
    { id: 'skullhorse', name: 'スカルホース', shape: 'skullhorse', area: 'sansu', rare: true, by: 'son', line: 'skullhorse', stage: 1, evo: 'skullhorse-2',
      colors: { A: '#F4F4F4', B: '#B9BFCC', w: '#FFFFFF', r: '#FF4D4D', k: '#1A1A22', s: '#8FA0BC', y: '#F2C14E' } },
    { id: 'sameoni', name: 'サメオニ', shape: 'sameoni', area: 'rikashakai', rare: true, by: 'son', line: 'sameoni', stage: 1, evo: 'sameoni-2',
      colors: { A: '#5FA8DC', B: '#2E5F8A', r: '#FF9A4A', w: '#FFFFFF' } },
    { id: 'zukan', name: 'ずかんの あくま', shape: 'zukan', area: 'kokugo', rare: true, by: 'son', line: 'zukan', stage: 1, evo: 'zukan-2',
      colors: { A: '#C4762E', w: '#FBF4DF', r: '#E8443A', k: '#2B2438', B: '#8A4B12', W: '#4A2D6B' } },

    /* <abc> */
    /* ABC3きょうだい … 赤い A・緑の B・黄色い C が くっついた 1体（v13.21）。
       むかしは べつべつの 3体（abc-a／abc-b／abc-c）で 3体同時に 出た。古い セーブは save.js の mergeAbc が 引きつぐ */
    { id: 'abc', name: 'ABC3きょうだい', shape: 'abc', area: 'eigo', rare: true, by: 'son', line: 'abc', stage: 1, evo: 'abc-2',
      colors: { A: '#E8443A', G: '#4CAF50', Y: '#F2C14E', w: '#FFFFFF', k: '#12121A' } },

    /* </abc> */
    /* ---- 息子さんの モンスターの 進化形（v8.6・相棒に すると 育つ） ----
       Lv10 で 2段階め、Lv20 で 3段階め。もとの 絵は そのままで かざりが ふえる。
       evoOnly＝ふつうの たたかいには 出ない（出会うのは 1段階めだけ）。
       絵は monsterart.js の <もとの 形><段階>。 */
    { id: 'skullhorse-2', name: 'ブレイズホース', shape: 'skullhorse2', area: 'sansu', rare: true, by: 'son', rank: 2,
      line: 'skullhorse', stage: 2, evo: 'skullhorse-3', evoOnly: true,
      colors: { A: '#F4F4F4', B: '#B9BFCC', w: '#FFFFFF', r: '#FF5A2A', k: '#1A1A22', s: '#8FA0BC', y: '#F2C14E' } },
    { id: 'skullhorse-3', name: 'スカルロード', shape: 'skullhorse3', area: 'sansu', rare: true, by: 'son', rank: 3,
      line: 'skullhorse', stage: 3, evoOnly: true,
      colors: { A: '#F8F8F8', B: '#C4C9D6', w: '#FFFFFF', r: '#FF3B30', k: '#1A1A22', s: '#6B5A8C', y: '#FFD447', m: '#3A1050' } },
    { id: 'sameoni-2', name: 'キバサメオニ', shape: 'sameoni2', area: 'rikashakai', rare: true, by: 'son', rank: 2,
      line: 'sameoni', stage: 2, evo: 'sameoni-3', evoOnly: true,
      colors: { A: '#3E8FCB', B: '#22537C', C: '#BFE6FF', r: '#FF9A4A', w: '#FFFFFF', k: '#141018' } },
    { id: 'sameoni-3', name: 'サメオニノヌシ', shape: 'sameoni3', area: 'rikashakai', rare: true, by: 'son', rank: 3,
      line: 'sameoni', stage: 3, evoOnly: true,
      colors: { A: '#2E7FC4', B: '#16416B', C: '#8FD3FF', r: '#FF6B2A', w: '#FFFFFF', k: '#141018', y: '#FFD447' } },
    { id: 'zukan-2', name: 'やみの ずかん', shape: 'zukan2', area: 'kokugo', rare: true, by: 'son', rank: 2,
      line: 'zukan', stage: 2, evo: 'zukan-3', evoOnly: true,
      colors: { A: '#C4762E', w: '#FBF4DF', r: '#E8443A', k: '#2B2438', B: '#8A4B12', W: '#5E2D8B' } },
    { id: 'zukan-3', name: 'ずかんの だいまじん', shape: 'zukan3', area: 'kokugo', rare: true, by: 'son', rank: 3,
      line: 'zukan', stage: 3, evoOnly: true,
      colors: { A: '#D08A2E', w: '#FBF4DF', r: '#FF3B30', k: '#2B2438', B: '#7A3E0E', W: '#7A3ACC', y: '#FFD447' } },
    /* <abc-evo> */
    { id: 'abc-2', name: 'ABCナイツ', shape: 'abc2', area: 'eigo', rare: true, by: 'son', rank: 2,
      line: 'abc', stage: 2, evo: 'abc-3', evoOnly: true,
      colors: { A: '#D6392E', G: '#3E9A44', Y: '#E0B03A', w: '#FFFFFF', k: '#12121A', s: '#B9C3D6' } },
    { id: 'abc-3', name: 'ABCロード', shape: 'abc3', area: 'eigo', rare: true, by: 'son', rank: 3,
      line: 'abc', stage: 3, evoOnly: true,
      colors: { A: '#FF5A4A', G: '#5FD16A', Y: '#FFD166', w: '#FFFFFF', k: '#12121A' } },
    /* </abc-evo> */
    /* ---------- v4.2 あたらしい 51体（17系統 × 3段階・相棒に できる） ----------
       line＝系統／stage＝1〜3／evo＝つぎの すがた。1段階は 序盤、3段階は 終盤に 出る */
    /* ドラコ → ドラグーン → ドラゴニクス */
    { id: 'drago-1', name: 'ドラコ', shape: 'drago1', area: 'sansu', rank: 1, line: 'drago', stage: 1, evo: 'drago-2', colors: { A: '#E8845A', C: '#FFC96B' } },
    { id: 'drago-2', name: 'ドラグーン', shape: 'drago2', area: 'sansu', rank: 2, line: 'drago', stage: 2, evo: 'drago-3', colors: { A: '#E8542C', C: '#FFB44E' } },
    { id: 'drago-3', name: 'ドラゴニクス', shape: 'drago3', area: 'sansu', rank: 3, line: 'drago', stage: 3, colors: { A: '#C42424', C: '#FFC24E' } },
    /* メカン → メカロン → メガメカン */
    { id: 'mecha-1', name: 'メカン', shape: 'mecha1', area: 'sansu', rank: 1, line: 'mecha', stage: 1, evo: 'mecha-2', colors: { A: '#A7B4C6' } },
    { id: 'mecha-2', name: 'メカロン', shape: 'mecha2', area: 'sansu', rank: 2, line: 'mecha', stage: 2, evo: 'mecha-3', colors: { A: '#8E9CC0', C: '#FF9A5A' } },
    { id: 'mecha-3', name: 'メガメカン', shape: 'mecha3', area: 'sansu', rank: 3, line: 'mecha', stage: 3, colors: { A: '#6B78A0', C: '#FF7A3A' } },
    /* ミニカン → バギード → タンクロン */
    { id: 'tank-1', name: 'ミニカン', shape: 'tank1', area: 'sansu', rank: 1, line: 'tank', stage: 1, evo: 'tank-2', colors: { A: '#C98A4A', C: '#7A8CA8' } },
    { id: 'tank-2', name: 'バギード', shape: 'tank2', area: 'sansu', rank: 2, line: 'tank', stage: 2, evo: 'tank-3', colors: { A: '#B5652C', C: '#6B7C98' } },
    { id: 'tank-3', name: 'タンクロン', shape: 'tank3', area: 'sansu', rank: 3, line: 'tank', stage: 3, colors: { A: '#7A6A42', C: '#4A5468' } },
    /* イワゴロ → ゴツガン → マグマゴン */
    { id: 'magma-1', name: 'イワゴロ', shape: 'magma1', area: 'sansu', rank: 1, line: 'magma', stage: 1, evo: 'magma-2', colors: { A: '#9A8B7A' } },
    { id: 'magma-2', name: 'ゴツガン', shape: 'magma2', area: 'sansu', rank: 2, line: 'magma', stage: 2, evo: 'magma-3', colors: { A: '#8A7462', C: '#B8A490' } },
    { id: 'magma-3', name: 'マグマゴン', shape: 'magma3', area: 'sansu', rank: 3, line: 'magma', stage: 3, colors: { A: '#6E4A3A', C: '#FF8A3A' } },
    /* ニョロン → ヘビガ → ダイジャング */
    { id: 'serp-1', name: 'ニョロン', shape: 'serp1', area: 'kokugo', rank: 1, line: 'serp', stage: 1, evo: 'serp-2', colors: { A: '#5FBF6A', C: '#D8F0A8' } },
    { id: 'serp-2', name: 'ヘビガ', shape: 'serp2', area: 'kokugo', rank: 2, line: 'serp', stage: 2, evo: 'serp-3', colors: { A: '#3E9A5B', C: '#E8D98A' } },
    { id: 'serp-3', name: 'ダイジャング', shape: 'serp3', area: 'kokugo', rank: 3, line: 'serp', stage: 3, colors: { A: '#2E7A4A', C: '#FFD166' } },
    /* クモリン → スパイドン → アラクネス */
    { id: 'arac-1', name: 'クモリン', shape: 'arac1', area: 'kokugo', rank: 1, line: 'arac', stage: 1, evo: 'arac-2', colors: { A: '#7A6BB8' } },
    { id: 'arac-2', name: 'スパイドン', shape: 'arac2', area: 'kokugo', rank: 2, line: 'arac', stage: 2, evo: 'arac-3', colors: { A: '#4A3F80', C: '#C4B8E8' } },
    { id: 'arac-3', name: 'アラクネス', shape: 'arac3', area: 'kokugo', rank: 3, line: 'arac', stage: 3, colors: { A: '#2E2A55', C: '#8A7ACC' } },
    /* ウルフン → ガルム → フェンリード */
    { id: 'fang-1', name: 'ウルガ', shape: 'fang1', area: 'kokugo', rank: 1, line: 'fang', stage: 1, evo: 'fang-2', colors: { A: '#9AA3B8' } },
    { id: 'fang-2', name: 'ガルム', shape: 'fang2', area: 'kokugo', rank: 2, line: 'fang', stage: 2, evo: 'fang-3', colors: { A: '#6B7490', C: '#E8E4DC' } },
    { id: 'fang-3', name: 'フェンリード', shape: 'fang3', area: 'kokugo', rank: 3, line: 'fang', stage: 3, colors: { A: '#4A5470', C: '#F2F0EA' } },
    /* ムシマル → カブトン → キングホーン */
    { id: 'beetle-1', name: 'ムシマル', shape: 'beetle1', area: 'kokugo', rank: 1, line: 'beetle', stage: 1, evo: 'beetle-2', colors: { A: '#7ABF4F', C: '#F0E08A' } },
    { id: 'beetle-2', name: 'カブトン', shape: 'beetle2', area: 'kokugo', rank: 2, line: 'beetle', stage: 2, evo: 'beetle-3', colors: { A: '#4F9A3A', C: '#E8C24E' } },
    { id: 'beetle-3', name: 'キングホーン', shape: 'beetle3', area: 'kokugo', rank: 3, line: 'beetle', stage: 3, colors: { A: '#2E6E2A', C: '#FFD166' } },
    /* タコリン → オクトーン → クラーケン */
    { id: 'krak-1', name: 'タコリン', shape: 'krak1', area: 'rikashakai', rank: 1, line: 'krak', stage: 1, evo: 'krak-2', colors: { A: '#E87AB0' } },
    { id: 'krak-2', name: 'オクトーン', shape: 'krak2', area: 'rikashakai', rank: 2, line: 'krak', stage: 2, evo: 'krak-3', colors: { A: '#C4468A', C: '#FFD9E8' } },
    { id: 'krak-3', name: 'クラーケン', shape: 'krak3', area: 'rikashakai', rank: 3, line: 'krak', stage: 3, colors: { A: '#8A2E6B', C: '#FFB4D8' } },
    /* ヒトダマン → ゴースン → ファントーム */
    { id: 'spect-1', name: 'ヒトダマン', shape: 'spect1', area: 'rikashakai', rank: 1, line: 'spect', stage: 1, evo: 'spect-2', colors: { A: '#8FD6E8' } },
    { id: 'spect-2', name: 'ゴースン', shape: 'spect2', area: 'rikashakai', rank: 2, line: 'spect', stage: 2, evo: 'spect-3', colors: { A: '#6BAFD6', C: '#E8F4FF' } },
    { id: 'spect-3', name: 'ファントーム', shape: 'spect3', area: 'rikashakai', rank: 3, line: 'spect', stage: 3, colors: { A: '#5A5F98', C: '#C4C8F0' } },
    /* コオリン → アイスナイト → ヒョウガード */
    { id: 'iceK-1', name: 'コオリン', shape: 'iceK1', area: 'rikashakai', rank: 1, line: 'iceK', stage: 1, evo: 'iceK-2', colors: { A: '#9FE0F0', C: '#E8FAFF' } },
    { id: 'iceK-2', name: 'アイスナイト', shape: 'iceK2', area: 'rikashakai', rank: 2, line: 'iceK', stage: 2, evo: 'iceK-3', colors: { A: '#6BBEE0', C: '#D8F4FF' } },
    { id: 'iceK-3', name: 'ヒョウガード', shape: 'iceK3', area: 'rikashakai', rank: 3, line: 'iceK', stage: 3, colors: { A: '#3E8AC4', C: '#BFEAFF' } },
    /* サメリン → シャークル → メガロドス */
    { id: 'sharkx-1', name: 'サメリン', shape: 'sharkx1', area: 'rikashakai', rank: 1, line: 'sharkx', stage: 1, evo: 'sharkx-2', colors: { A: '#8FB4CC', C: '#E8F0F8' } },
    { id: 'sharkx-2', name: 'シャークル', shape: 'sharkx2', area: 'rikashakai', rank: 2, line: 'sharkx', stage: 2, evo: 'sharkx-3', colors: { A: '#5A87A8', C: '#E0EAF4' } },
    { id: 'sharkx-3', name: 'メガロドス', shape: 'sharkx3', area: 'rikashakai', rank: 3, line: 'sharkx', stage: 3, colors: { A: '#3E5F80', C: '#D8E4F0' } },
    /* ホークン → ファルコン → スカイロード */
    { id: 'hawk-1', name: 'ホークン', shape: 'hawk1', area: 'eigo', rank: 1, line: 'hawk', stage: 1, evo: 'hawk-2', colors: { A: '#C4A05A', C: '#F0DCA0' } },
    { id: 'hawk-2', name: 'ファルコン', shape: 'hawk2', area: 'eigo', rank: 2, line: 'hawk', stage: 2, evo: 'hawk-3', colors: { A: '#A87A3A', C: '#E8CE8A' } },
    { id: 'hawk-3', name: 'スカイロード', shape: 'hawk3', area: 'eigo', rank: 3, line: 'hawk', stage: 3, colors: { A: '#7A5A2A', C: '#F0DCA0' } },
    /* アルファン → ワードン → アルファベス */
    { id: 'alpha-1', name: 'アルファン', shape: 'alpha1', area: 'eigo', rank: 1, line: 'alpha', stage: 1, evo: 'alpha-2', colors: { A: '#5FA8E8' } },
    { id: 'alpha-2', name: 'ワードン', shape: 'alpha2', area: 'eigo', rank: 2, line: 'alpha', stage: 2, evo: 'alpha-3', colors: { A: '#4A8AD6', C: '#F2C93B' } },
    { id: 'alpha-3', name: 'アルファベス', shape: 'alpha3', area: 'eigo', rank: 3, line: 'alpha', stage: 3, colors: { A: '#3A6CC4', C: '#F2C93B' } },
    /* カミナリン → ライデン → サンダーロード */
    { id: 'bolt-1', name: 'カミナリン', shape: 'bolt1', area: 'eigo', rank: 1, line: 'bolt', stage: 1, evo: 'bolt-2', colors: { A: '#B8C4D6' } },
    { id: 'bolt-2', name: 'ライデン', shape: 'bolt2', area: 'eigo', rank: 2, line: 'bolt', stage: 2, evo: 'bolt-3', colors: { A: '#8A93B0' } },
    { id: 'bolt-3', name: 'サンダーロード', shape: 'bolt3', area: 'eigo', rank: 3, line: 'bolt', stage: 3, colors: { A: '#5A6480', C: '#E8EEF8' } },
    /* ユーフォン → スペーサー → ギャラクシオン */
    { id: 'saucer-1', name: 'ソーサン', shape: 'saucer1', area: 'eigo', rank: 1, line: 'saucer', stage: 1, evo: 'saucer-2', colors: { A: '#B8C4D6' } },
    { id: 'saucer-2', name: 'スペーサー', shape: 'saucer2', area: 'eigo', rank: 2, line: 'saucer', stage: 2, evo: 'saucer-3', colors: { A: '#8FA2C0' } },
    { id: 'saucer-3', name: 'ギャラクシオン', shape: 'saucer3', area: 'eigo', rank: 3, line: 'saucer', stage: 3, colors: { A: '#6B7CA8', C: '#C4B0F0' } },
    /* カゲマル → シノビン → カゲロード */
    { id: 'ninja-1', name: 'カゲマル', shape: 'ninja1', area: 'sansu', any: true, rank: 1, line: 'ninja', stage: 1, evo: 'ninja-2', colors: { A: '#6B7290', C: '#E84A4A' } },
    { id: 'ninja-2', name: 'シノビン', shape: 'ninja2', area: 'sansu', any: true, rank: 2, line: 'ninja', stage: 2, evo: 'ninja-3', colors: { A: '#4A5170', C: '#E84A4A' } },
    { id: 'ninja-3', name: 'カゲロード', shape: 'ninja3', area: 'sansu', any: true, rank: 3, line: 'ninja', stage: 3, colors: { A: '#333A55', C: '#E8324A' } },

    /* ---------- 中ボス 8体（v8.1・エリアごとに 2体） ----------
       ふつうの たたかいの さいごに 出る HP2 の 敵（`mid: true`）。
       **ザコの 顔ぶれ（pickIds）には 入らない**。図かんには のる（つよさ ★★★）。
       小4・小5の 理科／社会は AREA_ALIAS で 理科社会の 2体を 借りる。 */
    { id: 'mid-golem',  name: 'ギガゴーレム',   shape: 'midGolem',  area: 'sansu',      mid: true, rank: 3,
      colors: { A: '#7A6A58', B: '#4E4436', r: '#FF7A2A', y: '#FFD166' } },
    { id: 'mid-drill',  name: 'ドリルヘッド',   shape: 'midDrill',  area: 'sansu',      mid: true, rank: 3,
      colors: { A: '#8A93B0', B: '#4A5170', C: '#C8D0E0', r: '#FF4D4D', e: '#7AE0FF' } },
    { id: 'mid-ogre',   name: 'オーガロード',   shape: 'midOgre',   area: 'kokugo',     mid: true, rank: 3,
      colors: { A: '#C4443A', B: '#7A2420', w: '#FFF3D6', y: '#FFD166' } },
    { id: 'mid-fang',   name: 'シャドウファング', shape: 'midFang', area: 'kokugo',     mid: true, rank: 3,
      colors: { A: '#2E2A3A', B: '#1A1826', C: '#8A7ACC', r: '#FF3B30', w: '#F2F0EA' } },
    { id: 'mid-drake',  name: 'アイスドレイク', shape: 'midDrake',  area: 'rikashakai', mid: true, rank: 3,
      colors: { A: '#6BBEE0', B: '#3E8AC4', C: '#D8F4FF', e: '#BFEAFF', w: '#FFFFFF' } },
    { id: 'mid-jaw',    name: 'ディープジョー', shape: 'midJaw',    area: 'rikashakai', mid: true, rank: 3,
      colors: { A: '#4A6B88', B: '#2E4A66', w: '#FFFFFF', k: '#101018', r: '#FF5A5A' } },
    { id: 'mid-eagle',  name: 'ストームイーグル', shape: 'midEagle', area: 'eigo',      mid: true, rank: 3,
      colors: { A: '#7A88A8', B: '#4A5568', C: '#E8EEF8', y: '#F2C14E', r: '#FF3B30' } },
    { id: 'mid-saucer', name: 'メガソーサー',   shape: 'midSaucer', area: 'eigo',       mid: true, rank: 3,
      colors: { A: '#8FA2C0', B: '#5A6480', e: '#7AE0FF', y: '#FFD166', w: '#FFFFFF', k: '#12121A' } },

    /* ---------- v8.2 王さま形 44体（系統の 3段階め） ----------
       色ちがいだった 88体を 44の 系統に して、その さいごの すがた。
       相棒が Lv20 に なると この すがたに なる（1体だけの 系統は Lv10）。
       ふつうの たたかいにも rank3 として 出る。絵は monsterart.js の <形>King。 */
    { id: 'crystal-king', name: 'ジュエルオウ', shape: 'crystalKing', area: 'sansu', rank: 3, line: 'crystal', stage: 3, colors: { A: '#FF7A9C', B: '#C4365E' } },
    { id: 'dice-king', name: 'ダイスロード', shape: 'diceKing', area: 'sansu', rank: 3, line: 'dice', stage: 3, colors: { A: '#FFD166', B: '#C98F1B', m: '#2A2A6E' } },
    { id: 'eyeball-king', name: 'メダマダイオウ', shape: 'eyeballKing', area: 'sansu', rank: 3, line: 'eyeball', stage: 3, colors: { A: '#E8443A', B: '#8A1C16' } },
    { id: 'golem-king', name: 'ガンセキオウ', shape: 'golemKing', area: 'sansu', rank: 3, line: 'golem', stage: 3, colors: { A: '#E8642C', B: '#7A2E0E', m: '#1F4FA8' } },
    { id: 'lizard-king', name: 'サラマンドロ', shape: 'lizardKing', area: 'sansu', rank: 3, line: 'lizard', stage: 3, colors: { A: '#F26B2B', B: '#FFD27A', m: '#7A1F1F' } },
    { id: 'mole-king', name: 'ドリルオウ', shape: 'moleKing', area: 'sansu', rank: 3, line: 'mole', stage: 3, colors: { A: '#8A5A3C', B: '#C9A06B' } },
    { id: 'robot-king', name: 'メカテイオウ', shape: 'robotKing', area: 'sansu', rank: 3, line: 'robot', stage: 3, colors: { A: '#FF8A5A', B: '#7A2E0E', m: '#B01840' } },
    { id: 'scorpion-king', name: 'ドクバリロード', shape: 'scorpionKing', area: 'sansu', rank: 3, line: 'scorpion', stage: 3, colors: { A: '#4A4A5E', B: '#26263A' } },
    { id: 'skull-king', name: 'ホネノミカド', shape: 'skullKing', area: 'sansu', rank: 3, line: 'skull', stage: 3, colors: { A: '#FFD166', B: '#C98F1B', m: '#3A1F5A' } },
    { id: 'snake-king', name: 'ジャドクオウ', shape: 'snakeKing', area: 'sansu', rank: 3, line: 'snake', stage: 3, colors: { A: '#8A4FD1', B: '#4A2380' } },
    { id: 'turtle-king', name: 'コウラダイオウ', shape: 'turtleKing', area: 'sansu', rank: 3, line: 'turtle', stage: 3, colors: { A: '#7A2E0E', B: '#E8642C', m: '#3E6A4A', g2: '#7ED957' } },
    { id: 'wolf-king', name: 'ガルムオウ', shape: 'wolfKing', area: 'sansu', rank: 3, line: 'wolf', stage: 3, colors: { A: '#5A4A80', B: '#C9BCE6', m: '#B01840' } },
    { id: 'bat-king', name: 'ヨルノヌシ', shape: 'batKing', area: 'kokugo', rank: 3, line: 'bat', stage: 3, colors: { A: '#8A4FD1', B: '#4A2380' } },
    { id: 'bee-king', name: 'ハチノジョオウ', shape: 'beeKing', area: 'kokugo', rank: 3, line: 'bee', stage: 3, colors: { A: '#FF6B5A', B: '#A83224' } },
    { id: 'butterfly-king', name: 'ハネノミカド', shape: 'butterflyKing', area: 'kokugo', rank: 3, line: 'butterfly', stage: 3, colors: { A: '#8FD3FF', B: '#4FA3E0' } },
    { id: 'fox-king', name: 'ヨウコオウ', shape: 'foxKing', area: 'kokugo', rank: 3, line: 'fox', stage: 3, colors: { A: '#E6ECF5', B: '#FFFFFF', m: '#C2185B' } },
    { id: 'frog-king', name: 'カエルダイオウ', shape: 'frogKing', area: 'kokugo', rank: 3, line: 'frog', stage: 3, colors: { A: '#4F8CFF', B: '#B3D9FF', g2: '#7ED957' } },
    { id: 'hedgehog-king', name: 'トゲトゲロード', shape: 'hedgehogKing', area: 'kokugo', rank: 3, line: 'hedgehog', stage: 3, colors: { A: '#E6ECF5', B: '#4F6FB8' } },
    { id: 'mushroom-king', name: 'キノコダイオウ', shape: 'mushroomKing', area: 'kokugo', rank: 3, line: 'mushroom', stage: 3, colors: { A: '#8A4FD1', B: '#FFD166', m: '#1F7A4F' } },
    { id: 'owl-king', name: 'モリノケンジャ', shape: 'owlKing', area: 'kokugo', rank: 3, line: 'owl', stage: 3, colors: { A: '#EDEEF5', B: '#C9CFDB', g2: '#7ED957' } },
    { id: 'slime-king', name: '王さまスライム', shape: 'slimeKing', area: 'kokugo', rank: 3, line: 'slime', stage: 3, colors: { A: '#FF5A5A', B: '#A82424', m: '#7A1FA8' } },
    { id: 'snail-king', name: 'デンデンミカド', shape: 'snailKing', area: 'kokugo', rank: 3, line: 'snail', stage: 3, colors: { A: '#8A4FD1', B: '#4A2380', m: '#F2A24B' } },
    { id: 'spider-king', name: 'アミノヌシ', shape: 'spiderKing', area: 'kokugo', rank: 3, line: 'spider', stage: 3, colors: { A: '#3A3A4A', B: '#1C1C28' } },
    { id: 'tree-king', name: 'タイジュオウ', shape: 'treeKing', area: 'kokugo', rank: 3, line: 'tree', stage: 3, colors: { A: '#E8853A', B: '#B34E14', g2: '#7ED957' } },
    { id: 'angler-king', name: 'シンカイノヌシ', shape: 'anglerKing', area: 'rikashakai', rank: 3, line: 'angler', stage: 3, colors: { A: '#2B2B3A', B: '#4A4A5E' } },
    { id: 'crab-king', name: 'ハサミダイオウ', shape: 'crabKing', area: 'rikashakai', rank: 3, line: 'crab', stage: 3, colors: { A: '#3E9A6B', B: '#1E5A3C' } },
    { id: 'fish-king', name: 'サカナダイオウ', shape: 'fishKing', area: 'rikashakai', rank: 3, line: 'fish', stage: 3, colors: { A: '#FF6B5A', B: '#FFC9A8' } },
    { id: 'ghost-king', name: 'ユウレイロード', shape: 'ghostKing', area: 'rikashakai', rank: 3, line: 'ghost', stage: 3, colors: { A: '#EDEEF5', B: '#B9BCCF', m: '#4A3A7A' } },
    { id: 'jelly-king', name: 'デンキノヌシ', shape: 'jellyKing', area: 'rikashakai', rank: 3, line: 'jelly', stage: 3, colors: { A: '#FFD166', B: '#C98F1B' } },
    { id: 'penguin-king', name: 'コオリノテイオウ', shape: 'penguinKing', area: 'rikashakai', rank: 3, line: 'penguin', stage: 3, colors: { A: '#8FD3FF', B: '#4FA3E0', m: '#1F4FA8' } },
    { id: 'puffer-king', name: 'フクラミオウ', shape: 'pufferKing', area: 'rikashakai', rank: 3, line: 'puffer', stage: 3, colors: { A: '#8A4FD1', B: '#4A2380' } },
    { id: 'seahorse-king', name: 'タツノミカド', shape: 'seahorseKing', area: 'rikashakai', rank: 3, line: 'seahorse', stage: 3, colors: { A: '#FFD166', B: '#FFF0B8' } },
    { id: 'shark-king', name: 'キバノヌシ', shape: 'sharkKing', area: 'rikashakai', rank: 3, line: 'shark', stage: 3, colors: { A: '#8FA6C0', B: '#5A6A80' } },
    { id: 'star-king', name: 'ホシノオウ', shape: 'starKing', area: 'rikashakai', rank: 3, line: 'star', stage: 3, colors: { A: '#FFD166', B: '#C98F1B' } },
    { id: 'tako-king', name: 'タコダイオウ', shape: 'takoKing', area: 'rikashakai', rank: 3, line: 'tako', stage: 3, colors: { A: '#8A4FD1', B: '#4A2380' } },
    { id: 'balloon-king', name: 'フワフワミカド', shape: 'balloonKing', area: 'eigo', rank: 3, line: 'balloon', stage: 3, colors: { A: '#8FD3FF', B: '#4FA3E0' } },
    { id: 'bird-king', name: 'ソラノテイオウ', shape: 'birdKing', area: 'eigo', rank: 3, line: 'bird', stage: 3, colors: { A: '#4F8CFF', B: '#1F4FB0' } },
    { id: 'cloud-king', name: 'カミナリオウ', shape: 'cloudKing', area: 'eigo', rank: 3, line: 'cloud', stage: 3, colors: { A: '#6B7C9C', B: '#3A4558' } },
    { id: 'kite-king', name: 'カゼノロード', shape: 'kiteKing', area: 'eigo', rank: 3, line: 'kite', stage: 3, colors: { A: '#4F8CFF', B: '#FFD166', m: '#E8853A' } },
    { id: 'moon-king', name: 'ツキノミカド', shape: 'moonKing', area: 'eigo', rank: 3, line: 'moon', stage: 3, colors: { A: '#FFE08A', B: '#E0B15C' } },
    { id: 'rocket-king', name: 'ロケットオウ', shape: 'rocketKing', area: 'eigo', rank: 3, line: 'rocket', stage: 3, colors: { A: '#B3D9FF', B: '#8FB8E8' } },
    { id: 'sun-king', name: 'タイヨウオウ', shape: 'sunKing', area: 'eigo', rank: 3, line: 'sun', stage: 3, colors: { A: '#FFD166', B: '#F2A24B' } },
    { id: 'tornado-king', name: 'アラシノヌシ', shape: 'tornadoKing', area: 'eigo', rank: 3, line: 'tornado', stage: 3, colors: { A: '#6B7C9C', B: '#4A5568' } },
    { id: 'ufo-king', name: 'ユーフォオウ', shape: 'ufoKing', area: 'eigo', rank: 3, line: 'ufo', stage: 3, colors: { A: '#FF6B5A', B: '#4A4A5E' } },
    /* たからばこ（敵あつかい だが 図鑑には のせない） */
    { id: 'chest', name: 'たからばこ', shape: 'chest', hidden: true,
      colors: { p: '#A6753F', P: '#7A5326', y: '#F2C14E' } },

    /* ---------- カプセル専用（v9.0）ここから：tools/capsule/apply.js が 書く ---------- */
    /* カプセルマシンでしか 手に 入らない 27系統 × 3段階＋シークレット 3体＝84体（v14.8 で 第2弾）。
       1段階め＝capsuleOnly（引ける）／2・3段階め＝evoOnly（Lv.10 / Lv.20 で なる）。
       secret: true＝あつめぐあいの バーで ？？？（進化しない 単体）。
       area を つけないので ふつうの たたかい（pickIds）には 出ない。 */
    { id: 'cap-knight', name: 'ミニナイト', shape: 'cap-knight', rank: 1, capsuleOnly: true, cap: 'n', line: 'cap-knight', stage: 1, evo: 'cap-knight-2',
      colors: { A: '#4f74c8', B: '#2b4278', C: '#c3d4f5', e: '#ffe07a', r: '#ff5e5e', y: '#ffd447', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-knight-2', name: 'ブレイドナイト', shape: 'cap-knight-2', rank: 2, evoOnly: true, line: 'cap-knight', stage: 2, evo: 'cap-knight-3',
      colors: { A: '#6182ce', B: '#405586', C: '#c9d8f6', e: '#ffe07a', r: '#ff5e5e', y: '#ffd447', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-knight-3', name: 'セイバロード', shape: 'cap-knight-3', rank: 3, evoOnly: true, line: 'cap-knight', stage: 3,
      colors: { A: '#6f8dd2', B: '#516490', C: '#cedcf7', e: '#ffe07a', r: '#ff5e5e', y: '#ffd447', j1: '#9fe6ff', j2: '#3f8fbf', m: '#a3202c' } },
    { id: 'cap-archer', name: 'ミニアーチャー', shape: 'cap-archer', rank: 1, capsuleOnly: true, cap: 'n', line: 'cap-archer', stage: 1, evo: 'cap-archer-2',
      colors: { A: '#3f9a5c', B: '#25663b', C: '#b98a4a', e: '#ffe07a', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-archer-2', name: 'シューターン', shape: 'cap-archer-2', rank: 2, evoOnly: true, line: 'cap-archer', stage: 2, evo: 'cap-archer-3',
      colors: { A: '#52a46c', B: '#3b754f', C: '#c0965c', e: '#ffe07a', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-archer-3', name: 'スターアロー', shape: 'cap-archer-3', rank: 3, evoOnly: true, line: 'cap-archer', stage: 3,
      colors: { A: '#62ac79', B: '#4c825e', C: '#c69f6b', e: '#ffe07a', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-mage', name: 'ミニメイジ', shape: 'cap-mage', rank: 1, capsuleOnly: true, cap: 'n', line: 'cap-mage', stage: 1, evo: 'cap-mage-2',
      colors: { A: '#8a55f0', B: '#5c2fb0', C: '#c9a2ff', e: '#4fd3ff', y: '#ffd447', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-mage-2', name: 'ソーサラン', shape: 'cap-mage-2', rank: 2, evoOnly: true, line: 'cap-mage', stage: 2, evo: 'cap-mage-3',
      colors: { A: '#9666f2', B: '#6c44b8', C: '#ceabff', e: '#4fd3ff', y: '#ffd447', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-mage-3', name: 'アークメイジ', shape: 'cap-mage-3', rank: 3, evoOnly: true, line: 'cap-mage', stage: 3,
      colors: { A: '#9f74f3', B: '#7954be', C: '#d3b3ff', e: '#4fd3ff', y: '#ffd447', j1: '#9fe6ff', j2: '#3f8fbf', m: '#2e1668' } },
    { id: 'cap-lancer', name: 'ミニランサー', shape: 'cap-lancer', rank: 1, capsuleOnly: true, cap: 'n', line: 'cap-lancer', stage: 1, evo: 'cap-lancer-2',
      colors: { A: '#d8563f', B: '#8f2a1c', C: '#f0c98a', e: '#ffe07a', r: '#ff5e5e', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-lancer-2', name: 'ランスガード', shape: 'cap-lancer-2', rank: 2, evoOnly: true, line: 'cap-lancer', stage: 2, evo: 'cap-lancer-3',
      colors: { A: '#dc6752', B: '#9a3f33', C: '#f2ce96', e: '#ffe07a', r: '#ff5e5e', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-lancer-3', name: 'ドラグランス', shape: 'cap-lancer-3', rank: 3, evoOnly: true, line: 'cap-lancer', stage: 3,
      colors: { A: '#df7462', B: '#a35045', C: '#f3d39f', e: '#ffe07a', r: '#ff5e5e', j1: '#9fe6ff', j2: '#3f8fbf', m: '#1e2a5c' } },
    { id: 'cap-axer', name: 'ミニアクサー', shape: 'cap-axer', rank: 1, capsuleOnly: true, cap: 'n', line: 'cap-axer', stage: 1, evo: 'cap-axer-2',
      colors: { A: '#a8681f', B: '#6b3c0e', C: '#d9d9e2', e: '#ff8f5e', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-axer-2', name: 'アクスガイ', shape: 'cap-axer-2', rank: 2, evoOnly: true, line: 'cap-axer', stage: 2, evo: 'cap-axer-3',
      colors: { A: '#b17735', B: '#7a5026', C: '#dddde5', e: '#ff8f5e', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-axer-3', name: 'グランドアクス', shape: 'cap-axer-3', rank: 3, evoOnly: true, line: 'cap-axer', stage: 3,
      colors: { A: '#b88347', B: '#865f39', C: '#e0e0e7', e: '#ff8f5e', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-shielder', name: 'ミニシールダー', shape: 'cap-shielder', rank: 1, capsuleOnly: true, cap: 'n', line: 'cap-shielder', stage: 1, evo: 'cap-shielder-2',
      colors: { A: '#3f8f8a', B: '#215a56', C: '#d9d9e2', e: '#ffe07a', y: '#ffd447', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-shielder-2', name: 'ガードウォル', shape: 'cap-shielder-2', rank: 2, evoOnly: true, line: 'cap-shielder', stage: 2, evo: 'cap-shielder-3',
      colors: { A: '#529a96', B: '#376b67', C: '#dddde5', e: '#ffe07a', y: '#ffd447', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-shielder-3', name: 'イージスロード', shape: 'cap-shielder-3', rank: 3, evoOnly: true, line: 'cap-shielder', stage: 3,
      colors: { A: '#62a39f', B: '#497874', C: '#e0e0e7', e: '#ffe07a', y: '#ffd447', j1: '#9fe6ff', j2: '#3f8fbf', m: '#1d3757' } },
    { id: 'cap-hammer', name: 'ミニハンマー', shape: 'cap-hammer', rank: 1, capsuleOnly: true, cap: 'n', line: 'cap-hammer', stage: 1, evo: 'cap-hammer-2',
      colors: { A: '#c8a13f', B: '#7d5f14', C: '#9aa4b5', e: '#ff5e5e', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-hammer-2', name: 'ハンマドン', shape: 'cap-hammer-2', rank: 2, evoOnly: true, line: 'cap-hammer', stage: 2, evo: 'cap-hammer-3',
      colors: { A: '#ceaa52', B: '#8a6f2c', C: '#a4adbc', e: '#ff5e5e', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-hammer-3', name: 'グランドハンマ', shape: 'cap-hammer-3', rank: 3, evoOnly: true, line: 'cap-hammer', stage: 3,
      colors: { A: '#d2b262', B: '#947c3e', C: '#acb4c2', e: '#ff5e5e', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-dagger', name: 'ミニダガー', shape: 'cap-dagger', rank: 1, capsuleOnly: true, cap: 'n', line: 'cap-dagger', stage: 1, evo: 'cap-dagger-2',
      colors: { A: '#5a5f8f', B: '#33375c', C: '#d9d9e2', e: '#7cf9c4', r: '#ff5e5e', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-dagger-2', name: 'シャドダガー', shape: 'cap-dagger-2', rank: 2, evoOnly: true, line: 'cap-dagger', stage: 2, evo: 'cap-dagger-3',
      colors: { A: '#6b6f9a', B: '#474b6c', C: '#dddde5', e: '#7cf9c4', r: '#ff5e5e', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-dagger-3', name: 'ファントムエッジ', shape: 'cap-dagger-3', rank: 3, evoOnly: true, line: 'cap-dagger', stage: 3,
      colors: { A: '#787ca3', B: '#585b79', C: '#e0e0e7', e: '#7cf9c4', r: '#ff5e5e', j1: '#9fe6ff', j2: '#3f8fbf', m: '#221a3a' } },
    { id: 'cap-paladin', name: 'ミニパラディン', shape: 'cap-paladin', rank: 1, capsuleOnly: true, cap: 'n', line: 'cap-paladin', stage: 1, evo: 'cap-paladin-2',
      colors: { A: '#e0e4ef', B: '#8f96ad', C: '#ffd447', e: '#4fd3ff', w: '#ffffff', r: '#c0392f', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-paladin-2', name: 'ホーリガード', shape: 'cap-paladin-2', rank: 2, evoOnly: true, line: 'cap-paladin', stage: 2, evo: 'cap-paladin-3',
      colors: { A: '#e3e7f1', B: '#9aa1b5', C: '#ffd859', e: '#4fd3ff', w: '#ffffff', r: '#c0392f', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-paladin-3', name: 'セイントロード', shape: 'cap-paladin-3', rank: 3, evoOnly: true, line: 'cap-paladin', stage: 3,
      colors: { A: '#e6e9f2', B: '#a3a9bc', C: '#ffdc68', e: '#4fd3ff', w: '#ffffff', r: '#c0392f', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-starcat', name: 'ホシネコ', shape: 'cap-starcat', rank: 2, capsuleOnly: true, cap: 'r', line: 'cap-starcat', stage: 1, evo: 'cap-starcat-2',
      colors: { A: '#3b3f8f', B: '#262a63', C: '#8fa0ff', e: '#7cf9c4', y: '#ffd447', j1: '#ffe89a', j2: '#c08a1d' } },
    { id: 'cap-starcat-2', name: 'セイザネコ', shape: 'cap-starcat-2', rank: 3, evoOnly: true, line: 'cap-starcat', stage: 2, evo: 'cap-starcat-3',
      colors: { A: '#4a4fb8', B: '#2e3480', C: '#a3b0ff', e: '#7cf9c4', y: '#ffd447', j1: '#ffe89a', j2: '#c08a1d' } },
    { id: 'cap-starcat-3', name: 'ギンガネコ', shape: 'cap-starcat-3', rank: 3, evoOnly: true, line: 'cap-starcat', stage: 3,
      colors: { A: '#5d63e0', B: '#3a3fa0', C: '#c2ccff', e: '#7cf9c4', y: '#ffd447', j1: '#ffe89a', j2: '#c08a1d' } },
    { id: 'cap-comet', name: 'コメットドラ', shape: 'cap-comet', rank: 2, capsuleOnly: true, cap: 'r', line: 'cap-comet', stage: 1, evo: 'cap-comet-2',
      colors: { A: '#6a3fb5', B: '#43257a', C: '#c9a2ff', e: '#4fd3ff', r: '#ff8f5e', j1: '#ffe89a', j2: '#c08a1d' } },
    { id: 'cap-comet-2', name: 'メテオドラ', shape: 'cap-comet-2', rank: 3, evoOnly: true, line: 'cap-comet', stage: 2, evo: 'cap-comet-3',
      colors: { A: '#8250d8', B: '#523095', C: '#d9b8ff', e: '#4fd3ff', r: '#ff8f5e', j1: '#ffe89a', j2: '#c08a1d' } },
    { id: 'cap-comet-3', name: 'ネビュラドラ', shape: 'cap-comet-3', rank: 3, evoOnly: true, line: 'cap-comet', stage: 3,
      colors: { A: '#9a63f5', B: '#6540b8', C: '#e8d0ff', e: '#4fd3ff', r: '#ff8f5e', j1: '#ffe89a', j2: '#c08a1d' } },
    { id: 'cap-orb', name: 'リングボール', shape: 'cap-orb', rank: 2, capsuleOnly: true, cap: 'r', line: 'cap-orb', stage: 1, evo: 'cap-orb-2',
      colors: { A: '#1f4f8f', B: '#12305c', C: '#7cf9c4', e: '#ffe07a', j1: '#ffe89a', j2: '#c08a1d' } },
    { id: 'cap-orb-2', name: 'オービットボル', shape: 'cap-orb-2', rank: 3, evoOnly: true, line: 'cap-orb', stage: 2, evo: 'cap-orb-3',
      colors: { A: '#2765b0', B: '#173e75', C: '#8ffad0', e: '#ffe07a', j1: '#ffe89a', j2: '#c08a1d' } },
    { id: 'cap-orb-3', name: 'コスモオーブ', shape: 'cap-orb-3', rank: 3, evoOnly: true, line: 'cap-orb', stage: 3,
      colors: { A: '#307ed6', B: '#1d4f92', C: '#a8ffdc', e: '#ffe07a', j1: '#ffe89a', j2: '#c08a1d' } },
    { id: 'cap-whale', name: 'ソラクジラ', shape: 'cap-whale', rank: 2, capsuleOnly: true, cap: 'r', line: 'cap-whale', stage: 1, evo: 'cap-whale-2',
      colors: { A: '#2f5fb5', B: '#1b3a75', C: '#9fe6ff', e: '#ffe07a', j1: '#ffe89a', j2: '#c08a1d' } },
    { id: 'cap-whale-2', name: 'ホシクジラ', shape: 'cap-whale-2', rank: 3, evoOnly: true, line: 'cap-whale', stage: 2, evo: 'cap-whale-3',
      colors: { A: '#3a75d8', B: '#22488f', C: '#b5edff', e: '#ffe07a', j1: '#ffe89a', j2: '#c08a1d' } },
    { id: 'cap-whale-3', name: 'セイウンクジラ', shape: 'cap-whale-3', rank: 3, evoOnly: true, line: 'cap-whale', stage: 3,
      colors: { A: '#488ef0', B: '#2c58ac', C: '#cbf4ff', e: '#ffe07a', j1: '#ffe89a', j2: '#c08a1d' } },
    { id: 'cap-owl', name: 'ホシフクロウ', shape: 'cap-owl', rank: 2, capsuleOnly: true, cap: 'r', line: 'cap-owl', stage: 1, evo: 'cap-owl-2',
      colors: { A: '#4a3f8f', B: '#2c2560', C: '#c9a2ff', e: '#ffe07a', j1: '#ffe89a', j2: '#c08a1d' } },
    { id: 'cap-owl-2', name: 'ヨゾラフクロ', shape: 'cap-owl-2', rank: 3, evoOnly: true, line: 'cap-owl', stage: 2, evo: 'cap-owl-3',
      colors: { A: '#5c4fb0', B: '#372d78', C: '#d6b5ff', e: '#ffe07a', j1: '#ffe89a', j2: '#c08a1d' } },
    { id: 'cap-owl-3', name: 'ホクトフクロ', shape: 'cap-owl-3', rank: 3, evoOnly: true, line: 'cap-owl', stage: 3,
      colors: { A: '#7060d8', B: '#453a95', C: '#e4ccff', e: '#ffe07a', j1: '#ffe89a', j2: '#c08a1d' } },
    { id: 'cap-serpent', name: 'ホシヘビ', shape: 'cap-serpent', rank: 2, capsuleOnly: true, cap: 'r', line: 'cap-serpent', stage: 1, evo: 'cap-serpent-2',
      colors: { A: '#2f8f7a', B: '#1a5a4c', C: '#7cf9c4', e: '#ffe07a', r: '#ff5e5e', j1: '#ffe89a', j2: '#c08a1d' } },
    { id: 'cap-serpent-2', name: 'リュウセイヘビ', shape: 'cap-serpent-2', rank: 3, evoOnly: true, line: 'cap-serpent', stage: 2, evo: 'cap-serpent-3',
      colors: { A: '#39b096', B: '#1f6f5e', C: '#8ffad0', e: '#ffe07a', r: '#ff5e5e', j1: '#ffe89a', j2: '#c08a1d' } },
    { id: 'cap-serpent-3', name: 'テンリュウヘビ', shape: 'cap-serpent-3', rank: 3, evoOnly: true, line: 'cap-serpent', stage: 3,
      colors: { A: '#45d0b0', B: '#268a74', C: '#a8ffdc', e: '#ffe07a', r: '#ff5e5e', j1: '#ffe89a', j2: '#c08a1d' } },
    { id: 'cap-phoenix', name: 'フェニクス', shape: 'cap-phoenix', rank: 3, capsuleOnly: true, cap: 'sr', line: 'cap-phoenix', stage: 1, evo: 'cap-phoenix-2',
      colors: { A: '#ff8f3c', B: '#b3551d', C: '#ffd166', y: '#ffe07a', e: '#fff6c9', r: '#ef4f2e', w: '#fff3c0', j1: '#ffe89a', j2: '#c08a1d' } },
    { id: 'cap-phoenix-2', name: 'ホムラノトリ', shape: 'cap-phoenix-2', rank: 3, evoOnly: true, line: 'cap-phoenix', stage: 2, evo: 'cap-phoenix-3',
      colors: { A: '#ff7a20', B: '#a8460f', C: '#ffd970', y: '#ffe07a', e: '#fff6c9', r: '#ef4f2e', w: '#fff3c0', j1: '#ffe89a', j2: '#c08a1d' } },
    { id: 'cap-phoenix-3', name: 'テンショウトリ', shape: 'cap-phoenix-3', rank: 3, evoOnly: true, line: 'cap-phoenix', stage: 3,
      colors: { A: '#ff5c10', B: '#8f3405', C: '#ffe08a', y: '#ffe07a', e: '#fff6c9', r: '#ef4f2e', w: '#fff3c0', j1: '#ffe89a', j2: '#c08a1d' } },
    { id: 'cap-lionking', name: 'コマオウ', shape: 'cap-lionking', rank: 3, capsuleOnly: true, cap: 'sr', line: 'cap-lionking', stage: 1, evo: 'cap-lionking-2',
      colors: { A: '#c0392f', B: '#7d1f18', C: '#e8c88a', y: '#ffd447', e: '#ffe07a', r: '#ff8f3c', w: '#ffffff', j1: '#ffe89a', j2: '#c08a1d' } },
    { id: 'cap-lionking-2', name: 'ライジンシシ', shape: 'cap-lionking-2', rank: 3, evoOnly: true, line: 'cap-lionking', stage: 2, evo: 'cap-lionking-3',
      colors: { A: '#d43526', B: '#8a1a12', C: '#f0d69a', y: '#ffd447', e: '#ffe07a', r: '#ff8f3c', w: '#ffffff', j1: '#ffe89a', j2: '#c08a1d' } },
    { id: 'cap-lionking-3', name: 'コンゴウシシ', shape: 'cap-lionking-3', rank: 3, evoOnly: true, line: 'cap-lionking', stage: 3,
      colors: { A: '#e82f1a', B: '#94150c', C: '#ffdc90', y: '#ffd447', e: '#ffe07a', r: '#ff8f3c', w: '#ffffff', j1: '#ffe89a', j2: '#c08a1d' } },
    { id: 'cap-kirin', name: 'キリンジュ', shape: 'cap-kirin', rank: 3, capsuleOnly: true, cap: 'sr', line: 'cap-kirin', stage: 1, evo: 'cap-kirin-2',
      colors: { A: '#3fa8a0', B: '#22645f', C: '#a8e6df', y: '#ffd447', e: '#ffe07a', r: '#ff8f3c', j1: '#ffe89a', j2: '#c08a1d' } },
    { id: 'cap-kirin-2', name: 'ライキリン', shape: 'cap-kirin-2', rank: 3, evoOnly: true, line: 'cap-kirin', stage: 2, evo: 'cap-kirin-3',
      colors: { A: '#33bdb0', B: '#1a7a72', C: '#b8f0e8', y: '#ffd447', e: '#ffe07a', r: '#ff8f3c', j1: '#ffe89a', j2: '#c08a1d' } },
    { id: 'cap-kirin-3', name: 'テンガイキリン', shape: 'cap-kirin-3', rank: 3, evoOnly: true, line: 'cap-kirin', stage: 3,
      colors: { A: '#22d4c0', B: '#108a7e', C: '#c8f8f0', y: '#ffd447', e: '#ffe07a', r: '#ff8f3c', j1: '#ffe89a', j2: '#c08a1d' } },
    { id: 'cap-kappa', name: 'カッパマル', shape: 'cap-kappa', rank: 1, capsuleOnly: true, cap: 'n', line: 'cap-kappa', stage: 1, evo: 'cap-kappa-2',
      colors: { A: '#3fa060', B: '#256b3c', C: '#e8e0b0', o: '#f2a53a', c: '#5ad0e8', e: '#ffe07a', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-kappa-2', name: 'カワタロウ', shape: 'cap-kappa-2', rank: 2, evoOnly: true, line: 'cap-kappa', stage: 2, evo: 'cap-kappa-3',
      colors: { A: '#52aa70', B: '#3b7a50', C: '#eae3b8', o: '#f2a53a', c: '#5ad0e8', e: '#ffe07a', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-kappa-3', name: 'カワノヌシ', shape: 'cap-kappa-3', rank: 3, evoOnly: true, line: 'cap-kappa', stage: 3,
      colors: { A: '#62b17d', B: '#4c865f', C: '#ece6be', o: '#f2a53a', c: '#5ad0e8', e: '#ffe07a', j1: '#9fe6ff', j2: '#3f8fbf', m: '#1f5fae' } },
    { id: 'cap-kasa', name: 'カラカサン', shape: 'cap-kasa', rank: 1, capsuleOnly: true, cap: 'n', line: 'cap-kasa', stage: 1, evo: 'cap-kasa-2',
      colors: { A: '#8a4fd8', B: '#5b2f96', C: '#e8e0d0', m: '#8a5a30', r: '#ff5e5e', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-kasa-2', name: 'カサドウジ', shape: 'cap-kasa-2', rank: 2, evoOnly: true, line: 'cap-kasa', stage: 2, evo: 'cap-kasa-3',
      colors: { A: '#9661dc', B: '#6b44a1', C: '#eae3d5', m: '#8a5a30', r: '#ff5e5e', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-kasa-3', name: 'カサダイミョウ', shape: 'cap-kasa-3', rank: 3, evoOnly: true, line: 'cap-kasa', stage: 3,
      colors: { A: '#9f6fdf', B: '#7954a9', C: '#ece6d8', m: '#8a5a30', r: '#ff5e5e', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-chochin', name: 'チョウチンボウ', shape: 'cap-chochin', rank: 1, capsuleOnly: true, cap: 'n', line: 'cap-chochin', stage: 1, evo: 'cap-chochin-2',
      colors: { A: '#e07a2a', B: '#9a4a14', C: '#f5d9a0', f: '#ffd447', r: '#ff5e5e', m: '#6b4226', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-chochin-2', name: 'オニビボウ', shape: 'cap-chochin-2', rank: 2, evoOnly: true, line: 'cap-chochin', stage: 2, evo: 'cap-chochin-3',
      colors: { A: '#e3873f', B: '#a45c2c', C: '#f6ddaa', f: '#ffd447', r: '#ff5e5e', m: '#6b4226', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-chochin-3', name: 'オオチョウチン', shape: 'cap-chochin-3', rank: 3, evoOnly: true, line: 'cap-chochin', stage: 3,
      colors: { A: '#e69250', B: '#ac6b3e', C: '#f7e0b1', f: '#ffd447', r: '#ff5e5e', m: '#6b4226', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-kitsune', name: 'コンギツネ', shape: 'cap-kitsune', rank: 1, capsuleOnly: true, cap: 'n', line: 'cap-kitsune', stage: 1, evo: 'cap-kitsune-2',
      colors: { A: '#f0923a', B: '#b05e18', C: '#fdf3e0', e: '#ffe07a', k: '#241812', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-kitsune-2', name: 'ギンギツネ', shape: 'cap-kitsune-2', rank: 2, evoOnly: true, line: 'cap-kitsune', stage: 2, evo: 'cap-kitsune-3',
      colors: { A: '#c8ccd8', B: '#8a90a5', C: '#f5f7fc', e: '#ffe07a', k: '#241812', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-kitsune-3', name: 'キュウビマル', shape: 'cap-kitsune-3', rank: 3, evoOnly: true, line: 'cap-kitsune', stage: 3,
      colors: { A: '#f5ead0', B: '#d8b878', C: '#ffffff', e: '#ffe07a', k: '#241812', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-mwolf', name: 'メカウルフ', shape: 'cap-mwolf', rank: 2, capsuleOnly: true, cap: 'r', line: 'cap-mwolf', stage: 1, evo: 'cap-mwolf-2',
      colors: { A: '#8a9bb8', B: '#4e5a75', C: '#c8d4e8', c: '#4fd3ff', y: '#ffd447', f: '#ff8a3a', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-mwolf-2', name: 'ギガウルフ', shape: 'cap-mwolf-2', rank: 3, evoOnly: true, line: 'cap-mwolf', stage: 2, evo: 'cap-mwolf-3',
      colors: { A: '#96a5bf', B: '#606b83', C: '#ced8ea', c: '#4fd3ff', y: '#ffd447', f: '#ff8a3a', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-mwolf-3', name: 'テツロウガ', shape: 'cap-mwolf-3', rank: 3, evoOnly: true, line: 'cap-mwolf', stage: 3,
      colors: { A: '#9fadc5', B: '#6e788e', C: '#d2dcec', c: '#4fd3ff', y: '#ffd447', f: '#ff8a3a', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-mhawk', name: 'メカホーク', shape: 'cap-mhawk', rank: 2, capsuleOnly: true, cap: 'r', line: 'cap-mhawk', stage: 1, evo: 'cap-mhawk-2',
      colors: { A: '#a8b4cc', B: '#5a6685', C: '#e0e6f2', c: '#4fd3ff', y: '#ffd447', o: '#f2a53a', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-mhawk-2', name: 'ジェットホーク', shape: 'cap-mhawk-2', rank: 3, evoOnly: true, line: 'cap-mhawk', stage: 2, evo: 'cap-mhawk-3',
      colors: { A: '#b1bcd1', B: '#6b7591', C: '#e3e9f3', c: '#4fd3ff', y: '#ffd447', o: '#f2a53a', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-mhawk-3', name: 'アラシホーク', shape: 'cap-mhawk-3', rank: 3, evoOnly: true, line: 'cap-mhawk', stage: 3,
      colors: { A: '#b8c2d5', B: '#78829b', C: '#e6ebf4', c: '#4fd3ff', y: '#ffd447', o: '#f2a53a', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-mleon', name: 'メカレオン', shape: 'cap-mleon', rank: 2, capsuleOnly: true, cap: 'r', line: 'cap-mleon', stage: 1, evo: 'cap-mleon-2',
      colors: { A: '#5aa87a', B: '#2f6b4a', C: '#c8e8d4', c: '#4fd3ff', G: '#63d94f', r: '#ff5e5e', o: '#f2a53a', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-mleon-2', name: 'ギガレオン', shape: 'cap-mleon-2', rank: 3, evoOnly: true, line: 'cap-mleon', stage: 2, evo: 'cap-mleon-3',
      colors: { A: '#6bb187', B: '#447a5c', C: '#ceead8', c: '#4fd3ff', G: '#63d94f', r: '#ff5e5e', o: '#f2a53a', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-mleon-3', name: 'マボロシレオン', shape: 'cap-mleon-3', rank: 3, evoOnly: true, line: 'cap-mleon', stage: 3,
      colors: { A: '#8a6ae0', B: '#5a3fa0', C: '#e0d4ff', c: '#4fd3ff', G: '#63d94f', r: '#ff5e5e', o: '#f2a53a', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-unicorn', name: 'ユニコルン', shape: 'cap-unicorn', rank: 3, capsuleOnly: true, cap: 'sr', line: 'cap-unicorn', stage: 1, evo: 'cap-unicorn-2',
      colors: { A: '#f2f4f8', B: '#c0c8dd', C: '#e0e6f2', e: '#4fd3ff', y: '#ffd447', r: '#ff5e5e', o: '#f2a53a', G: '#63d94f', c: '#5ad0e8', V: '#a06ae0', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-unicorn-2', name: 'シャイニコルン', shape: 'cap-unicorn-2', rank: 3, evoOnly: true, line: 'cap-unicorn', stage: 2, evo: 'cap-unicorn-3',
      colors: { A: '#f3f5f9', B: '#c6cee0', C: '#e3e9f3', e: '#4fd3ff', y: '#ffd447', r: '#ff5e5e', o: '#f2a53a', G: '#63d94f', c: '#5ad0e8', V: '#a06ae0', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-unicorn-3', name: 'テンマコルン', shape: 'cap-unicorn-3', rank: 3, evoOnly: true, line: 'cap-unicorn', stage: 3,
      colors: { A: '#f4f6f9', B: '#cbd2e3', C: '#e6ebf4', e: '#4fd3ff', y: '#ffd447', r: '#ff5e5e', o: '#f2a53a', G: '#63d94f', c: '#5ad0e8', V: '#a06ae0', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-cerberus', name: 'ケルベロン', shape: 'cap-cerberus', rank: 3, capsuleOnly: true, cap: 'sr', line: 'cap-cerberus', stage: 1, evo: 'cap-cerberus-2',
      colors: { A: '#8a3a3a', B: '#521c1c', C: '#e0b090', e: '#ffe07a', y: '#ffd447', f: '#ff8a3a', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-cerberus-2', name: 'ケルベガード', shape: 'cap-cerberus-2', rank: 3, evoOnly: true, line: 'cap-cerberus', stage: 2, evo: 'cap-cerberus-3',
      colors: { A: '#964e4e', B: '#633333', C: '#e3b89b', e: '#ffe07a', y: '#ffd447', f: '#ff8a3a', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-cerberus-3', name: 'ケルベロード', shape: 'cap-cerberus-3', rank: 3, evoOnly: true, line: 'cap-cerberus', stage: 3,
      colors: { A: '#9f5d5d', B: '#714545', C: '#e6bea4', e: '#ffe07a', y: '#ffd447', f: '#ff8a3a', j1: '#9fe6ff', j2: '#3f8fbf', m: '#2a1430' } },
    { id: 'cap-nijislime', name: 'ニジスライム', shape: 'cap-nijislime', rank: 3, capsuleOnly: true, cap: 'sr', secret: true,
      colors: { A: '#ff6a6a', o: '#f2a53a', y: '#ffe14a', G: '#63d94f', c: '#5ad0e8', V: '#a06ae0', w: '#ffffff', k: '#3a2440', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-diagolem', name: 'ダイヤゴーレム', shape: 'cap-diagolem', rank: 3, capsuleOnly: true, cap: 'sr', secret: true,
      colors: { A: '#bfe6f5', B: '#7ab8d8', C: '#eef8ff', c: '#4fd3ff', w: '#ffffff', k: '#2a4458', j1: '#9fe6ff', j2: '#3f8fbf' } },
    { id: 'cap-tamago', name: 'ミラクルタマゴ', shape: 'cap-tamago', rank: 3, capsuleOnly: true, cap: 'sr', secret: true,
      colors: { A: '#f5efe0', B: '#d8c8a8', V: '#a06ae0', y: '#ffd447', e: '#ffe07a', k: '#241830', j1: '#9fe6ff', j2: '#3f8fbf', o: '#f2a53a' } }
    /* ---------- カプセル専用 ここまで ---------- */
  ];

  // ボス（エリアごとに 1体）
  const bosses = [
    /* <areabosses> ここから tools/bossart/emit.js が 書く（手で さわらない・正本は tools/bossart/final.js と final2.js）
       エリアの ボスは 序盤（tier 1）・中盤（tier 2）・終盤（tier 3）の 3体（v14.7）。どれが 出るかは bossFor(エリア, むずかしさ)。
       ぜんぶ 64マス（base）。理科は rikashakai を、小4〜の 理科（rika）は べつ名（AREA_ALIAS）で 借りる。 */
    { id: 'boss-dragon', area: 'sansu', name: 'ナンバードラゴン', shape: 'dragon', base: 64, tier: 3,
      colors: { A: '#B31F1A', B: '#761612', C: '#8E1A16', D: '#5A1210', w: '#F5E0B0', y: '#F2C14E', k: '#2B1512', e: '#FFE14A', r: '#FFB13A' },
      phase2: { A: '#D42A1C', e: '#FF4A2A', r: '#FF5A1A', C: '#A81F18' } },
    { id: 'boss-oni', area: 'kokugo', name: 'モジオニ', shape: 'oni', base: 64, tier: 3,
      colors: { A: '#3F7FD6', B: '#2B5AA6', C: '#B8281F', D: '#8F1F1A', y: '#F2C14E', s: '#CFD8E6', P: '#8B95A8', w: '#F1E6C8', W: '#F4F0E6', e: '#FFE14A', k: '#1B0C0C', r: '#7A1512', m: '#5A2D17' },
      phase2: { A: '#2F5FB8', B: '#1F4488', e: '#FF3A3A' } },
    { id: 'boss-knight', area: 'rikashakai', name: 'メカナイト', shape: 'knight', base: 64, tier: 3,
      colors: { A: '#8A9BB8', B: '#4E5A75', D: '#2B3248', y: '#F2C14E', c: '#4FD3FF', k: '#12121A' },
      phase2: { c: '#FF4A4A', A: '#9AA6C8', D: '#3A1A2A' } },
    { id: 'boss-slime', area: 'eigo', name: 'キングスライム', shape: 'kingslime', base: 64, tier: 3,
      colors: { A: '#FFA33A', B: '#B35F00', C: '#FFC97A', y: '#F2C14E', R: '#D13B30', V: '#6A3FA0', w: '#FFFFFF', k: '#3A1C08' },
      phase2: { A: '#FF7A2A', C: '#FFB07A', V: '#A83FC8' } },
    { id: 'boss-titan', area: 'shakai', name: 'グランドタイタン', shape: 'titan', base: 64, tier: 3,
      colors: { A: '#8A7B63', B: '#4E4436', D: '#332D22', g: '#5A8A4A', y: '#FFB43A', e: '#FFB43A', k: '#241F16' },
      phase2: { A: '#9A6A4A', y: '#FF5A1A', e: '#FF3A1A' } },
    { id: 'boss-saidon', area: 'sansu', name: 'イワサイドン', shape: 'saidon', base: 64, tier: 1,
      colors: { A: '#96714D', D: '#5E462F', C: '#D9C39A', R: '#7D7E8C', r: '#55565F', w: '#F2EAD8', e: '#FF5A3C', k: '#241812', y: '#F2C14E' },
      phase2: { A: '#B0703E', R: '#9A5A4A', e: '#FF2A1A' } },
    { id: 'boss-majin', area: 'sansu', name: 'ナンバーマジン', shape: 'majin', base: 64, tier: 2,
      colors: { A: '#8A4FD8', B: '#5B2F96', V: '#2A2640', y: '#F2C14E', e: '#FFE14A', g: '#4FD3FF', m: '#8A5A30', k: '#241633' },
      phase2: { A: '#B04FE0', g: '#FF4AB0', e: '#FF3A3A' } },
    { id: 'boss-fude', area: 'kokugo', name: 'フデダヌキ', shape: 'fude', base: 64, tier: 1,
      colors: { A: '#A4713F', D: '#5F3C20', C: '#E8D3A8', G: '#4DA33C', m: '#8A5A30', w: '#F2EAD8', k: '#1D1A24', p: '#7A3FD1', e: '#FFB43A' },
      phase2: { A: '#B8743A', e: '#FF3A1A', p: '#C23BFF' } },
    { id: 'boss-tengu', area: 'kokugo', name: 'カラステング', shape: 'tengu', base: 64, tier: 2,
      colors: { F: '#2B2D45', f: '#454A70', W: '#E8E4DA', R: '#D13B30', y: '#F2C14E', G: '#4DA33C', m: '#8A5A30', w: '#F2EAD8', e: '#FF5A3C', o: '#C47A20', k: '#16141F' },
      phase2: { F: '#3A1E3A', R: '#FF3B30', e: '#FFD447' } },
    { id: 'boss-namazu', area: 'rikashakai', name: 'ビリビリナマズ', shape: 'namazu', base: 64, tier: 1,
      colors: { A: '#4E6E9E', B: '#2F4668', C: '#E2D9B8', e: '#FFE14A', z: '#FFD94A', w: '#F2EAD8', k: '#1A1626', p: '#3FA9E8' },
      phase2: { A: '#5A5AB0', z: '#FFF36A', e: '#FF3A3A' } },
    { id: 'boss-mizuchi', area: 'rikashakai', name: 'アオミズチ', shape: 'mizuchi', base: 64, tier: 2,
      colors: { A: '#3F7FD1', B: '#24508F', C: '#CFE8F0', F: '#6FE0E8', w: '#F2EAD8', e: '#4FD3FF', y: '#F2C14E', k: '#121A2E', p: '#3FA9E8' },
      phase2: { A: '#2F5FB8', F: '#B8F6FF', e: '#FF3A3A' } },
    { id: 'boss-koban', area: 'shakai', name: 'コバンネズミ', shape: 'koban', base: 64, tier: 1,
      colors: { A: '#8B8F9E', B: '#5A5E6E', C: '#E8DDC0', y: '#F2C14E', o: '#B8862A', R: '#D13B30', s: '#8A5A30', e: '#FFB43A', w: '#F2EAD8', k: '#1D1A24' },
      phase2: { A: '#9A8E7E', R: '#FF3B30', e: '#FF3A1A' } },
    { id: 'boss-haniwa', area: 'shakai', name: 'ハニワショーグン', shape: 'haniwa', base: 64, tier: 2,
      colors: { A: '#C98A5A', B: '#96603A', k: '#1D1410', e: '#FF5A3C', y: '#F2C14E', m: '#8A5A30', s: '#8A8FA0' },
      phase2: { A: '#D07A48', e: '#FFD447', B: '#7A3A20' } },
    { id: 'boss-prince', area: 'eigo', name: 'プリンススライム', shape: 'prince', base: 64, tier: 1,
      colors: { A: '#4FA8E8', B: '#2E6FAE', C: '#9FD4F2', y: '#F2C14E', R: '#D13B30', r: '#8F221A', w: '#FFFFFF', k: '#16243A' },
      phase2: { A: '#6A8AF0', C: '#C9D8FF', R: '#FF3B30' } },
    { id: 'boss-griffon', area: 'eigo', name: 'アルファグリフォン', shape: 'griffon', base: 64, tier: 2,
      colors: { A: '#B8874A', B: '#7A5426', W: '#EEF2F8', y: '#F2C14E', R: '#D13B30', e: '#FFB43A', k: '#1D1A24' },
      phase2: { A: '#C8743A', R: '#FF3B30', e: '#FF3A1A' } },
    /* </areabosses> */
    /* <lastbosses> ここから tools/bossart/emit.js が 書く（手で さわらない・正本は tools/bossart/final3.js）
       ラスボス 6体（96マス・2026-09-19 作り直し）。どの ラスボスが 出るかは world3.js の towerStage の bossId が 決める。 */
    // 小4の ラスボス（v4.8）
    { id: 'boss-dark', area: 'tower4', name: 'ダークロード', shape: 'dark', base: 96, last: true,
      colors: { s: '#4A4066', B: '#2A2440', m: '#241030', W: '#7A1428', y: '#F2C14E', r: '#C24BFF', e: '#E85BFF', w: '#E8E4FF', k: '#0E0A18', D: '#6A5F8E' },
      phase2: { r: '#FF3B30', e: '#FF5A1A', s: '#5A3A70', W: '#C2182A' } },
    // 小1の ラスボス（v6.4）。名前は ひらがな・カタカナだけ
    { id: 'boss-obake', area: 'tower1', name: 'おばけキング', shape: 'obakeking', base: 96, last: true,
      colors: { A: '#F2EEFF', B: '#B9A9E6', m: '#7A2FB8', W: '#FFF4D6', y: '#F2C14E', r: '#C24BFF', e: '#2A2440', w: '#FFFFFF', k: '#2A1030', p: '#FF7AA8', g: '#6FE0FF' },
      phase2: { A: '#E2D0FF', B: '#8E6AD8', e: '#FF3B30', g: '#FF7AE0', r: '#FF3B30' } },
    // 小2の ラスボス（v6.4）
    { id: 'boss-kaizoku', area: 'tower2', name: 'かいぞくキャプテン', shape: 'kaizoku', base: 96, last: true,
      colors: { A: '#C42B2B', B: '#7E1818', C: '#F0BF94', D: '#3A2418', m: '#2F3A6A', y: '#F2C14E', w: '#F4F4F4', k: '#1C1828', e: '#1A1A2A', s: '#D8DEE8', G: '#3FBF4F', R: '#E8443A' },
      phase2: { A: '#FF3B30', e: '#FF3B30', m: '#1A2250' } },
    // 小5の ラスボス（v6.9）
    { id: 'boss-blizzard', area: 'tower5', name: 'ブリザードキング', shape: 'blizzard', base: 96, last: true,
      colors: { A: '#6FB8E8', B: '#2F64A8', C: '#A4CBE8', m: '#1F3F9A', W: '#EEF6FF', y: '#F2C14E', w: '#F4FBFF', e: '#38E0FF', r: '#7FF0FF', s: '#CFEFFF', k: '#122040', D: '#244F8F' },
      phase2: { A: '#D6C8FF', C: '#E6DCFF', e: '#FF3B30', r: '#C9A8FF', m: '#3A1F8A' } },
    // 小6の ラスボス（v11.0）：冥界の 神
    { id: 'boss-hades', area: 'tower6', name: 'メイオウハデス', shape: 'hades', base: 96, last: true,
      colors: { A: '#2A2438', B: '#12101F', C: '#A96BE0', D: '#8C9AC0', m: '#3A1E5A', y: '#F2C14E', w: '#E8E4F0', e: '#FF3B30', r: '#B04BFF', b: '#6FD8FF', k: '#0C0A14', p: '#FFC06A' },
      phase2: { r: '#4AD8FF', b: '#FFFFFF', e: '#FFD447', C: '#8FD3FF' } },
    // 小3の ラスボス（2026-09-19 まおう → デビルカイザーに 改名。id は そのまま）。HPを けずると 第2形態
    { id: 'boss-maou', area: 'tower', name: 'デビルカイザー', shape: 'maou', base: 96, last: true,
      colors: { A: '#B8323E', B: '#6E1622', C: '#7A2250', D: '#2B2140', m: '#3A1030', y: '#F2C14E', w: '#EFE3C8', r: '#FF3B30', e: '#C24BFF', s: '#4A3F5E', k: '#140C18', p: '#FFD0A0' },
      phase2: { A: '#E0283A', e: '#FF6A1A', r: '#FFD447', C: '#7A1A3A' } }
    /* </lastbosses> */
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
    // 息子さんの 4体は えらんだ すがた（そのまま／かっこよく・v14.5）。まだ 見て いない かげは いつもの 絵
    const skin = !opts.shadow && !opts.official && MQ.sonSkin ? MQ.sonSkin.pngFor(id) : null;
    if (skin) return MQ.blocks.imgBox(skin, { size: size, cls: cls, alt: e.name });
    const drawn = MQ.art && MQ.art.enemies && MQ.art.enemies[id];
    if (drawn && !opts.enrage) return MQ.blocks.imgBox(drawn, { size: size, cls: cls, alt: e.name });
    const box = MQ.blocks.box(shapes[e.shape] || [], paletteOf(e, opts.enrage), { size: size, cls: cls, raw: true, base: e.base });   // base＝64マスの ボス（v14.6）
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
  /* 小4では 理科と 社会が べつの エリアに なる（v4.6）。
     ザコの 顔ぶれは 小3の「理科社会の海」の ものを そのまま つかう。 */
  const AREA_ALIAS = { rika: 'rikashakai', shakai: 'rikashakai' };
  function poolArea(areaId) { return AREA_ALIAS[areaId] || areaId; }

  function pickIds(areaId, n, hard) {
    areaId = poolArea(areaId);
    /* any: true（にんじゃ）は どの エリアにも 出る。中ボス（mid）は ふつうの ザコには 出ない。
       カプセル専用（capsuleOnly）と 進化形（evoOnly）も ふつうの たたかいには 出ない（v9.0）。
       area を つけて いないので 1つめの しぼりでも 外れるが、はっきり 書いて おく */
    let pool = list.filter(function (e) { return (e.area === areaId || e.any) && !e.rare && !e.hidden && !e.mid && !e.capsuleOnly && !e.evoOnly; });
    if (!pool.length) pool = list.filter(function (e) { return !e.rare && !e.hidden && !e.mid && !e.capsuleOnly && !e.evoOnly && e.area; });
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

  /* 中ボス（v8.1）：その エリアの 中ボスを 1体。いなければ いちばん つよそうな ザコ（rank3） */
  function midIdsFor(areaId) {
    const a = poolArea(areaId);
    return list.filter(function (e) { return e.mid && e.area === a; }).map(function (e) { return e.id; });
  }
  function midFor(areaId) {
    const ids = midIdsFor(areaId);
    if (ids.length) return MQ.util.pick(ids);
    return pickIds(areaId, 1, 1)[0] || 'slime-green';
  }

  /* なかまを よぶ（v8.1）：同じ 系統（line）の べつの すがた。なければ null
     （ドラコが 呼ぶと ドラグーン／ドラゴニクス が とんでくる） */
  function mateFor(id) {
    const e = byId[id];
    if (!e || !e.line) return null;
    const mates = list.filter(function (x) { return x.line === e.line && x.id !== id && !x.rare && !x.hidden; });
    return mates.length ? MQ.util.pick(mates).id : null;
  }

  // そのエリアの レア敵（息子さんの モンスター）。写真から 作ったものも まざる
  function rareIdsFor(areaId) {
    areaId = poolArea(areaId);
    // 進化した すがた（evoOnly）は 出さない。出会うのは 1段階めだけ（v8.6）
    const own = list.filter(function (e) { return e.rare && e.area === areaId && !e.trio && !e.evoOnly; })
                    .map(function (e) { return e.id; });
    // 2・3段階めは 進化でしか 出ない（v8.2）
    const mine = customs.filter(function (e) { return e.area === areaId && !e.evoOnly; }).map(function (e) { return e.id; });
    return own.concat(mine);
  }

  function rareIdFor(areaId) {
    const ids = rareIdsFor(areaId);
    return ids.length ? MQ.util.pick(ids) : goldenId();
  }

  /* 3体まとめて 出てくる 組（trio）。むかしは ABC3きょうだいが 3体同時＝トリプルKO だったが、
     v13.21 で 1体の モンスターに なったので いまは 組が ない（いつも null）。しくみだけ のこす */
  function trioFor(areaId) {
    const ids = list.filter(function (e) { return e.trio && e.area === areaId; }).map(function (e) { return e.id; });
    return ids.length >= 3 ? ids : null;
  }

  /* エリアの ボス（v14.7）：エリアごとに 序盤（tier 1）・中盤（tier 2）・終盤（tier 3）の 3体。
     hard＝その エリアで 開いて いる ステージの 中の 位置（0＝さいしょ 1＝さいご・pickIds と 同じ）。
     hard を わたさない ときは 終盤（いままでの ボス）。ラスボス（last）は ここでは 出さない */
  function tierOf(hard) {
    if (hard == null || isNaN(hard)) return 3;
    return hard < 1 / 3 - 1e-9 ? 1 : hard < 2 / 3 - 1e-9 ? 2 : 3;
  }
  function bossesOf(areaId) {
    let got = bosses.filter(function (b) { return !b.last && b.area === areaId; });
    if (!got.length) { const alias = poolArea(areaId); got = bosses.filter(function (b) { return !b.last && b.area === alias; }); }
    return got;
  }
  function bossFor(areaId, hard) {
    const got = bossesOf(areaId);
    if (!got.length) return bosses[0];
    const want = tierOf(hard);
    let best = null;
    got.forEach(function (b) {
      const t = b.tier || 3;
      if (t === want) best = b;
      else if (!best && t === 3) best = b;
    });
    return best || got[0];
  }

  /* 写真から 作った モンスターを 敵として つかえるように する。
     プレイヤーを 切りかえるたびに 呼ぶ。 */
  /* じぶんの モンスターも 3段階に 育つ（v8.2）。
     png2 / png3（つの・かんむりを つけた 絵）が あれば、その子だけの 系統を 作る：
       〇〇 → つよい 〇〇（Lv10）→ でんせつの 〇〇（Lv20）
     2・3段階めは **ふつうの たたかいには 出ない**（evoOnly）。図かんには のる。
     むかしの セーブ（png だけ）は いままで どおり 1体の まま。 */
  function setCustom(monList) {
    customs.forEach(function (m) { delete byId[m.id]; });
    customs = [];
    (monList || []).forEach(function (m) {
      const line = 'my-' + m.id;
      const grown = !!(m.png2 && m.png3);
      customs.push({
        id: m.id, name: m.name, area: m.area, png: m.png, rare: true, by: 'photo', trace: !!m.trace,
        line: grown ? line : null, stage: grown ? 1 : null, evo: grown ? m.id + '-2' : null
      });
      if (!grown) return;
      customs.push({ id: m.id + '-2', name: 'つよい ' + m.name, area: m.area, png: m.png2, rare: true, by: 'photo', trace: !!m.trace,
                     line: line, stage: 2, evo: m.id + '-3', evoOnly: true });
      customs.push({ id: m.id + '-3', name: 'でんせつの ' + m.name, area: m.area, png: m.png3, rare: true, by: 'photo', trace: !!m.trace,
                     line: line, stage: 3, evoOnly: true });
    });
    customs.forEach(function (m) { byId[m.id] = m; });
  }

  return {
    list: list, bosses: bosses, shapes: shapes,
    get: get, node: node, shadowNode: shadowNode, dexList: dexList,
    pickIds: pickIds, goldenId: goldenId, rareId: goldenId, rareIdFor: rareIdFor, rareIdsFor: rareIdsFor,
    trioFor: trioFor, bossFor: bossFor, bossesOf: bossesOf, tierOf: tierOf, poolArea: poolArea, setCustom: setCustom, mateFor: mateFor,
    midFor: midFor, midIdsFor: midIdsFor, paletteOf: paletteOf,
    customs: function () { return customs; }
  };
})();
