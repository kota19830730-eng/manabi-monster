// ひっさつわざの 動く 見本：index.html の css/js を じゅんに インラインに して 1まいの HTML に する
// node build_demo.js → demo3d.html
const fs = require('fs');
const ROOT = require('path').resolve(__dirname, '../..').split('\\').join('/') + '/';
const idx = fs.readFileSync(ROOT + 'index.html', 'utf8');
const css = [...idx.matchAll(/<link rel="stylesheet" href="(css\/[^"]+)"/g)].map(m => m[1]);
const js = [...idx.matchAll(/<script src="(js\/[^"]+)"/g)].map(m => m[1]);
const stage = /<div id="stage" class="stage">[\s\S]*?<\/div>\s*\n(?=<!--|<script)/.exec(idx)[0];
const safe = s => s.replace(/<\/script/gi, '<\\/script');
let out = '<title>ボスの先制こうげき</title>\n';
out += '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mochiy+Pop+One&family=Zen+Maru+Gothic:wght@500;700&family=Zen+Kaku+Gothic+New:wght@500;700;900&family=BIZ+UDPGothic:wght@400;700&display=swap">\n';
out += '<style>\n' + css.map(f => '/* ' + f + ' */\n' + fs.readFileSync(ROOT + f, 'utf8')).join('\n') + '\n';
out += fs.readFileSync(__dirname + '/demo_panel.css', 'utf8') + '\n</style>\n';
out += '<script>try { delete Navigator.prototype.serviceWorker; } catch (e) {}</script>\n';
out += stage.replace(/<\/div>\s*$/, '') ;
js.forEach(f => { out += '<script>/* ' + f + ' */\n' + safe(fs.readFileSync(ROOT + f, 'utf8')) + '\n</script>\n'; });
out += '</div>\n<script>\n' + (false ? fs.readFileSync(__dirname + '/sounds.js', 'utf8') : 'window.__SND = {};') + '\n</script>\n<script>\n' + fs.readFileSync(__dirname + '/demo_ambush_panel.js', 'utf8') + '\n</script>\n';
fs.writeFileSync(__dirname + '/demo_ambush.html', out);
console.log('css', css.length, 'js', js.length, 'bytes', out.length);
// ボタンの 色（先制こうげき）
