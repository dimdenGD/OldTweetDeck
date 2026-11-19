let extId;
let isFirefox = navigator.userAgent.indexOf('Firefox') > -1;
let cookie = null;
let otdtoken = null;

if(!window.chrome) window.chrome = {};
if(!window.chrome.runtime) window.chrome.runtime = {};
window.chrome.runtime.getURL = url => {
    if(!url.startsWith('/')) url = `/${url}`;
    return `${isFirefox ? 'moz-extension://' : 'chrome-extension://'}${extId}${url}`;   
}
window.addEventListener('message', e => {
    if(e.data.extensionId) {
        console.log("got extensionId", e.data.extensionId);
        extId = e.data.extensionId;
        main().catch(error => console.error("Unable to start TweetDeck", error));
    } else if(e.data.cookie) {
        cookie = e.data.cookie;
    } else if(e.data.token) {
        console.log("got otdtoken");
        otdtoken = e.data.token;
    }
});
window.postMessage('extensionId', '*');
window.postMessage('cookie', '*');
window.postMessage('getotdtoken', '*');

async function fetchStartupText(url, minLength = 1) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Unable to load ${url} (HTTP ${response.status})`);
    const text = await response.text();
    if (text.trim().length < minLength) throw new Error(`Incomplete startup file at ${url}`);
    return text;
}

async function loadStartupAssets() {
    const paths = [
        "/src/challenge.js",
        "/src/interception.js",
        "/files/vendor.js",
        "/files/bundle.js",
        "/files/bundle.css",
        "/files/twitter-text.js",
    ];
    if (!localStorage.getItem("OTDalwaysUseLocalFiles")) {
        const remoteBase = "https://raw.githubusercontent.com/dimdenGD/OldTweetDeck/main";
        try {
            // The startup scripts depend on each other, so use the remote set as a unit.
            const assets = await Promise.all(paths.map(path => fetchStartupText(remoteBase + path, 31)));
            console.log("Using remote TweetDeck assets");
            return assets;
        } catch (error) {
            console.warn("Unable to load remote TweetDeck assets. Using bundled files.", error);
        }
    }
    return Promise.all(paths.map(path => fetchStartupText(chrome.runtime.getURL(path))));
}

async function main() {
    const [html, [challenge_js, interception_js, vendor_js, bundle_js, bundle_css, twitter_text]] =
        await Promise.all([
            fetchStartupText(chrome.runtime.getURL("/files/index.html")),
            loadStartupAssets(),
        ]);
    document.documentElement.innerHTML = html;

    let challenge_js_script = document.createElement("script");
    challenge_js_script.innerHTML = challenge_js.replaceAll('SOLVER_URL', chrome.runtime.getURL("solver.html"));
    document.head.appendChild(challenge_js_script);

    let interception_js_script = document.createElement("script");
    interception_js_script.innerHTML = interception_js;
    document.head.appendChild(interception_js_script);

    let bundle_css_style = document.createElement("style");
    bundle_css_style.innerHTML = bundle_css;
    document.head.appendChild(bundle_css_style);

    let vendor_js_script = document.createElement("script");
    vendor_js_script.innerHTML = vendor_js;
    document.head.appendChild(vendor_js_script);

    let bundle_js_script = document.createElement("script");
    bundle_js_script.innerHTML = bundle_js;
    document.head.appendChild(bundle_js_script);

    let twitter_text_script = document.createElement("script");
    twitter_text_script.innerHTML = twitter_text;
    document.head.appendChild(twitter_text_script);

    (async () => {
        try {
            const additionalScripts = await fetch("https://oldtd.org/api/scripts", {
                headers: otdtoken ? {
                    Authorization: `Bearer ${otdtoken}`
                } : undefined
            }).then(r => r.json());
            for(let script of additionalScripts) {
                let scriptSource = await fetch(`https://oldtd.org/api/scripts/${script}`, {
                    headers: otdtoken ? {
                        Authorization: `Bearer ${otdtoken}`
                    } : undefined
                }).then(r => r.text());
                let scriptElement = document.createElement("script");
                scriptElement.innerHTML = scriptSource;
                document.head.appendChild(scriptElement);
            }
        } catch(e) {
            console.error(e);
        }
    })();

    let int = setTimeout(function() {
        let badBody = document.querySelector('body:not(#injected-body)');
        if (badBody) {
            let badHead = document.querySelector('head:not(#injected-head)');
            clearInterval(int);
            if(badHead) badHead.remove();
            badBody.remove(); 
        }
    }, 200);
    setTimeout(() => clearInterval(int), 10000);

    let injInt;
    function injectAccount() {
        if(!document.querySelector('a[data-title="Accounts"]')) return;
        clearInterval(injInt);

        let accountsBtn = document.querySelector('a[data-title="Accounts"]');
        accountsBtn.addEventListener("click", function() {
            console.log("setting account cookie");
            chrome.runtime.sendMessage({ action: "setcookie" }); 
        });
    }
    setInterval(injectAccount, 1000);
};