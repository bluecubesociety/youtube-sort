// @ts-check
import { settings, updateSettings } from "./settings.js";
import { el } from "./types.js";

const TIPS = [
  "You can sort selected tabs only — highlight a few tabs first, then sort!",
  "Use Arrow Up / Arrow Down on a focused sort rule to reorder without a mouse.",
  "Multiple sort rules are applied in order — lower rules only break ties from the one above.",
  "Unloaded tabs are still sorted using their cached metadata from the last time they were open.",
  "SponsorBlock adjusts the duration used for sorting, not just the display — so shorter effective runtime ranks first.",
  "If a video's duration looks wrong, the metadata may be stale — 'Delete Storage' resets it.",
];

/** @param {number} index */
function showTip(index) {
  settings.tip_index = index;
  el("tip-text").textContent = TIPS[index];
  el("tip-counter").textContent = `${index + 1} / ${TIPS.length}`;
  /** @type {HTMLButtonElement} */ (el("tip-prev")).disabled = index === 0;
  /** @type {HTMLButtonElement} */ (el("tip-next")).disabled = index === TIPS.length - 1;
}

export function initTips() {
  if (settings.tip_index >= TIPS.length) {
    el("tips").classList.add("hidden");
    el("reset-tip").classList.remove("hidden");
  } else {
    showTip(settings.tip_index);
    el("reset-tip").classList.add("hidden");
  }
}

export async function closeTip() {
  settings.tip_index = TIPS.length;
  el("tips").classList.add("hidden");
  el("reset-tip").classList.remove("hidden");
  await updateSettings();
}

export async function resetTip() {
  settings.tip_index = 0;
  el("tips").classList.remove("hidden");
  el("reset-tip").classList.add("hidden");
  showTip(0);
  await updateSettings();
}

export function navigateTip(/** @type {number} */ delta) {
  const next = Math.max(0, Math.min(settings.tip_index + delta, TIPS.length - 1));
  showTip(next);
}
