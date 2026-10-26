// Automatic translation of tweets through Grok, the same endpoint x.com uses for "Show translation".
// Loaded by injection.js after bundle.js. Settings (localStorage):
//   OTDgrokTranslate = "0"       turns it off
//   OTDgrokTranslateLang = "ru"  target language (defaults to the browser language)
(() => {
    if(localStorage.OTDgrokTranslate === "0") return;

    const DST_LANG = (localStorage.OTDgrokTranslateLang || navigator.language || "en").split("-")[0].toLowerCase();
    const DELAY_MS = 600;     // pause between requests
    const MAX_PER_MIN = 20;   // soft cap, X's rate limit is shared with the rest of the session
    const DWELL_MS = 700;     // a tweet is translated only if it stayed on screen this long
    const MAX_FAILS = 3;
    const CACHE_MAX = 1000;   // lives in the same localStorage as OTD state, so keep it small
    const CACHE_DAYS = 7;

    const ENDPOINT_PATH = "/2/grok/translation.json";
    const ENDPOINT = `https://api.${location.hostname}${ENDPOINT_PATH}`;
    const BEARER = "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";

    const LABELS = {
        ru: { original: "Показать оригинал", translation: "Показать перевод" },
        en: { original: "Show original", translation: "Show translation" },
    };
    const LABEL = LABELS[DST_LANG] || LABELS.en;

    // X's language codes for tweets without linguistic content (media only, hashtags only, etc.)
    const NO_TEXT_LANGS = ["zxx", "qme", "qam", "qct", "qht", "qst", "art"];
    // When TweetDeck gives no lang (quoted tweets) or "und", guess by script
    const CYRILLIC_LANGS = ["ru", "uk", "be", "bg", "sr", "mk", "kk"];

    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    const getCookie = name => document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1] || "";

    const cache = (() => {
        const KEY = `OTDgrokCache_${DST_LANG}`;
        let map = new Map();
        try {
            const now = Date.now(), ttl = CACHE_DAYS * 864e5;
            for(const [id, v] of JSON.parse(localStorage.getItem(KEY) || "[]")) {
                if(now - v.t < ttl) map.set(id, v);
            }
        } catch(e) {
            console.warn("[grok-tr] broken cache, starting empty", e);
        }

        let timer = null;
        const save = () => {
            if(timer) return;
            timer = setTimeout(() => {
                timer = null;
                const entries = [...map].slice(-CACHE_MAX);
                map = new Map(entries);
                try {
                    localStorage.setItem(KEY, JSON.stringify(entries));
                } catch(e) {
                    // never let the cache take the space OTD needs for columns and feeds
                    localStorage.removeItem(KEY);
                }
            }, 3000);
        };

        return {
            has: id => map.has(id),
            get: id => map.get(id)?.text,
            set: (id, text) => { map.delete(id); map.set(id, { text, t: Date.now() }); save(); },
        };
    })();

    let pauseUntil = 0;
    let backoffMs = 60000;
    const fails = new Map();
    const queue = [];
    let stamps = [];
    let draining = false;

    // --- what to translate ---------------------------------------------------
    // A unit is a tweet text with its id: the main text of a stream item, or the text of a quoted tweet.
    function collectUnits() {
        const units = [];
        for(const item of document.querySelectorAll("article.js-stream-item[data-tweet-id]")) {
            const id = item.dataset.tweetId;
            if(!/^\d+$/.test(id)) continue;
            const text = [...item.querySelectorAll(".js-tweet-text")].find(el =>
                el.closest("article.js-stream-item") === item && !el.closest(".js-quote-detail")
            );
            if(text) units.push({ host: item, text, id });
        }
        for(const quote of document.querySelectorAll(".js-quote-detail[data-tweet-id]")) {
            const id = quote.dataset.tweetId;
            const text = quote.querySelector(".js-quoted-tweet-text");
            if(/^\d+$/.test(id) && text) units.push({ host: quote, text, id });
        }
        return units;
    }

    function needsTranslation(el) {
        const lang = (el.getAttribute("lang") || "").toLowerCase();
        if(NO_TEXT_LANGS.includes(lang)) return false;
        if(lang && lang !== "und") return lang.split("-")[0] !== DST_LANG;

        const letters = (el.textContent || "").replace(/[^\p{L}]/gu, "");
        if(letters.length < 3) return false;
        if(CYRILLIC_LANGS.includes(DST_LANG)) {
            const cyr = (letters.match(/[Ѐ-ӿ]/g) || []).length;
            return cyr / letters.length < 0.5;
        }
        return true;
    }

    function onScreen(el) {
        const r = el.getBoundingClientRect();
        if(r.height === 0 || r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) return false;
        // columns scroll on their own, the window doesn't
        const scroller = el.closest(".column-scroller");
        if(!scroller) return true;
        const b = scroller.getBoundingClientRect();
        return r.bottom > b.top && r.top < b.bottom && r.right > b.left && r.left < b.right;
    }

    // --- request --------------------------------------------------------------
    // The response is a stream of JSON objects, one per token; split them by braces rather than newlines,
    // since several objects can arrive on one line.
    function parseStream(raw) {
        let text = "", depth = 0, start = -1, inStr = false, esc = false, bad = 0;
        for(let i = 0; i < raw.length; i++) {
            const c = raw[i];
            if(inStr) {
                if(esc) esc = false;
                else if(c === "\\") esc = true;
                else if(c === '"') inStr = false;
                continue;
            }
            if(c === '"') inStr = true;
            else if(c === "{") { if(depth++ === 0) start = i; }
            else if(c === "}" && depth > 0 && --depth === 0) {
                try { text += JSON.parse(raw.slice(start, i + 1)).result?.text ?? ""; }
                catch(e) { bad++; }
            }
        }
        return { text, bad, open: depth !== 0 };
    }

    // tweet text comes back HTML-escaped (&gt; &amp;), a textarea decodes it without running markup
    const decoder = document.createElement("textarea");
    function decodeEntities(s) {
        decoder.innerHTML = s;
        return decoder.value;
    }

    async function transactionId() {
        if(typeof solveChallenge !== "function") return null;
        try {
            return await Promise.race([solveChallenge(ENDPOINT_PATH, "POST"), sleep(5000).then(() => null)]);
        } catch(e) {
            return null;
        }
    }

    async function translate(id, retry = false) {
        if(!retry && cache.has(id)) return cache.get(id);

        const headers = {
            "authorization": BEARER,
            "x-csrf-token": getCookie("ct0"),
            "x-twitter-auth-type": "OAuth2Session",
            "x-twitter-active-user": "yes",
            "x-twitter-client-language": DST_LANG,
            "content-type": "text/plain;charset=UTF-8",
        };
        if(localStorage.device_id) headers["x-client-uuid"] = localStorage.device_id;
        const tid = await transactionId();
        if(tid) headers["x-client-transaction-id"] = tid;

        const res = await fetch(ENDPOINT, {
            method: "POST",
            credentials: "include",
            headers,
            body: JSON.stringify({ content_type: "POST", dst_lang: DST_LANG, id }),
        });

        const raw = await res.text();
        // the rate limit sometimes comes as code 88 in the body instead of a 429
        if(!res.ok || /"code"\s*:\s*88\b/.test(raw)) {
            const err = new Error(`HTTP ${res.status}`);
            err.status = res.ok ? 429 : res.status;
            err.reset = Number(res.headers.get("x-rate-limit-reset")) || 0;
            throw err;
        }

        const { text, bad, open } = parseStream(raw);
        // a broken chunk is lost words, ask once more
        if((bad || open) && !retry) return translate(id, true);
        if(bad || open) console.warn(`[grok-tr] ${id}: response is still broken`, raw);
        if(!text.trim()) throw new Error("empty translation");

        const out = decodeEntities(text);
        cache.set(id, out);
        return out;
    }

    // --- rendering ------------------------------------------------------------
    const TOKEN_ID = "[a-z][a-z0-9_-]{1,20}:(?:0x[0-9a-fA-F]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})";
    const SPLIT_RE = new RegExp(`(${TOKEN_ID}|https?:\\/\\/\\S+|@\\w{1,15}|#[\\p{L}\\p{N}_]+|\\$[A-Za-z][A-Za-z0-9_]{0,14})`, "gu");
    const IS_TOKEN = new RegExp(`^${TOKEN_ID}$`);
    const IS_LINK = new RegExp(`^(?:${TOKEN_ID}|https?:\\/\\/|@|#|\\$[A-Za-z])`, "u");

    // Anchors of the original by visible text and by href: Grok returns raw t.co links,
    // while TweetDeck shows them shortened, so only the href matches.
    function linkIndex(orig) {
        const map = new Map();
        const put = (key, a) => { if(key) map.set(key.trim().toLowerCase(), a); };
        for(const a of orig.querySelectorAll("a")) {
            put(a.textContent, a);
            const href = a.getAttribute("href") || "";
            put(href, a);
            put(href.replace(/^https?:\/\//, ""), a);
        }
        return map;
    }

    function externalLink(url, text) {
        const a = document.createElement("a");
        a.href = url;
        a.textContent = text;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        return a;
    }

    // Cloned anchors keep TweetDeck's classes and data attributes, so its click handlers
    // (profile popups, hashtag search) keep working on the translation.
    function fillInline(node, text, ctx) {
        for(const part of text.split(SPLIT_RE)) {
            if(!part) continue;
            if(!IS_LINK.test(part)) { node.append(part); continue; }

            if(IS_TOKEN.test(part)) {
                // on-chain cashtags come back as "chain:contract", put the original cashtag back
                const addr = part.slice(part.indexOf(":") + 1).toLowerCase();
                const free = ctx.cash.filter(a => !ctx.cashUsed.has(a));
                const src = free.find(a => (a.getAttribute("href") || "").toLowerCase().includes(addr)) || free[0];
                if(src) { ctx.cashUsed.add(src); node.append(src.cloneNode(true)); }
                else node.append(part);
                continue;
            }

            if(/^https?:/i.test(part)) {
                // trailing punctuation isn't part of the url
                const [, url, trail] = part.match(/^(.*?)([.,!?;:)\]»"'…]*)$/);
                const key = url.toLowerCase();
                // the translator keeps links in order, so the n-th link is the n-th link of the original
                const src = ctx.links.get(key) || ctx.links.get(key.replace(/^https?:\/\//, "")) || ctx.ext[ctx.urlIdx];
                ctx.urlIdx++;
                if(src) node.append(src.cloneNode(true));
                // an unmatched t.co is a media link TweetDeck hides from the text
                else if(!/^https?:\/\/t\.co\//i.test(url)) node.append(externalLink(url, url));
                if(trail) node.append(trail);
                continue;
            }

            // mentions, hashtags, cashtags
            const src = ctx.links.get(part.trim().toLowerCase());
            if(src) { ctx.cashUsed.add(src); node.append(src.cloneNode(true)); continue; }
            const name = encodeURIComponent(part.slice(1));
            node.append(externalLink(
                part.startsWith("@") ? `https://${location.hostname}/${name}` :
                part.startsWith("$") ? `https://${location.hostname}/search?q=%24${name}&src=cashtag_click` :
                `https://${location.hostname}/hashtag/${name}`,
                part
            ));
        }
    }

    function buildNode(orig, text) {
        // an empty clone of the original keeps TweetDeck's typography
        const node = orig.cloneNode(false);
        node.classList.remove("js-tweet-text", "js-quoted-tweet-text");
        node.classList.add("otd-grok-tr");
        node.setAttribute("lang", DST_LANG);
        node.style.display = "";

        const anchors = [...orig.querySelectorAll("a")];
        fillInline(node, text, {
            links: linkIndex(orig),
            ext: anchors.filter(a => /^https?:/i.test(a.getAttribute("href") || "") && !/^[@#$]/.test(a.textContent.trim())),
            urlIdx: 0,
            cash: anchors.filter(a => /^\$/.test(a.textContent.trim())),
            cashUsed: new Set(),
        });
        return node;
    }

    function buildToggle(onToggle) {
        const el = document.createElement("a");
        el.href = "#";
        el.className = "otd-grok-toggle txt-mute";
        el.textContent = `Grok · ${LABEL.original}`;
        // stream items and quotes are clickable and draggable as a whole
        const stop = e => { e.preventDefault(); e.stopPropagation(); };
        el.addEventListener("mousedown", stop);
        el.addEventListener("click", e => { stop(e); onToggle(el); });
        return el;
    }

    // the node got reused for another tweet, remove our previous output
    function cleanup(unit) {
        const { text: orig } = unit;
        let next = orig.nextElementSibling;
        while(next && (next.classList.contains("otd-grok-tr") || next.classList.contains("otd-grok-toggle"))) {
            next.remove();
            next = orig.nextElementSibling;
        }
        orig.style.display = "";
        unit.host.classList.remove("otd-grok-translated");
        delete orig.dataset.otdGrok;
        delete orig.dataset.otdGrokDone;
    }

    function render(unit, text) {
        const { text: orig, id } = unit;
        if(!text || !orig.isConnected || orig.dataset.otdGrok !== id || orig.dataset.otdGrokDone === id) return;
        orig.dataset.otdGrokDone = id;
        // Grok echoes text that is already in the target language
        if(text.trim() === orig.textContent.trim()) return;

        const tr = buildNode(orig, text);
        const toggle = buildToggle(el => {
            const showOriginal = orig.style.display === "none";
            orig.style.display = showOriginal ? "" : "none";
            tr.style.display = showOriginal ? "none" : "";
            el.textContent = `Grok · ${showOriginal ? LABEL.translation : LABEL.original}`;
        });
        orig.after(tr, toggle);
        orig.style.display = "none";
        unit.host.classList.add("otd-grok-translated");
    }

    // --- queue ----------------------------------------------------------------
    function underLimit() {
        const now = Date.now();
        stamps = stamps.filter(t => now - t < 60000);
        return stamps.length < MAX_PER_MIN;
    }

    // a tweet that didn't get its turn goes back to the scanner for the next time it's on screen
    function release(unit) {
        if(unit.text.dataset.otdGrok === unit.id) delete unit.text.dataset.otdGrok;
    }

    async function drain() {
        if(draining) return;
        draining = true;

        try {
            while(queue.length) {
                const wait = pauseUntil - Date.now();
                if(wait > 0) { await sleep(Math.min(wait, 5000)); continue; }
                if(!underLimit()) { await sleep(5000); continue; }

                const unit = queue.shift();
                if(!unit.text.isConnected) continue;

                // don't spend requests on tweets that were only scrolled past
                const dwell = DWELL_MS - (Date.now() - unit.at);
                if(dwell > 0) await sleep(dwell);
                if(!onScreen(unit.host)) { release(unit); continue; }

                try {
                    if(!cache.has(unit.id)) stamps.push(Date.now());
                    render(unit, await translate(unit.id));
                    backoffMs = 60000;
                } catch(e) {
                    if(e.status === 429) {
                        // keep hammering and X extends the block for the whole session, wait for the reset
                        pauseUntil = e.reset ? e.reset * 1000 + 2000 : Date.now() + backoffMs;
                        backoffMs = Math.min(backoffMs * 2, 15 * 60000);
                        queue.unshift(unit);
                        console.warn(`[grok-tr] rate limited until ${new Date(pauseUntil).toLocaleTimeString()}`);
                        continue;
                    }
                    const n = (fails.get(unit.id) || 0) + 1;
                    fails.set(unit.id, n);
                    if(n < MAX_FAILS) release(unit);
                    console.warn("[grok-tr]", unit.id, e.message);
                }
                await sleep(DELAY_MS);
            }
        } finally {
            draining = false;
        }
    }

    // --- scanner --------------------------------------------------------------
    function scan() {
        for(const unit of collectUnits()) {
            const { text, id } = unit;
            const claimed = text.dataset.otdGrok;
            if(claimed === id) continue;
            if(claimed) cleanup(unit);
            if(!needsTranslation(text)) continue;

            // cached ones cost nothing, render them even off screen
            if(cache.has(id)) {
                text.dataset.otdGrok = id;
                render(unit, cache.get(id));
                continue;
            }
            if(!onScreen(unit.host)) continue;
            text.dataset.otdGrok = id;
            unit.at = Date.now();
            queue.push(unit);
        }
        drain();
    }

    let scheduled = false;
    function schedule() {
        if(scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            scan();
        });
    }

    const style = document.createElement("style");
    style.textContent = `
        .otd-grok-toggle { display: inline-block; margin-top: 4px; font-size: 12px; }
        .otd-grok-toggle:hover { text-decoration: underline; }
        .otd-grok-translated .js-translate-call-to-action { display: none; }
    `;
    // injection.js removes the original head/body of x.com once TweetDeck is in, stay on ours
    (document.getElementById("injected-head") || document.head).appendChild(style);

    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
    // scroll doesn't bubble, columns scroll on their own elements
    document.addEventListener("scroll", schedule, { capture: true, passive: true });
    setInterval(schedule, 2000);
    schedule();

    console.log(`[grok-tr] active, dst=${DST_LANG}`);
})();
