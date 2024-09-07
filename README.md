# YouTube Sort

Enhance your YouTube viewing experience, by sorting your open video tabs alphabetically, by channel name, view count or time.

## Patch Notes

### Version 1.6.0 – Sep 07, 2024

**New Features**
- Added Tips (there is only one so far).

**Fixes**
- Fixed an issue (#17) that prevented the video controls to be used, due to the indicator. It's now been moved to the description instead.
- Fixed an issue (#16) where duplicate tabs haven't been sorted properly.
- Fixed issue that the SponsorBlock specific setting wasn't being hidden properly, when no SponsorBlock detected.
- Adjustment comments and issue references.

**Known Issues and Limits**
- Video Premieres that go something like "Premieres in X days" do not get tracked or sorted, because their videos don't have a duration (yet), and I don't track the time until the premiere (but if there's someone out there who has such a specific use case that they have multiple premieres open at once and want them sorted ny time, [let me know or contribute to the code](https://github.com/alexandertbratrich/youtube-sort)).
- Due to the new data collection via ~~schema~~ meta-tags, shorts seem to be problem for that, because somehow their schema isn't known right away, and if it is, it doesn't include all information (usually just the channel name) and the schema is structured differently. Shorts are a bit of a problem in general, due to their nature of just scrolling further, so that would mean I would need to track if the url changes and update accordingly. I may update that in the future, but I personally don't watch shorts that much that I need to sort them, but if that's a special case you want to me to patch for you, let me know.
- When opening the popup, the stats and list isn't up-to-date immediately, only after manually pressing the sorting button.
- Views are not entirely acurate (they don't update once the tab has been put into storage).

**Things I would love to improve in the future**
- System dark/light theme preferences
- Bring back shorts?
- Include playback speed when sorting by duration (and in statistics)
- Include non-video tabs in the sorting as well? (so they don't get mixed with other tabs)
- Option to hide the statistics
- Option to force-reload all YT tabs (helpful for debugging as well)
- Adjust setup to not include dev-data in final distribution
- Maybe, instead of sorting the tabs to the end, I should remember the old tab positions and just swap around the ids?

### Version 1.5.2 – May 25, 2024

**Fixes**
- Updated Store-Icon
- Shorted Extension Name just to "YouTube Sort"

**New Features**
- (#11) Now supports SponsorBlock when sorting by duration (and in the statistics).

### Version 1.5.1 – May 23, 2024

**Fixes**
- Fixed an issue that the indicator accidentally hid the video settings on certain devices.
- Fixed an issue that videos with unusual query parameters got accidentally removed with each sorting (i.e. when opening a tab from a different app, the url might include "app=desktop" before the "v=")
- Fixed an issue that apparently not all videos have an embedUrl in the DOM, so the video ID gets fetched from the URL directly.

### Version 1.5 – December 11, 2023

**Fixes**
- Fixed an issue that entries that don't have youtubeIDs, break the whole sorting/listing process.
- Fixed an issue that videos that premiered as a live stream got still marked as live stream, even though they finished years ago (endDate wasn't checked).
- Fixed an issue that some videos have not been detected, because the mutationObserver didn't detect any changes. Now, the detection is called once manually on page-load
- Fixed styling issue (transparent background)
- Fixed type issue (String -> Integer)
- Adjusted setup (dev deps) and publish process (instructions)

**New Features**
- Statistics are back! Shows the total video count, total runtime and total views.

### Version 1.4 – November 21, 2023

**Fixes**
- Fixed an issue (#10) that kept old entries and youtube tabs that don't have videos in it in the tab list.
- Fixed an issue (#9) where video durations where _always_ 2.999 seconds. Changed fetching of duration via meta tag with ISO 8601 conversion, which is unfortunately a tiny bit less precise, until YouTube changes things again.
- Fixed a related issue where the author (aka channel name) was always undefined. It seems that the meta-data-tags seem a tiny bit unreliable.
- Fixed an issue where the indicator didn't show up in the video controls
- Fixed the icon on the store page

**Improvements**
- Replaced the indicator with a new icon instead of just a dot
- Tabs in the list are now clickable
- Slight styling adjustments
- The MutationObserver now should fire the final data submission to the storage only once the video controls have been loaded.

### Version 1.3 – September 17, 2023

**A New Look**
- Changed the GUI design, to fit more into YouTube's design
- Added a new tab to separate the settings from the rest
- Video detection indicator changed, and now received a helper text, so you know what it is

**New Features**
- (#3) You can now sort by something else than just the duration! You can sort by title, duration, channel name, views, and upload date
- You can now ignore live streams
- These new sorting methods can be combined, so if you sort videos by channel name, and the order isn't obvious because there more than one video by that channel, you can then sort further (by something else)
- Improved collection of video data ~~(all these are collected from the videoObject-Schema instead of the DOM)~~ Nope, now video meta-tags, which are also provided due to the schema
- Now includes a list of detected tabs (mostly just for me for debugging).

**Fixes and Improvements**
- Videos get now saved using their Video ID, and not their URL, which means the same videos with different URLs don't get saved twice and get treated the same way. This also reduces some URL-regex code when trying to find the ID, and reduces valuable data length in the storage.
- Videos get marked as live or playlist before they get saved. This does increase the storage a tiny bit, but simplifies filtering later
- When filtering, old entries in the storage that can not be found anymore will not get deleted. In general, the filtering has been improved quite a bit, bit still could be improved further
- Styling now uses SCSS (but hasn't been used to its full potential)
- Improved code structure and naming.
- 1.3.1: Fixed a bug that didn't show the indicator
- 1.3.1: Fixed a bug (#6) that filters worked too well
- 1.3.1: Fixed a bug (#5) that videoObject-schemas never get detected (switched over to meta-tags)
- 1.3.2: Fixed another bug related to detection. Content-File was always reading data too soon, so now a mutation-detector waits for the video to load. Which means, I might be able to go back to the schema-variant and skim me some code.

### Version 1.2 – April 23, 2023

**A New Look**
- Added custom icon
- Changed the GUI design

**Better Code, New Features**
- Improved collection of video duration (now also works with video longer than 24 hours and shorts!)
- You can choose if inactive/discarded tabs should be sorted as well
- You can ignore certain video types (shorts, playlists, channel trailers). These videos will then not sorted and not shown in the statistics
- You can now choose the sorting order (ascending, descending)

**Misc Changes**
- Updated manifest, package and Firefox store metadata (because someone forgot to remove tutorial data)
- Removed icon badge entirely (because it was causing more trouble maintaining, than it was actually useful for).

**Known Issues and Limits**
- The extension currently always adds video duration data into the local storage, but never deletes it once the tab is closed.
- Live-Streams get sorted randomly (should be either ignore entirely or get a better duration)
- Ignoring Sleepy Tabs (not loading them) will still sort them if they are in the storage (which is a good thing, but should be up to the user)
- Is it possible to change the YouTube icon?
- Fix Icon in Store
- Add a button to manually clear storage
- Use video ideas in storage only (so if multiple windows/tabs have the same video open, but with a different URL (i.e. query parameters), they still use the same slot in the storage, saving space)
- What is the storage limit?

### Initial Version – March 31, 2022

- Highlights the runtime in open YouTube videos when detected
- Grabs the runtime of all loaded YouTube tabs and stores it in the local browser storage
- Shows the total amount of open YouTube tabs as a badge
