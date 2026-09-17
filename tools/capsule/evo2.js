/* カプセル専用モンスター 第2弾 9系統 × 2・3段階め（18体）の 決めごと。
   書き方・きまりは evo.js と 同じ（1段階めの かたちを 変えない・光の つぶを まかない・
   「キング」「まおう」を つかわない）。headIndex は defs2.js の ならびの ばんごう。
   名前は enemies.js の 先客と かぶらない ことを grep ずみ（ライジンシシ・ギガゴーレムが 先客なので
   ライジン〜は 避けて アラシホーク に した）。 */

const L2 = 0.10, L3 = 0.18;

module.exports = [

  /* ---- ようかい隊 4系統 ---- */

  /* 1 カッパマル … 3段階めは 川の ぬしの 青い マント */
  { from: 'cap-kappa', steps: [
    { id: 'cap-kappa-2', name: 'カワタロウ', stage: 2, lift: L2,
      spec: { extras: ['shoulder', 'belt'] } },
    { id: 'cap-kappa-3', name: 'カワノヌシ', stage: 3, lift: L3, m: '#1f5fae',
      headIndex: 0,
      spec: { back: 'capeLong', crown: 'tiara', extras: ['belt'] } }
  ] },

  /* 2 カラカサン … 3段階めは 大名の かざり羽 */
  { from: 'cap-kasa', steps: [
    { id: 'cap-kasa-2', name: 'カサドウジ', stage: 2, lift: L2,
      spec: { extras: ['belt'] } },   // collar は 一つ目に かぶった
    { id: 'cap-kasa-3', name: 'カサダイミョウ', stage: 3, lift: L3,
      headIndex: 1,
      spec: { crown: 'plume', extras: ['belt', 'bracer'] } }
  ] },

  /* 3 チョウチンボウ … 3段階めは ほのおの かんむりと 光の 円ばん */
  { from: 'cap-chochin', steps: [
    { id: 'cap-chochin-2', name: 'オニビボウ', stage: 2, lift: L2,
      spec: { extras: ['belt'] } },
    { id: 'cap-chochin-3', name: 'オオチョウチン', stage: 3, lift: L3,
      headIndex: 2,
      spec: { crown: 'flame', backs: ['disc'], extras: ['belt'] } }
  ] },

  /* 4 コンギツネ … 2段階め＝ぎんいろ・3段階め＝白金の キュウビ（光の 円ばん） */
  { from: 'cap-kitsune', steps: [
    { id: 'cap-kitsune-2', name: 'ギンギツネ', stage: 2,
      cx: { A: '#c8ccd8', B: '#8a90a5', C: '#f5f7fc' },
      spec: { extras: ['collar'] } },
    { id: 'cap-kitsune-3', name: 'キュウビマル', stage: 3,
      cx: { A: '#f5ead0', B: '#d8b878', C: '#ffffff' },
      headIndex: 8,
      spec: { crown: 'tiara', backs: ['disc'], extras: ['collar'] } }
  ] },

  /* ---- メカ生きもの 3系統 ---- */

  /* 5 メカウルフ … 3段階めは 金の つのと トゲ */
  { from: 'cap-mwolf', steps: [
    { id: 'cap-mwolf-2', name: 'ギガウルフ', stage: 2, lift: L2,
      spec: { extras: ['spikes', 'belt'] } },
    { id: 'cap-mwolf-3', name: 'テツロウガ', stage: 3, lift: L3,
      headIndex: 4,
      spec: { crown: 'horns', extras: ['shoulder', 'spikes'] } }
  ] },

  /* 6 メカホーク … 3段階めは あらしの 円ばんと 星 */
  { from: 'cap-mhawk', steps: [
    { id: 'cap-mhawk-2', name: 'ジェットホーク', stage: 2, lift: L2,
      spec: { extras: ['belt'] } },
    { id: 'cap-mhawk-3', name: 'アラシホーク', stage: 3, lift: L3,
      headIndex: 12,
      spec: { crown: 'star', backs: ['disc'], extras: ['belt'] } }
  ] },

  /* 7 メカレオン … 3段階めは まぼろし色（むらさき）に へんしん */
  { from: 'cap-mleon', steps: [
    { id: 'cap-mleon-2', name: 'ギガレオン', stage: 2, lift: L2,
      spec: { extras: ['spikes'] } },
    { id: 'cap-mleon-3', name: 'マボロシレオン', stage: 3,
      cx: { A: '#8a6ae0', B: '#5a3fa0', C: '#e0d4ff' },
      headIndex: 1,
      spec: { crown: 'tiara', extras: ['spikes'] } }
  ] },

  /* ---- でんせつの どうぶつ 2系統 ---- */

  /* 8 ユニコルン … 3段階めは 天馬（星の かんむりと 光の 円ばん） */
  { from: 'cap-unicorn', steps: [
    { id: 'cap-unicorn-2', name: 'シャイニコルン', stage: 2, lift: L2,
      spec: { extras: ['collar', 'bracer'] } },
    { id: 'cap-unicorn-3', name: 'テンマコルン', stage: 3, lift: L3,
      headIndex: 3,
      spec: { crown: 'star', backs: ['disc'], extras: ['collar'] } }
  ] },

  /* 9 ケルベロン … 3段階めは ほのおの かんむりと くらい マント */
  { from: 'cap-cerberus', steps: [
    { id: 'cap-cerberus-2', name: 'ケルベガード', stage: 2, lift: L2,
      spec: { extras: ['collar', 'spikes'] } },
    { id: 'cap-cerberus-3', name: 'ケルベロード', stage: 3, lift: L3, m: '#2a1430',
      headIndex: 0,
      spec: { back: 'capeLong', crown: 'flame', extras: ['collar', 'spikes'] } }
  ] }
];
