// @ts-check

import { log } from "./test-log.js";
import { extractYouTubeID } from "./types.js";

/**
 * @typedef {{
 *   id: number, index: number, windowId: number,
 *   title: string | undefined, url: string | undefined,
 *   pinned: boolean, discarded: boolean, hidden: boolean,
 *   groupId: number, groupTitle: string | null, groupColor: string | null,
 *   youtubeID: string | null, yt: Record<string, any> | null
 * }} TabSnap
 */

/** @returns {Promise<TabSnap[]>} */
export async function snapshot() {
  const allTabs = await browser.tabs.query({});
  const videoData = /** @type {Record<string, any>} */ (await browser.storage.local.get());

  return Promise.all(
    allTabs.map(async (tab) => {
      const gid = /** @type {any} */ (tab).groupId ?? -1;
      let groupTitle = null;
      let groupColor = null;
      if (gid !== -1) {
        try {
          const group = await /** @type {any} */ (browser).tabGroups?.get(gid);
          groupTitle = group?.title ?? null;
          groupColor = group?.color ?? null;
        } catch {}
      }
      const youtubeID = extractYouTubeID(tab.url ?? "");
      return {
        id: /** @type {number} */ (tab.id),
        index: tab.index,
        windowId: tab.windowId ?? 0,
        title: tab.title,
        url: tab.url,
        pinned: tab.pinned ?? false,
        discarded: tab.discarded ?? false,
        hidden: /** @type {any} */ (tab).hidden ?? false,
        groupId: gid,
        groupTitle,
        groupColor,
        youtubeID: youtubeID || null,
        yt: youtubeID ? (videoData[youtubeID] ?? null) : null,
      };
    })
  );
}

/** @param {TabSnap} t */
export function fmtTab(t) {
  const group =
    t.groupId !== -1
      ? ` [grp:${t.groupId}${t.groupTitle ? ` "${t.groupTitle}"` : ""}${t.groupColor ? `/${t.groupColor}` : ""}]`
      : "";
  const flags = [t.pinned && "pin", t.discarded && "unloaded", t.hidden && "hidden"]
    .filter(Boolean)
    .join(" ");
  const yt = t.yt
    ? ` | ${t.yt.author ?? "?"} | ${t.yt.uploadDate ?? "?"} | ${t.yt.duration != null ? t.yt.duration + "s" : "?"}${t.yt.live ? " LIVE" : ""}${t.yt.playlist ? " PL" : ""}`
    : "";
  const title = (t.title ?? t.url ?? "—").substring(0, 60);
  return `  [${String(t.index).padStart(3)}]${group} ${title}${yt}${flags ? "  (" + flags + ")" : ""}`;
}

export async function doSnapshot() {
  log("── SNAPSHOT ──────────────────────────────────────────────────────", "section");
  const tabs = await snapshot();
  const rawGroupIds = [...new Set(tabs.map((t) => t.groupId))].sort((a, b) => a - b);
  log(
    `Raw groupId values seen: [${rawGroupIds.join(", ")}]  (−1 = ungrouped; other = group id; all −1 = tabGroups permission missing)`,
    "dim"
  );
  const byWindow = new Map();
  for (const t of tabs) {
    if (!byWindow.has(t.windowId)) byWindow.set(t.windowId, []);
    byWindow.get(t.windowId).push(t);
  }
  for (const [wid, wTabs] of byWindow) {
    const sorted = /** @type {TabSnap[]} */ ([...wTabs]).sort((a, b) => a.index - b.index);
    log(
      `Window ${wid}  (${sorted.length} tabs, ${sorted.filter((t) => t.youtubeID).length} YouTube):`,
      "info"
    );
    for (const t of sorted) {
      log(fmtTab(t), t.youtubeID ? "info" : "dim");
    }
  }
}

/** @type {Array<{id: number, index: number, windowId: number, groupId: number}> | null} */
let savedOrder = null;

export async function doSave() {
  const tabs = await browser.tabs.query({});
  savedOrder = tabs.map((t) => ({
    id: /** @type {number} */ (t.id),
    index: t.index,
    windowId: t.windowId ?? 0,
    groupId: /** @type {any} */ (t).groupId ?? -1,
  }));
  const grouped = savedOrder.filter((e) => e.groupId !== -1).length;
  log(`Saved: ${savedOrder.length} tabs (${grouped} in groups).`, "info");
}

export async function doRestore() {
  if (!savedOrder) {
    log("Nothing saved — run 'Save order' first.", "warn");
    return;
  }
  log("── RESTORE ───────────────────────────────────────────────────────", "section");

  const byWindow = new Map();
  for (const e of savedOrder) {
    if (!byWindow.has(e.windowId)) byWindow.set(e.windowId, []);
    byWindow.get(e.windowId).push(e);
  }
  for (const [, entries] of byWindow) {
    for (const e of [...entries].sort((a, b) => a.index - b.index)) {
      try {
        await browser.tabs.move(e.id, { index: e.index });
      } catch {}
    }
  }

  try {
    const allIds = savedOrder.map((e) => e.id);
    await /** @type {any} */ (browser).tabs.ungroup(allIds);

    /** @type {Map<number, number[]>} */
    const byGroup = new Map();
    for (const e of savedOrder) {
      if (e.groupId !== -1) {
        if (!byGroup.has(e.groupId)) byGroup.set(e.groupId, []);
        byGroup.get(e.groupId)?.push(e.id);
      }
    }
    for (const [, tabIds] of byGroup) {
      await /** @type {any} */ (browser).tabs.group({ tabIds });
    }
    log(`Groups restored: ${byGroup.size} group(s).`, "pass");
  } catch (e) {
    log(`Could not restore groups: ${e instanceof Error ? e.message : String(e)}`, "warn");
  }

  log("Restored.", "pass");
}
