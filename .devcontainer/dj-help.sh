#!/usr/bin/env bash
# dj-help: print the Defiant Jazz welcome note (time range, agent install lines, next steps).
#   dj-help          print it now, or say the case is still loading
#   dj-help --wait   used by new terminals: if the case is still loading, say so, wait and print it as soon as it is ready
welcome="$HOME/.dj-welcome"
max_wait=600 # seconds; the case normally loads in about 3 minutes

if [ -f "$welcome" ]; then
  cat "$welcome"
  exit 0
fi

if [ "${1:-}" != "--wait" ]; then
  echo "The case is still loading (about 3 minutes after the Codespace starts). Run dj-help again in a minute."
  exit 0
fi

echo
echo "The case is still loading (about 3 minutes). The next steps will appear here when it is ready."
echo "Press Ctrl+C to stop waiting; type dj-help any time to show the steps."
trap 'echo; echo "Stopped waiting. Type dj-help any time to show the next steps."; exit 0' INT
waited=0
while [ ! -f "$welcome" ]; do
  if [ "$waited" -ge "$max_wait" ]; then
    echo "The case is taking longer than expected. Run 'cd local && docker compose ps -a' and"
    echo "'docker compose logs loader' to see what's wrong, or 'bash .devcontainer/start.sh' to retry."
    echo "Type dj-help once it has loaded."
    exit 0
  fi
  sleep 2
  waited=$((waited + 2))
done
cat "$welcome"
