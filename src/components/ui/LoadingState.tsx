import { Skeleton } from "@/components/ui/skeleton";

// Charter §6 loading state: token-based shimmer, not the medallion motif —
// the medallion is reserved for terminal states (403/404/error/empty).
//
// This is a Suspense `fallback`, not a route-level loading.tsx: REQ-046
// deliberately keeps [lang] free of a global loading boundary so fast
// routes don't wait behind a shared spinner. Fixed min-height avoids
// layout shift while a route's own Suspense boundary streams in.
// @req REQ-099
export function LoadingState() {
  return (
    <div
      data-testid="loading-state"
      className="min-h-[60vh] flex flex-col items-center justify-center gap-4 bg-afh-bg-warm px-4 py-12"
    >
      <div className="max-w-md w-full space-y-3">
        <Skeleton className="h-6 w-2/3 mx-auto" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
}
