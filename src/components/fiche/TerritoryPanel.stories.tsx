import type { Meta, StoryObj } from "@storybook/react";

import { TerritoryPanel } from "@/components/fiche/TerritoryPanel";
import {
  FICHE_A11Y_PARAMETERS,
  atFicheBreakpoint,
} from "@/components/fiche/ficheStoryViewports";
import { YORUBA_DISTRIBUTIONS } from "@/components/fiche/__tests__/ficheContextFixtures";

const meta = {
  title: "Fiche/TerritoryPanel",
  component: TerritoryPanel,
  tags: ["autodocs"],
  parameters: { layout: "padded", a11y: FICHE_A11Y_PARAMETERS },
} satisfies Meta<typeof TerritoryPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const yorubaTerritory: Story = {
  args: {
    distributions: YORUBA_DISTRIBUTIONS,
    size: "md",
    side: "left",
    stepLabel: "03 · Territoire",
    heading: "Où la présence est-elle attestée ?",
    body: "Les pays où le corpus atteste une présence, classés par part de population déclarée.",
    sourceLine: {
      label: "Source : dossier AFRIK de la fiche",
      href: "#fiche-record",
    },
  },
};

export const Mobile430 = atFicheBreakpoint(yorubaTerritory, "ficheMobile430");
export const Tablet720 = atFicheBreakpoint(yorubaTerritory, "ficheTablet720");
export const Desktop800 = atFicheBreakpoint(yorubaTerritory, "ficheDesktop800");
