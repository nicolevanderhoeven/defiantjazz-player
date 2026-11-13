#!/usr/bin/env bash
# Runs every time the Codespace starts: starts the stack, waits for the case to load, logs gcx in and writes the
# welcome note (shown in every new terminal).
set -uo pipefail

repo_root=$(cd "$(dirname "$0")/.." && pwd)
welcome="$HOME/.dj-welcome"
export GCX_KEYCHAIN=off
cd "$repo_root/local" || exit 1

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

# Hand the incident night's window to the agent: a marked section in its instruction files, replaced on every start.
# If the window line is missing or unparseable, the files are left as they are.
win_from=$(printf '%s\n' "$window" | sed -n 's/.* from \([^ ,]*\) to .*/\1/p')
win_to=$(printf '%s\n' "$window" | sed -n 's/.* to \([^ ,]*\),.*/\1/p')
win_run=$(printf '%s\n' "$window" | sed -n 's/.*case_run="\([^"]*\)".*/\1/p')
window_written=no
if [ -n "$win_from" ] && [ -n "$win_to" ] && [ -n "$win_run" ]; then
  for f in "$HOME/dj-agent/AGENTS.md" "$HOME/dj-agent/CLAUDE.md"; do
    [ -f "$f" ] || continue
    tmp=$(mktemp)
    sed '/^<!-- dj-window:start -->$/,/^<!-- dj-window:end -->$/d' "$f" >"$tmp"
    {
      cat "$tmp"
      echo
      echo '<!-- dj-window:start -->'
      echo '## The incident night in this Codespace'
      echo
      echo "The Codespace already knows the window, so don't ask the player for it. Search from **$win_from** to **$win_to** (UTC), \`case_run=\"$win_run\"\`. Use that range for every query; a relative range such as \"the last 24 hours\" will miss the incident."
      echo '<!-- dj-window:end -->'
    } >"$f"
    rm -f "$tmp"
    window_written=yes
  done
fi

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
    if [ "$window_written" = yes ]; then
      echo "(Your agent's instructions in ~/dj-agent already include this range; there is nothing for you to do with it.)"
    fi
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
  echo "Next steps: install ONE AI agent, then start it in the agent folder."
  echo "Each needs your own account or key (Claude subscription or API key;"
  echo "ChatGPT plan or API key; Copilot plan, including Free). You are"
  echo "responsible for any costs of using it."
  echo
  echo "Claude Code:"
  echo "  curl -fsSL https://claude.ai/install.sh | bash"
  echo "  claude mcp add --scope user --transport http grafana-local \\"
  echo "    http://localhost:8000/mcp"
  echo "  cd ~/dj-agent && claude"
  echo
  echo "Codex:"
  echo "  npm install -g @openai/codex"
  echo "  cd ~/dj-agent && codex"
  echo
  echo "Copilot CLI:"
  echo "  npm install -g @github/copilot"
  echo "  mkdir -p ~/.copilot"
  echo "  echo '{\"storeTokenPlaintext\": true}' > ~/.copilot/settings.json"
  echo "  cd ~/dj-agent && copilot      (then type /login)"
  echo "  copilot mcp add --transport http grafana-local \\"
  echo "    http://localhost:8000/mcp"
  echo
  echo "gcx needs nothing more: it is already logged in. Any other agent that"
  echo "speaks MCP can use http://localhost:8000/mcp (see the README)."
  echo "The story and the scoring are in the game:"
  echo "  https://nicolevanderhoeven.com/defiantjazz/"
  echo
} >"$welcome"
cat "$welcome"
