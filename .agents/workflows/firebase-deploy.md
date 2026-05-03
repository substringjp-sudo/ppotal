---
description: 
---

# Workflow: Firebase Deploy

순서대로 실행. 각 단계 실패 시 멈추고 보고:
1. `pnpm typecheck && pnpm lint`
2. `pnpm test` (있으면)
3. `pnpm build`
4. Firestore 보안 규칙 변경 있는지 확인. 있으면 사용자에게 보여줘.
5. `firebase deploy --only hosting,functions,firestore:rules` 실행 전 사용자 승인 요청.
6. 배포 후 production URL 출력하고 헬스체크 제안.

⚠️ functions만 배포할 때도 환경변수 / secret이 production에 동기화됐는지 확인.