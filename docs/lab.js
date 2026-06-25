/* Lab interactivity: render phases/activities, mode toggle, progress tracking. */
(function () {
  "use strict";

  const STORE_KEY = "sb-lab-progress";
  const MODE_KEY = "sb-lab-mode";
  const phasesEl = document.getElementById("phases");
  const tocEl = document.getElementById("lab-toc");
  const progressFill = document.getElementById("progress-fill");
  const progressLabel = document.getElementById("progress-label");

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
        ${p.success ? `<span class="phase-success">🏁 ${esc(p.success)}</span>` : ""}
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
        if (cb.checked) done[id] = true; else delete done[id];
        cb.closest(".activity").classList.toggle("is-done", cb.checked);
        saveProgress();
        updateProgress();
      });
    });
  }

  function updateProgress() {
    const all = allActivities();
    const total = all.length;
    const count = all.filter((a) => done[a.id]).length;
    const pct = total ? Math.round((count / total) * 100) : 0;
    progressFill.style.width = pct + "%";
    progressLabel.textContent = `${count} / ${total} done · ${pct}%`;
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
  document.getElementById("reset-progress").addEventListener("click", () => {
    if (confirm("Clear all saved lab progress in this browser?")) {
      done = {};
      saveProgress();
      phasesEl.querySelectorAll("[data-check]").forEach((cb) => { cb.checked = false; cb.closest(".activity").classList.remove("is-done"); });
      updateProgress();
    }
  });

  // mobile nav
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.getElementById("nav-links");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      const open = navLinks.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(open));
    });
  }

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
