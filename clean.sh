#!/usr/bin/env bash

# ==============================================================================
# ppotal Monorepo Cleanup Script (clean.sh)
# Cleans build artifacts, cache directories, temp files, and logs across monorepo.
# ==============================================================================

set -e

# Change to the root directory where clean.sh is located
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "🧹 [ppotal] 빌드 산출물 및 임시 파일 정리 시작..."

# Function to safely remove directories and report
remove_dirs() {
  local pattern="$1"
  local description="$2"
  
  # Find matching directories excluding node_modules
  find "$ROOT_DIR" -type d -name "$pattern" -not -path "*/node_modules/*" 2>/dev/null | while read -r dir; do
    if [ -d "$dir" ]; then
      rel_path="${dir#$ROOT_DIR/}"
      echo "  🗑️  삭제: $rel_path ($description)"
      rm -rf "$dir"
    fi
  done
}

# Function to safely remove files matching a pattern
remove_files() {
  local pattern="$1"
  local description="$2"
  
  find "$ROOT_DIR" -type f -name "$pattern" -not -path "*/node_modules/*" 2>/dev/null | while read -r file; do
    if [ -f "$file" ]; then
      rel_path="${file#$ROOT_DIR/}"
      echo "  📄 삭제: $rel_path ($description)"
      rm -f "$file"
    fi
  done
}

echo ""
echo "📦 1. 빌드 산출물 및 정적 Export 정리..."
remove_dirs ".next" "Next.js 빌드 캐시"
remove_dirs "out" "Next.js 정적 Export 디렉토리"
remove_dirs "dist" "패키지 컴파일 산출물"
remove_dirs ".turbo" "Turborepo 캐시"
remove_dirs ".firebase" "Firebase 로컬 캐시"

echo ""
echo "📝 2. 임시 파일 및 시스템 메타 파일 정리..."
remove_files ".DS_Store" "macOS 메타데이터"
remove_files "Thumbs.db" "Windows 썸네일 캐시"
remove_files "*.tsbuildinfo" "TypeScript 빌드 캐시"
remove_files "*.tmp" "임시 파일"
remove_files "*.temp" "임시 파일"
remove_files "*.swp" "Vim 스왑 파일"
remove_files "*~" "에디터 백업 파일"
remove_files ".eslintcache" "ESLint 캐시"

echo ""
echo "📋 3. 로그 및 디버그 파일 정리..."
remove_files "npm-debug.log*" "npm 로그"
remove_files "pnpm-debug.log*" "pnpm 로그"
remove_files "yarn-debug.log*" "yarn 로그"
remove_files "yarn-error.log*" "yarn 에러 로그"
remove_files "firebase-debug.log*" "Firebase 디버그 로그"
remove_files "firestore-debug.log*" "Firestore 디버그 로그"

echo ""
echo "✨ [ppotal] 정리가 완료되었습니다!"
