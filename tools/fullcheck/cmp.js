// 直す前（C:/mqt_head）と 直した後の harness の ログを ならべる
const { execFile } = require('child_process');
const CH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const NEW = 'C:/Users/win11/OneDrive/デスクトップ/こどもアプリ作業場/manabi-quest';
const OLD = 'C:/mqt_head';
const modes = process.argv.slice(2);
function run(root, mode, i) {
  return new Promise(function (res) {
    const dir = 'C:/tmp_cp/' + (root === OLD ? 'o' : 'n') + i;
    execFile(CH, ['--headless=new', '--disable-gpu', '--user-data-dir=' + dir, '--window-size=520,940', '--virtual-time-budget=600000', '--dump-dom', 'file:///' + root + '/tools/harness.html#' + mode],
      { maxBuffer: 64 * 1024 * 1024, timeout: 300000, encoding: 'utf8' }, function (err, out) {
        const m = (out || '').match(/<pre id="log"[^>]*>([\s\S]*?)<\/pre>/);
        res(m ? m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') : 'NOLOG');
      });
  });
}
(async function () {
  let i = 0;
  const jobs = modes.map(function (m) { return m; });
  async function worker() {
    while (jobs.length) {
      const m = jobs.shift(); const k = i++;
      const [o, n] = await Promise.all([run(OLD, m, k), run(NEW, m, k)]);
      const badO = (o.match(/MISSING|\bNG\b|THROW|ERROR|REJECT/g) || []).length;
      const badN = (n.match(/MISSING|\bNG\b|THROW|ERROR|REJECT/g) || []).length;
      const flag = badN > badO ? '  <<< ふえた' : '';
      console.log('== ' + m + '  前 ' + badO + ' / 後 ' + badN + flag);
      if (badN > badO || process.env.SHOW) console.log('  後: ' + n.replace(/\n/g, ' | ').slice(0, 700));
    }
  }
  await Promise.all([worker(), worker(), worker()]);
})();
