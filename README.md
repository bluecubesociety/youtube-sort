# YouTube Sort

A browser extension that sorts your open YouTube video tabs by channel name, title, duration, views, or upload date.

Available for **Firefox** and **Chromium-based browsers**.

---

## Features

- **SponsorBlock integration**: when SponsorBlock is detected on a tab, sort by the skipped duration instead of the full one.
- **Multi-window support**: sort across all windows, or restrict to the current window only.
- **Auto-sort**: automatically sort when a new YouTube tab finishes loading.
- **Various Sorting and Filter options**: inactive/unloaded tabs, live streams, or playlists, shorts, sort direction, etc.

---

## Installation

### Firefox
Available on [Mozilla Add-ons](https://addons.mozilla.org/en-US/firefox/addon/youtube-sort?utm_source=github&utm_content=available-on).

### Chrome / Chromium
Available on the [Chrome Web Store](https://chromewebstore.google.com/detail/odffldpmcfmbelfebdpkbmlidfohkgfc?utm_source=github).

---

## How It Works

A content script runs on every YouTube tab and reads video metadata (title, channel, duration, views, upload date) from the page's meta tags, then stores it in `browser.storage.local` keyed by video ID. When you trigger a sort, the popup reads this stored data, merges it with the live tab list, applies sorting rules, and moves the tabs using the browser tabs API.

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md).


---

## Privacy

This extension does not collect, transmit, or share any data. All video metadata is stored locally in your browser. See [PRIVACY.md](PRIVACY.md) for details.

---

## License

MIT — see [LICENSE](LICENSE).

---

## Disclaimer

YouTube Sort is an independent browser extension and is not affiliated with, endorsed by, or associated with YouTube or Google LLC. "YouTube" is a trademark of Google LLC.
