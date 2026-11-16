/* ============ CreditSense · script.js ============ */

// Same-origin by default (FastAPI serves this page). When the HTML is opened from
// a file or a dev server on another port, fall back to a local API.
const API_BASE = (() => {
  if (window.API_BASE) return window.API_BASE;
  const { protocol, hostname, port } = location;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  if (protocol === "file:" || (isLocal && port && port !== "8000")) return "http://127.0.0.1:8000";
  return "";
})();

const $ = (id) => document.getElementById(id);
const form = $("loan-form");
const btn = $("submit-btn");
const toast = $("toast");

/* ---------------- background particles ---------------- */
(function particles() {
  const canvas = $("bg-canvas");
  const ctx = canvas.getContext("2d");
  let w, h, dots;
  const mouse = { x: -999, y: -999 };

  function resize() {
    w = canvas.width = innerWidth;
    h = canvas.height = innerHeight;
    const count = Math.min(90, Math.floor((w * h) / 17000));
    dots = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.6 + 0.6,
    }));
  }
  addEventListener("resize", resize);
  addEventListener("mousemove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
  resize();

  function frame() {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < dots.length; i++) {
      const a = dots[i];
      a.x += a.vx; a.y += a.vy;
      if (a.x < 0 || a.x > w) a.vx *= -1;
      if (a.y < 0 || a.y > h) a.vy *= -1;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(160,170,255,0.6)";
      ctx.fill();
      for (let j = i + 1; j < dots.length; j++) {
        const b = dots[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 130) {
          ctx.strokeStyle = `rgba(124,92,255,${0.16 * (1 - d / 130)})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      const md = Math.hypot(a.x - mouse.x, a.y - mouse.y);
      if (md < 160) {
        ctx.strokeStyle = `rgba(34,211,238,${0.35 * (1 - md / 160)})`;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
      }
    }
    requestAnimationFrame(frame);
  }
  frame();
})();

/* ---------------- 3D tilt + spotlight on cards ---------------- */
document.querySelectorAll(".tilt, .result").forEach((card) => {
  card.addEventListener("mousemove", (e) => {
    const r = card.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    card.style.setProperty("--mx", `${x}px`);
    card.style.setProperty("--my", `${y}px`);
    if (card.classList.contains("tilt")) {
      const rx = ((y / r.height) - 0.5) * -3, ry = ((x / r.width) - 0.5) * 3;
      card.style.transform = `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    }
  });
  card.addEventListener("mouseleave", () => { card.style.transform = ""; });
});

/* ---------------- default-on-file toggle ---------------- */
const toggle = $("default-toggle");
let defaultValue = "N";
function setDefault(v) {
  defaultValue = v;
  toggle.classList.toggle("yes", v === "Y");
  toggle.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.value === v));
}
toggle.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (b) setDefault(b.dataset.value);
});

/* ---------------- loan % income auto-calc ---------------- */
let percentDirty = false;
$("loan_percent_income").addEventListener("input", () => { percentDirty = true; });
function autoPercent() {
  if (percentDirty) return;
  const inc = parseFloat($("person_income").value), amt = parseFloat($("loan_amnt").value);
  if (inc > 0 && amt >= 0) $("loan_percent_income").value = (amt / inc).toFixed(2);
}
$("person_income").addEventListener("input", autoPercent);
$("loan_amnt").addEventListener("input", autoPercent);

/* ---------------- sample data ---------------- */
const SAMPLES = {
  low: { person_age: 35, person_income: 85000, person_home_ownership: "OWN", person_emp_length: 10, loan_intent: "EDUCATION", loan_grade: "A", loan_amnt: 8000, loan_int_rate: 7.5, loan_percent_income: 0.09, cb_person_default_on_file: "N", cb_person_cred_hist_length: 10 },
  high: { person_age: 22, person_income: 22000, person_home_ownership: "RENT", person_emp_length: 1, loan_intent: "MEDICAL", loan_grade: "F", loan_amnt: 15000, loan_int_rate: 19.5, loan_percent_income: 0.68, cb_person_default_on_file: "Y", cb_person_cred_hist_length: 2 },
};
document.querySelectorAll(".chip").forEach((chip) =>
  chip.addEventListener("click", () => {
    const s = SAMPLES[chip.dataset.sample];
    Object.entries(s).forEach(([k, v]) => { if (k !== "cb_person_default_on_file") $(k).value = v; });
    setDefault(s.cb_person_default_on_file);
    percentDirty = true;
    form.querySelectorAll(".field").forEach((f) => f.classList.remove("invalid"));
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    showToast("Sample loaded — hit “Analyze Risk”", "info");
  })
);

/* ---------------- helpers ---------------- */
let toastTimer;
function showToast(msg, type = "error", ms = 4200) {
  toast.textContent = msg;
  toast.className = `toast show ${type === "info" ? "info" : ""}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.className = "toast"), ms);
}

function collect() {
  const num = (id) => parseFloat($(id).value);
  const int = (id) => Math.round(parseFloat($(id).value));
  return {
    person_age: int("person_age"),
    person_income: num("person_income"),
    person_home_ownership: $("person_home_ownership").value,
    person_emp_length: int("person_emp_length"),
    loan_intent: $("loan_intent").value,
    loan_grade: $("loan_grade").value,
    loan_amnt: num("loan_amnt"),
    loan_int_rate: num("loan_int_rate"),
    loan_percent_income: num("loan_percent_income"),
    cb_person_default_on_file: defaultValue,
    cb_person_cred_hist_length: int("cb_person_cred_hist_length"),
  };
}

function validate() {
  let ok = true;
  form.querySelectorAll("input[required], select[required]").forEach((el) => {
    const bad = el.value === "" || (el.type === "number" && isNaN(parseFloat(el.value)));
    el.closest(".field").classList.toggle("invalid", bad);
    if (bad) ok = false;
  });
  return ok;
}
form.addEventListener("input", (e) => e.target.closest(".field")?.classList.remove("invalid"));

/* ---------------- gauge animation ---------------- */
const ARC = 251.33;
const easeOut = (t) => 1 - Math.pow(1 - t, 4);

function animateGauge(prob, threshold) {
  const fill = $("gauge-fill"), needle = $("needle"), num = $("prob-num");
  $("threshold-marker").setAttribute("transform", `rotate(${threshold * 180 - 90} 100 100)`);
  const start = performance.now(), dur = 1600;
  (function step(now) {
    const t = Math.min((now - start) / dur, 1), p = prob * easeOut(t);
    fill.style.strokeDashoffset = ARC * (1 - p);
    needle.setAttribute("transform", `rotate(${p * 180 - 90} 100 100)`);
    num.textContent = (p * 100).toFixed(1);
    if (t < 1) requestAnimationFrame(step);
  })(start);
}

function showResult(res) {
  const card = $("result-card");
  const high = res.default_prediction === 1;
  $("placeholder").classList.add("hidden");
  const out = $("output");
  out.classList.remove("hidden");
  out.style.animation = "none"; void out.offsetWidth; out.style.animation = "";

  card.classList.remove("safe", "danger");
  card.classList.add(high ? "danger" : "safe");

  const badge = $("badge");
  badge.textContent = high ? "⚠ High Risk" : "✓ Low Risk";
  badge.className = `badge ${high ? "high" : "low"}`;

  $("thr-val").textContent = (res.threshold * 100).toFixed(1) + "%";
  $("pred-val").textContent = high ? "Likely default" : "Likely repay";
  $("verdict").textContent = high
    ? "The estimated default probability is above the model's decision threshold. Consider a lower loan amount, a co-signer, or additional verification."
    : "The estimated default probability is below the model's decision threshold. This profile looks like a comparatively safe borrower.";

  animateGauge(res.default_probability, res.threshold);
  if (innerWidth < 960) card.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------------- submit ---------------- */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validate()) return showToast("Please fill in all the highlighted fields.");

  btn.classList.add("loading");
  btn.querySelector(".btn-text").textContent = "Analyzing…";
  const wakeTimer = setTimeout(() => showToast("Server is waking up (free tier) — hang tight…", "info", 9000), 4000);

  try {
    const resp = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(collect()),
    });
    if (!resp.ok) {
      let detail = `Server error (${resp.status})`;
      try {
        const j = await resp.json();
        if (Array.isArray(j.detail)) detail = j.detail.map((d) => `${d.loc?.slice(-1)[0]}: ${d.msg}`).join(" · ");
        else if (j.detail) detail = j.detail;
      } catch (_) {}
      throw new Error(detail);
    }
    showResult(await resp.json());
  } catch (err) {
    showToast(err.message === "Failed to fetch" ? "Couldn't reach the API. Is the server running?" : err.message, "error", 6000);
  } finally {
    clearTimeout(wakeTimer);
    btn.classList.remove("loading");
    btn.querySelector(".btn-text").textContent = "Analyze Risk";
  }
});
