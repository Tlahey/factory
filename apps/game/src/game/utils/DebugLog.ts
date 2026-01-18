const lastLogs = new Map<string, string>();

/**
 * Logs a message only if it's different from the last time this identifier was used.
 * Prevents console flooding in game loops.
 */
export function logChanged(
  tag: string,
  identifier: string,
  message: string,
): void {
  const key = `${tag}:${identifier}`;
  const lastMessage = lastLogs.get(key);

  if (lastMessage !== message) {
    console.log(`[${tag}] ${identifier} -> ${message}`);
    lastLogs.set(key, message);
  }
}

/**
 * Clears the log cache. Useful when switching scenes or positions.
 */
export function clearLogCache(): void {
  lastLogs.clear();
}
