// @ts-check

import { log, clearLog } from "./test-log.js";
import { doSnapshot, doSave, doRestore } from "./test-snapshot.js";
import { doShuffle, doSort, doVerify, doUnload } from "./test-actions.js";

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
