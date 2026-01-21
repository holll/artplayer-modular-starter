import { $, } from "../core/dom.js";
import { formatTime } from "../core/utils.js";

export function ensureProgressLine({ onClear }) {
  if ($("#lastProgressLine")) return;

  const hint = $("#hintLine");
  if (!hint) return;

  const line = document.createElement("div");
  line.id = "lastProgressLine";
  line.className = "last-progress is-hidden";
  line.innerHTML = `
    <span class="lp-dot"></span>
    <span class="lp-text">上次播放到 --:--</span>
    <button class="lp-clear" type="button" title="清除该地址的历史进度">清除</button>
  `;

  hint.insertAdjacentElement("afterend", line);

  line.querySelector(".lp-clear").addEventListener("click", async () => {
    try { await onClear?.(); } catch (_) {}
  });
}

export function setProgressLine(record, { isLive = false } = {}) {
  const line = $("#lastProgressLine");
  if (!line) return;

  if (!record || !record.time || isLive) {
    line.classList.add("is-hidden");
    return;
  }

  const t = formatTime(record.time);
  const d = record.duration ? formatTime(record.duration) : "";
  const txt = d ? `上次播放到 ${t} / ${d}` : `上次播放到 ${t}`;
  line.querySelector(".lp-text").textContent = txt;
  line.classList.remove("is-hidden");
}