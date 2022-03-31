function updateCount(tabId, isOnRemoved) {
  browser.tabs.query({})
  .then((tabs) => {
    let regex = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]*)(\S+)?/i
    let length = 0
    tabs.forEach(tab => {
      if (regex.exec(tab.url) !== null) {
        length++
      }
    })

    browser.browserAction.setBadgeText({text: length.toString()});
  });
}

browser.tabs.onRemoved.addListener(
  (tabId) => { updateCount(tabId, true);
});
browser.tabs.onCreated.addListener(
  (tabId) => { updateCount(tabId, false);
});
browser.tabs.onUpdated.addListener(
  (tabId) => { updateCount(tabId, false);
});
browser.tabs.onReplaced.addListener(
  (tabId) => { updateCount(tabId, false);
});

updateCount();
