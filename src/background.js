// @ts-check
/** @import { VideoData, MergedTabData } from './types.js' */
import { extractYouTubeID, createTabSorter, moveTabsByWindow } from "./types.js";

/** @param {number} windowId */
async function autoSort(windowId) {
  const { settings } = /** @type {{ settings: typeof import('./settings.js').settings }} */ (
    await browser.storage.sync.get("settings")
  );
  if (!settings?.auto_sort) return;

  const videoTabs = /** @type {Record<string, VideoData>} */ (await browser.storage.local.get());
  const allTabs = await browser.tabs.query({
    pinned: false,
    url: "*://*.youtube.com/*",
    ...(settings.current_window_only ? { windowId } : {}),
  });

  /** @type {Record<string, MergedTabData>} */
  const mergedTabData = {};
  allTabs.forEach((tab) => {
    const youtubeID = extractYouTubeID(tab.url ?? "");
    if (youtubeID) {
      const key = `${youtubeID}-${tab.id}`;
      mergedTabData[key] = /** @type {MergedTabData} */ ({
        liveDuration:
          videoTabs[youtubeID]?.live ??
          videoTabs[youtubeID]?.skipped ??
          videoTabs[youtubeID]?.duration,
        ...(typeof youtubeID === "string" && youtubeID.length === 11 ? { youtubeID } : {}),
        ...tab,
        ...videoTabs[youtubeID],
        sleepy: tab.discarded,
        selected: tab.highlighted,
        shorts: tab.url?.includes("/shorts/") ?? false,
      });
    }
  });

  const tabArray = Object.entries(mergedTabData).map(([tabId, data]) => ({
    tabId,
    ...data,
  }));
  const filteredTabs = tabArray.filter(
    (tab) =>
      tab.youtubeID &&
      tab.title &&
      (!settings.ignore_playlists || !tab.playlist) &&
      (!settings.ignore_live || !tab.live) &&
      (!settings.ignore_inactive || !tab.sleepy) &&
      (!settings.ignore_shorts || !tab.shorts)
  );

  const sortedTabs = filteredTabs.sort(createTabSorter(settings.sorting));
  await moveTabsByWindow(sortedTabs, settings.sort_to_start);
}

/** @type {ReturnType<typeof setTimeout> | null} */
let debounceTimer = null;
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && extractYouTubeID(changeInfo.url)) {
    clearTimeout(debounceTimer ?? undefined);
    debounceTimer = setTimeout(() => autoSort(tab.windowId), 1500);
  }
});
