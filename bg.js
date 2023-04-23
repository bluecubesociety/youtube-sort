browser.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  console.log("tab removed", tabId)
});