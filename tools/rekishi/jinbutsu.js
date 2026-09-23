const fs = require('fs'), vm = require('vm');
const dir = 'c:/Users/win11/OneDrive/デスクトップ/こどもアプリ作業場/manabi-quest/';
const src = fs.readFileSync(dir + 'tools/smoke.js', 'utf8');
global.require = require; process.argv[2] = dir;
vm.runInNewContext(src.slice(0, src.indexOf('const MQ = global.MQ;')), global);
const MQ = global.MQ;

const HIST = /鎌倉|平安|江戸|明治|飛鳥|奈良|室町|戦国|大昔|戦争|世界と日本/;
const qs = (MQ.shakai6.questions || []).filter(function (q) { return HIST.test(q.unit || ''); });

// 人名らしき ことば（この 教材に 出て くる もの）
const PEOPLE = ['聖徳太子','聖武天皇','中大兄皇子','中臣鎌足','藤原道長','紫式部','清少納言',
  '源頼朝','北条時宗','足利義満','足利義政','織田信長','豊臣秀吉','徳川家康','徳川家光',
  '杉田玄白','本居宣長','伊能忠敬','ペリー','西郷隆盛','大久保利通','木戸孝允','坂本龍馬',
  '明治天皇','伊藤博文','福沢諭吉','板垣退助','大隈重信','陸奥宗光','小村寿太郎','野口英世',
  '卑弥呼','聖武','鑑真','行基','雪舟','千利休','近松門左衛門','歌川広重','葛飾北斎'];

let inQ = 0, inA = 0, none = 0;
const seen = {};
qs.forEach(function (q) {
  const t = String(q.text || '').replace(/<[^>]*>/g, '');
  const ans = String((q.choices || [])[0] || '');
  const pq = PEOPLE.filter(function (n) { return t.indexOf(n) >= 0; });
  const pa = PEOPLE.filter(function (n) { return ans.indexOf(n) >= 0; });
  pq.concat(pa).forEach(function (n) { seen[n] = (seen[n] || 0) + 1; });
  if (pa.length) inA++;            // 人名が 答え → 顔を 出すと ばれる
  else if (pq.length) inQ++;       // 人名は 問題文の 中 → 顔を 出しても ばれない
  else none++;
});
console.log('歴史 ' + qs.length + '問');
console.log('  人名が 答え（顔を 出すと ばれる）    : ' + inA + '問');
console.log('  人名は 問題文の 中（顔を 出せる）      : ' + inQ + '問');
console.log('  人名が 出て こない                     : ' + none + '問');
const names = Object.keys(seen).sort(function (a, b) { return seen[b] - seen[a]; });
console.log('出て くる 人物 ' + names.length + '人: ' + names.map(function (n) { return n + '(' + seen[n] + ')'; }).join('、'));
