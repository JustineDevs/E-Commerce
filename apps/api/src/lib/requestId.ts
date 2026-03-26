import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

declare module "express-serve-static-core" {
  // eslint-disable-next-line no-unused-vars -- merges onto Express Request
  interface Request {
    requestId?: string;
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
