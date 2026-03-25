// @ts-check
import { settings, updateSettings } from "./settings.js";
import { el } from "./types.js";

/** @typedef {{ text: string, linkText?: string, href?: string }} Tip */

/** @type {Tip[]} */
const TIPS = [
  { text: "Highlighting tabs lets you sort them exclusively." },
  {
    text: "Unloaded tabs are still sorted using their cached metadata from the last time they were open.",
  },
  { text: "We detect SponsorBlock, which adjusts the duration used for sorting." },
  {
    text: "Found a bug or have a suggestion? ",
    linkText: "Report it here.",
    href: "https://github.com/bluecubesociety/youtube-sort/issues",
  },
  {
    text: "Thanks for using YouTube Sort! Support our future projects ",
    linkText: "on our website.",
    href: "https://bluecubesociety.com/",
  },
];

/** @param {number} index */
function showTip(index) {
  settings.tip_index = index;
  const tip = TIPS[index];
  const tipEl = el("tip-text");
  if (tip.href && tip.linkText) {
    tipEl.innerHTML = "";
    tipEl.appendChild(document.createTextNode(tip.text));
    const a = document.createElement("a");
    a.href = tip.href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = tip.linkText;
    tipEl.appendChild(a);
  } else {
    tipEl.textContent = tip.text;
  }
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
