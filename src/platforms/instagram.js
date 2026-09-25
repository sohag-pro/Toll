(function () {
  function isReelUrl() {
    const p = location.pathname;
    return p.startsWith("/reels/") || p.startsWith("/reel/") || p === "/reels" ||
      /^\/[^/]+\/reels/.test(p);
  }
  let settings = window.Toll.DEFAULT_SETTINGS;
  function apply() {
    const enabled = !!(settings.instagram && settings.instagram.reel);
    window.Toll.setActive(enabled && isReelUrl());
  }
  window.Toll.readSettings((s) => { settings = s; apply(); });
  window.Toll.onSettingsChange((s) => { settings = s; apply(); });
  apply();
  let lastPath = location.pathname;
  setInterval(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      apply();
    }
  }, 400);
})();
