(function () {
  function isReelUrl() {
    const p = location.pathname;
    return p === "/" || p.startsWith("/foryou") || p.startsWith("/following") ||
      /^\/@[^/]+\/video\//.test(p);
  }
  function apply() {
    window.Toll.setActive(isReelUrl());
  }
  apply();
  let lastPath = location.pathname;
  setInterval(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      apply();
    }
  }, 400);
})();
