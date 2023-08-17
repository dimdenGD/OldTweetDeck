chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if(request.action === "setcookie") {
        chrome.cookies.set({
            domain: ".twitter.com",
            name: "ct0",
            value: request.cookie.match(/(?:^|;\s*)ct0=([0-9a-f]+)\s*(?:;|$)/)[1],
            url: "https://tweetdeck.dimden.dev/",
            secure: true,
            sameSite: "no_restriction"
        });
    }
});