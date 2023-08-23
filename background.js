const extraInfoSpec = ["blocking", "responseHeaders"];
if (chrome.webRequest.OnHeadersReceivedOptions.hasOwnProperty("EXTRA_HEADERS")) {
    extraInfoSpec.push("extraHeaders");
}

chrome.webRequest.onHeadersReceived.addListener(
    function(details) {
        let headers = details.responseHeaders.filter(header => header.name.toLowerCase() !== 'content-security-policy' && header.name.toLowerCase() !== 'location');
        return {
            responseHeaders: headers
        }
    },
    {urls: ["https://tweetdeck.twitter.com/*"]},
    extraInfoSpec
);

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
    {urls: ["https://tweetdeck.twitter.com/*"]},
    ["blocking"]
);

chrome.webRequest.onBeforeRequest.addListener(
    function(details) {
        try {
            let parsedUrl = new URL(details.url);
            let path = parsedUrl.pathname;
            let initiator = details.initiator || details.originUrl || details.documentUrl;
            if(path.startsWith('/gryphon-client/') && initiator.startsWith('https://tweetdeck.twitter.com')) {
                return {
                    cancel: true
                }
            }
        } catch(e) {}
    },
    {urls: ["https://abs.twimg.com/*"]},
    ["blocking"]
);