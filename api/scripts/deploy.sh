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

echo "==> Triggering deployment for ${SERVICE_ARN}..."
aws apprunner start-deployment \
  --service-arn "${SERVICE_ARN}" \
  --region "${AWS_REGION}" \
  --query 'OperationId' \
  --output text

echo "==> Deployment triggered. Watch status:"
echo "    aws apprunner describe-service --service-arn ${SERVICE_ARN} --query 'Service.Status' --output text --region ${AWS_REGION}"