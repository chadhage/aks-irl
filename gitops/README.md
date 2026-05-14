# GitOps — Argo CD app-of-apps

This directory is **owned by Argo CD**, which is bootstrapped in [Module 03](../modules/03-mvp-go-live/README.md).

## Layout

```
gitops/
├── bootstrap/             # one-time install of Argo CD itself
│   └── argocd-install.yaml
├── apps/                  # the "app of apps"
│   ├── root.yaml          # the parent Argo CD Application
│   ├── ring-dev.yaml
│   ├── ring-canary.yaml
│   └── ring-prod.yaml
└── projects/
    └── storefront.yaml
```

## How rings are gated

| Ring | Trigger | Auto-sync | Approval |
|---|---|---|---|
| dev | Push to `main` of app repo | ✅ Auto | None |
| canary | GH Action bumps `k8s/overlays/canary/kustomization.yaml` (image tag) | ✅ Auto | None |
| prod | GH Action proposes PR bumping `k8s/overlays/prod/kustomization.yaml` | ⛔ Manual sync | PR approval **+** Argo sync |

Module 05 walks through wiring the GitHub Action that opens the prod PR and the Argo CD sync window.
