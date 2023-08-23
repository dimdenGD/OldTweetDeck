const extraInfoSpec = ["blocking", "responseHeaders"];
if (chrome.webRequest.OnHeadersReceivedOptions.hasOwnProperty("EXTRA_HEADERS")) {
    extraInfoSpec.push("extraHeaders");
}
let twitterCookies = [];
function getCookies() {
    chrome.cookies.getAll({domain: 'twitter.com'}, function(cookies) {
        twitterCookies = cookies;
    });
}
getCookies();
setInterval(getCookies, 10000);

// chrome.webRequest.onBeforeSendHeaders.addListener(
//     function(details) {
//         let initiator = details.initiator || details.originUrl || details.documentUrl;

//         if(initiator && initiator.startsWith('https://tweetdeck.twitter.com')) {
//             if(details.url && details.url.startsWith('https://twitter.com/i/api/graphql/')) {
//                 let originHeader = details.requestHeaders.find(header => header.name.toLowerCase() === 'origin');
//                 if(originHeader) {
//                     originHeader.value = 'https://twitter.com';
//                 }
//                 // Cookie class { domain, expirationDate, hostOnly, httpOnly, name, path, sameSite, secure, session, storeId, value }
//                 getCookies();
//                 let cookieHeader = details.requestHeaders.find(header => header.name.toLowerCase() === 'cookie');
//                 let cookieString = twitterCookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
//                 if(!cookieHeader) {
//                     details.requestHeaders.push({name: 'Cookie', value: cookieString});
//                 } else {
//                     cookieHeader.value = cookieString;
//                 }
//             }
//         }

//         return {
//             requestHeaders: details.requestHeaders
//         }
//     },
//     {urls: ["https://twitter.com/*"]},
//     extraInfoSpec.map(i => i === 'responseHeaders' ? 'requestHeaders' : i)
// );

// chrome.webRequest.onHeadersReceived.addListener(
//     function(details) {
//         let initiator = details.initiator || details.originUrl || details.documentUrl;

//         if(initiator && initiator.startsWith('https://tweetdeck.twitter.com')) {
//             if(details.url && details.url.startsWith('https://twitter.com/i/api/graphql/')) {
//                 let accessControlAllowOriginHeader = details.responseHeaders.find(header => header.name.toLowerCase() === 'access-control-allow-origin');
//                 if(accessControlAllowOriginHeader) {
//                     accessControlAllowOriginHeader.value = 'https://tweetdeck.twitter.com';
//                 } else {
//                     details.responseHeaders.push({name: 'Access-Control-Allow-Origin', value: 'https://tweetdeck.twitter.com'});
//                 }
//                 let accessControlAllowCredentialsHeader = details.responseHeaders.find(header => header.name.toLowerCase() === 'access-control-allow-credentials');
//                 if(accessControlAllowCredentialsHeader) {
//                     accessControlAllowCredentialsHeader.value = 'true';
//                 } else {
//                     details.responseHeaders.push({name: 'Access-Control-Allow-Credentials', value: 'true'});
//                 }
//             }
//         }

//         return {
//             responseHeaders: details.responseHeaders
//         }
//     },
//     {urls: ["https://twitter.com/*"]},
//     extraInfoSpec
// );

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
            if(path.startsWith('/gryphon-client/') && initiator === 'https://tweetdeck.twitter.com') {
                return {
                    cancel: true
                }
            }
        } catch(e) {}
    },
    {urls: ["https://abs.twimg.com/*"]},
    ["blocking"]
);