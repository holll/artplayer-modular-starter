import { $ } from "./dom.js";

export function ensureResumeUI() {
  if ($("#resumeOverlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "resumeOverlay";
  overlay.className = "resume-overlay is-hidden";
  overlay.innerHTML = `
    <div class="resume-modal" role="dialog" aria-modal="true" aria-label="继续播放">
      <div class="resume-title">检测到历史进度</div>
      <div class="resume-sub" id="resumeSub">上次播放到 --:--</div>
      <div class="resume-actions">
        <button class="btn" id="resumeRestartBtn" type="button">从头播放</button>
        <button class="btn primary" id="resumeContinueBtn" type="button">继续播放</button>
      </div>
      <div class="resume-hint" id="resumeHint">提示：直播流不保存进度。</div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) hideResumeModal();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.classList.contains("is-hidden")) {
      hideResumeModal();
    }
  });
}

export function showResumeModal({ subText = "", hintText = "", onContinue, onRestart }) {
  ensureResumeUI();
  const overlay = $("#resumeOverlay");
  $("#resumeSub").textContent = subText || "上次播放到 --:--";
  $("#resumeHint").textContent = hintText || "";

  const continueBtn = $("#resumeContinueBtn");
  const restartBtn = $("#resumeRestartBtn");

  // Remove previous handlers safely by cloning
  const c2 = continueBtn.cloneNode(true);
  const r2 = restartBtn.cloneNode(true);
  continueBtn.parentNode.replaceChild(c2, continueBtn);
  restartBtn.parentNode.replaceChild(r2, restartBtn);

  c2.addEventListener("click", () => {
    hideResumeModal();
    try { onContinue && onContinue(); } catch (_) {}
  });

  r2.addEventListener("click", () => {
    hideResumeModal();
    try { onRestart && onRestart(); } catch (_) {}
  });

  overlay.classList.remove("is-hidden");
  document.body.classList.add("modal-open");
}

export function hideResumeModal() {
  const overlay = $("#resumeOverlay");
  if (overlay) overlay.classList.add("is-hidden");
  document.body.classList.remove("modal-open");
}
