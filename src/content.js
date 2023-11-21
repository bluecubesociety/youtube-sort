console.log("[YouTube Sort] Content File loaded.")

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

const observer = new MutationObserver((mutationsList, observer) => {
  try {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0 &&
      Array.from(mutation.addedNodes).some(addedNode => addedNode.nodeType === 1 && addedNode.classList.contains('ytp-right-controls'))) {
        // collects data for the storage (via meta tags)
        const uploadDate = document.querySelector("meta[itemprop='uploadDate']")?.content
        const title = document.querySelector("meta[itemprop='name']")?.content
        const author = document.querySelector(".ytd-channel-name")?.innerText
        const interactionCount = document.querySelector("meta[itemprop='interactionCount']")?.content
        const embedUrl = document.querySelector("link[itemprop='embedUrl']")?.href
        const publication = document.querySelector("meta[itemprop='isLiveBroadcast'][content='True']")?.content
        const duration = document.querySelector("meta[itemprop='duration']")?.content
        
        const videoID = embedUrl.match(/\/embed\/([a-zA-Z0-9_-]+)/)[1];

        const tabUrl = window.location.href;
        const isLive = publication;
        
        // saves data with video id as key
        if (videoID) {
          const videoData = {
            title: title,
            duration: calcDuration(duration),
            uploadDate: uploadDate,
            author: author,
            views: interactionCount,
            ...(isLive ? { live: true } : {}),
            ...(tabUrl.includes("&list=") ? { playlist: true } : {})
          }
          browser.storage.local.set({[videoID]: videoData}).then(() => {
            // create an indicator and append it to the page
            // (unless the extension is reloading)
            const controlDiv = document.querySelector(".ytp-right-controls");
            const previousIndicator = document.querySelector("#youtube-sort-indictor");

            if (controlDiv) {
              console.log("[YouTube Sort] submitted.")
              observer.disconnect();

              if (previousIndicator == null) {
                const indicator = document.createElement('img');
                indicator.id = "youtube-sort-indictor";
                indicator.src = `${browser.runtime.getURL("icons/icon-trans.svg")}`
                indicator.title = "Tab detected by YouTube Sort";
                indicator.style.cssText = "cursor: help; width: 50%; aspect-ratio: 1"

                const indicatorWrapper = document.createElement('div');
                indicatorWrapper.style.cssText = "user-select: none; height: 100%; aspect-ratio: 1; display: flex; justify-content: center; align-items: center;"

                indicatorWrapper.prepend(indicator);
                controlDiv.prepend(indicatorWrapper);
              }
            }
          });
        }
      }
    }
  } catch (error) {
    console.log("[YouTube Sort]", error);
  }
});

observer.observe(document, { childList: true, subtree: true });