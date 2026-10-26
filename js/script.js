/* AOMG Concept Redesign — script.js
 * GNB · 섹션 렌더링 · 상세페이지 (prd.md 8장 "js 최소 인터랙션")
 * 데이터: js/data.js / 카피: docs/copy-strategy.md
 * 1차 정적 페이지 제작 단계에서 구현
 *
 * [ ] 모바일 메뉴 열기·닫기 (Esc, aria-expanded)
 * [ ] index: data-render="tracks | artists | discography | events | news" 렌더링
 * [ ] Artist Universe hover·focus 프로필 표시, 링크 artist.html?id={id}
 * [ ] Discography 연도 전환 (스크롤 고정·PREV/NEXT·화살표 키, reduced-motion 시 목록)
 * [ ] 빈 데이터: data-empty 영역 표시
 * [ ] artist.html: ?id= 읽기(없으면 keyveatz) → 렌더링, 테마 변수(--artist-*) 주입, title/meta 갱신
 * [ ] artist.html: 데이터 없는 data-section 섹션은 hidden
 * [ ] View Transitions: 프로필 이미지 view-transition-name 연결
 */
