#!/usr/bin/env bash
# Runs every time the Codespace starts: starts the stack, waits for the case to load, logs gcx in and writes the
# welcome note (shown in every new terminal).
set -uo pipefail

repo_root=$(cd "$(dirname "$0")/.." && pwd)
welcome="$HOME/.dj-welcome"
export GCX_KEYCHAIN=off
cd "$repo_root/local"

rm -f "$welcome"
echo "Starting the Defiant Jazz stack (the first start takes about two minutes)..."
if ! docker compose up -d --wait --wait-timeout 600 loki prometheus tempo grafana mcp-grafana; then
  echo "The stack didn't start cleanly. Run 'cd local && docker compose ps -a' to see what's wrong." >&2
fi
docker compose up -d >/dev/null 2>&1

# Wait for the loader to finish (it exits 0 once the case is in) and for the token helper to print the login line.
echo "Waiting for the case to load..."
for _ in $(seq 1 180); do
  state=$(docker compose ps -a --format '{{.Service}} {{.State}} {{.ExitCode}}' loader 2>/dev/null)
  case "$state" in
    "loader exited 0") break ;;
    "loader exited "*) echo "The loader failed. Run 'cd local && docker compose logs loader'." >&2; break ;;
  esac
  sleep 2
done
sleep 3
tokenlog=$(docker compose logs --no-log-prefix gcx-token 2>/dev/null)
window=$(printf '%s\n' "$tokenlog" | grep 'The incident night' | tail -1)

# Log gcx in with the read-only token. The token is never printed.
token=$(printf '%s\n' "$tokenlog" | sed -n 's/.*gcx login dj-local .*--token \([^ ]*\).*/\1/p' | tail -1)
gcx_ok=no
if command -v gcx >/dev/null 2>&1 && [ -n "$token" ]; then
  if gcx login dj-local --yes --server http://localhost:3000 --token "$token" >/dev/null 2>&1 &&
    gcx datasources list >/dev/null 2>&1; then
    gcx_ok=yes
  fi
fi

if [ -n "${CODESPACE_NAME:-}" ] && [ -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]; then
  grafana_url="https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}/"
else
  grafana_url="http://localhost:3000/"
fi

{
  echo
  echo "=== The Defiant Jazz Incident ==="
  echo
  if [ -n "$window" ]; then
    echo "$window"
  else
    echo "The incident night's time range isn't ready yet. Try: cd local && docker compose logs --no-log-prefix gcx-token | grep 'The incident night'"
  fi
  echo
  echo "Grafana (the evidence):  Ports tab > Grafana, or $grafana_url"
  if [ "$gcx_ok" = yes ]; then
    echo "gcx:                     logged in, read-only ('gcx datasources list' shows loki, prometheus, tempo)"
  else
    echo "gcx:                     not logged in; run 'bash .devcontainer/start.sh' again, or see the README"
  fi
  echo "Grafana MCP server:      http://localhost:8000/mcp (read-only)"
  echo
  echo "Next steps:"
  echo "  1. Start your own AI agent in the agent folder:  cd ~/dj-agent  (its instructions are already there)"
  echo "  2. Give it the time range above. It can use gcx or the MCP server."
  echo "       Claude Code:  claude mcp add --scope user --transport http grafana-local http://localhost:8000/mcp"
  echo "       Copilot CLI:  copilot mcp add --transport http grafana-local http://localhost:8000/mcp"
  echo "     (gcx needs nothing more.) You bring the agent and its account or key."
  echo "  3. The story and the scoring are in the game: https://nicolevanderhoeven.com/defiantjazz/"
  echo
} >"$welcome"
cat "$welcome"
