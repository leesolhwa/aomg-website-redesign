/* AOMG Concept Redesign — player.js
 * 오디오 엔진 · 미니 플레이어 · 비주얼라이저 (prd.md 8장 "js 최소 인터랙션")
 * 1차 정적 페이지 제작 단계에서 구현
 *
 * [ ] AudioContext는 [ AUDIO ON ] 클릭 후 생성/resume (무음 기본값)
 * [ ] TRACKS 재생·정지·전환, 파일 로드 실패 시 합성 데모 비트로 대체
 * [ ] AnalyserNode → #visualizer Canvas (requestAnimationFrame)
 * [ ] 비트 반응은 scale·translate·파형 높이만 (1초 3회 넘는 깜빡임 금지)
 * [ ] 미니 플레이어 제목·진행바·aria 갱신
 * [ ] 페이지 이동 시 sessionStorage에 트랙·재생 위치 저장 → 다음 페이지에서 일시정지 상태로 복원
 * [ ] prefers-reduced-motion: 정적 파형
 */
