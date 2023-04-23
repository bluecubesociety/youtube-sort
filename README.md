# Youtube Sort

A Firefox extension that sorts YouTube video tabs based on video duration.

## Patch Notes

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
- Updated manifest, package and Firefox store meta data (because someone forgot to remove tutorial data)
- Removed icon badge entirely (because it was causing more trouble maintaining than it was actually useful for).

**Known Issues**
- The extension currently always adds video duration data into the local storage, but never deletes it once the tab is closed.

### Initial Version - March 31, 2022

- Marks open YouTube videos discretly when detected
- Grabs the runtime of all loaded YouTube tabs and stores it in the local browser storage
- Shows the total amount of open YouTube tabs as a badge