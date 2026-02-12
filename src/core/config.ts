import { access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { XTimeConfig } from "../shared/types.js";

const defaultConfig: Required<Omit<XTimeConfig, "plugins">> & { plugins: NonNullable<XTimeConfig["plugins"]> } = {
  rootDir: process.cwd(),
  clientDir: "app/client",
  serverEntry: "app/server/routes.js",
  outDir: "dist",
  port: 5173,
  plugins: []
};

const supportedConfigFiles = [
  "xtime.config.ts",
  "xtime.config.mts",
  "xtime.config.js",
  "xtime.config.mjs"
];

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function loadConfig(cwd = process.cwd()): Promise<Required<Omit<XTimeConfig, "plugins">> & { plugins: NonNullable<XTimeConfig["plugins"]> }> {
  for (const file of supportedConfigFiles) {
    const fullPath = path.join(cwd, file);
    if (!(await exists(fullPath))) {
      continue;
    }

    const mod = await import(`${pathToFileURL(fullPath).href}?t=${Date.now()}`);
    const userConfig = (mod.default ?? mod.config ?? {}) as XTimeConfig;

    return {
      ...defaultConfig,
      ...userConfig,
      rootDir: userConfig.rootDir ?? cwd,
      plugins: userConfig.plugins ?? []
    };
  }

  return { ...defaultConfig, rootDir: cwd };
}
