#!/usr/bin/env bash
# Starts the Defiant Jazz stack. Run it as `./up.sh` in this folder (local/). Any arguments are Compose flags that
# go before `up`, such as `./up.sh --profile assistant`.
#
# If another program (often another Grafana) already uses a port the stack publishes on your machine (Grafana 3000,
# the MCP server 8000, and 3001 for the optional Assistant profile), this picks a free one for you, saves it to
# local/.env so the next run and your links stay the same, starts the stack, and prints the real addresses.
# Running it again while the stack is up is fine, and loads the case if the loader hadn't finished.
set -u
flags=("$@")
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

# Save NAME=VALUE in local/.env, replacing any earlier line for NAME.
save_setting() { # save_setting NAME VALUE
  local tmp="$PWD/.env.tmp.$$"
  { [ -f .env ] && grep -v "^[[:space:]]*$1=" .env; echo "$1=$2"; } >"$tmp" && mv "$tmp" .env
}

# Is something listening on this port on this machine?
in_use() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }

# Compose, with any flags you gave ./up.sh (such as --profile assistant) before the command.
dc() { docker compose ${flags[@]+"${flags[@]}"} "$@"; }
# Is it this stack's own container that holds the port? (Then running `up` again is fine.)
ours() { # ours SERVICE CONTAINER_PORT HOST_PORT
  dc port "$1" "$2" 2>/dev/null | grep -q ":$3\$"
}

# A free port: the first one from the busy port + 300 (3000 -> 3300) that nothing listens on and we haven't taken.
chosen=" "
free_port() {
  local p=$(($1 + 300))
  while [ "$p" -lt 65000 ] && { in_use "$p" || case "$chosen" in *" $p "*) true ;; *) false ;; esac; }; do
    p=$((p + 1))
  done
  echo "$p"
}

# service|container port|setting|default host port|what it is
ports="grafana|3000|DJ_GRAFANA_PORT|3000|Grafana
mcp-grafana|8000|DJ_MCP_PORT|8000|the Grafana MCP server"
case " ${flags[*]-} ${COMPOSE_PROFILES:-} " in
  *assistant*) ports="$ports
grafana-assistant|3000|DJ_ASSISTANT_PORT|3001|Grafana Assistant" ;;
esac

grafana_port=3000
mcp_port=8000
while IFS='|' read -r service cport var default label; do
  port=$(setting "$var" "$default")
  case "$port" in '' | *[!0-9]*) continue ;; esac # not a number: leave it to Compose to complain
  taken=false
  case "$chosen" in *" $port "*) taken=true ;; esac
  if in_use "$port" && ! ours "$service" "$cport" "$port"; then taken=true; fi
  if $taken; then
    new=$(free_port "$port")
    echo "Port $port (for $label) is taken by another program, so this stack will use $new instead (saved in local/.env as $var)."
    save_setting "$var" "$new"
    port=$new
  fi
  chosen="$chosen$port "
  export "$var=$port"
  case "$var" in
    DJ_GRAFANA_PORT) grafana_port=$port ;;
    DJ_MCP_PORT) mcp_port=$port ;;
  esac
done <<EOF
$ports
EOF

dc up -d || exit $?

grafana_url="http://localhost:$grafana_port"
echo
echo "Grafana:     $grafana_url"
echo "MCP server:  http://localhost:$mcp_port/mcp"
login=""
waited=0
while [ "$waited" -le "${DJ_UP_WAIT:-60}" ]; do
  login=$(dc logs --no-log-prefix gcx-token 2>/dev/null | grep 'gcx login' | tail -1)
  [ -n "$login" ] && break
  sleep 2
  waited=$((waited + 2))
done
if [ -n "$login" ]; then
  echo "gcx login:  ${login#"${login%%[![:space:]]*}"}"
else
  echo "gcx login:  not printed yet; run  docker compose logs --no-log-prefix gcx-token  in a minute (it uses $grafana_url)"
fi
