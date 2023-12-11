# OldTweetDeck
Returns old TweetDeck, for free!
  
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
7. Go to tweetdeck.twitter.com and enjoy old TweetDeck
8. [Donate to encourage continued support](https://www.patreon.com/dimdendev)

### Firefox

#### Stable

Get the extension on [Firefox Add-Ons](https://addons.mozilla.org/en-US/firefox/addon/oldtweetdeck/)

#### Nightly / Developer Edition

1. Go to [Release page](https://github.com/dimdenGD/OldTweetDeck/releases) and download `OldTweetDeckFirefox.zip`
2. Go to Firefox Configuration Editor (`about:config`)
3. Change the preference `xpinstall.signatures.required` to false
4. Go to addons page(``about:addons``)
5. Press "Install Add-on From File..." button
6. Select zip file you downloaded
7. Go to tweetdeck.twitter.com and enjoy old TweetDeck
8. [Donate to encourage continued support](https://www.patreon.com/dimdendev)
  
### Safari
NOT SUPPORTED  
  
## Updating
If TweetDeck's files were updated, you should receive updated files automatically without having to reinstall after refreshing tab (unless you set `localStorage.OTDalwaysUseLocalFiles = '1'`).  
If extension files were updated, you have to reinstall extension to get new update.  
  
## Better TweetDeck
I've made a fork of BetterTD that works with this extension, you can find it [here](https://github.com/dimdenGD/BetterTweetDeck/). Install it the same way as this extension, except get archive from [Releases](https://github.com/dimdenGD/BetterTweetDeck/releases) page instead of "Code" button.  
 
## FAQ
#### There is a warning: Manifest version 2 is deprecated, and support will be removed in 2023.
Ignore this warning.  
   
#### User or Search column aren't loading for me.
You're getting rate limited. They'll comeback after some time.  
