const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('src/interception.js', 'utf8');

function setup(storage = {}) {
    let now = 0;
    const timers = [];
    const context = vm.createContext({
        localStorage: storage, location: { hostname: 'x.com' },
        XMLHttpRequest: function () {}, console, URL, URLSearchParams,
        Date: class extends Date { static now() { return now; } },
        setTimeout: resolve => timers.push(resolve),
        Event: class {}, ProgressEvent: class {},
    });
    vm.runInContext(source, context);
    const route = vm.runInContext('proxyRoutes.find(r => r.path === "/1.1/tweetdeck/clients/blackbird/all")', context);
    let state, loads = 0;
    const xhr = { onload() { loads++; state = xhr._responseText ? JSON.parse(xhr._responseText) : route.afterRequest(xhr); } };
    return { context, route, xhr, storage, get state() { return state; }, get loads() { return loads; },
        async advance(ms) { now += ms; timers.splice(0).forEach(resolve => resolve()); await Promise.resolve(); } };
}

test('fresh startup waits for verification and persists valid defaults', async () => {
    const s = setup();
    const pending = s.route.sendHandler(s.xhr);
    assert.equal(s.loads, 0);
    await s.advance(5000);
    assert.equal(s.loads, 0);
    vm.runInContext('verifiedUser = { id_str: "123" }', s.context);
    await s.advance(50);
    await pending;
    assert.equal(s.loads, 1);
    assert.equal(s.state.client.settings.default_account, 'twitter:123');
    assert.deepEqual(JSON.parse(s.storage.OTDfeeds), {});
    assert.deepEqual(JSON.parse(s.storage.OTDcolumns), {});
});

test('cached settings load without waiting for verification', async () => {
    const s = setup({ OTDsettings: JSON.stringify({ default_account: 'twitter:456', theme: 'dark' }) });
    await s.route.sendHandler(s.xhr);
    assert.equal(s.loads, 1);
    assert.equal(s.state.client.settings.theme, 'dark');
});

test('missing verification completes with an error and writes no defaults', async () => {
    const s = setup();
    const pending = s.route.sendHandler(s.xhr);
    await s.advance(20000);
    await pending;
    assert.equal(s.loads, 1);
    assert.equal(s.xhr._status, 503);
    assert.match(s.state.errors[0].message, /verification timed out/);
    assert.equal(s.storage.OTDsettings, undefined);
});
