# Argo CD bootstrap

Run **after** the cluster is up (Module 03) and before the GitOps lab steps.

Install the [Microsoft Argo CD cluster extension](https://learn.microsoft.com/azure/azure-arc/kubernetes/tutorial-use-gitops-argocd#create-gitops-argo-cd-extension-simple-installation), then apply the project and root application:

```bash
az extension add --name k8s-extension
az provider register --namespace Microsoft.KubernetesConfiguration --wait
az k8s-extension create \
	--resource-group "$RG" \
	--cluster-name "$AKS" \
	--cluster-type managedClusters \
	--name argocd \
	--extension-type Microsoft.ArgoCD \
	--config "redis-ha.enabled=false"
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
