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
    {urls: ["https://twitter.com/i/tweetdeck", "https://x.com/i/tweetdeck", "https://x.com/i/tweetdeck?*"]},
    extraInfoSpec
);

chrome.webRequest.onBeforeSendHeaders.addListener(
    function(details) {
        let headers = details.requestHeaders.filter(header => header.name.toLowerCase() !== 'referer');
        return {
            requestHeaders: headers
        }
    },
    {urls: ["https://twitter.com/i/api/graphql/*", "https://x.com/i/api/graphql/*"]},
    extraInfoSpec.map(s => s.replace('response', 'request'))
)

chrome.webRequest.onBeforeRequest.addListener(
    function() {
        return {
            redirectUrl: 'https://twitter.com/i/tweetdeck'
        }
    },
    {urls: ["https://tweetdeck.twitter.com/*", "https://tweetdeck.x.com/*"]},
    ["blocking"]
);

chrome.webRequest.onBeforeRequest.addListener(
    function() {
        return {
            redirectUrl: 'https://twitter.com/i/tweetdeck'
        }
    },
    {urls: ["https://tweetdeck.com/*"]},
    ["blocking"]
);

const isFirefox = typeof browser !== "undefined";

// Store the URL of the tab that initiated the request.
let urls = {};

const flushCache = chrome.webRequest.handlerBehaviorChanged;

chrome.webNavigation.onCommitted.addListener(
    function (details) {
        // Flushes in-memory cache when moving from other twitter.com sites to TweetDeck,
        // because if cache hits, `onBeforeRequest` event won't be called (and thus we can't block unwanted requests below).
        // Only needed in Chrome. See: https://developer.chrome.com/docs/extensions/reference/webRequest/#caching
        if (
            !isFirefox &&
            (urls[details.tabId]?.[details.frameId].startsWith("https://twitter.com/") || urls[details.tabId]?.[details.frameId].startsWith("https://x.com/")) &&
            details.transitionType !== "reload" &&
            (details.url === "https://twitter.com/i/tweetdeck" || details.url === "https://x.com/i/tweetdeck")
        ) {
            flushCache();
        // Update stored URL
        }
        if (details.tabId === -1 || details.frameId !== 0) {
            return;
        }
        if (!urls.hasOwnProperty(details.tabId)) {
            urls[details.tabId] = {};
        }
        urls[details.tabId][details.frameId] = details.url;
    },
    { url: [{ hostSuffix: "twitter.com" }, { hostSuffix: "x.com" }] },
);

// Block requests for files related to Web App, except for main.{random}.js (which may be needed for API connection)
chrome.webRequest.onBeforeRequest.addListener(
    function (details) {
        try {
            let parsedUrl = new URL(details.url);
            let path = parsedUrl.pathname;
            // want to use details.originUrl but it's not available in Chrome
            let requestFrom = urls[details.tabId][details.frameId];
            if (
                (
                    path.startsWith("/responsive-web/client-web-legacy/") ||
                    path.startsWith("/responsive-web/client-web/")
                ) &&
                (requestFrom === "https://twitter.com/i/tweetdeck" || requestFrom === "https://x.com/i/tweetdeck") &&
                !path.includes('ondemand.s.') &&
                !path.includes('vendor.')
            ) {
                return {
                    cancel: true,
                };
            }
        } catch (e) {}
    },
    { urls: ["https://abs.twimg.com/*"] },
    ["blocking"],
);

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if(request.action === 'setcookie') {
        chrome.cookies.getAll({url: "https://x.com"}, async cookies => {
            console.log('setcookie', cookies);
            chrome.tabs.query({ active: true, lastFocusedWindow: true }, tab => {
                tab = tab[0];
                chrome.cookies.getAllCookieStores(async cookieStores => {
                    console.log('cookieStores', cookieStores, tab);
                    const storeId = cookieStores?.find( cookieStore => cookieStore?.tabIds?.indexOf(tab?.id) !== -1)?.id;

                    for(let cookie of cookies) {
                        chrome.cookies.set({
                            url: "https://twitter.com",
                            name: cookie.name,
                            value: cookie.value,
                            expirationDate: cookie.expirationDate,
                            domain: ".twitter.com",
                            sameSite: cookie.sameSite,
                            secure: cookie.secure,
                            httpOnly: cookie.httpOnly,
                            storeId
                        }, () => {
                            console.log('set cookie', cookie, storeId);
                        });
                    }
                });
            });
        });
    } else if(request.action === 'getcookie') {
        chrome.cookies.getAll({url: "https://x.com"}, async cookies => {
            console.log('getcookie', cookies);
            sendResponse(cookies);
        });
        return true;
    }
});