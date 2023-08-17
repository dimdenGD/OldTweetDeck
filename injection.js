window.addEventListener("message", (event) => {
    if (event.data.action === "getcookie") {
        chrome.runtime.sendMessage({ action: "setcookie", cookie: document.cookie });
    }
});

(async () => {
    document.documentElement.innerHTML = /*html*/`
        <head id="injected-head">
            <title>TweetDeck</title>
            <link rel="icon" href="${chrome.runtime.getURL('images/logo48.png')}">
        </head>
        <body id="injected-body">
            <iframe id="iframe" src="https://tweetdeck.dimden.dev/" style="position: fixed;top: 0;left: 0;width: 100vw;height: 100vh;border: none;z-index: 99999;"></iframe>
        </body>`;
    let iframe = document.getElementById("iframe");
    iframe.contentWindow.document.cookie = document.cookie;

    let int = setInterval(() => {
        let badBody = document.querySelector('body:not(#injected-body)');
        let badHead = document.querySelector('head:not(#injected-head)');
        if (badBody && badHead) {
            badBody.remove();
            badHead.remove();
            clearInterval(int);
        }
    }, 100);
})();