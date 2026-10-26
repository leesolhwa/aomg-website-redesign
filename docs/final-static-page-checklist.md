# 최종 정적 페이지 체크리스트 (12단계 완료 기준)

검수일: 2026-10-26 · 최종 라운드: 4 · 결과: **완료**

## 완료 조건

| 조건 | 결과 | 근거 |
|---|---|---|
| 전체 페이지 존재 | ✅ | `index.html`, `artist.html` (prd.md 확정 2페이지, 10팀 + 없는 id 렌더링 확인) |
| GNB/Footer/CTA 링크가 실제 페이지로 연결 | ✅ | 내부 링크·앵커 전수 확인 0건 깨짐. 상세 GNB → `index.html#섹션` 이동 확인 |
| 이미지 경로 깨짐 없음 | ✅ | HTML·data.js 이미지 경로 전수 확인, 렌더링 중 깨진 이미지 0 |
| 더미 텍스트 없음 | ✅ | lorem/TODO/undefined/null/`[needs-check]` 화면 노출 0 |
| 모바일에서 텍스트·버튼·이미지 겹침·잘림 없음 | ✅ | 390·430px 겹침 0, 히어로 CTA가 플레이어 위 |
| 불필요한 가로 스크롤 없음 | ✅ | 6개 폭 × 12개 페이지 상태 scrollWidth = 화면 폭 |
| 브라우저 콘솔 에러 없음 | ✅ | 정적 32회 + 동작 20시나리오 × 3회, 콘솔 오류·HTTP 4xx 0 (샌드박스의 외부 폰트 차단 메시지는 제외) |
| Critical/Major 모두 수정 | ✅ | Major 7건 수정, 남은 Critical/Major 0 |

## 페이지별

| 항목 | index.html | artist.html |
|---|---|---|
| PRD 섹션 순서 | ✅ hero → now-playing → artists → discography → live → news → contact | ✅ artist-hero → about → releases → videos → artist-live → artist-news → related → links → contact |
| 공통 GNB·Footer·미니 플레이어 | ✅ | ✅ (Footer·플레이어 마크업 동일) |
| 독립적으로 읽힘 | ✅ | ✅ (데이터 없는 섹션 자동 숨김) |
| 목록 → 상세 실제 이동 | ✅ 아티스트 10개 링크 | ✅ 관련 아티스트 → 다른 상세 |
| CTA | AUDIO ON, LISTEN, PLAY, PREV/NEXT, INSTAGRAM | BACK TO ARTISTS, PLAY, LISTEN, WATCH, 공식 채널 |

## 기능

| 기능 | 결과 |
|---|---|
| 소리 켜기/끄기, 트랙 전환, 일시정지 | ✅ |
| 비주얼라이저 (재생 중 막대, 무음·동작 줄이기 정적 파형) | ✅ |
| 페이지 이동 후 플레이어 상태 복원 | ✅ |
| 연도 전환 (버튼, 화살표 키) | ✅ |
| 모바일 메뉴 (열기, 닫기, Esc, 링크 이동) | ✅ |
| 부드러운 앵커 이동 (같은 페이지) | ✅ |
| 섹션 등장 효과 | ✅ (JS 없거나 동작 줄이기면 바로 보임) |
| 없는 아티스트 id 처리 | ✅ |

## 접근성

| 항목 | 결과 |
|---|---|
| alt | ✅ 전 이미지 |
| landmark / h1 1개 / 건너뛰기 링크 | ✅ |
| 키보드 포커스 표시 | ✅ Tab 40회 |
| 터치 영역 44px | ✅ (본문 문장 안 링크 제외) |
| 외부 링크 새 창 안내 + noopener | ✅ |
| 동작 줄이기 | ✅ |
| 깜빡임 | ✅ 밝기·색 깜빡임 없음 (비트 반응은 크기만) |

## KODE 인터랙션 (2026-10-26 추가)

| 기능 | 결과 |
|---|---|
| 인트로 타이핑 → A·O·M·G가 모여 로고로 교체 → `[ ENTER ]` 하나, 포커스 가둠, 재방문 생략 | ✅ |
| 히어로 문장 ABOVE / ORDINARY / MUSIC / GROUP 4줄 | ✅ |
| 히어로 3D 오브제(obj-bold) 마우스 올린 부분만 조각 / 벗어나면 복원 / 드래그 회전 | ✅ |
| 섹션 캡션·조작 안내 문구 제거 | ✅ |
| 파비콘 logo_thin (SVG + PNG 대체) | ✅ |
| CSS·JS 버전 주소 (캐시로 예전 파일과 섞이지 않음) | ✅ |
| WebGL 불가·JS 꺼짐 시 HTML 문장 표시 | ✅ |
| 발매 기록 스크롤 고정 + 연도 전환 + PREV/NEXT | ✅ |
| 긁어서 포스터 공개 + REVEAL 버튼 | ✅ |
| 마우스 트레일 (마우스 환경만), 푸터 3D | ✅ |
| 동작 줄이기: 인트로 즉시 버튼, 3D 자동 회전 끔, 고정·긁기 해제 | ✅ |

## 다음 단계
- 13단계 디자인 고도화: `static-page-fix-log.md`의 Defer 표
- 배포 후 실제 폰트로 최종 확인 (GitHub Pages)
