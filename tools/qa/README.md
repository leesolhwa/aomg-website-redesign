# QA 스크립트 (12단계)

로컬 서버를 띄운 뒤 실행 (Python + Playwright 필요):
```bash
python3 -m http.server 8765 --bind 127.0.0.1 &
python3 tools/qa/static_check.py /tmp/qa all      # 12개 페이지 상태 × 6개 폭 정적 검사 + 전체 캡처
python3 tools/qa/interaction_check.py             # 20개 동작 시나리오
```
결과 기록: `docs/static-page-qa-report.md`, `docs/static-page-fix-log.md`, `docs/final-static-page-checklist.md`
