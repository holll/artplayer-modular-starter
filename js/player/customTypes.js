/* global Hls, flvjs, dashjs */

export function playM3u8(video, url, art) {
  if (art.__hls) {
    try { art.__hls.destroy(); } catch (_) {}
    art.__hls = null;
  }

  // Safari native HLS
  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = url;
    return;
  }

  if (window.Hls && Hls.isSupported()) {
    const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
    art.__hls = hls;
    hls.loadSource(url);
    hls.attachMedia(video);
    art.on("destroy", () => { try { hls.destroy(); } catch (_) {} });
  } else {
    art.notice.show = "当前浏览器不支持 HLS（hls.js 不可用或不支持）";
  }
}

export function playFlv(video, url, art) {
  if (!window.flvjs || !flvjs.isSupported()) {
    art.notice.show = "当前浏览器不支持 FLV（flv.js 不可用或不支持）";
    return;
  }

  if (art.__flv) {
    try { art.__flv.destroy(); } catch (_) {}
    art.__flv = null;
  }

  const flv = flvjs.createPlayer(
    { type: "flv", url },
    { enableWorker: true, stashInitialSize: 128, lazyLoad: true }
  );

  art.__flv = flv;
  flv.attachMediaElement(video);
  flv.load();

  art.on("destroy", () => { try { flv.destroy(); } catch (_) {} });
}

export function playMpd(video, url, art) {
  if (!window.dashjs) {
    art.notice.show = "dash.js 未加载，无法播放 DASH";
    return;
  }

  if (art.__dash) {
    try { art.__dash.reset(); } catch (_) {}
    art.__dash = null;
  }

  const player = dashjs.MediaPlayer().create();
  art.__dash = player;
  player.initialize(video, url, true);

  art.on("destroy", () => { try { player.reset(); } catch (_) {} });
}