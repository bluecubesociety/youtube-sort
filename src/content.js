try {
  // collects data for the storage
  const schemaTags = document.querySelectorAll("script[type='application/ld+json']");
  const schemaTagsArray = Array.from(schemaTags);
  const schemas = schemaTagsArray.map(schemaTag => {
    return JSON.parse(schemaTag?.textContent)
  })
  const schema = Object.assign({}, ...schemas);
  const videoID = schema.embedUrl?.match(/\/embed\/([a-zA-Z0-9_-]+)/)[1];

  const videoNodes = document.querySelectorAll("video");
  const validVideoNode = Array.from(videoNodes).find(videoNode => !isNaN(videoNode.duration));

  const tabUrl = window.location.href;
  const isLive = schema.publication?.some(obj => {
    return obj?.isLiveBroadcast
  })
  
  // saves data with video id as key
  if (videoID) {
    const videoData = {
      title: schema.name,
      duration: validVideoNode.duration,
      uploadDate: schema.uploadDate,
      author: schema.author,
      views: schema.interactionCount,
      ...(isLive ? { live: true } : {}),
      ...(tabUrl.includes("&list=") ? { playlist: true } : {})
    }
    browser.storage.local.set({[videoID]: videoData});
  }

  // create an indicator and append it to the page
  // (unless the extension is reloading)
  const controlDiv = document.querySelector(".ytp-right-controls");
  const previousIndicator = document.querySelector("#youtube-sort-indictor");

  if (controlDiv && !previousIndicator) {
    const indicator = document.createElement('div');
    indicator.id = "youtube-sort-indictor";
    indicator.title = "Tab detected by YouTube Sort";
    indicator.style.cssText = "cursor: help; height: 8px; aspect-ratio: 1; border-radius: 4px; background-color: var(--main-color);"

    const indicatorWrapper = document.createElement('div');
    indicatorWrapper.style.cssText = "user-select: none; margin-right: 12px;height: 100%;width: 8px;display: flex;justify-content: center;align-items: center;"

    indicatorWrapper.prepend(indicator);
    controlDiv.prepend(indicatorWrapper);
  }
} catch (error) {
  console.log("[YouTube Sort]", error);
}
