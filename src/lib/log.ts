type LogLevel = "error" | "info" | "warn";
type LogValue = boolean | number | string | null | undefined;

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export function logEvent(
  level: LogLevel,
  event: string,
  details: Record<string, LogValue> = {}
) {
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...details,
  });

  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.info(payload);
}
