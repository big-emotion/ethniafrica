import { FichePanel } from "@/components/fiche/FichePanel";
import { FragmentationView } from "@/components/colonization/FragmentationView";
import type { PeopleFragmentation } from "@/api/v2/schemas/peopleFragmentation";
import type {
  FichePanelSide,
  FichePanelSize,
  FichePanelSourceLine,
} from "@/types/fiche";

export interface FragmentationPanelProps {
  /** Omitted when the underlying people has no cross-border fragmentation to show (FR98). */
  fragmentation?: PeopleFragmentation;
  size: FichePanelSize;
  side: FichePanelSide;
  sourceLine: FichePanelSourceLine;
  stepLabel: string;
  heading: string;
  body: string;
  note?: string;
}

/**
 * Wraps the shipped FragmentationView (Epic 13, ETNI-651) in the FichePanel
 * chapter contract. FragmentationView owns its own data logic and test
 * suite untouched — this component only supplies the canvas slot.
 */
// @req REQ-091
export function FragmentationPanel({
  fragmentation,
  size,
  side,
  sourceLine,
  stepLabel,
  heading,
  body,
  note,
}: FragmentationPanelProps) {
  if (!fragmentation) {
    return <FichePanel size={size} side={side} sourceLine={sourceLine} />;
  }

  return (
    <FichePanel
      size={size}
      side={side}
      sourceLine={sourceLine}
      data={{
        stepLabel,
        heading,
        body,
        note,
        canvas: (
          <FragmentationView
            fragmentation={fragmentation}
            variant="fiche-section"
          />
        ),
      }}
    />
  );
}

export default FragmentationPanel;
