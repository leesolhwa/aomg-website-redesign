# 이미지 매니페스트

- 원본: AOMG 공식 사이트 https://www.aomgofficial.com/ (Squarespace CDN)
- 확인일: 2026-10-26
- 다운로드: GitHub Actions(`.github/workflows/download-images.yml`)가 저장소에 push될 때 자동 실행해 이 폴더에 커밋한다. 로컬에서는 이 폴더에서 `bash download-images.sh`
- 파일명 규칙: 섹션 용도 접두어 — `artist-*`(#artists, #artist-hero), `release-*`(#hero, #now-playing, #discography, #releases), `news-*`(#news, #live, #artist-news), `video-*`(#videos), `logo-*`(GNB·Player·Footer)
- 작업 환경(Claude 클라우드 컨테이너)에서 직접 다운로드 실패: images.squarespace-cdn.com 접속이 프록시에서 403으로 차단됨 → GitHub Actions로 대체
- 생성 이미지: 없음. 히어로용 16:9 키비주얼은 원본에 없지만, 1:1 커버 + accent 배경 + 초대형 타이포 구성으로 대신함
- 스톡 이미지: 사용하지 않음

| 파일명 | 원본 페이지 | 원본 크기 | 비율 | 적용 섹션 | 대체 텍스트 (alt) |
|---|---|---|---|---|---|
| logo-aomg.png | 전 페이지 헤더 | 320×109 | — | GNB, 미니 플레이어, 푸터 (저해상도 → SVG 재작업 권장) | AOMG |
| artist-yugyeom.jpg | /artists | 2500×2500 | 1:1 | Artist Universe | 유겸 프로필 사진 |
| artist-jvckiwai.jpg | /artists | 3401×3401 | 1:1 | Artist Universe | 재키와이 프로필 사진 |
| artist-kian84.jpg | /artists | 2252×2252 | 1:1 | Artist Universe | 기안84 프로필 사진 |
| artist-koreanzombie.jpg | /artists | 2500×2500 | 1:1 | Artist Universe | 정찬성 프로필 사진 |
| artist-leemijoo.jpg | /artists | 3000×3000 | 1:1 | Artist Universe | 이미주 프로필 사진 |
| artist-uglyduck.jpg | /artists | 800×800 | 1:1 | Artist Universe (저해상도 주의) | 어글리 덕 프로필 사진 |
| artist-kimkipyo.jpg | /artists | 3000×3000 | 1:1 | Artist Universe | 김기표 프로필 사진 |
| artist-punchnello.png | /artists | 3155×3155 | 1:1 | Artist Universe | 펀치넬로 프로필 사진 |
| artist-keyveatz.jpg | /artists | 5760×5760 | 1:1 | Artist Universe, **상세 히어로** | 키비츠 프로필 사진 |
| artist-sikkoo.jpg | /artists | 1722×1722 | 1:1 | Artist Universe | 식구 프로필 사진 |
| release-keyveatz-oxygen.jpg | /keyveatz | 3000×3000 | 1:1 | **Immersive Hero**, Now Playing, Discography, 상세 릴리즈 (OXY_GEN 커버인지 needs-check) | OXY_GEN 앨범 커버 |
| release-keyveatz-keybeats.jpg | /keyveatz | 3000×3000 | 1:1 | Discography, 상세 릴리즈 | KEY BEATS 앨범 커버 |
| news-keyveatz-messygirls.jpg | / (홈 피드) | 500×625 | 4:5 | Stories & News, 상세 뉴스 | 키비츠 첫 EP [OXY_GEN] 발매 / (Live 섹션) 키비츠 홍보 이미지 |
| news-kian84-baeksang.jpg | / (홈 피드) | 500×375 | 4:3 → 4:5 크롭 | Stories & News | 기안84, 제62회 백상예술대상 방송부문 남자 예능상 |
| news-keyveatz-kangyeseul.jpg | / (홈 피드) | 500×673 | 약 3:4 → 4:5 크롭 | Stories & News, 상세 뉴스 | 키비츠 크루 소개 — KANG YESEUL |
| news-keyveatz-umjione.jpg | / (홈 피드) | 500×673 | 약 3:4 → 4:5 크롭 | Stories & News, 상세 뉴스 | 키비츠 크루 소개 — UM JIONE |
| video-keyveatz-01~03.jpg | /keyveatz | 480×360 | 4:3 | 상세 대표 영상 (저해상도 → 유튜브 maxresdefault로 교체 needs-check) | 키비츠 영상 썸네일 (제목 확인 후 영상 제목으로 교체) |

## 참고
- 현재 소속 아티스트 10팀 (공식 /artists 기준): YUGYEOM, Jvcki Wai, KIAN84, KOREAN ZOMBIE, LEE MI JOO, Ugly Duck, KIMKIPYØ, punchnello, Keyveatz, SIKKOO
- 계약 종료 공지가 있는 후디(Hoody) 관련 이미지는 제외
- 홈 피드 이미지는 화면에 500px로 표시되지만 `?format=2500w`로 받으면 고해상도 원본이 내려옴 (예: messygirls 2500×3125 확인). 위 표의 "원본 크기"는 화면 표시 크기
- Ugly Duck 프로필은 원본 자체가 800×800이라 확대 시 흐릿함
- 모든 이미지의 권리는 AOMG 및 각 권리자에게 있음 (비상업적 포트폴리오 용도)
