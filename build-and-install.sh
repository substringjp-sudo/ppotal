#!/usr/bin/env bash

# ==============================================================================
# ppotal Monorepo Build & Deploy Script (build-and-install.sh)
# Builds all web applications and deploys them to Firebase Hosting.
# ==============================================================================

set -eo pipefail

# 루트 디렉토리 이동
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "=================================================="
echo "🚀 [ppotal] 모노레포 전체 빌드 및 호스팅 배포 시작"
echo "=================================================="

# 1. 필수 도구 점검
echo ""
echo "🔍 1. 필수 도구 확인 중..."
if ! command -v pnpm &> /dev/null; then
  echo "❌ pnpm이 설치되어 있지 않습니다. pnpm을 설치해 주세요."
  exit 1
fi

FIREBASE_CMD="firebase"
if ! command -v firebase &> /dev/null; then
  if npx --version &> /dev/null; then
    echo "ℹ️  글로벌 firebase CLI가 없어 npx firebase를 사용합니다."
    FIREBASE_CMD="npx firebase"
  else
    echo "❌ firebase CLI를 찾을 수 없습니다."
    exit 1
  fi
fi
echo "  ✅ pnpm: $(pnpm --version)"
echo "  ✅ firebase: $($FIREBASE_CMD --version 2>/dev/null || echo 'ready')"

# 2. 프로덕션 빌드 실행
echo ""
echo "🔨 2. 모든 웹 프로젝트 빌드 (Turbo)..."
export NODE_ENV=production
pnpm run build

# 3. 빌드 산출물 검증
echo ""
echo "📦 3. 정적 익스포트(out) 산출물 검증 중..."
REQUIRED_DIRS=(
  "apps/portal/out:portal"
  "apps/jprail/out:jprail"
  "apps/regionevel/apps/web/out:regionevel"
  "apps/p-plan/apps/web/out:p-plan"
)

MISSING_COUNT=0
for item in "${REQUIRED_DIRS[@]}"; do
  dir="${item%%:*}"
  target="${item##*:}"
  if [ -d "$dir" ] && [ "$(ls -A "$dir" 2>/dev/null)" ]; then
    echo "  ✅ [$target] 산출물 확인 완료: $dir"
  else
    echo "  ❌ [$target] 산출물이 없거나 비어 있습니다: $dir"
    MISSING_COUNT=$((MISSING_COUNT + 1))
  fi
done

if [ $MISSING_COUNT -gt 0 ]; then
  echo ""
  echo "❌ 빌드 산출물 검증 실패 ($MISSING_COUNT개 프로젝트 누락). 배포를 중단합니다."
  exit 1
fi

# 4. Firebase Hosting 배포
echo ""
TARGET_ARG="$1"

if [ -n "$TARGET_ARG" ]; then
  # 특정 타겟만 배포하는 경우 (예: ./build-and-install.sh portal)
  case "$TARGET_ARG" in
    portal|jprail|regionevel|p-plan)
      DEPLOY_TARGET="hosting:$TARGET_ARG"
      ;;
    hosting:*)
      DEPLOY_TARGET="$TARGET_ARG"
      ;;
    *)
      DEPLOY_TARGET="$TARGET_ARG"
      ;;
  esac
  echo "🌐 4. Firebase Hosting 특정 타겟 배포: $DEPLOY_TARGET"
  $FIREBASE_CMD deploy --only "$DEPLOY_TARGET"
else
  # 전체 호스팅 배포
  echo "🌐 4. Firebase Hosting 전체 타겟 배포..."
  $FIREBASE_CMD deploy --only hosting
fi

echo ""
echo "=================================================="
echo "✨ [ppotal] 모든 프로젝트 배포가 성공적으로 완료되었습니다!"
echo "=================================================="
