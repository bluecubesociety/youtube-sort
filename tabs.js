const regex = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]*)(\S+)?/i
const settings = {
  count: 0,
  ignore_trailers: false,
  ignore_inactive: false,
  ignore_playlists: false,
  ignore_shorts: false,
  order: "desc"
}

function addStat(container, text, value, shouldIgnore) {
  if (shouldIgnore !== true && value > 0) {
    const stat = document.createElement("p");
    stat.textContent = `${value} ${text}${value !== 1 ? "s" : ""}`;
    container.appendChild(stat);
  }
}

function updateStats(videos, highlighted, inactive, trailers, shorts, playlists) {
  // updates and/or hides stats
  const container = document.querySelector(".stats-inner")
  container.innerHTML = "";
  const total = videos +
    (!settings.ignore_inactive ? inactive : 0) +
    (!settings.ignore_trailers ? trailers : 0) +
    (!settings.ignore_shorts ? shorts : 0) +
    (!settings.ignore_playlists ? playlists : 0);
  settings.count = total;
  addStat(container, "total tab", total, false);
  addStat(container, "video", videos, false);
  addStat(container, "selected video", highlighted, highlighted <= 1);
  addStat(container, "inactive tab", inactive, settings.ignore_inactive);
  addStat(container, "channel trailer", trailers, settings.ignore_trailers);
  addStat(container, "short", shorts, settings.ignore_shorts);
  addStat(container, "playlist", playlists, settings.ignore_playlists);

  if (total == 0) {
    const stat = document.createElement("p");
    stat.textContent = `No ${settings.ignore_inactive ? "active" : ""} tabs open on this window`;
    container.appendChild(stat);
  }
}

async function updateSettings () {
  // saves extension settings in the local storage
  let data = await browser.storage.sync.set({"settings": settings});
}

function checkBoxHandler (e) {
  settings[e.target.id] = e.target.type === "checkbox" ? e.target.checked : e.target.value
  updateSettings();
  listTabs();
  e.preventDefault();
}

async function getSettings () {
  // gets all current settings and updates the GUI accordingly
  const { settings: newSettings } = await browser.storage.sync.get("settings");
  Object.assign(settings, newSettings);
  for (const setting in settings) {
    const node = document.getElementById(setting)
    if (node) {
      node[typeof settings[setting] === "string" ? "value" : "checked"] = settings[setting];
    }
  }
}

async function listTabs() {
  browser.tabs.query({currentWindow: true}).then((tabs) => {
    let totalTabs = 0;
    let videos = 0;
    let highlighted = 0;
    let inactive = 0;
    let shorts = 0;
    let trailers = 0;
    let playlists = 0;
 
    tabs.forEach(tab => {
      if (regex.exec(tab.url) !== null) {
        totalTabs++
        if (tab.url.includes("v=") && !tab.discarded && !tab.url.includes("list=")) videos++
        if (tab.highlighted) highlighted++
        if (tab.url.includes("/shorts/")) shorts++
        if (tab.url.includes("/channel/") || tab.url.includes("/@")) trailers++
        if (tab.url.includes("list=")) playlists++
        if (tab.discarded) inactive++
      }
    })

    updateStats(videos, highlighted, inactive, trailers, shorts, playlists);
  });
}

async function sortTabs () {
  document.getElementById("sortTabs").classList.add("loading")

  try {
    let sleepyTabs = await browser.tabs.query({
      currentWindow: true,
      pinned: false,
      discarded: true,
      url: "*://*.youtube.com/*"
    })

    if (settings.ignore_inactive !== true) {
      sleepyTabs.forEach(tab => {
        browser.tabs.reload(tab.id)
      })
    }

    let savedTabs = await browser.storage.local.get()

    savedTabs = Object.entries(savedTabs).map(tab => {
      return {
        url: tab[0],
        sec: tab[1]
      }
    })

    // filter out tabs that should be ignored
    savedTabs = savedTabs.filter(tab => {
      if (
        tab.url.includes("/shorts/") ||
        tab.url.includes("/channel/") ||
        tab.url.includes("/@") ||
        tab.url.includes("list=")
      ) {
        return (
          (!tab.url.includes("/shorts/") || !settings.ignore_shorts) &&
          ((!tab.url.includes("/channel/") && !tab.url.includes("/@")) || !settings.ignore_trailers) &&
          (!tab.url.includes("list=") || !settings.ignore_playlists)
        );
      }
      return true;
    });

    let tabQuery = await browser.tabs.query({
      currentWindow: true,
      pinned: false,
      url: "*://*.youtube.com/*"
    })
    const highlightedTabs = tabQuery.filter(tab => tab.highlighted)
    const isHighlighted = highlightedTabs.length > 1

    const windowTabs = isHighlighted ? highlightedTabs : tabQuery;
    const filteredTabs = windowTabs.filter(obj1 => {
      return savedTabs.some(obj2 => {
        return obj1.url === obj2.url;
      });
    }).map(obj1 => {
      const obj2 = savedTabs.find(obj2 => {
        return obj1.url === obj2.url;
      });
      return {
        id: obj1.id,
        url: obj2.url,
        sec: obj2.sec
      };
    });

    filteredTabs.sort((a,b) => {
      if(settings.order === "desc")
        return b.sec - a.sec
      else 
        return a.sec - b.sec
    })

    filteredTabs.forEach(async (tab) => {
      browser.tabs.move(tab.id, {index: -1})
    })
  } catch (error) {
    console.log("[YT Sort]", error);
  } finally {
    document.getElementById("sortTabs").classList.remove("loading")
  }
}

async function init () {
  document.getElementById("version").innerText = browser.runtime.getManifest().version;
  document.getElementById("ignore_inactive").addEventListener("change", checkBoxHandler);
  document.getElementById("ignore_trailers").addEventListener("change", checkBoxHandler);
  document.getElementById("ignore_shorts").addEventListener("change", checkBoxHandler);
  document.getElementById("ignore_playlists").addEventListener("change", checkBoxHandler);
  document.getElementById("order").addEventListener("change", checkBoxHandler);
  document.getElementById('sortTabs').addEventListener("click", sortTabs);
  await getSettings();
  listTabs();
}
init();