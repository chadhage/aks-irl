# Argo CD bootstrap

Run **after** the cluster is up (Module 03) and before the GitOps lab steps.

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.12.4/manifests/install.yaml
kubectl apply -f ../projects/messaging.yaml
kubectl apply -f ../apps/root.yaml
```

Within a minute you should see `ring-dev` and `ring-canary` syncing, with `ring-prod` waiting for manual sync.

Access the Argo CD UI through a port-forward (the cluster API is private, so this hops through your tunnel / `az aks command invoke`):

```bash
kubectl -n argocd port-forward svc/argocd-server 8080:443
# user: admin
# initial password:
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```
