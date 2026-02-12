import { watch } from "node:fs";
import type { ServerResponse } from "node:http";

const clients = new Set<ServerResponse>();

export function attachLiveReloadClient(res: ServerResponse): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive"
  });
  res.write("\n");
  clients.add(res);
  res.on("close", () => {
    clients.delete(res);
  });
}

export function createLiveReloadScript(): string {
  return `<script>
const source = new EventSource('/__xtime_live_reload');
source.onmessage = (event) => {
  if (event.data === 'reload') {
    window.location.reload();
  }
};
</script>`;
}

export function startLiveReloadWatcher(paths: string[]): () => void {
  const watchers = paths.map((targetPath) =>
    watch(targetPath, { recursive: true }, () => {
      broadcastReload();
    })
  );

  return () => {
    for (const watcher of watchers) {
      watcher.close();
    }
  };
}

function broadcastReload(): void {
  for (const client of clients) {
    client.write(`data: reload\n\n`);
  }
}
