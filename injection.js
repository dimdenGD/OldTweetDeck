window.addEventListener("message", (event) => {
    if (event.data.action === "getcookie") {
        chrome.runtime.sendMessage({ action: "setcookie", cookie: document.cookie });
    }
});

(async () => {
    let html = await fetch(chrome.runtime.getURL('/files/index.html')).then(r => r.text());
    document.documentElement.innerHTML = html;
    let [
        vendor_js,
        bundle_js,
        bundle_css,
        remote_vendor_js,
        remote_bundle_js,
        remote_bundle_css
    ] = await Promise.allSettled([
        fetch(chrome.runtime.getURL('/files/vendor.js')).then(r => r.text()),
        fetch(chrome.runtime.getURL('/files/bundle.js')).then(r => r.text()),
        fetch(chrome.runtime.getURL('/files/bundle.css')).then(r => r.text()),
        fetch('https://raw.githubusercontent.com/dimdenGD/OldTweetDeck/main/files/vendor.js').then(r => r.text()),
        fetch('https://raw.githubusercontent.com/dimdenGD/OldTweetDeck/main/files/bundle.js').then(r => r.text()),
        fetch('https://raw.githubusercontent.com/dimdenGD/OldTweetDeck/main/files/bundle.css').then(r => r.text())
    ]);
    let vendor_js_script = document.createElement('script');
    if(remote_vendor_js.status === 'fulfilled' && !localStorage.getItem('OTDalwaysUseLocalFiles')) {
        vendor_js_script.innerHTML = remote_vendor_js.value;
    } else {
        vendor_js_script.innerHTML = vendor_js.value;
    }
    document.head.appendChild(vendor_js_script);
    let bundle_js_script = document.createElement('script');
    if(remote_bundle_js.status === 'fulfilled' && !localStorage.getItem('OTDalwaysUseLocalFiles')) {
        bundle_js_script.innerHTML = remote_bundle_js.value;
    } else {
        bundle_js_script.innerHTML = bundle_js.value;
    }
    document.head.appendChild(bundle_js_script);
    let bundle_css_style = document.createElement('style');
    if(remote_bundle_css.status === 'fulfilled' && !localStorage.getItem('OTDalwaysUseLocalFiles')) {
        bundle_css_style.innerHTML = remote_bundle_css.value;
    } else {
        bundle_css_style.innerHTML = bundle_css.value;
    }
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