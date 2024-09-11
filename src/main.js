// This file renders the add-on dropdown menu.

const regex =
  /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w\-]+\?|embed\/|v\/)?)?.*(v=([\w\-]+)(?=&|\s|$))/i;

const settings = {
  show_tip: true,
  ignore_inactive: false,
  ignore_playlists: false,
  ignore_live: false,
  sort_sponsorblock: false,
  force_reload: false,
  sorting: [
    {
      dropdown: ["A-Z", "Z-A"],
      asc: false,
      order: 0,
      attr: "title",
      title: "Video Title",
    },
    {
      dropdown: ["Oldest first", "Newest first"],
      asc: false,
      order: 1,
      attr: "uploadDate",
      title: "Upload Date",
    },
    {
      dropdown: ["Least first", "Most first"],
      asc: false,
      order: 2,
      attr: "views",
      title: "Views",
    },
    {
      dropdown: ["A-Z", "Z-A"],
      asc: false,
      order: 3,
      attr: "author",
      title: "Channel Name",
    },
    {
      dropdown: ["Shortest first", "Longest first"],
      asc: false,
      order: 4,
      attr: "liveDuration",
      title: "Video Duration",
    },
  ],
  menu: 0,
};

/** saves extension settings in the local storage */
async function updateSettings() {
  await browser.storage.sync.set({
    settings: settings,
  });
}

/** loads settings from the sync storage */
async function getSettings() {
  const { settings: loadedSettings } =
    await browser.storage.sync.get("settings");
  const updatedSettings = { ...settings, ...loadedSettings };
  Object.assign(settings, updatedSettings);
}

function extractYouTubeID(url) {
  return regex.test(url) && regex.exec(url)[7];
}

/** returns merged tab and video data, remaps to an array, filters based on settings, filters if selected.
    TODO: merged data includes more stuff than I actually need. Also removes data from storage. Not sure if that's better somewhere else
*/
async function prefilterTabs() {
  const videoTabs = await browser.storage.local.get();
  const allTabs = await browser.tabs.query({
    pinned: false,
    url: "*://*.youtube.com/*",
  });

  const mergedTabData = {};
  // merges firefoxTab info and youtubeTab info and adjusts attribute-names
  allTabs.forEach((tab) => {
    const youtubeID = extractYouTubeID(tab.url);
    if (youtubeID) {
      const key = `${youtubeID}-${tab.id}`;
      mergedTabData[key] = {
        sleepy: tab.discarded,
        selected: tab.highlighted,
        tabTitle: tab.title,
        liveDuration:
          videoTabs[youtubeID]?.live ??
          videoTabs[youtubeID]?.skipped ??
          videoTabs[youtubeID]?.duration,
        ...(typeof youtubeID == "string" && youtubeID.length == 11
          ? { youtubeID: youtubeID }
          : {}),
        ...tab,
        ...videoTabs[youtubeID],
      };
    }
  });

  // remap to an array
  const tabArray = Object.entries(mergedTabData).map((tab) => {
    return {
      tabId: tab[0],
      ...tab[1],
    };
  });

  // filter tabs based on settings
  const filteredTabs = tabArray.filter((tab) => {
    return (
      tab.youtubeID &&
      tab.title &&
      (!settings.ignore_playlists || !tab.playlist) &&
      (!settings.ignore_live || !tab.live) &&
      (!settings.ignore_inactive || !tab.sleepy)
    );
  });

  // removes entries from storage that can not be found anymore
  filteredTabs.forEach(async (tab) => {
    if (!tab.title || !tab.id) {
      await browser.storage.local.remove(tab.youtubeID);
    }
  });

  // filters other tabs if at least two have been selected, and return them
  const selectedTabs = filteredTabs.filter((tab) => tab.selected);
  return selectedTabs.length > 1 ? selectedTabs : filteredTabs;
}

/** sorts tabs based on settings. */
async function sortTabs() {
  document.getElementById("tab-button-sort").classList.add("loading");
  document.getElementById("alert-error").innerText = "";

  try {
    const tabs = await prefilterTabs();

    // wake them up, if wanted
    if (settings.force_reload) {
      tabs.forEach((tab) => {
        browser.tabs.reload(tab.id);
      });
    }

    const sortedTabs = tabs.sort((a, b) => {
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

    sortedTabs.forEach(async (tab) => {
      browser.tabs.move(tab.id, { index: -1 });
    });
    renderList();

    // wake them up, if wanted
    if (settings.ignore_inactive !== true) {
      sortedTabs.forEach((tab) => {
        if (tab.sleepy) browser.tabs.reload(tab.id);
      });
    }
  } catch (error) {
    console.debug("[YouTube Sort]", error);
    document.getElementById("alert-error").innerText = "Error: " + error;
  } finally {
    document.getElementById("tab-button-sort").classList.remove("loading");
  }
}

/** returns views as a string */
function getViews(views) {
  const SI_SYMBOL = ["", "K", "M", "B", "T"];
  const tier = (Math.log10(Math.abs(views)) / 3) | 0;
  if (tier === 0) return views.toString();
  const divisor = Math.pow(10, tier * 3);
  return (views / divisor).toFixed(1) + SI_SYMBOL[tier];
}

/** returns relative premiere time */
function getPremiereTime(timestamp) {
  const today = new Date();
  const premiere = new Date(timestamp);
  const diff = premiere - today;
  return getDuration(diff / 1000);
}

/** returns duration as a string */
function getDuration(seconds) {
  const days = Math.floor(seconds / 86400); // 86400 seconds in a day
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  const formattedDays = days ? String(days).padStart(2, "0") + ":" : "";
  const formattedHours = hours ? String(hours).padStart(2, "0") + ":" : "";
  const formattedMinutes = String(minutes).padStart(2, "0");
  const formattedSeconds = String(remainingSeconds).padStart(2, "0");

  return `${formattedDays}${formattedHours}${formattedMinutes}:${formattedSeconds}`;
}

async function updateStats(tabs) {
  document.getElementById("stat_tabs").innerText = tabs.length;
  document.getElementById("stat_duration").innerText = getDuration(
    tabs.reduce((acc, tab) => {
      return (
        acc +
        (settings.sort_sponsorblock
          ? (tab?.skipped ?? tab.duration)
          : tab.duration)
      );
    }, 0),
  );
  document.getElementById("stat_views").innerText = getViews(
    tabs.reduce((acc, tab) => {
      return acc + tab.views;
    }, 0),
  );
}

/** renders the list of detected tabs. */
async function renderList() {
  const tabList = document.getElementById("video-list");
  tabList.innerHTML = "";

  const tabs = await prefilterTabs();
  updateStats(tabs);

  for (const tab of tabs) {
    const el = document.createElement("button");
    el.onclick = () => {
      browser.tabs.update(tab.id, { active: true });
    };
    el.id = tab.youtubeID;
    el.classList.add("item");

    const titleElement = document.createElement("p");
    titleElement.className = "title";
    titleElement.textContent = tab.title;
    el.appendChild(titleElement);

    const smallElement = document.createElement("small");
    const properties = [
      { prop: "live", textFunc: () => "Live", className: "badge" },
      { prop: "playlist", textFunc: () => "Playlist", className: "badge" },
      {
        prop: "duration",
        textFunc: (duration) =>
          tab.live > 0
            ? `Live in ${getPremiereTime(tab.live)}`
            : getDuration(duration),
      },
      {
        prop: "uploadDate",
        textFunc: (date) => new Date(date).toLocaleDateString(),
      },
      { prop: "views", textFunc: (views) => `${getViews(views)} Views` },
      { prop: "author" },
    ];
    properties.forEach(({ prop, textFunc, className }) => {
      if (tab[prop] || prop === "duration") {
        const spanElement = document.createElement("span");
        if (className) spanElement.className = className;
        if (settings.sort_sponsorblock && prop === "duration") {
          spanElement.textContent = textFunc(tab["skipped"] ?? tab["duration"]);
        } else {
          spanElement.textContent = textFunc ? textFunc(tab[prop]) : tab[prop];
        }
        smallElement.appendChild(spanElement);
      }
    });
    el.appendChild(smallElement);
    tabList.appendChild(el);
  }
}

/** hard reset in storage if needed. */
async function deleteStorage() {
  await browser.storage.local.clear();
}

/** changes the active menu in the settings and saves it */
async function setActiveMenu(menu) {
  settings.menu = menu;
  renderMenu();
  await updateSettings();
}

/** hides the list menu and shows the settings menu. */
function showSettings() {
  document.getElementById("tab-list").classList.add("hidden");
  document.getElementById("tab-settings").classList.remove("hidden");
  document.getElementById("tab-button-list").classList.remove("active");
  document.getElementById("tab-button-settings").classList.add("active");
}

/** hides the settings menu and shows the list menu. */
function showList() {
  document.getElementById("tab-settings").classList.add("hidden");
  document.getElementById("tab-list").classList.remove("hidden");
  document.getElementById("tab-button-settings").classList.remove("active");
  document.getElementById("tab-button-list").classList.add("active");
  renderList();
}

/** shows the correct menu, depending on the settings. */
function renderMenu() {
  if (settings.menu === 1) {
    showList();
  } else {
    showSettings();
  }
}

/** renders the sort options incl the buttons and dropdowns */
function renderSortOptions() {
  const container = document.getElementById("sortable-list");
  container.innerHTML = "";

  for (const sortRule of settings.sorting) {
    const dropdown = document.createElement("select");
    dropdown.addEventListener("click", (e) =>
      changeSortOrder(sortRule.attr, undefined, e),
    );

    const option1 = document.createElement("option");
    option1.value = "false";
    if (sortRule.asc !== true) {
      option1.selected = true;
    }
    option1.textContent = sortRule.dropdown[0];

    const option2 = document.createElement("option");
    option2.value = "true";
    if (sortRule.asc === true) {
      option2.selected = true;
    }
    option2.textContent = sortRule.dropdown[1];

    dropdown.appendChild(option1);
    dropdown.appendChild(option2);

    const buttonUp = document.createElement("button");
    buttonUp.classList.add("up");
    buttonUp.addEventListener("click", () =>
      changeSortOrder(sortRule.attr, false),
    );
    buttonUp.innerHTML =
      '<svg height="24" viewBox="0 0 24 24" width="24" transform="scale(1, -1)"><path d="m18 9.28-6.35 6.35-6.37-6.35.72-.71 5.64 5.65 5.65-5.65z"></path></svg>';

    const buttonDown = document.createElement("button");
    buttonDown.classList.add("down");
    buttonDown.addEventListener("click", () =>
      changeSortOrder(sortRule.attr, true),
    );
    buttonDown.innerHTML =
      '<svg height="24" viewBox="0 0 24 24" width="24"><path d="m18 9.28-6.35 6.35-6.37-6.35.72-.71 5.64 5.65 5.65-5.65z"></path></svg>';

    const buttons = document.createElement("div");
    buttons.classList.add("buttons");
    buttons.appendChild(dropdown);
    buttons.appendChild(buttonUp);
    buttons.appendChild(buttonDown);

    const el = document.createElement("li");
    el.id = sortRule.attr;
    el.classList.add("item");
    const spanElement = document.createElement("span");
    spanElement.className = "title";
    spanElement.textContent = sortRule.title;
    el.appendChild(spanElement);

    el.appendChild(buttons);
    container.appendChild(el);
  }
}

async function changeSortOrder(attr, down, e) {
  const index = settings.sorting.findIndex((item) => item.attr === attr);
  if (down === true)
    [settings.sorting[index], settings.sorting[index + 1]] = [
      settings.sorting[index + 1],
      settings.sorting[index],
    ];
  else if (down === false)
    [settings.sorting[index], settings.sorting[index - 1]] = [
      settings.sorting[index - 1],
      settings.sorting[index],
    ];
  if (e !== undefined) settings.sorting[index].asc = JSON.parse(e.target.value);
  renderSortOptions();
  await updateSettings();
}

async function renderSettings() {
  document.getElementById("ignore-inactive").checked = settings.ignore_inactive;
  document.getElementById("ignore-live").checked = settings.ignore_live;
  document.getElementById("ignore-playlists").checked =
    settings.ignore_playlists;
  document.getElementById("sort-sponsorblock").checked =
    settings.sort_sponsorblock;
  document.getElementById("force-reload").checked = settings.force_reload;
  const tabs = await prefilterTabs();
  if (tabs.some((tab) => tab.skipped)) {
    document.getElementById("sort-sponsorblock").parentNode.style.display =
      "intial";
  } else {
    document.getElementById("sort-sponsorblock").parentNode.style.display =
      "none";
  }
}

async function changeSetting(setting, e) {
  settings[setting] = e.target.checked === true ? true : false;
  renderSettings();
  await updateSettings();
}

async function closeTip(e) {
  settings.show_tip = false;
  document.getElementById("tips").classList.add("hidden");
  renderSettings();
  await updateSettings();
}

async function init() {
  await getSettings();

  // show the correct menu tab
  document
    .getElementById("tab-button-settings")
    .addEventListener("click", () => setActiveMenu(0));
  document
    .getElementById("tab-button-list")
    .addEventListener("click", () => setActiveMenu(1));
  renderMenu();

  // hide tips
  if (settings.show_tip !== true)
    document.getElementById("tips").classList.add("hidden");

  // update version
  document.getElementById("version-number").innerText =
    browser.runtime.getManifest().version || "Unknown";

  // render sort options and other settings
  renderSortOptions();
  await renderSettings();

  // set events
  document
    .getElementById("close-button")
    .addEventListener("click", (e) => closeTip(e));

  document
    .getElementById("ignore-inactive")
    .addEventListener("click", (e) => changeSetting("ignore_inactive", e));
  document
    .getElementById("ignore-live")
    .addEventListener("click", (e) => changeSetting("ignore_live", e));
  document
    .getElementById("ignore-playlists")
    .addEventListener("click", (e) => changeSetting("ignore_playlists", e));
  document
    .getElementById("sort-sponsorblock")
    .addEventListener("click", (e) => changeSetting("sort_sponsorblock", e));
  document
    .getElementById("force-reload")
    .addEventListener("click", (e) => changeSetting("force_reload", e));

  document
    .getElementById("delete-storage")
    .addEventListener("click", deleteStorage);
  document
    .getElementById("tab-button-sort")
    .addEventListener("click", sortTabs);
}

document.addEventListener("DOMContentLoaded", init);
