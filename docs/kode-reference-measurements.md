# KODE Immersive 실측값 (reference-analysis.md / tokens.json 갱신용)

- URL: https://kodeimmersive.com/
- 측정일: 2026-10-26
- 측정 방법: 실제 브라우저에서 1440×900 뷰포트로 열고, Computed Style과 CSS 규칙을 직접 추출
- 기술 스택: Nuxt(Vue) + Tailwind CSS, 주요 비주얼은 WebGL canvas
- 서브페이지: **없음** (원페이지 사이트. 외부 링크는 kodemedia.com과 mailto뿐) → 상세페이지 참고 URL은 "없음"

---

## 1. 폰트

| 용도 | font-family | 비고 |
|---|---|---|
| 디스플레이(초대형 제목, 숫자) | `"OT Brut"` | 콘덴스드 세리프, 상업 폰트 |
| 본문, 내비게이션, 버튼, 중간 제목 | `"Aeonik Pro", "Helvetica Neue", Helvetica, Arial, sans-serif` | 그로테스크 산세리프, 상업 폰트 |

- **font-weight는 전부 400.** 굵은 서체를 쓰지 않고 크기와 대문자로만 위계를 만듦
- 거의 모든 텍스트가 `text-transform: uppercase`
- 루트 font-size: 16px

## 2. 타이포 스케일 (실측)

크기 규칙: 390px 미만은 고정값(mobile), 390~1440px은 `calc()` 유동 크기, 1440px 이상은 고정값(desktop)

| 클래스 | 폰트 | mobile | 유동(390~1440) | desktop | line-height | letter-spacing | 실제 사용처 |
|---|---|---|---|---|---|---|---|
| display-4 | OT Brut | 60px | calc(8px + 13.3333vw) | 200px | 0.9 | -0.08em | 서비스 섹션 대형 숫자(00, 1, 2, 3)와 제목(IDEATE) |
| display-0 | OT Brut | 60px | calc(37.7143px + 5.71429vw) | 120px | 0.9 | normal | 양쪽 정렬 매니페스토 문장 |
| display-1 | (정의만 있고 화면 미사용) | 30px | calc(18.8571px + 2.85714vw) | 60px | 0.9 | -0.08em | — |
| display-3 | Aeonik Pro | 24px | calc(20.2857px + 0.95238vw) | 34px | 0.9 | normal | sub-hero 소개 문단 |
| display-2 | Aeonik Pro | 22px | calc(17.5429px + 1.14286vw) | 34px | 0.75 | normal | 푸터 대형 링크(KODE, LET'S CONNECT) |
| body-3 | Aeonik Pro | 16px | calc(13.7714px + 0.57143vw) | 22px | 0.75 | normal | 닫기 버튼 |
| body-4 | Aeonik Pro | 16px | calc(15.2571px + 0.19048vw) | 18px | 0.95 | normal | 보조 텍스트 |
| body-6 | Aeonik Pro | 14px | calc(12.5143px + 0.38095vw) | 18px | 0.95 | normal | 푸터 연락처, 도시명 |
| body-1 | Aeonik Pro | 14px | calc(13.2571px + 0.19048vw) | 16px | 0.75 | normal | GNB, 하단 바 링크 |
| body-5 | Aeonik Pro | 16px | 고정 | 16px | 0.75 | normal | 카운터 `[ 001 ]` |
| body-2 | Aeonik Pro | 12px | calc(11.2571px + 0.19048vw) | 14px | 0.75 | normal | 작은 라벨 |
| (서비스 설명 문단) | Aeonik Pro | — | — | 16px | 1.2 (19.2px) | normal | 서비스 단계 설명 |

⚠️ line-height 0.75~0.9는 영문 대문자 전용 값. **한글에 그대로 쓰면 줄이 겹침.**

## 3. 컬러

| 토큰 후보 | 값 | 사용처 |
|---|---|---|
| orange | `#FF4C00` (rgb 255,76,0) | html 배경(히어로, 매니페스토 구간), 강조 텍스트 |
| black | `#000000` | 텍스트(주로 오렌지·흰 배경 위), 푸터 배경 |
| white | `#FFFFFF` | 서비스·텍스트 섹션 배경, 검정 배경 위 텍스트 |

- **3색만 사용.** 회색, 그라데이션, 보조색 없음
- 명도 대비: 오렌지 위 검정 텍스트 6.3:1(통과), **오렌지 위 흰 텍스트 3.3:1(본문 기준 미달, 큰 제목만 가능)**

## 4. 레이아웃

| 항목 | 값 |
|---|---|
| 콘텐츠 max-width | **없음** (전체 폭 100%, full-bleed) |
| 좌우 패딩 | mobile `10px` (0.625rem) / 768px 이상 `22px` (1.375rem) |
| 그리드 | `.site-grid` — mobile **6열**, 768px 이상 **5열** |
| column gap | `10px` |
| row gap | `0` |
| breakpoint | `390px`(유동 타이포 시작), `768px`(레이아웃 전환), `1440px`(타이포 최대값 고정), `(hover: hover) and (pointer: fine)`(마우스 전용 효과) |
| GNB | `position: fixed`, 높이 약 `50px`, 좌우 패딩 `22px`, 배경 투명 |
| 하단 바 | `position: fixed; bottom: 0`, 높이 `60px`, 3열 그리드(좌: 로고 / 중앙: SOUND ON / 우: CONTACT) |

## 5. 섹션 구성 (위에서부터, 1440×900 기준)

| 순서 | 섹션 | 높이 | 패딩 | 배경 | 내용 |
|---|---|---|---|---|---|
| 0 | 프리로더 | 100vh | — | 검정 | 로고 + `[ ENTER ]` 버튼(입장 관문), 숫자 카운터 |
| 1 | 히어로 | 100vh (902px) | 0 | 오렌지 + WebGL | "INNOVATE WITH PURPOSE" 초대형 텍스트와 3D 셰브론 오브젝트(canvas) |
| 2 | sub-hero | 100vh (900px) | 0 22px | 오렌지 | display-3 소개 문단, 5열 그리드 배치 |
| 3 | justified-text-01 | 1420px | 128px 0 | 흰색 | OT Brut 120px 양쪽 정렬 대형 문장 |
| 4 | logo-draw | 814px | 96px 22px | 흰색 | "SCRATCH AROUND" 마우스로 긁어서 드러나는 로고 canvas(1396×448) + 짧은 문단 |
| 5 | services | 9900px (약 11화면) | 0 | 흰색 | 스크롤 고정(pin) 구간. 대형 숫자 00→1→2→3과 단계 제목이 바뀜, PREV/NEXT 버튼 |
| 6 | justified-text-02 | 1406px | 112px 0 256px, 내부 gap 160px | 흰색 | 대형 양쪽 정렬 문장 |
| 7 | footer | 100vh (900px) | 0 | 검정 | 대표 이름, 연락처, 도시, 대형 링크, 뉴스레터, 배경 3D |

- 섹션 간 고정 간격 없음. **각 섹션이 자기 패딩(96 / 112 / 128 / 256px)으로 리듬을 만듦**
- 상당수 섹션이 한 화면(100vh) 단위

## 6. 이미지와 미디어

- `<img>` 태그 사용 없음. **비주얼은 전부 WebGL canvas**
- 대부분 뷰포트를 꽉 채움(1440×900 = 16:10), logo-draw만 약 3.1:1
- 이미지 비율 토큰은 레퍼런스에서 가져올 값이 없음 → AOMG 앨범 커버(1:1), 아티스트 사진, 포스터 비율은 temporary token으로 정의 필요

## 7. 컴포넌트

| 항목 | 값 |
|---|---|
| 버튼 | 배경·테두리·radius 없음. 텍스트를 대괄호로 감싼 형태 `[ SOUND ON ]`, `[ ENTER ]` |
| 버튼 높이 | 텍스트 높이 그대로 12~26px (패딩 0) |
| radius | 전부 `0` |
| shadow | 없음 |
| border | 사실상 없음 |
| 카드 | **없음** (카드형 컨테이너를 쓰지 않음) |

## 8. 모션

- easing: `cubic-bezier(0, 0, 0.2, 1)`(ease-out), `cubic-bezier(0.4, 0, 0.2, 1)`
- duration: 150 / 200 / 300 / 500 / 1500ms
- 대괄호 버튼 hover: 괄호가 움직임(transform 0.3s) + 색 변화(0.5s)
- 기타: 마우스 트레일, 스크롤 고정 섹션, 긁어서 드러내기, 사운드 토글, 프리로더 카운터

---

## 9. AOMG 적용 판단

### 그대로 가져올 것
- **하단 고정 바(60px, 3열)** → AOMG 고정 미니 플레이어 자리로 그대로 사용 (좌: 로고 / 중앙: 재생 정보·Audio On / 우: 메뉴나 링크)
- **대괄호 텍스트 버튼** `[ AUDIO ON ]` → 사운드 토글과 CTA 스타일
- full-bleed + 좌우 패딩 22/10px + 5열(데스크톱)/6열(모바일) 그리드 + gap 10px
- 유동 타이포 방식(390px~1440px 사이 calc, 1440px에서 최대값 고정)
- 3색 이하의 절제된 팔레트, radius 0, shadow 없음
- 섹션마다 다른 패딩으로 리듬 만들기, 100vh 단위 섹션

### AOMG에 맞게 변형할 것
- **오렌지 #FF4C00을 그대로 쓰면 Kode 복제처럼 보임** → AOMG 다크 배경 기반으로 포인트 컬러를 조정. 오렌지 배경 위 본문은 검정 텍스트로
- **line-height**: 한글 제목 1.1~1.2, 한글 본문 1.5~1.7로 별도 토큰. 영문 대문자 제목만 0.9 유지
- **대문자 변환**: 한글에는 의미 없음. 영문 라벨에만 적용
- **폰트**: OT Brut, Aeonik Pro는 유료 폰트. 무료 대체(라틴) 후보는 디스플레이 세리프 Instrument Serif, 산세리프 Satoshi나 General Sans. 한글은 jy-ux-lab.md 기준
- **font-weight 400 고정 vs AOMG 문서의 "초대형 볼드 산세리프"**: 둘 중 하나를 결정해야 함 (Kode처럼 크기로만 위계를 줄지, AOMG답게 볼드를 쓸지)
- **카드**: Kode에는 카드가 없음. Artist Universe, Discography, Live Pulse, News 카드는 5열 그리드, gap 10px, radius 0 기준의 temporary token으로 새로 정의
- **services의 스크롤 고정 구간(약 11화면)** → Discography Wall이나 Artist Universe에 응용하되, 길이는 2~3화면 이내로 줄이기

### 가져오면 안 되는 것
- **`[ ENTER ]` 입장 관문**: "첫 화면 5초 안에 최신 릴리즈 이해" 목표와 충돌
- 11화면짜리 스크롤 고정 구간(정보 탐색을 막음)
- 히어로 텍스트를 canvas로만 렌더링하는 방식(검색, 스크린리더가 읽지 못함 → 실제 HTML 텍스트로)
- 오렌지 위 흰색 본문 텍스트(대비 미달)
