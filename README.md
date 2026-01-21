[English](./README.md) | [中文说明](./README.zh-CN.md)

# ArtPlayer Modular Starter

A modern, modular ArtPlayer starter project built with **ES Modules**, focused on clean structure, resume playback, and a glass-style UI.

This project demonstrates how to organize an ArtPlayer-based video player using native ES modules, making the codebase easy to extend, maintain, and publish.

---

## ✨ Features

- 🎬 **ArtPlayer integration** with clean container sizing
- 📦 **ES Module architecture** (no global pollution)
- ▶️ **Resume playback** with last progress memory
- 🪟 **Resume confirmation modal**
- 🎨 **Glassmorphism UI** (modern, minimal)
- ♿ **Reduced motion support** (`prefers-reduced-motion`)
- 📱 **Responsive layout** (desktop & mobile)

---

## 📁 Project Structure

```text
.
├─ index.html
├─ app.css
├─ main.js
├─ player/
│  ├─ init.js        # ArtPlayer initialization
│  ├─ resume.js      # Resume / continue logic
│  └─ storage.js     # LocalStorage helpers
├─ ui/
│  ├─ modal.js       # Resume modal UI
│  └─ progress.js    # Last-played progress line
└─ assets/
```

> The structure is intentionally flat and readable — no framework required.

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
