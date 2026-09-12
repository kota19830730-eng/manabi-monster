(function () {
  var out = [];
  try {
    [3, 4, 6, 1, 3].forEach(function (g) {
      MQ.save.setPlayGrade(g);
      var t0 = performance.now();
      MQ.ui.goMap();
      var t1 = performance.now();
      var c = document.querySelector('#screen-map .map__bg');
      out.push('g' + g + ' ' + Math.round(t1 - t0) + 'ms canvas ' + c.width + 'x' + c.height);
    });
  } catch (e) { out.push('ERR ' + e.message + ' ' + e.stack); }
  return out.join(' | ') + ' smooth=' + MQ.tiles.smooth();
})()
