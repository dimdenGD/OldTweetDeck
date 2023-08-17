(async () => {
    let [
        index_html,
        bundle_css,
    ] = await Promise.all([
        fetch(chrome.runtime.getURL(`files/index.html`)).then(response => response.text()),
        fetch(chrome.runtime.getURL(`files/bundle.css`)).then(response => response.text()),
    ]);

    document.documentElement.innerHTML = index_html;

    let style = document.createElement('style');
    style.innerHTML = bundle_css;
    document.head.appendChild(style);
    console.log(1);

    chrome.runtime.sendMessage({
        action: "inject",
        data: [
            "files/vendor.js",
            "files/bundle.js"
        ]
    });
})();