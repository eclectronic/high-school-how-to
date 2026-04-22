#!/usr/bin/env bash
# One-time setup for Google Sign-In (v7 auth design).
#
# What this does:
#   1. Verifies gcloud CLI + login.
#   2. Lets you pick or create a GCP project.
#   3. Opens the OAuth consent screen config page.
#   4. Opens the Credentials page prefilled for a Web-application Client ID.
#   5. Prints the exact "Authorized JavaScript origins" to paste.
#   6. Prompts for the resulting Client ID.
#   7. Tells you where to paste it in the codebase (optionally does it for you).
#
# What this does NOT do:
#   - Create the OAuth Client ID itself (Google blocks this from the CLI).
#   - Configure the consent screen contents (you click through in the UI).
#
# Safe to rerun — all prompts confirm before writing anything.

set -euo pipefail

bold()  { printf "\033[1m%s\033[0m\n" "$*"; }
info()  { printf "\033[36m→ %s\033[0m\n" "$*"; }
warn()  { printf "\033[33m! %s\033[0m\n" "$*"; }
ok()    { printf "\033[32m✓ %s\033[0m\n" "$*"; }
err()   { printf "\033[31m✗ %s\033[0m\n" "$*" >&2; }

open_url() {
  local url=$1
  if command -v open >/dev/null 2>&1; then open "$url"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$url"
  else echo "  $url"
  fi
}

# ── 1. Prereqs ────────────────────────────────────────────────────────────────

if ! command -v gcloud >/dev/null 2>&1; then
  err "gcloud CLI not found."
  echo "  Install: https://cloud.google.com/sdk/docs/install"
  echo "  macOS:   brew install --cask google-cloud-sdk"
  exit 1
fi

if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
  info "Logging you into gcloud..."
  gcloud auth login
fi

ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n1)
ok "Authenticated as: $ACTIVE_ACCOUNT"

# ── 2. Pick or create a project ───────────────────────────────────────────────

bold ""
bold "Step 1 — Pick a GCP project"
echo "Existing projects on this account:"
gcloud projects list --format="table(projectId,name)" 2>/dev/null || true
echo
read -rp "Project ID to use (or 'new' to create one): " PROJECT_ID

if [[ "$PROJECT_ID" == "new" ]]; then
  read -rp "New project ID (lowercase, hyphens, globally unique): " PROJECT_ID
  read -rp "Project display name: " PROJECT_NAME
  gcloud projects create "$PROJECT_ID" --name="$PROJECT_NAME"
  ok "Created project $PROJECT_ID"
fi

gcloud config set project "$PROJECT_ID" >/dev/null
ok "Active project: $PROJECT_ID"

# ── 3. OAuth consent screen ───────────────────────────────────────────────────

bold ""
bold "Step 2 — Configure the OAuth consent screen"
echo "The consent screen tells users what app is asking to sign them in."
echo "Opening the consent screen config page now..."
echo
echo "In the browser:"
echo "  • User Type:   External  (unless you have a Workspace org)"
echo "  • App name:    High School How To"
echo "  • User support email: $ACTIVE_ACCOUNT"
echo "  • Developer contact:  $ACTIVE_ACCOUNT"
echo "  • Scopes:      email, profile, openid   (default — click 'Save and Continue')"
echo "  • Test users:  add your own email if Publishing status stays 'Testing'"
echo
read -rp "Press Enter to open the consent screen page..."
open_url "https://console.cloud.google.com/apis/credentials/consent?project=$PROJECT_ID"
echo
read -rp "Press Enter once the consent screen is saved..."

# ── 4. Create the OAuth Client ID ─────────────────────────────────────────────

bold ""
bold "Step 3 — Create the OAuth Web Client ID"
echo "Opening the Credentials page. Click: + Create Credentials → OAuth client ID"
echo
echo "Fill in:"
echo "  • Application type:            Web application"
echo "  • Name:                        highschoolhowto-web"
echo
echo "  • Authorized JavaScript origins  (add all of these):"
bold "      http://localhost:4200"
bold "      http://localhost:4300"
bold "      https://highschoolhowto.com"
echo
echo "  • Authorized redirect URIs:    (leave empty — we use ID-token flow, not redirect)"
echo
read -rp "Press Enter to open the Credentials page..."
open_url "https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
echo
echo "After clicking 'Create', Google shows a dialog with your Client ID."
echo "Copy it (format: 123456789012-abc123.apps.googleusercontent.com)."
echo
read -rp "Paste the Client ID here: " CLIENT_ID

if [[ -z "$CLIENT_ID" || "$CLIENT_ID" != *".apps.googleusercontent.com" ]]; then
  err "That doesn't look like a valid Client ID."
  exit 1
fi
ok "Got Client ID: $CLIENT_ID"

# ── 5. Offer to write it to config ────────────────────────────────────────────

REPO_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
APP_YML="$REPO_ROOT/api/src/main/resources/application.yml"

bold ""
bold "Step 4 — Where to paste the Client ID"
echo
echo "Backend — $APP_YML"
echo "  Add under the 'auth:' block:"
echo
echo "    auth:"
echo "      google:"
echo "        client-id: $CLIENT_ID"
echo
echo "Frontend — frontend/src/environments/environment.ts  (and environment.prod.ts)"
echo "  export const environment = {"
echo "    ..."
echo "    googleClientId: '$CLIENT_ID',"
echo "  };"
echo
echo "Frontend — frontend/src/index.html"
echo "  Add in <head>:"
echo "    <script src=\"https://accounts.google.com/gsi/client\" async defer></script>"
echo
read -rp "Write the Client ID into application.yml for you? [y/N] " WRITE_YML

if [[ "$WRITE_YML" =~ ^[Yy]$ ]]; then
  if grep -q "^  google:" "$APP_YML" 2>/dev/null; then
    warn "application.yml already has an 'auth.google' block — skipping automatic write."
    warn "Update it manually to avoid clobbering existing config."
  else
    # Insert under the 'auth:' root key if present; otherwise append a new block.
    if grep -q "^auth:" "$APP_YML"; then
      # macOS/BSD sed compatible
      awk -v cid="$CLIENT_ID" '
        /^auth:/ && !done { print; print "  google:"; print "    client-id: " cid; done=1; next }
        { print }
      ' "$APP_YML" > "$APP_YML.tmp" && mv "$APP_YML.tmp" "$APP_YML"
      ok "Wrote auth.google.client-id into $APP_YML"
    else
      printf "\nauth:\n  google:\n    client-id: %s\n" "$CLIENT_ID" >> "$APP_YML"
      ok "Appended auth.google block to $APP_YML"
    fi
  fi
else
  info "Skipped writing. Paste manually using the snippet above."
fi

bold ""
ok "Setup complete."
echo
echo "Next steps:"
echo "  • Commit application.yml (Client ID is a public value)."
echo "  • Add frontend environment.ts with googleClientId."
echo "  • Proceed with Phase 1 of the v7 implementation plan."
