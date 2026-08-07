/* Lab interactivity: render phases/activities, mode toggle, progress tracking. */
(function () {
  "use strict";

  const STORE_KEY = "sb-lab-progress";
  const MODE_KEY = "sb-lab-mode";
  const POINTS_PER_ACTIVITY = 100;
  const PHASE_BONUS = 250;
  const LEVELS = [
    { name: "Explorer", min: 0 },
    { name: "Practitioner", min: 500 },
    { name: "Builder", min: 1500 },
    { name: "Operator", min: 3000 },
    { name: "Architect", min: 5000 },
  ];
  const phasesEl = document.getElementById("phases");
  const tocEl = document.getElementById("lab-toc");
  const progressFill = document.getElementById("progress-fill");
  const progressLabel = document.getElementById("progress-label");
  const scoreValue = document.getElementById("score-value");
  const scoreLevel = document.getElementById("score-level");
  const scoreNext = document.getElementById("score-next");
  const levelFill = document.getElementById("level-fill");
  const achievementList = document.getElementById("achievement-list");
  const scoreToast = document.getElementById("score-toast");
  const resetDialog = document.getElementById("reset-dialog");

  // ---- state ----
  let done = loadProgress();
  let mode = localStorage.getItem(MODE_KEY) || "self";

  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch { return {}; }
  }
  function saveProgress() { localStorage.setItem(STORE_KEY, JSON.stringify(done)); }

  // ---- helpers ----
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  // inline `code` spans
  const md = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");

  function allActivities() {
    return LAB_DATA.phases.flatMap((p) => p.activities);
  }

  function moduleLabel(m) {
    const map = { Setup: "Setup", Final: "Assessment" };
    return map[m] || ("Module " + m.replace("M", ""));
  }

  // group consecutive activities by module within a phase
  function groupByModule(activities) {
    const groups = [];
    for (const a of activities) {
      const last = groups[groups.length - 1];
      if (last && last.module === a.module) last.items.push(a);
      else groups.push({ module: a.module, items: [a] });
    }
    return groups;
  }

  function progressStats() {
    const activities = allActivities();
    const completed = activities.filter((activity) => done[activity.id]).length;
    const completedPhases = LAB_DATA.phases.filter((phase) =>
      phase.activities.length > 0 && phase.activities.every((activity) => done[activity.id])
    );
    return {
      activities,
      completed,
      completedPhases,
      points: (completed * POINTS_PER_ACTIVITY) + (completedPhases.length * PHASE_BONUS),
    };
  }

  function levelFor(points) {
    let index = LEVELS.length - 1;
    while (index > 0 && points < LEVELS[index].min) index -= 1;
    return { current: LEVELS[index], next: LEVELS[index + 1] || null };
  }

  function achievementsFor(stats) {
    const halfway = Math.ceil(stats.activities.length / 2);
    const resilienceComplete = stats.completedPhases.some((phase) => phase.id === "p4");
    return [
      { id: "first", label: "First Step", detail: "Complete 1 activity", unlocked: stats.completed >= 1 },
      { id: "momentum", label: "Momentum", detail: "Complete 5 activities", unlocked: stats.completed >= 5 },
      { id: "phase", label: "Phase Clear", detail: "Complete a phase", unlocked: stats.completedPhases.length >= 1 },
      { id: "half", label: "Halfway", detail: `Complete ${halfway} activities`, unlocked: stats.completed >= halfway },
      { id: "resilience", label: "Resilience", detail: "Complete the outage phase", unlocked: resilienceComplete },
      { id: "architect", label: "AKS Architect", detail: "Complete the workshop", unlocked: stats.completed === stats.activities.length },
    ];
  }

  function showToast(message) {
    scoreToast.textContent = message;
    scoreToast.classList.remove("show");
    window.requestAnimationFrame(() => scoreToast.classList.add("show"));
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => scoreToast.classList.remove("show"), 2800);
  }

  // ---- render ----
  function render() {
    phasesEl.innerHTML = LAB_DATA.phases.map(renderPhase).join("");
    tocEl.innerHTML = LAB_DATA.phases.map(renderTocItem).join("");
    wireActivities();
    updateProgress();
    applyMode();
  }

  function renderTocItem(p) {
    const total = p.activities.length;
    return `<a href="#${p.id}" class="toc-link" data-phase="${p.id}">
        <span class="toc-name">${esc(p.name)}</span>
        <span class="toc-count" id="toc-count-${p.id}">0/${total}</span>
      </a>`;
  }

  function renderPhase(p) {
    const groups = groupByModule(p.activities);
    return `
    <section class="phase" id="${p.id}">
      <div class="phase-head">
        <h2>${esc(p.name)}</h2>
        <p>${esc(p.blurb)}</p>
        ${p.success ? `<span class="phase-success">${esc(p.success)}</span>` : ""}
        <span class="phase-bonus">+${PHASE_BONUS} XP phase bonus</span>
      </div>
      ${groups.map(renderGroup).join("")}
    </section>`;
  }

  function renderGroup(g) {
    const t = TRAINER[g.module];
    const trainer = t ? `
      <div class="trainer-block" data-trainer>
        <div class="trainer-tag">Trainer · ${esc(moduleLabel(g.module))}</div>
        <p><strong>Talk track.</strong> ${esc(t.talk)}</p>
        <p><strong>Demo cues.</strong> ${esc(t.demo)}</p>
      </div>` : "";
    return `<div class="module-group">
      ${trainer}
      ${g.items.map(renderActivity).join("")}
    </div>`;
  }

  function renderActivity(a) {
    const isDone = !!done[a.id];
    const code = (a.code || []).map((c) => `<pre class="cmd"><code>${esc(c)}</code></pre>`).join("");
    const link = a.link ? `<a class="activity-link" href="${a.link.href}">${esc(a.link.label)}</a>` : "";
    return `
    <article class="activity ${isDone ? "is-done" : ""}" id="act-${a.id}" data-id="${a.id}">
      <div class="activity-head">
        <label class="act-check">
          <input type="checkbox" data-check="${a.id}" ${isDone ? "checked" : ""} aria-label="Mark ${esc(a.id)} done" />
          <span class="checkmark" aria-hidden="true"></span>
        </label>
        <button class="activity-title" data-toggle="${a.id}" aria-expanded="false">
          <span class="act-id">${esc(a.id)}</span>
          <span class="act-name">${esc(a.title)}</span>
          <span class="act-points">+${POINTS_PER_ACTIVITY} XP</span>
          <span class="act-time">${esc(a.time)}</span>
          <span class="act-caret" aria-hidden="true">▸</span>
        </button>
      </div>
      <div class="activity-body" hidden>
        <div class="ab-col ab-precheck" data-reflect>
          <h4>Pre-check <span class="muted">— baseline, be honest: Confident / Fuzzy / No idea</span></h4>
          <ul>${a.precheck.map((q) => `<li>${md(q)}</li>`).join("")}</ul>
        </div>
        <div class="ab-col ab-do">
          <h4>Do</h4>
          <ol>${a.steps.map((s) => `<li>${md(s)}</li>`).join("")}</ol>
          ${code}
          ${link}
        </div>
        <div class="ab-col ab-valid">
          <h4>Validation</h4>
          <p class="valid-line">${md(a.validation)}</p>
        </div>
        <div class="ab-col ab-postcheck" data-reflect>
          <h4>Post-check <span class="muted">— if not "Confident" on every line, flag it before moving on</span></h4>
          <ul>${a.postcheck.map((q) => `<li>${md(q)}</li>`).join("")}</ul>
        </div>
      </div>
    </article>`;
  }

  // ---- wiring ----
  function wireActivities() {
    // expand/collapse
    phasesEl.querySelectorAll("[data-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const body = btn.closest(".activity").querySelector(".activity-body");
        const open = body.hasAttribute("hidden");
        if (open) body.removeAttribute("hidden"); else body.setAttribute("hidden", "");
        btn.setAttribute("aria-expanded", String(open));
        btn.querySelector(".act-caret").textContent = open ? "▾" : "▸";
      });
    });
    // checkboxes
    phasesEl.querySelectorAll("[data-check]").forEach((cb) => {
      cb.addEventListener("change", () => {
        const id = cb.getAttribute("data-check");
        const before = progressStats();
        if (cb.checked) done[id] = true; else delete done[id];
        cb.closest(".activity").classList.toggle("is-done", cb.checked);
        saveProgress();
        updateProgress();
        const after = progressStats();
        if (cb.checked) {
          const phaseBonus = after.completedPhases.length > before.completedPhases.length;
          showToast(phaseBonus ? `+${POINTS_PER_ACTIVITY + PHASE_BONUS} XP · Phase complete` : `+${POINTS_PER_ACTIVITY} XP · Activity complete`);
        }
      });
    });
  }

  function updateProgress() {
    const stats = progressStats();
    const total = stats.activities.length;
    const count = stats.completed;
    const pct = total ? Math.round((count / total) * 100) : 0;
    progressFill.style.width = pct + "%";
    progressFill.parentElement.setAttribute("aria-valuenow", String(pct));
    progressLabel.textContent = `${count} / ${total} done · ${pct}%`;
    scoreValue.textContent = stats.points.toLocaleString();

    const level = levelFor(stats.points);
    scoreLevel.textContent = level.current.name;
    if (level.next) {
      const range = level.next.min - level.current.min;
      const levelPct = Math.round(((stats.points - level.current.min) / range) * 100);
      levelFill.style.width = Math.min(100, Math.max(0, levelPct)) + "%";
      levelFill.parentElement.setAttribute("aria-valuenow", String(levelPct));
      scoreNext.textContent = `${(level.next.min - stats.points).toLocaleString()} XP to ${level.next.name}`;
    } else {
      levelFill.style.width = "100%";
      levelFill.parentElement.setAttribute("aria-valuenow", "100");
      scoreNext.textContent = "Highest level reached";
    }

    achievementList.innerHTML = achievementsFor(stats).map((achievement) => `
      <span class="achievement ${achievement.unlocked ? "unlocked" : ""}" title="${esc(achievement.detail)}" aria-label="${esc(achievement.label)}: ${achievement.unlocked ? "unlocked" : "locked"}">
        <span aria-hidden="true">${achievement.unlocked ? "◆" : "◇"}</span>
        ${esc(achievement.label)}
      </span>`).join("");

    // per-phase counts
    LAB_DATA.phases.forEach((p) => {
      const c = p.activities.filter((a) => done[a.id]).length;
      const el = document.getElementById("toc-count-" + p.id);
      if (el) {
        el.textContent = `${c}/${p.activities.length}`;
        el.classList.toggle("complete", c === p.activities.length && c > 0);
      }
    });
  }

  // ---- mode ----
  function applyMode() {
    const instructor = mode === "instructor";
    document.body.classList.toggle("mode-instructor", instructor);
    document.getElementById("instructor-banner").hidden = !instructor;
    document.querySelectorAll(".seg-btn").forEach((b) => {
      const active = b.dataset.mode === mode;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-selected", String(active));
    });
  }

  document.querySelectorAll(".seg-btn").forEach((b) => {
    b.addEventListener("click", () => {
      mode = b.dataset.mode;
      localStorage.setItem(MODE_KEY, mode);
      applyMode();
    });
  });

  // reset
  document.getElementById("reset-progress").addEventListener("click", () => resetDialog.showModal());
  document.getElementById("confirm-reset").addEventListener("click", () => {
    done = {};
    localStorage.removeItem(STORE_KEY);
    phasesEl.querySelectorAll("[data-check]").forEach((cb) => {
      cb.checked = false;
      cb.closest(".activity").classList.remove("is-done");
    });
    updateProgress();
    showToast("Progress reset · Ready to start again");
  });

  // back to top + active TOC on scroll
  const toTop = document.getElementById("to-top");
  window.addEventListener("scroll", () => {
    toTop.classList.toggle("show", window.scrollY > 600);
    let activeId = LAB_DATA.phases[0].id;
    for (const p of LAB_DATA.phases) {
      const sec = document.getElementById(p.id);
      if (sec && sec.getBoundingClientRect().top <= 120) activeId = p.id;
    }
    tocEl.querySelectorAll(".toc-link").forEach((l) =>
      l.classList.toggle("active", l.dataset.phase === activeId)
    );
  });
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  render();
})();
