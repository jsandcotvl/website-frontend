/* ==========================================================================
   JS & CO — main.js
   Navbar, reveal animations, reviews (fetch/POST), service enquiry preselect,
   contact form via EmailJS.
   ========================================================================== */
(function () {
  "use strict";

  const CONFIG = window.JS_CO_CONFIG || {};
  const API_BASE = (CONFIG.API_BASE_URL || "").replace(/\/$/, "");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- Footer year ---------------- */
  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------------- Navbar scroll state ---------------- */
  const nav = document.getElementById("mainNav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------------- Mobile drawer ---------------- */
  const drawer = document.getElementById("mobileDrawer");
  const backdrop = document.getElementById("drawerBackdrop");
  const navToggle = document.getElementById("navToggle");
  const drawerClose = document.getElementById("drawerClose");

  function openDrawer() {
    drawer.classList.add("open");
    backdrop.hidden = false;
    requestAnimationFrame(() => backdrop.classList.add("show"));
    document.body.classList.add("drawer-open");
    navToggle.setAttribute("aria-expanded", "true");
    drawer.setAttribute("aria-hidden", "false");
    drawerClose.focus();
  }
  function closeDrawer() {
    if (!drawer.classList.contains("open")) return;
    drawer.classList.remove("open");
    backdrop.classList.remove("show");
    document.body.classList.remove("drawer-open");
    navToggle.setAttribute("aria-expanded", "false");
    drawer.setAttribute("aria-hidden", "true");
    setTimeout(() => { backdrop.hidden = true; }, 320);
    navToggle.focus();
  }
  navToggle.addEventListener("click", openDrawer);
  drawerClose.addEventListener("click", closeDrawer);
  backdrop.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });
  drawer.querySelectorAll(".drawer-link, .drawer-foot a").forEach((a) =>
    a.addEventListener("click", () => {
      closeDrawer();
      navToggle.blur();
    })
  );

  /* ---------------- Scrollspy ---------------- */
  const sections = document.querySelectorAll("header[id], section[id]");
  const navLinks = document.querySelectorAll("#mainNav .nav-link, .mobile-drawer .drawer-link");
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          navLinks.forEach((l) =>
            l.classList.toggle("active", l.getAttribute("href") === "#" + e.target.id)
          );
        }
      });
    },
    { rootMargin: "-40% 0px -55% 0px" }
  );
  sections.forEach((s) => spy.observe(s));

  /* ---------------- Reveal on scroll ---------------- */
  if (!prefersReducedMotion) {
    const revealObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            revealObs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach((el) => revealObs.observe(el));
  } else {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("visible"));
  }

  /* ---------------- Service enquiry buttons → preselect in contact form ---------------- */
  const serviceSelect = document.getElementById("serviceSelect");
  document.querySelectorAll(".btn-enquire").forEach((btn) => {
    btn.addEventListener("click", () => {
      const service = btn.dataset.service || "";
      const target = document.getElementById("contact");
      // Match option by text (entities decoded by the browser)
      const match = Array.from(serviceSelect.options).find(
        (o) => o.text.replace(/\s+/g, " ").trim() === service.replace(/\s+/g, " ").trim()
      );
      serviceSelect.value = match ? match.value || match.text : "Other / General Enquiry";
      target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
      setTimeout(() => document.getElementById("cName").focus({ preventScroll: true }), 650);
    });
  });

  /* ---------------- Reviews ---------------- */
  const reviewsList = document.getElementById("reviewsList");
  const elLoading = document.getElementById("reviewsLoading");
  const elEmpty = document.getElementById("reviewsEmpty");
  const elError = document.getElementById("reviewsError");

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  function renderStars(rating) {
    const full = "★".repeat(rating);
    const empty = "☆".repeat(5 - rating);
    return `<span class="review-stars" aria-label="${rating} out of 5 stars">${full}${empty}</span>`;
  }

  async function loadReviews() {
    elLoading.classList.remove("d-none");
    elError.classList.add("d-none");
    elEmpty.classList.add("d-none");
    reviewsList.innerHTML = "";
    try {
      const res = await fetch(`${API_BASE}/api/reviews`);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const reviews = await res.json();
      elLoading.classList.add("d-none");
      if (!Array.isArray(reviews) || reviews.length === 0) {
        elEmpty.classList.remove("d-none");
        return;
      }
      reviewsList.innerHTML = reviews
        .map((r) => {
          const d = new Date(r.date || r.createdAt);
          const dateStr = isNaN(d) ? "" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
          return `
          <div class="col-md-6 col-lg-4 reveal visible">
            <div class="review-card">
              ${renderStars(Number(r.rating) || 0)}
              <p class="review-text">&ldquo;${esc(r.message)}&rdquo;</p>
              <div class="review-meta">
                <span class="name">${esc(r.name)}</span>
                <span class="date">${esc(dateStr)}</span>
              </div>
            </div>
          </div>`;
        })
        .join("");
    } catch (err) {
      elLoading.classList.add("d-none");
      elError.classList.remove("d-none");
    }
  }
  loadReviews();

  /* ---- Review form (published immediately) ---- */
  const reviewForm = document.getElementById("reviewForm");
  const reviewBtn = document.getElementById("reviewSubmitBtn");
  const reviewAlert = document.getElementById("reviewFormAlert");

  function showAlert(el, type, msg) {
    el.className = "alert alert-" + type;
    el.textContent = msg;
    el.classList.remove("d-none");
    el.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "nearest" });
  }

  reviewForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    reviewAlert.classList.add("d-none");
    if (!reviewForm.checkValidity()) {
      reviewForm.reportValidity();
      return;
    }
    reviewBtn.disabled = true;
    reviewBtn.querySelector(".spinner-border").classList.remove("d-none");
    reviewBtn.querySelector(".btn-label").textContent = "Submitting…";
    try {
      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: document.getElementById("revName").value.trim(),
          rating: Number(document.getElementById("revRating").value),
          message: document.getElementById("revMessage").value.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Submission failed");
      reviewForm.reset();
      await loadReviews();
      showAlert(reviewAlert, "success", "Thank you! Your review has been published.");
    } catch (err) {
      showAlert(reviewAlert, "danger", err.message || "Could not submit your review. Please try again later.");
    } finally {
      reviewBtn.disabled = false;
      reviewBtn.querySelector(".spinner-border").classList.add("d-none");
      reviewBtn.querySelector(".btn-label").textContent = "Submit Review";
    }
  });

  /* ---------------- Contact form via EmailJS ---------------- */
  const contactForm = document.getElementById("contactForm");
  const contactBtn = document.getElementById("contactSubmitBtn");
  const contactAlert = document.getElementById("contactFormAlert");

  const emailjsReady =
    CONFIG.EMAILJS_PUBLIC_KEY && !CONFIG.EMAILJS_PUBLIC_KEY.includes("YOUR_") &&
    CONFIG.EMAILJS_SERVICE_ID && !CONFIG.EMAILJS_SERVICE_ID.includes("YOUR_") &&
    CONFIG.EMAILJS_TEMPLATE_ID && !CONFIG.EMAILJS_TEMPLATE_ID.includes("YOUR_");

  if (emailjsReady) {
    emailjs.init({ publicKey: CONFIG.EMAILJS_PUBLIC_KEY });
  }

  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    contactAlert.classList.add("d-none");
    if (!contactForm.checkValidity()) {
      contactForm.reportValidity();
      return;
    }
    if (!emailjsReady) {
      showAlert(contactAlert, "warning",
        "EmailJS is not configured yet. Please add your EmailJS keys in js/config.js, or contact us directly at jsandco.tvl@gmail.com / +91 94427 77862.");
      return;
    }
    contactBtn.disabled = true;
    contactBtn.querySelector(".spinner-border").classList.remove("d-none");
    contactBtn.querySelector(".btn-label").textContent = "Sending…";
    try {
      await emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_ID, {
        from_name: document.getElementById("cName").value.trim(),
        from_email: document.getElementById("cEmail").value.trim(),
        phone: document.getElementById("cPhone").value.trim(),
        service: document.getElementById("serviceSelect").value,
        subject: document.getElementById("cSubject").value.trim(),
        message: document.getElementById("cMessage").value.trim(),
      });
      contactForm.reset();
      showAlert(contactAlert, "success", "Thank you! Your enquiry has been sent. We will get back to you shortly.");
    } catch (err) {
      showAlert(contactAlert, "danger", "Sorry, your message could not be sent. Please try again or reach us by phone/WhatsApp.");
    } finally {
      contactBtn.disabled = false;
      contactBtn.querySelector(".spinner-border").classList.add("d-none");
      contactBtn.querySelector(".btn-label").textContent = "Send Enquiry";
    }
  });
})();
