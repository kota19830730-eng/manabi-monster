/* ---------------------------------------------------------
   絵の差しかえ（息子さんの絵を 使うとき）

   1. 絵を かいて、スマホで写真にとる（背景が白いと きれいです）
   2. PNG にして assets/art/ フォルダに入れる（例：assets/art/hero.png）
   3. 下の '' の中に ファイルの場所を書く

   例：
     hero: 'assets/art/hero.png',
     enemies: {
       'slime-green': 'assets/art/slime.png',
       'boss-dragon': 'assets/art/dragon.png'
     }

   ・敵の id は js/content/enemies.js の list / bosses を見てください
   ・絵は 正方形に近いと きれいに おさまります（大きさは 何でもOK）
   ・書かなかったものは ドット絵のまま です
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

MQ.art = {
  hero: '',
  enemies: {
  }
};
