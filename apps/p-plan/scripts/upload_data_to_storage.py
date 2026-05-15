"""
Firebase Storage 데이터 업로드 스크립트

로컬 data/ 디렉터리의 정적 데이터 파일들을 Firebase Storage의 data/ 경로에 업로드합니다.
앱 재배포 없이 데이터를 갱신할 수 있습니다.

업로드 대상:
  data/region/tree.json
  data/region/thumbnails.json
  data/region/countries.json
  data/region/prefectures.json
  data/region/cities.json
  data/region/geoms/**/*.json     (GeoJSON 경계 데이터)
  data/airport/airports.json
  data/airport/countries/*.json  (국가별 공항 파일)
  data/airlines.json
  data/routes.json

사용법:
  # 전체 업로드
  python scripts/upload_data_to_storage.py

  # 특정 경로만 업로드
  python scripts/upload_data_to_storage.py --path region/tree.json
  python scripts/upload_data_to_storage.py --path region/geoms
  python scripts/upload_data_to_storage.py --path airport/countries

  # Dry-run (실제 업로드 없이 목록만 출력)
  python scripts/upload_data_to_storage.py --dry-run

환경 변수:
  FIREBASE_SERVICE_ACCOUNT  서비스 계정 JSON 파일 경로 (기본값: serviceAccountKey.json)
  FIREBASE_STORAGE_BUCKET   Storage 버킷 이름 (기본값: pplan-52a07.firebasestorage.app)
"""

import os
import sys
import argparse
import mimetypes
import firebase_admin
from firebase_admin import credentials, storage

# ── 설정 ──────────────────────────────────────────────────────────────────────

SERVICE_ACCOUNT_PATH = os.getenv("FIREBASE_SERVICE_ACCOUNT", "serviceAccountKey.json")
BUCKET_NAME = os.getenv("FIREBASE_STORAGE_BUCKET", "pplan-52a07.firebasestorage.app")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOCAL_DATA_DIR = os.path.join(BASE_DIR, "data")

# Storage에서 사용할 루트 prefix
STORAGE_DATA_PREFIX = "data"

# 업로드할 대상 경로 목록 (LOCAL_DATA_DIR 기준 상대 경로)
UPLOAD_TARGETS = [
    # 지역 계층 트리 (countries → prefectures → cities)
    "region/tree.json",
    # 지역 썸네일 매핑
    "region/thumbnails.json",
    # 지역 메타데이터 (useRegionSearch용 평탄화 목록)
    "region/countries.json",
    "region/prefectures.json",
    "region/cities.json",
    # GeoJSON 경계 데이터 (디렉터리 → 재귀 업로드)
    "region/geoms",
    # 공항 전체 목록
    "airport/airports.json",
    # 국가별 분할 공항 파일 (디렉터리 → 재귀 업로드)
    "airport/countries",
    # 항공사 목록
    "airlines.json",
    # 항공 노선 (지도 시각화용)
    "routes.json",
]

# ── Firebase 초기화 ────────────────────────────────────────────────────────────

def init_firebase():
    if firebase_admin._apps:
        return storage.bucket()

    service_account = os.path.join(BASE_DIR, SERVICE_ACCOUNT_PATH)
    if not os.path.exists(service_account):
        print(f"[ERROR] 서비스 계정 파일을 찾을 수 없습니다: {service_account}")
        print("  FIREBASE_SERVICE_ACCOUNT 환경 변수로 경로를 지정하세요.")
        sys.exit(1)

    cred = credentials.Certificate(service_account)
    firebase_admin.initialize_app(cred, {"storageBucket": BUCKET_NAME})
    return storage.bucket()

# ── 업로드 헬퍼 ───────────────────────────────────────────────────────────────

def get_content_type(file_path: str) -> str:
    if file_path.endswith(".json"):
        return "application/json"
    ct, _ = mimetypes.guess_type(file_path)
    return ct or "application/octet-stream"

def upload_file(bucket, local_path: str, storage_path: str, dry_run: bool) -> bool:
    """단일 파일을 Firebase Storage에 업로드합니다."""
    if not os.path.isfile(local_path):
        print(f"  [SKIP] 파일 없음: {local_path}")
        return False

    size_kb = os.path.getsize(local_path) / 1024
    print(f"  {'[DRY]' if dry_run else '[UP] '} {storage_path}  ({size_kb:.1f} KB)")

    if dry_run:
        return True

    try:
        blob = bucket.blob(storage_path)
        blob.upload_from_filename(local_path, content_type=get_content_type(local_path))
        # 공개 읽기는 Storage rules에서 허용하므로 make_public() 불필요
        return True
    except Exception as e:
        print(f"  [ERROR] {storage_path}: {e}")
        return False

def upload_directory(bucket, local_dir: str, storage_dir: str, dry_run: bool) -> tuple[int, int]:
    """디렉터리 내 모든 파일을 재귀 업로드합니다."""
    ok, fail = 0, 0
    for root, _, files in os.walk(local_dir):
        for fname in sorted(files):
            local_path = os.path.join(root, fname)
            rel = os.path.relpath(local_path, local_dir)
            storage_path = f"{storage_dir}/{rel.replace(os.sep, '/')}"
            if upload_file(bucket, local_path, storage_path, dry_run):
                ok += 1
            else:
                fail += 1
    return ok, fail

# ── 메인 ──────────────────────────────────────────────────────────────────────

def resolve_targets(filter_path: any) -> list:
    """업로드 대상 목록을 반환합니다. filter_path가 있으면 해당 경로만 포함합니다."""
    if not filter_path:
        return UPLOAD_TARGETS
    # 부분 일치로 필터링 (예: 'region/geoms' → 해당 항목만)
    return [t for t in UPLOAD_TARGETS if t.startswith(filter_path) or filter_path.startswith(t)]

def main():
    parser = argparse.ArgumentParser(description="Firebase Storage 데이터 업로드")
    parser.add_argument("--path", help="업로드할 특정 경로 (예: region/tree.json, region/geoms)")
    parser.add_argument("--dry-run", action="store_true", help="실제 업로드 없이 목록만 출력")
    args = parser.parse_args()

    bucket = None if args.dry_run else init_firebase()

    targets = resolve_targets(args.path)
    if not targets:
        print(f"[WARN] '{args.path}'에 해당하는 업로드 대상이 없습니다.")
        return

    total_ok, total_fail = 0, 0

    print(f"\n{'[DRY-RUN] ' if args.dry_run else ''}Firebase Storage 업로드 시작")
    print(f"  버킷: {BUCKET_NAME}")
    print(f"  로컬: {LOCAL_DATA_DIR}\n")

    for target in targets:
        local_path = os.path.join(LOCAL_DATA_DIR, target.replace("/", os.sep))
        storage_path = f"{STORAGE_DATA_PREFIX}/{target}"

        if os.path.isdir(local_path):
            print(f"[DIR] {target}/")
            ok, fail = upload_directory(bucket, local_path, storage_path, args.dry_run)
        elif os.path.isfile(local_path):
            print(f"[FILE] {target}")
            ok = 1 if upload_file(bucket, local_path, storage_path, args.dry_run) else 0
            fail = 1 - ok
        else:
            print(f"[SKIP] 존재하지 않음: {local_path}")
            ok, fail = 0, 0

        total_ok += ok
        total_fail += fail

    print(f"\n완료: 성공 {total_ok}개, 실패 {total_fail}개")
    if total_fail > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()
