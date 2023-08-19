

chrome.webRequest.onHeadersReceived.addListener(
    function(details) {
        return {
            responseHeaders: details.responseHeaders.filter(header => header.name.toLowerCase() !== 'content-security-policy' && header.name.toLowerCase() !== 'location')
        }
    },
    {urls: ["https://tweetdeck.twitter.com/*"]},
    ["blocking", "responseHeaders"]
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
            }
        } catch(e) {}
    },
    {urls: ["https://tweetdeck.twitter.com/*"]},
    ["blocking"]
);