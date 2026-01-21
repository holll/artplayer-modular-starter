# ArtPlayer 模块化播放器起步项目

一个基于 **ArtPlayer + 原生 ES Modules** 的现代化播放器示例项目，重点展示**清晰的模块结构、播放进度记忆与恢复机制**，以及一套简洁克制的玻璃拟态 UI。

本项目不依赖任何前端框架，适合作为 **学习示例 / 起步模板 / 真实项目基础**。

---

## ✨ 功能特性

- 🎬 **ArtPlayer 播放器集成**
- 📦 **原生 ES Module 架构**（无全局变量污染）
- ▶️ **播放进度记忆与续播**
- 🪟 **续播确认弹窗**
- 🎨 **Glassmorphism 玻璃拟态 UI**
- ♿ **无障碍支持**（自动适配 `prefers-reduced-motion`）
- 📱 **响应式布局**（桌面 / 移动端）

---

## 📁 项目结构

```text
.
├─ index.html
├─ css/
├─ js/
│  ├─ main.js            # 应用入口
│  ├─ dom.js             # DOM 工具
│  ├─ utils.js           # 通用工具
│  ├─ progressStore.js   # IndexedDB 进度存储
│  ├─ resumeModal.js     # 续播弹窗
│  ├─ progressLine.js    # 最近播放进度提示
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
