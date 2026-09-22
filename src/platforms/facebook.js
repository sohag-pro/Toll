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
  apply();
  let lastPath = location.pathname;
  setInterval(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      apply();
    }
  }, 400);
})();
