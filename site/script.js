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
    card.addEventListener("mouseleave", () => {
      card.style.removeProperty("--mx");
      card.style.removeProperty("--my");
    });
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

// Subtle parallax on hero phone
(() => {
  const phone = document.querySelector(".phone");
  if (!phone) return;
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (media.matches) return;
  const art = phone.parentElement;
  art.addEventListener("mousemove", (e) => {
    const r = art.getBoundingClientRect();
    const dx = ((e.clientX - r.left) / r.width - 0.5) * 8;
    const dy = ((e.clientY - r.top) / r.height - 0.5) * 8;
    phone.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  });
  art.addEventListener("mouseleave", () => {
    phone.style.transform = "";
  });
})();
