import type { Request } from "express";
import { logInfo } from "./logger.js";

export function logSecurityEvent(
  event: string,
  req: Request | undefined,
  meta?: Record<string, unknown>,
): void {
  const ua =
    req && typeof req.get === "function" ? req.get("user-agent") : undefined;
  logInfo({
    type: "security_event",
    event,
    requestId: req?.requestId,
    ip: req?.ip,
    path: req?.path,
    method: req?.method,
    userAgent: ua,
    ...meta,
  });
}
