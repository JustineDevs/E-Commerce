import type {
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler,
} from "express";

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
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
    console.log(
      JSON.stringify({
        type: "application_error",
        status,
        requestId: _req.requestId,
        path: _req.path,
        method: _req.method,
        errorName: err instanceof Error ? err.name : "unknown",
        message:
          err instanceof Error
            ? err.message.slice(0, 500)
            : String(message).slice(0, 500),
      }),
    );
  }

  if (!isProd && err instanceof Error && err.stack) {
    console.error(err.stack);
  } else if (isProd && status < 500) {
    console.error(message);
  }

  const requestId = _req.requestId;
  res.status(status >= 400 && status < 600 ? status : 500).json({
    error: status === 500 && isProd ? "Internal server error" : message,
    code: "UNHANDLED_ERROR",
    ...(requestId ? { requestId } : {}),
  });
};
