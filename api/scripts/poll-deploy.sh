#!/usr/bin/env bash
# Poll App Runner deployment status until the service is RUNNING.
set -euo pipefail

SERVICE_ARN="arn:aws:apprunner:us-west-2:136022486206:service/highschoolhowto-api/94935f8663744265926241dce6252d76"
REGION="us-west-2"
INTERVAL=15

status() {
  aws apprunner describe-service \
    --service-arn "$SERVICE_ARN" \
    --region "$REGION" \
    --query "Service.Status" \
    --output text
}

echo "Polling App Runner deployment status..."
while true; do
  STATUS=$(status)
  echo "$(date '+%H:%M:%S')  $STATUS"
  if [[ "$STATUS" == "RUNNING" ]]; then
    echo "Deploy complete."
    break
  fi
  sleep "$INTERVAL"
done
