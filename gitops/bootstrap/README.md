# Argo CD bootstrap

Run **after** the cluster is up (Module 03) and before the GitOps lab.

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.12.4/manifests/install.yaml
kubectl apply -f ../projects/storefront.yaml
kubectl apply -f ../apps/root.yaml
```

Wait for Argo CD to reconcile the root Application — within a minute you should see `ring-dev` and `ring-canary` syncing, `ring-prod` waiting for manual sync.

Access the UI via port-forward (the cluster API is private, so this hops through the user's tunnel):
```bash
kubectl -n argocd port-forward svc/argocd-server 8080:443
# user: admin
# initial password:
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```
