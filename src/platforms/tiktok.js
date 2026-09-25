(function () {
  function isReelUrl() {
    const p = location.pathname;
    return p === "/" || p.startsWith("/foryou") || p.startsWith("/following") ||
      /^\/@[^/]+\/video\//.test(p);
  }
  let settings = window.Toll.DEFAULT_SETTINGS;
  function apply() {
    const enabled = !!(settings.tiktok && settings.tiktok.reel);
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
