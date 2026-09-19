// 小3の 子が 小1 かん字の よみ を 2回 まちがえた ときの「こたえは ○○。」を 見る
const { execFile } = require('child_process');
const root = process.argv[2] || 'C:/Users/win11/OneDrive/デスクトップ/こどもアプリ作業場/manabi-quest';
const shot = process.argv[3] || '';
const code = `
var ST = window.setTimeout, CT = window.clearTimeout;
ST(async function(){
  window.setTimeout = ST; window.clearTimeout = CT;
  var ml = document.createElement('pre'); ml.id = 'mylog'; document.body.appendChild(ml);
  var out = [];
  try {
    var w = function(ms){ return new Promise(function(r){ ST(r, ms); }); };
    MQ.save.update(function(p){ p.grade = 3; p.playGrade = 1; p.equipped.shield = null; p.equipped.armor = null; });
    var sid = MQ.content.areaOf('kokugo').stages.filter(function(st){ return /よみ/.test(st.name); })[0].id;
    out.push('stage ' + sid);
    MQ.ui.battle.start(sid); await w(900);
    for (var t = 0; t < 40; t++) {
      var q = MQ.battle.current();
      if (q && q.type === 'choice' && /よみ/.test(q.prompt.replace(/<[^>]+>/g,'')) && MQ.text.fit(q.choices[q.answer]) !== q.choices[q.answer]) break;
      var right = document.querySelectorAll('.choice')[q.answer]; if (right) right.click(); await w(3000);
    }
    var q2 = MQ.battle.current();
    var wrongs = Array.prototype.filter.call(document.querySelectorAll('.choice'), function(b, i){ return i !== q2.answer; });
    wrongs[0].click(); await w(900);
    var wr2 = Array.prototype.filter.call(document.querySelectorAll('.choice'), function(b, i){ return i !== q2.answer && !b.disabled && b.offsetParent; });
    (wr2[0] || wrongs[1]).click(); await w(500);
    var head = document.querySelector('.feedback__head');
    out.push('問題: ' + q2.prompt.replace(/<[^>]+>/g,'').slice(0,40));
    out.push('正解: ' + q2.choices[q2.answer]);
    out.push('画面: ' + (head ? head.textContent : 'なし'));
    out.push((head && head.textContent.indexOf(q2.choices[q2.answer]) >= 0) ? 'OK 答えが そのまま 出た' : 'NG 答えが かわった');
    var fb = document.querySelector('.feedback'); if (fb) { fb.style.animation = 'none'; fb.style.opacity = '1'; }
  } catch (err) { out.push('THROW ' + err.message); }
  ml.textContent = out.join(' || ');
}, 1500);`;
const url = 'file:///' + root + '/tools/harness.html#set|js=' + encodeURIComponent(code);
const args = ['--headless=new', '--disable-gpu', '--user-data-dir=C:/tmp_ans' + (shot ? 's' : '') + (root.length % 7), '--window-size=520,940', '--virtual-time-budget=400000'];
if (shot) args.push('--screenshot=' + shot, '--hide-scrollbars'); else args.push('--dump-dom');
args.push(url);
execFile('C:/Program Files/Google/Chrome/Application/chrome.exe', args, { maxBuffer: 64 * 1024 * 1024, encoding: 'utf8' }, function (e, out) {
  if (shot) { console.log('shot', shot); return; }
  const m = (out || '').match(/<pre id="mylog"[^>]*>([\s\S]*?)<\/pre>/); console.log(m ? m[1] : 'NOLOG');
});
