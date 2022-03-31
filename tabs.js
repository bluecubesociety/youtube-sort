function listTabs() {
  browser.tabs.query({currentWindow: true}).then((tabs) => {
    let counttabs = 0;
    let countvideos = 0;

    let regex = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]*)(\S+)?/i
    
    tabs.forEach(tab => {
      if (regex.exec(tab.url) !== null) {
        counttabs++
        if (tab.url.includes("/watch?v=")) countvideos++
      }
    })

    document.getElementById("count-tabs").textContent = counttabs
    document.getElementById("count-videos").textContent = countvideos
  });
}

//onRemoved listener. fired when tab is removed
browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
  console.log(`The tab with id: ${tabId}, is closing`);
});

document.addEventListener("DOMContentLoaded", listTabs)
document.getElementById('sortTabs').addEventListener("click", sortTabs);

function onError(error) {
  console.log(`Error: ${error}`);
}

async function sortTabs () {
  console.log("sorting tabs...")
  let sleepyTabs = await browser.tabs.query({
    currentWindow: true,
    pinned: false,
    discarded: true,
    url: "*://*.youtube.com/*"
  })
  sleepyTabs.forEach(tab => {
    browser.tabs.reload(tab.id)
  })

  let savedTabs = await browser.storage.local.get()

  savedTabs = Object.entries(savedTabs).map(tab => {
    return {
      url: tab[0],
      sec: tab[1]
    }
  })

  savedTabs.sort((a,b) => {
    return b.sec - a.sec
  })

  savedTabs.forEach(async (tab) => {
    let tt = await browser.tabs.query({
      currentWindow: true,
      pinned: false,
      url: tab.url
    }).then((tt) => {
      if (tt.length > 0) {
        browser.tabs.move(tt[0].id, {index: -1})
      }
    })
  })
}