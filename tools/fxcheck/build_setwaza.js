// セットわざの 動く 見本（v14.2）：build_demo.js と 同じ 作り方で、パネルだけ セットわざ用（demo_setwaza_panel.js）
// node build_setwaza.js → setwaza.html（git に 入れない）→ Artifact で 公開
// 本物の 時計で 撮る：rt.js の 'demo3d.html' を 'setwaza.html' に した 写しで `node rt_setwaza.js nova 0,300,650,1100,1700,2100 rt 800 1280`
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..').split(path.sep).join('/') + '/';
const FX = __dirname + '/';
const idx = fs.readFileSync(ROOT + 'index.html', 'utf8');
const css = [...idx.matchAll(/<link rel="stylesheet" href="(css\/[^"]+)"/g)].map(m => m[1]);
const js = [...idx.matchAll(/<script src="(js\/[^"]+)"/g)].map(m => m[1]);
const stage = /<div id="stage" class="stage">[\s\S]*?<\/div>\s*\n(?=<!--|<script)/.exec(idx)[0];
const safe = s => s.replace(/<\/script/gi, '<\\/script');
let out = '<title>セットわざ まじん・あんこく</title>\n';
out += '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mochiy+Pop+One&family=Zen+Maru+Gothic:wght@500;700&family=Zen+Kaku+Gothic+New:wght@500;700;900&family=BIZ+UDPGothic:wght@400;700&display=swap">\n';
out += '<style>\n' + css.map(f => '/* ' + f + ' */\n' + fs.readFileSync(ROOT + f, 'utf8')).join('\n') + '\n';
out += fs.readFileSync(FX + 'demo_panel.css', 'utf8') + '\n</style>\n';
out += '<script>try { delete Navigator.prototype.serviceWorker; } catch (e) {}</script>\n';
out += stage.replace(/<\/div>\s*$/, '');
js.forEach(f => { out += '<script>/* ' + f + ' */\n' + safe(fs.readFileSync(ROOT + f, 'utf8')) + '\n</script>\n'; });
out += '</div>\n<script>\n' + fs.readFileSync(FX + 'demo_setwaza_panel.js', 'utf8') + '\n</script>\n';
fs.writeFileSync(FX + 'setwaza.html', out);
console.log('css', css.length, 'js', js.length, 'bytes', out.length);
