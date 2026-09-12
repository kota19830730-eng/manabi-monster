(function () {
  // タイトルの 絵（v13.9）を 描く 時間。キャッシュなしの 1回め と、render() ぜんたい（キャッシュあり）
  var out = [], sc = MQ.ui.scenery;
  try {
    ['day', 'morning', 'evening', 'night'].forEach(function (t) {
      var a = document.createElement('canvas'); a.width = 800; a.height = 300;
      var b = document.createElement('canvas'); b.width = 800; b.height = 900;
      var ca = a.getContext('2d'), cb = b.getContext('2d');
      ca.setTransform(2, 0, 0, 2, 0, 0); cb.setTransform(2, 0, 0, 2, 0, 0);
      var t0 = performance.now(); sc.paintTitleFar(ca, 400, 150, t);
      var t1 = performance.now(); sc.paintTitleGround(cb, 400, 450, t);
      var t2 = performance.now();
      out.push(t + ' far ' + Math.round(t1 - t0) + 'ms ground ' + Math.round(t2 - t1) + 'ms');
    });
    var r0 = performance.now(); MQ.ui.start.render(); var r1 = performance.now();
    out.push('render ' + Math.round(r1 - r0) + 'ms');
  } catch (e) { out.push('ERR ' + e.message); }
  return out.join(' | ');
})()
