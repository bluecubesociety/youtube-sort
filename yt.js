// searches the runtime on a youtube tab, and marks it grey (so you know it works)
const timeNode = document.querySelector(".ytp-time-duration");
if(timeNode) timeNode.style.cssText = "background-color:#FFFFFF33;border-radius:2px;padding:0px 2px;";

// collects data for the storage
const videoNodes = document.querySelectorAll("video");
const validVideoNode = Array.from(videoNodes).find(videoNode => !isNaN(videoNode.duration));
const url = window.location.href;

// saves tab time with url as key
try {
  if (validVideoNode && !isNaN(validVideoNode.duration)) {
    browser.storage.local.set({[url]: validVideoNode.duration});
  }
} catch (error) {
  console.log("[YT Sort]", error);
}
