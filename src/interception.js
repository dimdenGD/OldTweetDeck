const PUBLIC_TOKENS = [
    "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA", // w
    "Bearer AAAAAAAAAAAAAAAAAAAAAFQODgEAAAAAVHTp76lzh3rFzcHbmHVvQxYYpTw%3DckAlMINMjmCwxUcaXbAN4XqJVdgMJaHqNOFgPMK0zN1qLqLQCF", // x
];
const NEW_API = "https://twitter.com/i/api/graphql";
const cursors = {};

function getFollows(cursor = -1, count = 5000) {
	return new Promise(function (resolve, reject) {
		var xhr = new XMLHttpRequest();
		xhr.open("GET", `https://api.twitter.com/1.1/friends/ids.json?cursor=${cursor}&stringify_ids=true&count=${count}`, true);
		xhr.setRequestHeader("X-Twitter-Active-User", "yes");
		xhr.setRequestHeader("X-Twitter-Auth-Type", "OAuth2Session");
		xhr.setRequestHeader("X-Twitter-Client-Language", "en");
		xhr.setRequestHeader("Authorization", "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA");
		xhr.setRequestHeader("X-Csrf-Token", (function () {
			var csrf = document.cookie.match(/(?:^|;\s*)ct0=([0-9a-f]+)\s*(?:;|$)/);
			return csrf ? csrf[1] : "";
		})());
		xhr.withCredentials = true;

		xhr.onreadystatechange = function () {
			if (xhr.readyState === 4 && xhr.status === 200) {
				resolve(JSON.parse(xhr.responseText));
			} else if (xhr.readyState === 4 && xhr.status !== 200) {
                reject(xhr);
            }
		};
		
		xhr.send();
	});
}

let follows = JSON.parse(localStorage.OTDfollows || "[]");

function updateFollows() {
    let lastUpdate = localStorage.OTDlastFollowsUpdate;
    if(lastUpdate && Date.now() - +lastUpdate < 1000 * 60 * 60 * 12) return;
    let newfollows = [];
    let cursor = -1;
    let count = 5000;
    let i = 0;
    let get = async () => {
        let res = await getFollows(cursor, count);
        newfollows = newfollows.concat(res.ids);
        if(res.next_cursor_str === "0" || i++ > 10) {
            localStorage.OTDfollows = JSON.stringify(follows);
            follows = newfollows;
            localStorage.OTDlastFollowsUpdate = Date.now();
            return;
        }
        cursor = res.next_cursor_str;
        get();
    };

    get();
}

updateFollows();
setInterval(updateFollows, 1000 * 60);

function parseNoteTweet(result) {
    let text, entities;
    if (result.note_tweet.note_tweet_results.result) {
        text = result.note_tweet.note_tweet_results.result.text;
        entities = result.note_tweet.note_tweet_results.result.entity_set;
        if (result.note_tweet.note_tweet_results.result.richtext?.richtext_tags.length) {
            entities.richtext = result.note_tweet.note_tweet_results.result.richtext.richtext_tags; // logically, richtext is an entity, right?
        }
    } else {
        text = result.note_tweet.note_tweet_results.text;
        entities = result.note_tweet.note_tweet_results.entity_set;
    }
    return { text, entities };
}

function parseTweet(res) {
    if (typeof res !== "object") return;
    if (res.limitedActionResults) {
        let limitation = res.limitedActionResults.limited_actions.find((l) => l.action === "Reply");
        if (limitation) {
            res.tweet.legacy.limited_actions_text = limitation.prompt
                ? limitation.prompt.subtext.text
                : "This tweet has limitations to who can reply.";
        }
        res = res.tweet;
    }
    if (!res.legacy && res.tweet) res = res.tweet;
    let tweet = res.legacy;
    if (!res.core) return;
    tweet.user = res.core.user_results.result.legacy;
    tweet.user.id_str = tweet.user_id_str;
    if (res.core.user_results.result.is_blue_verified) {
        tweet.user.verified = true;
        tweet.user.verified_type = "Blue";
    }
    if (tweet.retweeted_status_result) {
        let result = tweet.retweeted_status_result.result;
        if (result.limitedActionResults) {
            let limitation = result.limitedActionResults.limited_actions.find(
                (l) => l.action === "Reply"
            );
            if (limitation) {
                result.tweet.legacy.limited_actions_text = limitation.prompt
                    ? limitation.prompt.subtext.text
                    : "This tweet has limitations to who can reply.";
            }
            result = result.tweet;
        }
        if (
            result.quoted_status_result &&
            result.quoted_status_result.result.legacy &&
            result.quoted_status_result.result.core &&
            result.quoted_status_result.result.core.user_results.result.legacy
        ) {
            result.legacy.quoted_status = result.quoted_status_result.result.legacy;
            if (result.legacy.quoted_status) {
                result.legacy.quoted_status.user =
                    result.quoted_status_result.result.core.user_results.result.legacy;
                result.legacy.quoted_status.user.id_str = result.legacy.quoted_status.user_id_str;
                if (result.quoted_status_result.result.core.user_results.result.is_blue_verified) {
                    result.legacy.quoted_status.user.verified = true;
                    result.legacy.quoted_status.user.verified_type = "Blue";
                }
            } else {
                console.warn("No retweeted quoted status", result);
            }
        }
        tweet.retweeted_status = result.legacy;
        if (tweet.retweeted_status && result.core.user_results.result.legacy) {
            tweet.retweeted_status.user = result.core.user_results.result.legacy;
            tweet.retweeted_status.user.id_str = tweet.retweeted_status.user_id_str;
            if (result.core.user_results.result.is_blue_verified) {
                tweet.retweeted_status.user.verified = true;
                tweet.retweeted_status.user.verified_type = "Blue";
            }
            tweet.retweeted_status.ext = {};
            if (result.views) {
                tweet.retweeted_status.ext.views = { r: { ok: { count: +result.views.count } } };
            }
            if (res.card && res.card.legacy && res.card.legacy.binding_values) {
                tweet.retweeted_status.card = res.card.legacy;
            }
        } else {
            console.warn("No retweeted status", result);
        }
        if (result.note_tweet && result.note_tweet.note_tweet_results) {
            let note = parseNoteTweet(result);
            tweet.retweeted_status.full_text = note.text;
            tweet.retweeted_status.entities = note.entities;
            tweet.retweeted_status.display_text_range = undefined; // no text range for long tweets
        }
    }

    if (res.quoted_status_result) {
        tweet.quoted_status_result = res.quoted_status_result;
    }
    if (res.note_tweet && res.note_tweet.note_tweet_results) {
        let note = parseNoteTweet(res);
        tweet.full_text = note.text;
        tweet.entities = note.entities;
        tweet.display_text_range = undefined; // no text range for long tweets
    }
    if (tweet.quoted_status_result) {
        let result = tweet.quoted_status_result.result;
        if (!result.core && result.tweet) result = result.tweet;
        if (result.limitedActionResults) {
            let limitation = result.limitedActionResults.limited_actions.find(
                (l) => l.action === "Reply"
            );
            if (limitation) {
                result.tweet.legacy.limited_actions_text = limitation.prompt
                    ? limitation.prompt.subtext.text
                    : "This tweet has limitations to who can reply.";
            }
            result = result.tweet;
        }
        tweet.quoted_status = result.legacy;
        if (tweet.quoted_status) {
            tweet.quoted_status.user = result.core.user_results.result.legacy;
            if (!tweet.quoted_status.user) {
                delete tweet.quoted_status;
            } else {
                tweet.quoted_status.user.id_str = tweet.quoted_status.user_id_str;
                if (result.core.user_results.result.is_blue_verified) {
                    tweet.quoted_status.user.verified = true;
                    tweet.quoted_status.user.verified_type = "Blue";
                }
                tweet.quoted_status.ext = {};
                if (result.views) {
                    tweet.quoted_status.ext.views = { r: { ok: { count: +result.views.count } } };
                }
            }
        } else {
            console.warn("No quoted status", result);
        }
    }
    if (res.card && res.card.legacy) {
        tweet.card = res.card.legacy;
        let bvo = {};
        for (let i = 0; i < tweet.card.binding_values.length; i++) {
            let bv = tweet.card.binding_values[i];
            bvo[bv.key] = bv.value;
        }
        tweet.card.binding_values = bvo;
    }
    if (res.views) {
        if (!tweet.ext) tweet.ext = {};
        tweet.ext.views = { r: { ok: { count: +res.views.count } } };
    }
    if (res.source) {
        tweet.source = res.source;
    }
    if (res.birdwatch_pivot) {
        // community notes
        tweet.birdwatch = res.birdwatch_pivot;
    }

    if (tweet.favorited && tweet.favorite_count === 0) {
        tweet.favorite_count = 1;
    }
    if (tweet.retweeted && tweet.retweet_count === 0) {
        tweet.retweet_count = 1;
    }

    return tweet;
}

function getCurrentUserId() {
    let accounts = TD.storage.accountController.getAll();
    let screen_name = TD.storage.accountController.getUserIdentifier();
    let account = accounts.find((account) => account.state.username === screen_name);
    return account.state.userId;
}

function generateParams(features, variables, fieldToggles) {
    let params = new URLSearchParams();
    params.append("variables", JSON.stringify(variables));
    params.append("features", JSON.stringify(features));
    if (fieldToggles) params.append("fieldToggles", JSON.stringify(fieldToggles));

    return params.toString();
}

let counter = 0;
const OriginalXHR = XMLHttpRequest;
const proxyRoutes = [
    // Home timeline
    {
        path: "/1.1/statuses/home_timeline.json",
        method: "GET",
        // beforeRequest: (xhr) => {
        //     try {
        //         let url = new URL(xhr.modUrl);
        //         let params = new URLSearchParams(url.search);
        //         let variables = {
        //             includePromotedContent: false,
        //             latestControlAvailable: true,
        //             count: 40,
        //             requestContext: "launch",
        //         };
        //         let features = {
        //             responsive_web_graphql_exclude_directive_enabled: true,
        //             verified_phone_label_enabled: false,
        //             responsive_web_home_pinned_timelines_enabled: true,
        //             creator_subscriptions_tweet_preview_api_enabled: true,
        //             responsive_web_graphql_timeline_navigation_enabled: true,
        //             responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
        //             c9s_tweet_anatomy_moderator_badge_enabled: true,
        //             tweetypie_unmention_optimization_enabled: true,
        //             responsive_web_edit_tweet_api_enabled: true,
        //             graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
        //             view_counts_everywhere_api_enabled: true,
        //             longform_notetweets_consumption_enabled: true,
        //             responsive_web_twitter_article_tweet_consumption_enabled: false,
        //             tweet_awards_web_tipping_enabled: false,
        //             freedom_of_speech_not_reach_fetch_enabled: true,
        //             standardized_nudges_misinfo: true,
        //             tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
        //             longform_notetweets_rich_text_read_enabled: true,
        //             longform_notetweets_inline_media_enabled: true,
        //             responsive_web_media_download_video_enabled: false,
        //             responsive_web_enhance_cards_enabled: false,
        //         };

        //         let max_id = params.get("max_id");
        //         if (max_id) {
        //             let bn = BigInt(params.get("max_id"));
        //             bn += BigInt(1);
        //             if (cursors[`home-${bn}`]) {
        //                 variables.cursor = cursors[`home-${bn}`];
        //             }
        //         }
        //         xhr.modUrl = `${NEW_API}/Qe2CCi4SE0Dvsb1TYrDfKQ/HomeLatestTimeline?${generateParams(
        //             features,
        //             variables
        //         )}`;
        //     } catch (e) {
        //         console.error(e);
        //     }
        // },
        beforeSendHeaders: (xhr) => {
            xhr.modReqHeaders["Content-Type"] = "application/json";
            xhr.modReqHeaders["X-Twitter-Active-User"] = "yes";
            xhr.modReqHeaders["X-Twitter-Client-Language"] = "en";
            xhr.modReqHeaders["Authorization"] = PUBLIC_TOKENS[1];
            delete xhr.modReqHeaders["X-Twitter-Client-Version"];
        },
        afterRequest: (xhr) => {
            let data;
            try {
                data = JSON.parse(xhr.responseText);
            } catch (e) {
                console.error(e);
                return [];
            }
            if (data.errors && data.errors[0]) {
                return [];
            }

            if(localStorage.OTDshowAllRepliesInHome === '1') {
                return data;
            } 

            let currentUserId = getCurrentUserId();
            let filtered = data.filter(t => 
                !t.in_reply_to_user_id_str || // not a reply
                t.user.id_str === currentUserId || // my tweet
                (
                    // reply to someone i follow
                    follows.includes(t.in_reply_to_user_id_str) && 
                    t.user.following
                ) ||
                (
                    // reply to me from someone i follow
                    t.in_reply_to_user_id_str === currentUserId &&
                    t.user.following
                )
            );

            if(filtered.length === 0) return data;
            else return filtered;
        }
        // responseHeaderOverride: {
        //     // slow it down a bit
        //     "x-rate-limit-limit": (value) => {
        //         if (value == "500") {
        //             return "100";
        //         }
        //         return value;
        //     },
        //     "x-rate-limit-remaining": (value, headers) => {
        //         if (headers["x-rate-limit-limit"] == "500" && value > 250) {
        //             return (+value - 400).toString();
        //         } else {
        //             return value;
        //         }
        //     },
        // },
        // afterRequest: (xhr) => {
        //     let data;
        //     try {
        //         data = JSON.parse(xhr.responseText);
        //     } catch (e) {
        //         console.error(e);
        //         return [];
        //     }
        //     if (data.errors && data.errors[0]) {
        //         return [];
        //     }
        //     let instructions = data.data.home.home_timeline_urt.instructions;
        //     let entries = instructions.find((i) => i.type === "TimelineAddEntries");
        //     if (!entries) {
        //         return [];
        //     }
        //     entries = entries.entries;
        //     let tweets = [];
        //     for (let e of entries) {
        //         // thats a lot of trash https://lune.dimden.dev/0bf524e52eb.png
        //         if (e.entryId.startsWith("tweet-")) {
        //             let res = e.content.itemContent.tweet_results.result;
        //             let tweet = parseTweet(res);
        //             if (!tweet) continue;
        //             if (
        //                 tweet.source &&
        //                 (tweet.source.includes("Twitter for Advertisers") ||
        //                     tweet.source.includes("advertiser-interface"))
        //             )
        //                 continue;
        //             if (tweet.user.blocking || tweet.user.muting) continue;

        //             tweets.push(tweet);
        //         } else if (e.entryId.startsWith("home-conversation-")) {
        //             let items = e.content.items;

        //             let pushedTweets = [];
        //             for (let i = 0; i < items.length; i++) {
        //                 let item = items[i];
        //                 if (
        //                     item.entryId.includes("-tweet-") &&
        //                     !item.entryId.includes("promoted")
        //                 ) {
        //                     let res = item.item.itemContent.tweet_results.result;
        //                     let tweet = parseTweet(res);
        //                     if (!tweet) continue;
        //                     if (
        //                         tweet.source &&
        //                         (tweet.source.includes("Twitter for Advertisers") ||
        //                             tweet.source.includes("advertiser-interface"))
        //                     )
        //                         continue;
        //                     if (tweet.user.blocking || tweet.user.muting) break;
        //                     if (item.item.feedbackInfo) {
        //                         tweet.feedback = item.item.feedbackInfo.feedbackKeys
        //                             .map(
        //                                 (f) =>
        //                                     data.data.home.home_timeline_urt.responseObjects.feedbackActions.find(
        //                                         (a) => a.key === f
        //                                     ).value
        //                             )
        //                             .filter((f) => f);
        //                         if (tweet.feedback) {
        //                             tweet.feedbackMetadata =
        //                                 item.item.feedbackInfo.feedbackMetadata;
        //                         }
        //                     }
        //                     tweets.push(tweet);
        //                     pushedTweets.push(tweet);
        //                 }
        //             }
        //         }
        //     }

        //     if (tweets.length === 0) return tweets;

        //     // i didn't know they return tweets unsorted???
        //     tweets.sort(
        //         (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        //     );

        //     let cursor = entries.find(
        //         (e) =>
        //             e.entryId.startsWith("sq-cursor-bottom-") ||
        //             e.entryId.startsWith("cursor-bottom-")
        //     );
        //     if (cursor) {
        //         cursors[`${xhr.storage.user_id}-${tweets[tweets.length - 1].id_str}`] =
        //             cursor.content.value;
        //     }

        //     return tweets;
        // },
    },
    // List timeline
    {
        path: "/1.1/lists/statuses.json",
        method: "GET",
        // beforeRequest: (xhr) => {
        //     try {
        //         let url = new URL(xhr.modUrl);
        //         let params = new URLSearchParams(url.search);
        //         let variables = { count: 40 };
        //         let features = {
        //             rweb_lists_timeline_redesign_enabled: false,
        //             responsive_web_graphql_exclude_directive_enabled: true,
        //             verified_phone_label_enabled: false,
        //             creator_subscriptions_tweet_preview_api_enabled: true,
        //             responsive_web_graphql_timeline_navigation_enabled: true,
        //             responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
        //             tweetypie_unmention_optimization_enabled: true,
        //             responsive_web_edit_tweet_api_enabled: true,
        //             graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
        //             view_counts_everywhere_api_enabled: true,
        //             longform_notetweets_consumption_enabled: true,
        //             responsive_web_twitter_article_tweet_consumption_enabled: false,
        //             tweet_awards_web_tipping_enabled: false,
        //             freedom_of_speech_not_reach_fetch_enabled: true,
        //             standardized_nudges_misinfo: true,
        //             tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
        //             longform_notetweets_rich_text_read_enabled: true,
        //             longform_notetweets_inline_media_enabled: true,
        //             responsive_web_media_download_video_enabled: false,
        //             responsive_web_enhance_cards_enabled: false,
        //         };

        //         let list_id = params.get("list_id");
        //         let max_id = params.get("max_id");
        //         if (max_id) {
        //             let bn = BigInt(params.get("max_id"));
        //             bn += BigInt(1);
        //             if (cursors[`list-${list_id}-${bn}`]) {
        //                 variables.cursor = cursors[`list-${list_id}-${bn}`];
        //             }
        //         }
        //         variables.listId = list_id;
        //         xhr.storage.list_id = list_id;
        //         xhr.modUrl = `${NEW_API}/2Vjeyo_L0nizAUhHe3fKyA/ListLatestTweetsTimeline?${generateParams(
        //             features,
        //             variables
        //         )}`;
        //     } catch (e) {
        //         console.error(e);
        //     }
        // },
        beforeSendHeaders: (xhr) => {
            xhr.modReqHeaders["Content-Type"] = "application/json";
            xhr.modReqHeaders["X-Twitter-Active-User"] = "yes";
            xhr.modReqHeaders["X-Twitter-Client-Language"] = "en";
            xhr.modReqHeaders["Authorization"] = PUBLIC_TOKENS[1];
            delete xhr.modReqHeaders["X-Twitter-Client-Version"];
        },
        // afterRequest: (xhr) => {
        //     let data;
        //     try {
        //         data = JSON.parse(xhr.responseText);
        //     } catch (e) {
        //         console.error(e);
        //         return [];
        //     }
        //     if (data.errors && data.errors[0]) {
        //         return [];
        //     }
        //     let list = data.data.list.tweets_timeline.timeline.instructions.find(
        //         (i) => i.type === "TimelineAddEntries"
        //     );
        //     if (!list) return [];
        //     list = list.entries;
        //     let tweets = [];
        //     for (let e of list) {
        //         if (e.entryId.startsWith("tweet-")) {
        //             let res = e.content.itemContent.tweet_results.result;
        //             let tweet = parseTweet(res);
        //             if (tweet) {
        //                 tweets.push(tweet);
        //             }
        //         } else if (e.entryId.startsWith("list-conversation-")) {
        //             let lt = e.content.items;
        //             for (let i = 0; i < lt.length; i++) {
        //                 let t = lt[i];
        //                 if (t.entryId.includes("-tweet-")) {
        //                     let res = t.item.itemContent.tweet_results.result;
        //                     let tweet = parseTweet(res);
        //                     if (!tweet) continue;
        //                     tweets.push(tweet);
        //                 }
        //             }
        //         }
        //     }

        //     if (tweets.length === 0) return tweets;

        //     // i didn't know they return tweets unsorted???
        //     tweets.sort(
        //         (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        //     );

        //     let cursor = list.find(
        //         (e) =>
        //             e.entryId.startsWith("sq-cursor-bottom-") ||
        //             e.entryId.startsWith("cursor-bottom-")
        //     );
        //     if (cursor) {
        //         cursors[`list-${xhr.storage.list_id}-${tweets[tweets.length - 1].id_str}`] =
        //             cursor.content.value;
        //     }

        //     return tweets;
        // },
    },
    // User timeline
    {
        path: "/1.1/statuses/user_timeline.json",
        method: "GET",
        beforeRequest: (xhr) => {
            try {
                let url = new URL(xhr.modUrl);
                let params = new URLSearchParams(url.search);
                let user_id = params.get("user_id");
                let variables = {
                    count: 20,
                    includePromotedContent: false,
                    withQuickPromoteEligibilityTweetFields: false,
                    withVoice: true,
                    withV2Timeline: true,
                };
                let features = {
                    rweb_lists_timeline_redesign_enabled: false,
                    responsive_web_graphql_exclude_directive_enabled: true,
                    verified_phone_label_enabled: false,
                    creator_subscriptions_tweet_preview_api_enabled: true,
                    responsive_web_graphql_timeline_navigation_enabled: true,
                    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
                    tweetypie_unmention_optimization_enabled: true,
                    responsive_web_edit_tweet_api_enabled: true,
                    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
                    view_counts_everywhere_api_enabled: true,
                    longform_notetweets_consumption_enabled: true,
                    responsive_web_twitter_article_tweet_consumption_enabled: false,
                    tweet_awards_web_tipping_enabled: false,
                    freedom_of_speech_not_reach_fetch_enabled: true,
                    standardized_nudges_misinfo: true,
                    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
                    longform_notetweets_rich_text_read_enabled: true,
                    longform_notetweets_inline_media_enabled: true,
                    responsive_web_media_download_video_enabled: false,
                    responsive_web_enhance_cards_enabled: false,
                };

                if (!user_id) {
                    variables.userId = getCurrentUserId();
                } else {
                    variables.userId = user_id;
                }
                let max_id = params.get("max_id");
                if (max_id) {
                    let bn = BigInt(params.get("max_id"));
                    bn += BigInt(1);
                    if (cursors[`${variables.userId}-${bn}`]) {
                        variables.cursor = cursors[`${variables.userId}-${bn}`];
                    }
                }
                xhr.storage.user_id = variables.userId;

                xhr.modUrl = `${NEW_API}/wxoVeDnl0mP7VLhe6mTOdg/UserTweetsAndReplies?${generateParams(
                    features,
                    variables
                )}`;
            } catch (e) {
                console.error(e);
            }
        },
        beforeSendHeaders: (xhr) => {
            xhr.modReqHeaders["Content-Type"] = "application/json";
            xhr.modReqHeaders["X-Twitter-Active-User"] = "yes";
            xhr.modReqHeaders["X-Twitter-Client-Language"] = "en";
            xhr.modReqHeaders["Authorization"] =
                PUBLIC_TOKENS[localStorage.OTDuseDifferentToken === "1" ? 1 : 0];
            delete xhr.modReqHeaders["X-Twitter-Client-Version"];
        },
        afterRequest: (xhr) => {
            let data;
            try {
                data = JSON.parse(xhr.responseText);
            } catch (e) {
                console.error(e);
                return [];
            }
            if (data.errors && data.errors[0]) {
                return [];
            }
            let instructions = data.data.user.result.timeline_v2.timeline.instructions;
            let entries = instructions.find((e) => e.type === "TimelineAddEntries");
            if (!entries) {
                return [];
            }
            entries = entries.entries;
            let tweets = [];
            for (let entry of entries) {
                if (entry.entryId.startsWith("tweet-")) {
                    let result = entry.content.itemContent.tweet_results.result;
                    let tweet = parseTweet(result);
                    if (tweet) {
                        tweets.push(tweet);
                    }
                } else if (entry.entryId.startsWith("profile-conversation-")) {
                    let items = entry.content.items;
                    for (let i = 0; i < items.length; i++) {
                        let item = items[i];
                        let result = item.item.itemContent.tweet_results.result;
                        if (item.entryId.includes("-tweet-")) {
                            let tweet = parseTweet(result);
                            if (tweet && tweet.user.id_str === xhr.storage.user_id) {
                                tweets.push(tweet);
                            }
                        }
                    }
                }
            }

            if (tweets.length === 0) return tweets;

            // i didn't know they return tweets unsorted???
            tweets.sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            let cursor = entries.find(
                (e) =>
                    e.entryId.startsWith("sq-cursor-bottom-") ||
                    e.entryId.startsWith("cursor-bottom-")
            ).content.value;
            if (cursor) {
                cursors[`${xhr.storage.user_id}-${tweets[tweets.length - 1].id_str}`] = cursor;
            }

            let pinEntry = instructions.find((e) => e.type === "TimelinePinEntry");
            if (
                pinEntry &&
                pinEntry.entry &&
                pinEntry.entry.content &&
                pinEntry.entry.content.itemContent
            ) {
                let result = pinEntry.entry.content.itemContent.tweet_results.result;
                let pinnedTweet = parseTweet(result);
                if (pinnedTweet) {
                    let tweetTimes = tweets.map((t) => [
                        t.id_str,
                        new Date(t.created_at).getTime(),
                    ]);
                    tweetTimes.push([
                        pinnedTweet.id_str,
                        new Date(pinnedTweet.created_at).getTime(),
                    ]);
                    tweetTimes.sort((a, b) => b[1] - a[1]);
                    let index = tweetTimes.findIndex((t) => t[0] === pinnedTweet.id_str);
                    if (index !== tweets.length) {
                        tweets.splice(index, 0, pinnedTweet);
                    }
                }
            }

            return tweets;
        },
    },
    // Notifications
    {
        path: "/1.1/activity/about_me.json",
        method: "GET",
        // beforeRequest: (xhr) => {
        //     try {
        //         let url = new URL(xhr.modUrl);
        //         let params = new URLSearchParams(url.search);
        //         let max_id = params.get("max_id");

        //         let cursor;
        //         if(max_id) {
        //             let bn = BigInt(params.get("max_id"));
        //             bn += BigInt(1);
        //             if (cursors[`notifs-${bn}`]) {
        //                 cursor = cursors[`notifs-${bn}`];
        //             }
        //         }

        //         xhr.modUrl = `https://twitter.com/i/api/2/notifications/all.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&include_ext_has_nft_avatar=1&include_ext_is_blue_verified=1&include_ext_verified_type=1&include_ext_profile_image_shape=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_ext_alt_text=true&include_ext_limited_action_results=true&include_quote_count=true&include_reply_count=1&tweet_mode=extended&include_ext_views=true&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&include_ext_sensitive_media_warning=true&include_ext_trusted_friends_metadata=true&send_error_codes=true&simple_quoted_tweet=true&count=20&requestContext=launch&ext=mediaStats%2ChighlightedLabel%2ChasNftAvatar%2CvoiceInfo%2CbirdwatchPivot%2CsuperFollowMetadata%2CunmentionInfo%2CeditControl${cursor ? `&cursor=${cursor}` : ''}`;
        //     } catch (e) {
        //         console.error(e);
        //     }
        // },
        beforeSendHeaders: (xhr) => {
            xhr.modReqHeaders["Content-Type"] = "application/json";
            xhr.modReqHeaders["X-Twitter-Active-User"] = "yes";
            xhr.modReqHeaders["X-Twitter-Client-Language"] = "en";
            xhr.modReqHeaders["Authorization"] = PUBLIC_TOKENS[1];
            delete xhr.modReqHeaders["X-Twitter-Client-Version"];
        },
        // afterRequest: (xhr) => {
        //     let data;
        //     try {
        //         data = JSON.parse(xhr.responseText);
        //     } catch (e) {
        //         console.error(e);
        //         return [];
        //     }
        //     if (data.errors && data.errors[0]) {
        //         return [];
        //     }
        // },
    },
    // Mentions timeline
    {
        path: "/1.1/statuses/mentions_timeline.json",
        method: "GET",
        beforeSendHeaders: (xhr) => {
            xhr.modReqHeaders["Content-Type"] = "application/json";
            xhr.modReqHeaders["X-Twitter-Active-User"] = "yes";
            xhr.modReqHeaders["X-Twitter-Client-Language"] = "en";
            xhr.modReqHeaders["Authorization"] = PUBLIC_TOKENS[1];
            delete xhr.modReqHeaders["X-Twitter-Client-Version"];
        },
    },
    // User likes timeline
    {
        path: "/1.1/favorites/list.json",
        method: "GET",
        beforeSendHeaders: (xhr) => {
            xhr.modReqHeaders["Content-Type"] = "application/json";
            xhr.modReqHeaders["X-Twitter-Active-User"] = "yes";
            xhr.modReqHeaders["X-Twitter-Client-Language"] = "en";
            xhr.modReqHeaders["Authorization"] = PUBLIC_TOKENS[1];
            delete xhr.modReqHeaders["X-Twitter-Client-Version"];
        },
    },
    // Liking / unliking
    {
        path: /\/1\.1\/favorites\/.*\.json/,
        method: "POST",
        beforeSendHeaders: (xhr) => {
            xhr.modReqHeaders["X-Twitter-Active-User"] = "yes";
            xhr.modReqHeaders["X-Twitter-Client-Language"] = "en";
            xhr.modReqHeaders["Authorization"] = PUBLIC_TOKENS[1];
            delete xhr.modReqHeaders["X-Twitter-Client-Version"];
        },
    },
    // Collections
    {
        path: /\/1\.1\/collections\/.*\.json/,
        method: "GET",
        beforeSendHeaders: (xhr) => {
            xhr.modReqHeaders["X-Twitter-Active-User"] = "yes";
            xhr.modReqHeaders["X-Twitter-Client-Language"] = "en";
            xhr.modReqHeaders["Authorization"] = PUBLIC_TOKENS[1];
            delete xhr.modReqHeaders["X-Twitter-Client-Version"];
        },
    },
    {
        path: /\/1\.1\/collections\/.*\.json/,
        method: "POST",
        beforeSendHeaders: (xhr) => {
            xhr.modReqHeaders["X-Twitter-Active-User"] = "yes";
            xhr.modReqHeaders["X-Twitter-Client-Language"] = "en";
            xhr.modReqHeaders["Authorization"] = PUBLIC_TOKENS[1];
            delete xhr.modReqHeaders["X-Twitter-Client-Version"];
        },
    },
    // Search
    {
        path: "/1.1/search/universal.json",
        method: "GET",
        beforeRequest: (xhr) => {
            try {
                let url = new URL(xhr.modUrl);
                let params = new URLSearchParams(url.search);
                let variables = {
                    rawQuery: params.get("q"),
                    count: 40,
                    querySource: "typed_query",
                    product: "Latest",
                };
                let features = {
                    rweb_lists_timeline_redesign_enabled: false,
                    responsive_web_graphql_exclude_directive_enabled: true,
                    verified_phone_label_enabled: false,
                    creator_subscriptions_tweet_preview_api_enabled: true,
                    responsive_web_graphql_timeline_navigation_enabled: true,
                    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
                    tweetypie_unmention_optimization_enabled: true,
                    responsive_web_edit_tweet_api_enabled: true,
                    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
                    view_counts_everywhere_api_enabled: true,
                    longform_notetweets_consumption_enabled: true,
                    responsive_web_twitter_article_tweet_consumption_enabled: false,
                    tweet_awards_web_tipping_enabled: false,
                    freedom_of_speech_not_reach_fetch_enabled: true,
                    standardized_nudges_misinfo: true,
                    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
                    longform_notetweets_rich_text_read_enabled: true,
                    longform_notetweets_inline_media_enabled: true,
                    responsive_web_media_download_video_enabled: false,
                    responsive_web_enhance_cards_enabled: false,
                };

                xhr.modUrl = `${NEW_API}/nK1dw4oV3k4w5TdtcAdSww/SearchTimeline?${generateParams(
                    features,
                    variables
                )}`;
            } catch (e) {
                console.error(e);
            }
        },
        beforeSendHeaders: (xhr) => {
            xhr.modReqHeaders["Content-Type"] = "application/json";
            xhr.modReqHeaders["X-Twitter-Active-User"] = "yes";
            xhr.modReqHeaders["X-Twitter-Client-Language"] = "en";
            xhr.modReqHeaders["Authorization"] =
                PUBLIC_TOKENS[localStorage.OTDuseDifferentToken === "1" ? 1 : 0];
            delete xhr.modReqHeaders["X-Twitter-Client-Version"];
        },
        afterRequest: (xhr) => {
            let data;
            try {
                data = JSON.parse(xhr.responseText);
            } catch (e) {
                console.error(e);
                return [];
            }
            if (data.errors && data.errors[0]) {
                return [];
            }
            let instructions = data.data.search_by_raw_query.search_timeline.timeline.instructions;
            let entries = instructions.find((i) => i.entries);
            if (!entries) {
                return [];
            }
            entries = entries.entries;
            let res = [];
            for (let entry of entries) {
                if (entry.entryId.startsWith("sq-I-t-") || entry.entryId.startsWith("tweet-")) {
                    let result = entry.content.itemContent.tweet_results.result;

                    if (entry.content.itemContent.promotedMetadata) {
                        continue;
                    }
                    let tweet = parseTweet(result);
                    if (!tweet) {
                        continue;
                    }
                    res.push(tweet);
                }
            }
            let cursor = entries.find(
                (e) =>
                    e.entryId.startsWith("sq-cursor-bottom-") ||
                    e.entryId.startsWith("cursor-bottom-")
            );
            if (cursor) {
                cursor = cursor.content.value;
            } else {
                cursor = instructions.find(
                    (e) =>
                        e.entry_id_to_replace &&
                        (e.entry_id_to_replace.startsWith("sq-cursor-bottom-") ||
                            e.entry_id_to_replace.startsWith("cursor-bottom-"))
                );
                if (cursor) {
                    cursor = cursor.entry.content.value;
                } else {
                    cursor = null;
                }
            }

            return {
                metadata: {
                    cursor,
                    refresh_interval_in_sec: 30,
                },
                modules: res.map((t) => ({ status: { data: t } })),
            };
        },
    },
    // User search
    {
        path: "/1.1/users/search.json",
        method: "GET",
        beforeRequest: (xhr) => {
            try {
                let url = new URL(xhr.modUrl);
                let params = new URLSearchParams(url.search);
                let variables = {
                    rawQuery: params.get("q"),
                    count: 20,
                    querySource: "typed_query",
                    product: "People",
                };
                let features = {
                    rweb_lists_timeline_redesign_enabled: false,
                    responsive_web_graphql_exclude_directive_enabled: true,
                    verified_phone_label_enabled: false,
                    creator_subscriptions_tweet_preview_api_enabled: true,
                    responsive_web_graphql_timeline_navigation_enabled: true,
                    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
                    tweetypie_unmention_optimization_enabled: true,
                    responsive_web_edit_tweet_api_enabled: true,
                    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
                    view_counts_everywhere_api_enabled: true,
                    longform_notetweets_consumption_enabled: true,
                    responsive_web_twitter_article_tweet_consumption_enabled: false,
                    tweet_awards_web_tipping_enabled: false,
                    freedom_of_speech_not_reach_fetch_enabled: true,
                    standardized_nudges_misinfo: true,
                    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
                    longform_notetweets_rich_text_read_enabled: true,
                    longform_notetweets_inline_media_enabled: true,
                    responsive_web_media_download_video_enabled: false,
                    responsive_web_enhance_cards_enabled: false,
                };

                xhr.modUrl = `${NEW_API}/nK1dw4oV3k4w5TdtcAdSww/SearchTimeline?${generateParams(
                    features,
                    variables
                )}`;
            } catch (e) {
                console.error(e);
            }
        },
        beforeSendHeaders: (xhr) => {
            xhr.modReqHeaders["Content-Type"] = "application/json";
            xhr.modReqHeaders["X-Twitter-Active-User"] = "yes";
            xhr.modReqHeaders["X-Twitter-Client-Language"] = "en";
            xhr.modReqHeaders["Authorization"] =
                PUBLIC_TOKENS[localStorage.OTDuseDifferentToken === "1" ? 1 : 0];
            delete xhr.modReqHeaders["X-Twitter-Client-Version"];
        },
        afterRequest: (xhr) => {
            let data;
            try {
                data = JSON.parse(xhr.responseText);
            } catch (e) {
                console.error(e);
                return [];
            }
            if (data.errors && data.errors[0]) {
                return [];
            }
            let instructions = data.data.search_by_raw_query.search_timeline.timeline.instructions;
            let entries = instructions.find((i) => i.entries);
            if (!entries) {
                return [];
            }
            entries = entries.entries;
            let res = [];
            for (let entry of entries) {
                if (entry.entryId.startsWith("sq-I-u-") || entry.entryId.startsWith("user-")) {
                    let result = entry.content.itemContent.user_results.result;
                    if (!result || !result.legacy) {
                        console.log("Bug: no user", entry);
                        continue;
                    }
                    let user = result.legacy;
                    user.id_str = result.rest_id;
                    res.push(user);
                }
            }
            let cursor = entries.find(
                (e) =>
                    e.entryId.startsWith("sq-cursor-bottom-") ||
                    e.entryId.startsWith("cursor-bottom-")
            );
            if (cursor) {
                cursor = cursor.content.value;
            } else {
                cursor = instructions.find(
                    (e) =>
                        e.entry_id_to_replace &&
                        (e.entry_id_to_replace.startsWith("sq-cursor-bottom-") ||
                            e.entry_id_to_replace.startsWith("cursor-bottom-"))
                );
                if (cursor) {
                    cursor = cursor.entry.content.value;
                } else {
                    cursor = null;
                }
            }

            return res;
        },
    },
    // Tweet creation
    {
        path: "/1.1/statuses/update.json",
        method: "POST",
        beforeRequest: (xhr) => {
            xhr.modUrl = `https://twitter.com/i/api/graphql/tTsjMKyhajZvK4q76mpIBg/CreateTweet`;
        },
        beforeSendHeaders: (xhr) => {
            xhr.modReqHeaders["Content-Type"] = "application/json";
            xhr.modReqHeaders["X-Twitter-Active-User"] = "yes";
            xhr.modReqHeaders["X-Twitter-Client-Language"] = "en";
            xhr.modReqHeaders["Authorization"] = PUBLIC_TOKENS[1];
            delete xhr.modReqHeaders["X-Twitter-Client-Version"];
        },
        beforeSendBody: (xhr, body) => {
            let params = Object.fromEntries(new URLSearchParams(body));
            console.log(params);
            let variables = {
                tweet_text: params.status,
                media: {
                    media_entities: [],
                    possibly_sensitive: false,
                },
                withDownvotePerspective: false,
                withReactionsMetadata: false,
                withReactionsPerspective: false,
                withSuperFollowsTweetFields: true,
                withSuperFollowsUserFields: true,
                semantic_annotation_ids: [],
                dark_request: false,
            };
            if (params.in_reply_to_status_id) {
                variables.reply = {
                    in_reply_to_tweet_id: params.in_reply_to_status_id,
                    exclude_reply_user_ids: [],
                };
                if (params.exclude_reply_user_ids) {
                    variables.reply.exclude_reply_user_ids =
                        params.exclude_reply_user_ids.split(",");
                }
            }
            if (params.media_ids) {
                variables.media.media_entities = params.media_ids
                    .split(",")
                    .map((id) => ({ media_id: id, tagged_users: [] }));
            }
            if (params.attachment_url) {
                variables.attachment_url = params.attachment_url;
            }

            return JSON.stringify({
                variables,
                features: {
                    tweetypie_unmention_optimization_enabled: true,
                    responsive_web_edit_tweet_api_enabled: true,
                    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
                    view_counts_everywhere_api_enabled: true,
                    longform_notetweets_consumption_enabled: true,
                    responsive_web_twitter_article_tweet_consumption_enabled: false,
                    tweet_awards_web_tipping_enabled: false,
                    longform_notetweets_rich_text_read_enabled: true,
                    longform_notetweets_inline_media_enabled: true,
                    responsive_web_graphql_exclude_directive_enabled: true,
                    verified_phone_label_enabled: false,
                    freedom_of_speech_not_reach_fetch_enabled: true,
                    standardized_nudges_misinfo: true,
                    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
                    responsive_web_media_download_video_enabled: false,
                    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
                    responsive_web_graphql_timeline_navigation_enabled: true,
                    responsive_web_enhance_cards_enabled: false,
                },
                fieldToggles: {
                    withArticleRichContentState: false,
                    withAuxiliaryUserLabels: false,
                },
                queryId: "tTsjMKyhajZvK4q76mpIBg",
            });
        },
        afterRequest: (xhr) => {
            let data;
            try {
                data = JSON.parse(xhr.responseText);
            } catch (e) {
                console.error(e);
                return {};
            }
            if (data.errors && data.errors[0]) {
                return {};
            }
            let tweet = parseTweet(data.data.create_tweet.tweet_results.result);
            return tweet;
        },
    },
    // Retweeting
    {
        path: /\/1.1\/statuses\/retweet\/(\d+).json/,
        method: "POST",
        beforeRequest: (xhr) => {
            let originalUrl = new URL(xhr.originalUrl);
            xhr.storage.tweet_id = originalUrl.pathname.match(
                /\/1.1\/statuses\/retweet\/(\d+).json/
            )[1];
            xhr.storage.retweeter = getCurrentUserId();
            xhr.modUrl = `https://twitter.com/i/api/graphql/ojPdsZsimiJrUGLR1sjUtA/CreateRetweet`;
        },
        beforeSendHeaders: (xhr) => {
            xhr.modReqHeaders["Content-Type"] = "application/json";
            xhr.modReqHeaders["X-Twitter-Active-User"] = "yes";
            xhr.modReqHeaders["X-Twitter-Client-Language"] = "en";
            xhr.modReqHeaders["Authorization"] =
                PUBLIC_TOKENS[localStorage.OTDuseDifferentToken === "1" ? 1 : 0];
            delete xhr.modReqHeaders["X-Twitter-Client-Version"];
            if (xhr.modReqHeaders["x-act-as-user-id"]) {
                xhr.storage.retweeter = xhr.modReqHeaders["x-act-as-user-id"];
            }
        },
        beforeSendBody: (xhr, body) => {
            return JSON.stringify({
                variables: {
                    tweet_id: xhr.storage.tweet_id,
                    dark_request: false,
                },
                queryId: "ojPdsZsimiJrUGLR1sjUtA",
            });
        },
        afterRequest: (xhr) => {
            let data;
            try {
                data = JSON.parse(xhr.responseText);
            } catch (e) {
                console.error(e);
                return {};
            }
            if (data.errors && data.errors[0]) {
                return {};
            }
            let res = data.data.create_retweet.retweet_results.result;
            let tweet = res.legacy;
            tweet.id_str = res.rest_id;
            if (!tweet.user) {
                tweet.user = {
                    id_str: xhr.storage.retweeter,
                };
            }
            return tweet;
        },
    },
    // Unretweeting
    {
        path: /\/1.1\/statuses\/unretweet\/(\d+).json/,
        method: "POST",
        beforeRequest: (xhr) => {
            let originalUrl = new URL(xhr.originalUrl);
            xhr.storage.tweet_id = originalUrl.pathname.match(
                /\/1.1\/statuses\/unretweet\/(\d+).json/
            )[1];
            xhr.storage.retweeter = getCurrentUserId();
            xhr.modUrl = `https://twitter.com/i/api/graphql/iQtK4dl5hBmXewYZuEOKVw/DeleteRetweet`;
        },
        beforeSendHeaders: (xhr) => {
            xhr.modReqHeaders["Content-Type"] = "application/json";
            xhr.modReqHeaders["X-Twitter-Active-User"] = "yes";
            xhr.modReqHeaders["X-Twitter-Client-Language"] = "en";
            xhr.modReqHeaders["Authorization"] =
                PUBLIC_TOKENS[localStorage.OTDuseDifferentToken === "1" ? 1 : 0];
            delete xhr.modReqHeaders["X-Twitter-Client-Version"];
            if (xhr.modReqHeaders["x-act-as-user-id"]) {
                xhr.storage.retweeter = xhr.modReqHeaders["x-act-as-user-id"];
            }
        },
        beforeSendBody: (xhr, body) => {
            return JSON.stringify({
                variables: { source_tweet_id: xhr.storage.tweet_id, dark_request: false },
                queryId: "iQtK4dl5hBmXewYZuEOKVw",
            });
        },
        afterRequest: (xhr) => {
            let data;
            try {
                data = JSON.parse(xhr.responseText);
            } catch (e) {
                console.error(e);
                return {};
            }
            if (data.errors && data.errors[0]) {
                return {};
            }
            let res = data.data.unretweet.source_tweet_results.result;
            let tweet = res.legacy;
            tweet.id_str = res.rest_id;
            if (!tweet.user) {
                tweet.user = {
                    id_str: xhr.storage.retweeter,
                };
            }
            return tweet;
        },
    },
    // Getting tweet details
    {
        path: /\/1.1\/statuses\/show\/(\d+).json/,
        method: "GET",
        beforeRequest: (xhr) => {
            let originalUrl = new URL(xhr.originalUrl);
            xhr.storage.tweet_id = originalUrl.pathname.match(
                /\/1.1\/statuses\/show\/(\d+).json/
            )[1];
            xhr.modUrl = `https://twitter.com/i/api/graphql/KwGBbJZc6DBx8EKmyQSP7g/TweetDetail?variables=${encodeURIComponent(
                JSON.stringify({
                    focalTweetId: xhr.storage.tweet_id,
                    with_rux_injections: false,
                    includePromotedContent: false,
                    withCommunity: true,
                    withQuickPromoteEligibilityTweetFields: true,
                    withBirdwatchNotes: true,
                    withVoice: true,
                    withV2Timeline: true,
                })
            )}&features=${encodeURIComponent(
                JSON.stringify({
                    rweb_lists_timeline_redesign_enabled: false,
                    blue_business_profile_image_shape_enabled: true,
                    responsive_web_graphql_exclude_directive_enabled: true,
                    verified_phone_label_enabled: false,
                    creator_subscriptions_tweet_preview_api_enabled: false,
                    responsive_web_graphql_timeline_navigation_enabled: true,
                    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
                    tweetypie_unmention_optimization_enabled: true,
                    vibe_api_enabled: true,
                    responsive_web_edit_tweet_api_enabled: true,
                    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
                    view_counts_everywhere_api_enabled: true,
                    longform_notetweets_consumption_enabled: true,
                    tweet_awards_web_tipping_enabled: false,
                    freedom_of_speech_not_reach_fetch_enabled: true,
                    standardized_nudges_misinfo: true,
                    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: false,
                    interactive_text_enabled: true,
                    responsive_web_text_conversations_enabled: false,
                    longform_notetweets_rich_text_read_enabled: true,
                    longform_notetweets_inline_media_enabled: false,
                    responsive_web_enhance_cards_enabled: false,
                })
            )}`;
        },
        beforeSendHeaders: (xhr) => {
            xhr.modReqHeaders["Content-Type"] = "application/json";
            xhr.modReqHeaders["X-Twitter-Active-User"] = "yes";
            xhr.modReqHeaders["X-Twitter-Client-Language"] = "en";
            xhr.modReqHeaders["Authorization"] =
                PUBLIC_TOKENS[localStorage.OTDuseDifferentToken === "1" ? 1 : 0];
            delete xhr.modReqHeaders["X-Twitter-Client-Version"];
        },
        afterRequest: (xhr) => {
            let data;
            try {
                data = JSON.parse(xhr.responseText);
            } catch (e) {
                console.error(e);
                return {};
            }
            if (data.errors && data.errors[0]) {
                return {};
            }
            let ic = data.data.threaded_conversation_with_injections_v2.instructions
                .find((i) => i.type === "TimelineAddEntries")
                .entries.find((e) => e.entryId === `tweet-${xhr.storage.tweet_id}`)
                .content.itemContent;
            let res = ic.tweet_results.result;
            let tweet = parseTweet(res);
            return tweet;
        },
    },
    // Tweet deletion
    {
        path: /\/1.1\/statuses\/destroy\/(\d+).json/,
        method: "POST",
        beforeRequest: (xhr) => {
            let originalUrl = new URL(xhr.originalUrl);
            xhr.storage.tweet_id = originalUrl.pathname.match(
                /\/1.1\/statuses\/destroy\/(\d+).json/
            )[1];
            xhr.modUrl = `https://twitter.com/i/api/graphql/VaenaVgh5q5ih7kvyVjgtg/DeleteTweet`;
        },
        beforeSendHeaders: (xhr) => {
            xhr.modReqHeaders["Content-Type"] = "application/json";
            xhr.modReqHeaders["X-Twitter-Active-User"] = "yes";
            xhr.modReqHeaders["X-Twitter-Client-Language"] = "en";
            xhr.modReqHeaders["Authorization"] =
                PUBLIC_TOKENS[localStorage.OTDuseDifferentToken === "1" ? 1 : 0];
            delete xhr.modReqHeaders["X-Twitter-Client-Version"];
        },
        beforeSendBody: (xhr, body) => {
            return JSON.stringify({
                variables: { tweet_id: xhr.storage.tweet_id, dark_request: false },
                queryId: "VaenaVgh5q5ih7kvyVjgtg",
            });
        },
    },
    // Tweet replies
    {
        path: /\/2\/timeline\/conversation\/(\d+).json/,
        method: "GET",
        beforeRequest: (xhr) => {
            let originalUrl = new URL(xhr.originalUrl);
            let params = new URLSearchParams(originalUrl.search);

            params.delete("ext");
            params.delete("include_ext_has_nft_avatar");
            params.delete("include_ext_is_blue_verified");
            params.delete("include_ext_verified_type");
            params.delete("include_ext_sensitive_media_warning");
            params.delete("include_ext_media_color");

            originalUrl.search = params.toString();

            xhr.modUrl = originalUrl.toString();
        },
        afterRequest: (xhr) => {
            let data;
            try {
                data = JSON.parse(xhr.responseText);
            } catch (e) {
                console.error(e);
                return data;
            }
            if (data.errors && data.errors[0]) {
                return data;
            }
            for (let id in data.globalObjects.tweets) {
                let tweet = data.globalObjects.tweets[id];

                if (!tweet.contributors) tweet.contributors = null;
                if (tweet.conversation_id_str)
                    tweet.conversation_id = parseInt(tweet.conversation_id_str);
                if (!tweet.coordinates) tweet.coordinates = null;
                if (!tweet.conversation_muted) tweet.conversation_muted = false;
                if (!tweet.favorited) tweet.favorited = false;
                if (!tweet.geo) tweet.geo = null;
                if (!tweet.id) tweet.id = parseInt(id);
                if (!tweet.in_reply_to_screen_name) tweet.in_reply_to_screen_name = null;
                if (!tweet.in_reply_to_status_id) tweet.in_reply_to_status_id = null;
                if (!tweet.in_reply_to_status_id_str) tweet.in_reply_to_status_id_str = null;
                if (!tweet.in_reply_to_user_id) tweet.in_reply_to_user_id = null;
                if (!tweet.in_reply_to_user_id_str) tweet.in_reply_to_user_id_str = null;
                if (!tweet.is_quote_status) tweet.is_quote_status = false;
                if (!tweet.place) tweet.place = null;
                if (!tweet.supplemental_language) tweet.supplemental_language = null;
                if (!tweet.retweeted) tweet.retweeted = false;
                if (!tweet.truncated) tweet.truncated = false;
                if (!tweet.user_id) tweet.user_id = parseInt(tweet.user_id_str);
            }

            for (let id in data.globalObjects.users) {
                let user = data.globalObjects.users[id];

                if (!user.default_profile) user.default_profile = false;
                if (!user.default_profile_image) user.default_profile_image = false;
                if (!user.entities.description) user.entities.description = { urls: [] };
                if (!user.entities.description.urls) user.entities.description.urls = [];
                if (!user.entities.url) user.entities.url = { urls: [] };
                if (!user.entities.url.urls) user.entities.url.urls = [];
                if (!user.follow_request_sent) user.follow_request_sent = false;
                if (!user.following) user.following = false;
                if (!user.has_extended_profile) user.has_extended_profile = false;
                if (!user.is_translation_enabled) user.is_translation_enabled = false;
                if (!user.is_translator) user.is_translator = false;
                if (!user.followed_by) user.followed_by = false;
                if (!user.id) user.id = parseInt(id);
                if (!user.lang) user.lang = null;
                if (!user.notifications) user.notifications = false;
                if (!user.profile_background_color) user.profile_background_color = "C0DEED";
                if (!user.profile_background_image_url)
                    user.profile_background_image_url =
                        "http://abs.twimg.com/images/themes/theme1/bg.png";
                if (!user.profile_background_image_url_https)
                    user.profile_background_image_url_https =
                        "https://abs.twimg.com/images/themes/theme1/bg.png";
                if (!user.profile_background_tile) user.profile_background_tile = false;
                if (!user.profile_link_color) user.profile_link_color = "1DA1F2";
                if (!user.profile_image_url && user.profile_image_url_https)
                    user.profile_image_url = user.profile_image_url_https.replace(
                        "https://",
                        "http://"
                    );
                if (!user.profile_sidebar_border_color)
                    user.profile_sidebar_border_color = "000000";
                if (!user.profile_sidebar_fill_color) user.profile_sidebar_fill_color = "DDEEF6";
                if (!user.profile_text_color) user.profile_text_color = "333333";
                if (!user.profile_use_background_image) user.profile_use_background_image = true;
                if (!user.protected) user.protected = false;
                if (!user.require_some_consent) user.require_some_consent = false;
                if (!user.time_zone) user.time_zone = null;
                if (!user.utc_offset) user.utc_offset = null;
                if (!user.verified) user.verified = false;
            }

            let entries = data.timeline.instructions.find((i) => i.addEntries);
            if (entries) {
                entries.addEntries.entries = entries.addEntries.entries.filter(
                    (e) => !e.entryId.startsWith("tweetComposer-")
                );
                for (let entry of entries.addEntries.entries) {
                    if (entry.entryId.startsWith("conversationThread-")) {
                        let newContent = {
                            item: {
                                content: {
                                    conversationThread: {
                                        conversationComponents: [],
                                    },
                                },
                            },
                        };
                        if (entry.content.timelineModule.items)
                            for (let item of entry.content.timelineModule.items) {
                                if (item.item && item.item.content && item.item.content.tweet) {
                                    newContent.item.content.conversationThread.conversationComponents.push(
                                        {
                                            conversationTweetComponent: {
                                                tweet: item.item.content.tweet,
                                            },
                                        }
                                    );
                                }
                            }
                        entry.content = newContent;
                    }
                }
            }

            return data;
        },
    },
    // TweetDeck state
    {
        path: "/1.1/tweetdeck/clients/blackbird/all",
        method: "GET",
        afterRequest: (xhr) => {
            // Save state to localstorage in case twitter shuts this api down so I can restore it for users later
            if (xhr.status === 200 && xhr.responseText.length > 100) {
                try {
                    JSON.parse(xhr.responseText);
                    localStorage.setItem("OTD_tweetdeck_state", xhr.responseText);
                } catch (e) {
                    console.error(e);
                }
            }

            return xhr.responseText;
        },
    },
];

// wrap the XMLHttpRequest
XMLHttpRequest = function () {
    return new Proxy(new OriginalXHR(), {
        open(method, url, async, username = null, password = null) {
            this.modMethod = method;
            this.modUrl = url;
            this.originalUrl = url;
            this.modReqHeaders = {};
            this.storage = {};

            try {
                let parsedUrl = new URL(url);
                this.proxyRoute = proxyRoutes.find((route) => {
                    if (route.method.toUpperCase() !== method.toUpperCase()) return false;
                    if (typeof route.path === "string") {
                        return route.path === parsedUrl.pathname;
                    } else if (route.path instanceof RegExp) {
                        return route.path.test(parsedUrl.pathname);
                    }
                });
            } catch (e) {
                console.error(e);
            }
            if (this.proxyRoute && this.proxyRoute.beforeRequest) {
                this.proxyRoute.beforeRequest(this);
            }

            this.open(method, this.modUrl, async, username, password);
        },
        setRequestHeader(name, value) {
            this.modReqHeaders[name] = value;
        },
        send(body = null) {
            if (this.proxyRoute && this.proxyRoute.beforeSendHeaders) {
                this.proxyRoute.beforeSendHeaders(this);
            }
            for (const [name, value] of Object.entries(this.modReqHeaders)) {
                this.setRequestHeader(name, value);
            }
            if (this.proxyRoute && this.proxyRoute.beforeSendBody) {
                body = this.proxyRoute.beforeSendBody(this, body);
            }
            this.send(body);
        },
        get(xhr, key) {
            if (!key in xhr) return undefined;
            if (key === "responseText") return this.interceptResponseText(xhr);

            let value = xhr[key];
            if (typeof value === "function") {
                value = this[key] || value;
                return (...args) => value.apply(xhr, args);
            } else {
                return value;
            }
        },
        set(xhr, key, value) {
            if (key in xhr) {
                xhr[key] = value;
            }
            return value;
        },
        interceptResponseText(xhr) {
            if (xhr.proxyRoute && xhr.proxyRoute.afterRequest) {
                let out = xhr.proxyRoute.afterRequest(xhr);
                if (typeof out === "object") {
                    return JSON.stringify(out);
                } else {
                    return out;
                }
            }
            return xhr.responseText;
        },
        getAllResponseHeaders() {
            let headers = this.getAllResponseHeaders();

            if (this.proxyRoute && this.proxyRoute.responseHeaderOverride) {
                let splitHeaders = headers.split("\r\n");
                let objHeaders = {};
                for (let header of splitHeaders) {
                    let splitHeader = header.split(": ");
                    let headerName = splitHeader[0];
                    let headerValue = splitHeader[1];
                    objHeaders[headerName.toLowerCase()] = headerValue;
                }
                for (let i in splitHeaders) {
                    let header = splitHeaders[i];
                    let splitHeader = header.split(": ");
                    let headerName = splitHeader[0];
                    let headerValue = splitHeader[1];
                    if (this.proxyRoute.responseHeaderOverride[headerName.toLowerCase()]) {
                        splitHeaders[i] = `${headerName}: ${this.proxyRoute.responseHeaderOverride[
                            headerName.toLowerCase()
                        ](headerValue, objHeaders)}`;
                    }
                }
                headers = splitHeaders.join("\r\n");
            }

            return headers;
        },
    });
};
