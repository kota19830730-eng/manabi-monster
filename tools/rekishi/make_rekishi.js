/* out/ の 写真を アプリに 入れ、js/content/rekishi.js を 作る */
const { execFileSync } = require('child_process');
const fs = require('fs');
const SP = 'C:/Users/win11/AppData/Local/Temp/claude/c--Users-win11-OneDrive-----------------/452111fa-cd32-4fab-8390-61c2dbd86309/scratchpad/';
const APP = 'c:/Users/win11/OneDrive/デスクトップ/こどもアプリ作業場/manabi-quest/';
const DEST = APP + 'assets/rekishi/';
const UA = 'manabi-monster/1.0 (childrens learning app; kota19830730@gmail.com)';

fs.mkdirSync(DEST, { recursive: true });

/* 画面に 出す 名前と、どんな ものか の ひとこと */
const INFO = {
  shotoku:   ['聖徳太子', 'ひと', '天皇を 中心と する 国づくりを すすめた'],
  tenji:     ['中大兄皇子', 'ひと', '大化の 改新を すすめた（のちの 天智天皇）'],
  shomu:     ['聖武天皇', 'ひと', '奈良に 大仏を 作らせた'],
  kanmu:     ['桓武天皇', 'ひと', '都を 平安京に うつした'],
  michinaga: ['藤原道長', 'ひと', '天皇の きさきに むすめを 入れて 力を にぎった'],
  murasaki:  ['紫式部', 'ひと', '「源氏物語」を 書いた'],
  sei:       ['清少納言', 'ひと', '「まくらのそうし」を 書いた'],
  kiyomori:  ['平清盛', 'ひと', '武士で はじめて 太政大臣に なった'],
  yoritomo:  ['源頼朝', 'ひと', '鎌倉に ばくふを ひらいた'],
  takauji:   ['足利尊氏', 'ひと', '室町ばくふを ひらいた'],
  yoshimitsu:['足利義満', 'ひと', '金閣を 建てた'],
  yoshimasa: ['足利義政', 'ひと', '銀閣を 建てた'],
  nobunaga:  ['織田信長', 'ひと', '鉄砲を 使い 楽市楽座を おこなった'],
  hideyoshi: ['豊臣秀吉', 'ひと', '検地と 刀がりを おこなった'],
  ieyasu:    ['徳川家康', 'ひと', '江戸ばくふを ひらいた'],
  genpaku:   ['杉田玄白', 'ひと', '「解体新書」を ほんやくした'],
  norinaga:  ['本居宣長', 'ひと', '「古事記伝」を 書いた'],
  tadataka:  ['伊能忠敬', 'ひと', '歩いて 日本の 地図を 作った'],
  hiroshige: ['歌川広重', 'ひと', '「東海道五十三次」を えがいた'],
  itagaki:   ['板垣退助', 'ひと', '自由民権運動を すすめた'],
  hirobumi:  ['伊藤博文', 'ひと', 'はじめての 内閣総理大臣'],

  tateana:   ['たて穴住居', 'もの', '縄文・弥生の ころの すまい'],
  takayuka:  ['高床倉庫', 'もの', '弥生時代に 米を たくわえた'],
  jomondoki: ['縄文土器', 'もの', 'なわの 文様が ついて いる'],
  dotaku:    ['銅たく', 'もの', '弥生時代の 青銅器'],
  kango:     ['ほりや さく', 'もの', 'むらの 争いに そなえた（吉野ヶ里）'],
  kofun:     ['古ふん', 'もの', '王や 有力者の はか'],
  horyuji:   ['法隆寺', 'もの', '世界で いちばん 古い 木造建築'],
  heijo:     ['平城京', 'もの', '奈良時代の 都'],
  shosoin:   ['正倉院', 'もの', '聖武天皇の 宝物が おさめられて いる'],
  todaiji:   ['東大寺の 大仏', 'もの', '聖武天皇が 作らせた'],
  manyoshu:  ['万葉集', 'もの', '奈良時代の 歌集'],
  heian:     ['平安京', 'もの', '平安時代の 都（模型）'],
  kana:      ['かな文字', 'もの', 'かな文字で 物語が 書かれた'],
  shinden:   ['しんでん造', 'もの', '平安時代の 貴族の やしき'],
  kinkaku:   ['金閣', 'もの', '足利義満が 建てた'],
  ginkaku:   ['銀閣', 'もの', '足利義政が 建てた'],
  shoin:     ['たたみと しょうじ', 'もの', '書院造＝いまの 和室の もと'],
  noh:       ['能', 'もの', '室町時代に さかんに なった'],
  terakoya:  ['寺子屋', 'もの', '江戸時代に 町人の 子が 学んだ'],
  tokaido:   ['東海道', 'もの', '江戸と 京都を むすぶ 道'],
  kaitai:    ['解体新書', 'もの', 'オランダの 医学書を ほんやくした'],
  inozu:     ['伊能図', 'もの', '伊能忠敬が 作った 日本地図'],
  tomioka:   ['富岡製糸場', 'もの', '明治の 官営工場'],
  tetsudo:   ['鉄道', 'もの', '明治に 新橋〜横浜で 開通'],
  kenpo:     ['大日本帝国憲法', 'もの', '1889年に 発布された'],
  genbaku:   ['原爆ドーム', 'もの', '広島に のこる 戦争の あと']
};

/* あつめた ときの ライセンス情報を ひとまとめに */
const meta = {};
['list.json', 'mono.json', 'cc.json'].forEach(function (f) {
  let rows = [];
  try { rows = JSON.parse(fs.readFileSync(SP + 'jin/' + f, 'utf8')); } catch (e) { }
  rows.forEach(function (r) { if (r && r.id && r.file) meta[r.id] = r; });
});

/* 差しかえた ぶんは Commons に 問い合わせて 取り直す */
const REFETCH = {
  nobunaga: 'Odanobunaga.jpg',
  ieyasu: 'Tokugawa Ieyasu2.JPG',
  todaiji: 'Todaiji Daibutsu.jpg',
  kofun: 'NintokuTomb Aerial photograph 2007.jpg',
  kango: 'Yoshinogari Yayoi Village a004.jpg'
};
Object.keys(REFETCH).forEach(function (id) {
  const file = REFETCH[id];
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&titles=' +
    encodeURIComponent('File:' + file) + '&prop=imageinfo&iiprop=extmetadata&format=json';
  try {
    const j = JSON.parse(execFileSync('curl', ['-s', '--max-time', '30', '-A', UA, url], { maxBuffer: 1 << 26 }).toString());
    const p = (j.query && j.query.pages) || {};
    let info = null;
    Object.keys(p).forEach(function (k) { info = (p[k].imageinfo || [])[0]; });
    const m = (info && info.extmetadata) || {};
    meta[id] = {
      id: id, file: file,
      lic: String((m.LicenseShortName || {}).value || '').replace(/<[^>]*>/g, ''),
      artist: String((m.Artist || {}).value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 70)
    };
  } catch (e) { }
});

/* 写真を アプリへ */
let n = 0, bytes = 0;
Object.keys(INFO).forEach(function (id) {
  const src = SP + 'out/' + id + '.jpg';
  if (!fs.existsSync(src)) { console.log('NG 写真が ない: ' + id); return; }
  const b = fs.readFileSync(src);
  fs.writeFileSync(DEST + id + '.jpg', b);
  n++; bytes += b.length;
});
console.log('写真 ' + n + 'まい / ' + Math.round(bytes / 1024) + 'KB → assets/rekishi/');

/* js/content/rekishi.js */
const lines = [];
lines.push('/* ---------------------------------------------------------');
lines.push('   歴史の 写真（v14.22）');
lines.push('');
lines.push('   ユーザー「社会も 偉人の 写真ぐらいなら いいんじゃないの？」「道具とか 物も」。');
lines.push('   **問題には つけない。答えた あとに 出す。**');
lines.push('   「十七条の 憲法を 定めたのは？」に 顔を 先に 出すと 答えが ばれる ため');
lines.push('   （v4.9 の きまり）。答えが 出た あとなら ばれず、人物や ものが 頭に のこる。');
lines.push('');
lines.push('   写真は Wikimedia Commons の パブリックドメイン／CC の もの。');
lines.push('   **作者と ライセンスは `CREDITS` に ひかえて おうちの人ページに 出す**（CC の 条件）。');
lines.push('   絵は assets/rekishi/<id>.jpg（よこ 260px まで・ぜんぶで 約630KB）。');
lines.push('   --------------------------------------------------------- */');
lines.push('window.MQ = window.MQ || {};');
lines.push('');
lines.push('MQ.rekishi = (function () {');
lines.push('  const h = MQ.util.h;');
lines.push('');
lines.push('  /* id: [画面の 名前, ひと／もの, ひとこと] */');
lines.push('  const PICS = {');
Object.keys(INFO).forEach(function (id, i, arr) {
  const v = INFO[id];
  lines.push("    " + id + ": ['" + v[0] + "', '" + v[1] + "', '" + v[2] + "']" + (i < arr.length - 1 ? ',' : ''));
});
lines.push('  };');
lines.push('');
lines.push('  /* 出どころ（おうちの人ページに そのまま 出す） */');
lines.push('  const CREDITS = {');
Object.keys(INFO).forEach(function (id, i, arr) {
  const m = meta[id] || {};
  const lic = (m.lic || 'Public domain').replace(/'/g, '');
  const art = (m.artist || '').replace(/'/g, '');
  const file = (m.file || '').replace(/'/g, '');
  lines.push("    " + id + ": { lic: '" + lic + "', by: '" + art + "', file: '" + file + "' }" + (i < arr.length - 1 ? ',' : ''));
});
lines.push('  };');
lines.push('');
lines.push('  function has(id) { return !!(id && PICS[id]); }');
lines.push('  function info(id) {');
lines.push('    const p = PICS[id];');
lines.push('    if (!p) return null;');
lines.push('    return { id: id, name: p[0], kind: p[1], note: p[2], src: "assets/rekishi/" + id + ".jpg" };');
lines.push('  }');
lines.push('  function list() { return Object.keys(PICS).map(info); }');
lines.push('  function credit(id) { return CREDITS[id] || null; }');
lines.push('');
lines.push('  /* 答えた あとに 出す カード（バトルの ふきだし・しゅぎょうば 共通） */');
lines.push('  function node(id) {');
lines.push('    const p = info(id);');
lines.push('    if (!p) return null;');
lines.push('    return h("span", { class: "rekipic" }, [');
lines.push('      h("img", { class: "rekipic__img", src: p.src, alt: p.name, loading: "lazy" }),');
lines.push('      h("span", { class: "rekipic__b" }, [');
lines.push('        h("b", { class: "rekipic__name", text: p.name, raw: true }),');
lines.push('        h("span", { class: "rekipic__note", text: p.note, raw: true })');
lines.push('      ])');
lines.push('    ]);');
lines.push('  }');
lines.push('');
lines.push('  return { PICS: PICS, CREDITS: CREDITS, has: has, info: info, list: list, credit: credit, node: node };');
lines.push('})();');

fs.writeFileSync(APP + 'js/content/rekishi.js', lines.join('\n') + '\n');
console.log('js/content/rekishi.js を 書いた（' + Object.keys(INFO).length + '件）');
