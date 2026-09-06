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

    /* ABC3きょうだい … 英語の空に 3体まとめて 出てくる */
    { id: 'abc-a', name: 'エー', shape: 'letterA', area: 'eigo', rare: true, by: 'son', line: 'abc-a', stage: 1, evo: 'abc-a-2', trio: 'abc',
      colors: { A: '#E8443A', B: '#A82424', w: '#FFFFFF', k: '#12121A' } },
    { id: 'abc-b', name: 'ビー', shape: 'letterB', area: 'eigo', rare: true, by: 'son', line: 'abc-b', stage: 1, evo: 'abc-b-2', trio: 'abc',
      colors: { A: '#4CAF50', B: '#2E7D32', w: '#FFFFFF', k: '#12121A' } },
    { id: 'abc-c', name: 'シー', shape: 'letterC', area: 'eigo', rare: true, by: 'son', line: 'abc-c', stage: 1, evo: 'abc-c-2', trio: 'abc',
      colors: { A: '#F2C14E', B: '#B8860B', w: '#FFFFFF', k: '#12121A' } },

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
    { id: 'abc-a-2', name: 'エーナイト', shape: 'letterA2', area: 'eigo', rare: true, by: 'son', rank: 2,
      line: 'abc-a', stage: 2, evo: 'abc-a-3', evoOnly: true,
      colors: { A: '#D6392E', B: '#8A1410' } },
    { id: 'abc-a-3', name: 'エーロード', shape: 'letterA3', area: 'eigo', rare: true, by: 'son', rank: 3,
      line: 'abc-a', stage: 3, evoOnly: true,
      colors: { A: '#FF5A4A', B: '#A82424' } },
    { id: 'abc-b-2', name: 'ビーナイト', shape: 'letterB2', area: 'eigo', rare: true, by: 'son', rank: 2,
      line: 'abc-b', stage: 2, evo: 'abc-b-3', evoOnly: true,
      colors: { A: '#3E9A44', B: '#1F5E24' } },
    { id: 'abc-b-3', name: 'ビーロード', shape: 'letterB3', area: 'eigo', rare: true, by: 'son', rank: 3,
      line: 'abc-b', stage: 3, evoOnly: true,
      colors: { A: '#5FD16A', B: '#2E7D32' } },
    { id: 'abc-c-2', name: 'シーナイト', shape: 'letterC2', area: 'eigo', rare: true, by: 'son', rank: 2,
      line: 'abc-c', stage: 2, evo: 'abc-c-3', evoOnly: true,
      colors: { A: '#E0B03A', B: '#8A6410' } },
    { id: 'abc-c-3', name: 'シーロード', shape: 'letterC3', area: 'eigo', rare: true, by: 'son', rank: 3,
      line: 'abc-c', stage: 3, evoOnly: true,
      colors: { A: '#FFD166', B: '#B8860B', g2: '#4CAF50' } },
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
      colors: { p: '#A6753F', P: '#7A5326', y: '#F2C14E' } }
  ];

  // ボス（エリアごとに 1体）
  const bosses = [
    { id: 'boss-dragon', area: 'sansu',      name: 'ナンバードラゴン', shape: 'dragon',    colors: { A: '#4F8CFF', B: '#FFD166' } },
    { id: 'boss-oni',    area: 'kokugo',     name: 'モジオニ',        shape: 'oni',       colors: { A: '#FF5A5A', C: '#2B2B3A' } },
    { id: 'boss-knight', area: 'rikashakai', name: 'メカナイト',      shape: 'knight',    colors: { A: '#8A9BB8', B: '#12121A' } },
    { id: 'boss-slime',  area: 'eigo',       name: 'キングスライム',   shape: 'kingslime', colors: { A: '#FFA33A', B: '#B35F00' } },
    /* 小4で 理科と 社会が べつの エリアに なった（v4.6）。
       理科は メカナイト（rikashakai）を そのまま つかい、社会に この ボスを 足した */
    { id: 'boss-titan',  area: 'shakai',     name: 'グランドタイタン', shape: 'titan',     colors: { A: '#8A7B63', B: '#4E4436' } },
    /* 小4の ラスボス（v4.8）。塔は 学年ごとに あるので、
       どの ラスボスが 出るかは world3.js の towerStage の bossId が 決める。 */
    { id: 'boss-dark', area: 'tower4', name: 'ダークロード', shape: 'dark', last: true,
      colors: { A: '#4A3A7A', B: '#241844', r: '#C24BFF', y: '#F2C14E', w: '#E8E4FF' },
      phase2: { A: '#7A3AA8', B: '#3C1466', r: '#FF3B30', y: '#FFF3B8', w: '#FFFFFF' } },
    /* 小1・小2の ラスボス（v6.4）。名前は ひらがな・カタカナだけ */
    { id: 'boss-obake', area: 'tower1', name: 'おばけキング', shape: 'obakeking', last: true,
      colors: { A: '#F2EEFF', B: '#B9A9E6', y: '#F2C14E', r: '#C24BFF', e: '#2A2440', w: '#FFFFFF', k: '#2A2440' },
      phase2: { A: '#E2D0FF', B: '#8E6AD8', y: '#FFE08A', r: '#FF3B30', e: '#FF3B30', w: '#FFFFFF', k: '#2A2440' } },
    { id: 'boss-kaizoku', area: 'tower2', name: 'かいぞくキャプテン', shape: 'kaizoku', last: true,
      colors: { A: '#C42B2B', B: '#3A2418', s: '#F5C9A0', y: '#F2C14E', k: '#181828', w: '#F4F4F4', e: '#1A1A2A' },
      phase2: { A: '#FF3B30', B: '#2A1810', s: '#F5C9A0', y: '#FFE08A', k: '#181828', w: '#FFFFFF', e: '#FF3B30' } },
    /* 小5の ラスボス（v6.9） */
    { id: 'boss-blizzard', area: 'tower5', name: 'ブリザードキング', shape: 'blizzard', last: true,
      colors: { A: '#BFE6FF', B: '#1F4FA8', C: '#7FC4F2', y: '#F2C14E', w: '#F4FBFF', e: '#38E0FF', k: '#122040' },
      phase2: { A: '#D6C8FF', B: '#3A1F8A', C: '#A48CF2', y: '#FFE08A', w: '#FFFFFF', e: '#FF3B30', k: '#122040' } },
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
  /* 小4では 理科と 社会が べつの エリアに なる（v4.6）。
     ザコの 顔ぶれは 小3の「理科社会の海」の ものを そのまま つかう。 */
  const AREA_ALIAS = { rika: 'rikashakai', shakai: 'rikashakai' };
  function poolArea(areaId) { return AREA_ALIAS[areaId] || areaId; }

  function pickIds(areaId, n, hard) {
    areaId = poolArea(areaId);
    // any: true（にんじゃ）は どの エリアにも 出る。中ボス（mid）は ふつうの ザコには 出ない
    let pool = list.filter(function (e) { return (e.area === areaId || e.any) && !e.rare && !e.hidden && !e.mid; });
    if (!pool.length) pool = list.filter(function (e) { return !e.rare && !e.hidden && !e.mid && e.area; });
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

  // 3体まとめて 出てくる 組（いまは ABC3きょうだいだけ）
  function trioFor(areaId) {
    const ids = list.filter(function (e) { return e.trio && e.area === areaId; }).map(function (e) { return e.id; });
    return ids.length >= 3 ? ids : null;
  }

  function bossFor(areaId) {
    for (let i = 0; i < bosses.length; i++) if (bosses[i].area === areaId) return bosses[i];
    const alias = poolArea(areaId);
    for (let i = 0; i < bosses.length; i++) if (bosses[i].area === alias) return bosses[i];
    return bosses[0];
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
        id: m.id, name: m.name, area: m.area, png: m.png, rare: true, by: 'photo',
        line: grown ? line : null, stage: grown ? 1 : null, evo: grown ? m.id + '-2' : null
      });
      if (!grown) return;
      customs.push({ id: m.id + '-2', name: 'つよい ' + m.name, area: m.area, png: m.png2, rare: true, by: 'photo',
                     line: line, stage: 2, evo: m.id + '-3', evoOnly: true });
      customs.push({ id: m.id + '-3', name: 'でんせつの ' + m.name, area: m.area, png: m.png3, rare: true, by: 'photo',
                     line: line, stage: 3, evoOnly: true });
    });
    customs.forEach(function (m) { byId[m.id] = m; });
  }

  return {
    list: list, bosses: bosses, shapes: shapes,
    get: get, node: node, shadowNode: shadowNode, dexList: dexList,
    pickIds: pickIds, goldenId: goldenId, rareId: goldenId, rareIdFor: rareIdFor, rareIdsFor: rareIdsFor,
    trioFor: trioFor, bossFor: bossFor, poolArea: poolArea, setCustom: setCustom, mateFor: mateFor,
    midFor: midFor, midIdsFor: midIdsFor,
    customs: function () { return customs; }
  };
})();
