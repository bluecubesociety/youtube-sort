# Changelog

## Version 2.0.2 – May 12, 2026

**Fixes**
- Fixed "Sort to Start" not working in browsers with workspace/folder features (e.g. Zen Browser)
- Fixed video duration occasionally being overwritten with 0 after an extension reload or force-sort, causing duration sorting to appear broken

---

## Version 2.0.0 – Mar 25, 2026

After one and a half years, finally an update. Things were actually pretty stable (for the most part), considering YouTube's tendency to randomly change the design and break the code. But I learned a lot new in the meantime, and I wanted to at least extend the sorting rules due to personal change in use.

**New Features**
- Added dark mode support
- Added support for YouTube Shorts (and option to ignore it) (to some extend. Channel names seem to have issues, and scrolling around isn't recognized well)
- Added support for multiple windows
- Added option to move tabs to the start (top/left) of the window, instead of the end (bottom/right)
- Added option to auto-sort tabs immediately when a new one opens
- Added options to clear cache/data on individual items
- Tab favicon changes now, if video is detected
- Design Overhaul:
  - Added DnD for sorting rules,
  - Better visual feedback in the list,
  - Spacing adjustments
  - New stat and settings layout
- Now also available for Chromium!

**Fixes**
- Fixed views, after YouTube changed something again with the layout
- Fixed channel names, since they added collab names now (might still be a bit buggy with collabs)
- Fixed observer issue staying alive forever
- Made force-reload deliberately slower, to avoid huge performance drain
- Added fallback to stats
- Sorting awaits to avoid incorrect order
- Removals now run in parallel
- Added debouncer to SponsorBlock detection for improved performance
- Updated manifest-version
- Accessibility: Added aria-labels and roles, focus-rings, higher contrast on some elements, changed elements to buttons that weren't before
- Minor other optimizations (better error handling, redundancy, simplifications, better project structure)

---

## Version 1.6.2 – Sep 11, 2024

**Fixes**
- Fixed an issue with unknown video tab data

---

## Version 1.6.1 – Sep 10, 2024

**New Features**
- YouTube Premieres are being sorted now to the _back_ of the duration list (as in: having infinite duration), while sorting them based on time until premiere.
- Tab list now shows time until premiere
- Added option to force reload all video tabs for debugging

**Fixes**
- Fixed an issue that videos with SponsorBlock that were longer than 60 minutes didn't get detected.

---

## Version 1.6.0 – Sep 08, 2024

**New Features**
- Added Tips (there is only one so far).

**Fixes**
- Fixed an issue (#17) that prevented the video controls to be used, due to the indicator. It's now been moved to the description instead.
- Fixed an issue (#16) where duplicate tabs haven't been sorted properly.
- Fixed issue that the SponsorBlock specific setting wasn't being hidden properly, when no SponsorBlock detected.
- Adjustment comments and issue references.

**Known Issues and Limits**
- Due to the new data collection via meta-tags, shorts seem to be a problem because their schema isn't known right away, and if it is, it doesn't include all information (usually just the channel name) and the schema is structured differently. Shorts are a bit of a problem in general, due to their nature of just scrolling further, so that would mean tracking if the URL changes and updating accordingly. May be patched in the future.
- When opening the popup, the stats and list isn't up-to-date immediately, only after manually pressing the sorting button.
- Views are not entirely accurate (they don't update once the tab has been put into storage).

**Things I would love to improve in the future**
- System dark/light theme preferences
- Bring back shorts?
- Include playback speed when sorting by duration (and in statistics)
- Include non-video tabs in the sorting as well? (so they don't get mixed with other tabs)
- Option to hide the statistics
- Adjust setup to not include dev-data in final distribution
- Maybe, instead of sorting the tabs to the end, I should remember the old tab positions and just swap around the ids?

---

## Version 1.5.2 – May 25, 2024

**Fixes**
- Updated Store-Icon
- Shortened Extension Name just to "YouTube Sort"

**New Features**
- (#11) Now supports SponsorBlock when sorting by duration (and in the statistics).

---

## Version 1.5.1 – May 23, 2024

**Fixes**
- Fixed an issue that the indicator accidentally hid the video settings on certain devices.
- Fixed an issue that videos with unusual query parameters got accidentally removed with each sorting (i.e. when opening a tab from a different app, the URL might include "app=desktop" before the "v=")
- Fixed an issue that apparently not all videos have an embedUrl in the DOM, so the video ID gets fetched from the URL directly.

---

## Version 1.5 – December 11, 2023

**Fixes**
- Fixed an issue that entries that don't have youtubeIDs break the whole sorting/listing process.
- Fixed an issue that videos that premiered as a live stream got still marked as live stream, even though they finished years ago (endDate wasn't checked).
- Fixed an issue that some videos have not been detected, because the MutationObserver didn't detect any changes. Now, the detection is called once manually on page-load.
- Fixed styling issue (transparent background)
- Fixed type issue (String -> Integer)
- Adjusted setup (dev deps) and publish process (instructions)

**New Features**
- Statistics are back! Shows the total video count, total runtime and total views.

---

## Version 1.4 – November 21, 2023

**Fixes**
- Fixed an issue (#10) that kept old entries and YouTube tabs that don't have videos in them in the tab list.
- Fixed an issue (#9) where video durations were _always_ 2.999 seconds. Changed fetching of duration via meta tag with ISO 8601 conversion, which is unfortunately a tiny bit less precise, until YouTube changes things again.
- Fixed a related issue where the author (aka channel name) was always undefined. It seems that the meta-data-tags seem a tiny bit unreliable.
- Fixed an issue where the indicator didn't show up in the video controls
- Fixed the icon on the store page

**Improvements**
- Replaced the indicator with a new icon instead of just a dot
- Tabs in the list are now clickable
- Slight styling adjustments
- The MutationObserver now should fire the final data submission to the storage only once the video controls have been loaded.

---

## Version 1.3 – September 17, 2023

**A New Look**
- Changed the GUI design to fit more into YouTube's design
- Added a new tab to separate the settings from the rest
- Video detection indicator changed, and now received a helper text, so you know what it is

**New Features**
- (#3) You can now sort by something else than just the duration! You can sort by title, duration, channel name, views, and upload date
- You can now ignore live streams
- Sorting methods can be combined — if you sort by channel name, ties are broken by a second rule
- Improved collection of video data via meta-tags

**Fixes and Improvements**
- Videos get saved using their Video ID, not their URL, so the same video with different URLs doesn't get saved twice
- Videos get marked as live or playlist before they get saved
- Styling now uses SCSS
- Improved code structure and naming
- 1.3.1: Fixed a bug that didn't show the indicator
- 1.3.1: Fixed a bug (#6) that filters worked too well
- 1.3.1: Fixed a bug (#5) that videoObject-schemas never get detected (switched over to meta-tags)
- 1.3.2: Fixed another bug related to detection. Content file was always reading data too soon, so now a MutationObserver waits for the video to load.

---

## Version 1.2 – April 23, 2023

**A New Look**
- Added custom icon
- Changed the GUI design

**Better Code, New Features**
- Improved collection of video duration (now also works with videos longer than 24 hours and shorts!)
- You can choose if inactive/discarded tabs should be sorted as well
- You can ignore certain video types (shorts, playlists, channel trailers)
- You can now choose the sorting order (ascending, descending)

**Misc Changes**
- Updated manifest, package and Firefox store metadata
- Removed icon badge entirely

---

## Initial Version – March 31, 2022

- Highlights the runtime in open YouTube videos when detected
- Grabs the runtime of all loaded YouTube tabs and stores it in the local browser storage
- Shows the total amount of open YouTube tabs as a badge
