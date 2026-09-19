#!/usr/bin/env bash
# Deploy NAGIH GRAPHY trên server bằng cách kéo image từ GHCR. Chạy lại bao nhiêu lần cũng được.
#
#   Lần đầu:   xem DEPLOY.md mục 1–4 (tạo database, DNS, .env, thư mục ảnh), rồi:
#              bash deploy/server-deploy.sh --seed --admin chu@nagihgraphy.com
#   Cập nhật:  bash deploy/server-deploy.sh
#   Rollback:  IMAGE_TAG=sha-abc1234 bash deploy/server-deploy.sh
#
# Script này: kéo compose mới, đăng nhập GHCR nếu có token trong .env, pull image,
# chạy migration, bật service, chờ health. Không tự tạo .env, không tự tạo database,
# không seed nếu không được bảo.
set -euo pipefail

cd "$(dirname "$0")/.."

SEED=0
ADMIN_EMAIL=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --seed) SEED=1; shift ;;
    --admin) ADMIN_EMAIL="${2:-}"; shift 2 ;;
    *) echo "Tham số lạ: $1"; exit 1 ;;
  esac
done

if [[ ! -f .env ]]; then
  echo "Thiếu .env. Sao chép từ .env.example rồi điền theo DEPLOY.md mục 3."
  exit 1
fi
for key in DATABASE_URL AUTH_SECRET AUTH_URL SITE_DOMAIN DATABASE_NETWORK; do
  if ! grep -qE "^${key}=\"?[^\"]+\"?" .env; then
    echo "Thiếu ${key} trong .env"
    exit 1
  fi
done

# Đọc một biến từ .env, bỏ dấu nháy.
envval() { grep -E "^$1=" .env | head -1 | sed -E "s/^$1=\"?([^\"]*)\"?/\1/"; }

mkdir -p /srv/nagih/uploads /srv/nagih/backups

echo "==> Kéo compose và script mới"
git pull --ff-only

# Image nằm trong package private của GHCR nên server phải đăng nhập.
# Token là PAT classic có quyền read:packages, điền vào .env một lần.
GHCR_USER="$(envval GHCR_USER)"
GHCR_TOKEN="$(envval GHCR_TOKEN)"
if [[ -n "$GHCR_TOKEN" ]]; then
  echo "==> Đăng nhập GHCR"
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "${GHCR_USER:-haonnedu}" --password-stdin >/dev/null
fi

TAG="${IMAGE_TAG:-$(envval IMAGE_TAG)}"
TAG="${TAG:-latest}"
export IMAGE_TAG="$TAG"
echo "==> Kéo image tag ${IMAGE_TAG}"
docker compose --profile tools pull

echo "==> Migration"
docker compose --profile tools run --rm migrate

if [[ "$SEED" == "1" ]]; then
  echo "==> Seed dữ liệu ban đầu"
  docker compose --profile tools run --rm seed
fi

if [[ -n "$ADMIN_EMAIL" ]]; then
  echo "==> Tạo admin ${ADMIN_EMAIL}"
  read -r -s -p "Mật khẩu cho ${ADMIN_EMAIL}: " ADMIN_PASSWORD; echo
  docker compose --profile tools run --rm migrate \
    npx tsx scripts/create-admin.mts --email "$ADMIN_EMAIL" --password "$ADMIN_PASSWORD" --role OWNER
fi

echo "==> Bật service"
docker compose up -d --remove-orphans

echo "==> Chờ health"
DOMAIN="$(envval SITE_DOMAIN)"
for i in $(seq 1 30); do
  if docker compose exec -T web node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
    echo "OK trong container, tag ${IMAGE_TAG}. Kiểm tra ngoài: curl -s https://${DOMAIN}/api/health"
    docker image prune -f >/dev/null
    exit 0
  fi
  sleep 2
done

echo "Web chưa trả health sau 60 giây. Xem log:"
docker compose logs --tail=80 web
exit 1
