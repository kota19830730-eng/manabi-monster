(function () {
  MQ.save.setPlayGrade(4); MQ.ui.goMap();
  var st = document.getElementById('stage').getBoundingClientRect(), k = st.width / 400;
  var sc = document.querySelector('#screen-map .map__scroll'); sc.scrollTop = 99999;
  var sheet = document.querySelector('#screen-map .map__sheet').getBoundingClientRect();
  function r(el) { var b = el.getBoundingClientRect(); return { l: (b.left - sheet.left) / k, t: (b.top - sheet.top) / k, w: b.width / k, h: b.height / k }; }
  var tower = r(document.querySelector('#screen-map .tower'));
  var art = r(document.querySelector('#screen-map .tower__art'));
  var fig = r(document.querySelector('#screen-map .tower__art .v3fig'));
  var v3 = r(document.querySelector('#screen-map .tower__art .v3'));
  var sign = r(document.querySelector('#screen-map .tower__sign'));
  var sub = r(document.querySelector('#screen-map .tower__sub'));
  // 島（DGRASS/DSAND）の 四角
  var cv = document.querySelector('#screen-map .map__bg'), g = null;
  var T = MQ.tiles; var W = 400, cell = 12.5;
  // grid は 外に 出て いない ので canvas の 色で… かわりに cells は map.js が 持つ。plan から 作り直す
  return JSON.stringify({ tower: tower, art: art, fig: fig, v3: v3, sign: sign, sub: sub });
})()
