// ハーネスの モードを ぜんぶ 開いて、ログの ERROR / REJECT / NG / MISSING / FAIL を 集める
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const CH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const H = 'file:///C:/Users/win11/OneDrive/デスクトップ/こどもアプリ作業場/manabi-quest/tools/harness.html';
const OUT = path.join(__dirname, 'sweep');
fs.mkdirSync(OUT, { recursive: true });

const simple = `aiparent bag bag2 bagdex bagguard bagre battle books books:map boss boss64 bossall bossdark bossdark:hot bubble:battle bubble:boss bubble:last
cancel capsule capsule:mon capsule:gear capsule:look capsule:sr capsule:dup capsule:pity capsule:poor capsule:roll capsule:comp capsule:secret capticket capticket:see
chizu cipose cisnap:300 cont counter counter2 counter3 counterboss demo3d demo3d:open demo3dbattle dex dock dock:busy dock:grade dojo dojo:lesson dojo:step dojo:miss dojo:done dojo:g2 dojo:g5 dojomap
elite elite2 evo evo:my evo:lv fever fever2 fever3 feverparent figs figs3 figs3b figs4 figs5 figs6 firstplay firstplay:map firstplay:q1 firstplay:pop firstplay:measure
forge forge:hit forge:poor forge:top fxpal gbreak gbreak:hard gbreak:crack gbreak:broke gbreak:block gbreak:fix gbreak:pal gear gear:all gearset:3 gearset:9 gearset:10 graph growshot:bolt:300 guard guardset hd hissan hissan:dec hudhome hudhome:go
judge kanso kokugo1 kokugo2 kokugo4 kokugo5 kokugo6 last last1 last2 last4 last5 last6 last1map last2map last4map last5map last6map lastfinal letter letter2 letter3 look lvgift lvgift:50 maker map map:-1 map1 map2 map4 map5 map6 mapui mapui:open mapui:grade measure memo memo2 memo3 menu menu:cap missions missions:all missions2 mix mix2 mix3 mons news news2 news3 note
open open:0.3 open:skip open:again open:mid palbattle palfx palgauge palhit palname palresult palresult2 pals parent parent1 parent2 parent4 parent5 parent6 perf3d photo photo2 photo2b photoall pika pika:all pika:dex pika:result pika:hint pixedit pixedit:zoom pixedit:blank pixedit:mine pixedit:done
pp pp:-1 pp:month pp:detail pp:settings pp:report pp:empty pp:drill pptitle pptitle:2 prize prize:pin prize:edit prize:form prize:home prize:reset prizemc prizemc:win prizemc:pity prizemc:only prizetix rename result result2 result3 revenge revenge:fresh revenge:win review review2 roma
scenery scenery:night scenery:arena:forest scenery:map set set2 sonevo sonevo:art sonskin sonskin:cool speak speak1 speak2 speaknone speakoff start stats stats2 statsdrill stuck streak streak:7 streak:0 summon summon2 term1 touchmemo touchwrite toweropen toweropen2 toweropen3
treasure treasure1 treasure2 treasure4 treasure5 treasure6 upd warning warning:last weaklast weakmix weekend weekend:pre weekend:off wkbattle:golden wide wide3 write write2 write3 write4 write5 zu
skill:kamae skill:break skill:clone skill:clone2 skill:call bossguard bosspick bosshard bossrecap bossfinal bossfinal:hard atk1 atk:2 atk:3 atk:4 atkfin
battle1:8 battle1:12 battle2:2 battle2:9 battle2:14 battle3:7 battle3:11 battle3:12 battle3:16 battle3:18 battle4:2 battle4:4 battle4:7 battle4:11 battle4:15 battle5:1 battle5:9 battle5:16 battle6:3 battle6:8 battle6:14
koku4:1 koku5:2 koku6:3 rika4:2 rika5:3 rika6:1 shakai4:3 shakai5:2 shakai6:4 eigo4:1 eigo5:3 eigo6:2
fx:fire:0.5 fx:leaf:0.5 fx:ice:0.5 fx:wind:0.5 fx:bolt:0.5 fx:star:0.5 fx:nova:0.65 fx:starburst:0.8 spatk:fire perffx:fire
bagfx:burst bagfx:shield bagfx:freeze bagfx:guide bagfx:golden bagfx:chest bagfx:power bagfx:charge bagfx:bond bagfx:rush bagfx:find bagfx:swift bagfx:elixir
aurora aurora:dex ai ai:ok ai:err ai:off aisee aisee:404 bossof:sansu3-1 bossof:sansu3-9 bossof:kokugo3-1 fitdbg:sansu3-3:3`
  .split(/\s+/).filter(Boolean);

const modes = [...new Set(simple)];
let i = 0, done = 0;
const results = [];
function runOne(mode) {
  return new Promise((res) => {
    const dir = 'C:/tmp_sw/' + mode.replace(/[^a-z0-9]/gi, '_');
    const args = ['--headless=new', '--disable-gpu', '--user-data-dir=' + dir, '--window-size=520,940', '--virtual-time-budget=400000', '--dump-dom', H + '#' + mode];
    execFile(CH, args, { maxBuffer: 64 * 1024 * 1024, timeout: 240000, encoding: 'utf8' }, (err, stdout) => {
      const m = (stdout || '').match(/<pre id="log"[^>]*>([\s\S]*?)<\/pre>/);
      const log = m ? m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') : '';
      fs.writeFileSync(path.join(OUT, mode.replace(/[^a-z0-9]/gi, '_') + '.txt'), log);
      const bad = log.split('\n').filter((l) => /\bERROR\b|REJECT|\bNG\b|MISSING|FAIL|Uncaught|TypeError|ReferenceError|undefined is not|null|NaN/.test(l) && !/png:|cut:|cls:|norm:|data:image/.test(l));
      results.push({ mode, empty: !log.trim(), timeout: !!(err && err.killed), bad: bad.slice(0, 8) });
      done++;
      if (done % 20 === 0) console.error('done', done, '/', modes.length);
      res();
    });
  });
}
async function worker() { while (i < modes.length) { const m = modes[i++]; await runOne(m); } }
(async () => {
  await Promise.all([worker(), worker(), worker(), worker()]);
  results.sort((a, b) => a.mode.localeCompare(b.mode));
  const lines = [];
  for (const r of results) {
    if (r.empty || r.timeout || r.bad.length) lines.push('## ' + r.mode + (r.empty ? ' [ログ空]' : '') + (r.timeout ? ' [TIMEOUT]' : '') + '\n' + r.bad.map((b) => '  ' + b.slice(0, 260)).join('\n'));
  }
  fs.writeFileSync(path.join(__dirname, 'sweep_report.txt'), 'modes ' + modes.length + '\n' + lines.join('\n'));
  console.log('modes', modes.length, 'flagged', lines.length);
})();
