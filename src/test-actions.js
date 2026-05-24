// @ts-check

import { log } from "./test-log.js";
import { snapshot, doSnapshot } from "./test-snapshot.js";
import { settings, getSettings } from "./settings.js";
import { prefilterTabs } from "./tabs.js";
import { createTabSorter, moveTabsByWindow } from "./types.js";

export async function doShuffle() {
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

/** @param {number} [times] */
export async function doSort(times = 1) {
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
    if (!post) continue;
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

export async function doVerify() {
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

    const byPos = [...group].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
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

export async function doUnload() {
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
