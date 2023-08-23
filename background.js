const extraInfoSpec = ["blocking", "responseHeaders"];
if (chrome.webRequest.OnHeadersReceivedOptions.hasOwnProperty("EXTRA_HEADERS")) {
    extraInfoSpec.push("extraHeaders");
}

chrome.webRequest.onBeforeRequest.addListener(
    function(details) {
        try {
            let parsedUrl = new URL(details.url);
            let path = parsedUrl.pathname;
            if(path === '/decider') {
                return {
                    redirectUrl: chrome.runtime.getURL('/files/decider.json')
                }
            } else if(path === '/web/dist/version.json') {
                return {
                    redirectUrl: chrome.runtime.getURL('/files/version.json')
                }
            };
        } catch(e) {}
    },
    {urls: ["https://*.twitter.com/*"]},
    ["blocking"]
);

chrome.webRequest.onBeforeRequest.addListener(
    function(details) {
        try {
            let parsedUrl = new URL(details.url);
            let path = parsedUrl.pathname;
            let initiator = details.initiator || details.originUrl || details.documentUrl;
            if(path.startsWith('/gryphon-client/') && initiator.startsWith('https://twitter.com/i/tweetdeck')) {
                return {
                    cancel: true
                }
            }
        } catch(e) {}
    },
    {urls: ["https://abs.twimg.com/*"]},
    ["blocking"]
);