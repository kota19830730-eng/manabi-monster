/* ---------------------------------------------------------
   さいしょに 動く ところ
   --------------------------------------------------------- */
(function () {
  /* エラーの 保険（v7.6）：ここまでの 読みこみで 落ちた ファイルが あれば
     guard.js が もう きろく＋バーを 出して いる。この 先で 落ちても
     タイトルだけは 出す（つづきを 押せなく なる のが いちばん こまる） */
  try {
    boot();
  } catch (e) {
    if (MQ.guard) { MQ.guard.record({ msg: e && e.message ? e.message : String(e), src: (e && e.stack) || '', phase: 'boot' }); MQ.guard.bar(); }
    try { MQ.ui.show('screen-start'); } catch (x) {}
    throw e;   // コンソールにも 出す（ハーネスの ERROR 数に 入る）
  }
  if (MQ.guard) MQ.guard.markBooted();

  function boot() {
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
  // v2.3：あたらしい バージョンが 入ったら「こうしん」の お知らせを 出す。
  //       アプリを 前に 出した ときと 30分ごとに、あたらしい ものが ないか 見に いく。
  let swReg = null;
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    const hadController = !!navigator.serviceWorker.controller;   // 2回目いこうの 起動か（はじめては 知らせない）
    navigator.serviceWorker.addEventListener('message', function (e) {
      if (e.data && e.data.version) { MQ.version = e.data.version; if (MQ.ui.showVersion) MQ.ui.showVersion(); }
    });
    function askVersion() {
      const c = navigator.serviceWorker.controller;
      if (c) { try { c.postMessage('version'); } catch (e) {} }
    }
    function watch(sw) {
      if (!sw) return;
      sw.addEventListener('statechange', function () {
        if (sw.state === 'activated' && hadController) MQ.ui.updateReady();
      });
    }
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      swReg = reg;
      watch(reg.installing);
      reg.addEventListener('updatefound', function () { watch(reg.installing); });
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') reg.update().catch(function () {});
      });
      setInterval(function () { reg.update().catch(function () {}); }, 30 * 60 * 1000);
    }).catch(function () {});
    navigator.serviceWorker.ready.then(askVersion).catch(function () {});
  }
  // せっていの「あたらしい バージョンを しらべる」ボタン
  MQ.ui.checkUpdate = function () {
    if (!swReg) { MQ.ui.toast('この ひらきかたでは しらべられません'); return; }
    swReg.update()
      .then(function () { MQ.ui.toast('しらべました。あたらしいのが あれば お知らせが 出ます'); })
      .catch(function () { MQ.ui.toast('いまは しらべられません。ネットを たしかめてね'); });
  };
  }
})();
