/* Lab content extracted from LAB-GUIDE-ACTIVITIES.md and the module READMEs.
   Each activity: pre-check (baseline), do (steps), validation, post-check (proof).
   Trainer notes (talk track + demo cues) come from each module README. */

const TRAINER = {
  Setup: {
    talk: "Set expectations: the apps under apps/ are mocks. The value is the architecture and operational moves, not the application logic. Confirm every participant has Owner on a sandbox subscription meeting the quotas before anyone deploys.",
    demo: "Run scripts/preflight.sh on a fresh laptop and time it. Pre-build the three images and push to a fallback ACR you control — at least one local Docker will fail on the gcc-based parser image.",
  },
  M00: {
    talk: "This customer is not greenfield. They have a real wire protocol with client endpoints that cannot reconnect during business hours, a NOC that watches socket counts and latency (not RPS), and a regulator-imposed RTO of 30 min / RPO < 1 min. Two decisions change everything: (1) the gateway is a StatefulSet behind a TCP Standard Load Balancer — sockets are sacred; (2) state stays out of the cluster — PostgreSQL is Flexible Server with zone-redundant HA.",
    demo: "Show the target architecture diagram next to the legacy diagram in SCENARIO.md; point at each box and say what replaces it. Fill in the ADR header and one decision row live so the room sees the shape.",
  },
  M01: {
    talk: "Land two ideas: (1) the platform/app seam is at this boundary — Terraform owns infra/, nothing in apps/, k8s/, or gitops/. (2) OIDC, not service-principal secrets — nothing in this repo holds a long-lived Azure password.",
    demo: "Trigger your own apply early (~25 min). While the room waits, walk infra/terraform/modules/aks/main.tf: local_account_disabled, oidc_issuer_enabled, workload_identity_enabled, the Istio addon block.",
  },
  M02: {
    talk: "Workload Identity uses the cluster OIDC issuer + federated credentials: a ServiceAccount token is exchanged for an Entra access token — no secret is mounted. Pod Identity v1/v2 are deprecated. Flag the failure mode the room will hit: federated-credential subject mismatch, format system:serviceaccount:<ns>:<sa>.",
    demo: "Run az aks command invoke live (the way to reach a private cluster without a tunnel). Show a failed Pod secret read without the federated credential, then the successful one with it.",
  },
  M03: {
    talk: "Three things separate this from a first-AKS tutorial: (1) no HTTP load balancer in the data path — the gateway is behind a TCP Standard LB with a 30-min idle timeout; Front Door is only for the ops console. (2) gateway-java is a StatefulSet with stable identity and source-IP affinity. (3) PostgreSQL is outside the cluster.",
    demo: "Build and push one image live so the room sees tag and digest format. Show Argo OutOfSync, then click sync. After sync, ncat <NLB_IP> 4561, type PING, show PONG.",
  },
  M04: {
    talk: "A/B at the parser, not the gateway. Moving sockets to a new gateway version tears down TCP connections — visible to connected clients. The parser is stateless per request, so shifting 10% of decode calls to v2 changes nothing visible. Splitting termination from decoding makes parser releases boring.",
    demo: "Show the current VirtualService (100% v1), edit it live to 90/10, watch Grafana split. Then switch to header match and show messages tagged x-cohort: beta hitting v2.",
  },
  M05: {
    talk: "(1) Auto-sync stops at the canary boundary — a deliberate seam where a human reads the signal. (2) The image tag in kustomization.yaml is the unit of truth; Argo reconciles to Git within ~90s, so kubectl edit gets undone. (3) Rollback is a deploy — be fluent in both the Argo UI rollback and the Git revert PR.",
    demo: "Drive the PR-bump live: change a comment in parser.cpp, push, click through the Actions tab as build → push → canary-sync → smoke → prod-PR-open runs. Then roll back via the Argo UI and explain revert vs roll-forward.",
  },
  M06: {
    talk: "Set up the war room before anyone runs a scenario — the single most important framing of the day. Three panes: Grafana (active connections + RTT P99), kubectl get pods -w, and the synthetic socket generator. Principle: each scenario isolates one failure domain. We test blast-radius edges, not average behavior.",
    demo: "Run scenario A live (Pod-kill loop); show the non-spike. Break the PDB (minAvailable: 0), repeat, show the SLO breach, then restore the PDB. Tease scenario C: an entire zone goes dark in 60 seconds.",
  },
  M07: {
    talk: "(1) RTO for a socket workload is not 'the LB is up' — it's 'displaced sockets reconnected and resumed message exchange'. Measure end-to-end. (2) Postgres geo-replication is async: anything in-flight at failover is at risk. The architecture caps loss, it doesn't eliminate it.",
    demo: "Walk the DNS swap on your demo lab first. While sockets reconnect, open the replica lag panel and narrate what RPO looks like in real time.",
  },
  M08: {
    talk: "Don't right-size by restart loop — measure, size, redeploy once. Spot is great for the parser (stateless, retry-friendly) and dangerous for the gateway (state on the wire). KEDA fits when queue depth leads; HPA on CPU fits when steady-state CPU tracks load. They coexist.",
    demo: "Open Grafana requests-vs-actual panels; show over-provisioning on a real workload. Apply a right-size and narrate the StatefulSet RollingUpdate with terminationGracePeriodSeconds: 120 + PDB protecting sockets.",
  },
  Final: {
    talk: "The knowledge check is open-book and discussion-friendly. Push for answers that cite tradeoffs, failure modes, and concrete Azure controls — not definitions. Have participants self-grade against the rubric before the readout.",
    demo: "Project the rubric. Walk one strong answer and one weak answer for the same question so the room calibrates on what 'evidence' means.",
  },
};

const LAB_DATA = {
  phases: [
    {
      id: "p0",
      name: "Phase 0 — Setup",
      blurb: "Before Day 1. Tooling, preflight, fork, and the scenario brief.",
      activities: [
        {
          id: "0.1", module: "Setup", title: "Prerequisite tooling and preflight", time: "~15 min",
          precheck: [
            "What does kubectl talk to in an AKS cluster, and what writes its kubeconfig entry on a workstation?",
            "Why is the supported kubectl client/server version skew capped at ±1 minor?",
            "What is the difference between az login (auth) and az account set --subscription (context), and where is each stored on disk?",
          ],
          steps: [
            "Walk every item in prerequisites.md.",
            "Run the preflight script.",
            "If any line is `[FAIL]`, fix it before continuing.",
          ],
          code: ["./scripts/preflight.sh"],
          validation: "Every line of preflight output is [PASS].",
          postcheck: [
            "Why is pinning the kubectl minor version to the AKS server minor a real operational rule?",
            "Which az command merges a fresh AKS kubeconfig into an existing one without clobbering other contexts?",
            "What kubeconfig field uniquely identifies which AKS cluster a context points at?",
          ],
        },
        {
          id: "0.2", module: "Setup", title: "Fork, clone, log in, read the scenario", time: "~15 min",
          precheck: [
            "Define GitOps as a deployment model on Kubernetes in one sentence.",
            "Why is 'cluster pulls from Git' generally preferred over 'CI pushes to cluster' for AKS?",
            "What does a long-lived TCP connection change about pod rollouts compared with a stateless HTTP API?",
          ],
          steps: [
            "Fork this repo on GitHub. Clone the fork locally.",
            "Run `az login` and confirm `az account show` returns your lab subscription.",
            "Read SCENARIO.md end to end.",
          ],
          validation: "az aks list -o table runs without error and your clone points at your fork's remote.",
          postcheck: [
            "Name two AKS-native ways to install a GitOps controller without doing it by hand.",
            "What happens if the GitOps controller loses Git reachability for an hour — does the workload stop?",
            "What does the cluster's RBAC need so a single Git push cannot delete a production namespace?",
          ],
        },
      ],
    },
    {
      id: "p1",
      name: "Phase 1 — Plan and provision",
      blurb: "Day-0 decisions, the ADR, Terraform foundation, and a hardened private cluster.",
      activities: [
        {
          id: "M00.1", module: "M00", title: "Walk the Day-0 decisions", time: "~15 min",
          precheck: [
            "What is a Day-0 decision and how does it differ from Day-1 and Day-2?",
            "Name three AKS architectural choices that are extremely expensive to reverse after production.",
            "What is the difference between AKS Automatic and AKS Standard in terms of which Day-0 knobs you still own?",
          ],
          steps: [
            "Open modules/00-envisioning/README.md.",
            "Read the 9 Day-0 questions silently.",
            "As a cohort, the trainer drives discussion on each one. Take notes in your ADR draft.",
          ],
          validation: "You can point to each of the 9 questions and state which way the cohort is leaning.",
          postcheck: [
            "Which AKS networking choice is essentially irreversible once nodes exist?",
            "Why is API-server visibility (public vs private) effectively a Day-0 decision on AKS today?",
            "Name one Day-0 decision that is cheap to change later and explain why.",
          ],
        },
        {
          id: "M00.2", module: "M00", title: "Pin the SLO and error budget", time: "~15 min",
          precheck: [
            "Define SLI, SLO, and SLA in one line each.",
            "What does a 30-day error budget let an SRE team do that a hard SLA does not?",
            "Which Kubernetes signal is closer to a customer-facing SLI: pod readiness, Service success rate, or Ingress 2xx ratio?",
          ],
          steps: [
            "With the cohort, pin one latency SLO (e.g., P99 socket RTT < 250 ms over 30 days).",
            "Pin one availability SLO (session-success rate).",
            "Convert each SLO to a 30-day error budget in minutes or events.",
            "Write all three numbers into your ADR draft.",
          ],
          validation: "Your ADR has three numbers: latency target, availability target, derived error budget.",
          postcheck: [
            "An SLO of 99.9% over 30 days allows roughly how many minutes of unavailability?",
            "Why is pod CPU utilization not, by itself, a customer-facing SLI?",
            "When an error budget burns 50% in the first week, what is the standard SRE response?",
          ],
        },
        {
          id: "M00.3", module: "M00", title: "Author and commit ADR-001", time: "~15 min",
          precheck: [
            "What four sections does a well-formed Architecture Decision Record contain?",
            "Why is 'Rejected alternatives' the section that ages best?",
            "What is the difference between an ADR and a design document?",
          ],
          steps: [
            "Copy adr-template.md to modules/00-envisioning/adr-001-aks-platform.md.",
            "Fill in Decision, Rationale, and Rejected alternatives for each of the 9 Day-0 questions.",
            "Commit and push.",
          ],
          validation: "Your ADR is committed on a branch in your fork; every Day-0 question has a rejected alternative.",
          postcheck: [
            "An ADR says 'Use Azure CNI Overlay.' Two years later you want Cilium dataplane. What do you do with the original ADR?",
            "Why do ADRs typically live in the repo rather than a wiki?",
            "What signals that an ADR has been superseded rather than just edited?",
          ],
        },
        {
          id: "M01.1", module: "M01", title: "Bootstrap the Terraform state backend", time: "~15 min",
          precheck: [
            "Why does any IaC tool need remote state for a team workflow?",
            "Which Azure primitives are typically used to back a Terraform state file?",
            "What is the bootstrapping chicken-and-egg problem for IaC state on Azure?",
          ],
          steps: [
            "Change into the bootstrap directory.",
            "Run init and apply — this creates the storage account + container for state.",
            "Note the output values; you will reference them in terraform.tfvars.",
          ],
          code: ["cd infra/terraform/bootstrap", "terraform init && terraform apply"],
          validation: "az storage account list -o table shows the new state account; the container exists.",
          postcheck: [
            "What lock mechanism prevents two concurrent applies against a blob-backed state?",
            "If the storage account holding state is deleted, what is the recovery path?",
            "Why is the bootstrap state file itself usually kept local and out of remote state?",
          ],
        },
        {
          id: "M01.2", module: "M01", title: "GitHub OIDC + federated credential + repo secrets", time: "~15 min",
          precheck: [
            "What does OIDC federation give you that a long-lived service-principal client secret does not?",
            "What is the GitHub Actions federated-credential subject format for a workflow running on main?",
            "Why is the GitHub-to-Entra trust scoped per repo and per ref instead of just per repo?",
          ],
          steps: [
            "Create the Entra app + service principal for CI.",
            "Add a federated credential with subject `repo:<owner>/<repo>:ref:refs/heads/main`.",
            "Grant the SP Contributor on the lab subscription and AcrPush on the ACR (after M01.4).",
            "Add three repo secrets: AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID.",
          ],
          validation: "gh secret list shows the three secrets; the federated credential is visible in the Entra portal.",
          postcheck: [
            "Why is there no AZURE_CLIENT_SECRET in an OIDC-based GitHub Actions setup?",
            "If a developer opens a PR from a fork, does OIDC succeed? Why or why not?",
            "What is the Entra error code when a federated-credential subject does not match the incoming token?",
          ],
        },
        {
          id: "M01.3", module: "M01", title: "Fill terraform.tfvars and plan", time: "~15 min",
          precheck: [
            "What is the difference between terraform plan and terraform apply --auto-approve?",
            "Why pin AKS kubernetes_version in IaC rather than tracking latest?",
            "What does local_account_disabled = true on AKS actually disable, and what replaces it?",
          ],
          steps: [
            "Copy the example tfvars to terraform.tfvars.",
            "Fill in subscription ID, region, name prefix, Postgres zone, etc.",
            "Run init then plan out to a file.",
            "Skim the plan: resource counts, anything marked destroy.",
          ],
          code: ["cp infra/terraform/envs/lab/terraform.tfvars.example terraform.tfvars", "terraform init && terraform plan -out tfplan"],
          validation: "terraform plan exits 0 with no destroys; the resource count is in the expected range.",
          postcheck: [
            "With local_account_disabled = true, which command stops working and which Azure mechanism replaces it?",
            "Name one AKS Terraform default that is not production-safe out of the box.",
            "If you re-run plan immediately after a clean apply, what should the diff be and why?",
          ],
        },
        {
          id: "M01.4", module: "M01", title: "Apply and verify outputs", time: "~20 min",
          precheck: [
            "Which Azure resources typically have to exist before the AKS resource itself can be created?",
            "If terraform apply fails halfway through an AKS create, is state corrupt? What is your next move?",
            "Why does AKS provisioning routinely take 15–25 minutes wall-clock?",
          ],
          steps: [
            "Apply the plan. It takes ~25 min wall-clock — use the time to cover M02 concepts.",
            "When it returns, run terraform output and capture: AKS name, ACR login server, Key Vault URI, Postgres FQDN, Front Door endpoint, messaging NLB IP.",
          ],
          code: ["terraform apply tfplan", "terraform output"],
          validation: "apply exits 0; every output is non-empty.",
          postcheck: [
            "Which AKS output is required to configure Workload Identity on a workload?",
            "If a LoadBalancer Service stays in <pending> after apply, what is the most likely AKS-side cause?",
            "Which RBAC roles do you grant a human to use the cluster when local_account_disabled = true?",
          ],
        },
        {
          id: "M02.1", module: "M02", title: "Reach the private API server", time: "~15 min",
          precheck: [
            "Why is the AKS API server commonly made private in production?",
            "What does az aks command invoke actually do, and where does the command run?",
            "Name two alternatives for reaching a private AKS API server from outside the VNet.",
          ],
          steps: [
            "Invoke a get-nodes command server-side via the AKS run-command API.",
            "Confirm 3 nodes, spread across 3 zones.",
            "Optional: run scripts/connect-private-aks.sh to set up local kubectl via Entra.",
          ],
          code: ['az aks command invoke -g <rg> -n <aks> --command "kubectl get nodes -o wide"'],
          validation: "get nodes returns 3 Ready nodes in zones 1, 2, 3.",
          postcheck: [
            "What identity authenticates an az aks command invoke call to the API server?",
            "What happens if you run kubectl get nodes directly from a workstation outside the VNet against a private cluster?",
            "For a zonal AKS cluster, what is the minimum number of zones to survive a single-zone outage?",
          ],
        },
        {
          id: "M02.2", module: "M02", title: "Create UAMI and federate the gateway service account", time: "~15 min",
          precheck: [
            "What is AKS Workload Identity and how does it differ from the deprecated AAD Pod Identity?",
            "What does a federated-credential subject look like for a Kubernetes ServiceAccount?",
            "Why pick a User-Assigned Managed Identity over a System-Assigned MI for an application workload?",
          ],
          steps: [
            "Create the user-assigned managed identity for the gateway.",
            "Add a federated credential with subject system:serviceaccount:messaging:gateway-java and issuer = the AKS OIDC issuer URL.",
          ],
          code: ["az identity create -g <rg> -n gateway-java-uami"],
          validation: "az identity federated-credential list shows the SA subject.",
          postcheck: [
            "Why must the target namespace and ServiceAccount exist (or be planned) for federation to function at runtime?",
            "If you misspell the ServiceAccount name in the subject by one character, what symptom does the pod show?",
            "What projected token does Kubernetes mount into the pod that Entra actually validates?",
          ],
        },
        {
          id: "M02.3", module: "M02", title: "Grant KV + Postgres access; verify Istio + federation", time: "~15 min",
          precheck: [
            "Which Azure RBAC role grants a workload identity read-only access to Key Vault secrets under RBAC mode?",
            "How does a managed identity authenticate to Azure Database for PostgreSQL Flexible Server without a password?",
            "What is the AKS Istio add-on and how do you opt a namespace into a specific revision (e.g., asm-1-23)?",
          ],
          steps: [
            "Grant the UAMI Key Vault Secrets User on the lab Key Vault.",
            "Add the UAMI as an Entra admin (or grant a pg_read_all_data-style role) on the Postgres Flex server.",
            "Confirm aks-istio-system pods are Running.",
            "Launch a throwaway pod with the federated SA and run az login --identity inside.",
          ],
          validation: "Throwaway pod's az login --identity returns the UAMI's object ID; Istio control plane is healthy.",
          postcheck: [
            "Trace the chain of trust: pod → AKS OIDC issuer → Entra → UAMI → Azure resource. Where is each step verified?",
            "If a pod returns AADSTS70021, what is the typical fix?",
            "Why don't AKS add-on namespaces like aks-istio-system typically need Workload Identity themselves?",
          ],
        },
      ],
    },
    {
      id: "p2",
      name: "Phase 2 — Ship the MVP",
      blurb: "Build and push images, bootstrap GitOps, and bring up the first live socket session.",
      success: "Success #1 — MVP live",
      activities: [
        {
          id: "M03.1", module: "M03", title: "Build and push gateway-java:v1", time: "~15 min",
          precheck: [
            "Why use az acr build over local docker build && docker push in a CI context?",
            "What does an image tag commit you to operationally, vs an image digest?",
            "Why does the AKS kubelet need a separate identity with AcrPull on the registry?",
          ],
          steps: ["Log in to the registry.", "Build and push the gateway image to ACR."],
          code: ["az acr login -n <acr>", "az acr build -r <acr> -t gateway-java:v1 apps/gateway-java/"],
          validation: "az acr repository show-tags lists v1 for gateway-java.",
          postcheck: [
            "How does the cluster pull an image by digest vs by tag, and which is more deterministic?",
            "Where in a CI pipeline does CVE scanning typically sit — pre-push, post-push, or both?",
            "If a pod stays ImagePullBackOff, what are the two most common AKS-side root causes?",
          ],
        },
        {
          id: "M03.2", module: "M03", title: "Build and push parser-cpp:v1 and ops-console:v1", time: "~15 min",
          precheck: [
            "Why split a workload into multiple container images rather than a single monolithic image?",
            "What are the operational benefits of containerizing even a static site on Kubernetes?",
            "What is the difference between a Deployment, a StatefulSet, and a DaemonSet?",
          ],
          steps: ["Build and push the parser image.", "Build and push the ops-console image."],
          code: ["az acr build -r <acr> -t parser-cpp:v1 apps/parser-cpp/", "az acr build -r <acr> -t ops-console:v1 apps/ops-console/"],
          validation: "Both tags appear in az acr repository list.",
          postcheck: [
            "When is the smaller, separately-shippable component worth the cost of one extra in-cluster hop?",
            "Name two reasons containerizing a static site is worthwhile even though nginx alone could serve it.",
            "When does a Job or CronJob fit better than a Deployment for a workload?",
          ],
        },
        {
          id: "M03.3", module: "M03", title: "Bootstrap Argo CD on the primary cluster", time: "~15 min",
          precheck: [
            "How does Argo CD differ from Flux at a glance?",
            "What is the App-of-Apps pattern and why is it useful?",
            "Where do Argo CD's initial admin credentials live, and how should that secret be rotated?",
          ],
          steps: [
            "Apply the bootstrap kustomization (via az aks command invoke).",
            "Wait for argocd-server to become Ready.",
            "Retrieve the initial admin password from the argocd-initial-admin-secret Secret.",
            "Apply the root app.",
          ],
          code: ["kubectl apply -k gitops/bootstrap", "kubectl apply -f gitops/apps/root.yaml"],
          validation: "argocd pods are Running; the root app shows in kubectl -n argocd get applications.",
          postcheck: [
            "If Argo cannot reach the upstream Git repo for 30 minutes, what happens to the running workload?",
            "Why does the root App live in Git too, rather than being a one-shot bootstrap?",
            "What is the blast radius if the argocd-server service account is compromised, and how would you scope it down?",
          ],
        },
        {
          id: "M03.4", module: "M03", title: "Replace REPLACE placeholders and commit", time: "~15 min",
          precheck: [
            "What is the difference between a Kustomize base and an overlay?",
            "When do you prefer Kustomize, Helm, or raw YAML for AKS manifests?",
            "Which manifest fields tend to be environment-specific vs tenant-specific?",
          ],
          steps: [
            "Enumerate every placeholder.",
            "Substitute your ACR login server, UAMI client ID, Postgres FQDN, etc.",
            "Commit on a branch and push.",
          ],
          code: ["grep -rn REPLACE k8s gitops"],
          validation: "grep -rn REPLACE k8s gitops returns nothing.",
          postcheck: [
            "Why is a simple grep over manifests sometimes a higher-signal gate than a YAML schema linter?",
            "Name two long-term-better solutions than string placeholders for parameterizing K8s manifests.",
            "What category of placeholder, if left in, causes the most confusing runtime failure rather than a sync failure?",
          ],
        },
        {
          id: "M03.5", module: "M03", title: "Watch Argo sync ring-dev and ring-canary", time: "~15 min",
          precheck: [
            "What does Argo's OutOfSync state mean technically?",
            "What is the difference between Argo Synced and Healthy?",
            "When is auto-sync acceptable and when is manual sync the right answer?",
          ],
          steps: [
            "Watch applications until ring-dev and ring-canary are both Synced + Healthy.",
            "Confirm ring-prod is OutOfSync and untouched.",
          ],
          code: ["kubectl -n argocd get applications -w"],
          validation: "Exactly two of three ring apps are Synced+Healthy; ring-prod is OutOfSync.",
          postcheck: [
            "A pod is Running but its Argo app is Degraded. Which Kubernetes signals can drive that state?",
            "Why is manual sync the most common production posture?",
            "How would you add an approval gate to an environment that is currently on auto-sync?",
          ],
        },
        {
          id: "M03.6", module: "M03", title: "First socket: smoke test TCP traffic", time: "~15 min",
          precheck: [
            "What is unusual about a long-lived TCP socket workload on Kubernetes compared with stateless HTTP?",
            "Which Service type provisions an Azure Load Balancer for TCP, and what does externalTrafficPolicy change?",
            "What is the default Azure Load Balancer idle timeout, and why does it matter for sockets?",
          ],
          steps: [
            "Capture the NLB IP from terraform output.",
            "Run the TCP smoke test for 50 sessions.",
            "Re-run with --duration 60s to hold sockets open and watch metrics.",
          ],
          code: ["NLB_IP=$(terraform output -raw messaging_nlb_ip)", "./scripts/smoke.sh tcp $NLB_IP 4561 50"],
          validation: "Output says 50/50 sessions, 0 dropped, P99 RTT < 250 ms.",
          postcheck: [
            "A session drops at exactly 30 minutes against an AKS LoadBalancer Service. What is the most likely cause?",
            "Why does it matter whether TLS terminates at the LB, at the cluster ingress, or at the pod?",
            "Name two AKS-side controls that reduce socket churn during rollouts.",
          ],
        },
        {
          id: "M03.7", module: "M03", title: "Ops console and trace a message end to end", time: "~15 min",
          precheck: [
            "What are the roles of Azure Front Door, Application Gateway, and Azure Load Balancer when fronting AKS?",
            "At which layers can TLS terminate on the way to a pod?",
            "What is the difference between a Service and an Ingress (or Gateway API) in Kubernetes?",
          ],
          steps: [
            "Open the ops console URL from the Front Door endpoint output.",
            "Run smoke in another terminal; watch the session count climb in real time.",
            "Draw the path of a message from client socket to Postgres row.",
          ],
          validation: "Ops console shows live sessions changing as smoke runs; you can verbally trace a message end to end.",
          postcheck: [
            "For an HTTPS path through Front Door → AKS Ingress → pod, how many TLS terminations are possible and what determines that?",
            "Where does data become durable in a typical Kubernetes architecture — pod, node, or an external service?",
            "Why is a stateless front tier preferred even when the protocol (sockets) is stateful?",
          ],
        },
      ],
    },
    {
      id: "p3",
      name: "Phase 3 — Extend and harden",
      blurb: "A/B the parser by version, then promote a real change through dev → canary → prod with gates.",
      success: "Success #2 — A/B parser tested · Success #3 — Rings + gated promotion",
      activities: [
        {
          id: "M04.1", module: "M04", title: "Build and push parser-cpp:v2", time: "~15 min",
          precheck: [
            "Why introduce a behavioral change as a new major tag (v2) instead of overwriting v1?",
            "What does image immutability mean at the registry level, and how do you enforce it on ACR?",
            "If a v2 image exists in the registry but no Kubernetes resource references it, what is the production blast radius?",
          ],
          steps: ["Inspect the v2 source diff per the module README.", "Build and push parser-cpp:v2."],
          code: ["az acr build -r <acr> -t parser-cpp:v2 apps/parser-cpp/"],
          validation: "parser-cpp:v2 tag exists in ACR.",
          postcheck: [
            "What breaks for already-running pods if a registry allows mutable tags and you retag v2 over v1?",
            "Why is immutability typically enforced at the registry rather than at the cluster?",
            "What OCI labels would make later A/B analysis easier (commit SHA, build ID, semver)?",
          ],
        },
        {
          id: "M04.2", module: "M04", title: "Deploy v2 alongside v1", time: "~15 min",
          precheck: [
            "Why is it a best practice to deploy a new version first and shift traffic to it second?",
            "Which Kubernetes/Istio labels are used to distinguish service subsets for routing?",
            "How many Deployments will run when v1 and v2 coexist before any routing change?",
          ],
          steps: ["Add a second Deployment (or DestinationRule subset) for parser-cpp:v2.", "Commit, push, let Argo sync."],
          validation: "Both versions Running in messaging-canary; no traffic to v2 yet.",
          postcheck: [
            "Why is 'deployed but receiving no traffic' a feature, not a bug, at this stage?",
            "What is the division of responsibility between Istio DestinationRule subsets and VirtualService routes?",
            "Could you achieve the same outcome with two Services and Ingress weighting? What capabilities do you lose?",
          ],
        },
        {
          id: "M04.3", module: "M04", title: "Weighted 90/10 split", time: "~15 min",
          precheck: [
            "Which Istio resource field controls traffic weight between subsets?",
            "What is the smallest weight increment Istio supports?",
            "Does weighted splitting apply per request or per connection — and why does it matter for L7 vs L4?",
          ],
          steps: [
            "Edit the VirtualService to route 90% to v1 subset, 10% to v2.",
            "Commit, push, sync.",
            "Run a synthetic loop and check the parser-version distribution.",
          ],
          code: ["for i in {1..50}; do ./scripts/smoke.sh tcp $NLB_IP 4561 1 --print-parser-version; done | sort | uniq -c"],
          validation: "Observed split is approximately 45/5 across 50 calls (Istio is statistical, not deterministic).",
          postcheck: [
            "You see a 50/0 split instead of 45/5. List three possible causes (sidecar, DR, endpoint readiness).",
            "Why does Istio's weighted routing not enforce exact per-window splits?",
            "How would you make routing sticky per session ID rather than per request?",
          ],
        },
        {
          id: "M04.4", module: "M04", title: "Header-based cohort routing", time: "~15 min",
          precheck: [
            "What is the Istio VirtualService match syntax for a request header?",
            "Why is header-based routing more powerful than weighted routing for a beta cohort?",
            "At which OSI layer does an Istio HTTP match operate, and why does that matter?",
          ],
          steps: [
            "Change the VirtualService to: x-cohort: beta → v2 subset; default → v1.",
            "Commit, push, sync.",
            "Verify with curl -H \"x-cohort: beta\" from a debug pod.",
          ],
          validation: "Beta header routes to v2 deterministically; absence routes to v1.",
          postcheck: [
            "Sketch an Istio match block that routes requests whose path matches a regex to a specific subset.",
            "Why does L7 header routing not apply to raw TCP traffic the mesh proxies as tcp rather than http?",
            "How would you implement subset selection at the L4 boundary (SNI, source IP, mTLS principal)?",
          ],
        },
        {
          id: "M04.5", module: "M04", title: "Grafana split + kill-switch drill", time: "~15 min",
          precheck: [
            "Which Prometheus label conventionally distinguishes service versions in service-mesh metrics?",
            "What is a realistic kill-switch latency target — 30 s, 5 min, or an hour?",
            "Where does a kill switch usually live: in config, in code, or in routing? Argue for one.",
          ],
          steps: [
            "Open Grafana; find the parser P99 panel split by parser_version.",
            "Predict v2 P99 before peeking.",
            "Drill: revert the VirtualService to 100% v1. Time the change-to-effect window.",
          ],
          validation: "You executed the revert and v2's panel goes to zero traffic in under 30 s.",
          postcheck: [
            "A GitOps controller polls every 3 min. How can a kill switch beat that interval?",
            "What is the difference between killing traffic and killing pods during an incident?",
            "Should a kill switch require a PR or be a single click in a UI? Argue both sides.",
          ],
        },
        {
          id: "M05.1", module: "M05", title: "Open a trivial PR", time: "~10 min",
          precheck: [
            "What is trunk-based development and what does it assume about PR size?",
            "Which branch protection rules typically gate trunk in a healthy repo?",
            "Why don't developers bump image tags themselves in a trunk-based GitOps flow?",
          ],
          steps: ["Edit a constant, log line, or comment in apps/parser-cpp/parser.cpp.", "Open a PR against main."],
          validation: "PR is open; required CI checks are queued.",
          postcheck: [
            "Why is small-PR culture critical for short mean-time-to-recovery?",
            "Which branch protection rule should fire even on a trivial PR?",
            "Who reviews trivial PRs in a high-trust team — bots, humans, or both?",
          ],
        },
        {
          id: "M05.2", module: "M05", title: "CI builds, scans, and pushes :sha-<short>", time: "~15 min",
          precheck: [
            "Why tag images with the git SHA rather than latest?",
            "What does a CVE scanner gate contribute to a CI pipeline?",
            "Where is an image's provenance typically recorded today (SLSA attestations, OCI referrers, signed metadata)?",
          ],
          steps: [
            "Watch the GitHub Actions run from your PR.",
            "Open the build job; confirm az acr build -t parser-cpp:sha-<7-chars>.",
            "Open the scan job; confirm a clean (or policy-allowed) result.",
          ],
          validation: "Green check on PR; new SHA tag visible in ACR.",
          postcheck: [
            "A High CVE is found in a base image. What should the pipeline do, and what should it not do?",
            "Why does provenance still matter even when you trust the developer?",
            "How can you cache layered builds to cut CI time meaningfully?",
          ],
        },
        {
          id: "M05.3", module: "M05", title: "Auto-bump canary kustomization", time: "~15 min",
          precheck: [
            "In GitOps, what file does CI typically rewrite to bump an image tag?",
            "Why does the bump happen in CI rather than from a developer laptop?",
            "What commit author should an auto-bump commit use, and why?",
          ],
          steps: [
            "Confirm a follow-up CI job committed a tag bump to k8s/overlays/canary/kustomization.yaml.",
            "Watch applications until ring-canary is Synced+Healthy on the new SHA.",
          ],
          validation: "Canary pods show the new image tag; Argo app is Synced+Healthy.",
          postcheck: [
            "Why does an auto-bump commit usually carry a [skip ci] marker or equivalent?",
            "What happens if two PRs merge within 30 seconds into the same overlay?",
            "How is a Kustomize tag bump different from a Helm chart version bump in an App-of-Apps setup?",
          ],
        },
        {
          id: "M05.4", module: "M05", title: "Socket-soak + open the prod-bump PR", time: "~15 min",
          precheck: [
            "What is a soak test and how is it different from a smoke test?",
            "What signals does a soak test typically watch (latency tail, error rate, leak indicators)?",
            "Why does the soak open a PR instead of pushing directly to prod?",
          ],
          steps: [
            "CI runs the socket-soak job against canary for ~5 min.",
            "On green, CI auto-opens a PR that bumps k8s/overlays/prod/kustomization.yaml.",
          ],
          validation: "Prod-bump PR is open and awaiting approval.",
          postcheck: [
            "Name two soak-failure signatures that should not auto-open the prod PR.",
            "Should the prod-bump PR be a draft or ready-for-review by default? Argue both sides.",
            "What information must the PR description carry so the approver can make a real decision?",
          ],
        },
        {
          id: "M05.5", module: "M05", title: "Approve and manually sync prod", time: "~15 min",
          precheck: [
            "What is a GitHub Environment protection rule and what can it enforce?",
            "Why is manual GitOps sync the most common posture for production AKS workloads?",
            "Who in a real organization typically has authority to trigger a production sync?",
          ],
          steps: [
            "Open the prod-bump PR; approve and merge (Environment protection requires the reviewer role).",
            "In the Argo UI, manually sync ring-prod.",
            "Watch pods roll.",
          ],
          validation: "messaging-prod parser pods show the new SHA.",
          postcheck: [
            "The PR merged but the controller did not sync. What does that say about which side is the source of truth?",
            "What is the audit trail for who triggered a sync — in Argo, in Flux, in kubectl apply?",
            "Why is 'manual sync, automated everything else' the typical production posture?",
          ],
        },
        {
          id: "M05.6", module: "M05", title: "Practice both rollbacks", time: "~15 min",
          precheck: [
            "Name the two primary rollback mechanisms available in a GitOps stack.",
            "Which rollback path is faster, and which is more auditable?",
            "After a UI-only rollback, what does Git say is the desired state, and what is the risk?",
          ],
          steps: [
            "Rollback A — Argo UI: select the previous Sync revision, roll back. Time it.",
            "Rollback B — Git revert PR: open a revert PR, merge, sync. Time it.",
            "Note both numbers.",
          ],
          validation: "Prod is back to v1; you have two timing numbers.",
          postcheck: [
            "The controller rolled prod back to v1, but Git still says v2. What is the next action and why?",
            "Which rollback is the right first move in a real incident? Which is the right follow-up?",
            "How would you make a Git-revert path as fast as a UI rollback in practice?",
          ],
        },
      ],
    },
    {
      id: "p4",
      name: "Phase 4 — Survive outages",
      blurb: "Run controlled chaos against live sockets, then a measured cross-region failover.",
      success: "Success #4 — Intrinsic outage survived · Success #5 — Extrinsic outage survived",
      activities: [
        {
          id: "M06.1", module: "M06", title: "Set up your three observability panes", time: "~15 min",
          precheck: [
            "For a production incident, what are the minimum three observability surfaces a war room needs?",
            "What is session success and how is it different from pod readiness?",
            "Where do you observe at the socket layer, not just the Kubernetes layer?",
          ],
          steps: [
            "Pane 1: Grafana dashboard showing session success and parser RTT P99.",
            "Pane 2: kubectl -n messaging-prod get pods -w (via command invoke).",
            "Pane 3: a sustained socket generator.",
          ],
          code: ["./scripts/smoke.sh tcp $NLB_IP 4561 200 --duration 600s"],
          validation: "All three panes streaming; baseline is steady-state for at least 60 seconds before you break anything.",
          postcheck: [
            "What does a steady-state baseline buy you before chaos starts?",
            "If you could keep only one of the three panes, which would it be and why?",
            "What is still missing from these three panes for a real war room?",
          ],
        },
        {
          id: "M06.2", module: "M06", title: "Scenario A baseline: parser pod kill loop, PDB intact", time: "~15 min",
          precheck: [
            "What does a PodDisruptionBudget actually prevent — and what does it not prevent?",
            "What is the default behavior of an Istio sidecar on a connection refusal — retry, fail fast, or circuit-break?",
            "What should P99 latency do during a controlled rolling pod kill on a properly configured workload?",
          ],
          steps: [
            "Confirm the parser PDB allows 1 disruption.",
            "Kill parser pods in a loop.",
            "Watch all three panes for 2 minutes.",
          ],
          code: ["while true; do kubectl -n messaging-prod delete pod -l app=parser-cpp --field-selector status.phase=Running | head -1; sleep 5; done"],
          validation: "Session success stays at SLO; P99 RTT shows micro-bumps but stays under target.",
          postcheck: [
            "Why did P99 not spike in a healthy setup?",
            "What actually protected the request — the PDB, the retries, or both?",
            "What changes if the workload only has a single replica?",
          ],
        },
        {
          id: "M06.3", module: "M06", title: "Scenario A failure: break the PDB, then restore it", time: "~15 min",
          precheck: [
            "What does minAvailable: 0 (or no PDB at all) tell the scheduler?",
            "What is the difference between voluntary and involuntary disruption in Kubernetes?",
            "Does deleting a PDB change pod-kill behavior, or only kubectl drain behavior?",
          ],
          steps: [
            "Delete the parser PDB.",
            "Keep the kill loop running for 60 s.",
            "Watch SLO break in Grafana.",
            "Restore the PDB by re-syncing from Git.",
          ],
          code: ["kubectl -n messaging-prod delete pdb parser-cpp", "argocd app sync ring-prod"],
          validation: "SLO broke when PDB was gone; SLO recovers after the PDB is restored.",
          postcheck: [
            "Why is operator-initiated drain classified as a voluntary disruption?",
            "To survive node failure (not just pod kill), what do you need beyond a PDB?",
            "How long did your SLO take to recover after the PDB was restored, and is that acceptable?",
          ],
        },
        {
          id: "M06.4", module: "M06", title: "Scenario B: bad parser rollout and fast rollback", time: "~15 min",
          precheck: [
            "What counts as a 'bad rollout' — crash loop, slow start, wrong business logic, or all of those?",
            "What is a realistic target rollback time for a critical service?",
            "Which rollback mechanism (UI vs Git revert) is the right first move in an incident?",
          ],
          steps: [
            "Push parser-cpp:bad to ACR (or use a pre-built tag from the trainer).",
            "Hand-edit the prod overlay to point at :bad, commit, sync (you are the chaos).",
            "Watch SLO break.",
            "Rollback via Argo UI to the previous sync revision.",
          ],
          validation: "Rollback completes in under 2 minutes; record the actual.",
          postcheck: [
            "What signal told you 'roll back now' instead of 'wait and see'?",
            "What is the right post-incident action: revert PR, or leave the UI rollback in place?",
            "How would a progressive delivery tool (Flagger, Argo Rollouts) have prevented this?",
          ],
        },
        {
          id: "M06.5", module: "M06", title: "Scenario C: zone drain", time: "~20 min",
          precheck: [
            "What does kubectl drain actually do, step by step?",
            "Why does a zone-failure test matter especially for stateful or socket workloads?",
            "What is a reconnect storm and why is it dangerous to surviving zones?",
          ],
          steps: [
            "Inspect chaos/zone-failure-experiment.bicep to understand the blast radius.",
            "Trigger the experiment targeting one zone's nodes.",
            "Watch panes: pods evict, sessions reconnect, RTT spikes briefly.",
          ],
          validation: "≥99% of sockets reconnect within 30 s; SLO holds within 60 s of impact.",
          postcheck: [
            "Which AKS construct ensures pods land in multiple zones — node-pool zones, topology spread constraints, or both?",
            "What is the second-order failure if surviving zones are at exactly 100% of normal capacity when one zone drops?",
            "How would you simulate a zone failure on AKS without an Azure Chaos experiment?",
          ],
        },
        {
          id: "M06.6", module: "M06", title: "Screenshots and one incident write-up", time: "~15 min",
          precheck: [
            "What is the difference between a postmortem and a 'war story'?",
            "Name three sections of a good blameless postmortem.",
            "Why do screenshots from dashboards belong in the write-up?",
          ],
          steps: [
            "Take one Grafana screenshot per scenario (A, B, C).",
            "Commit a short incident write-up under a path the trainer dictates.",
          ],
          validation: "Write-up committed; three screenshots attached.",
          postcheck: [
            "Which action item from your write-up would you take to production this quarter?",
            "Who is the real audience for the document — your team, your VP, or an auditor?",
            "What detail did you almost leave out that turned out to matter?",
          ],
        },
        {
          id: "M07.1", module: "M07", title: "Bootstrap Argo on the secondary cluster", time: "~15 min",
          precheck: [
            "Why deploy a second GitOps controller on the secondary cluster rather than one reaching both?",
            "What is the cost difference between active-active and active-passive AKS topologies?",
            "Where should the secondary controller's Git URL point, and on which branch?",
          ],
          steps: [
            "Same bootstrap as M03.3, against the secondary AKS via command invoke.",
            "Apply the root app; let it sync ring-prod only.",
          ],
          validation: "On the secondary, ring-prod is Synced+Healthy with no live traffic.",
          postcheck: [
            "Why is it acceptable for the secondary to be Synced + Healthy yet idle?",
            "What still costs money on the secondary cluster even when it carries zero traffic?",
            "What is the tradeoff between warm-standby and cold-standby for a regional DR posture?",
          ],
        },
        {
          id: "M07.2", module: "M07", title: "Verify Postgres geo-replica lag", time: "~10 min",
          precheck: [
            "Define RPO in plain English.",
            "Where does Azure Database for PostgreSQL Flexible Server expose replication lag?",
            "What is 'acceptable' replica lag for a financial workload vs a logging workload?",
          ],
          steps: ["Query the primary's replication slots / replica status.", "Confirm lag is under 5 s."],
          validation: "confirmed_flush_lsn is current to within seconds of the primary.",
          postcheck: [
            "What network event would spike replica lag, and how would you detect it from Azure Monitor?",
            "If lag is 60 s at failover time, what happens to that 60 s of data?",
            "How does streaming replication differ from snapshot-based DR for RPO?",
          ],
        },
        {
          id: "M07.3", module: "M07", title: "Sustained socket load on primary", time: "~10 min",
          precheck: [
            "Why hold sockets open during failover practice rather than running a one-shot smoke?",
            "What is the difference between a session drop and a session reconnect?",
            "What client behavior does a synthetic socket generator typically simulate (backoff, retry, fail-fast)?",
          ],
          steps: ["Start a 30-minute sustained socket load against the primary NLB.", "Confirm a stable baseline for 60 s before triggering failover."],
          code: ["./scripts/smoke.sh tcp $PRIMARY_NLB_IP 4561 200 --duration 1800s &"],
          validation: "200 sockets open, 0 drops, baseline RTT steady.",
          postcheck: [
            "Why not measure failover as smoke-then-failover-then-smoke?",
            "What in a telemetry pipeline could miscount reconnects as brand-new sessions?",
            "How would 2000 sustained sockets behave differently from 200 during failover?",
          ],
        },
        {
          id: "M07.4", module: "M07", title: "Surgical failover: DNS swap + promote replica", time: "~15 min",
          precheck: [
            "Why is DNS, rather than BGP/anycast, the typical switching mechanism for regional failover?",
            "What bounds RTO when DNS is the switch — record TTL plus what else?",
            "What does 'promote replica' actually do at the Postgres level, and why is it not reversible?",
          ],
          steps: [
            "Swap the messaging DNS A record from primary NLB → secondary NLB.",
            "Promote the Postgres geo-replica in the secondary region.",
            "Watch all panes.",
          ],
          validation: "Sockets reconnect to the secondary within DNS TTL + client retry window; new writes succeed against the promoted replica.",
          postcheck: [
            "Why is 'promote replica' not reversible the way a DNS swap is?",
            "Which order is safer: DNS-then-promote, or promote-then-DNS, and why?",
            "What is split-brain in this stack, and what prevents it during a clean failover?",
          ],
        },
        {
          id: "M07.5", module: "M07", title: "Measure and record RTO and RPO", time: "~15 min",
          precheck: [
            "Define RTO vs RPO in one sentence each.",
            "For a socket workload, what does 'time to recover' mean — first reconnect, 99% reconnect, or steady-state?",
            "Where do you read the actual achieved RPO from in a Postgres-backed system?",
          ],
          steps: [
            "From smoke timestamps + Postgres LSN, compute socket-reconnect RTO and data-loss RPO.",
            "Commit numbers to your incident write-up.",
          ],
          validation: "Two numbers recorded with units and methodology.",
          postcheck: [
            "Your RTO is 90 s but P99 RTT stays elevated for 4 minutes after recovery. Why does that gap exist?",
            "What is the smallest single change you could make to halve RTO?",
            "Which of the two numbers does the business care about more, and why?",
          ],
        },
        {
          id: "M07.6", module: "M07", title: "Recover to primary without flooding it", time: "~15 min",
          precheck: [
            "Why is failback usually riskier than failover?",
            "What is a 'thundering herd,' and which step in a failback typically causes one?",
            "During failback, should data flow secondary → primary, or should you start fresh?",
          ],
          steps: [
            "Re-establish replication primary ← secondary.",
            "Wait for replica lag to converge.",
            "DNS swap back, slowly draining sockets from secondary first.",
          ],
          validation: "No split-brain in Postgres; no socket avalanche on the primary; SLO holds throughout.",
          postcheck: [
            "What would happen if you swapped DNS back before replication lag converged?",
            "What single Azure feature would have made this drill trivial?",
            "How often should a real team practice failover in production?",
          ],
        },
      ],
    },
    {
      id: "p5",
      name: "Phase 5 — Optimize and assess",
      blurb: "Right-size, add spot and scale-to-zero, then take the knowledge check and self-grade.",
      success: "Success #6 — Right-sized without socket churn · Success #7 — Calibrated self-rating",
      activities: [
        {
          id: "M08.1", module: "M08", title: "Enable spot pool; move parser batch to it", time: "~15 min",
          precheck: [
            "What is an Azure Spot node, and what is the eviction model on AKS?",
            "Which workload shapes are good spot candidates, and which are not?",
            "What toleration + nodeSelector/nodeAffinity combination targets an AKS spot pool?",
          ],
          steps: [
            "Enable a spot user pool on the primary cluster (Terraform variable change → apply).",
            "Add the spot toleration to the parser batch reconciler Deployment (the batch one, not the live serving one).",
            "Watch pods land on spot nodes.",
          ],
          validation: "kubectl -n messaging-prod get pods -o wide shows batch pods on spot nodes.",
          postcheck: [
            "What happens to a batch pod when its spot node is evicted? What about a stateful pod?",
            "What is a reasonable terminationGracePeriodSeconds for a workload that processes one message at a time?",
            "What ballpark percentage do spot pools typically save vs on-demand, and what governs that number?",
          ],
        },
        {
          id: "M08.2", module: "M08", title: "KEDA scale-to-zero for parser", time: "~15 min",
          precheck: [
            "What is KEDA, and how does it differ from the standard Horizontal Pod Autoscaler?",
            "Which signals can KEDA scale on that HPA alone cannot?",
            "What is the cold-start cost of scaling a pod from 0 → 1, and what drives it?",
          ],
          steps: [
            "Install KEDA (or confirm already installed via Terraform).",
            "Apply a ScaledObject for parser-cpp driven by a Prometheus query.",
            "Watch parser scale down to 0 when traffic stops; scale up on load.",
          ],
          validation: "Parser pods go to 0 with no traffic; come back within SLO when smoke resumes.",
          postcheck: [
            "A burst arrives while you are at 0 replicas. What governs time-to-first-response?",
            "Why is scale-to-zero a poor fit for a long-lived TCP gateway?",
            "Name a metric that would not make a good KEDA trigger here, and explain why.",
          ],
        },
        {
          id: "M08.3", module: "M08", title: "Right-size gateway-java without churning sockets", time: "~20 min",
          precheck: [
            "What is the difference between resources.requests and resources.limits on a pod?",
            "Why is right-sizing requests usually more important than tightening limits?",
            "Why is a normal rolling restart dangerous for a long-lived TCP workload?",
          ],
          steps: [
            "From Grafana, find gateway-java's P95 CPU and memory over the last hour.",
            "Update requests in the prod overlay to match P95 + safety margin.",
            "Roll out without dropping sockets — use a PreStop hook + drain pattern.",
          ],
          validation: "Baseline session count holds throughout the rollout; new pods have new requests; no reconnect spike.",
          postcheck: [
            "What is a preStop hook actually doing for a TCP workload during pod termination?",
            "Why does a stateful rollout differ from a normal HTTP service rollout (maxSurge, maxUnavailable, drain)?",
            "What is the smallest change to a Deployment spec that would silently drop sockets during rollout?",
          ],
        },
        {
          id: "Final.1", module: "Final", title: "Take the knowledge check", time: "~20 min",
          precheck: [
            "Name the AKS Day-0 decisions that are effectively irreversible once nodes exist.",
            "For each topic area (identity, GitOps, mesh, chaos, DR, cost), name the single AKS-native control you would mention first.",
            "What is the difference between an SLO and a hard SLA?",
          ],
          steps: [
            "Open the Knowledge Check (self-assessment) or assessment/knowledge-check.md.",
            "Read assessment/rubric.md before you start writing.",
            "Answer Sections A–E; Section F is bonus.",
          ],
          link: { href: "knowledge-check.html", label: "Open the Knowledge Check →" },
          validation: "File committed and pushed to your fork (or self-assessment completed).",
          postcheck: [
            "Which topic area felt weakest — networking, identity, GitOps, autoscaling, DR?",
            "Which AKS question would you add to the assessment that is not currently there?",
            "Which concept did you internalize during the lab that you could not have explained beforehand?",
          ],
        },
        {
          id: "Final.2", module: "Final", title: "Self-grade with the rubric (then try Exam Prep)", time: "~15 min",
          precheck: [
            "For Kubernetes mastery, what does Level 300 vs Level 400 look like in practice?",
            "Why does a rubric ask for evidence rather than just a numeric score?",
            "For an AKS platform engineer, what one skill correlates most with seniority?",
          ],
          steps: [
            "Re-open assessment/rubric.md and score each answer honestly.",
            "Note the gap between where you are and where you want to be.",
            "Run a timed Exam Prep set to pressure-test recall under exam conditions.",
          ],
          link: { href: "exam-prep.html", label: "Open Exam Prep →" },
          validation: "Every section has a self-score with one-line justification; one timed exam set completed.",
          postcheck: [
            "What is your single biggest AKS knowledge gap right now, and the smallest first step to close it?",
            "Which Day-0 AKS decision do you understand differently now than at the start?",
            "Which concept moved your proficiency the most, and why?",
          ],
        },
      ],
    },
  ],
};
