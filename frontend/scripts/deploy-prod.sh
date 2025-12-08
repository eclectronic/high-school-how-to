#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"
FRONTEND_DIR="${REPO_ROOT}/frontend"
DIST_DIR="${FRONTEND_DIR}/dist/highschoolhowto/browser"
S3_DEST="s3://highschoolhowto/prod/"
AWS_REGION="${AWS_REGION:-us-west-2}"
CLOUDFRONT_DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-E1S3AKUQUXDIGC}"
RUN_BUILD=false

usage() {
  cat <<EOF
Usage: $(basename "$0") [--build|-b]

Options:
  -b, --build     Run 'npm run build -- --configuration production' before deploying.
  -h, --help      Show this help message.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -b|--build)
      RUN_BUILD=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if ! command -v aws >/dev/null 2>&1; then
  echo "aws CLI not found on PATH. Install and configure AWS credentials before deploying." >&2
  exit 1
fi

if [[ "${RUN_BUILD}" == true ]]; then
  echo "Running frontend production build..."
  (cd "${FRONTEND_DIR}" && npm run build -- --configuration production)
fi

if [[ ! -d "${DIST_DIR}" ]]; then
  cat >&2 <<EOF
Build output not found at ${DIST_DIR}
Run with --build or execute 'cd frontend && npm run build -- --configuration production' first.
EOF
  exit 1
fi

echo "Synching ${DIST_DIR} -> ${S3_DEST} (region: ${AWS_REGION})"
aws s3 sync "${DIST_DIR}" "${S3_DEST}" --region "${AWS_REGION}" --delete

if [[ -n "${CLOUDFRONT_DISTRIBUTION_ID}" ]]; then
  echo "Creating CloudFront invalidation for distribution ${CLOUDFRONT_DISTRIBUTION_ID}"
  aws cloudfront create-invalidation \
    --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
    --paths "/*" \
    --region "${AWS_REGION}" >/dev/null
  echo "CloudFront invalidation requested."
else
  echo "Skipping CloudFront invalidation (set CLOUDFRONT_DISTRIBUTION_ID to enable)."
fi

echo "Deployment complete."
