#!/usr/bin/env bash
set -euo pipefail

# Downloads media files from S3 into the local media/ directory so they
# can be reviewed and checked into the repo.
#
# Usage: ./frontend/scripts/pull-media.sh

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"
MEDIA_DIR="${REPO_ROOT}/media"
S3_SOURCE="s3://highschoolhowto/prod/media"
AWS_REGION="${AWS_REGION:-us-west-2}"

if ! command -v aws >/dev/null 2>&1; then
  echo "aws CLI not found on PATH." >&2
  exit 1
fi

echo "Syncing ${S3_SOURCE} -> ${MEDIA_DIR}"
aws s3 sync "${S3_SOURCE}" "${MEDIA_DIR}" --region "${AWS_REGION}"

echo "Done. Review changes with: git status ${MEDIA_DIR}"
