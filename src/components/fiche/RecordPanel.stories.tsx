import type { Meta, StoryObj } from "@storybook/react";

import { RecordPanel } from "@/components/fiche/RecordPanel";
import {
  FICHE_A11Y_PARAMETERS,
  atFicheBreakpoint,
} from "@/components/fiche/ficheStoryViewports";

const meta = {
  title: "Fiche/RecordPanel",
  component: RecordPanel,
  tags: ["autodocs"],
  parameters: { layout: "padded", a11y: FICHE_A11Y_PARAMETERS },
} satisfies Meta<typeof RecordPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * RecordPanel gates whatever entity detail view a route hands it, so the child
 * here is a structural stand-in: wiring a real detail view would proof that
 * view, not the reading gate.
 */
const readingGate: Story = {
  args: {
    children: (
      <div className="mt-afh-md flex flex-col gap-afh-sm">
        <h2 className="font-afh-display text-afh-h3 font-black text-afh-text">
          Dossier AFRIK
        </h2>
        <p className="text-afh-body text-afh-text-soft">
          La vue détaillée de l&apos;entité est rendue ici, toujours présente
          dans le DOM et seulement masquée par la porte de lecture.
        </p>
      </div>
    ),
  },
};

export const Mobile430 = atFicheBreakpoint(readingGate, "ficheMobile430");
export const Tablet720 = atFicheBreakpoint(readingGate, "ficheTablet720");
export const Desktop800 = atFicheBreakpoint(readingGate, "ficheDesktop800");
