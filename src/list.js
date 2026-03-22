import { settings } from "./settings.js";
import { prefilterTabs } from "./tabs.js";

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
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  const formattedDays = days ? String(days).padStart(2, "0") + ":" : "";
  const formattedHours = hours ? String(hours).padStart(2, "0") + ":" : "";
  const formattedMinutes = String(minutes).padStart(2, "0");
  const formattedSeconds = String(remainingSeconds).padStart(2, "0");

  return `${formattedDays}${formattedHours}${formattedMinutes}:${formattedSeconds}`;
}

function updateStats(tabs, isSelection) {
  let totalDuration = 0;
  let totalViews = 0;
  for (const tab of tabs) {
    totalDuration += settings.sort_sponsorblock
      ? (tab?.skipped ?? (Number.isFinite(tab.duration) ? tab.duration : 0))
      : (Number.isFinite(tab.duration) ? tab.duration : 0);
    totalViews += Number.isFinite(tab.views) ? tab.views : 0;
  }
  document.getElementById("stat_tabs").innerText = tabs.length;
  document.getElementById("stat_tabs_label").innerText = isSelection ? "selected" : "videos";
  document.getElementById("stat_duration").innerText = getDuration(totalDuration);
  document.getElementById("stat_views").innerText = getViews(totalViews);
}

/** renders the list of detected tabs. */
export async function renderList() {
  const tabList = document.getElementById("video-list");
  tabList.innerHTML = '<div class="spinner" role="status" aria-label="Loading"></div>';

  const tabs = await prefilterTabs();
  tabList.innerHTML = "";
  const isSelection = tabs.length > 1 && tabs.every((t) => t.selected);
  updateStats(tabs, isSelection);

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
      if (prop === "duration" ? Number.isFinite(tab[prop]) : tab[prop]) {
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
    if (smallElement.childElementCount === 0) el.classList.add("no-data");
    el.appendChild(smallElement);
    tabList.appendChild(el);
  }
}

/** hard reset in storage if needed. */
export async function deleteStorage() {
  await browser.storage.local.clear();
}
