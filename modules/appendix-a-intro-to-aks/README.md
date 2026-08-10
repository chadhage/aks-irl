# Appendix A — Intro to AKS *(prerequisite primer)*

**Time:** ~60 min self-paced  |  **Level target:** L200 (foundational)  |  **Prerequisite for:** everyone new to containers, Kubernetes, or Azure

> This appendix builds the mental model the L300 modules assume. If you already ship containers to a managed Kubernetes service in production, skim the **Key differences** tables and move on. If any of the words *image*, *pod*, *node pool*, or *control plane* are fuzzy, do the three quick labs below first — they take ~10 minutes each and everything after Module 00 will make more sense.

Each of the three layers follows the same shape: **Why** (the problem it solves) → **What** (the concept in one paragraph) → **How** (a quick hands-on lab you can run on your laptop).

- [1. Containers](#1-containers)
- [2. Kubernetes](#2-kubernetes)
- [3. Azure Kubernetes Service (AKS)](#3-azure-kubernetes-service-aks)

The three build on each other: **containers** package an app, **Kubernetes** runs many containers reliably, and **AKS** is Kubernetes run for you on Azure.

```
Container  →  Kubernetes  →  Azure Kubernetes Service
package one   run & heal      run & heal, operated by
app + deps    many packages   Azure with cloud plumbing
```

---

## 1. Containers

### 1.1 Why

Before containers, "it works on my machine" was a genuine operational risk. An app depended on a specific OS, specific libraries, specific environment variables, and a specific version of the language runtime — and reproducing all of that on a build server, a colleague's laptop, and three production VMs by hand was slow and error-prone. Virtual machines solved *isolation* but each one carries a whole guest operating system, so they are heavy (gigabytes), slow to start (minutes), and expensive to run at density.

Containers solve **packaging and consistency without the weight of a VM**. You bundle the app *and everything it needs to run* into one immutable artifact that behaves identically on any machine with a container runtime. For this workshop's legacy stack — a Java gateway and a C/C++ parser with fussy build toolchains — this is the difference between "reinstall gcc 4.8 and pray" and "pull the image, run it."

### 1.2 What

A **container** is an isolated process (or group of processes) running on a host, using Linux kernel features (namespaces for isolation, cgroups for resource limits) to give the process its own view of the filesystem, network, and process tree — while still sharing the host kernel. That last part is why containers are lightweight: no guest OS.

A container is started from an **image** — a read-only, layered filesystem plus metadata (the command to run, ports, environment). Images are built from a **Dockerfile** (a recipe) and stored in a **registry** (a shared library of images). The lifecycle is:

```
Dockerfile  --build-->  Image  --push-->  Registry  --pull/run-->  Container
```

Key vocabulary you'll reuse all workshop:

| Term | One-line meaning |
|---|---|
| **Image** | The immutable package: filesystem layers + how to run it |
| **Container** | A running (or stopped) instance of an image |
| **Dockerfile** | The build recipe that produces an image |
| **Registry** | Where images live and are shared (Docker Hub, ACR, GHCR) |
| **Tag** | A human label for an image version (`parser-cpp:v2`) |
| **Digest** | The immutable content hash of an image (`sha256:…`) |

### 1.3 How — quick hands-on lab *(~10 min)*

You need Docker Desktop, Podman, or Rancher Desktop installed (`docker version` or `podman version`). Every command below also works with `podman` in place of `docker`.

**Step 1 — run your first container.** This pulls a tiny image and runs it once:

```bash
docker run --rm hello-world
```

**Step 2 — run something real and reach it.** Start a web server, publish its port, and open it in a browser:

```bash
docker run --rm -d -p 8080:80 --name web nginx
# open http://localhost:8080  — you should see the nginx welcome page
docker ps                     # see it running
docker logs web               # see its access logs
docker stop web               # --rm auto-removes it on stop
```

**Step 3 — build your own image.** Create a folder with these two files:

`app.py`
```python
print("Hello from inside a container")
```

`Dockerfile`
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY app.py .
CMD ["python", "app.py"]
```

Then build and run it:

```bash
docker build -t hello-primer:1 .
docker run --rm hello-primer:1
docker image ls hello-primer   # your image, with its tag and size
```

**What you just proved:** the same image runs identically on any container host — no "install Python first" step. That portability is the entire foundation the next two sections stand on.

> **Cleanup:** `docker rmi hello-primer:1 hello-world nginx` (optional).

---

## 2. Kubernetes

### 2.1 Why

Containers solve packaging for *one* container on *one* host. Production is the opposite of that: dozens or hundreds of containers, across many hosts, that must stay running when a container crashes, a host dies, or traffic spikes. Doing that by hand — restarting crashed containers, spreading them across machines, rolling out new versions without downtime, wiring up networking and load balancing — is a full-time job that doesn't scale.

**Kubernetes** is the answer to *"who runs and babysits all these containers for me?"* You declare the **desired state** ("I want 5 copies of the parser, reachable on port 8080, updated with zero downtime") and Kubernetes continuously works to make reality match — rescheduling, restarting, and scaling on its own. For a workload like this one, where a zone can fail and thousands of sockets must survive, that self-healing behavior is the whole point.

### 2.2 What

**Kubernetes (k8s)** is a container **orchestrator**: a control loop that keeps your declared desired state true. You give it YAML manifests; its controllers reconcile.

A cluster has two halves:

- **Control plane** — the brain. The **API server** (front door for all commands), **etcd** (the cluster's database of desired + current state), the **scheduler** (decides which node runs each pod), and **controllers** (the reconcile loops).
- **Nodes** (workers) — the machines that actually run your containers, each with a **kubelet** (node agent) and a container runtime.

The objects you'll meet most:

| Object | What it is |
|---|---|
| **Pod** | The smallest deployable unit: one or more tightly-coupled containers sharing an IP |
| **Deployment** | Keeps *N* identical stateless pods running; handles rolling updates & rollback |
| **StatefulSet** | Like a Deployment but for pods needing stable identity/storage (the gateway uses this) |
| **Service** | A stable network address + load balancing across a set of pods |
| **Namespace** | A logical partition of the cluster (e.g., `dev`, `prod`) |
| **ConfigMap / Secret** | Non-secret / secret configuration injected into pods |

The mental model: **you never start a container directly — you declare a Deployment, and Kubernetes creates the pods, watches them, and replaces any that die.**

### 2.3 Key differences between Containers and Kubernetes

| | Containers (Docker/Podman alone) | Kubernetes |
|---|---|---|
| **Scope** | One container on one host | Many containers across many hosts |
| **Model** | Imperative — *you* run `docker run` | Declarative — you declare desired state, it reconciles |
| **If a container crashes** | It stays down until you restart it | Automatically restarted / rescheduled |
| **Scaling** | Manual (`docker run` more copies) | `replicas: N`, or autoscaled |
| **Rolling update / rollback** | Do it yourself | Built-in, with health gating |
| **Networking / load balancing** | Manual port mapping | Services + built-in DNS + load balancing |
| **Self-healing** | None | Continuous reconciliation is the core behavior |

One-liner: **a container is a package; Kubernetes is the system that keeps many of those packages alive and reachable.**

### 2.4 How — quick hands-on lab *(~10 min)*

Get a throwaway single-node cluster on your laptop. Easiest options: **kind** (`kind create cluster`), **minikube** (`minikube start`), or Docker Desktop's built-in Kubernetes (enable in settings). All you need afterward is `kubectl`.

```bash
kubectl get nodes          # your one-node cluster is ready
```

**Step 1 — declare a Deployment (not a container).** Run 3 replicas of nginx:

```bash
kubectl create deployment web --image=nginx --replicas=3
kubectl get pods -o wide    # three pods, possibly on different nodes
```

**Step 2 — watch self-healing.** Delete a pod and watch Kubernetes replace it to honor `replicas: 3`:

```bash
kubectl get pods
kubectl delete pod <one-pod-name>
kubectl get pods            # a new pod is already being created
```

**Step 3 — expose it with a Service and reach it:**

```bash
kubectl expose deployment web --port=80 --type=ClusterIP
kubectl port-forward service/web 8080:80
# open http://localhost:8080 in another terminal/browser
```

**Step 4 — scale and roll out declaratively:**

```bash
kubectl scale deployment web --replicas=5
kubectl set image deployment/web nginx=nginx:1.27   # rolling update, zero downtime
kubectl rollout status deployment/web
kubectl rollout undo deployment/web                 # instant rollback
```

**What you just proved:** you never told Kubernetes *how* to keep 3–5 pods alive — you declared the target and it did the reconciling, replacing, and rolling for you.

> **Cleanup:** `kubectl delete deployment web && kubectl delete service web` (and `kind delete cluster` / `minikube delete` when done).

---

## 3. Azure Kubernetes Service (AKS)

### 3.1 Why

Running Kubernetes yourself is powerful but operationally heavy: you have to build and patch the control plane, keep `etcd` healthy and backed up, upgrade nodes safely, and wire the cluster into networking, identity, storage, and monitoring. That undifferentiated heavy lifting is exactly what a real customer *doesn't* want to staff for.

**AKS is managed Kubernetes on Azure.** Microsoft runs the control plane for you (and doesn't charge you for it on the free tier), handles its availability and upgrades, and integrates the cluster with the rest of Azure — Entra ID for identity, Azure CNI for networking, Azure Load Balancer, Key Vault, Azure Monitor, and more. You keep the same Kubernetes API and YAML you just learned; you drop the burden of operating the plumbing beneath it. For this workshop, AKS is what makes a private, zone-redundant, mesh-enabled, GitOps-driven platform reachable within a day instead of a quarter.

### 3.2 What

**AKS** is a first-party Azure service that provisions and operates the Kubernetes **control plane** for you and manages pools of Azure VMs as your **worker nodes**. You interact with it through the same `kubectl` and manifests; what changes is *who runs the hard parts* and *what it plugs into*.

What AKS adds on top of vanilla Kubernetes:

| Area | AKS integration |
|---|---|
| **Control plane** | Provisioned, monitored, and upgraded by Azure; a financially-backed SLA is available |
| **Nodes** | **Node pools** of Azure VMs with cluster autoscaler / node autoprovisioning |
| **Identity** | Entra ID for cluster access + **Workload Identity** so pods get Azure permissions with no secrets |
| **Networking** | Azure CNI (incl. Overlay), private API server, Azure Load Balancer, Application Gateway |
| **Secrets** | Key Vault CSI driver mounts secrets straight into pods |
| **Observability** | Managed Prometheus + Managed Grafana + Container Insights / Log Analytics |
| **Upgrades** | Coordinated control-plane and node-image upgrades with surge + drain |

The mental model: **AKS = the Kubernetes you already understand, minus the control-plane babysitting, plus native wiring into Azure identity, networking, and monitoring.**

### 3.3 Key differences between Kubernetes and Azure Kubernetes

| | Self-managed Kubernetes | AKS |
|---|---|---|
| **Control plane** | You install, patch, back up `etcd`, keep it HA | Azure runs it (free tier: no charge for it) |
| **Nodes** | You provision & join VMs yourself | **Node pools** of Azure VMs, autoscaled |
| **Upgrades** | Your runbook, your risk | `az aks upgrade`, coordinated by Azure |
| **Identity** | Bring your own (certs, OIDC you wire) | Entra ID + Workload Identity out of the box |
| **Networking** | You choose & operate a CNI | Azure CNI / Overlay, private cluster, Azure LB integrated |
| **Load balancer / ingress** | You install & manage | Azure Load Balancer & App Gateway provisioned for you |
| **Secrets / monitoring** | You assemble | Key Vault CSI, Managed Prometheus/Grafana, Container Insights |
| **What you still own** | Everything | Your workloads, node pool sizing, and config choices |

One-liner: **Kubernetes is the engine; AKS is that same engine run and serviced by Azure, pre-plumbed into the cloud around it.** Your manifests don't change — the operational burden does.

### 3.4 How — quick hands-on lab *(~10 min + provisioning wait)*

This one uses a real Azure subscription and creates billable resources — **delete them at the end.** You need the Azure CLI (`az version`) and to be logged in (`az login`). This is a throwaway public cluster to *feel* AKS; it is **not** the workshop's hardened private architecture (that's Modules 01–02).

**Step 1 — create a resource group and a small cluster:**

```bash
az group create --name rg-aks-primer --location eastus2

az aks create \
  --resource-group rg-aks-primer \
  --name aks-primer \
  --node-count 2 \
  --node-vm-size Standard_B2s \
  --generate-ssh-keys
# provisioning the managed control plane + nodes takes ~5 min
```

**Step 2 — get credentials and confirm it's just Kubernetes:**

```bash
az aks get-credentials --resource-group rg-aks-primer --name aks-primer
kubectl get nodes            # your Azure VM node pool, as Kubernetes nodes
```

**Step 3 — deploy the same way you did locally, but get a real cloud load balancer:**

```bash
kubectl create deployment web --image=nginx --replicas=3
kubectl expose deployment web --port=80 --type=LoadBalancer
kubectl get service web --watch
# wait for EXTERNAL-IP to change from <pending> to a public IP, then open it
```

**Step 4 — see the Azure-native operations you don't get from raw Kubernetes:**

```bash
az aks scale --resource-group rg-aks-primer --name aks-primer --node-count 3
az aks get-upgrades --resource-group rg-aks-primer --name aks-primer -o table
```

**What you just proved:** identical `kubectl` workflow, but the control plane was handed to you, the nodes are managed Azure VMs, and `--type=LoadBalancer` provisioned a real Azure Load Balancer automatically. That Azure integration is what the rest of the workshop builds on.

> **Cleanup (do this — it's billable):**
> ```bash
> az group delete --name rg-aks-primer --yes --no-wait
> ```

---

## Where to go next

You now have the mental model the workshop assumes:

- **Containers** package the Java gateway and C++ parser once, run anywhere.
- **Kubernetes** keeps many of those containers alive, reachable, and updatable by reconciling declared state.
- **AKS** runs that Kubernetes for you on Azure and wires it into identity, networking, secrets, and observability.

Continue to [Module 00 — Envisioning & Architecture Decisions](../00-envisioning/README.md), where the cohort turns these primitives into the **9 Day-0 decisions** for a real socket-based workload. Revisit any lab above whenever a later module’s term stops making sense.

### Go deeper (optional, still L200)

- [What is a container? (Microsoft Learn)](https://learn.microsoft.com/dotnet/architecture/microservices/container-docker-introduction/)
- [Kubernetes core concepts for AKS (Microsoft Learn)](https://learn.microsoft.com/azure/aks/concepts-clusters-workloads)
- [What is Azure Kubernetes Service? (Microsoft Learn)](https://learn.microsoft.com/azure/aks/what-is-aks)
- [AKS Well-Architected service guide](https://learn.microsoft.com/azure/well-architected/service-guides/azure-kubernetes-service)
