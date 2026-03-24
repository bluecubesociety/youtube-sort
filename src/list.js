// @ts-check
/** @import { TabEntry } from './types.js' */
import { settings } from "./settings.js";
import { prefilterTabs, hideVideo } from "./tabs.js";

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
  let totalLikes = 0;
  const uniqueChannels = new Set(tabs.map((t) => t.author).filter(Boolean)).size;
  for (const tab of tabs) {
    totalDuration += settings.sort_sponsorblock
      ? (tab?.skipped ?? (Number.isFinite(tab.duration) ? /** @type {number} */ (tab.duration) : 0))
      : Number.isFinite(tab.duration)
        ? /** @type {number} */ (tab.duration)
        : 0;
    totalViews += Number.isFinite(tab.views) ? /** @type {number} */ (tab.views) : 0;
    totalLikes += Number.isFinite(tab.likes) ? /** @type {number} */ (tab.likes) : 0;
  }
  el("stat_tabs").innerText = String(tabs.length);
  el("stat_tabs_label").innerText = isSelection ? "selected videos" : "detected videos";
  el("stat_channels").innerText = String(uniqueChannels);
  el("stat_duration").innerText = getDuration(totalDuration);
  el("stat_views").innerText = getViews(totalViews);
  el("stat_likes").innerText = getViews(totalLikes);
}

/** @type {HTMLElement | null} */
let openMenu = null;

function closeOpenMenu() {
  if (openMenu) {
    openMenu.classList.remove("item-menu--open");
    openMenu = null;
  }
}

/** renders the list of detected tabs. */
export async function renderList() {
  const tabList = el("video-list");
  tabList.innerHTML = '<div class="spinner" role="status" aria-label="Loading"></div>';

  const tabs = await prefilterTabs();
  tabList.innerHTML = "";
  openMenu = null;
  const isSelection = tabs.length > 1 && tabs.every((t) => t.selected);
  updateStats(tabs, isSelection);

  for (const tab of tabs) {
    const tabData = /** @type {Record<string, string | number | boolean | undefined>} */ (
      /** @type {unknown} */ (tab)
    );

    // Use a div so inner buttons are valid HTML
    const itemEl = document.createElement("div");
    itemEl.id = tab.youtubeID ?? "";
    itemEl.classList.add("item");
    itemEl.setAttribute("role", "button");
    itemEl.setAttribute("tabindex", "0");
    if (tab.sleepy) itemEl.classList.add("item--sleepy");

    const activate = () => {
      browser.tabs.update(tab.id, { active: true });
    };
    itemEl.addEventListener("click", (e) => {
      if (/** @type {HTMLElement} */ (e.target).closest(".item-menu-btn, .item-menu")) return;
      activate();
    });
    itemEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate();
      }
    });

    const contentEl = document.createElement("div");
    contentEl.className = "item-content";

    const titleElement = document.createElement("p");
    titleElement.className = "title";
    titleElement.textContent = tab.title ?? null;
    contentEl.appendChild(titleElement);

    const smallElement = document.createElement("small");
    /** @typedef {{ prop: string, textFunc?: (val: string | number | boolean | undefined) => string, className?: string, icon?: string }} TabPropDef */
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
        className: "meta-item",
      },
      {
        prop: "uploadDate",
        textFunc: (date) => new Date(/** @type {string} */ (date)).toLocaleDateString(),
        className: "meta-item",
      },
      {
        prop: "views",
        textFunc: (views) => getViews(/** @type {number} */ (views)),
        className: "meta-item",
        icon: `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-label="views"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`,
      },
      {
        prop: "likes",
        textFunc: (likes) => getViews(/** @type {number} */ (likes)),
        className: "meta-item",
        icon: `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-label="likes"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>`,
      },
      { prop: "author", className: "meta-item" },
    ];
    properties.forEach(({ prop, textFunc, className, icon }) => {
      if (prop === "duration" ? Number.isFinite(tabData[prop]) : tabData[prop]) {
        const spanElement = document.createElement("span");
        if (className) spanElement.className = className;
        const text = settings.sort_sponsorblock && prop === "duration"
          ? textFunc?.(tabData["skipped"] ?? tabData["duration"]) ?? ""
          : textFunc ? textFunc(tabData[prop]) : String(tabData[prop]);
        if (icon) {
          spanElement.innerHTML = icon + text;
        } else {
          spanElement.textContent = text;
        }
        smallElement.appendChild(spanElement);
      }
    });
    if (smallElement.childElementCount === 0) itemEl.classList.add("no-data");
    contentEl.appendChild(smallElement);
    itemEl.appendChild(contentEl);

    // Three-dots menu button (shown on hover via CSS)
    const menuBtn = document.createElement("button");
    menuBtn.className = "item-menu-btn";
    menuBtn.setAttribute("aria-label", "More options");
    menuBtn.textContent = "⋮";
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const menu = /** @type {HTMLElement} */ (itemEl.querySelector(".item-menu"));
      if (menu.classList.contains("item-menu--open")) {
        closeOpenMenu();
      } else {
        closeOpenMenu();
        menu.classList.add("item-menu--open");
        openMenu = menu;
      }
    });
    itemEl.appendChild(menuBtn);

    // Dropdown menu
    const menuEl = document.createElement("div");
    menuEl.className = "item-menu";

    const reloadBtn = document.createElement("button");
    reloadBtn.className = "item-menu-action";
    reloadBtn.textContent = "Reload tab";
    reloadBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      closeOpenMenu();
      await browser.tabs.reload(tab.id);
      renderList();
    });
    menuEl.appendChild(reloadBtn);

    const clearBtn = document.createElement("button");
    clearBtn.className = "item-menu-action";
    clearBtn.textContent = "Clear cached data";
    clearBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      closeOpenMenu();
      if (tab.youtubeID) await browser.storage.local.remove(tab.youtubeID);
      renderList();
    });
    menuEl.appendChild(clearBtn);

    const hideBtn = document.createElement("button");
    hideBtn.className = "item-menu-action item-menu-action--danger";
    hideBtn.textContent = "Remove from list";
    hideBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      closeOpenMenu();
      if (tab.youtubeID) await hideVideo(tab.youtubeID);
      renderList();
    });
    menuEl.appendChild(hideBtn);
    itemEl.appendChild(menuEl);

    tabList.appendChild(itemEl);
  }

  // Close open menu when clicking outside
  document.addEventListener("click", closeOpenMenu, { once: true });
}

/** hard reset in storage if needed. */
export async function deleteStorage() {
  await browser.storage.local.clear();
}
