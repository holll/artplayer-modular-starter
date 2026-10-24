# ArtPlayer 模块化播放器起步项目

一个基于 **ArtPlayer + 原生 ES Modules** 的现代化播放器示例项目，重点展示**清晰的模块结构**，以及一套简洁克制的玻璃拟态 UI。

本项目不依赖任何前端框架，适合作为 **学习示例 / 起步模板 / 真实项目基础**。

---

## ✨ 功能特性

- 🎬 **ArtPlayer 播放器集成**
- 📦 **原生 ES Module 架构**（无全局变量污染）
- 🎨 **Glassmorphism 玻璃拟态 UI**
- ♿ **无障碍支持**（控制条可键盘操作、ARIA 标注、适配 `prefers-reduced-motion`）
- 📱 **移动端优先布局**（44px 触控区、横屏与安全区适配）
- 🔁 **播放引擎自动销毁**（HLS / FLV / DASH 切换时释放，不泄漏）
- ⚠️ **可读的错误提示**（CORS / 403 / 网络异常以文字说明，而不是一直转圈）
- 🌐 **可选代理前缀**，绕过跨域限制（`?proxy=`，详见 [docs/cors-playback.md](./docs/cors-playback.md)）

---

## 📁 项目结构

```text
.
├─ index.html
├─ css/
├─ docs/
│  └─ cors-playback.md   # 跨域播放的可行方案
├─ js/
│  ├─ main.js            # 应用入口
│  ├─ dom.js             # DOM 工具
│  ├─ utils.js           # 通用工具
│  ├─ customTypes.js     # HLS/FLV/DASH 扩展
│  ├─ aspectRatio.js     # 比例同步
│  ├─ liveDetect.js      # 直播检测
│  ├─ presets.json       # 示例地址配置
│  └─ vendors/           # ArtPlayer 及播放依赖
├─ fonts/
└─ favicon.ico
```

> JS 结构合并到同一层级（仅保留 `vendors` 子目录），减少层级更易维护。

---

## 🚀 快速开始

### 1️⃣ 克隆仓库

```bash
git clone https://github.com/你的用户名/artplayer-modular-starter.git
cd artplayer-modular-starter
```

### 2️⃣ 启动本地服务器

由于 ES Modules 需要通过 HTTP 加载，请不要直接使用 `file://` 打开。

```bash
# 使用 Node.js
npx serve

# 或使用 Vite（可选）
npm create vite@latest
```

然后在浏览器中打开终端提示的本地地址即可。

---

## 🧩 为什么使用 ES Modules？

- 静态导入，依赖关系清晰
- 支持 Tree Shaking
- 无全局变量污染
- 浏览器原生支持
- 更利于长期维护和扩展

本项目刻意避免使用打包器私有语法，**既可直接运行，也方便未来接入 Vite / Rollup / Webpack**。

---

## 🌐 播放跨域视频源

源站不返回 `Access-Control-Allow-Origin` 时，hls.js / flv.js / dash.js 无法读取分片；
而给 MP4 加 `crossorigin` 反而会让本来能播的直链失败。项目内置两种代理开关：

```js
// 控制台执行一次即可（写入 localStorage）
setArtPlayerProxy("https://proxy.example.com/?url=");
setArtPlayerProxy(""); // 关闭

// 或单次生效：https://your-site/?proxy=https://proxy.example.com/?url=
```

代理只作用于 **MSE 类**（`m3u8` / `flv` / `mpd`），MP4 直出保持原地址。
完整方案（反代、Cloudflare Worker、Nginx、以及仍然无解的情况）：**[docs/cors-playback.md](./docs/cors-playback.md)**。

---

## 🛠 常见定制点

### ▶️ 控制视频填充方式

```css
#player video {
  object-fit: contain; /* 或 cover */
}
```

### 📐 动态设置视频比例

```js
player.style.setProperty('--ar', '21/9')
```

### ♿ 动画与无障碍

已自动支持系统的「减少动态效果」设置，无需额外配置。

---

## 📦 适用场景

- 视频播放器
- 在线课程 / 教程平台
- 内部工具 / 后台系统
- Demo、原型或可直接扩展为生产项目

---

## 📄 许可证

MIT License

你可以自由使用、修改、发布本项目代码。

---

## 🙌 致谢

- [ArtPlayer](https://github.com/zhw2590582/ArtPlayer)

---

> 如果你正在寻找一个**不依赖框架、但结构清晰、工程化程度高的播放器起点**，这个项目就是为你准备的。
