# Knowledge Check

> ~30 minutes. Open-book (the repo). Each section is scored independently so a strong performance in one area can offset a weak one elsewhere. Grade yourself against [`rubric.md`](rubric.md).

## Self-scoring rubric

| Total score | Awarded level |
|---|---|
| 90 % + and at least one L400 question fully correct | **L400** |
| 75 – 89 % | **L300** |
| 60 – 74 % | **high L200** |
| < 60 % | Not certified |

Each question lists max points and the level it targets.

---

## Section A — Foundations (L200/300)  [25 pts]

**A1. (5)** Name three Day-0 AKS decisions and explain why each is hard to reverse.

**A2. (5)** Your customer says "we need 99.99% availability for the API." What three things do you check before agreeing?

**A3. (5)** Sketch (in words) the data flow from a customer browser to a `web-react` Pod via Front Door + Istio. Identify every TLS termination point.

**A4. (5)** What does `local_account_disabled = true` buy you on an AKS Cluster? What does it cost?

**A5. (5)** Compare PodDisruptionBudget and HorizontalPodAutoscaler — which one would have saved you from scenario 6A, and why?

---

## Section B — Build & deploy (L300)  [25 pts]

**B1. (5)** Walk through the journey of a commit to `apps/api-node/src/server.js` from PR merge to running Pod in `app-prod`. List every artifact created and every approval gate.

**B2. (5)** Argo CD `ring-prod` is OutOfSync. Give the two valid paths to make it sync — and explain which preserves Git as the source of truth.

**B3. (5)** Your CI built an image, pushed it to ACR, but Pods are `ImagePullBackOff`. Name three things you'd check, in order.

**B4. (5)** Explain `kustomize edit set image` vs editing the `images:` block by hand. When does the difference matter?

**B5. (5)** Where do environment secrets come from in this design? Trace one secret end-to-end.

---

## Section C — Traffic & rings (L300/L400)  [20 pts]

**C1. (5)** In an Istio `VirtualService` with weighted routing, which component actually decides which Pod handles a given request?

**C2. (5)** Header-based routing for A/B testing — what makes this **deterministic per user** versus the weighted variant?

**C3. (5)** Why is the `DestinationRule` required even when you only have one subset? What breaks without it for circuit breaking?

**C4. (5, L400)** Design an `AnalysisTemplate` (in words) for Argo Rollouts that auto-aborts a canary if 5xx rate > 1 % for 2 minutes. What metric source, what query, what failure threshold?

---

## Section D — Surviving outages (L300/L400)  [20 pts]

**D1. (5)** State two examples of "intrinsic" and two of "extrinsic" failures. For each, which AKS feature is the primary mitigation?

**D2. (5)** During scenario 6C (Node drain), one Pod stays `Terminating` for 5 minutes. What's the most likely cause and how do you confirm it?

**D3. (5)** Your Front Door fails over to secondary but customer 5xx rate stays elevated for 90 s. What's likely happening and how would you make it 30 s?

**D4. (5, L400)** Walk through a multi-region active-active design for the storefront API. Where does session state live? What's the consistency model? What new failure modes emerge?

---

## Section E — Operations & cost (L300)  [10 pts]

**E1. (5)** A user pool Node fails to scale beyond 5. Where do you look (cluster-autoscaler logs, Azure quota, AKS events) and in what order?

**E2. (5)** Spot pool eviction strategy — which workloads in this repo are safe on spot and which are not? Justify.

---

## L400 extension — Architecture review (bonus, +10 pts)

Revisit your own ADR (Module 00) one week after writing it and write a 1-page self-review:
- One thing you got right and why it matters
- One thing you'd challenge and what alternative you'd propose
- One assumption you didn't surface

This question is the difference between "passed L300" and "earned L400". You can only claim L400 if you complete it **and** correctly answer at least one of C4 or D4.

---

## Submission

```bash
mkdir -p assessment/submissions
$EDITOR assessment/submissions/answers.md
git add . && git commit -m "knowledge check submission"
git push origin HEAD
```

Grade yourself against [`rubric.md`](rubric.md).
