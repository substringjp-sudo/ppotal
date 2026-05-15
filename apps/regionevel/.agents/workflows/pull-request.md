---
description: 
---

# Workflow: Create PR

1. 현재 브랜치 확인. main/master면 새 브랜치 만들 것 제안.
2. 변경사항 요약 (git diff main...HEAD).
3. PR 제목: conventional commit 스타일, 72자 이내.
4. PR 본문 템플릿:
   ## 변경 요약
   ## 변경 이유
   ## 테스트 방법
   ## 스크린샷 (UI 변경 시)
   ## 체크리스트
   - [ ] typecheck 통과
   - [ ] lint 통과
   - [ ] 보안 규칙 영향 검토 (Firebase 프로젝트)
5. `gh pr create` 명령 실행 전 사용자 승인.