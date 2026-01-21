export function inferType(url) {
  const u = (url || "").split("?")[0].toLowerCase().trim();
  if (u.endsWith(".m3u8")) return "m3u8";
  if (u.endsWith(".flv")) return "flv";
  if (u.endsWith(".mpd")) return "mpd";
  return "auto";
}

export function setBadge(el, text) {
  if (el) el.textContent = text;
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const p2 = (x) => String(x).padStart(2, "0");
  return hh > 0 ? `${hh}:${p2(mm)}:${p2(ss)}` : `${mm}:${p2(ss)}`;
}

export function safeUrlKey(url) {
  return (url || "").trim();
}