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
// 页面上给人看的类型名：MSE 类直接用类型，直链按扩展名判断
const NATIVE_EXT = {
  mp4: "MP4", m4v: "MP4", webm: "WebM", mov: "MOV", ogv: "OGG", ogg: "OGG",
  mp3: "MP3", aac: "AAC", wav: "WAV", m4a: "M4A",
};

export function typeLabel(url, type) {
  if (type && type !== "auto") return type.toUpperCase();
  const u = (url || "").split("?")[0].toLowerCase();
  const dot = u.lastIndexOf(".");
  const ext = dot === -1 ? "" : u.slice(dot + 1);
  return NATIVE_EXT[ext] || "直链";
}
