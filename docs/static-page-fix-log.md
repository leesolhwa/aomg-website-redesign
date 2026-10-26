# 정적 페이지 수정 로그 (12단계)

| # | 라운드 | 심각도 | 문제 | 수정 파일 | 수정 내용 | 이유 | 재검수 |
|---|---|---|---|---|---|---|---|
| 1 | 1 | Major | 소식 카드 링크가 `display: contents`라 키보드 포커스 표시가 안 보임 | `css/style.css` | `.card__link`를 flex 블록 링크로 변경 | 접근성: 포커스 위치를 알 수 없음 | 통과 (Tab 40회 포커스 표시) |
| 2 | 1 | Major | 재생 시 없는 `audio/track-0N.mp3` 요청 → 404 콘솔 오류 | `js/data.js` | `src: null`로 변경, 파일을 넣을 때 경로 적도록 주석 | 콘솔 오류 0 조건. 파일이 없으면 합성 비트가 재생되므로 기능 영향 없음 | 통과 |
| 3 | 1 | Major | Now Playing에 PRD의 앨범 커버 누락 | `index.html`, `css/style.css` | `.now-playing__cover`(1:1) 추가 | PRD 4-1 "2열: 커버 + 트랙 목록" | 통과 |
| 4 | 1 | Major | 동작 줄이기 설정에서도 연도별 전환 방식 유지 | `js/script.js`, `css/style.css` | 동작 줄이기면 전체 연도를 목록으로 렌더링하고 PREV/NEXT 숨김 | PRD 4-1 완료 기준 | 통과 (years=5) |
| 5 | 1 | Minor | 푸터 이메일 링크 터치 높이 17px | `css/style.css` | `min-height: var(--hit-area)` | 모바일 터치 영역 44px | 통과 |
| 6 | 2 | Major | 페이지 이동 시 `InvalidStateError: Transition was aborted… opt-in disabled` 간헐 발생 | `index.html`, `artist.html`, `css/style.css`, `js/script.js` | ① `@view-transition`을 각 HTML `<head>` 인라인 `<style>`로 이동 ② 전환 Promise 거부 처리 ③ 부드러운 앵커 이동을 CSS에서 JS(같은 페이지 앵커만)로 이동 | 새 페이지가 첫 화면을 그릴 때 외부 CSS의 전환 설정이 아직 적용되지 않은 경우가 있었음. ③은 원인은 아니었지만 다른 페이지에서 `#섹션`으로 넘어올 때 즉시 위치를 잡도록 유지 | 6회 + 3회 연속 20/20 |
| 7 | 3 | Major | 768px에서 GNB 로고와 "NOW PLAYING" 겹침 | `css/style.css` | 메뉴 간격 768~1023px 40px, 1024px 이상 96px | 메뉴 5개 + 96px 간격이 태블릿 폭을 넘음 | 통과 |
| 8 | 3 | Major | 없는 아티스트 id 안내 문구가 고정 GNB 밑에 가려짐 | `js/script.js`, `css/style.css` | 안내 문구를 상세 히어로 본문 첫 줄로 이동 | 문구가 보이지 않음 | 통과 |

### 검사 도구 수정 (코드 변경 아님)
- 라운드 1: 텍스트 겹침 검사에서 inline 요소 제외 (줄 상자 합집합이라 오탐)
- 라운드 3: 겹침 검사 범위를 header·플레이어까지 확대, canvas를 빈 렌더 검사에서 제외

## 남은 Minor (이번 단계 미수정)

| 항목 | 내용 | 이유 |
|---|---|---|
| 모바일 메뉴 포커스 가두기 | 메뉴가 열려도 Tab으로 메뉴 밖 요소에 갈 수 있음 | 사용은 가능. 14단계 인터랙션에서 처리 |
| 웹폰트 실패 시 이름 줄바꿈 | 폰트 로드 실패 시 "PUNCHNELLO"가 글자 단위로 줄바꿈 (안전장치) | 실제 폰트에서는 한 줄에 들어감 |

## 13단계로 넘길 Defer

| 영역 | 내용 |
|---|---|
| 아티스트 목록 | 양쪽 정렬에서 이름이 한 줄에 하나만 오는 줄은 왼쪽 정렬로 남고, 이름 사이 간격이 고르지 않음. 한글 이름 라벨이 줄 끝에서 다음 줄로 넘어가는 경우 |
| 히어로 | 1700px 이상에서 커버가 커져 히어로가 화면 높이보다 길어짐 (CTA는 보임) |
| 레퍼런스 대비 | Kode의 매니페스토 문장, 3D 오브젝트 같은 "한 장면" 몰입감이 약함. 섹션 리듬은 맞지만 시각적 클라이맥스가 없음 |
| 로고 | GNB·플레이어·푸터가 텍스트 "AOMG". `logo-aomg.webp`는 미사용 → SVG 로고 제작 판단 |
| 비주얼라이저 | 막대형 기본 표현. 비트 반응 강도와 형태 |
| 이미지 | 영상 썸네일 480px 저해상도, 공연 포스터 없음(키비츠 홍보 이미지로 대체) |
| 카피 | 영상 제목, KEY BEATS·TRUST ME 등 일부 발매일, 이미주 소개 (`[needs-check]`, 화면 미노출) |
| 실제 폰트 확인 | 배포 후 실제 브라우저에서 Instrument Serif·Geist·Pretendard로 최종 확인 |
| 14단계 인터랙션 | 발매 기록 스크롤 고정 연도 전환, 메인 → 상세 사진 전환 효과 실기기 확인 |


---

## 추가 수정: KODE 인터랙션 복원 (2026-10-26)

| # | 구분 | 내용 | 파일 |
|---|---|---|---|
| 9 | 기능 추가 | 인트로 (카운터·타이핑·AOMG·ENTER 2종, 포커스 가둠, 세션 재방문 생략) | `index.html`, `js/effects.js`, `css/style.css` |
| 10 | 기능 추가 | 히어로 3D 유리 AOMG 로고 (드래그 회전, 누르면 조각, 비트 반응, 문장 굴절) | `js/logo3d.js`, `js/vendor/*`, `index.html`, `css/style.css` |
| 11 | 기능 추가 | 발매 기록 스크롤 고정 (300vh, 진행 막대, 안 들어가면 고정 해제) | `js/script.js`, `index.html`, `css/style.css` |
| 12 | 기능 추가 | 긁어서 드러나는 공연 포스터 + REVEAL 버튼 | `js/effects.js`, `index.html`, `css/style.css` |
| 13 | 기능 추가 | 마우스 트레일, 푸터 크롬 3D 로고 | `js/effects.js`, `js/logo3d.js`, `index.html`, `artist.html` |
| 14 | Major | 긁기 버튼 탐색 오류로 스크립트 중단 | `js/effects.js` |
| 15 | Major | 하단 릴리즈 정보와 문장 겹침 | `css/style.css`, `js/logo3d.js`, `index.html` |
| 16 | Major | 발매 기록 고정 해제 (1440×900, 모바일) | `css/style.css` |
| 17 | Major | 인트로 중 3D 렌더링으로 메인 스레드 점유 | `js/logo3d.js` |
| 18 | Minor | 경고 2건 (toNonIndexed, willReadFrequently) | `js/logo3d.js`, `js/effects.js` |

### Defer에서 해소된 항목
- 레퍼런스 대비 몰입감 부족 → 인트로·3D 히어로로 해소
- 발매 기록 스크롤 고정 → 구현

### 새 Defer (13단계)
- 3D 로고 재질(유리 vs 크롬)과 조각 크기, 모바일 굴절 효과(현재 성능 때문에 끔)
- 모바일 히어로 문장 크기 (폭 기준이라 위아래 여백이 큼)
- 실제 GPU·실제 폰트 환경에서 프레임 확인


---

## 추가 수정: 사용자 피드백 2차 (2026-10-26)

| # | 구분 | 내용 | 파일 |
|---|---|---|---|
| 19 | Critical | **예전 CSS가 브라우저 캐시에 남아 새 HTML과 섞임** → 인트로가 화면 위에 글자로만 표시, 히어로가 빈 빨간 화면. 원인: GitHub Pages `Cache-Control: max-age=600` + CSS·JS 주소에 버전 없음 | `index.html`, `artist.html` (모든 CSS·JS에 `?v=`) |
| 20 | 변경 | 히어로 문장 'ABOVE / ORDINARY / MUSIC / GROUP' 4줄 | `index.html` |
| 21 | 변경 | 3D 오브제를 사용자 제공 obj-bold.svg로 교체 (SVGLoader로 구멍 포함 입체화, 조각·회전 유지) | `js/logo3d.js`, `img/obj-bold.svg`, `js/vendor/SVGLoader.js` |
| 22 | 변경 | 파비콘을 사용자 제공 logo_thin으로 (다크 모드 대응 + PNG 대체) | `img/favicon*`, `img/apple-touch-icon.png`, 두 HTML |
| 23 | 변경 | 인트로 버튼 `[ ENTER ]` 하나 | `index.html`, `js/effects.js` |
| 24 | Minor | 푸터 오브제가 소셜 링크 글자와 겹쳐 읽기 어려움 → 어두운 크롬으로 | `js/logo3d.js` |
| 25 | 검사 도구 | 고정 시간 대기 → 조건 대기, 버전·파비콘·4줄 문장·단일 ENTER 검사 추가 | `tools/qa/interaction_check.py` |

재검수: 정적 32회 0건, 동작 35개 시나리오 통과 (6회 중 5회 전부 통과, 1회는 소프트웨어 3D 환경의 클릭 대기 시간 초과로 재현 안 됨)
