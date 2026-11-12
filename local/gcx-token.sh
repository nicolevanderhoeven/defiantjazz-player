#!/bin/sh
# Runs once in the `gcx-token` service (see docker-compose.yml): makes a read-only (Viewer) Grafana service
# account and a token for it on the local stack, and prints the `gcx login` line to paste.
# Idempotent: a token it made earlier is reused while it still works.
# The token is kept in the stack's own volume (gcx-token-data), never in this repository.
set -u

GRAFANA="${GCX_TOKEN_GRAFANA:-http://grafana:3000}"
SA_NAME=dj-viewer
TOKEN_FILE="${GCX_TOKEN_FILE:-/out/gcx-token}"
WINDOW_FILE="${GCX_TOKEN_WINDOW_FILE:-/window/case-window.json}"
ADMIN="${GRAFANA_ADMIN_USER:-admin}:${GRAFANA_ADMIN_PASSWORD:-admin}"

api() { # api METHOD PATH [JSON BODY], signed in as the admin
  if [ $# -ge 3 ]; then
    curl -sS -f -m 20 -u "$ADMIN" -X "$1" -H 'Content-Type: application/json' -d "$3" "$GRAFANA$2"
  else
    curl -sS -f -m 20 -u "$ADMIN" -X "$1" "$GRAFANA$2"
  fi
}

fail() {
  echo "gcx-token: $1" >&2
  echo "gcx-token: You can still make the token by hand: Grafana > Administration > Users and access > Service accounts (see the README)." >&2
  exit 1
}

echo "gcx-token: waiting for Grafana..."
i=0
until curl -s -f -m 5 "$GRAFANA/api/health" >/dev/null 2>&1; do
  i=$((i + 1))
  [ "$i" -gt 90 ] && fail "Grafana wasn't ready after 3 minutes."
  sleep 2
done

token=
if [ -s "$TOKEN_FILE" ]; then
  saved=$(cat "$TOKEN_FILE")
  if curl -s -f -m 10 -H "Authorization: Bearer $saved" "$GRAFANA/api/org" >/dev/null 2>&1; then
    token=$saved
    echo "gcx-token: the token from the last run still works, reusing it."
  fi
fi

if [ -z "$token" ]; then
  found=$(api GET "/api/serviceaccounts/search?query=$SA_NAME") ||
    fail "Grafana wouldn't let '${ADMIN%%:*}' list service accounts. If you changed the admin password after the first start, set GRAFANA_ADMIN_PASSWORD in local/.env to it."
  id=$(printf '%s' "$found" | sed -n 's/.*"serviceAccounts":\[{[^]]*"id":\([0-9][0-9]*\).*/\1/p')
  if [ -z "$id" ]; then
    made=$(api POST /api/serviceaccounts "{\"name\":\"$SA_NAME\",\"role\":\"Viewer\"}") || fail "couldn't create the service account."
    id=$(printf '%s' "$made" | sed -n 's/.*"id":\([0-9][0-9]*\).*/\1/p')
  fi
  [ -n "$id" ] || fail "couldn't read the service account's id."
  # A token that isn't in the volume any more can't be read back, so replace the old ones.
  for old in $(api GET "/api/serviceaccounts/$id/tokens" | grep -o '"id":[0-9]*' | cut -d: -f2); do
    api DELETE "/api/serviceaccounts/$id/tokens/$old" >/dev/null || true
  done
  made=$(api POST "/api/serviceaccounts/$id/tokens" '{"name":"gcx"}') || fail "couldn't create the token."
  token=$(printf '%s' "$made" | sed -n 's/.*"key":"\([^"]*\)".*/\1/p')
  [ -n "$token" ] || fail "couldn't read the token."
  umask 077
  printf '%s' "$token" >"$TOKEN_FILE"
  echo "gcx-token: made the Viewer service account '$SA_NAME' and a token for it."
fi

echo
echo "Log gcx in to this stack (run this on your own machine, outside this repository's folder):"
echo
echo "  gcx login dj-local --yes --server ${DJ_GRAFANA_URL:-http://localhost:3000} --token $token"
echo
echo "Then check it with:  gcx datasources list"
echo "(To keep your other gcx setups untouched, set GCX_CONFIG=/some/scratch/file first.)"

# The loader leaves the incident night's window behind once the case is loaded; wait for it a while.
i=0
while [ ! -s "$WINDOW_FILE" ] && [ "$i" -lt 150 ]; do
  [ "$i" -eq 0 ] && echo && echo "gcx-token: waiting for the loader to finish, to print the incident night's window..."
  i=$((i + 1))
  sleep 2
done
if [ -s "$WINDOW_FILE" ]; then
  start=$(sed -n 's/.*"start": "\([^"]*\)".*/\1/p' "$WINDOW_FILE")
  end=$(sed -n 's/.*"end": "\([^"]*\)".*/\1/p' "$WINDOW_FILE")
  case_run=$(sed -n 's/.*"case_run": "\([^"]*\)".*/\1/p' "$WINDOW_FILE")
  echo
  echo "The incident night (UTC): from $start to $end, case_run=\"$case_run\"."
else
  echo "gcx-token: no window yet; the loader prints it too (docker compose logs loader)."
fi
