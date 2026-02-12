import { runBuild } from "./build.js";
import { error } from "./core/logger.js";
import { runDevServer } from "./dev/server.js";
import { runStartServer } from "./start.js";

async function main(): Promise<void> {
  const command = process.argv[2] ?? "dev";

  switch (command) {
    case "dev":
      await runDevServer();
      return;
    case "build":
      await runBuild();
      return;
    case "start":
      await runStartServer();
      return;
    default:
      error(`unknown command: ${command}`);
      process.exitCode = 1;
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.stack ?? err.message : String(err);
  error(message);
  process.exit(1);
});
