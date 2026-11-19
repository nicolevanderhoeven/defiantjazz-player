#!/usr/bin/env bash
# Starts the Defiant Jazz stack: checks that the ports it publishes on your machine are free, and only then runs
# `docker compose up -d`. Run it as `./up.sh` in this folder (local/). Extra arguments go to `docker compose up -d`.
#
# Why: if another program (often another Grafana) already uses port 3000 or 8000, Docker stops with a short
# "address already in use" and leaves the stack half made. This stops first, before anything is created, and says
# which line to add to local/.env. Running it again while the stack is up is fine, and loads the case if the loader
# hadn't finished.
set -u
cd "$(dirname "$0")" || exit 1

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose isn't available. Install and start Docker (Docker Desktop, or Docker Engine with the Compose plugin), then run this again." >&2
  exit 1
fi

# A setting's value: the environment wins, then local/.env, then the default (the order Compose uses too).
setting() { # setting NAME DEFAULT
  local v="${!1:-}"
  if [ -z "$v" ] && [ -f .env ]; then
    v=$(sed -n "s/^[[:space:]]*$1=//p" .env | tail -1 | tr -d "\"'[:space:]")
  fi
  echo "${v:-$2}"
}

# Is something listening on this port on this machine?
in_use() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }

# Is it this stack's own container that holds the port? (Then running `up` again is fine.)
ours() { # ours SERVICE CONTAINER_PORT HOST_PORT
  docker compose port "$1" "$2" 2>/dev/null | grep -q ":$3\$"
}

# A free port to suggest: the first one above the busy port + 300 (3000 -> 3300).
free_port() {
  local p=$(($1 + 300))
  while in_use "$p" && [ "$p" -lt 65000 ]; do p=$((p + 1)); done
  echo "$p"
}

# service|container port|setting|default host port|what it is
ports="grafana|3000|DJ_GRAFANA_PORT|3000|Grafana
mcp-grafana|8000|DJ_MCP_PORT|8000|the Grafana MCP server"
case " $* ${COMPOSE_PROFILES:-} " in
  *assistant*) ports="$ports
grafana-assistant|3000|DJ_ASSISTANT_PORT|3001|Grafana Assistant" ;;
esac

busy=0
while IFS='|' read -r service cport var default label; do
  port=$(setting "$var" "$default")
  case "$port" in '' | *[!0-9]*) continue ;; esac # not a number: leave it to Compose to complain
  if in_use "$port" && ! ours "$service" "$cport" "$port"; then
    if [ "$busy" -eq 0 ]; then
      echo "Nothing has been started: a port this stack needs is already in use on this machine." >&2
    fi
    busy=1
    echo >&2
    echo "Port $port (for $label) is taken by another program, maybe another Grafana or Docker stack." >&2
    echo "Add this line to local/.env (copy local/.env.example to local/.env first if you don't have one yet):" >&2
    echo >&2
    echo "    $var=$(free_port "$port")" >&2
  fi
done <<EOF
$ports
EOF

if [ "$busy" -ne 0 ]; then
  echo >&2
  echo "Then run ./up.sh again. Use your port wherever the instructions or the game page say 3000 (Grafana) or 8000 (the MCP server)." >&2
  exit 1
fi

exec docker compose up -d "$@"
