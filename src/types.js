// @ts-check

/**
 * Video metadata stored in browser.storage.local, keyed by YouTube video ID.
 * @typedef {{ title?: string, duration?: number, skipped?: number, uploadDate?: string, author?: string, views?: number, likes?: number, live?: number, playlist?: boolean }} VideoData
 */

/**
 * Merged tab entry combining chrome.tabs.Tab with VideoData and custom aliases.
 * @typedef {chrome.tabs.Tab & VideoData & { sleepy?: boolean, tabTitle?: string, youtubeID?: string, liveDuration?: number, shorts?: boolean }} MergedTabData
 */

/**
 * MergedTabData with an additional tabId key used by prefilterTabs.
 * @typedef {MergedTabData & { tabId: string }} TabEntry
 */

/** @param {string} id @returns {HTMLElement} */
export const el = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

const youtubeUrlRegex =
  /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w-]+\?|embed\/|v\/)?)?.*(v=([\w-]+)(?=&|\s|$))/i;

/** @param {string} url */
export function extractYouTubeID(url) {
  const shortsMatch = url.match(/youtube\.com\/shorts\/([\w-]+)/);
  if (shortsMatch) return shortsMatch[1];
  const match = youtubeUrlRegex.exec(url);
  return match ? match[7] : false;
}

/**
 * Returns a comparator function for sorting tabs by the given rules.
 * @param {Array<{ attr: string, asc: boolean }>} sortingRules
 */
export function createTabSorter(sortingRules) {
  return (/** @type {any} */ a, /** @type {any} */ b) => {
    for (const sorting of sortingRules) {
      const criteria = sorting.attr;
      const critA = typeof a[criteria] === "string" ? a[criteria].toLowerCase() : a[criteria];
      const critB = typeof b[criteria] === "string" ? b[criteria].toLowerCase() : b[criteria];
      let res = String(critA).localeCompare(String(critB), undefined, { numeric: true });
      if (sorting.asc === true && res !== 0) res = -res;
      if (res !== 0) return res;
    }
    return 0;
  };
}

/**
 * Groups sorted tabs by window and moves them into position.
 * @param {any[]} sortedTabs
 * @param {boolean} sortToStart
 */
export async function moveTabsByWindow(sortedTabs, sortToStart) {
  const windowGroups = new Map();
  for (const tab of sortedTabs) {
    if (!windowGroups.has(tab.windowId)) windowGroups.set(tab.windowId, []);
    windowGroups.get(tab.windowId).push(tab);
  }
  for (const [windowId, windowTabs] of windowGroups) {
    if (sortToStart) {
      const pinnedTabs = await browser.tabs.query({ windowId, pinned: true });
      const startIndex = pinnedTabs.length;
      for (const tab of /** @type {any[]} */ ([...windowTabs]).reverse()) {
        await browser.tabs.move(tab.id, { index: startIndex });
      }
    } else {
      for (const tab of windowTabs) {
        await browser.tabs.move(tab.id, { index: -1 });
      }
    }
  }
}
