/* 44の 系統と 王さま形（3段階め）の 決めごと（v8.1）
   top   … 2段階め（この 形の 中で いちばん つよそうな 1体）。ほかの 色は ぜんぶ 1段階め
   king  … 3段階め（新しく つくる 1体）。spec は kit.js の 部品の 組み合わせ
   色キー m＝マント／g2＝葉っぱ など の さし色 */
module.exports = [
  /* ================= 算数の 山 ================= */
  { shape: 'crystal', top: 'crystal-pink', king: {
    id: 'crystal-king', name: 'ジュエルオウ', area: 'sansu',
    colors: { A: '#FF7A9C', B: '#C4365E' },
    spec: { crown: 'star', back: 'aura', hand: 'orb', extras: ['chest'], grow: 2 } } },

  { shape: 'dice', top: 'dice-gold', king: {
    id: 'dice-king', name: 'ダイスロード', area: 'sansu',
    colors: { A: '#FFD166', B: '#C98F1B', m: '#2A2A6E' },
    spec: { crown: 'spike5', back: 'cape', hand: 'scepter', extras: ['belt'] } } },

  { shape: 'eyeball', top: 'eyeball-red', king: {
    id: 'eyeball-king', name: 'メダマダイオウ', area: 'sansu',
    colors: { A: '#E8443A', B: '#8A1C16' },
    spec: { crown: 'halo', back: 'aura', hand: 'none', extras: ['fangs'], grow: 3 } } },

  { shape: 'golem', top: 'golem-lava', king: {
    id: 'golem-king', name: 'ガンセキオウ', area: 'sansu',
    colors: { A: '#E8642C', B: '#7A2E0E', m: '#1F4FA8' },
    spec: { crown: 'helm', back: 'cape', hand: 'sword', extras: ['shoulder'] } } },

  { shape: 'lizard', top: 'lizard-fire', king: {
    id: 'lizard-king', name: 'サラマンドロ', area: 'sansu',
    colors: { A: '#F26B2B', B: '#FFD27A', m: '#7A1F1F' },
    spec: { crown: 'flame', back: 'capeTall', hand: 'trident', extras: [] } } },

  { shape: 'mole', top: 'mole', king: {
    id: 'mole-king', name: 'ドリルオウ', area: 'sansu',
    colors: { A: '#8A5A3C', B: '#C9A06B' },
    spec: { crown: 'spike3', back: 'none', hand: 'scepter', extras: ['shoulder'], grow: 2 } } },

  { shape: 'robot', top: 'robot-red', king: {
    id: 'robot-king', name: 'メカテイオウ', area: 'sansu',
    colors: { A: '#FF8A5A', B: '#7A2E0E', m: '#B01840' },
    spec: { crown: 'antenna', back: 'cape', hand: 'sword', extras: ['chest'] } } },

  { shape: 'scorpion', top: 'scorpion-black', king: {
    id: 'scorpion-king', name: 'ドクバリロード', area: 'sansu',
    colors: { A: '#4A4A5E', B: '#26263A' },
    spec: { crown: 'horns', back: 'none', hand: 'staff', extras: ['spikes'] } } },

  { shape: 'skull', top: 'skull-gold', king: {
    id: 'skull-king', name: 'ホネノミカド', area: 'sansu',
    colors: { A: '#FFD166', B: '#C98F1B', m: '#3A1F5A' },
    spec: { crown: 'tiara', back: 'capeTall', hand: 'staff', extras: ['beard'] } } },

  { shape: 'snake', top: 'snake-purple', king: {
    id: 'snake-king', name: 'ジャドクオウ', area: 'sansu',
    colors: { A: '#8A4FD1', B: '#4A2380' },
    spec: { crown: 'spike3', back: 'none', hand: 'none', extras: ['fangs', 'chest'], grow: 2 } } },

  { shape: 'turtle', top: 'turtle-lava', king: {
    id: 'turtle-king', name: 'コウラダイオウ', area: 'sansu',
    colors: { A: '#7A2E0E', B: '#E8642C', m: '#3E6A4A', g2: '#7ED957' },
    spec: { crown: 'laurel', back: 'cape', hand: 'none', extras: ['belt'] } } },

  { shape: 'wolf', top: 'wolf-dark', king: {
    id: 'wolf-king', name: 'ガルムオウ', area: 'sansu',
    colors: { A: '#5A4A80', B: '#C9BCE6', m: '#B01840' },
    spec: { crown: 'horns', back: 'cape', hand: 'none', extras: ['fangs'] } } },

  /* ================= 国語の 森 ================= */
  { shape: 'bat', top: 'bat-purple', king: {
    id: 'bat-king', name: 'ヨルノヌシ', area: 'kokugo',
    colors: { A: '#8A4FD1', B: '#4A2380' },
    spec: { crown: 'spike3', back: 'none', hand: 'none', extras: ['fangs'] } } },

  { shape: 'bee', top: 'bee-red', king: {
    id: 'bee-king', name: 'ハチノジョオウ', area: 'kokugo',
    colors: { A: '#FF6B5A', B: '#A83224' },
    spec: { crown: 'tiara', back: 'wingsBug', hand: 'scepter', extras: [] } } },

  { shape: 'butterfly', top: 'butterfly-sky', king: {
    id: 'butterfly-king', name: 'ハネノミカド', area: 'kokugo',
    colors: { A: '#8FD3FF', B: '#4FA3E0' },
    spec: { crown: 'feather', back: 'aura', hand: 'none', extras: ['chest'] } } },

  { shape: 'fox', top: 'fox-white', king: {
    id: 'fox-king', name: 'ヨウコオウ', area: 'kokugo',
    colors: { A: '#E6ECF5', B: '#FFFFFF', m: '#C2185B' },
    spec: { crown: 'flame', back: 'capeTall', hand: 'none', extras: ['fangs'] } } },

  { shape: 'frog', top: 'frog-blue', king: {
    id: 'frog-king', name: 'カエルダイオウ', area: 'kokugo',
    colors: { A: '#4F8CFF', B: '#B3D9FF', g2: '#7ED957' },
    spec: { crown: 'laurel', back: 'none', hand: 'staff', extras: ['belt'], grow: 2 } } },

  { shape: 'hedgehog', top: 'hedgehog-blue', king: {
    id: 'hedgehog-king', name: 'トゲトゲロード', area: 'kokugo',
    colors: { A: '#E6ECF5', B: '#4F6FB8' },
    spec: { crown: 'spike5', back: 'none', hand: 'none', extras: ['spikes', 'chest'] } } },

  { shape: 'mushroom', top: 'mush-purple', king: {
    id: 'mushroom-king', name: 'キノコダイオウ', area: 'kokugo',
    colors: { A: '#8A4FD1', B: '#FFD166', m: '#1F7A4F' },
    spec: { crown: 'tiara', back: 'cape', hand: 'staff', extras: [] } } },

  { shape: 'owl', top: 'owl-white', king: {
    id: 'owl-king', name: 'モリノケンジャ', area: 'kokugo',
    colors: { A: '#EDEEF5', B: '#C9CFDB', g2: '#7ED957' },
    spec: { crown: 'laurel', back: 'wingsFeather', hand: 'staff', extras: ['beard'] } } },

  { shape: 'slime', top: 'slime-red', king: {
    id: 'slime-king', name: '王さまスライム', area: 'kokugo',
    colors: { A: '#FF5A5A', B: '#A82424', m: '#7A1FA8' },
    spec: { crown: 'spike3', back: 'cape', hand: 'scepter', extras: ['chest'] } } },

  { shape: 'snail', top: 'snail-purple', king: {
    id: 'snail-king', name: 'デンデンミカド', area: 'kokugo',
    colors: { A: '#8A4FD1', B: '#4A2380', m: '#F2A24B' },
    spec: { crown: 'spike3', back: 'cape', hand: 'none', extras: ['chest'] } } },

  { shape: 'spider', top: 'spider-black', king: {
    id: 'spider-king', name: 'アミノヌシ', area: 'kokugo',
    colors: { A: '#3A3A4A', B: '#1C1C28' },
    spec: { crown: 'spike3', back: 'aura', hand: 'none', extras: ['fangs', 'spikes'] } } },

  { shape: 'tree', top: 'tree-autumn', king: {
    id: 'tree-king', name: 'タイジュオウ', area: 'kokugo',
    colors: { A: '#E8853A', B: '#B34E14', g2: '#7ED957' },
    spec: { crown: 'laurel', back: 'none', hand: 'staff', extras: ['belt'], grow: 3 } } },

  /* ================= 理科社会の 海 ================= */
  { shape: 'angler', top: 'angler-black', king: {
    id: 'angler-king', name: 'シンカイノヌシ', area: 'rikashakai',
    colors: { A: '#2B2B3A', B: '#4A4A5E' },
    spec: { crown: 'star', back: 'aura', hand: 'none', extras: ['fangs'] } } },

  { shape: 'crab', top: 'crab-green', king: {
    id: 'crab-king', name: 'ハサミダイオウ', area: 'rikashakai',
    colors: { A: '#3E9A6B', B: '#1E5A3C' },
    spec: { crown: 'spike3', back: 'none', hand: 'trident', extras: ['shoulder'], grow: 2 } } },

  { shape: 'fish', top: 'fish-red', king: {
    id: 'fish-king', name: 'サカナダイオウ', area: 'rikashakai',
    colors: { A: '#FF6B5A', B: '#FFC9A8' },
    spec: { crown: 'tiara', back: 'aura', hand: 'trident', extras: [] } } },

  { shape: 'ghost', top: 'ghost-white', king: {
    id: 'ghost-king', name: 'ユウレイロード', area: 'rikashakai',
    colors: { A: '#EDEEF5', B: '#B9BCCF', m: '#4A3A7A' },
    spec: { crown: 'halo', back: 'capeTall', hand: 'staff', extras: [] } } },

  { shape: 'jelly', top: 'jelly-elec', king: {
    id: 'jelly-king', name: 'デンキノヌシ', area: 'rikashakai',
    colors: { A: '#FFD166', B: '#C98F1B' },
    spec: { crown: 'antenna', back: 'aura', hand: 'none', extras: ['chest'] } } },

  { shape: 'penguin', top: 'penguin-ice', king: {
    id: 'penguin-king', name: 'コオリノテイオウ', area: 'rikashakai',
    colors: { A: '#8FD3FF', B: '#4FA3E0', m: '#1F4FA8' },
    spec: { crown: 'ice', back: 'cape', hand: 'scepter', extras: [] } } },

  { shape: 'puffer', top: 'puffer-purple', king: {
    id: 'puffer-king', name: 'フクラミオウ', area: 'rikashakai',
    colors: { A: '#8A4FD1', B: '#4A2380' },
    spec: { crown: 'spike5', back: 'none', hand: 'none', extras: ['spikes', 'fangs'], grow: 3 } } },

  { shape: 'seahorse', top: 'seahorse-gold', king: {
    id: 'seahorse-king', name: 'タツノミカド', area: 'rikashakai',
    colors: { A: '#FFD166', B: '#FFF0B8' },
    spec: { crown: 'horns', back: 'wingsBug', hand: 'none', extras: ['chest'] } } },

  { shape: 'shark', top: 'shark-gray', king: {
    id: 'shark-king', name: 'キバノヌシ', area: 'rikashakai',
    colors: { A: '#8FA6C0', B: '#5A6A80' },
    spec: { crown: 'spike3', back: 'none', hand: 'none', extras: ['fangs', 'spikes'], grow: 2 } } },

  { shape: 'star', top: 'star-gold', king: {
    id: 'star-king', name: 'ホシノオウ', area: 'rikashakai',
    colors: { A: '#FFD166', B: '#C98F1B' },
    spec: { crown: 'star', back: 'aura', hand: 'none', extras: ['chest'] } } },

  { shape: 'tako', top: 'tako-purple', king: {
    id: 'tako-king', name: 'タコダイオウ', area: 'rikashakai',
    colors: { A: '#8A4FD1', B: '#4A2380' },
    spec: { crown: 'tiara', back: 'none', hand: 'trident', extras: ['belt'], grow: 2 } } },

  /* ================= 英語の 空 ================= */
  { shape: 'balloon', top: 'balloon-sky', king: {
    id: 'balloon-king', name: 'フワフワミカド', area: 'eigo',
    colors: { A: '#8FD3FF', B: '#4FA3E0' },
    spec: { crown: 'halo', back: 'aura', hand: 'none', extras: ['chest'] } } },

  { shape: 'bird', top: 'bird-blue', king: {
    id: 'bird-king', name: 'ソラノテイオウ', area: 'eigo',
    colors: { A: '#4F8CFF', B: '#1F4FB0' },
    spec: { crown: 'feather', back: 'wingsFeather', hand: 'none', extras: ['chest'] } } },

  { shape: 'cloud', top: 'cloud-thunder', king: {
    id: 'cloud-king', name: 'カミナリオウ', area: 'eigo',
    colors: { A: '#6B7C9C', B: '#3A4558' },
    spec: { crown: 'star', back: 'aura', hand: 'trident', extras: [] } } },

  { shape: 'kite', top: 'kite-blue', king: {
    id: 'kite-king', name: 'カゼノロード', area: 'eigo',
    colors: { A: '#4F8CFF', B: '#FFD166', m: '#E8853A' },
    spec: { crown: 'feather', back: 'capeTall', hand: 'none', extras: [] } } },

  { shape: 'moon', top: 'moon', king: {
    id: 'moon-king', name: 'ツキノミカド', area: 'eigo',
    colors: { A: '#FFE08A', B: '#E0B15C' },
    spec: { crown: 'tiara', back: 'aura', hand: 'staff', extras: [] } } },

  { shape: 'rocket', top: 'rocket-blue', king: {
    id: 'rocket-king', name: 'ロケットオウ', area: 'eigo',
    colors: { A: '#B3D9FF', B: '#8FB8E8' },
    spec: { crown: 'antenna', back: 'none', hand: 'none', extras: ['shoulder', 'chest'], grow: 2 } } },

  { shape: 'sun', top: 'sun', king: {
    id: 'sun-king', name: 'タイヨウオウ', area: 'eigo',
    colors: { A: '#FFD166', B: '#F2A24B' },
    spec: { crown: 'flame', back: 'aura', hand: 'scepter', extras: [] } } },

  { shape: 'tornado', top: 'tornado-storm', king: {
    id: 'tornado-king', name: 'アラシノヌシ', area: 'eigo',
    colors: { A: '#6B7C9C', B: '#4A5568' },
    spec: { crown: 'horns', back: 'aura', hand: 'staff', extras: [] } } },

  { shape: 'ufo', top: 'ufo-dark', king: {
    id: 'ufo-king', name: 'ユーフォオウ', area: 'eigo',
    colors: { A: '#FF6B5A', B: '#4A4A5E' },
    spec: { crown: 'antenna', back: 'aura', hand: 'none', extras: ['chest'] } } }
];
