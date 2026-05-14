# Module 05 — Deployment Rings with Gates

**Duration:** 90 min  |  **Level target:** L300 → L400  |  **Day:** 2

**Success criterion this satisfies:** #3 — *Add multiple deployment rings with gates.*

## Outcomes
- Build a tag-based promotion flow: `dev → canary → prod`
- Automate dev (PR merge) and canary (auto-bump) rings
- Require **PR review + Argo CD manual sync + smoke test** to release to prod
- Roll back a bad release in under 60 seconds

## The ring model

```
                       GitHub Action                   GitHub Action
PR merge → main ───▶ build & push :sha ───▶ bump dev ─────▶ Argo CD auto-sync ─▶ dev
                                              │
                                              └─▶ after 5m soak: bump canary ─▶ Argo CD auto-sync ─▶ canary
                                                                                       │
                                                                                       └─ smoke test passes ?
                                                                                              │
                                                                                              ▼
                                                                                      open PR bumping prod
                                                                                              │
                                                                                              ▼
                                                                                  human approves PR
                                                                                              │
                                                                                              ▼
                                                                                  Argo CD MANUAL sync ─▶ prod
```

## Step 1 — Set up image tags by SHA
The CI workflow ([`.github/workflows/ci.yaml`](../../.github/workflows/ci.yaml)) tags images by the commit SHA. After a PR merges to main:
- `dev-latest` is moved to point at the new SHA
- `canary` overlay's `newTag:` is bumped automatically (commit by `github-actions[bot]`)
- A draft PR is opened bumping `prod` overlay's `newTag:` — review required

## Step 2 — Wire the gates
For each ring, set GitHub **Environment protection rules**:

| Environment | Required reviewers | Wait | Branch | Notes |
|---|---|---|---|---|
| `dev` | none | 0 | `main` | Auto-merge bump commits |
| `canary` | none | 5 min soak | `main` | Pause for SLO check |
| `prod` | 1 reviewer | 0 | `main` | Argo CD `ring-prod` syncPolicy is **manual** |

Add a **smoke-test job** that runs against canary before the prod-bump PR is opened. The job exits non-zero if:
- `/api/products` returns non-200 for 1% of 500 requests
- P95 latency > 300 ms over a 60 s window (via `curl` + `jq` against Prometheus query API)

A working smoke-test script lives at [`../../scripts/smoke.sh`](../../scripts/smoke.sh).

## Step 3 — Tighten Argo CD RBAC per ring
Apply this `ConfigMap` patch — it scopes app-team logins to **sync canary** but **not prod**:
```yaml
apiVersion: v1
kind: ConfigMap
metadata: { name: argocd-rbac-cm, namespace: argocd }
data:
  policy.default: role:readonly
  policy.csv: |
    p, role:app-team, applications, sync, storefront/ring-dev, allow
    p, role:app-team, applications, sync, storefront/ring-canary, allow
    p, role:platform-admin, applications, *, storefront/*, allow
    g, your-org:app-team, role:app-team
    g, your-org:platform, role:platform-admin
```

## Step 4 — Practice a release
1. Open a tiny PR to `apps/api-node/src/server.js` (change the response message)
2. Merge → watch CI build, push `:sha`, bump dev overlay
3. Watch Argo CD sync `ring-dev`; verify response from dev namespace
4. After the 5 min soak, watch canary auto-bump and sync
5. Run smoke test against canary
6. Approve the auto-opened prod-bump PR
7. In Argo CD UI: select `ring-prod` → **Sync**
8. Verify `/api/products` against Front Door now returns the new message

## Step 5 — Practice a rollback
Two paths, both timed:

**Fast path — revert in Argo CD UI:** click `ring-prod` → **History and Rollback** → pick the previous Sync → Rollback. **~15 seconds.**

**Truthful path — revert via PR:** open a revert PR on the prod overlay's `kustomization.yaml`. Merge → Argo CD shows OutOfSync → manual sync. **~90 seconds.**

> **[F]** Both are valid. The truthful path keeps Git as the source of truth — the Argo rollback marks the Application as out-of-sync until Git is reverted, which is friction by design.

## Validation
- A merged PR ends up in `ring-prod` only after PR review **and** manual Argo sync
- A rollback of `ring-prod` to the previous version takes < 60 s
- Argo CD logs show distinct `Sync` events with author identity preserved

## Stretch (L400)
- Add **Argo Rollouts** to the canary ring with `AnalysisTemplate` reading Prometheus — auto-abort on SLO breach.
- Add Azure DevOps Environments + approvals as an alternative gate; compare with GH Environments.
- Implement **progressive delivery** at the prod ring: 1% → 10% → 50% → 100% with weighted routes.

## Cleanup
None — we'll exploit the running rings in Modules 06–08.
