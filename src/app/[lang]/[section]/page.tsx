import { Suspense } from "react";
import { SectionPageClient } from "./SectionPageClient";
import { LoadingState } from "@/components/ui/LoadingState";

export default function SectionPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <SectionPageClient />
    </Suspense>
  );
}
