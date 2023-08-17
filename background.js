chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if(request.action === "inject") {
        console.log(request, sender.tab.id);
        chrome.scripting.executeScript({
            target: {
                tabId: sender.tab.id,
                allFrames : true
            },
            injectImmediately: true,
            files: request.data
        }).then(res => {
            console.log('injected', res);
        }).catch(e => {
            console.log('error injecting', e);
        });
    }
});