// @ts-check

/**
 * Video metadata stored in browser.storage.local, keyed by YouTube video ID.
 * @typedef {{ title?: string, duration?: number, skipped?: number, uploadDate?: string, author?: string, views?: number, live?: number, playlist?: boolean }} VideoData
 */

/**
 * Merged tab entry combining chrome.tabs.Tab with VideoData and custom aliases.
 * @typedef {chrome.tabs.Tab & VideoData & { sleepy?: boolean, tabTitle?: string, youtubeID?: string, liveDuration?: number }} MergedTabData
 */

/**
 * MergedTabData with an additional tabId key used by prefilterTabs.
 * @typedef {MergedTabData & { tabId: string }} TabEntry
 */

export {};
