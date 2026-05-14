# Module 03 — MVP Go-Live

**Duration:** 150 min  |  **Level target:** L300 (L400 stretch on supply-chain)  |  **Day:** 1

**Success criterion this satisfies:** #1 — *Take an MVP from napkin to live customer.*

## Outcomes
- Build & push the three app images to ACR
- Bootstrap Argo CD and onboard the storefront via app-of-apps
- Watch traffic flow through Front Door → Istio gateway → `api-node` v1
- Hit your first live request as "a customer"

## Whiteboard prompts (5 min)
1. Why is the app **not** deployed by Terraform? What boundary does that draw?
2. The image tag is the unit of truth for "what is running where". What happens if a tag is moved (`v1` repointed)?
3. If Argo CD sync fails, where do you look first?

## Step 1 — Build & push the three images
From the repo root, with `ACR_LOGIN_SERVER` exported (output of Terraform):
```bash
export ACR=$(terraform -chdir=infra/terraform/envs/pod-01 output -raw acr_login_server)
az acr login --name ${ACR%%.*}

for app in api-node web-react worker-python; do
  docker build --build-arg APP_VERSION=v1 -t $ACR/$app:v1 apps/$app
  docker push $ACR/$app:v1
done
```

Then update the base manifests' image references — easiest is to set them per-environment in your fork:
```bash
# Edit k8s/overlays/dev/kustomization.yaml: replace ghcr.io/REPLACE with $ACR and dev-latest with v1
# Commit and push to main of your fork.
```

> **[F]** This is the moment to introduce **`kustomize edit set image`** so participants don't hand-edit YAML.

## Step 2 — Bootstrap Argo CD
```bash
az aks command invoke -g $RG -n $AKS --command "kubectl create namespace argocd"
az aks command invoke -g $RG -n $AKS --command "
  kubectl apply -n argocd \
    -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.12.4/manifests/install.yaml
"
```
Wait for `argocd-server` to be Ready. Then apply the project and root Application:
```bash
# From a workstation that can reach the cluster (Bastion or 'az aks command invoke'):
kubectl apply -f gitops/projects/storefront.yaml
kubectl apply -f gitops/apps/root.yaml
```

## Step 3 — Watch the rings come up
```bash
kubectl -n argocd get applications -w
```
You should see `ring-dev` and `ring-canary` sync; `ring-prod` will be in `OutOfSync` (manual sync — by design).

```bash
kubectl -n app-dev get pods,svc
kubectl -n app-canary get pods,svc
```

## Step 4 — Expose the app
The base manifests include an Istio `Gateway` bound to the external ingress gateway. Find the public IP and hit it:
```bash
IP=$(kubectl -n aks-istio-system get svc aks-istio-ingressgateway-external -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl -s http://$IP/api/products | jq
curl -s http://$IP/ | head -n 5
```

The Front Door endpoint (output of Terraform) routes the same path globally; use it from a browser to see the storefront UI rendered.

## Step 5 — Smoke test from the customer perspective
```bash
FD=$(terraform output -raw front_door_endpoint)
hey -z 30s -c 20 $FD/api/products    # 30s, 20 concurrent
```
Open Grafana → **Kubernetes / Compute Resources / Namespace (Workloads)** dashboard. You should see `api-node` requests, latency p95, and CPU climb.

## Validation
- `curl $FD/api/products` returns 200 with `version: v1`
- Argo CD UI shows `ring-dev`, `ring-canary`, `ring-prod` all syncing or healthy
- Grafana dashboards have non-zero metrics from your cluster
- The web UI renders products and shows `v1` pill

## Stretch (L400)
- Enable **ACR Tasks** to build the image on push to `main` instead of building locally.
- Sign images with **notation** + **AKV-signed certificate**, and enforce signed-only via Ratify.
- Add an Istio `AuthorizationPolicy` so only the ingress gateway can call `api-node` (deny pod-to-pod from outside the mesh).

## Cleanup
None — Day 2 builds directly on this.
