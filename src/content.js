// @ts-check
// This file is being loaded on ever YouTube tab to read out the video information and pass them to the storage.
// It also marks the video as being detected which helps identifying issues in the future.
console.debug("[YouTube Sort] Content File loaded.");

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

function fetchVideoData(observer) {
  // collects data for the storage (via meta tags)
  /** @param {string} sel @returns {HTMLMetaElement | null} */
  const meta = (sel) => /** @type {HTMLMetaElement | null} */ (document.querySelector(sel));
  const uploadDate = meta("meta[itemprop='uploadDate']")?.content;
  const title = meta("meta[itemprop='name']")?.content;
  const author = /** @type {HTMLElement | null} */ (document.querySelector(".ytd-channel-name"))?.innerText;
  const interactionCount = meta("meta[itemprop='interactionCount']")?.content;
  const publication = meta("meta[itemprop='isLiveBroadcast'][content='True']")?.content;
  const startDate = meta("meta[itemprop='startDate']")?.content;
  const endDate = meta("meta[itemprop='endDate']")?.content;
  const duration = meta("meta[itemprop='duration']")?.content;

  // sponsorBlock-specific
  const skipDuration = /** @type {HTMLElement | null} */ (document.querySelector("#sponsorBlockDurationAfterSkips"))?.innerText;
  if (skipDuration) {
    foundSponsorBlock = true;
    sponsorBlockObserver?.disconnect();
  }

  const videoID = getVideoID();

  const tabUrl = window.location.href;
  const isLive = publication && !endDate;

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

  // saves data with video id as key
  if (videoID) {
    const videoData = {
      title: title,
      duration: calcDuration(duration),
      ...(skipDuration
        ? {
            skipped: calcDuration(convertTimeFormat(skipDuration)),
          }
        : {}),
      uploadDate: uploadDate,
      author: author,
      views: parseInt(interactionCount) || undefined,
      ...(isLive ? { live: new Date(startDate).getTime() } : {}),
      ...(tabUrl.includes("&list=") ? { playlist: true } : {}),
    };

    browser.storage.local.set({ [videoID]: videoData }).then(() => {
      // create an indicator and append it to the page at targetNode.
      // (unless the extension is reloading)
      const targetNode = document.querySelector("#description-inner");
      const previousIndicator = document.querySelector("#youtube-sort-indicator");

      console.debug("targetNode", targetNode);
      console.debug("[YouTube Sort] submitted.");
      observer?.disconnect();
      observerActive = false;

      if (targetNode) {
        if (previousIndicator == null) {
          const indicator = document.createElement("img");
          indicator.id = "youtube-sort-indicator";
          indicator.src = `${browser.runtime.getURL("icons/icon-trans.svg")}`;
          indicator.style.width = "100%";

          const indicatorWrapper = document.createElement("div");
          indicatorWrapper.style.cssText =
            "opacity: 0.3; display: flex; justify-content: center; align-items: center; right: 12px; position: absolute; height: 2rem; aspect-ratio: 1;";
          indicatorWrapper.dataset.titleNoTooltip = "Tab detected by YouTube Sort";
          indicatorWrapper.title = "Tab detected by YouTube Sort";
          indicatorWrapper.ariaLabel = "Tab detected by YouTube Sort";

          indicatorWrapper.prepend(indicator);
          targetNode.prepend(indicatorWrapper);
        }
      }
    });
  }
}

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
        if (loaded && observerActive) fetchVideoData(observer);
      }
    }
  } catch (error) {
    console.debug("[YouTube Sort]", error);
  }
});

// sponsorBlock specific: fetch and submit video data (again), if the observer finds the sponsorBlock-add on
let sponsorBlockDebounceTimer = null;
const sponsorBlockObserver = new MutationObserver((mutationsList, observer) => {
  try {
    const relevant = mutationsList.some(
      (mutation) =>
        mutation.target instanceof Element &&
        mutation.target.id?.includes("sponsorBlockDurationAfterSkips")
    );
    if (relevant) {
      clearTimeout(sponsorBlockDebounceTimer);
      sponsorBlockDebounceTimer = setTimeout(() => fetchVideoData(observer), 300);
    }
  } catch (error) {
    console.debug("[YouTube Sort]", error);
  }
});

if (!foundSponsorBlock) {
  sponsorBlockObserver.observe(document, { childList: true, subtree: true });
  setTimeout(() => sponsorBlockObserver.disconnect(), 10000);
}
observer.observe(document, { childList: true, subtree: true });
fetchVideoData(observer);

// on shorts, YouTube uses SPA navigation when scrolling between videos.
// yt-navigate-finish fires after each navigation, allowing us to re-fetch.
if (isShorts()) {
  window.addEventListener("yt-navigate-finish", () => fetchVideoData(null));
}
