import { createServer } from "node:http";
import path from "node:path";
import { loadConfig } from "../core/config.js";
import { info } from "../core/logger.js";
import { attachLiveReloadClient, createLiveReloadScript, startLiveReloadWatcher } from "./livereload.js";
import { dispatchApiRequest, loadRoutes, serveStatic } from "./router.js";

export async function runDevServer(): Promise<void> {
  const config = await loadConfig();
  const rootDir = config.rootDir;
  const clientDir = path.resolve(rootDir, config.clientDir);
  const serverEntry = path.resolve(rootDir, config.serverEntry);

  for (const plugin of config.plugins) {
    await plugin.configureServer?.({ port: config.port, rootDir });
  }

  const injectScript = createLiveReloadScript();
  const stopWatch = startLiveReloadWatcher([clientDir, path.dirname(serverEntry)]);

  const server = createServer(async (req, res) => {
    if ((req.url ?? "").startsWith("/__xtime_live_reload")) {
      attachLiveReloadClient(res);
      return;
    }

    if ((req.url ?? "").startsWith("/api/")) {
      const routes = await loadRoutes(serverEntry, true);
      const handled = await dispatchApiRequest(req, res, routes);
      if (!handled) {
        res.statusCode = 404;
        res.end("API route not found");
      }
      return;
    }

    await serveStatic(req, res, clientDir, injectScript);
  });

  server.listen(config.port, () => {
    info(`dev server started at http://localhost:${config.port}`);
    info(`client: ${clientDir}`);
    info(`server: ${serverEntry}`);
  });

  const shutdown = () => {
    stopWatch();
    server.close(() => process.exit(0));
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
