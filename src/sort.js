import { settings, updateSettings } from "./settings.js";
import { prefilterTabs } from "./tabs.js";
import { renderList } from "./list.js";

/** sorts tabs based on settings. */
export async function sortTabs() {
  const sortBtn = document.getElementById("tab-button-sort");
  sortBtn.classList.add("loading");
  document.getElementById("alert-error").innerText = "";
  let success = false;

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

    const windowGroups = new Map();
    for (const tab of sortedTabs) {
      if (!windowGroups.has(tab.windowId)) windowGroups.set(tab.windowId, []);
      windowGroups.get(tab.windowId).push(tab);
    }
    for (const [windowId, windowTabs] of windowGroups) {
      if (settings.sort_to_start) {
        const pinnedTabs = await browser.tabs.query({ windowId, pinned: true });
        const startIndex = pinnedTabs.length;
        for (const tab of [...windowTabs].reverse()) {
          await browser.tabs.move(tab.id, { index: startIndex });
        }
      } else {
        for (const tab of windowTabs) {
          await browser.tabs.move(tab.id, { index: -1 });
        }
      }
    }
    renderList();

    // wake them up, if wanted
    if (settings.ignore_inactive !== true) {
      sortedTabs.forEach((tab) => {
        if (tab.sleepy) browser.tabs.reload(tab.id);
      });
    }
    success = true;
  } catch (error) {
    console.debug("[YouTube Sort]", error);
    document.getElementById("alert-error").innerText = "Error: " + (error?.message || error);
  } finally {
    sortBtn.classList.remove("loading");
    if (success) {
      sortBtn.classList.add("done");
      setTimeout(() => sortBtn.classList.remove("done"), 1000);
    }
  }
}

export async function toggleSortAsc(attr) {
  const index = settings.sorting.findIndex((item) => item.attr === attr);
  settings.sorting[index].asc = !settings.sorting[index].asc;
  renderSortOptions();
  await updateSettings();
}

/** renders the sort options incl the dropdown and drag handles */
export function renderSortOptions() {
  const container = document.getElementById("sortable-list");
  container.innerHTML = "";
  let dragSrcIndex = null;
  const clearDragOver = () => container.querySelectorAll("li").forEach((li) => li.classList.remove("drag-over"));

  settings.sorting.forEach((sortRule, index) => {
    const toggleBtn = document.createElement("button");
    toggleBtn.className = "toggle-asc";
    const label = sortRule.asc === true ? sortRule.dropdown[1] : sortRule.dropdown[0];
    toggleBtn.textContent = label;
    toggleBtn.setAttribute("aria-label", `${sortRule.title} sort direction: ${label}`);
    toggleBtn.addEventListener("click", () => toggleSortAsc(sortRule.attr));

    const handle = document.createElement("span");
    handle.className = "drag-handle";
    handle.setAttribute("aria-hidden", "true");
    handle.innerHTML = `<svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <circle cx="2" cy="3" r="1.5"/><circle cx="8" cy="3" r="1.5"/>
      <circle cx="2" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/>
      <circle cx="2" cy="13" r="1.5"/><circle cx="8" cy="13" r="1.5"/>
    </svg>`;

    const buttons = document.createElement("div");
    buttons.classList.add("buttons");
    buttons.appendChild(toggleBtn);

    const el = document.createElement("li");
    el.id = sortRule.attr;
    el.classList.add("item");
    el.draggable = true;
    el.tabIndex = 0;
    el.setAttribute("aria-label", `${sortRule.title}, position ${index + 1} of ${settings.sorting.length}. Use Arrow Up and Arrow Down to reorder.`);

    const spanElement = document.createElement("span");
    spanElement.className = "title";
    spanElement.textContent = sortRule.title;

    el.appendChild(handle);
    el.appendChild(spanElement);
    el.appendChild(buttons);
    container.appendChild(el);

    el.addEventListener("keydown", async (e) => {
      if (e.key === "ArrowUp" && index > 0) {
        e.preventDefault();
        const [moved] = settings.sorting.splice(index, 1);
        settings.sorting.splice(index - 1, 0, moved);
        renderSortOptions();
        await updateSettings();
        container.children[index - 1].focus();
      } else if (e.key === "ArrowDown" && index < settings.sorting.length - 1) {
        e.preventDefault();
        const [moved] = settings.sorting.splice(index, 1);
        settings.sorting.splice(index + 1, 0, moved);
        renderSortOptions();
        await updateSettings();
        container.children[index + 1].focus();
      }
    });

    el.addEventListener("dragstart", (e) => {
      dragSrcIndex = index;
      e.dataTransfer.effectAllowed = "move";
      setTimeout(() => el.classList.add("dragging"), 0);
    });
    el.addEventListener("dragend", () => {
      el.classList.remove("dragging");
      clearDragOver();
    });
    el.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      clearDragOver();
      el.classList.add("drag-over");
    });
    el.addEventListener("drop", async (e) => {
      e.preventDefault();
      if (dragSrcIndex !== null && dragSrcIndex !== index) {
        const [moved] = settings.sorting.splice(dragSrcIndex, 1);
        settings.sorting.splice(index, 0, moved);
        renderSortOptions();
        await updateSettings();
      }
    });
  });
}
