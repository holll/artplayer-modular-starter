/* global Artplayer */

import { $ } from "./dom.js";
import { inferType, setBadge } from "./utils.js";
import { playM3u8, playFlv, playMpd } from "./customTypes.js";
import { createAspectSync } from "./aspectRatio.js";
import { createLiveDetector } from "./liveDetect.js";
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

// -------------------------
// init player
// -------------------------
const art = new Artplayer({
  container: "#player",
  url: "",
  theme: "#5c88ff",
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
    crossOrigin: "anonymous",
  },

  customType: {
    m3u8: playM3u8,
    flv: playFlv,
    mpd: playMpd,
  },
});

const { bindAspectSync } = createAspectSync(art);
bindAspectSync();

const { detectLiveStream } = createLiveDetector(art);

// -------------------------
// State
// -------------------------
let currentUrl = "";
let currentType = "auto";
let isLiveStream = false;
let loadToken = 0; // 单调递增，标记最近一次 loadUrl，用于丢弃旧回调

// -------------------------
// Status
// -------------------------
function toastStatus(text) {
  setBadge($("#statusBadge"), text);
}

art.on("ready", () => toastStatus("就绪"));
art.on("play", () => toastStatus("播放中"));
art.on("pause", () => {
  if (!currentUrl) return; // 已停止，不覆盖 toast
  toastStatus("已暂停");
});
art.on("error", () => toastStatus("播放错误"));

// -------------------------
// Load URL
// -------------------------
async function loadUrl(url) {
  const token = ++loadToken; // 本次加载的令牌
  currentUrl = url;
  currentType = inferType(url);

  setBadge($("#typeBadge"), "type: " + currentType);

  if (currentType === "auto") art.switchUrl(url);
  else art.switchUrl(url, currentType);

  toastStatus("加载中…");

  const onReady = () => {
    if (token !== loadToken) return; // 已被更新的加载取代，丢弃旧回调
    isLiveStream = detectLiveStream(currentType);
    const badgeText = isLiveStream ? `type: ${currentType} · LIVE` : `type: ${currentType}`;
    setBadge($("#typeBadge"), badgeText);
  };

  art.once("video:canplay", onReady);
  art.once("video:loadedmetadata", onReady);
}

// -------------------------
// UI actions
// -------------------------
$("#playBtn").addEventListener("click", () => {
  const url = $("#urlInput").value.trim();
  if (!url) return (art.notice.show = "请先输入视频地址");
  loadUrl(url);
});

$("#stopBtn").addEventListener("click", () => {
  try {
    // 彻底停止：卸载所有视频源
    if (art.__hls) { try { art.__hls.destroy(); } catch (_) {}; art.__hls = null; }
    if (art.__flv) { try { art.__flv.destroy(); } catch (_) {}; art.__flv = null; }
    if (art.__dash) { try { art.__dash.reset(); } catch (_) {}; art.__dash = null; }
    currentUrl = "";
    currentType = "auto";
    isLiveStream = false;
    try { art.pause(); } catch (_) {}
    try { art.video.removeAttribute("src"); art.video.load(); } catch (_) {}
    toastStatus("已停止");
    setBadge($("#typeBadge"), "type: -");
  } catch (_) {}
});

$("#pipBtn").addEventListener("click", () => {
  try { art.pip = true; } catch (_) { art.notice.show = "画中画不可用"; }
});

$("#shotBtn").addEventListener("click", () => {
  try {
    art.screenshot = true;
    art.notice.show = "已截图（若浏览器阻止下载，请检查设置）";
  } catch (_) {
    art.notice.show = "截图失败（请检查浏览器是否阻止下载）";
  }
});

$("#urlInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("#playBtn").click();
});

$("#urlInput").addEventListener("input", () => {
  const url = $("#urlInput").value.trim();
  if (!url) return;
  const t = inferType(url);
  setBadge($("#typeBadge"), `type: ${t}`);
});

// -------------------------
// Presets
// -------------------------
const list = $("#presetList");
loadPresets().then((presets) => {
  presets.forEach((p) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "item";
    el.innerHTML = `
      <span class="meta">
        <span class="name">${p.name}</span>
        <span class="sub">${p.sub}</span>
      </span>
      <span class="badge preset-badge">填充</span>
    `;

    el.addEventListener("click", () => {
      $("#urlInput").value = p.url;
      $("#urlInput").focus();
      art.notice.show = "已填充示例地址（请替换为可用链接）";
      $("#urlInput").dispatchEvent(new Event("input"));
    });

    list.appendChild(el);
  });
});

toastStatus("未加载");