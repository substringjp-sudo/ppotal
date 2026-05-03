---
description: 
---

# Workflow: Deploy to Cloud Run

1. 현재 디렉토리에 Dockerfile 또는 buildpacks 호환 파일 확인.
2. 프로젝트 ID와 리전 확인 (`gcloud config list`).
3. 서비스 이름 결정 (kebab-case).
4. `gcloud run deploy [service] --source . --region asia-northeast3 --allow-unauthenticated` 명령 제안.
5. 사용자 승인 후 실행.
6. 배포 완료 후 URL 출력 + smoke test 제안.

⚠️ unauthenticated 허용 여부는 매번 확인.