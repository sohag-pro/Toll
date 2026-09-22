(function () {
  function isReelUrl() {
    const p = location.pathname;
    return p.startsWith("/reels/") || p.startsWith("/reel/") || p === "/reels" ||
      /^\/[^/]+\/reels/.test(p);
  }
  function apply() {
    window.FreeYou.setActive(isReelUrl());
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
