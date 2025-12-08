#!/usr/bin/env bash

set -euo pipefail

API_BASE="${API_BASE:-http://localhost:8080}"
TO="${TO:-}"
TYPE="${TYPE:-verification}" # verification|reset
LINK="${LINK:-https://example.com/test-link}"

usage() {
  cat <<'EOF'
send-test-email.sh - hit the dev test email endpoint

Flags (override env vars):
  -t, --to <email>          Recipient address (required if TO not set)
  -y, --type <verification|reset>  Template to send (default: verification)
  -l, --link <url>          Link to include (default: https://example.com/test-link)
  -a, --api-base <url>      API base URL (default: http://localhost:8080)
  -h, --help                Show this message

Environment overrides:
  TO, TYPE, LINK, API_BASE

Example:
  ./api/scripts/send-test-email.sh --to you@example.com --type reset --link https://localhost/reset

If no flags are provided, you'll be prompted interactively (similar to the unix mail command).
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -t|--to)
      TO="$2"
      shift 2
      ;;
    -y|--type)
      TYPE="$2"
      shift 2
      ;;
    -l|--link)
      LINK="$2"
      shift 2
      ;;
    -a|--api-base)
      API_BASE="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "${TO}" && $# -eq 0 ]]; then
  echo "Interactive mode:"
  read -r -p "To: " TO
  read -r -p "Type [verification/reset] (default: verification): " input_type || true
  read -r -p "Link [${LINK}]: " input_link || true
  read -r -p "API base [${API_BASE}]: " input_api || true

  [[ -n "${input_type:-}" ]] && TYPE="${input_type}"
  [[ -n "${input_link:-}" ]] && LINK="${input_link}"
  [[ -n "${input_api:-}" ]] && API_BASE="${input_api}"
fi

if [[ -z "${TO}" ]]; then
  echo "Recipient is required (set TO env var, --to, or provide it interactively)" >&2
  usage
  exit 1
fi

if [[ "${TYPE}" != "verification" && "${TYPE}" != "reset" ]]; then
  echo "TYPE must be 'verification' or 'reset'" >&2
  usage
  exit 1
fi

payload=$(cat <<EOF
{
  "to": "${TO}",
  "type": "${TYPE}",
  "link": "${LINK}"
}
EOF
)

echo "Sending ${TYPE} email to ${TO} via ${API_BASE}/api/dev/test-email"
curl -X POST "${API_BASE}/api/dev/test-email" \
  -H "Content-Type: application/json" \
  -d "${payload}"
echo
