// Reveal on scroll
(() => {
  const els = document.querySelectorAll(".reveal");
  if (!els.length) return;
  if (!("IntersectionObserver" in window)) {
    els.forEach((e) => e.classList.add("in-view"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) {
        en.target.classList.add("in-view");
        io.unobserve(en.target);
      }
    }
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  els.forEach((e) => io.observe(e));
})();

// Card mouse-glow follow
(() => {
  const cards = document.querySelectorAll(".card");
  cards.forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width) * 100;
      const my = ((e.clientY - r.top) / r.height) * 100;
      card.style.setProperty("--mx", mx + "%");
      card.style.setProperty("--my", my + "%");
    });
    // Do NOT reset --mx/--my on mouseleave; the CSS opacity fade would
    // otherwise snap the glow back to the default position (50% 0%)
    // mid-fade. Keeping the last coords lets it fade in place.
  });
})();

// Lightbox for screenshots
(() => {
  const lb = document.getElementById("lightbox");
  if (!lb) return;
  const lbImg = lb.querySelector("img");
  const lbCap = lb.querySelector("figcaption");
  const btnClose = lb.querySelector(".lb-close");
  const btnPrev = lb.querySelector(".lb-nav.prev");
  const btnNext = lb.querySelector(".lb-nav.next");

  const shots = Array.from(document.querySelectorAll(".shot"));
  if (!shots.length) return;

  let idx = 0;
  let lastFocus = null;

  function render() {
    const shot = shots[idx];
    const img = shot.querySelector("img");
    const cap = shot.querySelector("figcaption");
    lbImg.src = img.src;
    lbImg.alt = img.alt || "";
    lbCap.textContent = cap ? cap.textContent : "";
  }

  function open(i) {
    idx = i;
    lastFocus = document.activeElement;
    render();
    lb.hidden = false;
    requestAnimationFrame(() => lb.classList.add("open"));
    document.body.style.overflow = "hidden";
    btnClose.focus();
  }

  function close() {
    lb.classList.remove("open");
    setTimeout(() => {
      lb.hidden = true;
      document.body.style.overflow = "";
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }, 220);
  }

  function step(delta) {
    idx = (idx + delta + shots.length) % shots.length;
    render();
  }

  shots.forEach((s, i) => {
    s.addEventListener("click", () => open(i));
    s.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(i); }
    });
  });

  btnClose.addEventListener("click", close);
  btnPrev.addEventListener("click", (e) => { e.stopPropagation(); step(-1); });
  btnNext.addEventListener("click", (e) => { e.stopPropagation(); step(1); });
  lb.addEventListener("click", (e) => { if (e.target === lb) close(); });

  document.addEventListener("keydown", (e) => {
    if (lb.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
  });
})();

// Install section: browser picker, copy, progress checklist
(() => {
  const section = document.getElementById("install");
  if (!section) return;

  const BROWSERS = {
    chrome: { name: "Chrome", url: "chrome://extensions" },
    brave:  { name: "Brave",  url: "brave://extensions" },
    edge:   { name: "Edge",   url: "edge://extensions" },
    arc:    { name: "Arc",    url: "arc://extensions" },
    opera:  { name: "Opera",  url: "opera://extensions" },
  };

  const STORAGE_KEY = "toll_install_progress";
  const BROWSER_KEY = "toll_install_browser";

  function setBrowser(key) {
    const b = BROWSERS[key] || BROWSERS.chrome;
    section.querySelectorAll(".bp-tab").forEach((t) => {
      const active = t.dataset.browser === key;
      t.classList.toggle("active", active);
      t.setAttribute("aria-selected", active ? "true" : "false");
    });
    section.querySelectorAll("[data-browser-text]").forEach((el) => {
      el.textContent = b.name;
    });
    section.querySelectorAll("[data-browser-url]").forEach((el) => {
      el.textContent = b.url;
    });
    section.querySelectorAll("[data-copy-target]").forEach((btn) => {
      btn.dataset.copyValue = b.url;
      btn.classList.remove("copied");
      const label = btn.querySelector(".copy-label");
      if (label) label.textContent = "Copy";
    });
    try { localStorage.setItem(BROWSER_KEY, key); } catch (_) {}
  }

  section.querySelectorAll(".bp-tab").forEach((t) => {
    t.addEventListener("click", () => setBrowser(t.dataset.browser));
  });

  let initial = "chrome";
  try {
    const saved = localStorage.getItem(BROWSER_KEY);
    if (saved && BROWSERS[saved]) initial = saved;
  } catch (_) {}
  setBrowser(initial);

  // Copy button
  section.querySelectorAll("[data-copy-target]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const value = btn.dataset.copyValue || "";
      try {
        await navigator.clipboard.writeText(value);
      } catch (_) {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch (_) {}
        document.body.removeChild(ta);
      }
      btn.classList.add("copied");
      const label = btn.querySelector(".copy-label");
      if (label) label.textContent = "Copied";
      clearTimeout(btn._copyT);
      btn._copyT = setTimeout(() => {
        btn.classList.remove("copied");
        if (label) label.textContent = "Copy";
      }, 1600);
    });
  });

  // Progress checklist
  const checks = Array.from(section.querySelectorAll("input[data-progress-key]"));
  const fill = document.getElementById("progress-fill");
  const text = document.getElementById("progress-text");
  const doneEl = document.getElementById("install-done");
  const resetBtn = document.getElementById("reset-progress");

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_) { return {}; }
  }
  function save(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function paint(state) {
    let done = 0;
    checks.forEach((c) => {
      const on = !!state[c.dataset.progressKey];
      c.checked = on;
      const li = c.closest("li");
      if (li) li.classList.toggle("done", on);
      if (on) done++;
    });
    const total = checks.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    if (fill) fill.style.width = pct + "%";
    if (text) text.textContent = `${done} of ${total} done`;
    if (doneEl) doneEl.hidden = done < total;
  }

  let state = load();
  paint(state);

  checks.forEach((c) => {
    c.addEventListener("change", () => {
      state[c.dataset.progressKey] = c.checked;
      save(state);
      paint(state);
    });
  });

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      state = {};
      save(state);
      paint(state);
    });
  }
})();

// Subtle parallax on hero laptop
(() => {
  const target = document.querySelector(".laptop");
  if (!target) return;
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (media.matches) return;
  const art = target.parentElement;
  art.addEventListener("mousemove", (e) => {
    const r = art.getBoundingClientRect();
    const dx = ((e.clientX - r.left) / r.width - 0.5) * 8;
    const dy = ((e.clientY - r.top) / r.height - 0.5) * 8;
    target.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  });
  art.addEventListener("mouseleave", () => {
    target.style.transform = "";
  });
})();
