#!/usr/bin/env bash
# Runs once, when the Codespace is created: installs gcx, makes the agent's empty folder, and tells Grafana
# its address behind the Codespace's forwarded port. The stack itself is started by start.sh.
set -euo pipefail

GCX_VERSION=1.7.1
repo_root=$(cd "$(dirname "$0")/.." && pwd)

# gcx, the Grafana command line.
case "$(uname -m)" in
  x86_64) arch=amd64 ;;
  aarch64 | arm64) arch=arm64 ;;
  *) echo "setup: no gcx build for $(uname -m); install it yourself from https://gra.fan/gcxrepo" >&2; arch= ;;
esac
if [ -n "$arch" ] && ! command -v gcx >/dev/null 2>&1; then
  tmp=$(mktemp -d)
  curl -fsSL "https://github.com/grafana/gcx/releases/download/v${GCX_VERSION}/gcx_${GCX_VERSION}_linux_${arch}.tar.gz" -o "$tmp/gcx.tgz"
  tar -xzf "$tmp/gcx.tgz" -C "$tmp" gcx
  sudo install -m 0755 "$tmp/gcx" /usr/local/bin/gcx
  rm -rf "$tmp"
fi

# A Codespace has no keychain, so gcx keeps its (read-only) token in its settings file instead.
if ! grep -q 'GCX_KEYCHAIN' "$HOME/.bashrc" 2>/dev/null; then
  echo 'export GCX_KEYCHAIN=off' >>"$HOME/.bashrc"
fi

# The agent's folder: empty except for its instructions, so it works from the telemetry and not from this repository.
mkdir -p "$HOME/dj-agent"
cp "$repo_root/agent-kit/AGENTS.md" "$HOME/dj-agent/AGENTS.md"
cp "$repo_root/agent-kit/AGENTS.md" "$HOME/dj-agent/CLAUDE.md"

# Grafana's address in a Codespace is the forwarded port's URL, not localhost. local/.env is private (never committed).
if [ -n "${CODESPACE_NAME:-}" ] && [ -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]; then
  env_file="$repo_root/local/.env"
  touch "$env_file"
  sed -i '/^DJ_GRAFANA_ROOT_URL=/d' "$env_file"
  echo "DJ_GRAFANA_ROOT_URL=https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}/" >>"$env_file"
fi

# Show the welcome note in every new terminal (start.sh writes it once the case is loaded).
if ! grep -q 'dj-welcome' "$HOME/.bashrc" 2>/dev/null; then
  echo '[ -f "$HOME/.dj-welcome" ] && cat "$HOME/.dj-welcome"' >>"$HOME/.bashrc"
fi

# Copilot CLI (needs the player's own Copilot plan). Not essential, so a failure here doesn't stop the setup.
if ! command -v copilot >/dev/null 2>&1; then
  npm install -g @github/copilot || echo "setup: could not install Copilot CLI; run 'npm install -g @github/copilot' yourself" >&2
fi
