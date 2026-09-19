// index.html / sw.js FILES / harness / smoke の 登録もれと、ファイルの 有無を しらべる
const fs = require('fs');
const path = require('path');
const root = process.argv[2];
const rd = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const idx = rd('index.html');
const sw = rd('sw.js');
const har = rd('tools/harness.html');

const idxScripts = [...idx.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1].replace(/^\.\//, '').split('?')[0]);
const idxCss = [...idx.matchAll(/<link[^>]*href="([^"]+\.css)"/g)].map((m) => m[1].replace(/^\.\//, ''));
const filesBlock = sw.match(/FILES\s*=\s*\[([\s\S]*?)\]/);
const swFiles = filesBlock ? [...filesBlock[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1].replace(/^\.\//, '')) : [];
const harScripts = [...har.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1].replace(/^\.\.\//, '').split('?')[0]);
const harCss = [...har.matchAll(/<link[^>]*href="([^"]+\.css)"/g)].map((m) => m[1].replace(/^\.\.\//, ''));

const out = [];
const exists = (f) => fs.existsSync(path.join(root, f));
for (const f of [...idxScripts, ...idxCss]) if (!exists(f)) out.push('index が 読む のに ない: ' + f);
for (const f of swFiles) if (f && f !== '' && f !== '.' && f !== './' && !f.startsWith('http') && !exists(f)) out.push('sw FILES に あるのに ない: ' + f);
for (const f of [...idxScripts, ...idxCss]) if (!swFiles.includes(f)) out.push('index に あるが sw FILES に ない: ' + f);
for (const f of swFiles) if (/\.(js|css)$/.test(f) && !idxScripts.includes(f) && !idxCss.includes(f)) out.push('sw FILES に あるが index に ない: ' + f);
const appScripts = idxScripts.filter((f) => f.startsWith('js/'));
for (const f of appScripts) if (!harScripts.includes(f)) out.push('index に あるが harness に ない: ' + f);
for (const f of idxCss) if (!harCss.includes(f)) out.push('index の css が harness に ない: ' + f);
// 順番
const harApp = harScripts.filter((f) => appScripts.includes(f));
const idxInHar = appScripts.filter((f) => harApp.includes(f));
for (let i = 0; i < idxInHar.length; i++) if (idxInHar[i] !== harApp[i]) { out.push('harness の 読みこみ順が index と ちがう（最初の ちがい）: index=' + idxInHar[i] + ' harness=' + harApp[i]); break; }
// js/ に あるが どこにも 読まれない ファイル
for (const dir of ['js/core', 'js/content', 'js/ui', 'css']) {
  for (const f of fs.readdirSync(path.join(root, dir))) {
    const p = dir + '/' + f;
    if (/\.(js|css)$/.test(f) && !idxScripts.includes(p) && !idxCss.includes(p)) out.push('index に 読まれない ファイル: ' + p);
  }
}
console.log('index scripts', idxScripts.length, 'css', idxCss.length, 'sw FILES', swFiles.length, 'harness scripts', harScripts.length);
console.log(out.length ? out.join('\n') : 'もれ なし');
