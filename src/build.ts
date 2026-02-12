import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "./core/config.js";
import { info } from "./core/logger.js";

export async function runBuild(): Promise<void> {
  const config = await loadConfig();
  const rootDir = config.rootDir;
  const clientDir = path.resolve(rootDir, config.clientDir);
  const serverEntry = path.resolve(rootDir, config.serverEntry);
  const outDir = path.resolve(rootDir, config.outDir);

  for (const plugin of config.plugins) {
    await plugin.onBuildStart?.();
  }

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await mkdir(path.join(outDir, "client"), { recursive: true });
  await mkdir(path.join(outDir, "server"), { recursive: true });

  await cp(clientDir, path.join(outDir, "client"), { recursive: true });
  await cp(path.dirname(serverEntry), path.join(outDir, "server"), { recursive: true });

  for (const plugin of config.plugins) {
    await plugin.onBuildEnd?.();
  }

  info(`build output: ${outDir}`);
}
