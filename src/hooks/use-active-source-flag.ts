import { useEffect, useState } from "react";
import { hasActiveSourceFlag } from "@/lib/flags-client";

interface SourceFlagState {
  key: string;
  active: boolean;
}

// @req REQ-031
export function useActiveSourceFlag(
  entityType: "country" | "people",
  entityId: string | null
): boolean {
  const key = entityId ? `${entityType}:${entityId}` : "";
  const [state, setState] = useState<SourceFlagState>({
    key: "",
    active: false,
  });

  useEffect(() => {
    if (!entityId) return;

    let cancelled = false;
    hasActiveSourceFlag(entityType, entityId).then((active) => {
      if (!cancelled) setState({ key, active });
    });

    return () => {
      cancelled = true;
    };
  }, [entityId, entityType, key]);

  return state.key === key && state.active;
}
