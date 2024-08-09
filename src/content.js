window.addEventListener('message', e => {
    if(e.data === 'extensionId') {
        let extId = chrome.runtime.getURL('/injection.js').split("/")[2];
        window.postMessage({ extensionId: extId }, '*');
    }
});