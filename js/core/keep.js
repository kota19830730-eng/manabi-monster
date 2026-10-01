/* ---------------------------------------------------------
   きろくを まもる（v14.42・2026-10-01）

   子どもの きろくは ブラウザの 中（localStorage）に ある。
   ブラウザは たのまれて いない サイトの きろくを 自分の つごうで 消す ことが ある：
     ・iPhone／iPad：ホーム画面に 入れずに Safari の タブで あそぶと、
       しばらく（目安 7日）ひらかない サイトの きろくは 消される。ホーム画面の アイコンから ひらけば 消えない。
     ・Android など：端末の 空きが へると 消される ことが ある。「消さないで」と たのむ（storage.persist）と 守られる。
   ここで やるのは 2つだけ：
     ask()   … ブラウザに「消さないで」と たのむ（何回 よんでも よい・けっかを せってい keep に のこす）
     info()  … いま あぶないか（iPhone／iPad で ホーム画面の アイコンから ひらいて いない）
   画面（知らせる バー・おうちの人ページの カード）は ui がわ。外には 何も 送らない。DOM を 知らない。
   --------------------------------------------------------- */
window.MQ = window.MQ || {};

(function () {
  let fake = null;            // テスト用（harness・smoke）：{ ios, standalone, persisted }
  let last = null;            // さいごに わかった けっか（true／false／null＝わからない）

  const NOTICE_GAP = 14 * 24 * 60 * 60 * 1000;   // 知らせる バーを とじたら つぎは 14日 あと
  const NOTICE_MAX = 3;                          // 3回 とじたら もう 出さない（おうちの人ページには のこる）

  function nav() { return (typeof navigator !== 'undefined') ? navigator : null; }

  function info() {
    if (fake) return { ios: !!fake.ios, standalone: !!fake.standalone, risk: !!fake.ios && !fake.standalone };
    const n = nav();
    if (!n) return { ios: false, standalone: false, risk: false };
    const ua = n.userAgent || '';
    const ios = /iPad|iPhone|iPod/.test(ua) || (n.platform === 'MacIntel' && (n.maxTouchPoints || 0) > 1);
    let standalone = !!n.standalone;
    try { standalone = standalone || window.matchMedia('(display-mode: standalone)').matches; } catch (e) { /* なにもしない */ }
    return { ios: ios, standalone: standalone, risk: ios && !standalone };
  }

  function remember(v) {
    last = v;
    try { if (MQ.save && MQ.save.setSetting && v !== null) MQ.save.setSetting('keep', v ? 'ok' : 'no'); } catch (e) { /* なにもしない */ }
    return v;
  }

  /* 守られて いるか（Promise<true|false|null>）。null＝この ブラウザでは わからない */
  function status() {
    if (fake) return Promise.resolve(fake.persisted == null ? null : !!fake.persisted);
    const n = nav();
    if (!n || !n.storage || !n.storage.persisted) return Promise.resolve(null);
    return n.storage.persisted().then(function (v) { return !!v; }).catch(function () { return null; });
  }

  /* 「消さないで」と たのむ。もう 守られて いれば 何も しない */
  function ask() {
    if (fake) return status().then(remember);
    const n = nav();
    if (!n || !n.storage || !n.storage.persist) return Promise.resolve(remember(null));
    return status().then(function (v) {
      if (v) return remember(true);
      return n.storage.persist().then(function (ok) { return remember(!!ok); }).catch(function () { return remember(false); });
    });
  }

  /* タイトルの 知らせる バーを いま 出すか（あぶない 端末だけ・とじたら 14日 あと・3回まで） */
  function noticeDue(now) {
    if (!info().risk) return false;
    if (!MQ.save || !MQ.save.getSetting) return false;
    const n = MQ.save.getSetting('keepNoticeN', 0) || 0;
    if (n >= NOTICE_MAX) return false;
    const at = MQ.save.getSetting('keepNoticeAt', 0) || 0;
    return !at || ((now || Date.now()) - at) >= NOTICE_GAP;
  }
  function noticeClosed(now) {
    MQ.save.setSetting('keepNoticeN', (MQ.save.getSetting('keepNoticeN', 0) || 0) + 1);
    MQ.save.setSetting('keepNoticeAt', now || Date.now());
  }

  MQ.keep = {
    info: info, ask: ask, status: status, last: function () { return last; },
    noticeDue: noticeDue, noticeClosed: noticeClosed,
    NOTICE_GAP: NOTICE_GAP, NOTICE_MAX: NOTICE_MAX,
    fake: function (f) { fake = f || null; last = null; }
  };
})();
