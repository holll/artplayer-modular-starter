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
let currentPlayUrl = "";
let currentType = "auto";
let isLiveStream = false;

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
  currentUrl = url;
  currentPlayUrl = url;
  currentType = inferType(url);

  setBadge($("#typeBadge"), "type: " + currentType);

  if (currentType === "auto") art.switchUrl(currentPlayUrl);
  else art.switchUrl(currentPlayUrl, currentType);

  toastStatus("加载中…");

  const onReady = () => {
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
    currentPlayUrl = "";
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
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="meta">
        <div class="name">${p.name}</div>
        <div class="sub">${p.sub}</div>
      </div>
      <div class="badge preset-badge" data-url="${p.url}">填充</div>
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