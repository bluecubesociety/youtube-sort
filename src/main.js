// @ts-check
import { settings, getSettings, updateSettings } from "./settings.js";
import { prefilterTabs } from "./tabs.js";
import { renderList, deleteStorage } from "./list.js";
import { sortTabs, renderSortOptions } from "./sort.js";
import { initTips, closeTip, resetTip, navigateTip } from "./tips.js";
import { el } from "./types.js";

/** @param {string} id @returns {HTMLInputElement} */
const cb = (id) => /** @type {HTMLInputElement} */ (document.getElementById(id));

/**
 * Boolean settings keys, used by changeSetting to keep assignment type-safe.
 * @typedef {'ignore_inactive' | 'ignore_playlists' | 'ignore_live' | 'ignore_shorts' | 'sort_sponsorblock' | 'sort_to_start' | 'current_window_only' | 'auto_sort' | 'force_reload' | 'unload_after_reload' | 'show_tab_icon' | 'show_stats'} BoolSetting
 */

/** changes the active menu in the settings and saves it */
/** @param {number} menu */
async function setActiveMenu(menu) {
  settings.menu = menu;
  renderMenu();
  await updateSettings();
}

/** hides the list menu and shows the settings menu. */
function showSettings() {
  el("tab-list").classList.add("hidden");
  el("tab-settings").classList.remove("hidden");
  el("tab-button-list").classList.remove("active");
  el("tab-button-settings").classList.add("active");
  renderList();
}

/** hides the settings menu and shows the list menu. */
function showList() {
  el("tab-settings").classList.add("hidden");
  el("tab-list").classList.remove("hidden");
  el("tab-button-settings").classList.remove("active");
  el("tab-button-list").classList.add("active");
  renderList();
}

/** shows the correct menu, depending on the settings. */
function renderMenu() {
  if (settings.menu === 1) {
    showList();
  } else {
    showSettings();
  }
}

function renderSettings() {
  cb("ignore-inactive").checked = settings.ignore_inactive;
  cb("ignore-live").checked = settings.ignore_live;
  cb("ignore-playlists").checked = settings.ignore_playlists;
  cb("ignore-shorts").checked = settings.ignore_shorts;
  cb("sort-sponsorblock").checked = settings.sort_sponsorblock;
  cb("sort-to-start").checked = settings.sort_to_start;
  cb("current-window-only").checked = settings.current_window_only;
  cb("auto-sort").checked = settings.auto_sort;
  cb("force-reload").checked = settings.force_reload;
  cb("unload-after-reload").checked = settings.unload_after_reload;
  cb("show-tab-icon").checked = settings.show_tab_icon;
  cb("show-stats").checked = settings.show_stats;
}

async function updateSponsorBlockVisibility() {
  const tabs = await prefilterTabs();
  /** @type {HTMLElement} */ (el("sort-sponsorblock").parentNode).style.display = tabs.some(
    (tab) => tab.skipped
  )
    ? "initial"
    : "none";
}

async function updateCurrentWindowOnlyVisibility() {
  const windows = await browser.windows.getAll();
  /** @type {HTMLElement} */ (el("current-window-only").parentNode).style.display =
    windows.length <= 1 ? "none" : "";
}

function updateUnloadAfterReloadVisibility() {
  const show = settings.force_reload ? "" : "none";
  el("unload-after-reload-label").style.display = show;
  el("force-reload-note").style.display = show;
}

/** @param {BoolSetting} setting @param {Event} e */
async function changeSetting(setting, e) {
  settings[setting] = /** @type {HTMLInputElement} */ (e.target).checked;
  renderSettings();
  if (setting === "force_reload") updateUnloadAfterReloadVisibility();
  await updateSettings();
}

async function init() {
  await getSettings();

  el("tab-button-settings").addEventListener("click", () => setActiveMenu(0));
  el("tab-button-list").addEventListener("click", () => setActiveMenu(1));
  renderMenu();

  initTips();

  el("version-number").innerText = browser.runtime.getManifest().version || "Unknown";

  renderSortOptions();
  renderSettings();
  await updateSponsorBlockVisibility();
  await updateCurrentWindowOnlyVisibility();
  updateUnloadAfterReloadVisibility();

  el("close-button").addEventListener("click", closeTip);
  el("reset-tip").addEventListener("click", resetTip);
  el("tip-prev").addEventListener("click", () => navigateTip(-1));
  el("tip-next").addEventListener("click", () => navigateTip(1));

  for (const [id, key] of /** @type {[string, BoolSetting][]} */ ([
    ["ignore-inactive", "ignore_inactive"],
    ["ignore-live", "ignore_live"],
    ["ignore-playlists", "ignore_playlists"],
    ["ignore-shorts", "ignore_shorts"],
    ["sort-sponsorblock", "sort_sponsorblock"],
    ["sort-to-start", "sort_to_start"],
    ["current-window-only", "current_window_only"],
    ["auto-sort", "auto_sort"],
    ["force-reload", "force_reload"],
    ["unload-after-reload", "unload_after_reload"],
    ["show-tab-icon", "show_tab_icon"],
    ["show-stats", "show_stats"],
  ])) {
    el(id).addEventListener("click", (e) => changeSetting(key, e));
  }

  el("delete-storage").addEventListener("click", () => {
    el("delete-storage").classList.add("hidden");
    el("delete-storage-confirm").classList.remove("hidden");
  });
  el("delete-storage-yes").addEventListener("click", async () => {
    await deleteStorage();
    el("delete-storage-confirm").classList.add("hidden");
    el("delete-storage").classList.remove("hidden");
    renderList();
  });
  el("delete-storage-no").addEventListener("click", () => {
    el("delete-storage-confirm").classList.add("hidden");
    el("delete-storage").classList.remove("hidden");
  });
  el("tab-button-sort").addEventListener("click", sortTabs);

  // Sort info toggle
  el("sort-info-btn").addEventListener("click", () => {
    const btn = el("sort-info-btn");
    const tip = el("sort-info-tip");
    const isOpen = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", String(!isOpen));
    tip.classList.toggle("hidden", isOpen);
  });

  // Advanced section toggle
  el("advanced-toggle").addEventListener("click", () => {
    const btn = el("advanced-toggle");
    const isOpen = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", String(!isOpen));
  });
}

document.addEventListener("DOMContentLoaded", init);
