// @ts-check

import { log, clearLog } from "./test-log.js";
import { doSnapshot, doSave, doRestore } from "./test-snapshot.js";
import { doShuffle, doSort, doVerify, doUnload } from "./test-actions.js";
import { doFullAutoTest, openTestTabs, doGroupedSortTest } from "./test-full.js";

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
  on("btn-full-auto", doFullAutoTest);
  on("btn-init-run", async () => {
    await openTestTabs();
    await doFullAutoTest();
  });
  on("btn-grouped-sort", doGroupedSortTest);
  on("btn-clear", () => {
    clearLog();
    return Promise.resolve();
  });

  const splitArrow = document.getElementById("btn-split-arrow");
  const splitMenu = document.getElementById("btn-split-menu");
  splitArrow?.addEventListener("click", (e) => {
    e.stopPropagation();
    splitMenu?.classList.toggle("open");
  });
  document.addEventListener("click", () => splitMenu?.classList.remove("open"));
});
