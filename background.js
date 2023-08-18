chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if(request.action === "setcookie") {
        let ct0 = request.cookie.match(/(?:^|;\s*)ct0=([0-9a-f]+)\s*(?:;|$)/);
        if(!ct0) return;
        ct0 = ct0[1];
        chrome.cookies.set({
            domain: ".twitter.com",
            name: "ct0",
            value: ct0,
            url: "https://tweetdeck.twitter.com/",
            secure: true,
            sameSite: "no_restriction"
        });
        chrome.cookies.set({
            domain: ".dimden.dev",
            name: "ct0",
            value: ct0,
            url: "https://tweetdeck.dimden.dev/",
            secure: true,
            sameSite: "no_restriction"
        });
    }
});
