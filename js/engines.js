// 播放引擎按需加载：首屏只保留 ArtPlayer 本体，
// HLS / FLV / DASH 三个引擎（合计约 1.3 MB）在真正用到时才拉取。
const ENGINE_SRC = {
  hls: "vendors/hls.min.js",
  flv: "vendors/flv.min.js",
  dash: "vendors/dash.all.min.js",
};

const ENGINE_GLOBAL = {
  hls: "Hls",
  flv: "flvjs",
  dash: "dashjs",
};

const NAME = {
  hls: "HLS",
  flv: "FLV",
  dash: "DASH",
};

const inflight = new Map();

export function engineName(kind) {
  return NAME[kind] || kind;
}

export function isEngineLoaded(kind) {
  return Boolean(window[ENGINE_GLOBAL[kind]]);
}

/**
 * 加载指定引擎，重复调用共享同一个 Promise。
 * 失败后清掉缓存，允许用户重试。
 */
export function loadEngine(kind) {
  const globalName = ENGINE_GLOBAL[kind];
  if (!globalName) return Promise.reject(new Error(`未知引擎：${kind}`));
  if (window[globalName]) return Promise.resolve(window[globalName]);
  if (inflight.has(kind)) return inflight.get(kind);

  const promise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = new URL(ENGINE_SRC[kind], import.meta.url).href;
    script.async = true;
    script.dataset.engine = kind;

    script.onload = () => {
      if (window[globalName]) resolve(window[globalName]);
      else reject(new Error(`${NAME[kind]} 脚本已加载，但没有导出 ${globalName}`));
    };
    script.onerror = () => reject(new Error(`${NAME[kind]} 引擎脚本加载失败`));

    document.head.appendChild(script);
  });

  inflight.set(kind, promise);
  promise.catch(() => {
    inflight.delete(kind);
    // 失败的 <script> 留在 head 里没有意义，清掉以便下次重试
    document.querySelector(`script[data-engine="${kind}"]`)?.remove();
  });

  return promise;
}

/** 预取引擎（输入框识别出类型后调用），失败静默，真正播放时会再试一次。 */
export function preloadEngine(kind) {
  loadEngine(kind).catch(() => {});
}

/** 预取函数用到的引擎类型（供 main.js 判断） */
export function engineForType(type) {
  if (type === "m3u8") return "hls";
  if (type === "flv") return "flv";
  if (type === "mpd") return "dash";
  return null;
}
