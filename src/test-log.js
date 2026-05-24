// @ts-check

const logEl = /** @type {HTMLPreElement} */ (document.getElementById("log"));

/** @param {string} text @param {'info'|'pass'|'fail'|'warn'|'section'|'dim'} [level] */
export function log(text, level = "info") {
  const line = document.createElement("span");
  line.className = `l-${level}`;
  const ts = new Date().toLocaleTimeString("en", { hour12: false });
  line.textContent = (level === "section" ? `\n${ts}  ` : `${ts}  `) + text + "\n";
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

export function clearLog() {
  logEl.innerHTML = "";
}
