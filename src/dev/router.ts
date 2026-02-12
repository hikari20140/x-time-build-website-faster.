import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ApiRoute, HttpMethod, RouteContext, RouteHandler } from "../shared/types.js";

interface CompiledRoute {
  method: HttpMethod;
  regex: RegExp;
  keys: string[];
  handler: RouteHandler;
}

export async function loadRoutes(serverEntryPath: string, cacheBust = true): Promise<CompiledRoute[]> {
  const moduleUrl = pathToFileURL(serverEntryPath).href;
  const mod = await import(cacheBust ? `${moduleUrl}?t=${Date.now()}` : moduleUrl);
  const routes = (mod.routes ?? []) as ApiRoute[];

  return routes.map((route) => {
    const { regex, keys } = compileRoutePath(route.path);
    return {
      method: route.method,
      regex,
      keys,
      handler: route.handler
    };
  });
}

function compileRoutePath(routePath: string): { regex: RegExp; keys: string[] } {
  const keys: string[] = [];
  const pattern = routePath
    .split("/")
    .map((segment) => {
      if (segment.startsWith(":")) {
        keys.push(segment.slice(1));
        return "([^/]+)";
      }
      return segment.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
    })
    .join("/");

  return {
    regex: new RegExp(`^${pattern}$`),
    keys
  };
}

export async function dispatchApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
  compiledRoutes: CompiledRoute[]
): Promise<boolean> {
  const method = (req.method ?? "GET") as HttpMethod;
  const requestUrl = new URL(req.url ?? "/", "http://localhost");

  for (const route of compiledRoutes) {
    if (route.method !== method) {
      continue;
    }

    const match = route.regex.exec(requestUrl.pathname);
    if (!match) {
      continue;
    }

    const params = route.keys.reduce<Record<string, string>>((acc, key, idx) => {
      acc[key] = match[idx + 1] ?? "";
      return acc;
    }, {});

    const ctx: RouteContext = {
      req,
      res,
      url: requestUrl,
      params,
      json: async () => {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(Buffer.from(chunk));
        }
        const body = Buffer.concat(chunks).toString("utf8");
        return body ? JSON.parse(body) : {};
      },
      sendJson: (status, body) => {
        if (res.writableEnded) {
          return;
        }
        res.statusCode = status;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify(body));
      },
      sendText: (status, body) => {
        if (res.writableEnded) {
          return;
        }
        res.statusCode = status;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end(body);
      }
    };

    await route.handler(ctx);
    if (!res.writableEnded) {
      res.end();
    }
    return true;
  }

  return false;
}

export async function serveStatic(
  req: IncomingMessage,
  res: ServerResponse,
  clientDir: string,
  injectScript?: string
): Promise<void> {
  const requestUrl = new URL(req.url ?? "/", "http://localhost");
  let filePath = decodeURIComponent(requestUrl.pathname);

  if (filePath === "/") {
    filePath = "/index.html";
  }

  const safePath = path.normalize(filePath).replace(/^\.\.(\/|\\|$)+/, "");
  const fullPath = path.join(clientDir, safePath);

  try {
    let content = await readFile(fullPath);
    const extension = path.extname(fullPath);

    if (extension === ".html" && injectScript) {
      content = Buffer.from(content.toString("utf8").replace("</body>", `${injectScript}</body>`), "utf8");
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", guessContentType(extension));
    res.end(content);
  } catch {
    try {
      const fallbackPath = path.join(clientDir, "index.html");
      let html = await readFile(fallbackPath, "utf8");
      if (injectScript) {
        html = html.replace("</body>", `${injectScript}</body>`);
      }
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(html);
    } catch {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Not Found");
    }
  }
}

function guessContentType(extension: string): string {
  switch (extension) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    default:
      return "application/octet-stream";
  }
}
