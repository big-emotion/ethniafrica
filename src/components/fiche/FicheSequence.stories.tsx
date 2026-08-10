import type { Meta, StoryObj } from "@storybook/react";

import { FicheSequence } from "@/components/fiche/FicheSequence";
import {
  FICHE_A11Y_PARAMETERS,
  atFicheBreakpoint,
} from "@/components/fiche/ficheStoryViewports";
import type { FichePanelContext } from "@/components/fiche/panelRegistry";
import {
  RELATIONS,
  YORUBA,
  YORUBA_DISTRIBUTIONS,
  YORUBA_FRAGMENTATION,
  YORUBA_NAMES_DOSSIER,
} from "@/components/fiche/__tests__/ficheContextFixtures";

const meta = {
  title: "Fiche/FicheSequence",
  component: FicheSequence,
  tags: ["autodocs"],
  parameters: { layout: "padded", a11y: FICHE_A11Y_PARAMETERS },
} satisfies Meta<typeof FicheSequence>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * `hasOralNarratives` stays absent so the sequence resolves without the client
 * fetch VoicesPanel would fire; the voices chapter is proofed on its own in
 * VoicesPanel.stories.tsx, and its absence here is the FR98 gate doing its job.
 */
const yorubaContext: FichePanelContext = {
  entityType: "people",
  payload: YORUBA,
  namesDossier: YORUBA_NAMES_DOSSIER,
  distributions: YORUBA_DISTRIBUTIONS,
  fragmentation: YORUBA_FRAGMENTATION,
  relations: RELATIONS,
};

const peopleSequence: Story = {
  args: {
    context: yorubaContext,
    record: (
      <div className="mt-afh-md flex flex-col gap-afh-sm">
        <h2 className="font-afh-display text-afh-h3 font-black text-afh-text">
          Dossier AFRIK
        </h2>
        <p className="text-afh-body text-afh-text-soft">
          La vue détaillée du peuple est rendue ici, derrière la porte de
          lecture du dernier chapitre.
        </p>
      </div>
    ),
  },
};

export const Mobile430 = atFicheBreakpoint(peopleSequence, "ficheMobile430");
export const Tablet720 = atFicheBreakpoint(peopleSequence, "ficheTablet720");
export const Desktop800 = atFicheBreakpoint(peopleSequence, "ficheDesktop800");
