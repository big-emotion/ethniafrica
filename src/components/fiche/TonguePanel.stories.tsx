import type { Meta, StoryObj } from "@storybook/react";

import { TonguePanel } from "@/components/fiche/TonguePanel";
import {
  FICHE_A11Y_PARAMETERS,
  atFicheBreakpoint,
} from "@/components/fiche/ficheStoryViewports";
import {
  NIGER_CONGO,
  NIGER_CONGO_BRANCHES,
} from "@/components/fiche/__tests__/ficheContextFixtures";

const meta = {
  title: "Fiche/TonguePanel",
  component: TonguePanel,
  tags: ["autodocs"],
  parameters: { layout: "padded", a11y: FICHE_A11Y_PARAMETERS },
} satisfies Meta<typeof TonguePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * No fetch stub: HierarchyTree only calls `loadChildren` for an expanded node
 * whose children are still unresolved, and the single auto-expanded node here
 * is the family root, which arrives with its branches inline. The panel
 * therefore settles without reaching
 * /api/v2/language-families/:id/tree/branch, which has no server in Storybook.
 */
const nigerCongoTongue: Story = {
  args: {
    languageFamilyId: NIGER_CONGO.id,
    familyName: NIGER_CONGO.nameFr,
    branches: NIGER_CONGO_BRANCHES,
    size: "md",
    side: "right",
    stepLabel: "04 · Langue",
    heading: "Comment la famille se ramifie-t-elle ?",
    body: "Les branches linguistiques rattachées à cette famille, et les peuples que chacune rassemble.",
    sourceLine: {
      label: "Source : dossier AFRIK de la fiche",
      href: "#fiche-record",
    },
    treeLabel: `Classification — ${NIGER_CONGO.nameFr}`,
    textIndexLabel: "Classification — version texte",
  },
};

export const Mobile430 = atFicheBreakpoint(nigerCongoTongue, "ficheMobile430");
export const Tablet720 = atFicheBreakpoint(nigerCongoTongue, "ficheTablet720");
export const Desktop800 = atFicheBreakpoint(
  nigerCongoTongue,
  "ficheDesktop800"
);
