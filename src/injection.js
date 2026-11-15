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
        otdOpts = e.data.opts || {};
        main();
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

const OTD_FILES = {
    challenge: ["/src/challenge.js", "src/challenge.js"],
    interception: ["/src/interception.js", "src/interception.js"],
    vendor: ["/files/vendor.js", "files/vendor.js"],
    bundle: ["/files/bundle.js", "files/bundle.js"],
    css: ["/files/bundle.css", "files/bundle.css"],
    twitter_text: ["/files/twitter-text.js", "files/twitter-text.js"],
};
const OTD_REMOTE = "https://raw.githubusercontent.com/dimdenGD/OldTweetDeck/main/";
const OTD_CACHE = "otd-remote-v1";
let otdOpts = {};

// Cache API may be unavailable; every use is guarded.
async function openCache() {
    try { return await caches.open(OTD_CACHE); } catch(e) { return null; }
}

// Prefer previously downloaded remote copy (cache), else bundled local file. No network wait.
async function loadFile(key) {
    const [localPath, remotePath] = OTD_FILES[key];
    if (!localStorage.getItem("OTDalwaysUseLocalFiles") && otdOpts.remoteUpdates !== false) {
        const cache = await openCache();
        if (cache) {
            try {
                const hit = await cache.match(OTD_REMOTE + remotePath);
                if (hit) {
                    const text = await hit.text();
                    if (text.length > 30) return text;
                }
            } catch(e) {}
        }
    }
    return fetch(chrome.runtime.getURL(localPath)).then(r => r.text());
}

// Revalidate remote files in the background using ETag; new versions apply on next load.
async function refreshRemoteInBackground() {
    if (localStorage.getItem("OTDalwaysUseLocalFiles") || otdOpts.remoteUpdates === false) return;
    const cache = await openCache();
    if (!cache) return;
    let etags = {};
    try { etags = JSON.parse(localStorage.OTDremoteEtags || "{}"); } catch(e) {}
    await Promise.allSettled(Object.values(OTD_FILES).map(async ([, remotePath]) => {
        const url = OTD_REMOTE + remotePath;
        const headers = {};
        if (etags[url] && await cache.match(url)) headers["If-None-Match"] = etags[url];
        const res = await fetch(url, { headers });
        if (res.status === 304 || !res.ok) return;
        const copy = res.clone();
        const text = await res.text();
        if (text.length <= 30) return;
        await cache.put(url, copy);
        const etag = res.headers.get("etag");
        if (etag) etags[url] = etag;
    }));
    try { localStorage.OTDremoteEtags = JSON.stringify(etags); } catch(e) {}
}

async function main() {
    window.__OTD_OPTS = otdOpts;
    let html = await fetch(chrome.runtime.getURL('/files/index.html')).then(r => r.text());
    document.documentElement.innerHTML = html;

    const [challenge_js, interception_js, vendor_js, bundle_js, bundle_css, twitter_text] =
        (await Promise.all(["challenge", "interception", "vendor", "bundle", "css", "twitter_text"].map(loadFile)))
            .map(value => ({ value }));

    // Update cache after the page is up so it never delays startup.
    setTimeout(() => refreshRemoteInBackground().catch(console.error), 15000);

    let challenge_js_script = document.createElement("script");
    challenge_js_script.innerHTML = challenge_js.value.replaceAll('SOLVER_URL', chrome.runtime.getURL("solver.html"));
    document.head.appendChild(challenge_js_script);

    let interception_js_script = document.createElement("script");
    interception_js_script.innerHTML = interception_js.value;
    document.head.appendChild(interception_js_script);

    let bundle_css_style = document.createElement("style");
    bundle_css_style.innerHTML = bundle_css.value;
    document.head.appendChild(bundle_css_style);

    let vendor_js_script = document.createElement("script");
    vendor_js_script.innerHTML = vendor_js.value;
    document.head.appendChild(vendor_js_script);

    let bundle_js_script = document.createElement("script");
    bundle_js_script.innerHTML = bundle_js.value;
    document.head.appendChild(bundle_js_script);

    let twitter_text_script = document.createElement("script");
    twitter_text_script.innerHTML = twitter_text.value;
    document.head.appendChild(twitter_text_script);

    (async () => {
        try {
            const headers = otdtoken ? { Authorization: `Bearer ${otdtoken}` } : undefined;
            const additionalScripts = await fetch("https://oldtd.org/api/scripts", { headers }).then(r => r.json());
            const sources = await Promise.all(additionalScripts.map(script =>
                fetch(`https://oldtd.org/api/scripts/${script}`, { headers }).then(r => r.text())
            ));
            for(let scriptSource of sources) {
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
    injInt = setInterval(injectAccount, 1000);
};