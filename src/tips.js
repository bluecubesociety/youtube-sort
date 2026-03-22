import { settings, updateSettings } from "./settings.js";

const TIPS = [
  "You can sort selected tabs only — highlight a few tabs first, then sort!",
  "Use Arrow Up / Arrow Down on a focused sort rule to reorder without a mouse.",
  "Multiple sort rules are applied in order — lower rules only break ties from the one above.",
  "Unloaded tabs are still sorted using their cached metadata from the last time they were open.",
  "SponsorBlock adjusts the duration used for sorting, not just the display — so shorter effective runtime ranks first.",
  "If a video's duration looks wrong, the metadata may be stale — 'Delete Storage' in the Danger Zone resets it.",
];

export function initTips() {
  if (settings.tip_index < TIPS.length) {
    document.getElementById("tip-text").textContent = TIPS[settings.tip_index];
    document.getElementById("reset-tip").classList.add("hidden");
  } else {
    document.getElementById("tips").classList.add("hidden");
  }
}

export async function closeTip() {
  settings.tip_index += 1;
  if (settings.tip_index < TIPS.length) {
    document.getElementById("tip-text").textContent = TIPS[settings.tip_index];
  } else {
    document.getElementById("tips").classList.add("hidden");
    document.getElementById("reset-tip").classList.remove("hidden");
  }
  await updateSettings();
}

export async function resetTip() {
  settings.tip_index = 0;
  document.getElementById("tip-text").textContent = TIPS[0];
  document.getElementById("tips").classList.remove("hidden");
  document.getElementById("reset-tip").classList.add("hidden");
  await updateSettings();
}
