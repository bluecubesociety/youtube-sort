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

/** @param {number} windowId @returns {Promise<any[]>} */
async function queryVisible(windowId) {
  const all = await browser.tabs.query({ windowId });
  return all.filter(
    (t) =>
      !(/** @type {any} */ (t).hidden) && (!t.pinned || /** @type {any} */ (t.groupId ?? -1) !== -1)
  );
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
    /** @type {Map<number, any[]>} */
    const byGroup = new Map();
    for (const tab of windowTabs) {
      const gid = tab.groupId ?? -1;
      if (!byGroup.has(gid)) byGroup.set(gid, []);
      byGroup.get(gid).push(tab);
    }

    for (const [groupId, groupTabs] of byGroup) {
      const visible = await queryVisible(windowId);

      if (groupId === -1) {
        const ourIds = new Set(groupTabs.map((/** @type {any} */ t) => t.id));
        const ours = visible.filter((t) => ourIds.has(t.id));
        if (sortToStart) {
          // Move to the first non-pinned index in the window
          const firstNonPinned = visible
            .filter((t) => !t.pinned)
            .reduce(
              (m, t) => Math.min(m, t.index),
              ours.reduce((m, t) => Math.min(m, t.index), Infinity)
            );
          for (const tab of /** @type {any[]} */ ([...groupTabs]).reverse()) {
            await browser.tabs.move(tab.id, { index: firstNonPinned });
          }
        } else {
          const maxIndex = ours.reduce((m, t) => Math.max(m, t.index), 0);
          for (const tab of groupTabs) {
            await browser.tabs.move(tab.id, { index: maxIndex });
          }
        }
      } else {
        const allInGroup = visible.filter((t) => /** @type {any} */ (t.groupId ?? -1) === groupId);
        const groupStart = allInGroup.reduce((m, t) => Math.min(m, t.index), Infinity);
        for (const tab of /** @type {any[]} */ ([...groupTabs]).reverse()) {
          await browser.tabs.move(tab.id, { index: groupStart });
        }
      }
    }
  }
}
