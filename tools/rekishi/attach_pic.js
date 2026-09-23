/* 歴史の 問題に pic: を つける（答えた あとに 写真が 出る） */
const fs = require('fs'), vm = require('vm');
const APP = 'c:/Users/win11/OneDrive/デスクトップ/こどもアプリ作業場/manabi-quest/';
const src = fs.readFileSync(APP + 'tools/smoke.js', 'utf8');
global.require = require; process.argv[2] = APP;
vm.runInNewContext(src.slice(0, src.indexOf('const MQ = global.MQ;')), global);
const MQ = global.MQ;

/* 答えが この 文字列なら この 写真 */
const BY_ANSWER = {
  'たて穴住居': 'tateana', '高床倉庫': 'takayuka', '古ふん': 'kofun',
  '弥生時代': 'takayuka', '縄文時代': 'jomondoki', 'なわの 文様が ついて いる': 'jomondoki',
  '青銅と 鉄': 'dotaku', 'ほりや さく': 'kango',
  '聖徳太子': 'shotoku', '法隆寺': 'horyuji', '中大兄皇子': 'tenji',
  '聖武天皇': 'shomu', '平城京': 'heijo', '正倉院': 'shosoin', '東大寺': 'todaiji',
  '万葉集': 'manyoshu', '桓武天皇': 'kanmu', '平安京': 'heian',
  'かな文字': 'kana', '日本語で 書かれた 物語や ずいひつ': 'kana',
  '紫式部': 'murasaki', '清少納言': 'sei', 'しんでん造': 'shinden',
  '藤原氏': 'michinaga', '自分の 世が 思いどおりだと いう 満足': 'michinaga',
  '平清盛': 'kiyomori', '源頼朝': 'yoritomo',
  '足利尊氏': 'takauji', '足利義満': 'yoshimitsu', '足利義政': 'yoshimasa',
  '能と 狂言': 'noh', 'たたみ・しょうじ・とこの間': 'shoin',
  '織田信長': 'nobunaga', '豊臣秀吉': 'hideyoshi', '徳川家康': 'ieyasu',
  '寺子屋': 'terakoya', '東海道': 'tokaido',
  '杉田玄白': 'genpaku', '本居宣長': 'norinaga', '伊能忠敬': 'tadataka', '歌川広重': 'hiroshige',
  '板垣退助': 'itagaki', '伊藤博文': 'hirobumi',
  '大日本帝国憲法': 'kenpo', '富岡製糸場': 'tomioka', '鉄道': 'tetsudo', '原爆ドーム': 'genbaku'
};

/* 答えでは 当たらない ぶんは 問題文の ことばで */
const BY_TEXT = [
  [/金閣/, 'kinkaku'], [/銀閣/, 'ginkaku'],
  [/解体新書/, 'kaitai'], [/日本(全国)?の 地図|地図を 作/, 'inozu']
];

const HIST = /鎌倉|平安|江戸|明治|飛鳥|奈良|室町|戦国|大昔|戦争|世界と日本/;
const qs = (MQ.shakai6.questions || []).filter(function (q) { return HIST.test(q.unit || ''); });

const plan = [];
qs.forEach(function (q) {
  const t = String(q.text || '').replace(/<[^>]*>/g, '');
  const a = String((q.choices || [])[0] || '');
  let id = BY_ANSWER[a] || null;
  if (!id) {
    for (const r of BY_TEXT) { if (r[0].test(t)) { id = r[1]; break; } }
  }
  if (id) plan.push({ text: q.text, ans: a, id: id });
});

/* ファイルに 書きこむ */
const P = APP + 'js/content/shakai6.js';
let s = fs.readFileSync(P, 'utf8');
let done = 0, miss = 0;
plan.forEach(function (p) {
  const anchor = "text: '" + p.text + "'";
  const n = s.split(anchor).length - 1;
  if (n !== 1) { console.log('とばした（' + n + '件）: ' + p.text.slice(0, 34)); miss++; return; }
  s = s.replace(anchor, function () { return anchor + ", pic: '" + p.id + "'"; });
  done++;
});
fs.writeFileSync(P, s);

console.log('pic を つけた: ' + done + '問（とばし ' + miss + '）');
const used = {};
plan.forEach(function (p) { used[p.id] = (used[p.id] || 0) + 1; });
const all = Object.keys(MQ.rekishi ? MQ.rekishi.PICS : {});
console.log('つかった 写真: ' + Object.keys(used).length + 'しゅるい');
