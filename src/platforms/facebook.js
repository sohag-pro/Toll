(function () {
  function classify() {
    const p = location.pathname;
    if (p.startsWith("/reel/") || p.startsWith("/reels/") ||
        (p.includes("/watch") && location.search.includes("reel"))) return "reel";
    // Home / newsfeed = infinite scroll.
    if (p === "/" || p === "/home.php" || p.startsWith("/home")) return "cap";
    return "off";
  }
  function apply() { window.Toll.setMode(classify()); }

  function visible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    if (r.bottom < 0 || r.top > (window.innerHeight || 0)) return false;
    const s = getComputedStyle(el);
    return s.visibility !== "hidden" && s.display !== "none" && s.pointerEvents !== "none";
  }

  function findNavButton(dir) {
    const rx = dir === "next" ? /(next|forward|down)/i : /(prev|previous|back|up)/i;
    const nodes = document.querySelectorAll('[aria-label]');
    for (const n of nodes) {
      const label = n.getAttribute("aria-label") || "";
      if (!rx.test(label)) continue;
      const role = n.getAttribute("role");
      const isBtn = n.tagName === "BUTTON" || role === "button" || n.tabIndex >= 0;
      if (!isBtn) continue;
      if (!visible(n)) continue;
      return n;
    }
    return null;
  }

  window.Toll.onAdvance(function (dir) {
    const btn = findNavButton(dir);
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
})();
