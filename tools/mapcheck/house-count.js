(function () {
  var out = [];
  [1, 2, 3, 4, 5, 6].forEach(function (g) {
    MQ.save.setPlayGrade(g); MQ.ui.goMap();
    var st = document.querySelector('#screen-map .map__sheet').getBoundingClientRect();
    var k = document.getElementById('stage').getBoundingClientRect().width / 400;
    var hs = Array.prototype.slice.call(document.querySelectorAll('#screen-map .mapbld'));
    var rects = hs.map(function (e) { var b = e.querySelector('.v3').getBoundingClientRect(); return { l: (b.left - st.left) / k, r: (b.right - st.left) / k, t: (b.top - st.top) / k, b: (b.bottom - st.top) / k }; });
    var over = 0;
    for (var i = 0; i < rects.length; i++) for (var j = i + 1; j < rects.length; j++) { var a = rects[i], c = rects[j]; if (a.l < c.r && c.l < a.r && a.t < c.b && c.t < a.b) over++; }
    var minX = rects.length ? Math.min.apply(null, rects.map(function (r) { return r.l; })) : null;
    var maxX = rects.length ? Math.max.apply(null, rects.map(function (r) { return r.r; })) : null;
    out.push('g' + g + ' 家 ' + hs.length + ' かさなり ' + over + ' x ' + (minX === null ? '-' : Math.round(minX) + '〜' + Math.round(maxX)));
  });
  MQ.save.setPlayGrade(3);
  return out.join(' | ');
})()
