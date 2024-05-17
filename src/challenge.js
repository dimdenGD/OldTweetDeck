let solveId = 0;
let solveCallbacks = {};
let solverErrored = false;

let solverIframe = document.createElement('iframe');
solverIframe.style.display = 'none';
solverIframe.src = "https://tweetdeck.dimden.dev/solver.html"; // check source code of that page to make sure its safe if u dont trust it
fetch(solverIframe.src).catch(() => {
    console.error("Cannot load solver iframe");
    solverErrored = true;
    for(let id in solveCallbacks) {
        solveCallbacks[id].reject('Solver errored');
        delete solveCallbacks[id];
    }
});
let injectedBody = document.getElementById('injected-body');
if(injectedBody) injectedBody.appendChild(solverIframe);
else {
    let int = setInterval(() => {
        injectedBody = document.getElementById('injected-body');
        if(injectedBody) {
            clearInterval(int);
            injectedBody.appendChild(solverIframe);
        }
    }, 50);
}

function uuidV4() {
    const uuid = new Array(36);
    for (let i = 0; i < 36; i++) {
      uuid[i] = Math.floor(Math.random() * 16);
    }
    uuid[14] = 4; // set bits 12-15 of time-high-and-version to 0100
    uuid[19] = uuid[19] &= ~(1 << 2); // set bit 6 of clock-seq-and-reserved to zero
    uuid[19] = uuid[19] |= (1 << 3); // set bit 7 of clock-seq-and-reserved to one
    uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
    return uuid.map((x) => x.toString(16)).join('');
}

async function readCryptoKey() {
    return new Promise((resolve, reject) => {
        let request = indexedDB.open("localforage");

        request.onerror = function(event) {
            reject(event);
        };

        request.onsuccess = function(event) {
            const db = event.target.result;

            // Open a transaction to access the keyvaluepairs object store
            if (db.objectStoreNames.contains('keyvaluepairs')) {
                const transaction = db.transaction(['keyvaluepairs'], 'readonly');
                const objectStore = transaction.objectStore('keyvaluepairs');
            
                objectStore.openCursor().onsuccess = function(event) {
                    const cursor = event.target.result;
                    if (cursor) {
                        // Check if the key matches the pattern
                        const key = cursor.key;
                        if (key.startsWith('device:rweb.dmCryptoKeys')) {
                            resolve(cursor.value);
                        }
                
                        // Move to the next entry
                        cursor.continue();
                    } else {
                        // No more entries, reject the promise
                        reject("No key found");
                    }
                };
            } else {
                reject("No key found");
            }
        };
    });
}

function solveChallenge(path, method) {
    return new Promise((resolve, reject) => {
        if(solverErrored) {
            reject('Solver errored');
            return;
        }
        let id = solveId++;
        solveCallbacks[id] = { resolve, reject, time: Date.now() };
        if(!solverIframe.contentWindow) {
            solverIframe.addEventListener('load', () => {
                solverIframe.contentWindow.postMessage({ action: 'solve', id, path, method }, '*');
                setTimeout(() => {
                    if(solveCallbacks[id]) {
                        solveCallbacks[id].reject('Solver timed out');
                        delete solveCallbacks[id];
                    }
                }, 300);
            });
        } else {
            solverIframe.contentWindow.postMessage({ action: 'solve', id, path, method }, '*');
            setTimeout(() => {
                if(solveCallbacks[id]) {
                    solveCallbacks[id].reject('Solver timed out');
                    delete solveCallbacks[id];
                }
            }, 300);
        }
    });
}

window.addEventListener('message', e => {
    if(e.source !== solverIframe.contentWindow) return;
    let data = e.data;
    if(data.action === 'solved') {
        let { id, result } = data;
        if(solveCallbacks[id]) {
            solveCallbacks[id].resolve(result);
            delete solveCallbacks[id];
        }
    } else if(data.action === 'error') {
        let { id, error } = data;
        if(solveCallbacks[id]) {
            solveCallbacks[id].reject(error);
            delete solveCallbacks[id];
        }
    } else if(data.action === 'initError') {
        console.error('Solver init error:', data.error);
        solverErrored = true;
        for(let id in solveCallbacks) {
            solveCallbacks[id].reject('Solver errored');
            delete solveCallbacks[id];
        }
    }
});

(async () => {
    try {
        try {
            let cryptoKey = await readCryptoKey();
            if(cryptoKey) {
                localStorage.device_id = cryptoKey.deviceId;
            } else if(!localStorage.device_id) {
                localStorage.device_id = uuidV4();
            }
        } catch(e) {
            console.error(`Error during device id generation:`, e);
            if(!localStorage.device_id) {
                localStorage.device_id = uuidV4();
            }
        }

        let homepageData = await fetch(`https://${location.hostname}/`).then(res => res.text());
        let dom = new DOMParser().parseFromString(homepageData, 'text/html');
        let anims = Array.from(dom.querySelectorAll('svg[id^="loading-x"]')).map(svg => svg.outerHTML);

        let challengeCode = homepageData.match(/"ondemand.s":"(\w+)"/)[1];
        let challengeData = await fetch(`https://abs.twimg.com/responsive-web/client-web/ondemand.s.${challengeCode}a.js`).then(res => res.text());

        function sendInit() {
            solverIframe.contentWindow.postMessage({
                action: 'init',
                challenge: challengeData,
                anims,
                verificationCode: dom.querySelector('meta[name="twitter-site-verification"]').content,
            }, '*');
        }
        if(solverIframe.contentWindow) {
            sendInit();
        } else {
            solverIframe.addEventListener('load', () => sendInit());
        }
    } catch (e) {
        console.error(`Error during challenge:`);
        console.error(e);
    }
})()