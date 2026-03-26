// ============================================================
//  X Time — Frontend Application
// ============================================================

/* ── API Client ─────────────────────────────────────────── */
const API = {
  base: "",
  token: localStorage.getItem("xt_token") ?? null,

  async request(method, path, body = null) {
    const headers = { "Content-Type": "application/json" };
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(this.base + path, opts);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  },

  get: (p) => API.request("GET", p),
  post: (p, b) => API.request("POST", p, b),
  patch: (p, b) => API.request("PATCH", p, b),
  delete: (p) => API.request("DELETE", p),
};

/* ── State ──────────────────────────────────────────────── */
const state = {
  user: null,
  plans: null,
  integrations: null,
  billing: "monthly",
};

/* ── Toast ──────────────────────────────────────────────── */
function toast(msg, type = "info") {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.className = "toast"; }, 3500);
}

/* ── Navigation ─────────────────────────────────────────── */
function initNav() {
  const nav = document.getElementById("nav");
  const toggle = document.getElementById("mobileToggle");
  const mobileNav = document.getElementById("mobileNav");

  // Scroll effect
  window.addEventListener("scroll", () => {
    if (window.scrollY > 20) {
      nav?.classList.add("scrolled");
    } else {
      nav?.classList.remove("scrolled");
    }
  }, { passive: true });

  // Mobile toggle
  toggle?.addEventListener("click", () => {
    const open = mobileNav?.classList.toggle("open");
    if (toggle) toggle.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
  });

  // Auth buttons
  document.getElementById("nav-login")?.addEventListener("click", (e) => {
    e.preventDefault();
    openAuthModal("login");
  });
  document.getElementById("nav-signup")?.addEventListener("click", (e) => {
    e.preventDefault();
    openAuthModal("signup");
  });
  document.getElementById("hero-cta")?.addEventListener("click", (e) => {
    e.preventDefault();
    openAuthModal("signup");
  });
}

/* ── Hero Terminal Animation ────────────────────────────── */
function initTerminal() {
  const body = document.getElementById("terminalBody");
  const typingCmd = document.getElementById("typingCmd");
  if (!body || !typingCmd) return;

  const commands = [
    {
      cmd: "xtime deploy",
      lines: [
        { cls: "t-info", text: "  Detecting framework..." },
        { cls: "t-ok",   text: "  ✓ SvelteKit detected" },
        { cls: "t-info", text: "  Installing dependencies..." },
        { cls: "t-ok",   text: "  ✓ Done in 4.2s" },
        { cls: "t-info", text: "  Building..." },
        { cls: "t-ok",   text: "  ✓ Build completed (12.1s)" },
        { cls: "t-info", text: "  Deploying to edge network..." },
        { cls: "t-ok",   text: "  ✓ Deployed to 8 regions" },
        { cls: "",        text: "" },
        { cls: "t-accent", text: "  🚀 Live at:" },
        { cls: "t-url",   text: "  https://my-site.xtime.app" },
        { cls: "",        text: "" },
        { cls: "t-info",  text: "  TTFB: 9ms  |  CDN: Active  |  SSL: Valid" },
      ],
    },
    {
      cmd: "xtime project list",
      lines: [
        { cls: "t-info", text: "  Fetching projects..." },
        { cls: "t-ok",   text: "  ✓ 3 projects found" },
        { cls: "",        text: "" },
        { cls: "t-accent", text: "  NAME              STATUS    DOMAIN" },
        { cls: "t-info",  text: "  my-portfolio       Active    my-portfolio.xtime.app" },
        { cls: "t-info",  text: "  api-server         Active    api.myapp.com" },
        { cls: "t-info",  text: "  docs-site          Building  docs.xtime.app" },
      ],
    },
    {
      cmd: "xtime logs --tail",
      lines: [
        { cls: "t-info", text: "  [2025-03-26 09:12:01] GET / 200 9ms" },
        { cls: "t-info", text: "  [2025-03-26 09:12:03] GET /api/v1/health 200 2ms" },
        { cls: "t-ok",   text: "  [2025-03-26 09:12:05] POST /api/v1/deploy 201 8ms" },
        { cls: "t-info", text: "  [2025-03-26 09:12:07] GET /assets/app.js 200 1ms" },
        { cls: "t-warn", text: "  [2025-03-26 09:12:09] POST /api/v1/auth/login 401 3ms" },
        { cls: "t-info", text: "  [2025-03-26 09:12:11] GET /pricing 200 7ms" },
      ],
    },
  ];

  let cmdIdx = 0;

  async function runCommand(cmdObj) {
    // Type command
    typingCmd.textContent = "";
    typingCmd.className = "t-cmd";
    for (const ch of cmdObj.cmd) {
      typingCmd.textContent += ch;
      await sleep(50 + Math.random() * 30);
    }
    await sleep(400);

    // Clear previous output lines (keep first prompt line)
    const existing = [...body.querySelectorAll(".output-line")];
    existing.forEach(el => el.remove());

    // Add output lines
    for (const line of cmdObj.lines) {
      await sleep(120 + Math.random() * 80);
      const div = document.createElement("div");
      div.className = `terminal-line t-output output-line`;
      div.innerHTML = `<span class="${line.cls}">${escapeHtml(line.text)}</span>`;
      body.appendChild(div);
      body.scrollTop = body.scrollHeight;
    }

    // Cursor state
    typingCmd.className = "t-cmd cursor";
    await sleep(3000);
    typingCmd.className = "t-cmd";
  }

  async function loop() {
    while (true) {
      await runCommand(commands[cmdIdx % commands.length]);
      cmdIdx++;
      await sleep(2000);

      // Clear for next command
      body.querySelectorAll(".output-line").forEach(el => el.remove());
      typingCmd.textContent = "";
      await sleep(500);
    }
  }

  setTimeout(() => loop(), 800);
}

/* ── Metrics Counter ────────────────────────────────────── */
function initMetrics() {
  const items = document.querySelectorAll(".metric-value[data-target]");
  if (!items.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseFloat(el.dataset.target);
      const duration = 1500;
      const start = performance.now();
      const startVal = 0;

      function update(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = startVal + (target - startVal) * eased;
        el.textContent = Number.isInteger(target) ? Math.floor(current) : current.toFixed(2);
        if (progress < 1) requestAnimationFrame(update);
      }
      requestAnimationFrame(update);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  items.forEach(el => observer.observe(el));
}

/* ── Chart Bars ─────────────────────────────────────────── */
function initCharts() {
  // Hero analytics chart
  const chartBars = document.getElementById("chartBars");
  if (chartBars) {
    const values = [60, 75, 55, 90, 80, 95, 70];
    values.forEach((v, i) => {
      const bar = document.createElement("div");
      bar.className = "chart-bar" + (i === 5 ? " active" : "");
      bar.style.height = `${v}%`;
      bar.style.animationDelay = `${i * 0.1}s`;
      chartBars.appendChild(bar);
    });
  }

  // Dashboard mock bars
  const mockBars = document.getElementById("mockBars");
  if (mockBars) {
    const vals = [40, 60, 45, 80, 72, 90, 65];
    vals.forEach(v => {
      const b = document.createElement("div");
      b.className = "mock-bar";
      b.style.height = `${v}%`;
      mockBars.appendChild(b);
    });
  }
}

/* ── Integrations Grid ─────────────────────────────────── */
const INTEGRATIONS = [
  { id: "github",      name: "GitHub",       icon: "⎇", cat: "vcs",          connected: true },
  { id: "gitlab",      name: "GitLab",       icon: "🦊", cat: "vcs",          connected: false },
  { id: "slack",       name: "Slack",        icon: "💬", cat: "notification", connected: false },
  { id: "discord",     name: "Discord",      icon: "🎮", cat: "notification", connected: false },
  { id: "stripe",      name: "Stripe",       icon: "💳", cat: "payment",      connected: false },
  { id: "sendgrid",    name: "SendGrid",     icon: "📧", cat: "email",        connected: false },
  { id: "supabase",    name: "Supabase",     icon: "🟢", cat: "database",     connected: false },
  { id: "planetscale", name: "PlanetScale",  icon: "🌐", cat: "database",     connected: false },
  { id: "redis",       name: "Upstash Redis",icon: "🔴", cat: "cache",        connected: false },
  { id: "sentry",      name: "Sentry",       icon: "🐛", cat: "monitoring",   connected: false },
  { id: "datadog",     name: "Datadog",      icon: "🐶", cat: "monitoring",   connected: false },
  { id: "cloudflare",  name: "Cloudflare",   icon: "☁️", cat: "dns",          connected: false },
  { id: "vercel",      name: "Vercel CLI",   icon: "▲",  cat: "deploy",       connected: false },
  { id: "twilio",      name: "Twilio",       icon: "📞", cat: "notification", connected: false },
  { id: "aws-s3",      name: "AWS S3",       icon: "🗄️", cat: "storage",      connected: false },
  { id: "gcp",         name: "Google Cloud", icon: "☁️", cat: "storage",      connected: false },
];

const CAT_LABELS = {
  vcs: "VCS", notification: "通知", payment: "決済",
  database: "DB", monitoring: "監視", dns: "DNS",
  email: "メール", cache: "キャッシュ", storage: "ストレージ", deploy: "デプロイ",
};

function initIntegrations() {
  const grid = document.getElementById("intGrid");
  const cats = document.querySelectorAll(".int-cat");
  if (!grid) return;

  function render(filter = "all") {
    const items = filter === "all" ? INTEGRATIONS : INTEGRATIONS.filter(i => i.cat === filter);
    grid.innerHTML = items.map(i => `
      <div class="int-card ${i.connected ? "connected" : ""}" data-id="${i.id}">
        ${i.connected ? '<div class="int-connected-badge"></div>' : ""}
        <div class="int-card-icon">${i.icon}</div>
        <div class="int-card-name">${i.name}</div>
        <div class="int-card-cat">${CAT_LABELS[i.cat] ?? i.cat}</div>
      </div>
    `).join("");

    grid.querySelectorAll(".int-card").forEach(card => {
      card.addEventListener("click", () => {
        const id = card.dataset.id;
        const int = INTEGRATIONS.find(i => i.id === id);
        if (int) {
          toast(`${int.name} 連携設定を開くにはサインアップが必要です`, "info");
        }
      });
    });
  }

  render();

  cats.forEach(btn => {
    btn.addEventListener("click", () => {
      cats.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      render(btn.dataset.cat);
    });
  });
}

/* ── Pricing ────────────────────────────────────────────── */
const PLAN_FEATURES = {
  free: [
    { label: "プロジェクト 3件", ok: true },
    { label: "帯域幅 100 GB/月", ok: true },
    { label: "ストレージ 1 GB", ok: true },
    { label: "カスタムドメイン 1件", ok: true },
    { label: "SSL / CDN", ok: true },
    { label: "ビルド 500分/月", ok: true },
    { label: "Edge Functions", ok: false },
    { label: "高度なアナリティクス", ok: false },
    { label: "プレビューデプロイ", ok: false },
    { label: "チームメンバー", ok: false },
  ],
  pro: [
    { label: "プロジェクト 20件", ok: true },
    { label: "帯域幅 1 TB/月", ok: true },
    { label: "ストレージ 10 GB", ok: true },
    { label: "カスタムドメイン 10件", ok: true },
    { label: "SSL / CDN", ok: true },
    { label: "ビルド 6,000分/月", ok: true },
    { label: "Edge Functions", ok: true },
    { label: "高度なアナリティクス", ok: true },
    { label: "プレビューデプロイ", ok: true },
    { label: "チームメンバー 5名", ok: true },
  ],
  team: [
    { label: "プロジェクト 無制限", ok: true },
    { label: "帯域幅 5 TB/月", ok: true },
    { label: "ストレージ 100 GB", ok: true },
    { label: "カスタムドメイン 無制限", ok: true },
    { label: "SSL / CDN", ok: true },
    { label: "ビルド 60,000分/月", ok: true },
    { label: "Edge Functions", ok: true },
    { label: "Enterprise アナリティクス", ok: true },
    { label: "SSO", ok: true },
    { label: "SLA 99.99%", ok: true },
  ],
  enterprise: [
    { label: "プロジェクト 無制限", ok: true },
    { label: "帯域幅 カスタム", ok: true },
    { label: "ストレージ カスタム", ok: true },
    { label: "カスタムドメイン 無制限", ok: true },
    { label: "SSL / CDN", ok: true },
    { label: "ビルド 無制限", ok: true },
    { label: "Edge Functions", ok: true },
    { label: "専用サポート", ok: true },
    { label: "オンプレミス対応", ok: true },
    { label: "SLA 99.999%", ok: true },
  ],
};

const PLANS = [
  {
    id: "free", name: "Starter",
    monthly: 0, yearly: 0,
    desc: "個人プロジェクトや学習に最適",
    cta: "無料で始める",
  },
  {
    id: "pro", name: "Pro",
    monthly: 2980, yearly: 2482,
    desc: "フリーランサー・小規模チームに",
    cta: "Proを始める",
    popular: true,
  },
  {
    id: "team", name: "Team",
    monthly: 9800, yearly: 8167,
    desc: "成長中のチーム・スタートアップに",
    cta: "Teamを始める",
  },
  {
    id: "enterprise", name: "Enterprise",
    monthly: null, yearly: null,
    desc: "大企業・カスタム要件に対応",
    cta: "お問い合わせ",
  },
];

function initPricing() {
  const grid = document.getElementById("pricingGrid");
  const toggle = document.getElementById("billingToggle");
  const monthlyLabel = document.getElementById("ptMonthly");
  const yearlyLabel = document.getElementById("ptYearly");
  if (!grid) return;

  function render() {
    const yearly = toggle?.checked;
    if (monthlyLabel) monthlyLabel.style.fontWeight = yearly ? "400" : "700";
    if (yearlyLabel) yearlyLabel.style.fontWeight = yearly ? "700" : "400";

    grid.innerHTML = PLANS.map(plan => {
      const price = yearly ? plan.yearly : plan.monthly;
      const features = PLAN_FEATURES[plan.id] ?? [];

      return `
        <div class="pricing-card ${plan.popular ? "popular" : ""}">
          ${plan.popular ? '<div class="popular-badge">🔥 人気 No.1</div>' : ""}
          <div class="plan-name">${plan.name}</div>
          <div class="plan-price">
            ${price === null
              ? `<span class="plan-price-custom">要見積もり</span>`
              : `<span class="plan-price-amount">¥${price.toLocaleString()}</span><span class="plan-price-unit">/月</span>`
            }
          </div>
          ${yearly && price !== null && price > 0
            ? `<div style="font-size:12px;color:var(--accent-4);margin-bottom:4px">年払いで¥${((plan.monthly - plan.yearly) * 12).toLocaleString()}節約</div>`
            : ""
          }
          <p class="plan-desc">${plan.desc}</p>
          <button class="btn ${plan.popular ? "btn-primary" : "btn-outline"} btn-full plan-cta-btn" data-plan="${plan.id}">
            ${plan.cta}
          </button>
          <hr class="plan-divider" />
          <div class="plan-features">
            ${features.map(f => `
              <div class="plan-feature">
                <span class="${f.ok ? "check" : "cross"}">${f.ok ? "✓" : "✕"}</span>
                <span style="${!f.ok ? "color:var(--text-muted)" : ""}">${f.label}</span>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }).join("");

    grid.querySelectorAll(".plan-cta-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const planId = btn.dataset.plan;
        if (planId === "enterprise") {
          toast("企業向けプランのお問い合わせはhello@xtime.devまで", "info");
        } else {
          openAuthModal("signup");
        }
      });
    });
  }

  render();
  toggle?.addEventListener("change", render);
}

/* ── API Demo Panel ─────────────────────────────────────── */
const API_TABS_CONFIG = {
  health: {
    method: "GET",
    url: "/api/health",
    path: "/api/health",
  },
  projects: {
    method: "GET",
    url: "/api/v1/projects",
    path: "/api/v1/projects",
  },
  deploy: {
    method: "POST",
    url: "/api/v1/projects/proj_abc123/deploy",
    path: "/api/v1/projects/proj_abc123/deploy",
  },
  usage: {
    method: "GET",
    url: "/api/v1/usage?period=7d",
    path: "/api/v1/usage?period=7d",
  },
};

function initApiDemo() {
  const tabs = document.querySelectorAll(".api-tab");
  const urlEl = document.getElementById("apiUrl");
  const runBtn = document.getElementById("runApiBtn");
  const responseEl = document.getElementById("apiRespBody");
  const statusEl = document.getElementById("respStatus");
  const timeEl = document.getElementById("respTime");

  let currentTab = "health";

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentTab = tab.dataset.tab;
      const cfg = API_TABS_CONFIG[currentTab];
      if (urlEl) {
        const m = cfg.method;
        const methodEl = urlEl.closest(".api-req-header")?.querySelector(".method");
        if (methodEl) {
          methodEl.className = `method ${m.toLowerCase()}`;
          methodEl.textContent = m;
        }
        urlEl.textContent = cfg.url;
      }
      if (responseEl) responseEl.textContent = "// ▶ を押してAPIを実行してください";
      if (statusEl) statusEl.textContent = "—";
      if (timeEl) timeEl.textContent = "—";
    });
  });

  runBtn?.addEventListener("click", async () => {
    const cfg = API_TABS_CONFIG[currentTab];
    if (!responseEl || !statusEl || !timeEl) return;

    runBtn.textContent = "読込中...";
    runBtn.disabled = true;
    responseEl.textContent = "// リクエスト送信中...";

    const t0 = performance.now();
    try {
      const method = cfg.method;
      const res = await fetch(cfg.path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "POST" ? JSON.stringify({}) : undefined,
      });
      const elapsed = Math.round(performance.now() - t0);
      const json = await res.json();

      statusEl.textContent = `${res.status} ${res.ok ? "OK" : "Error"}`;
      statusEl.style.color = res.ok ? "var(--accent-4)" : "var(--accent-danger)";
      timeEl.textContent = `${elapsed}ms`;
      responseEl.textContent = JSON.stringify(json, null, 2);
    } catch (err) {
      statusEl.textContent = "Error";
      statusEl.style.color = "var(--accent-danger)";
      timeEl.textContent = "—";
      responseEl.textContent = `// Error: ${err.message}`;
    } finally {
      runBtn.textContent = "▶ 実行";
      runBtn.disabled = false;
    }
  });

  document.getElementById("tryApiBtn")?.addEventListener("click", () => {
    document.getElementById("api-section")?.scrollIntoView({ behavior: "smooth" });
  });
}

/* ── Auth Modal ─────────────────────────────────────────── */
function openAuthModal(mode = "login") {
  const modal = document.getElementById("authModal");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const tabLogin = document.getElementById("tabLogin");
  const tabSignup = document.getElementById("tabSignup");

  if (!modal) return;
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";

  if (mode === "login") {
    loginForm?.classList.remove("hidden");
    signupForm?.classList.add("hidden");
    tabLogin?.classList.add("active");
    tabSignup?.classList.remove("active");
  } else {
    loginForm?.classList.add("hidden");
    signupForm?.classList.remove("hidden");
    tabLogin?.classList.remove("active");
    tabSignup?.classList.add("active");
  }
}

function closeAuthModal() {
  const modal = document.getElementById("authModal");
  if (modal) modal.style.display = "none";
  document.body.style.overflow = "";
}

function initAuthModal() {
  const modal = document.getElementById("authModal");
  const closeBtn = document.getElementById("closeModal");
  const tabLogin = document.getElementById("tabLogin");
  const tabSignup = document.getElementById("tabSignup");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const loginResult = document.getElementById("loginResult");
  const signupResult = document.getElementById("signupResult");

  closeBtn?.addEventListener("click", closeAuthModal);
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeAuthModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAuthModal();
  });

  tabLogin?.addEventListener("click", () => {
    loginForm?.classList.remove("hidden");
    signupForm?.classList.add("hidden");
    tabLogin.classList.add("active");
    tabSignup?.classList.remove("active");
  });

  tabSignup?.addEventListener("click", () => {
    loginForm?.classList.add("hidden");
    signupForm?.classList.remove("hidden");
    tabLogin?.classList.remove("active");
    tabSignup.classList.add("active");
  });

  // Login
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail")?.value;
    const submit = loginForm.querySelector('button[type="submit"]');
    if (submit) { submit.textContent = "ログイン中..."; submit.disabled = true; }

    try {
      const { ok, data } = await API.post("/api/v1/auth/login", { email, password: "demo" });
      if (ok && data.token) {
        API.token = data.token;
        localStorage.setItem("xt_token", data.token);
        state.user = data.user;
        closeAuthModal();
        toast(`ようこそ、${data.user.name}さん！`, "success");
        updateNavForUser(data.user);
      } else {
        if (loginResult) {
          loginResult.textContent = data.error ?? "ログインに失敗しました";
          loginResult.className = "auth-result error";
        }
      }
    } catch {
      if (loginResult) {
        loginResult.textContent = "接続エラーが発生しました";
        loginResult.className = "auth-result error";
      }
    } finally {
      if (submit) { submit.textContent = "ログイン"; submit.disabled = false; }
    }
  });

  // Signup
  signupForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("signupName")?.value;
    const email = document.getElementById("signupEmail")?.value;
    const password = document.getElementById("signupPassword")?.value;
    const submit = signupForm.querySelector('button[type="submit"]');
    if (submit) { submit.textContent = "作成中..."; submit.disabled = true; }

    try {
      const { ok, data } = await API.post("/api/v1/auth/register", { name, email, password });
      if (ok && data.token) {
        API.token = data.token;
        localStorage.setItem("xt_token", data.token);
        state.user = data.user;
        closeAuthModal();
        toast(`アカウントを作成しました！${data.user.name}さん、ようこそ！`, "success");
        updateNavForUser(data.user);
      } else {
        if (signupResult) {
          signupResult.textContent = data.error ?? "登録に失敗しました";
          signupResult.className = "auth-result error";
        }
      }
    } catch {
      if (signupResult) {
        signupResult.textContent = "接続エラーが発生しました";
        signupResult.className = "auth-result error";
      }
    } finally {
      if (submit) { submit.textContent = "無料アカウントを作成"; submit.disabled = false; }
    }
  });

  // Login links in other places
  document.querySelectorAll('[href="#login"]').forEach(a => {
    a.addEventListener("click", (e) => { e.preventDefault(); openAuthModal("login"); });
  });
  document.querySelectorAll('[href="#signup"]').forEach(a => {
    a.addEventListener("click", (e) => { e.preventDefault(); openAuthModal("signup"); });
  });
}

function updateNavForUser(user) {
  const actions = document.querySelector(".nav-actions");
  if (!actions) return;
  actions.innerHTML = `
    <span style="font-size:13px;color:var(--text-secondary)">
      ${user.name}
    </span>
    <span style="padding:4px 10px;background:rgba(124,58,237,0.2);border:1px solid rgba(124,58,237,0.3);border-radius:var(--radius-full);font-size:11px;font-weight:700;color:var(--text-accent);text-transform:uppercase">
      ${user.plan}
    </span>
    <button class="btn btn-ghost" id="logoutBtn">ログアウト</button>
  `;
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await API.post("/api/v1/auth/logout");
    API.token = null;
    localStorage.removeItem("xt_token");
    state.user = null;
    window.location.reload();
  });
}

/* ── Scroll Reveal ──────────────────────────────────────── */
function initScrollReveal() {
  const els = document.querySelectorAll(
    ".feature-card, .step-card, .pricing-card, .testimonial-card, .mock-stat-card, .int-card"
  );

  els.forEach((el, i) => {
    el.classList.add("reveal");
    el.style.transitionDelay = `${(i % 4) * 0.08}s`;
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

  els.forEach(el => observer.observe(el));
}

/* ── Smooth Anchor ──────────────────────────────────────── */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || href === "#" || href.length < 2) return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-height")) || 64;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: "smooth" });
        document.getElementById("mobileNav")?.classList.remove("open");
      }
    });
  });
}

/* ── Terminal Copy ──────────────────────────────────────── */
window.copyTerminal = function () {
  const text = document.getElementById("terminalBody")?.innerText ?? "";
  navigator.clipboard.writeText(text).then(() => toast("コピーしました", "success"));
};

/* ── Particles ──────────────────────────────────────────── */
function initParticles() {
  const container = document.getElementById("particles");
  if (!container) return;

  const count = 30;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    const size = Math.random() * 3 + 1;
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const duration = Math.random() * 20 + 10;
    const delay = Math.random() * -20;

    Object.assign(p.style, {
      position: "absolute",
      width: `${size}px`,
      height: `${size}px`,
      left: `${x}%`,
      top: `${y}%`,
      background: `rgba(${Math.random() > 0.5 ? "124,58,237" : "6,182,212"},${Math.random() * 0.4 + 0.1})`,
      borderRadius: "50%",
      animation: `float-particle ${duration}s ${delay}s linear infinite`,
    });
    container.appendChild(p);
  }

  const style = document.createElement("style");
  style.textContent = `
    @keyframes float-particle {
      0% { transform: translateY(0) scale(1); opacity: 0; }
      10% { opacity: 1; }
      90% { opacity: 1; }
      100% { transform: translateY(-100vh) scale(0.5); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

/* ── Status Check ───────────────────────────────────────── */
async function checkStatus() {
  try {
    const { ok } = await API.get("/api/health");
    if (!ok) {
      const dotEl = document.querySelector(".footer-status .status-dot");
      if (dotEl) dotEl.style.background = "var(--accent-warning)";
    }
  } catch { /* ignore */ }
}

/* ── Helpers ─────────────────────────────────────────────── */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ── Init ────────────────────────────────────────────────── */
function init() {
  initNav();
  initTerminal();
  initMetrics();
  initCharts();
  initIntegrations();
  initPricing();
  initApiDemo();
  initAuthModal();
  initScrollReveal();
  initSmoothScroll();
  initParticles();
  checkStatus();

  // Check if already logged in
  if (API.token) {
    API.get("/api/v1/auth/me").then(({ ok, data }) => {
      if (ok && data.user) {
        state.user = data.user;
        updateNavForUser(data.user);
      }
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
