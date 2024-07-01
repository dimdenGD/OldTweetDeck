# OldTweetDeck

Returns old TweetDeck, for free!  
> [!IMPORTANT]
> Do not use Search columns unless you have X Premium subscription.  
> If you do search for something (not recommended), remove the column immediately after you're done.  

> [!NOTE]
> Since Twitter made likes private, the Likes tab aren't loading anymore.  
> This can not be fixed since the API to retrieve the likes is gone. Same thing with Activity column.

> If you're interested in getting 2015-2018 Twitter back, you can also check out [OldTwitter](https://github.com/dimdenGD/OldTwitter) extension.

![Screenshot](https://lune.dimden.dev/9713d947d56.png)

### Other languages

[한국어 README](docs/README_KO.md)  
[日本語 README](docs/README_JA.md)

## Installation

Note: Do not delete the extension files (unzipped archive for Chromium, zip file for Firefox) after installation.

### Chromium (Chrome, Edge, Opera, Brave, Etc.)

1. Go to [Release page](https://github.com/dimdenGD/OldTweetDeck/releases) and download `OldTweetDeckChrome.zip`
2. Unzip the archive
3. Go to extentions page (`chrome://extensions`)
4. Enable developer mode (there should be switch somewhere on that page)
5. Press "Load unpacked" button
6. Select folder with unzipped archive
7. Go to https://x.com/i/tweetdeck and enjoy old TweetDeck
8. [Donate to encourage continued support](https://www.patreon.com/dimdendev)

### Firefox

#### Nightly / Developer Edition

1. Go to [Release page](https://github.com/dimdenGD/OldTweetDeck/releases) and download `OldTweetDeckFirefox.zip`
2. Go to Firefox Configuration Editor (`about:config`)
3. Change the preference `xpinstall.signatures.required` to false
4. Go to addons page(`about:addons`)
5. Press "Install Add-on From File..." button
6. Select zip file you downloaded
7. Go to https://x.com/i/tweetdeck and enjoy old TweetDeck
8. [Donate to encourage continued support](https://www.patreon.com/dimdendev)

#### Stable

**It's not recommended to use this extension on Stable version.**

1. Go to `about:debugging#/runtime/this-firefox`
2. Press "Load Temporary Add-on" and select zip file you downloaded
3. **Installing this way on Firefox will remove it after closing browser.**

### Safari

NOT SUPPORTED

## Updating

If TweetDeck's files were updated, you should receive updated files automatically without having to reinstall after refreshing tab (unless you set `localStorage.OTDalwaysUseLocalFiles = '1'`).  
If extension files were updated, you have to reinstall extension to get new update.

## Better TweetDeck

I've made a fork of BetterTD that works with this extension, you can find it [here](https://github.com/dimdenGD/BetterTweetDeck/releases).  
Install it the same way as this extension.

## FAQ

#### Extension stopped working.

Before opening an issue, try to reinstall extension.

#### There is a warning: Manifest version 2 is deprecated, and support will be removed in 2023.

Ignore this warning.

#### User or Search column aren't loading for me.

You're getting rate limited. They'll comeback after some time.

#### Likes tab aren't loading for me.

This can not be fixed. Since Twitter made likes private, the API to retrive likes are gone.
