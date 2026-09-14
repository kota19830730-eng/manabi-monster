// v14.3 カットインを 軽く する 案の 動く 見本：index.html の css/js を じゅんに インラインに して 1まいの HTML に する
// node build_cidemo.js [manabi-quest の フォルダ（ほかの セッションの 作りかけを まぜない とき：git archive した フォルダ）] → cidemo.html
const fs = require('fs');
const path = require('path');
const ROOT = (process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '../..')).split('\\').join('/') + '/';
const idx = fs.readFileSync(ROOT + 'index.html', 'utf8');
const css = [...idx.matchAll(/<link rel="stylesheet" href="(css\/[^"]+)"/g)].map(m => m[1]);
const js = [...idx.matchAll(/<script src="(js\/[^"]+)"/g)].map(m => m[1]);
const stage = /<div id="stage" class="stage">[\s\S]*?<\/div>\s*\n(?=<!--|<script)/.exec(idx)[0];
const safe = s => s.replace(/<\/script/gi, '<\\/script');
const EXTRA = `
.mihon__b--var { min-width: 92px; background: #3a3f56; border: 1px solid #6f7aa8; }
.mihon__b--var.is-on { background: #b8801d; border-color: #ffd447; }
.mihon__b:disabled { opacity: .45; }
.cid__meter { color: #fff6c8; font: 700 13px 'Zen Maru Gothic', system-ui, sans-serif; margin: 6px 2px 2px; }
.cid__table { display: flex; gap: 6px; flex-wrap: wrap; margin: 2px; }
.cid__cell { color: #cfd8f0; font: 500 11px 'Zen Maru Gothic', system-ui, sans-serif; background: #1d2446; border-radius: 6px; padding: 2px 6px; }
.cid__cell.is-on { color: #fff; background: #3a3f56; }
`;
let out = '<title>カットイン見くらべ</title>\n';
out += '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mochiy+Pop+One&family=Zen+Maru+Gothic:wght@500;700&family=Zen+Kaku+Gothic+New:wght@500;700;900&family=BIZ+UDPGothic:wght@400;700&display=swap">\n';
out += '<style>\n' + css.map(f => '/* ' + f + ' */\n' + fs.readFileSync(ROOT + f, 'utf8')).join('\n') + '\n';
out += fs.readFileSync(__dirname + '/demo_panel.css', 'utf8') + EXTRA + '\n</style>\n';
out += '<script>try { delete Navigator.prototype.serviceWorker; } catch (e) {}</script>\n';
out += stage.replace(/<\/div>\s*$/, '');
js.forEach(f => { out += '<script>/* ' + f + ' */\n' + safe(fs.readFileSync(ROOT + f, 'utf8')) + '\n</script>\n'; });
out += '</div>\n<script>\n' + fs.readFileSync(__dirname + '/cidemo_panel.js', 'utf8') + '\n</script>\n';
fs.writeFileSync(__dirname + '/cidemo.html', out);
console.log('root', ROOT, 'css', css.length, 'js', js.length, 'bytes', out.length, 'cisnap', js.indexOf('js/ui/cisnap.js') >= 0);
