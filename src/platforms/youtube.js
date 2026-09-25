(function () {
  function classify() {
    const p = location.pathname;
    if (p.startsWith("/shorts/")) return "reel";
    // Homepage + feed pages (Trending, Subscriptions, etc.) = infinite scroll.
    if (p === "/" || p === "" || p.startsWith("/feed/")) return "cap";
    return "off";
  }

  let settings = window.Toll.DEFAULT_SETTINGS;
  function effectiveMode() {
    const raw = classify();
    const yt = settings.youtube || {};
    if (raw === "reel" && !yt.reel) return "off";
    if (raw === "cap" && !yt.cap) return "off";
    return raw;
  }
  function apply() { window.Toll.setMode(effectiveMode()); }

  window.Toll.readSettings((s) => { settings = s; apply(); });
  window.Toll.onSettingsChange((s) => { settings = s; apply(); });

  window.Toll.onAdvance(function (dir) {
    const sel = dir === "next"
      ? '#navigation-button-down button, ytd-shorts button[aria-label*="Next" i]'
      : '#navigation-button-up button, ytd-shorts button[aria-label*="Previous" i]';
    const btn = document.querySelector(sel);
    if (btn) { btn.click(); return; }
    window.Toll.defaultAdvance(dir);
  });

  apply();
  let lastPath = location.pathname;
  setInterval(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      apply();
    }
  }, 400);
  window.addEventListener("yt-navigate-finish", apply);
})();
