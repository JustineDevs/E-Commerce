const TRAINING_MODE_COOKIE = "admin_training_mode";

export function isTrainingMode(): boolean {
  if (typeof window === "undefined") return false;
  return document.cookie.includes(`${TRAINING_MODE_COOKIE}=1`);
}

export function enableTrainingMode(): void {
  document.cookie = `${TRAINING_MODE_COOKIE}=1; path=/; max-age=86400; SameSite=Strict`;
}

export function disableTrainingMode(): void {
  document.cookie = `${TRAINING_MODE_COOKIE}=; path=/; max-age=0`;
}

export function isTrainingModeFromCookie(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  return cookieHeader.includes(`${TRAINING_MODE_COOKIE}=1`);
}

export function trainingModeBanner(): {
  visible: boolean;
  message: string;
  className: string;
} {
  const active = isTrainingMode();
  return {
    visible: active,
    message: "Training Mode: Actions are simulated and will not affect production data.",
    className: "bg-amber-100 border-amber-300 text-amber-900",
  };
}

export function guardWriteOperation(operation: string): {
  blocked: boolean;
  message: string;
} {
  if (!isTrainingMode()) return { blocked: false, message: "" };

  const allowedInTraining = ["read", "list", "search", "view", "export"];
  const lower = operation.toLowerCase();
  if (allowedInTraining.some((op) => lower.includes(op))) {
    return { blocked: false, message: "" };
  }

  return {
    blocked: true,
    message: `Operation "${operation}" is blocked in training mode. Disable training mode to perform this action.`,
  };
}
