console.log("[YouTube Sort] Content File loaded.")

const observer = new MutationObserver((mutationsList, observer) => {
  try {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {

        // collects data for the storage (via meta tags)
        const uploadDate = document.querySelector("meta[itemprop='uploadDate']")?.content
        const title = document.querySelector("meta[itemprop='name']")?.content
        const author = document.querySelector("meta[itemprop='author']")?.content
        const interactionCount = document.querySelector("meta[itemprop='interactionCount']")?.content
        const embedUrl = document.querySelector("link[itemprop='embedUrl']")?.href
        const publication = document.querySelector("meta[itemprop='isLiveBroadcast'][content='True']")?.content
          
        const videoID = embedUrl.match(/\/embed\/([a-zA-Z0-9_-]+)/)[1];

        const videoNodes = document.querySelectorAll("video");
        const validVideoNode = Array.from(videoNodes).find(videoNode => !isNaN(videoNode.duration));

        const tabUrl = window.location.href;
        const isLive = publication;
        
        // saves data with video id as key
        if (videoID) {
          const videoData = {
            title: title,
            duration: validVideoNode.duration,
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

            console.log("[YouTube Sort] submitted.")
            observer.disconnect();

            if (controlDiv && previousIndicator == null) {
              const indicator = document.createElement('div');
              indicator.id = "youtube-sort-indictor";
              indicator.title = "Tab detected by YouTube Sort";
              indicator.style.cssText = "cursor: help; height: 8px; aspect-ratio: 1; border-radius: 4px; background-color: var(--main-color, red);"

              const indicatorWrapper = document.createElement('div');
              indicatorWrapper.style.cssText = "user-select: none; margin-right: 12px;height: 100%;width: 8px;display: flex;justify-content: center;align-items: center;"

              indicatorWrapper.prepend(indicator);
              controlDiv.prepend(indicatorWrapper);
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