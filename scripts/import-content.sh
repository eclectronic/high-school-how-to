#!/usr/bin/env bash
# Import admin-authored content from ./data/ into a Postgres database.
# Usage: import-content.sh --target local|prod
#
# --target local  Writes to the local Docker Postgres (POSTGRES_LOCAL_URL from ~/docker.env).
# --target prod   Writes to the prod RDS instance (PROD_DB_URL from ~/docker.env).
#                 Requires typed confirmation twice; also syncs media to S3.
#
# Run from the repo root.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="$REPO_ROOT/data"
MEDIA_DIR="$REPO_ROOT/media"

# ── Parse args ────────────────────────────────────────────────────────────────

TARGET=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --target) TARGET="$2"; shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$TARGET" ]]; then
  echo "ERROR: --target is required. Use --target local or --target prod." >&2
  exit 1
fi

if [[ "$TARGET" != "local" && "$TARGET" != "prod" ]]; then
  echo "ERROR: --target must be 'local' or 'prod'." >&2
  exit 1
fi

# ── Load env ──────────────────────────────────────────────────────────────────

ENV_FILE="$HOME/docker.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found." >&2; exit 1
fi
# shellcheck source=/dev/null
source "$ENV_FILE"

if [[ "$TARGET" == "local" ]]; then
  DB_URL="${POSTGRES_LOCAL_URL:-}"
  if [[ -z "$DB_URL" ]]; then
    echo "ERROR: POSTGRES_LOCAL_URL is not set in $ENV_FILE." >&2; exit 1
  fi
  DB_HOST=$(python3 -c "from urllib.parse import urlparse; u=urlparse('$DB_URL'); print(u.hostname)")
else
  DB_URL="${PROD_DB_URL:-}"
  if [[ -z "$DB_URL" ]]; then
    echo "ERROR: PROD_DB_URL is not set in $ENV_FILE." >&2; exit 1
  fi
  DB_HOST=$(python3 -c "from urllib.parse import urlparse; u=urlparse('$DB_URL'); print(u.hostname)")
fi

# ── Safety confirmation ───────────────────────────────────────────────────────

echo ""
echo "=== import-content.sh ==="
echo "Target:   $TARGET"
echo "DB host:  $DB_HOST"
if [[ "$TARGET" == "prod" ]]; then
  echo "S3 sync:  s3://highschoolhowto/prod/media/ and s3://highschoolhowto-site/uploads/"
fi
echo ""
echo "This will TRUNCATE all content tables and re-insert from ./data/."
echo ""

read -r -p "Type '$TARGET' to continue: " CONFIRM
if [[ "$CONFIRM" != "$TARGET" ]]; then
  echo "Aborted." >&2; exit 1
fi

if [[ "$TARGET" == "prod" ]]; then
  echo ""
  read -r -p "Confirm prod host '$DB_HOST' to proceed: " CONFIRM2
  if [[ "$CONFIRM2" != "$DB_HOST" ]]; then
    echo "Aborted." >&2; exit 1
  fi
fi

# ── Helper: run SQL file ──────────────────────────────────────────────────────

run_sql() {
  psql "$DB_URL" -f "$1"
}

# ── Generate import SQL ───────────────────────────────────────────────────────

IMPORT_SQL=$(mktemp /tmp/import-content.XXXXXX.sql)
trap 'rm -f "$IMPORT_SQL"' EXIT

cat > "$IMPORT_SQL" <<'HEADER'
BEGIN;

-- Disable FK checks during truncate (Postgres requires CASCADE)
TRUNCATE TABLE
    content_card_tags,
    content_card_links,
    content_card_tasks,
    content_cards,
    tags,
    quotes,
    badges,
    recommended_shortcuts
RESTART IDENTITY CASCADE;

HEADER

# ── tags ──────────────────────────────────────────────────────────────────────

echo "==> Building import SQL for tags..."
python3 - "$DATA_DIR/tags" "$IMPORT_SQL" <<'EOF'
import json, sys, os, pathlib

data_dir, sql_file = pathlib.Path(sys.argv[1]), sys.argv[2]
rows = []
for p in sorted(data_dir.glob("*.json")):
    rows.append(json.load(open(p)))

with open(sql_file, "a") as f:
    for r in rows:
        id_ = r["id"]
        slug = r["slug"].replace("'", "''")
        name = r["name"].replace("'", "''")
        desc = ("'" + r["description"].replace("'", "''") + "'") if r.get("description") else "NULL"
        so = r.get("sort_order", 0)
        f.write(
            f"INSERT INTO tags (id, slug, name, description, sort_order) "
            f"VALUES ({id_}, '{slug}', '{name}', {desc}, {so}) "
            f"ON CONFLICT (id) DO UPDATE SET slug=EXCLUDED.slug, name=EXCLUDED.name, "
            f"description=EXCLUDED.description, sort_order=EXCLUDED.sort_order;\n"
        )
    print(f"  {len(rows)} tags")
EOF

# ── content_cards ─────────────────────────────────────────────────────────────

echo "==> Building import SQL for content_cards..."
python3 - "$DATA_DIR/content-cards" "$IMPORT_SQL" <<'EOF'
import json, sys, pathlib

def esc(s):
    if s is None: return "NULL"
    return "'" + str(s).replace("'", "''") + "'"

data_dir, sql_file = pathlib.Path(sys.argv[1]), sys.argv[2]
rows = []
for p in sorted(data_dir.glob("*.json")):
    rows.append(json.load(open(p)))

with open(sql_file, "a") as f:
    for r in rows:
        media_urls = json.dumps(r.get("mediaUrls") or []).replace("'", "''")
        body_json = r.get("bodyJson")
        body_json_sql = "'" + json.dumps(body_json).replace("'", "''") + "'::jsonb" if body_json else "NULL"
        f.write(
            f"INSERT INTO content_cards "
            f"(id, slug, title, description, card_type, status, media_url, print_media_url, media_urls, "
            f"thumbnail_url, cover_image_url, background_color, text_color, simple_layout, "
            f"body_json, body_html, created_at, updated_at) VALUES ("
            f"{r['id']}, {esc(r['slug'])}, {esc(r['title'])}, {esc(r.get('description'))}, "
            f"'{r['cardType']}', '{r['status']}', "
            f"{esc(r.get('mediaUrl'))}, {esc(r.get('printMediaUrl'))}, "
            f"'{media_urls}'::jsonb, "
            f"{esc(r.get('thumbnailUrl'))}, {esc(r.get('coverImageUrl'))}, "
            f"{esc(r.get('backgroundColor'))}, {esc(r.get('textColor'))}, "
            f"{'true' if r.get('simpleLayout') else 'false'}, "
            f"{body_json_sql}, {esc(r.get('bodyHtml'))}, "
            f"{esc(r.get('createdAt', 'now()'))}, {esc(r.get('updatedAt', 'now()'))}) "
            f"ON CONFLICT (id) DO UPDATE SET "
            f"slug=EXCLUDED.slug, title=EXCLUDED.title, description=EXCLUDED.description, "
            f"card_type=EXCLUDED.card_type, status=EXCLUDED.status, "
            f"media_url=EXCLUDED.media_url, print_media_url=EXCLUDED.print_media_url, "
            f"media_urls=EXCLUDED.media_urls, "
            f"thumbnail_url=EXCLUDED.thumbnail_url, cover_image_url=EXCLUDED.cover_image_url, "
            f"background_color=EXCLUDED.background_color, text_color=EXCLUDED.text_color, "
            f"simple_layout=EXCLUDED.simple_layout, "
            f"body_json=EXCLUDED.body_json, body_html=EXCLUDED.body_html, "
            f"updated_at=EXCLUDED.updated_at;\n"
        )
    print(f"  {len(rows)} cards")

    # Tags join rows
    for r in rows:
        for tag_slug in (r.get("tags") or []):
            slug_esc = tag_slug.replace("'", "''")
            f.write(
                f"INSERT INTO content_card_tags (card_id, tag_id) "
                f"SELECT {r['id']}, id FROM tags WHERE slug='{slug_esc}' "
                f"ON CONFLICT DO NOTHING;\n"
            )

    # Links (resolved by slug — requires all cards inserted first, handled by deferred resolution)
    for r in rows:
        for i, link in enumerate(r.get("links") or []):
            ts = link["targetSlug"].replace("'", "''")
            lt = (link.get("linkText") or "").replace("'", "''")
            lt_sql = f"'{lt}'" if lt else "NULL"
            f.write(
                f"INSERT INTO content_card_links (source_card_id, target_card_id, link_text, sort_order) "
                f"SELECT {r['id']}, id, {lt_sql}, {i} FROM content_cards WHERE slug='{ts}' "
                f"ON CONFLICT DO NOTHING;\n"
            )

    # Template tasks
    for r in rows:
        for task in (r.get("templateTasks") or []):
            desc = task["description"].replace("'", "''")
            so = task.get("sortOrder", 0)
            f.write(
                f"INSERT INTO content_card_tasks (card_id, description, sort_order) "
                f"VALUES ({r['id']}, '{desc}', {so}) ON CONFLICT DO NOTHING;\n"
            )
EOF

# ── quotes ────────────────────────────────────────────────────────────────────

echo "==> Building import SQL for quotes..."
python3 - "$DATA_DIR/quotes/quotes.json" "$IMPORT_SQL" <<'EOF'
import json, sys

rows = json.load(open(sys.argv[1])) or []
with open(sys.argv[2], "a") as f:
    for r in rows:
        quote_text = r["quote_text"].replace("'", "''")
        attr = r.get("attribution") or ""
        attr_sql = f"'{attr.replace(chr(39), chr(39)*2)}'" if attr else "NULL"
        f.write(
            f"INSERT INTO quotes (id, quote_text, attribution) VALUES ({r['id']}, '{quote_text}', {attr_sql}) "
            f"ON CONFLICT (id) DO UPDATE SET quote_text=EXCLUDED.quote_text, attribution=EXCLUDED.attribution;\n"
        )
print(f"  {len(rows)} quotes")
EOF

# ── badges ────────────────────────────────────────────────────────────────────

echo "==> Building import SQL for badges..."
python3 - "$DATA_DIR/badges/badges.json" "$IMPORT_SQL" <<'EOF'
import json, sys

rows = json.load(open(sys.argv[1])) or []
with open(sys.argv[2], "a") as f:
    for r in rows:
        def esc(v): return ("'" + str(v).replace("'", "''") + "'") if v else "NULL"
        f.write(
            f"INSERT INTO badges (id, name, description, emoji, icon_url, trigger_type, trigger_param) "
            f"VALUES ({r['id']}, {esc(r['name'])}, {esc(r.get('description'))}, "
            f"{esc(r.get('emoji'))}, {esc(r.get('icon_url'))}, "
            f"{esc(r['trigger_type'])}, {esc(r.get('trigger_param'))}) "
            f"ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, "
            f"emoji=EXCLUDED.emoji, icon_url=EXCLUDED.icon_url, "
            f"trigger_type=EXCLUDED.trigger_type, trigger_param=EXCLUDED.trigger_param;\n"
        )
print(f"  {len(rows)} badges")
EOF

# ── recommended_shortcuts ─────────────────────────────────────────────────────

echo "==> Building import SQL for recommended_shortcuts..."
python3 - "$DATA_DIR/recommended-shortcuts/shortcuts.json" "$IMPORT_SQL" <<'EOF'
import json, sys

rows = json.load(open(sys.argv[1])) or []
with open(sys.argv[2], "a") as f:
    for r in rows:
        def esc(v): return ("'" + str(v).replace("'", "''") + "'") if v else "NULL"
        active = "true" if r.get("active", True) else "false"
        f.write(
            f"INSERT INTO recommended_shortcuts (id, name, url, emoji, favicon_url, category, sort_order, active) "
            f"VALUES ({esc(r['id'])}, {esc(r['name'])}, {esc(r['url'])}, "
            f"{esc(r.get('emoji'))}, {esc(r.get('favicon_url'))}, "
            f"{esc(r.get('category'))}, {r.get('sort_order', 0)}, {active}) "
            f"ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, url=EXCLUDED.url, "
            f"emoji=EXCLUDED.emoji, favicon_url=EXCLUDED.favicon_url, "
            f"category=EXCLUDED.category, sort_order=EXCLUDED.sort_order, active=EXCLUDED.active;\n"
        )
print(f"  {len(rows)} shortcuts")
EOF

# Close transaction
echo "COMMIT;" >> "$IMPORT_SQL"

# ── Run import ────────────────────────────────────────────────────────────────

echo "==> Running import transaction..."
psql "$DB_URL" -f "$IMPORT_SQL"
echo "==> Import complete."

# ── Prod: sync media to S3 ────────────────────────────────────────────────────

if [[ "$TARGET" == "prod" ]]; then
  echo ""
  echo "==> Syncing media to S3..."
  aws s3 sync "$MEDIA_DIR/" "s3://highschoolhowto/prod/media/" --exclude "uploads/*" --delete
  aws s3 sync "$MEDIA_DIR/uploads/" "s3://highschoolhowto-site/uploads/" --delete
  echo "==> S3 sync complete."
fi

echo ""
echo "Done."
