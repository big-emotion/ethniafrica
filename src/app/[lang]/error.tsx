"use client";

import { useEffect, useId, useState } from "react";
import { ErrorState } from "@/components/ui/ErrorState";
import {
  pickDidYouKnowFact,
  type DidYouKnowFact,
} from "@/lib/home/didYouKnowFacts";

// @req REQ-099
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
  const [anecdote] = useState<DidYouKnowFact | null>(() =>
    pickDidYouKnowFact()
  );

  return (
    <ErrorState errorRef={errorRefId} onRetry={reset} anecdote={anecdote} />
  );
}
