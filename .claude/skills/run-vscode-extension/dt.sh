#!/bin/bash
# Runs driver.mjs in the background and sends it commands, one at a time.
#
#   dt.sh start          start the driver (VS Code starts with the `launch` command)
#   dt.sh <command...>   send a command, print its output once it is done
#   dt.sh stop           quit VS Code and the driver
#
# The driver reads its commands from $DT_RUN_DIR/cmds and writes to $DT_RUN_DIR/log
# (default /tmp/dt-run). $DT_TIMEOUT (seconds, default 300) limits the wait for one command.
set -u
SKILL_DIR="$(cd "$(dirname "$0")" && pwd)"
RUN="${DT_RUN_DIR:-/tmp/dt-run}"
CMDS="$RUN/cmds"
LOG="$RUN/log"
mkdir -p "$RUN"

done_count() {
  local count
  count=$(grep -c '^DONE ' "$LOG" 2> /dev/null)
  echo "${count:-0}"
}

send() {
  local before lines
  before=$(done_count)
  lines=$(wc -l < "$LOG" 2>/dev/null || echo 0)
  echo "$*" >> "$CMDS"
  for _ in $(seq 1 $(( ${DT_TIMEOUT:-300} * 5 ))); do
    [ "$(done_count)" -gt "$before" ] && break
    if ! pgrep -f "$SKILL_DIR/driver.mjs" > /dev/null; then
      echo "The driver is not running. Start it with: $0 start" >&2
      tail -n +$((lines + 1)) "$LOG"
      return 1
    fi
    sleep 0.2
  done
  tail -n +$((lines + 1)) "$LOG"
}

case "${1:-}" in
  start)
    pkill -f "tail -f $CMDS" 2> /dev/null
    : > "$CMDS"
    : > "$LOG"
    nohup bash -c "tail -f '$CMDS' | node '$SKILL_DIR/driver.mjs' >> '$LOG' 2>&1" > /dev/null 2>&1 &
    for _ in $(seq 1 50); do
      grep -q 'driver ready' "$LOG" && break
      sleep 0.2
    done
    cat "$LOG"
    ;;
  stop)
    send quit
    pkill -f "tail -f $CMDS" 2> /dev/null
    ;;
  "")
    echo "usage: $0 start | stop | <command>   (try: $0 help)" >&2
    exit 1
    ;;
  *)
    send "$@"
    ;;
esac
