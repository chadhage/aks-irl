#!/usr/bin/env bash
# Pre-flight checks for aks-briefing-with-labs WorkshopPlus. Pass/fail per tool.
set -u
ok=0; fail=0
check() {
  name=$1; cmd=$2
  if eval "$cmd" >/dev/null 2>&1; then
    printf "  [PASS] %s\n" "$name"; ok=$((ok+1))
  else
    printf "  [FAIL] %s\n" "$name"; fail=$((fail+1))
  fi
}
echo "Pre-flight for aks-briefing-with-labs WorkshopPlus"
check "Azure CLI"                "az version"
check "Terraform >= 1.9"         "terraform version | head -1 | awk '{print \$2}' | grep -E 'v(1\\.[9-9]|[2-9])\\.'"
check "kubectl >= 1.30"          "kubectl version --client | head -1 | grep -E 'v1\\.(3[0-9]|[4-9])'"
check "kubelogin"                "kubelogin --version"
check "helm >= 3.15"             "helm version --short | grep -E 'v3\\.(1[5-9]|[2-9])'"
check "docker or podman"         "docker version || podman version"
check "git"                      "git --version"
check "jq"                       "jq --version"
check "yq"                       "yq --version"
check "GitHub CLI"               "gh --version"
check "ncat (socket smoke test)" "ncat --version"
check "openssl s_client"         "openssl version"
check "psql (Postgres client)"   "psql --version"
check "Azure login"              "az account show"
echo "Result: $ok ok, $fail failing"
exit $fail
