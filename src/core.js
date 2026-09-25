// Toll core: reel scroll blocker + infinite-scroll cap. Both gated by math modal.

(function () {
  const PROBLEMS_PER_GATE = 3;
  const LOCKOUT_STEPS_MS = [5000, 15000, 30000, 60000];
  const SCROLL_COOLDOWN_MS = 800;
  const CAP_INITIAL_PAGES = 2;   // viewports visible on load
  const CAP_STEP_PAGES = 1;      // viewports added per solve
  const CAP_TRIGGER_BUFFER = 8;  // px from cap that counts as "at cap"

  // Mode: 'off' | 'reel' | 'cap'
  const state = {
    mode: "off",
    gateOpen: false,
    backdropOpen: false,
    wrongStreak: 0,
    lockedUntil: 0,
    lastScrollAt: 0,
    advancing: false,
    pendingDirection: null,
    pendingAction: null, // 'advance' | 'extend'
    onAdvance: null,
    pauseInterval: null,
    capY: 0,
    scrollTarget: null,
  };

  // ---------- Math ----------

  function genProblem() {
    const ops = ["+", "-", "*"];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a, b, answer;
    if (op === "+") {
      a = 10 + Math.floor(Math.random() * 90);
      b = 10 + Math.floor(Math.random() * 90);
      answer = a + b;
    } else if (op === "-") {
      a = 20 + Math.floor(Math.random() * 80);
      b = 10 + Math.floor(Math.random() * (a - 10));
      answer = a - b;
    } else {
      a = 2 + Math.floor(Math.random() * 11);
      b = 2 + Math.floor(Math.random() * 11);
      answer = a * b;
    }
    return { text: `${a} ${op} ${b}`, answer };
  }

  function buildProblemSet() {
    const out = [];
    for (let i = 0; i < PROBLEMS_PER_GATE; i++) out.push(genProblem());
    return out;
  }

  function nowLocked() {
    return Date.now() < state.lockedUntil;
  }

  function stopEvent(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  // ---------- Scroll target (window vs. custom container) ----------

  function scrollY() {
    const t = state.scrollTarget;
    if (t && t !== window) return t.scrollTop;
    return window.scrollY || document.documentElement.scrollTop || 0;
  }

  function scrollTo(y) {
    const t = state.scrollTarget;
    if (t && t !== window) {
      t.scrollTop = y;
    } else {
      window.scrollTo({ top: y });
    }
  }

  function viewportH() {
    const t = state.scrollTarget;
    if (t && t !== window) return t.clientHeight || window.innerHeight;
    return window.innerHeight;
  }

  // ---------- Video pause / resume ----------

  function allVideos() {
    return Array.from(document.querySelectorAll("video"));
  }

  function pauseVideos() {
    for (const v of allVideos()) {
      try {
        if (!v.paused) {
          v.dataset.tollPaused = "1";
          v.pause();
        } else if (v.dataset.tollPaused == null) {
          v.dataset.tollPaused = "0";
        }
      } catch (_) {}
    }
  }

  function resumeVideos() {
    for (const v of allVideos()) {
      try {
        const wasPaused = v.dataset.tollPaused;
        delete v.dataset.tollPaused;
        if (wasPaused === "1") {
          const p = v.play();
          if (p && p.catch) p.catch(() => {});
        }
      } catch (_) {}
    }
  }

  function startPausePoll() {
    if (state.pauseInterval) return;
    state.pauseInterval = setInterval(() => {
      for (const v of allVideos()) {
        if (!v.paused) {
          try { v.pause(); } catch (_) {}
          if (v.dataset.tollPaused == null) v.dataset.tollPaused = "1";
        }
      }
    }, 250);
  }

  function stopPausePoll() {
    if (state.pauseInterval) {
      clearInterval(state.pauseInterval);
      state.pauseInterval = null;
    }
  }

  // ---------- Reel advance ----------

  function activeVideo() {
    const vids = allVideos();
    const vpH = window.innerHeight;
    let best = null;
    for (const v of vids) {
      const r = v.getBoundingClientRect();
      if (r.height < 100) continue;
      if (r.bottom < 0 || r.top > vpH) continue;
      const overlap = Math.min(r.bottom, vpH) - Math.max(r.top, 0);
      if (!best || overlap > best.overlap) best = { v, overlap };
    }
    return best ? best.v : null;
  }

  function findSnapContainer(fromEl) {
    let el = fromEl && fromEl.parentElement;
    while (el && el !== document.body && el !== document.documentElement) {
      const s = getComputedStyle(el);
      const snap = s.scrollSnapType && s.scrollSnapType !== "none";
      const scrollable = /(auto|scroll)/.test(s.overflowY);
      if (snap || (scrollable && el.scrollHeight > el.clientHeight + 20)) return el;
      el = el.parentElement;
    }
    return null;
  }

  function defaultAdvance(dir) {
    const v = activeVideo();
    const c = findSnapContainer(v);
    const delta = dir === "next" ? 1 : -1;
    if (c) {
      c.scrollBy({ top: delta * c.clientHeight, behavior: "smooth" });
      return true;
    }
    window.scrollBy({ top: delta * window.innerHeight, behavior: "smooth" });
    const key = dir === "next" ? "ArrowDown" : "ArrowUp";
    const opts = { key, code: key, bubbles: true, cancelable: true };
    document.dispatchEvent(new KeyboardEvent("keydown", opts));
    document.dispatchEvent(new KeyboardEvent("keyup", opts));
    return false;
  }

  // ---------- Cap helpers ----------

  function atCap() {
    return scrollY() >= state.capY - CAP_TRIGGER_BUFFER;
  }

  function extendCap() {
    state.capY += viewportH() * CAP_STEP_PAGES;
  }

  // ---------- Event blockers ----------

  function onWheel(e) {
    if (state.mode === "off") return;
    if (state.mode === "reel") {
      if (Math.abs(e.deltaY) > 2) {
        stopEvent(e);
        throttleTrigger(e.deltaY > 0 ? "next" : "prev", "advance");
      }
      return;
    }
    if (state.mode === "cap") {
      if (e.deltaY > 0 && atCap()) {
        stopEvent(e);
        throttleTrigger("next", "extend");
      }
    }
  }

  function onKey(e) {
    if (state.mode === "off") return;
    const t = e.target;
    if (t && t.closest && t.closest("#toll-root")) return;

    const downKeys = ["ArrowDown", "PageDown", "End", "j", "J", " ", "Spacebar"];
    const upKeys = ["ArrowUp", "PageUp", "Home", "k", "K"];
    const isDown = downKeys.includes(e.key);
    const isUp = upKeys.includes(e.key);
    if (!isDown && !isUp) return;

    if (state.mode === "reel") {
      stopEvent(e);
      throttleTrigger(isDown ? "next" : "prev", "advance");
      return;
    }
    if (state.mode === "cap") {
      if (isDown && atCap()) {
        stopEvent(e);
        throttleTrigger("next", "extend");
      }
      // End tries to jump to bottom, so always block in cap mode.
      if (e.key === "End") {
        stopEvent(e);
        throttleTrigger("next", "extend");
      }
    }
  }

  let touchStartY = null;
  function onTouchStart(e) {
    if (state.mode === "off") return;
    if (e.touches && e.touches.length) touchStartY = e.touches[0].clientY;
  }
  function onTouchMove(e) {
    if (state.mode === "off") return;
    if (touchStartY == null) return;
    const y = e.touches[0].clientY;
    const delta = touchStartY - y; // >0 = swipe up = scroll down
    if (state.mode === "reel") {
      if (Math.abs(delta) > 8) stopEvent(e);
      return;
    }
    if (state.mode === "cap") {
      if (delta > 8 && atCap()) stopEvent(e);
    }
  }
  function onTouchEnd(e) {
    if (state.mode === "off" || touchStartY == null) return;
    const y = (e.changedTouches && e.changedTouches[0].clientY) || touchStartY;
    const delta = touchStartY - y;
    touchStartY = null;
    if (Math.abs(delta) < 40) return;
    if (state.mode === "reel") {
      throttleTrigger(delta > 0 ? "next" : "prev", "advance");
    } else if (state.mode === "cap") {
      if (delta > 0 && atCap()) throttleTrigger("next", "extend");
    }
  }

  function reelNavFromEvent(e) {
    const path = (e.composedPath && e.composedPath()) || [];
    const nodes = path.length ? path : [e.target];
    for (const n of nodes) {
      if (!n || n.nodeType !== 1) continue;
      const el = n;
      if (el.closest && el.closest("#toll-root")) return null;
      const id = (el.id || "").toLowerCase();
      if (id === "navigation-button-down") return "next";
      if (id === "navigation-button-up") return "prev";
      const label = (el.getAttribute && (el.getAttribute("aria-label") || "")) || "";
      const l = label.toLowerCase();
      if (l && (/(next|forward|down)/.test(l) || /(prev|previous|back|up)/.test(l))) {
        if (/(prev|previous|back|up)/.test(l)) return "prev";
        return "next";
      }
    }
    return null;
  }

  function onClick(e) {
    if (state.mode !== "reel") return;
    if (state.advancing) return;
    const t = e.target;
    if (t && t.closest && t.closest("#toll-root")) return;
    const dir = reelNavFromEvent(e);
    if (!dir) return;
    stopEvent(e);
    throttleTrigger(dir, "advance");
  }

  function onScroll() {
    if (state.mode !== "cap") return;
    if (scrollY() > state.capY) {
      scrollTo(state.capY);
      if (!state.gateOpen && !nowLocked()) throttleTrigger("next", "extend");
    }
  }

  function throttleTrigger(dir, action) {
    if (state.advancing) return;
    const t = Date.now();
    if (t - state.lastScrollAt < SCROLL_COOLDOWN_MS) return;
    state.lastScrollAt = t;
    if (nowLocked()) {
      showLockout();
      return;
    }
    openGate(dir, action);
  }

  // ---------- Modal ----------

  let rootEl = null;
  function ensureRoot() {
    if (rootEl) return rootEl;
    rootEl = document.createElement("div");
    rootEl.id = "toll-root";
    (document.body || document.documentElement).appendChild(rootEl);
    return rootEl;
  }

  function openBackdrop(withPause) {
    if (!state.backdropOpen) {
      state.backdropOpen = true;
      if (withPause) {
        pauseVideos();
        startPausePoll();
      }
    }
  }

  function closeBackdrop() {
    if (rootEl) rootEl.innerHTML = "";
    if (state.backdropOpen) {
      state.backdropOpen = false;
      stopPausePoll();
      resumeVideos();
    }
  }

  function closeGate() {
    state.gateOpen = false;
    closeBackdrop();
  }

  function showLockout() {
    ensureRoot();
    openBackdrop(state.mode === "reel");
    const remain = Math.ceil((state.lockedUntil - Date.now()) / 1000);
    rootEl.innerHTML = `
      <div class="toll-backdrop">
        <div class="toll-card">
          <div class="toll-title">Locked out</div>
          <div class="toll-sub">Wrong answers add up. Wait <span id="fy-countdown">${remain}</span>s.</div>
        </div>
      </div>`;
    const el = rootEl.querySelector("#fy-countdown");
    const iv = setInterval(() => {
      const r = Math.ceil((state.lockedUntil - Date.now()) / 1000);
      if (r <= 0) {
        clearInterval(iv);
        closeBackdrop();
        return;
      }
      if (el) el.textContent = r;
    }, 250);
  }

  function openGate(direction, action) {
    if (state.gateOpen) return;
    state.gateOpen = true;
    state.pendingDirection = direction;
    state.pendingAction = action;
    ensureRoot();
    openBackdrop(state.mode === "reel");

    const problems = buildProblemSet();
    let idx = 0;

    const label = action === "extend"
      ? "Solve to load more"
      : (direction === "next" ? "Solve to advance (next reel)" : "Solve to advance (previous reel)");
    const badge = action === "extend"
      ? "Toll · More feed"
      : `Toll · ${direction === "next" ? "Next reel" : "Previous reel"}`;

    function render(errMsg) {
      const p = problems[idx];
      rootEl.innerHTML = `
        <div class="toll-backdrop">
          <div class="toll-card">
            <div class="toll-badge">${badge}</div>
            <div class="toll-title">${label} (${idx + 1}/${problems.length})</div>
            <div class="toll-problem">${p.text} = ?</div>
            <input class="toll-input" id="fy-input" type="text" inputmode="numeric" autocomplete="off" autofocus />
            <div class="toll-err">${errMsg || ""}</div>
            <div class="toll-actions">
              <button id="fy-submit" class="toll-btn primary">Submit</button>
              <button id="fy-cancel" class="toll-btn">Cancel</button>
            </div>
            <div class="toll-hint">Wrong = escalating lockout. Break the reflex.</div>
          </div>
        </div>`;
      const input = rootEl.querySelector("#fy-input");
      const submit = rootEl.querySelector("#fy-submit");
      const cancel = rootEl.querySelector("#fy-cancel");
      input.focus();

      function attempt() {
        const val = parseInt(input.value.trim(), 10);
        if (Number.isNaN(val)) {
          render("Enter a number.");
          return;
        }
        if (val === p.answer) {
          idx++;
          if (idx >= problems.length) {
            state.wrongStreak = 0;
            const dir = state.pendingDirection;
            const act = state.pendingAction;
            state.pendingDirection = null;
            state.pendingAction = null;
            state.gateOpen = false;
            closeBackdrop();
            setTimeout(() => {
              if (act === "extend") {
                extendCap();
              } else {
                const fn = state.onAdvance || defaultAdvance;
                state.advancing = true;
                try { fn(dir); } catch (_) { defaultAdvance(dir); }
                setTimeout(() => { state.advancing = false; }, 400);
              }
            }, 60);
          } else {
            render("");
          }
        } else {
          const stepIdx = Math.min(state.wrongStreak, LOCKOUT_STEPS_MS.length - 1);
          const ms = LOCKOUT_STEPS_MS[stepIdx];
          state.wrongStreak++;
          state.lockedUntil = Date.now() + ms;
          state.gateOpen = false;
          showLockout();
        }
      }
      submit.addEventListener("click", attempt);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          attempt();
        }
      });
      cancel.addEventListener("click", () => closeGate());
    }
    render("");
  }

  // ---------- Wire up ----------

  function attachListeners() {
    window.addEventListener("wheel", onWheel, { capture: true, passive: false });
    window.addEventListener("keydown", onKey, { capture: true });
    window.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
    window.addEventListener("touchmove", onTouchMove, { capture: true, passive: false });
    window.addEventListener("touchend", onTouchEnd, { capture: true, passive: true });
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("click", onClick, { capture: true });
    window.addEventListener("pointerup", onClick, { capture: true });
    window.addEventListener("pointerdown", onClick, { capture: true });
    window.addEventListener("mousedown", onClick, { capture: true });
    window.addEventListener("mouseup", onClick, { capture: true });
  }

  attachListeners();

  // ---------- Public API ----------

  window.Toll = {
    setMode(mode, opts) {
      opts = opts || {};
      state.scrollTarget = opts.scrollTarget || null;
      // Reset cap when entering cap mode or leaving it.
      if (mode === "cap") {
        state.capY = (opts.initialPages != null ? opts.initialPages : CAP_INITIAL_PAGES) * viewportH();
        // If we entered mid-scroll, clamp back.
        if (scrollY() > state.capY) scrollTo(state.capY);
      }
      state.mode = mode || "off";
      if (state.mode === "off") closeGate();
    },
    // Legacy reel toggle kept for existing platform scripts.
    setActive(v) {
      this.setMode(v ? "reel" : "off");
    },
    isActive() { return state.mode !== "off"; },
    mode() { return state.mode; },
    onAdvance(fn) { state.onAdvance = fn; },
    defaultAdvance,
    activeVideo,
    findSnapContainer,
    // Exposed for platform-specific tuning.
    _extendCap: extendCap,
    _capY() { return state.capY; },
  };
})();
