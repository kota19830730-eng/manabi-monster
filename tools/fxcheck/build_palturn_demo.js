// 相棒の ターン（v14.37）の 動く 見本：index.html の css/js を じゅんに インラインに して 1まいの HTML に する
// node build_palturn_demo.js → palturn.html（git に 入れない）
const fs = require('fs');
const ROOT = require('path').resolve(__dirname, '../..').split('\\').join('/') + '/';
const idx = fs.readFileSync(ROOT + 'index.html', 'utf8');
const css = [...idx.matchAll(/<link rel="stylesheet" href="(css\/[^"]+)"/g)].map(m => m[1]);
const js = [...idx.matchAll(/<script src="(js\/[^"]+)"/g)].map(m => m[1]);
const stage = /<div id="stage" class="stage">[\s\S]*?<\/div>\s*\n(?=<!--|<script)/.exec(idx)[0];
const safe = s => s.replace(/<\/script/gi, '<\\/script');
let out = '<title>相棒の ターン 見本</title>\n';
out += '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n';
out += '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mochiy+Pop+One&family=Zen+Maru+Gothic:wght@500;700&family=Zen+Kaku+Gothic+New:wght@500;700;900&family=BIZ+UDPGothic:wght@400;700&display=swap">\n';
out += '<style>\n' + css.map(f => '/* ' + f + ' */\n' + fs.readFileSync(ROOT + f, 'utf8')).join('\n') + '\n';
out += fs.readFileSync(__dirname + '/demo_panel.css', 'utf8') + '\n';
out += '.mihon__b--arm { background: #e0561a; } .mihon__b--turn { background: #b8801d; } .mihon__b--palsel { background: #2a3566; } .mihon__b--palsel.is-on { box-shadow: 0 3px 0 #141a38, 0 0 0 2px #ffd447 inset; }\n';
out += '.mihon__b--k-bond { background: #b8801d; } .mihon__b--k-fang { background: #b8302a; } .mihon__b--k-blaze { background: #c2451a; } .mihon__b--k-heavy { background: #8a6a3a; } .mihon__b--k-sky { background: #5a7ea8; } .mihon__b--k-bolt { background: #3050d0; } .mihon__b--k-aqua { background: #2a6fc0; } .mihon__b--k-shadow { background: #6b2fb8; } .mihon__b--k-holy { background: #a88a1a; }\n';
out += '.mihon__row + .mihon__row { margin-top: 6px; }\n</style>\n';
out += '<script>try { delete Navigator.prototype.serviceWorker; } catch (e) {}</script>\n';
out += stage.replace(/<\/div>\s*$/, '');
js.forEach(f => { out += '<script>/* ' + f + ' */\n' + safe(fs.readFileSync(ROOT + f, 'utf8')) + '\n</script>\n'; });
out += '</div>\n<script>\n' + fs.readFileSync(__dirname + '/demo_palturn_panel.js', 'utf8') + '\n</script>\n';
fs.writeFileSync(__dirname + '/palturn.html', out);
console.log('css', css.length, 'js', js.length, 'bytes', out.length);
