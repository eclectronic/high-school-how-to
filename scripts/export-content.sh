#!/usr/bin/env bash
# Export all admin-authored content from prod DB + S3 into ./data/ and ./media/.
# Run from the repo root. Requires ~/docker.env with PROD_EXPORT_DB_URL set.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="$REPO_ROOT/data"
MEDIA_DIR="$REPO_ROOT/media"

# Load env
ENV_FILE="$HOME/docker.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found. Add PROD_EXPORT_DB_URL to it." >&2
  exit 1
fi
# shellcheck source=/dev/null
source "$ENV_FILE"

if [[ -z "${PROD_EXPORT_DB_URL:-}" ]]; then
  echo "ERROR: PROD_EXPORT_DB_URL is not set in $ENV_FILE." >&2
  exit 1
fi

DB_URL="$PROD_EXPORT_DB_URL"

echo "==> Exporting content from prod DB..."

# Create directory structure
mkdir -p \
  "$DATA_DIR/content-cards" \
  "$DATA_DIR/tags" \
  "$DATA_DIR/quotes" \
  "$DATA_DIR/badges" \
  "$DATA_DIR/recommended-shortcuts"

# ── Export tags ───────────────────────────────────────────────────────────────

echo "  tags..."
psql "$DB_URL" -t -A -c "
SELECT json_agg(row_to_json(t) ORDER BY t.slug)
FROM (SELECT id, slug, name, description, sort_order FROM tags) t
" | python3 -m json.tool > "$DATA_DIR/tags/_all.json.tmp"

# Split into per-slug files
python3 - <<'EOF' "$DATA_DIR/tags/_all.json.tmp" "$DATA_DIR/tags"
import json, sys, os, pathlib
src, dst = sys.argv[1], sys.argv[2]
rows = json.load(open(src)) or []
for row in rows:
    path = pathlib.Path(dst) / f"{row['slug']}.json"
    path.write_text(json.dumps(row, indent=2, ensure_ascii=False) + "\n")
os.remove(src)
print(f"    wrote {len(rows)} tag files")
EOF

# ── Export content cards (with tags, links, tasks denormalized) ───────────────

echo "  content-cards..."
psql "$DB_URL" -t -A -c "
SELECT json_agg(
    jsonb_build_object(
        'id',              c.id,
        'slug',            c.slug,
        'title',           c.title,
        'description',     c.description,
        'cardType',        c.card_type,
        'status',          c.status,
        'mediaUrl',        c.media_url,
        'printMediaUrl',   c.print_media_url,
        'mediaUrls',       COALESCE(c.media_urls, '[]'::jsonb),
        'thumbnailUrl',    c.thumbnail_url,
        'coverImageUrl',   c.cover_image_url,
        'backgroundColor', c.background_color,
        'textColor',       c.text_color,
        'simpleLayout',    c.simple_layout,
        'bodyJson',        c.body_json,
        'bodyHtml',        c.body_html,
        'createdAt',       c.created_at,
        'updatedAt',       c.updated_at,
        'tags', (
            SELECT json_agg(t.slug ORDER BY t.name)
            FROM content_card_tags cct
            JOIN tags t ON t.id = cct.tag_id
            WHERE cct.card_id = c.id
        ),
        'links', (
            SELECT json_agg(jsonb_build_object(
                'targetSlug', tc.slug,
                'linkText',   cl.link_text,
                'sortOrder',  cl.sort_order
            ) ORDER BY cl.sort_order)
            FROM content_card_links cl
            JOIN content_cards tc ON tc.id = cl.target_card_id
            WHERE cl.source_card_id = c.id
        ),
        'templateTasks', (
            SELECT json_agg(jsonb_build_object(
                'description', ct.description,
                'sortOrder',   ct.sort_order
            ) ORDER BY ct.sort_order)
            FROM content_card_tasks ct
            WHERE ct.card_id = c.id
        )
    ) ORDER BY c.slug
)
FROM content_cards c
" | python3 -m json.tool > "$DATA_DIR/content-cards/_all.json.tmp"

python3 - <<'EOF' "$DATA_DIR/content-cards/_all.json.tmp" "$DATA_DIR/content-cards"
import json, sys, os, pathlib
src, dst = sys.argv[1], sys.argv[2]
rows = json.load(open(src)) or []
for row in rows:
    path = pathlib.Path(dst) / f"{row['slug']}.json"
    path.write_text(json.dumps(row, indent=2, ensure_ascii=False) + "\n")
os.remove(src)
print(f"    wrote {len(rows)} card files")
EOF

# ── Export quotes ─────────────────────────────────────────────────────────────

echo "  quotes..."
psql "$DB_URL" -t -A -c "
SELECT COALESCE(json_agg(row_to_json(q) ORDER BY q.id), '[]'::json)
FROM (SELECT id, quote_text, attribution FROM quotes) q
" | python3 -m json.tool > "$DATA_DIR/quotes/quotes.json"
echo "    wrote quotes.json"

# ── Export badges ─────────────────────────────────────────────────────────────

echo "  badges..."
psql "$DB_URL" -t -A -c "
SELECT COALESCE(json_agg(row_to_json(b) ORDER BY b.id), '[]'::json)
FROM (SELECT id, name, description, emoji, icon_url, trigger_type, trigger_param FROM badges) b
" | python3 -m json.tool > "$DATA_DIR/badges/badges.json"
echo "    wrote badges.json"

# ── Export recommended shortcuts ──────────────────────────────────────────────

echo "  recommended-shortcuts..."
psql "$DB_URL" -t -A -c "
SELECT COALESCE(json_agg(row_to_json(rs) ORDER BY rs.sort_order), '[]'::json)
FROM (SELECT id, name, url, emoji, favicon_url, category, sort_order, active FROM recommended_shortcuts) rs
" | python3 -m json.tool > "$DATA_DIR/recommended-shortcuts/shortcuts.json"
echo "    wrote shortcuts.json"

# ── Sync S3 media ─────────────────────────────────────────────────────────────

echo "==> Syncing S3 media..."
echo "  curated media (s3://highschoolhowto/prod/media/ → ./media/)..."
aws s3 sync "s3://highschoolhowto/prod/media/" "$MEDIA_DIR/" --exclude "uploads/*"

echo "  admin uploads (s3://highschoolhowto/uploads/ → ./media/uploads/)..."
mkdir -p "$MEDIA_DIR/uploads"
aws s3 sync "s3://highschoolhowto/uploads/" "$MEDIA_DIR/uploads/"

echo ""
echo "==> Export complete. Review the diff in data/ and media/ then commit."
