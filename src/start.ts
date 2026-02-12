import { createServer } from "node:http";
import path from "node:path";
import { loadConfig } from "./core/config.js";
import { info } from "./core/logger.js";
import { dispatchApiRequest, loadRoutes, serveStatic } from "./dev/router.js";

export async function runStartServer(): Promise<void> {
  const config = await loadConfig();
  const rootDir = config.rootDir;
  const outDir = path.resolve(rootDir, config.outDir);
  const clientDir = path.join(outDir, "client");
  const serverEntry = path.join(outDir, "server", "routes.js");

  const routes = await loadRoutes(serverEntry, false);

  const server = createServer(async (req, res) => {
    if ((req.url ?? "").startsWith("/api/")) {
      const handled = await dispatchApiRequest(req, res, routes);
      if (!handled) {
        res.statusCode = 404;
        res.end("API route not found");
      }
      return;
    }

    await serveStatic(req, res, clientDir);
  });

  server.listen(config.port, () => {
    info(`production server started at http://localhost:${config.port}`);
  });
}
