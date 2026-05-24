// @ts-check

import { settings, getSettings } from "./settings.js";
import { prefilterTabs } from "./tabs.js";
import { extractYouTubeID, createTabSorter, moveTabsByWindow } from "./types.js";

// ─── Logging ──────────────────────────────────────────────────────────────────

const logEl = /** @type {HTMLPreElement} */ (document.getElementById("log"));

/** @param {string} text @param {'info'|'pass'|'fail'|'warn'|'section'|'dim'} [level] */
function log(text, level = "info") {
  const line = document.createElement("span");
  line.className = `l-${level}`;
  const ts = new Date().toLocaleTimeString("en", { hour12: false });
  line.textContent = (level === "section" ? `\n${ts}  ` : `${ts}  `) + text + "\n";
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

function clearLog() {
  logEl.innerHTML = "";
}

// ─── Snapshot ─────────────────────────────────────────────────────────────────

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
async function snapshot() {
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
function fmtTab(t) {
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

async function doSnapshot() {
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

// ─── Save / Restore ───────────────────────────────────────────────────────────

/** @type {Array<{id: number, index: number, windowId: number, groupId: number}> | null} */
let savedOrder = null;

async function doSave() {
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

async function doRestore() {
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

// ─── Shuffle ──────────────────────────────────────────────────────────────────

async function doShuffle() {
  log("── SHUFFLE ───────────────────────────────────────────────────────", "section");
  const windowIds = [...new Set((await browser.tabs.query({})).map((t) => t.windowId ?? 0))];

  for (const windowId of windowIds) {
    const all = await browser.tabs.query({ windowId, pinned: false });
    const visible = all.filter((t) => !(/** @type {any} */ (t).hidden));
    if (visible.length < 2) continue;

    const minIndex = visible.reduce((m, t) => Math.min(m, t.index), Infinity);
    const shuffled = [...visible].sort(() => Math.random() - 0.5);
    log(`Window ${windowId}: shuffling ${visible.length} tabs...`, "info");
    for (const tab of [...shuffled].reverse()) {
      await browser.tabs.move(/** @type {number} */ (tab.id), { index: minIndex });
    }
  }
  log("Shuffle done — tab groups may have changed due to Firefox positional absorption.", "info");
  await doSnapshot();
}

// ─── Sort ─────────────────────────────────────────────────────────────────────

/** @param {number} [times] */
async function doSort(times = 1) {
  log(`── SORT ×${times} ────────────────────────────────────────────────────────`, "section");
  await getSettings();

  const preSnap = await snapshot();

  /** @type {string[][]} */
  const fingerprints = [];

  for (let i = 0; i < times; i++) {
    const tabs = await prefilterTabs();
    if (tabs.length === 0) {
      log("No filterable YouTube tabs found.", "warn");
      return;
    }
    const sorted = [...tabs].sort(createTabSorter(settings.sorting));
    await moveTabsByWindow(sorted, settings.sort_to_start);

    const after = await prefilterTabs();
    const fp = after
      .slice()
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .map((t) => String(t.id));
    fingerprints.push(fp);

    const preview = after
      .slice()
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .map((t) => (t.title ?? "?").substring(0, 25))
      .join(" → ");
    log(`  Sort ${i + 1}: ${preview}`, "info");
  }

  if (times > 1) {
    let stable = true;
    for (let i = 1; i < fingerprints.length; i++) {
      if (fingerprints[i].join(",") !== fingerprints[i - 1].join(",")) {
        log(`FLIP-FLOP between sort ${i} and sort ${i + 1}!`, "fail");
        stable = false;
      }
    }
    if (stable) log(`Stable — all ${times} sorts produced identical order.`, "pass");
  }

  const postSnap = await snapshot();
  let membershipOk = true;
  for (const pre of preSnap) {
    const post = postSnap.find((t) => t.id === pre.id);
    if (!post) continue; // tab closed during test, ignore
    if (post.groupId !== pre.groupId) {
      const name = (pre.title ?? pre.url ?? "?").substring(0, 40);
      const from = pre.groupId === -1 ? "ungrouped" : `group ${pre.groupId}`;
      const to = post.groupId === -1 ? "ungrouped" : `group ${post.groupId}`;
      log(`  FAIL group change: "${name}"  ${from} → ${to}`, "fail");
      membershipOk = false;
    }
  }
  if (membershipOk) {
    log("Group membership preserved after sort.", "pass");
  } else {
    log("Sort changed tab group memberships — see FAIL lines above.", "fail");
  }
}

// ─── Verify ───────────────────────────────────────────────────────────────────

async function doVerify() {
  log("── VERIFY ────────────────────────────────────────────────────────", "section");
  await getSettings();

  const tabs = await prefilterTabs();
  if (tabs.length === 0) {
    log("No filterable YouTube tabs found.", "warn");
    return;
  }

  const sorter = createTabSorter(settings.sorting);

  /** @type {Map<string, typeof tabs>} */
  const partitions = new Map();
  for (const tab of tabs) {
    const key = `w${tab.windowId}:g${/** @type {any} */ (tab).groupId ?? -1}`;
    if (!partitions.has(key)) partitions.set(key, []);
    partitions.get(key)?.push(tab);
  }

  let allPassed = true;
  for (const [key, group] of partitions) {
    const isGrouped = !key.endsWith(":g-1");
    const label = isGrouped ? key : `window ${key.split(":")[0].slice(1)} (ungrouped)`;

    // Actual position order
    const byPos = [...group].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    // Expected sort order
    const expected = [...group].sort(sorter);

    let ok = true;
    for (let i = 0; i < byPos.length; i++) {
      if (byPos[i].id !== expected[i].id) {
        const got = (byPos[i].title ?? "?").substring(0, 40);
        const exp = (expected[i].title ?? "?").substring(0, 40);
        log(`  FAIL [${label}] slot ${i}: got "${got}"  expected "${exp}"`, "fail");
        ok = false;
        allPassed = false;
      }
    }
    if (ok) {
      log(`  PASS [${label}]: ${group.length} tab(s) in correct order.`, "pass");
    }
  }

  if (allPassed) {
    log("All partitions verified correctly.", "pass");
  } else {
    log("Verification failed — see FAIL lines above.", "fail");
  }
}

async function doUnload() {
  log("── UNLOAD YouTube tabs ───────────────────────────────────────────", "section");
  const tabs = await prefilterTabs();
  let count = 0;
  for (const tab of tabs) {
    if (tab.id !== undefined && !tab.discarded) {
      await browser.tabs.discard(tab.id);
      count++;
    }
  }
  log(`Discarded ${count} tab(s).`, "info");
}

// ─── Wiring ───────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  /** @param {string} id @param {() => any} fn */
  const on = (id, fn) =>
    document.getElementById(id)?.addEventListener("click", async () => {
      try {
        await fn();
      } catch (e) {
        log(`Error: ${e instanceof Error ? e.message : String(e)}`, "fail");
      }
    });

  on("btn-snapshot", doSnapshot);
  on("btn-save", doSave);
  on("btn-restore", doRestore);
  on("btn-shuffle", doShuffle);
  on("btn-sort-1", () => doSort(1));
  on("btn-sort-5", () => doSort(5));
  on("btn-verify", doVerify);
  on("btn-unload", doUnload);
  on("btn-clear", () => {
    clearLog();
    return Promise.resolve();
  });
});
