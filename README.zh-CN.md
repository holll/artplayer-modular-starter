# ArtPlayer 模块化播放器起步项目

一个基于 **ArtPlayer + 原生 ES Modules** 的现代化播放器示例项目，重点展示**清晰的模块结构**，以及一套简洁克制的玻璃拟态 UI。

本项目不依赖任何前端框架，适合作为 **学习示例 / 起步模板 / 真实项目基础**。

---

## ✨ 功能特性

- 🎬 **ArtPlayer 播放器集成**
- 📦 **原生 ES Module 架构**（无全局变量污染）
- 🎨 **Glassmorphism 玻璃拟态 UI**
- ♿ **无障碍支持**（控制条可键盘操作、进度条为 ARIA slider 语义、状态区为 live region、适配 `prefers-reduced-motion`）
- 📱 **移动端优先布局**（44px 触控区、横屏与安全区适配、480px 以下收起次要控件，全屏按钮不再被裁）
- 🪟 **诚实的空态**：没粘地址时不假装加载中；停止 / 画中画 / 截图在无视频时禁用
- 🧩 **单行示例**：四种类型收成 chip，390×844 下整页一屏放得下
- 🔁 **播放引擎自动销毁**（HLS / FLV / DASH 切换时释放，不泄漏）
- ⚠️ **可读的错误提示**（CORS / 403 / 网络异常以文字说明，而不是一直转圈）
- 🌐 **可选代理前缀**，绕过跨域限制（`?proxy=`，详见 [docs/cors-playback.md](./docs/cors-playback.md)）——注意播放器本身不是代理：MP4 / WebM 这类直链由 `<video>` 直接加载，源站不返回 CORS 头也能播；HLS / FLV / DASH 由 MSE 用 fetch 拉分片，**必须源站返回 `Access-Control-Allow-Origin`**，否则只能走自有代理
- ⚡ **播放引擎按需加载**：HLS / FLV / DASH 只在用到时才下载，首屏从约 1.5 MB 降到约 270 KB
- 🔒 **系统媒体控制**：锁屏 / 通知栏 / 耳机线控可播放、暂停、快进快退
- 📶 **断网感知**：断网与恢复都有文字提示，恢复后自动续播

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
│  ├─ engines.js         # HLS/FLV/DASH 引擎按需加载
│  ├─ mediaSession.js    # 锁屏 / 线控接管
│  ├─ aspectRatio.js     # 比例同步
│  ├─ liveDetect.js      # 直播检测
│  ├─ presets.json       # 示例地址配置
│  └─ vendors/           # ArtPlayer 及按需加载的播放依赖
├─ samples/demo.flv        # FLV 示例样本（仓库自带，保证示例可播）
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

## ⚡ 性能说明

播放引擎由 `js/engines.js` 按需加载：

| | 优化前 | 优化后 |
|---|---|---|
| 首屏（解压后体积） | 约 1.54 MB（15 个请求） | 约 240 KB（12 个请求） |
| 首屏（gzip 传输量） | — | 约 105 KB |
| HLS / FLV / DASH 引擎脚本 | 始终下载 | 播放对应格式时才下载；输入地址后 250 ms 也会静默预取 |

其他细节：

- 字体是 ArtPlayer 之后的第二大资源：现在只预加载真正使用的那一个可变字体（`fonts/inter_*.woff2`），并移除了只有拉丁字符的 Noto Sans SC 子集——中文本来就走系统字体。
- 入口模块与其静态 import 用 `modulepreload` 预取，`artplayer.js` 加 `defer`，解析不再被 155 KB 的播放器内核阻塞。
- DASH 改用 `dash.mediaplayer.min.js`（714 KB）替代 `dash.all.min.js`（775 KB）：离线、DRM/保护、上报模块对播放清单没有用处。
- `flv.js` 使用 `enableWorker: false`——它的 worker 分支在部分 Chromium 构建上会抛 `Class extends value undefined`，导致整路流播放失败；解封装放回主线程只是多一点 CPU，但不会挂。
- 进度条触控命中区 44px（视觉 10px），其余控制条仍为 48px，手机拖动不会再点不中。

两个需要注意的引擎细节：

- `flv.js` 使用 `enableWorker: false`——它的 worker 分支在部分 Chromium 构建上会抛 `Class extends value undefined`，导致整路流播放失败；解封装放回主线程只是多一点 CPU，但不会挂。
- 进度条触控命中区 44px（视觉 10px），其余控制条仍为 48px，手机拖动不会再点不中。

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
