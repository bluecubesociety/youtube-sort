// @ts-check
/** @import { TabEntry } from './types.js' */
import { settings } from "./settings.js";
import { prefilterTabs } from "./tabs.js";

/** @param {string} id @returns {HTMLElement} */
const el = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

/** @param {number} views @returns {string} */
function getViews(views) {
  const SI_SYMBOL = ["", "K", "M", "B", "T"];
  const tier = (Math.log10(Math.abs(views)) / 3) | 0;
  if (tier === 0) return views.toString();
  const divisor = Math.pow(10, tier * 3);
  return (views / divisor).toFixed(1) + SI_SYMBOL[tier];
}

/** @param {number} timestamp @returns {string} */
function getPremiereTime(timestamp) {
  const today = new Date();
  const premiere = new Date(timestamp);
  const diff = premiere.getTime() - today.getTime();
  return getDuration(diff / 1000);
}

/** @param {number} seconds @returns {string} */
function getDuration(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  const formattedDays = days ? String(days).padStart(2, "0") + ":" : "";
  const formattedHours = hours ? String(hours).padStart(2, "0") + ":" : "";
  const formattedMinutes = String(minutes).padStart(2, "0");
  const formattedSeconds = String(remainingSeconds).padStart(2, "0");

  return `${formattedDays}${formattedHours}${formattedMinutes}:${formattedSeconds}`;
}

/** @param {TabEntry[]} tabs @param {boolean} isSelection */
function updateStats(tabs, isSelection) {
  let totalDuration = 0;
  let totalViews = 0;
  const uniqueChannels = new Set(tabs.map((t) => t.author).filter(Boolean)).size;
  for (const tab of tabs) {
    totalDuration += settings.sort_sponsorblock
      ? (tab?.skipped ?? (Number.isFinite(tab.duration) ? /** @type {number} */ (tab.duration) : 0))
      : Number.isFinite(tab.duration)
        ? /** @type {number} */ (tab.duration)
        : 0;
    totalViews += Number.isFinite(tab.views) ? /** @type {number} */ (tab.views) : 0;
  }
  el("stat_tabs").innerText = String(tabs.length);
  el("stat_tabs_label").innerText = isSelection ? "selected" : "videos";
  el("stat_channels").innerText = String(uniqueChannels);
  el("stat_duration").innerText = getDuration(totalDuration);
  el("stat_views").innerText = getViews(totalViews);
}

/** renders the list of detected tabs. */
export async function renderList() {
  const tabList = el("video-list");
  tabList.innerHTML = '<div class="spinner" role="status" aria-label="Loading"></div>';

  const tabs = await prefilterTabs();
  tabList.innerHTML = "";
  const isSelection = tabs.length > 1 && tabs.every((t) => t.selected);
  updateStats(tabs, isSelection);

  for (const tab of tabs) {
    const tabData = /** @type {Record<string, string | number | boolean | undefined>} */ (/** @type {unknown} */ (tab));
    const btnEl = document.createElement("button");
    btnEl.onclick = () => {
      browser.tabs.update(tab.id, { active: true });
    };
    btnEl.id = tab.youtubeID ?? "";
    btnEl.classList.add("item");

    const titleElement = document.createElement("p");
    titleElement.className = "title";
    titleElement.textContent = tab.title ?? null;
    btnEl.appendChild(titleElement);

    const smallElement = document.createElement("small");
    /** @typedef {{ prop: string, textFunc?: (val: string | number | boolean | undefined) => string, className?: string }} TabPropDef */
    /** @type {TabPropDef[]} */
    const properties = [
      { prop: "live", textFunc: () => "Live", className: "badge" },
      { prop: "playlist", textFunc: () => "Playlist", className: "badge" },
      {
        prop: "duration",
        textFunc: (duration) =>
          (tab.live ?? 0) > 0
            ? `Live in ${getPremiereTime(tab.live ?? 0)}`
            : getDuration(/** @type {number} */ (duration)),
      },
      {
        prop: "uploadDate",
        textFunc: (date) => new Date(/** @type {string} */ (date)).toLocaleDateString(),
      },
      { prop: "views", textFunc: (views) => `${getViews(/** @type {number} */ (views))} Views` },
      { prop: "author" },
    ];
    properties.forEach(({ prop, textFunc, className }) => {
      if (prop === "duration" ? Number.isFinite(tabData[prop]) : tabData[prop]) {
        const spanElement = document.createElement("span");
        if (className) spanElement.className = className;
        if (settings.sort_sponsorblock && prop === "duration") {
          spanElement.textContent =
            textFunc?.(tabData["skipped"] ?? tabData["duration"]) ?? "";
        } else {
          spanElement.textContent = textFunc ? textFunc(tabData[prop]) : String(tabData[prop]);
        }
        smallElement.appendChild(spanElement);
      }
    });
    if (smallElement.childElementCount === 0) btnEl.classList.add("no-data");
    btnEl.appendChild(smallElement);
    tabList.appendChild(btnEl);
  }
}

/** hard reset in storage if needed. */
export async function deleteStorage() {
  await browser.storage.local.clear();
}
