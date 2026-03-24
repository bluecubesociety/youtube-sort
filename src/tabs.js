// @ts-check
/** @import { VideoData, MergedTabData, TabEntry } from './types.js' */
import { settings } from "./settings.js";
import { extractYouTubeID } from "./types.js";

/** @param {string} youtubeID */
export async function hideVideo(youtubeID) {
  const { _hidden = [] } = await browser.storage.local.get("_hidden");
  if (!_hidden.includes(youtubeID)) {
    await browser.storage.local.set({ _hidden: [..._hidden, youtubeID] });
  }
}

/** returns merged tab and video data, remaps to an array, filters based on settings, filters if selected. */
export async function prefilterTabs() {
  const videoTabs = /** @type {Record<string, VideoData>} */ (await browser.storage.local.get());
  const hidden = /** @type {string[]} */ (videoTabs["_hidden"] ?? []);
  const allTabs = await browser.tabs.query({
    pinned: false,
    url: "*://*.youtube.com/*",
    ...(settings.current_window_only ? { currentWindow: true } : {}),
  });

  /** @type {Record<string, MergedTabData>} */
  const mergedTabData = {};
  // merges firefoxTab info and youtubeTab info and adjusts attribute-names
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
        tabTitle: tab.title,
        shorts: tab.url?.includes("/shorts/") ?? false,
      });
    }
  });

  // remap to an array
  const tabArray = /** @type {TabEntry[]} */ (
    Object.entries(mergedTabData).map((tab) => ({
      tabId: tab[0],
      ...tab[1],
    }))
  );

  // filter tabs based on settings
  const filteredTabs = tabArray.filter((tab) => {
    return (
      tab.youtubeID &&
      tab.title &&
      !hidden.includes(/** @type {string} */ (tab.youtubeID)) &&
      (!settings.ignore_playlists || !tab.playlist) &&
      (!settings.ignore_live || !tab.live) &&
      (!settings.ignore_inactive || !tab.sleepy) &&
      (!settings.ignore_shorts || !tab.shorts)
    );
  });

  // removes entries from storage that can not be found anymore
  await Promise.all(
    tabArray
      .filter((tab) => tab.youtubeID && !tab.title)
      .map((tab) => browser.storage.local.remove(/** @type {string} */ (tab.youtubeID)))
  );

  // filters other tabs if at least two have been selected, and return them
  const selectedTabs = filteredTabs.filter((tab) => tab.selected);
  return selectedTabs.length > 1 ? selectedTabs : filteredTabs;
}
