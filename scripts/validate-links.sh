#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)

is_allowed_target() {
  case "$1" in
    https://learn.microsoft.com/* | \
    https://aka.ms/* | \
    https://azure.microsoft.com/* | \
    https://*.microsoft.com/* | \
    https://*.azure.com/* | \
    https://github.com/chadhage/aks-irl | \
    https://github.com/chadhage/aks-irl/* | \
    https://chadhage.github.io/aks-irl | \
    https://chadhage.github.io/aks-irl/*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

extract_targets() {
  local file=$1
  {
    grep -Eio "href[[:space:]]*=[[:space:]]*[\"']https?://[^\"']+" "$file" 2>/dev/null \
      | sed -E "s/^href[[:space:]]*=[[:space:]]*[\"']//I" || true
    grep -Eio '[[][^]]+[]][(]https?://[^)[:space:]]+[)]' "$file" 2>/dev/null \
      | grep -Eio 'https?://[^)[:space:]]+' || true
  } | sort -u
}

violations=0
while IFS= read -r -d '' file; do
  while IFS= read -r target; do
    [[ -n "$target" ]] || continue
    if ! is_allowed_target "$target"; then
      printf '[FAIL] Disallowed external hyperlink in %s: %s\n' "${file#"$REPO_ROOT"/}" "$target" >&2
      violations=$((violations + 1))
    fi
  done < <(extract_targets "$file")
done < <(find "$REPO_ROOT" -path "$REPO_ROOT/.git" -prune -o -type f \( -name '*.md' -o -name '*.html' \) -print0)

if (( violations > 0 )); then
  printf '[FAIL] %d disallowed external hyperlink(s) found\n' "$violations" >&2
  exit 1
fi

printf '[PASS] All hyperlinks target official Microsoft content or this repository\n'
