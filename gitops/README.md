# GitOps — Argo CD app-of-apps

This directory is **owned by Argo CD**, which is bootstrapped in [Module 03](../modules/03-mvp-go-live/README.md).

## Layout

```
gitops/
├── bootstrap/             # one-time install of Argo CD itself
│   └── README.md
├── apps/                  # the "app of apps"
│   ├── root.yaml          # the parent Argo CD Application
│   ├── ring-dev.yaml
│   ├── ring-canary.yaml
│   └── ring-prod.yaml
└── projects/
    └── messaging.yaml     # AppProject named "messaging"
```

## Namespaces per ring

| Ring | Namespace |
|---|---|
| dev | `messaging-dev` |
| canary | `messaging-canary` |
| prod | `messaging-prod` |

## How rings are gated

| Ring | Trigger | Auto-sync | Approval |
|---|---|---|---|
| dev | Push to `main` | ✅ Auto | None |
| canary | GH Action bumps `k8s/overlays/canary/kustomization.yaml` (image tag) | ✅ Auto | None — but socket-soak smoke test runs and must pass |
| prod | GH Action opens PR bumping `k8s/overlays/prod/kustomization.yaml` | ⛔ Manual sync | PR approval (GitHub Environments) **+** Argo sync |

Module 05 walks through wiring the GitHub Action that opens the prod PR and the Argo CD manual sync window.
