# Module 05 — Deployment Rings & Gated Promotion

**Time:** ~80 min  |  **Level target:** L300

**Success criterion this satisfies:** #3 — *Promote changes through dev → canary → prod with gates and rollback.*

## 1. Outcomes

You can:

- Push a change and watch it flow through dev → canary automatically
- See a GitHub Action open a **prod-promotion PR** after canary smoke passes
- Approve the prod PR through a GitHub Environments protection rule
- **Manually sync** `ring-prod` in Argo CD (auto-sync intentionally disabled)
- Roll back two ways — Argo CD UI and Git revert — and know when to use each

## 2. Where this fits in the replatform story

The customer cannot release like the old days (RPM swap on a Friday with a one-page change ticket). Regulators want every change traceable to a PR, an approver, and a one-click revert. The ring layout in this repo is the artifact they take into their CAB.

## 3. Level target

- **L300:** Promote one real change end-to-end; rollback at least once.
- **L400:** Wire an SLO-aware gate that blocks the prod PR if canary error budget burn is > 2× expected.

## 4. Talk track *(trainer)*

Three points:
1. **Auto-sync stops at the canary boundary.** This is not a tooling limitation — it's a deliberate seam where a human reads the canary signal.
2. **The image tag in `kustomization.yaml` is the unit of truth.** Argo reconciles to whatever tag is in Git. If you "fixed it with `kubectl edit`", Argo will undo you within 90 s.
3. **Rollback is a deploy.** Treat it like one. The faster path is usually the Argo UI rollback; the audit-friendly path is a Git revert PR. You should be fluent in both.

## 5. Demo cues *(trainer)*

- Drive the PR-bump live: change a comment in `apps/parser-cpp/parser.cpp`, push, then click through the GH Actions tab as the build → push → canary-sync → smoke → prod-PR-open flow runs.
- Then perform a rollback via the Argo UI. Show that Git is now "ahead" of the cluster and explain when to revert vs when to roll forward.

## 6. Participant steps

### 6.1 Make a real change
Edit `apps/parser-cpp/parser.cpp` (e.g., add a comment), commit, push to `main`. Or bump `apps/gateway-java/pom.xml` minor version.

### 6.2 Watch CI build + push
GitHub Actions builds, scans (Trivy), pushes `:sha-<short>`.

### 6.3 Watch canary bump + sync
CI **auto-bumps** `k8s/overlays/canary/kustomization.yaml` to the new tag. Argo CD picks it up within a minute. Watch:
```bash
az aks command invoke -g $RG -n $AKS --command \
  "kubectl -n argocd get application ring-canary -o jsonpath='{.status.sync.status}{\"\\t\"}{.status.health.status}{\"\\n\"}'"
```

### 6.4 CI runs the socket-soak smoke test
The action runs `./scripts/smoke.sh tcp <canary-nlb-ip> 4561 200 --duration 60s`. If it passes, the action opens a PR titled `prod: bump to sha-<short>`.

### 6.5 Approve the prod PR
GitHub Environments protection rule requires your review. Approve and merge.

### 6.6 Manually sync ring-prod
Open the Argo CD UI → `ring-prod` → click **Sync**. Confirm.

### 6.7 Practice both rollbacks
- **Argo UI rollback** — `ring-prod` → History and Rollback → pick prior revision. Fast (~30 s).
- **Git revert PR** — `gh pr create` reverting the bump. Auditable (~3–5 min round trip).

Record your times in your ADR.

## 7. Validation

- A real PR flowed dev → canary → prod with a real approval.
- You rolled back at least once and observed Pods rejoining at the prior version.
- `gateway-java` socket count did **not** drop to zero during the prod promotion (StatefulSet rolling update + PDB).

## 8. Stretch (L400)

- Add a GH Action gate that queries Managed Prometheus for canary error-budget burn rate and blocks the prod PR if > 2×.
- Wire **Argo Rollouts** with a `BlueGreen` strategy for `ops-console` (HTTP-easy) and discuss why you wouldn't use it for `gateway-java`.
- Add `gh deployment status` calls so the GitHub Deployments page becomes the source of truth for "who is in prod right now".

## 9. Cleanup

Leave both v1 and the new tag in prod for Module 06 — chaos scenarios use both.
