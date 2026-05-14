#!/usr/bin/env bash
# Smoke test: hit $TARGET_URL/api/products 500 times across 5 workers.
# Fail if > 1% non-200 or P95 latency > 300 ms.
set -euo pipefail

: "${TARGET_URL:?TARGET_URL is required (e.g. https://canary.example.com)}"

REQ=500
CONC=5
TMP=$(mktemp -d)
trap 'rm -rf $TMP' EXIT

echo "Running $REQ requests against $TARGET_URL ..."
seq 1 $REQ | xargs -P $CONC -I{} sh -c '
  start=$(date +%s%N)
  code=$(curl -s -o /dev/null -w "%{http_code}" "'$TARGET_URL'/api/products")
  end=$(date +%s%N)
  echo "$code $((($end-$start)/1000000))" >> '$TMP'/results
'

TOTAL=$(wc -l < $TMP/results)
NON200=$(awk '$1 != 200' $TMP/results | wc -l)
ERR_PCT=$(awk -v n=$NON200 -v t=$TOTAL 'BEGIN{printf "%.2f", (n/t)*100}')
P95=$(awk '{print $2}' $TMP/results | sort -n | awk -v c=$TOTAL 'NR==int(c*0.95){print; exit}')

echo "total=$TOTAL non200=$NON200 err_pct=$ERR_PCT P95_ms=$P95"

fail=0
if awk "BEGIN{exit !($ERR_PCT > 1.0)}"; then echo "FAIL: error rate $ERR_PCT% > 1%"; fail=1; fi
if [ "$P95" -gt 300 ]; then echo "FAIL: P95 ${P95}ms > 300ms"; fail=1; fi
exit $fail
