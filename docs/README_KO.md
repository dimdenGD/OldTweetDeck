# OldTweetDeck

구 트윗덱을 무료로 돌려드립니다!

> [!NOTE]
> 트위터가 좋아요를 비공개로 전환한 이후로, 좋아요 탭이 더 이상 표시되지 않습니다.  
> 이는 좋아요 정보를 불러오는 API가 삭제되었기 때문에 해결할 수 없습니다. Activity 컬럼도 동일합니다.

> 만약 2015-2018년의 트위터를 다시 사용해보고 싶으시다면, [OldTwitter](https://github.com/dimdenGD/OldTwitter) 확장 프로그램을 참고해 보세요.

![Screenshot](https://lune.dimden.dev/9713d947d56.png)

### Chromium (Chrome, Edge, Opera, Brave 등)

1. [Release 페이지](https://github.com/dimdenGD/OldTweetDeck/releases)에서 `OldTweetDeckChrome.zip` 파일을 다운로드합니다.
2. 다운로드한 ZIP 파일의 압축을 풉니다.
3. Chrome 확장 프로그램 페이지(`chrome://extensions`)로 이동합니다.
4. 우측 상단의 개발자 모드를 활성화합니다.
5. "압축해제된 확장 프로그램 로드" 버튼을 클릭합니다.
6. 방금 압축을 푼 폴더를 선택합니다.
7. https://x.com/i/tweetdeck 에서 구 트윗덱을 사용해 보세요.

### Firefox

#### Nightly / Developer Edition

1. [Release 페이지](https://github.com/dimdenGD/OldTweetDeck/releases)에서 `OldTweetDeckFirefox.zip` 파일을 다운로드합니다.
2. Firefox 설정 편집기 (`about:config`)로 이동합니다.
3. `xpinstall.signatures.required` 값을 검색해 false로 변경합니다.
4. 부가 기능 페이지(`about:addons`)로 이동합니다.
5. "파일에서 부가 기능 설치…" 버튼을 클릭합니다.
6. 다운로드한 ZIP 파일을 선택합니다.
7. https://x.com/i/tweetdeck 에서 구 트윗덱을 사용해 보세요.

#### Stable

**이 확장 프로그램을 Firefox 안정 버전에서 사용하는 것은 권장되지 않습니다.**
1. `about:debugging#/runtime/this-firefox` 페이지로 이동합니다.
2. "임시 부가 기능 로드…" 버튼을 클릭하고, 다운로드한 ZIP 파일을 선택합니다.
3. **이 방식으로 설치하면 Firefox를 종료할 때 확장 프로그램이 자동으로 제거됩니다.**

### 사파리
미지원

## 업데이트
TweetDeck 서버 측 파일이 업데이트된 경우, 탭을 새로고침하기만 하면 자동으로 최신 파일이 적용됩니다. (단, `localStorage.OTDalwaysUseLocalFiles = '1'` 값을 설정한 경우는 제외).  
확장 프로그램 자체가 업데이트된 경우에는, 최신 버전을 적용하려면 확장 프로그램을 다시 설치해야 합니다.

## Better TweetDeck

Better TweetDeck이 이 확장 프로그램과 함께 동작하도록 만든 포크가 있습니다.
[여기](https://github.com/dimdenGD/BetterTweetDeck/)에서 다운로드할 수 있으며,
설치 방법은 이 확장 프로그램과 동일합니다.
 
## FAQ

#### 확장 프로그램이 작동을 멈췄습니다.

이슈를 등록하기 전에, 먼저 확장 프로그램을 재설치해 보세요.

#### "Manifest version 2 is deprecated, and support will be removed in 2023." 라는 경고가 뜹니다.

최신 OldTweetDeck 버전으로 업데이트해 주세요.

#### '본인이 소유한 다른 계정 연결' 기능이 작동하지 않습니다.

다음 링크를 참고하세요: https://github.com/dimdenGD/OldTweetDeck/issues/259#issuecomment-2281786253

#### 사용자(User) 또는 검색(Search) 컬럼이 로딩되지 않습니다.
API Rate Limit(요청 제한)에 도달한 상태입니다. 일정 시간이 지나면 다시 정상적으로 로드됩니다.

#### 좋아요(Likes) 탭이 보이지 않습니다.

이 문제는 해결할 수 없습니다.
Twitter가 좋아요를 비공개로 전환하면서, 좋아요 정보를 불러오는 API가 제거되었습니다.


