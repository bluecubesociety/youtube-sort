// @ts-check
/** @import { VideoData } from './types.js' */
// This file is being loaded on ever YouTube tab to read out the video information and pass them to the storage.

let observerActive = false;
let foundSponsorBlock = false;

/**
 * Converts a given ISO 8601 duration string (in the format PTnHnMnS) into seconds.
 * Returns 0 if no valid input was found.
 *
 * @param {string} duration - The ISO 8601 duration string (e.g., "PT1H30M45S").
 * @returns {number} The total duration in seconds.
 */
function calcDuration(duration) {
  const regexPT = /^PT(?:(\d+\.*\d*)H)?(?:(\d+\.*\d*)M)?(?:(\d+\.*\d*)S)?$/;
  let hours = 0,
    minutes = 0,
    seconds = 0,
    totalseconds = 0;

  const matches = regexPT.exec(duration);
  if (matches) {
    if (matches[1]) hours = Number(matches[1]);
    if (matches[2]) minutes = Number(matches[2]);
    if (matches[3]) seconds = Number(matches[3]);
    totalseconds = hours * 3600 + minutes * 60 + seconds;
  }

  return totalseconds;
}

function isShorts() {
  return window.location.pathname.startsWith("/shorts/");
}

function getVideoID() {
  if (isShorts()) {
    return window.location.pathname.split("/shorts/")[1]?.split(/[?#]/)[0] || null;
  }
  return new URLSearchParams(window.location.search).get("v");
}

/**
 * @param {MutationObserver | null} observer
 * @param {boolean} [showTabIcon]
 */
function fetchVideoData(observer, showTabIcon = true) {
  // collects data for the storage (via meta tags)
  /** @param {string} sel @returns {HTMLMetaElement | null} */
  const meta = (sel) => /** @type {HTMLMetaElement | null} */ (document.querySelector(sel));
  const uploadDate = meta("meta[itemprop='uploadDate']")?.content;
  const title = meta("meta[itemprop='name']")?.content;
  const author = isShorts()
    ? /** @type {HTMLElement | null} */ (
        document.querySelector(".ytReelChannelBarViewModelChannelName")
      )?.innerText.trim()
    : (Array.from(
        /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll(".ytd-channel-name"))
      )
        .find((el) => el.innerText.trim())
        ?.innerText.trim() ??
      /** @type {HTMLElement | null} */ (
        document.querySelector("#attributed-channel-name")
      )?.innerText
        .replace(/\s+/g, " ")
        .trim());
  const interactionCount = (() => {
    try {
      for (const script of document.querySelectorAll("script:not([src])")) {
        const text = script.textContent || "";
        if (!text.includes('"viewCount"')) continue;
        const match = text.match(/"viewCount"\s*:\s*"(\d+)"/);
        if (match) return match[1];
      }
    } catch {
      /* ignore */
    }
    return undefined;
  })();
  const publication = meta("meta[itemprop='isLiveBroadcast'][content='True']")?.content;
  const startDate = meta("meta[itemprop='startDate']")?.content;
  const endDate = meta("meta[itemprop='endDate']")?.content;
  const duration = meta("meta[itemprop='duration']")?.content;

  // sponsorBlock-specific
  const skipDuration = /** @type {HTMLElement | null} */ (
    document.querySelector("#sponsorBlockDurationAfterSkips")
  )?.innerText;
  if (skipDuration) {
    foundSponsorBlock = true;
    sponsorBlockObserver?.disconnect();
  }

  const videoID = getVideoID();

  const likesBtn = document.querySelector("like-button-view-model button[aria-label]");
  const likesMatch = (likesBtn?.getAttribute("aria-label") ?? "").match(/[\d,]+/);
  const likes = likesMatch ? parseInt(likesMatch[0].replace(/,/g, ""), 10) : undefined;

  const tabUrl = window.location.href;
  const isLive = publication && !endDate;

  /** @param {string} timeString @returns {string} */
  function convertTimeFormat(timeString) {
    // Regular expression to capture hours (optional), minutes, and seconds
    const regex = /\((?:(\d+):)?(\d+):(\d+)\)/;
    const match = timeString.match(regex);
    if (!match) return timeString; // If the string doesn't match the pattern, return it as is.
    const [, hours, minutes, seconds] = match;
    let result = "PT";
    if (hours) {
      result += `${hours}H`;
      result += `${minutes}M${seconds}S`;
    } else {
      result += `${minutes}M${seconds}S`;
    }

    return result;
  }

  // overrides the tab favicon with the extension icon once detected
  const faviconUrl = browser.runtime.getURL("icons/icon-48.png");
  function applyFavicon() {
    const links = /** @type {NodeListOf<HTMLLinkElement>} */ (
      document.querySelectorAll('link[rel*="icon"]')
    );
    if (links.length === 1 && links[0].href === faviconUrl) return;
    links.forEach((el) => el.remove());
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = faviconUrl;
    document.head.appendChild(link);
  }

  // saves data with video id as key
  if (videoID) {
    const videoData = {
      ...(title ? { title } : {}),
      ...(duration ? { duration: calcDuration(duration) } : {}),
      ...(skipDuration
        ? {
            skipped: calcDuration(convertTimeFormat(skipDuration)),
          }
        : {}),
      ...(uploadDate ? { uploadDate } : {}),
      ...(author ? { author } : {}),
      ...(interactionCount !== undefined ? { views: parseInt(interactionCount) || undefined } : {}),
      ...(likes !== undefined ? { likes } : {}),
      ...(isLive ? { live: new Date(startDate ?? "").getTime() } : {}),
      ...(tabUrl.includes("&list=") ? { playlist: true } : {}),
    };

    const wouldBeIgnored =
      (filterSettings.ignore_live && Boolean(isLive)) ||
      (filterSettings.ignore_playlists && tabUrl.includes("&list=")) ||
      (filterSettings.ignore_shorts && isShorts());

    browser.storage.local.set({ [videoID]: videoData }).then(async () => {
      if (showTabIcon && !wouldBeIgnored) {
        applyFavicon();

        // reapply favicon if YouTube resets it
        const faviconObserver = new MutationObserver(() => applyFavicon());
        faviconObserver.observe(document.head, { childList: true });
      }

      observer?.disconnect();
      observerActive = false;
    });
  }
}

/** @type {boolean} */
let showTabIcon = true;
/** @type {{ ignore_live: boolean, ignore_playlists: boolean, ignore_shorts: boolean }} */
let filterSettings = { ignore_live: false, ignore_playlists: false, ignore_shorts: false };

const observer = new MutationObserver((mutationsList, observer) => {
  try {
    for (const mutation of mutationsList) {
      if (mutation.addedNodes.length > 0) {
        const loaded = Array.from(mutation.addedNodes).some(
          (addedNode) =>
            addedNode instanceof Element &&
            (addedNode.classList.contains("ytp-right-controls") ||
              addedNode.tagName === "YTD-REEL-PLAYER-RENDERER")
        );
        if (loaded && observerActive) fetchVideoData(observer, showTabIcon);
      }
    }
  } catch (error) {
    console.debug("[YouTube Sort]", error);
  }
});

/** @type {ReturnType<typeof setTimeout> | null} */
let lateDataDebounceTimer = null;

async function updateLateData() {
  const videoID = getVideoID();
  if (!videoID) return;

  const likesBtn = document.querySelector("like-button-view-model button[aria-label]");
  const likesMatch = (likesBtn?.getAttribute("aria-label") ?? "").match(/[\d,]+/);
  const likes = likesMatch ? parseInt(likesMatch[0].replace(/,/g, ""), 10) : undefined;

  const author = isShorts()
    ? /** @type {HTMLElement | null} */ (
        document.querySelector(".ytReelChannelBarViewModelChannelName")
      )?.innerText.trim()
    : (Array.from(
        /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll(".ytd-channel-name"))
      )
        .find((el) => el.innerText.trim())
        ?.innerText.trim() ??
      /** @type {HTMLElement | null} */ (
        document.querySelector("#attributed-channel-name")
      )?.innerText
        .replace(/\s+/g, " ")
        .trim());

  if (likes === undefined && !author) return;

  const result = await browser.storage.local.get(videoID);
  const current = /** @type {VideoData | undefined} */ (result[videoID]);
  if (!current) return;

  const needsUpdate =
    (likes !== undefined && current.likes === undefined) || (author && !current.author);
  if (!needsUpdate) {
    lateDataObserver.disconnect();
    return;
  }

  await browser.storage.local.set({
    [videoID]: {
      ...current,
      ...(likes !== undefined ? { likes } : {}),
      ...(author ? { author } : {}),
    },
  });

  if (likes !== undefined && author) lateDataObserver.disconnect();
}

const lateDataObserver = new MutationObserver((mutationsList) => {
  try {
    const relevant = mutationsList.some((mutation) => {
      if (mutation.target instanceof Element) {
        if (mutation.target.closest("like-button-view-model")) return true;
        if (mutation.target.classList.contains("ytd-channel-name")) return true;
        if (mutation.target.id === "attributed-channel-name") return true;
      }
      return Array.from(mutation.addedNodes).some(
        (n) =>
          n instanceof Element &&
          (n.tagName === "LIKE-BUTTON-VIEW-MODEL" ||
            n.classList.contains("ytd-channel-name") ||
            n.id === "attributed-channel-name" ||
            n.querySelector("like-button-view-model, .ytd-channel-name, #attributed-channel-name"))
      );
    });
    if (relevant) {
      clearTimeout(lateDataDebounceTimer ?? undefined);
      lateDataDebounceTimer = setTimeout(updateLateData, 500);
    }
  } catch (error) {
    console.debug("[YouTube Sort]", error);
  }
});

// sponsorBlock specific: fetch and submit video data (again), if the observer finds the sponsorBlock-add on
/** @type {ReturnType<typeof setTimeout> | null} */
let sponsorBlockDebounceTimer = null;
const sponsorBlockObserver = new MutationObserver((mutationsList, observer) => {
  try {
    const relevant = mutationsList.some(
      (mutation) =>
        mutation.target instanceof Element &&
        mutation.target.id?.includes("sponsorBlockDurationAfterSkips")
    );
    if (relevant) {
      clearTimeout(sponsorBlockDebounceTimer ?? undefined);
      sponsorBlockDebounceTimer = setTimeout(() => fetchVideoData(observer, showTabIcon), 300);
    }
  } catch (error) {
    console.debug("[YouTube Sort]", error);
  }
});

async function init() {
  const { settings: s } =
    /** @type {{ settings: typeof import('./settings.js').settings | undefined }} */ (
      await browser.storage.sync.get("settings")
    );
  showTabIcon = s?.show_tab_icon !== false; // default true
  filterSettings = {
    ignore_live: s?.ignore_live ?? false,
    ignore_playlists: s?.ignore_playlists ?? false,
    ignore_shorts: s?.ignore_shorts ?? false,
  };

  if (!foundSponsorBlock) {
    sponsorBlockObserver.observe(document, { childList: true, subtree: true });
    setTimeout(() => sponsorBlockObserver.disconnect(), 10000);
  }
  lateDataObserver.observe(document, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-label"],
  });
  setTimeout(() => lateDataObserver.disconnect(), 30000);
  observer.observe(document, { childList: true, subtree: true });
  fetchVideoData(observer, showTabIcon);

  // on shorts, YouTube uses SPA navigation when scrolling between videos.
  // yt-navigate-finish fires after each navigation, allowing us to re-fetch.
  if (isShorts()) {
    window.addEventListener("yt-navigate-finish", () =>
      setTimeout(() => fetchVideoData(null, showTabIcon), 600)
    );
  }
}

init();
