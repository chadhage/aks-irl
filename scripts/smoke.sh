#!/usr/bin/env bash
# Socket smoke test for the Skybridge messaging gateway.
#
# Usage:
#   smoke.sh tcp <host> <port> <sessions> [options]
#
# Opens N TCP sockets to gateway-java, sends a synthetic framed
# message on each, reads the ACK, records RTT. Reports established/dropped
# counts and P50/P95/P99 RTT. Fails if >1% dropped or P99 > 250 ms (override
# with --rtt-p99-ms / --drop-pct).
#
# Options:
#   --duration <s>          Hold sockets open for s seconds (default: just-in-time close)
#   --keep-alive            Same as --duration 600
#   --print-parser-version  Echo the parser version reported by the gateway HELO and exit
#   --rtt-p99-ms <n>        Override the P99 failure threshold (default 250)
#   --drop-pct <n>          Override the drop-rate failure threshold % (default 1)
set -euo pipefail

mode="${1:-}"
shift || true
[ "$mode" = "tcp" ] || { echo "usage: smoke.sh tcp <host> <port> <sessions> [options]"; exit 2; }

host="${1:?host required}"; shift
port="${1:?port required}"; shift
sessions="${1:?session count required}"; shift

duration=0
print_parser_version=0
p99_max=250
drop_max=1

while [ $# -gt 0 ]; do
  case "$1" in
    --duration)              duration="${2:?}"; shift 2;;
    --keep-alive)            duration=600; shift;;
    --print-parser-version)  print_parser_version=1; shift;;
    --rtt-p99-ms)            p99_max="${2:?}"; shift 2;;
    --drop-pct)              drop_max="${2:?}"; shift 2;;
    *) echo "unknown option: $1"; exit 2;;
  esac
done

command -v ncat >/dev/null 2>&1 || { echo "ncat is required (install nmap/ncat package)"; exit 2; }

tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT

one_session() {
  local id=$1
  local out="$tmp/s.$id"
  local rtt_ns drop=0
  {
    # Read HELO line first to confirm version
    exec 3<>"/dev/tcp/$host/$port" 2>/dev/null || { echo "drop"; return; }
    IFS= read -r -t 5 helo <&3 || { echo "drop"; return; }
    if [ "$print_parser_version" = 1 ]; then
      echo "$helo"
      exec 3<&-; exec 3>&-; return
    fi
    start=$(date +%s%N)
    # Synthetic framed envelope, '/' delimited
    printf 'MSG QU/DEST0001/ORIG0001/HDR001/PAYLOAD/%s\n' "$id" >&3
    if IFS= read -r -t 5 ack <&3; then
      end=$(date +%s%N)
      rtt_ns=$((end-start))
      echo "ok $((rtt_ns/1000000))"
    else
      echo "drop"
    fi
    if [ "$duration" -gt 0 ]; then
      sleep "$duration"
    fi
    exec 3<&-; exec 3>&-
  } > "$out" 2>&1
}

if [ "$print_parser_version" = 1 ]; then
  one_session 0
  cat "$tmp/s.0"
  exit 0
fi

echo "opening $sessions TCP sessions to $host:$port ..."
for i in $(seq 1 "$sessions"); do
  one_session "$i" &
done
wait

ok=0; drop=0
> "$tmp/rtts"
for i in $(seq 1 "$sessions"); do
  line=$(cat "$tmp/s.$i")
  if [[ "$line" == ok* ]]; then
    ok=$((ok+1))
    echo "$line" | awk '{print $2}' >> "$tmp/rtts"
  else
    drop=$((drop+1))
  fi
done

drop_pct=$(awk -v d=$drop -v t=$sessions 'BEGIN{printf "%.2f", (d/t)*100}')
sort -n "$tmp/rtts" -o "$tmp/rtts"
n=$(wc -l < "$tmp/rtts" | tr -d ' ')
p50=$(awk -v c="$n" 'NR==int(c*0.50)+1{print; exit}' "$tmp/rtts" 2>/dev/null || echo 0)
p95=$(awk -v c="$n" 'NR==int(c*0.95)+1{print; exit}' "$tmp/rtts" 2>/dev/null || echo 0)
p99=$(awk -v c="$n" 'NR==int(c*0.99)+1{print; exit}' "$tmp/rtts" 2>/dev/null || echo 0)

echo "$ok/$sessions sessions established, $drop dropped (${drop_pct}%)"
echo "RTT ms: P50=$p50 P95=$p95 P99=$p99"

rc=0
if awk "BEGIN{exit !($drop_pct > $drop_max)}"; then echo "FAIL: drop $drop_pct% > $drop_max%"; rc=1; fi
if [ "${p99:-0}" -gt "$p99_max" ]; then echo "FAIL: P99 ${p99}ms > ${p99_max}ms"; rc=1; fi
exit $rc
