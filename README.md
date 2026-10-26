# aomg-website-redesign

AOMG Website Redesign — Brand Identity, UI/UX & Interactive Web Experience

> 비공식 컨셉 리디자인 · 비상업적 포트폴리오. 모든 아티스트명·이미지·음원의 권리는 AOMG 및 각 권리자에게 있습니다.

## 개요
- 브랜드: AOMG (힙합·R&B 레이블)
- 컨셉: **Interact with the Beat** — 사운드에 반응하는 레이블 플랫폼
- 범위: 메인(`index.html`) + 아티스트 상세(`artist.html`)
- 기술: HTML / CSS / JavaScript, Web Audio API, View Transitions API
- 기준 레퍼런스: [KODE Immersive](https://kodeimmersive.com/)

## 문서
| 파일 | 내용 |
|---|---|
| [docs/prd.md](docs/prd.md) | 사이트맵, 페이지별 섹션, 완료 기준 |
| [docs/copy-strategy.md](docs/copy-strategy.md) | 세계관, 문체 기준, 페이지별 카피 |
| [docs/reference-analysis.md](docs/reference-analysis.md) | 레퍼런스 분석, 적용·변형·금지 기준 |
| [tokens.json](tokens.json) | 디자인 토큰 (실측·조정·임시 구분) |
| [docs/kode-reference-measurements.md](docs/kode-reference-measurements.md) | 레퍼런스 실측 원본 기록 |
| [img/README.md](img/README.md) | 이미지 출처와 적용 섹션 |

## 구조
```
index.html            메인
artist.html           아티스트 상세 (?id=keyveatz)
css/style.css         tokens.json 기반 CSS 변수 + 스타일
js/data.js            아티스트·릴리즈·뉴스 데이터
js/player.js          오디오·미니 플레이어·비주얼라이저
js/script.js          GNB·렌더링·상세페이지
img/                  AOMG 공식 사이트 이미지
audio/                데모 음원
docs/                 기획 문서
tokens.json           디자인 토큰
```

## 이미지 받기
GitHub Actions가 push 시 자동으로 받아 `img/`에 커밋한다. 로컬에서는:
```bash
cd img && bash download-images.sh
```
