/* global Artplayer */

import { $ } from "./dom.js";
import { inferType, setBadge, typeLabel } from "./utils.js";
import { playM3u8, playFlv, playMpd, teardownEngines } from "./customTypes.js";
import { createAspectSync } from "./aspectRatio.js";
import { createLiveDetector } from "./liveDetect.js";
import { preloadEngine, engineForType } from "./engines.js";
import { createMediaSession } from "./mediaSession.js";

// 代理前缀只影响 MSE 类源（HLS/FLV/DASH），原生 <video src> 不需要它。
const PROXY_STORAGE_KEY = "artplayer:proxy";
const MSE_TYPES = new Set(["m3u8", "flv", "mpd"]);

const CONTROL_LABELS = {
  playAndPause: "播放 / 暂停",
  volume: "音量",
  progress: "播放进度",
  time: "播放时间",
  setting: "设置",
  pip: "画中画",
  screenshot: "截图",
  fullscreenWeb: "网页全屏",
  fullscreen: "全屏",
  airplay: "隔空播放",
  playbackRate: "播放速度",
  aspectRatio: "画面比例",
  flip: "画面翻转",
};

function readProxyPrefix() {
  try {
    const fromQuery = new URLSearchParams(location.search).get("proxy");
    if (fromQuery && fromQuery.trim()) return fromQuery.trim();
    return (localStorage.getItem(PROXY_STORAGE_KEY) || "").trim();
  } catch (_) {
    return "";
  }
}

function viaProxy(prefix, url) {
  if (!prefix) return url;
  if (prefix.includes("{url}")) return prefix.replace("{url}", encodeURIComponent(url));
  // 形如 https://my-proxy.example.com/?url= 把原始地址编码后拼在参数位
  if (/[=?&]$/.test(prefix)) return prefix + encodeURIComponent(url);
  return prefix.replace(/\/?$/, "/") + url;
}

async function loadPresets() {
  try {
    const res = await fetch("./js/presets.json");
    if (!res.ok) throw new Error("Failed to load presets");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

function createPlayer() {
  return new Artplayer({
    container: "#player",
    url: "",
    theme: "#7ea6ff",
    lang: "zh-cn",
    volume: 0.7,
    autoplay: false,

    autoSize: true,
    autoMini: true,
    screenshot: true,
    setting: true,
    playbackRate: true,
    fullscreen: true,
    fullscreenWeb: true,
    pip: true,
    hotkey: true,
    mutex: true,

    moreVideoAttr: {
      playsInline: true,
      preload: "metadata",
      // 不默认加 crossOrigin：加了以后浏览器要求每个源都返回 ACAO，
      // 绝大多数第三方直链不返回，MP4 会直接变成“无法播放”。
    },

    customType: {
      m3u8: playM3u8,
      flv: playFlv,
      mpd: playMpd,
    },
  });
}

function boot() {
  const playerHost = $("#player");
  let art;

  try {
    art = createPlayer();
  } catch (err) {
    console.error(err);
    playerHost.innerHTML =
      '<p class="player-error">播放器初始化失败（播放器脚本可能未加载成功），请刷新页面重试。</p>';
    return;
  }

  const statusBadge = $("#statusBadge");
  const typeBadge = $("#typeBadge");
  const urlInput = $("#urlInput");
  const hintLine = $("#hintLine");
  const proxyPrefix = readProxyPrefix();

  // -------------------------
  // State
  // -------------------------
  let currentUrl = "";
  let currentType = "auto";
  let isLiveStream = false;
  let loadToken = 0; // 单调递增，标记最近一次 loadUrl，用于丢弃旧回调

  if (proxyPrefix) {
    console.info(`[artplayer] 已启用代理前缀：${proxyPrefix}`);
    hintLine.textContent = "已启用代理前缀：HLS / FLV / DASH 将通过代理加载";
  }

  // 移动端单击画面即播放（ArtPlayer 默认要求双击）
  try {
    art.constructor.MOBILE_CLICK_PLAY = true;
    // 设置面板每项默认 35px，触屏太小；改常量后 JS 重算的面板高度才会跟着变
    art.constructor.SETTING_ITEM_HEIGHT = 44;
  } catch (_) {}

  const { bindAspectSync } = createAspectSync(art);
  bindAspectSync();

  const { detectLiveStream } = createLiveDetector(art);

  // 锁屏/通知栏/耳机键：标题用「类型 + 域名」，避免只显示 hls.js 的地址
  const mediaSession = createMediaSession(art, () => ({
    title: currentUrl ? `${typeLabel(currentUrl, currentType)} 视频` : "多格式在线播放",
    artist: hostOf(currentUrl) || "在线播放",
  }));

  function hostOf(url) {
    try {
      return new URL(url, location.href).host;
    } catch (_) {
      return "";
    }
  }

  // -------------------------
  // Status
  // -------------------------
  function toastStatus(text) {
    setBadge(statusBadge, text);
  }

  function announce(text) {
    hintLine.textContent = text;
  }

  function reportError(text) {
    toastStatus("播放错误");
    announce(text);
    art.notice.show = text;
  }

  art.on("ready", () => {
    toastStatus("就绪");
    enhanceControls(art);
  });
  art.on("play", () => {
    toastStatus("播放中");
    if (!currentUrl) return;
    announce(
      isLiveStream
        ? "直播流：可拖动进度条回到已缓存片段"
        : "已开始播放：拖动进度条可快进 / 快退"
    );
  });
  art.on("pause", () => {
    if (!currentUrl) return; // 已停止，不覆盖 toast
    toastStatus("已暂停");
  });
  art.on("error", () => reportError("加载失败：地址不可访问，或被跨域策略（CORS）拦截"));
  art.on("destroy", () => teardownEngines(art));
  // 播放引擎（hls.js / flv.js / dash.js）的提示同步到页面状态行
  art.on("appMessage", (message) => announce(message));

  // -------------------------
  // Load URL
  // -------------------------
  function applyType(type) {
    // ArtPlayer 的 switchUrl(url, startTime) 第二参是起播时间，不是类型，
    // 类型必须写在 option.type 上，否则无后缀链接不会走自定义解析器。
    art.type = type === "auto" ? "" : type;
  }

  async function loadUrl(url) {
    const token = ++loadToken; // 本次加载的令牌
    art.__loadToken = token; // 引擎懒加载回来后用它判断自己是否已过期

    teardownEngines(art);
    currentUrl = url;
    currentType = inferType(url);

    setBadge(typeBadge, "type: " + typeLabel(url, currentType));
    toastStatus("加载中…");
    announce(`正在加载 ${typeLabel(url, currentType)}`);
    art.notice.show = "";

    const playUrl = MSE_TYPES.has(currentType) ? viaProxy(proxyPrefix, url) : url;

    applyType(currentType);
    art.switchUrl(playUrl);

    // 点「播放」就该开始播；若被浏览器自动播放策略拦下，给一句能照做的提示
    art.play().catch((err) => {
      // 只有「自动播放被策略拦截」才给提示；加载失败/被 CORS 拦截时保留引擎给出的原因
      if (token !== loadToken) return;
      if (err && err.name === "NotAllowedError") {
        announce("已就绪：点击画面或播放按钮开始播放（浏览器拦截了自动播放）");
      }
    });

    const onReady = () => {
      if (token !== loadToken) return; // 已被更新的加载取代，丢弃旧回调
      isLiveStream = detectLiveStream(currentType);
      const label = typeLabel(url, currentType);
      const badgeText = isLiveStream ? `type: ${label} · LIVE` : `type: ${label}`;
      setBadge(typeBadge, badgeText);
      mediaSession.syncMetadata();
      if (isLiveStream) {
        announce("直播流：可拖动进度条回到已缓存片段");
      } else if (art.playing) {
        announce("已开始播放：拖动进度条可快进 / 快退");
      } else {
        announce("已就绪：点击画面或播放按钮开始播放");
      }
    };

    art.once("video:canplay", onReady);
    art.once("video:loadedmetadata", onReady);
  }

  // -------------------------
  // UI actions
  // -------------------------
  $("#playBtn").addEventListener("click", () => {
    const url = urlInput.value.trim();
    if (!url) return (art.notice.show = "请先输入视频地址");
    loadUrl(url);
  });

  $("#stopBtn").addEventListener("click", () => {
    loadToken += 1; // 让仍在路上的加载回调失效
    art.__loadToken = loadToken;
    teardownEngines(art);
    currentUrl = "";
    currentType = "auto";
    isLiveStream = false;
    try {
      art.pause();
    } catch (_) {
      // 尚未就绪时 pause 可能抛错，忽略
    }
    try {
      art.type = "";
      art.video.removeAttribute("src");
      art.video.load();
    } catch (_) {
      // 同上
    }
    toastStatus("已停止");
    announce("已停止播放，可输入新地址或点击示例");
    setBadge(typeBadge, "type: -");
    mediaSession.clear();
  });

  $("#pipBtn").addEventListener("click", () => {
    try {
      art.pip = true;
    } catch (_) {
      art.notice.show = "画中画不可用";
    }
  });

  $("#shotBtn").addEventListener("click", async () => {
    try {
      await art.screenshot;
      art.notice.show = "已截图（若浏览器阻止下载，请检查设置）";
    } catch (err) {
      // 跨域视频未带 CORS 头时 canvas 被污染，截图必然失败
      art.notice.show = "截图失败：跨域视频需要源站返回 CORS 头才能截图";
      console.warn("[artplayer] screenshot failed", err);
    }
  });

  urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("#playBtn").click();
  });

  let preloadTimer = 0;
  urlInput.addEventListener("input", () => {
    const url = urlInput.value.trim();
    if (!url) return;
    const type = inferType(url);
    setBadge(typeBadge, `type: ${typeLabel(url, type)}`);

    // 识别出 HLS/FLV/DASH 后静默预取引擎，点「播放」时就不用等脚本下载
    const engine = engineForType(type);
    if (!engine) return;
    window.clearTimeout(preloadTimer);
    preloadTimer = window.setTimeout(() => preloadEngine(engine), 250);
  });

  // -------------------------
  // Presets
  // -------------------------
  const list = $("#presetList");
  loadPresets().then((presets) => {
    presets.forEach((preset) => {
      const name = String(preset.name ?? "");
      const sub = String(preset.sub ?? "");
      const url = String(preset.url ?? "");

      const el = document.createElement("button");
      el.type = "button";
      el.className = "item";

      const meta = document.createElement("span");
      meta.className = "meta";

      const nameEl = document.createElement("span");
      nameEl.className = "name";
      nameEl.textContent = name;

      const subEl = document.createElement("span");
      subEl.className = "sub";
      subEl.textContent = sub;

      const badge = document.createElement("span");
      badge.className = "badge preset-badge";
      badge.textContent = "填充";

      meta.append(nameEl, subEl);
      el.append(meta, badge);

      el.addEventListener("click", () => {
        urlInput.value = url;
        urlInput.dispatchEvent(new Event("input"));
        // 触屏上主动聚焦只会弹键盘、挡住半屏，交给用户自己点输入框
        if (window.matchMedia("(pointer: fine)").matches) urlInput.focus();
        art.notice.show = "已填充示例地址（请替换为可用链接）";
      });

      list.appendChild(el);
    });
  });

  // 断网/恢复：给出明确状态，恢复后自动续播（用户手动暂停过则不续）
  let playingBeforeOffline = false;
  window.addEventListener("offline", () => {
    playingBeforeOffline = art.playing;
    toastStatus("离线");
    announce("网络已断开：播放会中断，恢复联网后自动尝试续播");
  });
  window.addEventListener("online", () => {
    if (!currentUrl) {
      toastStatus("就绪");
      announce("网络已恢复");
      return;
    }
    announce("网络已恢复，正在重新播放");
    if (playingBeforeOffline) {
      art.play().catch(() => announce("网络已恢复：点击画面重新播放"));
    }
  });

  toastStatus("未加载");
}

function enhanceControls(art) {
  const controls = art.query(".art-controls");
  if (!controls) return;

  controls.querySelectorAll(".art-control").forEach((el) => {
    if (el.dataset.a11yReady === "1") return;
    el.dataset.a11yReady = "1";
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");

    if (!el.getAttribute("aria-label")) {
      const match = el.className.match(/art-control-([A-Za-z]+)/);
      const name = match ? match[1] : "";
      el.setAttribute("aria-label", CONTROL_LABELS[name] || "播放器控制");
    }

    el.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      el.click();
    });
  });
}

// 兼容需要在控制台临时设置代理的场景
window.setArtPlayerProxy = (prefix) => {
  try {
    if (prefix) localStorage.setItem(PROXY_STORAGE_KEY, prefix.trim());
    else localStorage.removeItem(PROXY_STORAGE_KEY);
    location.reload();
  } catch (_) {
    console.warn("[artplayer] 无法写入 localStorage，请改用 ?proxy= 参数");
  }
};

boot();
