import type {
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler,
} from "express";
import { logDevErrorStack, logInfo } from "./logger.js";

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const isProd = process.env.NODE_ENV === "production";
  const message = err instanceof Error ? err.message : "Internal error";
  const status =
    typeof (err as { status?: number })?.status === "number"
      ? (err as { status: number }).status
      : 500;

  if (status >= 500) {
    logInfo({
      type: "application_error",
      status,
      requestId: req.requestId,
      path: req.path,
      method: req.method,
      errorName: err instanceof Error ? err.name : "unknown",
      message:
        err instanceof Error
          ? err.message.slice(0, 500)
          : String(message).slice(0, 500),
    });
  }

  if (!isProd && err instanceof Error && err.stack) {
    logDevErrorStack(err.stack);
  }

  const requestId = req.requestId;
  res.status(status >= 400 && status < 600 ? status : 500).json({
    error: status === 500 && isProd ? "Internal server error" : message,
    code: "UNHANDLED_ERROR",
    ...(requestId ? { requestId } : {}),
  });
};
