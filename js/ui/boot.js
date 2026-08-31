/* ---------------------------------------------------------
   さいしょに 動く ところ
   --------------------------------------------------------- */
(function () {
  MQ.stage.fit();
  MQ.save.load();
  MQ.sfx.setEnabled(MQ.save.getSetting('sfx', true));
  MQ.bgm.setEnabled(MQ.save.getSetting('bgm', true));
  MQ.ui.setTextures();
  MQ.ui.syncCustom();

  // 音は 最初の タップの あとから 鳴らせる
  document.addEventListener('pointerdown', function () { MQ.sfx.unlock(); MQ.bgm.kick(); }, { once: true });

  // フォントが 読めたら 描きなおす
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load('16px "DotGothic16"'), document.fonts.load('16px "Mochiy Pop One"')]).then(function () {
      if (document.getElementById('screen-start').classList.contains('is-active')) MQ.ui.start.render();
    }).catch(function () {});
  }

  MQ.ui.start.render();
  MQ.ui.show('screen-start');

  // オフラインでも 動くように（http/https で 開いたときだけ）
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();
