window.addEventListener("message", (event) => {
    if (event.data.action === "getcookie") {
        chrome.runtime.sendMessage({ action: "setcookie", cookie: document.cookie });
    }
});

(async () => {
    let html = await fetch(chrome.runtime.getURL('/files/index.html')).then(r => r.text());
    console.log(html);
    document.documentElement.innerHTML = html;
    let vendor_js = document.createElement('script');
    vendor_js.src = chrome.runtime.getURL('/files/vendor.js');
    document.head.appendChild(vendor_js);
    let bundle_js = document.createElement('script');
    bundle_js.src = chrome.runtime.getURL('/files/bundle.js');
    document.head.appendChild(bundle_js);
    let bundle_css = document.createElement('link');
    bundle_css.rel = 'stylesheet';
    bundle_css.href = chrome.runtime.getURL('/files/bundle.css');
    document.head.appendChild(bundle_css);
})();