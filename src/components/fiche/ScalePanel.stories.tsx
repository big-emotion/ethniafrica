import type { Meta, StoryObj } from "@storybook/react";

import { ScalePanel } from "@/components/fiche/ScalePanel";
import {
  FICHE_A11Y_PARAMETERS,
  atFicheBreakpoint,
} from "@/components/fiche/ficheStoryViewports";
import { YORUBA } from "@/components/fiche/__tests__/ficheContextFixtures";

const meta = {
  title: "Fiche/ScalePanel",
  component: ScalePanel,
  tags: ["autodocs"],
  parameters: { layout: "padded", a11y: FICHE_A11Y_PARAMETERS },
} satisfies Meta<typeof ScalePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

// `side: "right"` mirrors the registry's FR100 alternation for panel order 2.
const yorubaScale: Story = {
  args: {
    entityType: "people",
    payload: YORUBA,
    size: "md",
    side: "right",
  },
};

export const Mobile430 = atFicheBreakpoint(yorubaScale, "ficheMobile430");
export const Tablet720 = atFicheBreakpoint(yorubaScale, "ficheTablet720");
export const Desktop800 = atFicheBreakpoint(yorubaScale, "ficheDesktop800");
