---
description: 
---

# Workflow: Add Cloud Function

새 Cloud Function을 만들 때:
1. trigger 종류 결정 (HTTP / Firestore / Storage / Scheduled).
2. functions/src/[domain]/ 아래에 파일 생성.
3. 리전은 asia-northeast3 기본.
4. Zod로 input 검증 추가.
5. error handling과 로깅 (logger.info/warn/error).
6. functions/src/index.ts에 export 추가.
7. 로컬 emulator로 테스트 방법 안내.