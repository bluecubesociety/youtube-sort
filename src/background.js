const regex =
  /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w\-]+\?|embed\/|v\/)?)?.*(v=([\w\-]+)(?=&|\s|$))/i;

function extractYouTubeID(url) {
  const shortsMatch = url.match(/youtube\.com\/shorts\/([\w-]+)/);
  if (shortsMatch) return shortsMatch[1];
  const match = regex.exec(url);
  return match ? match[7] : false;
}

async function autoSort(windowId) {
  const { settings } = await browser.storage.sync.get("settings");
  if (!settings?.auto_sort) return;

  const videoTabs = await browser.storage.local.get();
  const allTabs = await browser.tabs.query({
    pinned: false,
    url: "*://*.youtube.com/*",
    ...(settings.current_window_only ? { windowId } : {}),
  });

  const mergedTabData = {};
  allTabs.forEach((tab) => {
    const youtubeID = extractYouTubeID(tab.url);
    if (youtubeID) {
      const key = `${youtubeID}-${tab.id}`;
      mergedTabData[key] = {
        sleepy: tab.discarded,
        selected: tab.highlighted,
        liveDuration:
          videoTabs[youtubeID]?.live ??
          videoTabs[youtubeID]?.skipped ??
          videoTabs[youtubeID]?.duration,
        ...(typeof youtubeID === "string" && youtubeID.length === 11
          ? { youtubeID }
          : {}),
        ...tab,
        ...videoTabs[youtubeID],
      };
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
      (!settings.ignore_inactive || !tab.sleepy),
  );

  const sortedTabs = filteredTabs.sort((a, b) => {
    for (const sorting of settings.sorting) {
      const criteria =
        sorting.attr === "duration" ? "liveDuration" : sorting.attr;
      const critA =
        typeof a[criteria] === "string"
          ? a[criteria].toLowerCase()
          : a[criteria];
      const critB =
        typeof b[criteria] === "string"
          ? b[criteria].toLowerCase()
          : b[criteria];
      let res = String(critA).localeCompare(critB, undefined, {
        numeric: true,
      });
      if (sorting.asc === true && res !== 0) res = -res;
      if (res !== 0) return res;
    }
  });

  const windowGroups = new Map();
  for (const tab of sortedTabs) {
    if (!windowGroups.has(tab.windowId)) windowGroups.set(tab.windowId, []);
    windowGroups.get(tab.windowId).push(tab);
  }
  for (const [wId, windowTabs] of windowGroups) {
    if (settings.sort_to_start) {
      const pinnedTabs = await browser.tabs.query({
        windowId: wId,
        pinned: true,
      });
      const startIndex = pinnedTabs.length;
      for (const tab of [...windowTabs].reverse()) {
        await browser.tabs.move(tab.id, { index: startIndex });
      }
    } else {
      for (const tab of windowTabs) {
        await browser.tabs.move(tab.id, { index: -1 });
      }
    }
  }
}

let debounceTimer = null;
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && extractYouTubeID(tab.url || "")) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => autoSort(tab.windowId), 1500);
  }
});
