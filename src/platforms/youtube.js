(function () {
  function classify() {
    const p = location.pathname;
    if (p.startsWith("/shorts/")) return "reel";
    // Homepage + feed pages (Trending, Subscriptions, etc.) = infinite scroll.
    if (p === "/" || p === "" || p.startsWith("/feed/")) return "cap";
    return "off";
  }

  function apply() {
    const m = classify();
    window.Toll.setMode(m);
  }

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
