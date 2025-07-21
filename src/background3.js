chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
        chrome.cookies.get({ name: "auth_token", url: "https://x.com" }).then(cookie => {
            sendResponse(cookie);
        });
        return true;
    }
});