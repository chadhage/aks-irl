# Module 03 — MVP Go-Live

**Time:** ~2 hr wall-clock (most of it is image builds + first sync)  |  **Level target:** L300

**Success criterion this satisfies:** #1 — *Replatform the legacy socket workload into an MVP running on AKS.*

## 1. Outcomes

By the end you will have:

- Built and pushed `gateway-java:v1`, `parser-cpp:v1`, `ops-console:v1` to your ACR
- Bootstrapped Argo CD on the primary cluster and onboarded the messaging app-of-apps
- A live TCP socket accepting framed messages on the external NLB
- The ops console rendering live session telemetry from the gateway
- Performed the first end-to-end smoke test (`scripts/smoke.sh tcp ... 4561 50`)

## 2. Where this fits in the replatform story

This is the **first time the new platform takes real traffic**. The legacy stack is still in place; this is the parallel run. Everything afterward (A/B, rings, chaos, optimization) iterates on what comes alive in this module.

## 3. Level target

- **L300:** Build, push, GitOps sync, smoke test passes.
- **L400:** Add ACR Tasks to build on `git push`, sign images with notation + AKV, enforce signed-only via Ratify.

## 4. Talk track *(trainer)*

Three things that distinguish this MVP from a "first AKS deploy" tutorial:

1. **No HTTP load balancer in the data path.** The gateway sits behind a TCP Standard Load Balancer with a 30-minute idle timeout. Front Door is only for the ops console — it would *break* socket affinity if it were in front of the gateway.
2. **`gateway-java` is a StatefulSet.** Each Pod gets a stable identity and ordinal. The NLB uses source-IP affinity so client endpoints land on the same Pod after a reconnect when possible.
3. **PostgreSQL is *outside* the cluster.** Azure DB for PostgreSQL — Flexible Server, zone-redundant HA, Entra-auth. We do not run state in the cluster for an MVP this critical.

## 5. Demo cues *(trainer)*

- Build and push **one** image (`gateway-java:v1`) live on the projector so the room sees the tag and digest format.
- Show the Argo CD UI **before** sync (`OutOfSync`) and then click sync — the visual reinforces what "GitOps" actually does.
- After sync, run `ncat <NLB_IP> 4561` from your own laptop, type `PING<enter>`, and show the `PONG` come back.

## 6. Participant steps

### 6.1 Build and push the three images
```bash
ACR=$(terraform -chdir=infra/terraform/envs/lab output -raw acr_login_server)
az acr login --name ${ACR%%.*}

for app in gateway-java parser-cpp ops-console; do
  docker build --build-arg APP_VERSION=v1 -t $ACR/$app:v1 apps/$app
  docker push $ACR/$app:v1
done
```

### 6.2 Pin image refs in your fork
Edit `k8s/overlays/dev/kustomization.yaml`, `canary/kustomization.yaml`, `prod/kustomization.yaml`:
- Replace every `REPLACE_ACR` with `$ACR`
- For dev/canary/prod, set the `newTag` to `v1` for first install
- Replace `REPLACE` in `gitops/apps/*.yaml` and `gitops/projects/messaging.yaml` with your GitHub `<owner>/<repo>`

Commit and push.

### 6.3 Bootstrap Argo CD
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
```
This follows the [Microsoft Learn GitOps with Argo CD tutorial](https://learn.microsoft.com/azure/azure-arc/kubernetes/tutorial-use-gitops-argocd#create-gitops-argo-cd-extension-simple-installation). Wait for `argocd-server` Ready. Then:
```bash
az aks command invoke -g $RG -n $AKS --command "kubectl apply -f /gitops/projects/messaging.yaml" --file gitops/projects/messaging.yaml
az aks command invoke -g $RG -n $AKS --command "kubectl apply -f /gitops/apps/root.yaml" --file gitops/apps/root.yaml
```

### 6.4 Watch the rings come up
```bash
az aks command invoke -g $RG -n $AKS --command "kubectl -n argocd get applications -w"
```
`ring-dev` and `ring-canary` should reach **Synced + Healthy**; `ring-prod` stays `OutOfSync` (manual sync — by design).

### 6.5 Get the NLB IP and smoke test
```bash
NLB=$(az aks command invoke -g $RG -n $AKS --command "
  kubectl -n messaging-canary get svc gateway-java-tcp -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
" --query logs -o tsv)
echo "NLB=$NLB"

./scripts/smoke.sh tcp $NLB 4561 50
```

### 6.6 Browse the ops console
```bash
FD=$(terraform -chdir=infra/terraform/envs/lab output -raw front_door_endpoint)
open $FD     # macOS / xdg-open / start
```
Refresh — you should see the session count tick up as you re-run the smoke test.

## 7. Validation

- `./scripts/smoke.sh tcp $NLB 4561 50` reports `50/50 sessions established, 0 dropped, P99 RTT < 250 ms`.
- Ops console at the Front Door URL renders and shows non-zero `Active sockets`.
- `kubectl -n messaging-canary get sts gateway-java` shows all replicas Ready.
- Argo CD UI: `ring-dev` and `ring-canary` Synced+Healthy; `ring-prod` OutOfSync (intentional).

## 8. Stretch (L400)

- Enable **ACR Tasks** so an image gets built and pushed on every commit to `apps/<svc>/`.
- Sign images with `notation` + an AKV-signed certificate; enforce signed-only with **Ratify** in the cluster.
- Add an Istio `AuthorizationPolicy` that denies parser calls from anything other than the gateway SA.
- Replace the demo HTTP `/decode` call between gateway and parser with mTLS gRPC for L400 realism.

## 9. Cleanup

None — Modules 04–07 build directly on this.
