# AOMG 리뉴얼 — 기준 레퍼런스 분석

> 값의 상태 표기: **reference**(Kode 실측) · **adjusted**(실측 근거로 조정) · **temporary**(레퍼런스에 없어 정한 최소값) · **needs-check**(미확정) · **decision-needed**(사용자 결정 필요)
> 모든 수치의 원본은 `tokens.json`. 이 문서는 근거와 적용 규칙을 설명한다.
> 구현: 순수 HTML/CSS/JS 정적 사이트 (`index.html`, `artist.html`). 실측 원본 기록은 `docs/kode-reference-measurements.md`.

---

## 1. 기준 레퍼런스 정보

| 항목 | 내용 |
|---|---|
| 사이트명 | KODE Immersive |
| URL | https://kodeimmersive.com/ |
| 분석 일자 | 2026-10-26 |
| 분석 방법 | 실제 브라우저에서 1440×900 뷰포트로 열고 Computed Style과 CSS 규칙을 직접 추출. 섹션별 스크롤 화면 확인 |
| 기술 스택 | Nuxt(Vue) + Tailwind CSS, 주요 비주얼은 WebGL canvas |
| 분석한 페이지 | 메인페이지 1장 (원페이지 사이트) |
| 상세페이지 참고 URL | **없음.** Kode에는 하위 페이지가 없음(외부 링크는 kodemedia.com과 mailto뿐). 상세페이지는 메인페이지 패턴을 응용해 설계 (6장) |

### 분석한 주요 섹션

| 순서 | Kode 섹션 | 높이(1440×900) | 패딩 | 배경 | 내용 |
|---|---|---|---|---|---|
| 0 | 프리로더 | 100vh | — | 검정 | 로고 + `[ ENTER ]` 입장 버튼, 숫자 카운터 |
| 1 | 히어로 | 100vh | 0 | 오렌지 + WebGL | "INNOVATE WITH PURPOSE" + 3D 셰브론 오브젝트 |
| 2 | sub-hero | 100vh | 0 22px | 오렌지 | 34px 소개 문단을 5열 그리드에 배치 |
| 3 | justified-text-01 | 1420px | 128px 0 | 흰색 | 120px 콘덴스드 세리프 양쪽 정렬 문장 |
| 4 | logo-draw | 814px | 96px 22px | 흰색 | 긁어서 드러나는 로고 canvas + 짧은 문단 |
| 5 | services | 9900px | 0 | 흰색 | 스크롤 고정 구간. 200px 숫자 00→1→2→3과 단계명 전환, PREV/NEXT |
| 6 | justified-text-02 | 1406px | 112px 0 256px | 흰색 | 양쪽 정렬 대형 문장, 내부 간격 160px |
| 7 | footer | 100vh | 0 | 검정 | 대표·연락처·도시, 대형 링크, 뉴스레터, 배경 3D |
| 고정 | 하단 바 | 60px | 0 22px | 투명 | 3열: 로고 / `[ SOUND ON ]` / CONTACT |

### GNB / Footer 구조
- **GNB**: `position: fixed`, 높이 50px, 좌우 22px, 배경 투명, 대문자 16px 텍스트 링크
- **하단 바**: `position: fixed; bottom: 0`, 60px, 3열 그리드
- **Footer**: 100vh 검정 섹션. 좌측 대표·연락처, 우측 대형 링크와 뉴스레터

### AOMG 적용 구조
- 메인: GNB는 섹션 앵커(`Now Playing / Artists / Releases / Live / News`)로 이동
- 메인 → 상세: Artist Universe의 아티스트를 누르면 `artist.html?id=[slug]`로 이동
- 상세 → 메인: 브라우저 뒤로가기 + `[ BACK TO ARTISTS ]` 링크 + GNB(메인 해당 섹션 앵커로 이동)
- 하단 바 자리 = **고정 미니 플레이어** (메인·상세 공통. 페이지 이동 시 sessionStorage로 트랙·재생 위치 유지)

### 리뉴얼 브랜드에 적용할 이유
1. **사운드가 UI의 일부다.** `[ SOUND ON ]` 토글과 하단 고정 바가 AOMG의 "Audio On + 미니 플레이어" 구조와 그대로 맞는다.
2. **타이포가 곧 비주얼이다.** 120~200px 콘덴스드 세리프와 대문자 산세리프만으로 화면을 채운다. 이미지 품질이 고르지 않은 AOMG 기존 자산을 타이포로 받쳐줄 수 있다.
3. **Before & After 차이가 크다.** 현재 AOMG는 Squarespace 기본 템플릿의 인스타 이미지 피드다. 3색 팔레트, full-bleed, 초대형 타이포로 바꾸면 차이가 즉시 보인다.
4. **절제된 시스템이다.** 색 3개, radius 0, shadow 없음, 굵기 1개. 토큰으로 옮기기 쉽고 AI가 장식을 덧붙일 여지가 적다.

---

## 2. 한글 콘텐츠 적용 기준

> **문체 기준은 `copy-strategy.md` 3장으로 확정** (jy-ux-lab.md는 출처 확인 불가로 사용하지 않음).
> ~~jy-ux-lab.md를 받지 못해 문체 기준은 needs-check.~~ 아래는 레퍼런스 구조에서 나온 규칙이며, jy-ux-lab.md를 받으면 문체·표현 밀도 항목을 갱신한다.

### 공통 원칙
- 모든 한글 문구는 `copy-strategy.md` 3장의 문체, 정보 구조, 표현 밀도를 기준으로 작성한다.
- Kode의 영문 카피 구조를 그대로 번역하지 않는다. "INNOVATE WITH PURPOSE" 같은 선언형 영문 카피는 **영문 그대로** 두고, 한글은 정보 전달용으로 쓴다.
- **영문 = 브랜드 표현, 한글 = 정보 전달.** 초대형 디스플레이(display-0, display-4)는 영문 고유명사(아티스트명, 앨범명, 연도)만 쓴다.

### 용도별 분리

| 용도 | 언어 | 토큰 | 글자 수 기준(temporary) |
|---|---|---|---|
| 히어로 제목 | 영문 (릴리즈명) | display-0 | 한 줄 12자 이내, 최대 3줄 |
| 히어로 서브타이틀 | 한글 | ko-lead | 1~2문장, 40자 이내 |
| 섹션 제목 | 영문 + 한글 보조 | display-1 + ko-caption | 영문 2~3단어, 한글 15자 이내 |
| 본문 | 한글 | ko-body | 한 줄 35~40자(`--readable-max: 40em`), 문단 3~4줄 |
| CTA | 영문 대괄호 | body-1 | `[ LISTEN ]`, `[ WATCH ]`, `[ TICKETS ]` 1~2단어 |
| 날짜·장소 | 숫자 + 영문/한글 | body-6 | `2026.11.14 — SEOUL, YES24 LIVE HALL` 형식 |

### 한글 타이포 조정값과 이유

| 레퍼런스 | 값 | 한글 조정 | 이유 |
|---|---|---|---|
| display-0 | 120px / lh 0.9 / 400 | **ko-display 80px / lh 1.1 / 700** | 한글은 글자 폭이 넓어 120px이면 한 줄 4~5자. 양쪽 정렬 시 공백이 과도함. 0.9 행간은 받침이 겹침. 400은 초대형에서 획이 약함 |
| display-1 | 60px / lh 0.9 | **ko-title 39px / lh 1.25** | 같은 비율(약 2/3) 축소, 행간 확보 |
| display-3 | 34px / lh 0.9 | **ko-lead 26px / lh 1.45** | 영문 대문자 행간을 한글 문단에 쓰면 줄이 붙음 |
| body-4 | 18px / lh 0.95 | **ko-body 17px / lh 1.65** | 본문 가독성 |
| letter-spacing | normal / -0.08em | **-0.01 ~ -0.03em** | 한글은 기본 자간이 넓어 보여 소폭 좁힘. -0.08em은 한글에서 글자가 붙음 |
| text-transform | uppercase | 해당 없음 | 한글에는 대소문자가 없음. 영문 라벨에만 적용 |

---

## 3. Layout System

| 항목 | 값 | 상태 |
|---|---|---|
| body/background | html 배경색이 섹션 배경 역할. 섹션별로 배경 전환(오렌지→흰색→검정) | reference |
| 전체 페이지 최대 폭 | 없음 (100%) | reference |
| 콘텐츠 컨테이너 max-width | 없음 | reference |
| 본문 단락 최대 폭 | 40em | temporary (한글 줄 길이 제어) |
| 좌우 padding | mobile 10px / 768px 이상 22px | reference |
| grid column | mobile 6열 / 768px 이상 5열 | reference |
| gutter (column gap) | 10px | reference |
| row gap | 0 (카드 목록만 40px) | reference / temporary |
| section 간 간격 | 0. 섹션 자체 패딩으로 리듬 | reference |
| section 패딩 | 96 / 112 / 128 / 256px, 내부 블록 간격 160px | reference |
| section 패딩 (모바일) | 데스크톱의 50% | temporary (모바일 실측 needs-check) |
| 제목 → 본문 | 40px | temporary |
| 본문 → CTA | 32px | temporary |
| card padding / gap | 0 / 가로 10px, 세로 40px | temporary |
| breakpoint | 390px(유동 타이포 시작), 768px(레이아웃 전환), 1440px(타이포 최대) | reference |
| sticky | 하단 바, GNB 고정. services 섹션 스크롤 고정 | reference |
| full-bleed | 전 섹션 | reference |
| split / asymmetric | 5열 중 2:3 비대칭 배치 | reference(sub-hero) → adjusted |

### 메인·상세 공통 컨테이너 규칙
- 두 페이지 모두 `max-width` 없음, 좌우 패딩 22/10px, 5열/6열 그리드를 공유한다.
- 상세페이지만 다른 컨테이너를 만들지 않는다.

### 상세페이지 레이아웃 패턴
- **상단 비주얼**: 100vh. 5열 중 좌측 2열에 1:1 프로필 이미지, 우측 3열에 아티스트명(display-0)
- **본문 영역**: 5열 중 2:3 분할. 좌측 2열에 섹션 라벨, 우측 3열에 소개 문단(ko-body, 최대 40em)
- **관련 콘텐츠 영역**: 5열 카드 그리드 (릴리즈 1:1, 영상 16:9, 공연 4:5)

---

## 4. Typography System

### font-family

| 역할 | Kode 실측 | AOMG 적용 (temporary) | 비고 |
|---|---|---|---|
| 디스플레이 | OT Brut (콘덴스드 세리프) | Instrument Serif | OT Brut는 유료. Google Fonts 무료 대체 |
| 산세리프 | Aeonik Pro | Geist | Aeonik Pro는 유료. Google Fonts 무료 대체 |
| 한글 | — | Pretendard Variable | 확정 (jsDelivr CDN으로 로드) |

### font-weight
- Kode: **전부 400.** 굵기 없이 크기와 대문자로만 위계를 만든다.
- AOMG 디스플레이 굵기: **decision-needed.** 기획서는 "초대형 볼드 산세리프"인데 레퍼런스는 400 세리프다. 결정 전까지 영문 400, 한글 대형 제목만 700.

### 타입 스케일 (실측)
크기 규칙: 390px 미만 고정 → 390~1440px `calc()` 유동 → 1440px 이상 고정

| 토큰 | 폰트 | mobile | desktop | line-height | letter-spacing | AOMG 적용처 |
|---|---|---|---|---|---|---|
| display-4 | 디스플레이 | 60px | 200px | 0.9 | -0.08em | Discography 연도 숫자 |
| display-0 | 디스플레이 | 60px | 120px | 0.9 | normal | 히어로 릴리즈명, 아티스트명 목록, 상세 아티스트명 |
| display-1 | 디스플레이 | 30px | 60px | 0.9 | -0.08em | 섹션 제목 |
| display-3 | 산세리프 | 24px | 34px | 0.9 | normal | 영문 리드, Now Playing 트랙명 |
| display-2 | 산세리프 | 22px | 34px | 0.75 | normal | 푸터 대형 링크 |
| body-3 | 산세리프 | 16px | 22px | 0.75 | normal | 큰 버튼 |
| body-4 | 산세리프 | 16px | 18px | 0.95 | normal | 카드 제목 |
| body-6 | 산세리프 | 14px | 18px | 0.95 | normal | 날짜·장소, 연락처 |
| body-1 | 산세리프 | 14px | 16px | 0.75 | normal | GNB, 미니 플레이어, CTA |
| body-5 | 산세리프 | 16px | 16px | 0.75 | normal | 카운터 `[ 001 ]` |
| body-2 | 산세리프 | 12px | 14px | 0.75 | normal | 라벨, 캡션 |
| paragraph-en | 산세리프 | 16px | 16px | 1.2 | normal | 영문 설명 문단 |

> line-height 0.75는 **한 줄짜리 대문자 라벨 전용.** 두 줄 이상 되는 텍스트에는 쓰지 않는다.

### 용도별 적용 기준

| 용도 | 영문 | 한글 |
|---|---|---|
| hero title | display-0 | ko-display |
| section title | display-1 | ko-title |
| body | paragraph-en | ko-body |
| caption | body-2 | ko-caption |
| button / CTA | body-1, `[ LABEL ]` 대괄호 | 한글 CTA 쓰지 않음 |

---

## 5. Visual System

| 항목 | Kode 실측 | AOMG 적용 |
|---|---|---|
| background | #FF4C00 / #FFFFFF / #000000 | 검정 베이스, 히어로만 accent, Discography만 흰색 (adjusted) |
| text | #000000 / #FFFFFF | 동일 (reference) |
| accent | #FF4C00 | **#FF3B1F** (temporary). Kode 오렌지를 그대로 쓰면 복제로 보여 레드 쪽으로 이동 |
| 대비 | 오렌지 위 검정 6.3:1, 흰색 3.3:1 | accent 위 본문은 검정만. 흰색은 큰 제목에만 |
| border | 없음 | 없음 |
| radius | 0 | 0 |
| shadow | 없음 | 없음 |
| image ratio | 이미지 없음, 전부 canvas(뷰포트 전체) | 프로필·커버 1:1, 뉴스·포스터 4:5, 영상 16:9 |
| image crop | — | `object-fit: cover; object-position: center` |
| button | 배경·테두리·패딩 없음, `[ LABEL ]`, 높이 12~26px | 동일. 단 터치 영역 44px 확보 |
| card padding | 카드 없음 | 0 (temporary) |

---

## 6. Section Pattern

### Kode 섹션 → AOMG 섹션 대응표

| AOMG 섹션 | 대응 Kode 패턴 | 배경 | 높이 / 패딩 | 구조 |
|---|---|---|---|---|
| **Immersive Hero** | 1 히어로 | accent | 100vh | 최신 릴리즈(Keyveatz OXY_GEN). 5열 중 2열에 1:1 커버, 3열에 릴리즈명(display-0) + 한글 서브타이틀 + `[ AUDIO ON ]` `[ LISTEN ]`. **canvas가 아닌 HTML 텍스트** |
| **Now Playing** | 2 sub-hero | 검정 | 100vh | 5열 2:3 분할. 좌 2열 커버·트랙 목록, 우 3열 비주얼라이저 + 트랙명(display-3) |
| **Artist Universe** | 3 justified-text | 검정 | 128px 0 | 아티스트 영문명 10개를 display-0 양쪽 정렬로 나열. hover/focus 시 1:1 프로필이 커서 근처에 표시. 클릭 → 상세 |
| **Discography Wall** | 5 services (pinned) | 흰색 | 최대 300vh | 스크롤 고정. display-4 연도 숫자가 바뀌며 해당 연도 커버 그리드 전환. `[ PREV ] [ NEXT ]` + 키보드 |
| **Live Pulse** | 4 logo-draw | 검정 | 96px 22px | 좌 2열 4:5 포스터, 우 3열 공연 목록(날짜·장소·`[ TICKETS ]`). 긁기 효과는 쓰지 않음 |
| **Stories & News** | 6 justified-text-02 | 검정 | 112px 0 256px | 5열 카드 그리드(4:5), 블록 간격 160px |
| **Footer** | 7 footer | 검정 | 100vh | 좌: 레이블 정보·주소, 우: 대형 SNS 링크(display-2) |
| **미니 플레이어** | 하단 바 | 검정 | 60px 고정 | 3열: 로고 / 트랙 정보·재생·진행바 / `[ AUDIO ON ]` |

### 기본 패턴

- **Hero 구조**: 100vh, 단일 메시지 1개, 초대형 텍스트 + 시각 오브젝트
- **Brand Story 구조**: 양쪽 정렬 초대형 세리프 문장 (Kode 3, 6) → AOMG에서는 Artist Universe에 응용
- **Product/Service 구조**: 스크롤 고정 + 대형 숫자 카운터 (Kode 5) → Discography Wall
- **Proof/Experience 구조**: 대형 비주얼 + 짧은 문단 비대칭 배치 (Kode 4) → Live Pulse
- **CTA 구조**: 대괄호 텍스트 버튼. 섹션마다 1~2개
- **GNB**: 상단 고정 50px, 투명, 대문자 링크
- **Footer**: 100vh 검정, 정보 + 대형 링크
- **콘텐츠 밀도**: 한 화면에 메시지 1개. 텍스트 블록은 짧게, 여백은 크게

### 아티스트 상세페이지 구조 (`artist.html?id=keyveatz`)

| 순서 | 섹션 | 패턴 | 내용 |
|---|---|---|---|
| 1 | 상세 히어로 | Kode 히어로 + sub-hero | 100vh. 좌 2열 1:1 프로필(메인 카드에서 확장), 우 3열 "KEYVEATZ"(display-0) + 한글명. 아티스트 테마 색 적용 (Keyveatz accent `#B0B0D0`: OXY_GEN 커버의 쿨 그레이 톤에서 추출, 검정 위 대비 약 10:1) |
| 2 | 소개 | sub-hero 5열 2:3 | 좌: 라벨 `ABOUT`, 우: 한글 소개(ko-body) + 영문 소개(paragraph-en) |
| 3 | 최신 릴리즈 | 카드 그리드 | 1:1 커버 (OXY_GEN, KEY BEATS), `[ LISTEN ]` → 미니 플레이어 재생 |
| 4 | 대표 영상 | 카드 그리드 | 16:9 썸네일, `[ WATCH ]` → 유튜브 |
| 5 | 공연 | Live Pulse 축소판 | 날짜·장소·예매 링크. 일정 없으면 "예정된 공연이 없습니다" + SNS 링크 |
| 6 | 뉴스 | 카드 그리드 | 4:5, 해당 아티스트 뉴스만 |
| 7 | 관련 아티스트 | Artist Universe 축소판 | 다른 아티스트명 양쪽 정렬 3~4개 |
| 8 | 공식 링크 | 푸터 링크 패턴 | Instagram / YouTube / TikTok / X / Spotify (현재 AOMG 상세페이지에 있는 링크) |

- 콘텐츠는 **Keyveatz 1팀만 꽉 채우고**, 다른 아티스트도 같은 틀(`artist.html?id=[slug]`)로 열리게 한다.
- Keyveatz를 고른 이유: 현재 공식 사이트에서 가장 최신 활동(2026.06 EP)이고, 한/영 소개문·앨범 커버·영상·공식 링크가 모두 있어 상세페이지 섹션을 전부 실제 데이터로 채울 수 있다.

---

## 7. 메인페이지 섹션 구성

### 섹션 순서
`Immersive Hero → Now Playing → Artist Universe → Discography Wall → Live Pulse → Stories & News → Footer` + 고정 미니 플레이어

### GNB 앵커

| 메뉴 | 이동 위치 |
|---|---|
| AOMG 로고 | 페이지 최상단 |
| NOW PLAYING | `#now-playing` |
| ARTISTS | `#artists` |
| RELEASES | `#discography` |
| LIVE | `#live` |
| NEWS | `#news` |

### 고정 요소 관계
- GNB(상단 50px)와 미니 플레이어(하단 60px)가 동시에 고정된다.
- 앵커 이동 시 `scroll-margin-top: 50px`로 GNB에 가리지 않게 한다.
- 페이지 맨 아래 Footer에 `padding-bottom: 60px`을 더해 미니 플레이어에 가리지 않게 한다.
- 미니 플레이어는 두 페이지에 같은 마크업으로 넣고, 이동 직전 트랙·재생 위치를 sessionStorage에 저장해 다음 페이지에서 복원한다. 브라우저 자동재생 정책 때문에 이동 후에는 일시정지 상태로 복원되고, 클릭 한 번으로 이어 듣는다.

### 메인 → 상세 전환
- Artist Universe에서 아티스트명 hover/focus 시 나타나는 1:1 프로필 이미지가 상세 히어로의 프로필 위치로 확장된다 (View Transitions API cross-document 전환, 같은 `view-transition-name`).
- 미지원 브라우저는 일반 페이지 이동으로 동작한다 (점진적 향상).
- 전환 시간: 500ms, `cubic-bezier(0, 0, 0.2, 1)` (Kode 실측 easing)
- `prefers-reduced-motion`일 때는 200ms 페이드만.

### 상세 → 메인
- 브라우저 뒤로가기 시 Artist Universe 스크롤 위치 복원
- `[ BACK TO ARTISTS ]` 링크 → `/#artists`
- GNB 메뉴 → 메인의 해당 섹션 앵커

---

## 8. 적용 / 변형 / 금지 기준

> **2026-10-27 사용자 결정 (11차, 스토리보드 v4·v5):** 파편 대신 선으로만. 지구본 면이 투명해지며 윤곽이 1px 선으로 남고 → 짧은 호·직선 조각(데스크톱 약 250개)으로 풀려 → 가운데서 사방으로 퍼져 떠 있다가 → 다시 모여 CD 5장(모바일 3장)의 동심원(테두리 → 구멍 → 트랙)을 그리고 원판이 차오름. 화면을 채우는 머리카락 같은 선 다발은 쓰지 않음. 스크롤을 내리면 CD 줄이 오른쪽 위로 올라가고 다음 CD가 왼쪽 아래에서 들어옴.
> **2026-10-27 사용자 결정 (10차, 스토리보드 v2·v3 확인):** 문장·지구본을 화면 높이 6% 아래로. 스크롤하면 지구본이 유리 파편으로 깨지고(번쩍임 없음) → 파편이 매끄러운 곡선 흐름을 따라 흘러가며 은은하게 빛나는 실버로 바뀜(리본 이미지는 흐름의 느낌만 참고, 머리카락 같은 잔상) → 파편이 퍼져 보이는 CD 5장 각자에게 가서 원판 모양으로 깔린 뒤 원판이 차오름(O 단계 없음). CD는 5장(모바일 3장) 모두 화면 안. 스크롤하면 CD 줄이 대각선으로 이동(내리면 왼쪽 아래로, 다음 CD가 오른쪽 위에서), 가운데 맞춤 없음. CD를 드래그하면 제자리에서 회전하고 놓은 각도 유지. 이전/다음·클릭은 그 CD 위치로 스크롤.
> **2026-10-27 사용자 결정 (9차, FROM IDENTITY TO SOUND):** 히어로부터 NOW PLAYING까지를 하나의 스크롤 고정 장면으로 통합(레퍼런스: a24.raviklaassens.com 마지막 화면의 CD 배치). 단계: 01 히어로(0–15%, 기존 오브제·문장·마우스 깨짐 유지) → 02 Unravel(15–40%, 오브제 면이 비워지며 윤곽이 선으로 풀림, 배경 레드→다크 레드) → 03 Disperse(40–65%, 선이 공간에 흩어지고 일부는 가로 사운드 파형 3줄, 배경 검정으로) → 04 CD Formation(65–90%, 선이 원주 방향으로 모여 테두리→구멍→표면 링 순서로 CD 9장 형성, 원판은 테두리에서 안쪽으로 차오름) → 05 NOW PLAYING(90–100%, 떠 있는 CD + 앨범·트랙·재생 패널). 위로 스크롤하면 그대로 되돌아감. 기존 NOW PLAYING 섹션은 WebGL·JS가 없을 때의 대체 화면으로만 남김.
> **2026-10-27 사용자 결정 (8차):** 히어로 오브제는 5차 기반에서 색을 깊은 빨강으로(투과를 낮춰 배경 주황이 덜 비침), 호버 시 가시처럼 깨지는 대신 커서 지점에서 **물결(파형)이 퍼지며 출렁임**. 흰 원(`HOLD AND DRAG`) 표시는 유지. 푸터 오브제는 밝은 **실버**(조명 추가). 섹션 사이 여백을 늘림(데스크톱 176~260px, 모바일 104px). 100vh 최소 높이는 유지.
> **2026-10-27 사용자 결정 (롤백):** 6·7차 3D 오브제 변경(둔탁한 조각, AOMG 배치, 20조각)을 되돌리고 **5차 상태로 복귀**. 7차의 인트로 커서 수정(친 글자 뒤를 따라감)만 유지.
> **2026-10-26 사용자 결정 (5차):** 깨짐 세기(조각 회전)를 약 60%로 낮추고, 대신 조각이 오브제 바깥으로 더 넓게 퍼져 화면을 채움. 메인 아티스트 목록에서 영문 이름 옆 한글 표기 제거(사진 미리보기로 대체, 스크린리더용 라벨엔 한글 유지).
> **2026-10-26 사용자 결정 (4차):** 히어로 오브제 위에 마우스를 올리면 KODE처럼 흰 원(`HOLD AND DRAG`)으로 깨지는 범위를 표시. 올린 부분이 가장 크게 깨지고 오브제 전체 조각도 함께 흩어짐. 히어로 배경 문장 자간을 -0.045em으로 더 좁힘. 인트로 로고는 사용자 제공 글자 SVG(`img/logo/a·o·m·g.svg`)가 타이핑된 머리글자 자리에서 로고 자리로 이동·변형되며 합쳐짐(`img/logo-white.png` 삭제).
> **2026-10-26 사용자 결정 (3차):** 인트로는 타이핑 후 A·O·M·G가 모여 사용자 제공 로고(`img/logo.svg` → `img/logo-white.png`)로 바뀜(로고 최대 폭 360px). 3D 오브제는 누르고 있을 때가 아니라 **마우스를 올린 부분만** 깨짐, 누르고 드래그하면 회전. 섹션 제목 옆 한글 설명과 조작 안내 문구는 모두 제거.
> **2026-10-26 사용자 결정 (2차):** 히어로 문장은 'ABOVE / ORDINARY / MUSIC / GROUP' 4줄, 3D 오브제는 사용자 제공 `img/obj-bold.svg`(지구본 형태), 브라우저 탭 아이콘은 사용자 제공 logo_thin(`img/favicon.svg`), 인트로 버튼은 `[ ENTER ]` 하나.
> **2026-10-26 사용자 결정:** 레퍼런스(KODE)의 핵심 인터랙션을 복원한다 — 인트로(타이핑 → 로고 → ENTER), 히어로 3D AOMG 로고(드래그 회전·누르면 깨짐), 스크롤 고정 발매 기록, 마우스 트레일, 긁어서 드러나는 포스터, 푸터 3D. 이전 문서에서 '가져오지 않음/범위 밖'으로 적었던 결정을 이 결정으로 대체한다.

### 그대로 가져올 것
- 하단 60px 고정 바 구조 → 미니 플레이어
- `[ LABEL ]` 대괄호 텍스트 버튼과 hover 동작(괄호 transform 0.3s, 색 0.5s)
- full-bleed, 좌우 22/10px, 5열/6열 그리드, gap 10px
- 유동 타입 스케일(390~1440px calc, 1440px 최대 고정)
- 섹션 패딩 96 / 112 / 128 / 256px, 내부 간격 160px
- 3색 팔레트 구조, radius 0, shadow 0, border 0
- easing `cubic-bezier(0, 0, 0.2, 1)`, duration 150/200/300/500/1500ms
- 양쪽 정렬 초대형 세리프 텍스트, 스크롤 고정 + 대형 숫자 카운터

### AOMG에 맞게 변형할 것
- 오렌지 #FF4C00 → AOMG accent #FF3B1F, 기본 배경은 검정
- 한글 타이포 스케일 별도 운영 (2장 표)
- 유료 폰트 → 무료 대체 (Instrument Serif, Geist, 한글은 Pretendard)
- 스크롤 고정 구간 9900px → 최대 300vh
- 하단 바 배경 투명 → 검정 (플레이어 가독성)
- 버튼 시각 크기는 유지하되 터치 영역 44px 확보
- 카드 신설 (Kode에는 없음): 패딩 0, 이미지 위·텍스트 아래, radius 0
- 비트 반응 모션: 번쩍임 대신 scale·translate·파형 높이

### 구조를 가져와 AOMG로 변형한 것 (2026-10-26 결정)
- 프리로더: 카운터 + 커서 타이핑 → 로고 → ENTER. 'ABOVE ORDINARY MUSIC GROUP' → 'AOMG', 입장 버튼 `[ ENTER ]` 하나. 5초 목표는 '입장 직후 히어로 하단에 최신 릴리즈'로 충족
- 히어로 3D 오브제: 셰브론 → 유리 질감 사용자 제공 오브제(obj-bold, 지구본 형태), 마우스를 올린 부분만 깨짐(KODE와 같은 방식)·누르고 드래그하면 회전. 문장은 3D 장면에 그리되 HTML h1을 함께 둠
- services 스크롤 고정: 9900px → 300vh, 숫자 00→3 → 연도
- scratch around: 로고 → 공연 포스터, 'SCRATCH TO REVEAL' + `[ REVEAL ]` 대안 버튼
- MouseTrail: 팔레트 안의 검정/흰색 선
- 푸터 3D: 어두운 크롬 오브제

### 가져오면 안 되는 것
- 히어로 텍스트를 canvas에만 두는 방식 (HTML h1을 반드시 함께 둠)
- 오렌지/accent 배경 위 흰색 본문
- Kode의 셰브론 형태 자체, 로고, 카피 원문 (INNOVATE WITH PURPOSE, SCRATCH AROUND 등)

### AI가 임의로 추가하면 안 되는 것
- 그라데이션, 글래스모피즘(반투명 블러), 그림자, 둥근 모서리
- 회색 계열 보조색, 3색(+accent 1개) 외의 색
- 카드 배경색·테두리·아이콘 장식
- 섹션 사이 구분선, 배경 패턴, 노이즈 질감
- 중앙 정렬 히어로 + 버튼 2개 같은 SaaS형 랜딩 레이아웃
- 기획에 없는 섹션(후기, 통계 숫자, FAQ 등)
- 1초 3회 넘는 깜빡임, 비트마다 색 반전

---

## 9. 이미지

- 원본: 현재 AOMG 공식 사이트(aomgofficial.com, Squarespace CDN)
- 목록·용도·원본 URL: `img/README.md`
- 다운로드: GitHub Actions로 받아 WebP로 최적화 완료 (`img/README.md`)
- 히어로용 16:9 키비주얼이 원본에 없음 → 생성하지 않고 **1:1 앨범 커버 + accent 배경 + 초대형 타이포** 구성으로 해결 (Kode처럼 타이포가 비주얼을 대신함)
- 영상 썸네일은 원본이 480×360 저해상도 → 유튜브 영상 ID 확인 후 `maxresdefault.jpg`로 교체 *(needs-check)*

---

## 10. 확인 필요값 / temporary token / 결정 필요

### needs-check
- ~~한글 폰트와 문체 기준~~ → Pretendard, copy-strategy.md 3장으로 확정
- 모바일 섹션 패딩 실측값 (현재 데스크톱의 50% 임시)
- 영상 썸네일 유튜브 ID
- 공연 일정 데이터 (현재 공식 사이트는 페이스북 이벤트로 연결, 실제 일정 확인 필요)
- ~~`KVZ_DSCOVER.jpg`가 OXY_GEN EP 커버인지~~ → 확인 완료 (커버에 OXY_GEN 표기)

### temporary
accent #FF3B1F, focus-ring, 무료 대체 폰트 2종, readable-max 40em, card-gap-y 40px, heading-to-body 40px, body-to-cta 32px, 카드 패딩 0·hover, 이미지 비율(공연 4:5, 영상 16:9), 미니 플레이어 진행바 2px, detail-hero 구성, 상세 back-link

### decision-needed
- **디스플레이 굵기**: 레퍼런스(400 세리프) vs 기획서(초대형 볼드 산세리프)

---

## 11. prd.md에서 반드시 지킬 디자인 기준

1. 색은 검정·흰색·accent 3개만. radius·shadow·border·그라데이션 0
2. 컨테이너 폭 제한 없음, 좌우 22/10px, 5열/6열 그리드, gap 10px
3. 섹션 간 margin 없이 섹션 패딩(96/112/128/256px)으로 리듬
4. 초대형 디스플레이에는 영문 고유명사만. 한글은 ko-* 토큰
5. 두 줄 이상 텍스트에 line-height 1 미만 금지
6. CTA는 `[ LABEL ]` 대괄호 텍스트 버튼만
7. 사운드는 무음 기본값, `[ AUDIO ON ]` 클릭 후에만 활성화
8. 미니 플레이어는 하단 60px 고정, 페이지 이동 시 sessionStorage로 상태 유지
9. 1초 3회 넘는 깜빡임 금지 (WCAG 2.3.1)
10. 드래그·스크롤 고정 탐색에는 버튼과 키보드 대안 (WCAG 2.5.7)
11. `prefers-reduced-motion`: 정적 파형, 페이드 전환만, 스크롤 고정 해제
12. accent 배경 위 본문은 검정, 터치 영역 44px 이상, 포커스 표시 필수
13. 텍스트는 canvas가 아닌 HTML로
14. 인트로는 같은 세션 재방문 시 생략, 동작 줄이기 시 즉시 버튼 표시, 3D는 인트로 중·화면 밖일 때 렌더링 중지
15. LCP 2.5초 이하, INP 200ms 이하
