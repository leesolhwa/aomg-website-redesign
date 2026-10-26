# AOMG 리뉴얼 — 카피 전략

> 작성일: 2026-10-26
> 기준 문서: `prd.md`(사이트맵·섹션 고정), `reference-analysis.md`(타이포 위계), `tokens.json`
> 사실 출처: AOMG 공식 사이트(aomgofficial.com)의 About, Artists, 각 아티스트 페이지, 홈 피드 (2026-10-26 확인)
>
> **jy-ux-lab.md 관련:** 해당 파일은 출처를 확인할 수 없어 사용하지 않는다. 대신 이 문서 **3장 "문체 기준"이 한글 문구의 기준 문서**다. `reference-analysis.md`·`tokens.json`에서 jy-ux-lab.md를 가리키는 항목은 모두 이 문서 3장으로 대체한다.
>
> 표기: `[needs-check]` = 공식 출처로 확인 후 입력해야 하는 값. 지어내서 채우지 않는다.

---

## 1. 사이트 세계관 한 문장

**한 곡을 틀면 화면이 반응하고, 그 곡에서 아티스트와 무대로 이어지는 AOMG의 레이블 아카이브.**

- 영문 컨셉: **INTERACT WITH THE BEAT**
- 사이트는 "회사 소개 페이지"가 아니라 **지금 AOMG에서 나오는 소리를 듣는 곳**이다. 모든 섹션은 "듣기 → 아티스트 → 다음 콘텐츠"로 이어진다.

## 2. 핵심 메시지

| 순서 | 메시지 | 사용자가 느껴야 할 것 | 드러나는 위치 |
|---|---|---|---|
| 1 | 지금 AOMG의 새 소리는 이것이다 | 최신 릴리즈를 5초 안에 안다 | index `#hero` |
| 2 | 여기서 바로 들을 수 있다 | 외부 앱으로 나가지 않아도 맛보기가 된다 | `#now-playing`, 미니 플레이어 |
| 3 | AOMG는 래퍼부터 방송인, 파이터까지 모인 레이블이다 | 소속 10팀의 폭을 한눈에 본다 | `#artists` |
| 4 | 한 아티스트에서 모든 것이 이어진다 | 음악·영상·공연·소식이 한 페이지에 있다 | `artist.html` |
| 5 | 연도로 쌓인 기록이 있다 | 레이블의 발매를 연도로 훑는다 | `#discography`, Footer(2013년 설립) |

## 3. 페이지 전체 톤앤매너 (문체 기준)

### 3-1. 언어 역할 분리

| 언어 | 역할 | 어디에 | 형태 |
|---|---|---|---|
| **영문** | 브랜드 표현, 고유명사, 버튼 | 초대형 제목(display-0, display-4), 섹션 제목(display-1), 라벨, CTA | 대문자. 2~3단어 명사구. 문장 금지 |
| **한글** | 정보 전달, 안내 | 서브타이틀, 본문, 캡션, 빈 상태, 오류 | 아래 3-2 규칙 |

> 레퍼런스의 영문 카피("INNOVATE WITH PURPOSE" 등)는 가져오지도, 번역하지도 않는다. 영문 자리에는 AOMG의 실제 고유명사(아티스트명, 앨범명, 연도)를 넣는다.

### 3-2. 한글 문장 규칙

| 항목 | 규칙 | 예 |
|---|---|---|
| 종결 (소개·설명) | **평서형 "~다"** — 공식 사이트 아티스트 소개문과 같은 문체 | "2013년 설립된 힙합·R&B 레이블이다." |
| 종결 (UI 안내·빈 상태·오류) | **해요체** — 짧고 친절하게 | "지금 예정된 공연이 없어요." |
| 문장 길이 | 한 문장 **40자 이내** (ko-body 한 줄 = 40em 기준) | |
| 문단 길이 | **3문장 이내.** 소개문만 4문장까지 | |
| 서브타이틀 | **1~2문장, 합쳐서 40자 이내** | |
| 캡션 | **15자 이내**, 마침표 없음 | "AOMG 아티스트 10팀" |
| 주어 | 첫 문장에만. 다음 문장은 생략 | |
| 수식어 | 형용사는 문장당 1개까지. 사실(연도·수상·숫자)로 대신한다 | ✗ "독보적인 래퍼" → ○ "2015년 믹스테이프로 데뷔한 래퍼" |
| 아티스트 표기 | 영문 대문자 / 한글: `KEYVEATZ / 키비츠`. 본문에서는 한글명 | |
| 앨범 표기 | 대괄호 `[OXY_GEN]` — 공식 사이트 표기와 동일 | |
| 날짜 | `2026.06.30` (월만 알면 `2026.06`) | |
| 숫자 | 아라비아 숫자, 단위 붙여 씀 | "10팀", "3곡" |
| 외래어 | 공식 표기 우선. 일반어는 한글: 공연(◯) 라이브(✗), 소식(◯) 뉴스(✗) — 단 GNB·라벨 영문은 유지 | |
| 마침표 | 서브타이틀·본문·안내문은 찍음. 제목·캡션·버튼은 안 찍음 | |
| 느낌표·물음표 | 쓰지 않음 | |
| 이모지 | 쓰지 않음 | |

### 3-3. 톤

- **짧게, 사실로, 건조하게.** 힙합 레이블의 태도는 꾸밈말이 아니라 절제에서 나온다. 레퍼런스처럼 큰 글자 몇 개로 말하고, 설명은 작게 붙인다.
- 사용자를 "여러분"이라 부르지 않는다. 행동 안내는 동사로 끝낸다("들어보세요" 대신 "소리를 켜면 화면이 비트에 반응해요").
- AOMG를 자랑하지 않는다. 연도, 앨범명, 수상명이 대신 말하게 한다.

### 3-4. 타이포 위계별 글자 수 (reference-analysis.md 2장 기준)

| 토큰 | 용도 | 최대 |
|---|---|---|
| display-0 | 릴리즈명, 아티스트명 | 영문 12자 / 줄, 3줄 |
| display-4 | 연도 | 숫자 4자 |
| display-1 | 섹션 제목 | 영문 2~3단어 |
| ko-display | 한글 대형 제목 (이번 범위에서는 사용 안 함) | — |
| ko-lead | 서브타이틀 | 40자 |
| ko-body | 본문 | 문장 40자, 문단 3~4문장 |
| ko-caption / body-2 | 캡션, 라벨 | 15자 |
| body-1 | CTA | 영문 1~2단어 |

---

## 4. 페이지별 / 섹션별 카피

> **2026-10-26 사용자 결정 (6차):** 찰랑거리는 유리 느낌 대신 **둔탁하게** 깨짐 — 두꺼운 덩어리 조각, 반투명·광택을 낮춘 재질, 조각마다 출발이 조금씩 늦어 와르르 무너지는 움직임(깨짐 약 0.7초, 복원 약 1.2초). 흩어진 조각은 사용자 제공 글자 SVG 배치를 따라 **AOMG 글자 모양으로 모이고**, 그동안 뒤 문장은 흐려짐. 커서 주변 조각은 흰 원 범위에서 조금 더 밀려남.

> **2026-10-26 사용자 결정 (5차):** 깨짐 세기(조각 회전)를 약 60%로 낮추고, 대신 조각이 오브제 바깥으로 더 넓게 퍼져 화면을 채움. 메인 아티스트 목록에서 영문 이름 옆 한글 표기 제거(사진 미리보기로 대체, 스크린리더용 라벨엔 한글 유지).

> **2026-10-26 사용자 결정 (4차):** 히어로 오브제 위에 마우스를 올리면 KODE처럼 흰 원(`HOLD AND DRAG`)으로 깨지는 범위를 표시. 올린 부분이 가장 크게 깨지고 오브제 전체 조각도 함께 흩어짐. 히어로 배경 문장 자간을 -0.045em으로 더 좁힘. 인트로 로고는 사용자 제공 글자 SVG(`img/logo/a·o·m·g.svg`)가 타이핑된 머리글자 자리에서 로고 자리로 이동·변형되며 합쳐짐(`img/logo-white.png` 삭제).

> **2026-10-26 사용자 결정 (3차):** 인트로는 타이핑 후 A·O·M·G가 모여 사용자 제공 로고(`img/logo.svg` → `img/logo-white.png`)로 바뀜(로고 최대 폭 360px). 3D 오브제는 누르고 있을 때가 아니라 **마우스를 올린 부분만** 깨짐, 누르고 드래그하면 회전. 섹션 제목 옆 한글 설명과 조작 안내 문구는 모두 제거.
> 아래 표의 섹션 캡션(예: '지금 재생', 'AOMG 아티스트 10팀'), 히어로 조작 안내, 무음 안내, 긁기 안내 문구는 **화면에서 제거됨**. `[ REVEAL ]` 버튼은 키보드·스크린리더 대안이라 유지.

> **2026-10-26 사용자 결정 (2차):** 히어로 문장은 'ABOVE / ORDINARY / MUSIC / GROUP' 4줄, 3D 오브제는 사용자 제공 `img/obj-bold.svg`(지구본 형태), 브라우저 탭 아이콘은 사용자 제공 logo_thin(`img/favicon.svg`), 인트로 버튼은 `[ ENTER ]` 하나.

> **2026-10-26 사용자 결정:** 레퍼런스(KODE)의 핵심 인터랙션을 복원한다 — 인트로(타이핑 → 로고 → ENTER), 히어로 3D AOMG 로고(드래그 회전·누르면 깨짐), 스크롤 고정 발매 기록, 마우스 트레일, 긁어서 드러나는 포스터, 푸터 3D. 이전 문서에서 '가져오지 않음/범위 밖'으로 적었던 결정을 이 결정으로 대체한다.

### 4-0. 추가 카피 (KODE 인터랙션)
| 위치 | 영문 | 한글 | 근거 |
|---|---|---|---|
| 인트로 타이핑 | ABOVE ORDINARY MUSIC GROUP | — | AOMG 정식 명칭. 사용자 지정 |
| 인트로 로고 | 사용자 제공 로고 이미지 (alt: AOMG) | — | A·O·M·G 글자가 모여 로고로 바뀜 |
| 인트로 버튼 | `[ ENTER ]` | 접근성 라벨: 입장 | 선택지 없이 하나 (사용자 결정) |
| 히어로 문장 (h1) | ABOVE / ORDINARY / MUSIC / GROUP | — | AOMG 정식 명칭 4줄 (사용자 결정). KODE 문장 자리 |
| 히어로 안내 | DRAG TO ROTATE · HOLD TO BREAK | 드래그하면 돌아가고, 누르고 있으면 깨져요. | 조작 방법 |
| 공연 포스터 막 | SCRATCH / TO REVEAL | 긁어서 포스터를 확인해 보세요. | KODE 'SCRATCH AROUND' 원문은 쓰지 않음 |
| 포스터 버튼 | `[ REVEAL ]` | 접근성 라벨: 포스터 바로 보기 | 긁기 대안 |

### 4-1. index.html (Home)

| 파일명 | 페이지명 | 섹션 ID | 영문/한글 제목 | 서브타이틀 | 본문 카피 | CTA 문구 | 카피 근거 |
|---|---|---|---|---|---|---|---|
| index.html | Home | `#hero` | 라벨: `KEYVEATZ — 1ST EP` / 제목: **OXY_GEN** / 날짜: `2026.06.30` | AOMG의 새 걸크루, 키비츠의 첫 EP. | 소리를 켜면 화면이 비트에 반응해요. | `[ AUDIO ON ]` `[ LISTEN ]` | 공식 홈 공지: 키비츠 데뷔 EP [OXY_GEN] 2026.06.30 발매. 메시지 1·2. 제목은 영문 고유명사만(3-1) |
| index.html | Home | `#now-playing` | **NOW PLAYING** / 지금 재생 | 트랙을 고르면 파형이 그 비트를 따라 움직인다. | 무음 상태 안내: 소리가 꺼져 있어요. `[ AUDIO ON ]`을 누르면 재생돼요. / 음원 표기: 데모 비트예요. 키비츠의 전체 곡은 스트리밍에서 들을 수 있어요. | `[ PLAY ]` `[ PAUSE ]` `[ LISTEN ]` | prd 7장: AOMG 음원 미사용, 데모 표기 필수. 사용자가 AOMG 곡으로 오해하지 않게 함 |
| index.html | Home | `#now-playing` 트랙 | `DEMO BEAT 01` `DEMO BEAT 02` `DEMO BEAT 03` | 각 트랙 보조 정보: BPM (음원 확정 후 입력) `[needs-check]` | — | — | 실제 음원 파일이 정해지면 BPM만 채움. 곡명을 지어내지 않음 |
| index.html | Home | `#artists` | **ARTISTS** / AOMG 아티스트 10팀 | 래퍼, 보컬, 크루, 방송인, 파이터까지. | 이름을 누르면 음악과 영상, 공연이 한 페이지에 모여 있어요. | 아티스트명 10개 (링크) | 공식 About: "스포츠 엔터테인먼트 산업에도 진출". 실제 로스터 구성 그대로. 메시지 3 |
| index.html | Home | `#discography` | **RELEASES** / 연도별 발매 기록 | AOMG의 앨범을 연도별로 넘겨본다. | 연도별 목록 (아래 4-3 표) | `[ PREV ]` `[ NEXT ]` `[ LISTEN ]` | 각 아티스트 페이지에 적힌 발매 기록 (2019~2026). 2013~2018년은 공식 출처 확인 후 추가 `[needs-check]` |
| index.html | Home | `#live` | **LIVE** / 공연 일정 | 날짜와 장소, 예매 링크를 한곳에서 확인한다. | 공연 목록 (아래 4-4) | `[ TICKETS ]` | 현재 사이트는 Schedule이 페이스북으로 나감 → 사이트 안에서 해결 (prd 1장) |
| index.html | Home | `#news` | **NEWS** / AOMG 소식 | 발매, 수상, 새 얼굴 소식. | 카드 4개 (아래 4-5) | `[ READ ]` | 공식 홈 피드의 실제 게시물 |
| index.html | Home | `#contact` (Footer) | **AOMG** | — | 4-6 Footer 참고 | `[ INSTAGRAM ]` `[ YOUTUBE ]` `[ FACEBOOK ]` `[ SOUNDCLOUD ]` | 공식 사이트 SNS 링크, 공식 문의 이메일 |

### 4-2. artist.html (Artist Detail) — Keyveatz

| 파일명 | 페이지명 | 섹션 ID | 영문/한글 제목 | 서브타이틀 | 본문 카피 | CTA 문구 | 카피 근거 |
|---|---|---|---|---|---|---|---|
| artist.html | Artist Detail | `#artist-hero` | 라벨: `AOMG ARTIST` / 제목: **KEYVEATZ** / 한글명: 키비츠 | AOMG의 새로운 걸크루. | — | `[ BACK TO ARTISTS ]` | 공식 소개 첫 문장 "AOMG의 새로운 걸크루" |
| artist.html | Artist Detail | `#about` | **ABOUT** | — | (한글) 키비츠는 다섯 명의 Messy Girl이 모인 AOMG의 걸크루다. 이름에는 새로운 흐름을 여는 열쇠(Key)가 되겠다는 뜻을 담았다. AOMG의 힙합 DNA를 이어받아 언더그라운드와 서브컬처로 영역을 넓힌다. 다듬지 않은 움직임이 키비츠의 정체성이다. <br><br>(영문) Keyveatz is AOMG's new girl crew of five Messy Girls. Inheriting AOMG's hip-hop DNA, the crew moves across underground scenes and subcultures with raw, unpolished energy. | — | 공식 키비츠 페이지 소개문(한/영)을 3-2 규칙(문장 40자 내외, 4문장)으로 재작성 |
| artist.html | Artist Detail | `#releases` | **RELEASES** / 발매 | — | 카드1: `[OXY_GEN]` · 1ST EP · 2026.06.30 <br>카드2: `[KEY BEATS]` · PRE-RELEASE SINGLE · 2026.05 `[needs-check: 정확한 일자]` | `[ PLAY ]` `[ LISTEN ]` | 공식 홈 공지(선공개 디지털 싱글 Key Beats, 데뷔 EP OXY_GEN 6/30), 키비츠 페이지 앨범 이미지 |
| artist.html | Artist Detail | `#videos` | **VIDEOS** / 영상 | — | 카드 3개: 유튜브 원본 제목 그대로 `[needs-check]` | `[ WATCH ]` | 공식 페이지에 썸네일만 있고 제목 확인 불가. 제목을 지어내지 않음 |
| artist.html | Artist Detail | `#artist-live` | **LIVE** / 공연 | — | 빈 상태: 지금 예정된 공연이 없어요. 새 일정은 공식 인스타그램에서 확인할 수 있어요. | `[ INSTAGRAM ]` | 확인된 공연 일정 없음 |
| artist.html | Artist Detail | `#artist-news` | **NEWS** / 소식 | — | 4-5 표의 1·3·4번 카드 | `[ READ ]` | 공식 홈 피드 중 키비츠 게시물 |
| artist.html | Artist Detail | `#related` | **MORE FROM AOMG** / 다른 아티스트 | — | `KIMKIPYØ` `SIKKOO` `JVCKI WAI` `PUNCHNELLO` | 아티스트명 (링크) | 2024년 이후 합류·데뷔한 아티스트 우선(김기표 2026, 식구 2024) + 힙합 아티스트 |
| artist.html | Artist Detail | `#links` | **FOLLOW** / 공식 채널 | — | — | `[ INSTAGRAM ]` `[ YOUTUBE ]` `[ TIKTOK ]` `[ X ]` `[ SPOTIFY ]` | 공식 키비츠 페이지 링크 목록 (blog, Plus Chat은 제외: 해외 사용자 접근성 낮음) |

### 4-2-1. artist.html — 나머지 9팀 (히어로·소개·링크만)

공식 아티스트 페이지 소개문을 3-2 규칙으로 줄였다. 공식 문구에 없는 평가는 넣지 않았다.

| id | 제목 / 한글명 | 히어로 한 줄 (서브타이틀) | 소개 (ko-body) | 근거 |
|---|---|---|---|---|
| yugyeom | **YUGYEOM** / 유겸 | 2021년 AOMG에 합류한 솔로 아티스트. | 2014년 그룹 GOT7으로 데뷔했다. 2021년 첫 솔로 EP [Point Of View: U]의 전곡 작사·작곡에 참여했다. 2024년 첫 정규 앨범 [TRUST ME]를 발표했다. | 공식 유겸 페이지 |
| jvckiwai | **JVCKI WAI** / 재키와이 | 2015년 믹스테이프로 시작한 래퍼. | 2015년 믹스테이프 [Life Sucks]로 커리어를 시작했다. 2022년 10월 AOMG 합류와 함께 싱글 [Go Back]을 발표했다. | 공식 재키와이 페이지 |
| kian84 | **KIAN84** / 기안84 | 웹툰 작가, 방송인, 팝아트 화가. | 2008년 웹툰 ‘노병가’로 데뷔해 ‘패션왕’, ‘복학왕’을 연재했다. 2016년부터 ‘나 혼자 산다’에 출연 중이다. 2026년 제62회 백상예술대상 방송부문 남자 예능상을 받았다. | 공식 기안84 페이지, 공식 홈 피드 수상 공지 |
| koreanzombie | **KOREAN ZOMBIE** / 정찬성 | UFC 페더급에서 활약한 종합격투기 선수. | ‘코리안 좀비’라는 이름으로 UFC에서 활약했다. 페더급 랭킹 3위까지 올랐고, 아시아 선수 최초로 UFC 페더급 타이틀전에 도전했다. | 공식 정찬성 페이지. 공식 페이지의 "현재 랭킹 5위"는 오래된 정보라 쓰지 않음 (2023년 은퇴) |
| leemijoo | **LEE MI JOO** / 이미주 | 가수, 방송인. | `[needs-check]` 공식 아티스트 페이지 없음. 소개 섹션 숨김 | 공식 Artists 목록에만 있음 |
| uglyduck | **UGLY DUCK** / 어글리 덕 | 래퍼이자 DJ. | EP [Scene Stealers], DeVita와의 콜라보 앨범 [Men In Black]을 발표했다. DJ 크루 BACKnFORTH의 멤버로 파티와 공연에서 DJ로도 활동한다. | 공식 어글리 덕 페이지 |
| kimkipyo | **KIMKIPYØ** / 김기표 | 2026년 AOMG에 합류한 래퍼. | 《RAP:PUBLIC》과 《Show Me the Money 12》로 이름을 알렸다. 2026년 AOMG와 계약하고 4월 12일 EP [CHECK OUT]을 발표했다. | 공식 김기표 페이지 |
| punchnello | **PUNCHNELLO** / 펀치넬로 | Show Me the Money 8 우승 래퍼. | 2015년 믹스테이프로 주목받고 데뷔 싱글 [LIME]을 냈다. 2019년 《Show Me the Money 8》 우승 후 AOMG에 합류했다. EP [묻다.(bury.)]로 음악 영역을 넓혀 왔다. | 공식 펀치넬로 페이지 |
| sikkoo | **SIKKOO** / 식구 | 요시, 200, 구민재의 혼성 힙합 그룹. | 2024년 8월 스페셜 앨범 [HAN : Cooked]로 데뷔했다. 직접 콘텐츠를 기획하는 멀티플레이어 그룹이다. | 공식 식구 페이지 |

### 4-3. Discography Wall 연도별 목록

공식 아티스트 페이지에 적힌 발매만 넣었다. 커버 이미지는 키비츠 2장만 있고, 나머지는 prd 7장대로 텍스트 카드로 보여준다.

| 연도 (display-4) | 릴리즈 | 아티스트 | 유형 | 발매일 | 이미지 |
|---|---|---|---|---|---|
| 2026 | [OXY_GEN] | KEYVEATZ | 1ST EP | 2026.06.30 | release-keyveatz-oxygen.webp |
| 2026 | [KEY BEATS] | KEYVEATZ | PRE-RELEASE SINGLE | 2026.05 `[needs-check]` | release-keyveatz-keybeats.webp |
| 2026 | [CHECK OUT] | KIMKIPYØ | EP | 2026.04.12 | 텍스트 카드 |
| 2024 | [TRUST ME] | YUGYEOM | 1ST ALBUM | 2024 `[needs-check: 월일]` | 텍스트 카드 |
| 2024 | [HAN : Cooked] | SIKKOO | SPECIAL ALBUM | 2024.08 | 텍스트 카드 |
| 2022 | [Go Back] | JVCKI WAI | SINGLE | 2022.10 | 텍스트 카드 |
| 2021 | [Point Of View: U] | YUGYEOM | EP | 2021.06 | 텍스트 카드 |
| 2019 | [낙서] | PUNCHNELLO | SINGLE | 2019 `[needs-check: 월일]` | 텍스트 카드 |
| 2019 | [Men In Black] | UGLY DUCK & DeVita | COLLABORATION ALBUM | 2019 `[needs-check: 월일]` | 텍스트 카드 |

- 텍스트 카드 카피: 릴리즈명(body-4) + 아티스트 · 유형 · 발매일(body-2). "이미지 준비 중" 같은 문구는 쓰지 않는다.
- 연도 표기는 숫자만 (`2026`). 접근성 라벨: "2026년 발매".

### 4-4. Live Pulse

확인된 공연 일정이 없다. 기본은 빈 상태로 둔다. 화면 구성 확인용으로 예시를 넣을 때는 반드시 `SAMPLE` 라벨을 붙인다.

| 항목 | 카피 |
|---|---|
| 빈 상태 (기본) | 지금 예정된 공연이 없어요. 새 일정은 공식 인스타그램에서 확인할 수 있어요. + `[ INSTAGRAM ]` |
| 목록 형식 | `2026.00.00` · `SEOUL` · 공연장명 · 상태 라벨 · `[ TICKETS ]` |
| 상태 라벨 | `ON SALE` 예매 중 / `SOLD OUT` 매진 / `TBA` 일정 공개 예정 / `PAST` 종료 / `SAMPLE` 예시 데이터 |
| 예시 데이터 행 | 공연명 자리: `SAMPLE EVENT` · 날짜 자리: `TBA` — 실제 공연명·공연장을 지어내지 않는다 |
| 포스터 alt | "키비츠 홍보 이미지" (실제 공연 포스터가 아니므로 공연 포스터라고 쓰지 않음) |

### 4-5. Stories & News 카드

| # | 분류 라벨 | 제목 (body-4) | 날짜 | 이미지 | 링크 |
|---|---|---|---|---|---|
| 1 | `RELEASE` | 키비츠 첫 EP [OXY_GEN] 발매 | 2026.06 | news-keyveatz-messygirls.webp | AOMG 인스타그램 원문 |
| 2 | `AWARD` | 기안84, 제62회 백상예술대상 방송부문 남자 예능상 | 2026.05 | news-kian84-baeksang.webp | AOMG 인스타그램 원문 |
| 3 | `CREW` | 키비츠 크루 소개 — KANG YESEUL | 2026.04 | news-keyveatz-kangyeseul.webp | AOMG 인스타그램 원문 |
| 4 | `CREW` | 키비츠 크루 소개 — UM JIONE | 2026.04 | news-keyveatz-umjione.webp | AOMG 인스타그램 원문 |

- 날짜는 공식 사이트 게시 시점 기준 월 단위. 멤버 한글 이름은 공식 표기를 확인하지 못해 영문 그대로 쓴다.
- 계약 종료 공지(후디)는 브랜드 랜딩에 맞지 않아 제외.

### 4-6. Footer (index, artist 공통)

| 영역 | 카피 |
|---|---|
| 로고 | AOMG |
| 레이블 소개 (ko-body) | AOMG는 2013년 설립된 힙합·R&B 레이블이자 아티스트 매니지먼트 회사다. 레이블 투어와 월드 투어, 방송, 스포츠까지 활동 영역을 넓혀 왔다. |
| 레이블 소개 (영문, paragraph-en) | AOMG is a hip-hop and R&B label and artist management company founded in 2013. |
| 문의 라벨 | `BUSINESS INQUIRY` |
| 이메일 | info@aomgofficial.com |
| SNS (display-2) | `INSTAGRAM` `YOUTUBE` `FACEBOOK` `SOUNDCLOUD` |
| 면책 문구 (body-2) | 비공식 컨셉 리디자인 · 비상업적 포트폴리오. 모든 아티스트명·이미지·음원의 권리는 AOMG와 각 권리자에게 있습니다. |
| 저작권 표기 | `CONCEPT REDESIGN 2026` — "© AOMG"는 쓰지 않는다 (공식 사이트로 오인 방지) |

---

## 5. 공통 UI 카피

### GNB 메뉴명

| 메뉴 | index 링크 | artist 링크 | 접근성 라벨 |
|---|---|---|---|
| `AOMG` (로고) | `#hero` | `index.html` | AOMG 홈 |
| `NOW PLAYING` | `#now-playing` | `index.html#now-playing` | 지금 재생 |
| `ARTISTS` | `#artists` | `index.html#artists` | 아티스트 |
| `RELEASES` | `#discography` | `index.html#discography` | 발매 기록 |
| `LIVE` | `#live` | `index.html#live` | 공연 일정 |
| `NEWS` | `#news` | `index.html#news` | 소식 |
| 모바일 | `[ MENU ]` / `[ CLOSE ]` | 동일 | 메뉴 열기 / 메뉴 닫기 |
| 건너뛰기 링크 | 본문으로 건너뛰기 | 동일 | — |

### Footer 문구
4-6 표 그대로.

### 버튼 문구 (전부 `[ LABEL ]` 형태)

| 버튼 | 문구 | 동작 | 접근성 라벨 |
|---|---|---|---|
| 사운드 켜기 | `[ AUDIO ON ]` | AudioContext 시작 | 소리 켜기 |
| 사운드 끄기 | `[ AUDIO OFF ]` | 음소거 | 소리 끄기 |
| 재생 / 정지 | `[ PLAY ]` / `[ PAUSE ]` | 트랙 재생·정지 | {트랙명} 재생 / 정지 |
| 이전 / 다음 트랙 | `[ PREV ]` / `[ NEXT ]` | 미니 플레이어 | 이전 곡 / 다음 곡 |
| 스트리밍 | `[ LISTEN ]` | 외부(Spotify) 새 탭 | {릴리즈명} 스트리밍에서 듣기, 새 창 |
| 연도 이전 / 다음 | `[ PREV ]` / `[ NEXT ]` | Discography | 이전 연도 / 다음 연도 |
| 예매 | `[ TICKETS ]` | 외부 새 탭 | {공연명} 예매, 새 창 |
| 영상 | `[ WATCH ]` | 유튜브 새 탭 | {영상 제목} 유튜브에서 보기, 새 창 |
| 소식 원문 | `[ READ ]` | 인스타그램 새 탭 | {제목} 원문 보기, 새 창 |
| 목록으로 | `[ BACK TO ARTISTS ]` | `index.html#artists` | 아티스트 목록으로 |
| 공식 채널 | `[ INSTAGRAM ]` `[ YOUTUBE ]` `[ TIKTOK ]` `[ X ]` `[ SPOTIFY ]` `[ FACEBOOK ]` `[ SOUNDCLOUD ]` | 새 탭 | {채널명}, 새 창 |

### 폼 라벨
**없음.** prd 8장에서 뉴스레터·문의 폼은 범위 밖으로 정했다. 문의는 Footer 이메일 링크로 처리한다.

### 미니 플레이어

| 상태 | 카피 |
|---|---|
| 기본 (재생 전) | 재생 중인 곡 없음 |
| 재생 중 | `{트랙명}` · `DEMO` |
| 페이지 이동 후 복원 | 이어서 들으려면 `[ PLAY ]`를 눌러 주세요. |
| 진행바 접근성 라벨 | 재생 위치 |

### 빈 상태 / 오류 문구

| 상황 | 문구 |
|---|---|
| 공연 없음 | 지금 예정된 공연이 없어요. 새 일정은 공식 인스타그램에서 확인할 수 있어요. |
| 아티스트 소식 없음 | 아직 등록된 소식이 없어요. (섹션 숨김이 기본, 숨기지 못할 때만) |
| 음원 파일 불러오기 실패 | 음원을 불러오지 못했어요. 데모 비트로 대신 재생해요. |
| 브라우저가 Web Audio 미지원 | 이 브라우저에서는 소리에 반응하는 화면을 볼 수 없어요. 발매 정보는 그대로 볼 수 있어요. |
| 소리 꺼짐 상태 | 소리가 꺼져 있어요. `[ AUDIO ON ]`을 누르면 재생돼요. |
| 동작 줄이기 설정 감지 | (문구 없음 — 정적 파형으로 조용히 전환) |
| 없는 아티스트 id | 찾는 아티스트가 없어요. 키비츠 페이지를 대신 보여드려요. |
| 이미지 로드 실패 | (문구 없음 — 아티스트명 텍스트만 표시. alt는 항상 작성) |

### 이미지 alt 규칙
- 아티스트: "{한글명} 프로필 사진" — 예: "키비츠 프로필 사진"
- 앨범: "{릴리즈명} 앨범 커버" — 예: "OXY_GEN 앨범 커버"
- 뉴스: 카드 제목과 동일
- 장식용 canvas(비주얼라이저): `aria-hidden="true"`, alt 없음

### 페이지 메타

| 파일 | title | meta description |
|---|---|---|
| index.html | AOMG — Interact with the Beat | 키비츠의 첫 EP [OXY_GEN]부터 AOMG 아티스트 10팀의 음악과 공연, 소식까지. (비공식 컨셉 리디자인) |
| artist.html | {영문명} / {한글명} — AOMG | {히어로 한 줄}. 음악, 영상, 공연, 공식 채널을 한 페이지에서. (비공식 컨셉 리디자인) |

---

## 6. 사용하지 말아야 할 표현

| 분류 | 금지 | 이유 / 대체 |
|---|---|---|
| 아무 브랜드에나 붙는 말 | 새로운 차원, 한계를 넘어, 경계를 허무는, 무한한 가능성, 당신의 일상을 바꿀 | 정보가 없음 → 연도·앨범명·숫자로 |
| 과장 형용사 | 독보적인, 압도적인, 최고의, 전설적인, 역대급, 레전드 | 공식 소개문에 있어도 옮기지 않음 |
| 감성 수식어 | 감각적인, 트렌디한, 힙한, 감성 가득한, 특별한 | "힙"은 말하지 않고 디자인으로 보여줌 |
| 레퍼런스 카피 | INNOVATE WITH PURPOSE, WE SEE NO LIMIT, TECH-ENABLED CREATIVITY, SCRATCH AROUND | KODE 원문. 번역도 금지 (`[ ENTER ]`는 2026-10-26 사용자 결정으로 허용) |
| 공식처럼 보이는 표현 | 공식 홈페이지, © AOMG, 저작권은 당사에 | 비공식 리디자인임을 숨기지 않음 |
| 확인 안 된 사실 | 실제 공연명·공연장·날짜, 영상 제목, 멤버 한글 이름 추측, "현재 랭킹" | `[needs-check]`로 남김 |
| 사용자 호칭 | 여러분, 고객님, 팬 여러분 | 호칭 없이 동사로 |
| 문장 부호 | !, ?, ~, ㅎㅎ, 이모지 | 3-2 규칙 |
| 의미 없는 영어 | Welcome, Discover More, Learn More, Click Here, Lorem ipsum, Coming Soon | 구체적 동사 CTA (`[ LISTEN ]` 등) |
| 외부 이탈 숨기기 | "바로 듣기"(외부로 나가는데) | 외부 링크는 접근성 라벨에 "새 창" 명시 |

---

## 7. HTML에 적용할 카피 목록

`data-copy` 키로 HTML에 넣는다. 아티스트·릴리즈·뉴스 데이터는 `js/data.js`에 같은 문구로 들어간다.

### 공통

| 키 | 문구 |
|---|---|
| `skip` | 본문으로 건너뛰기 |
| `nav.home` | AOMG |
| `nav.nowPlaying` | NOW PLAYING |
| `nav.artists` | ARTISTS |
| `nav.releases` | RELEASES |
| `nav.live` | LIVE |
| `nav.news` | NEWS |
| `nav.menu` / `nav.close` | [ MENU ] / [ CLOSE ] |
| `player.idle` | 재생 중인 곡 없음 |
| `player.demo` | DEMO |
| `player.resume` | 이어서 들으려면 [ PLAY ]를 눌러 주세요. |
| `audio.on` / `audio.off` | [ AUDIO ON ] / [ AUDIO OFF ] |
| `footer.about.ko` | AOMG는 2013년 설립된 힙합·R&B 레이블이자 아티스트 매니지먼트 회사다. 레이블 투어와 월드 투어, 방송, 스포츠까지 활동 영역을 넓혀 왔다. |
| `footer.about.en` | AOMG is a hip-hop and R&B label and artist management company founded in 2013. |
| `footer.inquiryLabel` | BUSINESS INQUIRY |
| `footer.email` | info@aomgofficial.com |
| `footer.disclaimer` | 비공식 컨셉 리디자인 · 비상업적 포트폴리오. 모든 아티스트명·이미지·음원의 권리는 AOMG와 각 권리자에게 있습니다. |
| `footer.credit` | CONCEPT REDESIGN 2026 |

### index.html

| 키 | 문구 |
|---|---|
| `hero.label` | KEYVEATZ — 1ST EP |
| `hero.statement` | ABOVE / ORDINARY / MUSIC / GROUP (h1) |
| `hero.hint` | 드래그하면 돌아가고, 누르고 있으면 깨져요. |
| `hero.title` | OXY_GEN |
| `intro.enter` | ENTER |
| `live.scratchHint` / `live.reveal` | 긁어서 포스터를 확인해 보세요. / REVEAL |
| `hero.date` | 2026.06.30 |
| `hero.subtitle` | AOMG의 새 걸크루, 키비츠의 첫 EP. |
| `hero.body` | 소리를 켜면 화면이 비트에 반응해요. |
| `hero.cta.audio` | [ AUDIO ON ] |
| `hero.cta.listen` | [ LISTEN ] |
| `nowPlaying.title` | NOW PLAYING |
| `nowPlaying.caption` | 지금 재생 |
| `nowPlaying.subtitle` | 트랙을 고르면 파형이 그 비트를 따라 움직인다. |
| `nowPlaying.muted` | 소리가 꺼져 있어요. [ AUDIO ON ]을 누르면 재생돼요. |
| `nowPlaying.demoNote` | 데모 비트예요. 키비츠의 전체 곡은 스트리밍에서 들을 수 있어요. |
| `nowPlaying.track1~3` | DEMO BEAT 01 / DEMO BEAT 02 / DEMO BEAT 03 |
| `artists.title` | ARTISTS |
| `artists.caption` | AOMG 아티스트 10팀 |
| `artists.subtitle` | 래퍼, 보컬, 크루, 방송인, 파이터까지. |
| `artists.body` | 이름을 누르면 음악과 영상, 공연이 한 페이지에 모여 있어요. |
| `discography.title` | RELEASES |
| `discography.caption` | 연도별 발매 기록 |
| `discography.subtitle` | AOMG의 앨범을 연도별로 넘겨본다. |
| `live.title` | LIVE |
| `live.caption` | 공연 일정 |
| `live.subtitle` | 날짜와 장소, 예매 링크를 한곳에서 확인한다. |
| `live.empty` | 지금 예정된 공연이 없어요. 새 일정은 공식 인스타그램에서 확인할 수 있어요. |
| `news.title` | NEWS |
| `news.caption` | AOMG 소식 |
| `news.subtitle` | 발매, 수상, 새 얼굴 소식. |

### artist.html

| 키 | 문구 |
|---|---|
| `detail.label` | AOMG ARTIST |
| `detail.back` | [ BACK TO ARTISTS ] |
| `detail.about.title` | ABOUT |
| `detail.releases.title` / `.caption` | RELEASES / 발매 |
| `detail.videos.title` / `.caption` | VIDEOS / 영상 |
| `detail.live.title` / `.caption` | LIVE / 공연 |
| `detail.news.title` / `.caption` | NEWS / 소식 |
| `detail.related.title` / `.caption` | MORE FROM AOMG / 다른 아티스트 |
| `detail.links.title` / `.caption` | FOLLOW / 공식 채널 |
| `detail.notFound` | 찾는 아티스트가 없어요. 키비츠 페이지를 대신 보여드려요. |
| 아티스트별 `name`, `nameKo`, `tagline`, `bio` | 4-2, 4-2-1 표 |

---

## 8. 모바일에서 줄바꿈이 필요한 문장 (375px 기준)

| 문장 | 위치 | 모바일 줄바꿈 | 방법 |
|---|---|---|---|
| AOMG의 새 걸크루, 키비츠의 첫 EP. | `#hero` subtitle (ko-lead 20px) | AOMG의 새 걸크루,<br>키비츠의 첫 EP. | `<br class="m-only">` |
| 소리를 켜면 화면이 비트에 반응해요. | `#hero` body | 소리를 켜면<br>화면이 비트에 반응해요. | `<br class="m-only">` |
| OXY_GEN | `#hero` title (display-0 60px) | 줄바꿈 없음 (7자) | `white-space: nowrap` |
| KEYVEATZ — 1ST EP | `#hero` label | KEYVEATZ<br>1ST EP | 모바일에서 대시 숨기고 2줄 |
| 트랙을 고르면 파형이 그 비트를 따라 움직인다. | `#now-playing` subtitle | 트랙을 고르면 파형이<br>그 비트를 따라 움직인다. | `<br class="m-only">` |
| 데모 비트예요. 키비츠의 전체 곡은 스트리밍에서 들을 수 있어요. | `#now-playing` note | 데모 비트예요.<br>키비츠의 전체 곡은<br>스트리밍에서 들을 수 있어요. | 문장 단위 + 어절 |
| 이름을 누르면 음악과 영상, 공연이 한 페이지에 모여 있어요. | `#artists` body | 이름을 누르면 음악과 영상,<br>공연이 한 페이지에 모여 있어요. | `<br class="m-only">` |
| 아티스트명 10개 | `#artists` 목록 (display-0 60px) | 이름 단위로만 줄바꿈. `KOREAN ZOMBIE`는 2줄 허용 | 이름마다 `white-space: nowrap`, 양쪽 정렬은 768px 이상에서만 |
| AOMG의 앨범을 연도별로 넘겨본다. | `#discography` subtitle | AOMG의 앨범을<br>연도별로 넘겨본다. | `<br class="m-only">` |
| 지금 예정된 공연이 없어요. 새 일정은 공식 인스타그램에서 확인할 수 있어요. | 공연 빈 상태 | 지금 예정된 공연이 없어요.<br>새 일정은 공식 인스타그램에서<br>확인할 수 있어요. | 문장 단위 + 어절 |
| 기안84, 제62회 백상예술대상 방송부문 남자 예능상 | 뉴스 카드 2 (2열 카드 폭 약 172px) | 3줄 허용 | `word-break: keep-all` |
| [Point Of View: U], [HAN : Cooked] | Discography 텍스트 카드 | 단어 단위 | `word-break: keep-all`, `overflow-wrap: anywhere`는 쓰지 않음 |
| 비공식 컨셉 리디자인 · 비상업적 포트폴리오. 모든 아티스트명·이미지·음원의 권리는 … | Footer 면책 | 비공식 컨셉 리디자인 · 비상업적 포트폴리오.<br>모든 아티스트명·이미지·음원의 권리는<br>AOMG와 각 권리자에게 있습니다. | 문장 단위 |

- 한글이 들어가는 모든 텍스트 요소에 `word-break: keep-all` (어절 중간에서 끊기지 않게).
- `<br class="m-only">`는 767px 이하에서만 보이고, 데스크톱에서는 `display: none`.
