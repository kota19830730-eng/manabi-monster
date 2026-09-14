// そうびの すがた 見くらべ：lab.html の css／js を じゅんに インラインに して 1まいの HTML に する（アーティファクト用）
// node tools/gearlab/build.js <出力先.html>
const fs = require('fs'), path = require('path');
const DIR = __dirname.split('\\').join('/') + '/';
const ROOT = path.resolve(__dirname, '../..').split('\\').join('/') + '/';
const SRC = process.argv[3] || 'lab.html';   // 2つめ＝もとの ページ（lab.html／show.html）
const html = fs.readFileSync(DIR + SRC, 'utf8');
const css = [...html.matchAll(/<link rel="stylesheet" href="([^"]+\.css)">/g)].map(m => m[1]);
const js = [...html.matchAll(/<script src="([^"]+)"><\/script>|<script>([\s\S]*?)<\/script>/g)].map(m => m[1] ? { src: m[1] } : { code: m[2] });
const read = p => fs.readFileSync(path.resolve(DIR, p), 'utf8');
const safe = s => s.replace(/<\/script/gi, '<\\/script');
const title = (html.match(/<title>([^<]+)<\/title>/) || [])[1] || 'そうび';
let out = '<title>' + title + '</title>\n';
out += '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mochiy+Pop+One&family=Zen+Maru+Gothic:wght@500;700&display=swap">\n';
out += '<style>\n' + css.map(f => '/* ' + f + ' */\n' + read(f)).join('\n') + '\n</style>\n';
out += '<div id="lab" class="wrap"></div>\n';
js.forEach(j => {
  if (j.src) out += '<script>/* ' + j.src + ' */\n' + safe(read(j.src)) + '\n</script>\n';
  else out += '<script>' + safe(j.code) + '</script>\n';
});
const dest = process.argv[2] || (DIR + 'gearlab.html');
fs.writeFileSync(dest, out);
console.log('css', css.length, 'js', js.length, 'bytes', out.length, '→', dest);
