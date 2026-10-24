# 突破浏览器跨域限制播放视频：可行方案清单

浏览器把视频分成两类处理，能不能播、为什么播不了，先分清类别再谈方案。

> **先说清楚本项目的能力边界**（避免误解成"自带跨域"）：
>
> 1. **不带代理**：页面是纯静态的，没有任何服务端转发；`?proxy=` 只是让你把它指向**你自己的**代理。
> 2. **MP4 / WebM 这类直链**由 `<video>` 直接加载，不经过 fetch，**源站不返回 CORS 头也能播**（本项目默认不加 `crossorigin`，正是为此）。
> 3. **HLS / FLV / DASH 走 MSE**，分片是 JS 用 fetch 拉的，**必须源站返回 `Access-Control-Allow-Origin`**；不给就只能走代理，没有任何前端技巧能绕开。
> 4. 另外，即使能播，**截图**要读 canvas 像素，仍然需要 CORS 头；**画中画**不受影响。

---

## 0. 先判断你卡在哪一类

| 播放方式 | 是否需要目标服务器给 CORS | 典型症状 |
| --- | --- | --- |
| 原生 `<video src>` 直出（MP4、WebM、Safari 原生 HLS） | **不需要** | 能播，但 `canvas` 截图会失败、`crossorigin` 属性反而会让它失败 |
| `<video>` + `crossorigin="anonymous"` | 需要（`Access-Control-Allow-Origin`） | 一旦服务器不给 ACAO，直接黑屏 / `MEDIA_ERR_SRC_NOT_SUPPORTED` |
| MSE 引擎（hls.js / flv.js / dash.js） | **需要**（JS 用 XHR/fetch 拉分片） | `CORS error`、`manifestLoadError`、`bufferAppendError` 前先报网络错误 |
| 混合内容（HTTPS 页面 + HTTP 视频） | 与 CORS 无关，直接被浏览器 block | `Mixed Content` 警告 |
| 需要 Cookie / 防盗链签名 | 需要 `credentials` + 服务器配合 | 403 / 401，或播放 1 秒后断流 |

> **最常见的误解**：以为播放器"不支持"某个地址。其实多数情况是 MSE 引擎在跨域拉分片，
> 而分片服务器没有回 `Access-Control-Allow-Origin`。

本项目的处理：

- `js/main.js` 默认**不加** `crossorigin`，原生直出优先；
- `js/customTypes.js` 会订阅 HLS / FLV / DASH 的 `ERROR` 事件，把"网络错误 / CORS"翻译成人话提示，
  而不是让画面永远停在 loading。

---

## 1. 反代方案（最稳、最通用）

自己起一个同源或带 ACAO 的代理，播放器只请求代理。

```
浏览器 → 你的代理（加 ACAO、去 Referer、改 m3u8 里的分片地址）→ 源站
```

### 1.1 最小可用的 Cloudflare Worker

零服务器成本，顺带解决防盗链（可改 `Referer` / `Origin`）：

```js
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = url.searchParams.get("url");
    if (!target) return new Response("missing url", { status: 400 });

    const upstream = await fetch(target, {
      headers: {
        // 有些站点只校验 Referer；按需伪造，注意法律边界
        referer: new URL(target).origin + "/",
        origin: new URL(target).origin,
        "user-agent": request.headers.get("user-agent") || "Mozilla/5.0",
      },
      redirect: "follow",
    });

    const headers = new Headers(upstream.headers);
    headers.set("access-control-allow-origin", "*");
    headers.delete("content-security-policy");
    headers.delete("x-frame-options");

    // m3u8 里的分片是相对路径，必须改写成走代理
    if ((headers.get("content-type") || "").includes("mpegurl")) {
      const text = await upstream.text();
      const base = new URL(target);
      const rewritten = text.split("\n").map((line) => {
        if (!line || line.startsWith("#")) return line;
        const abs = new URL(line, base).href;
        return `${url.origin}${url.pathname}?url=${encodeURIComponent(abs)}`;
      }).join("\n");
      headers.set("content-type", "application/vnd.apple.mpegurl");
      return new Response(rewritten, { headers });
    }

    return new Response(upstream.body, { headers, status: upstream.status });
  },
};
```

用法：部署后在本项目里启用代理前缀

```
https://your-site/?proxy=https://your-worker.workers.dev/?url=
```

或在控制台执行 `setArtPlayerProxy("https://your-worker.workers.dev/?url=")` 持久化到
`localStorage`。

### 1.2 Nginx 反代（自建服务器）

```nginx
location /proxy/ {
    resolver 8.8.8.8;
    proxy_pass https://$arg_host$arg_path;
    proxy_set_header Host $arg_host;
    proxy_set_header Referer "https://$arg_host/";
    proxy_ssl_server_name on;
    add_header Access-Control-Allow-Origin *;
    proxy_buffering off;      # 直播必需
    chunked_transfer_encoding on;
}
```

### 1.3 什么时候反代也不够

- 源站要求 **Cookie / 登录态**：代理要带上 `cookie`，且注意 `credentials` 模式下 `ACAO` 不能是 `*`；
- 源站用 **时间戳签名 URL**（`?sign=...&t=...`）：代理必须原样透传 query，不能二次编码；
- 源站用 **IP 白名单 / 频控**：代理会放大请求，可能被封；
- **DRM（Widevine / FairPlay）**：几乎无解，除非拿到 license 服务；
- **HTTPS 页面 + HTTP 源**：只能 `https` 代理，或走 `iframe` 沙箱外链。

---

## 2. 不走反代的几条路

### 2.1 同源静态代理（下载后本地播）

自己可控的内容，直接 `ffmpeg` 转一份放同域：

```bash
ffmpeg -i "https://origin/video.mp4" -c copy ./public/video.mp4
# 或 HLS 切片
ffmpeg -i "https://origin/video.mp4" -c copy -f hls -hls_time 6 ./public/hls/index.m3u8
```

### 2.2 服务端转码推流（直播）

`ffmpeg` 拉源站 → 输出 HLS 到你自己的对象存储（S3/OSS/R2），前端只放同源 m3u8。
好处：彻底绕开跨域、可加鉴权、可多码率；成本：带宽和转码机。

### 2.3 协议层面的"绕"（谨慎）

- **`<video>` + `crossorigin` 去掉**：只对"不需要 MSE"的直出文件有效，HLS in Safari 也可以；
- **`URL.createObjectURL(blob)`**：仍然要先能 `fetch` 到数据，跨域还是那句"服务器给不给 ACAO"；
- **`<iframe>` 嵌入源站页面**：受 `X-Frame-Options` / `frame-ancestors` 限制，且无法控制播放器；
- **`no-referrer` + `referrerpolicy`**：只解决"防盗链看 Referer"的一部分站点；
- **浏览器扩展 / 本地代理（如 Clash 规则）**：只对你自己这台机器生效，不能作为产品方案。

---

## 3. 排查清单（按顺序试）

1. 打开 DevTools → Network，看第一个失败的请求：是 `m3u8` 还是 `.ts` 分片？
2. Response Headers 里有没有 `access-control-allow-origin`？
3. 用 `curl -I` 带 `Origin: https://your-site` 再请求一次，确认不是"浏览器才知道的区别"。
4. 直链 MP4 能播、HLS 不能播 → 一定是 MSE 的 CORS，走代理。
5. 页面是 HTTPS、视频是 HTTP → 换 HTTPS 源或代理。
6. 播放几秒后停 → 看是不是分片 403（签名过期/防盗链），代理要透传 query 和 `Referer`。

---

## 4. 本项目里的两个开关

```js
// 1) URL 参数（刷新后失效）
// https://your-site/?proxy=https://proxy.example.com/?url=

// 2) 控制台持久化（存 localStorage: artplayer:proxy）
setArtPlayerProxy("https://proxy.example.com/?url=");
setArtPlayerProxy(""); // 关闭
```

代理只作用于 **MSE 类**（`m3u8` / `flv` / `mpd`）；MP4 直出保持原地址，
避免"本可以播的直链被代理搞坏"。

支持的前缀形态：

| 形态 | 示例 | 实际请求 |
| --- | --- | --- |
| 占位符 | `https://p.example.com/?u={url}` | `...?u=<encodeURIComponent(src)>` |
| 参数位 | `https://p.example.com/?url=` | `...?url=<src>` |
| 目录前缀 | `https://p.example.com/v/` | `.../v/<src>` |

---

## 5. 法律与合规

以上技术手段仅应用于**你有权访问的内容**：自己的资源、公开授权的资源、或已获授权的平台。
绕过付费墙、DRM、地域限制通常违反服务条款，部分司法辖区还可能违法。
