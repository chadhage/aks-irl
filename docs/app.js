// ---------- Module data (sourced from the repo's module READMEs) ----------
const MODULES = [
  {
    num: "00",
    title: "Envisioning & Architecture Decisions",
    time: "~45 min",
    group: "build",
    accent: "#38bdf8",
    desc: "Agree the shape of the target before anyone runs terraform apply. Defend the 9 Day-0 AKS decisions and write SLIs/SLOs for a socket workload, then commit an ADR both teams sign.",
    tags: ["ADR", "Day-0 decisions", "SLOs"],
    level: "L300 · L400",
  },
  {
    num: "01",
    title: "Platform Foundation",
    time: "~60 min",
    group: "build",
    accent: "#38bdf8",
    desc: "Stand up the hub-spoke network across two regions with Terraform and OIDC, plus a private zone-redundant AKS cluster in each region, ACR, Key Vault, and observability.",
    tags: ["Terraform", "Hub-spoke", "OIDC"],
    level: "L300",
  },
  {
    num: "02",
    title: "Cluster Hardening & Identity",
    time: "~45 min",
    group: "build",
    accent: "#38bdf8",
    desc: "Reach the private API server, federate a User-Assigned Managed Identity per workload to its ServiceAccount, and connect to PostgreSQL with no shared passwords.",
    tags: ["Workload Identity", "Key Vault CSI", "Istio"],
    level: "L300",
  },
  {
    num: "03",
    title: "MVP Go-Live",
    time: "~90 min",
    group: "build",
    accent: "#34d399",
    desc: "Build and push the three images, wire up GitOps with Argo CD, and bring up the first live socket session through the StatefulSet gateway, KEDA-scaled parser, and ops console.",
    tags: ["GitOps", "StatefulSet", "First socket"],
    level: "L300",
  },
  {
    num: "04",
    title: "A/B Testing Parser Versions",
    time: "~75 min",
    group: "release",
    accent: "#34d399",
    desc: "Run parser-cpp v1 and v2 side-by-side as Istio subsets. Shift traffic by weight, switch to header-based cohort routing, compare RTT in Grafana, and cut back to 100% v1 in under 30 seconds.",
    tags: ["Istio routing", "Canary", "Kill switch"],
    level: "L300",
  },
  {
    num: "05",
    title: "Deployment Rings & Gated Promotion",
    time: "~80 min",
    group: "release",
    accent: "#34d399",
    desc: "Flow a change dev → canary automatically, open a prod-promotion PR after canary smoke, approve via GitHub Environments, manually sync ring-prod in Argo, and roll back two ways.",
    tags: ["dev→canary→prod", "PR gate", "Rollback"],
    level: "L300",
  },
  {
    num: "06",
    title: "Intrinsic Outage",
    time: "~90 min",
    group: "resilience",
    accent: "#fbbf24",
    desc: "Against live socket traffic: kill parser Pods in a loop, roll out and roll back a broken parser, and drain an entire zone of gateway Pods — keeping RTT inside SLO through every scenario.",
    tags: ["Pod kill", "Zone drain", "PDB"],
    level: "L300 · L400",
  },
  {
    num: "07",
    title: "Extrinsic Outage & Failover",
    time: "~90 min",
    group: "resilience",
    accent: "#fbbf24",
    desc: "Bootstrap the secondary cluster, move active sockets to westus3 by swapping DNS, quantify RTO and RPO, then recover to primary once Postgres replication lag drains. RTO ≤ 30 min, RPO ≤ 1 min.",
    tags: ["Cross-region", "RTO/RPO", "DNS cutover"],
    level: "L300",
  },
  {
    num: "08",
    title: "Optimization",
    time: "~45 min",
    group: "resilience",
    accent: "#c084fc",
    desc: "Right-size gateway and parser requests from real Grafana data, run the batch reconciler on spot nodes, scale the parser 0→N→0 with KEDA, and tune the gateway without triggering a reconnect storm.",
    tags: ["Right-size", "Spot", "KEDA"],
    level: "L300 · L400",
  },
];

// ---------- Render modules ----------
const grid = document.getElementById("modules-grid");
if (grid) {
  grid.innerHTML = MODULES.map(
    (m) => `
    <article class="module-card reveal" data-group="${m.group}" style="--card-accent:${m.accent}">
      <span class="module-level"><span class="pill">${m.level}</span></span>
      <div class="module-top">
        <span class="module-num">${m.num}</span>
        <span class="module-time">${m.time}</span>
      </div>
      <h3>${m.title}</h3>
      <p>${m.desc}</p>
      <div class="module-tags">
        ${m.tags.map((t) => `<span class="module-tag">${t}</span>`).join("")}
      </div>
    </article>`
  ).join("");
}

// ---------- Module filtering ----------
const chips = document.querySelectorAll(".chip");
chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    chips.forEach((c) => c.classList.remove("is-active"));
    chip.classList.add("is-active");
    const filter = chip.dataset.filter;
    document.querySelectorAll(".module-card").forEach((card) => {
      const show = filter === "all" || card.dataset.group === filter;
      card.classList.toggle("is-hidden", !show);
    });
  });
});

// ---------- Theme toggle ----------
const themeToggle = document.getElementById("theme-toggle");
const root = document.documentElement;
const stored = localStorage.getItem("sb-theme");
if (stored === "light") root.setAttribute("data-theme", "light");
function syncMermaidTheme() {
  return root.getAttribute("data-theme") === "light" ? "default" : "dark";
}
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const isLight = root.getAttribute("data-theme") === "light";
    if (isLight) {
      root.removeAttribute("data-theme");
      localStorage.setItem("sb-theme", "dark");
    } else {
      root.setAttribute("data-theme", "light");
      localStorage.setItem("sb-theme", "light");
    }
  });
}

// ---------- Mermaid ----------
if (window.mermaid) {
  mermaid.initialize({
    startOnLoad: true,
    theme: syncMermaidTheme(),
    securityLevel: "strict",
    flowchart: { curve: "basis", useMaxWidth: true },
  });
}

// ---------- Reveal on scroll ----------
const revealEls = () => document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  // tag sections + cards for reveal
  document
    .querySelectorAll(".section-head, .scenario-grid, .legacy-target, .diagram-wrap, .move, .delivery-card, .role, .success-criteria, .table-wrap")
    .forEach((el) => el.classList.add("reveal"));
  revealEls().forEach((el) => io.observe(el));
} else {
  revealEls().forEach((el) => el.classList.add("is-visible"));
}
