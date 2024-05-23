console.debug("[YouTube Sort] Content File loaded.")
let observerActive = false;

// converts a ISO 8601 string into seconds
function calcDuration (duration) {
  const regexPT = /^PT(?:(\d+\.*\d*)H)?(?:(\d+\.*\d*)M)?(?:(\d+\.*\d*)S)?$/
  let hours = 0, minutes = 0, seconds = 0, totalseconds = 0

  if (regexPT.test(duration)) {
    const matches = regexPT.exec(duration)
    if (matches[1]) hours = Number(matches[1])
    if (matches[2]) minutes = Number(matches[2])
    if (matches[3]) seconds = Number(matches[3])
    totalseconds = hours * 3600 + minutes * 60 + seconds
  }

  return totalseconds
}

function fetchVideoData (observer) {  
  // collects data for the storage (via meta tags)
  const uploadDate = document.querySelector("meta[itemprop='uploadDate']")?.content
  const title = document.querySelector("meta[itemprop='name']")?.content
  const author = document.querySelector(".ytd-channel-name")?.innerText
  const interactionCount = document.querySelector("meta[itemprop='interactionCount']")?.content
  const publication = document.querySelector("meta[itemprop='isLiveBroadcast'][content='True']")?.content
  const endDate = document.querySelector("meta[itemprop='endDate']")?.content
  const duration = document.querySelector("meta[itemprop='duration']")?.content

  const url = new URLSearchParams(window.location.search);
  const videoID = url.get('v');

  const tabUrl = window.location.href;
  const isLive = publication && !endDate;
      
  // saves data with video id as key
  if (videoID) {
    const videoData = {
      title: title,
      duration: calcDuration(duration),
      uploadDate: uploadDate,
      author: author,
      views: parseInt(interactionCount),
      ...(isLive ? { live: true } : {}),
      ...(tabUrl.includes("&list=") ? { playlist: true } : {})
    }
    browser.storage.local.set({[videoID]: videoData}).then(() => {
      // create an indicator and append it to the page
      // (unless the extension is reloading)
      const controlDiv = document.querySelector(".ytp-right-controls");
      const previousIndicator = document.querySelector("#youtube-sort-indictor");

      if (controlDiv) {
        console.debug("[YouTube Sort] submitted.")
        observer?.disconnect();
        observerActive = false

        if (previousIndicator == null) {
          const indicator = document.createElement('img');
          indicator.id = "youtube-sort-indictor";
          indicator.src = `${browser.runtime.getURL("icons/icon-trans.svg")}`
          indicator.style.width = "60%" 
          
          const indicatorWrapper = document.createElement('button');
          indicatorWrapper.readonly = "true";
          indicatorWrapper.style.cssText = "display: flex; align-items: center;"
          indicatorWrapper.classList = "ytp-sort-button ytp-button";
          indicatorWrapper.dataset.tooltipTargetId = "ytp-sort-button";
          indicatorWrapper.dataset.titleNoTooltip = "Tab detected by YouTube Sort";
          indicatorWrapper.title = "Tab detected by YouTube Sort";
          indicatorWrapper.ariaLabel = "Tab detected by YouTube Sort";
          
          indicatorWrapper.prepend(indicator);
          controlDiv.prepend(indicatorWrapper);
        }
      }
    });
  }
}

const observer = new MutationObserver((mutationsList, observer) => {
  try {
    for (const mutation of mutationsList) {
      if (mutation.addedNodes.length > 0 &&
      Array.from(mutation.addedNodes).some(addedNode => addedNode.nodeType === 1 && addedNode.classList.contains('ytp-right-controls'))) {
        if (observerActive) fetchVideoData(observer, observerActive);
      }
    }
  } catch (error) {
    console.debug("[YouTube Sort]", error);
  }
});

observer.observe(document, { childList: true, subtree: true });
fetchVideoData(observer, observerActive);