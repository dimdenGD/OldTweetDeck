const PUBLIC_TOKEN = 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
const NEW_API = 'https://twitter.com/i/api/graphql';

function generateParams(features, variables, fieldToggles) {
    let params = new URLSearchParams();
    params.append('variables', JSON.stringify(variables));
    params.append('features', JSON.stringify(features));
    if(fieldToggles) params.append('fieldToggles', JSON.stringify(fieldToggles));

    return params.toString();
}

const OriginalXHR = XMLHttpRequest;
const proxyRoutes = [
    {
        path: '/1.1/statuses/user_timeline.json',
        method: 'GET',
        beforeRequest: xhr => {
            xhr.modReqHeaders['Authorization'] = PUBLIC_TOKEN;
            try {
                let url = new URL(xhr.modUrl);
                let params = new URLSearchParams(url.search);
                let user_id = params.get('user_id');
                let variables = {"count":100,"includePromotedContent":false,"withQuickPromoteEligibilityTweetFields":false,"withVoice":true,"withV2Timeline":true};
                let features = {"rweb_lists_timeline_redesign_enabled":false,"responsive_web_graphql_exclude_directive_enabled":true,"verified_phone_label_enabled":false,"creator_subscriptions_tweet_preview_api_enabled":true,"responsive_web_graphql_timeline_navigation_enabled":true,"responsive_web_graphql_skip_user_profile_image_extensions_enabled":false,"tweetypie_unmention_optimization_enabled":true,"responsive_web_edit_tweet_api_enabled":true,"graphql_is_translatable_rweb_tweet_is_translatable_enabled":true,"view_counts_everywhere_api_enabled":true,"longform_notetweets_consumption_enabled":true,"responsive_web_twitter_article_tweet_consumption_enabled":false,"tweet_awards_web_tipping_enabled":false,"freedom_of_speech_not_reach_fetch_enabled":true,"standardized_nudges_misinfo":true,"tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled":true,"longform_notetweets_rich_text_read_enabled":true,"longform_notetweets_inline_media_enabled":true,"responsive_web_media_download_video_enabled":false,"responsive_web_enhance_cards_enabled":false};
                let fieldToggles = {"withArticleRichContentState":false};
                if(!user_id) {
                    let screen_name = TD.storage.accountController.getUserIdentifier();
                    if(screen_name) {
                        variables.screenName = screen_name;
                    }
                } else {
                    variables.userId = user_id;
                }
                xhr.modUrl = `${NEW_API}/QqZBEqganhHwmU9QscmIug/UserTweets?${generateParams(features, variables, fieldToggles)}`;
            } catch(e) {
                console.error(e);
            }
        },
        afterRequest: xhr => {

        }
    }
];

// wrap the XMLHttpRequest
XMLHttpRequest = function () {
    return new Proxy(new OriginalXHR(), {
        open(method, url, async, username = null, password = null) {
            this.modMethod = method;
            this.modUrl = url;
            this.originalUrl = url;
            this.modReqHeaders = {};
            
            try {
                let parsedUrl = new URL(url);
                let proxyRoute = proxyRoutes.find(route => route.path === parsedUrl.pathname && route.method.toUpperCase() === method.toUpperCase());
                if(proxyRoute && proxyRoute.beforeRequest) {
                    proxyRoute.beforeRequest(this);
                }
            } catch(e) {
                console.error(e);
            }

            this.open(method, this.modUrl, async, username, password);
        },
        setRequestHeader(name, value) {
            this.modReqHeaders[name] = value;
        },
        send(body = null) {
            for (const [name, value] of Object.entries(this.modReqHeaders)) {
                this.setRequestHeader(name, value);
            }
            this.send(body);
        },
        get(xhr, key) {
            if (!key in xhr) return undefined;
            if(key === 'responseText') return this.interceptResponseText(xhr, xhr[key]);

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
        interceptResponseText(xhr, text) {
            return text;
        }
    });
}