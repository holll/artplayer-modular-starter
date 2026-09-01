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