import { settings, getSettings, updateSettings } from "./settings.js";
import { prefilterTabs } from "./tabs.js";
import { renderList, deleteStorage } from "./list.js";
import { sortTabs, renderSortOptions } from "./sort.js";
import { initTips, closeTip, resetTip } from "./tips.js";

/** changes the active menu in the settings and saves it */
async function setActiveMenu(menu) {
  settings.menu = menu;
  renderMenu();
  await updateSettings();
}

/** hides the list menu and shows the settings menu. */
function showSettings() {
  document.getElementById("tab-list").classList.add("hidden");
  document.getElementById("tab-settings").classList.remove("hidden");
  document.getElementById("tab-button-list").classList.remove("active");
  document.getElementById("tab-button-settings").classList.add("active");
  renderList();
}

/** hides the settings menu and shows the list menu. */
function showList() {
  document.getElementById("tab-settings").classList.add("hidden");
  document.getElementById("tab-list").classList.remove("hidden");
  document.getElementById("tab-button-settings").classList.remove("active");
  document.getElementById("tab-button-list").classList.add("active");
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

async function renderSettings() {
  document.getElementById("ignore-inactive").checked = settings.ignore_inactive;
  document.getElementById("ignore-live").checked = settings.ignore_live;
  document.getElementById("ignore-playlists").checked = settings.ignore_playlists;
  document.getElementById("sort-sponsorblock").checked = settings.sort_sponsorblock;
  document.getElementById("sort-to-start").checked = settings.sort_to_start;
  document.getElementById("current-window-only").checked = settings.current_window_only;
  document.getElementById("force-reload").checked = settings.force_reload;
  const tabs = await prefilterTabs();
  if (tabs.some((tab) => tab.skipped)) {
    document.getElementById("sort-sponsorblock").parentNode.style.display = "initial";
  } else {
    document.getElementById("sort-sponsorblock").parentNode.style.display = "none";
  }
}

async function changeSetting(setting, e) {
  settings[setting] = e.target.checked;
  renderSettings();
  await updateSettings();
}

async function init() {
  await getSettings();

  document
    .getElementById("tab-button-settings")
    .addEventListener("click", () => setActiveMenu(0));
  document
    .getElementById("tab-button-list")
    .addEventListener("click", () => setActiveMenu(1));
  renderMenu();

  initTips();

  document.getElementById("version-number").innerText =
    browser.runtime.getManifest().version || "Unknown";

  renderSortOptions();
  await renderSettings();

  document.getElementById("close-button").addEventListener("click", closeTip);
  document.getElementById("reset-tip").addEventListener("click", resetTip);

  for (const [id, key] of [
    ["ignore-inactive", "ignore_inactive"],
    ["ignore-live", "ignore_live"],
    ["ignore-playlists", "ignore_playlists"],
    ["sort-sponsorblock", "sort_sponsorblock"],
    ["sort-to-start", "sort_to_start"],
    ["current-window-only", "current_window_only"],
    ["force-reload", "force_reload"],
  ]) {
    document.getElementById(id).addEventListener("click", (e) => changeSetting(key, e));
  }

  document.getElementById("delete-storage").addEventListener("click", deleteStorage);
  document.getElementById("tab-button-sort").addEventListener("click", sortTabs);
}

document.addEventListener("DOMContentLoaded", init);
