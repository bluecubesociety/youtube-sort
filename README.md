# YouTube Sort

Enhance your YouTube viewing experience, by sorting your open video tabs by various stats (title, channel name, view count and more).

## Patch Notes

### Version 1.3 - September 17, 2023

**A New Look**
- Changed the GUI design, to fit more into YouTube's design
- Added a new tab to separate the settings from the rest
- Video detection indicator changed, and now received a helper text, so you know what it is

**New Features**
- You can now sort by something else than just the duration! You can sort by title, duration, channel name, views, and upload date
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
- 1.3.1: Fixed a bug that filters worked too well
- 1.3.1: Fixed a bug that videoObject-schemas never get detected (switched over to meta-tags)
- 1.3.2: Fixed another bug related to detection. Content-File was always reading data too soon, so now a mutation-detector waits for the video to load. Which means, I might be able to go back to the schema-variant and some me some code.

**Known Issues and Limits, and new Bugs**
- Video Premieres that go something like "Premieres in X days" do not get tracked or sorted, because their videos don't have a duration (yet), and I don't track the time until the premiere (but if there's someone out there who has such a specific use case that they have multiple premieres open at once and want them sorted, let me know or [contribute](https://github.com/alexandertbratrich/youtube-sort) to the code).
- For the moment, I removed statistics, but if you like them back, let me know.
- Due to the new data collection via ~~schema~~ meta-tags, shorts seem to be problem for that, because somehow their schema isn't know right away, and if it is, it doesn't include all information (usually just the uploader) and the schema is structured differently. Shorts are a bit of a problem in general, due to their nature of just scrolling further, so that would mean I would need to track if the url changes and update accordingly. I may update that in the future, but I personally don't watch shorts that much that I need to sort them, but if that's a special case you want to me to patch for you, let me know.
- For unknown reason, sometimes videos doesn't get detected (or don't get saved into the storage), or get sometimes mislabelled as a live stream, even though they aren't.

**Things I'd love to improve in the future**
- System dark/light theme preferences
- Better styling
- Bring back shorts and stats
- Maybe make list of tabs clickable
- Icon on the store page (white on white)
- Include playback speed when sorting by duration

### Version 1.2 - April 23, 2023

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

### Initial Version - March 31, 2022

- Highlights the runtime in open YouTube videos when detected
- Grabs the runtime of all loaded YouTube tabs and stores it in the local browser storage
- Shows the total amount of open YouTube tabs as a badge