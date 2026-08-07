# Participant Activity Guide — WorkshopPlus

> A short-form companion to [LAB-GUIDE.md](LAB-GUIDE.md). The same workshop, but sliced into **10–20 minute activities**. Each activity is bracketed by a **pre-check** (to measure where you are) and a **post-check** (to prove the knowledge lift landed).

## How to use this guide

For every activity:

1. **Pre-check (2 min).** Answer the questions in your head or in a notebook. Be honest about *Confident / Fuzzy / No idea*. This is your baseline.
2. **Do the activity.** Complete only one numbered step at a time. Do not start the next step until you have completed its confirmation gate.
3. **Post-check (2 min).** Answer again. If you cannot now say "Confident" on every post-check question, flag it to the TA before the room moves on.
4. **Mark done** in the checklist at the bottom.

Time estimates assume the trainer has already framed the module. If you are working solo, double them.

The apps under [`apps/`](apps/) are **mocks** — see [LAB-GUIDE.md § The apps in this repo are mocks](LAB-GUIDE.md#the-apps-in-this-repo-are-mocks). The point is the architecture and operational moves, not the application logic.

### Mandatory confirmation protocol

Every numbered lab step uses this loop:

1. Perform **only that step**.
2. Compare the result with the **Confirm** statement immediately below it.
3. Record the requested evidence in your workshop notes or evidence folder.
4. Say or write **`CONFIRMED`**. If working in a cohort, show the evidence to your partner. If working solo, check the box yourself.
5. Continue only after the confirmation passes. If it does not pass, stop and use the troubleshooting section or ask the TA. Do not compensate by skipping ahead.

Use this evidence marker throughout the guide:

```text
[ ] CONFIRMED — <what you observed>
```

Steps marked **CHANGE GATE** alter shared Azure, GitOps, DNS, database, or production state. A partner or trainer must confirm the stated preconditions before you run the command. Steps marked **RECOVERY GATE** must pass before the activity is complete, even when the failure injection appeared to work.

---

## Phase 0 — Setup (before Day 1)

### Activity 0.1 — Prerequisite tooling and preflight (~15 min)

**Pre-check**

- What does `kubectl` talk to in an AKS cluster, and what writes its kubeconfig entry on a workstation?
- Why is the supported `kubectl` client/server version skew capped at ±1 minor?
- What is the difference between `az login` (auth) and `az account set --subscription` (context), and where is each stored on disk?

**Do**

1. Walk every item in [prerequisites.md](prerequisites.md).
2. Run `./scripts/preflight.sh`.
3. If any line is `[FAIL]`, fix it before continuing.

**Validation** — every line of preflight output is `[PASS]`.

**Post-check**

- Why is pinning the `kubectl` minor version to the AKS server minor a real operational rule, not a nice-to-have?
- Which `az` command merges a fresh AKS kubeconfig into an existing one without clobbering other contexts?
- What kubeconfig field uniquely identifies *which* AKS cluster a context points at?

---

### Activity 0.2 — Fork, clone, log in, read the scenario (~15 min)

**Pre-check**

- Define GitOps as a deployment model on Kubernetes in one sentence.
- Why is "cluster pulls from Git" generally preferred over "CI pushes to cluster" for AKS?
- What does a long-lived TCP connection change about pod rollouts compared with a stateless HTTP API?

**Do**

1. Fork this repo on GitHub. Clone the fork locally.
2. `az login` and confirm `az account show` returns your **lab** subscription.
3. Read [SCENARIO.md](SCENARIO.md) end to end.

**Validation** — `az aks list -o table` runs without error and your local clone points at *your* fork's remote.

**Post-check**

- Name two AKS-native ways to install a GitOps controller without doing it by hand.
- What is the failure mode if the cluster's GitOps controller loses Git reachability for an hour — does the workload stop?
- What does the cluster's RBAC need to look like so a single Git push cannot delete a production namespace?

---

### Activity 0.3 — Reconstruct the legacy-to-AKS request path (~15 min)

**Pre-check**

- Where does a client TCP connection terminate in the legacy system and in the AKS target?
- Which target component is deliberately outside the TCP data path?
- Which state can be recreated and which state must be replicated?

**Do**

1. Without looking at the target diagram, draw the legacy path from client to gateway, parser, and PostgreSQL. **Confirm:** mark every network and process boundary. `[ ] CONFIRMED`
2. Draw the target path using the Azure and Kubernetes components named in [SCENARIO.md](SCENARIO.md). **Confirm:** Front Door appears only on the HTTP console path, not the raw TCP path. `[ ] CONFIRMED`
3. Add one failure marker for a pod, node, zone, and region. **Confirm:** each marker names the later workshop activity that tests it. `[ ] CONFIRMED — 4/4 failure domains]`
4. Compare your drawing with the README target architecture. **Confirm:** correct any missing trust, TLS, or persistence boundary in a different color. `[ ] CONFIRMED`

**Validation** — your diagram traces one client message end to end and maps all four failure domains to M06 or M07.

**Post-check**

- Why does separating socket state from parser compute reduce disruption?
- Why can Front Door protect the console but not carry this raw TCP protocol?
- Which component determines RPO during a regional event?

---

## Phase 1 — Plan and provision

### Activity M00.1 — Walk the Day-0 decisions (~15 min)

**Pre-check**

- What is a Day-0 decision and how does it differ from Day-1 and Day-2?
- Name three AKS architectural choices that are extremely expensive to reverse after a cluster is in production.
- What is the difference between AKS Automatic and AKS Standard in terms of which Day-0 knobs you still own?

**Do**

1. Open [modules/00-envisioning/README.md](modules/00-envisioning/README.md). **Confirm:** you can locate all 9 Day-0 questions. `[ ] CONFIRMED`
2. Read question 1 and write your preferred choice plus one rejected alternative. **Confirm:** your choice includes one sentence about cost, risk, or reversibility. `[ ] CONFIRMED`
3. Repeat step 2 for questions 2–9, one question at a time. Do not move to the next question until your partner can restate your reason. `[ ] CONFIRMED — 9/9 decisions discussed]`
4. Pick the decision you are least certain about and defend it aloud without reading your notes. **Confirm:** your partner can name the tradeoff you accepted. `[ ] CONFIRMED`

**Validation** — you can point to each of the 9 questions and state which way the cohort is leaning.

**Post-check**

- Which AKS networking choice is essentially irreversible once nodes exist: kubenet vs. Azure CNI, Overlay vs. Pod Subnet, or all three?
- Why is API-server visibility (public vs. private) effectively a Day-0 decision on AKS today?
- Name one Day-0 decision that *is* cheap to change later and explain why.

---

### Activity M00.2 — Pin the SLO and error budget (~15 min)

**Pre-check**

- Define SLI, SLO, and SLA in one line each.
- What does a 30-day error budget let an SRE team *do* that a hard SLA does not?
- Which Kubernetes signal is closer to a customer-facing SLI: pod readiness, Service success rate, or Ingress 2xx ratio?

**Do**

1. With the cohort, pin one **latency SLO** (e.g., P99 socket RTT < 250 ms over 30 days).
2. Pin one **availability SLO** (session-success rate).
3. Convert each SLO to a 30-day error budget in minutes or events.
4. Write all three numbers into your ADR draft.

**Validation** — your ADR has three numbers: latency target, availability target, derived error budget.

**Post-check**

- An SLO of 99.9% over 30 days allows roughly how many minutes of unavailability?
- Why is pod CPU utilization not, by itself, a customer-facing SLI?
- When an error budget burns 50% in the first week, what is the standard SRE response?

---

### Activity M00.3 — Author and commit ADR-001 (~15 min)

**Pre-check**

- What four sections does a well-formed Architecture Decision Record contain?
- Why is "Rejected alternatives" the section that ages best?
- What is the difference between an ADR and a design document?

**Do**

1. Copy [`adr-template.md`](modules/00-envisioning/adr-template.md) to `modules/00-envisioning/adr-001-aks-platform.md`.
2. Fill in **Decision**, **Rationale**, and **Rejected alternatives** for each of the 9 Day-0 questions.
3. Commit and push.

**Validation** — your ADR is committed on a branch in your fork; every Day-0 question has a rejected alternative.

**Post-check**

- An ADR says "Use Azure CNI Overlay." Two years later you want Cilium dataplane. What do you do with the original ADR?
- Why do ADRs typically live in the repo rather than a wiki?
- What signals that an ADR has been superseded rather than just edited?

---

### Activity M01.1 — Bootstrap the Terraform state backend (~15 min)

**Pre-check**

- Why does any IaC tool need remote state for a team workflow?
- Which Azure primitives are typically used to back a Terraform state file?
- What is the bootstrapping "chicken and egg" problem for IaC state on Azure?

**Do**

1. `cd infra/terraform/bootstrap/`.
2. `terraform init && terraform apply` — this creates the storage account + container for state.
3. Note the output values; you will reference them in `terraform.tfvars`.

**Validation** — `az storage account list -o table` shows the new state account; container exists.

**Post-check**

- What lock mechanism prevents two concurrent applies against a blob-backed state?
- If the storage account holding state is deleted, what is the recovery path?
- Why is the bootstrap state file itself usually kept local and out of remote state?

---

### Activity M01.2 — GitHub OIDC + federated credential + repo secrets (~15 min)

**Pre-check**

- What does OIDC federation give you that a long-lived service-principal client secret does not?
- What is the GitHub Actions federated-credential subject format for a workflow running on `main`?
- Why is the GitHub-to-Entra trust scoped per repo *and* per ref instead of just per repo?

**Do**

1. Create the Entra app + service principal for CI.
2. Add a **federated credential** with subject `repo:<owner>/<repo>:ref:refs/heads/main`.
3. Grant the SP `Contributor` on the lab subscription and `AcrPush` on the ACR (once it exists; you can add this after M01.4).
4. Add three repo secrets: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`.

**Validation** — `gh secret list` shows the three secrets; the federated credential is visible in the Entra portal.

**Post-check**

- Why is there no `AZURE_CLIENT_SECRET` in an OIDC-based GitHub Actions setup?
- If a developer opens a PR from a fork, does OIDC succeed? Why or why not?
- What is the Entra error code when a federated-credential subject does not match the incoming token?

---

### Activity M01.3 — Fill `terraform.tfvars` and `plan` (~15 min)

**Pre-check**

- What is the difference between `terraform plan` and `terraform apply --auto-approve`?
- Why pin AKS `kubernetes_version` in IaC rather than tracking latest?
- What does `local_account_disabled = true` on AKS actually disable, and what replaces it?

**Do**

1. `cp infra/terraform/envs/lab/terraform.tfvars.example terraform.tfvars`.
2. Fill in subscription ID, region, name prefix, Postgres zone, etc.
3. `terraform init && terraform plan -out tfplan`.
4. Skim the plan: counts of resources, anything marked **destroy**.

**Validation** — `terraform plan` exits 0 with no destroys; the resource count is in the expected range.

**Post-check**

- With `local_account_disabled = true`, which command stops working and which Azure mechanism replaces it?
- Name one AKS Terraform default that is *not* production-safe out of the box.
- If you re-run `plan` immediately after a clean apply, what should the diff be and why?

---

### Activity M01.4 — Apply and verify outputs (~20 min)

**Pre-check**

- Which Azure resources typically have to exist *before* the AKS resource itself can be created?
- If `terraform apply` fails halfway through an AKS create, is state corrupt? What is your next move?
- Why does AKS provisioning routinely take 15–25 minutes wall-clock?

**Do**

1. `terraform apply tfplan`. Walk away — this takes ~25 min wall-clock; use the time to listen to the trainer cover M02 concepts.
2. When it returns, run `terraform output` and capture: AKS name, ACR login server, Key Vault URI, Postgres FQDN, Front Door endpoint, messaging NLB IP.

**Validation** — apply exits 0; every output is non-empty.

**Post-check**

- Which AKS output is required to configure Workload Identity on a workload?
- If a `LoadBalancer` Service stays in `<pending>` after apply, what is the most likely AKS-side cause?
- Which RBAC roles do you grant a human to use the cluster when `local_account_disabled = true`?

---

### Activity M01.5 — Prove the Terraform and GitOps ownership boundary (~10 min)

**Pre-check**

- Which tool owns Azure resources and which tool owns in-cluster workloads in this workshop?
- What failure occurs when two reconcilers own the same field?
- Should Terraform apply application Deployments in this design?

**Do**

1. Run `terraform state list` from the lab environment. **Confirm:** classify three Azure resources as platform-owned. `[ ] CONFIRMED`
2. Run `kubectl kustomize k8s/overlays/dev` and list the rendered Kubernetes kinds. **Confirm:** classify three objects as GitOps-owned. `[ ] CONFIRMED`
3. Search Terraform for `kubernetes_` resources and GitOps for Azure resource definitions. **Confirm:** record any ownership overlap; the expected core path has none. `[ ] CONFIRMED`
4. Write one sentence defining the ownership rule in your ADR. **Confirm:** your partner can use it to decide where a new resource belongs. `[ ] CONFIRMED`

**Validation** — your notes contain two owner lists and one unambiguous boundary rule.

**Post-check**

- Where should an AKS node pool change live?
- Where should a parser replica-count change live?
- Why is “Terraform creates the cluster; GitOps configures workloads” operationally useful?

---

### Activity M02.1 — Reach the private API server (~15 min)

**Pre-check**

- Why is the AKS API server commonly made private in production?
- What does `az aks command invoke` actually do, and where does the command run?
- Name two alternatives for reaching a private AKS API server from outside the VNet.

**Do**

1. `az aks command invoke -g <rg> -n <aks> --command "kubectl get nodes -o wide"`.
2. Confirm 3 nodes, spread across 3 zones.
3. Optional: run [`scripts/connect-private-aks.sh`](scripts/connect-private-aks.sh) to set up local `kubectl` via Entra.

**Validation** — `get nodes` returns 3 `Ready` nodes in zones `1`, `2`, `3`.

**Post-check**

- What identity authenticates an `az aks command invoke` call to the API server?
- What happens if you run `kubectl get nodes` directly from a workstation outside the VNet against a private cluster?
- For a zonal AKS cluster, what is the minimum number of zones to survive a single-zone outage?

---

### Activity M02.2 — Create UAMI and federate the gateway service account (~15 min)

**Pre-check**

- What is AKS Workload Identity and how does it differ from the deprecated AAD Pod Identity?
- What does a federated-credential subject look like for a Kubernetes ServiceAccount?
- Why pick a User-Assigned Managed Identity over a System-Assigned MI for an application workload?

**Do**

1. `az identity create -g <rg> -n gateway-java-uami`.
2. Add a federated credential with subject `system:serviceaccount:messaging:gateway-java` and issuer = AKS OIDC issuer URL.

**Validation** — `az identity federated-credential list --identity-name gateway-java-uami -g <rg>` shows the SA subject.

**Post-check**

- Why must the target namespace and ServiceAccount exist (or be planned) for federation to function at runtime?
- If you misspell the ServiceAccount name in the subject by one character, what symptom does the pod show?
- What projected token does Kubernetes mount into the pod that Entra actually validates?

---

### Activity M02.3 — Grant KV + Postgres access; verify Istio + federation (~15 min)

**Pre-check**

- Which Azure RBAC role grants a workload identity read-only access to Key Vault secrets under RBAC mode?
- How does a managed identity authenticate to Azure Database for PostgreSQL Flexible Server without a password?
- What is the AKS Istio add-on and how do you opt a namespace into a specific revision (e.g., `asm-1-23`)?

**Do**

1. Grant the UAMI `Key Vault Secrets User` on the lab Key Vault. **Confirm:** `az role assignment list --assignee <uami-client-id> --scope <key-vault-id> -o table` shows the role. `[ ] CONFIRMED`
2. Create or grant the scenario's least-privilege Postgres role to the UAMI. **Confirm:** the role exists; do not continue with only the Entra token test. `[ ] CONFIRMED`
3. Run `kubectl -n aks-istio-system get pods`. **Confirm:** every Istio control-plane pod is `Running` and ready. `[ ] CONFIRMED`
4. Launch a throwaway pod with the federated ServiceAccount and run `az login --identity`. **Confirm:** the returned identity matches the UAMI client ID. `[ ] CONFIRMED`
5. From that same pod, request a token for `https://ossrdbms-aad.database.windows.net` and use it as the password for a read-only `psql` connection. **Confirm:** `select current_user;` returns the expected workload database role and no password was stored in Kubernetes. `[ ] CONFIRMED`

**Validation** — Istio is healthy, the pod receives the intended UAMI, and a token-authenticated Postgres query succeeds.

**Post-check**

- Trace the chain of trust: pod → AKS OIDC issuer → Entra → UAMI → Azure resource. Where is each step verified?
- If a pod returns `AADSTS70021`, what is the typical fix?
- Why don't AKS add-on namespaces like `aks-istio-system` typically need Workload Identity themselves?

---

### Activity M02.4 — Prove a Key Vault CSI secret mount (~15 min)

**Pre-check**

- What does the Secrets Store CSI Driver mount into a pod?
- Which identity retrieves the value from Key Vault?
- Why should the secret value never be pasted into workshop evidence?

**Do**

1. Inspect the `SecretProviderClass` used by the gateway. **Confirm:** record the Key Vault name, tenant setting, and object names, but not object values. `[ ] CONFIRMED`
2. Inspect the gateway ServiceAccount and pod template annotations. **Confirm:** the configured client ID matches the UAMI from M02.2. `[ ] CONFIRMED`
3. Start or inspect a gateway pod using that class. **Confirm:** the pod reaches `Ready` and the CSI volume is mounted at the expected path. `[ ] CONFIRMED`
4. List filenames and permissions in the mount without printing file contents. **Confirm:** expected filenames exist and are not world-readable. `[ ] CONFIRMED`
5. Review CSI provider events and logs. **Confirm:** there are no authorization or object-not-found errors. `[ ] CONFIRMED`

**Validation** — the pod has a healthy CSI mount obtained through Workload Identity, with no secret value exposed in notes or terminal output.

**Post-check**

- What would fail if `Key Vault Secrets User` were removed?
- Why is a mounted CSI value different from a Kubernetes Secret synced into etcd?
- How would rotation reach a long-running application?

---

## Phase 2 — Ship the MVP

### Activity M03.1 — Build and push `gateway-java:v1` (~15 min)

**Pre-check**

- Why use `az acr build` over local `docker build && docker push` in a CI context?
- What does an image *tag* commit you to operationally, vs. an image *digest*?
- Why does the AKS kubelet need a separate identity with `AcrPull` on the registry?

**Do**

1. `az acr login -n <acr>`.
2. `az acr build -r <acr> -t gateway-java:v1 apps/gateway-java/`.

**Validation** — `az acr repository show-tags -n <acr> --repository gateway-java` lists `v1`.

**Post-check**

- How does the cluster pull an image by digest vs. by tag, and which is more deterministic?
- Where in a CI pipeline does CVE scanning typically sit — pre-push, post-push, or both?
- If a pod stays `ImagePullBackOff`, what are the two most common AKS-side root causes?

---

### Activity M03.2 — Build and push `parser-cpp:v1` and `ops-console:v1` (~15 min)

**Pre-check**

- Why split a workload into multiple container images rather than a single monolithic image?
- What are the operational benefits of containerizing even a static site on Kubernetes?
- What is the difference between a Deployment, a StatefulSet, and a DaemonSet?

**Do**

1. `az acr build -r <acr> -t parser-cpp:v1 apps/parser-cpp/`.
2. `az acr build -r <acr> -t ops-console:v1 apps/ops-console/`.

**Validation** — both tags appear in `az acr repository list -n <acr>`.

**Post-check**

- When is the smaller, separately-shippable component worth the cost of one extra in-cluster hop?
- Name two reasons containerizing a static site is worthwhile even though nginx alone could serve it.
- When does a Job or CronJob fit better than a Deployment for a workload?

---

### Activity M03.3 — Bootstrap Argo CD on the primary cluster (~15 min)

**Pre-check**

- How does Argo CD differ from Flux at a glance?
- What is the App-of-Apps pattern and why is it useful?
- Where do Argo CD's own initial admin credentials live, and how should that secret be rotated?

**Do**

1. `kubectl apply -k gitops/bootstrap` (via `az aks command invoke`).
2. Wait for `argocd-server` to become Ready.
3. Retrieve the initial admin password from the `argocd-initial-admin-secret` Secret.
4. Apply the root app: `kubectl apply -f gitops/apps/root.yaml`.

**Validation** — `kubectl -n argocd get pods` shows all pods `Running`; `kubectl -n argocd get applications` shows the root app.

**Post-check**

- If Argo cannot reach the upstream Git repo for 30 minutes, what happens to the running workload?
- Why does the root App live in Git too, rather than being a one-shot bootstrap?
- What is the blast radius if the `argocd-server` service account is compromised, and how would you scope it down?

---

### Activity M03.4 — Replace `REPLACE` placeholders and commit (~15 min)

**Pre-check**

- What is the difference between a Kustomize base and an overlay?
- When do you prefer Kustomize, Helm, or raw YAML for AKS manifests?
- Which manifest fields tend to be environment-specific vs. tenant-specific?

**Do**

1. Run `grep -rn REPLACE k8s gitops` and save the output. **Confirm:** you know the file and purpose of every match. `[ ] CONFIRMED`
2. Replace only the ACR login server values. **Confirm:** every image reference begins with your ACR login server. `[ ] CONFIRMED`
3. Replace only the UAMI client ID values. **Confirm:** the value matches `az identity show --query clientId -o tsv`. `[ ] CONFIRMED`
4. Replace only the Postgres FQDN values. **Confirm:** the value matches the Terraform output and contains no username or password. `[ ] CONFIRMED`
5. Replace the Git repository owner, repository URL, and remaining environment-specific values. **Confirm:** Argo points to your fork and the intended branch. `[ ] CONFIRMED`
6. Run `grep -rn REPLACE k8s gitops`. **Confirm:** it returns no matches. `[ ] CONFIRMED`
7. Render each overlay with `kubectl kustomize k8s/overlays/<name>` for `dev`, `canary`, and `prod`. **Confirm:** all three commands exit successfully. `[ ] CONFIRMED — 3/3 overlays]`
8. Commit on a branch and push. **Confirm:** `git status --short` is clean and the branch exists in your fork. `[ ] CONFIRMED`

**Validation** — no placeholders remain, all three overlays render, and the branch is pushed.

**Post-check**

- Why is a simple `grep` over manifests sometimes a higher-signal gate than a YAML schema linter?
- Name two long-term-better solutions than string placeholders for parameterizing K8s manifests.
- What category of placeholder, if left in, causes the most confusing *runtime* failure rather than a sync failure?

---

### Activity M03.5 — Watch Argo sync `ring-dev` and `ring-canary` (~15 min)

**Pre-check**

- What does Argo's `OutOfSync` state mean technically?
- What is the difference between Argo `Synced` and `Healthy`?
- When is auto-sync acceptable and when is manual sync the right answer?

**Do**

1. `kubectl -n argocd get applications -w` (via `command invoke`).
2. Wait until `ring-dev` and `ring-canary` are both **Synced + Healthy**.
3. Confirm `ring-prod` is **OutOfSync** and untouched.

**Validation** — exactly two of three ring apps are Synced+Healthy; `ring-prod` is OutOfSync.

**Post-check**

- A pod is `Running` but its Argo app is `Degraded`. Which Kubernetes signals can drive that state?
- Why is manual sync the most common production posture?
- How would you add an approval gate to an environment that is currently on auto-sync?

---

### Activity M03.6 — First socket: smoke test TCP traffic (~15 min)

**Pre-check**

- What is unusual about a long-lived TCP socket workload on Kubernetes compared with stateless HTTP?
- Which Kubernetes Service type provisions an Azure Load Balancer for TCP traffic, and what does `externalTrafficPolicy` change?
- What is the default Azure Load Balancer idle timeout, and why does it matter for sockets?

**Do**

1. `NLB_IP=$(terraform output -raw messaging_nlb_ip)`.
2. `./scripts/smoke.sh tcp $NLB_IP 4561 50`.
3. Re-run with `--duration 60s` to hold sockets open and watch metrics.

**Validation** — output says `50/50 sessions, 0 dropped, P99 RTT < 250 ms`.

**Post-check**

- A session drops at exactly 30 minutes against an AKS `LoadBalancer` Service. What is the most likely cause?
- Why does it matter whether TLS terminates at the LB, at the cluster ingress, or at the pod?
- Name two AKS-side controls (PDB, `terminationGracePeriodSeconds`, `preStop`, surge, etc.) that reduce socket churn during rollouts.

---

### Activity M03.7 — Ops console and trace a message end to end (~15 min)

**Pre-check**

- What are the roles of Azure Front Door, Application Gateway, and Azure Load Balancer when fronting AKS?
- At which layers can TLS terminate on the way to a pod?
- What is the difference between a Service and an Ingress (or Gateway API) in Kubernetes?

**Do**

1. Open the ops console URL from `terraform output front_door_endpoint`.
2. Run smoke in another terminal; watch the session count climb in real time.
3. Draw the path of a message from client socket to Postgres row.

**Validation** — ops console shows live sessions changing as smoke runs; you can verbally trace a message end to end.

**Post-check**

- For an HTTPS path through Front Door → AKS Ingress → pod, how many TLS terminations are possible and what determines that?
- Where does data become durable in a typical Kubernetes architecture — pod, node, or an external service?
- Why is a stateless front tier preferred even when the *protocol* (sockets) is stateful?

🎉 **Success #1 — MVP live.** Mark module M03 done in the checklist.

---

### Activity M03.8 — Prove gateway and parser failure isolation (~15 min)

**Pre-check**

- Which component owns long-lived client connections?
- What should remain healthy if parser compute becomes unavailable?
- Which user-visible operation should fail while parsing is unavailable?

**Do**

1. Start sustained sockets against the **dev** ring and record active connections plus message success. **Confirm:** both are at baseline. `[ ] CONFIRMED`
2. **CHANGE GATE:** scale only the dev `parser-cpp` Deployment to zero using a temporary, non-Git change. **Confirm:** gateway pods and active socket metrics remain present. `[ ] CONFIRMED`
3. Send a parse-dependent message. **Confirm:** message processing fails or retries while the TCP connection remains established; record both signals. `[ ] CONFIRMED`
4. **RECOVERY GATE:** restore parser replicas by syncing the dev Argo application. **Confirm:** message success returns and Git remains the desired-state source. `[ ] CONFIRMED`

**Validation** — you captured evidence that parser failure affects message processing without terminating the gateway process or its existing sockets.

**Post-check**

- What coupling would cause parser failure to drop every socket?
- Why is the temporary scale reverted through Argo rather than another imperative command?
- Which retry limit prevents a parser outage from becoming an unbounded queue?

---

### Activity M03.9 — Verify the graceful-drain contract (~15 min)

**Pre-check**

- In what order do readiness removal, `preStop`, `SIGTERM`, and grace-period expiry occur?
- Why is a PDB not a socket-draining mechanism?
- What should `/readyz` return after drain begins?

**Do**

1. Inspect the gateway pod lifecycle, readiness probe, PDB, and `terminationGracePeriodSeconds`. **Confirm:** record each configured value. `[ ] CONFIRMED`
2. Inspect the gateway readiness implementation. **Confirm:** identify the exact state transition that changes `/readyz` from success to failure during drain. `[ ] CONFIRMED`
3. Trace `preStop` `/drain` → `GatewayMain.beginDrain()` → `GatewayMain.awaitDrained()` and compare the 110-second drain timeout with the 120-second pod grace period. **Confirm:** the grace period exceeds the application drain timeout. `[ ] CONFIRMED`
4. Start sustained sockets in dev, then delete one gateway pod normally. **Confirm:** the pod becomes not-ready before process exit and displaced clients reconnect within the target. `[ ] CONFIRMED`
5. Wait for the replacement pod and a stable 60-second baseline. **Confirm:** save readiness and socket evidence. `[ ] CONFIRMED`

**Validation** — evidence shows traffic removal before process exit, bounded reconnection, and complete recovery.

**Post-check**

- What breaks if readiness remains successful during `preStop`?
- What breaks if the grace period is shorter than the drain timeout?
- Which part must be implemented in application code rather than only YAML?

---

## Phase 3 — Extend and harden

### Activity M04.1 — Build and push `parser-cpp:v2` (~15 min)

**Pre-check**

- Why introduce a behavioral change as a new major tag (`v2`) instead of overwriting `v1`?
- What does "image immutability" mean at the registry level, and how do you enforce it on ACR?
- If a `v2` image exists in the registry but no Kubernetes resource references it, what is the production blast radius?

**Do**

1. Inspect the v2 source diff in `apps/parser-cpp/` (per module README).
2. `az acr build -r <acr> -t parser-cpp:v2 apps/parser-cpp/`.

**Validation** — `parser-cpp:v2` tag exists in ACR.

**Post-check**

- What breaks for already-running pods if a registry allows mutable tags and you retag `v2` over `v1`?
- Why is immutability typically enforced at the registry rather than at the cluster?
- What OCI labels or annotations would make later A/B analysis easier (commit SHA, build ID, semver)?

---

### Activity M04.2 — Deploy v2 alongside v1 (~15 min)

**Pre-check**

- Why is it a best practice to deploy a new version *first* and shift traffic to it *second*?
- Which Kubernetes/Istio labels are used to distinguish service subsets for routing?
- How many Deployments will run when v1 and v2 coexist before any routing change?

**Do**

1. Add a second Deployment (or DestinationRule subset) for `parser-cpp:v2` in `k8s/base/parser-cpp.yaml` (or overlay).
2. Commit, push, let Argo sync.

**Validation** — `kubectl -n messaging-canary get pods -l app=parser-cpp` shows both versions Running; no traffic to v2 yet.

**Post-check**

- Why is "deployed but receiving no traffic" a feature, not a bug, at this stage?
- What is the division of responsibility between Istio `DestinationRule` subsets and `VirtualService` routes?
- Could you achieve the same outcome with two Kubernetes Services and Ingress weighting? What capabilities do you lose?

---

### Activity M04.3 — Weighted 90/10 split (~15 min)

**Pre-check**

- Which Istio resource field controls traffic weight between subsets?
- What is the smallest weight increment Istio supports?
- Does weighted splitting apply per request or per connection — and why does it matter for L7 vs. L4?

**Do**

1. Edit the `VirtualService` to route 90% to v1 subset, 10% to v2.
2. Commit, push, sync.
3. Run a synthetic loop and check parser-version distribution:

   ```bash
   ./scripts/smoke.sh tcp $NLB_IP 4561 50 --duration 10s --json-output evidence/parser-split.json
   ```

**Validation** — observed split is approximately 45/5 across 50 calls (Istio is statistical, not deterministic).

**Post-check**

- You see a 50/0 split instead of the configured 45/5. List three possible causes (sidecar, DR, endpoint readiness).
- Why does Istio's weighted routing not enforce *exact* per-window splits?
- How would you make routing sticky per session ID rather than per request?

---

### Activity M04.4 — Header-based cohort routing (~15 min)

**Pre-check**

- What is the Istio `VirtualService` `match` syntax for a request header?
- Why is header-based routing more powerful than weighted routing for a beta cohort?
- At which OSI layer does an Istio HTTP match operate, and why does that matter?

**Do**

1. Change the `VirtualService` to: `x-cohort: beta` → v2 subset; default → v1.
2. Commit, push, sync.
3. Verify with `curl -H "x-cohort: beta" <internal-service>` from a debug pod.

**Validation** — beta header routes to v2 deterministically; absence routes to v1.

**Post-check**

- Sketch an Istio `match` block that routes requests whose path matches a regex to a specific subset.
- Why does L7 header routing not apply to raw TCP traffic that the mesh proxies as `tcp` rather than `http`?
- How would you implement subset selection at the L4 boundary (SNI, source IP, mTLS principal)?

---

### Activity M04.5 — Grafana split + kill-switch drill (~15 min)

**Pre-check**

- Which Prometheus label conventionally distinguishes service versions in service-mesh metrics?
- What is a realistic kill-switch latency target — 30 s, 5 min, or an hour?
- Where does a kill switch usually live: in config, in code, or in routing? Argue for one.

**Do**

1. Open Grafana; find the parser P99 panel split by `parser_version`.
2. Predict v2 P99 before peeking.
3. **Drill**: revert `VirtualService` to 100% v1. Time the change-to-effect window.

**Validation** — you executed the revert and v2's panel goes to zero traffic in under 30 s.

**Post-check**

- A GitOps controller polls every 3 min. How can a kill switch beat that interval?
- What is the difference between killing *traffic* and killing *pods* during an incident?
- Should a kill switch require a PR or be a single click in a UI? Argue both sides.

🎉 **Success #2 — A/B parser tested.**

---

### Activity M05.1 — Open a trivial PR (~10 min)

**Pre-check**

- What is trunk-based development and what does it assume about PR size?
- Which branch protection rules typically gate trunk in a healthy repo?
- Why don't developers bump image tags themselves in a trunk-based GitOps flow?

**Do**

1. Edit a constant, a log line, or a comment in `apps/parser-cpp/parser.cpp` (or wherever the trainer indicates).
2. Open a PR against `main`.

**Validation** — PR is open; required CI checks are queued.

**Post-check**

- Why is small-PR culture critical for short mean-time-to-recovery?
- Which branch protection rule should fire even on a "trivial" PR — required reviews, status checks, signed commits?
- Who reviews trivial PRs in a high-trust team — bots, humans, or both?

---

### Activity M05.2 — CI builds, scans, and pushes `:sha-<short>` (~15 min)

**Pre-check**

- Why tag images with the git SHA rather than `latest`?
- What does a CVE scanner gate contribute to a CI pipeline?
- Where is an image's provenance typically recorded today (SLSA attestations, OCI referrers, signed metadata)?

**Do**

1. Watch the GitHub Actions run from your PR.
2. Open the build job; confirm `az acr build -t parser-cpp:sha-<7-chars>`.
3. Open the scan job; confirm a clean (or known-policy-allowed) result.

**Validation** — green check on PR; new SHA tag visible in ACR.

**Post-check**

- A High CVE is found in a base image. What should the pipeline do, and what should it *not* do?
- Why does provenance still matter even when you trust the developer?
- How can you cache layered builds (Docker, Buildx, ACR) to cut CI time meaningfully?

---

### Activity M05.3 — Auto-bump canary kustomization (~15 min)

**Pre-check**

- In GitOps, what file does CI typically rewrite to bump an image tag?
- Why does the bump happen in CI rather than from a developer laptop?
- What commit author should an auto-bump commit use, and why?

**Do**

1. Confirm a follow-up CI job committed a tag bump to `k8s/overlays/canary/kustomization.yaml`.
2. Watch `kubectl -n argocd get applications` until `ring-canary` is Synced+Healthy on the new SHA.

**Validation** — canary pods show the new image tag; Argo app is Synced+Healthy.

**Post-check**

- Why does an auto-bump commit usually carry a `[skip ci]` marker or equivalent?
- What happens if two PRs merge within 30 seconds of each other into the same overlay?
- How is a Kustomize tag bump different from a Helm chart version bump in an App-of-Apps setup?

---

### Activity M05.4 — Socket-soak + open the prod-bump PR (~15 min)

**Pre-check**

- What is a soak test and how is it different from a smoke test?
- What signals does a soak test typically watch (latency tail, error rate, leak indicators)?
- Why does the soak open a PR instead of pushing directly to prod?

**Do**

1. Open the workflow run and wait for the socket-soak job to finish. **Confirm:** `gh run view <run-id> --json conclusion --jq .conclusion` returns `success`. `[ ] CONFIRMED`
2. Inspect the soak evidence. **Confirm:** socket success, P99 latency, and parser error rate each meet the SLO; record all three values. `[ ] CONFIRMED`
3. Verify the prod-bump PR was created only after steps 1–2 passed. **Confirm:** the PR changes only the intended production image reference and includes the soak evidence. `[ ] CONFIRMED`

**Validation** — the soak passed, three SLO values are recorded, and the narrowly scoped prod-bump PR is awaiting approval.

**Post-check**

- Name two soak-failure signatures that should *not* auto-open the prod PR.
- Should the prod-bump PR be a draft or ready-for-review by default? Argue both sides.
- What information must the PR description carry so the approver can make a real decision?

---

### Activity M05.5 — Approve and manually sync prod (~15 min)

**Pre-check**

- What is a GitHub Environment protection rule and what can it enforce?
- Why is manual GitOps sync the most common posture for production AKS workloads?
- Who in a real organization typically has authority to trigger a production sync?

**Do**

1. Open the prod-bump PR; approve and merge (Environment protection requires the reviewer role).
2. In the Argo UI, **manually sync** `ring-prod`.
3. Watch pods roll.

**Validation** — `kubectl -n messaging-prod get pods -l app=parser-cpp -o jsonpath='{.items[*].spec.containers[*].image}'` shows the new SHA.

**Post-check**

- The PR merged but the controller did not sync. What does that say about which side is the source of truth?
- What is the audit trail for *who* triggered a sync — in Argo, in Flux, in `kubectl apply`?
- Why is "manual sync, automated everything else" the typical production posture?

---

### Activity M05.6 — Practice both rollbacks (~15 min)

**Pre-check**

- Name the two primary rollback mechanisms available in a GitOps stack.
- Which rollback path is faster, and which is more auditable?
- After a UI-only rollback, what does Git say is the desired state, and what is the risk?

**Do**

1. **Rollback A — Argo UI**: select the previous Sync revision, roll back. Time it.
2. **Rollback B — Git revert PR**: open a revert PR, merge, sync. Time it.
3. Note both numbers.

**Validation** — prod is back to v1; you have two timing numbers.

**Post-check**

- The controller rolled prod back to v1, but Git still says v2. What is the next action and why?
- Which rollback is the right *first move* in a real incident? Which is the right *follow-up*?
- How would you make a Git-revert path as fast as a UI rollback in practice?

🎉 **Success #3 — Rings + gated promotion.**

---

## Phase 4 — Survive outages

### Activity M06.1 — Set up your three observability panes (~15 min)

**Pre-check**

- For a production incident, what are the minimum three observability surfaces a war room needs?
- What is "session success" and how is it different from pod readiness?
- Where do you observe at the socket layer, not just the Kubernetes layer?

**Do**

1. Pane 1: Grafana dashboard showing session success and parser RTT P99.
2. Pane 2: `kubectl -n messaging-prod get pods -w` (via `command invoke`).
3. Pane 3: a sustained socket generator: `./scripts/smoke.sh tcp $NLB_IP 4561 200 --duration 600s`.

**Validation** — all three panes are streaming; baseline is steady-state for at least 60 seconds before you break anything.

**Post-check**

- What does a steady-state baseline buy you before chaos starts?
- If you could keep only one of the three panes, which would it be and why?
- What is still missing from these three panes for a real war room (dependency health, customer view)?

---

### Activity M06.2 — Scenario A baseline: parser pod kill loop with PDB intact (~15 min)

**Pre-check**

- What does a `PodDisruptionBudget` actually prevent — and what does it *not* prevent?
- What is the default behavior of an Istio sidecar on a connection refusal — retry, fail fast, or circuit-break?
- What should P99 latency do during a controlled rolling pod kill on a properly configured workload?

**Do**

1. Run `kubectl -n messaging-prod get pdb parser-cpp`. **Confirm:** `ALLOWED DISRUPTIONS` is at least `1` and the baseline has been steady for 60 seconds. `[ ] CONFIRMED`
2. Record the name of one ready parser pod, then delete only that pod with `--wait=false`. **Confirm:** a replacement becomes ready and P99 remains under the SLO. `[ ] CONFIRMED — kill 1/3]`
3. Repeat step 2 for a second pod. Do not use a loop. **Confirm:** session success still meets the SLO. `[ ] CONFIRMED — kill 2/3]`
4. Repeat step 2 once more. **Confirm:** all parser replicas recover and all three observability panes are still updating. `[ ] CONFIRMED — kill 3/3]`

**Validation** — session success stays at SLO; P99 RTT shows micro-bumps but stays under target.

**Post-check**

- Why did P99 not spike in a healthy setup?
- What actually protected the request — the PDB, the retries, or both?
- What changes if the workload only has a single replica?

---

### Activity M06.3 — Scenario A failure: break the PDB, then restore it (~15 min)

**Pre-check**

- What does `minAvailable: 0` (or no PDB at all) tell the scheduler?
- What is the difference between voluntary and involuntary disruption in Kubernetes?
- Does deleting a PDB change pod-kill behavior, or only `kubectl drain` behavior?

**Do**

1. **CHANGE GATE:** show your partner that baseline traffic is healthy and the Git manifest still contains the parser PDB. `[ ] CONFIRMED`
2. Run `kubectl -n messaging-prod delete pdb parser-cpp`. **Confirm:** `kubectl get pdb parser-cpp` returns `NotFound`. `[ ] CONFIRMED`
3. Delete one parser pod at a time until the agreed failure signal appears. After each deletion, stop and record session success and P99. `[ ] CONFIRMED — failure observed]`
4. **RECOVERY GATE:** re-sync `ring-prod` from Git. **Confirm:** `kubectl -n messaging-prod get pdb parser-cpp` shows the expected `minAvailable` and an allowed disruption. `[ ] CONFIRMED`
5. Wait for the original SLO to hold for 60 seconds. **Confirm:** all parser replicas are ready before continuing. `[ ] CONFIRMED`

**Validation** — SLO broke when PDB was gone; SLO recovers after the PDB is restored.

**Post-check**

- Why is operator-initiated drain classified as a *voluntary* disruption?
- To survive *node* failure (not just pod kill), what do you need beyond a PDB?
- How long did your SLO take to recover after the PDB was restored, and is that acceptable for your SLO?

---

### Activity M06.4 — Scenario B: bad parser rollout and fast rollback (~15 min)

**Pre-check**

- What counts as a "bad rollout" — crash loop, slow start, wrong business logic, or all of those?
- What is a realistic target rollback time for a critical service?
- Which rollback mechanism (UI vs. Git revert) is the right *first* move in an incident?

**Do**

1. Push `parser-cpp:bad` to ACR (or use a pre-built tag from the trainer). **Confirm:** the tag exists and you have recorded the last known-good Git revision. `[ ] CONFIRMED`
2. **CHANGE GATE:** ask the trainer to confirm that this is the isolated lab production ring and that the previous Argo revision is available. `[ ] CONFIRMED`
3. Change only the production parser tag to `:bad`, commit, push, and sync. **Confirm:** Argo reports the new revision before you start the timer. `[ ] CONFIRMED`
4. When parser errors exceed 10% or the agreed SLO threshold, record the timestamp and begin rollback. `[ ] CONFIRMED — rollback timer started]`
5. Roll back via Argo UI to the previous revision. **Confirm:** the last known-good image is running and the SLO is healthy for 60 seconds. `[ ] CONFIRMED — rollback timer stopped]`
6. **RECOVERY GATE:** revert the bad Git commit with a normal revert commit and push it. Do not force-push shared history. **Confirm:** Git and Argo show the same desired revision. `[ ] CONFIRMED`

**Validation** — rollback completes in under 2 minutes; record the actual.

**Post-check**

- What signal told you "roll back now" instead of "wait and see"?
- What is the right *post-incident* action: revert PR, or leave the UI rollback in place?
- How would a progressive delivery tool (Flagger, Argo Rollouts) have prevented this in the first place?

---

### Activity M06.5 — Scenario C: zone drain (~20 min)

**Pre-check**

- What does `kubectl drain` actually do, step by step?
- Why does a zone-failure test matter especially for stateful or socket workloads?
- What is a "reconnect storm" and why is it dangerous to surviving zones?

**Do**

1. Inspect [`chaos/zone-failure-experiment.bicep`](chaos/zone-failure-experiment.bicep). **Confirm:** name the target zone, namespace, duration, and recovery action to your partner. `[ ] CONFIRMED`
2. **CHANGE GATE:** verify ready gateway pods exist in at least two other zones and surviving capacity can carry the test load. `[ ] CONFIRMED`
3. Trigger the experiment for one zone. **Confirm:** only the intended zone is affected. `[ ] CONFIRMED`
4. Measure reconnects. **Confirm:** at least 99% of displaced sockets reconnect within 30 seconds; record the actual. `[ ] CONFIRMED`
5. **RECOVERY GATE:** cancel or complete the experiment. **Confirm:** gateway pods return to the expected zone spread and the SLO is stable for 60 seconds. `[ ] CONFIRMED`

**Validation** — ≥99% of sockets reconnect within 30 s; SLO holds within 60 s of impact.

**Post-check**

- Which AKS construct ensures pods land in multiple zones in the first place — node-pool zones, topology spread constraints, or both?
- What is the second-order failure if your surviving zones are at exactly 100% of normal capacity when one zone drops out?
- How would you simulate a zone failure on AKS without an Azure Chaos experiment (cordon + drain, taints, NSG isolation)?

---

### Activity M06.6 — Screenshots and one incident write-up (~15 min)

**Pre-check**

- What is the difference between a postmortem and a "war story"?
- Name three sections of a good blameless postmortem.
- Why do screenshots from dashboards belong in the write-up?

**Do**

1. Take one Grafana screenshot per scenario (A, B, C).
2. Commit a short incident write-up under a path the trainer dictates.

**Validation** — write-up committed; three screenshots attached.

**Post-check**

- Which action item from your write-up would you take to production this quarter?
- Who is the real audience for the document — your team, your VP, or an auditor?
- What detail did you almost leave out that turned out to matter?

🎉 **Success #4 — Intrinsic outage survived.**

---

### Activity M07.1 — Bootstrap Argo on the secondary cluster (~15 min)

**Pre-check**

- Why deploy a second GitOps controller on the secondary cluster rather than a single one reaching both?
- What is the cost difference between active-active and active-passive AKS topologies?
- Where should the secondary controller's Git URL point, and on which branch?

**Do**

1. Same bootstrap as M03.3, against the secondary AKS via `command invoke`.
2. Apply the root app; let it sync `ring-prod` only.

**Validation** — `kubectl -n argocd get applications` on the secondary shows `ring-prod` Synced+Healthy with no live traffic.

**Post-check**

- Why is it acceptable for the secondary to be Synced + Healthy yet idle?
- What still costs money on the secondary cluster even when it carries zero traffic?
- What is the tradeoff between warm-standby and cold-standby for a regional DR posture?

---

### Activity M07.2 — Verify Postgres geo-replica lag (~10 min)

**Pre-check**

- Define RPO in plain English.
- Where does Azure Database for PostgreSQL Flexible Server expose replication lag?
- What is "acceptable" replica lag for a financial workload vs. a logging workload?

**Do**

1. Query the primary's replication slots / replica status (per module README).
2. Confirm lag is under 5 s.

**Validation** — `pg_replication_slots.confirmed_flush_lsn` is current to within seconds of the primary.

**Post-check**

- What network event would spike replica lag, and how would you detect it from Azure Monitor?
- If lag is 60 s at failover time, what happens to that 60 s of data?
- How does streaming replication differ from snapshot-based DR for RPO?

---

### Activity M07.3 — Sustained socket load on primary (~10 min)

**Pre-check**

- Why hold sockets open during failover practice rather than running a one-shot smoke?
- What is the difference between a session *drop* and a session *reconnect*?
- What client behavior does a synthetic socket generator typically simulate (backoff, retry, fail-fast)?

**Do**

1. `./scripts/smoke.sh tcp $PRIMARY_NLB_IP 4561 200 --duration 1800s &`.
2. Confirm a stable baseline in Grafana for 60 s before triggering failover.

**Validation** — 200 sockets open, 0 drops, baseline RTT steady.

**Post-check**

- Why not measure failover as smoke-then-failover-then-smoke?
- What in a metrics/telemetry pipeline could miscount reconnects as brand-new sessions?
- How would 2000 sustained sockets behave differently from 200 during failover?

---

### Activity M07.4 — Surgical failover: DNS swap + promote replica (~15 min)

**Pre-check**

- Why is DNS, rather than BGP/anycast, the typical switching mechanism for regional failover?
- What bounds RTO when DNS is the switch — record TTL plus what else?
- What does "promote replica" actually do at the Postgres level, and why is it not reversible?

**Do**

1. **CHANGE GATE:** have a partner or trainer verify all four preconditions: secondary Argo is `Synced` + `Healthy`, secondary gateway pods are ready, Postgres lag is under 5 seconds, and the socket baseline has been steady for 60 seconds. `[ ] CONFIRMED — 4/4 preconditions]`
2. Read and record the current DNS A record and TTL. **Confirm:** it points to the primary NLB and TTL is 30 seconds. `[ ] CONFIRMED`
3. Recheck Postgres lag immediately before promotion. If it is 5 seconds or more, stop. **Confirm:** record the observed lag and timestamp. `[ ] CONFIRMED`
4. Quiesce new journal writes using the trainer-provided application control, then wait for replica lag to reach the agreed threshold. **Confirm:** no new primary writes are accepted. `[ ] CONFIRMED`
5. Promote the Postgres geo-replica in the secondary region. **Confirm:** the secondary accepts a test write and the former primary is not accepting application writes. `[ ] CONFIRMED`
6. Swap the messaging DNS A record from the primary NLB to the secondary NLB and start the RTO timer. **Confirm:** a fresh DNS lookup returns the secondary address. `[ ] CONFIRMED`
7. Watch all three panes until at least 99% of sockets have reconnected. **Confirm:** stop the timer and record the timestamp. `[ ] CONFIRMED`

**Validation** — sockets reconnect to the secondary within DNS TTL + client retry window; new writes succeed against the promoted replica.

**Post-check**

- Why is "promote replica" not reversible the way a DNS swap is?
- Which order is safer: DNS-then-promote, or promote-then-DNS, and why?
- What is split-brain in this stack, and what prevents it during a clean failover?

---

### Activity M07.5 — Measure and record RTO and RPO (~15 min)

**Pre-check**

- Define RTO vs. RPO in one sentence each.
- For a socket workload, what does "time to recover" mean — first reconnect, 99% reconnect, or steady-state?
- Where do you read the actual achieved RPO from in a Postgres-backed system?

**Do**

1. From smoke timestamps + Postgres LSN, compute:
   - Socket-reconnect RTO (time from DNS swap to 99% reconnect).
   - Data-loss RPO (lag at the moment of promotion).
2. Commit numbers to your incident write-up.

**Validation** — two numbers recorded with units and methodology.

**Post-check**

- Your RTO is 90 s but P99 RTT stays elevated for 4 minutes after recovery. Why does that gap exist?
- What is the smallest single change you could make to halve RTO?
- Which of the two numbers does the business care about more, and why?

---

### Activity M07.6 — Recover to primary without flooding it (~15 min)

**Pre-check**

- Why is failback usually riskier than failover?
- What is a "thundering herd," and which step in a failback typically causes one?
- During failback, should data flow secondary → primary, or should you start fresh?

**Do**

1. **CHANGE GATE:** confirm the secondary has served healthy traffic for at least 5 minutes and you have a tested rollback point. `[ ] CONFIRMED`
2. Re-establish replication from the active secondary to the recovering primary. **Confirm:** replication reports healthy in the correct direction. `[ ] CONFIRMED`
3. Wait for lag to fall below 5 seconds and remain there for 60 seconds. **Confirm:** record the lag and timestamp. `[ ] CONFIRMED`
4. Pre-scale the primary gateway to the pre-failover replica count. **Confirm:** all primary gateway pods are ready before traffic moves. `[ ] CONFIRMED`
5. Quiesce writes, let lag converge, and promote the primary back to read-write. **Confirm:** a test write succeeds on primary and the secondary is no longer accepting application writes. `[ ] CONFIRMED`
6. Swap DNS back to primary. **Confirm:** a fresh lookup returns the primary address and sockets reconnect without exceeding the SLO. `[ ] CONFIRMED`
7. **RECOVERY GATE:** verify one writable Postgres server, healthy replication posture, expected gateway zone spread, and a stable 60-second traffic baseline. `[ ] CONFIRMED — 4/4 recovery checks]`

**Validation** — no split-brain in Postgres; no socket avalanche on the primary; SLO holds throughout.

**Post-check**

- What would happen if you swapped DNS back *before* replication lag converged?
- What single Azure feature (Front Door priority, Traffic Manager, Cross-Region LB) would have made this drill trivial?
- How often should a real team practice failover in production?

🎉 **Success #5 — Extrinsic outage survived.**

---

## Phase 5 — Optimize and assess

### Activity M08.1 — Enable spot pool; move parser batch to it (~15 min)

**Pre-check**

- What is an Azure Spot node, and what is the eviction model on AKS?
- Which workload shapes are good spot candidates, and which are not?
- What `toleration` + `nodeSelector`/`nodeAffinity` combination targets an AKS spot pool?

**Do**

1. Run a Terraform plan with the spot-pool variable enabled. **Confirm:** the plan adds a spot user pool and does not replace the cluster or a gateway node pool. `[ ] CONFIRMED`
2. **CHANGE GATE:** show the plan to your partner or trainer, then apply it. **Confirm:** the new node pool reports `Succeeded`. `[ ] CONFIRMED`
3. Inspect the new node label `kubernetes.azure.com/scalesetpriority`. **Confirm:** at least one ready node has value `spot`. `[ ] CONFIRMED`
4. Create or update only the separate `parser-cpp-batch` Deployment with the spot toleration and node selector. **Confirm:** the live `parser-cpp` serving Deployment remains unchanged. `[ ] CONFIRMED`
5. Apply or sync the batch Deployment. **Confirm:** its pods land on spot nodes and the synchronous parser pods remain on regular nodes. `[ ] CONFIRMED`

**Validation** — `kubectl -n messaging-prod get pods -o wide` shows batch pods on spot nodes.

**Post-check**

- What happens to a batch pod when its spot node is evicted? What about a stateful pod?
- What is a reasonable `terminationGracePeriodSeconds` for a workload that processes one message at a time?
- What ballpark percentage do spot pools typically save vs. on-demand, and what governs that number?

---

### Activity M08.2 — KEDA scale-to-zero for parser (~15 min)

**Pre-check**

- What is KEDA, and how does it differ from the standard Horizontal Pod Autoscaler?
- Which signals can KEDA scale on that HPA alone cannot?
- What is the cold-start cost of scaling a pod from 0 → 1, and what drives it?

**Do**

1. Install KEDA, or inspect the existing installation. **Confirm:** the operator and metrics API server deployments are available before creating a `ScaledObject`. `[ ] CONFIRMED`
2. Run the proposed Prometheus query directly. **Confirm:** it returns a numeric value for the target namespace; do not continue with an empty query result. `[ ] CONFIRMED`
3. Apply the `ScaledObject` to the retry-safe parser workload selected by the trainer. **Confirm:** `kubectl describe scaledobject` reports `Ready=True` and `Active` has a value. `[ ] CONFIRMED`
4. Stop test traffic and wait through the cooldown period. **Confirm:** the target reaches zero replicas. `[ ] CONFIRMED`
5. Start one controlled traffic burst. **Confirm:** the target scales above zero and serves requests within the cold-start SLO. `[ ] CONFIRMED`
6. Stop traffic again. **Confirm:** the workload returns to zero and no gateway sockets are disrupted. `[ ] CONFIRMED`

**Validation** — parser pods go to 0 with no traffic; come back online within the SLO when smoke resumes.

**Post-check**

- A burst arrives while you are at 0 replicas. What governs time-to-first-response?
- Why is scale-to-zero a poor fit for a long-lived TCP gateway?
- Name a metric that would *not* make a good KEDA trigger here, and explain why.

---

### Activity M08.3 — Right-size gateway-java requests without churning sockets (~20 min)

**Pre-check**

- What is the difference between `resources.requests` and `resources.limits` on a pod?
- Why is right-sizing requests usually more important than tightening limits?
- Why is a normal rolling restart dangerous for a long-lived TCP workload?

**Do**

1. From Grafana, record `gateway-java` P95 CPU and memory over the last hour. **Confirm:** the range includes sustained workshop load rather than an idle hour. `[ ] CONFIRMED`
2. Calculate proposed requests as the observed P95 plus the cohort's safety margin. **Confirm:** record the old value, P95, margin, and proposed value with units. `[ ] CONFIRMED`
3. Inspect the gateway lifecycle, readiness endpoint, PDB, and termination grace. **Confirm:** readiness changes to not-ready during drain and the grace period exceeds the intended drain time. If either condition is false, stop and complete the drain-readiness exercise in the module before rollout. `[ ] CONFIRMED`
4. Update only the gateway requests and render the production overlay. **Confirm:** the diff contains the intended CPU and memory changes only. `[ ] CONFIRMED`
5. **CHANGE GATE:** start sustained socket load and record the baseline connection count, then commit and sync. `[ ] CONFIRMED`
6. Observe each StatefulSet pod replacement. **Confirm:** each old pod becomes not-ready before exit, its replacement becomes ready, and active sockets do not fall below the agreed threshold. `[ ] CONFIRMED — all replicas rolled]`
7. **RECOVERY GATE:** verify the new requests on every gateway pod and a stable 60-second SLO window. `[ ] CONFIRMED`

**Validation** — baseline session count holds throughout the rollout; new pods have new requests; no spike in reconnect.

**Post-check**

- What is a `preStop` hook actually doing for a TCP workload during pod termination?
- Why does a stateful rollout differ from a normal HTTP service rollout (`maxSurge`, `maxUnavailable`, drain)?
- What is the smallest change to a Deployment spec that would silently drop sockets during rollout?

🎉 **Success #6 — Right-sized without socket churn.**

---

### Activity Final.1 — Take the knowledge check (~20 min)

**Pre-check**

- Name the AKS Day-0 decisions that are effectively irreversible once nodes exist.
- For each AKS topic area (identity, GitOps, mesh, chaos, DR, cost), name the single AKS-native control or feature you would mention first.
- What is the difference between an SLO and a hard SLA?

**Do**

1. Open [assessment/knowledge-check.md](assessment/knowledge-check.md).
2. Read [`assessment/rubric.md`](assessment/rubric.md) **before** you start writing.
3. Answer Sections A–E in `assessment/submissions/answers.md`. Section F is bonus.

**Validation** — file committed and pushed to your fork.

**Post-check**

- Which AKS topic area felt weakest as you answered — networking, identity, GitOps, autoscaling, DR?
- Which AKS question would you add to the assessment that is not currently there?
- Which AKS concept did you internalize during the lab that you could not have explained beforehand?

---

### Activity Final.2 — Self-grade with the rubric (~15 min)

**Pre-check**

- For Kubernetes mastery, what does Level 300 vs. Level 400 typically look like in practice?
- Why does a rubric ask for evidence rather than just a numeric score?
- For an AKS platform engineer, what one skill correlates most with seniority?

**Do**

1. Re-open [`assessment/rubric.md`](assessment/rubric.md).
2. Score each of your answers honestly.
3. Note the gap between where you are and where you want to be.

**Validation** — every section has a self-score with one-line justification.

**Post-check**

- What is your single biggest AKS knowledge gap right now, and what is the smallest first step to close it?
- Which Day-0 AKS decision do you understand differently now than you did at the start?
- Which AKS concept moved your proficiency the most, and why?

🎉 **Success #7 — Calibrated self-rating.**

---

## Definition of done — track yourself

```
Phase 0 — Setup
[ ] 0.1  Prereqs + preflight green
[ ] 0.2  Fork + clone + scenario read

Phase 1 — Plan and provision
[ ] M00.1  Day-0 decisions walked
[ ] M00.2  SLO + error budget pinned
[ ] M00.3  ADR-001 committed
[ ] M01.1  TF state backend up
[ ] M01.2  OIDC + federated cred + secrets
[ ] M01.3  tfvars + plan clean
[ ] M01.4  apply succeeded + outputs captured
[ ] M02.1  Reached private API server
[ ] M02.2  UAMI + SA federation
[ ] M02.3  KV + Postgres granted, Istio healthy

Phase 2 — MVP
[ ] M03.1  gateway-java:v1 pushed
[ ] M03.2  parser-cpp:v1 + ops-console:v1 pushed
[ ] M03.3  Argo bootstrapped
[ ] M03.4  Placeholders replaced
[ ] M03.5  dev + canary Synced+Healthy
[ ] M03.6  Smoke 50/50 PASS
[ ] M03.7  Ops console + end-to-end trace

Phase 3 — Extend
[ ] M04.1  parser-cpp:v2 pushed
[ ] M04.2  v2 deployed alongside v1
[ ] M04.3  Weighted 90/10 split working
[ ] M04.4  Header-based cohort routing working
[ ] M04.5  Grafana split + kill-switch drill
[ ] M05.1  Trivial PR opened
[ ] M05.2  CI build + scan + push
[ ] M05.3  Canary auto-bumped + synced
[ ] M05.4  Soak + prod-bump PR
[ ] M05.5  Approve + manual prod sync
[ ] M05.6  Both rollback drills done

Phase 4 — Outages
[ ] M06.1  Three panes live
[ ] M06.2  PDB-intact baseline
[ ] M06.3  PDB-broken + restored
[ ] M06.4  Bad rollout + < 2 min rollback
[ ] M06.5  Zone drain + ≥99% reconnect
[ ] M06.6  Incident write-up + screenshots
[ ] M07.1  Secondary Argo bootstrapped
[ ] M07.2  Postgres lag verified
[ ] M07.3  Sustained load on primary
[ ] M07.4  DNS swap + replica promoted
[ ] M07.5  RTO + RPO numbers recorded
[ ] M07.6  Failback clean, no split-brain

Phase 5 — Optimize + assess
[ ] M08.1  Spot pool + parser batch
[ ] M08.2  KEDA scale-to-zero
[ ] M08.3  Gateway right-sized, no socket churn
[ ] Final.1  Knowledge check submitted
[ ] Final.2  Self-graded
```

---

## When you get stuck

Use the **Troubleshooting** and **Cheat sheet** sections in [LAB-GUIDE.md](LAB-GUIDE.md#troubleshooting). They are the same for this guide.

Rule of thumb: **15 minutes** on the same error → screenshot, re-read the previous activity's validation step, ping the TA. Do not silently chew on a problem for an hour.

---

## After the workshop

Same as [LAB-GUIDE.md § After the workshop](LAB-GUIDE.md#after-the-workshop):

- **Keep your fork.**
- **Stop billing**: `terraform -chdir=infra/terraform/envs/lab destroy`.
- **Read next** — same recommended links.
