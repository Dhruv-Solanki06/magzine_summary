#!/bin/sh
# Generate the browser-readable runtime config from the container environment,
# then start the Next.js standalone server.
#
# NEXT_PUBLIC_* values are normally inlined into the client bundle at BUILD time.
# By emitting them into /public/__env.js at container START instead, a single
# prebuilt image can be pointed at any Supabase project / keys purely via the
# runtime environment (the instance's .env, passed by docker-compose env_file).
# lib/public-env.ts reads window.__ENV first and falls back to build-time env.
#
# Only browser-SAFE keys are written here — never service-role or other secrets.
set -eu

ENV_FILE="${PUBLIC_ENV_FILE:-/app/public/__env.js}"

# js_string escapes a value for safe embedding inside a double-quoted JS string.
js_string() {
  printf '%s' "${1:-}" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

cat > "$ENV_FILE" <<EOF
// Generated at container start by docker-entrypoint.sh — do not edit.
window.__ENV = {
  "NEXT_PUBLIC_SUPABASE_URL": "$(js_string "${NEXT_PUBLIC_SUPABASE_URL:-}")",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY": "$(js_string "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}")",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": "$(js_string "${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-}")",
  "NEXT_PUBLIC_PEXELS_API_KEY": "$(js_string "${NEXT_PUBLIC_PEXELS_API_KEY:-}")",
  "NEXT_PUBLIC_API_URL": "$(js_string "${NEXT_PUBLIC_API_URL:-}")"
};
EOF

if [ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" ]; then
  echo "[entrypoint] wrote $ENV_FILE (NEXT_PUBLIC_SUPABASE_URL is set)"
else
  echo "[entrypoint] WARNING: NEXT_PUBLIC_SUPABASE_URL is empty — check the .env passed to the container." >&2
fi

exec "$@"
