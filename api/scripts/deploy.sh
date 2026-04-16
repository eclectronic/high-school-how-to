#!/usr/bin/env bash
set -euo pipefail

# Deploy API to App Runner
# Usage:
#   ./api/scripts/deploy.sh [prod]
#   AWS_IMAGE_TAG=v1.2.3 ./api/scripts/deploy.sh
#   ENV_FILE=./path/to/env ./api/scripts/deploy.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ENV_FILE:-${SCRIPT_DIR}/aws-apprunner-setup.env}"

if [ "${1:-}" = "prod" ]; then
  export AWS_PROFILE=default
fi

if [ -f "${ENV_FILE}" ]; then
  echo "Loading config from ${ENV_FILE}"
  set -a
  . "${ENV_FILE}"
  set +a
fi

: "${AWS_REGION:=us-west-2}"
: "${AWS_ACCOUNT_ID:?Set AWS_ACCOUNT_ID or add it to aws-apprunner-setup.env}"
: "${AWS_ECR_REPO_NAME:=highschoolhowto/api}"
: "${AWS_IMAGE_TAG:=latest}"
: "${SERVICE_NAME:=highschoolhowto-api}"

ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
ECR_URI="${ECR_REGISTRY}/${AWS_ECR_REPO_NAME}"
IMAGE_IDENTIFIER="${ECR_URI}:${AWS_IMAGE_TAG}"

echo "==> Fetching ECR token..."
ECR_PASSWORD="$(aws ecr get-login-password --region "${AWS_REGION}")"

echo "==> Building and pushing image: ${IMAGE_IDENTIFIER}"
cd "${SCRIPT_DIR}/../.."
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID}" \
AWS_REGION="${AWS_REGION}" \
AWS_ECR_REPO_NAME="${AWS_ECR_REPO_NAME}" \
AWS_IMAGE_TAG="${AWS_IMAGE_TAG}" \
  ./api/gradlew -p api jib \
    -Djib.to.auth.username=AWS \
    -Djib.to.auth.password="${ECR_PASSWORD}"

echo "==> Looking up App Runner service '${SERVICE_NAME}'..."
SERVICE_ARN="$(aws apprunner list-services \
  --region "${AWS_REGION}" \
  --query "ServiceSummaryList[?ServiceName=='${SERVICE_NAME}'].ServiceArn | [0]" \
  --output text)"

if [ -z "${SERVICE_ARN}" ] || [ "${SERVICE_ARN}" = "None" ]; then
  echo "ERROR: App Runner service '${SERVICE_NAME}' not found in ${AWS_REGION}." >&2
  exit 1
fi

# Returns the current App Runner service status (RUNNING, PAUSED,
# OPERATION_IN_PROGRESS, CREATE_FAILED, DELETE_FAILED, DELETED, ...).
service_status() {
  aws apprunner describe-service \
    --service-arn "${SERVICE_ARN}" \
    --region "${AWS_REGION}" \
    --query 'Service.Status' \
    --output text
}

# Polls service status until it equals the expected value or the wait budget
# is exhausted. Args: $1 = expected status, $2 = max attempts (10s each).
wait_for_status() {
  local expected="$1"
  local max_attempts="${2:-60}"   # default: ~10 minutes
  local attempt=0
  local current
  while [ "${attempt}" -lt "${max_attempts}" ]; do
    current="$(service_status)"
    if [ "${current}" = "${expected}" ]; then
      echo "==> Service is ${expected}."
      return 0
    fi
    echo "    status=${current} (attempt $((attempt + 1))/${max_attempts}) — waiting 10s..."
    sleep 10
    attempt=$((attempt + 1))
  done
  echo "ERROR: Timed out waiting for service to reach ${expected} (last status: ${current})." >&2
  return 1
}

echo "==> Checking service status before deployment..."
STATUS="$(service_status)"
echo "    current status: ${STATUS}"

case "${STATUS}" in
  RUNNING)
    ;;
  PAUSED)
    echo "==> Service is PAUSED. Resuming..."
    aws apprunner resume-service \
      --service-arn "${SERVICE_ARN}" \
      --region "${AWS_REGION}" \
      --query 'Service.Status' \
      --output text
    wait_for_status RUNNING
    ;;
  OPERATION_IN_PROGRESS)
    echo "==> Another operation is in progress. Waiting for it to finish..."
    wait_for_status RUNNING
    ;;
  CREATE_FAILED|DELETE_FAILED|DELETED)
    echo "ERROR: Service is in unrecoverable state '${STATUS}'. Fix it in the App Runner console and retry." >&2
    exit 1
    ;;
  *)
    echo "ERROR: Service is in unexpected state '${STATUS}'. Aborting deploy." >&2
    exit 1
    ;;
esac

echo "==> Triggering deployment for ${SERVICE_ARN}..."
aws apprunner start-deployment \
  --service-arn "${SERVICE_ARN}" \
  --region "${AWS_REGION}" \
  --query 'OperationId' \
  --output text

echo "==> Deployment triggered. Watch status:"
echo "    aws apprunner describe-service --service-arn ${SERVICE_ARN} --query 'Service.Status' --output text --region ${AWS_REGION}"