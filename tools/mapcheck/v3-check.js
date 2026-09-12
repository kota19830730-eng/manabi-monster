(function () {
  var o = [];
  MQ.save.setPlayGrade(3);
  MQ.save.setSetting('v3', true); MQ.ui.goMap();
  o.push('りったい ON: 3Dの 家 ' + document.querySelectorAll('#screen-map .mapbld').length + ' / 3Dの 城 ' + document.querySelectorAll('#screen-map .tower__art--3d').length + ' / 地図の div かざり ' + document.querySelectorAll('#screen-map .deco').length + ' / 橋 div ' + document.querySelectorAll('#screen-map .bridge').length);
  MQ.save.setSetting('v3', false); MQ.ui.goMap();
  o.push('りったい OFF: 3Dの 家 ' + document.querySelectorAll('#screen-map .mapbld').length + ' / 3Dの 城 ' + document.querySelectorAll('#screen-map .tower__art--3d').length + ' / いままでの 城 ' + document.querySelectorAll('#screen-map .twb').length);
  MQ.save.setSetting('v3', true);
  var ic = document.querySelectorAll('#screen-map .maptabs .dockico svg').length;
  o.push('ドックの SVG アイコン ' + ic);
  return o.join(' | ');
})()
