---
description: 
---

# Workflow: Add Secret

1. 시크릿 이름 (UPPER_SNAKE_CASE).
2. 값은 절대 채팅에 노출하지 않는다. `gcloud secrets create [NAME] --data-file=-` 패턴 안내.
3. IAM 권한 부여 명령 (Cloud Run / Functions 서비스 계정에 secretAccessor).
4. 코드에서 참조하는 방법 (Cloud Run env var 또는 functions secret).