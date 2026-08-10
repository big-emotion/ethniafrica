import type { Meta, StoryObj } from "@storybook/react";

import { FragmentationPanel } from "@/components/fiche/FragmentationPanel";
import {
  FICHE_A11Y_PARAMETERS,
  atFicheBreakpoint,
} from "@/components/fiche/ficheStoryViewports";
import { YORUBA_FRAGMENTATION } from "@/components/fiche/__tests__/ficheContextFixtures";

const meta = {
  title: "Fiche/FragmentationPanel",
  component: FragmentationPanel,
  tags: ["autodocs"],
  parameters: { layout: "padded", a11y: FICHE_A11Y_PARAMETERS },
} satisfies Meta<typeof FragmentationPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const yorubaFragmentation: Story = {
  args: {
    fragmentation: YORUBA_FRAGMENTATION,
    size: "md",
    side: "left",
    stepLabel: "05 · Fragmentation",
    heading: "Que les frontières ont-elles séparé ?",
    body: "La répartition de part et d'autre des frontières actuelles, telle qu'enregistrée dans le corpus.",
    sourceLine: {
      label: "Source : dossier AFRIK de la fiche",
      href: "#fiche-record",
    },
  },
};

export const Mobile430 = atFicheBreakpoint(
  yorubaFragmentation,
  "ficheMobile430"
);
export const Tablet720 = atFicheBreakpoint(
  yorubaFragmentation,
  "ficheTablet720"
);
export const Desktop800 = atFicheBreakpoint(
  yorubaFragmentation,
  "ficheDesktop800"
);
