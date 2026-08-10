import type { Meta, StoryObj } from "@storybook/react";

import { LinksPanel } from "@/components/fiche/LinksPanel";
import {
  FICHE_A11Y_PARAMETERS,
  atFicheBreakpoint,
} from "@/components/fiche/ficheStoryViewports";
import { RELATIONS } from "@/components/fiche/__tests__/ficheContextFixtures";

const meta = {
  title: "Fiche/LinksPanel",
  component: LinksPanel,
  tags: ["autodocs"],
  parameters: { layout: "padded", a11y: FICHE_A11Y_PARAMETERS },
} satisfies Meta<typeof LinksPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const yorubaLinks: Story = {
  args: {
    relations: [...RELATIONS],
    size: "md",
    side: "right",
    stepLabel: "06 · Liens",
    heading: "Quelles relations sont documentées ?",
    body: "Les relations sourcées du corpus, chacune portant son type et ses références.",
    sourceLine: {
      label: "Source : dossier AFRIK de la fiche",
      href: "#fiche-record",
    },
  },
};

export const Mobile430 = atFicheBreakpoint(yorubaLinks, "ficheMobile430");
export const Tablet720 = atFicheBreakpoint(yorubaLinks, "ficheTablet720");
export const Desktop800 = atFicheBreakpoint(yorubaLinks, "ficheDesktop800");
