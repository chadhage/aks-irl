// Shared navigation drawer behavior for the microsite and lab guide.
(function () {
  "use strict";

  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.getElementById("nav-links");
  const navBackdrop = document.querySelector(".nav-backdrop");
  if (!navToggle || !navLinks || !navBackdrop) return;

  function setNavOpen(open, restoreFocus = false) {
    navLinks.classList.toggle("is-open", open);
    navBackdrop.classList.toggle("is-open", open);
    navLinks.toggleAttribute("inert", !open);
    navLinks.setAttribute("aria-hidden", String(!open));
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    document.body.classList.toggle("nav-drawer-open", open);
    if (open) {
      requestAnimationFrame(() => navLinks.querySelector("a")?.focus());
    } else if (restoreFocus) {
      navToggle.focus();
    }
  }

  navToggle.addEventListener("click", () => {
    setNavOpen(navToggle.getAttribute("aria-expanded") !== "true", true);
  });
  navBackdrop.addEventListener("click", () => setNavOpen(false, true));
  navLinks.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setNavOpen(false)));

  document.addEventListener("keydown", (event) => {
    if (navToggle.getAttribute("aria-expanded") !== "true") return;
    if (event.key === "Escape") {
      event.preventDefault();
      setNavOpen(false, true);
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [navToggle, ...navLinks.querySelectorAll("a")];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
})();