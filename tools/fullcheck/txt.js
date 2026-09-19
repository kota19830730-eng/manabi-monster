// MQ.text.fit で 答えの 文が どう 変わるか 見る
const fs = require('fs'); const vm = require('vm');
const root = 'C:/Users/win11/OneDrive/デスクトップ/こどもアプリ作業場/manabi-quest/';
global.window = global; global.MQ = {};
global.document = { addEventListener() {}, querySelector() { return null; }, body: { classList: { toggle() {} } } };
for (const f of ['js/core/util.js', 'js/content/kakusu.js', 'js/content/kotoba.js', 'js/core/text.js']) {
  vm.runInThisContext(fs.readFileSync(root + f, 'utf8'), { filename: f });
}
const tests = process.argv.slice(2);
for (const s of tests) for (const g of [1, 2, 3, 5, 6]) console.log('小' + g, JSON.stringify(s), '→', JSON.stringify(MQ.text.fit(s, { level: g })));
