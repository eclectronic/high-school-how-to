#!/usr/bin/env bash
set -euo pipefail

# App Runner setup for highschoolhowto.com
# Use cases:
#   - Default: auto-discover account/hosted zone, write the default env file if missing, then run with default AWS creds/profile:
#       ./api/scripts/aws-apprunner-setup.sh
#   - Custom env file or explicit profile:
#       ENV_FILE=./path/to/env AWS_PROFILE=<profile> ./api/scripts/aws-apprunner-setup.sh
# Inputs:
#   Required: AWS_ACCOUNT_ID, AWS_HOSTED_ZONE_ID, AWS_APP_RUNNER_ROLE_ARN
#   Optional: AWS_REGION (default us-west-2), AWS_ECR_REPO_NAME, AWS_IMAGE_TAG,
#             SERVICE_NAME, APP_PORT, DOMAIN_NAME, ENV_FILE (path).
# Behavior: ensures/creates ECR repo, builds/pushes image, creates App Runner service
# named "api", associates the custom domain, and applies Route 53 records.
# Prereqs: aws CLI, docker, jq; AWS creds with ECR/AppRunner/Route 53 permissions.
#
# Network architecture (see docs/v7-network-egress.md):
#   The App Runner service uses DEFAULT (public) egress — no VPC connector. This is
#   required so the service can reach Google's JWKS endpoint for ID-token verification
#   and Amazon SES for transactional email. An earlier attempt to route through a VPC
#   connector silently broke both because connector ENIs do not get public IPs and
#   therefore cannot egress through an Internet Gateway.
#
#   Postgres is provisioned separately (this script does not create the DB). For the
#   default-egress posture to work, the database must be PubliclyAccessible=true and
#   its security group must allow inbound tcp/5432 from 0.0.0.0/0. SSL is enforced via
#   the rds.force_ssl=1 parameter and the JDBC URL's ?sslmode=require.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE_DEFAULT="${SCRIPT_DIR}/aws-apprunner-setup.env"
ENV_FILE="${ENV_FILE:-${ENV_FILE_DEFAULT}}"

gather_env_defaults() {
  AWS_REGION="${AWS_REGION:-us-west-2}"
  DOMAIN_NAME="${DOMAIN_NAME:-highschoolhowto.com}"
  AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text 2>/dev/null || true)}"

  # Derive hosted zone id if not provided, using the base domain of DOMAIN_NAME.
  if [ -z "${AWS_HOSTED_ZONE_ID:-}" ]; then
    base_domain="${DOMAIN_NAME}"
    AWS_HOSTED_ZONE_ID="$(aws route53 list-hosted-zones-by-name --dns-name "${base_domain}" --query 'HostedZones[0].Id' --output text 2>/dev/null | sed 's|/hostedzone/||' || true)"
  fi

  AWS_ECR_REPO_NAME="${AWS_ECR_REPO_NAME:-highschoolhowto/api}"
  AWS_IMAGE_TAG="${AWS_IMAGE_TAG:-latest}"
  AWS_DOCKER_PLATFORM="${AWS_DOCKER_PLATFORM:-linux/amd64}"
  SERVICE_NAME="${SERVICE_NAME:-api}"
  APP_PORT="${APP_PORT:-8080}"
}

write_env_file() {
  local target="${1:-${ENV_FILE_DEFAULT}}"
  cat > "${target}" <<EOF
AWS_REGION=${AWS_REGION}
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID}
AWS_HOSTED_ZONE_ID=${AWS_HOSTED_ZONE_ID}
AWS_APP_RUNNER_ROLE_ARN=${AWS_APP_RUNNER_ROLE_ARN}
AWS_ECR_REPO_NAME=${AWS_ECR_REPO_NAME}
AWS_IMAGE_TAG=${AWS_IMAGE_TAG}
AWS_DOCKER_PLATFORM=${AWS_DOCKER_PLATFORM}
SERVICE_NAME=${SERVICE_NAME}
APP_PORT=${APP_PORT}
DOMAIN_NAME=${DOMAIN_NAME}
EOF
  echo "Wrote environment file to ${target}"
}

if [ -f "${ENV_FILE}" ]; then
  echo "Loading defaults from ${ENV_FILE}"
  # shellcheck disable=SC1090
  set -a
  . "${ENV_FILE}"
  set +a
else
  echo "No env file found at ${ENV_FILE}; using inline defaults/vars."
fi

command -v aws >/dev/null || { echo "aws CLI is required" >&2; exit 1; }
command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }
command -v jq >/dev/null || { echo "jq is required" >&2; exit 1; }

# Populate defaults (and attempt to discover account/hosted zone) before enforcing required vars.
gather_env_defaults

# If discovery failed because credentials are unavailable, guide the user early and still emit an env file.
if [ -z "${AWS_ACCOUNT_ID}" ]; then
  echo "Unable to determine AWS_ACCOUNT_ID via AWS STS. Set AWS credentials (AWS_PROFILE=..., or AWS_ACCESS_KEY_ID/SECRET) or set AWS_ACCOUNT_ID manually." >&2
  if [ ! -f "${ENV_FILE}" ] && [ "${ENV_FILE}" = "${ENV_FILE_DEFAULT}" ]; then
    write_env_file "${ENV_FILE}"
  fi
  exit 1
fi

# Required environment (set/override before running):
: "${AWS_REGION:?Set AWS_REGION (e.g., us-west-2)}"
: "${AWS_ACCOUNT_ID:?Set AWS_ACCOUNT_ID (12-digit AWS account id)}"
: "${AWS_HOSTED_ZONE_ID:?Set AWS_HOSTED_ZONE_ID for highschoolhowto.com}"
: "${AWS_APP_RUNNER_ROLE_ARN:?Set AWS_APP_RUNNER_ROLE_ARN (IAM role granting App Runner pull access to ECR)}"
: "${DOMAIN_NAME:?Set DOMAIN_NAME (e.g., highschoolhowto.com)}"

# Optional overrides:
: "${AWS_ECR_REPO_NAME:=highschoolhowto/api}"
: "${AWS_IMAGE_TAG:=latest}"
: "${AWS_DOCKER_PLATFORM:=linux/amd64}"
: "${SERVICE_NAME:=api}"
: "${APP_PORT:=8080}"

# If the default env file is missing, create it automatically for reuse.
if [ ! -f "${ENV_FILE}" ] && [ "${ENV_FILE}" = "${ENV_FILE_DEFAULT}" ]; then
  write_env_file "${ENV_FILE}"
fi

ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${AWS_ECR_REPO_NAME}"
IMAGE_IDENTIFIER="${ECR_URI}:${AWS_IMAGE_TAG}"

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

echo "Using ECR repo: ${AWS_ECR_REPO_NAME} (${ECR_URI})"

echo "Ensuring ECR repository exists..."
aws ecr describe-repositories --repository-names "${AWS_ECR_REPO_NAME}" --region "${AWS_REGION}" >/dev/null 2>&1 || \
  aws ecr create-repository --repository-name "${AWS_ECR_REPO_NAME}" --image-scanning-configuration scanOnPush=true --region "${AWS_REGION}"

echo "Logging into ECR..."
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "Building and pushing image (${IMAGE_IDENTIFIER})..."
docker build --platform "${AWS_DOCKER_PLATFORM}" -t "${AWS_ECR_REPO_NAME}:${AWS_IMAGE_TAG}" .
docker tag "${AWS_ECR_REPO_NAME}:${AWS_IMAGE_TAG}" "${IMAGE_IDENTIFIER}"
docker push "${IMAGE_IDENTIFIER}"

SERVICE_SPEC="${WORKDIR}/apprunner-service.json"
cat > "${SERVICE_SPEC}" <<EOF
{
  "ServiceName": "${SERVICE_NAME}",
  "SourceConfiguration": {
    "AuthenticationConfiguration": {
      "AccessRoleArn": "${AWS_APP_RUNNER_ROLE_ARN}"
    },
    "AutoDeploymentsEnabled": true,
    "ImageRepository": {
      "ImageIdentifier": "${IMAGE_IDENTIFIER}",
      "ImageRepositoryType": "ECR",
      "ImageConfiguration": {
        "Port": "${APP_PORT}",
        "RuntimeEnvironmentVariables": [
          { "Name": "SPRING_PROFILES_ACTIVE", "Value": "prod" }
        ]
      }
    }
  },
  "InstanceConfiguration": {
    "Cpu": "1 vCPU",
    "Memory": "2 GB"
  },
  "NetworkConfiguration": {
    "EgressConfiguration": {
      "EgressType": "DEFAULT"
    }
  }
}
EOF

echo "Creating App Runner service '${SERVICE_NAME}'..."
SERVICE_ARN="$(aws apprunner create-service --cli-input-json file://"${SERVICE_SPEC}" --query 'Service.ServiceArn' --output text)"
echo "Service ARN: ${SERVICE_ARN}"

DEFAULT_DOMAIN="$(aws apprunner describe-service --service-arn "${SERVICE_ARN}" --query 'Service.ServiceUrl' --output text)"
echo "App Runner default domain: ${DEFAULT_DOMAIN}"

echo "Associating custom domain ${DOMAIN_NAME}..."
DOMAIN_OUT="${WORKDIR}/domain.json"
aws apprunner associate-custom-domain \
  --service-arn "${SERVICE_ARN}" \
  --domain-name "${DOMAIN_NAME}" \
  > "${DOMAIN_OUT}"

DNSTARGET="$(jq -r '.DNSTarget' "${DOMAIN_OUT}")"
VALIDATION_NAME="$(jq -r '.CertificateValidationRecords[0].Name' "${DOMAIN_OUT}")"
VALIDATION_TYPE="$(jq -r '.CertificateValidationRecords[0].Type' "${DOMAIN_OUT}")"
VALIDATION_VALUE="$(jq -r '.CertificateValidationRecords[0].Value' "${DOMAIN_OUT}")"

CHANGE_BATCH="${WORKDIR}/route53-change-batch.json"
cat > "${CHANGE_BATCH}" <<EOF
{
  "Comment": "App Runner custom domain for ${DOMAIN_NAME}",
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "${DOMAIN_NAME}.",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [
          { "Value": "${DNSTARGET}." }
        ]
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "${VALIDATION_NAME}",
        "Type": "${VALIDATION_TYPE}",
        "TTL": 300,
        "ResourceRecords": [
          { "Value": "${VALIDATION_VALUE}" }
        ]
      }
    }
  ]
}
EOF

echo "Applying Route 53 changes..."
aws route53 change-resource-record-sets --hosted-zone-id "${AWS_HOSTED_ZONE_ID}" --change-batch file://"${CHANGE_BATCH}"

echo "Done. Watch App Runner custom domain status for validation to complete."
