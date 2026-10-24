// 锁屏 / 系统媒体面板 / 耳机线控的接管。
// 只在支持的浏览器上生效（Chrome/Edge/Safari 15+ 等），不支持时全部降级为空操作。
const SKIP_SECONDS = 10;
const POSITION_UPDATE_MS = 1000;

export function createMediaSession(art, getInfo) {
  const session = typeof navigator !== "undefined" ? navigator.mediaSession : null;
  if (!session) {
    return { syncMetadata() {}, updatePlaybackState() {}, syncPosition() {}, clear() {} };
  }

  let lastPositionAt = 0;

  const safe = (fn) => {
    try {
      fn();
    } catch (_) {
      // 某些浏览器对未注册 action 或非法 state 会抛错，忽略即可
    }
  };

  function syncMetadata() {
    if (typeof window.MediaMetadata !== "function") return;
    const info = getInfo() || {};
    safe(() => {
      session.metadata = new window.MediaMetadata({
        title: info.title || document.title,
        artist: info.artist || "在线播放",
        album: info.album || "",
      });
    });
  }

  function updatePlaybackState() {
    safe(() => {
      session.playbackState = art.playing ? "playing" : art.paused ? "paused" : "none";
    });
  }

  function syncPosition() {
    const now = Date.now();
    if (now - lastPositionAt < POSITION_UPDATE_MS) return;
    lastPositionAt = now;

    const duration = art.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;

    const position = Math.min(Math.max(art.currentTime || 0, 0), duration);
    safe(() => {
      session.setPositionState({
        duration,
        playbackRate: art.playbackRate || 1,
        position,
      });
    });
  }

  // 线控/锁屏按钮
  safe(() => session.setActionHandler("play", () => art.play()));
  safe(() => session.setActionHandler("pause", () => art.pause()));
  safe(() => session.setActionHandler("stop", () => art.stop()));
  safe(() =>
    session.setActionHandler("seekbackward", (details) =>
      art.seek(Math.max((art.currentTime || 0) - (details?.seekOffset || SKIP_SECONDS), 0))
    )
  );
  safe(() =>
    session.setActionHandler("seekforward", (details) =>
      art.seek(Math.min((art.currentTime || 0) + (details?.seekOffset || SKIP_SECONDS), art.duration || 0))
    )
  );
  safe(() => session.setActionHandler("seekto", (details) => art.seek(details?.seekTime || 0)));

  art.on("play", updatePlaybackState);
  art.on("pause", updatePlaybackState);
  art.on("video:timeupdate", syncPosition);
  art.on("ready", () => {
    syncMetadata();
    updatePlaybackState();
  });

  function clear() {
    safe(() => {
      session.metadata = null;
      session.playbackState = "none";
    });
  }

  return { syncMetadata, updatePlaybackState, syncPosition, clear };
}
