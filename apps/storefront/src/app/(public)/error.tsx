"use client";

import { useEffect } from "react";
import { HttpErrorPage } from "@/components/HttpErrorPage";

export default function PublicRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <HttpErrorPage
      code={500}
      title="Something went wrong"
      description="We could not load this page. You can try again or return to the shop."
      onRetry={reset}
      digest={error.digest}
    />
  );
}
