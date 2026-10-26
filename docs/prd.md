# AOMG 공식 웹사이트 리뉴얼 — PRD

> 작성일: 2026-10-26
> 기준 문서: `reference-analysis.md`, `tokens.json`, `docs/kode-reference-measurements.md`
> **이 문서에 없는 페이지와 섹션은 만들지 않는다. 페이지와 섹션의 추가·삭제는 이 문서를 수정해서만 결정한다.**

## 0. 확정 사항

> **2026-10-26 사용자 결정:** 레퍼런스(KODE)의 핵심 인터랙션을 복원한다 — 인트로(타이핑 → 로고 → ENTER), 히어로 3D AOMG 로고(드래그 회전·누르면 깨짐), 스크롤 고정 발매 기록, 마우스 트레일, 긁어서 드러나는 포스터, 푸터 3D. 이전 문서에서 '가져오지 않음/범위 밖'으로 적었던 결정을 이 결정으로 대체한다.

| 항목 | 결정 |
|---|---|
| 제작 범위 | **2페이지**: 메인(`index.html`) + 아티스트 상세(`artist.html`) |
| 범위 결정 이유 | 포트폴리오 목적상 "메인 → 상세 전환", "아티스트별 테마", "흩어진 콘텐츠를 한 페이지로 연결"을 증명하는 데 2페이지로 충분하다. 소개·리스트·문의 등은 메인 섹션과 푸터로 흡수한다 (3장 "제외 페이지") |
| 기술 | 순수 HTML / CSS / JavaScript. 빌드 도구·프레임워크 없음 |
| 배포 | GitHub Pages |
| 사운드 | Web Audio API (`AnalyserNode` + Canvas) |
| 페이지 전환 | View Transitions API (cross-document). 미지원 브라우저는 일반 이동 |
| 3D | Three.js r160 (`js/vendor/`에 포함, CDN 없음). 히어로·푸터 AOMG 로고 |
| 인트로 | index 첫 방문 시 카운터 + 'ABOVE ORDINARY MUSIC GROUP' 타이핑 → 'AOMG' → `[ ENTER WITH SOUND ]` / `[ ENTER ]`. 같은 세션 재방문 시 생략 |
| 성격 | 비공식 컨셉 리디자인 · 비상업적 포트폴리오 |

### 파일 구조 (고정)

```
/
├── index.html
├── artist.html
├── css/style.css
├── js/
│   ├── data.js        아티스트·릴리즈·영상·공연·뉴스 데이터
│   ├── player.js      오디오 엔진, 미니 플레이어, 비주얼라이저
│   ├── script.js      GNB, 섹션 인터랙션, 상세페이지 렌더링
│   ├── effects.js     인트로, 긁기 포스터, 마우스 트레일
│   ├── logo3d.js      3D AOMG 로고 (ES module)
│   └── vendor/        three.module.min.js, RoomEnvironment.js, FontLoader.js, aomg-logo-font.json
├── img/               기존 AOMG 이미지 (img/README.md 참고)
├── audio/             데모 음원 (7장)
├── reference-analysis.md
├── tokens.json
└── prd.md
```

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 브랜드명 | AOMG (Above Ordinary Music Group). 2013년 설립, 힙합·R&B 레이블 겸 아티스트 매니지먼트 |
| 리뉴얼 목적 | 이미지 피드 형태의 공식 사이트를 **음악을 듣고, 아티스트를 발견하고, 다음 콘텐츠로 이어지는 레이블 플랫폼**으로 바꾼다 |
| 핵심 문제 | AOMG는 강한 아티스트와 음악 자산을 가졌지만, 현재 사이트에서는 그것이 **정보로만 소비되고 경험으로 기억되지 않는다** |
| 핵심 솔루션 | ① 사운드에 반응하는 화면(Audio On + 비주얼라이저) ② 아티스트 상세를 콘텐츠 허브로(릴리즈·영상·공연·뉴스·관련 아티스트 연결) ③ 연도별로 탐색하는 디스코그래피 |
| 기대 결과 | 첫 화면 5초 안에 최신 릴리즈 인지 / 사이트 안에서 음악 미리듣기 / 아티스트 1명에서 다른 콘텐츠·아티스트로 이어지는 탐색 |

### 현재 사이트 문제 → 해결

| 현재 문제 (2026-10-26 확인) | 해결 위치 |
|---|---|
| 홈이 인스타그램 이미지 피드라 최신 릴리즈가 묻힘 | index `#hero` |
| 사이트 안에서 음악을 들을 수 없음 | index `#now-playing`, 미니 플레이어 |
| 아티스트 목록이 사진 그리드뿐 | index `#artists` |
| 아티스트 상세에 소개와 외부 링크만 있음 | `artist.html` 전체 |
| 과거 앨범을 둘러볼 곳이 없음 | index `#discography` |
| Schedule 메뉴가 페이스북 이벤트로 나감 | index `#live` |
| 뉴스가 이미지 피드에 섞여 있음 | index `#news` |

---

## 2. 타깃 사용자와 사용 맥락

### 주요 사용자

| 사용자 | 방문 목적 | 주 사용 환경 |
|---|---|---|
| AOMG·소속 아티스트 팬 | 신곡 확인, 듣기, 공연 일정, 공식 링크 | 모바일 |
| 힙합·R&B·스트리트 문화 관심층 | 낯선 아티스트 발견, 레이블 분위기 파악 | 모바일·데스크톱 |
| 해외 팬, 업계 관계자 | 아티스트 프로필, 대표 콘텐츠, 연락처 | 데스크톱 |

### 첫 화면에서 이해해야 할 것
1. 지금 AOMG의 가장 중요한 릴리즈가 무엇인지 (릴리즈명, 아티스트, 발매일)
2. 여기서 바로 들을 수 있다는 것 (`[ AUDIO ON ]`, `[ LISTEN ]`)
3. 이곳이 AOMG 공식 사이트라는 것 (로고, GNB)

### 탐색하며 확인해야 할 것
- 지금 재생 중인 곡과 다른 트랙 (Now Playing)
- 소속 아티스트 10팀이 누구인지 (Artist Universe)
- 연도별 발매 기록 (Discography Wall)
- 예정된 공연 날짜·장소·예매 링크 (Live Pulse)
- 최근 소식 (Stories & News)
- 아티스트 1명의 음악·영상·공연·뉴스·공식 채널 (artist.html)

### 최종 CTA에서 해야 할 행동

| 위치 | 행동 | CTA |
|---|---|---|
| 메인 전반 | 미리듣기 재생 | `[ AUDIO ON ]`, `[ PLAY ]` |
| 릴리즈 | 전체 곡 스트리밍 (외부) | `[ LISTEN ]` |
| 아티스트 | 상세페이지 이동 | 아티스트명 클릭 |
| 공연 | 예매 (외부) | `[ TICKETS ]` |
| 상세 | 공식 채널 팔로우 (외부) | `[ INSTAGRAM ]` 등 |
| 푸터 | 비즈니스 문의 | `info@aomgofficial.com` |

---

## 3. 전체 사이트맵 및 페이지 목록

### 사이트맵

```
index.html (Home)
├── #hero            Immersive Hero
├── #now-playing     Now Playing
├── #artists         Artist Universe ──→ artist.html?id={slug}
├── #discography     Discography Wall
├── #live            Live Pulse
├── #news            Stories & News
└── #contact         Footer

artist.html?id={slug} (Artist Detail, 기본값 keyveatz)
├── #artist-hero     상세 히어로
├── #about           소개
├── #releases        최신 릴리즈
├── #videos          대표 영상
├── #artist-live     공연
├── #artist-news     뉴스
├── #related         관련 아티스트 ──→ artist.html?id={slug}
├── #links           공식 링크
└── #contact         Footer

공통: GNB(상단 고정) · 미니 플레이어(하단 고정) · Footer
```

### 페이지 목록

| 구분 | 파일명 | 페이지명 | 목적 | 핵심 콘텐츠 | 연결되는 GNB/Footer | 필요한 하위/상세 페이지 | CTA |
|---|---|---|---|---|---|---|---|
| Main | index.html | Home | 최신 릴리즈를 듣게 하고, 아티스트·음악·공연·뉴스로 탐색을 이어지게 한다 | 최신 릴리즈, 트랙 미리듣기, 아티스트 10팀, 연도별 디스코그래피, 공연, 뉴스 | GNB: NOW PLAYING / ARTISTS / RELEASES / LIVE / NEWS (섹션 앵커). Footer: 레이블 정보, 문의, SNS | artist.html | `[ AUDIO ON ]` `[ LISTEN ]` `[ TICKETS ]` 아티스트명 |
| Sub (상세) | artist.html | Artist Detail | 아티스트 1명의 모든 콘텐츠를 한 페이지에 연결한다 | 프로필, 한/영 소개, 릴리즈, 영상, 공연, 뉴스, 관련 아티스트, 공식 링크 | GNB: 같은 메뉴, 각 항목은 `index.html#섹션`으로 이동. `[ BACK TO ARTISTS ]` → `index.html#artists`. Footer 동일 | 없음 (같은 템플릿을 `?id=`로 재사용) | `[ PLAY ]` `[ LISTEN ]` `[ WATCH ]` `[ TICKETS ]` 공식 채널 |

### 제외 페이지 (만들지 않음)

| 일반적 서브페이지 | 제외 이유 | 대신 들어가는 곳 |
|---|---|---|
| about.html | 레이블 소개는 짧은 문단 2개 분량 | Footer 좌측 레이블 소개 |
| artists.html (리스트) | 10팀은 메인 한 섹션에 모두 들어감 | index `#artists` |
| releases.html | 연도별 탐색을 메인 섹션에서 처리 | index `#discography` |
| live.html | 공연 수가 적음 | index `#live`, artist `#artist-live` |
| news.html / 뉴스 상세 | 원문은 공식 SNS에 있음 | index `#news` (카드 클릭 → 원문 링크) |
| contact.html | 공식 문의 수단이 이메일 1개 | Footer `#contact` |

---

## 4. 페이지별 기능 요구사항

### 4-1. index.html

| 섹션 (id) | 섹션 역할 | 필요한 섹션 구성 | 필요한 이미지 | 필요한 카피 | 적용할 tokens.json 항목 | 완료 기준 |
|---|---|---|---|---|---|---|
| GNB | 섹션 이동 | 좌: 로고 / 우: 메뉴 5개. 모바일은 `[ MENU ]` 버튼 → 전체 화면 메뉴 | logo-aomg.webp | 메뉴명 5개 | component.header, typography.scale.body-1 | 상단 50px 고정, 앵커 이동 시 섹션 제목이 가려지지 않음 |
| `#hero` | 레이블 컨셉 + 최신 릴리즈 1건 인지 | 100svh, accent 배경, 전체 3D 캔버스. 중앙: 문장 'INTERACT / WITH THE / BEAT' + 유리 AOMG 3D 로고. 하단 정보 줄: 커버 + 'KEYVEATZ — 1ST EP · 2026.06.30' + OXY_GEN + 서브타이틀 + `[ AUDIO ON ]` `[ LISTEN ]`. 조작 안내 문구 | release-keyveatz-oxygen.webp | 문장, 조작 안내(영/한), 라벨, 릴리즈명, 서브타이틀, CTA 2개 | color.bg-accent, display-4(문장), display-3(릴리즈명), body-2, ko-caption | 입장 직후 첫 화면에 릴리즈명·CTA 보임. 드래그 회전·누르면 깨짐·놓으면 복원. WebGL 불가 시 HTML 문장 표시 |
| `#now-playing` | 미리듣기 + 비주얼라이저 | 100vh, 검정. 2열: 커버 + 트랙 목록(3곡) / 3열: 비주얼라이저 canvas + 현재 트랙명 + 재생 버튼 | release-keyveatz-oxygen.webp, release-keyveatz-keybeats.webp | 섹션 제목, 트랙명 3개, 무음 안내 문구 | display-1, display-3, body-1, color.accent | 트랙 클릭 시 재생·미니 플레이어 갱신. 무음 상태에서도 정적 파형과 트랙 정보가 보임 |
| `#artists` | 아티스트 발견 → 상세 이동 | 패딩 128px. 영문 아티스트명 10개를 display-0 양쪽 정렬로 나열. hover/focus 시 1:1 프로필 표시 | artist-*.webp 10장 | 섹션 제목, 아티스트 영문명·한글명 10개 | display-0, display-1, ko-caption, spacing.section-pad-lg, component.artist-name-list, image.artist-profile | 10개 이름이 모두 링크. 키보드 Tab으로 이동 가능. 터치 기기는 이름 아래 작은 썸네일 표시 |
| `#discography` | 연도별 릴리즈 탐색 | 흰색 배경, 스크롤 고정(최대 300vh). 좌: display-4 연도 숫자 / 우: 해당 연도 1:1 커버 그리드. `[ PREV ]` `[ NEXT ]` | release-*.webp | 섹션 제목, 연도, 릴리즈명·아티스트·발매일 | color.bg-inverse, display-4, body-4, component.pinned-counter, image.release-cover | 연도 전환이 스크롤·버튼·키보드 화살표로 모두 동작. reduced-motion에서는 고정 해제, 연도별 목록으로 표시 |
| `#live` | 공연 확인 → 예매 | 패딩 96px. 2열: 4:5 포스터 / 3열: 공연 목록(날짜·도시·장소·상태·`[ TICKETS ]`) | news-keyveatz-messygirls.webp (포스터 대체) | 섹션 제목, 공연명, 날짜, 장소, 상태 라벨, 공연 없을 때 문구 | spacing.section-pad-sm, body-6, image.live-poster | 날짜·장소·예매 링크가 모션 없이 즉시 읽힘. 예시 데이터는 화면에 "예시" 표시 |
| `#news` | 최근 소식 | 패딩 112px 0 256px. 5열(모바일 2열) 4:5 카드 4개 | news-*.webp 4장 | 섹션 제목, 뉴스 제목 4개, 날짜, 분류 라벨 | spacing.section-pad-md, spacing.section-pad-end, component.card, image.news-poster | 카드 클릭 시 원문(공식 SNS) 새 탭 |
| `#contact` Footer | 레이블 정보·문의 | 100vh, 검정. 좌: 레이블 소개(한/영) / 우: 대형 링크(INSTAGRAM, YOUTUBE, FACEBOOK, SOUNDCLOUD), 이메일, 면책 문구 | logo-aomg.webp | 레이블 소개, 이메일, 면책 문구, 저작권 | component.footer, display-2, body-6 | 하단 미니 플레이어에 가려지는 내용 없음 |
| 미니 플레이어 | 전역 재생 제어 | 하단 60px 고정, 3열: 로고 / 트랙 정보·재생·진행바 / `[ AUDIO ON ]` | logo-aomg.webp | 기본 문구("재생 중인 곡 없음") | component.mini-player | 모든 섹션에서 보임, 키보드로 조작 가능 |

### 4-2. artist.html

| 섹션 (id) | 섹션 역할 | 필요한 섹션 구성 | 필요한 이미지 | 필요한 카피 | 적용할 tokens.json 항목 | 완료 기준 |
|---|---|---|---|---|---|---|
| `#artist-hero` | 아티스트 정체성 | 100vh. 2열: 1:1 프로필 / 3열: 영문명(display-0), 한글명, 소속 표기, `[ BACK TO ARTISTS ]`. 아티스트 테마 색 적용 | artist-keyveatz.webp | 영문명, 한글명, 한 줄 소개 | component.detail-hero, component.artist-theme, display-0 | 메인에서 이동 시 프로필 이미지가 이어지는 전환(지원 브라우저) |
| `#about` | 소개 | 2열 라벨 `ABOUT` / 3열 한글 소개 + 영문 소개 | — | 한글 소개, 영문 소개 (공식 사이트 원문) | ko-body, paragraph-en, layout.readable-max-width | 한글 본문 한 줄 40자 이내 |
| `#releases` | 음악 | 1:1 커버 카드. `[ PLAY ]`(미리듣기) `[ LISTEN ]`(외부) | release-keyveatz-*.webp | 릴리즈명, 유형(EP/Single), 발매일 | component.card, image.release-cover | PLAY 시 미니 플레이어에 반영 |
| `#videos` | 영상 | 16:9 카드 3개, `[ WATCH ]` → 유튜브 새 탭 | video-keyveatz-*.webp | 영상 제목 | image.video-thumb | 썸네일 비율 16:9 유지 (cover 크롭) |
| `#artist-live` | 공연 | 메인 `#live` 목록 축소판 | — | 공연 정보 또는 "예정된 공연이 없습니다" | body-6 | 데이터 없을 때 빈 상태 문구 + 공식 SNS 링크 |
| `#artist-news` | 뉴스 | 해당 아티스트 뉴스 카드 | news-keyveatz-*.webp | 뉴스 제목, 날짜 | component.card, image.news-poster | 해당 아티스트 뉴스만 표시 |
| `#related` | 다음 아티스트 탐색 | 다른 아티스트 3~4명 이름 양쪽 정렬 | — | 섹션 제목, 아티스트명 | component.artist-name-list | 클릭 시 해당 `artist.html?id=` 이동 |
| `#links` | 공식 채널 | 대괄호 링크 목록 | — | 채널명 | body-3 | 모든 링크 새 탭, `rel="noopener"` |
| Footer, GNB, 미니 플레이어 | index와 동일 | | | | | index와 동일 마크업 |

### 상세페이지 데이터 규칙
- `?id=` 값으로 `js/data.js`에서 아티스트를 찾는다. 없거나 비어 있으면 `keyveatz`.
- **Keyveatz는 모든 섹션을 실제 데이터로 채운다.** 다른 9팀은 히어로·소개·공식 링크·관련 아티스트만 채우고, 데이터가 없는 섹션은 통째로 숨긴다 (빈 섹션 노출 금지).
- `<title>`과 `meta description`은 아티스트에 맞게 JS로 갱신한다.

---

## 5. 서브페이지 제작 기준

- GNB 메뉴는 **index의 섹션 앵커**에 대응한다. artist.html에서는 같은 메뉴가 `index.html#섹션`으로 연결된다.
- 브랜드 성격상 리스트가 필요한 메뉴(아티스트)는 **index `#artists`가 리스트, artist.html이 상세** 패턴이다.
- 릴리즈·공연·뉴스는 개수가 적어 index 섹션에서 리스트를 처리하고, 상세는 외부 공식 링크로 보낸다.
- 두 페이지는 공통 GNB·Footer·미니 플레이어를 **같은 마크업**으로 가진다.
- 페이지 추가·삭제는 이 문서에서만 결정한다. 구현 중 페이지가 더 필요하다고 판단되면 구현을 멈추고 prd.md부터 수정한다.

---

## 6. 레퍼런스 적용 기준

### 반드시 유지할 레이아웃
- 컨테이너 max-width 없음 (full-bleed)
- 좌우 패딩 22px / 모바일(767px 이하) 10px
- 그리드: 768px 이상 5열 / 이하 6열, column gap 10px
- 섹션 사이 margin 0, 섹션 패딩 96 / 112 / 128 / 256px, 내부 블록 간격 160px
- GNB 상단 50px 고정, 미니 플레이어 하단 60px 고정
- 100vh 섹션: hero, now-playing, footer, artist-hero

### 반드시 유지할 폰트

| 역할 | 폰트 | 크기 (mobile → desktop) | 두께 |
|---|---|---|---|
| 영문 디스플레이 | Instrument Serif (OT Brut 대체) | display-4 60→200px, display-0 60→120px, display-1 30→60px | 400 |
| 영문 산세리프 | Geist (Aeonik Pro 대체) | display-3 24→34px, display-2 22→34px, body 12→22px | 400 |
| 한글 | Pretendard Variable | ko-display 40→80px, ko-title 24→39px, ko-lead 20→26px, ko-body 15→17px, ko-caption 13→15px | 대형 제목 700, 나머지 400 |

- 크기는 390px 미만 고정, 390~1440px `calc()` 유동, 1440px 이상 고정 (tokens.json 값 그대로)
- 영문 디스플레이 굵기는 **decision-needed**. 결정 전까지 400

### 컨테이너·여백·카드·이미지
- 본문 단락 최대 40em
- 카드: 패딩 0, 가로 간격 10px, 세로 간격 40px, 이미지 위·텍스트 아래(간격 10px), radius 0
- 이미지 비율: 프로필·커버 1:1 / 뉴스·공연 포스터 4:5 / 영상 16:9 / 모두 `object-fit: cover`

### 브랜드에 맞게 변형할 부분
- Kode 오렌지 → AOMG accent `#FF3B1F`, 기본 배경 검정, Discography만 흰 배경
- 미니 플레이어 배경 검정 (Kode 하단 바는 투명)
- 스크롤 고정 구간 최대 300vh
- 버튼 터치 영역 44px
- Keyveatz 상세 테마 accent `#B0B0D0`

### 절대 임의로 바꾸면 안 되는 부분
- tokens.json의 모든 `reference` 값
- 색 개수 (검정·흰색·accent + 아티스트 테마 accent 1개)
- radius 0, shadow 없음, border 없음, 그라데이션 없음
- CTA 형태 `[ LABEL ]`
- 3장 사이트맵, 4장 섹션 순서와 id
- reference-analysis.md 8장 "가져오면 안 되는 것"과 "AI가 임의로 추가하면 안 되는 것"

---

## 7. 이미지·음원 사용 계획

### 기존 사이트에서 다운로드할 이미지
`img/download-images.sh`로 받는다. 상세 목록과 원본 URL은 `img/README.md`.

| 파일 | 적용 페이지 · 섹션 |
|---|---|
| logo-aomg.webp | 공통 GNB, 미니 플레이어, Footer (저해상도 → SVG 텍스트 로고 재작업 권장) |
| artist-yugyeom / jvckiwai / kian84 / koreanzombie / leemijoo / uglyduck / kimkipyo / punchnello / sikkoo | index `#artists`, artist.html `#artist-hero` |
| artist-keyveatz.webp | index `#artists`, artist.html `#artist-hero` |
| release-keyveatz-oxygen.webp | index `#hero` `#now-playing` `#discography`, artist.html `#releases` |
| release-keyveatz-keybeats.webp | index `#now-playing` `#discography`, artist.html `#releases` |
| news-keyveatz-messygirls.webp | index `#live`(포스터) `#news`, artist.html `#artist-news` |
| news-kian84-baeksang.webp | index `#news` |
| news-keyveatz-kangyeseul.webp, news-keyveatz-umjione.webp | index `#news`, artist.html `#artist-news` |
| video-keyveatz-01~03.webp | artist.html `#videos` |

### ChatGPT로 제작할 이미지
**없음.** 히어로용 16:9 키비주얼은 원본에 없지만, 1:1 커버 + accent 배경 + 초대형 타이포로 대신한다 (reference-analysis.md 9장). Discography 커버가 부족한 연도는 연도·릴리즈명만 타이포로 보여주는 텍스트 카드로 처리하고 이미지를 생성하지 않는다.

### 데모 음원 (`audio/`)
- AOMG 음원은 저작권 때문에 사용하지 않는다. 전체 곡은 `[ LISTEN ]`으로 공식 스트리밍(Spotify 등)에 연결한다.
- 1순위: 직접 준비한 저작권 free 비트 파일 3개 (`audio/track-01.mp3` ~ `track-03.mp3`, 각 30초 이내)
- 2순위(파일이 없을 때): **Web Audio API로 합성한 데모 비트**(킥·스네어·하이햇)를 재생해 비주얼라이저가 반드시 동작하게 한다
- 화면에는 "데모 음원" 표기

---

## 8. 완료 기준

### 제작해야 하는 HTML 페이지
- [ ] `index.html`
- [ ] `artist.html` (Keyveatz 전체 + 다른 9팀 기본 섹션)

### 각 페이지에서 반드시 보여야 하는 섹션
- index: GNB / `#hero` / `#now-playing` / `#artists` / `#discography` / `#live` / `#news` / `#contact` / 미니 플레이어
- artist: GNB / `#artist-hero` / `#about` / `#releases` / `#videos` / `#artist-live` / `#artist-news` / `#related` / `#links` / `#contact` / 미니 플레이어

### css/style.css에서 반드시 선언할 CSS variable

```css
:root {
  /* color */
  --color-black; --color-white; --color-accent;
  --color-bg; --color-bg-inverse; --color-bg-accent;
  --color-text-on-dark; --color-text-on-light; --color-text-on-accent; --color-focus;
  --artist-accent; --artist-bg; --artist-text;

  /* font */
  --font-display-en; --font-sans-en; --font-ko;
  --fw-display; --fw-body; --fw-ko-display;

  /* type scale: 각 토큰마다 -size, -lh, -ls */
  --fs-display-4; --fs-display-0; --fs-display-1; --fs-display-3; --fs-display-2;
  --fs-body-3; --fs-body-4; --fs-body-6; --fs-body-1; --fs-body-5; --fs-body-2; --fs-paragraph-en;
  --fs-ko-display; --fs-ko-title; --fs-ko-lead; --fs-ko-body; --fs-ko-caption;

  /* layout */
  --gutter-x; --grid-cols; --grid-gap-x; --grid-gap-y; --card-gap-y;
  --readable-max; --section-screen;

  /* spacing */
  --section-pad-sm; --section-pad-md; --section-pad-lg; --section-pad-end;
  --section-inner-gap; --space-heading-body; --space-body-cta; --space-card-text;

  /* component */
  --header-h; --player-h; --radius; --cta-bracket-gap;

  /* motion */
  --ease-out; --ease-in-out;
  --dur-xs; --dur-sm; --dur-md; --dur-lg; --dur-xl;
}
```
- 값은 tokens.json에서 그대로 옮긴다. 유동 크기는 `clamp()`가 아니라 tokens.json의 `calc()` + 미디어쿼리(390px, 1440px) 그대로.
- CSS 안에 색상 hex, px 크기를 직접 쓰지 않는다 (변수만 사용).

### js 최소 인터랙션

| 파일 | 기능 |
|---|---|
| player.js | AudioContext는 `[ AUDIO ON ]` 클릭 후 생성 / 트랙 재생·정지·전환 / AnalyserNode → Canvas 비주얼라이저(requestAnimationFrame) / 미니 플레이어 진행바 / 페이지 이동 시 sessionStorage에 트랙·재생 위치 저장 후 복원(일시정지 상태) / 음원 파일 없으면 합성 비트 |
| script.js | 모바일 메뉴 열기·닫기(Esc 포함) / 앵커 이동 시 GNB 높이만큼 여백 / Artist Universe hover·focus 프로필 표시 / Discography 연도 전환(스크롤·버튼·화살표 키) / artist.html `?id=` 렌더링 및 테마 변수 주입 / 빈 섹션 숨김 |
| data.js | artists, releases, tracks, videos, events, news 배열. 서로 id로 연결 |
| 공통 | `prefers-reduced-motion` 감지 시 비주얼라이저 정적 파형, 스크롤 고정 해제, 전환은 페이드만 |

### 접근성·성능
- [ ] 1초 3회 넘는 깜빡임 없음. 비트 반응은 scale·translate·파형 높이만
- [ ] 모든 기능 키보드로 사용 가능, 포커스 표시 보임
- [ ] accent 배경 위 본문은 검정
- [ ] 이미지 `alt`, 장식용 canvas는 `aria-hidden`
- [ ] 아래쪽 이미지 `loading="lazy"`, 히어로 커버만 즉시 로드
- [ ] LCP 2.5초 이하, INP 200ms 이하 (Lighthouse 모바일)

### 모바일 확인 기준 (375px)
- [ ] 가로 스크롤 없음
- [ ] 좌우 패딩 10px, 6열 그리드
- [ ] 히어로 첫 화면에 릴리즈명·CTA 보임
- [ ] 아티스트 이름 10개가 줄바꿈되어도 겹치지 않음 (한글 행간 1.1 이상)
- [ ] Discography 버튼으로 연도 전환 가능
- [ ] 미니 플레이어가 콘텐츠·Footer를 가리지 않음
- [ ] 버튼 터치 영역 44px 이상
- [ ] GNB 메뉴 버튼으로 전체 메뉴 열림

### KODE 인터랙션 복원 (2026-10-26, 사용자 결정)
| 위치 | 구현 |
|---|---|
| 인트로 (index) | 검정 화면, 상단 카운터 000→100(로딩 진행), 커서 타이핑 → AOMG → ENTER 2종. 포커스 가둠, Esc = 소리 없이 입장, 동작 줄이기 = 즉시 버튼 |
| `#hero` | 화면 전체 3D 캔버스. 초대형 문장 'INTERACT / WITH THE / BEAT'를 3D 장면 평면에 그려 유리 로고 굴절에 비침(HTML h1은 스크린리더용 유지). 하단 작은 정보 줄: 커버 + KEYVEATZ — 1ST EP · 날짜 + OXY_GEN + 서브타이틀 + AUDIO ON / LISTEN. 드래그 회전, 누르고 있으면 조각, 놓으면 복원, 비트에 미세 반응 |
| `#discography` | 섹션 높이 300vh, 안쪽 화면 고정. 스크롤 진행도로 연도 전환 + 진행 막대. PREV/NEXT·화살표 키는 해당 위치로 스크롤. 화면 높이에 안 들어가면 고정 해제 |
| `#live` | 포스터를 accent 막으로 덮고 긁으면(마우스는 올리기만, 터치는 누른 채) 드러남. 45% 이상 지우면 전체 공개. `[ REVEAL ]` 버튼 |
| 공통 | 마우스 트레일(마우스 환경만, 배경 톤에 맞춰 검정/흰색). 푸터 배경 크롬 3D 로고(보일 때만 렌더링) |
- 실제 데모 음원 파일 → 없을 때 Web Audio 합성 비트로 동작 (구현 완료)

### 범위 밖 (이번에 하지 않음)
다국어 전환, CMS, 실제 예매·결제, 뉴스레터 가입, AR

---

## 9. 다음 단계: copy-strategy.md에서 작성할 카피 목록

> → `copy-strategy.md`로 작성 완료. 문체 기준은 그 문서 3장.

### 공통
- GNB 메뉴명 5개, 모바일 `[ MENU ]` `[ CLOSE ]`
- 미니 플레이어 기본 문구, 재생·정지 접근성 라벨, 데모 음원 표기
- Footer 레이블 소개(한/영, 공식 About 원문 요약), 이메일 안내, 면책 문구, 저작권
- 페이지 `<title>`, `meta description` (index, artist)

### index.html
- `#hero`: 릴리즈명, 아티스트명, 발매일 표기, 한글 서브타이틀, CTA 2개
- `#now-playing`: 섹션 제목, 트랙명 3개, 무음 안내 문구
- `#artists`: 섹션 제목, 보조 문구, 아티스트 영문명·한글명 10팀
- `#discography`: 섹션 제목, 연도별 릴리즈명·유형·발매일, 커버 없는 연도의 텍스트 카드 문구
- `#live`: 섹션 제목, 공연명·날짜·장소·상태 라벨(예매 중/매진/종료/예시), 공연 없을 때 문구
- `#news`: 섹션 제목, 뉴스 제목 4개, 분류 라벨, 날짜

### artist.html (Keyveatz)
- 히어로 한 줄 소개, `[ BACK TO ARTISTS ]`
- 소개: 한글·영문 (공식 사이트 원문 기반 재작성)
- 릴리즈명·유형·발매일, 영상 제목 3개
- 공연 빈 상태 문구, 뉴스 제목
- 관련 아티스트 섹션 제목, 공식 링크 채널명
- 나머지 9팀: 한 줄 소개, 한글 소개 1문단
