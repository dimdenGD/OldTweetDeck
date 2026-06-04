# Open issue triage

Generated on 2026-06-04 from `dimdenGD/OldTweetDeck` open GitHub issues.

## Fixed or directly addressed

| Issue | Triage | Change |
| --- | --- | --- |
| #545 Bookmarks column behaves inconsistently with multiple accounts | Bug in local bookmark timeline state. Bookmark cursors and synthetic receive times were global, so multiple account feeds could reuse each other's pagination/order data. | Scope bookmark cursors and receive times by active account id. |
| #537 Solver init fails: "header not found" | Bug in fragile asset discovery. The challenge loader expected a narrow `ondemand.s` chunk mapping format. | Make vendor/challenge asset matching stricter where needed and add fallback matching for `ondemand.s.<hash>.js`. |
| #536 Not updating User column | Bug in endpoint interception. The bundled TweetDeck code calls both `statuses/user_timeline.json` and `statuses/following_timeline.json`, but the interceptor only handled the former. | Route both user timeline endpoint names through the same GraphQL adapter. |
| #520 Tweets from "Twitter for Advertisers" are missing in columns | Bug caused by an explicit source filter in the Home timeline adapter. | Stop dropping tweets whose source is `Twitter for Advertisers` or `advertiser-interface`. |
| #505 Searching results in | User lookup/search bug. `users/show.json` was still passed through the old REST endpoint, which can report valid accounts as missing when the endpoint is unavailable or stale. | Emulate `users/show.json` through current `UserByScreenName`/`UserByRestId` GraphQL operations and normalize GraphQL users to REST-shaped users. |
| #131 Blocked/muted account posts appear in quoted retweets | Filtering gap. Existing code filtered the primary tweet author but not quoted/retweeted embedded authors. | Add nested mute/block filtering for quoted and retweeted statuses in converted timelines. |
| #387 Accounts that are muted or blocked still appear in feed | Filtering gap. | Same nested mute/block filtering path. |
| #427 Comments from Muted & Blocked accounts still appear | Filtering gap. | Same nested mute/block filtering path. |
| #381 Desktop notifications disappear almost immediately on Windows 11 | Runtime bug. The bundled TweetDeck notification controller explicitly closed W3C desktop notifications after 5 seconds, overriding OS/browser duration settings. | Stop auto-closing desktop notifications after `onshow`; let the browser/OS manage notification lifetime. |

## Partially mitigated

| Issue | Triage | Change |
| --- | --- | --- |
| #530 Tweets not loading requires reload tab | Likely mixed external rate limits plus local throttling. | Reduce chance of returning an empty emulated Home refresh while preserving some rate-limit protection. |
| #531 Missing many tweets | Same symptom family as stale Home refresh and missing filtered tweets. | Reduced Home refresh cancellation and stopped filtering advertiser-source tweets. |
| #509 Stream updating issues | Same symptom family as stale Home refresh. | Reduced Home refresh cancellation. |
| #515 The list barely loads | Could be external rate limits, local list throttling, or stale GraphQL operation ids. | Updated current `ListLatestTweetsTimeline` query id and related cursor guards; no direct list throttle change yet. |
| #522 User searches in columns broken | Partly local throttling, partly X search/operator limitations per maintainer comment. | Updated current `SearchTimeline` query id and search refresh throttle now uses the configured refresh interval instead of a hardcoded 90 seconds. |
| #487 Home and notifications not refreshing | Broad multi-account refresh issue. | Home refresh and bookmark account scoping improved; notification behavior still needs separate investigation. |
| #488 Issue on Notifications column | Notification aggregation/deduping issue. | Notification de-dupe is now scoped by active account id and capped to avoid stale cross-account suppression; aggregation correctness still needs fixture-based validation. |
| #496 Some followed accounts will usually not show up on the Home timeline | Could be caused by source filtering, sensitive content metadata, rate limits, or X ranking. | Removed advertiser-source filtering and reduced refresh cancellation; sensitive-content handling remains unverified. |
| #499 Hiding tweets using context menu clears columns until reload | Likely interaction between local column refresh and emulated empty responses. | Reduced empty Home refresh responses; specific hide action path still needs reproduction. |
| #428 Lists disappear when switching accounts | Local state cleanup bug. Feed cleanup checked whether feed ids appeared as substrings in serialized column JSON, which can delete valid list feeds accidentally. | Feed cleanup now checks structured column values by exact id instead of substring matching; full account-switch flow still needs reproduction. |
| #511 Infinite loading | Broad loading symptom. | Solver asset fallback and timeline cursor guards may help, but issue lacks a specific reproducible path. |
| #512 Can't load | Broad loading symptom. | Solver asset fallback and current GraphQL operation ids may help, but issue lacks enough evidence. |
| #518 Cannot login/stuck at login screen | Broad login/challenge symptom. | Solver asset fallback may help if challenge init was the blocker. |
| #528 OldTweetDeck won't load on Firefox Nightly | Broad loading symptom. | Solver asset fallback may help if challenge init was the blocker. |
| #498 OldTweetDeck isn't loading | Broad loading symptom. | Solver asset fallback, current GraphQL operation ids, and safer cursor handling may help, but issue lacks a specific reproducible path. |
| #338 Desktop notification can't work on Win11 | Notification permission/API report. | Removing forced notification close may help visible notification behavior, but permission flow still needs reproduction. |

## Already present in current code or docs

| Issue | Triage |
| --- | --- |
| #535 Bookmark option | A bookmark context-menu action and bookmarks column support are already present. The requested visible icon next to Like is a UI enhancement, not a missing bookmark implementation. |
| #542 Auto-translation feature | Tweet translation endpoint support exists. The requested automatic in-place translation is a larger feature and the issue asks whether an upstream PR is welcome. |
| #497 Long tweets | Auto-expand support exists behind `localStorage.OTDenableAutoExpand === "1"`; issue asks about manual "see more" behavior with auto-expand disabled. |
| #259 Link another account you own doesn't work | README already points to the accepted workaround. |

## Not actionable from this repo alone

| Issue | Reason |
| --- | --- |
| #529 X Pro Premium+ access | Product/access-policy discussion. |
| #521 3.6.8 for Win7 | Old release/platform support; current branch changes won't update a legacy Win7 release. |
| #519 The End ? | Discussion/speculation. |
| #517 Rate limited very quick since February 2026 | Mostly X-side rate limits and usage policy; local throttling can only reduce pressure. |
| #495 Rate limit issue | Mostly X-side rate limits; local changes only reduce avoidable refresh pressure. |
| #516 Anyone having issues Feb 5th 2026? | Outage/support thread without a concrete code path. |
| #508 Bekleme Ekrani | Loading report without enough diagnostic detail beyond broad loading fixes. |
| #503 Is it safe to use oldtweetdeck again? | Safety discussion, not a code defect. |
| #501 Tweetdeck doesn't open | Support report with screenshot-only diagnostics. |
| #493 Firefox extension not verified | Distribution/signing problem, not runtime code. |
| #492 Got labeled for using OldTweetDeck | Account enforcement risk outside repo control. |
| #148 Signing Firefox builds | Release/distribution workflow requiring maintainer credentials. |
| #102 Standalone app | New product/package target, out of scope for bugfix PR. |
| #18 Safari Extension | New platform packaging target, out of scope for bugfix PR. |

## Needs deeper reproduction or separate feature work

| Issue | Notes |
| --- | --- |
| #534 Increasing upload size limit | Needs upload endpoint/limit investigation; may be X-side enforced. |
| #533 Error adding members to lists | Needs list membership endpoint reproduction. |
| #510 Adding accounts to Teams again | Needs team/delegation endpoint reproduction. |
| #507 Notifications are not arriving promptly | Needs notification polling/streaming reproduction. |
| #506 DM messages not updating/sending | Needs encrypted DM endpoint work; high risk. |
| #462 Team invitations are bugged | Needs team invitation endpoint reproduction. |
| #435 Video thumbnails/links for a specific account | Needs card/media fixture from affected account. |
| #321 Text field loses focus when using emoji selector | UI event/focus reproduction needed. |
| #233 Manually reload search columns | Feature request; may pair well with lower search auto-refresh. |
| #231 For You column additional request | New column/feed feature. |
| #221 Customizable notification sound | New settings/UI/storage feature. |
| #212 fxtwitter link copy option | New settings/UI/copy behavior feature. |
| #211 Smart reply restoration | Requires defining the original filtering heuristic. |
| #204 Shortcuts / Ctrl+Enter possibly bugged | Needs composer keyboard event reproduction. |
| #197 Mute list disappears on refresh | Needs current mute-list storage/API reproduction. |
| #106 Quote tweet link opens a new tab | Needs click-routing reproduction in TweetDeck bundle. |
