#!/usr/bin/env bash
# Pre-flight checks for aks-briefing-with-labs WorkshopPlus. Pass/fail per tool.
set -u
ok=0; fail=0

check_probe() {
  local name=$1
  shift
  if "$@" >/dev/null 2>&1; then
    printf "  [PASS] %s\n" "$name"; ok=$((ok + 1))
  else
    printf "  [FAIL] %s\n" "$name"; fail=$((fail + 1))
  fi
}

version_at_least() {
  awk -v actual="$1" -v minimum="$2" 'BEGIN {
    split(actual, a, "."); split(minimum, m, ".");
    for (i = 1; i <= 3; i++) {
      a[i] += 0; m[i] += 0;
      if (a[i] > m[i]) exit 0;
      if (a[i] < m[i]) exit 1;
    }
    exit 0;
  }'
}

check_version() {
  local name=$1 command_name=$2 minimum=$3 output version
  shift 3
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf "  [FAIL] %s (missing command: %s)\n" "$name" "$command_name"
    fail=$((fail + 1))
    return
  fi
  output=$("$@" 2>&1 || true)
  version=$(grep -Eo '[0-9]+\.[0-9]+([.][0-9]+)?' <<< "$output" | head -1)
  if [[ -n "$version" ]] && version_at_least "$version" "$minimum"; then
    printf "  [PASS] %s %s (minimum %s)\n" "$name" "$version" "$minimum"
    ok=$((ok + 1))
  else
    printf "  [FAIL] %s version %s (minimum %s)\n" "$name" "${version:-unknown}" "$minimum"
    fail=$((fail + 1))
  fi
}

echo "Pre-flight for aks-briefing-with-labs WorkshopPlus"
check_version "Azure CLI"  az        2.65 az version
check_version "Terraform"  terraform 1.9  terraform version
check_version "kubectl"    kubectl   1.30 kubectl version --client
check_probe   "kubelogin"                    kubelogin --version
check_version "helm"       helm      3.15 helm version --short
if command -v docker >/dev/null 2>&1; then
  check_probe "docker or podman" docker version
else
  check_probe "docker or podman" podman version
fi
check_version "Python"     python3   3.10 python3 --version
check_version "git"        git       2.40 git --version
check_probe   "jq"                           jq --version
check_probe   "yq"                           yq --version
check_version "GitHub CLI" gh        2.50 gh --version
check_probe   "ncat (socket smoke test)"     ncat --version
check_probe   "openssl s_client"             openssl version
check_probe   "psql (Postgres client)"       psql --version
check_probe   "Azure login"                  az account show
echo "Result: $ok ok, $fail failing"
exit $fail
