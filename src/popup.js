const DEFAULTS = {
  youtube: { reel: true, cap: true },
  facebook: { reel: true, cap: true },
  instagram: { reel: true },
  tiktok: { reel: true },
};

function merge(over) {
  const out = {};
  for (const k of Object.keys(DEFAULTS)) {
    out[k] = Object.assign({}, DEFAULTS[k], (over && over[k]) || {});
  }
  return out;
}

function load() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ toll_settings: DEFAULTS }, (r) => {
      resolve(merge(r.toll_settings || DEFAULTS));
    });
  });
}

function save(settings) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ toll_settings: settings }, resolve);
  });
}

function paint(settings) {
  document.querySelectorAll("input[data-key]").forEach((input) => {
    const [plat, key] = input.dataset.key.split(".");
    input.checked = !!(settings[plat] && settings[plat][key]);
  });
}

async function init() {
  let settings = await load();
  paint(settings);

  document.querySelectorAll("input[data-key]").forEach((input) => {
    input.addEventListener("change", async () => {
      const [plat, key] = input.dataset.key.split(".");
      settings[plat] = Object.assign({}, settings[plat], { [key]: input.checked });
      await save(settings);
    });
  });

  document.getElementById("reset").addEventListener("click", async () => {
    settings = merge(null);
    await save(settings);
    paint(settings);
  });
}

init();
