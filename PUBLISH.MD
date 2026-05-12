# Publishing

## Firefox (Mozilla Add-ons)

1. `npm ci`
2. `npm run build`
3. Head to this page and follow orders: https://addons.mozilla.org/en-CA/developers/addon/youtube-sort/versions/submit/

---

## Chrome (Chrome Web Store)

1. `npm ci`
2. `npm run build:chrome`: produces a `.zip` in `web-ext-artifacts/`, then restores `manifest.json` automatically
3. Upload the zip at https://chrome.google.com/webstore/devconsole

### How the Chrome build works
- `manifest.chrome.json` is the Chrome-specific manifest (uses `service_worker` instead of `scripts` for the background, no `browser_specific_settings`)
- `webextension-polyfill` maps `browser.*` → `chrome.*` so the source code needs no changes
- `npm run build:chrome` temporarily swaps `manifest.json` for the Chrome version, builds, then restores the original
