// ============================================================
//  X Time — Server API Routes (Production Design)
// ============================================================

import crypto from "node:crypto";

// ─── In-Memory Data Store (本番ではDB接続に置換) ───────────────

const db = {
  users: new Map(),
  sessions: new Map(),
  projects: new Map(),
  deployments: new Map(),
  apiKeys: new Map(),
  integrations: new Map(),
  domains: new Map(),
  usage: new Map(),
};

// Seed data
const seedUserId = "usr_demo123";
const seedUser = {
  id: seedUserId,
  email: "demo@xtime.dev",
  name: "Demo User",
  plan: "pro",
  createdAt: new Date("2024-01-01").toISOString(),
  avatar: null,
};
db.users.set(seedUserId, seedUser);

const seedProjectId = "proj_abc123";
db.projects.set(seedProjectId, {
  id: seedProjectId,
  userId: seedUserId,
  name: "My Portfolio",
  slug: "my-portfolio",
  framework: "svelte",
  status: "active",
  domain: "my-portfolio.xtime.app",
  customDomain: null,
  region: "ap-northeast-1",
  createdAt: new Date("2024-01-15").toISOString(),
  updatedAt: new Date().toISOString(),
  envVars: {},
  buildCommand: "npm run build",
  outputDir: "dist",
  deployments: [],
  ssl: true,
  cdn: true,
  lastDeployedAt: new Date().toISOString(),
});

const seedApiKeyId = "key_xyz789";
db.apiKeys.set(seedApiKeyId, {
  id: seedApiKeyId,
  userId: seedUserId,
  name: "Production Key",
  key: "xt_live_demo_key_placeholder",
  permissions: ["read", "write", "deploy"],
  createdAt: new Date("2024-01-20").toISOString(),
  lastUsed: new Date().toISOString(),
  rateLimit: 1000,
});

// ─── Utility helpers ────────────────────────────────────────

function genId(prefix = "id") {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key");
}

function requireAuth(ctx) {
  const auth = ctx.req.headers["authorization"] ?? "";
  const apiKey = ctx.req.headers["x-api-key"] ?? "";

  if (auth.startsWith("Bearer ")) {
    const token = auth.slice(7);
    const session = db.sessions.get(token);
    if (session && session.expiresAt > Date.now()) {
      return db.users.get(session.userId) ?? null;
    }
  }

  if (apiKey) {
    for (const [, k] of db.apiKeys) {
      if (k.key === apiKey) {
        return db.users.get(k.userId) ?? null;
      }
    }
  }

  return null;
}

function paginate(items, page = 1, limit = 20) {
  const start = (page - 1) * limit;
  const data = items.slice(start, start + limit);
  return {
    data,
    meta: { total: items.length, page, limit, pages: Math.ceil(items.length / limit) },
  };
}

// ─── Routes ─────────────────────────────────────────────────

export const routes = [

  // ── OPTIONS preflight ──────────────────────────────────────
  {
    method: "OPTIONS",
    path: "/api/:any",
    handler: (ctx) => {
      cors(ctx.res);
      ctx.sendJson(204, {});
    },
  },

  // ── System ────────────────────────────────────────────────
  {
    method: "GET",
    path: "/api/health",
    handler: (ctx) => {
      cors(ctx.res);
      ctx.sendJson(200, {
        status: "ok",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: { database: "ok", storage: "ok", cdn: "ok", email: "ok" },
      });
    },
  },

  {
    method: "GET",
    path: "/api/v1/status",
    handler: (ctx) => {
      cors(ctx.res);
      ctx.sendJson(200, {
        incidents: [],
        components: [
          { name: "API Gateway", status: "operational" },
          { name: "Hosting Network", status: "operational" },
          { name: "CDN", status: "operational" },
          { name: "DNS", status: "operational" },
          { name: "Storage", status: "operational" },
          { name: "Edge Functions", status: "operational" },
        ],
        uptime99: "99.98%",
      });
    },
  },

  // ── Auth ──────────────────────────────────────────────────
  {
    method: "POST",
    path: "/api/v1/auth/register",
    handler: async (ctx) => {
      cors(ctx.res);
      const body = await ctx.json();
      const { email, password, name } = body;

      if (!email || !password || !name) {
        ctx.sendJson(400, { error: "Missing required fields" });
        return;
      }

      for (const [, u] of db.users) {
        if (u.email === email) {
          ctx.sendJson(409, { error: "Email already registered" });
          return;
        }
      }

      const userId = genId("usr");
      const user = {
        id: userId,
        email,
        name,
        plan: "free",
        createdAt: new Date().toISOString(),
        avatar: null,
      };
      db.users.set(userId, user);

      const token = crypto.randomBytes(32).toString("hex");
      db.sessions.set(token, {
        userId,
        createdAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      ctx.sendJson(201, {
        user: { id: user.id, email: user.email, name: user.name, plan: user.plan },
        token,
        expiresIn: 604800,
      });
    },
  },

  {
    method: "POST",
    path: "/api/v1/auth/login",
    handler: async (ctx) => {
      cors(ctx.res);
      const body = await ctx.json();
      const { email } = body;

      let foundUser = null;
      for (const [, u] of db.users) {
        if (u.email === email) { foundUser = u; break; }
      }

      if (!foundUser) {
        // demo: accept any credentials
        foundUser = seedUser;
      }

      const token = crypto.randomBytes(32).toString("hex");
      db.sessions.set(token, {
        userId: foundUser.id,
        createdAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      ctx.sendJson(200, {
        user: { id: foundUser.id, email: foundUser.email, name: foundUser.name, plan: foundUser.plan },
        token,
        expiresIn: 604800,
      });
    },
  },

  {
    method: "POST",
    path: "/api/v1/auth/logout",
    handler: async (ctx) => {
      cors(ctx.res);
      const auth = ctx.req.headers["authorization"] ?? "";
      if (auth.startsWith("Bearer ")) {
        db.sessions.delete(auth.slice(7));
      }
      ctx.sendJson(200, { message: "Logged out" });
    },
  },

  {
    method: "GET",
    path: "/api/v1/auth/me",
    handler: (ctx) => {
      cors(ctx.res);
      const user = requireAuth(ctx);
      if (!user) { ctx.sendJson(401, { error: "Unauthorized" }); return; }
      ctx.sendJson(200, { user: { id: user.id, email: user.email, name: user.name, plan: user.plan, createdAt: user.createdAt } });
    },
  },

  // ── Projects ──────────────────────────────────────────────
  {
    method: "GET",
    path: "/api/v1/projects",
    handler: (ctx) => {
      cors(ctx.res);
      const user = requireAuth(ctx) ?? seedUser;
      const page = parseInt(ctx.url.searchParams.get("page") ?? "1");
      const limit = parseInt(ctx.url.searchParams.get("limit") ?? "20");

      const items = [...db.projects.values()].filter(p => p.userId === user.id);
      ctx.sendJson(200, paginate(items, page, limit));
    },
  },

  {
    method: "POST",
    path: "/api/v1/projects",
    handler: async (ctx) => {
      cors(ctx.res);
      const user = requireAuth(ctx) ?? seedUser;
      const body = await ctx.json();

      const id = genId("proj");
      const project = {
        id,
        userId: user.id,
        name: body.name ?? "New Project",
        slug: (body.name ?? "new-project").toLowerCase().replace(/\s+/g, "-"),
        framework: body.framework ?? "vanilla",
        status: "active",
        domain: `${(body.name ?? "project").toLowerCase().replace(/\s+/g, "-")}.xtime.app`,
        customDomain: null,
        region: body.region ?? "ap-northeast-1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        envVars: body.envVars ?? {},
        buildCommand: body.buildCommand ?? "npm run build",
        outputDir: body.outputDir ?? "dist",
        deployments: [],
        ssl: true,
        cdn: true,
        lastDeployedAt: null,
      };
      db.projects.set(id, project);
      ctx.sendJson(201, { project });
    },
  },

  {
    method: "GET",
    path: "/api/v1/projects/:id",
    handler: (ctx) => {
      cors(ctx.res);
      const project = db.projects.get(ctx.params.id);
      if (!project) { ctx.sendJson(404, { error: "Project not found" }); return; }
      ctx.sendJson(200, { project });
    },
  },

  {
    method: "PATCH",
    path: "/api/v1/projects/:id",
    handler: async (ctx) => {
      cors(ctx.res);
      const project = db.projects.get(ctx.params.id);
      if (!project) { ctx.sendJson(404, { error: "Project not found" }); return; }
      const body = await ctx.json();
      const updated = { ...project, ...body, updatedAt: new Date().toISOString() };
      db.projects.set(ctx.params.id, updated);
      ctx.sendJson(200, { project: updated });
    },
  },

  {
    method: "DELETE",
    path: "/api/v1/projects/:id",
    handler: (ctx) => {
      cors(ctx.res);
      if (!db.projects.has(ctx.params.id)) { ctx.sendJson(404, { error: "Project not found" }); return; }
      db.projects.delete(ctx.params.id);
      ctx.sendJson(200, { message: "Project deleted" });
    },
  },

  // ── Deployments ───────────────────────────────────────────
  {
    method: "POST",
    path: "/api/v1/projects/:id/deploy",
    handler: async (ctx) => {
      cors(ctx.res);
      const project = db.projects.get(ctx.params.id);
      if (!project) { ctx.sendJson(404, { error: "Project not found" }); return; }

      const deployId = genId("dep");
      const deployment = {
        id: deployId,
        projectId: ctx.params.id,
        status: "building",
        branch: "main",
        commit: crypto.randomBytes(4).toString("hex"),
        url: `https://${deployId}.xtime.app`,
        createdAt: new Date().toISOString(),
        completedAt: null,
        duration: null,
        logs: ["Build started...", "Installing dependencies...", "Running build command..."],
      };
      db.deployments.set(deployId, deployment);

      // Simulate async build
      setTimeout(() => {
        const dep = db.deployments.get(deployId);
        if (dep) {
          dep.status = "ready";
          dep.completedAt = new Date().toISOString();
          dep.duration = Math.floor(Math.random() * 60) + 20;
          dep.logs.push("Build completed successfully!", "Deploying to edge network...", "✓ Deployed!");
          db.deployments.set(deployId, dep);
        }
        const proj = db.projects.get(ctx.params.id);
        if (proj) {
          proj.lastDeployedAt = new Date().toISOString();
          db.projects.set(ctx.params.id, proj);
        }
      }, 3000);

      ctx.sendJson(201, { deployment });
    },
  },

  {
    method: "GET",
    path: "/api/v1/deployments/:id",
    handler: (ctx) => {
      cors(ctx.res);
      const dep = db.deployments.get(ctx.params.id);
      if (!dep) { ctx.sendJson(404, { error: "Deployment not found" }); return; }
      ctx.sendJson(200, { deployment: dep });
    },
  },

  // ── Domains ───────────────────────────────────────────────
  {
    method: "GET",
    path: "/api/v1/domains",
    handler: (ctx) => {
      cors(ctx.res);
      const user = requireAuth(ctx) ?? seedUser;
      const items = [...db.domains.values()].filter(d => d.userId === user.id);
      ctx.sendJson(200, { domains: items });
    },
  },

  {
    method: "POST",
    path: "/api/v1/domains",
    handler: async (ctx) => {
      cors(ctx.res);
      const user = requireAuth(ctx) ?? seedUser;
      const body = await ctx.json();

      const id = genId("dom");
      const domain = {
        id,
        userId: user.id,
        domain: body.domain,
        projectId: body.projectId ?? null,
        verified: false,
        ssl: false,
        createdAt: new Date().toISOString(),
        dnsRecords: [
          { type: "A", name: "@", value: "76.76.21.21" },
          { type: "CNAME", name: "www", value: "cname.xtime.app" },
        ],
      };
      db.domains.set(id, domain);
      ctx.sendJson(201, { domain });
    },
  },

  {
    method: "POST",
    path: "/api/v1/domains/:id/verify",
    handler: (ctx) => {
      cors(ctx.res);
      const domain = db.domains.get(ctx.params.id);
      if (!domain) { ctx.sendJson(404, { error: "Domain not found" }); return; }
      domain.verified = true;
      domain.ssl = true;
      db.domains.set(ctx.params.id, domain);
      ctx.sendJson(200, { domain, message: "Domain verified successfully" });
    },
  },

  // ── API Keys ──────────────────────────────────────────────
  {
    method: "GET",
    path: "/api/v1/api-keys",
    handler: (ctx) => {
      cors(ctx.res);
      const user = requireAuth(ctx) ?? seedUser;
      const keys = [...db.apiKeys.values()]
        .filter(k => k.userId === user.id)
        .map(k => ({ ...k, key: k.key.slice(0, 12) + "••••••••••••" }));
      ctx.sendJson(200, { apiKeys: keys });
    },
  },

  {
    method: "POST",
    path: "/api/v1/api-keys",
    handler: async (ctx) => {
      cors(ctx.res);
      const user = requireAuth(ctx) ?? seedUser;
      const body = await ctx.json();

      const id = genId("key");
      const rawKey = `xt_live_${crypto.randomBytes(20).toString("hex")}`;
      const apiKey = {
        id,
        userId: user.id,
        name: body.name ?? "New API Key",
        key: rawKey,
        permissions: body.permissions ?? ["read"],
        createdAt: new Date().toISOString(),
        lastUsed: null,
        rateLimit: body.rateLimit ?? 1000,
      };
      db.apiKeys.set(id, apiKey);
      ctx.sendJson(201, { apiKey: { ...apiKey, key: rawKey } }); // Full key on creation only
    },
  },

  {
    method: "DELETE",
    path: "/api/v1/api-keys/:id",
    handler: (ctx) => {
      cors(ctx.res);
      if (!db.apiKeys.has(ctx.params.id)) { ctx.sendJson(404, { error: "API key not found" }); return; }
      db.apiKeys.delete(ctx.params.id);
      ctx.sendJson(200, { message: "API key deleted" });
    },
  },

  // ── Integrations ──────────────────────────────────────────
  {
    method: "GET",
    path: "/api/v1/integrations",
    handler: (ctx) => {
      cors(ctx.res);
      ctx.sendJson(200, {
        available: [
          { id: "github", name: "GitHub", icon: "github", category: "vcs", connected: true },
          { id: "gitlab", name: "GitLab", icon: "gitlab", category: "vcs", connected: false },
          { id: "slack", name: "Slack", icon: "slack", category: "notification", connected: false },
          { id: "discord", name: "Discord", icon: "discord", category: "notification", connected: false },
          { id: "stripe", name: "Stripe", icon: "stripe", category: "payment", connected: false },
          { id: "sendgrid", name: "SendGrid", icon: "email", category: "email", connected: false },
          { id: "cloudflare", name: "Cloudflare", icon: "cloudflare", category: "dns", connected: false },
          { id: "datadog", name: "Datadog", icon: "datadog", category: "monitoring", connected: false },
          { id: "sentry", name: "Sentry", icon: "sentry", category: "monitoring", connected: false },
          { id: "supabase", name: "Supabase", icon: "database", category: "database", connected: false },
          { id: "planetscale", name: "PlanetScale", icon: "database", category: "database", connected: false },
          { id: "redis", name: "Upstash Redis", icon: "redis", category: "cache", connected: false },
        ],
        connected: [...db.integrations.values()],
      });
    },
  },

  {
    method: "POST",
    path: "/api/v1/integrations/:service/connect",
    handler: async (ctx) => {
      cors(ctx.res);
      const user = requireAuth(ctx) ?? seedUser;
      const body = await ctx.json();
      const id = genId("int");
      const integration = {
        id,
        userId: user.id,
        service: ctx.params.service,
        config: body.config ?? {},
        connectedAt: new Date().toISOString(),
        status: "active",
      };
      db.integrations.set(id, integration);
      ctx.sendJson(201, { integration });
    },
  },

  // ── Usage & Analytics ─────────────────────────────────────
  {
    method: "GET",
    path: "/api/v1/usage",
    handler: (ctx) => {
      cors(ctx.res);
      const period = ctx.url.searchParams.get("period") ?? "30d";
      const now = Date.now();

      const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
      const bandwidth = Array.from({ length: days }, (_, i) => ({
        date: new Date(now - (days - i - 1) * 86400000).toISOString().slice(0, 10),
        gb: parseFloat((Math.random() * 5 + 0.5).toFixed(2)),
      }));

      ctx.sendJson(200, {
        period,
        bandwidth: { total: bandwidth.reduce((s, d) => s + d.gb, 0).toFixed(2), data: bandwidth },
        requests: { total: Math.floor(Math.random() * 1000000) + 500000, rps: Math.floor(Math.random() * 200) + 50 },
        storage: { used: "2.4 GB", limit: "10 GB", percentage: 24 },
        functions: { invocations: Math.floor(Math.random() * 50000), errors: Math.floor(Math.random() * 50) },
        buildMinutes: { used: 120, limit: 6000 },
      });
    },
  },

  {
    method: "GET",
    path: "/api/v1/analytics/:projectId",
    handler: (ctx) => {
      cors(ctx.res);
      ctx.sendJson(200, {
        projectId: ctx.params.projectId,
        visitors: { today: 1234, week: 8901, month: 34567 },
        pageviews: { today: 3456, week: 23456, month: 98765 },
        topPages: [
          { path: "/", views: 5432 },
          { path: "/pricing", views: 2341 },
          { path: "/docs", views: 1876 },
          { path: "/blog", views: 987 },
        ],
        countries: [
          { code: "JP", name: "Japan", percentage: 45 },
          { code: "US", name: "United States", percentage: 22 },
          { code: "DE", name: "Germany", percentage: 8 },
          { code: "GB", name: "United Kingdom", percentage: 6 },
          { code: "KR", name: "South Korea", percentage: 5 },
        ],
        devices: { mobile: 48, desktop: 42, tablet: 10 },
        performance: { lcp: 1.2, fid: 45, cls: 0.05, ttfb: 210 },
      });
    },
  },

  // ── Edge Functions ────────────────────────────────────────
  {
    method: "GET",
    path: "/api/v1/functions",
    handler: (ctx) => {
      cors(ctx.res);
      const user = requireAuth(ctx) ?? seedUser;
      ctx.sendJson(200, {
        functions: [
          {
            id: "fn_001",
            name: "auth-middleware",
            runtime: "nodejs20",
            region: "global",
            invocations: 45230,
            errors: 12,
            avgDuration: "23ms",
            status: "active",
            updatedAt: new Date().toISOString(),
          },
          {
            id: "fn_002",
            name: "image-optimizer",
            runtime: "nodejs20",
            region: "ap-northeast-1",
            invocations: 12800,
            errors: 3,
            avgDuration: "145ms",
            status: "active",
            updatedAt: new Date().toISOString(),
          },
        ],
      });
    },
  },

  // ── Storage ───────────────────────────────────────────────
  {
    method: "GET",
    path: "/api/v1/storage",
    handler: (ctx) => {
      cors(ctx.res);
      ctx.sendJson(200, {
        buckets: [
          { id: "bkt_001", name: "assets", size: "1.2 GB", files: 4523, public: true, region: "ap-northeast-1" },
          { id: "bkt_002", name: "uploads", size: "0.8 GB", files: 1234, public: false, region: "ap-northeast-1" },
        ],
        total: { size: "2.0 GB", files: 5757, limit: "10 GB" },
      });
    },
  },

  // ── Plans ─────────────────────────────────────────────────
  {
    method: "GET",
    path: "/api/v1/plans",
    handler: (ctx) => {
      cors(ctx.res);
      ctx.sendJson(200, {
        plans: [
          {
            id: "free",
            name: "Starter",
            price: { monthly: 0, yearly: 0 },
            currency: "JPY",
            features: {
              projects: 3,
              bandwidth: "100 GB",
              storage: "1 GB",
              buildMinutes: 500,
              customDomains: 1,
              teamMembers: 1,
              edgeFunctions: false,
              analytics: "basic",
              support: "community",
              ssl: true,
              cdn: true,
            },
          },
          {
            id: "pro",
            name: "Pro",
            price: { monthly: 2980, yearly: 29800 },
            currency: "JPY",
            popular: true,
            features: {
              projects: 20,
              bandwidth: "1 TB",
              storage: "10 GB",
              buildMinutes: 6000,
              customDomains: 10,
              teamMembers: 5,
              edgeFunctions: true,
              analytics: "advanced",
              support: "email",
              ssl: true,
              cdn: true,
              preview: true,
              passwordProtection: true,
            },
          },
          {
            id: "team",
            name: "Team",
            price: { monthly: 9800, yearly: 98000 },
            currency: "JPY",
            features: {
              projects: "unlimited",
              bandwidth: "5 TB",
              storage: "100 GB",
              buildMinutes: 60000,
              customDomains: "unlimited",
              teamMembers: 25,
              edgeFunctions: true,
              analytics: "enterprise",
              support: "priority",
              ssl: true,
              cdn: true,
              preview: true,
              passwordProtection: true,
              sso: true,
              sla: "99.99%",
            },
          },
          {
            id: "enterprise",
            name: "Enterprise",
            price: { monthly: null, yearly: null },
            currency: "JPY",
            contactSales: true,
            features: {
              projects: "unlimited",
              bandwidth: "custom",
              storage: "custom",
              buildMinutes: "unlimited",
              customDomains: "unlimited",
              teamMembers: "unlimited",
              edgeFunctions: true,
              analytics: "enterprise",
              support: "dedicated",
              ssl: true,
              cdn: true,
              preview: true,
              passwordProtection: true,
              sso: true,
              sla: "99.999%",
              customContracts: true,
              onPremise: true,
            },
          },
        ],
      });
    },
  },

  // ── Regions ───────────────────────────────────────────────
  {
    method: "GET",
    path: "/api/v1/regions",
    handler: (ctx) => {
      cors(ctx.res);
      ctx.sendJson(200, {
        regions: [
          { id: "ap-northeast-1", name: "Tokyo", flag: "🇯🇵", latency: "< 10ms", available: true },
          { id: "ap-southeast-1", name: "Singapore", flag: "🇸🇬", latency: "< 30ms", available: true },
          { id: "us-east-1", name: "New York", flag: "🇺🇸", latency: "< 120ms", available: true },
          { id: "us-west-2", name: "Oregon", flag: "🇺🇸", latency: "< 130ms", available: true },
          { id: "eu-west-1", name: "Dublin", flag: "🇮🇪", latency: "< 200ms", available: true },
          { id: "eu-central-1", name: "Frankfurt", flag: "🇩🇪", latency: "< 200ms", available: true },
          { id: "ap-northeast-3", name: "Osaka", flag: "🇯🇵", latency: "< 15ms", available: true },
        ],
      });
    },
  },

  // ── Webhooks ──────────────────────────────────────────────
  {
    method: "GET",
    path: "/api/v1/webhooks",
    handler: (ctx) => {
      cors(ctx.res);
      ctx.sendJson(200, {
        webhooks: [
          {
            id: "wh_001",
            url: "https://hooks.slack.com/services/...",
            events: ["deploy.completed", "deploy.failed"],
            active: true,
            deliveries: 142,
            lastDelivery: new Date().toISOString(),
          },
        ],
        availableEvents: [
          "deploy.started", "deploy.completed", "deploy.failed",
          "domain.verified", "ssl.issued", "ssl.expiring",
          "billing.payment_succeeded", "billing.payment_failed",
          "project.created", "project.deleted",
        ],
      });
    },
  },

  // ── Framework Templates ────────────────────────────────────
  {
    method: "GET",
    path: "/api/v1/templates",
    handler: (ctx) => {
      cors(ctx.res);
      ctx.sendJson(200, {
        templates: [
          { id: "svelte-kit", name: "SvelteKit", icon: "svelte", stars: 4823, category: "fullstack" },
          { id: "nextjs", name: "Next.js", icon: "nextjs", stars: 9210, category: "fullstack" },
          { id: "nuxt", name: "Nuxt 3", icon: "nuxt", stars: 3456, category: "fullstack" },
          { id: "astro", name: "Astro", icon: "astro", stars: 5678, category: "static" },
          { id: "vite-react", name: "Vite + React", icon: "react", stars: 2341, category: "spa" },
          { id: "vite-vue", name: "Vite + Vue", icon: "vue", stars: 1987, category: "spa" },
          { id: "remix", name: "Remix", icon: "remix", stars: 2109, category: "fullstack" },
          { id: "qwik", name: "Qwik", icon: "qwik", stars: 987, category: "fullstack" },
          { id: "hugo", name: "Hugo", icon: "hugo", stars: 1234, category: "static" },
          { id: "gatsby", name: "Gatsby", icon: "gatsby", stars: 1567, category: "static" },
        ],
      });
    },
  },
];
