/*
this file searches for the runtime on a YouTube video, 
marks it grey (just so I can see that it works),
and stores it (in seconds) in the extension storage with the URL.
*/

const timeNode = document.querySelector(".ytp-time-duration")
timeNode.style.backgroundColor = "#FFFFFF33"
timeNode.style.borderRadius = "2px"
timeNode.style.padding = "0px 2px"

let url = window.location.href
let time = timeNode.innerHTML.split(":")

let seconds = Infinity
if (time.length == 2)
 seconds = (parseInt(time[0]) * 60) + parseInt(time[1])
else if (time.length == 3)
 seconds = (parseInt(time[0]) * 3600) + (parseInt(time[1]) * 60) + parseInt(time[2])

try {
  browser.storage.local.set({[url]: seconds})
} catch (error) {
  console.log("[YT Sort]", error)
}