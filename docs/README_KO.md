# OldTweetDeck
옛날 트윗덱을 공짜로 되돌립니다!
현재 쉽게 설치하는 방법은 없지만, 이 리포지토리를 다운하고 크롬/엣지/오페라/웨일 등의 다른 크로미움 브라우저에 이용하능합니다.
  
2015년과 2018년의 트위터를 다시 이용하는 것에 관심있다면, [OldTwitter](https://github.com/dimdenGD/OldTwitter) 확장프로그램도 한번 보세요.  
  
![Screenshot](https://lune.dimden.dev/9713d947d56.png)  

## 설치
### 크로미움 (크롬, 엣지, 오페라, Brave, 웨일 등) 
1. [배포 페이지](https://github.com/dimdenGD/OldTweetDeck/releases)로 가서 `OldTweetDeckChrome.zip`을 다운로드 합니다.
2. 파일의 압축을 풉니다.
3. 확장 프로그램 페이지(``chrome://extensions``)로 접속합니다.
4. 개발자 모드를 활성화 합니다. (페이지 어딘가에 스위치가 있을 것입니다.)
5. "압축해제된 확장프로그램을 로드합니다" 버튼을 누릅니다.
6. 압축해제한 파일의 폴더를 선택합니다.
7. tweetdeck.twitter.com으로 가서 옛날 트윗덱을 즐깁니다.
8. [지속적인 지원을 위해 기부해주시면 감사합니다](https://www.patreon.com/dimdendev)

### 파이어폭스
#### Nightly / 개발자 버전
1. [배포 페이지](https://github.com/dimdenGD/OldTweetDeck/releases)로 가서 `OldTweetDeckFirefox.zip`을 다운로드 합니다.
2. Firefox Configuration Editor (`about:config`)로 접속합니다.
3. `xpinstall.signatures.required`을 검색하여 false로 바꿔줍니다.
4. 부가 기능 관리자 페이지(``about:addons``)에 접속합니다
5. "파일에서 부가 기능 설치..." 버튼을 누릅니다.
6. 다운로드한 zip 파일을 선택합니다.
7. tweetdeck.twitter.com으로 가서 옛날 트윗덱을 즐깁니다.
8. [지속적인 지원을 위해 기부해주시면 감사합니다](https://www.patreon.com/dimdendev)

#### 안정 버전
**안정 버전에서 확장프로그램을 이용하는 것은 추천하지 않습니다.**
1. `about:debugging#/runtime/this-firefox`으로 갑니다.
2. "임시 부가 기능 로드..."를 누르고 다운로드한 zip 파일을 선택합니다.
3. **이 방법으로 파이어폭스에 설치할 경우, 브라우저가 닫히고 나서 삭제될 것입니다.**

### 사파리
지원안함

## 업데이트
트윗덱 서버쪽의 파일이 업데이트 되면, (설정에서 `localStorage.OTDalwaysUseLocalFiles = 1`을 작성하지 않았을 경우) 재설치할 필요 없이 새로고침만으로 자동으로 새로운 파일이 업데이트 됩니다.
확장 프로그램 파일 자체가 업데이트 되면, 확장프로그램을 삭제후 재설치 하세요.

역주) 근데 계속 프로그래밍 하면서 봤는데 직접 새버전을 다운받아서 삭제후 재설치 하는게 제일 확실한 방법입니다.
서버에서 제대로 못받아오는 경우가 있어요.

## Better TweetDeck
Better TweetDeck이 이 확장프로그램과 장동하도록 만든 포크가 있습니다, [여기](https://github.com/dimdenGD/BetterTweetDeck/)에서 찾을 수 있으며. 이 확장프로그램과 같은 방식으로 설치할 수 있으며, [릴리즈 페이지](https://github.com/dimdenGD/BetterTweetDeck/releases)에서 반드시 다운로드해야 합나다.  
 
## FAQ
#### Manifest version 2 is deprecated, and support will be removed in 2023. 이라는 경고가 뜹니다.
무시하세요
 
## ~~투명한 면책조항~~
옛날 정보는 만료되었습니다.
확장프로그램을 manifest v2로 다시 만들었고, 외부서버가 필요하지 않습니다.

## 한국어 번역
[@han_eirin](https://twitter.com/han_eirin)