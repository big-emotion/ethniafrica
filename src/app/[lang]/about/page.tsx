import AboutPageShell from "@/components/pages/AboutPageShell";
import AboutPageContent from "@/components/pages/AboutPageContent";
import { getModulesByAxis } from "@/lib/home/accessAxesData";
import { getCorpusCounts } from "@/lib/home/corpusCounts";
import { loadSynthesisRail } from "@/lib/home/synthesisRailData";

// @req REQ-091
// @req REQ-132
export default async function AboutPage() {
  const [counts, modulesByAxis, syntheses] = await Promise.all([
    getCorpusCounts(),
    getModulesByAxis(),
    loadSynthesisRail(),
  ]);

  return (
    <AboutPageShell>
      <AboutPageContent
        language="fr"
        counts={counts}
        modulesByAxis={modulesByAxis}
        syntheses={syntheses}
      />
    </AboutPageShell>
  );
}
