// @ts-check
export const settings = {
  tip_index: 0,
  ignore_inactive: false,
  ignore_playlists: false,
  ignore_live: false,
  ignore_shorts: false,
  sort_sponsorblock: false,
  sort_to_start: false,
  current_window_only: false,
  auto_sort: false,
  force_reload: false,
  unload_after_reload: false,
  sorting: [
    { dropdown: ["A-Z", "Z-A"], asc: false, attr: "author", title: "Channel Name" },
    {
      dropdown: ["Oldest first", "Newest first"],
      asc: false,
      attr: "uploadDate",
      title: "Upload Date",
    },
    {
      dropdown: ["Shortest first", "Longest first"],
      asc: false,
      attr: "liveDuration",
      title: "Video Duration",
    },
    { dropdown: ["A-Z", "Z-A"], asc: false, attr: "title", title: "Video Title" },
    { dropdown: ["Least first", "Most first"], asc: false, attr: "views", title: "Views" },
  ],
  menu: 0,
};

export async function updateSettings() {
  await browser.storage.sync.set({ settings });
}

export async function getSettings() {
  const { settings: loadedSettings } = await browser.storage.sync.get("settings");
  if (loadedSettings) Object.assign(settings, loadedSettings);
}
