export function createLiveDetector(art) {
  function detectLiveStream(type) {
    const v = art.video;
    const d = Number(art.duration);

    const durationInvalid = !Number.isFinite(d) || d <= 0;

    let seekableWindow = null;
    try {
      if (v && v.seekable && v.seekable.length) {
        const end = v.seekable.end(v.seekable.length - 1);
        const start = v.seekable.start(0);
        seekableWindow = end - start;
      }
    } catch (_) {}

    const typeIsLiveish = type === "flv" || type === "m3u8" || type === "mpd";
    if (durationInvalid && typeIsLiveish) return true;

    if ((type === "m3u8" || type === "mpd") && Number.isFinite(seekableWindow) && seekableWindow > 0) {
      if (!Number.isFinite(d) || d > 6 * 3600) return true;
    }

    return false;
  }

  function canSaveProgress({ url, isLiveStream }) {
    if (!url) return false;
    if (isLiveStream) return false;
    const d = Number(art.duration);
    return Number.isFinite(d) && d > 15;
  }

  return { detectLiveStream, canSaveProgress };
}