"use client";

import { useEffect, useId } from "react";
import { ErrorState } from "@/components/ui/ErrorState";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  const id = useId();
  const errorRefId = error.digest ?? id.replace(/:/g, "").toUpperCase();

  return <ErrorState errorRef={errorRefId} onRetry={reset} />;
}
