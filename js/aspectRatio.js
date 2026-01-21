export function createAspectSync(art) {
  function syncPlayerAspectRatio() {
    const v = art.video;
    if (!v) return false;

    const w = v.videoWidth;
    const h = v.videoHeight;
    if (!w || !h) return false;

    const el = document.getElementById("player");
    el.style.setProperty("--ar", `${w}/${h}`);
    return true;
  }

  function bindAspectSync() {
    const trySyncWithRetries = () => {
      let n = 0;
      const tick = () => {
        if (syncPlayerAspectRatio()) return;
        n += 1;
        if (n < 20) setTimeout(tick, 100);
      };
      tick();
    };

    art.on("video:loadedmetadata", trySyncWithRetries);
    art.on("video:loadeddata", trySyncWithRetries);
    art.on("video:canplay", trySyncWithRetries);
    art.on("play", trySyncWithRetries);

    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => syncPlayerAspectRatio());
      ro.observe(document.getElementById("player"));
      art.on("destroy", () => ro.disconnect());
    }

    // 码率/尺寸变化
    art.on("video:resize", trySyncWithRetries);
  }

  return { bindAspectSync, syncPlayerAspectRatio };
}