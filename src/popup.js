const DEFAULTS = {
  youtube: { reel: true, cap: true },
  facebook: { reel: true, cap: true },
  instagram: { reel: true },
  tiktok: { reel: true },
  tracker: { enabled: true, showEveryMin: 5, showDurationSec: 5 },
};

const PLATFORM_LABELS = {
  youtube: "YouTube",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
};

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtDur(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

function loadTimes() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ toll_time: {} }, (r) => resolve(r.toll_time || {}));
  });
}

async function renderTimes() {
  const el = document.getElementById("time-today");
  if (!el) return;
  const all = await loadTimes();
  const k = todayKey();
  const lines = Object.keys(PLATFORM_LABELS).map((p) => {
    const sec = Number((all[p] || {})[k]) || 0;
    return `<div style="display:flex;justify-content:space-between;"><span>${PLATFORM_LABELS[p]}</span><span style="color:#e8ebf0;">${fmtDur(sec)}</span></div>`;
  });
  el.innerHTML = lines.join("");
}

const HOST_PATTERNS = [
  "*://*.youtube.com/*",
  "*://*.facebook.com/*",
  "*://*.instagram.com/*",
  "*://*.tiktok.com/*",
];

function merge(over) {
  const out = {};
  for (const k of Object.keys(DEFAULTS)) {
    out[k] = Object.assign({}, DEFAULTS[k], (over && over[k]) || {});
  }
  return out;
}

function load() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ toll_settings: DEFAULTS }, (r) => {
      resolve(merge(r.toll_settings || DEFAULTS));
    });
  });
}

function save(settings) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ toll_settings: settings }, resolve);
  });
}

function broadcast(settings) {
  try {
    chrome.tabs.query({ url: HOST_PATTERNS }, (tabs) => {
      if (!tabs) return;
      for (const t of tabs) {
        try {
          chrome.tabs.sendMessage(t.id, { type: "toll_settings", settings }, () => {
            void chrome.runtime.lastError;
          });
        } catch (_) {}
      }
    });
  } catch (_) {}
}

function paint(settings) {
  document.querySelectorAll("input[data-key]").forEach((input) => {
    const [plat, key] = input.dataset.key.split(".");
    input.checked = !!(settings[plat] && settings[plat][key]);
  });
}

let statusTimer = null;
function flash(msg, color) {
  const el = document.getElementById("status");
  if (!el) return;
  el.textContent = msg;
  el.style.color = color || "#5db07a";
  el.style.opacity = "1";
  if (statusTimer) clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { el.style.opacity = "0"; }, 1200);
}

async function persist(settings) {
  try {
    await save(settings);
    broadcast(settings);
    flash("Saved", "#5db07a");
  } catch (e) {
    flash("Save failed", "#e06b6b");
  }
}

async function init() {
  let settings = await load();
  paint(settings);
  renderTimes();

  document.querySelectorAll("input[data-key]").forEach((input) => {
    input.addEventListener("change", async () => {
      const [plat, key] = input.dataset.key.split(".");
      settings[plat] = Object.assign({}, settings[plat], { [key]: input.checked });
      await persist(settings);
    });
  });

  document.getElementById("reset").addEventListener("click", async () => {
    settings = merge(null);
    paint(settings);
    await persist(settings);
  });
}

init();
