(async () => {
    let html = await fetch(chrome.runtime.getURL('/files/index.html')).then(r => r.text());
    document.documentElement.innerHTML = html;

    let [interception_js, vendor_js, bundle_js, bundle_css] =
        await Promise.allSettled([
            fetch(chrome.runtime.getURL("/src/interception.js")).then((r) =>
                r.text(),
            ),
            fetch(chrome.runtime.getURL("/files/vendor.js")).then((r) =>
                r.text(),
            ),
            fetch(chrome.runtime.getURL("/files/bundle.js")).then((r) =>
                r.text(),
            ),
            fetch(chrome.runtime.getURL("/files/bundle.css")).then((r) =>
                r.text(),
            ),
        ]);
    if (!localStorage.getItem("OTDalwaysUseLocalFiles")) {
        const remote_files = await Promise.allSettled([
            fetch(
                "https://raw.githubusercontent.com/dimdenGD/OldTweetDeck/main/src/interception.js",
            ).then((r) => r.text()),
            fetch(
                "https://raw.githubusercontent.com/dimdenGD/OldTweetDeck/main/files/vendor.js",
            ).then((r) => r.text()),
            fetch(
                "https://raw.githubusercontent.com/dimdenGD/OldTweetDeck/main/files/bundle.js",
            ).then((r) => r.text()),
            fetch(
                "https://raw.githubusercontent.com/dimdenGD/OldTweetDeck/main/files/bundle.css",
            ).then((r) => r.text()),
        ]);
        if (
            remote_files.every(
                (file) => file.status === "fulfilled" && file.value.length > 30,
            )
        ) {
            [interception_js, vendor_js, bundle_js, bundle_css] = remote_files;
            console.log("Using remote files");
        }
    }

    let interception_js_script = document.createElement("script");
    interception_js_script.innerHTML = interception_js.value;
    document.head.appendChild(interception_js_script);

    let vendor_js_script = document.createElement("script");
    vendor_js_script.innerHTML = vendor_js.value;
    document.head.appendChild(vendor_js_script);

    let bundle_js_script = document.createElement("script");
    bundle_js_script.innerHTML = bundle_js.value;
    document.head.appendChild(bundle_js_script);

    let bundle_css_style = document.createElement("style");
    bundle_css_style.innerHTML = bundle_css.value;
    document.head.appendChild(bundle_css_style);

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
})();