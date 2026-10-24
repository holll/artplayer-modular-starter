/* global Hls, flvjs, dashjs */

import { loadEngine, isEngineLoaded, engineName } from "./engines.js";

// 统一的引擎下线入口：切换地址、停止播放、实例销毁都走这里，
// 避免 HLS ↔ MP4 切换时旧实例仍持有同一个 <video>（MSE 与原生 src 互相打架）。
export function teardownEngines(art) {
  const engines = [
    ["__hls", (inst) => inst.destroy()],
    ["__flv", (inst) => inst.destroy()],
    ["__dash", (inst) => inst.reset()],
  ];

  for (const [key, dispose] of engines) {
    const inst = art[key];
    art[key] = null;
    if (!inst) continue;
    try {
      dispose(inst);
    } catch (_) {
      // 已销毁或初始化失败，忽略即可
    }
  }
}

const RECOVER_MAX = 3;

// 引擎层的提示同时走 art.notice（画面内）与 appMessage 事件（页面 hint，aria-live 可读）
function say(art, message) {
  art.notice.show = message;
  try {
    art.emit("appMessage", message);
  } catch (_) {
    // 事件系统不可用时静默
  }
}

// loadUrl 每次都会自增 __loadToken；await 之后对不上说明用户已经切源或停止，
// 此时不能再去 attach 引擎，否则会把新地址的 <video> 抢走。
function isStale(art, token) {
  return token !== undefined && token !== null && art.__loadToken !== token;
}

// 引擎是懒加载的：第一次用到才拉脚本，并在此期间给出「正在加载」提示。
async function ensureEngine(art, kind, token) {
  if (isEngineLoaded(kind)) return true;

  say(art, `正在加载 ${engineName(kind)} 引擎…`);
  try {
    await loadEngine(kind);
  } catch (_) {
    if (!isStale(art, token)) say(art, `${engineName(kind)} 引擎加载失败，请检查网络后重试`);
    return false;
  }
  return !isStale(art, token);
}

export async function playM3u8(video, url, art) {
  teardownEngines(art);
  const token = art.__loadToken;

  if (!(await ensureEngine(art, "hls", token))) return;

  // 优先 hls.js：只有它能做码率切换、错误恢复与统一错误提示。
  // 注意不能先判 canPlayType —— 部分 Chromium 构建会返回 "maybe"，
  // 结果原生 <video> 抢先用上 HLS，hls.js 就再也没机会介入。
  if (!window.Hls || !Hls.isSupported()) {
    // Safari / iOS：MSE 不可用，交给原生 HLS
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      return;
    }
    say(art, "当前浏览器不支持 HLS（hls.js 不可用或不支持）");
    return;
  }

  const hls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 90 });
  art.__hls = hls;

  let recovered = 0;
  const fail = (message) => {
    say(art, message);
    teardownEngines(art);
  };

  hls.on(Hls.Events.ERROR, (_event, data) => {
    if (!data || !data.fatal) return;

    // 清单本身读不到时重试没有意义（hls.js 内部会无限退避），直接给出结论
    if (
      data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
      data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT ||
      data.details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR
    ) {
      fail("加载失败：m3u8 清单无法读取，可能是地址失效或被跨域策略（CORS）拦截");
      return;
    }

    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
      recovered += 1;
      if (recovered <= RECOVER_MAX) {
        say(art, `网络异常，正在重试（${recovered}/${RECOVER_MAX}）`);
        hls.startLoad();
      } else {
        fail("加载失败：地址不可访问，或被跨域策略（CORS）拦截");
      }
      return;
    }

    if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
      recovered += 1;
      if (recovered <= RECOVER_MAX) {
        say(art, `解码异常，正在恢复（${recovered}/${RECOVER_MAX}）`);
        hls.recoverMediaError();
      } else {
        fail("解码失败：码流可能已损坏或编码不受支持");
      }
      return;
    }

    fail("播放失败：浏览器拒绝加载该码流");
  });

  hls.loadSource(url);
  hls.attachMedia(video);
}

export async function playFlv(video, url, art) {
  teardownEngines(art);
  const token = art.__loadToken;

  if (!(await ensureEngine(art, "flv", token))) return;

  if (!window.flvjs || !flvjs.isSupported()) {
    say(art, "当前浏览器不支持 FLV（flv.js 不可用或不支持）");
    return;
  }

  // enableWorker 关掉：flv.js 1.6.2 的 worker 分支在部分 Chromium 构建里会抛
  // "Class extends value undefined"，整个播放直接失败；关掉只是把解封装放回主线程。
  const flv = flvjs.createPlayer(
    { type: "flv", url },
    { enableWorker: false, stashInitialSize: 128, lazyLoad: true }
  );

  art.__flv = flv;

  flv.on(flvjs.Events.ERROR, (type, detail) => {
    const reason =
      detail === "NetworkError" || detail === "NetworkException"
        ? "网络中断，或地址被跨域策略（CORS）拦截"
        : `解码异常（${type}/${detail}）`;
    say(art, `FLV 播放失败：${reason}`);
    teardownEngines(art);
  });

  flv.attachMediaElement(video);
  flv.load();
}

export async function playMpd(video, url, art) {
  teardownEngines(art);
  const token = art.__loadToken;

  if (!(await ensureEngine(art, "dash", token))) return;

  if (!window.dashjs) {
    say(art, "dash.js 未加载，无法播放 DASH");
    return;
  }

  const player = dashjs.MediaPlayer().create();
  art.__dash = player;

  player.on(dashjs.MediaPlayer.events.ERROR, (event) => {
    const detail = event?.error?.message || event?.error?.code || "未知错误";
    say(art, `DASH 播放失败：${detail}`);
  });

  // 第三个参数是 autoplay：保持 false，与全局 autoplay:false 一致
  player.initialize(video, url, false);
  player.setAutoPlay(false);
}
