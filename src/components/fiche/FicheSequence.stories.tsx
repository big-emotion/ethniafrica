import type { Meta, StoryObj } from "@storybook/react";

import { FicheSequence } from "@/components/fiche/FicheSequence";
import {
  FICHE_A11Y_PARAMETERS,
  atFicheBreakpoint,
} from "@/components/fiche/ficheStoryViewports";

const meta = {
  title: "Fiche/FicheSequence",
  component: FicheSequence,
  tags: ["autodocs"],
  parameters: { layout: "padded", a11y: FICHE_A11Y_PARAMETERS },
} satisfies Meta<typeof FicheSequence>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The shell, with stand-ins for the two things a route hands it.
 *
 * The globe and the parchment are proofed where they live — a story here that
 * mounted a real AtlasGlobe would be proofing WebGL, and one that mounted a
 * real parchment would duplicate the three fiche stories. What this story is
 * for is the shell's own decisions: the accent scope, the measured head band
 * against the two full-bleed slots, and the order head → globe → rail →
 * dossier at each of the three fiche breakpoints.
 */
const peopleFiche: Story = {
  args: {
    entityType: "people",
    title: (
      <h1 className="font-afh-display text-afh-h1 font-black text-afh-text">
        Yoruba
      </h1>
    ),
    globe: (
      <div className="grid h-[320px] w-full place-items-center bg-afh-bg-warm text-afh-text-soft">
        Bande atlas
      </div>
    ),
    record: (
      <div className="mt-afh-md flex flex-col gap-afh-sm px-4">
        <h2 className="font-afh-display text-afh-h3 font-black text-afh-text">
          Dossier AFRIK
        </h2>
        <p className="text-afh-body text-afh-text-soft">
          Le parchemin du peuple est rendu ici, déplié, et porte sa propre
          mesure de lecture.
        </p>
      </div>
    ),
  },
};

// @req REQ-091
export const Mobile430 = atFicheBreakpoint(peopleFiche, "ficheMobile430");
// @req REQ-091
export const Tablet720 = atFicheBreakpoint(peopleFiche, "ficheTablet720");
// @req REQ-091
export const Desktop800 = atFicheBreakpoint(peopleFiche, "ficheDesktop800");
