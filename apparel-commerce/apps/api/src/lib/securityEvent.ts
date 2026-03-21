import type { Request } from "express";

export function logSecurityEvent(
  event: string,
  req: Request | undefined,
  meta?: Record<string, unknown>,
): void {
  const ua =
    req && typeof req.get === "function" ? req.get("user-agent") : undefined;
  const line = {
    type: "security_event",
    event,
    timestamp: new Date().toISOString(),
    requestId: req?.requestId,
    ip: req?.ip,
    path: req?.path,
    method: req?.method,
    userAgent: ua,
    ...meta,
  };
  console.log(JSON.stringify(line));
}
