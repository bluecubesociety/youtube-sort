// @ts-check

import { log } from "./test-log.js";
import { doSave, doRestore } from "./test-snapshot.js";
import { settings, getSettings, updateSettings } from "./settings.js";
import { prefilterTabs } from "./tabs.js";
import { extractYouTubeID, createTabSorter, moveTabsByWindow } from "./types.js";

/** @type {{ id: string, hint: string, url?: string }[]} */
const TEST_VIDEOS = [
  { id: "yoXFk-0NrDI", hint: "Skyrim Announcement, 2011, 1:36" },
  { id: "jNQXAC9IVRw", hint: "Me at the zoo, 2005, 0:19" },
  { id: "YE7VzlLtp-4", hint: "Big Buck Bunny, 2008, 9:56" },
  { id: "dQw4w9WgXcQ", hint: "Never Gonna Give You Up — Rick Astley, 2009, 3:33" },
  { id: "J---aiyznGQ", hint: "Keyboard Cat, 2007, 0:54" },
  {
    id: "f9D8gHY2OPE",
    hint: "Nine Inch Nails — Init (playlist), 2025, 2:09",
    url: "https://www.youtube.com/watch?v=f9D8gHY2OPE&list=PLGaDDrFa8nmD8PzaEv_CTlSdwW_yTPNGJ",
  },
];

const NON_YT_URLS = [
  "https://en.wikipedia.org/wiki/Main_Page",
  "https://godotengine.org/",
  "https://www.blender.org/",
  "https://nixos.org/",
  "https://github.com/",
  "https://bluecubesociety.com/",
];
const SHORT_TEST_ID = "-hzue8KIS9M"; // Vsauce, Thermite Balls

const SORT_VARIANTS = [
  { attr: "author", asc: false, label: "author A→Z" },
  { attr: "author", asc: true, label: "author Z→A" },
  { attr: "uploadDate", asc: false, label: "uploadDate oldest first" },
  { attr: "uploadDate", asc: true, label: "uploadDate newest first" },
  { attr: "liveDuration", asc: false, label: "duration shortest first" },
  { attr: "liveDuration", asc: true, label: "duration longest first" },
  { attr: "views", asc: false, label: "views fewest first" },
  { attr: "views", asc: true, label: "views most first" },
  { attr: "title", asc: false, label: "title A→Z" },
  { attr: "title", asc: true, label: "title Z→A" },
];

async function findTestTab(videoId) {
  const all = await browser.tabs.query({});
  return (
    all.find(
      (t) =>
        !t.pinned &&
        !(/** @type {any} */ (t).hidden) &&
        (t.url?.includes(`v=${videoId}`) || t.url?.includes(`/shorts/${videoId}`))
    ) ?? null
  );
}

async function waitForData(ids, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const data = /** @type {Record<string,any>} */ (await browser.storage.local.get(ids));
    if (
      ids.every(
        (id) => data[id] && (data[id].title || data[id].author || data[id].duration != null)
      )
    ) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function verifySortOrder(label, testTabIds) {
  const allTabs = await browser.tabs.query({});
  const testTabs = allTabs
    .filter((t) => t.id != null && testTabIds.includes(/** @type {number} */ (t.id)))
    .sort((a, b) => a.index - b.index);

  const stored = /** @type {Record<string,any>} */ (await browser.storage.local.get(null));

  const merged = testTabs.map((t) => {
    const vid = extractYouTubeID(t.url ?? "") || null;
    const s = vid ? (stored[vid] ?? {}) : {};
    return {
      ...t,
      ...s,
      youtubeID: vid,
      liveDuration: s.live ?? s.skipped ?? s.duration,
      tabTitle: t.title,
    };
  });

  /** @type {Map<string, typeof merged>} */
  const partitions = new Map();
  for (const tab of merged) {
    const key = `${tab.windowId}:${/** @type {any} */ (tab).groupId ?? -1}`;
    if (!partitions.has(key)) partitions.set(key, []);
    partitions.get(key)?.push(tab);
  }

  const sorter = createTabSorter(settings.sorting);
  let ok = true;
  for (const [, group] of partitions) {
    const byPos = [...group].sort((a, b) => a.index - b.index);
    const expected = [...group].sort(sorter);
    for (let i = 0; i < byPos.length; i++) {
      if (byPos[i].id !== expected[i].id) {
        const got = (byPos[i].title ?? "?").slice(0, 35);
        const exp = (expected[i].title ?? "?").slice(0, 35);
        log(`  FAIL [${label}] pos ${i}: got "${got}"  expected "${exp}"`, "fail");
        ok = false;
      }
    }
  }
  if (ok) log(`  PASS [${label}]`, "pass");
  return ok;
}

export async function doGroupedSortTest() {
  log("── GROUPED TABS SORT TEST ────────────────────────────────────────", "section");

  await doSave();
  await getSettings();
  const savedSettings = JSON.parse(JSON.stringify(settings));

  settings.current_window_only = false;
  settings.ignore_inactive = false;
  settings.ignore_live = false;
  settings.ignore_shorts = false;
  settings.ignore_playlists = false;
  settings.group_filter = "all";
  settings.sort_to_start = false;

  const allTabs = await prefilterTabs();
  if (allTabs.length < 2) {
    log("Need at least 2 YouTube tabs open to run this test.", "fail");
    Object.assign(settings, savedSettings);
    return;
  }

  const testTabIds = /** @type {number[]} */ (allTabs.map((t) => t.id).filter((id) => id != null));
  log(`Running with ${testTabIds.length} YouTube tab(s).`, "info");

  const rawTabs = await browser.tabs.query({});
  const ungroupedTestTabIds = testTabIds.filter((id) => {
    const raw = rawTabs.find((t) => t.id === id);
    return /** @type {any} */ ((raw)?.groupId ?? -1) === -1;
  });

  let passed = 0;
  let failed = 0;

  log("\nSort within a single group:", "info");
  /** @type {number[]} */
  let singleGroupIds = [];
  try {
    if (ungroupedTestTabIds.length < 2) {
      log(
        `  SKIP: only ${ungroupedTestTabIds.length} ungrouped test tab(s) — need at least 2`,
        "warn"
      );
    } else {
      await /** @type {any} */ (browser).tabs.group({ tabIds: ungroupedTestTabIds });
      singleGroupIds = [...ungroupedTestTabIds];
      log(`  Grouped ${ungroupedTestTabIds.length} ungrouped test tab(s)`, "dim");

      for (const v of SORT_VARIANTS.slice(0, 4)) {
        settings.sorting = [{ attr: v.attr, asc: v.asc, dropdown: [], title: v.label }];
        const tabs = await prefilterTabs();
        const sorted = [...tabs].sort(createTabSorter(settings.sorting));
        await moveTabsByWindow(sorted, settings.sort_to_start);
        if (await verifySortOrder(v.label, ungroupedTestTabIds)) passed++;
        else failed++;
      }

      const afterSort = await browser.tabs.query({});
      const testTabsAfter = afterSort.filter(
        (t) => t.id != null && ungroupedTestTabIds.includes(/** @type {number} */ (t.id))
      );
      const allStillGrouped = testTabsAfter.every(
        (t) => /** @type {any} */ ((t).groupId ?? -1) !== -1
      );
      if (allStillGrouped) {
        log("  PASS: group membership preserved after all sorts", "pass");
        passed++;
      } else {
        const lost = testTabsAfter.filter(
          (t) => /** @type {any} */ ((t).groupId ?? -1) === -1
        ).length;
        log(
          `  FAIL: ${lost}/${ungroupedTestTabIds.length} tab(s) lost group membership during sort`,
          "fail"
        );
        failed++;
      }
    }
  } catch (e) {
    log(
      `  SKIP: ${e instanceof Error ? e.message : String(e)} (tabGroups permission needed)`,
      "warn"
    );
  } finally {
    if (singleGroupIds.length > 0) {
      try {
        await /** @type {any} */ (browser).tabs.ungroup(singleGroupIds);
      } catch { /* tabGroups not available */ }
    }
  }

  log("\nAuto-sort trigger with grouped tabs:", "info");
  const idsToGroup = ungroupedTestTabIds.slice(0, 2);
  /** @type {number | null} */
  let triggerTabId = null;
  /** @type {number[]} */
  let autoSortGroupIds = [];
  try {
    if (idsToGroup.length === 0) {
      log("  SKIP: no ungrouped test tabs available to group for this test", "warn");
    } else {
      await /** @type {any} */ (browser).tabs.group({ tabIds: idsToGroup });
      autoSortGroupIds = [...idsToGroup];
      log(`  Grouped ${idsToGroup.length} ungrouped tab(s) before triggering auto-sort`, "dim");

      const prevAutoSort = settings.auto_sort;
      settings.auto_sort = true;
      await updateSettings();

      const triggerVideo = TEST_VIDEOS[1]; // Me at the zoo
      const prevData = /** @type {Record<string, any>} */ (
        await browser.storage.local.get(triggerVideo.id)
      );
      await browser.storage.local.remove(triggerVideo.id);

      try {
        const newTab = await browser.tabs.create({
          url: `https://www.youtube.com/watch?v=${triggerVideo.id}`,
          active: false,
        });
        triggerTabId = newTab.id ?? null;
        log(`  Opened trigger tab (${triggerVideo.hint}), waiting 3 s for auto-sort…`, "dim");
        await new Promise((r) => setTimeout(r, 3000));

        const afterAutoSort = await browser.tabs.query({});
        const stillGrouped = afterAutoSort
          .filter((t) => t.id != null && idsToGroup.includes(/** @type {number} */ (t.id)))
          .every((t) => /** @type {any} */ ((t).groupId ?? -1) !== -1);

        if (stillGrouped) {
          log("  PASS: group membership preserved after auto-sort trigger", "pass");
          passed++;
        } else {
          log("  FAIL: auto-sort broke group membership — this is the reported bug", "fail");
          failed++;
        }
      } finally {
        if (triggerTabId != null) {
          try {
            await browser.tabs.remove(triggerTabId);
          } catch { /* tab may have already closed */ }
        }
        if (prevData[triggerVideo.id]) await browser.storage.local.set(prevData);
        settings.auto_sort = prevAutoSort;
        await updateSettings();
      }
    }
  } catch (e) {
    log(`  SKIP: ${e instanceof Error ? e.message : String(e)}`, "warn");
  } finally {
    if (autoSortGroupIds.length > 0) {
      try {
        await /** @type {any} */ (browser).tabs.ungroup(autoSortGroupIds);
      } catch { /* tabGroups not available */ }
    }
  }

  const total = passed + failed;
  log(
    `\n── GROUPED SORT RESULTS  ${passed}/${total} passed${failed > 0 ? `  —  ${failed} FAILED` : "  ✓"} ─`,
    failed > 0 ? "fail" : "pass"
  );

  Object.assign(settings, savedSettings);
  await updateSettings();
  await doRestore();
  log("Settings and tab order restored.", "pass");
}

export async function openTestTabs() {
  log("── OPEN TEST TABS ────────────────────────────────────────────────", "section");
  let opened = 0;
  for (const v of TEST_VIDEOS) {
    const existing = await findTestTab(v.id);
    if (existing) {
      log(`  Already open: ${v.hint}`, "dim");
    } else {
      await browser.tabs.create({
        url: v.url ?? `https://www.youtube.com/watch?v=${v.id}`,
        active: false,
      });
      log(`  Opened: ${v.hint}`, "info");
      opened++;
    }
  }
  const allTabs = await browser.tabs.query({});
  for (const url of NON_YT_URLS) {
    const domain = new URL(url).hostname.replace(/^www\./, "");
    const existing = allTabs.find(
      (t) => !t.pinned && !(/** @type {any} */ (t).hidden) && t.url?.includes(domain)
    );
    if (existing) {
      log(`  Already open: ${domain}`, "dim");
    } else {
      await browser.tabs.create({ url, active: false });
      log(`  Opened: ${domain}`, "info");
      opened++;
    }
  }
  if (opened > 0) {
    log(`Opened ${opened} tab(s). Wait for them to load, then run Full Auto Test.`, "info");
  } else {
    log("All test tabs already open.", "pass");
  }
}

export async function doFullAutoTest() {
  log("── FULL AUTO TEST ────────────────────────────────────────────────", "section");

  await doSave();
  await getSettings();
  const savedSettings = JSON.parse(JSON.stringify(settings));

  settings.current_window_only = false;
  settings.ignore_inactive = false;
  settings.ignore_live = false;
  settings.ignore_shorts = false;
  settings.ignore_playlists = false;
  settings.group_filter = "all";
  settings.sort_to_start = false;

  const allTabs = await prefilterTabs();
  if (allTabs.length === 0) {
    log("No YouTube tabs found — open some YouTube tabs first.", "fail");
    Object.assign(settings, savedSettings);
    return;
  }

  const testTabIds = /** @type {number[]} */ (allTabs.map((t) => t.id).filter((id) => id != null));
  const allIds = /** @type {string[]} */ (allTabs.map((t) => t.youtubeID).filter(Boolean));

  const knownIds = new Set(TEST_VIDEOS.map((v) => v.id));
  for (const v of TEST_VIDEOS) {
    if (allIds.includes(v.id)) log(`  Found: ${v.hint}`, "dim");
  }
  const unknownCount = allIds.filter((id) => !knownIds.has(id)).length;
  if (unknownCount > 0) log(`  + ${unknownCount} other YouTube tab(s)`, "dim");
  log(`Running with ${testTabIds.length} YouTube tab(s).`, "info");

  const snap = /** @type {Record<string,any>} */ (await browser.storage.local.get(allIds));
  const missingIds = allIds.filter(
    (id) => !snap[id] || (!snap[id].title && !snap[id].author && snap[id].duration == null)
  );
  if (missingIds.length > 0) {
    log(`Waiting for metadata for ${missingIds.length} video(s) (up to 45 s)…`, "info");
    if (!(await waitForData(missingIds, 45_000))) {
      const snap2 = /** @type {Record<string,any>} */ (await browser.storage.local.get(missingIds));
      const stillMissing = missingIds.filter(
        (id) => !snap2[id]?.title && !snap2[id]?.author && snap2[id]?.duration == null
      );
      log(`Timed out — no data for: ${stillMissing.join(", ")}`, "fail");
      return;
    }
  }

  const meta = /** @type {Record<string,any>} */ (await browser.storage.local.get(allIds));
  log("Metadata:", "info");
  for (const v of TEST_VIDEOS) {
    const m = meta[v.id];
    if (!m) continue;
    const name = v.hint.split("—")[0].trim();
    log(
      `  ${name}: author="${m.author ?? "?"}"  date=${m.uploadDate ?? "?"}  dur=${m.duration ?? "?"}s  views=${m.views ?? "?"}`,
      "dim"
    );
  }

  /** @type {number[]} */
  let testGroupedTabIds = [];
  try {
    const ungroupedIds = (await browser.tabs.query({}))
      .filter(
        (t) =>
          t.id != null &&
          testTabIds.includes(/** @type {number} */ (t.id)) &&
          /** @type {any} */ ((t).groupId ?? -1) === -1
      )
      .map((t) => /** @type {number} */ (t.id));

    if (ungroupedIds.length >= 2) {
      const variants = ["none", "single", "mixed"];
      if (ungroupedIds.length >= 3) variants.push("split");
      const variant = variants[Math.floor(Math.random() * variants.length)];

      if (variant === "single") {
        log(`  Groups: all ${ungroupedIds.length} ungrouped test tabs → 1 group`, "dim");
        await /** @type {any} */ (browser).tabs.group({ tabIds: ungroupedIds });
        testGroupedTabIds = ungroupedIds;
      } else if (variant === "split") {
        const half = Math.floor(ungroupedIds.length / 2);
        log(`  Groups: split into 2 (${half} + ${ungroupedIds.length - half})`, "dim");
        await /** @type {any} */ (browser).tabs.group({ tabIds: ungroupedIds.slice(0, half) });
        await /** @type {any} */ (browser).tabs.group({ tabIds: ungroupedIds.slice(half) });
        testGroupedTabIds = ungroupedIds;
      } else if (variant === "mixed") {
        const half = Math.floor(ungroupedIds.length / 2);
        log(`  Groups: mixed — ${half} grouped, ${ungroupedIds.length - half} ungrouped`, "dim");
        await /** @type {any} */ (browser).tabs.group({ tabIds: ungroupedIds.slice(0, half) });
        testGroupedTabIds = ungroupedIds.slice(0, half);
      } else {
        log(`  Groups: none`, "dim");
      }
    }
  } catch {
    // tabGroups not supported — no grouping applied
  }

  let passed = 0;
  let failed = 0;

  log("\nSort criteria:", "info");
  for (const v of SORT_VARIANTS) {
    settings.sorting = [{ attr: v.attr, asc: v.asc, dropdown: [], title: v.label }];
    const tabs = await prefilterTabs();
    const sorted = [...tabs].sort(createTabSorter(settings.sorting));
    await moveTabsByWindow(sorted, settings.sort_to_start);
    if (await verifySortOrder(v.label, testTabIds)) passed++;
    else failed++;
  }

  log("\nignore_inactive:", "info");
  try {
    const discardId = testTabIds[testTabIds.length - 1];
    await browser.tabs.discard(discardId);

    settings.ignore_inactive = false;
    const included = (await prefilterTabs()).some((t) => t.id === discardId);

    settings.ignore_inactive = true;
    const excluded = !(await prefilterTabs()).some((t) => t.id === discardId);

    if (included && excluded) {
      log("  PASS: discarded tab included when off, excluded when on", "pass");
      passed++;
    } else {
      log(`  FAIL: included=${included} excluded=${excluded}`, "fail");
      failed++;
    }
    settings.ignore_inactive = false;
  } catch (e) {
    log(`  SKIP: ${e instanceof Error ? e.message : String(e)}`, "warn");
  }

  log("\nGroup scope:", "info");
  try {
    const ungroupedForScope = (await browser.tabs.query({}))
      .filter(
        (t) =>
          t.id != null &&
          testTabIds.includes(/** @type {number} */ (t.id)) &&
          /** @type {any} */ ((t).groupId ?? -1) === -1
      )
      .map((t) => /** @type {number} */ (t.id))
      .slice(0, 2);
    const toGroupIds = ungroupedForScope;
    if (toGroupIds.length === 0) throw new Error("no ungrouped test tabs available");
    await /** @type {any} */ (browser).tabs.group({ tabIds: toGroupIds });

    settings.sorting = [{ attr: "author", asc: false, dropdown: [], title: "author A→Z" }];

    settings.group_filter = "grouped_only";
    const r1 = await prefilterTabs();
    const ungroupedInR1 = r1.filter((t) => /** @type {any} */ ((t).groupId ?? -1) === -1);
    if (ungroupedInR1.length === 0 && r1.length > 0) {
      log(`  PASS [grouped_only]: ${r1.length} tab(s), all grouped`, "pass");
      passed++;
    } else {
      log(
        `  FAIL [grouped_only]: ${ungroupedInR1.length} ungrouped tab(s) in result (total ${r1.length})`,
        "fail"
      );
      failed++;
    }

    settings.group_filter = "ungrouped_only";
    const r2 = await prefilterTabs();
    const groupedInR2 = r2.filter((t) => /** @type {any} */ ((t).groupId ?? -1) !== -1);
    if (groupedInR2.length === 0) {
      log(`  PASS [ungrouped_only]: ${r2.length} tab(s), none grouped`, "pass");
      passed++;
    } else {
      log(`  FAIL [ungrouped_only]: ${groupedInR2.length} grouped tab(s) in result`, "fail");
      failed++;
    }

    await /** @type {any} */ (browser).tabs.ungroup(toGroupIds);
    settings.group_filter = "all";
  } catch (e) {
    log(
      `  SKIP: ${e instanceof Error ? e.message : String(e)} (Chrome + tabGroups permission needed)`,
      "warn"
    );
  }

  log("\nignore_shorts:", "info");
  /** @type {number | null} */
  let shortTabId = null;
  let openedShortTab = false;
  try {
    const existingShorts = (
      await browser.tabs.query({ url: "*://www.youtube.com/shorts/*" })
    ).filter((t) => !(/** @type {any} */ (t).hidden));

    if (existingShorts[0]?.id != null) {
      shortTabId = existingShorts[0].id;
      log(
        `  Using existing Shorts tab: ${(existingShorts[0].title ?? existingShorts[0].url ?? "?").slice(0, 50)}`,
        "dim"
      );
    } else {
      const shortTab = await browser.tabs.create({
        url: `https://www.youtube.com/shorts/${SHORT_TEST_ID}`,
        active: false,
      });
      shortTabId = shortTab.id ?? null;
      openedShortTab = true;

      await browser.storage.local.set({
        [SHORT_TEST_ID]: {
          title: "Me at the zoo",
          duration: 19,
          author: "jawed",
          uploadDate: "2005-04-23",
        },
      });

      await new Promise((r) => setTimeout(r, 2500));

      const allCurrent = await browser.tabs.query({});
      const st = allCurrent.find((t) => t.id === shortTabId);
      if (!(st?.url?.includes("/shorts/") ?? false)) {
        log(`  SKIP: ${SHORT_TEST_ID} redirected — update SHORT_TEST_ID with a real Short`, "warn");
        shortTabId = null;
      }
    }

    if (shortTabId != null) {
      settings.ignore_shorts = false;
      settings.group_filter = "all";
      const included = (await prefilterTabs()).some((t) => t.id === shortTabId);

      settings.ignore_shorts = true;
      const excluded = !(await prefilterTabs()).some((t) => t.id === shortTabId);

      if (included && excluded) {
        log("  PASS: short included when off, excluded when on", "pass");
        passed++;
      } else {
        log(`  FAIL: included=${included} excluded=${excluded}`, "fail");
        failed++;
      }
    }
  } catch (e) {
    log(`  SKIP: ${e instanceof Error ? e.message : String(e)}`, "warn");
  } finally {
    if (openedShortTab && shortTabId != null) await browser.tabs.remove(shortTabId);
    if (openedShortTab) await browser.storage.local.remove(SHORT_TEST_ID);
    settings.ignore_shorts = false;
  }

  const total = passed + failed;
  log(
    `\n── RESULTS  ${passed}/${total} passed${failed > 0 ? `  —  ${failed} FAILED` : "  ✓"} ─────────────────────`,
    failed > 0 ? "fail" : "pass"
  );

  if (testGroupedTabIds.length > 0) {
    try {
      await /** @type {any} */ (browser).tabs.ungroup(testGroupedTabIds);
    } catch { /* tabGroups not available */ }
  }

  Object.assign(settings, savedSettings);
  await updateSettings();
  await doRestore();
  log("Settings and tab order restored.", "pass");
}
