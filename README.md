<p align="center">
  <img src="docs/logo.svg" alt="Toll logo" width="120" />
</p>

<h1 align="center">Toll</h1>

<p align="center"><strong>Every reel costs you. Toll makes it literal.</strong></p>

<p align="center">
  <a href="https://github.com/sohag-pro/Toll/releases/latest"><img src="https://img.shields.io/github/v/release/sohag-pro/Toll?label=download&color=4c8dff" alt="Download latest release" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-6f7684" alt="MIT license" /></a>
</p>

Toll is a small browser extension. Every time you try to advance a Short, a Reel, or auto-load more of your homepage feed, it asks you to solve a quick math problem first. Solve it and you pass. Get it wrong and you wait.

That tiny toll is the whole point. It breaks the reflex.

## Features

- **Reel gate** on YouTube Shorts, Facebook Reels, Instagram Reels, TikTok. Scroll, swipe, arrow-keys, and the on-screen next/previous buttons are all intercepted.
- **Feed cap** on YouTube home + feed pages and the Facebook news feed. First two screens are free, then each unlock loads one more.
- **Math gate** — three problems per unlock, addition/subtraction/multiplication.
- **Escalating lockout** on wrong answers: 5s → 15s → 30s → 60s. One correct answer resets the streak.
- **Video auto-pause** while the gate is up on reels; resumes when you solve or cancel.
- **Control panel** in the toolbar popup: per-platform, per-mode toggles (Shorts vs. feed cap, etc.). Changes apply live — no page reload.
- **Time counter** in the top-right of each site — small pill that pops in on load and every few minutes of active use, showing today's time on that site. Only counts while the tab is visible and focused.
- **Daily totals** per site listed in the popup. Auto-rolls over at local midnight, keeps 30 days of history.
- **Local-only** — everything lives in `chrome.storage.local`. No servers, no accounts, no telemetry. Permissions: `storage` and the four site hosts.

## What it does

### Reels and Shorts

Scrolling, swiping, or arrow-keying to the next reel is blocked. Instead you get a math gate. The video pauses while you solve.

Works on: **YouTube Shorts**, **Facebook Reels**, **Instagram Reels**, **TikTok**.

<p align="center">
  <img src="docs/screenshots/youtube-shorts.png" alt="YouTube Shorts with math gate" width="45%" />
  &nbsp;
  <img src="docs/screenshots/facebook-reel.png" alt="Facebook Reels with math gate" width="45%" />
</p>

### Home feeds

The infinite scroll on YouTube's homepage and Facebook's news feed is capped. You get about two screens of content, and to load more you pay a toll.

<p align="center">
  <img src="docs/screenshots/facebook-timeline.png" alt="Facebook timeline capped by Toll" width="60%" />
</p>

### Wrong answers cost more

Get one wrong and you're locked out for a few seconds. Get the next one wrong too and it goes up: 5s, then 15s, then 30s, then 60s. Button-mashing is punished.

## Install in about two minutes

Toll works in any Chromium browser: **Arc**, **Google Chrome**, **Brave**, **Edge**, or **Opera**. You do not need to be a developer to install it.

### Step 1. Get the files

**Option A: Download the latest release (recommended)**

1. Go to the [latest release](https://github.com/sohag-pro/Toll/releases/latest).
2. Under **Assets**, download `toll-vX.Y.Z.zip`.
3. Unzip it. You should see a folder with `manifest.json` inside.

**Option B: Clone with git (for developers)**

```bash
git clone https://github.com/sohag-pro/Toll.git
```

### Step 2. Open the extensions page

Type one of these into your browser's address bar and press Enter:

| Browser | URL |
| --- | --- |
| Arc | `arc://extensions` |
| Chrome | `chrome://extensions` |
| Brave | `brave://extensions` |
| Edge | `edge://extensions` |
| Opera | `opera://extensions` |

### Step 3. Turn on Developer Mode

Find the **Developer mode** toggle in the top-right corner of the extensions page and turn it on. A row of new buttons will appear.

### Step 4. Load the extension

1. Click **Load unpacked**.
2. Pick the folder you unzipped (the one with `manifest.json` in it, not the folder above it).
3. Toll should now appear in your extension list.

### Step 5. Try it

Open any of these and try to scroll:

- youtube.com: homepage should stop after two screens.
- youtube.com/shorts: the next Short is blocked until you solve.
- facebook.com: timeline caps after two screens.
- facebook.com/reel/...: same behaviour as Shorts.
- instagram.com/reels
- tiktok.com

That is it. Nothing to sign up for, nothing sent anywhere.

## How to use it

Browse normally. When the gate appears:

1. Read the math problem (for example `47 × 3`).
2. Type the answer.
3. Press **Enter** or click **Submit**.
4. Do it two more times.
5. The reel advances, or the feed loads more.

**Wrong answer:** you're locked out briefly. Each wrong answer in a row makes the wait longer. Get one right and the timer resets.

**Cancel:** closes the gate without advancing. The reel stays where it is.

**Uninstall:** open the extensions page again and click **Remove**.

## Frequently asked

**Does it send my data anywhere?**
No. It runs entirely in your browser. No servers, no accounts, no tracking. The code is right here. Read it.

**Why math and not a delay timer?**
A timer does not stop the reflex. You just wait it out and keep scrolling. Solving something forces your brain into a different mode for a few seconds. That is the whole trick.

**Can I change the difficulty or number of problems?**
Yes. Open `src/core.js` and edit the constants near the top:

- `PROBLEMS_PER_GATE`: how many problems per gate (default `3`).
- `LOCKOUT_STEPS_MS`: the wait times after wrong answers.
- `CAP_INITIAL_PAGES`: how many screens of feed you get before the first gate (default `2`).
- `CAP_STEP_PAGES`: how many more screens you get per solved gate (default `1`).

After editing, go back to the extensions page and click the **reload** icon on the Toll card.

**Does it work on Safari or Firefox?**
Not yet. Chromium browsers only (Arc, Chrome, Brave, Edge, Opera). Safari and Firefox use a different extension format.

**A site changed and it stopped working.**
Reels and feeds change layouts often. Open an issue and I will update the site detection.

**Can I disable it on one site but not another?**
Yes. Click the Toll icon in the toolbar and flip the switch for that site (or just that mode — for example, keep Shorts gated but let the YouTube homepage run free). Changes apply immediately on open tabs.

**Where does the time-counter data live?**
In your browser's local extension storage. Nothing leaves your machine. Removing the extension wipes it.

## Under the hood

- Manifest V3 content-script extension.
- `src/core.js`: event blockers (wheel, key, touch, click), math modal, video pause, feed-cap engine, reel advance via the site's own scroll-snap container or its next/prev button, and the on-page time-tracker pill.
- `src/platforms/*.js`: one per site. Watches the URL and picks a mode: `reel`, `cap`, or `off`. Facebook and YouTube also register a site-specific `onAdvance` that clicks the real next/prev button after you solve.
- `src/popup.html` + `src/popup.js`: control panel. Reads/writes settings in `chrome.storage.local` and broadcasts to open tabs so toggles apply live.
- Time tracker key: `toll_time[platform][YYYY-MM-DD] = seconds`. Only ticks while the tab is visible and focused.
- No permissions beyond `storage` and access to the four sites listed in `manifest.json`.

## Contributing

Bug reports and site-detection fixes: open an issue with the URL and a note on what stopped working. Small PRs welcome. For larger changes, open an issue first so we can agree on scope.

Maintainers can produce a release ZIP with `./scripts/build.sh`. The output lands in `dist/` and is what gets attached to GitHub releases. Pushing a `vX.Y.Z` tag triggers `.github/workflows/release.yml`, which builds the ZIP and publishes a release automatically. The tag version must match `version` in `manifest.json`.

## License

MIT. See [LICENSE](LICENSE). If it helps you scroll less, that is the point.
