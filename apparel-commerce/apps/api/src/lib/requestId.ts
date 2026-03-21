import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const incoming = req.headers["x-request-id"];
  const id =
    typeof incoming === "string" && incoming.length > 0
      ? incoming
      : randomUUID();
  req.requestId = id;
  res.setHeader("x-request-id", id);
  next();
}

export function logWithRequest(
  req: Request,
  message: string,
  extra?: Record<string, unknown>,
): void {
  const payload = { requestId: req.requestId, ...extra };
  console.log(JSON.stringify({ msg: message, ...payload }));
}
