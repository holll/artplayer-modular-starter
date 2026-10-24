[English](./README.md) | [中文说明](./README.zh-CN.md)

# ArtPlayer Modular Starter

A modern, modular ArtPlayer starter project built with **ES Modules**, focused on clean structure and a glass-style UI.

This project demonstrates how to organize an ArtPlayer-based video player using native ES modules, making the codebase easy to extend, maintain, and publish.

---

## ✨ Features

- 🎬 **ArtPlayer integration** with clean container sizing
- 📦 **ES Module architecture** (no global pollution)
- 🎨 **Glassmorphism UI** (modern, minimal)
- ♿ **Accessibility built in** (keyboard-operable controls, progress bar exposed as an ARIA slider, live status region, `prefers-reduced-motion`)
- 📱 **Mobile-first layout** (44px touch targets, landscape & safe-area handling, control bar trimmed below 480 px so the fullscreen button never clips)
- 🪟 **Honest empty state** — no fake spinner before a URL is pasted, and Stop/PiP/Screenshot stay disabled until something is loaded
- 🧩 **One-line presets** — the four sample types are compact chips, so the whole page fits a 390×844 screen
- 🔁 **Playback engine cleanup** (HLS / FLV / DASH are destroyed on switch — no leaks)
- ⚠️ **Readable error handling** (CORS / 403 / network failures surface as plain text, not a spinner)
- 🌐 **Optional proxy prefix** for CORS-blocked streams (`?proxy=`, see [docs/cors-playback.md](./docs/cors-playback.md)) — note the player itself is not a proxy: plain MP4/WebM files play cross-origin without any CORS header, but HLS / FLV / DASH are fetched by MSE and **need `Access-Control-Allow-Origin`** (or your own proxy) on the media host
- ⚡ **On-demand playback engines** — HLS / FLV / DASH are lazy-loaded, first paint is ~270 KB instead of ~1.5 MB
- 🔒 **Media Session support** — lock screen / notification / headset keys control playback
- 📶 **Offline aware** — disconnects and reconnects surface as plain-text status and resume automatically

---

## 📁 Project Structure

```text
.
├─ index.html
├─ css/
├─ docs/
│  └─ cors-playback.md   # Working around CORS when playing video
├─ js/
│  ├─ main.js            # App entry
│  ├─ dom.js             # DOM helpers
│  ├─ utils.js           # Shared utils
│  ├─ customTypes.js     # HLS/FLV/DASH hooks
│  ├─ engines.js         # Lazy loader for HLS / FLV / DASH
│  ├─ mediaSession.js    # Lock screen / headset key controls
│  ├─ aspectRatio.js     # Aspect ratio sync
│  ├─ liveDetect.js      # Live stream detection
│  ├─ presets.json       # Demo URL presets
│  └─ vendors/           # ArtPlayer + lazily loaded playback libs
├─ samples/               # bundled demo media in all four formats (ffmpeg, see make.sh)
├─ fonts/
└─ favicon.ico
```

> The JS is kept in a single folder (plus `vendors`) to reduce nesting and stay easy to scan.

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yourname/artplayer-modular-starter.git
cd artplayer-modular-starter
```

### 2. Run a local server

Because ES Modules require HTTP:

```bash
# Using Node
npx serve

# Or with Vite
npm create vite@latest
```

Then open the provided local URL in your browser.

---

## 🧩 Why ES Modules?

- Static imports enable **tree-shaking**
- No global variables
- Native browser support
- Cleaner dependency graph
- Easier long-term maintenance

This project intentionally avoids bundler-specific syntax so it works both **with or without** build tools.

---

## 🌐 Playing cross-origin streams

Media served without `Access-Control-Allow-Origin` cannot be read by hls.js / flv.js / dash.js,
and any `crossorigin` attribute makes even plain MP4 fail. Two escape hatches are built in:

```js
// once per browser (persisted in localStorage)
setArtPlayerProxy("https://proxy.example.com/?url=");
setArtPlayerProxy(""); // disable

// or per URL
// https://your-site/?proxy=https://proxy.example.com/?url=
```

The prefix only rewrites **MSE** sources (`m3u8` / `flv` / `mpd`); direct MP4 stays untouched.
Full write-up (reverse proxy recipes, Cloudflare Worker, Nginx, what still cannot work): **[docs/cors-playback.md](./docs/cors-playback.md)**.

---

## ⚡ Performance notes

Playback engines are loaded on demand by `js/engines.js`:

| | Before | After |
|---|---|---|
| First load, decoded | ~1.54 MB (15 requests) | ~240 KB (12 requests) |
| First load, over the wire (gzip) | — | ~105 KB |
| HLS / FLV / DASH script | always downloaded | fetched only when that format is played (also prefetched 250 ms after you type a matching URL) |

Details worth knowing:

- Fonts are the largest single asset after ArtPlayer, so the page preloads the one variable font it actually uses (`fonts/inter_*.woff2`) and no longer ships a second Latin-only Noto Sans SC subset — Chinese text always came from the system font anyway.
- The entry module and its static imports are `modulepreload`ed and `artplayer.js` is `defer`red, so parsing is not blocked by the 155 KB player core.
- The DASH build is `dash.mediaplayer.min.js` (714 KB) instead of `dash.all.min.js` (775 KB): offline, DRM/protection and reporting modules are not needed to play a manifest.
- `flv.js` runs with `enableWorker: false` — its worker build throws `Class extends value undefined` on some Chromium builds, which fails the whole stream. Demuxing on the main thread costs a little CPU but always works.
- The progress bar has a 44 px touch target (10 px visual) while the rest of the control bar stays 48 px, so dragging on phones no longer misses.

Two engine details worth knowing:

- `flv.js` runs with `enableWorker: false` — its worker build throws `Class extends value undefined` on some Chromium builds, which fails the whole stream. Demuxing on the main thread costs a little CPU but always works.
- The progress bar has a 44 px touch target (10 px visual) while the rest of the control bar stays 48 px, so dragging on phones no longer misses.

---

## 🛠 Customization

- Change video fill mode:
  ```css
  #player video {
    object-fit: cover; /* or contain */
  }
  ```

- Control aspect ratio dynamically:
  ```js
  player.style.setProperty('--ar', '21/9')
  ```

- Disable animations for accessibility is already supported automatically.

---

## 📦 Recommended Use Cases

- Video players
- Course / tutorial platforms
- Internal tools
- Prototypes or production-ready starters

---

## 📄 License

MIT License

Feel free to use, modify, and publish.

---

## 🙌 Credits

- [ArtPlayer](https://github.com/zhw2590582/ArtPlayer)
