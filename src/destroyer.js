// Step 1: fool twitter into thinking scripts loaded
window.__SCRIPTS_LOADED__ = Object.freeze({
    main: true,
    vendor: true,
    runtime: false
});

// Step 2: continously wreck havoc
let _destroyerInt = setInterval(() => {
    delete window.webpackChunk_twitter_responsive_web;
    window.__SCRIPTS_LOADED__ = Object.freeze({
        main: true,
        vendor: true,
        runtime: false
    });
    if(document.getElementById('ScriptLoadFailure')) {
        document.getElementById('ScriptLoadFailure').remove();
    }
});

// Step 3: destroy twitter critical modules
let _originalPush = Array.prototype.push;
Array.prototype.push = function() {
    try {
        if(arguments[0]?.[0]?.[0] === "vendor" || arguments[0]?.[0]?.[0] === "main") {
            throw "Twitter killing magic killed Twitter https://lune.dimden.dev/f016efffcd3d.png (thats fine)";
        }
    } catch(e) {
        Array.prototype.push = _originalPush;
    } finally {
        return _originalPush.apply(this, arguments);
    }
}

// Step 4: prevent twitter from reporting it
let _originalTest = RegExp.prototype.test;
RegExp.prototype.test = function() {
    try {
        if(this.toString() === '/[?&]failedScript=/') {
            RegExp.prototype.test = _originalTest;
            throw "hehe";
        };
    } catch(e) {
        RegExp.prototype.test = _originalTest;
    } finally {
        return _originalTest.apply(this, arguments);
    }
}

// Step 5: self destruct
setTimeout(() => {
    clearInterval(_destroyerInt);
    Array.prototype.push = _originalPush;
    RegExp.prototype.test = _originalTest;
}, 5000);

// Step 6: Live OTD reaction: https://lune.dimden.dev/6743b45eb1de.png