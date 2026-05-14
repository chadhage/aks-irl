# Facilitator Guide

> Read before running the workshop. Companion to [the participant README](README.md).
>
> **Terminology:** A **squad** = 2–3 participants sharing one breakout room and one Terraform environment. Kubernetes terms (Pod, Container, Node, Cluster) are reserved for the Kubernetes objects only.

## Roles
- **Lead facilitator** — owns the schedule, drives the whiteboard sections, escalates when a squad is stuck.
- **TA (1 per 8 participants)** — sits with squads, helps debug, watches Azure Portal for quota / RBAC issues.
- **Scribe (optional)** — captures whiteboard photos and gotchas into a shared "What we learned" doc.

## 48 hours before
1. Confirm subscription quotas (see [prerequisites.md](prerequisites.md))
2. Provision the **bootstrap** Terraform once (creates remote state)
3. Pre-create one Entra group per squad and one **break-glass** admin group (only the lead facilitator is a member)
4. Run [`scripts/preflight.sh`](scripts/preflight.sh) on a clean Codespace to make sure it actually passes

## Day 1 — pacing notes
- **M01 takes longer than people expect.** Front Door provisioning can hit 20 min. Use the wait time to do M00's stretch questions if M00 finished early.
- **M02 is the security pivot.** Many L200 participants haven't used Workload Identity. Slow down here.
- **M03 is the dopamine hit.** Don't let squads rush. Have them load-test from a non-squad machine to internalize what "live" feels like.

## Day 2 — pacing notes
- **M04 is fun and short.** Use the saved time to deepen M05 conversations.
- **M05 has the highest L300 → L400 leverage.** Get participants to articulate *why* manual prod sync is worth the friction.
- **M06/M07 are the level-determiners.** A participant who can verbally explain SLO-driven decisions in M06 is L300. One who designs an alternative mitigation pre-emptively is L400.
- **Knowledge check is open-book on purpose.** L400 emerges in C4, D4, and the bonus.

## Common gotchas (and the fix)

| Symptom | Cause | Fix |
|---|---|---|
| `terraform apply` fails on Front Door | Cdn.MicrosoftCdn registration | `az provider register -n Microsoft.Cdn` |
| `kubectl get nodes` times out | Private cluster + no jumpbox | Use `az aks command invoke` until the jumpbox is up |
| Argo CD `ring-dev` permanently `Unknown` | Repo URL in `apps/*.yaml` still says `REPLACE` | sed-fix and commit |
| Istio gateway IP `<pending>` | Standard LB quota | Check `az network lb list` for stragglers in `MC_*` RG |
| KEDA scaler at 0 replicas forever | Prometheus serverAddress wrong | Use `http://prometheus-server.kube-system:80` or the managed Prom endpoint |
| Front Door probes fail | Origin host header mismatch | Set `origin_host_header` = the external ingress FQDN |

## Calibration tips
- Pre-grade your fellow facilitators against the knowledge check **before** the workshop. Disagreements between graders surface ambiguity in the rubric — fix it before participants see it.
- Have a "live demo recovery" plan: if a squad's Cluster goes sideways, swap them onto a spare squad environment (set up one extra `squad-template`-deployed environment in advance).

## End-of-day cleanup
```bash
for squad in 01 02 03; do
  cd infra/terraform/envs/squad-$squad && terraform destroy -auto-approve
done
```
Run **only after** the knowledge check is submitted.
