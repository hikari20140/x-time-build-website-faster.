export function info(message: string): void {
  process.stdout.write(`[xtime] ${message}\n`);
}

export function error(message: string): void {
  process.stderr.write(`[xtime] ${message}\n`);
}
