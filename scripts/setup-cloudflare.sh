#!/usr/bin/env bash
# First-time Cloudflare setup for the GitHub Student Registry Worker.
#
# Creates the D1 database, writes .env, applies migrations, stores the four
# Worker secrets, and prints the values you need for the GitHub `production`
# environment. Safe to re-run: existing resources are reused, not duplicated.

set -euo pipefail

cd "$(dirname "$0")/.."

DB_NAME="github-student-registry"
ENV_FILE=".env"
WRANGLER=(npx --yes wrangler)
CONFIG=(--config dist/server/wrangler.json)

info() { printf '\n\033[1;34m==>\033[0m %s\n' "$1"; }
die() { printf '\033[1;31mx\033[0m %s\n' "$1" >&2; exit 1; }

ask() {
  # ask <prompt> <varname> [silent]; reads from the terminal. Pass a third
  # argument to keep the typed value off the screen.
  local prompt="$1" varname="$2" silent="${3:-}" value=""
  while [ -z "$value" ]; do
    if [ -n "$silent" ]; then
      read -rs -p "$prompt" value </dev/tty
      echo
    else
      read -r -p "$prompt" value </dev/tty
    fi
  done
  printf -v "$varname" '%s' "$value"
}

# --- preflight ---------------------------------------------------------------

command -v node >/dev/null || die "Node 22+ is required but was not found."
node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)' \
  || die "Node 22+ is required. Found $(node -v)."
command -v openssl >/dev/null || die "openssl is required to generate random secrets."
[ -e /dev/tty ] || die "This script is interactive and needs a terminal."

[ -d node_modules ] || { info "Installing dependencies"; npm install; }

info "Checking Cloudflare authentication"
if ! WHOAMI=$("${WRANGLER[@]}" whoami 2>&1); then
  die "Not authenticated. Run 'npx wrangler login' first."
fi
ACCOUNT_ID=$(printf '%s' "$WHOAMI" | grep -oE '[0-9a-f]{32}' | head -1 || true)
[ -n "$ACCOUNT_ID" ] || die "Could not read your account ID. Run 'npx wrangler whoami' and check the output."
echo "Authenticated. Account ID: $ACCOUNT_ID"

# --- D1 database -------------------------------------------------------------

info "Resolving the D1 database"
list_db_id() {
  "${WRANGLER[@]}" d1 list --json 2>/dev/null \
    | node -e '
        let raw = "";
        process.stdin.on("data", (c) => (raw += c));
        process.stdin.on("end", () => {
          const start = raw.indexOf("[");
          if (start < 0) return;
          try {
            const rows = JSON.parse(raw.slice(start));
            const hit = rows.find((r) => r.name === process.argv[1]);
            if (hit) process.stdout.write(hit.uuid ?? hit.database_id ?? "");
          } catch {}
        });
      ' "$DB_NAME"
}

DB_ID=$(list_db_id)
if [ -n "$DB_ID" ]; then
  echo "Reusing existing database '$DB_NAME'."
else
  echo "Creating database '$DB_NAME'."
  "${WRANGLER[@]}" d1 create "$DB_NAME" >/dev/null
  DB_ID=$(list_db_id)
  [ -n "$DB_ID" ] || die "Created the database but could not read its ID. Run 'npx wrangler d1 list'."
fi
echo "Database ID: $DB_ID"

# --- .env --------------------------------------------------------------------

info "Writing $ENV_FILE"
SITE_URL=""
if [ -f "$ENV_FILE" ]; then
  SITE_URL=$(grep -E '^NEXT_PUBLIC_SITE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' || true)
fi
if [ -z "$SITE_URL" ] || [ "$SITE_URL" = "https://your-production-domain.example" ]; then
  echo "The public HTTPS address of the deployed Worker, with no trailing slash."
  echo "If you do not know it yet, accept the placeholder and re-run after the first deploy."
  read -r -p "NEXT_PUBLIC_SITE_URL [https://your-production-domain.example]: " SITE_URL </dev/tty
  SITE_URL=${SITE_URL:-https://your-production-domain.example}
fi
SITE_URL=${SITE_URL%/}

cat > "$ENV_FILE" <<EOF
# Used while building the generated Worker configuration. Never commit this file.
CLOUDFLARE_D1_DATABASE_ID="$DB_ID"
NEXT_PUBLIC_SITE_URL="$SITE_URL"
EOF
echo "Wrote $ENV_FILE (git-ignored)."

# --- build and migrate -------------------------------------------------------

info "Building the Worker"
npm run build

info "Applying D1 migrations to the remote database"
"${WRANGLER[@]}" d1 migrations apply DB --remote "${CONFIG[@]}"

# --- Worker secrets ----------------------------------------------------------

info "Storing Worker secrets"
cat <<EOF
Create a GitHub OAuth App first, if you have not already:
  GitHub -> Settings -> Developer settings -> OAuth Apps -> New OAuth App
  Homepage URL:      $SITE_URL
  Callback URL:      $SITE_URL/api/auth/github/callback

EOF

ask "GITHUB_CLIENT_ID: " CLIENT_ID
ask "GITHUB_CLIENT_SECRET (hidden): " CLIENT_SECRET silent

printf '%s' "$CLIENT_ID"     | "${WRANGLER[@]}" secret put GITHUB_CLIENT_ID "${CONFIG[@]}"
printf '%s' "$CLIENT_SECRET" | "${WRANGLER[@]}" secret put GITHUB_CLIENT_SECRET "${CONFIG[@]}"
openssl rand -base64 32      | "${WRANGLER[@]}" secret put SESSION_SECRET "${CONFIG[@]}"

ADMIN_TOKEN=$(openssl rand -base64 32)
printf '%s' "$ADMIN_TOKEN"   | "${WRANGLER[@]}" secret put ADMIN_TOKEN "${CONFIG[@]}"

# --- summary -----------------------------------------------------------------

info "Cloudflare setup complete"
cat <<EOF
Save this admin token now. It is not stored anywhere else and is required for
the instructor CSV and JSON exports:

  ADMIN_TOKEN: $ADMIN_TOKEN

Add these to the GitHub 'production' environment
(Settings -> Environments -> production):

  Secret    CLOUDFLARE_API_TOKEN        (create it, see README)
  Secret    CLOUDFLARE_ACCOUNT_ID       $ACCOUNT_ID
  Variable  CLOUDFLARE_D1_DATABASE_ID   $DB_ID
  Variable  NEXT_PUBLIC_SITE_URL        $SITE_URL

Then deploy with 'npm run deploy', or push to main to let the workflow do it.
EOF
