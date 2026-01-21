/* global Artplayer */

import { $ } from "./dom.js";
import { inferType, setBadge, clamp, formatTime } from "./utils.js";
import { dbGet, dbPut, dbDel } from "./progressStore.js";
import { ensureResumeUI, showResumeModal } from "./resumeModal.js";
import { ensureProgressLine, setProgressLine } from "./progressLine.js";
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

const { detectLiveStream, canSaveProgress } = createLiveDetector(art);

// -------------------------
// Proxy
// -------------------------
const PROXY_PREFIX = "https://cors.144666.xyz/";
const proxyToggle = $("#proxyToggle");
const PROXY_STORAGE_KEY = "artplayer:useProxy";

if (proxyToggle) {
  const saved = localStorage.getItem(PROXY_STORAGE_KEY);
  proxyToggle.checked = saved === "1";

  proxyToggle.addEventListener("change", () => {
    localStorage.setItem(PROXY_STORAGE_KEY, proxyToggle.checked ? "1" : "0");
    art.notice.show = proxyToggle.checked ? "已开启代理播放" : "已关闭代理播放";
  });
}

function withProxy(url) {
  const cleaned = (url || "").trim();
  if (!cleaned) return "";
  if (!proxyToggle?.checked) return cleaned;
  if (cleaned.startsWith(PROXY_PREFIX)) return cleaned;
  return `${PROXY_PREFIX}${cleaned}`;
}

// -------------------------
// State
// -------------------------
let currentUrl = "";
let currentPlayUrl = "";
let currentType = "auto";
let isLiveStream = false;

// -------------------------
// UI init
// -------------------------
ensureResumeUI();
ensureProgressLine({
  onClear: async () => {
    const url = $("#urlInput")?.value?.trim();
    if (!url) return;
    await dbDel(url);
    setProgressLine(null);
    refreshPresetBadges();
    try { art.notice.show = "已清除该地址的历史进度"; } catch (_) {}
  },
});

// -------------------------
// Status
// -------------------------
function toastStatus(text) {
  setBadge($("#statusBadge"), text);
}

art.on("ready", () => toastStatus("就绪"));
art.on("play", () => toastStatus("播放中"));
art.on("pause", () => toastStatus("已暂停"));
art.on("error", () => toastStatus("播放错误"));

// -------------------------
// Save progress (throttled)
// -------------------------
let lastSaveAt = 0;
const SAVE_INTERVAL_MS = 3000;

async function saveNow() {
  if (!canSaveProgress({ url: currentUrl, isLiveStream })) return;
  const t = Number(art.currentTime) || 0;
  const d = Number(art.duration) || 0;
  if (t <= 0.5) return;
  await dbPut(currentUrl, t, d, { type: currentType, isLive: isLiveStream });
}

art.on("timeupdate", () => {
  if (!canSaveProgress({ url: currentUrl, isLiveStream })) return;
  const now = Date.now();
  if (now - lastSaveAt >= SAVE_INTERVAL_MS) {
    lastSaveAt = now;
    saveNow();
  }
});

art.on("pause", () => saveNow());

art.on("ended", async () => {
  if (!currentUrl) return;
  if (isLiveStream) return;
  await dbDel(currentUrl);
  setProgressLine(null);
  refreshPresetBadges();
});

window.addEventListener("beforeunload", () => {
  try { saveNow(); } catch (_) {}
});
art.on("destroy", () => {
  try { saveNow(); } catch (_) {}
});

// -------------------------
// Load URL + resume (auto seek + retry)
// -------------------------
async function loadUrl(url) {
  currentUrl = url;
  currentPlayUrl = withProxy(url);
  currentType = inferType(url);

  setBadge($("#typeBadge"), "type: " + currentType);

  if (currentType === "auto") art.switchUrl(currentPlayUrl);
  else art.switchUrl(currentPlayUrl, currentType);

  toastStatus("加载中…");

  const resumeOnce = async () => {
    isLiveStream = detectLiveStream(currentType);

    const badgeText = isLiveStream ? `type: ${currentType} · LIVE` : `type: ${currentType}`;
    setBadge($("#typeBadge"), badgeText);

    const rec = await dbGet(url);
    setProgressLine(rec, { isLive: isLiveStream });

    if (isLiveStream) return;

    const duration = Number(art.duration);
    if (!Number.isFinite(duration) || duration <= 15) return;

    const saved = rec && Number(rec.time) ? Number(rec.time) : 0;
    const safeSaved = clamp(saved, 0, Math.max(0, duration - 0.5));

    if (safeSaved > 5 && safeSaved < duration - 5) {
      try { art.seek = safeSaved; } catch (_) {}

      setTimeout(() => {
        try {
          if (Math.abs((art.currentTime || 0) - safeSaved) > 1) {
            art.seek = safeSaved;
          }
        } catch (_) {}
      }, 500);

      // 保留弹窗（可选）
      showResumeModal({
        subText: `已自动恢复到 ${formatTime(safeSaved)} / ${formatTime(duration)}`,
        hintText: "提示：直播流不保存进度。",
        onContinue: () => {}, // 已自动恢复，这里留空即可
        onRestart: async () => {
          await dbDel(url);
          setProgressLine(null);
          refreshPresetBadges();
          try { art.seek = 0; } catch (_) {}
        },
      });
    }
  };

  art.once("video:canplay", resumeOnce);
  art.once("video:loadedmetadata", resumeOnce);
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
    art.pause();
    art.seek = 0;
    toastStatus("已停止");
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
    art.notice.show = "截图失败";
  }
});

$("#urlInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("#playBtn").click();
});

// 输入变化：显示该 URL 的历史进度
let __inputTimer = null;
$("#urlInput").addEventListener("input", () => {
  clearTimeout(__inputTimer);
  __inputTimer = setTimeout(async () => {
    const url = $("#urlInput").value.trim();
    if (!url) return setProgressLine(null);

    const t = inferType(url);
    const rec = await dbGet(url);
    setProgressLine(rec, { isLive: false });
    setBadge($("#typeBadge"), `type: ${t}`);
  }, 250);
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

  refreshPresetBadges();
});

async function refreshPresetBadges() {
  const badges = document.querySelectorAll(".preset-badge");
  badges.forEach((b) => (b.textContent = "填充"));

  for (const b of badges) {
    const url = b.getAttribute("data-url");
    if (!url) continue;
    const rec = await dbGet(url);
    if (rec && rec.time && rec.time > 5) {
      b.textContent = formatTime(rec.time);
      b.title = `上次播放到 ${formatTime(rec.time)}`;
    } else {
      b.textContent = "填充";
      b.title = "";
    }
  }
}

toastStatus("未加载");
